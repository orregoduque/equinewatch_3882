import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { installPilotFixture } from '../tests/helpers/hls-browser-fixture.mjs';

const base = process.argv[2];
if (!base) throw Error('Provide preview URL');
const horseId = 'd826a274-58ea-4a55-8fd2-1d4c78222ab1';
const uid = '00000000-0000-4000-8000-000000000001';
const row = {
  id: horseId, name: 'Thunder', owner_id: uid, is_active: true, photo_backend: 'wasabi',
  profile_photo_url: null, created_at: '2026-01-01T00:00:00Z',
};
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
try {
  for (const viewport of [{ width: 1280, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const errors = [], writes = [];
    page.on('pageerror', error => errors.push(error.message));
    await installPilotFixture(page, { userId: uid });
    await context.route('https://*.supabase.co/**', route => {
      const request = route.request(), path = new URL(request.url()).pathname;
      if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) writes.push(path);
      const body = path.endsWith('/horses') ? [row]
        : path.endsWith('/user_profiles') ? [{ id: uid, email: 'fixture@example.test' }] : [];
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.goto(`${base}/horse-list`);
    const photo = page.getByRole('link', { name: 'Ver fotos de cámara de Sancho', exact: true });
    await photo.waitFor();
    assert.equal(await photo.getAttribute('href'), `/horse-timeline?horseId=${horseId}`);
    const link = page.getByRole('link', { name: 'Ver ficha de Sancho', exact: true });
    assert.equal(await link.getAttribute('href'), `/horses/${horseId}`);
    await link.click();
    await page.getByRole('heading', { name: 'Sancho', exact: true }).waitFor();
    assert.match(await page.locator('main').innerText(), /Nombre\s+Sancho/i);
    assert.doesNotMatch(await page.locator('main').innerText(), /Thunder/);
    assert.deepEqual(writes, []);
    assert.deepEqual(errors, []);
    assert.equal(row.name, 'Thunder');
    await context.close();
  }
  console.log(JSON.stringify({ passed: true, syntheticOnly: true, desktopAndMobile: true,
    cardAndDetails: 'Sancho', unchangedHorseId: horseId, databaseWrites: 0 }));
} finally {
  await browser.close();
}
