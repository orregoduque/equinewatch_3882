// Creates new local staging-only credentials. Never prints passwords or bearer keys.
import {
  randomBytes,
  randomUUID,
  pbkdf2Sync,
  createHmac,
  createHash,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const directory = new URL("../private/", import.meta.url),
  file = new URL("staging.private.json", directory);
await mkdir(directory, { recursive: true, mode: 0o700 });
let config;
try {
  config = JSON.parse(await readFile(file, "utf8"));
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  config = {
    project_ref: "xzfwcwfmnypgcunavmlc",
    db_user: "se_control_app",
    db_password: randomBytes(36).toString("base64url"),
    fixture_token: randomBytes(32).toString("base64url"),
    fixtures: {},
  };
  for (const kind of ["admin", "owner", "outside"])
    config.fixtures[kind] = {
      email: `control-${kind}-20261118@example.invalid`,
      full_name: `${kind} de integración`,
      password: randomBytes(36).toString("base64url"),
      request_id: randomUUID(),
    };
  await writeFile(file, JSON.stringify(config, null, 2) + "\n", {
    flag: "wx",
    mode: 0o600,
  });
}
if (config.project_ref !== "xzfwcwfmnypgcunavmlc")
  throw Error("ISOLATED_PROJECT_REQUIRED");
const salt = randomBytes(16),
  salted = pbkdf2Sync(config.db_password, salt, 4096, 32, "sha256");
const client = createHmac("sha256", salted).update("Client Key").digest();
const stored = createHash("sha256").update(client).digest("base64");
const server = createHmac("sha256", salted)
  .update("Server Key")
  .digest("base64");
const verifier = `SCRAM-SHA-256$4096:${salt.toString("base64")}$${stored}:${server}`;
// Verifiers are consumed privately by provisioning tools, never printed.
await writeFile(
  new URL("staging-verifiers.private.json", directory),
  JSON.stringify(
    {
      project_ref: config.project_ref,
      db_user: config.db_user,
      password_verifier: verifier,
      fixture_token_hash: createHash("sha256")
        .update(config.fixture_token)
        .digest("hex"),
    },
    null,
    2,
  ) + "\n",
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    staging_credentials_prepared: true,
    credentials_printed: false,
  }),
);
