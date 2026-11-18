// Uses owned synthetic accounts only; never prints cookies, credentials or MFA values.
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
const base = "http://127.0.0.1:8898",
  admin = config.fixtures.admin,
  manager = config.fixtures.owner,
  customer = config.fixtures.outside;
let cookie,
  csrf,
  browser,
  page,
  member,
  org,
  ownerRecord,
  phase = "admin-login";
const report = {
  project_ref: config.project_ref,
  production_modified: false,
  credentials_printed: false,
};
function progress(value) {
  phase = value;
  console.log(JSON.stringify({ phase: value, credentials_printed: false }));
}
async function call(path, { method = "GET", body, key = randomUUID() } = {}) {
  const headers = { Origin: base };
  if (cookie) {
    headers.Cookie = cookie;
    headers["X-CSRF-Token"] = csrf;
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
async function ok(path, options) {
  const r = await call(path, options);
  assert.equal(r.status, 200, r.data.error || "UNEXPECTED_STATUS");
  return r.data;
}
async function scoped(path, { method = "GET", body, key = randomUUID() } = {}) {
  const r = await page.request.fetch(base + path, {
    method,
    headers: {
      Origin: base,
      "X-CSRF-Token": page._csrf,
      ...(body
        ? { "Content-Type": "application/json", "Idempotency-Key": key }
        : {}),
    },
    data: body,
    timeout: 20000,
  });
  return { status: r.status(), data: await r.json() };
}
try {
  const login = await call("/api/auth/login", {
    method: "POST",
    body: { email: admin.email, password: admin.password },
  });
  assert.equal(login.status, 200);
  cookie = login.cookie;
  csrf = login.data.csrf;
  await ok("/api/auth/mfa", {
    method: "POST",
    body: { factor_id: admin.factor_id, code: totp(admin.mfa_secret) },
  });
  progress("prepare-synthetic-organization");
  const suffix = randomUUID().slice(0, 8);
  org = await ok("/api/organizations", {
    method: "POST",
    body: { name: "Altas delegadas " + suffix },
  });
  const site = await ok(`/api/organizations/${org.id}/sites`, {
    method: "POST",
    body: { name: "Establo de pruebas " + suffix },
  });
  member = await ok(`/api/organizations/${org.id}/members`, {
    method: "POST",
    body: { user_id: manager.id, role: "org_admin", site_id: null },
  });
  ownerRecord = await ok(`/api/organizations/${org.id}/owners`, {
    method: "POST",
    body: { user_id: customer.id, site_id: site.id },
  });
  await ok(`/api/organizations/${org.id}/horse-capacity`, {
    method: "PUT",
    body: { horse_limit: 2, revision: 1 },
  });
  progress("real-browser-mfa");
  browser = await chromium.launch({
    executablePath:
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  page = await browser.newPage({ viewport: { width: 1380, height: 1050 } });
  page.setDefaultTimeout(45000);
  page.setDefaultNavigationTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.name));
  await page.goto(base);
  await page.locator("#login-form").waitFor();
  await page.locator("#login-form [name=email]").fill(manager.email);
  await page.locator("#login-form [name=password]").fill(manager.password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page.locator("#mfa-form").waitFor();
  await page.locator("#mfa-form [name=code]").fill(totp(manager.mfa_secret));
  await page
    .getByRole("button", { name: "Verificar segundo factor", exact: true })
    .click();
  await page
    .locator("#organization-title")
    .filter({ hasText: org.name })
    .waitFor();
  const form = page.locator("#organization-registration-form");
  await form.waitFor();
  await form.locator("[name=name]").fill("Caballo delegado " + suffix);
  await form.locator("[name=stall_number]").fill("PHASE5:" + suffix + ":UI");
  await form.locator("[name=registration_site]").selectOption(site.id);
  await form
    .locator('[name=approved_owner] option[value="' + customer.id + '"]')
    .waitFor({ state: "attached" });
  await form.locator("[name=approved_owner]").selectOption(customer.id);
  progress("browser-registration");
  const creation = page.waitForResponse(
    (r) =>
      r.url().endsWith("/horse-registrations") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", {
      name: "Registrar caballo en este establo",
      exact: true,
    })
    .click();
  const created = await (await creation).json();
  assert.equal(created.owner_id, customer.id);
  assert.equal(created.site_id, site.id);
  assert.equal(created.photo_backend, "supabase");
  assert.equal(created.installation_required, true);
  await page
    .locator("#organization-horse-capacity")
    .filter({ hasText: "1 de 2" })
    .waitFor();
  await page.waitForFunction(
    () =>
      !document.querySelector(
        "#organization-registration-form button[type=submit]",
      ).disabled,
    null,
    { timeout: 45000 },
  );
  await page
    .locator("[data-org-list=horses]")
    .getByText(created.name, { exact: true })
    .waitFor();
  await page.screenshot({
    path: fileURLToPath(
      new URL("../evidence/panel-alta-delegada.jpg", import.meta.url),
    ),
    type: "jpeg",
    quality: 85,
    fullPage: true,
    timeout: 15000,
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
      new URL("../evidence/panel-alta-delegada-mobile.jpg", import.meta.url),
    ),
    type: "jpeg",
    quality: 85,
    fullPage: true,
    timeout: 15000,
  });
  report.browser_registration = true;
  report.mobile_no_overflow = true;
  report.installation_pending = true;
  report.real_supabase_mfa = true;
  const bootstrap = await (
    await page.request.get(base + "/api/bootstrap")
  ).json();
  page._csrf = bootstrap.csrf;
  progress("scope-and-owner-denials");
  const payload = {
    site_id: site.id,
    owner_id: customer.id,
    name: "Caballo concurrente " + suffix,
    stall_number: "PHASE5:" + suffix + ":A",
  };
  const badOwner = await scoped(
    `/api/organizations/${org.id}/horse-registrations`,
    { method: "POST", body: { ...payload, owner_id: admin.id } },
  );
  assert.equal(badOwner.status, 400);
  assert.equal(badOwner.data.error, "OWNER_NOT_AUTHORIZED");
  assert.equal(
    (
      await scoped(`/api/organizations/${org.id}/owners`, {
        method: "POST",
        body: { user_id: manager.id },
      })
    ).status,
    403,
  );
  const owners = await scoped(
    `/api/organizations/${org.id}/owners?site_id=${site.id}`,
  );
  assert.equal(owners.status, 200);
  assert.deepEqual(Object.keys(owners.data.items[0]).sort(), [
    "full_name",
    "id",
  ]);
  report.approved_owner_scope = true;
  report.owner_self_approval_denied = true;
  progress("concurrent-last-slot");
  const candidates = [
    { key: randomUUID(), body: payload },
    {
      key: randomUUID(),
      body: { ...payload, stall_number: "PHASE5:" + suffix + ":B" },
    },
  ];
  const outcomes = await Promise.all(
    candidates.map((x) =>
      scoped(`/api/organizations/${org.id}/horse-registrations`, {
        method: "POST",
        body: x.body,
        key: x.key,
      }),
    ),
  );
  assert.equal(outcomes.filter((x) => x.status === 200).length, 1);
  assert.equal(outcomes.find((x) => x.status !== 200).status, 409);
  assert.equal(
    outcomes.find((x) => x.status !== 200).data.error,
    "HORSE_QUOTA_REACHED",
  );
  const winner = outcomes.findIndex((x) => x.status === 200),
    retry = await scoped(`/api/organizations/${org.id}/horse-registrations`, {
      method: "POST",
      body: candidates[winner].body,
      key: candidates[winner].key,
    });
  assert.equal(retry.status, 200);
  assert.equal(retry.data.id, outcomes[winner].data.id);
  const capacity = await scoped(`/api/organizations/${org.id}/horse-capacity`);
  assert.equal(capacity.data.used, 2);
  assert.equal(capacity.data.remaining, 0);
  assert.equal(
    (await scoped(`/api/organizations/${org.id}/horses`)).data.items.length,
    2,
  );
  const events = await scoped(`/api/organizations/${org.id}/events`);
  assert.equal(
    events.data.items.filter((x) => x.operation === "horse.create").length,
    2,
  );
  report.concurrent_quota_enforced = true;
  report.retry_at_full_capacity = true;
  report.audit_not_duplicated = true;
  progress("revoke-owner-and-degrade-manager");
  await ok(`/api/organizations/${org.id}/owners/${ownerRecord.id}`, {
    method: "PUT",
    body: { site_id: site.id, active: false, revision: 1 },
  });
  ownerRecord.active = false;
  const revoked = await scoped(
    `/api/organizations/${org.id}/horse-registrations`,
    {
      method: "POST",
      body: { ...payload, stall_number: "PHASE5:" + suffix + ":REVOKED" },
    },
  );
  assert.equal(revoked.status, 400);
  assert.equal(revoked.data.error, "OWNER_NOT_AUTHORIZED");
  assert.equal(
    (await scoped(`/api/organizations/${org.id}/owners?site_id=${site.id}`))
      .data.items.length,
    0,
  );
  await page.reload();
  await page
    .locator("#organization-title")
    .filter({ hasText: org.name })
    .waitFor();
  assert.equal(await form.locator("button[type=submit]").isDisabled(), true);
  member = await ok(`/api/organizations/${org.id}/members/${member.id}`, {
    method: "PUT",
    body: {
      role: "installer",
      site_id: null,
      active: true,
      revision: member.revision,
    },
  });
  const denied = await scoped(
    `/api/organizations/${org.id}/horse-registrations`,
    {
      method: "POST",
      body: candidates[winner].body,
      key: candidates[winner].key,
    },
  );
  assert.equal(denied.status, 403);
  await page.reload();
  await page
    .locator("#organization-title")
    .filter({ hasText: org.name })
    .waitFor();
  assert.equal(
    await page.locator("#organization-registration-panel").isVisible(),
    false,
  );
  assert.deepEqual(errors, []);
  report.revoked_owner_denied = true;
  report.quota_reflected_in_ui = true;
  report.degraded_role_replay_denied = true;
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failed_phase = phase;
  report.category = error.code || error.name || "VERIFICATION_FAILED";
  if (page) {
    report.ui_notice = await page
      .locator("#login-notice")
      .textContent()
      .catch(() => null);
    report.panel_notice = await page
      .locator("#notice")
      .textContent()
      .catch(() => null);
  }
  process.exitCode = 1;
} finally {
  if (member && org)
    try {
      await ok(`/api/organizations/${org.id}/members/${member.id}`, {
        method: "PUT",
        body: {
          role: member.role,
          site_id: member.site_id,
          active: false,
          revision: member.revision,
        },
      });
    } catch {
      report.cleanup_pending = true;
      report.passed = false;
      process.exitCode = 1;
    }
  if (ownerRecord?.active !== false && ownerRecord && org)
    try {
      await ok(`/api/organizations/${org.id}/owners/${ownerRecord.id}`, {
        method: "PUT",
        body: {
          site_id: ownerRecord.site_id,
          active: false,
          revision: ownerRecord.revision,
        },
      });
    } catch {
      report.cleanup_pending = true;
      report.passed = false;
      process.exitCode = 1;
    }
  if (page)
    await scoped("/api/auth/logout", { method: "POST", body: {} }).catch(
      () => {},
    );
  if (browser) await browser.close();
  if (cookie)
    await call("/api/auth/logout", { method: "POST", body: {} }).catch(
      () => {},
    );
  await writeFile(
    new URL("../evidence/phase5-staging-integration.json", import.meta.url),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report));
}
