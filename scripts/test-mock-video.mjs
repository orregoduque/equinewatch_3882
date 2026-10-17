import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base = process.argv[2];
if (!base) throw new Error('Usage: node scripts/test-mock-video.mjs https://YOUR-DEV-DOMAIN [chromium-path]');
const directory = 'generated-artifacts/mock-video';
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.argv[3] || '/repl/tools/bin/chromium',
  headless: true, args: ['--no-sandbox'],
});
try {
  const results = await Promise.all([
    ['desktop', { width: 1280, height: 900 }, false],
    ['mobile-viewport', { width: 390, height: 844 }, true],
  ].map(async ([name, viewport, mobile]) => {
    const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
    const page = await context.newPage();
    const errors = [], privateRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (/\/api\/hls-pilot\/(session|media)\//.test(request.url())) privateRequests.push(request.url());
    });
    try {
      await page.goto(base + '/hls-pilot', { waitUntil: 'domcontentloaded' });
      const video = page.getByTestId('mock-video');
      await video.waitFor();
      await page.waitForFunction(() => {
        const video = document.querySelector('[data-testid="mock-video"]');
        return video?.readyState >= 2 && video.currentTime > 0 && !video.paused;
      });
      const metadata = await video.evaluate(video => ({
        duration: video.duration, width: video.videoWidth, height: video.videoHeight,
        loop: video.loop, muted: video.muted, inline: video.playsInline,
      }));
      assert.equal(metadata.duration, 5);
      assert.equal(metadata.width, 640);
      assert.equal(metadata.height, 480);
      assert(metadata.loop && metadata.muted && metadata.inline);
      await page.evaluate(() => {
        const video = document.querySelector('[data-testid="mock-video"]');
        const state = window.__mockLoopState = { wraps: 0, previous: video.currentTime };
        video.addEventListener('timeupdate', () => {
          if (video.currentTime < state.previous - 1) state.wraps++;
          state.previous = video.currentTime;
        });
      });
      await page.waitForFunction(() => window.__mockLoopState.wraps >= 2, null, { timeout: 16_000 });
      assert(await video.evaluate(video => !video.paused && !video.ended));
      await video.evaluate(video => video.pause());
      const before = await video.evaluate(video => video.currentTime);
      await page.waitForTimeout(250);
      assert.equal(await video.evaluate(video => video.currentTime), before);
      await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
      await page.waitForFunction(() => !document.querySelector('[data-testid="mock-video"]').paused);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.equal(privateRequests.length, 0, 'demo must never request real camera authorization/media');
      assert.equal(errors.length, 0, errors.join('\n'));
      await page.screenshot({ path: `${directory}/${name}.png`, fullPage: false });
      return { name, metadata, automaticWraps: await page.evaluate(() => window.__mockLoopState.wraps), passed: true };
    } finally { await context.close(); }
  }));
  const report = { browser: browser.version(), physicalMobileTested: false, results };
  await writeFile(`${directory}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally { await browser.close(); }
