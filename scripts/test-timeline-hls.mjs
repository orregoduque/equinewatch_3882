import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { installPilotFixture } from '../tests/helpers/hls-browser-fixture.mjs';

const base = process.argv[2];
if (!base) throw new Error('Usage: node scripts/test-timeline-hls.mjs https://YOUR-DEV-DOMAIN [chromium-path]');
const directory = 'generated-artifacts/timeline-hls';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.argv[3] || '/repl/tools/bin/chromium',
  headless: true, args: ['--no-sandbox'],
});
const results = [];
const uid = '00000000-0000-4000-8000-000000000001';
const cameras = [{
  id: 'synthetic', name: 'Synthetic HLS camera', horseId: 'fixture',
  ready: true, segments: 12, bufferedBytes: 1000000, lastReceivedAt: new Date().toISOString(),
}];

async function setup({ mobile = false, forceMse = false, deny = false, discoveryDelay = 0,
  cameraList = cameras, offline = false, disabled = false, signedOut = false, cameraStatus = 200 } = {}) {
  const viewport = mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 };
  const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  const page = await context.newPage();
  const errors = [], requests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (/\/api\/hls-pilot\/|hls-demo-5s\.mp4/.test(request.url())) requests.push(request.url());
  });
  // Test-only fake data: no customer sessions, backend calls or production permissions are changed.
  await page.route('https://*.supabase.co/**', route => {
    const path = new URL(route.request().url()).pathname;
    const body = path.includes('/rest/v1/horses') ? ['fixture', 'other-fixture'].map(id => ({
      id, name: id === 'fixture' ? 'Fixture horse' : 'Other fixture horse',
      breed: 'Synthetic', owner_id: uid, is_active: true, profile_photo_url: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    })) : path.includes('/auth/v1/user') ? { id: uid, email: 'fixture@example.test' } : [];
    return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
  });
  if (!signedOut) await installPilotFixture(page, { forceMse, deny });
  if (signedOut || disabled) {
    await page.route('**/api/hls-pilot/config', route => route.fulfill({
      contentType: 'application/json', body: JSON.stringify({ enabled: !disabled }),
    }));
  }
  await page.route('**/api/hls-pilot/cameras', async route => {
    if (discoveryDelay) await new Promise(resolve => setTimeout(resolve, discoveryDelay));
    try {
      await route.fulfill({ status: cameraStatus, contentType: 'application/json',
        body: JSON.stringify(cameraStatus === 200 ? { cameras: cameraList } : { error: 'Not authorized' }) });
    } catch { /* An intentionally cancelled discovery request may already be gone. */ }
  });
  if (offline) await page.route(/\/api\/hls-pilot\/(?:session\/[^/]+|horses\/[^/]+\/session)$/, route => route.fulfill({
    contentType: 'application/json', body: JSON.stringify({
      ready: false, horseId: 'fixture', cameraId: 'synthetic', expiresAt: Date.now() + 90_000,
      playbackUrl: '/api/hls-pilot/media/synthetic/index.m3u8',
    }),
  }));
  await page.goto(base + '/horse-timeline', { waitUntil: 'domcontentloaded' });
  const trigger = page.getByRole('button', { name: 'Live video', exact: true });
  await trigger.waitFor();
  if (!signedOut) await page.getByRole('button', { name: /^Fixture horse/ }).waitFor();
  assert.equal(await page.getByRole('dialog').count(), 0, 'preload does not open a dialog');
  return { context, page, trigger, errors, requests, viewport };
}

async function open(test) {
  await test.trigger.click();
  const modal = test.page.getByRole('dialog');
  await modal.waitFor();
  const bounds = await modal.boundingBox();
  assert(bounds && Math.abs(bounds.x) < 1 && Math.abs(bounds.y) < 1);
  assert(Math.abs(bounds.width - test.viewport.width) < 1
    && Math.abs(bounds.height - test.viewport.height) < 1, 'fills full viewport');
  return modal;
}
async function moving(page) {
  await page.getByText('Movimiento de fotogramas confirmado en', { exact: false }).waitFor({ timeout: 16000 });
  const state = await page.getByTestId('timeline-live-video').evaluate(video => ({
    time: video.currentTime, width: video.videoWidth, loop: video.loop, muted: video.muted,
    inline: video.playsInline, frames: video.getVideoPlaybackQuality().totalVideoFrames,
  }));
  assert(state.time > 0 && state.frames >= 2);
  assert.equal(state.width, 640);
  assert(!state.loop && state.muted && state.inline, 'HLS is not the looping MP4 demo');
  return state;
}
function noDemo(test) {
  assert(!test.requests.some(url => url.includes('hls-demo-5s.mp4')), 'never request the 5s MP4');
  assert.equal(test.errors.length, 0, test.errors.join('\n'));
}
async function closeDialog(test) {
  const video = test.page.getByTestId('timeline-live-video');
  await video.evaluate(video => { window.__lastVideo = video; });
  await test.page.getByRole('button', { name: 'Cerrar vídeo', exact: true }).click();
  assert.equal(await test.page.getByRole('dialog').count(), 0);
  assert(await test.page.evaluate(() => window.__lastVideo.paused && !window.__lastVideo.getAttribute('src')));
  await test.page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Live video');
  assert.notEqual(await test.page.evaluate(() => document.body.style.overflow), 'hidden');
}

try {
  for (const options of [{}, { forceMse: true }, { mobile: true }]) {
    const test = await setup(options);
    try {
      await test.page.waitForFunction(() => {
        const video = document.querySelector('[data-testid="timeline-live-video"]');
        return video && video.readyState >= 2;
      }, { timeout: 12000 });
      assert(test.requests.some(url => /\/horses\/fixture\/session$/.test(url)), 'authorize by horse before click');
      assert(test.requests.some(url => url.endsWith('.ts')), 'preload real HLS segments before click');
      assert(await test.page.getByTestId('timeline-live-video').evaluate(video => video.paused));
      const sessions = test.requests.filter(url => /\/horses\/fixture\/session$/.test(url)).length;
      await open(test);
      await moving(test.page);
      const timing = await test.page.getByText('Movimiento de fotogramas confirmado en', { exact: false }).innerText();
      assert.equal(test.requests.filter(url => /\/horses\/fixture\/session$/.test(url)).length, sessions, 'reuse authorized player');
      await closeDialog(test);
      noDemo(test);
      results.push({ name: options.forceMse ? 'preload-mse-reused' : options.mobile ? 'preload-mobile-reused' : 'preload-native-reused', passed: true, timing });
    } finally { await test.context.close(); }
  }

  for (const hidden of [true, false]) {
    const test = await setup({ forceMse: true });
    try {
      await test.page.waitForFunction(() => document.querySelector('video')?.readyState >= 2);
      if (hidden) {
        await test.page.evaluate(() => {
          Object.defineProperty(document, 'hidden', { configurable: true, value: true });
          document.dispatchEvent(new Event('visibilitychange'));
        });
      } else {
        // Real timers verify expiry while the timeline remains visible.
        await test.page.waitForTimeout(31_000);
      }
      assert(await test.page.getByTestId('timeline-live-video').evaluate(video => video.paused && !video.getAttribute('src')));
      const count = test.requests.length;
      await test.page.waitForTimeout(3500);
      assert.equal(test.requests.length, count, 'no polling or media traffic after cancellation');
      results.push({ name: hidden ? 'hidden-tab-stops-preload' : 'preload-expires', passed: true });
    } finally { await test.context.close(); }
  }

  const warmDenied = await setup({ cameraList: [] });
  try {
    await warmDenied.page.waitForTimeout(1200);
    assert(!warmDenied.requests.some(url => /\/session(?:\/|$)|\/media\//.test(url)), 'unauthorized users never preload media');
    assert.equal(await warmDenied.page.getByRole('dialog').count(), 0);
    await open(warmDenied);
    assert.equal(await warmDenied.page.getByRole('alert').innerText(), 'no access for now');
    await closeDialog(warmDenied);
    results.push({ name: 'unauthorized-preload-blocked', passed: true });
  } finally { await warmDenied.context.close(); }

  for (const [name, options] of [
    ['desktop', {}], ['mobile-viewport', { mobile: true }], ['desktop-mse', { forceMse: true }],
  ]) {
    const test = await setup(options);
    try {
      const modal = await open(test);
      const state = await moving(test.page);
      assert(test.requests.some(url => /\/horses\/fixture\/session$/.test(url)));
      assert(test.requests.some(url => url.endsWith('/index.m3u8')));
      assert(test.requests.some(url => url.endsWith('.ts')));
      assert(!((await modal.innerText()).includes('Muestra simulada')));
      await test.page.screenshot({ path: `${directory}/${name}-playing.png` });
      await closeDialog(test);
      await open(test);
      await moving(test.page);
      await test.page.keyboard.press('Escape');
      await test.page.waitForFunction(() => !document.querySelector('dialog[open]'));
      await open(test);
      await moving(test.page);
      await test.page.getByTestId('timeline-live-video').evaluate(video => { window.__lastVideo = video; });
      await test.page.evaluate(() => {
        history.pushState({}, '', '/horse-timeline?horseId=other-fixture');
        dispatchEvent(new PopStateEvent('popstate'));
      });
      await test.page.waitForFunction(() => !document.querySelector('dialog[open]'));
      assert(await test.page.evaluate(() => window.__lastVideo.paused && !window.__lastVideo.getAttribute('src')));
      noDemo(test);
      results.push({ name, passed: true, syntheticOnly: true, state });
    } finally { await test.context.close(); }
  }

  for (const [name, options, expected] of [
    ['wrong-horse', { cameraList: [{ ...cameras[0], horseId: 'unrelated' }] }, /No hay un streaming publicado/],
    ['no-cameras', { cameraList: [] }, /^no access for now$/],
    ['denied', { deny: true }, /^no access for now$/],
    ['discovery-forbidden', { cameraStatus: 403 }, /^no access for now$/],
    ['discovery-unauthenticated', { cameraStatus: 401 }, /^no access for now$/],
    ['mobile-denied', { mobile: true, cameraList: [] }, /^no access for now$/],
    ['offline', { offline: true }, /desconectada|preparando segmentos/],
    ['disabled', { disabled: true }, /deshabilitado/],
    ['signed-out', { signedOut: true }, /^no access for now$/],
  ]) {
    const test = await setup(options);
    try {
      await open(test);
      const alert = test.page.getByRole('alert');
      await alert.waitFor();
      assert.match(await alert.innerText(), expected);
      if ((await alert.innerText()) === 'no access for now') {
        assert.equal(await test.page.getByTestId('timeline-live-video').isVisible(), false);
        assert.equal(await test.page.getByRole('button', { name: 'Reintentar', exact: true }).count(), 0);
        await test.page.screenshot({ path: `${directory}/${name}.png` });
        assert(await test.page.getByRole('button', { name: 'Cerrar vídeo', exact: true }).isVisible());
      }
      assert(!test.requests.some(url => /\/media\//.test(url)), 'errors must not request camera media');
      if (['wrong-horse', 'no-cameras', 'disabled', 'signed-out'].includes(name))
        assert(!test.requests.some(url => /\/session(?:\/|$)/.test(url)), 'do not authorize unrelated cameras');
      await closeDialog(test);
      noDemo(test);
      results.push({ name, passed: true });
    } finally { await test.context.close(); }
  }

  const slow = await setup({ discoveryDelay: 3500 });
  try {
    await open(slow);
    await slow.page.getByText('Aún no se confirma movimiento', { exact: false }).waitFor();
    await moving(slow.page);
    const timing = await slow.page.getByText('Movimiento de fotogramas confirmado en', { exact: false }).innerText();
    assert(Number(timing.match(/en ([\d.]+) s/)[1]) >= 3.5, 'include discovery before authorization');
    await closeDialog(slow);
    noDemo(slow);
    results.push({ name: 'discovery-time-included', passed: true, timing });
  } finally { await slow.context.close(); }

  const cancelled = await setup({ discoveryDelay: 800 });
  try {
    await open(cancelled);
    await closeDialog(cancelled);
    await cancelled.page.waitForTimeout(1000);
    assert(!cancelled.requests.some(url => /\/session(?:\/|$)|\/media\//.test(url)), 'close cancels discovery');
    noDemo(cancelled);
    results.push({ name: 'close-during-discovery', passed: true });
  } finally { await cancelled.context.close(); }

  const pilot = await setup();
  try {
    await pilot.page.goto(base + '/hls-pilot');
    await pilot.page.getByRole('button', { name: 'Ver vídeo', exact: true }).waitFor();
    assert.equal(await pilot.page.getByTestId('mock-video').count(), 0, 'pilot no longer contains demo');
    noDemo(pilot);
    results.push({ name: 'pilot-has-no-mp4-demo', passed: true });
  } finally { await pilot.context.close(); }
  console.log(JSON.stringify(results, null, 2));
} finally {
  await writeFile(`${directory}/report.json`, JSON.stringify(results, null, 2));
  await browser.close();
}
