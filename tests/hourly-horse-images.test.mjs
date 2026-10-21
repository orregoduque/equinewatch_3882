import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function compile(path) {
  return ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
}
const dates = {};
vm.runInNewContext(compile('src/utils/hourlyHorseImages.ts'), { exports: dates, Date, Error });
const owner = { id: '00000000-0000-4000-8000-000000000001', email: 'owner@example.test', role: 'horse_owner' };
const horseId = 'owned-horse';

test('local hour boundaries are converted to UTC, including midnight and DST', () => {
  const previous = process.env.TZ;
  try {
    process.env.TZ = 'America/Bogota';
    assert.deepEqual({ ...dates.localHourRange('2026-10-21', 23) }, {
      start: '2026-10-22T04:00:00.000Z', end: '2026-10-22T05:00:00.000Z',
    });
    process.env.TZ = 'Europe/Madrid';
    assert.deepEqual({ ...dates.localHourRange('2026-03-29', 1) }, {
      start: '2026-03-29T00:00:00.000Z', end: '2026-03-29T01:00:00.000Z',
    });
    assert.throws(() => dates.localHourRange('2026-03-29', 2), /no existe/);
    // A repeated local hour includes both occurrences, not the entire day.
    assert.deepEqual({ ...dates.localHourRange('2026-10-25', 2) }, {
      start: '2026-10-25T00:00:00.000Z', end: '2026-10-25T02:00:00.000Z',
    });
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test('invalid calendar dates and out-of-range hours fail before a request', () => {
  for (const [day, hour] of [['2026-02-30', 1], ['bad', 1], ['2026-01-01', 24], ['2026-01-01', -1], ['2026-01-01', 0.5]])
    assert.throws(() => dates.localHourRange(day, hour));
});

function fixture() {
  const executed = [], api = {};
  const client = {
    from(table) {
      const call = { table, filters: [], orders: [] };
      const query = {
        select(columns) { call.columns = columns; return this; },
        eq(column, value) { call.filters.push(['eq', column, value]); return this; },
        in(column, values) { call.filters.push(['in', column, values]); return this; },
        not(column, operator, value) { call.filters.push(['not', column, operator, value]); return this; },
        gte(column, value) { call.filters.push(['gte', column, value]); return this; },
        lt(column, value) { call.filters.push(['lt', column, value]); return this; },
        order(column, options) { call.orders.push([column, options]); return this; },
        limit(limit) { call.limit = limit; return this; },
        abortSignal(signal) { call.signal = signal; return this; },
        then(resolve, reject) {
          executed.push(call);
          return Promise.resolve({ error: null, data: table === 'horses'
            ? [{ id: horseId, owner_id: owner.id }]
            : table === 'user_profiles' ? [{ id: owner.id }] : [] }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  vm.runInNewContext(compile('src/utils/supabase.ts'), {
    exports: api, Date, DOMException,
    require(id) {
      if (id === './hourlyHorseImages') return dates;
      if (id === '@supabase/supabase-js') return { createClient: () => client };
      return {};
    },
  });
  return { api, executed };
}

test('hour review reads only that horse and created_at interval, ascending, max 400', async () => {
  const f = fixture(), signal = new AbortController().signal;
  const range = dates.localHourRange('2026-10-21', 8);
  await f.api.fetchHorseImagesForHour(horseId, owner, '2026-10-21', 8, signal);
  const read = f.executed.find(call => call.table === 'images');
  assert.deepEqual(JSON.parse(JSON.stringify(read.filters)), [
    ['eq', 'horse_id', horseId], ['not', 'storage_path_enhanced', 'is', null],
    ['gte', 'created_at', range.start], ['lt', 'created_at', range.end],
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(read.orders)), [
    ['created_at', { ascending: true }], ['id', { ascending: true }],
  ]);
  assert.equal(read.limit, 400);
  assert.equal(read.signal, signal);
  assert(!read.filters.some(filter => filter[1] === 'uploaded_at'));
});

test('hourly review cannot read another owner horse or bypass sign-in', async () => {
  for (const [id, viewer] of [['another-horse', owner], [horseId, null]]) {
    const f = fixture();
    await assert.rejects(() => f.api.fetchHorseImagesForHour(id, viewer, '2026-10-21', 8));
    assert(!f.executed.some(call => call.table === 'images'));
  }
});

test('cancelled hourly requests do not start an images query', async () => {
  const f = fixture(), controller = new AbortController();
  controller.abort();
  await assert.rejects(() => f.api.fetchHorseImagesForHour(horseId, owner, '2026-10-21', 8, controller.signal), { name: 'AbortError' });
  assert(!f.executed.some(call => call.table === 'images'));
});

test('live reads remain limited to 240 with descending upload ordering', async () => {
  const f = fixture();
  await f.api.fetchHorseImages(240, horseId, owner);
  const read = f.executed.find(call => call.table === 'images');
  assert.equal(read.limit, 240);
  assert.equal(read.orders[0][0], 'uploaded_at');
  assert.equal(read.orders[0][1].ascending, false);
  assert(!read.filters.some(filter => filter[0] === 'lt'));
});
