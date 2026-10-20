import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const ownerId = '00000000-0000-4000-8000-000000000001';
const horseId = '00000000-0000-4000-8000-000000000010';
const owner = { id: ownerId, email: 'fixture@example.test', role: 'horse_owner' };
const input = { horse_id: horseId, task: 'herraduras', performed_on: '2026-10-17', comments: '  Cambio completo  ' };
const compiled = ts.transpileModule(readFileSync('src/features/checks/api.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture({ sessionId = ownerId, denied = false, error = null, rows = [], missingInsert = false } = {}) {
  const calls = [], permissions = [];
  const client = {
    auth: { async getSession() { return { data: { session: sessionId ? { user: { id: sessionId } } : null } }; } },
    from(table) {
      const call = { table, orders: [] };
      calls.push(call);
      const query = {
        select(columns) { call.columns = columns; return this; },
        eq(column, value) { call.filter = [column, value]; return this; },
        order(column, options) { call.orders.push([column, options]); return this; },
        range(start, end) { call.range = [start, end]; return this; },
        insert(value) { call.insert = value; return this; },
        single() { call.single = true; return this; },
        abortSignal(signal) { call.signal = signal; return this; },
        then(resolve, reject) {
          const data = call.insert
            ? missingInsert ? null : { ...call.insert, id: 100, created_by: ownerId, created_at: '2026-10-17T10:00:00Z' }
            : rows;
          return Promise.resolve({ data, error }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, Date, require(name) {
      assert.equal(name, '../../utils/supabase');
      return {
        supabase: client,
        requireHorseAccess: async (id, viewer) => {
          permissions.push([id, viewer.id]);
          if (denied) throw new Error('You do not have access to this horse.');
        },
      };
    },
  });
  return { api: exports, calls, permissions };
}

test('checks are scoped to an accessible horse, ordered by task date and paginated', async () => {
  const f = fixture({ rows: Array.from({ length: 26 }, (_, id) => ({ id, horse_id: horseId })) });
  const result = await f.api.fetchHorseChecks(horseId, owner, 2);
  assert.equal(result.records.length, 25);
  assert.equal(result.hasMore, true);
  assert.deepEqual(f.permissions, [[horseId, ownerId]]);
  assert.deepEqual(f.calls[0].filter, ['horse_id', horseId]);
  assert.deepEqual(f.calls[0].range, [50, 75]);
  assert.equal(f.calls[0].orders[0][0], 'performed_on');
  assert.equal(f.calls[0].orders[1][0], 'id');
});

test('empty history is not an error and has no more pages', async () => {
  const { api } = fixture();
  const result = await api.fetchHorseChecks(horseId, owner);
  assert.equal(result.records.length, 0);
  assert.equal(result.hasMore, false);
});

test('creation sends only four editable columns; Supabase owns author, ID and timestamps', async () => {
  const f = fixture();
  const row = await f.api.createHorseCheck({ ...input, created_by: 'spoof', id: 444 }, owner);
  assert.equal(row.id, 100);
  assert.equal(row.created_by, ownerId);
  assert.equal(f.calls[0].single, true);
  assert.deepEqual(Object.keys(f.calls[0].insert).sort(), ['comments', 'horse_id', 'performed_on', 'task']);
  assert.equal(f.calls[0].insert.comments, 'Cambio completo');
});

test('empty, null and missing comments are omitted from the insert', async () => {
  for (const comments of [' ', null, undefined]) {
    const f = fixture();
    await f.api.createHorseCheck({ ...input, comments }, owner);
    assert.deepEqual(Object.keys(f.calls[0].insert).sort(), ['horse_id', 'performed_on', 'task']);
  }
});

for (const task of [
  'herraduras', 'vacuna', 'concurso', 'dientes',
  'Terapias', 'Odontologia', 'Purga', 'Medicamento',
  'Chequeo veterinario', 'Cambio de comida', 'Ajuste silla', 'Cambio bocado',
]) {
  test(`accepts the exact ${task} enum value`, async () => {
    const f = fixture();
    await f.api.createHorseCheck({ ...input, task }, owner);
    assert.equal(f.calls[0].insert.task, task);
  });
}

for (const invalid of [
  { task: 'otro' }, { task: 'Herraduras' }, { performed_on: '2026-02-30' },
  { task: 'terapias' }, { task: 'Odontología' }, { task: 'Cambio de comida ' },
  { performed_on: '2026-13-01' }, { performed_on: '2026-10-1' },
  { performed_on: '' }, { horse_id: '' }, { comments: 22 },
]) {
  test(`invalid form data is rejected without writing: ${JSON.stringify(invalid)}`, async () => {
    const f = fixture();
    await assert.rejects(f.api.createHorseCheck({ ...input, ...invalid }, owner));
    assert.equal(f.calls.length, 0);
  });
}

for (const sessionId of [null, 'another-user']) {
  test(`no real matching session (${sessionId}) cannot read or write`, async () => {
    const f = fixture({ sessionId });
    await assert.rejects(f.api.fetchHorseChecks(horseId, owner), /Inicia sesión/);
    await assert.rejects(f.api.createHorseCheck(input, owner), /Inicia sesión/);
    assert.equal(f.calls.length, 0);
  });
}

test('an inaccessible horse cannot be read or written', async () => {
  const f = fixture({ denied: true });
  await assert.rejects(f.api.fetchHorseChecks(horseId, owner), /access/);
  await assert.rejects(f.api.createHorseCheck(input, owner), /access/);
  assert.equal(f.calls.length, 0);
});

test('database errors are exposed instead of an empty history or false save success', async () => {
  const { api } = fixture({ error: { message: 'new row violates row-level security policy' } });
  await assert.rejects(api.fetchHorseChecks(horseId, owner), /row-level security/);
  await assert.rejects(api.createHorseCheck(input, owner), /row-level security/);
});

test('an unconfirmed insert is not presented as saved', async () => {
  await assert.rejects(fixture({ missingInsert: true }).api.createHorseCheck(input, owner), /confirmar/);
});

test('cancellation prevents querying checks and is passed to Supabase', async () => {
  const f = fixture(), controller = new AbortController();
  await f.api.fetchHorseChecks(horseId, owner, 0, controller.signal);
  assert.equal(f.calls[0].signal, controller.signal);
  controller.abort();
  await assert.rejects(f.api.fetchHorseChecks(horseId, owner, 0, controller.signal));
  assert.equal(f.calls.length, 1);
});

test('invalid page offsets cannot request unbounded results', async () => {
  const f = fixture();
  for (const page of [-1, 1.1, Infinity]) await assert.rejects(f.api.fetchHorseChecks(horseId, owner, page));
  assert.equal(f.calls.length, 0);
});

test('today is formatted from local calendar components, not UTC', () => {
  const { api } = fixture();
  assert.equal(api.localToday({ getFullYear: () => 2026, getMonth: () => 0, getDate: () => 2 }), '2026-01-02');
});
