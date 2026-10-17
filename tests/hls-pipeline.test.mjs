import assert from 'node:assert/strict';
import { spawn, execFileSync } from 'node:child_process';
import { createServer } from 'node:https';
import { request } from 'node:https';
import { once } from 'node:events';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createReceiver } from '../services/hls-pilot/receiver.mjs';

test('real FFmpeg copy agent publishes synthetic H264 over verified HTTPS into protected decodable HLS', { timeout: 30_000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hls-pipeline-'));
  const uid = '00000000-0000-4000-8000-000000000001';
  const key = 'synthetic-pipeline-device-key-00000000000000';
  let child, receiver, server;
  try {
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', join(directory, 'key.pem'),
      '-out', join(directory, 'cert.pem'), '-days', '1', '-subj', '/CN=127.0.0.1',
      '-addext', 'subjectAltName=IP:127.0.0.1',
    ], { stdio: 'ignore' });
    const source = join(directory, 'synthetic.mp4');
    execFileSync('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=640x480:rate=15',
      '-t', '5', '-an', '-c:v', 'libx264', '-preset', 'ultrafast', '-profile:v', 'baseline',
      '-pix_fmt', 'yuv420p', '-g', '15', '-keyint_min', '15', '-sc_threshold', '0', source,
    ]);
    receiver = createReceiver({
      supabaseUrl: 'https://auth.example.test', supabaseAnonKey: 'public-test-key', adminUserIds: [],
      cameras: [{
        id: 'synthetic', name: 'Synthetic test only', horseId: 'fixture',
        ownerUserIds: [uid], stableOwnerUserIds: [],
        publisherKeySha256: createHash('sha256').update(key).digest('hex'),
      }],
    }, { authenticate: async () => uid });
    const ca = await readFile(join(directory, 'cert.pem'));
    server = createServer({ key: await readFile(join(directory, 'key.pem')), cert: ca }, receiver.handler);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const origin = `https://127.0.0.1:${server.address().port}`;
    const config = {
      rtspUrl: 'rtsp://synthetic.invalid/secondary', receiverOrigin: origin,
      cameraId: 'synthetic', publisherKey: key, confirmedH264IndependentSegments: true,
      caFile: join(directory, 'cert.pem'), spoolRoot: directory,
    };
    const file = join(directory, 'agent.json');
    await writeFile(file, JSON.stringify(config), { mode: 0o600 });
    // Factory injection uses a generated file instead of a LAN camera. Never a runtime auth bypass.
    const script = `
import sys,json,signal,threading
sys.path.insert(0,sys.argv[1])
from agent import relay_epoch,ffmpeg_command
config=json.load(open(sys.argv[2]))
source=sys.argv[3]
stop=threading.Event()
signal.signal(signal.SIGTERM,lambda *_:stop.set())
def command(_source,directory):
    base=ffmpeg_command(_source,directory)
    return ["ffmpeg","-nostdin","-hide_banner","-loglevel","error","-re","-stream_loop","-1","-i",source]+base[base.index("-i")+2:]
relay_epoch(config,stop,command_factory=command)
`;
    child = spawn('python3', ['-c', script, resolve('pilot/pi'), file, source], { stdio: ['ignore', 'pipe', 'pipe'] });
    let errors = '';
    child.stderr.on('data', data => { errors += data; });
    const end = Date.now() + 15_000;
    while (!receiver.windows.get('synthetic').status().ready && Date.now() < end) {
      if (child.exitCode !== null) throw new Error('Synthetic agent exited: ' + errors);
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(receiver.windows.get('synthetic').status().ready, true, errors);
    async function get(path, options = {}) {
      return new Promise((resolve, reject) => {
        const req = request(origin + path, { ca, ...options }, response => {
          const chunks = [];
          response.on('data', chunk => chunks.push(chunk));
          response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, data: Buffer.concat(chunks) }));
        });
        req.on('error', reject); req.end();
      });
    }
    assert.equal((await get('/api/hls-pilot/media/synthetic/index.m3u8')).status, 401);
    const session = await get('/api/hls-pilot/session/synthetic', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
    });
    const cookie = session.headers['set-cookie'][0].split(';')[0];
    const playlist = await get('/api/hls-pilot/media/synthetic/index.m3u8', { headers: { Cookie: cookie } });
    assert.equal(playlist.status, 200);
    const names = playlist.data.toString().split('\n').filter(line => line.endsWith('.ts'));
    const segments = [];
    for (const name of names) {
      const result = await get('/api/hls-pilot/media/synthetic/' + name, { headers: { Cookie: cookie } });
      assert.equal(result.status, 200); segments.push(result.data);
    }
    const recorded = join(directory, 'synthetic-assertion.ts');
    await writeFile(recorded, Buffer.concat(segments));
    const metadata = JSON.parse(execFileSync('ffprobe', [
      '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height',
      '-of', 'json', recorded,
    ], { encoding: 'utf8' }));
    assert.equal(metadata.streams[0].codec_name, 'h264');
    assert.equal(metadata.streams[0].width, 640);
    assert.equal(metadata.streams[0].height, 480);
    execFileSync('ffmpeg', ['-v', 'error', '-i', recorded, '-t', '1', '-f', 'null', '-'], { stdio: 'pipe' });
    assert(receiver.windows.get('synthetic').status().bufferedBytes < 16 * 1024 * 1024);
  } finally {
    if (child && child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
    receiver?.close();
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await rm(directory, { recursive: true, force: true });
  }
});
