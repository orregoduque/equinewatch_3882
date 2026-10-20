import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const uid = '00000000-0000-4000-8000-000000000001';
const horseId = '00000000-0000-4000-8000-000000000010';
const viewer = { id: uid, email: 'fixture@example.test', role: 'horse_owner' };
const compiled = ts.transpileModule(readFileSync('src/features/horse-details/photoFallback.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function fixture({ sessionId = uid, denied = false, error = null, row = { storage_path_enhanced: 'camera/latest.jpg' } } = {}) {
  const calls = [], access = [], publicUrls = [];
  const api = {};
  vm.runInNewContext(compiled, {
    exports: api,
    require: () => ({
      requireHorseAccess: async (id, user) => {
        access.push([id, user.id]);
        if (denied) throw new Error('Horse access denied');
      },
      supabase: {
        auth: { getSession: async () => ({ data: { session: sessionId ? { user: { id: sessionId } } : null } }) },
        storage: { from: bucket => ({
          getPublicUrl(path) {
            publicUrls.push({ bucket, path });
            return { data: { publicUrl: 'https://storage.example.test/camera/latest.jpg' } };
          },
        }) },
        from(table) {
          const call = { table, orders: [] }; calls.push(call);
          return {
            select(columns) { call.columns = columns; return this; },
            eq(column, value) { call.filter = [column, value]; return this; },
            order(column, options) { call.orders.push([column, options.ascending]); return this; },
            limit(value) { call.limit = value; return this; },
            abortSignal(signal) { call.signal = signal; return this; },
            async maybeSingle() { return { data: row, error }; },
          };
        },
      },
    }),
  });
  return { api, calls, access, publicUrls };
}
test('camera fallback reads only the latest authorized horse image and uses the storage SDK public URL', async () => {
  const f = fixture();
  const signal = new AbortController().signal;
  assert.equal(await f.api.fetchCameraPhotoFallback(horseId, viewer, signal), 'https://storage.example.test/camera/latest.jpg');
  assert.deepEqual(f.access, [[horseId, uid]]);
  assert.deepEqual(f.calls, [{
    table: 'images', columns: 'storage_path_enhanced', filter: ['horse_id', horseId],
    orders: [['created_at', false], ['id', false]], limit: 1, signal,
  }]);
  assert.deepEqual(f.publicUrls, [{ bucket: 'images', path: 'camera/latest.jpg' }]);
});
for (const sessionId of [null, 'another-user']) {
  test(`no fallback read without a matching session (${sessionId})`, async () => {
    const f = fixture({ sessionId });
    await assert.rejects(f.api.fetchCameraPhotoFallback(horseId, viewer), /Inicia sesión/);
    assert.equal(f.calls.length, 0);
  });
}
test('no fallback image query for a horse the viewer cannot access', async () => {
  const f = fixture({ denied: true });
  await assert.rejects(f.api.fetchCameraPhotoFallback(horseId, viewer), /denied/);
  assert.equal(f.calls.length, 0);
});
for (const row of [null, { storage_path_enhanced: null }, { storage_path_enhanced: '  ' }]) {
  test(`no invented camera photo for ${JSON.stringify(row)}`, async () => {
    const f = fixture({ row });
    assert.equal(await f.api.fetchCameraPhotoFallback(horseId, viewer), null);
    assert.equal(f.publicUrls.length, 0);
  });
}
test('camera lookup errors remain explicit', async () => {
  const f = fixture({ error: { message: 'Unavailable' } });
  await assert.rejects(f.api.fetchCameraPhotoFallback(horseId, viewer), /No se pudo cargar/);
});
test('aborted camera lookup cannot issue a query', async () => {
  const f = fixture();
  const controller = new AbortController(); controller.abort();
  await assert.rejects(f.api.fetchCameraPhotoFallback(horseId, viewer, controller.signal), { name: 'AbortError' });
  assert.equal(f.calls.length, 0);
});
