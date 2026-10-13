import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(
  readFileSync('src/pages/daily-summary/detectionAnalysis.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api, Intl, Date, Number });
const parse = value => JSON.parse(JSON.stringify(api.parseDetectionAnalysis(value)));

test('parses the recorded positive detection and decimal-comma confidence', () => {
  assert.deepEqual(parse(
    'Caballo detectado. Confianza: 78,3 %. Modelo: Encantador YOLO26n.',
  ), {
    outcome: 'detected',
    confidence: 78.3,
    threshold: null,
    model: 'Encantador YOLO26n',
    rawText: 'Caballo detectado. Confianza: 78,3 %. Modelo: Encantador YOLO26n.',
  });
});

test('parses no-detection status, threshold and model without claiming certainty', () => {
  assert.deepEqual(parse(
    'Caballo no detectado (umbral: 35 %). Modelo: Encantador YOLO26n.',
  ), {
    outcome: 'not_detected',
    confidence: null,
    threshold: 35,
    model: 'Encantador YOLO26n',
    rawText: 'Caballo no detectado (umbral: 35 %). Modelo: Encantador YOLO26n.',
  });
});

test('retains uninterpretable and structured analyses instead of inventing a result', () => {
  for (const value of [null, '', { status: 'pending' }, 'La imagen está borrosa']) {
    const result = api.parseDetectionAnalysis(value);
    assert.equal(result.outcome, 'unknown');
  }
  assert.equal(api.parseDetectionAnalysis({ status: 'pending' }).rawText, '{\n  "status": "pending"\n}');
});

test('ignores malformed confidence and threshold percentages', () => {
  const result = api.parseDetectionAnalysis(
    'Caballo detectado. Confianza: 101 %. Umbral: -2 %. Modelo: YOLO26n.',
  );
  assert.equal(result.outcome, 'detected');
  assert.equal(result.confidence, null);
  assert.equal(result.threshold, null);
});

test('formats localized confidence and readable hours, minutes and seconds', () => {
  assert.equal(api.formatDetectionPercentage(78.3), '78,3 %');
  assert.equal(api.formatDetectionDuration(0), '0 s');
  assert.equal(api.formatDetectionDuration(10), '10 s');
  assert.equal(api.formatDetectionDuration(60), '1 min 0 s');
  assert.equal(api.formatDetectionDuration(3660), '1 h 1 min 0 s');
});

test('each positive photo adds 10 seconds, without adding missing or unknown periods', () => {
  const summary = api.summarizeDetectionAnalyses([
    'Caballo detectado. Confianza: 78,3 %. Modelo: Encantador YOLO26n.',
    'Caballo detectado. Confianza: 80,1 %. Modelo: Encantador YOLO26n.',
    'Caballo no detectado (umbral: 35 %). Modelo: Encantador YOLO26n.',
    null,
  ]);
  assert.equal(summary.totalPhotos, 4);
  assert.equal(summary.detectedPhotos, 2);
  assert.equal(summary.notDetectedPhotos, 1);
  assert.equal(summary.unknownPhotos, 1);
  assert.equal(summary.estimatedPresenceSeconds, 20);
  assert.equal(summary.analyzedSeconds, 40);
  assert(Math.abs(summary.averageConfidence - 79.2) < 0.00001);
  assert.deepEqual(Array.from(summary.models), ['Encantador YOLO26n']);
  assert.deepEqual(Array.from(summary.thresholds), [35]);
});

test('a full day with a photo every 10 seconds counts as 24 hours of analyzed time', () => {
  const summary = api.summarizeDetectionAnalyses(new Array(8640).fill('Caballo detectado.'));
  assert.equal(summary.estimatedPresenceSeconds, 86400);
  assert.equal(api.formatDetectionDuration(summary.analyzedSeconds), '24 h 0 min 0 s');
});

test('no photos or only unknown analyses do not fabricate a confidence or a detection', () => {
  for (const values of [[], [null, 'Otro formato']]) {
    const summary = api.summarizeDetectionAnalyses(values);
    assert.equal(summary.averageConfidence, null);
    assert.equal(summary.detectedPhotos, 0);
    assert.equal(summary.estimatedPresenceSeconds, 0);
  }
});
