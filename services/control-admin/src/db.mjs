import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
export const DEMO_ADMIN = "00000000-0000-4000-8000-000000000001";
export const DEMO_OWNER = "00000000-0000-4000-8000-000000000011";
export const DEMO_HORSE = "00000000-0000-4000-8000-000000000021";
export const migrationFiles = [
  "001_control.sql",
  "002_installations.sql",
  "003_people.sql",
  "004_bounded_catalog.sql",
  "005_private_rls_indexes.sql",
  "006_context_initplans.sql",
  "007_organizations.sql",
];

export async function migrateIsolated(db) {
  for (const [index, filename] of migrationFiles.entries()) {
    const version = index + 1;
    const sql = (
      await readFile(new URL("../db/" + filename, import.meta.url), "utf8")
    ).replace(/\r\n/g, "\n");
    const checksum = createHash("sha256").update(sql).digest("hex");
    const existing = await db.query(
      "SELECT to_regclass('se_control_v1.migrations') AS name",
    );
    if (existing.rows[0].name) {
      const result = await db.query(
        "SELECT checksum FROM se_control_v1.migrations WHERE version=$1",
        [version],
      );
      if (result.rows.length) {
        if (result.rows[0].checksum !== checksum)
          throw Error("MIGRATION_CHECKSUM_MISMATCH");
        continue;
      }
    }
    await db.exec("BEGIN");
    try {
      await db.exec(sql);
      await db.query("INSERT INTO se_control_v1.migrations VALUES($1,$2)", [
        version,
        checksum,
      ]);
      await db.exec("COMMIT");
    } catch (error) {
      await db.exec("ROLLBACK");
      throw error;
    }
  }
}

export async function openDemo(path) {
  const { PGlite } = await import("@electric-sql/pglite");
  const db = await PGlite.create(path || "memory://");
  await db.exec(`CREATE SCHEMA IF NOT EXISTS auth;
 CREATE TABLE IF NOT EXISTS auth.users(id uuid PRIMARY KEY);
 CREATE TABLE IF NOT EXISTS public.user_profiles(id uuid PRIMARY KEY REFERENCES auth.users(id),email text NOT NULL,full_name text NOT NULL,is_active boolean NOT NULL);
 CREATE TABLE IF NOT EXISTS public.horses(id uuid PRIMARY KEY,name text NOT NULL,is_active boolean NOT NULL);`);
  // Local fixture upgrade only. Never called for a hosted project.
  await db.exec(`ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS email text;
 ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_app_meta_data jsonb NOT NULL DEFAULT '{}';
 ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'owner';
 ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS stall_number text;
 ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES public.user_profiles(id);
 ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS photo_backend text NOT NULL DEFAULT 'supabase';
 UPDATE public.horses SET stall_number='DEMO-'||id::text WHERE stall_number IS NULL;
 ALTER TABLE public.horses ALTER COLUMN stall_number SET NOT NULL;
 CREATE UNIQUE INDEX IF NOT EXISTS demo_horse_stall_unique ON public.horses(stall_number);
 CREATE UNIQUE INDEX IF NOT EXISTS demo_profile_email_unique ON public.user_profiles(email);
 CREATE UNIQUE INDEX IF NOT EXISTS demo_auth_email_unique ON auth.users(lower(email)) WHERE email IS NOT NULL;
 CREATE TABLE IF NOT EXISTS auth.sessions(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES auth.users(id),not_after timestamptz);`);
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
    await db.query(
      "INSERT INTO auth.users(id) VALUES($1) ON CONFLICT DO NOTHING",
      [id],
    );
    await db.query(
      "INSERT INTO public.user_profiles(id,email,full_name,is_active) VALUES($1,$2,$3,true) ON CONFLICT DO NOTHING",
      [id, email, name],
    );
    await db.query(
      "UPDATE auth.users SET email=$2 WHERE id=$1 AND email IS NULL",
      [id, email],
    );
  }
  for (const [id, name] of [
    [DEMO_HORSE, "Caballo de prueba Norte"],
    ["00000000-0000-4000-8000-000000000022", "Caballo de prueba Sur"],
  ])
    await db.query(
      "INSERT INTO public.horses(id,name,is_active,stall_number,owner_id) VALUES($1,$2,true,$3,$4) ON CONFLICT DO NOTHING",
      [id, name, "DEMO-" + id, DEMO_OWNER],
    );
  await db.query(
    "INSERT INTO se_control_v1.admin_users VALUES($1) ON CONFLICT DO NOTHING",
    [DEMO_ADMIN],
  );
  await db.exec(
    "INSERT INTO se_control_v1.deployment_guard(id,environment,people_enabled) VALUES(1,'demo',true) ON CONFLICT DO NOTHING",
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

export function stagingDatabaseUrl(value, ref) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw Error("ISOLATED_DATABASE_REQUIRED");
  }
  const direct = url.hostname === `db.${ref}.supabase.co`;
  const pooler =
    /^aws-[0-9]+-[a-z0-9-]+\.pooler\.supabase\.com$/.test(url.hostname) &&
    decodeURIComponent(url.username).endsWith("." + ref);
  if (
    !["postgresql:", "postgres:"].includes(url.protocol) ||
    !url.username ||
    !url.password ||
    url.pathname !== "/postgres" ||
    url.search ||
    url.hash ||
    (!direct && !pooler)
  )
    throw Error("ISOLATED_DATABASE_URL_REQUIRED");
  return url.toString();
}
export async function openProduction(env) {
  // Explicitly no migrations, seeding or production import on server startup.
  const { stagingConfiguration } = await import("./auth.mjs");
  const config = stagingConfiguration(env);
  if (!env.CONTROL_DATABASE_URL) throw Error("ISOLATED_DATABASE_REQUIRED");
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: stagingDatabaseUrl(env.CONTROL_DATABASE_URL, config.ref),
    max: 4,
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: true,
      ...(env.CONTROL_DATABASE_CA_PATH
        ? { ca: await readFile(env.CONTROL_DATABASE_CA_PATH, "utf8") }
        : {}),
    },
  });
  try {
    const role = (
      await pool.query(
        "SELECT r.rolsuper,r.rolbypassrls,r.rolcreatedb,r.rolcreaterole,pg_has_role(current_user,'se_control_runtime','MEMBER') AS runtime_member,pg_has_role(current_user,'postgres','MEMBER') AS privileged_member FROM pg_roles r WHERE r.rolname=current_user",
      )
    ).rows[0];
    if (
      !role ||
      role.rolsuper ||
      role.rolbypassrls ||
      role.rolcreatedb ||
      role.rolcreaterole ||
      role.privileged_member ||
      !role.runtime_member
    )
      throw Error("RESTRICTED_DATABASE_ROLE_REQUIRED");
    const probe = await pool.query(
      "SELECT to_regclass('se_control_v1.release_guard') AS name",
    );
    if (!probe.rows[0].name) {
      throw Error("PRIVATE_SCHEMA_NOT_INSTALLED");
    }
    const installed = await pool.query(
      "SELECT version,checksum FROM se_control_v1.migrations ORDER BY version",
    );
    for (const [index, file] of migrationFiles.entries()) {
      const sql = (
        await readFile(new URL("../db/" + file, import.meta.url), "utf8")
      ).replace(/\r\n/g, "\n");
      if (
        installed.rows.find((r) => r.version === index + 1)?.checksum !==
        createHash("sha256").update(sql).digest("hex")
      ) {
        throw Error("PRIVATE_SCHEMA_VERSION_MISMATCH");
      }
    }
    const deployment = (
      await pool.query("SELECT se_control_v1.deployment_info() AS info")
    ).rows[0].info;
    if (
      deployment?.environment !== "staging" ||
      deployment.project_ref !== config.ref
    ) {
      throw Error("DATABASE_PROJECT_MISMATCH");
    }
  } catch (error) {
    await pool.end();
    throw error;
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
