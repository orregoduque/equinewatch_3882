// Small, reproducible demo asset. No camera access or AI generation service.
import { execFileSync } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('public/media/hls-demo-5s.mp4');
await mkdir(resolve('public/media'), { recursive: true });
const font = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
const filter = [
  'scale=960:960,crop=960:720:0:180',
  "zoompan=z='1.03+0.025*sin(2*PI*on/75)':x='iw/2-iw/(2*zoom)':y='ih/2-ih/(2*zoom)':d=75:s=640x480:fps=15",
  'drawbox=x=0:y=0:w=iw:h=44:color=black@0.75:t=fill',
  `drawtext=fontfile=${font}:text='SIMULACION - NO ES EN DIRECTO':fontcolor=white:fontsize=18:x=18:y=13`,
  'drawbox=x=0:y=ih-38:w=iw:h=38:color=black@0.75:t=fill',
  `drawtext=fontfile=${font}:text='5 SEGUNDOS - BUCLE DE PRUEBA':fontcolor=white:fontsize=16:x=18:y=h-26`,
  'format=yuv420p',
].join(',');
execFileSync('ffmpeg', [
  '-y', '-hide_banner', '-loglevel', 'error', '-i', resolve('public/hero-horse.webp'),
  '-vf', filter, '-frames:v', '75', '-t', '5', '-an',
  '-c:v', 'libx264', '-profile:v', 'baseline', '-level:v', '3.0',
  '-preset', 'medium', '-crf', '30', '-maxrate', '480k', '-bufsize', '480k',
  '-g', '15', '-keyint_min', '15', '-sc_threshold', '0',
  '-movflags', '+faststart', output,
], { stdio: 'inherit' });
const info = await stat(output);
if (info.size > 512 * 1024) throw new Error('Demo unexpectedly large; keep this reproducible asset below 512 KiB.');
console.log(`Created 5-second silent H264 demo (${Math.round(info.size / 1024)} KiB).`);
