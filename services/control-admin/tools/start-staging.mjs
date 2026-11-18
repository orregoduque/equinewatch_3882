import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { start } from "../src/server.mjs";
const config = JSON.parse(
  await readFile(
    new URL("../private/staging.private.json", import.meta.url),
    "utf8",
  ),
);
const published = JSON.parse(
  await readFile(
    new URL("../private/public-staging.json", import.meta.url),
    "utf8",
  ),
);
if (
  config.project_ref !== "xzfwcwfmnypgcunavmlc" ||
  published.project_ref !== config.project_ref ||
  !config.db_host
)
  throw Error("STAGING_NOT_PREPARED");
const connection = new URL("postgresql://" + config.db_host + ":5432/postgres");
connection.username = config.db_user + "." + config.project_ref;
connection.password = config.db_password;
start({
  CONTROL_MODE: "staging",
  CONTROL_PORT: "8898",
  CONTROL_HOST: "127.0.0.1",
  CONTROL_DATABASE_URL: connection.toString(),
  CONTROL_DATABASE_CA_PATH: fileURLToPath(
    new URL("../private/supabase-ca.crt", import.meta.url),
  ),
  CONTROL_EXPECTED_PROJECT_REF: config.project_ref,
  CONTROL_SUPABASE_URL: published.url,
  CONTROL_SUPABASE_ANON_KEY: published.public_key,
  CONTROL_STAGING_FIXTURE_TOKEN: config.fixture_token,
}).catch((error) => {
  console.error(
    JSON.stringify({
      event: "STAGING_START_FAILED",
      category: error.code || "CONFIGURATION_OR_CONNECTION_ERROR",
      credentials_printed: false,
    }),
  );
  process.exitCode = 1;
});
