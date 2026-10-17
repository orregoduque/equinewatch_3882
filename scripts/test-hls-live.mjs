import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { installPilotFixture } from '../tests/helpers/hls-browser-fixture.mjs';

const base = process.argv[2];
if (!base) throw new Error('Usage: node scripts/test-hls-live.mjs https://YOUR-DEV-DOMAIN');
const directory = 'generated-artifacts/hls-live';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium',
  headless: true, args: ['--no-sandbox'] });
const results = [];
try {
  for (const forceMse of [false, true]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const network = [], errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().includes('/api/hls-pilot/media/'))
        network.push({ path: new URL(response.url()).pathname, status: response.status() });
    });
    await page.route('https://*.supabase.co/**', route => route.abort());
    await installPilotFixture(page, { live: true, forceMse });
    try {
      await page.goto(base + '/hls-pilot');
      await page.getByRole('button', { name: /Cámara sintética/ }).waitFor();
      const openings = [];
      for (let index = 0; index < 3; index++) {
        await page.getByRole('button', { name: 'Ver vídeo', exact: true }).click();
        try {
          await page.getByText('Reproduciendo · retraso real no medido', { exact: true })
            .waitFor({ timeout: 16_000 });
          const video = page.getByLabel('Vídeo en directo de la cámara seleccionada');
          const before = await video.evaluate(video => video.currentTime);
          await page.waitForTimeout(2200);
          assert(await video.evaluate(video => video.currentTime) > before, 'live frames keep advancing');
          openings.push({ index, passed: true });
          await page.getByRole('button', { name: 'Cerrar conexión', exact: true }).click();
          assert(await video.evaluate(video => video.paused && !video.getAttribute('src')));
        } catch (error) {
          const state = await page.getByLabel('Vídeo en directo de la cámara seleccionada').evaluate(video => ({
            readyState: video.readyState, networkState: video.networkState, time: video.currentTime,
            error: video.error?.code, native: video.canPlayType('application/vnd.apple.mpegurl'),
          }));
          console.log(JSON.stringify({ forceMse, index, state, network, errors }, null, 2));
          throw error;
        }
      }
      assert.equal(errors.length, 0, errors.join('\n'));
      assert(network.filter(item => item.path.endsWith('index.m3u8')).length >= 3);
      results.push({ forceMse, openings, passed: true, syntheticOnly: true });
    } finally { await context.close(); }
  }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await writeFile(`${directory}/report.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
