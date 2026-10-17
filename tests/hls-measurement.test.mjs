import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync('src/features/hls-pilot/measurement.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api });

test('click measurement includes all preparation and requires advancing presented frames', () => {
  let time = 100;
  const measure = api.createStartupMeasurement(() => time);
  time += 700;
  assert.equal(measure.elapsed(), 700, 'discovery time is available before playback starts');
  measure.mark('authorizationMs');
  time += 800;
  measure.mark('playerReadyMs');
  time += 800;
  assert.equal(measure.frame(2, 1), false);
  assert.equal(measure.frame(2, 2), false, 'a frozen frame is not movement');
  assert.equal(measure.frame(2.04, 1), false, 'presentation count must also advance');
  time += 40;
  assert.equal(measure.frame(2.04, 2), true);
  const result = measure.finish();
  assert.equal(result.clickToMotionMs, 2340);
  assert.equal(result.authorizationMs, 700);
  assert.equal(result.firstFrameMs, 2300);
  assert.equal(result.outcome, 'within-target');
});

test('three-second misses and failures are never converted into successes or averages', () => {
  let time = 0;
  const slow = api.createStartupMeasurement(() => time);
  time = 3001;
  assert.equal(slow.finish().outcome, 'over-target');
  const failed = api.createStartupMeasurement(() => time);
  time += 200;
  const result = failed.finish('failed', 'Not authorized');
  assert.equal(result.clickToMotionMs, null);
  assert.equal(result.outcome, 'failed');
  assert.equal(failed.finish().outcome, 'failed', 'cleanup must not overwrite failures');
  const cancelled = api.createStartupMeasurement(() => time);
  assert.equal(cancelled.finish('cancelled').outcome, 'cancelled');
});
