import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function render(path, horse) {
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.React, esModuleInterop: true,
    },
  }).outputText;
  const api = {};
  const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
  vm.runInNewContext(compiled, {
    exports: api,
    require(id) {
      if (id === 'react') return { __esModule: true, default: React };
      if (id.endsWith('/AppImage')) return { __esModule: true, default: 'ProfileImage' };
      if (id.endsWith('/useHorseDetails')) return {
        useHorseDetails: () => ({ horse, isLoading: false, error: '', needsLogin: false, retry() {} }),
      };
      if (id.endsWith('/formatDateOfBirth')) return { formatDateOfBirth: () => '—' };
      if (/supabase|camera|photoFallback|useAuth/i.test(id))
        throw new Error(`Profile rendering must not query camera data: ${id}`);
      return { __esModule: true, default: () => null };
    },
  });
  return api.default({ horse });
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...(tree.props?.children || []).flat(Infinity).flatMap(nodes)];
}
for (const [name, path] of [
  ['card', 'src/pages/horse-list/components/HorseCard.tsx'],
  ['header', 'src/pages/horse-details/index.tsx'],
]) {
  for (const profile of [
    'https://example.test/profiles/horse.png?version=2', null, '', '  ',
  ]) {
    test(`${name} renders the profile field directly (${JSON.stringify(profile)}) without camera access`, () => {
      const tree = render(path, { id: 'fixture-horse', name: 'Fixture', profile_photo_url: profile });
      const image = nodes(tree).find(node => node.type === 'ProfileImage');
      assert(image);
      assert.equal(image.props.src, profile?.trim() ? profile : '/assets/images/no_image.png');
      if (name === 'card') {
        const links = nodes(tree).filter(node => node.props?.to);
        assert.deepEqual(links.map(link => link.props.to), [
          '/horse-timeline?horseId=fixture-horse', '/horses/fixture-horse',
        ]);
        assert(nodes(links[0]).includes(image), 'Only the portrait links to the camera timeline');
      }
    });
  }
}
