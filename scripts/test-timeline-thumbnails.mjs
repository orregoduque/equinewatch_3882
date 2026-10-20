import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';

const base = process.argv[2];
if (!base) throw new Error('Usage: node scripts/test-timeline-thumbnails.mjs https://YOUR-DEV-DOMAIN');
const browser = await chromium.launch({
  executablePath: '/repl/tools/bin/chromium', headless: true, args: ['--no-sandbox'],
});
const uid = '00000000-0000-4000-8000-000000000001';
const horseId = '00000000-0000-4000-8000-000000000010';
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="640"><rect width="800" height="640" fill="#c9a962"/></svg>';
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    const requests = [], queries = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(({ uid }) => {
      localStorage.setItem('stableEyeUser', JSON.stringify({
        id: uid, email: 'fixture@example.test', role: 'horse_owner', name: 'Fixture',
      }));
    }, { uid });
    await context.route('https://*.supabase.co/**', async route => {
      const url = new URL(route.request().url());
      const json = data => route.fulfill({ contentType: 'application/json', body: JSON.stringify(data) });
      if (url.pathname.startsWith('/storage/')) {
        requests.push(url.pathname + url.search);
        // First thumbnail fails; original succeeds. Second fails both ways.
        if ((url.pathname.includes('/render/') && /\/(239|238)\.jpg$/.test(url.pathname)) ||
            (url.pathname.includes('/object/') && url.pathname.endsWith('/238.jpg')))
          return route.fulfill({ status: 404, body: 'fixture missing' });
        return route.fulfill({ contentType: 'image/svg+xml', body: svg });
      }
      if (url.pathname.endsWith('/horses')) return json([{
        id: horseId, owner_id: uid, name: 'Fixture Horse', breed: 'Fixture',
        is_active: true, created_at: new Date().toISOString(),
      }]);
      if (url.pathname.endsWith('/images')) {
        queries.push(url.search);
        return json(Array.from({ length: 240 }, (_, index) => ({
          id: 240 - index, horse_id: horseId, image_number: 240 - index,
          storage_path_enhanced: `fixture/${240 - index}.jpg`,
          uploaded_at: new Date().toISOString(), is_processed: true,
          created_at: new Date(Date.now() - index * 10_000).toISOString(),
        })));
      }
      return json([]);
    });
    await page.goto(`${base}/horse-timeline?horseId=${horseId}`);
    const heading = page.getByRole('heading', { name: 'Recent Photos', exact: true });
    await heading.waitFor();
    const strip = heading.locator('../..').locator('div.overflow-x-auto');
    await strip.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('img[src*="/render/image/"]')?.complete);
    const bigPhoto = page.locator('img[fetchpriority="high"]');
    assert((await bigPhoto.getAttribute('src')).includes('/object/public/images/fixture/240.jpg'));
    assert.equal(await bigPhoto.getAttribute('loading'), 'eager');
    assert.equal(await bigPhoto.getAttribute('decoding'), 'async');
    const initialCount = await strip.locator('img').count();
    assert(initialCount > 0 && initialCount < 20, `initial attached images: ${initialCount}`);
    await page.waitForFunction(() => document.querySelector('button img[src*="/object/public/images/fixture/239.jpg"]')?.complete);
    await page.waitForFunction(() => document.querySelector('button img[src="/assets/images/no_image.png"]'));
    assert(requests.some(path => path.includes('/render/') && path.includes('width=320&quality=60&resize=contain')));
    assert(!requests.some(path => path.includes('/fixture/1.jpg')), 'far-off image requested too soon');
    await strip.evaluate(el => { el.scrollLeft = el.scrollWidth; });
    await page.waitForFunction(() => document.querySelector('button img[src*="/fixture/1.jpg"]'));
    await strip.locator('button').last().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('button img[src*="/fixture/1.jpg"]')?.complete);
    assert(await strip.locator('img').count() < 20);
    assert.equal(await strip.locator('img[src*="/fixture/240.jpg"]').count(), 0);
    await strip.locator('button').last().click();
    assert((await bigPhoto.getAttribute('src')).endsWith('/object/public/images/fixture/1.jpg'));
    await page.getByRole('button', { name: 'Generate Video', exact: true }).click();
    const videoPhotos = page.locator('div.fixed .aspect-video img');
    await videoPhotos.first().waitFor();
    assert(await videoPhotos.count() <= 8);
    for (const src of await videoPhotos.evaluateAll(nodes => nodes.map(el => el.getAttribute('src'))))
      assert(src.includes('/object/public/images/'), `video must keep original enhanced: ${src}`);
    assert(queries.every(query => new URLSearchParams(query).get('limit') === '240'));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ mobile, initialAttachedImages: initialCount, totalPhotos: 240, passed: true, syntheticOnly: true }));
    await context.close();
  }
} finally {
  await browser.close();
}
