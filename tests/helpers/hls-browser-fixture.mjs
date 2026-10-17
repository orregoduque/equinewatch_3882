// Playwright-only network fixtures. Not imported by application or production services.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export async function installPilotFixture(page, { authorizationDelayMs = 0, deny = false, forceMse = false } = {}) {
  const uid = '00000000-0000-4000-8000-000000000001';
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
    if (path.endsWith('/cameras')) return json({ cameras: [{
      id: 'synthetic', name: 'Cámara sintética · no es una cámara real', horseId: 'fixture',
      ready: true, segments: 12, bufferedBytes: 1000000, lastReceivedAt: new Date().toISOString(),
    }] });
    if (path.includes('/session/')) {
      await new Promise(resolve => setTimeout(resolve, authorizationDelayMs));
      return deny ? json({ error: 'No tienes acceso a esta cámara.' }, 403)
        : json({ ready: true, expiresAt: Date.now() + 90_000, playbackUrl: '/api/hls-pilot/media/synthetic/index.m3u8' });
    }
    if (path.endsWith('/status')) return json({ ready: true });
    const name = path.split('/').at(-1);
    if (name === 'index.m3u8' || /^\d{3}\.ts$/.test(name)) {
      return route.fulfill({
        contentType: name === 'index.m3u8' ? 'application/vnd.apple.mpegurl' : 'video/mp2t',
        body: await readFile(resolve('generated-artifacts/hls-fixture', name)),
      });
    }
    return json({ error: 'Test fixture route not found' }, 404);
  });
}
