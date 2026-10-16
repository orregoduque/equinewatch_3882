import { fetchHorseImages, HorseAccessError, HorseImage, HorseViewer } from './supabase';

export const LIVE_PHOTO_REFRESH_MS = 10_000;
const RECONCILE_MS = 60_000;

export function mergeHorseImages(
  previous: HorseImage[], incoming: HorseImage[], limit: number,
): HorseImage[] {
  const byId = new Map(previous.map(image => [image.id, image]));
  incoming.forEach(image => byId.set(image.id, image));
  return [...byId.values()]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at) || b.id - a.id)
    .slice(0, limit);
}

/** Refresh metadata, not the page or the already-cached image files. */
export function watchHorseImages({
  horseId, viewer, limit, onImages, onError, onSettled,
}: {
  horseId: string;
  viewer: HorseViewer;
  limit: number;
  onImages: (images: HorseImage[]) => void;
  onError: (error: Error | null) => void;
  onSettled: () => void;
}): () => void {
  let active = true;
  let busy = false;
  let loaded = false;
  let images: HorseImage[] = [];
  let lastFullRefresh = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const hidden = () => document.visibilityState === 'hidden';

  const refresh = async (forceFull = false) => {
    if (!active || busy || hidden()) return;
    clearTimeout(timer);
    busy = true;
    const full = forceFull || !loaded || Date.now() - lastFullRefresh >= RECONCILE_MS;
    // Recheck the last few records too: their enhanced variant may finish later.
    const since = full ? undefined : images[Math.min(5, images.length - 1)]?.created_at;
    try {
      const incoming = await fetchHorseImages(limit, horseId, viewer, since);
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
    clearTimeout(timer);
    document.removeEventListener('visibilitychange', visibilityChanged);
    window.removeEventListener('focus', resume);
    window.removeEventListener('online', resume);
  };
}
