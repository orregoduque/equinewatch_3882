import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const { jsPDF: RealPDF } = require('jspdf');
const analysisHelpers = {};
vm.runInNewContext(ts.transpileModule(
  readFileSync('src/pages/daily-summary/detectionAnalysis.ts', 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText, { exports: analysisHelpers, Intl, Date, Number });
const photoDetection = {
  id: 'photo-detection-one',
  createdAt: '2026-10-11T10:05:00Z',
  analysis: {
    outcome: 'detected', confidence: 78.3, threshold: null,
    model: 'Encantador YOLO26n',
    rawText: 'Caballo detectado. Confianza: 78,3 %. Modelo: Encantador YOLO26n.',
  },
};
const compiled = ts.transpileModule(readFileSync('src/pages/daily-summary/index.tsx', 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React, esModuleInterop: true,
  },
}).outputText;

function fixture({ noSummary = false, noHorse = false, failImport = false } = {}) {
  const state = [
    new Date('2026-10-11T12:00:00Z'), false,
    noSummary ? null : {
      date: new Date('2026-10-11T12:00:00Z'),
      timeDistribution: [],
      temperatureTrends: [],
      detectionSummary: analysisHelpers.summarizeDetectionAnalyses([photoDetection.analysis.rawText]),
    },
    noHorse ? '' : 'owned-horse', '', '', false, '',
  ];
  const saved = [];
  const scope = {
    viewerKey: 'owner-one:horse_owner',
    viewer: { id: 'owner-one', email: 'owner@example.test', role: 'horse_owner' },
    horses: [{ id: 'owned-horse', name: 'Owned Horse', breed: 'Test breed', is_active: true }],
    isLoading: false,
  };
  const refs = [];
  const effects = [];
  let stateIndex = 0, refIndex = 0, imports = 0, onImport;
  const React = {
    Fragment: Symbol('Fragment'),
    createElement(type, props, ...children) { return { type, props: { ...props, children } }; },
    useState() {
      const index = stateIndex++;
      return [state[index], value => { state[index] = value; }];
    },
    useEffect(callback) { effects.push(callback); },
    useRef(initial) {
      const index = refIndex++;
      refs[index] ??= { current: initial };
      return refs[index];
    },
  };
  class PDF extends RealPDF {
    constructor() {
      super();
      // Exercise the real PDF generation without writing files or opening a browser download.
      this.save = name => saved.push({ name, data: this.output() });
    }
  }
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require(id) {
      if (id === 'react') return { __esModule: true, default: React, ...React };
      if (id === 'react-router-dom') return { useSearchParams: () => [new URLSearchParams(), () => {}] };
      if (id.endsWith('/hooks/useAccessibleHorses')) return { useAccessibleHorses: () => scope };
      if (id.endsWith('/utils/supabase')) return {
        fetchDetectionsForDay: async () => [{
          id: photoDetection.id,
          created_at: photoDetection.createdAt,
          analysis: photoDetection.analysis.rawText,
        }],
        fetchTemperaturesForDay: async () => [],
      };
      if (id === './detectionAnalysis') return analysisHelpers;
      if (id === 'jspdf') {
        imports++;
        onImport?.();
        if (failImport) throw new Error('PDF library could not be downloaded');
        return { __esModule: true, jsPDF: PDF };
      }
      return { __esModule: true, default: () => null, Helmet: () => null };
    },
  });
  function render() {
    stateIndex = 0; refIndex = 0;
    effects.length = 0;
    return exports.default();
  }
  function nodes(node) {
    if (Array.isArray(node)) return node.flatMap(nodes);
    if (!node || typeof node !== 'object') return [];
    return [node, ...nodes(node.props?.children)];
  }
  function button() {
    return nodes(render()).find(node => node.type === 'button' && 'aria-busy' in node.props);
  }
  return {
    state, saved, scope, button, render, nodes, effects,
    imports: () => imports,
    setOnImport(fn) { onImport = fn; },
  };
}

test('Insights does not load PDF code until export is requested, then generates a real PDF', async () => {
  const f = fixture();
  const button = f.button();
  assert.equal(f.imports(), 0);
  assert.equal(button.props.disabled, false);
  const exporting = button.props.onClick();
  assert.equal(f.state[6], true, 'Export must show its busy state');
  await exporting;
  assert.equal(f.imports(), 1);
  assert.equal(f.saved.length, 1, f.state[7]);
  assert(f.saved[0].name.includes('Owned_Horse'));
  assert(f.saved[0].data.startsWith('%PDF-'));
  assert(f.saved[0].data.includes('Owned Horse'));
  assert(f.saved[0].data.includes('Fotos con detecci'));
  assert(f.saved[0].data.includes('78,3'));
  assert(f.saved[0].data.includes('10 s'));
  assert(!f.saved[0].data.includes('Resultado de cada foto'));
  assert.equal(f.state[6], false);
});

test('no horse or no loaded summary prevents an export and PDF import', async () => {
  for (const options of [{ noSummary: true }, { noHorse: true }]) {
    const f = fixture(options);
    const button = f.button();
    assert.equal(button.props.disabled, true);
    await button.props.onClick();
    assert.equal(f.imports(), 0);
    assert.equal(f.saved.length, 0);
  }
});

test('a PDF load failure shows an error and leaves export available for retry', async () => {
  const f = fixture({ failImport: true });
  await f.button().props.onClick();
  assert.equal(f.state[6], false);
  assert.equal(f.saved.length, 0);
  assert(f.nodes(f.render()).some(node => node.props?.role === 'alert'));
  assert.equal(f.button().props.disabled, false);
});

test('changing the account, horse or date while PDF loads never exports the stale report', async () => {
  for (const change of ['account', 'horse', 'date']) {
    const f = fixture();
    f.setOnImport(() => {
      if (change === 'account') f.scope.viewerKey = 'owner-two:horse_owner';
      if (change === 'horse') f.state[3] = 'another-horse';
      if (change === 'date') f.state[0] = new Date('2026-10-12T12:00:00Z');
      f.render();
    });
    await f.button().props.onClick();
    assert.equal(f.saved.length, 0, `${change} transition must discard the old export`);
    assert.equal(f.state[6], false);
  }
});

test('loading the selected day builds an actual detection time summary and real hourly totals', async () => {
  const f = fixture();
  f.render();
  f.effects[1]();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(f.state[1], false);
  assert.equal(f.state[2].detectionSummary.estimatedPresenceSeconds, 10);
  assert.equal(f.state[2].detectionSummary.totalPhotos, 1);
  assert.equal(f.state[2].timeDistribution.reduce((total, hour) => total + hour.count, 0), 1);
});
