import { createServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { createAuth, validateConfig } from './auth.mjs';
import { PilotError, StreamWindow } from './stream-window.mjs';

export function createReceiver(config, { authenticate, clock = Date.now } = {}) {
  validateConfig(config);
  const auth = createAuth(config, { clock });
  const identify = authenticate || auth.user; // Test injection only through imported factory, never CLI config.
  const windows = new Map(config.cameras.map(camera => [camera.id, new StreamWindow({ clock })]));
  const origins = new Set(config.allowedOrigins || []);
  let uploads = 0;
  const buckets = new Map();
  const timer = setInterval(() => {
    for (const window of windows.values()) window.prune();
    for (const [key, entry] of buckets) if (entry.until <= clock()) buckets.delete(key);
  }, 1000);
  timer.unref();

  const handler = async (request, response) => {
    const headers = {
      'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin',
    };
    function send(status, body, type = 'application/json; charset=utf-8', extra = {}) {
      response.writeHead(status, { ...headers, 'Content-Type': type, ...extra });
      response.end(request.method === 'HEAD' ? undefined : typeof body === 'object' && !Buffer.isBuffer(body)
        ? JSON.stringify(body) : body);
    }
    try {
      const origin = request.headers.origin;
      if (origin && !origins.has(origin)) throw new PilotError(403, 'Origen no permitido.');
      if (request.headers['sec-fetch-site'] === 'cross-site') throw new PilotError(403, 'Solicitud entre sitios denegada.');
      const ip = request.socket.remoteAddress;
      const bucket = buckets.get(ip) || { count: 0, until: clock() + 60_000 };
      if (bucket.until <= clock()) { bucket.count = 0; bucket.until = clock() + 60_000; }
      if (!buckets.has(ip) && buckets.size >= 1024) throw new PilotError(429, 'Demasiadas conexiones.');
      buckets.set(ip, bucket);
      if (++bucket.count > 1200) throw new PilotError(429, 'Demasiadas solicitudes.');
      const url = new URL(request.url, 'http://receiver.invalid');
      const path = url.pathname;
      if (path === '/health' && ['GET', 'HEAD'].includes(request.method))
        return send(200, { ok: true, mode: 'volatile-hls-pilot' });

      const ingest = path.match(/^\/ingest\/([a-z0-9-]+)\/([a-f0-9-]{36})\/(\d{1,10})$/);
      if (ingest && request.method === 'PUT') {
        const [, cameraId, epoch, seq] = ingest;
        auth.publisher(request, cameraId);
        if (request.headers['content-type'] !== 'video/mp2t') throw new PilotError(415, 'Se requiere video/mp2t.');
        if (uploads >= 2) throw new PilotError(429, 'Receptor ocupado.');
        const limit = 2 * 1024 * 1024;
        if (Number(request.headers['content-length']) > limit) throw new PilotError(413, 'Segmento demasiado grande.');
        uploads++;
        const timeout = setTimeout(() => request.destroy(), 5000);
        let data;
        try {
          let length = 0;
          const chunks = [];
          for await (const chunk of request) {
            length += chunk.length;
            if (length > limit) throw new PilotError(413, 'Segmento demasiado grande.');
            chunks.push(chunk);
          }
          data = Buffer.concat(chunks);
        } finally { uploads--; clearTimeout(timeout); }
        windows.get(cameraId).push({
          epoch, sequence: Number(seq), duration: Number(request.headers['x-segment-duration']),
          capturedAt: String(request.headers['x-segment-start'] || ''), data,
        });
        return send(204, '');
      }
      if (path === '/api/hls-pilot/cameras' && request.method === 'GET') {
        const uid = await identify(request);
        return send(200, {
          cameras: config.cameras.filter(camera => auth.permitted(uid, camera)).map(camera => ({
            id: camera.id, name: camera.name, horseId: camera.horseId, ...windows.get(camera.id).status(),
          })),
        });
      }
      const session = path.match(/^\/api\/hls-pilot\/session\/([a-z0-9-]+)$/);
      if (session && request.method === 'POST') {
        if (request.headers['content-type'] !== 'application/json') throw new PilotError(415, 'Se requiere JSON.');
        const uid = await identify(request);
        const { cookie, expiresAt } = auth.issue(uid, session[1]);
        const status = windows.get(session[1]).status();
        return send(200, {
          ...status, expiresAt, playbackUrl: `/api/hls-pilot/media/${session[1]}/index.m3u8`,
        }, undefined, { 'Set-Cookie': cookie });
      }
      const media = path.match(/^\/api\/hls-pilot\/media\/([a-z0-9-]+)\/(index\.m3u8|status|[a-f0-9-]{36}-\d{1,10}\.ts)$/);
      if (media && ['GET', 'HEAD'].includes(request.method)) {
        const [, cameraId, file] = media;
        auth.viewer(request, cameraId);
        const window = windows.get(cameraId);
        if (file === 'status') return send(200, window.status());
        if (file === 'index.m3u8') return send(200, window.playlist(), 'application/vnd.apple.mpegurl');
        return send(200, window.segment(file), 'video/mp2t');
      }
      throw new PilotError(404, 'Ruta no disponible.');
    } catch (error) {
      if (!response.headersSent && !response.destroyed)
        send(error instanceof PilotError ? error.status : 500, {
          error: error instanceof PilotError ? error.message : 'Error interno del piloto.',
        });
    }
  };
  return { handler, windows, close: () => clearInterval(timer) };
}

export async function startReceiver(configPath) {
  if (!configPath) throw new Error('Uso: node services/hls-pilot/receiver.mjs /ruta/privada/receiver.json');
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const pilot = createReceiver(config);
  const host = config.host || '127.0.0.1';
  if (!config.tls && !['127.0.0.1', '::1'].includes(host))
    throw new Error('Sin TLS solo se permite escuchar en loopback detrás de un proxy HTTPS.');
  const options = config.tls ? {
    cert: await readFile(config.tls.certFile), key: await readFile(config.tls.keyFile),
    minVersion: 'TLSv1.2',
  } : null;
  const server = options ? createHttpsServer(options, pilot.handler) : createServer(pilot.handler);
  server.requestTimeout = 6000;
  server.headersTimeout = 5000;
  server.maxConnections = 64;
  server.listen(config.port ?? 8099, host, () => console.log(`HLS pilot receiver listening on ${server.address().port}`));
  server.on('close', pilot.close);
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startReceiver(process.argv[2]).catch(() => {
    console.error('No se pudo iniciar el receptor. Revisar configuración privada y certificados.');
    process.exitCode = 1;
  });
}
