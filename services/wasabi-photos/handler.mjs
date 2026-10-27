import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';

export const LUCERO_ID = 'a95f853c-e90b-4b6d-a4ea-f25cfa317119';
export const THUNDER_ID = 'd826a274-58ea-4a55-8fd2-1d4c78222ab1';
export const ENCANTADOR_ID = '0c8856e1-87eb-4abb-b145-28b070d34cf9';
export const WASABI_SCOPE = Object.freeze({
  endpoint: 'https://s3.us-east-1.wasabisys.com',
  region: 'us-east-1',
  bucket: 'equinewatch-photos',
  prefix: 'stable-eye/97e3674b-31ab-5373-8a21-aa8187e6a17f/node_108/',
});
export const PHOTO_PREFIXES = Object.freeze({
  [LUCERO_ID]: WASABI_SCOPE.prefix,
  [THUNDER_ID]: 'stable-eye/97e3674b-31ab-5373-8a21-aa8187e6a17f/node_109/',
  [ENCANTADOR_ID]: 'stable-eye/bda0c371-2ffc-567c-87d4-168726ebfda4/node_1/',
});
const SUPABASE_URL = 'https://zmxppbpywizdjlhstfkf.supabase.co';
const TTL_SECONDS = 600;
export const previewVersion = row => createHash('sha256')
  .update(JSON.stringify([String(row.id), row.captured_at, row.storage_path_enhanced])).digest('hex');
class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(value);
const timestamp = value => typeof value === 'string' && value.length <= 40
  && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value));

export function validLuceroKey(key, horseId = LUCERO_ID) {
  return Boolean(PHOTO_PREFIXES[horseId]) && typeof key === 'string' && key.length <= 1024 && key.startsWith(PHOTO_PREFIXES[horseId])
    && !key.includes('..') && !/[\\%?#\u0000-\u001f]/.test(key) && /\.jpe?g$/i.test(key);
}

function parseQuery(search, horseId) {
  const allowed = new Set(['limit', 'cursor', 'since', 'from', 'to', 'ids', 'metadata', 'preview', 'cached']);
  for (const name of search.keys())
    if (!allowed.has(name) || search.getAll(name).length !== 1) fail(400, 'Consulta de fotos inválida.');
  const limit = Number(search.get('limit') || 240);
  const from = search.get('from'), to = search.get('to'), since = search.get('since');
  if (!Number.isInteger(limit) || limit < 1 || limit > (from ? 400 : 240)) fail(400, 'Límite inválido.');
  if (!!from !== !!to || (from && (!timestamp(from) || !timestamp(to)
    || Date.parse(to) <= Date.parse(from) || Date.parse(to) - Date.parse(from) > 3 * 3600_000)))
    fail(400, 'Intervalo de fotos inválido.');
  if (since && (!timestamp(since) || from)) fail(400, 'Inicio de consulta inválido.');
  const ids = search.get('ids')?.split(',');
  if (ids && (ids.length > 100 || !ids.every(validId) || from || since || search.has('cursor')))
    fail(400, 'Selección de fotos inválida.');
  if (search.has('metadata') && search.get('metadata') !== '1') fail(400, 'Consulta inválida.');
  const preview = search.get('preview') === '1';
  const cached = search.get('cached');
  if ((search.has('preview') && !preview) || (preview && (ids || search.has('metadata')))
    || (cached !== null && (!preview || !/^[a-f0-9]{64}$/.test(cached)))) fail(400, 'Vista previa inválida.');
  let cursor;
  if (search.has('cursor')) {
    try {
      const text = search.get('cursor');
      if (text.length > 1024 || !/^[A-Za-z0-9_-]+$/.test(text)) throw Error();
      cursor = JSON.parse(Buffer.from(text, 'base64url').toString());
      if (cursor.horseId !== horseId || cursor.from !== from || cursor.to !== to
        || cursor.since !== since || !timestamp(cursor.at) || !validId(cursor.id)) throw Error();
    } catch { fail(400, 'Cursor inválido.'); }
  }
  return { limit, from, to, since, ids, cursor, preview, cached, metadataOnly: search.get('metadata') === '1' };
}

/** No S3 requests are made here: GetObjectCommand is signed locally, never sent. */
async function productionSigner(env) {
  for (const [name, expected] of [
    ['WASABI_REGION', WASABI_SCOPE.region], ['WASABI_ENDPOINT', WASABI_SCOPE.endpoint],
    ['WASABI_BUCKET', WASABI_SCOPE.bucket],
  ]) if (env[name] && env[name] !== expected) fail(503, 'Configuración de fotos privadas no disponible.');
  if (!env.WASABI_ACCESS_KEY_ID || !env.WASABI_SECRET_ACCESS_KEY)
    fail(503, 'Las fotos privadas todavía no están configuradas.');
  const [{ S3Client, GetObjectCommand }, { getSignedUrl }] = await Promise.all([
    import('@aws-sdk/client-s3'), import('@aws-sdk/s3-request-presigner'),
  ]);
  const client = new S3Client({
    endpoint: WASABI_SCOPE.endpoint, region: WASABI_SCOPE.region, forcePathStyle: true,
    credentials: { accessKeyId: env.WASABI_ACCESS_KEY_ID, secretAccessKey: env.WASABI_SECRET_ACCESS_KEY },
  });
  return key => getSignedUrl(client,
    new GetObjectCommand({ Bucket: WASABI_SCOPE.bucket, Key: key }), { expiresIn: TTL_SECONDS });
}

export function createWasabiPhotosHandler({
  env = process.env, clientFactory = createClient, signerFactory = productionSigner, now = Date.now,
} = {}) {
  // No auth/session clients are shared across users, and no signed URLs are logged/cached on the server.
  let signerPromise;
  const reply = (response, status, body) => {
    response.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store',
      'Vary': 'Authorization', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer',
    });
    response.end(JSON.stringify(body));
  };
  return async (request, response) => {
    const url = new URL(request.url, 'http://app.invalid');
    const match = /^\/api\/horses\/([^/]+)\/photos$/.exec(url.pathname);
    if (!match) return false;
    const controller = new AbortController();
    const disconnected = () => { if (!response.writableEnded) controller.abort(); };
    response.once('close', disconnected);
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      if (request.method !== 'GET') fail(405, 'Método no permitido.');
      const auth = request.headers.authorization;
      if (typeof auth !== 'string' || auth.length > 8192 || !/^Bearer [^\s]+$/.test(auth))
        fail(401, 'Inicia sesión con una cuenta real para ver las fotos privadas.');
      const token = auth.slice(7);
      const publicKey = env.VITE_SUPABASE_ANON_KEY;
      if (!publicKey || (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_URL !== SUPABASE_URL))
        fail(503, 'Autenticación de fotos no disponible.');
      const client = clientFactory(SUPABASE_URL, publicKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
        global: {
          headers: { Authorization: `Bearer ${token}` },
          fetch: (input, options = {}) => fetch(input, { ...options, signal: controller.signal }),
        },
      });
      const { data: identity, error: authError } = await client.auth.getUser(token);
      if (authError || !identity?.user?.id) fail(401, 'La sesión no es válida. Vuelve a iniciar sesión.');
      const horseId = match[1];
      // Only explicitly approved horses and their own prefixes may be signed.
      if (!PHOTO_PREFIXES[horseId]) fail(403, 'No tienes acceso a estas fotos.');
      const { data: horse, error: horseError } = await client.from('horses')
        .select('id, owner_id, photo_backend').eq('id', horseId).maybeSingle();
      if (horseError) fail(503, 'No se pudo comprobar el acceso al caballo.');
      if (!horse) fail(403, 'No tienes acceso a estas fotos.');
      if (horse.owner_id !== identity.user.id) {
        const { data: profile, error } = await client.from('user_profiles')
          .select('id, role, is_active').eq('id', identity.user.id).maybeSingle();
        if (error || profile?.id !== identity.user.id || profile.is_active !== true
          || !['admin', 'caretaker'].includes(profile.role)) fail(403, 'No tienes acceso a estas fotos.');
      }
      if (horse.photo_backend !== 'wasabi') fail(409, 'Este caballo no utiliza fotos privadas Wasabi.');
      const parsed = parseQuery(url.searchParams, horseId);
      let query = client.from('images_wasabi')
        .select('id, horse_id, captured_at, storage_path_enhanced')
        .eq('horse_id', horseId).not('storage_path_enhanced', 'is', null);
      if (parsed.from) query = query.gte('captured_at', parsed.from).lt('captured_at', parsed.to);
      if (parsed.since) query = query.gte('captured_at', parsed.since);
      if (parsed.ids) query = query.in('id', parsed.ids);
      if (parsed.cursor) {
        const direction = parsed.from ? 'gt' : 'lt';
        query = query.or(`captured_at.${direction}.${parsed.cursor.at},and(captured_at.eq.${parsed.cursor.at},id.${direction}.${parsed.cursor.id})`);
      }
      const ascending = !!parsed.from;
      const cap = parsed.ids ? parsed.ids.length : parsed.limit;
      const { data, error } = await query.order('captured_at', { ascending })
        .order('id', { ascending }).limit(cap).abortSignal(controller.signal);
      if (error) fail(503, 'No se pudieron consultar las fotos privadas.');
      const rows = data || [];
      // Validate every database row before signing any of them, including metadata-only requests.
      if (rows.some(row => row.horse_id !== horseId || !validLuceroKey(row.storage_path_enhanced, horseId)
        || !validId(String(row.id)) || !timestamp(row.captured_at)))
        fail(503, 'Las rutas de las fotos requieren revisión.');
      const previewRow = ascending ? rows.at(-1) : rows[0];
      const needsSignature = row => !parsed.metadataOnly
        && (!parsed.preview || (row === previewRow && previewVersion(row) !== parsed.cached));
      let sign;
      if (rows.some(needsSignature)) {
        signerPromise ??= signerFactory(env).catch(error => { signerPromise = undefined; throw error; });
        sign = await signerPromise;
      }
      const expiresAt = new Date(now() + TTL_SECONDS * 1000).toISOString();
      const photos = await Promise.all(rows.map(async row => {
        const photoUrl = sign && needsSignature(row) ? await sign(row.storage_path_enhanced) : undefined;
        return {
        id: row.id, horse_id: horseId, captured_at: row.captured_at,
        storage_path_enhanced: row.storage_path_enhanced, source: 'wasabi',
        ...(photoUrl ? {
          photo_url: photoUrl,
          // Preserve the API contract for customer tabs opened before publishing.
          imageUrl: photoUrl, expiresAt, version: previewVersion(row),
        } : {}),
      };
      }));
      const last = rows.at(-1);
      const nextCursor = !parsed.ids && rows.length === cap && last
        ? Buffer.from(JSON.stringify({ horseId, from: parsed.from, to: parsed.to, since: parsed.since,
          at: last.captured_at, id: String(last.id) })).toString('base64url') : null;
      if (!controller.signal.aborted) reply(response, 200, { photos, nextCursor });
    } catch (error) {
      if (!response.destroyed && !response.writableEnded)
        reply(response, error instanceof HttpError ? error.status : 503, {
          error: error instanceof HttpError ? error.message : 'Las fotos privadas no están disponibles. Inténtalo de nuevo.',
        });
      // Deliberately no exception logging: SDK errors can contain credentials/URLs.
    } finally {
      clearTimeout(timeout);
      response.off('close', disconnected);
    }
    return true;
  };
}
