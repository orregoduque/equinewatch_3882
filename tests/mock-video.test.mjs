import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { statSync } from 'node:fs';
import test from 'node:test';

test('the repeatable demo is exactly five seconds of small silent browser-compatible H264', () => {
  const path = 'public/media/hls-demo-5s.mp4';
  const metadata = JSON.parse(execFileSync('ffprobe', [
    '-v', 'error', '-show_entries',
    'format=duration:stream=codec_type,codec_name,profile,pix_fmt,width,height,avg_frame_rate,nb_frames',
    '-of', 'json', path,
  ], { encoding: 'utf8' }));
  assert.equal(Number(metadata.format.duration), 5);
  assert.equal(metadata.streams.length, 1);
  const video = metadata.streams[0];
  assert.equal(video.codec_type, 'video');
  assert.equal(video.codec_name, 'h264');
  assert.match(video.profile, /Baseline/);
  assert.equal(video.pix_fmt, 'yuv420p');
  assert.equal(video.width, 640);
  assert.equal(video.height, 480);
  assert.equal(video.avg_frame_rate, '15/1');
  assert.equal(Number(video.nb_frames), 75);
  assert(statSync(path).size < 512 * 1024, 'small demo belongs with existing public assets');
});
