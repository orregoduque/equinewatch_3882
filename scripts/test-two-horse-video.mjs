import assert from 'node:assert/strict';
import { chromium } from 'playwright-core';
import { installPilotFixture } from '../tests/helpers/hls-browser-fixture.mjs';

const base = process.argv[2];
if (!base) throw Error('Provide preview URL');
const assignments = [
  { horseId: 'a95f853c-e90b-4b6d-a4ea-f25cfa317119', id: 'bacata-mock', name: 'Lucero',
    uid: '00000000-0000-4000-8000-000000000001' },
  { horseId: 'd826a274-58ea-4a55-8fd2-1d4c78222ab1', id: 'bacata-thunder', name: 'Thunder',
    uid: '00000000-0000-4000-8000-000000000002' },
];
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const contexts = [];
try {
  async function setup(assignment, mobile) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
    contexts.push(context);
    const page = await context.newPage(), errors = [], media = [], sessions = [];
    let photoReads = 0;
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.url().includes('/media/')) media.push(new URL(request.url()).pathname);
    });
    await installPilotFixture(page, { live: true, userId: assignment.uid });
    await context.route('https://*.supabase.co/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path.endsWith('/images')) photoReads++;
      const body = path.endsWith('/horses') ? assignments.map(item => ({
        id: item.horseId, name: item.name, owner_id: assignment.uid, is_active: true,
        created_at: new Date().toISOString(),
      })) : path.endsWith('/user_profiles') ? [{ id: assignment.uid, email: 'fixture@example.test' }] : [];
      return route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    });
    await page.route('**/api/hls-pilot/cameras', route => route.fulfill({
      contentType: 'application/json', body: JSON.stringify({ cameras: [{
        ...assignment, ready: true, segments: 12, bufferedBytes: 100000, lastReceivedAt: new Date().toISOString(),
      }] }),
    }));
    await page.route('**/api/hls-pilot/horses/*/session', route => {
      const horse = new URL(route.request().url()).pathname.split('/')[4];
      assert.equal(route.request().method(), 'POST');
      const jwt = route.request().headers().authorization.slice(7);
      assert.equal(JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).sub, assignment.uid);
      sessions.push(horse);
      return route.fulfill({ status: horse === assignment.horseId ? 200 : 403, contentType: 'application/json',
        body: JSON.stringify(horse === assignment.horseId ? {
          ready: true, cameraId: assignment.id, horseId: horse, expiresAt: Date.now() + 90000,
          playbackUrl: `/api/hls-pilot/media/${assignment.id}/index.m3u8`,
        } : { error: 'no access for now' }) });
    });
    await page.goto(`${base}/horse-timeline?horseId=${assignment.horseId}`);
    await page.getByRole('button', { name: 'Live video', exact: true }).click();
    await page.waitForFunction(() => {
      const video = document.querySelector('[data-testid="timeline-live-video"]');
      return video?.videoWidth > 0 && video.currentTime > 0.15;
    }, undefined, { timeout: 18000 });
    return { page, media, sessions, errors, assignment, photoReads: () => photoReads };
  }
  const viewers = await Promise.all([setup(assignments[0], false), setup(assignments[1], true)]);
  const initialPhotoReads = viewers.map(viewer => viewer.photoReads());
  await viewers[0].page.waitForTimeout(10500);
  for (const [index, viewer] of viewers.entries()) {
    assert(viewer.photoReads() > initialPhotoReads[index], 'photo polling continues independently while both videos play');
    assert(viewer.media.length > 0);
    assert(viewer.media.every(path => path.includes(`/media/${viewer.assignment.id}/`)));
    assert(viewer.sessions.every(horse => horse === viewer.assignment.horseId));
    assert.deepEqual(viewer.errors, []);
  }
  const lucero = viewers[0];
  const oldVideo = await lucero.page.getByTestId('timeline-live-video').elementHandle();
  await lucero.page.getByRole('button', { name: 'Cerrar vídeo', exact: true }).click();
  assert(await oldVideo.evaluate(video => video.paused && !video.getAttribute('src')));
  await lucero.page.getByRole('button', { name: /^Thunder/ }).click();
  await lucero.page.getByRole('button', { name: /^Lucero/ }).click();
  await lucero.page.getByRole('button', { name: 'Live video', exact: true }).click();
  await lucero.page.waitForFunction(() => document.querySelector('[data-testid="timeline-live-video"]')?.currentTime > 0.15);
  assert(lucero.media.every(path => path.includes('/media/bacata-mock/')));
  assert(await viewers[1].page.getByTestId('timeline-live-video').evaluate(video => !video.paused && video.currentTime > 0.15));
  console.log(JSON.stringify({ passed: true, syntheticOnly: true, physicalThunderStreamVerified: false,
    simultaneousDistinctUsers: true, desktopAndMobile: true, rapidSwitch: true, independentMediaPaths: true,
    photoPollingDuringBothVideos: true }));
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
}
