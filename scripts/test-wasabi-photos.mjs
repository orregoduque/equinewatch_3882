import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { installPilotFixture } from '../tests/helpers/hls-browser-fixture.mjs';

const base = process.argv[2];
if (!base) throw Error('Provide development preview URL');
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const lucero = 'a95f853c-e90b-4b6d-a4ea-f25cfa317119';
const legacy = '00000000-0000-4000-8000-000000000010';
const uid = '00000000-0000-4000-8000-000000000001';
const prefix = 'stable-eye/97e3674b-31ab-5373-8a21-aa8187e6a17f/node_108/';
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage(), apiQueries = [], imageGets = [], restImages = [], errors = [];
  let newest = 240, offset = 0, serial = 0;
  const records = new Map();
  const photo = (id, at = new Date(Date.now() - (240 - id) * 10000).toISOString()) => {
    const row = { id, horse_id: lucero, captured_at: at, storage_path_enhanced: prefix + id + '.jpg', source: 'wasabi' };
    records.set(String(id), row);
    return row;
  };
  Array.from({ length: 240 }, (_, index) => photo(240 - index));
  page.on('pageerror', error => errors.push(error.message));
  await installPilotFixture(page);
  await page.addInitScript(() => {
    const realNow = Date.now;
    let clockOffset = 0;
    window.advancePhotoTestClock = delta => { clockOffset += delta; };
    Date.now = () => realNow() + clockOffset;
  });
  await context.route('https://*.supabase.co/**', async route => {
    const url = new URL(route.request().url());
    const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (url.pathname.startsWith('/storage/'))
      return route.fulfill({ contentType: 'image/png', body: pixel });
    if (url.pathname.endsWith('/horses')) return json([
      { id: lucero, owner_id: uid, name: 'Lucero fixture', photo_backend: 'wasabi', is_active: true, created_at: new Date().toISOString() },
      { id: legacy, owner_id: uid, name: 'Legacy fixture', photo_backend: 'supabase', is_active: true, created_at: new Date().toISOString() },
    ]);
    if (url.pathname.endsWith('/images')) {
      restImages.push(url.search);
      return json([{ id: 1, horse_id: legacy, created_at: new Date().toISOString(), uploaded_at: new Date().toISOString(),
        storage_path_enhanced: 'legacy/1.jpg', image_number: 1, is_processed: true }]);
    }
    if (url.pathname.endsWith('/user_profiles')) return json([{ id: uid, email: 'fixture@example.test' }]);
    return json([]);
  });
  await page.route('**/api/horses/*/photos?*', async route => {
    const params = new URL(route.request().url()).searchParams;
    apiQueries.push(params);
    assert(route.request().headers().authorization?.startsWith('Bearer '), 'private API receives a session, never just local role');
    let rows;
    if (params.has('ids')) {
      rows = params.get('ids').split(',').map(id => records.get(id)).filter(Boolean).map(row => ({
        ...row, imageUrl: `https://s3.us-east-1.wasabisys.com/equinewatch-photos/${row.storage_path_enhanced}?X-Amz-Signature=fixture-${++serial}`,
        expiresAt: new Date(Date.now() + offset + 600000).toISOString(),
      }));
    } else if (params.has('from')) {
      rows = [1001, 1002, 1003].map((id, i) => photo(id, new Date(Date.parse(params.get('from')) + i * 10000).toISOString()));
    } else {
      rows = Array.from({ length: 240 }, (_, i) => records.get(String(newest - i))).filter(Boolean);
      if (params.has('since')) rows = rows.filter(row => row.captured_at >= params.get('since'));
    }
    return route.fulfill({ contentType: 'application/json', headers: { 'Cache-Control': 'private, no-store' },
      body: JSON.stringify({ photos: rows, nextCursor: null }) });
  });
  await context.route('https://s3.us-east-1.wasabisys.com/**', route => {
    imageGets.push({ method: route.request().method(), url: route.request().url() });
    return route.fulfill({ contentType: 'image/png', body: pixel });
  });
  await page.goto(`${base}/horse-timeline?horseId=${lucero}`);
  const main = page.locator('img[fetchpriority="high"]');
  await page.waitForFunction(() => document.querySelector('img[fetchpriority="high"]')?.complete);
  const first = await main.getAttribute('src');
  assert(first.includes('/240.jpg?X-Amz-Signature=fixture-'));
  assert.equal(restImages.length, 0, 'Lucero never queries legacy images');
  await page.waitForTimeout(300);
  assert(imageGets.length > 0 && imageGets.length < 20, 'private thumbnails remain deferred');
  assert(imageGets.every(request => request.method === 'GET'));
  const firstSignatures = apiQueries.filter(q => q.has('ids')).length;
  const oldThumbnail = await page.locator('button img[src*="/240.jpg?"]').elementHandle();
  newest = 241; photo(241);
  await page.waitForFunction(() => document.querySelector('img[fetchpriority="high"]')?.src.includes('/241.jpg?'), { timeout: 15000 });
  assert.equal(apiQueries.filter(q => q.has('ids')).length, firstSignatures + 1);
  assert.equal(apiQueries.filter(q => q.has('ids')).at(-1).get('ids'), '241');
  assert(await oldThumbnail.evaluate(node => node.isConnected), 'existing thumbnail is retained');
  assert.equal(await page.locator('button img[src*="/240.jpg?"]').getAttribute('src'), first);
  const oldNewestUrl = await main.getAttribute('src');
  offset += 550000;
  await page.evaluate(() => { window.advancePhotoTestClock(550000); window.dispatchEvent(new Event('focus')); });
  await page.waitForFunction(oldUrl => document.querySelector('img[fetchpriority="high"]')?.src !== oldUrl, oldNewestUrl);
  assert((await main.getAttribute('src')).includes('/241.jpg?'));
  await page.getByRole('button', { name: 'Revisar el día', exact: true }).click();
  await page.getByRole('button', { name: 'Revisar 08:00', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('img[fetchpriority="high"]')?.src.includes('/1001.jpg?'));
  await page.getByRole('button', { name: /^Ver foto / }).nth(1).click();
  await page.waitForFunction(() => document.querySelector('img[fetchpriority="high"]')?.src.includes('/1002.jpg?'));
  const historicalUrl = await main.getAttribute('src');
  offset += 650000;
  await page.evaluate(() => {
    window.advancePhotoTestClock(650000);
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(oldUrl => document.querySelector('img[fetchpriority="high"]')?.src !== oldUrl, historicalUrl);
  assert((await main.getAttribute('src')).includes('/1002.jpg?'), 'renewing keeps the selected historical photo');
  await page.getByRole('button', { name: 'Ampliar', exact: true }).click();
  assert.equal(await page.getByRole('dialog', { name: 'Foto ampliada' }).locator('img').getAttribute('src'), await main.getAttribute('src'));
  await page.keyboard.press('Escape');
  const privateReads = apiQueries.length;
  await page.getByRole('button', { name: /Legacy fixture/ }).click();
  await page.waitForFunction(() => document.querySelector('img[fetchpriority="high"]')?.src.includes('/object/public/images/legacy/1.jpg'));
  assert.equal(await page.locator('img[src*="wasabisys.com"]').count(), 0, 'horse change removes previous private photos');
  assert(restImages.length > 0);
  await page.waitForTimeout(300);
  assert.equal(apiQueries.length, privateReads, 'previous private requests stop after horse change');
  await page.goto(`${base}/profile`);
  // The shared fixture seeds a session on every full navigation. A 204 prevents
  // logout's location.href reload from creating a brand-new synthetic login.
  await page.route(base + '/', route => route.fulfill({ status: 204, body: '' }));
  await page.getByRole('button', { name: 'Log Out', exact: true }).click({ noWaitAfter: true });
  await page.waitForFunction(() => localStorage.getItem('stableEyeUser') === null
    && localStorage.getItem('sb-zmxppbpywizdjlhstfkf-auth-token') === null);
  assert.equal(await page.locator('img[src*="wasabisys.com"]').count(), 0);
  assert.equal(await page.evaluate(() => localStorage.getItem('sb-zmxppbpywizdjlhstfkf-auth-token')), null);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ mobile: '390x844', passed: true, fixtureOnly: true, realWasabiGetVerified: false,
    realAuthSessionVerified: false, newCapture: true, selectiveSigning: true, renewal: true, historyRenewal: true,
    signedImageBrowserGets: imageGets.length, legacyPreserved: true }));
  await context.close();
} finally { await browser.close(); }
