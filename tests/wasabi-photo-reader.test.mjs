import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { previewVersion } from '../services/wasabi-photos/handler.mjs';
import ts from 'typescript';
const compiled = ts.transpileModule(readFileSync('src/utils/wasabiPhotos.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const horseId = 'a95f853c-e90b-4b6d-a4ea-f25cfa317119';
const prefix = 'stable-eye/97e3674b-31ab-5373-8a21-aa8187e6a17f/node_108/';
function fixture() {
  const api = {}, requests = [];
  let time = Date.parse('2026-10-26T10:00:00Z'), listener, version = 0;
  let session = { user: { id: 'owner' }, access_token: 'fixture-token-owner' };
  let rows = [photo(1)], status = 200;
  const auth = {
    onAuthStateChange(fn) { listener = fn; },
    async getSession() { return { data: { session }, error: null }; },
  };
  function photo(id) { return { id, horse_id: horseId, captured_at: new Date(time + id * 10000).toISOString(),
    storage_path_enhanced: prefix + id + '.jpg' }; }
  let hold;
  async function fetcher(path, options) {
    const url = new URL(path, 'https://fixture.test'), params = url.searchParams;
    requests.push({ params, options });
    if (hold) await hold;
    const selected = params.has('ids') ? rows.filter(row => params.get('ids').split(',').includes(String(row.id))) : rows;
    const preview = params.has('from') ? selected.at(-1) : selected[0];
    const photos = selected.map(row => ({
      ...row,
      ...(params.has('ids') || (params.get('preview') === '1'
        && row === preview && previewVersion(row) !== params.get('cached')) ? {
        imageUrl: `https://s3.us-east-1.wasabisys.com/equinewatch-photos/${row.storage_path_enhanced}?signature=fixture-${++version}`,
        expiresAt: new Date(time + 600000).toISOString(),
        version: previewVersion(row),
      } : {}),
    }));
    return { ok: status === 200, status, async json() { return status === 200 ? { photos, nextCursor: 'fixture-next' } : { error: 'No access' }; } };
  }
  vm.runInNewContext(compiled, { exports: api, URL, URLSearchParams, AbortController, DOMException, Date, setTimeout, clearTimeout });
  const reader = api.createWasabiPhotoReader(auth, fetcher, () => time);
  return {
    reader, requests, photo,
    read: (options = {}) => reader.read(horseId, { id: session?.user.id || 'owner' }, { limit: 240, ...options }),
    rows(next) { rows = next; },
    advance(ms) { time += ms; },
    account(id = 'other') {
      session = id ? { user: { id }, access_token: 'fixture-token-' + id } : null;
      listener('TOKEN_REFRESHED', session);
    },
    deny() { status = 403; },
    hold() { let release; hold = new Promise(resolve => { release = resolve; }); return () => { hold = null; release(); }; },
    signingReads() { return requests.filter(request => request.params.has('ids')); },
  };
}

test('polling only signs new rows; valid URLs remain byte-for-byte unchanged', async () => {
  const f = fixture();
  const first = await f.read();
  assert.equal(first.images[0].source, 'wasabi');
  assert.equal(first.images[0].created_at, first.images[0].captured_at);
  const originalUrl = first.images[0].imageUrl;
  assert.equal(f.requests.length, 1, 'initial list and latest signed URL use one request');
  assert.equal(f.signingReads().length, 0);
  const again = await f.read();
  assert.equal(again.images[0].imageUrl, originalUrl);
  assert.equal(f.signingReads().length, 0);
  assert.equal(f.requests.at(-1).params.get('cached'), previewVersion(f.photo(1)));
  f.rows([f.photo(2), f.photo(1)]);
  const next = await f.read({ since: first.images[0].captured_at });
  assert.equal(f.signingReads().length, 0, 'newest is signed inline, not in a second request');
  assert.equal(next.images[1].imageUrl, originalUrl);
  assert(f.requests.some(r => r.params.has('since')));
  assert(f.requests.every(r => r.options.cache === 'no-store'));
  assert(f.requests.every(r => r.options.headers.Authorization === 'Bearer fixture-token-owner'));
});

test('URLs are renewed before expiry and after a long suspended interval', async () => {
  const f = fixture(), first = await f.read();
  f.advance(550000);
  const renewed = await f.reader.renew(first.images, { id: 'owner' });
  assert.notEqual(renewed[0].imageUrl, first.images[0].imageUrl);
  assert.equal(renewed[0].id, first.images[0].id);
  f.advance(1200000);
  const resumed = await f.read();
  assert.notEqual(resumed.images[0].imageUrl, renewed[0].imageUrl);
  assert.equal(f.signingReads().length, 1, 'only explicit renewal uses an ID request');
});

test('account changes clear cached signatures; demo/local identities without a real session are rejected', async () => {
  const f = fixture(), first = await f.read();
  f.account('other');
  const next = await f.read();
  assert.notEqual(next.images[0].imageUrl, first.images[0].imageUrl);
  assert.equal(f.signingReads().length, 0);
  f.account(null);
  const before = f.requests.length;
  await assert.rejects(() => f.read(), error => error.status === 401);
  assert.equal(f.requests.length, before, 'no metadata/signing request is made from a demo identity');
});

test('logout or horse navigation cancels pending requests and discards stale signed responses', async () => {
  for (const kind of ['logout', 'abort']) {
    const f = fixture(), controller = new AbortController(), release = f.hold();
    const pending = f.read({ signal: controller.signal });
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.requests.length, 1);
    if (kind === 'logout') f.account(null); else controller.abort();
    assert(f.requests[0].options.signal.aborted);
    release();
    await assert.rejects(() => pending, { name: 'AbortError' });
  }
});

test('server denial clears access, with no image URLs returned', async () => {
  const f = fixture();
  await f.read();
  f.deny();
  await assert.rejects(() => f.read(), error => error.status === 403 && !error.message.includes('signature'));
});

test('reader forwards bounded pagination/hour options without modifying signed URLs', async () => {
  const f = fixture(), result = await f.read({
    limit: 400, from: '2026-10-26T10:00:00Z', to: '2026-10-26T11:00:00Z', cursor: 'fixture-cursor',
  });
  assert.equal(result.nextCursor, 'fixture-next');
  assert.equal(f.requests[0].params.get('limit'), '400');
  assert.equal(f.requests[0].params.get('cursor'), 'fixture-cursor');
  assert.equal(f.requests[0].params.get('preview'), '1');
  const imageUrl = new URL(result.images[0].imageUrl);
  assert.deepEqual([...imageUrl.searchParams.keys()], ['signature']);
});

test('240-photo list signs only newest; visible thumbnails batch IDs and reuse session cache', async () => {
  const f = fixture();
  f.rows(Array.from({ length: 240 }, (_, index) => f.photo(240 - index)));
  const { images } = await f.read();
  assert.equal(images.length, 240);
  assert.equal(images.filter(image => image.imageUrl).length, 1);
  assert(images[0].imageUrl);
  await new Promise(resolve => setTimeout(resolve, 30));
  assert.equal(f.requests.length, 1, 'offscreen photos never request signatures');
  const visible = await Promise.all(images.slice(0, 7).map(image => f.reader.load(image, { id: 'owner' })));
  assert(visible.every(image => image.imageUrl));
  assert.equal(f.signingReads().length, 1);
  assert.equal(f.signingReads()[0].params.get('ids'), '239,238,237,236,235,234');
  await Promise.all(visible.map(image => f.reader.load(image, { id: 'owner' })));
  assert.equal(f.signingReads().length, 1, 'visited URLs are not signed again');
});

test('400-photo hour signs latest only and renewal never signs unseen rows', async () => {
  const f = fixture();
  f.rows(Array.from({ length: 400 }, (_, index) => f.photo(index + 1)));
  const { images } = await f.read({ limit: 400, from: '2026-10-26T10:00:00Z', to: '2026-10-26T11:00:00Z' });
  assert.equal(images.filter(image => image.imageUrl).length, 1);
  assert(images.at(-1).imageUrl);
  f.advance(550000);
  const renewed = await f.reader.renew(images, { id: 'owner' }, undefined, true);
  assert.equal(renewed.filter(image => image.imageUrl).length, 1);
  assert.equal(f.signingReads()[0].params.get('ids'), '400');
  f.reader.clear(); // A refreshed real Auth session clears the URL cache.
  const refreshedSession = await f.reader.renew(renewed, { id: 'owner' }, undefined, true);
  assert.equal(refreshedSession.filter(image => image.imageUrl).length, 1);
  assert.equal(f.signingReads()[1].params.get('ids'), '400', 'restore displayed photo, never unseen hour photos');
});

test('changed metadata at the same latest ID invalidates the preview cache hint', async () => {
  const f = fixture();
  const first = await f.read();
  f.rows([{ ...f.photo(1), storage_path_enhanced: prefix + 'updated.jpg' }]);
  const changed = await f.read();
  assert(changed.images[0].imageUrl.includes('updated.jpg'));
  assert.notEqual(changed.images[0].imageUrl, first.images[0].imageUrl);
  assert.equal(f.requests.length, 2, 'changed metadata still needs no extra signing trip');
});

test('thumbnail queue is bounded to 100 and cancelled/logout work never returns a stale URL', async () => {
  const f = fixture();
  f.rows(Array.from({ length: 240 }, (_, index) => f.photo(240 - index)));
  const { images } = await f.read();
  await Promise.all(images.slice(0, 205).map(image => f.reader.load(image, { id: 'owner' })));
  assert.equal(f.signingReads().length, 3);
  assert(f.signingReads().every(request => request.params.get('ids').split(',').length <= 100));
  const controller = new AbortController();
  const pending = f.reader.load(images[220], { id: 'owner' }, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  const logout = f.reader.load(images[221], { id: 'owner' });
  f.account(null);
  await assert.rejects(logout, { name: 'AbortError' });
});
