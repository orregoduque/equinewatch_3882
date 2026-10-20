import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync('src/utils/supabase.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const api = {};
vm.runInNewContext(compiled, {
  exports: api, URLSearchParams,
  require: () => ({ createClient: () => ({}) }),
});

test('original image URLs keep the public object route and encode path segments, not slashes', () => {
  const url = new URL(api.getImageUrl('horse folder/mejorada #1+ñ?.jpg'));
  assert.equal(url.pathname, '/storage/v1/object/public/images/horse%20folder/mejorada%20%231%2B%C3%B1%3F.jpg');
  assert.equal(url.search, '');
});

test('thumbnail URLs request the render route with width, quality and contain resize', () => {
  const url = new URL(api.getImageUrl('horse folder/enhanced.jpg', { width: 320, quality: 60 }));
  assert.equal(url.pathname, '/storage/v1/render/image/public/images/horse%20folder/enhanced.jpg');
  assert.deepEqual([...url.searchParams], [['width', '320'], ['quality', '60'], ['resize', 'contain']]);
});

test('render requests use the default quality when omitted', () => {
  assert.equal(new URL(api.getImageUrl('enhanced.jpg', { width: 320 })).searchParams.get('quality'), '60');
});
