import { useCallback, useEffect, useRef, useState } from 'react';

const ink = '#40352C';
const muted = 'rgba(64,53,44,0.62)';
const border = 'rgba(64,53,44,0.14)';

export default function TimelineLiveVideo() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
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
        className="w-[min(94vw,900px)] max-w-none overflow-hidden rounded-2xl border p-0 shadow-2xl backdrop:bg-[#211c18]/70"
        style={{ background: '#fbfaf7', color: ink, borderColor: border }}
      >
        <div className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-7" style={{ borderColor: border }}>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: '#8a7356' }}>Muestra de vídeo · demo</p>
            <h2 id="timeline-live-title" className="text-xl font-bold sm:text-2xl" style={{ fontFamily: 'Syne, sans-serif' }}>Live video</h2>
            <p id="timeline-live-description" className="mt-1 max-w-2xl text-sm leading-5" style={{ color: muted }}>
              Clip simulado a partir de una imagen de muestra. Bucle de 5 segundos; no corresponde al caballo seleccionado ni a una conexión en directo.
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar vídeo"
            onClick={close}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full border text-xl leading-none hover:bg-[#f1eee8] focus-visible:outline focus-visible:outline-2"
            style={{ borderColor: border, color: ink }}
          >
            ×
          </button>
        </div>

        {open && (
          <div className="p-4 sm:p-6">
            <div className="relative aspect-video overflow-hidden rounded-xl bg-[#24211e]">
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
              <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/20 bg-[#342f2b]/85 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#fbfaf7]">
                Muestra simulada
              </span>
            </div>
            {failure && (
              <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between" style={{ background: '#f3e9e3', borderColor: '#d8b9aa', color: '#714b40' }}>
                <p>{failure}</p>
                <button type="button" onClick={() => void retry()} className="w-fit shrink-0 rounded-lg px-4 py-2 font-semibold text-white focus-visible:outline focus-visible:outline-2" style={{ background: ink }}>
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
