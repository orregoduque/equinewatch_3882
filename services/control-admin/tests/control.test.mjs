import { test, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep, basename } from "node:path";
import {
  openDemo,
  migrateIsolated,
  DEMO_ADMIN as ADMIN,
  DEMO_OWNER as OWNER,
  DEMO_HORSE as HORSE,
} from "../src/db.mjs";
import { ControlStore } from "../src/store.mjs";
import { createControlServer } from "../src/server.mjs";
import { createComplementaryAccess } from "../integrations/complementary-access.mjs";
import { planLegacy } from "../tools/legacy-plan.mjs";

let db, store;
const key = () => randomUUID(),
  grant = () => ({
    user_id: OWNER,
    horse_id: HORSE,
    photos: true,
    live: false,
    expires_at: null,
    reason: "Acceso de prueba",
  });
before(async () => {
  db = await openDemo();
  store = new ControlStore(db, { simulation: true });
});
after(async () => {
  await db.close();
});
beforeEach(async () => {
  await db.raw.exec(
    "TRUNCATE se_control_v1.idempotency,se_control_v1.audit,se_control_v1.grants,se_control_v1.bindings,se_control_v1.cameras,se_control_v1.devices,se_control_v1.sites CASCADE",
  );
});

test("una cuenta normal no administra el catálogo", async () => {
  await assert.rejects(store.snapshot(OWNER), (e) => e.status === 403);
  await assert.rejects(
    store.createGrant(OWNER, key(), grant()),
    (e) => e.status === 403,
  );
});
test("RLS y privilegios bloquean lectura cruzada, autoasignación admin y borrado de auditoría", async () => {
  await store.createGrant(ADMIN, key(), grant());
  const other = "00000000-0000-4000-8000-000000000012";
  await db.tx(other, async (c) => {
    assert.equal(
      (await c.query("SELECT * FROM se_control_v1.grants")).rows.length,
      0,
    );
    assert.equal(
      (await c.query("SELECT * FROM se_control_v1.admin_users")).rows.length,
      0,
    );
  });
  for (const query of [
    "INSERT INTO se_control_v1.admin_users VALUES('00000000-0000-4000-8000-000000000012')",
    "DELETE FROM se_control_v1.audit",
    "SELECT * FROM auth.users",
    "SELECT * FROM public.horses",
    "SELECT se_control_v1.operator_catalog()",
    "SELECT se_control_v1.operator_catalog_counts()",
    "SELECT se_control_v1.operator_identity_active('users','00000000-0000-4000-8000-000000000011')",
  ])
    await assert.rejects(
      db.tx(other, (c) => c.query(query)),
      (e) => e.code === "42501",
    );
});
test("permiso por UUID diferencia fotos y vídeo y niega otros caballos", async () => {
  await store.createGrant(ADMIN, key(), grant());
  assert.equal(
    (await store.decision(OWNER, HORSE, "photos", { simulate: true })).allow,
    true,
  );
  assert.equal(
    (await store.decision(OWNER, HORSE, "live", { simulate: true })).allow,
    false,
  );
  assert.equal(
    (
      await store.decision(
        OWNER,
        "00000000-0000-4000-8000-000000000022",
        "photos",
        { simulate: true },
      )
    ).allow,
    false,
  );
});
test("la ruta de autoridad real siempre queda desactivada aunque la simulación permita", async () => {
  await store.createGrant(ADMIN, key(), grant());
  assert.equal((await store.decision(OWNER, HORSE, "photos")).allow, false);
  const staging = new ControlStore(db, { simulation: false });
  assert.equal(
    (await staging.decision(OWNER, HORSE, "photos", { simulate: true })).allow,
    false,
  );
  await assert.rejects(
    db.raw.query(
      "UPDATE se_control_v1.release_guard SET production_authority_enabled=true",
    ),
    (e) => e.code === "23514",
  );
});
test("doble clic idempotente crea solo un permiso y un evento", async () => {
  const id = key(),
    a = await store.createGrant(ADMIN, id, grant()),
    b = await store.createGrant(ADMIN, id, grant());
  assert.equal(a.id, b.id);
  assert.equal((await store.snapshot(ADMIN)).audit.length, 1);
  await assert.rejects(
    store.createGrant(ADMIN, id, { ...grant(), live: true }),
    (e) => e.status === 409,
  );
});
test("concurrencia con la misma clave conserva una sola escritura", async () => {
  const id = key(),
    results = await Promise.all([
      store.createGrant(ADMIN, id, grant()),
      store.createGrant(ADMIN, id, grant()),
    ]);
  assert.equal(results[0].id, results[1].id);
  assert.equal((await store.snapshot(ADMIN)).grants.length, 1);
});
test("duplicar permiso con otra clave no reemplaza el existente", async () => {
  await store.createGrant(ADMIN, key(), grant());
  await assert.rejects(
    store.createGrant(ADMIN, key(), grant()),
    (e) => e.status === 409,
  );
  assert.equal((await store.snapshot(ADMIN)).audit.length, 1);
});
test("editar exige revisión vigente; retirar conserva historial y corta la simulación", async () => {
  const g = await store.createGrant(ADMIN, key(), grant());
  const updated = await store.updateGrant(ADMIN, key(), g.id, {
    photos: true,
    live: true,
    expires_at: null,
    revision: 1,
    reason: "Añadir vídeo de prueba",
  });
  assert.equal(updated.revision, 2);
  await assert.rejects(
    store.updateGrant(ADMIN, key(), g.id, {
      photos: true,
      live: true,
      revision: 1,
      reason: "Edición antigua",
    }),
    (e) => e.status === 409,
  );
  assert.equal(
    (await store.decision(OWNER, HORSE, "live", { simulate: true })).allow,
    true,
  );
  await store.revokeGrant(ADMIN, key(), g.id, {
    revision: 2,
    reason: "Fin de acceso de prueba",
  });
  assert.equal(
    (await store.decision(OWNER, HORSE, "photos", { simulate: true })).allow,
    false,
  );
  const snapshot = await store.snapshot(ADMIN);
  assert.equal(snapshot.grants.length, 1);
  assert.equal(snapshot.audit.length, 3);
});
test("vencimientos y perfiles desactivados niegan acceso", async () => {
  const g = await store.createGrant(ADMIN, key(), grant());
  await db.raw.query(
    "UPDATE se_control_v1.grants SET expires_at=now()-interval '1 minute' WHERE id=$1",
    [g.id],
  );
  assert.equal(
    (await store.decision(OWNER, HORSE, "photos", { simulate: true })).allow,
    false,
  );
  await db.raw.query(
    "UPDATE se_control_v1.grants SET expires_at=NULL WHERE id=$1",
    [g.id],
  );
  await db.raw.query(
    "UPDATE public.user_profiles SET is_active=false WHERE id=$1",
    [OWNER],
  );
  assert.equal(
    (await store.decision(OWNER, HORSE, "photos", { simulate: true })).allow,
    false,
  );
  await db.raw.query(
    "UPDATE public.user_profiles SET is_active=true WHERE id=$1",
    [OWNER],
  );
  await db.raw.query("UPDATE public.horses SET is_active=false WHERE id=$1", [
    HORSE,
  ]);
  assert.equal(
    (await store.decision(OWNER, HORSE, "photos", { simulate: true })).allow,
    false,
  );
  await db.raw.query("UPDATE public.horses SET is_active=true WHERE id=$1", [
    HORSE,
  ]);
});
test("se rechazan identidades inexistentes, privilegios extra, claves y fechas inválidas", async () => {
  for (const data of [
    { ...grant(), user_id: randomUUID() },
    { ...grant(), admin: true },
    { ...grant(), publisherKey: "never-accept-a-key" },
    { ...grant(), photos: false },
    { ...grant(), expires_at: "2020-01-01T00:00:00Z" },
    { ...grant(), horse_id: "'; DROP TABLE horses; --" },
  ])
    await assert.rejects(
      store.createGrant(ADMIN, key(), data),
      (e) => e.status === 400,
    );
});
async function prepare() {
  const site = await store.createSite(ADMIN, key(), {
    name: "Establo aislado",
  });
  const device = await store.createDevice(ADMIN, key(), {
    site_id: site.id,
    name: "Raspberry de prueba",
  });
  return {
    site,
    device,
    body: {
      site_id: site.id,
      device_id: device.id,
      horse_id: HORSE,
      technical_id: "prueba-norte",
      mac: "aa:bb:cc:dd:ee:01",
      ip_address: "192.168.50.101",
    },
  };
}
test("alta conserva identidad, cámara y caballo; colisión IP revierte todo el intento", async () => {
  const { body } = await prepare();
  await store.createCamera(ADMIN, key(), body);
  await assert.rejects(
    store.createCamera(ADMIN, key(), {
      ...body,
      horse_id: "00000000-0000-4000-8000-000000000022",
      technical_id: "prueba-sur",
      mac: "aa:bb:cc:dd:ee:02",
    }),
    (e) => e.code === "23505",
  );
  const s = await store.snapshot(ADMIN);
  assert.equal(s.cameras.length, 1);
  assert.equal(s.bindings.length, 1);
  assert.equal(s.audit.length, 3);
  assert.equal(s.cameras[0].state, "draft");
  assert.equal(s.bindings[0].horse_id, HORSE);
});
test("no se aceptan dos cámaras para el mismo caballo ni un dispositivo de otra sede", async () => {
  const { body } = await prepare();
  await store.createCamera(ADMIN, key(), body);
  await assert.rejects(
    store.createCamera(ADMIN, key(), {
      ...body,
      technical_id: "prueba-doble",
      mac: "aa:bb:cc:dd:ee:03",
      ip_address: "192.168.50.103",
    }),
    (e) => e.code === "23505",
  );
  const site = await store.createSite(ADMIN, key(), { name: "Otra sede" });
  await assert.rejects(
    store.createCamera(ADMIN, key(), {
      ...body,
      site_id: site.id,
      technical_id: "prueba-otra",
      mac: "aa:bb:cc:dd:ee:04",
      ip_address: "192.168.50.104",
    }),
    (e) => e.code === "23503",
  );
  assert.equal((await store.snapshot(ADMIN)).cameras.length, 1);
});
test("la migración es repetible y los catálogos existentes no se modifican", async () => {
  const before = (
    await db.raw.query(
      "SELECT row_to_json(h) AS value FROM public.horses h ORDER BY id",
    )
  ).rows;
  await migrateIsolated(db.raw);
  await store.createGrant(ADMIN, key(), grant());
  await prepare();
  assert.deepEqual(
    (
      await db.raw.query(
        "SELECT row_to_json(h) AS value FROM public.horses h ORDER BY id",
      )
    ).rows,
    before,
  );
});
test("persistencia sobrevive al cierre y apertura del proceso", async () => {
  const folder = await mkdtemp(join(tmpdir(), "se-control-test-"));
  let persistent;
  try {
    persistent = await openDemo(folder);
    const a = new ControlStore(persistent, { simulation: true });
    const g = await a.createGrant(ADMIN, key(), grant());
    await persistent.close();
    persistent = await openDemo(folder);
    const b = new ControlStore(persistent, { simulation: true });
    assert.equal((await b.snapshot(ADMIN)).grants[0].id, g.id);
  } finally {
    await persistent?.close();
    assert.ok(
      resolve(folder).startsWith(resolve(tmpdir()) + sep) &&
        basename(folder).startsWith("se-control-test-"),
    );
    await rm(folder, { recursive: true, force: true });
  }
});
test("adaptador apagado conserva exactamente la respuesta anterior y no llama al registro", async () => {
  let calls = 0;
  const check = createComplementaryAccess({
    evaluate: () => {
      calls++;
      throw Error();
    },
  });
  for (const value of [false, true, { authorized: true, session: "existing" }])
    assert.equal(await check({ legacyDecision: () => value }), value);
  assert.equal(calls, 0);
});
test("shadow no concede ni retira acceso y rechaza habilitar enforcement", async () => {
  const reports = [];
  const check = createComplementaryAccess({
    mode: "shadow",
    evaluate: () => {
      throw Error("private-error");
    },
    observe: (x) => reports.push(x),
  });
  assert.equal(
    await check({
      horseId: HORSE,
      action: "live",
      legacyDecision: () => false,
    }),
    false,
  );
  assert.equal(
    await check({ horseId: HORSE, action: "live", legacyDecision: () => true }),
    true,
  );
  assert.equal(reports.length, 2);
  assert.equal(JSON.stringify(reports).includes("private-error"), false);
  assert.throws(
    () => createComplementaryAccess({ mode: "enforce" }),
    /NOT_RELEASED/,
  );
});
test("errores del observador y de su transporte nunca alteran la decisión anterior", async () => {
  for (const observe of [
    () => {
      throw Error("observer");
    },
    async () => {
      throw Error("async-observer");
    },
  ]) {
    const check = createComplementaryAccess({
      mode: "shadow",
      evaluate: () => ({ allow: true }),
      observe,
    });
    assert.equal(await check({ legacyDecision: () => false }), false);
  }
});
test("el plan legado preserva credenciales y no infiere fotos ni administración", () => {
  const config = {
    adminUserIds: [ADMIN],
    cameras: [
      {
        id: "test-camera",
        horseId: HORSE,
        publisherKeySha256: "a".repeat(64),
        ownerUserIds: [OWNER, OWNER],
        stableOwnerUserIds: [OWNER],
      },
    ],
  };
  const before = JSON.stringify(config),
    plan = planLegacy(config);
  assert.equal(JSON.stringify(config), before);
  assert.equal(plan.live_grants.length, 2);
  assert.ok(
    plan.live_grants.every((g) => g.live && !g.photos && !g.panel_admin),
  );
  assert.equal(JSON.stringify(plan).includes("a".repeat(64)), false);
  assert.equal(plan.executable, false);
  assert.throws(() =>
    planLegacy({ ...config, cameras: [...config.cameras, ...config.cameras] }),
  );
});
let testPort = 18999;
async function withServer(fn, { mode = "demo", verifyIdentity } = {}) {
  const port = testPort++,
    origin = `http://127.0.0.1:${port}`;
  const server = createControlServer({ store, mode, origin, verifyIdentity });
  await new Promise((resolve) => server.listen(port, "127.0.0.1", resolve));
  try {
    await fn(origin);
  } finally {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}
test("HTTP protege CSRF, origen, sesión y rutas de activación", async () =>
  withServer(async (base) => {
    const boot = await fetch(base + "/api/bootstrap"),
      data = await boot.json(),
      cookie = boot.headers.get("set-cookie").split(";")[0];
    assert.equal(data.production_authority_enabled, false);
    assert.equal(
      (
        await fetch(base + "/api/grants", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Cookie: cookie,
            "Idempotency-Key": key(),
          },
          body: JSON.stringify(grant()),
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/api/bootstrap", {
          headers: { Origin: "https://untrusted.example" },
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(base + "/api/grants", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(grant()),
        })
      ).status,
      401,
    );
    const headers = {
      "Content-Type": "application/json",
      Cookie: cookie,
      "X-CSRF-Token": data.csrf,
      "Idempotency-Key": key(),
    };
    assert.equal(
      (
        await fetch(base + "/api/grants", {
          method: "POST",
          headers,
          body: JSON.stringify(grant()),
        })
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(base + "/api/activate", {
          method: "POST",
          headers,
          body: "{}",
        })
      ).status,
      404,
    );
  }));
test("sesión de usuario sin administración no puede usar panel o simulación por otra identidad", async () =>
  withServer(
    async (base) => {
      assert.equal((await fetch(base + "/api/bootstrap")).status, 403);
      assert.equal(
        (
          await fetch(base + "/api/simulate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              user_id: ADMIN,
              horse_id: HORSE,
              action: "photos",
            }),
          })
        ).status,
        403,
      );
    },
    { mode: "staging", verifyIdentity: () => OWNER },
  ));
