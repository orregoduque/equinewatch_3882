import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
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
    const photos = selected.map(row => ({
      ...row,
      ...(params.has('ids') ? {
        imageUrl: `https://s3.us-east-1.wasabisys.com/equinewatch-photos/${row.storage_path_enhanced}?signature=fixture-${++version}`,
        expiresAt: new Date(time + 600000).toISOString(),
      } : {}),
    }));
    return { ok: status === 200, status, async json() { return status === 200 ? { photos, nextCursor: 'fixture-next' } : { error: 'No access' }; } };
  }
  vm.runInNewContext(compiled, { exports: api, URL, URLSearchParams, AbortController, DOMException, Date });
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
  assert.equal(f.signingReads().length, 1);
  const again = await f.read();
  assert.equal(again.images[0].imageUrl, originalUrl);
  assert.equal(f.signingReads().length, 1);
  f.rows([f.photo(2), f.photo(1)]);
  const next = await f.read({ since: first.images[0].captured_at });
  assert.equal(f.signingReads().length, 2);
  assert.equal(f.signingReads()[1].params.get('ids'), '2');
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
  assert.equal(f.signingReads().length, 3);
});

test('account changes clear cached signatures; demo/local identities without a real session are rejected', async () => {
  const f = fixture(), first = await f.read();
  f.account('other');
  const next = await f.read();
  assert.notEqual(next.images[0].imageUrl, first.images[0].imageUrl);
  assert.equal(f.signingReads().length, 2);
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
  assert.equal(f.requests[0].params.get('metadata'), '1');
  const imageUrl = new URL(result.images[0].imageUrl);
  assert.deepEqual([...imageUrl.searchParams.keys()], ['signature']);
});
