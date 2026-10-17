import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

function moduleAt(path, require = () => { throw new Error('Unexpected import'); }) {
  const compiled = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, require, AbortController, performance, fetch,
    setTimeout, clearTimeout, setInterval, clearInterval,
    console: { warn() {} },
  });
  return exports;
}
const measurement = moduleAt('src/features/hls-pilot/measurement.ts');
const access = moduleAt('src/features/hls-pilot/access.ts');
const { startPilotPlayback } = moduleAt('src/features/hls-pilot/playback.ts', name => {
  if (name === './measurement') return measurement;
  if (name === './access') return access;
  throw new Error('Unexpected import: ' + name);
});

function videoFixture({ blocked = false } = {}) {
  let next = 0;
  const frames = new Map(), listeners = new Map();
  return {
    preload: 'none', src: '', paused: true, readyState: 0, networkState: 0,
    seekable: { length: 0 },
    playCalls: 0, loadCalls: 0,
    canPlayType() { return 'maybe'; },
    addEventListener(name, callback) { listeners.set(name, callback); },
    removeEventListener(name) { listeners.delete(name); },
    requestVideoFrameCallback(callback) { const id = ++next; frames.set(id, callback); return id; },
    cancelVideoFrameCallback(id) { frames.delete(id); },
    load() { this.loadCalls++; }, // Faithfully honors no automatic media download/playback.
    play() {
      this.playCalls++;
      if (blocked) return Promise.reject(new Error('NotAllowedError'));
      this.paused = false;
      return Promise.resolve();
    },
    pause() { this.paused = true; },
    removeAttribute(name) { if (name === 'src') this.src = ''; },
    frame(mediaTime, presentedFrames) {
      const [id, callback] = frames.entries().next().value;
      frames.delete(id);
      this.readyState = 4;
      callback(performance.now(), { mediaTime, presentedFrames });
    },
    pendingFrames() { return frames.size; },
  };
}

test('native HLS explicitly starts playback without waiting for a preload-none loadeddata event', async () => {
  const video = videoFixture(), errors = [], statuses = [], results = [];
  let moving = 0;
  const dispose = startPilotPlayback(video, 'synthetic', {
    request: async () => ({ ready: true, playbackUrl: '/api/hls-pilot/media/synthetic/index.m3u8' }),
    onStatus: status => statuses.push(status), onError: error => errors.push(error),
    onThreshold() {}, onMeasurement: value => results.push(value), onMoving() { moving++; },
  });
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(video.preload, 'auto', 'only enable media loading after authorization');
    assert.equal(video.playCalls, 1, 'must call play even if loadeddata never fires first');
    assert(!video.paused);
    assert.equal(moving, 0, 'play promise alone must not count as first motion');
    video.frame(1, 1);
    assert.equal(moving, 0, 'a single frame is not motion');
    video.frame(1.04, 2);
    assert.equal(moving, 1);
    assert.equal(results.length, 1);
    assert.equal(errors.length, 0);
    assert(statuses.includes('Reproduciendo · retraso real no medido'));
  } finally { dispose(); }
  assert(video.paused && video.src === '');
  assert.equal(video.pendingFrames(), 0);
});

test('native play rejection produces an actionable error, not a 12 second silent wait', async () => {
  const video = videoFixture({ blocked: true }), errors = [];
  const dispose = startPilotPlayback(video, 'synthetic', {
    request: async () => ({ ready: true, playbackUrl: '/api/hls-pilot/media/synthetic/index.m3u8' }),
    onStatus() {}, onError: error => errors.push(error),
    onThreshold() {}, onMeasurement() {}, onMoving() { assert.fail('not playing'); },
  });
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /bloqueó la reproducción/);
    assert(video.paused && video.src === '');
  } finally { dispose(); }
});

test('authorized preloading stays paused and measures only advancing frames after activation', async () => {
  const video = videoFixture(), results = [], errors = [];
  let moving = 0, now = 0;
  const stop = startPilotPlayback(video, 'synthetic', {
    request: async () => ({ ready: true, playbackUrl: '/api/hls-pilot/media/synthetic/index.m3u8' }),
    onStatus() {}, onError: error => errors.push(error), onThreshold() {},
    onMeasurement: result => results.push(result), onMoving() { moving++; },
  }, measurement.createStartupMeasurement(() => now), true);
  try {
    await new Promise(resolve => setImmediate(resolve));
    assert(video.src.endsWith('index.m3u8'));
    assert(video.paused);
    assert.equal(video.playCalls, 0);
    now = 8000;
    stop.activate(measurement.createStartupMeasurement(() => now));
    assert.equal(video.playCalls, 1);
    now = 8100;
    video.frame(1, 1);
    now = 8200;
    video.frame(1.04, 2);
    assert.equal(moving, 1);
    assert.equal(results[0].clickToMotionMs, 200, 'exclude time spent preloading before the click');
    assert.equal(errors.length, 0);
  } finally { stop(); }
});
