import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const OWNER_ID = '00000000-0000-4000-8000-000000000001';
const OTHER_OWNER_ID = '00000000-0000-4000-8000-000000000002';
const PROFILE_ID = '00000000-0000-4000-8000-000000000003';
const owner = { id: OWNER_ID, email: 'owner@example.test', role: 'horse_owner' };
const horses = [
  { id: 'owned-horse', owner_id: OWNER_ID, is_active: true },
  { id: 'other-horse', owner_id: OTHER_OWNER_ID, is_active: true },
  { id: 'unassigned-horse', owner_id: null, is_active: false },
];
const compiled = ts.transpileModule(readFileSync('src/utils/supabase.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function fixture({
  horseRows = horses, profileId = OWNER_ID, horseFailures = 0, imageFailures = 0,
  detectionRows, detectionPageCap = 1000, failedDetectionOffset = null,
} = {}) {
  const executed = [];
  const rows = {
    horses: horseRows,
    user_profiles: [{ id: profileId, email: owner.email, full_name: 'Owner', role: 'horse_owner' }],
    images: [
      { id: 1, horse_id: 'owned-horse', created_at: '2026-10-02T12:00:00Z' },
      { id: 2, horse_id: 'owned-horse', created_at: '2026-10-02T11:00:00Z' },
      { id: 3, horse_id: 'other-horse', created_at: '2026-10-02T13:00:00Z' },
    ],
    temperatura: [
      { id: 1, horse_id: 'owned-horse', box_temperature: 20, created_at: '2026-10-02T12:00:00Z' },
      { id: 2, horse_id: 'other-horse', box_temperature: 40, created_at: '2026-10-02T12:00:00Z' },
    ],
    detection: detectionRows || [
      { id: 1, horse_id: 'owned-horse', created_at: '2026-10-02T12:00:00Z' },
      { id: 2, horse_id: 'other-horse', created_at: '2026-10-02T12:00:00Z' },
    ],
  };
  const client = {
    from(table) {
      const filters = [];
      let limit = Infinity;
      let offset = 0;
      let range;
      const dateFilters = [];
      let head = false;
      const query = {
        select(_columns, options) { head = options?.head ?? false; return this; },
        order() { return this; },
        limit(value) { limit = value; return this; },
        eq(column, value) { filters.push([column, [value]]); return this; },
        in(column, values) { filters.push([column, [...values]]); return this; },
        range(start, end) {
          offset = start;
          limit = Math.min(end - start + 1, detectionPageCap);
          range = [start, end];
          return this;
        },
        gte(column, value) { dateFilters.push([column, value, 'gte']); return this; },
        lt(column, value) { dateFilters.push([column, value, 'lt']); return this; },
        then(resolve, reject) {
          executed.push({ table, filters, dateFilters, range });
          if (table === 'images' && imageFailures > 0) {
            imageFailures -= 1;
            return Promise.resolve({ data: null, error: { message: 'Temporary image failure' } }).then(resolve, reject);
          }
          if (table === 'horses' && horseFailures > 0) {
            horseFailures -= 1;
            return Promise.resolve({ data: null, error: { message: 'Temporary horse lookup failure' } }).then(resolve, reject);
          }
          if (table === 'detection' && offset === failedDetectionOffset) {
            return Promise.resolve({ data: null, error: { message: 'Detection page failed' } }).then(resolve, reject);
          }
          const data = (rows[table] || []).filter(row =>
            filters.every(([column, values]) => values.includes(row[column]))
            && dateFilters.every(([column, value, op]) => op === 'gte'
              ? Date.parse(row[column]) >= Date.parse(value)
              : Date.parse(row[column]) < Date.parse(value)));
          return Promise.resolve({
            data: head ? null : data.slice(offset, offset + limit), count: data.length, error: null,
          }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, console: { log() {}, error() {} },
    require: () => ({ createClient: () => client }),
  });
  return { api: exports, executed };
}

test('horse owner sees only the assigned horse, not other or unassigned horses', async () => {
  const { api, executed } = fixture();
  assert.deepEqual((await api.fetchHorses(owner)).map(horse => horse.id), ['owned-horse']);
  assert.deepEqual(executed.find(query => query.table === 'horses').filters, [['owner_id', [OWNER_ID]]]);
});

test('owner assignments can reference the matching profile ID', async () => {
  const { api } = fixture({
    profileId: PROFILE_ID,
    horseRows: [{ ...horses[0], owner_id: PROFILE_ID }, ...horses.slice(1)],
  });
  assert.deepEqual((await api.fetchHorses(owner)).map(horse => horse.id), ['owned-horse']);
});

test('admin and stable owner retain their existing horse visibility', async () => {
  for (const role of ['admin', 'stable_owner']) {
    assert.equal((await fixture().api.fetchHorses({ ...owner, role })).length, 3);
  }
});

test('anonymous, unknown roles and owner demo IDs never receive the shared list', async () => {
  const { api } = fixture();
  for (const viewer of [null, { ...owner, role: 'unknown' }, { ...owner, id: '1' }]) {
    assert.equal((await api.fetchHorses(viewer)).length, 0);
  }
});

test('owner without assignments gets an empty list', async () => {
  assert.equal((await fixture({ horseRows: horses.slice(1) }).api.fetchHorses(owner)).length, 0);
});

test('incremental photo updates remain scoped and include only the requested recent records', async () => {
  const { api, executed } = fixture();
  const since = '2026-10-02T11:30:00Z';
  const photos = await api.fetchHorseImages(240, 'owned-horse', owner, since);
  assert.equal(photos.length, 1);
  assert.equal(photos[0].id, 1);
  const query = executed.find(entry => entry.table === 'images');
  assert.deepEqual(query.filters, [['horse_id', ['owned-horse']]]);
  assert.deepEqual(query.dateFilters, [['created_at', since, 'gte']]);
  await assert.rejects(api.fetchHorseImages(240, 'other-horse', owner, since), /access/);
});

test('image query failures are errors, not a successful empty gallery, and the next request recovers', async () => {
  const { api, executed } = fixture({ imageFailures: 1 });
  await assert.rejects(api.fetchHorseImages(240, 'owned-horse', owner), /Temporary image failure/);
  assert.equal((await api.fetchHorseImages(240, 'owned-horse', owner)).length, 2);
  assert.equal(executed.filter(entry => entry.table === 'horses').length, 2);
});

test('gallery and video data use only the authorized horse', async () => {
  const { api } = fixture();
  for (let request = 0; request < 2; request++) {
    const images = await api.fetchHorseImages(240, 'owned-horse', owner);
    assert.equal(images.length, 2);
    assert(images.every(image => image.horse_id === 'owned-horse'));
  }
});

test('foreign horse deep links cannot fetch photos, detections or temperatures', async () => {
  const { api, executed } = fixture();
  const start = new Date('2026-10-02'), end = new Date('2026-10-03');
  await assert.rejects(api.fetchHorseImages(240, 'other-horse', owner), /do not have access/);
  await assert.rejects(api.fetchDetectionsForDay('other-horse', start, end, owner), /do not have access/);
  await assert.rejects(api.fetchTemperaturesForDay('other-horse', start, end, owner), /do not have access/);
  assert(!executed.some(query => ['images', 'detection', 'temperatura'].includes(query.table)));
});

test('photos cannot be requested without an account or a validated horse ID', async () => {
  const { api } = fixture();
  await assert.rejects(api.fetchHorseImages(240, 'owned-horse'), /Sign in/);
  await assert.rejects(api.fetchHorseImages(240, undefined, owner), /Sign in/);
});

test('profile statistics count only the owner horses and their data', async () => {
  const { api } = fixture();
  const stats = await api.fetchProfileStats(owner);
  assert.equal(stats.totalHorses, 1);
  assert.equal(stats.activeHorses, 1);
  assert.equal(stats.totalObservations, 2);
  assert.equal(stats.averageTemperature, 20);
  assert.equal(stats.lastObservation, '2026-10-02T12:00:00Z');
});

test('parallel Insights requests share a fresh authorization lookup', async () => {
  const { api, executed } = fixture();
  const start = new Date('2026-10-02'), end = new Date('2026-10-03');
  const [detections, temperatures] = await Promise.all([
    api.fetchDetectionsForDay('owned-horse', start, end, owner),
    api.fetchTemperaturesForDay('owned-horse', start, end, owner),
  ]);
  assert.equal(detections.length, 1);
  assert.equal(temperatures.length, 1);
  assert.equal(executed.filter(query => query.table === 'horses').length, 1);
  assert.equal(executed.filter(query => query.table === 'user_profiles').length, 1);
});

test('resolved horse assignments are not cached for subsequent requests', async () => {
  const { api, executed } = fixture();
  await api.fetchHorses(owner);
  await api.fetchHorses(owner);
  assert.equal(executed.filter(query => query.table === 'horses').length, 2);
});

test('simultaneous owner and admin requests never share their scope', async () => {
  const { api, executed } = fixture();
  const [ownerHorses, adminHorses] = await Promise.all([
    api.fetchHorses(owner), api.fetchHorses({ ...owner, role: 'admin' }),
  ]);
  assert.equal(ownerHorses.length, 1);
  assert.equal(adminHorses.length, 3);
  assert.equal(executed.filter(query => query.table === 'horses').length, 2);
});

test('simultaneous different owners only receive their own horses', async () => {
  const { api } = fixture();
  const [first, second] = await Promise.all([
    api.fetchHorses(owner),
    api.fetchHorses({ ...owner, id: OTHER_OWNER_ID, email: 'other@example.test' }),
  ]);
  assert.deepEqual(first.map(horse => horse.id), ['owned-horse']);
  assert.deepEqual(second.map(horse => horse.id), ['other-horse']);
});

test('a failed shared lookup is removed so the next attempt can recover', async () => {
  const { api, executed } = fixture({ horseFailures: 1 });
  const failures = await Promise.allSettled([api.fetchHorses(owner), api.fetchHorses(owner)]);
  assert(failures.every(result => result.status === 'rejected'));
  assert.equal((await api.fetchHorses(owner)).length, 1);
  assert.equal(executed.filter(query => query.table === 'horses').length, 2);
});

const dayRecords = count => Array.from({ length: count }, (_, id) => ({
  id, horse_id: 'owned-horse', created_at: '2026-10-02T12:00:00Z',
  analysis: 'Caballo detectado. Confianza: 78,3 %. Modelo: Encantador YOLO26n.',
}));

test('daily detection totals include all pages beyond the 1,000 row limit', async () => {
  const { api, executed } = fixture({ detectionRows: dayRecords(2505) });
  const records = await api.fetchDetectionsForDay('owned-horse', new Date('2026-10-02'), new Date('2026-10-03'), owner);
  assert.equal(records.length, 2505);
  assert.equal(records.at(-1).id, 2504);
  assert.deepEqual(executed.filter(query => query.table === 'detection').map(query => query.range), [
    [0, 999], [1000, 1999], [2000, 2504],
  ]);
  assert.equal(executed.filter(query => query.table === 'horses').length, 1);
  assert(executed.filter(query => query.table === 'detection').every(query =>
    query.filters.some(([column, values]) => column === 'horse_id' && values.includes('owned-horse'))));
});

test('paging also honors a Supabase cap lower than 1,000 rows', async () => {
  const { api } = fixture({ detectionRows: dayRecords(1601), detectionPageCap: 500 });
  const records = await api.fetchDetectionsForDay('owned-horse', new Date('2026-10-02'), new Date('2026-10-03'), owner);
  assert.equal(records.length, 1601);
  assert.equal(records.at(-1).id, 1600);
});

test('a failing later detection page rejects instead of returning an incomplete time estimate', async () => {
  const { api } = fixture({ detectionRows: dayRecords(1800), failedDetectionOffset: 1000 });
  await assert.rejects(
    api.fetchDetectionsForDay('owned-horse', new Date('2026-10-02'), new Date('2026-10-03'), owner),
    /Detection page failed/,
  );
});

test('the daily summary includes the start boundary and excludes the next day', async () => {
  const detectionRows = [
    { ...dayRecords(1)[0], id: 1, created_at: '2026-10-02T00:00:00Z' },
    { ...dayRecords(1)[0], id: 2, created_at: '2026-10-03T00:00:00Z' },
    { ...dayRecords(1)[0], id: 3, created_at: '2026-10-01T23:59:59Z' },
  ];
  const { api } = fixture({ detectionRows });
  const records = await api.fetchDetectionsForDay('owned-horse', new Date('2026-10-02'), new Date('2026-10-03'), owner);
  assert.deepEqual(records.map(record => record.id), [1]);
});