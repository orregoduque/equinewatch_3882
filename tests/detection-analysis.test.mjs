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

test('parses the recorded positive detection and decimal-comma confidence', () => {
  assert.deepEqual(api.parseDetectionAnalysis(
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
  assert.deepEqual(api.parseDetectionAnalysis(
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

test('formats localized confidence and photo timestamps', () => {
  assert.equal(api.formatDetectionPercentage(78.3), '78,3 %');
  assert.equal(api.formatDetectionTime('2026-10-13T10:05:00Z'), new Date('2026-10-13T10:05:00Z')
    .toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }));
  assert.equal(api.formatDetectionTime('bad date'), 'Hora no disponible');
});
