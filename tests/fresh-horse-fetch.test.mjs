import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync('src/utils/freshHorseFetch.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
function setup() {
  const calls = [], api = {};
  vm.runInNewContext(compiled, {
    exports: api, URL,
    fetch(input, init) { calls.push({ input, init }); return Promise.resolve('response'); },
  });
  return { calls, fetch: api.freshHorseFetch };
}
test('horse GET bypasses cache while preserving session, cancellation and URL', async () => {
  const t = setup(), signal = new AbortController().signal;
  const headers = { authorization: 'synthetic-test-only' };
  const url = 'https://example.test/rest/v1/horses?select=id,profile_photo_url';
  await t.fetch(url, { headers, signal });
  assert.equal(t.calls[0].input, url);
  assert.equal(t.calls[0].init.cache, 'no-store');
  assert.equal(t.calls[0].init.headers, headers);
  assert.equal(t.calls[0].init.signal, signal);
});
for (const [path, method] of [
  ['/rest/v1/images', 'GET'], ['/storage/v1/object/public/images/profiles/portrait.jpg', 'GET'],
  ['/auth/v1/token', 'POST'], ['/rest/v1/horses', 'PATCH'],
]) test(`${method} ${path} is forwarded unchanged`, async () => {
  const t = setup(), init = { method, cache: 'default' };
  const url = new URL(`https://example.test${path}`);
  await t.fetch(url, init);
  assert.equal(t.calls[0].input, url);
  assert.equal(t.calls[0].init, init);
});
