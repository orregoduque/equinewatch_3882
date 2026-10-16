import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assetReferences, captureLiveAssets, restoreAssets } from '../scripts/build-for-publish.mjs';

const origin = 'https://app.example.test';
const entry = '/assets/entry-aaaaaaaa.js';
const route = '/assets/route-bbbbbbbb.js';
const css = '/assets/app-cccccccc.css';
const shared = '/assets/shared-dddddddd.js';
const font = '/assets/font-eeeeeeee.woff2';
const html = `<script type="module" src="${entry}"></script><link href="${css}" rel="stylesheet">`;
function fixture(overrides = {}) {
  const calls = [];
  const files = {
    '/': [html, 'text/html'],
    '/deployment-assets.json': [html, 'text/html'],
    [entry]: [`const deps=["assets/route-bbbbbbbb.js"];import "./shared-dddddddd.js"`, 'text/javascript'],
    [route]: [`import "./entry-aaaaaaaa.js";`, 'text/javascript'],
    [shared]: ['export const shared = 1;', 'text/javascript'],
    [css]: ['@font-face{src:url(/assets/font-eeeeeeee.woff2)}', 'text/css'],
    [font]: [new Uint8Array([1, 2, 3]), 'font/woff2'],
    ...overrides,
  };
  return {
    calls,
    async fetcher(url, options) {
      calls.push({ url, options });
      const file = files[new URL(url).pathname];
      if (!file) return new Response('Not found', { status: 404 });
      return new Response(file[0], {
        status: file[2] || 200, headers: { 'Content-Type': file[1] },
      });
    },
  };
}

test('publication retains the entire current lazy-module graph, CSS and fonts without writes to production', async () => {
  const f = fixture();
  const archive = await captureLiveAssets(origin, f.fetcher);
  assert.deepEqual([...archive.files.keys()].sort(), [entry, route, css, shared, font].sort());
  assert.equal(f.calls.filter(call => call.url.endsWith(entry)).length, 1);
  assert(f.calls.every(call => new URL(call.url).origin === origin &&
    !call.options.method && call.options.redirect === 'error'));
  assert.equal(archive.builds[0].entry, entry);
  assert(archive.builds[0].assets.includes(route));
});

test('asset discovery never follows arbitrary external URLs or non-fingerprinted API routes', () => {
  const refs = assetReferences(`
    import "./route-bbbbbbbb.js";
    const x="https://evil.example/assets/private-ffffffff.js";
    const y="/api/accounts"; const z="/logo.png";
  `, entry, origin);
  assert.deepEqual(refs, [route]);
});

test('a missing live file blocks publication rather than dropping compatibility silently', async () => {
  const f = fixture({ [route]: null });
  await assert.rejects(captureLiveAssets(origin, f.fetcher), /No se pudo conservar/);
});

test('HTML in place of an old JavaScript chunk blocks publication', async () => {
  const f = fixture({ [route]: ['<html>SPA fallback</html>', 'text/html'] });
  await assert.rejects(captureLiveAssets(origin, f.fetcher), /No se pudo conservar/);
});

test('a failed public health fetch prevents the build from proceeding', async () => {
  const f = fixture({ '/': ['Service unavailable', 'text/plain', 503] });
  await assert.rejects(captureLiveAssets(origin, f.fetcher), /No se publicará/);
});

test('the bounded history retains two prior generations and rejects mismatched or unsafe histories', async () => {
  const previous = '/assets/previous-ffffffff.js';
  const old = '/assets/older-gggggggg.js';
  const history = { format: 1, builds: [
    { entry, assets: [entry, route, css, shared, font] },
    { entry: previous, assets: [previous] },
    { entry: old, assets: [old] },
  ] };
  const f = fixture({
    '/deployment-assets.json': [JSON.stringify(history), 'application/json'],
    [previous]: ['old version', 'text/javascript'],
  });
  const archive = await captureLiveAssets(origin, f.fetcher);
  assert.equal(archive.builds.length, 2);
  assert(archive.files.has(previous));
  assert(!f.calls.some(call => call.url.endsWith(old)));
  for (const invalid of [
    { format: 1, builds: [{ entry: previous, assets: [previous] }] },
    { format: 1, builds: [{ entry, assets: [entry, 'https://evil.example/private.js'] }] },
  ]) {
    const bad = fixture({ '/deployment-assets.json': [JSON.stringify(invalid), 'application/json'] });
    await assert.rejects(captureLiveAssets(origin, bad.fetcher), /No se publicará/);
  }
});

test('restoring assets keeps old tabs functional without replacing the new HTML or bundles', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'publish-compat-'));
  try {
    const current = '/assets/current-hhhhhhhh.js';
    const currentHTML = `<script type="module" src="${current}"></script>`;
    await mkdir(directory + '/assets');
    await writeFile(directory + '/index.html', currentHTML);
    await writeFile(directory + current, 'new build');
    const f = fixture();
    const archive = await captureLiveAssets(origin, f.fetcher);
    await restoreAssets(archive, directory);
    assert.equal(await readFile(directory + entry, 'utf8'), archive.files.get(entry).toString());
    assert.equal(await readFile(directory + route, 'utf8'), archive.files.get(route).toString());
    assert.equal(await readFile(directory + current, 'utf8'), 'new build');
    assert.equal(await readFile(directory + '/index.html', 'utf8'), currentHTML);
    const manifest = JSON.parse(await readFile(directory + '/deployment-assets.json', 'utf8'));
    assert.deepEqual(manifest.builds[0], { entry: current, assets: [current] });
    assert.equal(manifest.builds[1].entry, entry);
    await assert.rejects(restoreAssets({
      files: new Map([[current, Buffer.from('different bytes')]]), builds: [],
    }, directory), /Colisión/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
