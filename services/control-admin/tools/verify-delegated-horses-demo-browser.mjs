import { chromium } from "../.qa/node_modules/playwright/index.mjs";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});
const report = { mode: "demo", production_modified: false };
let phase = "open";
try {
  const base = "http://127.0.0.1:8899",
    page = await browser.newPage({ viewport: { width: 1380, height: 1050 } }),
    errors = [];
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.name));
  await page.goto(base);
  await page.locator("#control-panel").waitFor();
  const boot = await (await page.request.get(base + "/api/bootstrap")).json();
  const post = async (path, body) => {
    const r = await page.request.post(base + path, {
      headers: {
        Origin: base,
        "X-CSRF-Token": boot.csrf,
        "Idempotency-Key": randomUUID(),
      },
      data: body,
    });
    assert.equal(r.status(), 200);
    return r.json();
  };
  const suffix = randomUUID().slice(0, 8),
    org = await post("/api/organizations", {
      name: "Demo alta segura " + suffix,
    });
  const site = await post(`/api/organizations/${org.id}/sites`, {
    name: "Establo demo " + suffix,
  });
  await page
    .getByRole("button", { name: "Organizaciones y establos", exact: true })
    .click();
  await page.locator("#organization-search").fill(org.name);
  await page
    .locator("#organization-title")
    .filter({ hasText: org.name })
    .waitFor();
  phase = "central-owner-approval";
  await page
    .locator("#organization-owner-form [name=user_id]")
    .selectOption("00000000-0000-4000-8000-000000000011");
  await page
    .locator("#organization-owner-form [name=owner_scope]")
    .selectOption(site.id);
  await page
    .getByRole("button", { name: "Aprobar propietario", exact: true })
    .click();
  await page.waitForFunction(
    () => !document.querySelector("#organization-owner-form button").disabled,
  );
  await page
    .getByRole("button", { name: "Retirar aprobación", exact: true })
    .waitFor();
  phase = "central-quota-form";
  await page.locator("#organization-limit-form [name=horse_limit]").fill("1");
  await page
    .getByRole("button", {
      name: "Actualizar límite de organización",
      exact: true,
    })
    .click();
  await page
    .locator("#organization-horse-capacity")
    .filter({ hasText: "0 de 1" })
    .waitFor();
  await page.waitForFunction(
    () => !document.querySelector("#organization-limit-form button").disabled,
  );
  const form = page.locator("#organization-registration-form");
  await form.locator("[name=name]").fill("Demo recuperación " + suffix);
  await form.locator("[name=stall_number]").fill("DEMO-RETRY:" + suffix);
  await form.locator("[name=registration_site]").selectOption(site.id);
  await form
    .locator(
      '[name=approved_owner] option[value="00000000-0000-4000-8000-000000000011"]',
    )
    .waitFor({ state: "attached" });
  await form
    .locator("[name=approved_owner]")
    .selectOption("00000000-0000-4000-8000-000000000011");
  phase = "lost-response-after-commit";
  let first = true,
    firstAccepted = false;
  const keys = [];
  page.on("request", (r) => {
    if (r.url().endsWith("/horse-registrations") && r.method() === "POST")
      keys.push(r.headers()["idempotency-key"]);
  });
  await page.route(
    "**/api/organizations/*/horse-registrations",
    async (route) => {
      if (first) {
        first = false;
        const reply = await route.fetch();
        firstAccepted = reply.status() === 200;
        await route.abort("failed");
      } else await route.continue();
    },
  );
  await page
    .getByRole("button", {
      name: "Registrar caballo en este establo",
      exact: true,
    })
    .click();
  await page.waitForFunction(
    () =>
      !document.querySelector(
        "#organization-registration-form button[type=submit]",
      ).disabled,
  );
  assert.equal(firstAccepted, true);
  phase = "retry-same-form";
  await page
    .getByRole("button", {
      name: "Registrar caballo en este establo",
      exact: true,
    })
    .click();
  await page
    .locator("#organization-horse-capacity")
    .filter({ hasText: "1 de 1" })
    .waitFor();
  assert.equal(keys.length, 2);
  assert.equal(keys[0], keys[1]);
  assert.equal(await form.locator("button[type=submit]").isDisabled(), true);
  const horses = await (
    await page.request.get(base + `/api/organizations/${org.id}/horses`)
  ).json();
  assert.equal(horses.items.length, 1);
  const events = await (
    await page.request.get(base + `/api/organizations/${org.id}/events`)
  ).json();
  assert.equal(
    events.items.filter((x) => x.operation === "horse.create").length,
    1,
  );
  await page
    .locator("#organization-registration-panel")
    .screenshot({
      path: fileURLToPath(
        new URL("../evidence/panel-alta-central.jpg", import.meta.url),
      ),
      type: "jpeg",
      quality: 85,
    });
  phase = "central-owner-revocation";
  await page
    .getByRole("button", { name: "Retirar aprobación", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reactivar aprobación", exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  report.central_owner_and_quota_forms = true;
  report.lost_response_recovered_same_key = true;
  report.single_horse_and_audit = true;
  report.owner_revocation_form = true;
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failed_phase = phase;
  report.category = error.name;
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(
    new URL("../evidence/phase5-demo-browser.json", import.meta.url),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
}
