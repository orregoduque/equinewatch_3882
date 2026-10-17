import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { PilotError } from './stream-window.mjs';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const cameraIdPattern = /^[a-z0-9][a-z0-9-]{0,47}$/;

export function validateConfig(config) {
  if (!config || !Array.isArray(config.cameras) || config.cameras.length < 1 || config.cameras.length > 4)
    throw new Error('Configurar entre una y cuatro cámaras de prueba.');
  const authOrigin = new URL(config.supabaseUrl);
  if (authOrigin.protocol !== 'https:' || authOrigin.username || authOrigin.password
    || authOrigin.pathname !== '/' || !config.supabaseAnonKey)
    throw new Error('Configurar Supabase Auth HTTPS y su clave pública.');
  for (const id of config.adminUserIds || []) if (!uuid.test(id)) throw new Error('UUID admin inválido.');
  const ids = new Set();
  const deviceKeys = new Set();
  for (const camera of config.cameras) {
    if (!cameraIdPattern.test(camera.id) || ids.has(camera.id)
      || typeof camera.name !== 'string' || !camera.name || camera.name.length > 120
      || typeof camera.horseId !== 'string' || !camera.horseId
      || !/^[a-f0-9]{64}$/.test(camera.publisherKeySha256 || ''))
      throw new Error('Registro de cámara inválido.');
    if (deviceKeys.has(camera.publisherKeySha256)) throw new Error('Cada cámara necesita una credencial de publicación distinta.');
    ids.add(camera.id); deviceKeys.add(camera.publisherKeySha256);
    for (const key of ['ownerUserIds', 'stableOwnerUserIds']) {
      if (!Array.isArray(camera[key]) || camera[key].some(id => !uuid.test(id)))
        throw new Error('Las asignaciones deben contener UUID reales de Supabase Auth.');
    }
  }
  return config;
}

export function createAuth(config, { fetcher = fetch, clock = Date.now, signingKey = randomBytes(32) } = {}) {
  const cameras = new Map(config.cameras.map(camera => [camera.id, camera]));
  // Explicit server-owned pilot grants. Never derive authority from user_metadata or UI roles.
  function permitted(uid, camera) {
    return Boolean(camera && ((config.adminUserIds || []).includes(uid)
      || camera.ownerUserIds.includes(uid) || camera.stableOwnerUserIds.includes(uid)));
  }
  async function user(request) {
    const value = request.headers.authorization;
    if (typeof value !== 'string' || !/^Bearer [A-Za-z0-9._~-]{20,8192}$/.test(value))
      throw new PilotError(401, 'Se requiere una sesión real de Supabase.');
    let response;
    try {
      response = await fetcher(`${config.supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
        headers: { Authorization: value, apikey: config.supabaseAnonKey },
        signal: AbortSignal.timeout(5000), redirect: 'error',
      });
    } catch { throw new PilotError(503, 'No se pudo verificar la sesión.'); }
    if (!response.ok) throw new PilotError(response.status >= 500 ? 503 : 401, 'Sesión no válida.');
    let data;
    try { data = await response.json(); } catch { throw new PilotError(503, 'Respuesta de identidad inválida.'); }
    if (!uuid.test(data.id)) throw new PilotError(401, 'Identidad inválida.');
    return data.id;
  }
  function grant(uid, cameraId) {
    if (!permitted(uid, cameras.get(cameraId))) throw new PilotError(403, 'No tienes acceso a esta cámara.');
  }
  function publisher(request, cameraId) {
    const camera = cameras.get(cameraId);
    const header = request.headers.authorization || '';
    if (!camera || !/^Bearer [A-Za-z0-9_-]{32,256}$/.test(header))
      throw new PilotError(401, 'Publicador no autorizado.');
    const hash = createHash('sha256').update(header.slice(7)).digest();
    if (!timingSafeEqual(hash, Buffer.from(camera.publisherKeySha256, 'hex')))
      throw new PilotError(401, 'Publicador no autorizado.');
  }
  function issue(uid, cameraId) {
    grant(uid, cameraId);
    const expiresAt = clock() + 90_000;
    const body = Buffer.from(JSON.stringify({ uid, cameraId, expiresAt })).toString('base64url');
    const signature = createHmac('sha256', signingKey).update(body).digest('base64url');
    return {
      expiresAt,
      cookie: `hls_${cameraId}=${body}.${signature}; Path=/api/hls-pilot/media/${cameraId}/; Max-Age=90; HttpOnly; Secure; SameSite=Strict`,
    };
  }
  function viewer(request, cameraId) {
    const cookie = String(request.headers.cookie || '').split(';').map(value => value.trim())
      .find(value => value.startsWith(`hls_${cameraId}=`));
    const token = cookie?.slice(`hls_${cameraId}=`.length);
    if (!token || token.length > 2048) throw new PilotError(401, 'Acceso temporal requerido.');
    const [body, signature, extra] = token.split('.');
    const expected = createHmac('sha256', signingKey).update(body).digest('base64url');
    if (extra || !signature || signature.length !== expected.length
      || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected)))
      throw new PilotError(401, 'Acceso temporal inválido.');
    let data;
    try { data = JSON.parse(Buffer.from(body, 'base64url').toString()); }
    catch { throw new PilotError(401, 'Acceso temporal inválido.'); }
    if (data.cameraId !== cameraId || !uuid.test(data.uid) || !Number.isFinite(data.expiresAt)
      || data.expiresAt <= clock()) throw new PilotError(401, 'Acceso temporal vencido.');
    grant(data.uid, cameraId);
    return data.uid;
  }
  return { user, grant, publisher, issue, viewer, permitted };
}
