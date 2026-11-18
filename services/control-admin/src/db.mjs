import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
export const DEMO_ADMIN = "00000000-0000-4000-8000-000000000001";
export const DEMO_OWNER = "00000000-0000-4000-8000-000000000011";
export const DEMO_HORSE = "00000000-0000-4000-8000-000000000021";
const migrationUrl = new URL("../db/001_control.sql", import.meta.url);

export async function migrateIsolated(db) {
  const sql = (await readFile(migrationUrl, "utf8")).replace(/\r\n/g, "\n"),
    checksum = createHash("sha256").update(sql).digest("hex");
  const existing = await db.query(
    "SELECT to_regclass('se_control_v1.migrations') AS name",
  );
  if (existing.rows[0].name) {
    const result = await db.query(
      "SELECT checksum FROM se_control_v1.migrations WHERE version=1",
    );
    if (result.rows[0]?.checksum !== checksum)
      throw Error("MIGRATION_CHECKSUM_MISMATCH");
    return;
  }
  await db.exec("BEGIN");
  try {
    await db.exec(sql);
    await db.query("INSERT INTO se_control_v1.migrations VALUES(1,$1)", [
      checksum,
    ]);
    await db.exec("COMMIT");
  } catch (error) {
    await db.exec("ROLLBACK");
    throw error;
  }
}

export async function openDemo(path) {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = await PGlite.create(path || "memory://");
  await db.exec(`CREATE SCHEMA IF NOT EXISTS auth;
 CREATE TABLE IF NOT EXISTS auth.users(id uuid PRIMARY KEY);
 CREATE TABLE IF NOT EXISTS public.user_profiles(id uuid PRIMARY KEY REFERENCES auth.users(id),email text NOT NULL,full_name text NOT NULL,is_active boolean NOT NULL);
 CREATE TABLE IF NOT EXISTS public.horses(id uuid PRIMARY KEY,name text NOT NULL,is_active boolean NOT NULL);`);
  await migrateIsolated(db);
  for (const [id, email, name] of [
    [DEMO_ADMIN, "administrador@example.invalid", "Administrador de prueba"],
    [DEMO_OWNER, "propietaria@example.invalid", "Propietaria de prueba"],
    [
      "00000000-0000-4000-8000-000000000012",
      "veterinario@example.invalid",
      "Veterinario de prueba",
    ],
  ]) {
    await db.query("INSERT INTO auth.users VALUES($1) ON CONFLICT DO NOTHING", [
      id,
    ]);
    await db.query(
      "INSERT INTO public.user_profiles VALUES($1,$2,$3,true) ON CONFLICT DO NOTHING",
      [id, email, name],
    );
  }
  for (const [id, name] of [
    [DEMO_HORSE, "Caballo de prueba Norte"],
    ["00000000-0000-4000-8000-000000000022", "Caballo de prueba Sur"],
  ])
    await db.query(
      "INSERT INTO public.horses VALUES($1,$2,true) ON CONFLICT DO NOTHING",
      [id, name],
    );
  await db.query(
    "INSERT INTO se_control_v1.admin_users VALUES($1) ON CONFLICT DO NOTHING",
    [DEMO_ADMIN],
  );
  let chain = Promise.resolve();
  return {
    kind: "isolated-postgres",
    close: () => db.close(),
    raw: db,
    async tx(actor, fn) {
      let release;
      const prior = chain;
      chain = new Promise((r) => (release = r));
      await prior;
      try {
        return await db.transaction(async (c) => {
          await c.exec("SET LOCAL ROLE se_control_runtime");
          await c.query("SELECT set_config('se_control.actor_id',$1,true)", [
            actor,
          ]);
          return fn(c);
        });
      } finally {
        release();
      }
    },
  };
}

export async function openProduction(env) {
  // Explicitly no migrations, seeding or production import on server startup.
  if (!env.CONTROL_DATABASE_URL) throw Error("ISOLATED_DATABASE_REQUIRED");
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: env.CONTROL_DATABASE_URL,
    max: 4,
    connectionTimeoutMillis: 5000,
    ssl: { rejectUnauthorized: true },
  });
  const probe = await pool.query(
    "SELECT to_regclass('se_control_v1.release_guard') AS name",
  );
  if (!probe.rows[0].name) {
    await pool.end();
    throw Error("PRIVATE_SCHEMA_NOT_INSTALLED");
  }
  return {
    kind: "postgres",
    close: () => pool.end(),
    async tx(actor, fn) {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        await c.query("SET LOCAL ROLE se_control_runtime");
        await c.query("SELECT set_config('se_control.actor_id',$1,true)", [
          actor,
        ]);
        const result = await fn(c);
        await c.query("COMMIT");
        return result;
      } catch (error) {
        await c.query("ROLLBACK");
        throw error;
      } finally {
        c.release();
      }
    },
  };
}
