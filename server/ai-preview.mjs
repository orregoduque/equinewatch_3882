import { createHash } from 'node:crypto';

export const AI_PREVIEW_BUCKET = 'ai-previews';
export const AI_PREVIEW_PROMPT = 'Enhance this real low-light horse-stall camera photo into a clear, high-quality monochrome night-vision image suitable for a premium horse monitoring app. Reveal the horse’s full body and contours, improve exposure, local contrast, texture and clarity, reduce noise and compression artifacts. Preserve the same stall, camera viewpoint, horse pose, position and overall composition. Keep it realistic and documentary, not artistic. No text, no labels, no watermark.';
const PIPELINE_FINGERPRINT = createHash('sha256').update(JSON.stringify({
  model: 'gpt-image-1',
  prompt: AI_PREVIEW_PROMPT,
  quality: 'high',
  input_fidelity: 'high',
  output_format: 'jpeg',
  output_compression: 95,
  size: '1536x1024',
  n: 1,
})).digest('hex').slice(0, 20);
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;
const SIGNED_URL_SECONDS = 10 * 60;
const OPENAI_TIMEOUT_MS = 180_000;
const RATE_LIMIT_COUNT = 5;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const SUPABASE_URL = 'https://zmxppbpywizdjlhstfkf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJ6bXhwYnBweXdpekRqbGhzdGZrZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNzYzMzc2ODE5LCJleHAiOjIwNzg5NTI4MTl9.AR2B4sNbkf0A_Sm_M-YFtR25ySZMP1FsM93acnuVYWc';

class PreviewError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function json(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

function safeObjectPath(path) {
  if (typeof path !== 'string' || !path || path.length > 1024 || path.startsWith('/') ||
    path.includes('\\') || path.includes('?') || path.includes('#') || path.includes('%') ||
    path.includes('://') || path.split('/').some((part) => !part || part === '.' || part === '..' || !/^[\p{L}\p{N}_. -]+$/u.test(part))) {
    throw new PreviewError(400, 'La ruta de la imagen original no es válida.');
  }
  return path;
}

function imageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { mime: 'image/jpeg', extension: 'jpg' };
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { mime: 'image/png', extension: 'png' };
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return { mime: 'image/webp', extension: 'webp' };
  return null;
}

function getBearer(request) {
  const header = request.headers?.authorization;
  const match = typeof header === 'string' && /^Bearer\s+([A-Za-z0-9._~-]+)$/i.exec(header);
  return match?.[1] || null;
}

function validImageId(value) {
  return typeof value === 'string' && /^\d{1,15}$/.test(value) && Number(value) > 0 && Number.isSafeInteger(Number(value));
}

async function readBody(request, maxBytes = 2048) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBytes) throw new PreviewError(413, 'La solicitud es demasiado grande.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new PreviewError(400, 'El contenido enviado no es JSON válido.');
  }
}

function publicStatus(env) {
  const missingConfiguration = ['OPENAI_API_KEY', 'SUPABASE_SERVICE_ROLE_KEY']
    .filter((name) => !env[name]);
  return { configured: missingConfiguration.length === 0, missingConfiguration };
}

function providerErrorMessage(status, message) {
  const detail = typeof message === 'string' ? message.slice(0, 500) : '';
  if (status === 401 || status === 403) return 'OpenAI rechazó las credenciales o el acceso al modelo. Comprueba la configuración de la cuenta.';
  if (status === 400 || status === 422) return `OpenAI no pudo procesar esta imagen: ${detail || 'formato o parámetros no admitidos.'}`;
  if (status === 429) return 'OpenAI ha limitado temporalmente las solicitudes o no hay cuota disponible.';
  return `El servicio de edición de imágenes respondió con un error (${status}).${detail ? ` ${detail}` : ''}`;
}

export function createAiPreviewHandler({
  env = process.env,
  fetchImpl = globalThis.fetch,
  createSupabaseClient,
  now = Date.now,
} = {}) {
  const inFlight = new Map();
  const rateLimits = new Map();
  let defaultSupabaseFactory = createSupabaseClient;

  async function getSupabaseFactory() {
    if (!defaultSupabaseFactory) {
      const { createClient } = await import('@supabase/supabase-js');
      defaultSupabaseFactory = createClient;
    }
    return defaultSupabaseFactory;
  }

  function checkLimit(userId) {
    const current = rateLimits.get(userId);
    const currentTime = now();
    if (!current || current.resetAt <= currentTime) {
      rateLimits.set(userId, { count: 1, resetAt: currentTime + RATE_LIMIT_WINDOW_MS });
      return true;
    }
    if (current.count >= RATE_LIMIT_COUNT) return false;
    current.count += 1;
    return true;
  }

  async function authenticate(request) {
    const token = getBearer(request);
    if (!token) throw new PreviewError(401, 'Inicia sesión con una cuenta de Supabase válida para editar imágenes.');
    const factory = await getSupabaseFactory();
    const client = factory(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user?.id) throw new PreviewError(401, 'La sesión de Supabase no es válida o ha caducado.');
    return { client, user: data.user };
  }

  async function imageRow(client, imageId) {
    const { data, error } = await client.from('images')
      .select('id, storage_path_raw, storage_path_enhanced')
      .eq('id', Number(imageId))
      .maybeSingle();
    if (error || !data) throw new PreviewError(404, 'No se encontró una imagen accesible para esta cuenta.');
    const sourcePath = safeObjectPath(data.storage_path_raw || data.storage_path_enhanced);
    if (!sourcePath) throw new PreviewError(404, 'La imagen no tiene un archivo original disponible.');
    return { ...data, sourcePath };
  }

  async function getSource(client, sourcePath) {
    const { data, error } = await client.storage.from('images').download(sourcePath);
    if (error || !data) throw new PreviewError(502, 'No se pudo leer la imagen original desde el almacenamiento privado.');
    const bytes = Buffer.from(await data.arrayBuffer());
    if (!bytes.length || bytes.length >= MAX_SOURCE_BYTES) throw new PreviewError(413, 'La imagen debe pesar menos de 20 MB.');
    const type = imageType(bytes);
    if (!type) throw new PreviewError(415, 'El archivo original no es una imagen JPEG, PNG o WEBP válida.');
    return { bytes, ...type };
  }

  async function serviceClient() {
    const factory = await getSupabaseFactory();
    return factory(SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async function ensureBucket(client) {
    const { data, error } = await client.storage.getBucket(AI_PREVIEW_BUCKET);
    if (!error && data) return;
    const { error: createError } = await client.storage.createBucket(AI_PREVIEW_BUCKET, { public: false });
    if (createError && !/already exists|duplicate/i.test(createError.message || '')) {
      throw new PreviewError(502, 'No se pudo preparar el almacenamiento privado de vistas previas.');
    }
  }

  function previewPath(userId, imageId, sourceBytes) {
    const sourceHash = createHash('sha256').update(sourceBytes).digest('hex');
    return `${userId}/${imageId}/${sourceHash}-${PIPELINE_FINGERPRINT}.jpg`;
  }

  async function signPreview(storage, path) {
    const { data, error } = await storage.from(AI_PREVIEW_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
    if (error || !data?.signedUrl) throw new PreviewError(502, 'La vista previa existe, pero no se pudo crear un enlace temporal.');
    return data.signedUrl;
  }

  async function storedPreview(storage, path) {
    const { data, error } = await storage.from(AI_PREVIEW_BUCKET).download(path);
    if (error || !data) return false;
    const bytes = Buffer.from(await data.arrayBuffer());
    if (!imageType(bytes) || imageType(bytes).mime !== 'image/jpeg') {
      throw new PreviewError(502, 'La vista previa guardada no es un JPEG válido.');
    }
    return true;
  }

  async function generate(source, userId, imageId) {
    if (!env.OPENAI_API_KEY) throw new PreviewError(503, 'La edición con IA no está configurada: falta OPENAI_API_KEY.');
    if (!fetchImpl) throw new PreviewError(503, 'El servicio de edición con IA no está disponible.');
    const form = new FormData();
    form.append('model', 'gpt-image-1');
    form.append('prompt', AI_PREVIEW_PROMPT);
    form.append('quality', 'high');
    form.append('input_fidelity', 'high');
    form.append('output_format', 'jpeg');
    form.append('output_compression', '95');
    form.append('size', '1536x1024');
    form.append('n', '1');
    form.append('image', new Blob([source.bytes], { type: source.mime }), `original.${source.extension}`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);
    let response;
    try {
      response = await fetchImpl('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        body: form,
        signal: controller.signal,
      });
    } catch (error) {
      if (error?.name === 'AbortError') throw new PreviewError(504, 'OpenAI tardó demasiado en editar la imagen. No se volvió a intentar la solicitud.');
      throw new PreviewError(502, 'No se pudo conectar con el servicio de edición de imágenes.');
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      let providerMessage = '';
      try {
        const body = await response.json();
        providerMessage = body?.error?.message || '';
      } catch {
        // Provider may return non-JSON errors; avoid exposing response bodies or credentials.
      }
      throw new PreviewError(502, providerErrorMessage(response.status, providerMessage));
    }
    let result;
    try {
      result = await response.json();
    } catch {
      throw new PreviewError(502, 'OpenAI devolvió una respuesta ilegible; no se volvió a intentar la solicitud.');
    }
    const encoded = result?.data?.[0]?.b64_json;
    if (typeof encoded !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) {
      throw new PreviewError(502, 'OpenAI no devolvió una imagen editada válida.');
    }
    const bytes = Buffer.from(encoded, 'base64');
    if (!bytes.length || imageType(bytes)?.mime !== 'image/jpeg') {
      throw new PreviewError(502, 'OpenAI devolvió un archivo que no es un JPEG válido.');
    }
    return bytes;
  }

  async function edit(request, response, imageId) {
    const { client, user } = await authenticate(request);
    const row = await imageRow(client, imageId);
    const source = await getSource(client, row.sourcePath);
    const key = previewPath(user.id, imageId, source.bytes);
    const storageClient = await serviceClient();
    const storage = storageClient.storage;
    await ensureBucket(storageClient);

    if (await storedPreview(storage, key)) {
      return json(response, 200, { previewUrl: await signPreview(storage, key) });
    }
    const active = inFlight.get(key);
    if (active) {
      const previewBytes = await active;
      return json(response, 200, { previewUrl: await signPreview(storage, key) });
    }
    if (!env.OPENAI_API_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) {
      const missing = publicStatus(env).missingConfiguration;
      throw new PreviewError(503, `La edición con IA no está configurada. Falta(n): ${missing.join(', ')}.`);
    }
    if (!checkLimit(user.id)) throw new PreviewError(429, 'Has alcanzado el límite de 5 ediciones por hora. Inténtalo más tarde.');

    const job = (async () => {
      const generated = await generate(source, user.id, imageId);
      const { error } = await storage.from(AI_PREVIEW_BUCKET).upload(key, generated, {
        contentType: 'image/jpeg',
        upsert: false,
        cacheControl: '3600',
      });
      if (error && !/already exists|duplicate/i.test(error.message || '')) {
        throw new PreviewError(502, 'La imagen se editó, pero no se pudo guardar como vista previa privada.');
      }
      return generated;
    })();
    inFlight.set(key, job);
    try {
      await job;
    } finally {
      if (inFlight.get(key) === job) inFlight.delete(key);
    }
    return json(response, 200, { previewUrl: await signPreview(storage, key) });
  }

  async function retrieve(request, response, imageId) {
    const { client, user } = await authenticate(request);
    const row = await imageRow(client, imageId);
    const source = await getSource(client, row.sourcePath);
    const key = previewPath(user.id, imageId, source.bytes);
    const storageClient = await serviceClient();
    await ensureBucket(storageClient);
    const storage = storageClient.storage;
    if (!await storedPreview(storage, key)) return json(response, 200, { previewUrl: null });
    return json(response, 200, { previewUrl: await signPreview(storage, key) });
  }

  async function handle(request, response) {
    const url = new URL(request.url, 'http://localhost');
    if (url.pathname === '/api/ai-preview/status' && request.method === 'GET') {
      return json(response, 200, publicStatus(env));
    }
    if (url.pathname !== '/api/ai-preview') return json(response, 404, { error: 'Ruta no encontrada.' });
    if (!['GET', 'POST'].includes(request.method)) return json(response, 405, { error: 'Método no permitido.' });

    try {
      let imageId;
      if (request.method === 'GET') {
        imageId = url.searchParams.get('imageId');
      } else {
        if (!request.headers['content-type']?.toLowerCase().startsWith('application/json')) {
          throw new PreviewError(415, 'Se requiere JSON.');
        }
        const body = await readBody(request);
        imageId = body?.imageId;
      }
      if (!validImageId(imageId)) throw new PreviewError(400, 'El identificador de imagen debe ser numérico.');
      return request.method === 'GET'
        ? await retrieve(request, response, imageId)
        : await edit(request, response, imageId);
    } catch (error) {
      if (error instanceof PreviewError) return json(response, error.status, { error: error.message });
      return json(response, 500, { error: 'No se pudo completar la operación de vista previa con IA.' });
    }
  }

  return handle;
}