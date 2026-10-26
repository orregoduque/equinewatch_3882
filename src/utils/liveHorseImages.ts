import { fetchHorseImages, HorseAccessError, CameraImage, HorseViewer } from './supabase';

export const LIVE_PHOTO_REFRESH_MS = 10_000;
const RECONCILE_MS = 60_000;

export function mergeHorseImages(
  previous: CameraImage[], incoming: CameraImage[], limit: number,
): CameraImage[] {
  const identity = (image: CameraImage) => `${image.source || 'supabase'}:${image.id}`;
  const byId = new Map(previous.map(image => [identity(image), image]));
  incoming.forEach(image => byId.set(identity(image), image));
  return [...byId.values()]
    .sort((a, b) =>
      Date.parse(b.captured_at || b.uploaded_at || b.created_at) - Date.parse(a.captured_at || a.uploaded_at || a.created_at)
      || Date.parse(b.created_at) - Date.parse(a.created_at)
      || String(b.id).localeCompare(String(a.id), 'en', { numeric: true }))
    .slice(0, limit);
}

/** Refresh metadata, not the page or the already-cached image files. */
export function watchHorseImages({
  horseId, viewer, limit, onImages, onError, onSettled, photoBackend,
}: {
  horseId: string;
  viewer: HorseViewer;
  limit: number;
  onImages: (images: CameraImage[]) => void;
  onError: (error: Error | null) => void;
  onSettled: () => void;
  photoBackend?: string | null;
}): () => void {
  let active = true;
  let busy = false;
  let loaded = false;
  let images: CameraImage[] = [];
  let lastFullRefresh = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let request: AbortController | undefined;
  const hidden = () => document.visibilityState === 'hidden';

  const refresh = async (forceFull = false) => {
    if (!active || busy || hidden()) return;
    clearTimeout(timer);
    busy = true;
    const full = forceFull || !loaded || Date.now() - lastFullRefresh >= RECONCILE_MS;
    // Recheck the last few records too: their enhanced variant may finish later.
    const boundary = images[Math.min(5, images.length - 1)];
    const since = full ? undefined : boundary?.captured_at || boundary?.uploaded_at || boundary?.created_at;
    try {
      request = new AbortController();
      const incoming = await fetchHorseImages(limit, horseId, viewer, since, request.signal, photoBackend);
      if (!active) return;
      const next = full ? incoming : mergeHorseImages(images, incoming, limit);
      if (!loaded || JSON.stringify(next) !== JSON.stringify(images)) onImages(next);
      images = next;
      loaded = true;
      if (full) lastFullRefresh = Date.now();
      onError(null);
    } catch (error) {
      if (!active) return;
      if (error instanceof HorseAccessError) {
        images = [];
        loaded = false;
        onImages([]);
      }
      onError(error instanceof Error ? error : new Error('No se pudieron actualizar las fotos.'));
    } finally {
      busy = false;
      if (active) {
        onSettled();
        if (!hidden()) timer = setTimeout(() => { void refresh(); }, LIVE_PHOTO_REFRESH_MS);
      }
    }
  };

  const resume = () => { void refresh(true); };
  const visibilityChanged = () => {
    if (hidden()) clearTimeout(timer);
    else resume();
  };
  document.addEventListener('visibilitychange', visibilityChanged);
  window.addEventListener('focus', resume);
  window.addEventListener('online', resume);
  void refresh();

  return () => {
    active = false;
    request?.abort();
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', visibilityChanged);
    window.removeEventListener('focus', resume);
    window.removeEventListener('online', resume);
  };
}
