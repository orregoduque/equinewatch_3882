import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const base = process.argv[2];
if (!base) throw new Error('Usage: node scripts/test-timeline-live-video.mjs https://YOUR-DEV-DOMAIN [chromium-path]');
const directory = 'generated-artifacts/timeline-live-video';
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
    const errors = [];
    let mediaRequests = 0;
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.url().includes('/media/hls-demo-5s.mp4')) mediaRequests++;
    });
    try {
      await page.goto(base + '/horse-timeline', { waitUntil: 'domcontentloaded' });
      const button = page.getByRole('button', { name: 'Live video', exact: true });
      await button.waitFor();
      assert.equal(await page.getByTestId('timeline-live-video').count(), 0);
      assert.equal(mediaRequests, 0, 'no video download before click');
      await button.click();
      const modal = page.getByRole('dialog');
      await modal.waitFor();
      assert(new URL(page.url()).pathname === '/horse-timeline', 'stay on Timeline');
      const scrollBeforeClose = await page.evaluate(() => scrollY);
      const dialogBounds = await modal.boundingBox();
      assert(dialogBounds && Math.abs(dialogBounds.x) <= 1 && Math.abs(dialogBounds.y) <= 1,
        'fullscreen dialog starts at viewport origin');
      assert(Math.abs(dialogBounds.width - viewport.width) <= 1
        && Math.abs(dialogBounds.height - viewport.height) <= 1, 'dialog fills entire viewport');
      const video = page.getByTestId('timeline-live-video');
      await page.waitForFunction(() => {
        const video = document.querySelector('[data-testid="timeline-live-video"]');
        return video?.readyState >= 2 && video.currentTime > 0 && !video.paused;
      });
      const attributes = await video.evaluate(video => ({
        duration: video.duration, loop: video.loop, muted: video.muted,
        inline: video.playsInline, width: video.videoWidth,
      }));
      assert.equal(attributes.duration, 5);
      assert(attributes.loop && attributes.muted && attributes.inline);
      assert.equal(attributes.width, 640);
      const videoBounds = await video.boundingBox();
      assert(videoBounds && Math.abs(videoBounds.width - viewport.width) <= 1
        && Math.abs(videoBounds.height - viewport.height) <= 1, 'video fills viewport without a card');
      const closeButton = page.getByRole('button', { name: 'Cerrar vídeo', exact: true });
      await closeButton.evaluate(button => {
        const bounds = button.getBoundingClientRect();
        const topElement = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
        if (!button.contains(topElement)) throw new Error('Close button is obstructed');
      });
      assert((await modal.innerText()).match(/simulad|demostraci|no es.*directo|no.*cámara/i));
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'no horizontal overflow');
      // Retain the element only in the browser test so cleanup can be observed after removal.
      await video.evaluate(video => { window.__closedTimelineVideo = video; });
      await page.screenshot({ path: `${directory}/${name}-open.png` });
      await page.getByRole('button', { name: 'Cerrar vídeo', exact: true }).click();
      assert.equal(await page.getByTestId('timeline-live-video').count(), 0);
      assert(await page.evaluate(() => window.__closedTimelineVideo.paused
        && !window.__closedTimelineVideo.getAttribute('src')));
      assert(await button.evaluate(button => document.activeElement === button), 'restore keyboard focus');
      assert.equal(await page.evaluate(() => scrollY), scrollBeforeClose, 'preserve timeline position');
      assert.equal(new URL(page.url()).pathname, '/horse-timeline', 'close returns to same timeline');
      await button.click();
      await modal.waitFor();
      if (!mobile) {
        await page.keyboard.press('Escape');
        await page.waitForFunction(() => !document.querySelector('dialog[open]'));
        await button.click();
        await modal.waitFor();
      }
      // Route change unmounts the player even without using its close control.
      await video.evaluate(video => { window.__closedTimelineVideo = video; });
      await page.evaluate(() => {
        history.pushState({}, '', '/contact');
        dispatchEvent(new PopStateEvent('popstate'));
      });
      await page.waitForFunction(() => !document.querySelector('[data-testid="timeline-live-video"]'));
      assert(await page.evaluate(() => window.__closedTimelineVideo.paused
        && !window.__closedTimelineVideo.getAttribute('src')));
      assert.notEqual(await page.evaluate(() => document.body.style.overflow), 'hidden');
      assert.equal(errors.length, 0, errors.join('\n'));
      return { name, passed: true, attributes, mediaRequests, physicalMobile: false };
    } finally { await context.close(); }
  }));
  console.log(JSON.stringify(results, null, 2));
  await writeFile(`${directory}/report.json`, JSON.stringify(results, null, 2));
} finally { await browser.close(); }
