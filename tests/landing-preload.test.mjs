import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const html = readFileSync('index.html', 'utf8');
const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)]
  .map(match => match[1]).find(value => value.includes('heroPreload'));

test('only the landing page preloads the hero image', () => {
  assert(script, 'Landing-specific resource hint must exist');
  for (const pathname of ['/', '/login', '/horse-list', '/horse-timeline', '/daily-summary']) {
    const links = [];
    vm.runInNewContext(script, {
      window: { location: { pathname } },
      document: { createElement: () => ({}), head: { appendChild: link => links.push(link) } },
    });
    assert.equal(links.length, pathname === '/' ? 1 : 0);
    if (links.length) {
      assert.equal(links[0].href, '/hero-horse.webp');
      assert.equal(links[0].rel, 'preload');
      assert.equal(links[0].as, 'image');
    }
  }
});
