import React, { useRef, useState } from 'react';

const ink = '#342f2b';
const muted = '#77716a';
const line = 'rgba(52, 47, 43, 0.13)';

const MockVideoDemo: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playError, setPlayError] = useState('');
  const [loadError, setLoadError] = useState(false);

  const play = async () => {
    const video = videoRef.current;
    if (!video) return;
    setPlayError('');
    try {
      await video.play();
    } catch {
      setPlayError('No se pudo iniciar la reproducción. Prueba con los controles del vídeo.');
    }
  };

  return (
    <section
      id="demo-video"
      aria-labelledby="demo-video-title"
      className="min-h-[100dvh] px-4 py-10 sm:px-7 sm:py-14 lg:px-10"
      style={{ background: '#f6f3ed', color: ink }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-7 border-b pb-6 sm:mb-8 sm:pb-7" style={{ borderColor: line }}>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#8a7356' }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: muted }}>
              Stable Eye / Muestra visual
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2
                id="demo-video-title"
                className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl"
                style={{ color: ink, fontFamily: 'Syne, sans-serif' }}
              >
                Vídeo de demostración
              </h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 sm:text-base" style={{ color: muted }}>
                Una muestra breve para ver cómo se presenta el vídeo en esta página.
              </p>
            </div>
            <span
              className="inline-flex w-fit items-center rounded-full border px-3 py-1.5 text-xs font-semibold"
              style={{ borderColor: '#ddc59b', background: '#f5efdf', color: '#765d35' }}
            >
              Muestra sintética · no es una cámara
            </span>
          </div>
        </header>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="overflow-hidden rounded-2xl border" style={{ background: '#fbfaf7', borderColor: line }}>
            <div className="relative aspect-video min-h-[220px] bg-[#262521]">
              <video
                ref={videoRef}
                data-testid="mock-video"
                src="/media/hls-demo-5s.mp4"
                autoPlay
                loop
                muted
                playsInline
                controls
                preload="metadata"
                aria-label="Vídeo de demostración en bucle"
                onError={() => setLoadError(true)}
                onLoadedMetadata={() => setLoadError(false)}
                onPlay={() => setPlayError('')}
                className="absolute inset-0 h-full w-full object-contain"
              />
              <span className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/20 bg-[#342f2b]/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#fbfaf7] sm:left-4 sm:top-4">
                Muestra simulada
              </span>
            </div>
            <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="max-w-xl text-xs leading-5" style={{ color: muted }}>
                Bucle de 5 segundos a partir de una imagen de muestra, con movimiento simulado. No es una cámara en directo,
                no prueba HLS ni mide el inicio de vídeo en 3 segundos o menos.
              </p>
              <button
                type="button"
                onClick={() => void play()}
                className="w-fit shrink-0 rounded-full px-5 py-2.5 text-sm font-semibold text-[#fbfaf7] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8a7356]"
                style={{ background: '#403b35' }}
              >
                Reproducir
              </button>
            </div>
          </div>

          <aside className="rounded-2xl border p-5 sm:p-6" style={{ background: '#eeebe3', borderColor: line }}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: muted }}>
              Acerca de esta muestra
            </p>
            <h3 className="mt-2 text-xl font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>
              Solo una imagen en movimiento
            </h3>
            <p className="mt-3 text-sm leading-6" style={{ color: muted }}>
              El paneo y el acercamiento son efectos aplicados a una imagen fija. Usa los controles nativos para pausar o
              reanudar el bucle.
            </p>
            <div className="mt-5 border-t pt-4" style={{ borderColor: line }}>
              <p className="text-xs leading-5" style={{ color: muted }}>
                Esta demostración no representa el estado, la conexión ni el rendimiento de ninguna cámara.
              </p>
            </div>
          </aside>
        </div>

        {(loadError || playError) && (
          <div
            role="alert"
            className="mt-5 rounded-xl border px-4 py-3 text-sm leading-6"
            style={{ borderColor: '#d8b9aa', background: '#f3e9e3', color: '#714b40' }}
          >
            {loadError
              ? 'No se pudo cargar el archivo de vídeo de demostración.'
              : playError}
          </div>
        )}
      </div>
    </section>
  );
};

export default MockVideoDemo;
