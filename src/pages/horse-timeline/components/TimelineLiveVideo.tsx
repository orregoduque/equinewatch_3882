import { useCallback, useEffect, useRef, useState } from 'react';

const ink = '#40352C';
const border = 'rgba(64,53,44,0.14)';

export default function TimelineLiveVideo() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const scrollPositionRef = useRef(0);
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState('');

  const releaseVideo = useCallback((video = videoRef.current) => {
    if (!video) return;
    video.pause();
    video.removeAttribute('src');
    video.load();
  }, []);

  const close = useCallback(() => {
    releaseVideo();
    if (dialogRef.current?.open) dialogRef.current.close();
    setOpen(false);
    window.requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositionRef.current);
      triggerRef.current?.focus({ preventScroll: true });
    });
  }, [releaseVideo]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const video = videoRef.current;
    let active = true;
    if (video) {
      video.play().then(() => { if (active) setFailure(''); }).catch(() => {
        if (active) setFailure('La reproducción automática no se pudo iniciar. Usa Reproducir para intentarlo de nuevo.');
      });
    }
    return () => {
      active = false;
      document.body.style.overflow = previousOverflow;
      releaseVideo(video);
    };
  }, [open, releaseVideo]);

  const openVideo = () => {
    setFailure('');
    scrollPositionRef.current = window.scrollY;
    dialogRef.current?.showModal();
    setOpen(true);
  };

  const retry = async () => {
    const video = videoRef.current;
    if (!video) return;
    setFailure('');
    try {
      await video.play();
    } catch {
      setFailure('No se pudo reproducir el vídeo. Comprueba la carga e inténtalo de nuevo con los controles.');
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label="Live video"
        onClick={openVideo}
        className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors hover:opacity-85 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        style={{ color: ink, background: '#fff', borderColor: border, fontFamily: 'Montserrat, sans-serif' }}
      >
        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: '#9b7652' }} />
        Live video
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide" style={{ background: '#f3eee5', color: '#765d35' }}>
          Demo
        </span>
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="timeline-live-title"
        aria-describedby="timeline-live-description"
        onCancel={(event) => { event.preventDefault(); close(); }}
        onClose={() => { releaseVideo(); setOpen(false); }}
        onClick={(event) => { if (event.target === event.currentTarget) close(); }}
        className="fixed inset-0 m-0 h-screen h-[100dvh] w-screen max-h-none max-w-none overflow-hidden rounded-none border-0 bg-black p-0 text-white shadow-none backdrop:bg-black"
        style={{ height: '100dvh', width: '100vw', background: '#000', color: '#fff', border: 0 }}
      >
        <h2 id="timeline-live-title" className="sr-only">Live video</h2>
        <p id="timeline-live-description" className="sr-only">
          Clip simulado a partir de una imagen de muestra. Bucle de 5 segundos; no corresponde al caballo seleccionado ni a una conexión en directo.
        </p>

        {open && (
          <div className="absolute inset-0 overflow-hidden bg-black">
            <div className="absolute inset-0 bg-black">
              <video
                ref={videoRef}
                data-testid="timeline-live-video"
                src="/media/hls-demo-5s.mp4"
                autoPlay
                loop
                muted
                playsInline
                controls
                preload="auto"
                aria-label="Vídeo de demostración simulado, bucle de 5 segundos"
                onError={() => setFailure('No se pudo cargar el archivo de vídeo de demostración.')}
                onPlay={() => setFailure('')}
                className="absolute inset-0 h-full w-full object-contain"
              />
            </div>
            <span className="pointer-events-none absolute left-4 top-[max(1rem,env(safe-area-inset-top))] rounded-full border border-white/20 bg-black/75 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
              Demo · vídeo simulado
            </span>
            <button
              type="button"
              aria-label="Cerrar vídeo"
              onClick={close}
              className="absolute right-[max(1rem,env(safe-area-inset-right))] top-[max(1rem,env(safe-area-inset-top))] z-20 grid h-11 w-11 place-items-center rounded-full border border-white/35 bg-black/75 text-2xl leading-none text-white transition-colors hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              ×
            </button>
            {failure && (
              <div role="alert" className="absolute bottom-[max(1rem,env(safe-area-inset-bottom))] left-4 right-4 z-10 flex flex-col gap-3 rounded-xl border border-white/20 bg-black/85 px-4 py-3 text-sm text-white sm:left-auto sm:right-6 sm:max-w-xl sm:flex-row sm:items-center sm:justify-between">
                <p>{failure}</p>
                <button type="button" onClick={() => void retry()} className="w-fit shrink-0 rounded-lg bg-white px-4 py-2 font-semibold text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">
                  Reproducir
                </button>
              </div>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
