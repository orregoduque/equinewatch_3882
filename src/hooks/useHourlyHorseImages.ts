import { useEffect, useState } from 'react';
import { CameraImage, HorseViewer, fetchHorseImagesForHour, renewKnownPrivatePhotos } from '../utils/supabase';

export function useHourlyHorseImages(
  horseId: string, viewer: HorseViewer | null, viewerKey: string,
  selection: { day: string; hour: number } | null,
  photoBackend?: string | null,
) {
  const key = selection ? JSON.stringify([viewerKey, horseId, selection.day, selection.hour]) : '';
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<{
    key: string; images: CameraImage[]; loading: boolean; error: string;
  }>({ key: '', images: [], loading: false, error: '' });
  useEffect(() => {
    if (!selection || !horseId || !viewer) {
      setResult({ key: '', images: [], loading: false, error: '' });
      return;
    }
    const controller = new AbortController();
    let active = true;
    let currentImages: CameraImage[] = [];
    let timer: ReturnType<typeof setTimeout> | undefined;
    let renewing = false;
    let listening = false;
    const schedule = () => {
      clearTimeout(timer);
      if (!active || !currentImages.some(row => row.source === 'wasabi') || document.visibilityState === 'hidden') return;
      const expires = Math.min(...currentImages.filter(row => row.expiresAt).map(row => Date.parse(row.expiresAt!)));
      timer = setTimeout(() => { void resume(); }, Math.max(1000, expires - Date.now() - 60_000));
    };
    const resume = async () => {
      if (!active || renewing || document.visibilityState === 'hidden' || !currentImages.length) return;
      if (currentImages.every(row => Date.parse(row.expiresAt!) > Date.now() + 60_000)) { schedule(); return; }
      renewing = true;
      try {
        const images = await renewKnownPrivatePhotos(currentImages, viewer, controller.signal);
        if (active) {
          currentImages = images;
          setResult({ key, images, loading: false, error: '' });
        }
      } catch {
        if (active) {
          currentImages = [];
          setResult({ key, images: [], loading: false,
            error: 'No se pudo renovar el acceso a las fotos privadas. Vuelve a intentarlo con una sesión válida.' });
        }
      } finally {
        renewing = false;
        if (active) schedule();
      }
    };
    const visibilityChanged = () => {
      if (document.visibilityState === 'hidden') clearTimeout(timer);
      else void resume();
    };
    setResult({ key, images: [], loading: true, error: '' });
    fetchHorseImagesForHour(horseId, viewer, selection.day, selection.hour, controller.signal, photoBackend)
      .then(images => {
        if (!active) return;
        currentImages = images;
        setResult({ key, images, loading: false, error: '' });
        if (images.some(row => row.source === 'wasabi')) {
          listening = true;
          document.addEventListener('visibilitychange', visibilityChanged);
          window.addEventListener('focus', resume);
          schedule();
        }
      })
      .catch(error => {
        if (active) setResult({ key, images: [], loading: false,
          error: error instanceof Error ? error.message : 'No se pudieron cargar las fotos de esta hora. Prueba otra hora o vuelve a intentarlo.' });
      });
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
      // Legacy Supabase photos do not install any additional listeners.
      if (listening) {
        document.removeEventListener('visibilitychange', visibilityChanged);
        window.removeEventListener('focus', resume);
      }
    };
  }, [key, horseId, viewerKey, revision, photoBackend]);
  const current = result.key === key ? result
    : { key, images: [], loading: !!selection && !!viewer && !!horseId, error: '' };
  return { ...current, retry: () => setRevision(value => value + 1) };
}
