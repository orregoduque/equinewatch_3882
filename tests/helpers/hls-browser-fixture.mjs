// Playwright-only network fixtures. Not imported by application or production services.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { StreamWindow } from '../../services/hls-pilot/stream-window.mjs';

export async function installPilotFixture(page, { authorizationDelayMs = 0, deny = false, forceMse = false, live = false,
  userId = '00000000-0000-4000-8000-000000000001' } = {}) {
  const uid = userId;
  let liveWindow;
  let syncLive = () => {};
  if (live) {
    const samples = await Promise.all(Array.from({ length: 12 }, (_, index) =>
      readFile(resolve('generated-artifacts/hls-fixture', `${String(index).padStart(3, '0')}.ts`))));
    const start = Date.now() - 60_000;
    let now = start, next = 0, epoch;
    liveWindow = new StreamWindow({ clock: () => now });
    syncLive = () => {
      const end = Math.floor((Date.now() - start) / 1000);
      for (; next <= end; next++) {
        now = start + next * 1000;
        if (next % 12 === 0) epoch = randomUUID();
        liveWindow.push({
          epoch, sequence: next % 12, duration: 1,
          capturedAt: new Date(now).toISOString(), data: samples[next % 12],
        });
      }
      now = Date.now();
      liveWindow.prune();
    };
    syncLive();
  }
  await page.addInitScript(({ uid, forceMse }) => {
    if (forceMse) {
      const original = HTMLMediaElement.prototype.canPlayType;
      HTMLMediaElement.prototype.canPlayType = function(type) {
        return /mpegurl/i.test(type) ? '' : original.call(this, type);
      };
    }
    const payload = btoa(JSON.stringify({ sub: uid, exp: Math.floor(Date.now() / 1000) + 3600 })).replaceAll('=', '');
    const access_token = 'eyJhbGciOiJIUzI1NiJ9.' + payload + '.synthetic-signature-not-valid-in-production';
    localStorage.setItem('stableEyeUser', JSON.stringify({
      id: uid, email: 'fixture@example.test', name: 'Synthetic browser fixture', role: 'horse_owner',
    }));
    localStorage.setItem('sb-zmxppbpywizdjlhstfkf-auth-token', JSON.stringify({
      access_token, token_type: 'bearer', refresh_token: 'synthetic-no-real-refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600, expires_in: 3600,
      user: { id: uid, aud: 'authenticated', role: 'authenticated', email: 'fixture@example.test' },
    }));
  }, { uid, forceMse });
  await page.route('**/api/hls-pilot/**', async route => {
    const path = new URL(route.request().url()).pathname;
    const json = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });
    if (path.endsWith('/config')) return json({ enabled: true });
    if (path.endsWith('/cameras')) { syncLive(); return json({ cameras: [{
      id: 'synthetic', name: 'Cámara sintética · no es una cámara real', horseId: 'fixture',
      ready: true, segments: 12, bufferedBytes: 1000000, lastReceivedAt: new Date().toISOString(),
      ...(liveWindow?.status() || {}),
    }] }); }
    const horseSession = path.match(/\/horses\/([^/]+)\/session$/);
    if (path.includes('/session/') || horseSession) {
      await new Promise(resolve => setTimeout(resolve, authorizationDelayMs));
      return deny ? json({ error: 'No tienes acceso a esta cámara.' }, 403)
        : json({ ready: true, horseId: horseSession?.[1] || 'fixture', cameraId: 'synthetic',
          expiresAt: Date.now() + 90_000, playbackUrl: '/api/hls-pilot/media/synthetic/index.m3u8' });
    }
    if (path.endsWith('/status')) { syncLive(); return json(liveWindow?.status() || { ready: true }); }
    const name = path.split('/').at(-1);
    if (liveWindow) {
      syncLive();
      try {
        return route.fulfill({
          contentType: name === 'index.m3u8' ? 'application/vnd.apple.mpegurl' : 'video/mp2t',
          body: name === 'index.m3u8' ? liveWindow.playlist() : liveWindow.segment(name),
        });
      } catch (error) { return json({ error: error.message }, error.status || 500); }
    }
    if (name === 'index.m3u8' || /^\d{3}\.ts$/.test(name)) {
      return route.fulfill({
        contentType: name === 'index.m3u8' ? 'application/vnd.apple.mpegurl' : 'video/mp2t',
        body: await readFile(resolve('generated-artifacts/hls-fixture', name)),
      });
    }
    return json({ error: 'Test fixture route not found' }, 404);
  });
}
