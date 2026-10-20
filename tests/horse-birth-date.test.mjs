import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync('src/features/horse-details/formatDateOfBirth.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api });
for (const [value, expected] of [
  ['2015-07-12', '12/07/2015'],
  ['2022-12-09', '09/12/2022'],
  ['2024-02-29', '29/02/2024'],
  [null, '—'], [undefined, '—'], ['', '—'],
  ['2023-02-29', '—'], ['invalid', '—'],
]) {
  test(`birth date ${value} displays as ${expected}`, () => {
    assert.equal(api.formatDateOfBirth(value), expected);
  });
}
