// Explicit integration test on the isolated branch. Only owned synthetic accounts are used.
import { readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "../.qa/node_modules/playwright/index.mjs";
import { totp } from "./totp.mjs";
const config = JSON.parse(
  await readFile(
    new URL("../private/staging.private.json", import.meta.url),
    "utf8",
  ),
);
if (config.project_ref !== "xzfwcwfmnypgcunavmlc")
  throw Error("STAGING_REQUIRED");
const base = "http://127.0.0.1:8898";
const sessions = {};
const memberships = [];
let browser,
  qaPage,
  phase = "login";
function progress(value) {
  phase = value;
  console.log(JSON.stringify({ phase: value, credentials_printed: false }));
}
const report = {
  project_ref: config.project_ref,
  production_modified: false,
  credentials_printed: false,
};
async function call(
  actor,
  path,
  { method = "GET", body, key = randomUUID() } = {},
) {
  const session = sessions[actor];
  const headers = { Origin: base };
  if (session) {
    headers.Cookie = session.cookie;
    headers["X-CSRF-Token"] = session.csrf;
  }
  if (body) {
    headers["Content-Type"] = "application/json";
    headers["Idempotency-Key"] = key;
  }
  const r = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  return {
    status: r.status,
    data: await r.json(),
    cookie: r.headers.get("set-cookie")?.split(";")[0],
  };
}
async function login(kind) {
  const fixture = config.fixtures[kind];
  const r = await call(kind, "/api/auth/login", {
    method: "POST",
    body: { email: fixture.email, password: fixture.password },
  });
  assert.equal(r.status, 200);
  assert.equal(r.data.mfa_required, true);
  sessions[kind] = { cookie: r.cookie, csrf: r.data.csrf };
  const second = await call(kind, "/api/auth/mfa", {
    method: "POST",
    body: { factor_id: fixture.factor_id, code: totp(fixture.mfa_secret) },
  });
  assert.equal(second.status, 200);
}
async function ok(actor, path, options) {
  const r = await call(actor, path, options);
  assert.equal(r.status, 200, `${path}: ${r.data.error || r.status}`);
  return r.data;
}
try {
  await login("admin");
  const suffix = randomUUID().slice(0, 8);
  const a = await ok("admin", "/api/organizations", {
    method: "POST",
    body: { name: "Organización Norte " + suffix },
  });
  const b = await ok("admin", "/api/organizations", {
    method: "POST",
    body: { name: "Organización Sur " + suffix },
  });
  const sa = await ok("admin", `/api/organizations/${a.id}/sites`, {
    method: "POST",
    body: { name: "Establo Norte " + suffix },
  });
  const sb = await ok("admin", `/api/organizations/${b.id}/sites`, {
    method: "POST",
    body: { name: "Establo Sur " + suffix },
  });
  const ma = await ok("admin", `/api/organizations/${a.id}/members`, {
    method: "POST",
    body: {
      user_id: config.fixtures.owner.id,
      role: "org_admin",
      site_id: null,
    },
  });
  memberships.push({ org: a.id, ...ma });
  const mb = await ok("admin", `/api/organizations/${b.id}/members`, {
    method: "POST",
    body: {
      user_id: config.fixtures.outside.id,
      role: "viewer",
      site_id: sb.id,
    },
  });
  memberships.push({ org: b.id, ...mb });
  await login("owner");
  await login("outside");
  progress("scope-api");
  const scoped = await ok("owner", "/api/bootstrap");
  assert.equal(scoped.context.global_admin, false);
  assert.deepEqual(scoped.users, []);
  assert.deepEqual(scoped.horses, []);
  assert.equal(
    (await call("owner", `/api/organizations/${b.id}/sites`)).status,
    404,
  );
  assert.equal(
    (await call("outside", `/api/organizations/${a.id}/sites`)).status,
    404,
  );
  assert.equal((await call("owner", "/api/installations/users")).status, 403);
  assert.equal((await call("owner", "/api/people/users")).status, 403);
  assert.equal(
    (
      await call("owner", `/api/organizations/${a.id}/members`, {
        method: "POST",
        body: { user_id: config.fixtures.outside.id, role: "org_admin" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await call("outside", `/api/organizations/${b.id}/sites`, {
        method: "POST",
        body: { name: "No permitido" },
      })
    ).status,
    403,
  );
  report.two_organization_isolation = true;
  report.global_routes_denied = true;
  report.viewer_writes_denied = true;
  progress("idempotent-site");
  const k = randomUUID(),
    input = { name: "Establo delegado " + suffix };
  const created = await ok("owner", `/api/organizations/${a.id}/sites`, {
    method: "POST",
    body: input,
    key: k,
  });
  const replay = await ok("owner", `/api/organizations/${a.id}/sites`, {
    method: "POST",
    body: input,
    key: k,
  });
  assert.equal(created.id, replay.id);
  const events = await ok("owner", `/api/organizations/${a.id}/events`);
  assert.ok(
    events.items.some(
      (e) =>
        e.entity_id === created.id && e.actor_id === config.fixtures.owner.id,
    ),
  );
  report.idempotency_and_audit = true;
  progress("horse-scope");
  const h = await ok("admin", "/api/people/horses", {
    method: "POST",
    body: {
      name: "Caballo organización " + suffix,
      stall_number: "ORG:" + suffix,
      owner_id: config.fixtures.owner.id,
    },
  });
  await ok("admin", `/api/organizations/${a.id}/horses`, {
    method: "POST",
    body: { horse_id: h.id, site_id: sa.id },
  });
  const horses = await ok("owner", `/api/organizations/${a.id}/horses`);
  assert.ok(horses.items.some((x) => x.id === h.id));
  assert.equal("owner_id" in horses.items[0], false);
  assert.equal(
    (await ok("outside", `/api/organizations/${b.id}/horses`)).items.length,
    0,
  );
  report.horse_uuid_scope = true;
  progress("browser");
  browser = await chromium.launch({
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const page = await browser.newPage({
      viewport: { width: 1380, height: 1050 },
    }),
    errors = [];
  qaPage = page;
  page.setDefaultTimeout(45000);
  page.setDefaultNavigationTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.name));
  await page.goto(base);
  await page.locator("#login-form").waitFor();
  const owner = config.fixtures.owner;
  await page.locator("#login-form [name=email]").fill(owner.email);
  await page.locator("#login-form [name=password]").fill(owner.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.locator("#mfa-form").waitFor();
  await page.locator("#mfa-form [name=code]").fill(totp(owner.mfa_secret));
  await page
    .getByRole("button", { name: "Verificar segundo factor", exact: true })
    .click();
  progress("browser-workspace");
  await page
    .locator("#organization-title")
    .filter({ hasText: a.name })
    .waitFor();
  await page
    .locator("[data-org-list=horses]")
    .getByText(h.name, { exact: true })
    .waitFor();
  assert.equal(await page.locator("nav button:visible").count(), 1);
  assert.equal(
    await page.locator("#organization-member-form").isVisible(),
    false,
  );
  await page
    .locator("#organization-site-form [name=name]")
    .fill("Establo navegador " + suffix);
  progress("browser-new-site");
  await page
    .getByRole("button", { name: "Preparar nuevo establo", exact: true })
    .click();
  await page
    .getByText("Nuevo establo preparado en esta organización.", { exact: true })
    .waitFor();
  await page.waitForFunction(
    () => !document.querySelector("#organization-site-form button").disabled,
    null,
    { timeout: 15000 },
  );
  await page
    .locator("[data-org-list=sites]")
    .getByText("Establo navegador " + suffix, { exact: true })
    .waitFor();
  progress("browser-capture");
  await page.screenshot({
    timeout: 15000,
    path: fileURLToPath(
      new URL("../evidence/panel-organizacion.jpg", import.meta.url),
    ),
    type: "jpeg",
    quality: 85,
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: fileURLToPath(
      new URL("../evidence/panel-organizacion-mobile.jpg", import.meta.url),
    ),
    type: "jpeg",
    quality: 85,
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  report.real_browser_scoped = true;
  report.mobile_no_overflow = true;
  progress("revoke-live-session");
  await ok("admin", `/api/organizations/${a.id}/members/${ma.id}`, {
    method: "PUT",
    body: {
      role: ma.role,
      site_id: ma.site_id,
      active: false,
      revision: ma.revision,
    },
  });
  memberships[0].active = false;
  assert.equal((await call("owner", "/api/bootstrap")).status, 403);
  const status = await page.evaluate(async () => {
    const r = await fetch("/api/bootstrap");
    return r.status;
  });
  assert.equal(status, 403);
  report.revocation_on_existing_browser_session = true;
  progress("suspend-organization");
  await ok("admin", "/api/organizations/" + b.id, {
    method: "PUT",
    body: { state: "suspended", revision: b.revision },
  });
  assert.equal((await call("outside", "/api/bootstrap")).status, 403);
  await ok("admin", "/api/organizations/" + b.id, {
    method: "PUT",
    body: { state: "active", revision: 2 },
  });
  report.suspension_on_existing_session = true;
  report.real_supabase_mfa = true;
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failed_phase = phase;
  report.category = error.code || error.name || "VERIFICATION_FAILED";
  if (qaPage) {
    report.ui_notice = await qaPage
      .locator("#login-notice")
      .textContent()
      .catch(() => null);
    report.panel_notice = await qaPage
      .locator("#notice")
      .textContent()
      .catch(() => null);
  }
  process.exitCode = 1;
} finally {
  for (const m of memberships.filter((x) => x.active !== false)) {
    try {
      await ok("admin", `/api/organizations/${m.org}/members/${m.id}`, {
        method: "PUT",
        body: {
          role: m.role,
          site_id: m.site_id,
          active: false,
          revision: m.revision,
        },
      });
    } catch {
      report.cleanup_pending = true;
      process.exitCode = 1;
    }
  }
  for (const actor of Object.keys(sessions))
    await call(actor, "/api/auth/logout", { method: "POST", body: {} }).catch(
      () => {},
    );
  if (browser) await browser.close();
  await writeFile(
    new URL("../evidence/phase4-staging-integration.json", import.meta.url),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
}
