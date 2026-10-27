import type { SupabaseClient } from '@supabase/supabase-js';
import type { CameraImage, HorseViewer } from './supabase';

type PrivateRow = {
  id: number | string; horse_id: string; captured_at: string; storage_path_enhanced: string;
  photo_url?: string; imageUrl?: string; expiresAt?: string; version?: string;
};
type PhotoDiagnostic = { status: number; code: string };
export class PrivatePhotoError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
const RENEW_EARLY_MS = 60_000;
const MAX_CACHED_URLS = 1000;

/** In-memory only, scoped to the actual Auth session. Never localStorage or persistent URLs. */
export function createWasabiPhotoReader(
  auth: SupabaseClient['auth'], fetcher: typeof fetch = fetch, now = Date.now,
) {
  const cache = new Map<string, PrivateRow>();
  const previews = new Map<string, string>();
  const pending = new Set<AbortController>();
  type Waiter = { image: CameraImage; viewer: HorseViewer; signal?: AbortSignal;
    resolve: (image: CameraImage) => void; reject: (error: unknown) => void;
    cancelled: boolean; abort: () => void; abortGroup?: () => void };
  let queued: Waiter[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | undefined;
  let scope = '', generation = 0;
  const clear = () => {
    generation++;
    cache.clear();
    previews.clear();
    clearTimeout(flushTimer);
    flushTimer = undefined;
    queued.splice(0).forEach(waiter => {
      waiter.signal?.removeEventListener('abort', waiter.abort);
      waiter.reject(new DOMException('Aborted', 'AbortError'));
    });
    pending.forEach(controller => controller.abort());
    pending.clear();
  };
  auth.onAuthStateChange((_event, session) => {
    const next = session ? `${session.user.id}:${session.access_token}` : '';
    if (next !== scope) { clear(); scope = next; }
  });
  const valid = (row?: PrivateRow) => !!row?.imageUrl && !!row.expiresAt
    && Date.parse(row.expiresAt) > now() + RENEW_EARLY_MS;
  const key = (row: PrivateRow) => `${row.horse_id}:${row.id}:${row.storage_path_enhanced}`;
  const remember = (row: PrivateRow) => {
    if (!valid(row)) throw new PrivatePhotoError('La URL de foto no es válida.', 503);
    const url = new URL(row.imageUrl!);
    if (url.protocol !== 'https:' || url.hostname !== 's3.us-east-1.wasabisys.com')
      throw new PrivatePhotoError('Origen de foto privada inválido.', 503);
    if (!valid(cache.get(key(row)))) cache.set(key(row), row);
    while (cache.size > MAX_CACHED_URLS) cache.delete(cache.keys().next().value!);
  };
  const materialize = (row: PrivateRow) => {
    const cached = cache.get(key(row));
    return toCameraImage({ ...row, imageUrl: valid(cached) ? cached!.imageUrl : undefined,
      expiresAt: valid(cached) ? cached!.expiresAt : undefined });
  };
  const establish = async (viewer: HorseViewer) => {
    const { data, error } = await auth.getSession();
    const session = data.session;
    if (error || !session?.access_token || session.user.id !== viewer.id) {
      clear(); scope = '';
      throw new PrivatePhotoError('Inicia sesión con una cuenta real para ver las fotos privadas de este caballo.', 401);
    }
    const next = `${session.user.id}:${session.access_token}`;
    if (next !== scope) { clear(); scope = next; }
    return { token: session.access_token, generation };
  };
  const run = async <T,>(
    viewer: HorseViewer, signal: AbortSignal | undefined,
    work: (request: (horseId: string, params: URLSearchParams) => Promise<{
      photos: PrivateRow[]; nextCursor: string | null; diagnostic?: PhotoDiagnostic;
    }>) => Promise<T>,
  ): Promise<T> => {
    const session = await establish(viewer);
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    pending.add(controller);
    const check = () => {
      if (controller.signal.aborted || generation !== session.generation)
        throw new DOMException('Aborted', 'AbortError');
    };
    const request = async (horseId: string, params: URLSearchParams) => {
      check();
      const response = await fetcher(`/api/horses/${encodeURIComponent(horseId)}/photos?${params}`, {
        headers: { Authorization: `Bearer ${session.token}` },
        cache: 'no-store', signal: controller.signal, credentials: 'same-origin',
      });
      check();
      const body = await response.json();
      check();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) clear();
        throw new PrivatePhotoError(body.error || 'No se pudieron cargar las fotos privadas.', response.status);
      }
      if (!Array.isArray(body.photos) || body.photos.some((row: PrivateRow) => row.horse_id !== horseId))
        throw new PrivatePhotoError('Respuesta de fotos privadas inválida.', 503);
      // photo_url is signed by our authenticated server, never a public Storage URL.
      // Accept legacy imageUrl responses while server/client releases overlap.
      body.photos = body.photos.map((row: PrivateRow) => ({
        ...row, imageUrl: row.photo_url || row.imageUrl,
      }));
      return body as { photos: PrivateRow[]; nextCursor: string | null; diagnostic?: PhotoDiagnostic };
    };
    try {
      const result = await work(request);
      check();
      return result;
    } finally {
      pending.delete(controller);
      signal?.removeEventListener('abort', abort);
    }
  };
  const resolve = async (
    rows: PrivateRow[], horseId: string,
    request: (horseId: string, params: URLSearchParams) => Promise<{ photos: PrivateRow[] }>,
  ) => {
    const missing = [...new Map(rows.filter(row => !valid(cache.get(key(row)))).map(row => [key(row), row])).values()];
    for (let index = 0; index < missing.length; index += 100) {
      const ids = missing.slice(index, index + 100).map(row => String(row.id));
      const result = await request(horseId, new URLSearchParams({ ids: ids.join(',') }));
      for (const row of result.photos) remember(row);
    }
    const result = rows.map(row => {
      const resolved = cache.get(key(row));
      if (!valid(resolved)) throw new PrivatePhotoError('La foto ya no está disponible para esta cuenta.', 403);
      return toCameraImage({ ...row, imageUrl: resolved!.imageUrl, expiresAt: resolved!.expiresAt });
    });
    while (cache.size > MAX_CACHED_URLS) cache.delete(cache.keys().next().value!);
    return result;
  };
  const flush = () => {
    flushTimer = undefined;
    const groups = new Map<string, Waiter[]>();
    for (const waiter of queued.splice(0)) {
      if (waiter.cancelled) continue;
      const group = `${waiter.viewer.id}:${waiter.image.horse_id}`;
      groups.set(group, [...(groups.get(group) || []), waiter]);
    }
    for (const waiters of groups.values()) {
      for (let index = 0; index < waiters.length; index += 100) {
        const batch = waiters.slice(index, index + 100);
        const controller = new AbortController();
        const cancel = () => { if (batch.every(waiter => waiter.cancelled)) controller.abort(); };
        batch.forEach(waiter => { waiter.abortGroup = cancel; });
        void run(batch[0].viewer, controller.signal, request =>
          resolve(batch.map(waiter => ({
            id: waiter.image.id, horse_id: waiter.image.horse_id, captured_at: waiter.image.captured_at!,
            storage_path_enhanced: waiter.image.storage_path_enhanced,
          })), batch[0].image.horse_id, request))
          .then(images => batch.forEach((waiter, position) => {
            if (!waiter.cancelled) waiter.resolve(images[position]);
          }), error => batch.forEach(waiter => waiter.reject(error)))
          .finally(() => batch.forEach(waiter => waiter.signal?.removeEventListener('abort', waiter.abort)));
      }
    }
  };
  return {
    async diagnose(image: CameraImage, viewer: HorseViewer, signal?: AbortSignal): Promise<PhotoDiagnostic> {
      return run(viewer, signal, async request => {
        const result = await request(image.horse_id, new URLSearchParams({ ids: String(image.id), probe: '1', limit: '1' }));
        if (!result.diagnostic) throw new PrivatePhotoError('No se pudo comprobar la descarga.', 503);
        return result.diagnostic;
      });
    },
    clear,
    load: (image: CameraImage, viewer: HorseViewer, signal?: AbortSignal): Promise<CameraImage> =>
      new Promise((resolve, reject) => {
        const waiter: Waiter = { image, viewer, signal, resolve, reject, cancelled: false,
          abort: () => {
            waiter.cancelled = true;
            reject(new DOMException('Aborted', 'AbortError'));
            waiter.abortGroup?.();
          } };
        if (signal?.aborted) { waiter.abort(); return; }
        signal?.addEventListener('abort', waiter.abort, { once: true });
        queued.push(waiter);
        flushTimer ??= setTimeout(flush, 16);
      }),
    read: (
      horseId: string, viewer: HorseViewer, options: {
        limit: number; since?: string; from?: string; to?: string; cursor?: string; signal?: AbortSignal;
      },
    ) => run(viewer, options.signal, async request => {
      const params = new URLSearchParams({ limit: String(options.limit), preview: '1' });
      const queryKey = JSON.stringify([horseId, options.from || '', options.to || '', options.cursor || '']);
      const cached = cache.get(previews.get(queryKey) || '');
      if (valid(cached) && cached!.version) params.set('cached', cached!.version);
      for (const name of ['since', 'from', 'to', 'cursor'] as const)
        if (options[name]) params.set(name, options[name]!);
      const result = await request(horseId, params);
      result.photos.filter(row => row.imageUrl).forEach(remember);
      const newest = options.from ? result.photos.at(-1) : result.photos[0];
      if (newest) {
        if (!valid(cache.get(key(newest)))) throw new PrivatePhotoError('Falta la foto de vista previa.', 503);
        previews.set(queryKey, key(newest));
        if (previews.size > MAX_CACHED_URLS) previews.delete(previews.keys().next().value!);
      }
      return { images: result.photos.map(materialize), nextCursor: result.nextCursor };
    }),
    renew: (images: CameraImage[], viewer: HorseViewer, signal?: AbortSignal, knownOnly = false) =>
      run(viewer, signal, async request => {
        if (!images.length) return [];
        const horseId = images[0].horse_id;
        if (images.some(row => row.horse_id !== horseId || row.source !== 'wasabi'))
          throw new PrivatePhotoError('Selección de fotos inválida.', 400);
        const rows = images.map(row => ({
          id: row.id, horse_id: row.horse_id, captured_at: row.captured_at!,
          storage_path_enhanced: row.storage_path_enhanced,
        }));
        await resolve(rows.filter((row, index) => !knownOnly || cache.has(key(row)) || !!images[index].imageUrl), horseId, request);
        return rows.map(materialize);
      }),
  };
}

function toCameraImage(row: PrivateRow): CameraImage {
  return {
    id: row.id, horse_id: row.horse_id, source: 'wasabi', captured_at: row.captured_at,
    created_at: row.captured_at, uploaded_at: row.captured_at,
    storage_path_enhanced: row.storage_path_enhanced, image_number: 0,
    is_processed: true, notes: null, photo_url: row.imageUrl,
    imageUrl: row.imageUrl, expiresAt: row.expiresAt,
  };
}
