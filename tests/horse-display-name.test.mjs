import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

const api = {};
vm.runInNewContext(ts.transpileModule(readFileSync('src/utils/horseDisplayName.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, { exports: api });
const thunderId = 'd826a274-58ea-4a55-8fd2-1d4c78222ab1';

test('Sancho is a display-only alias by ID; original record and integration fields remain intact', () => {
  const row = Object.freeze({
    id: thunderId, name: 'Thunder', owner_id: 'unchanged-owner', photo_backend: 'wasabi',
    profile_photo_url: 'https://example.test/portrait.jpg', camera_id: 'bacata-thunder',
  });
  const display = api.withHorseDisplayName(row);
  assert.equal(display.name, 'Sancho');
  assert.equal(row.name, 'Thunder');
  assert.notEqual(display, row);
  for (const field of Object.keys(row).filter(field => field !== 'name'))
    assert.equal(display[field], row[field]);
});

test('alias follows the ID, never a text replacement or another horse named Thunder', () => {
  for (const name of ['Thunder', 'THUNDER', null, 'Another stored name'])
    assert.equal(api.withHorseDisplayName({ id: thunderId, name }).name, 'Sancho');
  assert.equal(api.withHorseDisplayName({ id: thunderId.toUpperCase(), name: 'Thunder' }).name, 'Sancho');
  for (const name of ['Thunder', 'Lucero', 'Tessa', 'Velvet Vitalis', 'Golden Girl', null]) {
    const row = { id: 'another-horse', name };
    assert.equal(api.withHorseDisplayName(row), row);
  }
});

test('both UI entry points use alias while database reads remain unmodified', () => {
  for (const file of ['src/hooks/useAccessibleHorses.ts', 'src/features/horse-details/useHorseDetails.ts'])
    assert.match(readFileSync(file, 'utf8'), /withHorseDisplayName/);
  for (const file of ['src/utils/supabase.ts', 'src/features/horse-details/api.ts'])
    assert.doesNotMatch(readFileSync(file, 'utf8'), /withHorseDisplayName|Sancho/);
});
