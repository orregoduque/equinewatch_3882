import assert from 'node:assert/strict';

/** Shared synthetic browser checks for public Storage and private Wasabi. */
export async function assertHourlyTimelapse(page) {
  await page.evaluate(() => {
    const NativeImage = window.Image;
    window.restoreTimelapseImage = () => { window.Image = NativeImage; };
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');
    window.timelapseBlobs = { current: 0, max: 0, total: 0 };
    const urls = new Set();
    window.Image = function (...args) {
      const image = new NativeImage(...args);
      Object.defineProperty(image, 'src', {
        get() { return descriptor.get.call(image); },
        set(src) {
          if (src) { urls.add(image); window.timelapseBlobs.total++; } else urls.delete(image);
          window.timelapseBlobs.current = urls.size;
          window.timelapseBlobs.max = Math.max(window.timelapseBlobs.max, urls.size);
          descriptor.set.call(image, src);
        },
      });
      return image;
    };
  });
  await page.getByRole('button', { name: 'Generar timelapse', exact: true }).click();
  const modal = page.getByRole('dialog', { name: /Timelapse/ });
  await modal.locator('img').waitFor();
  await modal.getByRole('button', { name: 'Pausa', exact: true }).click();
  assert.equal(await modal.locator('img').count(), 1);
  assert((await modal.textContent()).includes('360 fotos · 24.0 s a 15 fps'));
  const paused = await modal.getByLabel('Progreso del timelapse').textContent();
  await page.waitForTimeout(200);
  assert.equal(await modal.getByLabel('Progreso del timelapse').textContent(), paused);
  assert(await page.evaluate(() => window.timelapseBlobs.max <= 3), 'only three preloaded frames retained');
  assert(await page.evaluate(() => window.timelapseBlobs.total < 10), 'does not eager-load 360 images');
  await modal.locator('img').evaluate(image => {
    window.timelapseTimes = [];
    window.timelapseObserver = new MutationObserver(() => window.timelapseTimes.push(performance.now()));
    window.timelapseObserver.observe(image, { attributes: true, attributeFilter: ['src'] });
  });
  await modal.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForTimeout(850);
  await modal.getByRole('button', { name: 'Pausa', exact: true }).click();
  const times = await page.evaluate(() => window.timelapseTimes);
  assert(times.length >= 8 && times.length <= 16, `15 fps playback advanced ${times.length} frames in 850ms`);
  const intervals = times.slice(1).map((time, i) => time - times[i]).sort((a, b) => a - b);
  const median = intervals[Math.floor(intervals.length / 2)];
  assert(median >= 45 && median <= 100, `median frame interval ${median}ms`);
  await page.evaluate(() => window.timelapseObserver.disconnect());
  await modal.getByRole('button', { name: 'Cerrar timelapse', exact: true }).click();
  await modal.waitFor({ state: 'detached' });
  await page.waitForTimeout(150);
  assert.equal(await page.evaluate(() => window.timelapseBlobs.current), 0, 'close releases all preloaded frames');
  await page.evaluate(() => window.restoreTimelapseImage());
  return { frames: times.length, medianFrameMs: Math.round(median), maxPreloadedFrames: await page.evaluate(() => window.timelapseBlobs.max) };
}
