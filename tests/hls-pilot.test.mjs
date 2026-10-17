import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { StreamWindow, PilotError } from '../services/hls-pilot/stream-window.mjs';
import { createAuth, validateConfig } from '../services/hls-pilot/auth.mjs';
import { createReceiver } from '../services/hls-pilot/receiver.mjs';
import { loadPilotProxy, pilotHtml } from '../services/hls-pilot/app-proxy.mjs';

const owner = '00000000-0000-4000-8000-000000000001';
const other = '00000000-0000-4000-8000-000000000002';
const admin = '00000000-0000-4000-8000-000000000003';
const epoch = '00000000-0000-4000-8000-000000000004';
const key = 'synthetic-test-publisher-key-000000000';
const keyHash = createHash('sha256').update(key).digest('hex');
const config = {
  supabaseUrl: 'https://auth.example.test', supabaseAnonKey: 'public-test-key', adminUserIds: [admin],
  cameras: [
    { id: 'box-one', name: 'Box one', horseId: 'horse-one', ownerUserIds: [owner], stableOwnerUserIds: [], publisherKeySha256: keyHash },
    { id: 'box-two', name: 'Box two', horseId: 'horse-two', ownerUserIds: [other], stableOwnerUserIds: [],
      publisherKeySha256: createHash('sha256').update('distinct-synthetic-camera-two-key').digest('hex') },
  ],
};
const ts = Buffer.alloc(188 * 3, 0);
for (let i = 0; i < ts.length; i += 188) ts[i] = 0x47;
const entry = (sequence, now, extras = {}) => ({
  sequence, epoch, duration: 1, capturedAt: new Date(now).toISOString(), data: ts, ...extras,
});
async function listen(handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
async function close(server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }

test('window is bounded by age, bytes and segment count, never writes camera files', () => {
  let now = Date.now();
  const window = new StreamWindow({ maxBytes: ts.length * 3, windowMs: 3000, clock: () => now });
  for (let i = 0; i < 8; i++) { window.push(entry(i, now)); now += 500; }
  assert.equal(window.items.length, 3);
  assert.equal(window.bytes, ts.length * 3);
  now += 4000;
  assert.equal(window.status().segments, 0);
  assert.equal(window.bytes, 0);
  assert.throws(() => window.playlist(), error => error.status === 503);
});

test('completed segments precede playlists; idempotency, sequence gaps and offline detection are explicit', () => {
  let now = Date.now();
  const window = new StreamWindow({ clock: () => now });
  assert.throws(() => window.playlist(), /desconectada/);
  for (let i = 0; i < 3; i++) window.push(entry(i, now));
  const last = window.lastReceivedAt;
  const playlist = window.playlist();
  assert.match(playlist, /#EXT-X-TARGETDURATION:2/);
  assert.match(playlist, /#EXT-X-MEDIA-SEQUENCE:0/);
  for (const line of playlist.split('\n').filter(value => value.endsWith('.ts')))
    assert.deepEqual(window.segment(line), ts);
  now += 1000;
  window.push(entry(2, last));
  assert.equal(window.lastReceivedAt, last, 'retries do not refresh camera readiness');
  assert.throws(() => window.push(entry(5, now)), error => error.status === 409);
  now += 8000;
  assert.equal(window.status().ready, false);
});

test('restarts retain monotonic HLS sequence and discontinuity markers; stale epochs cannot replace live', () => {
  let now = Date.now();
  const window = new StreamWindow({ windowMs: 1500, clock: () => now });
  for (let i = 0; i < 3; i++) window.push(entry(i, now));
  const next = '00000000-0000-4000-8000-000000000005';
  now += 1000;
  window.push(entry(0, now, { epoch: next }));
  assert.match(window.playlist(), /#EXT-X-DISCONTINUITY\n/);
  assert.throws(() => window.push(entry(3, now)), /antigua/);
  now += 1000;
  window.push(entry(1, now, { epoch: next }));
  window.push(entry(2, now, { epoch: next }));
  assert.match(window.playlist(), /#EXT-X-MEDIA-SEQUENCE:3/);
  now += 1000;
  window.push(entry(3, now, { epoch: next }));
  window.prune();
  assert.match(window.playlist(), /#EXT-X-DISCONTINUITY-SEQUENCE:1/);
});

test('malformed, old, oversized-duration and incomplete transport stream segments are rejected', () => {
  const now = Date.now(), window = new StreamWindow({ clock: () => now });
  for (const extra of [
    { epoch: '../../etc' }, { sequence: -1 }, { duration: 3 }, { duration: NaN },
    { capturedAt: new Date(now - 20_000).toISOString() }, { data: Buffer.from('not-ts') },
  ]) assert.throws(() => window.push(entry(0, now, extra)), error => error.status === 422);
});

test('server-owned grants ignore user metadata, demo role claims and anonymous requests', async () => {
  let now = Date.now();
  const auth = createAuth(config, {
    clock: () => now,
    fetcher: async () => new Response(JSON.stringify({ id: other, user_metadata: { role: 'admin' } })),
  });
  const uid = await auth.user({ headers: { authorization: 'Bearer synthetically-valid-token-for-test' } });
  assert.equal(uid, other);
  assert.throws(() => auth.grant(uid, 'box-one'), error => error.status === 403);
  assert.doesNotThrow(() => auth.grant(admin, 'box-one'));
  assert.doesNotThrow(() => auth.grant(admin, 'box-two'));
  await assert.rejects(auth.user({ headers: {} }), error => error.status === 401);
  assert.throws(() => validateConfig({ ...config, adminUserIds: ['3'] }), /UUID/);
  assert.throws(() => validateConfig({
    ...config, cameras: config.cameras.map(camera => ({ ...camera, publisherKeySha256: keyHash })),
  }), /distinta/);
  const unavailable = createAuth(config, { fetcher: async () => { throw new Error('network'); } });
  await assert.rejects(unavailable.user({ headers: { authorization: 'Bearer synthetically-valid-token-for-test' } }),
    error => error.status === 503);
});

test('playback cookies are signed, camera-scoped, expiring and distinct from publisher keys', () => {
  let now = Date.now();
  const auth = createAuth(config, { clock: () => now });
  const ticket = auth.issue(owner, 'box-one');
  const cookie = ticket.cookie.split(';')[0];
  assert.match(ticket.cookie, /HttpOnly; Secure; SameSite=Strict/);
  assert.equal(auth.viewer({ headers: { cookie } }, 'box-one'), owner);
  assert.throws(() => auth.viewer({ headers: { cookie } }, 'box-two'), error => error.status === 401);
  assert.throws(() => auth.viewer({ headers: { authorization: `Bearer ${key}` } }, 'box-one'), /requerido/);
  const tampered = cookie.slice(0, -1) + (cookie.endsWith('a') ? 'b' : 'a');
  assert.throws(() => auth.viewer({ headers: { cookie: tampered } }, 'box-one'), /inválido/);
  now += 90_001;
  assert.throws(() => auth.viewer({ headers: { cookie } }, 'box-one'), /vencido/);
});

test('HTTP receiver enforces device, camera, session and segment access; includes restart/offline behavior', async () => {
  let now = Date.now();
  const receiver = createReceiver(config, {
    clock: () => now,
    authenticate: async request => {
      if (request.headers.authorization === 'Bearer owner-session') return owner;
      throw new PilotError(401, 'Sesión no válida.');
    },
  });
  const { server, url } = await listen(receiver.handler);
  try {
    assert.equal((await fetch(url + '/health')).status, 200);
    assert.equal((await fetch(url + '/api/hls-pilot/cameras')).status, 401);
    const list = await fetch(url + '/api/hls-pilot/cameras', { headers: { Authorization: 'Bearer owner-session' } });
    assert.deepEqual((await list.json()).cameras.map(camera => camera.id), ['box-one']);
    const session = cameraId => fetch(`${url}/api/hls-pilot/session/${cameraId}`, {
      method: 'POST', headers: { Authorization: 'Bearer owner-session', 'Content-Type': 'application/json' },
    });
    assert.equal((await session('box-two')).status, 403);
    let ticket = await session('box-one');
    assert.equal((await ticket.json()).ready, false);
    const cookie = ticket.headers.get('set-cookie').split(';')[0];
    const upload = (i, headers = {}) => fetch(`${url}/ingest/box-one/${epoch}/${i}`, {
      method: 'PUT', headers: {
        Authorization: `Bearer ${key}`, 'Content-Type': 'video/mp2t',
        'X-Segment-Duration': '1', 'X-Segment-Start': new Date(now).toISOString(), ...headers,
      }, body: ts,
    });
    assert.equal((await upload(0, { Authorization: 'Bearer invalid' })).status, 401);
    assert.equal((await upload(0, { 'Content-Type': 'text/plain' })).status, 415);
    for (let i = 0; i < 3; i++) assert.equal((await upload(i)).status, 204);
    const path = '/api/hls-pilot/media/box-one/';
    assert.equal((await fetch(url + path + 'index.m3u8')).status, 401);
    const playlist = await fetch(url + path + 'index.m3u8', { headers: { Cookie: cookie } });
    assert.equal(playlist.status, 200);
    assert.equal(playlist.headers.get('cache-control'), 'private, no-store');
    const filename = (await playlist.text()).split('\n').find(line => line.endsWith('.ts'));
    assert.equal((await fetch(url + path + filename)).status, 401);
    assert.equal((await fetch(url + path + filename, { headers: { Cookie: cookie } })).status, 200);
    assert.equal((await fetch(url + path + filename, { headers: { Cookie: cookie, Origin: 'https://attacker.test' } })).status, 403);
    assert.equal((await fetch(url + '/api/hls-pilot/media/box-two/index.m3u8', { headers: { Cookie: cookie } })).status, 401);
    assert.equal((await fetch(url + path + 'index.m3u8', { headers: { Cookie: cookie }, method: 'HEAD' })).status, 200);
    const directory = await mkdtemp(join(tmpdir(), 'pilot-actual-proxy-'));
    let app;
    try {
      const file = join(directory, 'app.json');
      await writeFile(file, JSON.stringify({ receiverOrigin: url }));
      const proxy = await loadPilotProxy(['--hls-pilot-config', file]);
      app = await listen(proxy);
      const viaProxy = await fetch(app.url + '/api/hls-pilot/session/box-one', {
        method: 'POST', headers: {
          Authorization: 'Bearer owner-session', 'Content-Type': 'application/json', Origin: app.url,
        },
      });
      assert.equal(viaProxy.status, 200);
      const proxyCookie = viaProxy.headers.get('set-cookie').split(';')[0];
      assert.match(viaProxy.headers.get('set-cookie'), /HttpOnly; Secure/);
      const proxied = await fetch(app.url + path + 'index.m3u8', { headers: { Cookie: proxyCookie } });
      assert.equal(proxied.status, 200);
      assert.match(await proxied.text(), /#EXTM3U/);
      const bytes = await fetch(app.url + path + filename, { headers: { Cookie: proxyCookie } });
      assert.deepEqual(Buffer.from(await bytes.arrayBuffer()), ts);
    } finally {
      if (app) await close(app.server);
      await rm(directory, { recursive: true });
    }
    assert.equal((await upload(4)).status, 409);
    now += 9000;
    assert.equal((await fetch(url + path + 'index.m3u8', { headers: { Cookie: cookie } })).status, 503);
    now += 82_000;
    assert.equal((await fetch(url + path + filename, { headers: { Cookie: cookie } })).status, 401);
    assert.equal(receiver.windows.get('box-one').status().bufferedBytes, 0);
  } finally { receiver.close(); await close(server); }
});

test('app proxy is disabled by default, opt-in only, validates origin and never exposes ingest', async () => {
  const disabled = await loadPilotProxy([]);
  const app = await listen(async (request, response) => {
    if (!await disabled(request, response)) { response.writeHead(404); response.end(); }
  });
  const directory = await mkdtemp(join(tmpdir(), 'pilot-proxy-'));
  try {
    assert.deepEqual(await (await fetch(app.url + '/api/hls-pilot/config')).json(), { enabled: false });
    assert.equal((await fetch(app.url + '/api/hls-pilot/cameras')).status, 404);
    const file = join(directory, 'app.json');
    await writeFile(file, JSON.stringify({ receiverOrigin: 'http://camera.example.test' }));
    await assert.rejects(loadPilotProxy(['--hls-pilot-config', file]), /HTTPS/);
    await writeFile(file, JSON.stringify({ receiverOrigin: 'http://127.0.0.1:1' }));
    const proxy = await loadPilotProxy(['--hls-pilot-config', file]);
    const active = await listen(async (request, response) => {
      if (!await proxy(request, response)) { response.writeHead(404); response.end(); }
    });
    try {
      assert.equal((await fetch(active.url + '/api/hls-pilot/ingest')).status, 404);
      assert.equal((await fetch(active.url + '/api/hls-pilot/cameras', { headers: { Origin: 'null' } })).status, 403);
      assert.equal((await fetch(active.url + '/api/hls-pilot/cameras')).status, 503);
    } finally { await close(active.server); }
  } finally { await close(app.server); await rm(directory, { recursive: true }); }
  const html = "<meta content=\"base-uri 'self';\">";
  assert.equal(pilotHtml(html, '/horse-timeline'), html);
  assert.match(pilotHtml(html, '/hls-pilot'), /media-src 'self' blob:/);
});
