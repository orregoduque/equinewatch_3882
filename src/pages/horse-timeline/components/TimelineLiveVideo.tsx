import { useAuth } from '../../../contexts/AuthContext';
import { pilotRequest, type PilotCamera, type PilotSession } from '../../../features/hls-pilot/api';
import { NO_ACCESS_MESSAGE, PilotAccessError } from '../../../features/hls-pilot/access';
import { createStartupMeasurement, type StartupMeasurement } from '../../../features/hls-pilot/measurement';
import { startPilotPlayback } from '../../../features/hls-pilot/playback';
import { useCallback, useEffect, useRef, useState } from 'react';

interface TimelineLiveVideoProps {
  horseId: string;
  horseName: string;
}

interface ActiveAttempt {
  id: number;
  controller: AbortController;
  dispose?: ReturnType<typeof startPilotPlayback>;
}

const ink = '#40352C';
const border = 'rgba(64,53,44,0.14)';

export default function TimelineLiveVideo({ horseId, horseName }: TimelineLiveVideoProps) {
  const { user } = useAuth();
  const uid = user?.id;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const scrollPositionRef = useRef(0);
  const attemptSequenceRef = useRef(0);
  const activeAttemptRef = useRef<ActiveAttempt | null>(null);
  const startupMeasurementRef = useRef<ReturnType<typeof createStartupMeasurement> | null>(null);
  const identityRef = useRef({ horseId, uid });
  const lastIdentityKeyRef = useRef(`${horseId}:${uid || ''}`);
  const openRef = useRef(false);
  const attemptStartedAtRef = useRef(0);
  const warmExpiryRef = useRef<number>();
  const [open, setOpen] = useState(false);
  const [attemptId, setAttemptId] = useState(0);
  const [loading, setLoading] = useState(false);
  const [failure, setFailure] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);
  const [status, setStatus] = useState('Sin conexión');
  const [measurement, setMeasurement] = useState<StartupMeasurement | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [thresholdExceeded, setThresholdExceeded] = useState(false);

  identityRef.current = { horseId, uid };

  const releaseVideo = useCallback((video = videoRef.current) => {
    if (!video) return;
    video.pause();
    video.removeAttribute('src');
    video.load();
  }, []);

  const cancelActiveAttempt = useCallback(() => {
    window.clearTimeout(warmExpiryRef.current);
    const active = activeAttemptRef.current;
    activeAttemptRef.current = null;
    if (active) {
      active.controller.abort();
      active.dispose?.();
    }
    releaseVideo();
  }, [releaseVideo]);

  const restorePage = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositionRef.current);
      triggerRef.current?.focus({ preventScroll: true });
    });
  }, []);

  const close = useCallback(() => {
    openRef.current = false;
    cancelActiveAttempt();
    if (dialogRef.current?.open) dialogRef.current.close();
    setOpen(false);
    setLoading(false);
    restorePage();
  }, [cancelActiveAttempt, restorePage]);

  const beginAttempt = useCallback((opening = false) => {
    const startupMeasurement = createStartupMeasurement();
    startupMeasurementRef.current = startupMeasurement;
    attemptStartedAtRef.current = performance.now();
    setMeasurement(null);
    setElapsedMs(0);
    setFailure('');
    setAccessDenied(false);
    setStatus('Preparando conexión');
    setThresholdExceeded(false);
    setLoading(true);

    const reusable = opening && activeAttemptRef.current && !activeAttemptRef.current.controller.signal.aborted;
    if (opening) {
      scrollPositionRef.current = window.scrollY;
      openRef.current = true;
      if (!dialogRef.current?.open) dialogRef.current?.showModal();
      setOpen(true);
      window.clearTimeout(warmExpiryRef.current);
      if (reusable) {
        activeAttemptRef.current?.dispose?.activate(startupMeasurement);
        return startupMeasurement;
      }
    }

    const nextId = ++attemptSequenceRef.current;
    setAttemptId(nextId);
    return startupMeasurement;
  }, []);

  useEffect(() => {
    if (!horseId || !uid || document.hidden) return;
    // Allow the timeline's initial render to finish before optional video work.
    const timer = window.setTimeout(() => {
      if (!openRef.current && !activeAttemptRef.current && !document.hidden) beginAttempt();
    }, 500);
    const visibility = () => {
      if (document.hidden && !openRef.current) cancelActiveAttempt();
    };
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', visibility);
      cancelActiveAttempt();
    };
  }, [horseId, uid, beginAttempt, cancelActiveAttempt]);

  useEffect(() => {
    const identityKey = `${horseId}:${uid || ''}`;
    if (lastIdentityKeyRef.current !== identityKey) {
      lastIdentityKeyRef.current = identityKey;
      if (openRef.current) close();
    }
  }, [horseId, uid, close]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!attemptId) return;
    const video = videoRef.current;
    const startupMeasurement = startupMeasurementRef.current;
    if (!video || !startupMeasurement) return;

    const controller = new AbortController();
    const active: ActiveAttempt = { id: attemptId, controller };
    activeAttemptRef.current = active;
    const { signal } = controller;
    let thresholdTimer: number | undefined;
    let discoveryDeadlineTimer: number | undefined;

    const isCurrent = () =>
      activeAttemptRef.current?.id === attemptId &&
      identityRef.current.horseId === horseId &&
      identityRef.current.uid === uid &&
      !signal.aborted;

    const failBeforePlayback = (message: string) => {
      if (!isCurrent()) return;
      setMeasurement(startupMeasurementRef.current!.finish('failed', message, typeof video.requestVideoFrameCallback === 'function'));
      setFailure(message);
      setAccessDenied(message === NO_ACCESS_MESSAGE);
      setStatus('Conexión interrumpida');
      setLoading(false);
      if (thresholdTimer !== undefined) window.clearTimeout(thresholdTimer);
      if (discoveryDeadlineTimer !== undefined) window.clearTimeout(discoveryDeadlineTimer);
      controller.abort();
    };

    const clickElapsed = startupMeasurement.elapsed();
    thresholdTimer = window.setTimeout(() => {
      if (isCurrent() && openRef.current) setThresholdExceeded(true);
    }, Math.max(0, 3000 - clickElapsed));
    const discoveryDeadline = () => {
      const remaining = 12_000 - startupMeasurementRef.current!.elapsed();
      if (remaining > 0) {
        discoveryDeadlineTimer = window.setTimeout(discoveryDeadline, remaining);
        return;
      }
      failBeforePlayback('La búsqueda de configuración y cámara superó el límite de 12 segundos desde el clic.');
    };
    discoveryDeadlineTimer = window.setTimeout(discoveryDeadline, Math.max(0, 12_000 - clickElapsed));

    const run = async () => {
      try {
        if (!horseId) throw new PilotAccessError();

        const configResponse = await fetch('/api/hls-pilot/config', {
          cache: 'no-store',
          credentials: 'same-origin',
          signal,
        });
        if (!configResponse.ok) throw new Error('No se pudo consultar la configuración del piloto de vídeo.');
        const config = await configResponse.json();
        if (!isCurrent()) return;
        if (startupMeasurementRef.current!.elapsed() >= 12_000) {
          failBeforePlayback('La búsqueda de configuración y cámara superó el límite de 12 segundos desde el clic.');
          return;
        }
        if (config.enabled !== true) throw new Error('El piloto de vídeo está deshabilitado.');

        const data = await pilotRequest<{ cameras: PilotCamera[] }>('cameras', signal, uid);
        if (!isCurrent()) return;
        if (startupMeasurementRef.current!.elapsed() >= 12_000) {
          failBeforePlayback('La búsqueda de configuración y cámara superó el límite de 12 segundos desde el clic.');
          return;
        }
        if (!data.cameras.length) throw new PilotAccessError();
        const camera = data.cameras.find((candidate) => candidate.horseId === horseId);
        if (!camera) throw new Error('No hay una cámara asignada a este caballo.');
        if (!camera.ready) throw new Error('La cámara asignada todavía no está lista para transmitir.');

        const callbacks = {
          request: (path: string, requestSignal: AbortSignal) =>
            pilotRequest<PilotSession>(path, requestSignal, uid),
          onStatus: (value: string) => {
            if (isCurrent()) setStatus(value);
          },
          onError: (value: string) => {
            if (!isCurrent()) return;
            controller.abort();
            setFailure(value);
            setAccessDenied(value === NO_ACCESS_MESSAGE);
            setLoading(false);
          },
          onMeasurement: (value: StartupMeasurement) => {
            if (isCurrent()) setMeasurement(value);
          },
          onThreshold: () => {
            if (isCurrent()) setThresholdExceeded(true);
          },
          onMoving: () => {
            if (isCurrent()) setLoading(false);
          },
        };

        if (!isCurrent()) return;
        if (startupMeasurementRef.current!.elapsed() >= 12_000) {
          failBeforePlayback('La búsqueda de configuración y cámara superó el límite de 12 segundos desde el clic.');
          return;
        }
        if (discoveryDeadlineTimer !== undefined) window.clearTimeout(discoveryDeadlineTimer);
        if (thresholdTimer !== undefined) window.clearTimeout(thresholdTimer);
        active.dispose = startPilotPlayback(video, camera.id, callbacks, startupMeasurementRef.current!, !openRef.current);
        if (!openRef.current) {
          warmExpiryRef.current = window.setTimeout(() => {
            if (!openRef.current && isCurrent()) cancelActiveAttempt();
          }, 30_000);
        }
      } catch (error) {
        if (signal.aborted || !isCurrent()) return;
        failBeforePlayback(error instanceof Error ? error.message : 'No se pudo iniciar la transmisión.');
      }
    };

    void run();

    return () => {
      if (thresholdTimer !== undefined) window.clearTimeout(thresholdTimer);
      if (discoveryDeadlineTimer !== undefined) window.clearTimeout(discoveryDeadlineTimer);
      if (activeAttemptRef.current?.id === attemptId) activeAttemptRef.current = null;
      controller.abort();
      active.dispose?.();
      releaseVideo(video);
    };
  }, [attemptId, horseId, releaseVideo, uid, cancelActiveAttempt]);

  useEffect(() => {
    if (!open || !loading) return;
    const updateElapsed = () => {
      const elapsed = performance.now() - attemptStartedAtRef.current;
      setElapsedMs(elapsed);
      if (elapsed >= 3000) setThresholdExceeded(true);
    };
    const timer = window.setInterval(updateElapsed, 100);
    updateElapsed();
    return () => window.clearInterval(timer);
  }, [loading, open, attemptId]);

  const measuredDuration = measurement?.clickToMotionMs ?? measurement?.elapsedMs ?? elapsedMs;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Live video"
        onClick={() => beginAttempt(true)}
        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: ink, background: '#fff', borderColor: border, fontFamily: 'Montserrat, sans-serif' }}
      >
        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: '#9b7652' }} />
        Live video
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="timeline-live-title"
        aria-describedby="timeline-live-description"
        onCancel={(event) => { event.preventDefault(); close(); }}
        onClose={() => {
          if (dialogRef.current?.open) return;
          openRef.current = false;
          cancelActiveAttempt();
          setOpen(false);
          setLoading(false);
          restorePage();
        }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
        className="fixed inset-0 m-0 h-screen h-[100dvh] w-screen max-h-none max-w-none overflow-hidden rounded-none border-0 bg-black p-0 text-white shadow-none backdrop:bg-black"
        style={{ height: '100dvh', width: '100vw', background: '#000', color: '#fff', border: 0 }}
      >
        <h2 id="timeline-live-title" className="sr-only">Live video</h2>
        <p id="timeline-live-description" className="sr-only">
          Transmisión HLS asignada al caballo seleccionado. El estado y la medición reflejan esta sesión de conexión.
        </p>

          <div className="absolute inset-0 overflow-hidden bg-black">
            <video
              ref={videoRef}
              data-testid="timeline-live-video"
              muted
              playsInline
              controls={!accessDenied}
              hidden={accessDenied}
              preload="none"
              aria-label={`Transmisión de vídeo de ${horseName || 'caballo seleccionado'}`}
              className={accessDenied ? 'hidden' : 'absolute inset-0 h-full w-full object-contain'}
            />

            {!accessDenied && <div className="pointer-events-none absolute left-4 right-20 top-[max(1rem,env(safe-area-inset-top))] z-10 flex max-w-xl flex-col items-start gap-2 sm:left-6">
              <span className="rounded-full border border-white/20 bg-black/75 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
                Transmisión de la Raspberry
              </span>
              <div className="rounded-xl border border-white/15 bg-black/75 px-3 py-2 text-xs text-white/90 backdrop-blur-sm">
                <p className="font-semibold">{status}</p>
                <p className="mt-1 tabular-nums text-white/70">
                  {measurement?.clickToMotionMs !== null && measurement?.clickToMotionMs !== undefined
                    ? `Movimiento de fotogramas confirmado en ${(measurement.clickToMotionMs / 1000).toFixed(1)} s`
                    : `Tiempo desde el clic: ${(measuredDuration / 1000).toFixed(1)} s`}
                </p>
                {horseName && <p className="mt-1 text-white/60">{horseName}</p>}
              </div>
            </div>}

            <button
              type="button"
              aria-label="Cerrar vídeo"
              onClick={close}
              className="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-20 grid h-11 w-11 place-items-center rounded-full border border-white/35 bg-black/75 text-2xl leading-none text-white transition-colors hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              ×
            </button>

            {accessDenied && (
              <div role="alert" className="absolute inset-0 grid place-items-center px-6 text-center text-xl text-white">
                <p>{NO_ACCESS_MESSAGE}</p>
              </div>
            )}

            {!accessDenied && loading && (
              <div aria-live="polite" className="absolute inset-0 z-[5] flex items-center justify-center bg-black/45 px-6">
                <div className="w-full max-w-sm rounded-2xl border border-white/15 bg-[#151515]/95 p-6 text-center shadow-2xl">
                  <div className="mx-auto mb-4 h-8 w-8 animate-pulse rounded-full border border-white/50" aria-hidden="true" />
                  <p className="text-sm font-semibold text-white">Conectando con la cámara</p>
                  <p className="mt-2 text-xs tabular-nums text-white/65">
                    Medición en curso · {(elapsedMs / 1000).toFixed(1)} s desde el clic
                  </p>
                </div>
              </div>
            )}

            {!accessDenied && thresholdExceeded && !measurement?.clickToMotionMs && !failure && (
              <p className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-10 rounded-xl border border-white/15 bg-black/80 px-4 py-3 text-sm text-white/90 sm:left-auto sm:right-6 sm:max-w-md">
                Aún no se confirma movimiento de fotogramas. La medición continúa.
              </p>
            )}

            {!accessDenied && failure && (
              <div role="alert" className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-10 flex flex-col gap-3 rounded-xl border border-white/20 bg-black/90 px-4 py-3 text-sm text-white sm:left-auto sm:right-6 sm:max-w-xl sm:flex-row sm:items-center sm:justify-between">
                <p>{failure}</p>
                <button
                  type="button"
                  onClick={() => beginAttempt(false)}
                  className="w-fit shrink-0 rounded-lg bg-white px-4 py-2 font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
                >
                  Reintentar
                </button>
              </div>
            )}
          </div>
      </dialog>
    </>
  );
}
