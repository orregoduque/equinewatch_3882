// Uses only the dedicated fixture account and branch. Passwords/MFA never enter artifacts.
import { chromium } from "../.qa/node_modules/playwright/index.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { totp } from "./totp.mjs";
const config = JSON.parse(
  await readFile(
    new URL("../private/staging.private.json", import.meta.url),
    "utf8",
  ),
);
if (config.project_ref !== "xzfwcwfmnypgcunavmlc")
  throw Error("STAGING_REQUIRED");
const browser = await chromium.launch({
  executablePath:
    process.env.QA_BROWSER_PATH ||
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});
const evidence = new URL("../evidence/", import.meta.url),
  errors = [];
let phase = "login-screen";
try {
  const page = await browser.newPage({
    viewport: { width: 1380, height: 1080 },
  });
  page.on("pageerror", (e) => errors.push(e.name));
  await page.goto("http://127.0.0.1:8898/");
  await page.locator("#login-form").waitFor();
  await page.screenshot({
    path: fileURLToPath(new URL("panel-staging-login.jpg", evidence)),
    type: "jpeg",
    quality: 85,
  });
  const admin = config.fixtures.admin;
  await page.locator("#login-form [name=email]").fill(admin.email);
  await page.locator("#login-form [name=password]").fill(admin.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.locator("#mfa-form").waitFor();
  phase = "mfa";
  await page.locator("#mfa-form [name=code]").fill(totp(admin.mfa_secret));
  await page
    .getByRole("button", { name: "Verificar segundo factor", exact: true })
    .click();
  await page.locator("#control-navigation").waitFor();
  await page
    .getByRole("button", { name: "Usuarios y caballos", exact: true })
    .click();
  phase = "user-creation";
  const suffix = randomUUID().slice(0, 8),
    email = `control-browser-${suffix}@example.invalid`;
  await page
    .locator("#user-form [name=full_name]")
    .fill("Persona navegador " + suffix);
  await page.locator("#user-form [name=email]").fill(email);
  await page
    .getByRole("button", { name: "Crear cuenta de prueba", exact: true })
    .click();
  await page
    .getByText(
      "Cuenta y perfil de prueba creados. No se enviaron invitaciones ni se otorgó acceso a caballos.",
      { exact: true },
    )
    .waitFor();
  await page
    .locator("#horse-form [name=owner_id] option")
    .filter({ hasText: email })
    .waitFor({ state: "attached" });
  phase = "horse-creation";
  await page
    .locator("#horse-form [name=name]")
    .fill("Caballo navegador " + suffix);
  await page
    .locator("#horse-form [name=stall_number]")
    .fill("BROWSER:" + suffix);
  const ownerOption = page
    .locator("#horse-form [name=owner_id] option")
    .filter({ hasText: email });
  await page
    .locator("#horse-form [name=owner_id]")
    .selectOption(await ownerOption.getAttribute("value"));
  await page
    .getByRole("button", { name: "Crear caballo de prueba", exact: true })
    .click();
  await page
    .getByText(
      `Caballo de prueba creado: Caballo navegador ${suffix}. La instalación de cámara y almacenamiento sigue pendiente.`,
      { exact: true },
    )
    .waitFor();
  await page.waitForFunction(
    () => !document.querySelector("#horse-form button[type=submit]").disabled,
  );
  await page
    .locator("#user-requests")
    .getByText(email, { exact: false })
    .waitFor();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: fileURLToPath(new URL("panel-staging-personas.jpg", evidence)),
    type: "jpeg",
    quality: 85,
    fullPage: true,
  });
  phase = "directory-search";
  await page
    .getByRole("button", { name: "Accesos por caballo", exact: true })
    .click();
  const searchResponse=page.waitForResponse(response=>{const u=new URL(response.url());return u.pathname==='/api/installations/horses'&&u.searchParams.get('q')===suffix;});
  await page
    .locator("#grant-form")
    .getByRole("searchbox", { name: "Buscar caballo", exact: true })
    .fill(suffix);
  await searchResponse;
  await page.waitForFunction(()=>document.querySelector('#grant-form [name=horse_id]').options.length===2);
  await page
    .locator("#grant-form [name=horse_id] option")
    .filter({ hasText: "Caballo navegador " + suffix })
    .waitFor({ state: "attached" });
  assert.equal(
    await page.locator("#grant-form [name=horse_id] option").count(),
    2,
  );
  phase = "mobile";
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Usuarios y caballos", exact: true })
    .click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: fileURLToPath(new URL("panel-staging-personas-mobile.jpg", evidence)),
    type: "jpeg",
    quality: 85,
    fullPage: true,
  });
  phase = "logout";
  await page
    .getByRole("button", { name: "Cerrar sesión", exact: true })
    .click();
  await page.locator("#login-form").waitFor();
  assert.deepEqual(errors, []);
  await writeFile(
    new URL("phase3-browser.json", evidence),
    JSON.stringify(
      {
        passed: true,
        real_auth: true,
        mfa: true,
        real_user_created: true,
        real_horse_created: true,
        bounded_directory_search: true,
        mobile_overflow: false,
        logout: true,
        browser_errors: errors,
        production_modified: false,
        credentials_printed: false,
      },
      null,
      2,
    ) + "\n",
  );
  console.log("STAGING_BROWSER_CHECK_PASSED");
} catch (error) {
  await writeFile(new URL('phase3-browser.json',evidence),JSON.stringify({passed:false,failed_phase:phase,category:error.code||error.name,credentials_printed:false},null,2)+'\n');
  console.error(
    JSON.stringify({
      passed: false,
      phase,
      category: error.code || error.name,
      credentials_printed: false,
    }),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
