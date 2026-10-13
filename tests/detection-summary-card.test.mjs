import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const compile = path => ts.transpileModule(readFileSync(path, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React, esModuleInterop: true,
  },
}).outputText;
const helpers = {};
vm.runInNewContext(compile('src/pages/daily-summary/detectionAnalysis.ts'), { exports: helpers, Intl, Number });
const component = {};
vm.runInNewContext(compile('src/pages/daily-summary/components/DetectionSummaryCard.tsx'), {
  exports: component,
  require(id) {
    if (id === 'react') return React;
    if (id === '../detectionAnalysis') return helpers;
    return { __esModule: true, default: () => React.createElement('span', { 'aria-hidden': true }) };
  },
});
const render = (values, error) => renderToStaticMarkup(React.createElement(component.default, {
  summary: helpers.summarizeDetectionAnalyses(values), error,
}));

test('the visible summary shows estimated presence time but no photo-by-photo details', () => {
  const html = render([
    'Caballo detectado. Confianza: 78,3 %. Modelo: Encantador YOLO26n.',
    'Caballo detectado. Confianza: 80,1 %. Modelo: Encantador YOLO26n.',
    'Caballo no detectado (umbral: 35 %). Modelo: Encantador YOLO26n.',
  ]);
  assert(html.includes('Tiempo estimado en la pesebrera'));
  assert(html.includes('20 s'));
  assert(html.includes('30 s'));
  assert(html.includes('79,2 %'));
  assert(!html.includes('Detalle por foto'));
  assert(!html.includes('<ol'));
  assert(!html.includes('Ver texto guardado'));
});

test('without photos, the summary shows no data rather than claiming the horse was absent', () => {
  const html = render([]);
  assert(html.includes('No hay fotos analizadas'));
  assert(!html.includes('Tiempo estimado en la pesebrera'));
});

test('uninterpretable analyses are disclosed without a definitive presence estimate', () => {
  const html = render([null, 'Formato anterior']);
  assert(html.includes('No disponible'));
  assert(html.includes('no se pudieron interpretar'));
});

test('a load error is visible and does not show incomplete duration estimates', () => {
  const html = render([], 'No se pudo cargar una página');
  assert(html.includes('role="alert"'));
  assert(html.includes('Análisis no disponibles'));
  assert(!html.includes('Tiempo estimado en la pesebrera'));
});
