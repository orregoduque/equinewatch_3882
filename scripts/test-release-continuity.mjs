import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { captureLiveAssets, moduleEntry } from './build-for-publish.mjs';
import { installPilotFixture } from '../tests/helpers/hls-browser-fixture.mjs';

const origin = process.argv[2];
if (!origin) throw new Error('Usage: node scripts/test-release-continuity.mjs VERIFIED-PRODUCTION-ORIGIN');
const archive = await captureLiveAssets(origin);
for (const [path, bytes] of archive.files) {
  assert((await readFile('build' + path)).equals(bytes), `previous asset changed or missing: ${path}`);
}
const publishedHtml = await (await fetch(origin + '/', { cache: 'no-store' })).text();
assert.equal(moduleEntry(publishedHtml), archive.builds[0].entry, 'publication changed during verification');
const newEntry = moduleEntry(await readFile('build/index.html', 'utf8'));
const directory = 'generated-artifacts/release-continuity';
await mkdir(directory, { recursive: true });
const child = spawn(process.execPath, ['server.mjs'], {
  env: { ...process.env, NODE_ENV: 'production', PORT: '0', HLS_RECEIVER_ORIGIN: '', HLS_PROXY_KEY: '' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let browser;
const report = { productionOrigin: origin, publishedEntry: archive.builds[0].entry,
  candidateEntry: newEntry, unchangedPreservedAssets: archive.files.size, realCustomerSessionsUsed: false };
try {
  const port = await new Promise((resolve, reject) => {
    let logs = '';
    const timeout = setTimeout(() => reject(new Error('Candidate server startup timeout')), 15000);
    child.stdout.on('data', data => {
      logs += data;
      const match = logs.match(/listening on port (\d+)/);
      if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
    });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', () => { clearTimeout(timeout); reject(new Error('Candidate server exited')); });
  });
  const base = `http://127.0.0.1:${port}`;
  const uid = '00000000-0000-4000-8000-000000000001';
  const horseId = '00000000-0000-4000-8000-000000000002';
  browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium',
    headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // Both old and new UI use synthetic test accounts/data. Never log into production,
  // read customer data, mutate Supabase, publish, or expose any real session.
  await context.route('https://*.supabase.co/**', route => {
    const path = new URL(route.request().url()).pathname;
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(
      path.includes('/rest/v1/horses') ? [{
        id: horseId, name: 'Caballo de prueba aislada', breed: 'Synthetic',
        owner_id: uid, is_active: true, profile_photo_url: null,
        created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }] : path.includes('/auth/v1/user') ? { id: uid, email: 'fixture@example.test' } : [],
    ) });
  });
  const stale = await context.newPage();
  const failures = [], pageErrors = [], assetResponses = [];
  const observe = page => {
    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(base + '/assets/')) {
        assetResponses.push(new URL(response.url()).pathname);
        if (!response.ok() || response.headers()['content-type']?.includes('text/html'))
          failures.push({ path: new URL(response.url()).pathname, status: response.status() });
      }
    });
    page.on('requestfailed', request => {
      if (request.url().startsWith(base + '/assets/')) failures.push({ path: new URL(request.url()).pathname });
    });
  };
  observe(stale);
  await installPilotFixture(stale);
  await stale.route(base + '/horse-list', async route => {
    await route.fulfill({ contentType: 'text/html', body: publishedHtml });
    await stale.unroute(base + '/horse-list');
  });
  await stale.goto(base + '/horse-list');
  await stale.getByText('Caballo de prueba aislada', { exact: true }).first().waitFor();
  const originalSession = await stale.evaluate(() => localStorage.getItem('stableEyeUser'));
  const assetCountBeforeNavigation = assetResponses.length;
  for (const path of [`/horse-timeline?horseId=${horseId}`, '/daily-summary', '/profile']) {
    await stale.evaluate(path => {
      history.pushState({}, '', path);
      dispatchEvent(new PopStateEvent('popstate'));
    }, path);
    await stale.waitForLoadState('networkidle');
    assert(!new URL(stale.url()).pathname.startsWith('/login'), 'existing owner remains signed in');
    assert.equal(await stale.evaluate(() => localStorage.getItem('stableEyeUser')), originalSession);
  }
  assert(assetResponses.length > assetCountBeforeNavigation, 'old lazy routes requested previous-version modules');
  await stale.screenshot({ path: `${directory}/existing-owner-tab.png` });
  const fresh = await context.newPage();
  observe(fresh);
  await installPilotFixture(fresh);
  await fresh.goto(base + '/horse-list');
  await fresh.getByText('Caballo de prueba aislada', { exact: true }).first().waitFor();
  assert.equal(await fresh.evaluate(() => localStorage.getItem('stableEyeUser')), originalSession);
  assert(assetResponses.includes(newEntry), 'new tabs load the candidate entry');
  assert(assetResponses.includes(archive.builds[0].entry), 'old tab retains the published entry');
  assert.equal(failures.length, 0, JSON.stringify(failures));
  assert.equal(pageErrors.length, 0, pageErrors.join('\n'));
  Object.assign(report, { oldTabLazyNavigationPassed: true, ownerSessionPreserved: true,
    newTabPassed: true, oldAndNewAssetResponses: assetResponses.length, passed: true });
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  await browser?.close();
  const closed = once(child, 'exit');
  child.kill();
  await closed;
}
