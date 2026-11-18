import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  openDemo,
  DEMO_ADMIN as ADMIN,
  DEMO_OWNER as MANAGER,
  DEMO_HORSE as HORSE,
} from "../src/db.mjs";
import { ControlStore } from "../src/store.mjs";
import { OrganizationStore } from "../src/organizations.mjs";
import { DelegatedHorseStore } from "../src/delegated-horses.mjs";
import { createControlServer } from "../src/server.mjs";
const CUSTOMER = "00000000-0000-4000-8000-000000000012";
let db, store, orgs, horses, a, b, sa, sb, membership;
const key = () => randomUUID();
const input = (extra = {}) => ({
  name: "Delegado nuevo",
  stall_number: "DELEGADO:01",
  site_id: sa.id,
  owner_id: CUSTOMER,
  ...extra,
});
before(async () => {
  db = await openDemo();
  store = new ControlStore(db, { simulation: true });
  orgs = new OrganizationStore(store);
  horses = new DelegatedHorseStore(orgs);
});
after(async () => db.close());
beforeEach(async () => {
  await db.raw.exec(
    "TRUNCATE se_control_v1.organizations,se_control_v1.audit,se_control_v1.idempotency CASCADE; DELETE FROM public.horses WHERE name LIKE 'Delegado %'; UPDATE public.user_profiles SET is_active=true; UPDATE se_control_v1.deployment_guard SET people_enabled=true",
  );
  a = await orgs.create(ADMIN, key(), { name: "Organización A" });
  b = await orgs.create(ADMIN, key(), { name: "Organización B" });
  sa = await orgs.createSite(ADMIN, key(), a.id, { name: "Establo A" });
  sb = await orgs.createSite(ADMIN, key(), b.id, { name: "Establo B" });
  membership = await orgs.member(ADMIN, key(), a.id, {
    user_id: MANAGER,
    role: "org_admin",
    site_id: null,
  });
});
const owner = (data = {}) =>
  horses.owner(ADMIN, key(), a.id, {
    user_id: CUSTOMER,
    site_id: null,
    ...data,
  });
test("propietarios aprobados no adquieren administración ni permisos de fotos/live", async () => {
  await owner();
  await assert.rejects(orgs.context(CUSTOMER), (e) => e.status === 403);
  assert.equal(
    (await db.raw.query("SELECT count(*) AS n FROM se_control_v1.grants"))
      .rows[0].n,
    0,
  );
  assert.deepEqual(
    Object.keys((await horses.owners(MANAGER, a.id, sa.id)).items[0]).sort(),
    ["full_name", "id"],
  );
});
test("alta delegada conserva propietario y UUID, enlaza el establo y deja instalación pendiente", async () => {
  await owner();
  const created = await horses.create(MANAGER, key(), a.id, input());
  assert.equal(created.owner_id, CUSTOMER);
  assert.equal(created.site_id, sa.id);
  assert.equal(created.organization_id, a.id);
  assert.equal(created.photo_backend, "supabase");
  assert.equal(created.installation_required, true);
  assert.equal(
    (await orgs.resources(MANAGER, a.id, "horses")).items[0].id,
    created.id,
  );
  assert.equal((await horses.capacity(MANAGER, a.id)).used, 1);
  assert.equal(
    (await db.raw.query("SELECT count(*) AS n FROM se_control_v1.cameras"))
      .rows[0].n,
    0,
  );
  const events = await orgs.resources(MANAGER, a.id, "events");
  assert.equal(
    events.items.filter((e) => e.operation === "horse.create").length,
    1,
  );
  assert.equal(
    events.items.some((e) => "owner_id" in e.details),
    false,
  );
});
test("reintentos concurrentes e idempotencia en el último cupo no duplican caballo ni auditoría", async () => {
  await owner();
  await horses.setLimit(ADMIN, key(), a.id, { horse_limit: 1, revision: 1 });
  const k = key();
  const [x, y] = await Promise.all([
    horses.create(MANAGER, k, a.id, input()),
    horses.create(MANAGER, k, a.id, input()),
  ]);
  assert.equal(x.id, y.id);
  assert.equal((await horses.create(MANAGER, k, a.id, input())).id, x.id);
  assert.equal(
    (
      await db.raw.query(
        "SELECT count(*) AS n FROM se_control_v1.audit WHERE operation='organization.horse.create'",
      )
    ).rows[0].n,
    1,
  );
  await assert.rejects(
    horses.create(MANAGER, k, a.id, input({ name: "Delegado distinto" })),
    (e) => e.code === "IDEMPOTENCY_CONFLICT",
  );
});
test("cupo agotado revierte caballo público, asociación, auditoría y reserva idempotente", async () => {
  await owner();
  await horses.setLimit(ADMIN, key(), a.id, { horse_limit: 0, revision: 1 });
  const k = key();
  await assert.rejects(
    horses.create(MANAGER, k, a.id, input()),
    (e) => e.code === "PSE01",
  );
  assert.equal(
    (
      await db.raw.query(
        "SELECT count(*) AS n FROM public.horses WHERE stall_number='DELEGADO:01'",
      )
    ).rows[0].n,
    0,
  );
  assert.equal(
    (
      await db.raw.query(
        "SELECT count(*) AS n FROM se_control_v1.organization_idempotency WHERE actor_id=$1",
        [MANAGER],
      )
    ).rows[0].n,
    0,
  );
  await horses.setLimit(ADMIN, key(), a.id, { horse_limit: 1, revision: 2 });
  assert.ok((await horses.create(MANAGER, k, a.id, input())).id);
});
test("dos solicitudes con claves distintas no exceden el límite", async () => {
  await owner();
  await horses.setLimit(ADMIN, key(), a.id, { horse_limit: 1, revision: 1 });
  const results = await Promise.allSettled([
    horses.create(MANAGER, key(), a.id, input()),
    horses.create(MANAGER, key(), a.id, input({ stall_number: "DELEGADO:02" })),
  ]);
  assert.equal(results.filter((x) => x.status === "fulfilled").length, 1);
  assert.equal(
    results.find((x) => x.status === "rejected").reason.code,
    "PSE01",
  );
  assert.equal((await horses.capacity(MANAGER, a.id)).used, 1);
});
test("el límite también se aplica a la asociación central de un caballo ya existente", async () => {
  await horses.setLimit(ADMIN, key(), a.id, { horse_limit: 0, revision: 1 });
  await assert.rejects(
    orgs.assignHorse(ADMIN, key(), a.id, { horse_id: HORSE, site_id: sa.id }),
    (e) => e.code === "PSE01",
  );
  await horses.setLimit(ADMIN, key(), a.id, { horse_limit: 1, revision: 2 });
  await orgs.assignHorse(ADMIN, key(), a.id, {
    horse_id: HORSE,
    site_id: sa.id,
  });
  await assert.rejects(
    horses.setLimit(ADMIN, key(), a.id, { horse_limit: 0, revision: 3 }),
    (e) => e.code === "PSE05",
  );
  await assert.rejects(
    horses.setLimit(ADMIN, key(), a.id, { horse_limit: 2, revision: 2 }),
    (e) => e.code === "PSE04",
  );
});
test("el propietario debe estar aprobado, activo y dentro del ámbito del establo", async () => {
  await assert.rejects(
    horses.create(MANAGER, key(), a.id, input()),
    (e) => e.code === "PSE02",
  );
  const other = await orgs.createSite(ADMIN, key(), a.id, {
    name: "Otro establo A",
  });
  await owner({ site_id: other.id });
  assert.equal((await horses.owners(MANAGER, a.id, sa.id)).items.length, 0);
  await assert.rejects(
    horses.create(MANAGER, key(), a.id, input()),
    (e) => e.code === "PSE02",
  );
  await db.raw.query(
    "UPDATE public.user_profiles SET is_active=false WHERE id=$1",
    [CUSTOMER],
  );
  assert.equal((await horses.owners(MANAGER, a.id, other.id)).items.length, 0);
  await assert.rejects(
    horses.create(MANAGER, key(), a.id, input({ site_id: other.id })),
    (e) => e.code === "PSE02",
  );
});
test("revocar un propietario impide nuevas altas sin cambiar caballos existentes", async () => {
  const record = await owner();
  const h = await horses.create(MANAGER, key(), a.id, input());
  await horses.owner(
    ADMIN,
    key(),
    a.id,
    { site_id: null, active: false, revision: 1 },
    record.id,
  );
  await assert.rejects(
    horses.create(MANAGER, key(), a.id, input({ stall_number: "DELEGADO:02" })),
    (e) => e.code === "PSE02",
  );
  assert.equal(
    (
      await db.raw.query("SELECT owner_id FROM public.horses WHERE id=$1", [
        h.id,
      ])
    ).rows[0].owner_id,
    CUSTOMER,
  );
});
test("no enumera propietarios, cupos ni caballos de otra organización", async () => {
  await owner();
  await assert.rejects(
    horses.owners(MANAGER, b.id, sb.id),
    (e) => e.status === 404,
  );
  await assert.rejects(horses.capacity(MANAGER, b.id), (e) => e.status === 404);
  await assert.rejects(
    horses.create(MANAGER, key(), b.id, input({ site_id: sb.id })),
    (e) => e.status === 404,
  );
  await assert.rejects(
    horses.create(MANAGER, key(), a.id, input({ site_id: sb.id })),
    (e) => e.code === "22023",
  );
});
test("instaladores y lectores no crean caballos ni enumeran propietarios aunque conozcan UUID válidos", async () => {
  await owner();
  for (const role of ["installer", "viewer"]) {
    membership = await orgs.member(
      ADMIN,
      key(),
      a.id,
      { role, site_id: null, active: true, revision: membership.revision },
      membership.id,
    );
    await assert.rejects(
      horses.create(MANAGER, key(), a.id, input()),
      (e) => e.status === 403,
    );
    await assert.rejects(
      horses.owners(MANAGER, a.id, sa.id),
      (e) => e.status === 403,
    );
    await assert.rejects(
      db.tx(MANAGER, (c) =>
        c.query(
          "SELECT se_control_v1.create_organization_horse($1,$2,$3,$4,$5,$6)",
          [
            a.id,
            sa.id,
            randomUUID(),
            "Delegado directo",
            "DELEGADO:DIRECT",
            CUSTOMER,
          ],
        ),
      ),
      (e) => e.code === "42501",
    );
  }
});
test("RLS niega autoaprobar propietarios, modificar límites o escribir directamente en caballos", async () => {
  await assert.rejects(
    horses.owner(MANAGER, key(), a.id, { user_id: MANAGER }),
    (e) => e.status === 403,
  );
  await assert.rejects(
    horses.setLimit(MANAGER, key(), a.id, { horse_limit: 999, revision: 1 }),
    (e) => e.status === 403,
  );
  await assert.rejects(
    db.tx(MANAGER, (c) =>
      c.query(
        "INSERT INTO se_control_v1.organization_owners(id,organization_id,user_id,created_by) VALUES($1,$2,$3,$4)",
        [randomUUID(), a.id, MANAGER, MANAGER],
      ),
    ),
    (e) => e.code === "42501",
  );
  await assert.rejects(
    db.tx(MANAGER, (c) =>
      c.query(
        "UPDATE se_control_v1.organization_horse_limits SET horse_limit=999 WHERE organization_id=$1",
        [a.id],
      ),
    ),
    (e) => e.code === "42501",
  );
  await assert.rejects(
    db.tx(MANAGER, (c) =>
      c.query(
        "INSERT INTO public.horses(id,name,stall_number,owner_id) VALUES($1,'Delegado directo','DELEGADO:DIRECT',$2)",
        [randomUUID(), MANAGER],
      ),
    ),
    (e) => e.code === "42501",
  );
});
test("degradar rol o desactivar perfil bloquea también el replay de una solicitud anterior", async () => {
  await owner();
  const k = key();
  await horses.create(MANAGER, k, a.id, input());
  membership = await orgs.member(
    ADMIN,
    key(),
    a.id,
    { role: "installer", site_id: null, active: true, revision: 1 },
    membership.id,
  );
  await assert.rejects(
    horses.create(MANAGER, k, a.id, input()),
    (e) => e.status === 403,
  );
  await orgs.member(
    ADMIN,
    key(),
    a.id,
    { role: "org_admin", site_id: null, active: true, revision: 2 },
    membership.id,
  );
  await db.raw.query(
    "UPDATE public.user_profiles SET is_active=false WHERE id=$1",
    [MANAGER],
  );
  await assert.rejects(
    horses.create(MANAGER, k, a.id, input()),
    (e) => e.status === 404,
  );
});
test("modo altas deshabilitado niega el alta y las funciones privadas, sin crear filas", async () => {
  await owner();
  await db.raw.exec(
    "UPDATE se_control_v1.deployment_guard SET people_enabled=false",
  );
  await assert.rejects(
    horses.create(MANAGER, key(), a.id, input()),
    (e) => e.code === "PEOPLE_NOT_ENABLED",
  );
  await assert.rejects(
    db.tx(MANAGER, (c) =>
      c.query(
        "SELECT se_control_v1.create_organization_horse($1,$2,$3,$4,$5,$6)",
        [
          a.id,
          sa.id,
          randomUUID(),
          "Delegado directo",
          "DELEGADO:DIRECT",
          CUSTOMER,
        ],
      ),
    ),
    (e) => e.code === "PSE03",
  );
});
test("box único global, campos extra y relaciones inválidas fallan sin altas parciales", async () => {
  await assert.rejects(
    horses.owner(ADMIN, key(), a.id, { user_id: CUSTOMER, site_id: false }),
    (e) => e.status === 400,
  );
  await owner();
  await horses.create(MANAGER, key(), a.id, input());
  await assert.rejects(
    horses.create(MANAGER, key(), a.id, input({ name: "Delegado otro" })),
    (e) => e.code === "23505",
  );
  await assert.rejects(
    horses.create(MANAGER, key(), a.id, input({ photo_backend: "wasabi" })),
    (e) => e.status === 400,
  );
  await assert.rejects(
    horses.create(MANAGER, key(), a.id, input({ name: "Malo\ncontrol" })),
    (e) => e.status === 400,
  );
  await assert.rejects(
    horses.owner(ADMIN, key(), a.id, { user_id: MANAGER, site_id: sb.id }),
    (e) => e.code === "23503",
  );
  assert.equal((await horses.capacity(MANAGER, a.id)).used, 1);
});
test("buscador de propietarios paginado no expone correo ni interpreta comodines", async () => {
  await owner();
  assert.equal(
    (await horses.owners(MANAGER, a.id, sa.id, { q: "%" })).items.length,
    0,
  );
  const p = await horses.owners(MANAGER, a.id, sa.id, { limit: 1 });
  assert.ok(p.next);
  assert.equal(
    (await horses.owners(MANAGER, a.id, sa.id, { limit: 1, after: p.next }))
      .items.length,
    0,
  );
  await assert.rejects(
    horses.owners(MANAGER, a.id, sa.id, { limit: 101 }),
    (e) => e.status === 400,
  );
});
test("HTTP devuelve errores saneados, bloquea registro global de propietarios y valida el ámbito", async () => {
  await owner();
  await horses.setLimit(ADMIN, key(), a.id, { horse_limit: 0, revision: 1 });
  const base = "http://127.0.0.1:18975",
    server = createControlServer({
      store,
      mode: "staging",
      origin: base,
      verifyIdentity: async () => MANAGER,
    });
  await new Promise((r) => server.listen(18975, "127.0.0.1", r));
  const post = (path, body) =>
    fetch(base + path, {
      method: "POST",
      headers: {
        Origin: base,
        "Content-Type": "application/json",
        "Idempotency-Key": key(),
      },
      body: JSON.stringify(body),
    });
  try {
    const r = await post(
      `/api/organizations/${a.id}/horse-registrations`,
      input(),
    );
    assert.equal(r.status, 409);
    assert.deepEqual(await r.json(), { error: "HORSE_QUOTA_REACHED" });
    assert.equal(
      (await post(`/api/organizations/${a.id}/owners`, { user_id: MANAGER }))
        .status,
      403,
    );
    assert.equal(
      (await fetch(base + `/api/organizations/${a.id}/owners`)).status,
      400,
    );
    assert.equal(
      (await fetch(base + `/api/organizations/${a.id}/owner-records`)).status,
      403,
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});
