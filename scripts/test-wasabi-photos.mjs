import assert from 'node:assert/strict';
import { previewVersion } from '../services/wasabi-photos/handler.mjs';
import { chromium } from 'playwright-core';
import { installPilotFixture } from '../tests/helpers/hls-browser-fixture.mjs';

const base = process.argv[2];
if (!base) throw Error('Provide development preview URL');
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const lucero = 'a95f853c-e90b-4b6d-a4ea-f25cfa317119';
const thunder = 'd826a274-58ea-4a55-8fd2-1d4c78222ab1';
const legacy = '00000000-0000-4000-8000-000000000010';
const uid = '00000000-0000-4000-8000-000000000001';
const prefix = 'stable-eye/97e3674b-31ab-5373-8a21-aa8187e6a17f/node_108/';
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
try {
  let horseListReads = 0;
  let holdInitialThumbnails = true;
  let releaseInitialThumbnails;
  const thumbnailGate = new Promise(resolve => { releaseInitialThumbnails = resolve; });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage(), apiQueries = [], imageGets = [], restImages = [], errors = [];
  let newest = 240, offset = 0, serial = 0;
  const records = new Map();
  const photo = (id, at = new Date(Date.now() - (240 - id) * 10000).toISOString(), horse = lucero) => {
    const row = { id, horse_id: horse, captured_at: at,
      storage_path_enhanced: (horse === thunder ? prefix.replace('node_108/', 'node_109/') : prefix) + id + '.jpg', source: 'wasabi' };
    records.set(`${horse}:${id}`, row);
    return row;
  };
  Array.from({ length: 240 }, (_, index) => photo(240 - index));
  Array.from({ length: 7 }, (_, index) => photo(7 - index, new Date(Date.now() - index * 10000).toISOString(), thunder));
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
    if (url.pathname.endsWith('/horses')) { horseListReads++; return json([
      { id: lucero, owner_id: uid, name: 'Lucero fixture', photo_backend: 'wasabi', is_active: true, created_at: new Date().toISOString() },
      { id: thunder, owner_id: uid, name: 'Thunder fixture', photo_backend: 'wasabi', is_active: true, created_at: new Date().toISOString() },
      { id: legacy, owner_id: uid, name: 'Legacy fixture', photo_backend: 'supabase', is_active: true, created_at: new Date().toISOString() },
    ]); }
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
    const horse = new URL(route.request().url()).pathname.split('/')[3];
    apiQueries.push(params);
    assert(route.request().headers().authorization?.startsWith('Bearer '), 'private API receives a session, never just local role');
    let rows;
    if (params.has('ids')) {
      if (holdInitialThumbnails) await thumbnailGate;
      rows = params.get('ids').split(',').map(id => records.get(`${horse}:${id}`)).filter(Boolean).map(row => ({
        ...row, imageUrl: `https://s3.us-east-1.wasabisys.com/equinewatch-photos/${row.storage_path_enhanced}?X-Amz-Signature=fixture-${++serial}`,
        expiresAt: new Date(Date.now() + offset + 600000).toISOString(),
        version: previewVersion(row),
      }));
    } else if (params.has('from')) {
      rows = [1001, 1002, 1003].map((id, i) => photo(id, new Date(Date.parse(params.get('from')) + i * 10000).toISOString(), horse));
    } else {
      rows = Array.from({ length: Math.min(horse === thunder ? 7 : 240, Number(params.get('limit'))) }, (_, i) =>
        records.get(`${horse}:${(horse === thunder ? 7 : newest) - i}`)).filter(Boolean);
      if (params.has('since')) rows = rows.filter(row => row.captured_at >= params.get('since'));
    }
    if (params.get('preview') === '1' && rows.length) {
      const newest = params.has('from') ? rows.at(-1) : rows[0];
      if (previewVersion(newest) !== params.get('cached')) rows = rows.map(row => row === newest ? {
        ...row, imageUrl: `https://s3.us-east-1.wasabisys.com/equinewatch-photos/${row.storage_path_enhanced}?X-Amz-Signature=fixture-${++serial}`,
        expiresAt: new Date(Date.now() + offset + 600000).toISOString(),
        version: previewVersion(row),
      } : row);
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
  assert(await main.isVisible(), 'main photo paints while other signatures are still blocked');
  holdInitialThumbnails = false;
  releaseInitialThumbnails();
  const initialHorseListReads = horseListReads;
  assert(first.includes('/240.jpg?X-Amz-Signature=fixture-'));
  assert.equal(apiQueries[0].get('preview'), '1', 'first response includes latest URL, no metadata round trip');
  assert.equal(apiQueries[0].get('limit'), '20');
  assert.equal(await page.getByRole('button', { name: /^Ver foto / }).count(), 20);
  assert.equal(await page.getByRole('button', { name: 'Generate Video', exact: true }).count(), 0);
  assert.equal(restImages.length, 0, 'Lucero never queries legacy images');
  await page.waitForTimeout(300);
  assert(imageGets.length > 0 && imageGets.length < 20, 'private thumbnails remain deferred');
  assert(imageGets.every(request => request.method === 'GET'));
  assert(apiQueries.filter(q => q.has('ids')).length <= 1, 'nearby thumbnails share a batch');
  assert(apiQueries.filter(q => q.has('ids')).every(q => !q.get('ids').split(',').includes('221')),
    'far offscreen thumbnail never requests a signature');
  const firstSignatures = apiQueries.filter(q => q.has('ids')).length;
  const thumbnailBatchesBeforeScroll = firstSignatures;
  await page.getByRole('button', { name: /^Ver foto / }).first().evaluate(button => {
    const root = button.parentElement;
    root.scrollLeft = root.scrollWidth;
  });
  await page.waitForTimeout(350);
  assert.equal(apiQueries.filter(q => q.has('ids')).length, thumbnailBatchesBeforeScroll + 1,
    'newly approaching thumbnails share one batch');
  assert(apiQueries.filter(q => q.has('ids')).at(-1).get('ids').split(',').includes('221'),
    'the last thumbnail is signed only after scrolling near it');
  await page.getByRole('button', { name: /^Ver foto / }).first().evaluate(button => {
    button.parentElement.scrollLeft = 0;
  });
  await page.waitForTimeout(200);
  const signingBatchesAfterScroll = apiQueries.filter(q => q.has('ids')).length;
  const oldThumbnail = await page.locator('button img[src*="/240.jpg?"]').elementHandle();
  newest = 241; photo(241);
  await page.waitForFunction(() => document.querySelector('img[fetchpriority="high"]')?.src.includes('/241.jpg?'), { timeout: 15000 });
  assert.equal(apiQueries.filter(q => q.has('ids')).length, signingBatchesAfterScroll, 'new photo is signed in the polling response');
  assert.equal(horseListReads, initialHorseListReads, 'Wasabi polling does not reload the horses list');
  assert(await oldThumbnail.evaluate(node => node.isConnected), 'existing thumbnail is retained');
  assert.equal(await page.locator('button img[src*="/240.jpg?"]').getAttribute('src'), first);
  const oldNewestUrl = await main.getAttribute('src');
  offset += 550000;
  await page.evaluate(() => { window.advancePhotoTestClock(550000); window.dispatchEvent(new Event('focus')); });
  await page.waitForFunction(oldUrl => document.querySelector('img[fetchpriority="high"]')?.src !== oldUrl, oldNewestUrl);
  assert((await main.getAttribute('src')).includes('/241.jpg?'));
  await page.getByRole('button', { name: 'Revisar el día', exact: true }).click();
  await page.getByRole('button', { name: 'Revisar 08:00', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('img[fetchpriority="high"]')?.src.includes('/1003.jpg?'));
  assert.equal(horseListReads, initialHorseListReads, 'hour review uses known backend without another horses list');
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
  await page.getByRole('button', { name: /Thunder fixture/ }).click();
  await page.waitForFunction(() => document.querySelector('img[fetchpriority="high"]')?.src.includes('/node_109/7.jpg?'));
  assert.equal(await page.locator('img[src*="node_108"]').count(), 0, 'Thunder never displays Lucero JPEGs, including overlapping IDs');
  await page.getByRole('button', { name: /Lucero fixture/ }).click();
  await page.getByRole('button', { name: /Thunder fixture/ }).click();
  await page.waitForFunction(() => document.querySelector('img[fetchpriority="high"]')?.src.includes('/node_109/7.jpg?'));
  await page.waitForTimeout(300);
  assert.equal(await page.locator('img[src*="node_108"]').count(), 0);
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
    signedImageBrowserGets: imageGets.length, twoWasabiHorses: true, rapidHorseSwitch: true, legacyPreserved: true }));
  await context.close();
} finally { await browser.close(); }
