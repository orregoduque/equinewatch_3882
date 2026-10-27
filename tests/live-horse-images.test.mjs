import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync('src/utils/liveHorseImages.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const image = (id, extra = {}) => ({
  id, horse_id: 'owned-horse', created_at: new Date(id * 10_000).toISOString(),
  storage_path_enhanced: `${id}.jpg`, is_processed: true, ...extra,
});
const settle = () => new Promise(resolve => setImmediate(resolve));
class HorseAccessError extends Error {}

function fixture(load = async () => [image(1)], limit = 240) {
  let now = 0, nextTimer = 0;
  const timers = new Map(), requests = [], updates = [], errors = [];
  const makeTarget = () => {
    const listeners = new Map();
    return {
      listeners,
      addEventListener(type, fn) {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type).add(fn);
      },
      removeEventListener(type, fn) { listeners.get(type)?.delete(fn); },
      emit(type) { listeners.get(type)?.forEach(fn => fn()); },
    };
  };
  const document = { ...makeTarget(), visibilityState: 'visible' };
  const window = makeTarget();
  const api = {};
  vm.runInNewContext(compiled, {
    exports: api, document, window, Error, AbortController,
    Date: class extends Date { static now() { return now; } },
    setTimeout(fn, delay) { timers.set(++nextTimer, { fn, at: now + delay }); return nextTimer; },
    clearTimeout(id) { timers.delete(id); },
    require: () => ({
      HorseAccessError,
      async fetchHorseImages(...args) { requests.push(args); return load(...args); },
    }),
  });
  const viewer = { id: 'owner', role: 'horse_owner', email: 'owner@example.test' };
  let settlements = 0;
  const stop = api.watchHorseImages({
    horseId: 'owned-horse', viewer, limit,
    onImages: rows => updates.push(rows),
    onError: error => errors.push(error),
    onSettled: () => settlements++,
  });
  return {
    api, stop, requests, updates, errors, timers, document, window, viewer,
    get settlements() { return settlements; },
    async tick(ms = 10_000) {
      now += ms;
      for (const [id, job] of [...timers]) {
        if (job.at <= now) { timers.delete(id); job.fn(); }
      }
      await settle();
    },
  };
}

test('capture-ordered timeline keeps only the latest 20 captures, not late uploads', () => {
  const f = fixture();
  const rows = Array.from({ length: 30 }, (_, i) => image(i + 1));
  rows[0].uploaded_at = image(100).created_at;
  const merged = f.api.mergeHorseImages([], rows, 20, true);
  assert.equal(merged.length, 20);
  assert.equal(merged[0].id, 30);
  assert.equal(merged.at(-1).id, 11);
  f.stop();
});

test('late uploads sort by uploaded_at even when their capture was older', () => {
  const f = fixture();
  const late = { ...image(1), uploaded_at: image(101).created_at };
  const merged = f.api.mergeHorseImages([image(100)], [late], 240);
  assert.equal(merged[0].id, 1);
  f.stop();
});

test('Wasabi sorts and polls by captured_at instead of upload time', async () => {
  const older = { ...image(1), source: 'wasabi', captured_at: image(1).created_at,
    uploaded_at: image(100).created_at };
  const newest = { ...image(2), source: 'wasabi', captured_at: image(2).created_at };
  const f = fixture(async () => [newest, older]);
  assert.equal(f.api.mergeHorseImages([older], [newest], 240)[0].id, 2);
  await settle();
  await f.tick();
  assert.equal(f.requests[1][3], older.captured_at);
  f.stop();
  assert(f.requests.at(-1)[4].aborted, 'leaving aborts the in-flight request signal');
});

test('metadata identities include their source so overlapping IDs cannot replace a different origin', () => {
  const f = fixture();
  const merged = f.api.mergeHorseImages([image(1)], [{ ...image(1), source: 'wasabi' }], 240);
  assert.equal(merged.length, 2);
  f.stop();
});

test('incremental refresh uses the upload timestamp for late captures', async () => {
  const uploaded = image(101).created_at;
  const f = fixture(async () => [{ ...image(1), uploaded_at: uploaded }]);
  await settle();
  await f.tick();
  assert.equal(f.requests[1][3], uploaded);
  f.stop();
});

test('new photos appear automatically, remain scoped, merge without duplicates and respect the limit', async () => {
  let rows = [image(1)];
  const f = fixture(async () => rows, 2);
  await settle();
  assert.equal(f.updates[0][0].id, 1);
  rows = [image(2), image(1)];
  await f.tick();
  assert.deepEqual(Array.from(f.updates.at(-1), row => row.id), [2, 1]);
  assert.equal(f.requests[1][3], image(1).created_at);
  rows = [image(3), image(2)];
  await f.tick();
  assert.deepEqual(Array.from(f.updates.at(-1), row => row.id), [3, 2]);
  assert(f.requests.every(([limit, horse, viewer]) =>
    limit === 2 && horse === 'owned-horse' && viewer === f.viewer));
  f.stop();
});

test('unchanged photos do not cause redundant image updates; enhanced metadata changes do', async () => {
  let rows = [image(1, { is_processed: false })];
  const f = fixture(async () => rows);
  await settle();
  await f.tick();
  assert.equal(f.updates.length, 1);
  rows = [image(1)];
  await f.tick();
  assert.equal(f.updates.length, 2);
  assert.equal(f.updates.at(-1)[0].is_processed, true);
  f.stop();
});

test('hidden tabs pause polling and returning, focus and reconnection refresh immediately', async () => {
  const f = fixture();
  await settle();
  f.document.visibilityState = 'hidden';
  f.document.emit('visibilitychange');
  await f.tick(30_000);
  assert.equal(f.requests.length, 1);
  f.document.visibilityState = 'visible';
  f.document.emit('visibilitychange');
  await settle();
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests.at(-1)[3], undefined);
  f.window.emit('focus');
  await settle();
  f.window.emit('online');
  await settle();
  assert.equal(f.requests.length, 4);
  assert.equal(f.timers.size, 1);
  f.stop();
});

test('slow requests never overlap, and stopping ignores pending results and removes listeners', async () => {
  let resolve;
  const f = fixture(() => new Promise(done => { resolve = done; }));
  f.window.emit('focus');
  f.window.emit('online');
  await f.tick(20_000);
  assert.equal(f.requests.length, 1);
  f.stop();
  resolve([image(1)]);
  await settle();
  assert.equal(f.updates.length, 0);
  assert.equal(f.settlements, 0);
  assert.equal(f.timers.size, 0);
  for (const target of [f.window, f.document]) {
    assert([...target.listeners.values()].every(listeners => listeners.size === 0));
  }
});

test('temporary failures keep the last photo, expose an error and recover without a page reload', async () => {
  let fail = false;
  const f = fixture(async () => {
    if (fail) throw new Error('Temporary network failure');
    return [image(1)];
  });
  await settle();
  fail = true;
  await f.tick();
  assert.equal(f.updates.length, 1);
  assert.match(f.errors.at(-1).message, /network/);
  fail = false;
  await f.tick();
  assert.equal(f.errors.at(-1), null);
  f.stop();
});

test('revoking horse access removes the photos and the following request revalidates from scratch', async () => {
  let denied = false;
  const f = fixture(async () => {
    if (denied) throw new HorseAccessError('Access revoked');
    return [image(1)];
  });
  await settle();
  denied = true;
  await f.tick();
  assert.equal(f.updates.at(-1).length, 0);
  denied = false;
  await f.tick();
  assert.equal(f.requests.at(-1)[3], undefined);
  assert.equal(f.updates.at(-1)[0].id, 1);
  f.stop();
});

test('an initially empty gallery picks up its first photo automatically', async () => {
  let rows = [];
  const f = fixture(async () => rows);
  await settle();
  assert.equal(f.updates.at(-1).length, 0);
  rows = [image(1)];
  await f.tick();
  assert.equal(f.updates.at(-1)[0].id, 1);
  f.stop();
});

test('periodic full reconciliation removes deleted photos and discovers older metadata updates', async () => {
  let rows = [image(2), image(1)];
  const f = fixture(async () => rows);
  await settle();
  rows = [image(1)];
  await f.tick(60_000);
  assert.equal(f.requests.at(-1)[3], undefined);
  assert.deepEqual(Array.from(f.updates.at(-1), row => row.id), [1]);
  f.stop();
});
