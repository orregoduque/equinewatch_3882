import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const lucide = require('lucide-react');
const exports = {};
const compiled = ts.transpileModule(readFileSync('src/components/AppIcon.tsx', 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    jsx: ts.JsxEmit.React,
    esModuleInterop: true,
  },
}).outputText;
vm.runInNewContext(compiled, { exports, require });
const Icon = exports.default;

function sourceFiles(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(file) : /\.tsx?$/.test(file) ? [file] : [];
  });
}

test('the small icon registry covers the icons used in the app, including conditional names', () => {
  const names = new Set();
  function collectStrings(node) {
    if (ts.isStringLiteral(node) && lucide[node.text]) names.add(node.text);
    ts.forEachChild(node, collectStrings);
  }
  for (const file of sourceFiles('src')) {
    const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    function visit(node) {
      if (ts.isJsxAttribute(node) && ['name', 'icon', 'iconName'].includes(node.name.getText(source))) {
        collectStrings(node);
      }
      if (ts.isPropertyAssignment(node) && node.name.getText(source) === 'icon') {
        collectStrings(node.initializer);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
  }
  assert(names.size > 50, 'Inventory must include the app data-driven icons');
  for (const name of names) {
    assert.equal(Icon({ name }).type, lucide[name], `Missing app icon: ${name}`);
  }
});

test('kebab-case icon names and unknown-icon fallback still work', () => {
  assert.equal(Icon({ name: 'arrow-left' }).type, lucide.ArrowLeft);
  const fallback = Icon({ name: 'not-an-app-icon' });
  assert.equal(fallback.type, lucide.HelpCircle);
  assert.equal(fallback.props.color, 'gray');
});
