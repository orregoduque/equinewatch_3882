import { readFile, writeFile } from "node:fs/promises";
import { Client } from "pg";
const file = new URL("../private/staging.private.json", import.meta.url);
const config = JSON.parse(await readFile(file, "utf8"));
const published = JSON.parse(
  await readFile(
    new URL("../private/public-staging.json", import.meta.url),
    "utf8",
  ),
);
const ca = await readFile(
  new URL("../private/supabase-ca.crt", import.meta.url),
  "utf8",
);
if (
  config.project_ref !== "xzfwcwfmnypgcunavmlc" ||
  published.project_ref !== config.project_ref
)
  throw Error("STAGING_REQUIRED");
for (const kind of ["admin", "owner", "outside"]) {
  const fixture = config.fixtures[kind];
  const request = {
    email: fixture.email,
    full_name: fixture.full_name,
    request_id: fixture.request_id,
    password: fixture.password,
  };
  const response = await fetch(
    `${published.url}/functions/v1/control-fixture-accounts`,
    {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.fixture_token,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (!response.ok) {
    console.log(
      JSON.stringify({
        phase: "fixture-account",
        kind,
        status: response.status,
        credentials_printed: false,
      }),
    );
    process.exit(1);
  }
  fixture.id = (await response.json()).id;
  await writeFile(file, JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  });
}
const failures = [];
for (const host of [
  "aws-0-eu-central-2.pooler.supabase.com",
  "aws-1-eu-central-2.pooler.supabase.com",
]) {
  const client = new Client({
    host,
    port: 5432,
    database: "postgres",
    user: config.db_user + "." + config.project_ref,
    password: config.db_password,
    ssl: { rejectUnauthorized: true, ca },
    connectionTimeoutMillis: 5000,
  });
  try {
    await client.connect();
    const deployment = (
      await client.query("SELECT se_control_v1.deployment_info() AS info")
    ).rows[0].info;
    if (
      deployment?.environment !== "staging" ||
      deployment.project_ref !== config.project_ref
    )
      throw Error("PROJECT_MISMATCH");
    config.db_host = host;
    await writeFile(file, JSON.stringify(config, null, 2) + "\n", {
      mode: 0o600,
    });
    await client.end();
    break;
  } catch (error) {
    failures.push({ host, code: error.code || "CONNECTION_FAILED" });
    await client.end().catch(() => {});
  }
}
console.log(
  JSON.stringify({
    fixtures_prepared: true,
    admin_id: config.fixtures.admin.id,
    database_connected: !!config.db_host,
    failures,
    credentials_printed: false,
  }),
);
