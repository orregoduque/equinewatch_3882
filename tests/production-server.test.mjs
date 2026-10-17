import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import test from 'node:test';

async function startProduction(overrides = {}) {
  const child = spawn(process.execPath, ['server.mjs'], {
    env: { ...process.env, NODE_ENV: 'production', PORT: '0',
      HLS_RECEIVER_ORIGIN: '', HLS_PROXY_KEY: '', ...overrides },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { child.kill(); reject(new Error('Production startup timed out')); }, 15_000);
    child.stderr.on('data', data => { logs += data; });
    child.stdout.on('data', data => {
      logs += data;
      const match = logs.match(/listening on port (\d+) \(production\)/);
      if (match) { clearTimeout(timeout); resolve(Number(match[1])); }
    });
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}: ${logs}`)); });
  });
  const base = `http://127.0.0.1:${port}`;
  return { child, base };
}

test('the production server preserves SPA routes, API health and correct versioned asset responses', async () => {
  const { child, base } = await startProduction();
  try {
    for (const path of ['/', '/login', '/horse-list', '/horse-timeline?horseId=test', '/daily-summary',
      '/profile', '/devices', '/bills', '/admin', '/admin/stables', '/hls-pilot']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.equal(response.headers.get('cache-control'), 'no-cache');
    }
    const health = await fetch(base + '/api/health');
    assert.deepEqual(await health.json(), { ok: true, emailProvider: 'resend' });
    assert.deepEqual(await (await fetch(base + '/api/hls-pilot/config')).json(), { enabled: false });
    assert.equal((await fetch(base + '/api/hls-pilot/cameras')).status, 404);
    assert.match(await (await fetch(base + '/hls-pilot')).text(), /media-src 'self' blob:/);
    assert.match(await (await fetch(base + '/horse-timeline')).text(), /media-src 'self' blob:/);
    assert.match(await (await fetch(base + '/login')).text(), /media-src 'self' blob:/,
      'HLS must work after SPA navigation from login without a document reload');
    const demoPath = '/media/hls-demo-5s.mp4';
    const video = await readFile('public' + demoPath);
    const full = await fetch(base + demoPath);
    assert.equal(full.status, 200);
    assert.equal(full.headers.get('content-type'), 'video/mp4');
    assert.equal(full.headers.get('accept-ranges'), 'bytes');
    assert.deepEqual(Buffer.from(await full.arrayBuffer()), video);
    const range = await fetch(base + demoPath, { headers: { Range: 'bytes=0-31' } });
    assert.equal(range.status, 206);
    assert.equal(range.headers.get('content-range'), `bytes 0-31/${video.length}`);
    assert.deepEqual(Buffer.from(await range.arrayBuffer()), video.subarray(0, 32));
    const suffix = await fetch(base + demoPath, { headers: { Range: 'bytes=-16' } });
    assert.equal(suffix.status, 206);
    assert.deepEqual(Buffer.from(await suffix.arrayBuffer()), video.subarray(-16));
    for (const value of ['bytes=999999999-1000000000', 'bytes=-0', 'bytes=2-1', 'bytes=0-1,3-4', 'bytes=']) {
      const invalid = await fetch(base + demoPath, { headers: { Range: value } });
      assert.equal(invalid.status, 416, value);
      assert.equal(invalid.headers.get('content-range'), `bytes */${video.length}`);
    }
    const videoHead = await fetch(base + demoPath, { method: 'HEAD' });
    assert.equal(videoHead.headers.get('content-length'), String(video.length));
    assert.equal((await videoHead.arrayBuffer()).byteLength, 0);
    for (const path of ['/assets/missing-aaaaaaaa.js', '/missing.css', '/api/missing']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 404, path);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.doesNotMatch(response.headers.get('content-type'), /text\/html/);
    }
    assert.equal((await fetch(base + '/%E0%A4%A')).status, 400);
    assert.equal((await fetch(base + '/..%2Fpackage.json')).status, 404);
    assert.equal((await fetch(base + '/api/health')).status, 200, 'invalid paths must not crash the server');
    const html = await readFile('build/index.html', 'utf8');
    const entry = html.match(/<script\b[^>]*src="([^"]+\.js)"/)[1];
    const asset = await fetch(base + entry);
    assert.equal(asset.status, 200);
    assert.match(asset.headers.get('content-type'), /javascript/);
    assert.match(asset.headers.get('cache-control'), /immutable/);
    assert.doesNotMatch((await asset.text()).slice(0, 100), /<!doctype html>/i);
    const head = await fetch(base + entry, { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal((await head.text()).length, 0);
    const oldFiles = await readFile('build/deployment-assets.json', 'utf8')
      .then(JSON.parse).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (oldFiles) {
      for (const path of new Set(oldFiles.builds.slice(1).flatMap(build => build.assets))) {
        const previous = await fetch(base + path, { method: 'HEAD' });
        assert.equal(previous.status, 200, `an already-open tab can still fetch ${path}`);
        assert.doesNotMatch(previous.headers.get('content-type'), /text\/html/);
      }
    }
  } finally {
    child.kill('SIGTERM');
    await once(child, 'exit');
  }
});

for (const [name, settings] of [
  ['missing video credential', { HLS_RECEIVER_ORIGIN: 'https://receiver.example.test' }],
  ['missing receiver URL', { HLS_PROXY_KEY: 'synthetic-test-key-only-'.repeat(2) }],
  ['invalid video credential', { HLS_RECEIVER_ORIGIN: 'https://receiver.example.test', HLS_PROXY_KEY: 'invalid' }],
]) {
  test(`${name} disables video without preventing existing customer routes from starting`, async () => {
    const { child, base } = await startProduction(settings);
    try {
      for (const path of ['/', '/login', '/horse-list', '/horse-timeline', '/daily-summary', '/api/health']) {
        assert.equal((await fetch(base + path)).status, 200, path);
      }
      for (const path of ['/api/hls-pilot/config', '/api/hls-pilot/cameras',
        '/api/hls-pilot/media/synthetic/index.m3u8']) {
        const result = await fetch(base + path);
        assert.equal(result.status, 503, path);
        assert.match((await result.json()).error, /problema de configuración/);
      }
    } finally {
      child.kill();
      await once(child, 'exit');
    }
  });
}

test('an unavailable receiver cannot prevent login, Timeline or health from responding', async () => {
  const { child, base } = await startProduction({
    HLS_RECEIVER_ORIGIN: 'https://receiver.invalid',
    HLS_PROXY_KEY: 'synthetic-test-key-only-'.repeat(2),
  });
  try {
    const video = fetch(base + '/api/hls-pilot/cameras');
    for (const path of ['/login', '/horse-timeline', '/daily-summary', '/api/health']) {
      assert.equal((await fetch(base + path)).status, 200, path);
    }
    assert.equal((await video).status, 503);
  } finally {
    child.kill();
    await once(child, 'exit');
  }
});
