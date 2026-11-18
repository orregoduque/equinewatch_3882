import { readFile, writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { totp } from "./totp.mjs";
const file = new URL("../private/staging.private.json", import.meta.url),
  config = JSON.parse(await readFile(file, "utf8"));
const published = JSON.parse(
  await readFile(
    new URL("../private/public-staging.json", import.meta.url),
    "utf8",
  ),
);
if (config.project_ref !== "xzfwcwfmnypgcunavmlc")
  throw Error("STAGING_REQUIRED");
const kind = process.argv[2] || "admin";
if (!["admin", "owner", "outside"].includes(kind))
  throw Error("FIXTURE_REQUIRED");
const admin = config.fixtures[kind];
const client = createClient(published.url, published.public_key, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const login = await client.auth.signInWithPassword({
  email: admin.email,
  password: admin.password,
});
if (login.error) {
  console.log(
    JSON.stringify({
      mfa_prepared: false,
      phase: "login",
      status: login.error.status,
      credentials_printed: false,
    }),
  );
  process.exit(1);
}
if (!admin.mfa_secret) {
  const factor = await client.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Stable Eye staging integration",
  });
  if (factor.error) {
    console.log(
      JSON.stringify({
        mfa_prepared: false,
        phase: "enroll",
        status: factor.error.status,
        credentials_printed: false,
      }),
    );
    process.exit(1);
  }
  admin.factor_id = factor.data.id;
  admin.mfa_secret = factor.data.totp.secret;
  await writeFile(file, JSON.stringify(config, null, 2) + "\n", {
    mode: 0o600,
  });
}
const verified = await client.auth.mfa.challengeAndVerify({
  factorId: admin.factor_id,
  code: totp(admin.mfa_secret),
});
if (verified.error) {
  console.log(
    JSON.stringify({
      mfa_prepared: false,
      phase: "verify",
      status: verified.error.status,
      credentials_printed: false,
    }),
  );
  process.exit(1);
}
await client.auth.signOut({ scope: "local" });
console.log(JSON.stringify({ mfa_prepared: true, credentials_printed: false }));
