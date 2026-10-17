// Test pattern only, never a real camera or an authentication bypass.
import { mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
const directory = resolve('generated-artifacts/hls-fixture');
await mkdir(directory, { recursive: true });
execFileSync('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error',
  '-f', 'lavfi', '-i', 'testsrc2=size=640x480:rate=15', '-t', '12',
  '-an', '-c:v', 'libx264', '-preset', 'ultrafast', '-profile:v', 'baseline',
  '-pix_fmt', 'yuv420p', '-g', '15', '-keyint_min', '15', '-sc_threshold', '0',
  '-b:v', '800k', '-f', 'hls', '-hls_time', '1', '-hls_list_size', '0',
  '-hls_flags', 'independent_segments', '-hls_segment_filename', directory + '/%03d.ts',
  directory + '/index.m3u8',
]);
console.log('Synthetic 640x480 H264 browser fixture prepared in ignored generated-artifacts/hls-fixture.');
