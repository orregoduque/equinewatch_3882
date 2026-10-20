import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const uid = '00000000-0000-4000-8000-000000000001';
const horseId = '00000000-0000-4000-8000-000000000010';
const viewer = { id: uid, email: 'fixture@example.test', role: 'horse_owner' };
const columns = [
  'id', 'name', 'breed', 'age', 'date_of_birth', 'gender', 'color', 'stall_number', 'weight',
  'height', 'medical_notes', 'registration_number', 'dietary_requirements',
  'emergency_contact', 'emergency_phone', 'veterinarian', 'veterinarian_phone',
  'insurance_details', 'profile_photo_url',
];
const compiled = ts.transpileModule(readFileSync('src/features/horse-details/api.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
function fixture({ sessionId = uid, sessionError = null, error = null, row = { id: horseId, name: 'Fixture' } } = {}) {
  const calls = [];
  const api = {};
  vm.runInNewContext(compiled, {
    exports: api,
    require: () => ({
      supabase: {
        auth: { getSession: async () => ({
          data: { session: sessionId ? { user: { id: sessionId } } : null }, error: sessionError,
        }) },
        from(table) {
          const call = { table }; calls.push(call);
          return {
            select(value) { call.columns = value; return this; },
            eq(key, value) { call.filter = [key, value]; return this; },
            abortSignal(signal) { call.signal = signal; return this; },
            async maybeSingle() { call.maybeSingle = true; return { data: row, error }; },
          };
        },
      },
    }),
  });
  return { api, calls };
}

test('details use exactly the specified columns, horse ID and maybeSingle, without any writes', async () => {
  const f = fixture();
  const signal = new AbortController().signal;
  const horse = await f.api.fetchHorseDetails(horseId, viewer, signal);
  assert.equal(horse.id, horseId);
  assert.deepEqual(f.calls, [{
    table: 'horses', columns: columns.join(','), filter: ['id', horseId], signal, maybeSingle: true,
  }]);
});
for (const role of ['horse_owner', 'admin', 'caretaker']) {
  test(`${role} reads with the real session; access remains decided by RLS`, async () => {
    const f = fixture();
    await f.api.fetchHorseDetails(horseId, { ...viewer, role });
    assert.deepEqual(f.calls[0].filter, ['id', horseId]);
  });
}
test('null returned by RLS or a missing horse is not fabricated into a horse', async () => {
  const f = fixture({ row: null });
  assert.equal(await f.api.fetchHorseDetails(horseId, viewer), null);
});
test('null fields and numeric zero are returned without invented defaults', async () => {
  const row = Object.fromEntries(columns.map(column => [column, null]));
  Object.assign(row, { id: horseId, age: 0, weight: 0, height: 0 });
  const f = fixture({ row });
  assert.deepEqual(await f.api.fetchHorseDetails(horseId, viewer), row);
});
test('date of birth and database age are returned as stored, without recalculating age', async () => {
  for (const row of [
    { id: horseId, breed: 'Warmblood', date_of_birth: '2015-07-12', age: 11 },
    { id: horseId, breed: 'Warmblood', date_of_birth: '2022-12-09', age: 3 },
  ]) {
    const f = fixture({ row });
    assert.deepEqual(await f.api.fetchHorseDetails(horseId, viewer), row);
  }
});
for (const sessionId of [null, 'another-user']) {
  test(`missing or mismatched real session (${sessionId}) cannot query horses`, async () => {
    const f = fixture({ sessionId });
    await assert.rejects(f.api.fetchHorseDetails(horseId, viewer), f.api.HorseDetailsSessionError);
    assert.equal(f.calls.length, 0);
  });
}
test('a session lookup error cannot fall back to anonymous reads', async () => {
  const f = fixture({ sessionError: { message: 'unavailable' } });
  await assert.rejects(f.api.fetchHorseDetails(horseId, viewer), f.api.HorseDetailsSessionError);
  assert.equal(f.calls.length, 0);
});
test('a logged-out app cannot read a leftover SDK session', async () => {
  const f = fixture();
  await assert.rejects(f.api.fetchHorseDetails(horseId, null), f.api.HorseDetailsSessionError);
  assert.equal(f.calls.length, 0);
});
test('invalid IDs are rejected without a table read', async () => {
  const f = fixture();
  await assert.rejects(f.api.fetchHorseDetails('../all', viewer), /identificador/);
  assert.equal(f.calls.length, 0);
});
test('database errors are visible without exposing sensitive response details', async () => {
  const f = fixture({ error: { message: 'database internal details' } });
  await assert.rejects(f.api.fetchHorseDetails(horseId, viewer), /No se pudo cargar/);
});
test('a mismatched returned ID is rejected', async () => {
  const f = fixture({ row: { id: 'another-horse' } });
  await assert.rejects(f.api.fetchHorseDetails(horseId, viewer), /confirmar/);
});
test('cancelled requests do not query the database', async () => {
  const f = fixture();
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(f.api.fetchHorseDetails(horseId, viewer, controller.signal), { name: 'AbortError' });
  assert.equal(f.calls.length, 0);
});
