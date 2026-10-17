import { readFile } from 'node:fs/promises';

export function pilotHtml(html, path) {
  return path.split('?')[0] === '/hls-pilot'
    ? html.replace("base-uri 'self';", "media-src 'self' blob:; base-uri 'self';") : html;
}

// Opt-in command-line configuration only. No default receiver, secrets or deployment changes.
export async function loadPilotProxy(argv = process.argv.slice(2)) {
  const index = argv.indexOf('--hls-pilot-config');
  let receiver;
  if (index !== -1) {
    if (!argv[index + 1]) throw new Error('Falta configuración privada del proxy HLS.');
    const config = JSON.parse(await readFile(argv[index + 1], 'utf8'));
    receiver = new URL(config.receiverOrigin);
    if (receiver.username || receiver.password || receiver.pathname !== '/' || receiver.search || receiver.hash
      || (receiver.protocol !== 'https:' && !(receiver.protocol === 'http:'
        && ['127.0.0.1', '[::1]'].includes(receiver.hostname))))
      throw new Error('El receptor requiere HTTPS, o HTTP exclusivamente en loopback.');
  }
  return async (request, response) => {
    const path = new URL(request.url, 'http://app.invalid').pathname;
    if (!path.startsWith('/api/hls-pilot/')) return false;
    const json = (status, data) => {
      response.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      response.end(JSON.stringify(data));
    };
    if (path === '/api/hls-pilot/config' && request.method === 'GET') {
      json(200, { enabled: Boolean(receiver) });
      return true;
    }
    if (!receiver) { json(404, { error: 'Piloto desactivado.' }); return true; }
    const origin = request.headers.origin;
    let foreign = false;
    try { foreign = Boolean(origin && new URL(origin).host !== request.headers.host); } catch { foreign = true; }
    if (foreign
      || request.headers['sec-fetch-site'] === 'cross-site') {
      json(403, { error: 'Origen no permitido.' }); return true;
    }
    const read = request.method === 'GET' || request.method === 'HEAD';
    const session = request.method === 'POST' && /^\/api\/hls-pilot\/session\/[a-z0-9-]+$/.test(path);
    if ((!read && !session) || (Number(request.headers['content-length']) > 1024)
      || request.headers['transfer-encoding']) {
      json(405, { error: 'Solicitud no permitida.' }); return true;
    }
    try {
      const headers = {};
      for (const key of ['authorization', 'cookie', 'content-type']) {
        if (request.headers[key]) headers[key] = request.headers[key];
      }
      // No user-supplied URL, redirect following, ingest forwarding or broad reverse proxy.
      if (!/^\/api\/hls-pilot\/(cameras|session\/[a-z0-9-]+|media\/[a-z0-9-]+\/(status|index\.m3u8|[a-f0-9-]{36}-\d{1,10}\.ts))$/.test(path)) {
        json(404, { error: 'Ruta no disponible.' }); return true;
      }
      const upstream = await fetch(new URL(path, receiver), {
        method: request.method, headers, redirect: 'error', signal: AbortSignal.timeout(6000),
      });
      const data = Buffer.from(await upstream.arrayBuffer());
      if (data.length > 2 * 1024 * 1024) throw new Error('Respuesta fuera de límites.');
      const outgoing = {
        'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
        'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'no-referrer', 'Cross-Origin-Resource-Policy': 'same-origin',
      };
      const cookies = upstream.headers.getSetCookie();
      if (cookies.length) outgoing['Set-Cookie'] = cookies;
      response.writeHead(upstream.status, outgoing);
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch { json(503, { error: 'Receptor HLS no disponible.' }); }
    return true;
  };
}
