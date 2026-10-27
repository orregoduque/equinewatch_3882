import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base = process.argv[2];
if (!base) throw new Error('Provide the development preview URL');
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const uid = '00000000-0000-4000-8000-000000000001';
const horseId = '00000000-0000-4000-8000-000000000010';
const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#615347"/><path d="M0 900L1600 0M0 0L1600 900" stroke="#d9c69c" stroke-width="30"/></svg>';
await mkdir('generated-artifacts', { recursive: true });
try {
  for (const mobile of [true, false]) {
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      hasTouch: mobile, isMobile: mobile, timezoneId: 'America/Bogota',
    });
    const page = await context.newPage(), queries = [], errors = [], storage = [];
    let liveVersion = 0, failHour = false;
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
        storage.push(url.pathname + url.search);
        return route.fulfill({ contentType: 'image/svg+xml', body: svg });
      }
      if (url.pathname.endsWith('/horses')) return json([{
        id: horseId, owner_id: uid, name: 'Fixture Horse', breed: 'Fixture',
        profile_photo_url: 'https://example.test/portrait.jpg',
        is_active: true, created_at: new Date().toISOString(),
      }]);
      if (url.pathname.endsWith('/images')) {
        queries.push(url.search);
        const filters = url.searchParams.getAll('created_at');
        const start = filters.find(value => value.startsWith('gte.'));
        if (start) {
          if (failHour) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"message":"fixture temporary failure"}' });
          const startDate = new Date(start.slice(4));
          const localHour = (startDate.getUTCHours() + 19) % 24;
          if (localHour === 3) return json([]);
          return json([1, 2, 3].map(id => ({
            id: 1000 + id, horse_id: horseId, image_number: id,
            storage_path_enhanced: `fixture/hour-${localHour}-${id}.jpg`,
            created_at: new Date(+startDate + (id - 1) * 10_000).toISOString(),
            uploaded_at: new Date().toISOString(), is_processed: true,
          })));
        }
        return json(Array.from({ length: Number(url.searchParams.get('limit')) }, (_, index) => ({
          id: 240 + liveVersion - index, horse_id: horseId, image_number: 240 + liveVersion - index,
          storage_path_enhanced: `fixture/live-${240 + liveVersion - index}.jpg`,
          created_at: new Date(Date.now() - index * 10_000).toISOString(),
          uploaded_at: new Date().toISOString(), is_processed: true,
        })));
      }
      return json([]);
    });
    await context.route('https://example.test/portrait.jpg', route => route.fulfill({ contentType: 'image/svg+xml', body: svg }));
    await page.goto(`${base}/horse-timeline?horseId=${horseId}`);
    const main = page.locator('img[fetchpriority="high"]');
    await main.waitFor();
    assert((await main.getAttribute('src')).includes('live-240.jpg'));
    const box = await main.boundingBox();
    if (mobile) {
      assert(box.width > 350, 'main photo uses full mobile content width');
      assert(box.height >= 240, 'main photo is not a thin strip');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await page.getByRole('button', { name: 'Revisar el día', exact: true }).click();
    await page.getByLabel('Día a revisar').fill('2026-10-20');
    await page.getByRole('button', { name: 'Revisar 08:00', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('img[fetchpriority="high"]')?.getAttribute('src')?.includes('hour-8-1.jpg'));
    const hourlyQuery = queries.map(query => new URLSearchParams(query)).find(query =>
      query.getAll('created_at').includes('gte.2026-10-20T13:00:00.000Z'));
    assert(hourlyQuery, 'local 08:00 is UTC 13:00 in Bogota');
    assert(hourlyQuery.getAll('created_at').includes('lt.2026-10-20T14:00:00.000Z'));
    assert.equal(hourlyQuery.get('limit'), '400');
    assert.equal(hourlyQuery.get('horse_id'), `eq.${horseId}`);
    assert.equal(hourlyQuery.get('storage_path_enhanced'), 'not.is.null');
    assert.equal(hourlyQuery.get('order'), 'created_at.asc,id.asc');
    const photoButtons = page.getByRole('button', { name: /^Ver foto / });
    await photoButtons.nth(1).click();
    await page.waitForFunction(() => document.querySelector('img[fetchpriority="high"]')?.getAttribute('src')?.includes('hour-8-2.jpg'));
    const original = await main.getAttribute('src');
    liveVersion = 1;
    const queryCount = queries.length;
    if (mobile) await page.waitForTimeout(10_500);
    assert.equal(queries.length, queryCount, 'live polling is paused during hour review');
    assert.equal(await main.getAttribute('src'), original, 'new arrivals do not replace the chosen hourly photo');
    await page.getByRole('button', { name: 'Ampliar', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Foto ampliada' });
    await dialog.waitFor();
    assert.equal(await dialog.locator('img').getAttribute('src'), original, 'fullscreen keeps original URL');
    assert.equal(Math.round((await dialog.boundingBox()).height), mobile ? 844 : 1000);
    assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
    const stage = dialog.locator('img').locator('..');
    const stageBox = await stage.boundingBox();
    const x = stageBox.x + stageBox.width / 2, y = stageBox.y + stageBox.height / 2;
    const zoomValue = () => dialog.locator('[aria-live="polite"]').innerText();
    if (mobile) {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x - 35, y, id: 1 }, { x: x + 35, y, id: 2 }] });
      for (let d = 40; d <= 100; d += 10) {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - d, y, id: 1 }, { x: x + d, y, id: 2 }] });
        await page.waitForTimeout(20);
      }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert(parseInt(await zoomValue()) > 150, 'two real touch points zoom the same image');
      const transform = await dialog.locator('img').evaluate(el => el.style.transform);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 3 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 50, y: y + 35, id: 3 }] });
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      assert.notEqual(await dialog.locator('img').evaluate(el => el.style.transform), transform, 'drag pans the zoomed image');
      await page.screenshot({ path: 'generated-artifacts/hour-review-mobile-zoom.jpg' });
      await page.touchscreen.tap(x, y); await page.waitForTimeout(80); await page.touchscreen.tap(x, y);
      await page.waitForFunction(() => document.querySelector('[aria-label="Ampliación 100 por ciento"]'));
    } else {
      await page.mouse.move(x, y); await page.mouse.wheel(0, -1500);
      await page.waitForFunction(() => document.querySelector('[aria-label="Ampliación 400 por ciento"]'));
      await page.mouse.wheel(0, 10000);
      await page.waitForFunction(() => document.querySelector('[aria-label="Ampliación 100 por ciento"]'));
    }
    assert.equal(await dialog.locator('img').getAttribute('src'), original);
    await page.getByRole('button', { name: 'Cerrar foto ampliada' }).click();
    assert.equal(await dialog.count(), 0);
    assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
    await page.getByRole('button', { name: 'Ampliar', exact: true }).click();
    await page.keyboard.press('Escape');
    await dialog.waitFor({ state: 'detached' });
    await page.getByRole('button', { name: 'Revisar 03:00', exact: true }).click();
    await page.getByRole('heading', { name: 'No hay fotos en esta hora', exact: true }).waitFor();
    assert.equal(await main.count(), 0);
    failHour = true;
    await page.getByRole('button', { name: 'Revisar 04:00', exact: true }).click();
    await page.getByRole('heading', { name: 'No se pudo revisar esta hora', exact: true }).waitFor();
    failHour = false;
    await page.getByRole('button', { name: 'Reintentar', exact: true }).click();
    await main.waitFor();
    await page.getByRole('button', { name: 'Volver a en vivo', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('img[fetchpriority="high"]')?.getAttribute('src')?.includes('live-241.jpg'));
    assert.equal(await photoButtons.count(), 20);
    assert.equal(await page.getByRole('button', { name: 'Revisar 08:00', exact: true }).count(), 0);
    const liveQueries = queries.map(query => new URLSearchParams(query)).filter(query => !query.getAll('created_at').some(v => v.startsWith('gte.')));
    assert(liveQueries.length >= 2);
    assert(liveQueries.every(query => query.get('limit') === '20'));
    assert(liveQueries.every(query => query.get('horse_id') === `eq.${horseId}`));
    assert(liveQueries.every(query => query.get('order').startsWith('created_at.desc')));
    assert.equal(await page.getByRole('button', { name: 'Generate Video', exact: true }).count(), 0);
    assert(storage.filter(path => path.includes('/render/')).every(path => new URLSearchParams(path.split('?')[1]).get('width') === '320'));
    assert.deepEqual(errors, []);
    if (mobile) await page.screenshot({ path: 'generated-artifacts/hour-review-mobile-live.jpg' });
    console.log(JSON.stringify({ mobile, passed: true, syntheticOnly: true, hourlyLimit: 400, liveLimit: 20, touchPinch: mobile }));
    await context.close();
  }
} finally { await browser.close(); }
