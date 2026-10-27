import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { createWasabiPhotosHandler, LUCERO_ID, THUNDER_ID, ENCANTADOR_ID, PHOTO_PREFIXES, WASABI_SCOPE, previewVersion } from '../services/wasabi-photos/handler.mjs';

const ownerId = '00000000-0000-4000-8000-000000000001';
const captured = '2026-10-26T10:00:00.000Z';
const row = { id: 17, horse_id: LUCERO_ID, captured_at: captured,
  storage_path_enhanced: WASABI_SCOPE.prefix + '2026/10/26/10-00-00.jpg' };
function fixture({
  userId = ownerId, validSession = true, horseOwner = ownerId, profile = null,
  rows = [row], horseVisible = true, horseBackend = 'wasabi', env = {}, realSigner = false,
} = {}) {
  const queries = [], signatures = [], validations = [];
  const clientFactory = (_url, _key, options) => {
    assert.equal(options.auth.persistSession, false);
    assert.equal(options.global.headers.Authorization, 'Bearer fixture-session');
    return {
      auth: { async getUser(token) {
        validations.push(token);
        return { data: { user: validSession ? { id: userId, user_metadata: { role: 'admin' } } : null },
          error: validSession ? null : { message: 'invalid' } };
      } },
      from(table) {
        const trace = { table, filters: [], orders: [] };
        queries.push(trace);
        const q = {
          select(columns) { trace.columns = columns; return q; },
          eq(k, v) { trace.filters.push(['eq', k, v]); return q; },
          not(...args) { trace.filters.push(['not', ...args]); return q; },
          gte(k, v) { trace.filters.push(['gte', k, v]); return q; },
          lt(k, v) { trace.filters.push(['lt', k, v]); return q; },
          in(k, v) { trace.filters.push(['in', k, v]); return q; },
          or(v) { trace.or = v; return q; },
          order(k, v) { trace.orders.push([k, v]); return q; },
          limit(n) { trace.limit = n; return q; },
          abortSignal(signal) { trace.signal = signal; return q; },
          async maybeSingle() {
            return { error: null, data: table === 'horses'
              ? horseVisible ? { id: trace.filters.find(f => f[1] === 'id')?.[2], owner_id: horseOwner, photo_backend: horseBackend } : null
              : profile };
          },
          then(resolve, reject) {
            const ids = trace.filters.find(f => f[0] === 'in')?.[2];
            return Promise.resolve({ error: null, data: rows.filter(r => !ids || ids.includes(String(r.id))).slice(0, trace.limit) }).then(resolve, reject);
          },
        };
        return q;
      },
    };
  };
  const handler = createWasabiPhotosHandler({
    env: { VITE_SUPABASE_ANON_KEY: 'fixture-public-key', ...env }, clientFactory,
    now: () => Date.parse(captured),
    ...(realSigner ? {} : { signerFactory: async () => async key => {
      signatures.push(key);
      return `${WASABI_SCOPE.endpoint}/${WASABI_SCOPE.bucket}/${key}?fixture-signature=temporary`;
    } }),
  });
  return {
    queries, signatures, validations,
    async request(query = '', authorization = 'Bearer fixture-session', horse = LUCERO_ID, method = 'GET') {
      const response = new EventEmitter();
      response.writeHead = (status, headers) => Object.assign(response, { status, headers });
      response.end = body => Object.assign(response, { body: JSON.parse(body), writableEnded: true });
      const handled = await handler({ method, url: `/api/horses/${horse}/photos${query}`, headers: { authorization } }, response);
      return { handled, status: response.status, body: response.body, headers: response.headers };
    },
  };
}

test('private photos require a verified Auth token even if metadata is publicly selectable', async () => {
  const f = fixture();
  const missing = await f.request('', '');
  assert.equal(missing.status, 401);
  assert.equal(missing.body.photos, undefined);
  assert.equal(f.signatures.length, 0);
  assert.equal(f.queries.length, 0);
  const invalid = fixture({ validSession: false });
  assert.equal((await invalid.request()).status, 401);
  assert.equal(invalid.signatures.length, 0);
  assert.equal(invalid.queries.length, 0);
});

test('owner gets signed GET URLs, scoped rows and private no-store responses', async () => {
  const f = fixture(), response = await f.request();
  assert.equal(response.status, 200);
  assert.equal(response.headers['Cache-Control'], 'private, no-store');
  assert.equal(response.headers.Vary, 'Authorization');
  assert.equal(response.body.photos[0].imageUrl.includes('fixture-signature='), true);
  assert.equal(response.body.photos[0].expiresAt, '2026-10-26T10:10:00.000Z');
  assert.deepEqual(f.validations, ['fixture-session']);
  const q = f.queries.find(q => q.table === 'images_wasabi');
  assert(q.filters.some(f => f[0] === 'eq' && f[1] === 'horse_id' && f[2] === LUCERO_ID));
  assert.deepEqual(q.orders, [['captured_at', { ascending: false }], ['id', { ascending: false }]]);
  assert.equal(q.limit, 240);
  assert(q.signal instanceof AbortSignal);
});

test('preview returns complete metadata with just newest signed, using one Auth/horse read', async () => {
  const rows = Array.from({ length: 240 }, (_, index) => ({
    ...row, id: 240 - index, captured_at: new Date(Date.parse(captured) - index * 10000).toISOString(),
  }));
  const f = fixture({ rows });
  const response = await f.request('?limit=240&preview=1');
  assert.equal(response.status, 200);
  assert.equal(response.body.photos.length, 240);
  assert.equal(response.body.photos.filter(photo => photo.imageUrl).length, 1);
  assert(response.body.photos[0].imageUrl);
  assert.equal(f.signatures.length, 1);
  assert.equal(f.validations.length, 1);
  assert.equal(f.queries.filter(query => query.table === 'horses').length, 1);
  const again = await f.request('?preview=1&cached=' + previewVersion(rows[0]));
  assert.equal(again.status, 200);
  assert.equal(again.body.photos.filter(photo => photo.imageUrl).length, 0);
  assert.equal(f.signatures.length, 1, 'cache hint only suppresses signing, never authorization');
  assert.equal(f.validations.length, 2);
});

test('hour preview signs last/newest row only; malformed preview combinations are rejected', async () => {
  const rows = Array.from({ length: 400 }, (_, index) => ({
    ...row, id: index + 1, captured_at: new Date(Date.parse(captured) + index * 1000).toISOString(),
  }));
  const f = fixture({ rows });
  const result = await f.request('?from=2026-10-26T10:00:00Z&to=2026-10-26T11:00:00Z&limit=400&preview=1');
  assert.equal(result.body.photos.length, 400);
  assert.equal(result.body.photos.filter(photo => photo.imageUrl).length, 1);
  assert(result.body.photos.at(-1).imageUrl);
  for (const query of ['?preview=2', '?preview=1&metadata=1', '?preview=1&ids=17', '?cached=17', '?preview=1&cached=../17'])
    assert.equal((await f.request(query)).status, 400);
});

test('nonowner cannot gain access using editable auth metadata; only trusted active staff pass', async () => {
  for (const profile of [null, { id: ownerId, role: 'admin', is_active: false },
    { id: 'other-user', role: 'admin', is_active: true },
    { id: ownerId, role: 'horse_owner', is_active: true }]) {
    const f = fixture({ horseOwner: 'another-owner', profile });
    assert.equal((await f.request()).status, 403);
    assert.equal(f.signatures.length, 0);
    assert(!f.queries.some(q => q.table === 'images_wasabi'));
  }
  for (const role of ['admin', 'caretaker']) {
    const f = fixture({ horseOwner: 'another-owner', profile: { id: ownerId, role, is_active: true } });
    assert.equal((await f.request()).status, 200);
  }
});

test('hidden or other horses never receive signed URLs', async () => {
  const hidden = fixture({ horseVisible: false });
  assert.equal((await hidden.request()).status, 403);
  const other = fixture();
  assert.equal((await other.request('', 'Bearer fixture-session', ownerId)).status, 403);
  assert.equal(hidden.signatures.length + other.signatures.length, 0);
});

test('three-horse reader policy keeps previous scopes and adds only Encantador GetObject', () => {
  const policy = JSON.parse(readFileSync('services/wasabi-photos/iam-replit-three-horses-readonly.json', 'utf8'));
  assert.equal(policy.Statement.length, 1);
  assert.equal(policy.Statement[0].Effect, 'Allow');
  assert.equal(policy.Statement[0].Action, 's3:GetObject');
  assert.deepEqual(policy.Statement[0].Resource, [LUCERO_ID, THUNDER_ID, ENCANTADOR_ID]
    .map(horse => `arn:aws:s3:::${WASABI_SCOPE.bucket}/${PHOTO_PREFIXES[horse]}*`));
});

test('Encantador is prepared but remains inaccessible through Wasabi until its backend is activated', async () => {
  const f = fixture({ horseBackend: 'supabase' });
  const response = await f.request('?limit=20&preview=1', 'Bearer fixture-session', ENCANTADOR_ID);
  assert.equal(response.status, 409);
  assert.equal(f.signatures.length, 0);
  assert(!f.queries.some(q => q.table === 'images_wasabi'));
});

test('Encantador permits the owner, active staff, and one JPEG shared by raw/enhanced', async () => {
  const key = PHOTO_PREFIXES[ENCANTADOR_ID] + '2026/10/27/capture.jpg';
  const rows = [{ ...row, horse_id: ENCANTADOR_ID, storage_path_raw: key, storage_path_enhanced: key }];
  for (const options of [
    {},
    { horseOwner: 'other', profile: { id: ownerId, role: 'admin', is_active: true } },
    { horseOwner: 'other', profile: { id: ownerId, role: 'caretaker', is_active: true } },
  ]) {
    const f = fixture({ rows, ...options });
    const response = await f.request('?limit=20&preview=1', 'Bearer fixture-session', ENCANTADOR_ID);
    assert.equal(response.status, 200);
    assert.equal(response.body.photos[0].horse_id, ENCANTADOR_ID);
    assert.deepEqual(f.signatures, [key]);
    const query = f.queries.find(q => q.table === 'images_wasabi');
    assert(query.filters.some(f => f[1] === 'horse_id' && f[2] === ENCANTADOR_ID));
    assert.equal(query.limit, 20);
    assert.deepEqual(query.orders[0], ['captured_at', { ascending: false }]);
  }
});

test('Encantador cannot be viewed using an ingestion identity, local role or inactive staff', async () => {
  for (const options of [
    { validSession: false },
    { horseOwner: 'other' },
    { horseOwner: 'other', profile: { id: ownerId, role: 'admin', is_active: false } },
    { horseOwner: 'other', profile: { id: ownerId, role: 'horse_owner', is_active: true } },
  ]) {
    const f = fixture(options);
    assert([401, 403].includes((await f.request('', 'Bearer fixture-session', ENCANTADOR_ID)).status));
    assert.equal(f.signatures.length, 0);
  }
});

test('all three horses reject cross-prefix and cross-horse metadata before any signature', async () => {
  for (const horse of [LUCERO_ID, THUNDER_ID, ENCANTADOR_ID]) {
    for (const other of [LUCERO_ID, THUNDER_ID, ENCANTADOR_ID].filter(id => id !== horse)) {
      for (const bad of [
        { ...row, horse_id: horse, storage_path_enhanced: PHOTO_PREFIXES[other] + 'capture.jpg' },
        { ...row, horse_id: other, storage_path_enhanced: PHOTO_PREFIXES[horse] + 'capture.jpg' },
      ]) {
        const f = fixture({ rows: [bad] });
        assert.equal((await f.request('', 'Bearer fixture-session', horse)).status, 503);
        assert.equal(f.signatures.length, 0);
      }
    }
  }
});

test('Thunder signs only its own prefix; neither horse can sign the other camera JPEG', async () => {
  const thunderRow = { ...row, horse_id: THUNDER_ID, storage_path_enhanced: PHOTO_PREFIXES[THUNDER_ID] + 'capture.jpg' };
  const thunder = fixture({ rows: [thunderRow] });
  assert.equal((await thunder.request('', 'Bearer fixture-session', THUNDER_ID)).status, 200);
  assert(thunder.signatures[0].startsWith(PHOTO_PREFIXES[THUNDER_ID]));
  for (const [horse, bad] of [[THUNDER_ID, { ...row, horse_id: THUNDER_ID }],
    [LUCERO_ID, { ...thunderRow, horse_id: LUCERO_ID }]]) {
    const f = fixture({ rows: [bad] });
    assert.equal((await f.request('', 'Bearer fixture-session', horse)).status, 503);
    assert.equal(f.signatures.length, 0);
  }
});

test('malformed limits, arbitrary paths and caller-supplied storage configuration are rejected', async () => {
  for (const query of ['?limit=241', '?limit=100000', '?limit=-1', '?limit=2&limit=3',
    '?bucket=other', '?key=private.jpg', '?endpoint=https://evil.test', '?cursor=invalid',
    '?from=2026-10-26T00:00:00Z&to=2026-10-27T00:00:00Z',
    '?ids=17&since=2026-10-26T00:00:00Z']) {
    const f = fixture();
    assert.equal((await f.request(query)).status, 400, query);
    assert.equal(f.signatures.length, 0);
  }
  for (const key of ['outside/lucero.jpg', WASABI_SCOPE.prefix + '../outside.jpg',
    WASABI_SCOPE.prefix + '%2e%2e.jpg', WASABI_SCOPE.prefix + 'clip.mp4']) {
    const f = fixture({ rows: [{ ...row, storage_path_enhanced: key }] });
    assert.equal((await f.request()).status, 503);
    assert.equal(f.signatures.length, 0);
  }
});

test('hourly reads use captured_at and cap 400, metadata polling does not sign any URL', async () => {
  const f = fixture();
  const result = await f.request('?from=2026-10-26T10:00:00Z&to=2026-10-26T11:00:00Z&limit=400&metadata=1');
  assert.equal(result.status, 200);
  assert.equal(result.body.photos[0].imageUrl, undefined);
  assert.equal(f.signatures.length, 0);
  const q = f.queries.find(q => q.table === 'images_wasabi');
  assert.equal(q.limit, 400);
  assert.deepEqual(q.orders[0], ['captured_at', { ascending: true }]);
  assert(q.filters.some(f => f[0] === 'gte' && f[1] === 'captured_at'));
  assert(q.filters.some(f => f[0] === 'lt' && f[1] === 'captured_at'));
  assert(!q.filters.some(f => f[1] === 'uploaded_at'));
});

test('keyset pagination binds a cursor to horse and interval, and handles ties by id', async () => {
  const f = fixture();
  const first = await f.request('?limit=1&metadata=1');
  assert(first.body.nextCursor);
  const next = await f.request('?limit=1&metadata=1&cursor=' + first.body.nextCursor);
  assert.equal(next.status, 200);
  assert.equal(f.queries.filter(q => q.table === 'images_wasabi').at(-1).or,
    `captured_at.lt.${captured},and(captured_at.eq.${captured},id.lt.17)`);
  assert.equal((await f.request('?since=2026-10-26T01:00:00Z&cursor=' + first.body.nextCursor)).status, 400);
});

test('renewal signs only server-resolved row IDs, never caller paths', async () => {
  const f = fixture({ rows: [row, { ...row, id: 18 }] });
  const result = await f.request('?ids=17');
  assert.equal(result.status, 200);
  assert.equal(result.body.photos.length, 1);
  assert.equal(result.body.nextCursor, null);
  assert.equal(f.signatures.length, 1);
});

test('missing private credentials fail closed for photos, without leaking configuration', async () => {
  const f = fixture({ realSigner: true });
  const response = await f.request();
  assert.equal(response.status, 503);
  assert.equal(response.body.photos, undefined);
  assert(!JSON.stringify(response.body).includes('ACCESS_KEY'));
});

test('real AWS presigner produces a local 10-minute GET signature restricted to fixed Wasabi settings', async () => {
  const env = { WASABI_ACCESS_KEY_ID: 'fixture-access-not-real', WASABI_SECRET_ACCESS_KEY: 'fixture-secret-not-real' };
  const f = fixture({ realSigner: true, env });
  const result = await f.request();
  assert.equal(result.status, 200);
  const url = new URL(result.body.photos[0].imageUrl);
  assert.equal(url.origin, WASABI_SCOPE.endpoint);
  assert.equal(decodeURIComponent(url.pathname), '/' + WASABI_SCOPE.bucket + '/' + row.storage_path_enhanced);
  assert.equal(url.searchParams.get('X-Amz-Expires'), '600');
  assert.match(url.searchParams.get('X-Amz-Signature'), /^[a-f0-9]{64}$/);
  for (const config of [{ WASABI_BUCKET: 'other' }, { WASABI_REGION: 'eu-central-1' }, { WASABI_ENDPOINT: 'https://evil.test' }]) {
    const denied = fixture({ realSigner: true, env: { ...env, ...config } });
    assert.equal((await denied.request()).status, 503);
  }
});
