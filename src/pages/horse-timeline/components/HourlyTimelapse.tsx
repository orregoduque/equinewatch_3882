import React, { useEffect, useRef, useState } from 'react';
import {
  CameraImage, HorseViewer, fetchHorseImagesForHour, getImageUrl, loadPrivatePhoto,
} from '../../../utils/supabase';
import { TIMELAPSE_FPS, TIMELAPSE_FRAME_MS, TimelapseFrames } from '../../../utils/timelapseFrames';

interface Props {
  horseId: string;
  horseName: string;
  viewer: HorseViewer;
  day: string;
  hour: number;
  photoBackend?: string | null;
  onClose: () => void;
}

/** Mounted only by the explicit hourly button; never shares the gallery array. */
export default function HourlyTimelapse({
  horseId, horseName, viewer, day, hour, photoBackend, onClose,
}: Props) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(false);
  const [shown, setShown] = useState<{ index: number; url: string } | null>(null);
  const [revision, setRevision] = useState(0);
  const frames = useRef<TimelapseFrames>();
  const position = useRef(0);
  const finished = useRef(false);
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...(dialog.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || [])];
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first?.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', keydown);
      previousFocus?.focus();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let buffer: TimelapseFrames | undefined;
    const decoded = new Map<string, HTMLImageElement>();
    const release = (src: string) => {
      const image = decoded.get(src);
      if (image) { image.src = ''; decoded.delete(src); }
    };
    setLoading(true); setError(''); setShown(null); setPlaying(false); setCount(0);
    position.current = 0; finished.current = false;
    const load = async () => {
      try {
        const photos: CameraImage[] = await fetchHorseImagesForHour(
          horseId, viewer, day, hour, controller.signal, photoBackend, 360,
        );
        if (!active) return;
        setCount(photos.length);
        if (!photos.length) { setLoading(false); return; }
        buffer = new TimelapseFrames(photos.length, async (index, signal) => {
          const photo = photos[index];
          const authorized = photo.source === 'wasabi'
            ? await loadPrivatePhoto(photo, viewer, signal) : null;
          const src = authorized ? (authorized.photo_url || authorized.imageUrl)!
            : getImageUrl(photo.storage_path_enhanced);
          if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
          const abort = () => release(src);
          try {
            // Native image loading preserves existing cross-origin image access:
            // no new bucket CORS permission or readable canvas/blob is needed.
            const image = new window.Image();
            decoded.set(src, image);
            signal.addEventListener('abort', abort, { once: true });
            image.src = src;
            await image.decode();
            return src;
          } catch (error) { release(src); throw error; }
          finally { signal.removeEventListener('abort', abort); }
        }, release);
        frames.current = buffer;
        const url = await buffer.frame(0);
        if (active) { setShown({ index: 0, url }); setLoading(false); setPlaying(true); }
      } catch (error) {
        if (active) {
          setError(error instanceof Error ? error.message : 'No se pudo generar el timelapse.');
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      active = false; controller.abort(); buffer?.close();
      for (const src of decoded.keys()) release(src);
      if (frames.current === buffer) frames.current = undefined;
    };
  }, [horseId, viewer.id, day, hour, photoBackend, revision]);

  useEffect(() => {
    if (!playing || !frames.current || !count) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let deadline = performance.now();
    const next = async () => {
      if (position.current + 1 >= count) {
        finished.current = true; setPlaying(false); return;
      }
      const index = position.current + 1;
      try {
        setBuffering(true);
        const url = await frames.current!.frame(index);
        if (!active) return;
        position.current = index;
        setShown({ index, url }); setBuffering(false);
        // Keep 15 fps when ready; don't skip care events to catch up after buffering.
        deadline = Math.max(deadline + TIMELAPSE_FRAME_MS, performance.now());
        timer = setTimeout(next, Math.max(0, deadline - performance.now()));
      } catch {
        if (active) {
          setPlaying(false); setBuffering(false);
          setError('No se pudo cargar un fotograma. Vuelve a generar el timelapse.');
        }
      }
    };
    deadline += TIMELAPSE_FRAME_MS;
    timer = setTimeout(next, TIMELAPSE_FRAME_MS);
    const hidden = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', hidden);
    return () => {
      active = false; clearTimeout(timer);
      document.removeEventListener('visibilitychange', hidden);
    };
  }, [playing, count]);

  const togglePlayback = async () => {
    if (finished.current) {
      const buffer = frames.current;
      if (!buffer) return;
      try {
        setBuffering(true);
        const url = await buffer.frame(0);
        if (frames.current !== buffer) return;
        position.current = 0; finished.current = false;
        setShown({ index: 0, url }); setBuffering(false); setPlaying(true);
      } catch {
        if (frames.current === buffer) {
          setBuffering(false); setError('No se pudo repetir el timelapse.');
        }
      }
    } else setPlaying(value => !value);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-3">
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="timelapse-title"
        className="w-full max-w-4xl rounded-xl bg-[#F8F6F2] overflow-hidden text-[#40352C]">
        <div className="p-3 flex items-center justify-between gap-3">
          <div>
            <h2 id="timelapse-title" className="font-bold">Timelapse · {horseName}</h2>
            <p className="text-sm">{day} · {String(hour).padStart(2, '0')}:00 · {count} fotos · {(count / TIMELAPSE_FPS).toFixed(1)} s a 15 fps</p>
          </div>
          <button ref={closeButton} onClick={onClose} aria-label="Cerrar timelapse"
            className="min-w-[44px] min-h-[44px] text-2xl">×</button>
        </div>
        <div className="aspect-video bg-black flex items-center justify-center text-white relative">
          {shown && <img src={shown.url} alt={`Timelapse de ${horseName}, fotograma ${shown.index + 1}`}
            className="w-full h-full object-contain" />}
          {!shown && <p role="status">{loading ? 'Preparando timelapse…'
            : error ? 'No se pudo preparar el timelapse.' : 'No hay fotos en esta hora.'}</p>}
        </div>
        <div className="p-3 flex flex-wrap items-center gap-3">
          <button onClick={togglePlayback} disabled={loading || !count || !!error}
            className="min-h-[44px] px-4 rounded-lg bg-[#40352C] text-white disabled:opacity-40">
            {playing ? 'Pausa' : finished.current ? 'Repetir' : 'Play'}
          </button>
          <span aria-label="Progreso del timelapse" className="text-sm">
            {shown ? shown.index + 1 : 0} / {count}
          </span>
          {buffering && playing && <span className="text-sm">Cargando siguiente fotograma…</span>}
          {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
          {error && <button className="min-h-[44px] px-3 underline" onClick={() => setRevision(value => value + 1)}>
            Reintentar
          </button>}
        </div>
      </div>
    </div>
  );
}
