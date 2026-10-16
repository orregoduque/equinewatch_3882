import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { once } from 'node:events';
import test from 'node:test';

test('the production server preserves SPA routes, API health and correct versioned asset responses', async () => {
  const child = spawn(process.execPath, ['server.mjs'], {
    env: { ...process.env, NODE_ENV: 'production', PORT: '0' },
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
  try {
    for (const path of ['/', '/login', '/horse-list', '/horse-timeline?horseId=test', '/daily-summary',
      '/profile', '/devices', '/bills', '/admin', '/admin/stables']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 200, path);
      assert.match(response.headers.get('content-type'), /text\/html/);
      assert.equal(response.headers.get('cache-control'), 'no-cache');
    }
    const health = await fetch(base + '/api/health');
    assert.deepEqual(await health.json(), { ok: true, emailProvider: 'resend' });
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
