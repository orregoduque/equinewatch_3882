// Manual operator helper for the fictional test administrator only. Never run for a customer account.
import { readFile } from "node:fs/promises";
import { totp } from "./totp.mjs";
const config = JSON.parse(
  await readFile(
    new URL("../private/staging.private.json", import.meta.url),
    "utf8",
  ),
);
if (
  config.project_ref !== "xzfwcwfmnypgcunavmlc" ||
  !config.fixtures.admin.mfa_secret
)
  throw Error("FIXTURE_MFA_NOT_READY");
console.log(
  "Código temporal de la cuenta ficticia de staging: " +
    totp(config.fixtures.admin.mfa_secret),
);
