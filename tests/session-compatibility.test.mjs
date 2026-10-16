import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync('src/contexts/AuthContext.tsx', 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React, esModuleInterop: true,
  },
}).outputText;

for (const role of ['horse_owner', 'stable_owner', 'admin']) {
  test(`an existing ${role} session is restored without erasing storage or signing out`, () => {
    const stored = JSON.stringify({
      id: '00000000-0000-4000-8000-000000000001',
      email: 'client@example.test', name: 'Test Client', role,
    });
    let user = null, mutations = 0, signouts = 0;
    const effects = [];
    const React = {
      createContext: () => ({ Provider: 'Provider' }),
      createElement: (type, props) => ({ type, props }),
      useState: () => [user, value => { user = value; }],
      useEffect: fn => effects.push(fn),
    };
    const api = {};
    vm.runInNewContext(compiled, {
      exports: api,
      localStorage: {
        getItem(key) { assert.equal(key, 'stableEyeUser'); return stored; },
        setItem() { mutations++; },
        removeItem() { mutations++; },
      },
      require(id) {
        if (id === 'react') return { __esModule: true, default: React, ...React };
        return { supabase: { auth: { signOut() { signouts++; return Promise.resolve(); } } } };
      },
    });
    api.AuthProvider({ children: null });
    effects[0]();
    const rendered = api.AuthProvider({ children: null });
    assert.deepEqual(JSON.parse(JSON.stringify(rendered.props.value.user)), JSON.parse(stored));
    assert.equal(mutations, 0);
    assert.equal(signouts, 0);
  });
}
