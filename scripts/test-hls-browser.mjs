import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { installPilotFixture } from '../tests/helpers/hls-browser-fixture.mjs';

const base = process.argv[2];
if (!base) throw new Error('Usage: node scripts/test-hls-browser.mjs https://YOUR-DEV-DOMAIN [chromium-path]');
const directory = 'generated-artifacts/hls-browser';
const mseOnly = process.argv.includes('--mse-only');
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: (process.argv[3] && !process.argv[3].startsWith('--')) ? process.argv[3] : '/repl/tools/bin/chromium',
  headless: true, args: ['--no-sandbox'],
});
const report = { browser: browser.version(), syntheticOnly: true, physicalMobile: false, results: [] };
async function context(viewport, fixture) {
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://*.supabase.co/**', route => route.abort());
  await page.route('wss://*.supabase.co/**', route => route.abort());
  if (fixture) await installPilotFixture(page, fixture);
  await page.goto(base + '/hls-pilot');
  return { context, page, errors };
}
async function wait(page, selector) {
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 15_000 });
}
async function download(page, name) {
  const pending = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar mediciones' }).click();
  const download = await pending;
  const file = `${directory}/${name}.json`;
  await download.saveAs(file);
  const raw = await readFile(file, 'utf8');
  assert(!raw.includes('synthetic-signature') && !raw.includes('access_token'));
  return JSON.parse(raw);
}
try {
  if (!mseOnly) {
  // Exercise disabled configuration explicitly, independently of this workspace's receiver setup.
  // The backend default remains covered by tests/hls-pilot.test.mjs.
  const disabledFixture = async route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({ enabled: false }),
  });
  const disabled = await context({ width: 1366, height: 900 }, {});
  await disabled.page.route('**/api/hls-pilot/config', disabledFixture);
  await disabled.page.reload();
  await wait(disabled.page, 'h2:text-is("Piloto desactivado")');
  assert(await disabled.page.getByRole('button', { name: 'Ver vídeo', exact: true }).isDisabled());
  await disabled.page.screenshot({ path: `${directory}/disabled-desktop.png`, fullPage: true });
  assert.equal(disabled.errors.length, 0);
  await disabled.context.close();
  report.results.push({ case: 'disabled-config', passed: true });
  }

  for (const [name, viewport] of (mseOnly ? [
    ['desktop-mse', { width: 1366, height: 900 }],
  ] : [
    ['desktop', { width: 1366, height: 900 }],
    ['mobile-viewport', { width: 390, height: 844 }],
  ])) {
    const test = await context(viewport, { forceMse: mseOnly });
    await wait(test.page, 'button:has-text("Cámara sintética")');
    await test.page.getByRole('button', { name: 'Ver vídeo', exact: true }).click();
    await wait(test.page, 'text=Reproduciendo · retraso real no medido');
    const frames = await test.page.getByLabel('Vídeo en directo de la cámara seleccionada').evaluate(video => ({
      time: video.currentTime, width: video.videoWidth, height: video.videoHeight,
      decoded: video.getVideoPlaybackQuality().totalVideoFrames, paused: video.paused,
      native: Boolean(video.canPlayType('application/vnd.apple.mpegurl')),
    }));
    assert(frames.time > 0 && frames.decoded >= 2 && !frames.paused);
    assert.equal(frames.width, 640); assert.equal(frames.height, 480);
    const exported = await download(test.page, name);
    assert.equal(exported.results.length, 1);
    assert(exported.results[0].clickToMotionMs > 0);
    assert.equal(exported.results[0].measurementMethod, 'video-frame-callback');
    assert.equal(exported.realWorldDelay, 'not-measured');
    assert(await test.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'horizontal overflow');
    await test.page.screenshot({ path: `${directory}/${name}-playing.png`, fullPage: true });
    await test.page.getByRole('button', { name: 'Cerrar conexión', exact: true }).click();
    assert(await test.page.getByLabel('Vídeo en directo de la cámara seleccionada').evaluate(video => video.paused && !video.getAttribute('src')));
    await test.page.getByRole('button', { name: 'Ver vídeo', exact: true }).click();
    await wait(test.page, 'text=Reproduciendo · retraso real no medido');
    assert.equal((await download(test.page, `${name}-reopened`)).results.length, 2);
    assert.equal(test.errors.length, 0, test.errors.join('\n'));
    report.results.push({ case: name, passed: true, frames, metrics: exported.results[0] });
    await test.context.close();
  }
  if (!mseOnly) {
  const delayed = await context({ width: 1366, height: 900 }, { authorizationDelayMs: 3500 });
  await wait(delayed.page, 'button:has-text("Cámara sintética")');
  await delayed.page.getByRole('button', { name: 'Ver vídeo', exact: true }).click();
  await wait(delayed.page, 'text=Aviso del umbral:');
  await wait(delayed.page, 'text=Reproduciendo · retraso real no medido');
  const slow = await download(delayed.page, 'slow-authorization');
  assert.equal(slow.results[0].outcome, 'over-target');
  assert(slow.results[0].authorizationMs >= 3500);
  report.results.push({ case: 'slow-authorization-included', passed: true, metrics: slow.results[0] });
  await delayed.context.close();

  const denied = await context({ width: 390, height: 844 }, { deny: true });
  let media = 0;
  denied.page.on('request', request => { if (request.url().includes('/media/')) media++; });
  await wait(denied.page, 'button:has-text("Cámara sintética")');
  await denied.page.getByRole('button', { name: 'Ver vídeo', exact: true }).click();
  await wait(denied.page, '[role="alert"]');
  const failed = await download(denied.page, 'denied');
  assert.equal(failed.results[0].outcome, 'failed');
  assert.equal(failed.results[0].clickToMotionMs, null);
  assert.equal(media, 0);
  report.results.push({ case: 'denied-no-media', passed: true });
  await denied.context.close();
  }
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile(`${directory}/${mseOnly ? 'report-mse' : 'report'}.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
