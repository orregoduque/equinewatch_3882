import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compiled = ts.transpileModule(readFileSync('src/utils/timelapseFrames.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const api = {};
vm.runInNewContext(compiled, { exports: api, URL, DOMException, AbortController });

test('15 fps gives a full hour of 360 photos a nominal duration of 24 seconds', () => {
  assert.equal(api.TIMELAPSE_FPS, 15);
  assert.equal(360 / api.TIMELAPSE_FPS, 24);
  assert.equal(30 / api.TIMELAPSE_FPS, 2);
  assert.equal(api.TIMELAPSE_FRAME_MS, 1000 / 15);
});

test('only three frames load at a time; advancing releases old blobs, close releases all', async () => {
  const loaded = [], released = [], signals = [];
  const buffer = new api.TimelapseFrames(360, async (index, signal) => {
    loaded.push(index); signals.push(signal); return `blob:${index}`;
  }, url => released.push(url));
  assert.equal(await buffer.frame(0), 'blob:0');
  assert.deepEqual(loaded, [0, 1, 2]);
  assert.equal(await buffer.frame(1), 'blob:1');
  assert.deepEqual(loaded, [0, 1, 2, 3]);
  assert.deepEqual(released, ['blob:0']);
  for (let i = 2; i < 360; i++) {
    await buffer.frame(i);
    assert(loaded.length - released.length <= 3);
  }
  buffer.close();
  assert.equal(released.length, 360);
  assert(signals.every(signal => signal.aborted));
  await assert.rejects(buffer.frame(0), { name: 'AbortError' });
});

test('closing aborts pending preloads and revokes blobs that resolve after close', async () => {
  const resolves = [], signals = [], released = [];
  const buffer = new api.TimelapseFrames(360, (i, signal) => {
    signals.push(signal);
    return new Promise(resolve => resolves.push(() => resolve(`blob:${i}`)));
  }, url => released.push(url));
  const first = buffer.frame(0);
  buffer.close();
  assert.equal(signals.length, 3);
  assert(signals.every(signal => signal.aborted));
  resolves.forEach(resolve => resolve());
  await assert.rejects(first, { name: 'AbortError' });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(released.sort(), ['blob:0', 'blob:1', 'blob:2']);
});

test('a short hour preloads only its actual photos; replay reuses metadata', async () => {
  const loads = [];
  const buffer = new api.TimelapseFrames(2, async index => {
    loads.push(index); return `blob:${index}`;
  }, () => {});
  await buffer.frame(0);
  assert.deepEqual(loads, [0, 1]);
  await buffer.frame(1);
  await buffer.frame(0);
  assert.deepEqual(loads, [0, 1, 0]);
  buffer.close();
});
