import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync('src/hooks/useAccessibleHorses.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const owner = { id: 'owner-one', email: 'fixture@example.test', role: 'horse_owner' };
const horse = { id: 'horse-one', name: 'Fixture' };
function fixture() {
  let user = owner, effect, cleanup, state, dependencies, revision = 0;
  const requests = [], api = {};
  vm.runInNewContext(compiled, {
    exports: api, Error,
    require(id) {
      if (id === 'react') return {
        useState(initial) {
          state ??= initial;
          return [state, next => { state = typeof next === 'function' ? next(state) : next; }];
        },
        useEffect(fn, deps) {
          if (!dependencies || deps.some((value, i) => value !== dependencies[i])) {
            effect = fn; dependencies = deps;
          }
        },
      };
      if (id.endsWith('/AuthContext')) return { useAuth: () => ({ user }) };
      if (id.endsWith('/useVisibleRefresh')) return { useVisibleRefresh: () => revision };
      if (id.endsWith('/supabase')) return {
        fetchHorses(viewer) {
          return new Promise((resolve, reject) => requests.push({ viewer, resolve, reject }));
        },
      };
      throw new Error(`Unexpected import ${id}`);
    },
  });
  function render() { return api.useAccessibleHorses({ refreshOnFocus: true }); }
  function flush() {
    if (effect) { cleanup?.(); cleanup = effect(); effect = null; }
  }
  return {
    render, flush, requests,
    refresh() { revision++; render(); flush(); },
    account(next) { user = next; },
  };
}
const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

test('initial visit shows loading; focus keeps current horses visible but makes a fresh read', async () => {
  const f = fixture();
  f.render(); f.flush();
  assert.equal(f.render().isLoading, true);
  f.requests[0].resolve([horse]); await settle();
  assert.equal(f.render().horses[0], horse);
  f.refresh();
  assert.equal(f.requests.length, 2);
  assert.equal(f.render().isLoading, false);
  assert.equal(f.render().horses[0], horse);
  const updated = { ...horse, name: 'Updated' };
  f.requests[1].resolve([updated]); await settle();
  assert.equal(f.render().horses[0], updated);
  f.refresh();
  assert.equal(f.requests.length, 3, 'refresh result is not cached between revisions');
});

test('previous account disappears before effects; cancelled reads cannot overwrite a new account', async () => {
  const f = fixture();
  f.render(); f.flush();
  f.requests[0].resolve([horse]); await settle();
  f.refresh();
  f.account({ ...owner, id: 'owner-two' });
  assert.equal(f.render().horses.length, 0);
  assert.equal(f.render().isLoading, true);
  f.flush();
  f.requests[1].resolve([horse]); await settle();
  assert.equal(f.render().horses.length, 0);
  const secondHorse = { id: 'horse-two' };
  f.requests[2].resolve([secondHorse]); await settle();
  assert.equal(f.render().horses[0], secondHorse);
});

test('refresh errors are explicit without discarding the same-account list', async () => {
  const f = fixture();
  f.render(); f.flush();
  f.requests[0].resolve([horse]); await settle();
  f.refresh(); f.requests[1].reject(new Error('Read failed')); await settle();
  assert.equal(f.render().horses[0], horse);
  assert.equal(f.render().isLoading, false);
  assert.equal(f.render().error, 'Read failed');
});
