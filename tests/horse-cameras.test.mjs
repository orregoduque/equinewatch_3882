import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadPilotProxy } from '../services/hls-pilot/app-proxy.mjs';
import { EXPECTED_CAMERAS, resolveHorseCamera } from '../services/hls-pilot/horse-cameras.mjs';
import { validateConfig } from '../services/hls-pilot/auth.mjs';
import { createReceiver } from '../services/hls-pilot/receiver.mjs';
import { PilotError } from '../services/hls-pilot/stream-window.mjs';
import { createHash, randomUUID } from 'node:crypto';

const [lucero, thunder] = Object.keys(EXPECTED_CAMERAS);
const cameras = Object.entries(EXPECTED_CAMERAS).map(([horseId, id]) => ({ horseId, id, ready: true }));
const token = 'Bearer synthetic-real-session-shaped-token';

test('trusted horse mapping refuses duplicates, wrong physical camera assignment and another horse', () => {
  assert.equal(resolveHorseCamera(cameras, lucero).id, 'bacata-mock');
  assert.equal(resolveHorseCamera(cameras, thunder).id, 'bacata-thunder');
  assert.equal(resolveHorseCamera([cameras[1]], lucero), null);
  assert.equal(resolveHorseCamera([...cameras, cameras[0]], lucero), null);
  assert.equal(resolveHorseCamera([{ ...cameras[0], id: 'bacata-thunder' }], lucero), null);
  assert.equal(resolveHorseCamera(cameras, 'unassigned'), null);
});

test('proxy resolves by verified horse; concurrent sessions, denial, legacy compatibility and mismatch fail closed', async t => {
  const dir = await mkdtemp(join(tmpdir(), 'horse-proxy-'));
  let discovered = cameras, discoveryStatus = 200, wrongPlayback = false;
  const sessions = [];
  const receiver = createServer((req, res) => {
    const json = (status, body, headers = {}) => {
      res.writeHead(status, { 'Content-Type': 'application/json', ...headers }); res.end(JSON.stringify(body));
    };
    if (req.headers.authorization !== token) return json(401, {});
    if (req.url === '/api/hls-pilot/cameras') return json(discoveryStatus, { cameras: discovered });
    const id = req.url.split('/').at(-1);
    sessions.push(id);
    json(200, { ready: true, expiresAt: Date.now() + 90000,
      playbackUrl: `/api/hls-pilot/media/${wrongPlayback ? 'wrong-camera' : id}/index.m3u8` },
    { 'Set-Cookie': `hls_${id}=synthetic; Path=/api/hls-pilot/media/${id}/; HttpOnly; Secure` });
  });
  await new Promise(resolve => receiver.listen(0, '127.0.0.1', resolve));
  const file = join(dir, 'proxy.json');
  await writeFile(file, JSON.stringify({ receiverOrigin: `http://127.0.0.1:${receiver.address().port}` }));
  const handle = await loadPilotProxy(['--hls-pilot-config', file], {});
  const app = createServer((req, res) => { void handle(req, res); });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    app.closeAllConnections(); receiver.closeAllConnections();
    await Promise.all([new Promise(resolve => app.close(resolve)), new Promise(resolve => receiver.close(resolve))]);
    await rm(dir, { recursive: true, force: true });
  });
  const base = `http://127.0.0.1:${app.address().port}`;
  const session = (horse, auth = token, extra = '') => fetch(`${base}/api/hls-pilot/horses/${horse}/session${extra}`, {
    method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' },
  });
  const [a, b] = await Promise.all([session(lucero), session(thunder)]);
  assert.equal(a.status, 200); assert.equal(b.status, 200);
  assert.equal((await a.json()).cameraId, 'bacata-mock');
  assert.equal((await b.json()).cameraId, 'bacata-thunder');
  assert(a.headers.get('set-cookie').includes('hls_bacata-mock='));
  assert(b.headers.get('set-cookie').includes('hls_bacata-thunder='));
  const malicious = await session(lucero, token, '?cameraId=bacata-thunder');
  assert.equal((await malicious.json()).cameraId, 'bacata-mock');
  assert.equal((await session(lucero, '')).status, 401);
  discoveryStatus = 403;
  const denied = await session(thunder);
  assert.equal(denied.status, 403); assert.equal((await denied.json()).playbackUrl, undefined);
  discoveryStatus = 200; discovered = [cameras[0]];
  assert.equal((await session(thunder)).status, 409);
  discovered = [{ ...cameras[0], id: 'bacata-thunder' }];
  assert.equal((await session(lucero)).status, 409);
  discovered = cameras; wrongPlayback = true;
  const mismatch = await session(lucero);
  assert.equal(mismatch.status, 503);
  assert.equal(mismatch.headers.get('set-cookie'), null);
  wrongPlayback = false;
  const legacy = await fetch(base + '/api/hls-pilot/session/bacata-mock', {
    method: 'POST', headers: { Authorization: token, 'Content-Type': 'application/json' },
  });
  assert.equal(legacy.status, 200);
  assert(sessions.includes('bacata-mock') && sessions.includes('bacata-thunder'));
});

test('receiver cannot configure two competing cameras for the same horse', () => {
  const config = {
    supabaseUrl: 'https://auth.example.test', supabaseAnonKey: 'public-fixture',
    cameras: cameras.map((c, index) => ({
      ...c, horseId: lucero, name: c.id, publisherKeySha256: String(index + 1).repeat(64),
      ownerUserIds: [], stableOwnerUserIds: [],
    })),
  };
  assert.throws(() => validateConfig(config), /asignación.*única/);
});

test('two publishers and two permitted viewers keep bytes, sequences, grants and cookies independent', async t => {
  const users = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'];
  const keys = ['synthetic-lucero-publisher-0000000000', 'synthetic-thunder-publisher-000000000'];
  const epochs = [randomUUID(), randomUUID()];
  const streams = cameras.map((camera, i) => ({
    ...camera, name: camera.id, ownerUserIds: [users[i]], stableOwnerUserIds: [],
    publisherKeySha256: createHash('sha256').update(keys[i]).digest('hex'),
  }));
  const receiver = createReceiver({
    supabaseUrl: 'https://auth.example.test', supabaseAnonKey: 'public-fixture',
    adminUserIds: [], cameras: streams,
  }, { authenticate: async request => {
    const index = users.findIndex(id => request.headers.authorization === `Bearer ${id}`);
    if (index < 0) throw new PilotError(401, 'Synthetic session denied');
    return users[index];
  } });
  const server = createServer(receiver.handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(async () => { receiver.close(); server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const bytes = i => {
    const result = Buffer.alloc(188 * 3, i + 1);
    for (let offset = 0; offset < result.length; offset += 188) result[offset] = 0x47;
    return result;
  };
  const upload = (i, seq, key = keys[i]) => fetch(`${base}/ingest/${streams[i].id}/${epochs[i]}/${seq}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'video/mp2t',
      'X-Segment-Duration': '1', 'X-Segment-Start': new Date().toISOString() }, body: bytes(i),
  });
  for (let seq = 0; seq < 3; seq++) {
    const results = await Promise.all([upload(0, seq), upload(1, seq)]);
    assert(results.every(response => response.status === 204));
  }
  assert.equal((await upload(1, 3, keys[0])).status, 401);
  const issue = (i, uid = users[i]) => fetch(`${base}/api/hls-pilot/session/${streams[i].id}`, {
    method: 'POST', headers: { Authorization: `Bearer ${uid}`, 'Content-Type': 'application/json' },
  });
  assert.equal((await issue(1, users[0])).status, 403);
  const tickets = await Promise.all([issue(0), issue(1)]);
  const cookies = tickets.map(response => response.headers.get('set-cookie').split(';')[0]);
  for (let i = 0; i < 2; i++) {
    const path = `${base}/api/hls-pilot/media/${streams[i].id}/`;
    const playlist = await fetch(path + 'index.m3u8', { headers: { Cookie: cookies[i] } });
    assert.equal(playlist.status, 200);
    const text = await playlist.text();
    assert(text.includes(epochs[i])); assert(!text.includes(epochs[1 - i]));
    const segment = await fetch(path + `${epochs[i]}-0.ts`, { headers: { Cookie: cookies[i] } });
    assert.deepEqual(Buffer.from(await segment.arrayBuffer()), bytes(i));
    assert.equal((await fetch(path + 'index.m3u8', { headers: { Cookie: cookies[1 - i] } })).status, 401);
    assert.equal((await fetch(path + `${epochs[i]}-0.ts`)).status, 401);
  }
});
