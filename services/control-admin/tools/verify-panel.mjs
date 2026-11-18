// Optional developer browser check. Uses a separate, pinned QA tool installation.
// npm install --prefix .qa --no-save --package-lock=false --ignore-scripts playwright@1.65.1
import { chromium } from "../.qa/node_modules/playwright/index.mjs";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const base = "http://127.0.0.1:8899";
const health = await (await fetch(base + "/health")).json();
assert.equal(health.mode, "demo");
assert.equal(health.production_authority_enabled, false);
const browser = await chromium.launch({
  executablePath:
    process.env.QA_BROWSER_PATH ||
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});
const folder = new URL("../evidence/", import.meta.url);
await mkdir(folder, { recursive: true });
const errors = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1380, height: 1000 },
    acceptDownloads: true,
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base);
  await page
    .getByRole("button", { name: "Planes de instalación", exact: true })
    .click();
  await page
    .locator("#installation-form select option")
    .nth(1)
    .waitFor({ state: "attached" });
  await page.locator("#installation-list > *").first().waitFor();
  if (
    (await page
      .getByRole("button", { name: "Descargar plan y políticas", exact: true })
      .count()) === 0
  ) {
    await page.locator("#installation-form select").selectOption({ index: 1 });
    await page.locator("#installation-form [name=node_id]").fill("201");
    await page
      .locator("#installation-form [name=bucket]")
      .fill("stableeye-stage-demo");
    await page
      .locator("#installation-form [name=receiver_origin]")
      .fill("https://receiver.example.invalid");
    await page
      .getByRole("button", { name: "Guardar plan", exact: true })
      .click();
    await page
      .getByText("Plan guardado con reservas y políticas para revisión.", {
        exact: true,
      })
      .waitFor();
  }
  if (
    (await page
      .getByRole("button", { name: "Ver / retomar último ensayo", exact: true })
      .count()) === 0
  ) {
    await page
      .getByRole("button", { name: "Nuevo ensayo", exact: true })
      .first()
      .click();
    await page.locator("#run-panel").waitFor();
  } else {
    await page
      .getByRole("button", { name: "Ver / retomar último ensayo", exact: true })
      .first()
      .click();
  }
  if (await page.locator("#run-advance").isEnabled()) {
    await page.locator("#run-advance").click();
    await page
      .locator("#run-steps li small")
      .filter({ hasText: "Simulado" })
      .first()
      .waitFor();
  }
  await page.reload();
  await page
    .getByRole("button", { name: "Planes de instalación", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ver / retomar último ensayo", exact: true })
    .first()
    .click();
  await page
    .locator("#run-steps li small")
    .filter({ hasText: "Simulado" })
    .first()
    .waitFor();
  assert.ok(
    (await page
      .locator("#run-steps li small")
      .filter({ hasText: "Simulado" })
      .count()) >= 1,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: fileURLToPath(new URL("panel-instalaciones-desktop.jpg", folder)),
    type: "jpeg",
    quality: 85,
    fullPage: true,
  });
  await page.screenshot({
    path: fileURLToPath(new URL("panel-instalaciones-vista.jpg", folder)),
    type: "jpeg",
    quality: 85,
  });
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar plan y políticas", exact: true })
    .first()
    .click();
  assert.ok((await download).suggestedFilename().startsWith("plan-"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator("#run-panel").scrollIntoViewIfNeeded();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > innerWidth,
  );
  assert.equal(overflow, false);
  await page.screenshot({
    path: fileURLToPath(new URL("panel-instalaciones-mobile.jpg", folder)),
    type: "jpeg",
    quality: 85,
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  await writeFile(
    new URL("panel-phase2-browser.json", folder),
    JSON.stringify(
      {
        local_demo: true,
        plan_created_or_reused: true,
        simulation_resumed_after_reload: true,
        policy_download: true,
        mobile_overflow: overflow,
        browser_errors: errors,
        external_actions: false,
      },
      null,
      2,
    ),
  );
  console.log("LOCAL_PANEL_BROWSER_CHECK_PASSED");
} finally {
  await browser.close();
}
