import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  openDemo,
  DEMO_ADMIN as ADMIN,
  DEMO_OWNER as OWNER,
  DEMO_HORSE as HORSE,
} from "../src/db.mjs";
import { ControlStore } from "../src/store.mjs";
import { OrganizationStore } from "../src/organizations.mjs";
import { createControlServer } from "../src/server.mjs";
const OUTSIDE = "00000000-0000-4000-8000-000000000012";
let db, store, orgs, a, b, siteA, siteB;
const key = () => randomUUID();
before(async () => {
  db = await openDemo();
  store = new ControlStore(db, { simulation: true });
  orgs = new OrganizationStore(store);
});
after(async () => db.close());
beforeEach(async () => {
  await db.raw.exec(
    "TRUNCATE se_control_v1.organizations,se_control_v1.audit,se_control_v1.idempotency CASCADE; UPDATE public.user_profiles SET is_active=true",
  );
  a = await orgs.create(ADMIN, key(), { name: "Organización A" });
  b = await orgs.create(ADMIN, key(), { name: "Organización B" });
  siteA = await orgs.createSite(ADMIN, key(), a.id, { name: "Establo A" });
  siteB = await orgs.createSite(ADMIN, key(), b.id, { name: "Establo B" });
});
const grant = (user = OWNER, role = "org_admin", site_id = null, org = a.id) =>
  orgs.member(ADMIN, key(), org, { user_id: user, role, site_id });
test("no adopta inventario anterior ni concede acceso al propietario por su rol comercial", async () => {
  await assert.rejects(orgs.context(OWNER), (e) => e.status === 403);
  assert.equal((await orgs.resources(ADMIN, a.id, "horses")).items.length, 0);
  assert.equal((await orgs.resources(ADMIN, a.id, "cameras")).items.length, 0);
  assert.equal(
    (await store.snapshot(ADMIN)).production_authority_enabled,
    false,
  );
});
test("responsable ve solamente su organización, incluso consultando UUID ajenos", async () => {
  await grant();
  assert.equal((await orgs.context(OWNER)).global_admin, false);
  assert.deepEqual(
    (await orgs.list(OWNER)).items.map((x) => x.id),
    [a.id],
  );
  await assert.rejects(orgs.workspace(OWNER, b.id), (e) => e.status === 404);
  await assert.rejects(
    orgs.resources(OWNER, b.id, "sites"),
    (e) => e.status === 404,
  );
  await assert.rejects(
    orgs.resources(OWNER, randomUUID(), "sites"),
    (e) => e.status === 404,
  );
  const sites = await db.tx(OWNER, (c) =>
    c.query("SELECT id FROM se_control_v1.sites"),
  );
  assert.deepEqual(
    sites.rows.map((x) => x.id),
    [siteA.id],
  );
});
test("solo administrador central crea organizaciones, asigna responsables y vincula caballos", async () => {
  await grant();
  await assert.rejects(
    orgs.create(OWNER, key(), { name: "Escalada" }),
    (e) => e.status === 403,
  );
  await assert.rejects(
    orgs.member(OWNER, key(), a.id, { user_id: OUTSIDE, role: "org_admin" }),
    (e) => e.status === 403,
  );
  await assert.rejects(
    orgs.assignHorse(OWNER, key(), a.id, {
      horse_id: HORSE,
      site_id: siteA.id,
    }),
    (e) => e.status === 403,
  );
  await assert.rejects(store.snapshot(OWNER), (e) => e.status === 403);
  await assert.rejects(
    store.createGrant(OWNER, key(), {
      user_id: OWNER,
      horse_id: HORSE,
      photos: true,
      live: true,
      reason: "Escalada",
    }),
    (e) => e.status === 403,
  );
});
test("RLS impide escrituras directas, cambiar de organización y elevar la propia membresía", async () => {
  const m = await grant(OWNER, "viewer");
  const updated = await db.tx(OWNER, (c) =>
    c.query(
      "UPDATE se_control_v1.organization_memberships SET role='org_admin' WHERE id=$1 RETURNING id",
      [m.id],
    ),
  );
  assert.equal(updated.rows.length, 0);
  await assert.rejects(
    db.tx(OWNER, (c) =>
      c.query(
        "INSERT INTO se_control_v1.organization_sites(site_id,organization_id) VALUES($1,$2)",
        [randomUUID(), b.id],
      ),
    ),
    (e) => e.code === "42501",
  );
  await assert.rejects(
    db.tx(OWNER, (c) =>
      c.query("INSERT INTO se_control_v1.sites(id,name) VALUES($1,$2)", [
        randomUUID(),
        "Escalada",
      ]),
    ),
    (e) => e.code === "42501",
  );
  await assert.rejects(
    db.tx(OWNER, (c) =>
      c.query(
        "SELECT se_control_v1.create_organization_site($1,$2,'Escalada')",
        [b.id, randomUUID()],
      ),
    ),
    (e) => e.code === "42501",
  );
});
test("nuevo establo delegado es atómico, auditable e idempotente", async () => {
  await grant();
  const k = key();
  const [x, y] = await Promise.all([
    orgs.createSite(OWNER, k, a.id, { name: "Nuevo A" }),
    orgs.createSite(OWNER, k, a.id, { name: "Nuevo A" }),
  ]);
  assert.equal(x.id, y.id);
  assert.equal((await orgs.resources(OWNER, a.id, "sites")).items.length, 2);
  const events = await orgs.resources(OWNER, a.id, "events");
  assert.equal(events.items.filter((e) => e.actor_id === OWNER).length, 1);
  await assert.rejects(
    orgs.createSite(OWNER, k, a.id, { name: "Distinto" }),
    (e) => e.code === "IDEMPOTENCY_CONFLICT",
  );
});
test("lector no puede escribir ni reutilizar una respuesta de un permiso ya revocado", async () => {
  const m = await grant();
  const k = key();
  await orgs.createSite(OWNER, k, a.id, { name: "Antes" });
  await orgs.member(
    ADMIN,
    key(),
    a.id,
    { role: "viewer", site_id: null, active: true, revision: m.revision },
    m.id,
  );
  await assert.rejects(
    orgs.createSite(OWNER, k, a.id, { name: "Antes" }),
    (e) => e.status === 403,
  );
});
test("instalador limitado a un establo no ve otro ni puede crear un nuevo ámbito", async () => {
  const second = await orgs.createSite(ADMIN, key(), a.id, { name: "Otro A" });
  await grant(OWNER, "installer", siteA.id);
  assert.equal(
    (await orgs.workspace(OWNER, a.id)).capabilities.create_sites,
    false,
  );
  assert.deepEqual(
    (await orgs.resources(OWNER, a.id, "sites")).items.map((x) => x.id),
    [siteA.id],
  );
  await assert.rejects(
    orgs.createSite(OWNER, key(), a.id, { name: "Fuera" }),
    (e) => e.code === "42501",
  );
  const rows = await db.tx(OWNER, (c) =>
    c.query(
      "SELECT site_id FROM se_control_v1.organization_sites WHERE site_id=$1",
      [second.id],
    ),
  );
  assert.equal(rows.rows.length, 0);
  assert.equal(
    (await orgs.resources(OWNER, a.id, "events")).items.every(
      (e) => e.site_id === siteA.id,
    ),
    true,
  );
});
test("caballos por UUID quedan limitados a organización y establo sin exponer propietario ni medios", async () => {
  await orgs.assignHorse(ADMIN, key(), a.id, {
    horse_id: HORSE,
    site_id: siteA.id,
  });
  await grant(OWNER, "viewer", siteA.id);
  await grant(OUTSIDE, "viewer", null, b.id);
  const horses = (await orgs.resources(OWNER, a.id, "horses")).items;
  assert.equal(horses[0].id, HORSE);
  assert.deepEqual(Object.keys(horses[0]).sort(), [
    "id",
    "is_active",
    "name",
    "site_id",
  ]);
  assert.equal((await orgs.resources(OUTSIDE, b.id, "horses")).items.length, 0);
  await assert.rejects(
    orgs.assignHorse(ADMIN, key(), b.id, {
      horse_id: HORSE,
      site_id: siteB.id,
    }),
    (e) => e.code === "23505",
  );
  await assert.rejects(
    orgs.assignHorse(ADMIN, key(), a.id, {
      horse_id: randomUUID(),
      site_id: siteB.id,
    }),
    (e) => e.status === 400,
  );
});
test("membresías no aceptan ámbito de otra organización ni responsable limitado a un establo", async () => {
  await assert.rejects(
    grant(OWNER, "installer", siteB.id),
    (e) => e.code === "23503",
  );
  await assert.rejects(
    grant(OWNER, "org_admin", siteA.id),
    (e) => e.status === 400,
  );
  await assert.rejects(grant(OWNER, "superadmin"), (e) => e.status === 400);
});
test("revocar membresía o suspender organización retira acceso sin esperar al vencimiento del token", async () => {
  const m = await grant();
  await orgs.member(
    ADMIN,
    key(),
    a.id,
    { role: "org_admin", site_id: null, active: false, revision: m.revision },
    m.id,
  );
  await assert.rejects(orgs.context(OWNER), (e) => e.status === 403);
  await assert.rejects(orgs.workspace(OWNER, a.id), (e) => e.status === 404);
  await orgs.member(
    ADMIN,
    key(),
    a.id,
    { role: "org_admin", site_id: null, active: true, revision: 2 },
    m.id,
  );
  await orgs.update(ADMIN, key(), a.id, {
    state: "suspended",
    revision: a.revision,
  });
  await assert.rejects(orgs.context(OWNER), (e) => e.status === 403);
  assert.equal(
    (await db.tx(OWNER, (c) => c.query("SELECT * FROM se_control_v1.sites")))
      .rows.length,
    0,
  );
  assert.equal(
    (await orgs.list(ADMIN)).items.find((x) => x.id === a.id).state,
    "suspended",
  );
});
test("perfil inactivo pierde lectura RLS y las funciones privadas rechazan llamadas directas", async () => {
  await grant();
  await db.raw.query(
    "UPDATE public.user_profiles SET is_active=false WHERE id=$1",
    [OWNER],
  );
  await assert.rejects(orgs.context(OWNER), (e) => e.status === 403);
  assert.equal(
    (
      await db.tx(OWNER, (c) =>
        c.query("SELECT * FROM se_control_v1.organizations"),
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    db.tx(OWNER, (c) =>
      c.query("SELECT se_control_v1.organization_horse_page($1,NULL,20,$2)", [
        a.id,
        "",
      ]),
    ),
    (e) => e.code === "42501",
  );
});
test("la paginación acota respuestas y la búsqueda trata comodines como texto literal", async () => {
  await grant();
  const first = await orgs.resources(ADMIN, a.id, "sites", { limit: 1 });
  assert.equal(first.items.length, 1);
  assert.ok(first.next);
  assert.equal(
    (
      await orgs.resources(ADMIN, a.id, "sites", {
        after: first.next,
        limit: 1,
      })
    ).items.length,
    0,
  );
  assert.equal((await orgs.list(ADMIN, { q: "%" })).items.length, 0);
  await assert.rejects(
    orgs.list(ADMIN, { limit: 101 }),
    (e) => e.status === 400,
  );
  await assert.rejects(
    orgs.list(ADMIN, { after: "oops" }),
    (e) => e.status === 400,
  );
});
test("API delegada obtiene bootstrap acotado y rechaza rutas globales y UUID ajenos", async () => {
  await grant();
  const server = createControlServer({
    store,
    mode: "staging",
    origin: "http://127.0.0.1:18974",
    verifyIdentity: async () => OWNER,
  });
  await new Promise((r) => server.listen(18974, "127.0.0.1", r));
  try {
    const boot = await fetch("http://127.0.0.1:18974/api/bootstrap");
    assert.equal(boot.status, 200);
    const data = await boot.json();
    assert.equal(data.context.global_admin, false);
    assert.deepEqual(data.users, []);
    assert.deepEqual(data.horses, []);
    assert.equal(
      (await fetch("http://127.0.0.1:18974/api/installations/users")).status,
      403,
    );
    assert.equal(
      (
        await fetch(
          "http://127.0.0.1:18974/api/organizations/" + b.id + "/sites",
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await fetch(
          "http://127.0.0.1:18974/api/organizations/" + a.id + "/sites",
        )
      ).status,
      200,
    );
  } finally {
    await new Promise((r) => server.close(r));
  }
});
