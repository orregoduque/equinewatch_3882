import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync('src/hooks/useHourlyHorseImages.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
function fixture() {
  const states = [], requests = [], api = {};
  let stateIndex, deps, effect, cleanup;
  let horseId = 'horse-one', viewer = { id: 'owner' }, viewerKey = 'owner';
  let selection = { day: '2026-10-21', hour: 8 };
  vm.runInNewContext(compiled, {
    exports: api, AbortController, clearTimeout,
    require(id) {
      if (id === 'react') return {
        useState(initial) {
          const i = stateIndex++;
          if (i >= states.length) states[i] = initial;
          return [states[i], next => { states[i] = typeof next === 'function' ? next(states[i]) : next; }];
        },
        useEffect(fn, next) {
          if (!deps || next.some((v, i) => v !== deps[i])) { deps = next; effect = fn; }
        },
      };
      return {
        fetchHorseImagesForHour(horse, user, day, hour, signal) {
          return new Promise((resolve, reject) => requests.push({ horse, user, day, hour, signal, resolve, reject }));
        },
      };
    },
  });
  return {
    requests,
    render() { stateIndex = 0; return api.useHourlyHorseImages(horseId, viewer, viewerKey, selection); },
    flush() { if (effect) { cleanup?.(); cleanup = effect(); effect = null; } },
    hour(hour) { selection = { ...selection, hour }; },
    account() { viewerKey = 'other'; viewer = { id: 'other' }; },
    horse() { horseId = 'horse-two'; },
    live() { selection = null; },
  };
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

test('hour changes cancel the old request and stale responses cannot replace the new hour', async () => {
  const f = fixture();
  f.render(); f.flush();
  f.hour(9); assert.equal(f.render().images.length, 0); f.flush();
  assert.equal(f.requests[0].signal.aborted, true);
  f.requests[1].resolve([{ id: 9 }]); await settle();
  assert.equal(f.render().images[0].id, 9);
  f.requests[0].resolve([{ id: 8 }]); await settle();
  assert.equal(f.render().images[0].id, 9);
});

test('changing account or horse immediately hides prior results and cancels in-flight reads', async () => {
  for (const action of ['account', 'horse']) {
    const f = fixture();
    f.render(); f.flush(); f.requests[0].resolve([{ id: 1 }]); await settle();
    assert.equal(f.render().images.length, 1);
    f[action]();
    assert.equal(f.render().images.length, 0);
    f.flush(); assert(f.requests[0].signal.aborted);
  }
});

test('return to live discards hour rows, cancels request, and never fetches the entire day', async () => {
  const f = fixture();
  f.render(); f.flush(); f.live();
  assert.equal(f.render().images.length, 0); f.flush();
  assert.equal(f.requests.length, 1);
  assert(f.requests[0].signal.aborted);
  f.requests[0].resolve([{ id: 8 }]); await settle();
  assert.equal(f.render().images.length, 0);
  assert.equal(f.render().loading, false);
});

test('errors are visible, and retry starts another request for just the same hour', async () => {
  const f = fixture();
  f.render(); f.flush(); f.requests[0].reject(new Error('temporary')); await settle();
  assert(f.render().error);
  f.render().retry(); f.render(); f.flush();
  assert.equal(f.requests.length, 2);
  assert.equal(f.requests[1].hour, 8);
  f.requests[1].resolve([]); await settle();
  assert.equal(f.render().error, '');
  assert.equal(f.render().loading, false);
});
