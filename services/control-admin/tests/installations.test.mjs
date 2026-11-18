import { test, before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createHash } from "node:crypto";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import {
  openDemo,
  DEMO_ADMIN as ADMIN,
  DEMO_OWNER as OWNER,
  DEMO_HORSE as HORSE,
} from "../src/db.mjs";
import { ControlStore } from "../src/store.mjs";
import {
  InstallationStore,
  INSTALLATION_STEPS,
} from "../src/installations.mjs";
import { createControlServer } from "../src/server.mjs";
import { migrateIsolated } from "../src/db.mjs";

let db, control, installations;
before(async () => {
  db = await openDemo();
  control = new ControlStore(db, { simulation: true });
  installations = new InstallationStore(control);
});
after(async () => db.close());
beforeEach(async () => {
  await db.raw.exec(
    "TRUNCATE se_control_v1.inventory_observations,se_control_v1.installation_plans,se_control_v1.resource_claims,se_control_v1.installation_runs,se_control_v1.installation_steps,se_control_v1.idempotency,se_control_v1.audit,se_control_v1.grants,se_control_v1.bindings,se_control_v1.cameras,se_control_v1.devices,se_control_v1.sites CASCADE",
  );
});
async function fixture() {
  const site = await control.createSite(ADMIN, randomUUID(), {
    name: "Establo de ensayo",
  });
  const device = await control.createDevice(ADMIN, randomUUID(), {
    site_id: site.id,
    name: "raspberry-ensayo",
  });
  const camera = await control.createCamera(ADMIN, randomUUID(), {
    site_id: site.id,
    device_id: device.id,
    horse_id: HORSE,
    technical_id: "ensayo-norte",
    mac: "aa:bb:cc:dd:ee:01",
    ip_address: "192.168.50.101",
  });
  const input = {
    camera_id: camera.id,
    node_id: 101,
    bucket: "stableeye-test-bucket",
    wasabi_region: "us-east-1",
    receiver_origin: "https://receiver.example.invalid",
  };
  const observed = {
    site_id: site.id,
    horse_id: HORSE,
    technical_id: camera.technical_id,
    mac: camera.mac,
    ip_address: camera.ip_address,
    node_id: 101,
  };
  return { site, device, camera, input, observed };
}
async function prepared() {
  const f = await fixture();
  return {
    ...f,
    plan: await installations.createPlan(ADMIN, randomUUID(), f.input),
  };
}
async function queued() {
  const f = await prepared();
  return {
    ...f,
    run: await installations.enqueue(ADMIN, randomUUID(), f.plan.id),
  };
}

test("plan, políticas y evidencias no contienen credenciales ni comandos ejecutables", async () => {
  const { plan } = await prepared();
  const detail = await installations.detail(ADMIN, plan.id);
  assert.equal(detail.executable, false);
  assert.equal(detail.artifacts.camera.preserve_main_stream, true);
  assert.equal(detail.artifacts.camera.video_mode, "copy");
  assert.equal(
    detail.artifacts.required_evidence.length,
    INSTALLATION_STEPS.length,
  );
  assert.ok(
    detail.artifacts.required_evidence.every((e) => e.state === "not_verified"),
  );
  const policy = detail.artifacts.writer_policy;
  assert.deepEqual(policy.Statement[1].Action, [
    "s3:PutObject",
    "s3:GetObject",
  ]);
  assert.equal(
    policy.Statement[1].Resource[0],
    `arn:aws:s3:::stableeye-test-bucket/stable-eye/${plan.spec.site_id}/node_101/*`,
  );
  assert.equal(JSON.stringify(policy).includes("s3:Delete"), false);
  assert.equal(JSON.stringify(policy).includes("s3:*"), false);
  assert.deepEqual(detail.artifacts.reader_policy.Statement[1].Action, [
    "s3:GetObject",
  ]);
});

test("plan doble clic: un plan, cinco reservas y una auditoría adicional", async () => {
  const { input } = await fixture(),
    key = randomUUID();
  const [a, b] = await Promise.all([
    installations.createPlan(ADMIN, key, input),
    installations.createPlan(ADMIN, key, input),
  ]);
  assert.equal(a.id, b.id);
  assert.equal(
    (
      await db.raw.query(
        "SELECT count(*) AS n FROM se_control_v1.resource_claims",
      )
    ).rows[0].n,
    5,
  );
  await assert.rejects(
    installations.createPlan(ADMIN, key, { ...input, node_id: 102 }),
    (e) => e.status === 409,
  );
});

test("rechaza campos de secretos, URLs con credenciales y valores ambiguos", async () => {
  const { input } = await fixture();
  for (const extra of [
    { publisherKey: "never-saved" },
    { rtspUrl: "rtsp://private" },
    { executable: true },
    { node_id: 0 },
    { receiver_origin: "http://receiver.example.invalid" },
    { receiver_origin: "https://name:password@receiver.example.invalid" },
    { receiver_origin: "https://receiver.example.invalid/?key=secret" },
    { bucket: "*" },
  ]) {
    await assert.rejects(
      installations.createPlan(ADMIN, randomUUID(), { ...input, ...extra }),
      (e) => e.status === 400,
    );
  }
  assert.equal((await installations.list(ADMIN, "plans")).items.length, 0);
});

test("inventario legado es observación inmutable y repetible, no adopción", async () => {
  const { observed } = await fixture();
  const before = JSON.stringify(observed);
  const a = await installations.observe(ADMIN, randomUUID(), {
    source: "Inventario revisado",
    cameras: [observed],
  });
  const b = await installations.observe(ADMIN, randomUUID(), {
    source: "Segundo registro",
    cameras: [observed],
  });
  assert.equal(a.id, b.id);
  assert.equal(b.unchanged, true);
  assert.equal(a.managed_by, "legacy");
  assert.equal(a.executable, false);
  assert.equal(JSON.stringify(observed), before);
  await assert.rejects(
    db.tx(ADMIN, (c) =>
      c.query(
        "UPDATE se_control_v1.inventory_observations SET source='changed'",
      ),
    ),
    (e) => e.code === "42501",
  );
});

test("no permite planificar sobre una cámara, caballo, MAC, IP o nodo observado", async () => {
  const { input, observed } = await fixture();
  await installations.observe(ADMIN, randomUUID(), {
    source: "Legado",
    cameras: [observed],
  });
  await assert.rejects(
    installations.createPlan(ADMIN, randomUUID(), input),
    (e) => e.code === "LEGACY_RESOURCE_PROTECTED",
  );
  assert.equal((await installations.list(ADMIN, "plans")).items.length, 0);
  assert.equal(
    (
      await db.raw.query(
        "SELECT count(*) AS n FROM se_control_v1.resource_claims",
      )
    ).rows[0].n,
    5,
  );
});

test("importar un lote con colisión revierte todo y preserva sus registros anteriores", async () => {
  const { observed } = await fixture();
  const other = {
    ...observed,
    technical_id: "ensayo-sur",
    mac: "aa:bb:cc:dd:ee:02",
    horse_id: "00000000-0000-4000-8000-000000000022",
  };
  await assert.rejects(
    installations.observe(ADMIN, randomUUID(), {
      source: "Colisión",
      cameras: [observed, other],
    }),
    (e) => e.code === "INVENTORY_CONFLICT",
  );
  assert.equal((await installations.list(ADMIN, "inventory")).items.length, 0);
  assert.equal(
    (
      await db.raw.query(
        "SELECT count(*) AS n FROM se_control_v1.resource_claims",
      )
    ).rows[0].n,
    0,
  );
});

test("una IP puede repetirse en sedes aisladas; cameraId y MAC no", async () => {
  const { observed } = await fixture();
  const other = {
    ...observed,
    site_id: randomUUID(),
    horse_id: randomUUID(),
    technical_id: "otra-sede-sur",
    mac: "aa:bb:cc:dd:ee:02",
  };
  await installations.observe(ADMIN, randomUUID(), {
    source: "Redes aisladas",
    cameras: [observed, other],
  });
  const third = {
    ...other,
    site_id: randomUUID(),
    horse_id: randomUUID(),
    technical_id: "tercera-sede",
  };
  await assert.rejects(
    installations.observe(ADMIN, randomUUID(), {
      source: "MAC repetida",
      cameras: [third],
    }),
    (e) => e.code === "INVENTORY_CONFLICT",
  );
});

test("identidades de inventario son estrictas y lotes están acotados", async () => {
  const { observed } = await fixture();
  for (const cameras of [
    [],
    Array.from({ length: 101 }, () => observed),
    [{ ...observed, ip_address: "192.168.050.101" }],
    [{ ...observed, ip_address: "8.8.8.8" }],
    [{ ...observed, secret: "rejected" }],
  ]) {
    await assert.rejects(
      installations.observe(ADMIN, randomUUID(), { source: "Prueba", cameras }),
      (e) => e.status === 400,
    );
  }
});

test("RLS y permisos niegan inventario, planes y trabajos a un usuario no administrador", async () => {
  const { plan } = await prepared();
  for (const table of [
    "inventory_observations",
    "installation_plans",
    "resource_claims",
    "installation_runs",
    "installation_steps",
  ]) {
    assert.equal(
      (
        await db.tx(OWNER, (c) =>
          c.query(`SELECT * FROM se_control_v1.${table}`),
        )
      ).rows.length,
      0,
    );
    await assert.rejects(
      db.tx(ADMIN, (c) => c.query(`DELETE FROM se_control_v1.${table}`)),
      (e) => e.code === "42501",
    );
  }
  for (const task of [
    () => installations.list(OWNER, "plans"),
    () => installations.detail(OWNER, plan.id),
    () => installations.enqueue(OWNER, randomUUID(), plan.id),
  ])
    await assert.rejects(task(), (e) => e.status === 403);
});

test("un trabajo por plan, cola idempotente y ejecución real prohibida por SQL", async () => {
  const { plan } = await prepared(),
    key = randomUUID();
  const a = await installations.enqueue(ADMIN, key, plan.id),
    b = await installations.enqueue(ADMIN, key, plan.id);
  assert.equal(a.id, b.id);
  await assert.rejects(
    installations.enqueue(ADMIN, randomUUID(), plan.id),
    (e) => e.code === "23505",
  );
  await assert.rejects(
    db.raw.query(
      "UPDATE se_control_v1.installation_runs SET mode='execute' WHERE id=$1",
      [a.id],
    ),
    (e) => e.code === "23514",
  );
  await assert.rejects(
    db.raw.query(
      "UPDATE se_control_v1.installation_plans SET executable=true WHERE id=$1",
      [plan.id],
    ),
    (e) => e.code === "23514",
  );
});

test("dos workers no pueden reclamar simultáneamente la misma ejecución", async () => {
  const { run } = await queued();
  const leases = await Promise.all([
    installations.claim(ADMIN, run.id),
    installations.claim(ADMIN, run.id),
  ]);
  assert.equal(leases.filter(Boolean).length, 1);
  await installations.finish(ADMIN, leases.find(Boolean));
  await assert.rejects(
    installations.finish(ADMIN, leases.find(Boolean)),
    (e) => e.code === "LEASE_LOST",
  );
});

test("diez pasos dejan evidencia simulada, sin certificar acciones externas", async () => {
  const { run } = await queued();
  for (let i = 0; i < INSTALLATION_STEPS.length; i++)
    await installations.advance(ADMIN, run.id);
  const result = await installations.run(ADMIN, run.id);
  assert.equal(result.state, "simulated");
  assert.equal(result.executable, false);
  assert.ok(
    result.steps.every(
      (s) =>
        s.state === "simulated" &&
        s.evidence.external_action_performed === false &&
        s.evidence.external_verification === "required",
    ),
  );
  assert.equal(result.lease_token, undefined);
  assert.equal(
    (await installations.list(ADMIN, "runs")).items[0].lease_token,
    undefined,
  );
  assert.equal((await installations.advance(ADMIN, run.id)).state, "simulated");
});

test("un proceso nuevo recupera la concesión vencida y descarta al worker antiguo", async () => {
  const { run } = await queued(),
    previous = await installations.claim(ADMIN, run.id);
  await db.raw.query(
    "UPDATE se_control_v1.installation_runs SET lease_until=now()-interval '1 second' WHERE id=$1",
    [run.id],
  );
  const restartedWorker = new InstallationStore(
    new ControlStore(db, { simulation: true }),
  );
  const current = await restartedWorker.claim(ADMIN, run.id);
  assert.notEqual(current.token, previous.token);
  await assert.rejects(
    installations.finish(ADMIN, previous),
    (e) => e.code === "LEASE_LOST",
  );
  await restartedWorker.finish(ADMIN, current);
  assert.equal(
    (await installations.run(ADMIN, run.id)).steps.filter(
      (s) => s.state === "simulated",
    ).length,
    1,
  );
});

test("tres caídas consecutivas terminan el trabajo y evitan bucles", async () => {
  const { run } = await queued();
  for (let i = 0; i < 3; i++) {
    assert.ok(await installations.claim(ADMIN, run.id));
    await db.raw.query(
      "UPDATE se_control_v1.installation_runs SET lease_until=now()-interval '1 second' WHERE id=$1",
      [run.id],
    );
  }
  assert.equal(await installations.claim(ADMIN, run.id), null);
  assert.equal((await installations.run(ADMIN, run.id)).state, "failed");
  assert.equal(
    (await installations.run(ADMIN, run.id)).last_error,
    "RETRY_LIMIT",
  );
});

test("errores transitorios tienen espera y 401/403 clasificados no se reintentan", async () => {
  const { run } = await queued();
  const a = await installations.claim(ADMIN, run.id);
  assert.equal(
    (await installations.failAttempt(ADMIN, a, "TRANSIENT_UNAVAILABLE")).state,
    "retry_wait",
  );
  assert.equal(await installations.claim(ADMIN, run.id), null);
  await db.raw.query(
    "UPDATE se_control_v1.installation_runs SET next_attempt_at=now()-interval '1 second' WHERE id=$1",
    [run.id],
  );
  const b = await installations.claim(ADMIN, run.id);
  assert.equal(
    (await installations.failAttempt(ADMIN, b, "AUTH_REJECTED")).state,
    "failed",
  );
  assert.equal(await installations.claim(ADMIN, run.id), null);
  await assert.rejects(
    installations.failAttempt(ADMIN, b, "https://credential:secret@private"),
    (e) => e.code === "INVALID_ERROR_CATEGORY",
  );
});

test("cancelar durante un paso impide aplicar su resultado tardío y conserva reservas", async () => {
  const { run } = await queued(),
    lease = await installations.claim(ADMIN, run.id);
  await installations.cancel(ADMIN, randomUUID(), run.id);
  await assert.rejects(
    installations.finish(ADMIN, lease),
    (e) => e.code === "LEASE_LOST",
  );
  assert.equal((await installations.run(ADMIN, run.id)).state, "cancelled");
  assert.equal(
    (
      await db.raw.query(
        "SELECT count(*) AS n FROM se_control_v1.resource_claims",
      )
    ).rows[0].n,
    5,
  );
});

test("cambiar asociación después de aprobar un plan lo invalida", async () => {
  const { plan, camera } = await prepared();
  await db.raw.query(
    "UPDATE se_control_v1.bindings SET ends_at=now() WHERE camera_id=$1",
    [camera.id],
  );
  await assert.rejects(
    installations.enqueue(ADMIN, randomUUID(), plan.id),
    (e) => e.code === "PLAN_STALE",
  );
});

test("integridad de contenido detecta cambios fuera del plan", async () => {
  const { plan } = await prepared();
  await db.raw.query(
    "UPDATE se_control_v1.installation_plans SET spec=jsonb_set(spec,'{node_id}','999') WHERE id=$1",
    [plan.id],
  );
  await assert.rejects(
    installations.detail(ADMIN, plan.id),
    (e) => e.code === "PLAN_HASH_MISMATCH",
  );
});

test("catálogo pagina 3.600 caballos sin repeticiones, acota respuesta y busca nombre", async (t) => {
  await db.raw.exec(
    "INSERT INTO public.horses SELECT md5('scale-horse-'||n)::uuid,'Caballo escala '||n,true FROM generate_series(1,3600) n",
  );
  const ids = new Set(),
    start = performance.now();
  let after = null,
    pages = 0;
  do {
    const result = await installations.list(ADMIN, "horses", {
      after,
      limit: 100,
    });
    assert.ok(result.items.length <= 100);
    assert.ok(Buffer.byteLength(JSON.stringify(result)) < 20000);
    for (const horse of result.items) {
      assert.equal(ids.has(horse.id), false);
      ids.add(horse.id);
    }
    after = result.next;
    pages++;
  } while (after);
  assert.equal(ids.size, 3602);
  const found = await installations.list(ADMIN, "horses", { q: "escala 3600" });
  assert.equal(found.items.length, 1);
  t.diagnostic(
    JSON.stringify({
      catalog_rows: ids.size,
      pages,
      elapsed_ms: Math.round(performance.now() - start),
      environment: "embedded-postgres-local-not-production-benchmark",
    }),
  );
  await db.raw.exec(
    "DELETE FROM public.horses WHERE name LIKE 'Caballo escala %'",
  );
});

test("paginación rechaza inyección, páginas grandes y cursor inválido", async () => {
  for (const [type, options] of [
    ["plans;drop table horses", {}],
    ["plans", { limit: 101 }],
    ["plans", { after: "no-uuid" }],
    ["users", { q: "a".repeat(121) }],
  ])
    await assert.rejects(
      installations.list(ADMIN, type, options),
      (e) => e.status === 400,
    );
  assert.equal(
    (await installations.list(ADMIN, "users", { q: "%' OR true--" })).items
      .length,
    0,
  );
});

test("registro de 300 Raspberry y 3.600 cámaras se consulta en páginas acotadas", async (t) => {
  const start = performance.now();
  await db.raw.exec(`
    INSERT INTO se_control_v1.sites(id,name) SELECT md5('scale-site-'||n)::uuid,'Sede de escala '||n FROM generate_series(1,100) n;
    INSERT INTO se_control_v1.devices(id,site_id,name) SELECT md5('scale-device-'||n)::uuid,md5('scale-site-'||((n-1)/3+1))::uuid,'Pi de escala '||n FROM generate_series(1,300) n;
    INSERT INTO se_control_v1.cameras(id,device_id,site_id,technical_id,mac,ip_address)
      SELECT md5('scale-camera-'||n)::uuid,md5('scale-device-'||((n-1)/12+1))::uuid,
      md5('scale-site-'||((n-1)/36+1))::uuid,'scale-camera-'||n,
      regexp_replace(lpad(to_hex(n),12,'0'),'(..)(..)(..)(..)(..)(..)','\\1:\\2:\\3:\\4:\\5:\\6'),
      ('10.42.'||((n-1)%36+1)||'.101')::inet FROM generate_series(1,3600) n;
  `);
  for (const [kind, expected] of [
    ["devices", 300],
    ["cameras", 3600],
  ]) {
    let after = null;
    const ids = new Set();
    do {
      const page = await installations.list(ADMIN, kind, { after, limit: 100 });
      assert.ok(page.items.length <= 100);
      for (const row of page.items) {
        assert.equal(ids.has(row.id), false);
        ids.add(row.id);
      }
      after = page.next;
    } while (after);
    assert.equal(ids.size, expected);
  }
  t.diagnostic(
    JSON.stringify({
      devices: 300,
      cameras: 3600,
      elapsed_ms: Math.round(performance.now() - start),
      scope: "registry-only-not-Pi-or-stream-capacity",
    }),
  );
});

test("actualizar el esquema inicial conserva datos y no reescribe su migración", async () => {
  const { PGlite } = await import("@electric-sql/pglite");
  const old = await PGlite.create("memory://");
  try {
    await old.exec(
      "CREATE SCHEMA auth; CREATE TABLE auth.users(id uuid PRIMARY KEY); CREATE TABLE public.user_profiles(id uuid PRIMARY KEY,email text,full_name text,is_active boolean); CREATE TABLE public.horses(id uuid PRIMARY KEY,name text,is_active boolean)",
    );
    const sql = (
      await readFile(new URL("../db/001_control.sql", import.meta.url), "utf8")
    ).replace(/\r\n/g, "\n");
    await old.exec(sql);
    const checksum = createHash("sha256").update(sql).digest("hex");
    await old.query("INSERT INTO se_control_v1.migrations VALUES(1,$1)", [
      checksum,
    ]);
    await old.query("INSERT INTO auth.users VALUES($1)", [ADMIN]);
    const id = randomUUID();
    await old.query(
      "INSERT INTO se_control_v1.sites(id,name) VALUES($1,'Registro anterior')",
      [id],
    );
    await migrateIsolated(old);
    await migrateIsolated(old);
    assert.equal(
      (
        await old.query("SELECT name FROM se_control_v1.sites WHERE id=$1", [
          id,
        ])
      ).rows[0].name,
      "Registro anterior",
    );
    assert.equal(
      (
        await old.query(
          "SELECT checksum FROM se_control_v1.migrations WHERE version=1",
        )
      ).rows[0].checksum,
      checksum,
    );
    assert.equal(
      (await old.query("SELECT count(*) AS n FROM se_control_v1.migrations"))
        .rows[0].n,
      2,
    );
  } finally {
    await old.close();
  }
});

test("plan y progreso persisten tras cerrar y reabrir completamente la base", async () => {
  const folder = await mkdtemp(join(tmpdir(), "stableeye-installation-test-"));
  const path = join(folder, "database");
  let local;
  try {
    local = await openDemo(path);
    let c = new ControlStore(local, { simulation: true }),
      s = new InstallationStore(c);
    const site = await c.createSite(ADMIN, randomUUID(), {
      name: "Persistencia",
    });
    const device = await c.createDevice(ADMIN, randomUUID(), {
      site_id: site.id,
      name: "persistente",
    });
    const camera = await c.createCamera(ADMIN, randomUUID(), {
      site_id: site.id,
      device_id: device.id,
      horse_id: HORSE,
      technical_id: "persistente-camera",
      mac: "aa:bb:cc:dd:ee:99",
      ip_address: "192.168.60.100",
    });
    const plan = await s.createPlan(ADMIN, randomUUID(), {
      camera_id: camera.id,
      node_id: 99,
      bucket: "test-persistence",
      wasabi_region: "us-east-1",
      receiver_origin: "https://receiver.example.invalid",
    });
    const run = await s.enqueue(ADMIN, randomUUID(), plan.id);
    await s.advance(ADMIN, run.id);
    await local.close();
    local = null;
    local = await openDemo(path);
    c = new ControlStore(local, { simulation: true });
    s = new InstallationStore(c);
    assert.equal((await s.detail(ADMIN, plan.id)).spec_hash, plan.spec_hash);
    assert.equal((await s.run(ADMIN, run.id)).steps[0].state, "simulated");
    await s.advance(ADMIN, run.id);
    assert.equal(
      (await s.run(ADMIN, run.id)).steps.filter(
        (step) => step.state === "simulated",
      ).length,
      2,
    );
  } finally {
    if (local) await local.close();
    const target = resolve(folder),
      parent = resolve(tmpdir()) + sep;
    assert.ok(
      target.startsWith(parent) &&
        target.includes("stableeye-installation-test-"),
    );
    await rm(target, { recursive: true, force: true });
  }
});

test("HTTP no acepta evidencia de éxito ni activación real", async () => {
  const { plan } = await prepared();
  const server = createControlServer({
    store: control,
    origin: "http://127.0.0.1:19099",
  });
  await new Promise((r) => server.listen(19099, "127.0.0.1", r));
  try {
    const response = await fetch("http://127.0.0.1:19099/api/bootstrap"),
      bootstrap = await response.json();
    const headers = {
      Cookie: response.headers.get("set-cookie").split(";")[0],
      "Content-Type": "application/json",
      "X-CSRF-Token": bootstrap.csrf,
      "Idempotency-Key": randomUUID(),
    };
    const route = `http://127.0.0.1:19099/api/installations/plans/${plan.id}/simulations`;
    assert.equal(
      (
        await fetch(route, {
          method: "POST",
          headers,
          body: JSON.stringify({ evidence: { verified: true } }),
        })
      ).status,
      400,
    );
    const enqueued = await (
      await fetch(route, { method: "POST", headers, body: "{}" })
    ).json();
    assert.equal(enqueued.mode, "simulation");
    const advance = await (
      await fetch(
        `http://127.0.0.1:19099/api/installations/runs/${enqueued.id}/advance`,
        { method: "POST", headers, body: "{}" },
      )
    ).json();
    assert.equal(advance.steps[0].state, "simulated");
    assert.equal(
      (
        await fetch(
          `http://127.0.0.1:19099/api/installations/plans/${plan.id}/activate`,
          { method: "POST", headers, body: "{}" },
        )
      ).status,
      404,
    );
    assert.equal(
      (
        await fetch(
          "http://127.0.0.1:19099/api/installations/plans?limit=1000",
          { headers },
        )
      ).status,
      400,
    );
  } finally {
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
});
