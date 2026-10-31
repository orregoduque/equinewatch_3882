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
  { horseId: 'e47d1da3-9b6b-4433-819c-423d7687b296', id: 'casona-tessa', name: 'Tessa',
    uid: '00000000-0000-4000-8000-000000000003' },
  { horseId: '61c46d85-34be-4fa8-a892-9e22211487df', id: 'casona-velvet', name: 'Velvet Vitalis',
    uid: '00000000-0000-4000-8000-000000000004' },
  { horseId: 'a264b293-2d23-497f-b47f-5f7e68a81ea9', id: 'bacata-golden-girl', name: 'Golden Girl',
    uid: '00000000-0000-4000-8000-000000000005' },
];
const browser = await chromium.launch({ executablePath: '/repl/tools/bin/chromium', args: ['--no-sandbox'] });
const contexts = [];
try {
  async function setup(assignment, mobile) {
    const permitted = assignment.id.startsWith('casona-')
      ? assignments.filter(item => item.id.startsWith('casona-')) : [assignment];
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
    contexts.push(context);
    const page = await context.newPage(), errors = [], media = [], sessions = [];
    let photoReads = 0;
    let goldenReady = assignment.id !== 'bacata-golden-girl';
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
      contentType: 'application/json', body: JSON.stringify({ cameras: permitted.map(item => ({
        ...item, ready: item.id === 'bacata-golden-girl' ? goldenReady : true,
        segments: 12, bufferedBytes: 100000, lastReceivedAt: new Date().toISOString(),
      })) }),
    }));
    await page.route('**/api/hls-pilot/horses/*/session', route => {
      const horse = new URL(route.request().url()).pathname.split('/')[4];
      const selected = permitted.find(item => item.horseId === horse);
      assert.equal(route.request().method(), 'POST');
      const jwt = route.request().headers().authorization.slice(7);
      assert.equal(JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString()).sub, assignment.uid);
      sessions.push(horse);
      return route.fulfill({ status: selected ? 200 : 403, contentType: 'application/json',
        body: JSON.stringify(selected ? {
          ready: true, cameraId: selected.id, horseId: horse, expiresAt: Date.now() + 90000,
          playbackUrl: `/api/hls-pilot/media/${selected.id}/index.m3u8`,
        } : { error: 'no access for now' }) });
    });
    await page.goto(`${base}/horse-timeline?horseId=${assignment.horseId}`);
    await page.getByRole('button', { name: 'Live video', exact: true }).click();
    if (assignment.id === 'bacata-golden-girl') {
      await page.getByText('La cámara de este caballo aún no está publicando vídeo. Las fotos funcionan de forma independiente.', { exact: true }).waitFor();
      assert.equal(media.length, 0, 'pending publisher never requests a mock or another horse');
      assert.equal(sessions.length, 0);
      await page.getByRole('button', { name: 'Cerrar vídeo', exact: true }).click();
      goldenReady = true; // Simulates receiver capacity/ACL + publisher becoming ready.
      await page.getByRole('button', { name: 'Live video', exact: true }).click();
    }
    await page.waitForFunction(() => {
      const video = document.querySelector('[data-testid="timeline-live-video"]');
      return video?.videoWidth > 0 && video.currentTime > 0.15;
    }, undefined, { timeout: 18000 });
    return { page, media, sessions, errors, assignment, photoReads: () => photoReads };
  }
  const viewers = await Promise.all(assignments.map((assignment, index) => setup(assignment, index % 2 === 1)));
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
  await lucero.page.getByRole('button', { name: /^Sancho/ }).click();
  await lucero.page.getByRole('button', { name: /^Destiny/ }).click();
  await lucero.page.getByRole('button', { name: 'Live video', exact: true }).click();
  await lucero.page.waitForFunction(() => document.querySelector('[data-testid="timeline-live-video"]')?.currentTime > 0.15);
  assert(lucero.media.every(path => path.includes('/media/bacata-mock/')));
  assert(await viewers[1].page.getByTestId('timeline-live-video').evaluate(video => !video.paused && video.currentTime > 0.15));
  const tessa = viewers[2];
  const oldCasonaVideo = await tessa.page.getByTestId('timeline-live-video').elementHandle();
  await tessa.page.getByRole('button', { name: 'Cerrar vídeo', exact: true }).click();
  assert(await oldCasonaVideo.evaluate(video => video.paused && !video.getAttribute('src')));
  await tessa.page.getByRole('button', { name: /^Velvet Vitalis/ }).click();
  await tessa.page.getByRole('button', { name: /^Tessa/ }).click();
  await tessa.page.getByRole('button', { name: /^Velvet Vitalis/ }).click();
  const switchRequests = tessa.media.length;
  await tessa.page.getByRole('button', { name: 'Live video', exact: true }).click();
  await tessa.page.waitForFunction(() => document.querySelector('[data-testid="timeline-live-video"]')?.currentTime > 0.15);
  assert(tessa.sessions.at(-1) === assignments[3].horseId);
  assert(tessa.media.slice(switchRequests).some(path => path.includes('/media/casona-velvet/')));
  assert(tessa.media.every(path => /\/media\/casona-(tessa|velvet)\//.test(path)));
  assert(await viewers[3].page.getByTestId('timeline-live-video').evaluate(video => !video.paused && video.currentTime > 0.15),
    'second authorized Casona viewer continues while the first switches horses');
  const golden = viewers[4];
  const goldenElement = await golden.page.getByTestId('timeline-live-video').elementHandle();
  await golden.page.getByRole('button', { name: 'Cerrar vídeo', exact: true }).click();
  assert(await goldenElement.evaluate(video => video.paused && !video.getAttribute('src')));
  await golden.page.getByRole('button', { name: /^Destiny/ }).click();
  await golden.page.getByRole('button', { name: 'Live video', exact: true }).click();
  await golden.page.getByText('No hay un streaming publicado y autorizado para este caballo todavía.', { exact: true }).waitFor();
  assert(golden.media.every(path => path.includes('/media/bacata-golden-girl/')));
  await golden.page.getByRole('button', { name: 'Cerrar vídeo', exact: true }).click();
  await golden.page.getByRole('button', { name: /^Trajano/ }).click();
  await golden.page.getByRole('button', { name: 'Live video', exact: true }).click();
  await golden.page.waitForFunction(() => document.querySelector('[data-testid="timeline-live-video"]')?.currentTime > 0.15);
  console.log(JSON.stringify({ passed: true, syntheticOnly: true, physicalThunderStreamVerified: false,
    physicalCasonaStreamsVerified: false, fourCameraMappings: true, twoCasonaViewers: true,
    goldenGirlMapping: true, goldenPublisherPendingNoFallback: true, goldenPlayerDisposed: true,
    physicalGoldenStreamVerified: false, realSafariVerified: false,
    simultaneousDistinctUsers: true, desktopAndMobile: true, rapidSwitch: true, independentMediaPaths: true,
    photoPollingDuringBothVideos: true }));
} finally {
  await Promise.all(contexts.map(context => context.close()));
  await browser.close();
}
