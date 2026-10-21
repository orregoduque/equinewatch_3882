import { useEffect, useState } from 'react';
import { CameraImage, HorseViewer, fetchHorseImagesForHour } from '../utils/supabase';

export function useHourlyHorseImages(
  horseId: string, viewer: HorseViewer | null, viewerKey: string,
  selection: { day: string; hour: number } | null,
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
    setResult({ key, images: [], loading: true, error: '' });
    fetchHorseImagesForHour(horseId, viewer, selection.day, selection.hour, controller.signal)
      .then(images => { if (active) setResult({ key, images, loading: false, error: '' }); })
      .catch(() => {
        if (active) setResult({ key, images: [], loading: false,
          error: 'No se pudieron cargar las fotos de esta hora. Prueba otra hora o vuelve a intentarlo.' });
      });
    return () => { active = false; controller.abort(); };
  }, [key, horseId, viewerKey, revision]);
  const current = result.key === key ? result
    : { key, images: [], loading: !!selection && !!viewer && !!horseId, error: '' };
  return { ...current, retry: () => setRevision(value => value + 1) };
}
