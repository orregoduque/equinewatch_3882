import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import test from 'node:test';

const variants = [
  ['missing', {}],
  ['invalid', {
    WASABI_ACCESS_KEY_ID: 'synthetic-test-only',
    WASABI_SECRET_ACCESS_KEY: 'synthetic-test-only',
    WASABI_ENDPOINT: 'https://invalid.example.test',
    WASABI_BUCKET: 'wrong-bucket',
    WASABI_REGION: 'wrong-region',
  }],
];

for (const [name, config] of variants) {
  test(`${name} Wasabi settings cannot prevent existing app routes or HLS config from starting`, {
    timeout: 30000,
    skip: !existsSync('build/index.html') && 'Prepare npm run build:publish to exercise production startup',
  }, async t => {
    // Deliberately do not inherit credentials, sessions or customer configuration.
    const child = spawn(process.execPath, ['server.mjs'], {
      env: { PATH: process.env.PATH, NODE_ENV: 'production', PORT: '0', ...config },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    t.after(async () => {
      if (child.exitCode !== null || child.signalCode !== null) return;
      const stopped = once(child, 'exit');
      child.kill('SIGTERM');
      await stopped;
    });
    const origin = await new Promise((resolve, reject) => {
      let output = '';
      const timeout = setTimeout(() => reject(Error('Production startup timeout')), 15000);
      child.stdout.on('data', chunk => {
        output += chunk;
        const match = output.match(/listening on port (\d+) \(production\)/);
        if (match) { clearTimeout(timeout); resolve(`http://127.0.0.1:${match[1]}`); }
      });
      child.once('error', error => { clearTimeout(timeout); reject(error); });
      child.once('exit', () => { clearTimeout(timeout); reject(Error('Production server stopped')); });
    });
    for (const path of ['/', '/horse-list', '/horse-timeline', '/daily-summary', '/registro',
      '/horses/00000000-0000-4000-8000-000000000001', '/api/health']) {
      const response = await fetch(origin + path);
      assert.equal(response.status, 200, path);
    }
    const hls = await fetch(origin + '/api/hls-pilot/config');
    assert.equal(hls.status, 200);
    assert.equal((await hls.json()).enabled, false);
    const photos = await fetch(origin + '/api/horses/a95f853c-e90b-4b6d-a4ea-f25cfa317119/photos');
    assert.equal(photos.status, 401);
    assert.equal(photos.headers.get('cache-control'), 'private, no-store');
    assert.equal((await photos.json()).photos, undefined);
  });
}
