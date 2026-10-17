import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { createReceiver } from '../services/hls-pilot/receiver.mjs';
import { validateConfig } from '../services/hls-pilot/auth.mjs';
import { loadPilotProxy } from '../services/hls-pilot/app-proxy.mjs';
import { proxyReceiverConfig, startProxyReceiver } from '../services/hls-pilot/proxy-receiver.mjs';

const publisher = 'synthetic-device-key-for-publishing-test';
const proxyKey = 'synthetic-app-key-for-publishing-test';
const hash = value => createHash('sha256').update(value).digest('hex');
const config = {
  supabaseUrl: 'https://auth.example.test', supabaseAnonKey: 'synthetic-public-anon-key',
  appProxyKeySha256: hash(proxyKey), adminUserIds: [],
  cameras: [{
    id: 'box-one', name: 'Pilot', horseId: 'synthetic-horse',
    ownerUserIds: [], stableOwnerUserIds: [], publisherKeySha256: hash(publisher),
  }],
};
async function listen(handler) {
  const server = createServer(handler);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}` };
}
async function close(server) {
  server.closeAllConnections();
  await new Promise(resolve => server.close(resolve));
}

test('public receiver requires explicit HTTPS termination, complete private config and valid port', () => {
  const env = {
    HLS_TLS_TERMINATED_BY_PROXY: 'true', HLS_RECEIVER_CONFIG: JSON.stringify(config),
  };
  assert.equal(proxyReceiverConfig(env).port, 5000);
  assert.throws(() => proxyReceiverConfig({ ...env, HLS_TLS_TERMINATED_BY_PROXY: '' }), /HTTPS/);
  for (const value of ['', '{', 'null', '{}'])
    assert.throws(() => proxyReceiverConfig({ ...env, HLS_RECEIVER_CONFIG: value }));
  for (const port of ['0', '65536', 'NaN', '5000.5', '-1'])
    assert.throws(() => proxyReceiverConfig({ ...env, PORT: port }), /Puerto/);
  assert.throws(() => validateConfig({ ...config, appProxyKeySha256: 'not-a-hash' }), /proxy/);
  assert.throws(() => validateConfig({ ...config, appProxyKeySha256: hash(publisher) }), /distintas/);
});

test('no receiver remains disabled; environment connection requires HTTPS and a distinct server secret', async () => {
  const disabled = await loadPilotProxy([], {});
  const response = { writeHead(status) { this.status = status; }, end(body) { this.body = body; } };
  await disabled({ url: '/api/hls-pilot/config', method: 'GET' }, response);
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(response.body), { enabled: false });
  for (const env of [
    { HLS_RECEIVER_ORIGIN: 'https://receiver.example.test' },
    { HLS_PROXY_KEY: proxyKey },
    { HLS_RECEIVER_ORIGIN: 'http://127.0.0.1:8099', HLS_PROXY_KEY: proxyKey },
    { HLS_RECEIVER_ORIGIN: 'https://receiver.example.test/path', HLS_PROXY_KEY: proxyKey },
    { HLS_RECEIVER_ORIGIN: 'https://receiver.example.test', HLS_PROXY_KEY: 'short' },
  ]) await assert.rejects(loadPilotProxy([], env));
  assert.equal(typeof await loadPilotProxy([], {
    HLS_RECEIVER_ORIGIN: 'https://receiver.example.test', HLS_PROXY_KEY: proxyKey,
  }), 'function');
});

test('receiver gates playback APIs with proxy secret, but still enforces user and publisher authorization', async () => {
  const receiver = createReceiver(config);
  const { server, url } = await listen(receiver.handler);
  const epoch = '00000000-0000-4000-8000-000000000004';
  try {
    const health = await fetch(url + '/health');
    assert.deepEqual(await health.json(), { ok: true, mode: 'volatile-hls-pilot' });
    for (const route of ['/cameras', '/session/box-one', '/media/box-one/index.m3u8']) {
      const path = url + '/api/hls-pilot' + route;
      assert.equal((await fetch(path)).status, 403);
      assert.equal((await fetch(path, { headers: { 'x-hls-proxy-key': publisher } })).status, 403);
    }
    assert.equal((await fetch(url + '/api/hls-pilot/cameras', {
      headers: { 'x-hls-proxy-key': proxyKey },
    })).status, 401, 'proxy secret does not replace user identity');
    const ts = Buffer.alloc(188 * 3);
    for (let i = 0; i < ts.length; i += 188) ts[i] = 0x47;
    const upload = value => fetch(url + `/ingest/box-one/${epoch}/0`, {
      method: 'PUT', body: ts,
      headers: {
        Authorization: `Bearer ${value}`, 'Content-Type': 'video/mp2t',
        'X-Segment-Duration': '1', 'X-Segment-Start': new Date().toISOString(),
      },
    });
    assert.equal((await upload(proxyKey)).status, 401, 'app secret cannot publish');
    assert.equal((await upload(publisher)).status, 204, 'Pi uploads without app proxy key');
    assert.equal(receiver.windows.get('box-one').status().segments, 1);
  } finally { await close(server); receiver.close(); }
});

test('app sends its own proxy credential, never a supplied visitor header; forbidden routes stay blocked', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hls-proxy-publish-'));
  let seen;
  const upstream = await listen((request, response) => {
    seen = { proxy: request.headers['x-hls-proxy-key'], authorization: request.headers.authorization };
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ cameras: [] }));
  });
  let app;
  try {
    const path = join(directory, 'app.json');
    await writeFile(path, JSON.stringify({ receiverOrigin: upstream.url }));
    const proxy = await loadPilotProxy(['--hls-pilot-config', path], { HLS_PROXY_KEY: proxyKey });
    app = await listen((request, response) => void proxy(request, response));
    const response = await fetch(app.url + '/api/hls-pilot/cameras', { headers: {
      'x-hls-proxy-key': publisher, Authorization: 'Bearer synthetic-owner-session',
    } });
    assert.equal(response.status, 200);
    assert.deepEqual(seen, { proxy: proxyKey, authorization: 'Bearer synthetic-owner-session' });
    assert(!JSON.stringify([...response.headers]).includes(proxyKey));
    assert(!(await response.text()).includes(proxyKey));
    seen = undefined;
    assert.equal((await fetch(app.url + '/api/hls-pilot/ingest/box-one')).status, 404);
    assert.equal(seen, undefined, 'never proxies ingest');
    assert.equal((await fetch(app.url + '/api/hls-pilot/cameras', {
      headers: { Origin: 'https://foreign.example.test' },
    })).status, 403);
  } finally {
    if (app) await close(app.server);
    await close(upstream.server);
    await rm(directory, { recursive: true, force: true });
  }
});

test('dedicated entry point starts and serves only receiver routes', async () => {
  const reservation = await listen((_request, response) => response.end());
  const port = reservation.server.address().port;
  await close(reservation.server);
  const server = await startProxyReceiver({
    HLS_TLS_TERMINATED_BY_PROXY: 'true', HLS_RECEIVER_CONFIG: JSON.stringify(config),
    PORT: String(port),
  });
  try {
    const url = `http://127.0.0.1:${port}`;
    assert.equal((await fetch(url + '/')).status, 200, 'provider startup check accepts root route');
    assert.equal((await fetch(url + '/', { method: 'HEAD' })).status, 200);
    assert.equal((await fetch(url + '/health')).status, 200);
    assert.equal((await fetch(url + '/horse-timeline')).status, 404);
    assert.equal((await fetch(url + '/api/hls-pilot/cameras')).status, 403);
  } finally { await close(server); }
});
