import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  openDemo,
  DEMO_ADMIN as ADMIN,
  DEMO_OWNER as OWNER,
} from "../src/db.mjs";
import { ControlStore } from "../src/store.mjs";
import { PeopleStore, StagingFixtureProvider } from "../src/people.mjs";
let db, store, people;
const user = () => ({
  email: "control-new@example.invalid",
  full_name: "Persona de prueba",
});
const horse = () => ({
  name: "People caballo",
  stall_number: "PEOPLE:01",
  owner_id: OWNER,
});
before(async () => {
  db = await openDemo();
  store = new ControlStore(db, { simulation: true });
});
after(async () => db.close());
beforeEach(async () => {
  await db.raw.exec(
    "TRUNCATE se_control_v1.user_requests,se_control_v1.audit,se_control_v1.idempotency CASCADE; DELETE FROM public.horses WHERE name LIKE 'People%'; DELETE FROM public.user_profiles WHERE id NOT IN ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000012'); DELETE FROM auth.users WHERE id NOT IN ('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000012'); UPDATE se_control_v1.deployment_guard SET people_enabled=true; UPDATE public.user_profiles SET is_active=true",
  );
  people = new PeopleStore(store);
});
test("alta de caballo conserva UUID, propietario y box sin activar Wasabi ni live", async () => {
  const h = await people.createHorse(ADMIN, randomUUID(), horse());
  assert.ok(h.id);
  assert.equal(h.owner_id, OWNER);
  assert.equal(h.stall_number, "PEOPLE:01");
  assert.equal(h.photo_backend, "supabase");
  assert.equal(h.installation_required, true);
  assert.equal(
    (await db.raw.query("SELECT count(*) AS n FROM se_control_v1.grants"))
      .rows[0].n,
    0,
  );
});
test("reintentos concurrentes con la misma clave no duplican el caballo", async () => {
  const key = randomUUID();
  const [a, b] = await Promise.all([
    people.createHorse(ADMIN, key, horse()),
    people.createHorse(ADMIN, key, horse()),
  ]);
  assert.equal(a.id, b.id);
  assert.equal(
    (
      await db.raw.query(
        "SELECT count(*) AS n FROM public.horses WHERE stall_number='PEOPLE:01'",
      )
    ).rows[0].n,
    1,
  );
});
test("box global repetido y propietario inexistente no crean filas", async () => {
  await people.createHorse(ADMIN, randomUUID(), horse());
  await assert.rejects(
    people.createHorse(ADMIN, randomUUID(), {
      ...horse(),
      name: "People otro",
    }),
    (e) => e.code === "23505",
  );
  await assert.rejects(
    people.createHorse(ADMIN, randomUUID(), {
      ...horse(),
      stall_number: "PEOPLE:02",
      owner_id: randomUUID(),
    }),
    (e) => e.code === "22023",
  );
});
test("no permite administración, propietario inactivo ni campos de backend extra", async () => {
  await assert.rejects(
    people.createHorse(OWNER, randomUUID(), horse()),
    (e) => e.status === 403,
  );
  await assert.rejects(
    people.createHorse(ADMIN, randomUUID(), {
      ...horse(),
      photo_backend: "wasabi",
    }),
    (e) => e.status === 400,
  );
  await db.raw.query(
    "UPDATE public.user_profiles SET is_active=false WHERE id=$1",
    [OWNER],
  );
  await assert.rejects(
    people.createHorse(ADMIN, randomUUID(), horse()),
    (e) => e.code === "22023",
  );
});
test("doble solicitud normaliza correo y devuelve la solicitud existente", async () => {
  const a = await people.requestUser(ADMIN, randomUUID(), user());
  const b = await people.requestUser(ADMIN, randomUUID(), {
    ...user(),
    email: " CONTROL-NEW@example.invalid ",
  });
  assert.equal(a.id, b.id);
  await assert.rejects(
    people.requestUser(ADMIN, randomUUID(), {
      ...user(),
      full_name: "Otro nombre",
    }),
    (e) => e.code === "USER_REQUEST_EXISTS",
  );
});
test("cuenta nueva y perfil usan el mismo UUID y rol owner, sin correos o grants", async () => {
  const request = await people.requestUser(ADMIN, randomUUID(), user());
  const result = await people.process(ADMIN, request.id);
  assert.equal(result.state, "ready");
  assert.equal(result.invitation_sent, false);
  assert.equal(result.activation_required, true);
  const profile = (
    await db.raw.query("SELECT * FROM public.user_profiles WHERE id=$1", [
      result.auth_user_id,
    ])
  ).rows[0];
  assert.equal(profile.email, user().email);
  assert.equal(profile.role, "owner");
  assert.equal(
    (await people.process(ADMIN, request.id)).auth_user_id,
    result.auth_user_id,
  );
});
test("cuenta ya existente queda para revisión y conserva su nombre y rol", async () => {
  const request = await people.requestUser(ADMIN, randomUUID(), {
    email: "propietaria@example.invalid",
    full_name: "Nombre que no debe reemplazar",
  });
  const result = await people.process(ADMIN, request.id);
  assert.equal(result.state, "existing_review");
  assert.equal(result.auth_user_id, OWNER);
  assert.equal(
    (
      await db.raw.query(
        "SELECT full_name FROM public.user_profiles WHERE id=$1",
        [OWNER],
      )
    ).rows[0].full_name,
    "Propietaria de prueba",
  );
});
test("fallo de respuesta después de crear Auth concilia sin crear otra cuenta", async () => {
  const original = people.provider;
  let calls = 0;
  people.provider = {
    create: async (data) => {
      calls++;
      await original.create(data);
      const e = Error("private-details-never-stored");
      e.category = "AUTH_UNAVAILABLE";
      throw e;
    },
  };
  const request = await people.requestUser(ADMIN, randomUUID(), user());
  const result = await people.process(ADMIN, request.id);
  assert.equal(result.state, "ready");
  assert.equal(calls, 1);
  assert.equal(
    (
      await db.raw.query(
        "SELECT count(*) AS n FROM auth.users WHERE email=$1",
        [user().email],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    JSON.stringify(await people.list(ADMIN)).includes("private-details"),
    false,
  );
});
test("interrupción entre Auth y perfil se recupera con nueva lease sin cambiar la cuenta", async () => {
  const request = await people.requestUser(ADMIN, randomUUID(), user());
  const lease = await people.claim(ADMIN, request.id);
  await people.provider.create({ email: user().email, request_id: request.id });
  await db.raw.query(
    "UPDATE se_control_v1.user_requests SET lease_until=now()-interval '1 second' WHERE id=$1",
    [request.id],
  );
  const restarted = new PeopleStore(new ControlStore(db, { simulation: true }));
  const result = await restarted.process(ADMIN, request.id);
  assert.equal(result.state, "ready");
  await assert.rejects(
    people.complete(ADMIN, lease),
    (e) => e.code === "LEASE_LOST",
  );
});
test("rechazo de credenciales detiene intentos sin regenerar claves", async () => {
  let calls = 0;
  people.provider = {
    create: async () => {
      calls++;
      const e = Error("not-shown");
      e.category = "AUTH_REJECTED";
      throw e;
    },
  };
  const request = await people.requestUser(ADMIN, randomUUID(), user());
  assert.equal((await people.process(ADMIN, request.id)).state, "failed");
  await people.process(ADMIN, request.id);
  assert.equal(calls, 1);
});
test("fallos transitorios están acotados a tres intentos", async () => {
  let calls = 0;
  people.provider = {
    create: async () => {
      calls++;
      throw Error("not-shown");
    },
  };
  const request = await people.requestUser(ADMIN, randomUUID(), user());
  assert.equal((await people.process(ADMIN, request.id)).state, "reconcile");
  assert.equal((await people.process(ADMIN, request.id)).state, "reconcile");
  assert.equal((await people.process(ADMIN, request.id)).state, "failed");
  await people.process(ADMIN, request.id);
  assert.equal(calls, 3);
});
test("RLS impide inspeccionar cuentas, autopromoverse y borrar el historial", async () => {
  const request = await people.requestUser(ADMIN, randomUUID(), user());
  assert.equal(
    (
      await db.tx(OWNER, (c) =>
        c.query("SELECT * FROM se_control_v1.user_requests"),
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    db.tx(OWNER, (c) =>
      c.query("SELECT se_control_v1.inspect_account($1)", [
        "propietaria@example.invalid",
      ]),
    ),
    (e) => e.code === "42501",
  );
  await assert.rejects(
    people.process(OWNER, request.id),
    (e) => e.status === 403,
  );
  await assert.rejects(
    db.tx(ADMIN, (c) => c.query("DELETE FROM se_control_v1.user_requests")),
    (e) => e.code === "42501",
  );
});
test("demo rechaza correos reales y campos de contraseña o rol", async () => {
  for (const data of [
    { ...user(), email: "real@example.com" },
    { ...user(), password: "rejected" },
    { ...user(), role: "admin" },
    { ...user(), app_metadata: { role: "admin" } },
  ])
    await assert.rejects(
      people.requestUser(ADMIN, randomUUID(), data),
      (e) => e.status === 400,
    );
});
test("guardas desactivadas bloquean API y función SQL de escritura", async () => {
  await db.raw.exec(
    "UPDATE se_control_v1.deployment_guard SET people_enabled=false",
  );
  await assert.rejects(
    people.createHorse(ADMIN, randomUUID(), horse()),
    (e) => e.code === "PEOPLE_NOT_ENABLED",
  );
  await assert.rejects(
    db.tx(ADMIN, (c) =>
      c.query("SELECT se_control_v1.create_catalog_horse($1,$2,$3,$4)", [
        randomUUID(),
        "People SQL",
        "SQL:01",
        OWNER,
      ]),
    ),
    (e) => e.code === "42501",
  );
});
test("un administrador inactivo pierde acceso también en las policies privadas", async () => {
  await people.requestUser(ADMIN, randomUUID(), user());
  await db.raw.query(
    "UPDATE public.user_profiles SET is_active=false WHERE id=$1",
    [ADMIN],
  );
  assert.equal(
    (
      await db.tx(ADMIN, (c) =>
        c.query("SELECT * FROM se_control_v1.user_requests"),
      )
    ).rows.length,
    0,
  );
  await assert.rejects(
    people.createHorse(ADMIN, randomUUID(), horse()),
    (e) => e.code === "INACTIVE_PROFILE",
  );
});
test("el gateway de staging rechaza correos de clientes antes de guardar solicitudes", async () => {
  const staged = new PeopleStore(store, {
    mode: "staging",
    provider: new StagingFixtureProvider(
      {
        ref: "xzfwcwfmnypgcunavmlc",
        url: "https://xzfwcwfmnypgcunavmlc.supabase.co",
      },
      "fixture-test-token-not-valid",
    ),
  });
  await assert.rejects(
    staged.requestUser(ADMIN, randomUUID(), {
      email: "persona@example.com",
      full_name: "No guardar",
    }),
    (e) => e.code === "FIXTURE_EMAIL_REQUIRED",
  );
  assert.equal((await people.list(ADMIN)).items.length, 0);
});
