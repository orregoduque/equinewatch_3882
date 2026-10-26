import type { SupabaseClient } from '@supabase/supabase-js';
import type { CameraImage, HorseViewer } from './supabase';

type PrivateRow = {
  id: number | string; horse_id: string; captured_at: string; storage_path_enhanced: string;
  imageUrl?: string; expiresAt?: string;
};
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
  const pending = new Set<AbortController>();
  let scope = '', generation = 0;
  const clear = () => {
    generation++;
    cache.clear();
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
    work: (request: (horseId: string, params: URLSearchParams) => Promise<{ photos: PrivateRow[]; nextCursor: string | null }>) => Promise<T>,
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
      return body as { photos: PrivateRow[]; nextCursor: string | null };
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
    const missing = rows.filter(row => !valid(cache.get(key(row))));
    for (let index = 0; index < missing.length; index += 100) {
      const ids = missing.slice(index, index + 100).map(row => String(row.id));
      const result = await request(horseId, new URLSearchParams({ ids: ids.join(',') }));
      for (const row of result.photos) {
        if (!valid(row)) throw new PrivatePhotoError('La URL de foto no es válida.', 503);
        const url = new URL(row.imageUrl!);
        if (url.protocol !== 'https:' || url.hostname !== 's3.us-east-1.wasabisys.com')
          throw new PrivatePhotoError('Origen de foto privada inválido.', 503);
        cache.set(key(row), row);
      }
    }
    const result = rows.map(row => {
      const resolved = cache.get(key(row));
      if (!valid(resolved)) throw new PrivatePhotoError('La foto ya no está disponible para esta cuenta.', 403);
      return toCameraImage({ ...row, imageUrl: resolved!.imageUrl, expiresAt: resolved!.expiresAt });
    });
    while (cache.size > MAX_CACHED_URLS) cache.delete(cache.keys().next().value!);
    return result;
  };
  return {
    clear,
    read: (
      horseId: string, viewer: HorseViewer, options: {
        limit: number; since?: string; from?: string; to?: string; cursor?: string; signal?: AbortSignal;
      },
    ) => run(viewer, options.signal, async request => {
      const params = new URLSearchParams({ limit: String(options.limit), metadata: '1' });
      for (const name of ['since', 'from', 'to', 'cursor'] as const)
        if (options[name]) params.set(name, options[name]!);
      const result = await request(horseId, params);
      return { images: await resolve(result.photos, horseId, request), nextCursor: result.nextCursor };
    }),
    renew: (images: CameraImage[], viewer: HorseViewer, signal?: AbortSignal) =>
      run(viewer, signal, async request => {
        if (!images.length) return [];
        const horseId = images[0].horse_id;
        if (images.some(row => row.horse_id !== horseId || row.source !== 'wasabi'))
          throw new PrivatePhotoError('Selección de fotos inválida.', 400);
        return resolve(images.map(row => ({
          id: row.id, horse_id: row.horse_id, captured_at: row.captured_at!,
          storage_path_enhanced: row.storage_path_enhanced,
        })), horseId, request);
      }),
  };
}

function toCameraImage(row: PrivateRow): CameraImage {
  return {
    id: row.id, horse_id: row.horse_id, source: 'wasabi', captured_at: row.captured_at,
    created_at: row.captured_at, uploaded_at: row.captured_at,
    storage_path_enhanced: row.storage_path_enhanced, image_number: 0,
    is_processed: true, notes: null, imageUrl: row.imageUrl, expiresAt: row.expiresAt,
  };
}
