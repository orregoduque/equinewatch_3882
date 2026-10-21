import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const compiled = ts.transpileModule(readFileSync('src/pages/horse-timeline/index.tsx', 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React, esModuleInterop: true,
  },
}).outputText;
const photo = id => ({
  id, horse_id: 'owned-horse', image_number: id,
  created_at: new Date(1_790_000_000_000 + id * 10_000).toISOString(),
  uploaded_at: '2026-09-01T12:00:00Z', is_processed: true,
  storage_path_enhanced: `${id}.jpg`,
});
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...(tree.props?.children || []).flat(Infinity).flatMap(nodes)];
}
function fixture() {
  const state = [], refs = [], effects = [];
  let stateIndex = 0, refIndex = 0, watcher, stops = 0;
  const React = {
    Fragment: Symbol('Fragment'),
    createElement(type, props, ...children) { return { type, props: { ...props, children } }; },
    useState(initial) {
      const index = stateIndex++;
      if (index === state.length) state.push(initial);
      return [state[index], value => {
        state[index] = typeof value === 'function' ? value(state[index]) : value;
      }];
    },
    useMemo(fn) { return fn(); },
    useEffect(fn) { effects.push(fn); },
    useRef(initial) {
      const index = refIndex++;
      refs[index] ??= { current: initial };
      return refs[index];
    },
  };
  const scope = {
    horses: [{ id: 'owned-horse', name: 'Owned Horse', created_at: '2026-09-01T12:00:00Z' }],
    viewer: { id: 'owner', role: 'horse_owner', email: 'owner@example.test' },
    viewerKey: 'owner:horse_owner', isLoading: false, error: '',
  };
  const api = {};
  vm.runInNewContext(compiled, {
    exports: api,
    require(id) {
      if (id === 'react') return { __esModule: true, default: React, ...React };
      if (id === 'date-fns') return require(id);
      if (id === 'react-router-dom') return {
        useSearchParams: () => [new URLSearchParams('horseId=owned-horse'), () => {}],
      };
      if (id.endsWith('/useAccessibleHorses')) return { useAccessibleHorses: () => scope };
      if (id.endsWith('/useHourlyHorseImages')) return {
        useHourlyHorseImages: () => ({ images: [], loading: false, error: '' }),
      };
      if (id.endsWith('/utils/liveHorseImages')) return {
        watchHorseImages(options) { watcher = options; return () => { stops++; }; },
      };
      if (id.endsWith('/utils/supabase')) return {
        getImageUrl: (path, options) => options?.width
          ? `/thumbnails/${path}?width=${options.width}&quality=${options.quality}&resize=contain`
          : `/images/${path}`,
      };
      return { __esModule: true, default: () => null, Helmet: () => null };
    },
  });
  const render = () => {
    stateIndex = 0; refIndex = 0; effects.length = 0;
    return api.default();
  };
  render();
  effects[0]();
  render();
  const stop = effects[1]();
  return {
    render, state, stop, get stops() { return stops; }, get watcher() { return watcher; },
    receive(rows) { watcher.onImages(rows); watcher.onError(null); watcher.onSettled(); },
    main(tree) {
      return nodes(tree).find(node => node.props?.src && node.props?.key?.startsWith('obs-'));
    },
  };
}

test('thumbnail sources wait for the displayed main photo, including a new arrival', () => {
  const f = fixture();
  const thumbnails = tree => nodes(tree).filter(node => node.props?.originalSrc && 'enabled' in node.props);
  f.receive([photo(1)]);
  let tree = f.render();
  assert(thumbnails(tree).every(node => node.props.enabled === false));
  const oldLoad = f.main(tree).props.onLoad;
  oldLoad();
  tree = f.render();
  assert(thumbnails(tree).every(node => node.props.enabled === true));
  f.receive([photo(2), photo(1)]);
  oldLoad(); // A late event from a different photo must not open the new gate.
  tree = f.render();
  assert(thumbnails(tree).every(node => node.props.enabled === false));
  f.main(tree).props.onLoad();
  assert(thumbnails(f.render()).every(node => node.props.enabled === true));
  f.stop();
});

test('a main photo error releases deferred thumbnails and preserves its placeholder fallback', () => {
  const f = fixture();
  f.receive([photo(1)]);
  const target = { getAttribute: () => '/images/1.jpg', src: '/images/1.jpg' };
  f.main(f.render()).props.onError({ currentTarget: target });
  assert.equal(target.src, '/assets/images/no_image.png');
  const thumbnails = nodes(f.render()).filter(node => node.props?.originalSrc && 'enabled' in node.props);
  assert(thumbnails.length > 0);
  assert(thumbnails.every(node => node.props.enabled === true));
  f.stop();
});

test('the main Timeline photo follows new arrivals without manual reload or a loading-screen reset', () => {
  const f = fixture();
  assert.equal(f.watcher.limit, 240);
  assert.equal(f.watcher.horseId, 'owned-horse');
  f.receive([photo(1)]);
  assert.equal(f.main(f.render()).props.src, '/images/1.jpg');
  f.receive([photo(2), photo(1)]);
  assert.equal(f.main(f.render()).props.src, '/images/2.jpg');
  assert.equal(f.state[3], false);
  assert.equal(f.state[5], null);
  f.stop();
  assert.equal(f.stops, 1);
});

test('viewing an older photo stays pinned until the user returns to the newest photo', () => {
  const f = fixture();
  f.receive([photo(2), photo(1)]);
  const thumbnails = nodes(f.render()).filter(node =>
    node.type === 'button' && node.props.className?.includes('w-32'));
  thumbnails[1].props.onClick();
  assert.equal(f.main(f.render()).props.src, '/images/1.jpg');
  f.receive([photo(3), photo(2), photo(1)]);
  const tree = f.render();
  assert.equal(f.main(tree).props.src, '/images/1.jpg');
  const resume = nodes(tree).find(node =>
    node.type === 'button' && node.props.children.includes('Volver a la última foto'));
  assert(resume);
  resume.props.onClick();
  assert.equal(f.main(f.render()).props.src, '/images/3.jpg');
});

test('an initially empty Timeline starts showing photos when the first one arrives', () => {
  const f = fixture();
  f.receive([]);
  assert.equal(f.main(f.render()), undefined);
  f.receive([photo(1)]);
  assert.equal(f.main(f.render()).props.src, '/images/1.jpg');
});

test('a completed enhanced variant remounts the image if the initial file was not ready', () => {
  const f = fixture();
  f.receive([{ ...photo(1), is_processed: false }]);
  const initialKey = f.main(f.render()).props.key;
  f.receive([photo(1)]);
  assert.notEqual(f.main(f.render()).props.key, initialKey);
});

test('the strip uses 320px enhanced thumbnails while the main photo keeps the original JPEG', () => {
  const f = fixture();
  f.receive([photo(2), photo(1)]);
  const tree = f.render();
  const main = f.main(tree);
  assert.equal(main.props.src, '/images/2.jpg');
  assert.equal(main.props.loading, 'eager');
  assert.equal(main.props.fetchpriority, 'high');
  assert.equal(main.props.decoding, 'async');
  const thumbnails = nodes(tree).filter(node => node.props?.originalSrc);
  assert.equal(thumbnails.length, 2);
  assert.equal(thumbnails[0].props.src, '/thumbnails/2.jpg?width=320&quality=60&resize=contain');
  assert.equal(thumbnails[0].props.originalSrc, '/images/2.jpg');
  assert.equal(thumbnails[1].props.originalSrc, '/images/1.jpg');
});
