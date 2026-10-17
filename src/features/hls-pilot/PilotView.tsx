import React from 'react';
import type { PilotCamera } from './api';
import type { StartupMeasurement } from './measurement';

export interface PilotViewProps {
  enabled: boolean | null;
  cameras: PilotCamera[];
  selectedId: string;
  onSelect: (id: string) => void;
  onReload: () => void;
  onStart: () => void;
  onStop: () => void;
  onExport: () => void;
  status: string;
  error: string;
  busy: boolean;
  thresholdExceeded: boolean;
  results: StartupMeasurement[];
  videoRef: React.RefObject<HTMLVideoElement>;
}

const ink = '#342f2b';
const muted = '#77716a';
const line = 'rgba(52, 47, 43, 0.13)';

function formatDuration(value: number | null): string {
  return value === null ? 'No disponible' : `${(value / 1000).toFixed(2)} s`;
}

function formatTimestamp(value: string | null): string {
  if (!value) return 'Sin recepción registrada';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Hora de recepción no disponible'
    : date.toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
}

function outcomeLabel(outcome: StartupMeasurement['outcome']): string {
  switch (outcome) {
    case 'within-target': return 'Dentro del objetivo';
    case 'over-target': return 'Fuera del objetivo';
    case 'failed': return 'Fallida';
    case 'cancelled': return 'Cancelada';
  }
}

function outcomeStyle(outcome: StartupMeasurement['outcome']): React.CSSProperties {
  if (outcome === 'within-target') return { color: '#426048', background: '#e9f0e8' };
  if (outcome === 'over-target') return { color: '#845b25', background: '#f5ecdc' };
  return { color: '#77554f', background: '#f2e8e5' };
}

const PilotView: React.FC<PilotViewProps> = ({
  enabled,
  cameras,
  selectedId,
  onSelect,
  onReload,
  onStart,
  onStop,
  onExport,
  status,
  error,
  busy,
  thresholdExceeded,
  results,
  videoRef,
}) => {
  const selectedCamera = cameras.find((camera) => camera.id === selectedId);
  const canStart = enabled === true && !!selectedCamera && !busy;

  return (
    <main
      className="min-h-[100dvh] px-4 pb-12 pt-8 sm:px-7 sm:pt-12 lg:px-10"
      style={{ background: '#f6f3ed', color: ink }}
    >
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-6 border-b pb-7 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: line }}>
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#8a7356' }} />
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: muted }}>Stable Eye / Piloto privado</p>
            </div>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-5xl" style={{ color: ink, fontFamily: 'Syne, sans-serif' }}>
              Vista en directo
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 sm:text-base" style={{ color: muted }}>
              Comprueba una cámara autorizada de tu caballo. El estado de conexión no confirma por sí solo que el vídeo esté llegando.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <span className="rounded-full border px-3 py-1.5 text-xs font-medium" style={{ borderColor: line, color: muted }}>
              Acceso privado
            </span>
            <button
              type="button"
              onClick={onReload}
              disabled={busy}
              className="rounded-full border px-4 py-2 text-sm font-semibold transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              style={{ borderColor: line, color: ink }}
            >
              Actualizar cámaras
            </button>
          </div>
        </header>

        {enabled === null && (
          <section aria-live="polite" className="mb-5 rounded-2xl border p-5 sm:p-6" style={{ background: '#fbfaf7', borderColor: line }}>
            <div className="mb-3 h-3 w-36 animate-pulse rounded" style={{ background: '#e7e1d7' }} />
            <p className="text-sm" style={{ color: muted }}>Comprobando disponibilidad del piloto…</p>
          </section>
        )}
        {enabled === false && (
          <section className="mb-5 flex flex-col gap-2 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6" style={{ background: '#f0ece5', borderColor: line }}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: muted }}>Estado del servicio</p>
              <h2 className="mt-1 text-xl font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>Piloto desactivado</h2>
              <p className="mt-1 text-sm" style={{ color: muted }}>La reproducción no está disponible en este momento.</p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold" style={{ background: '#e6e0d7', color: '#6e6256' }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: '#8a7356' }} /> Inactivo
            </span>
          </section>
        )}
        {enabled === true && cameras.length === 0 && (
          <section className="mb-5 rounded-2xl border p-5 sm:p-6" style={{ background: '#eeebe3', borderColor: line }}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: muted }}>Acceso a cámaras</p>
            <h2 className="mt-1 text-xl font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>No hay cámaras autorizadas</h2>
            <p className="mt-1 text-sm" style={{ color: muted }}>No se puede iniciar la reproducción sin una cámara disponible en esta cuenta.</p>
          </section>
        )}

        <section className="mb-7 grid gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="overflow-hidden rounded-2xl border" style={{ background: '#fbfaf7', borderColor: line }}>
            <div className="flex flex-col gap-4 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" style={{ borderColor: line }}>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: muted }}>Cámara seleccionada</p>
                <h2 className="mt-1 truncate text-lg font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>
                  {selectedCamera?.name || 'Selecciona una cámara'}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs" style={{ color: muted }}>
                <span className="h-2 w-2 rounded-full" style={{ background: status ? '#b18a4c' : '#aaa39a' }} />
                <span>{status || 'Sin conexión verificada'}</span>
              </div>
            </div>

            <div className="relative aspect-video min-h-[220px] bg-[#262521]">
              <video
                ref={videoRef}
                controls
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-contain"
                aria-label="Vídeo en directo de la cámara seleccionada"
              />
              {(!selectedCamera || enabled !== true) && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center">
                  <p className="max-w-sm text-sm leading-6 text-[#e8e2d8]">
                    {enabled === false ? 'Piloto desactivado. No hay reproducción disponible.' : enabled === null ? 'Comprobando disponibilidad del piloto.' : 'El reproductor espera una cámara autorizada. No hay vídeo verificado.'}
                  </p>
                </div>
              )}
              {busy && (
                <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs text-white">
                  Preparando conexión
                </div>
              )}
            </div>

            <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="max-w-lg text-xs leading-5" style={{ color: muted }}>
                La imagen solo aparecerá cuando se establezca la conexión. El estado no confirma que el vídeo esté llegando ni mide el retraso real.
              </p>
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onStart}
                  disabled={!canStart}
                  className="rounded-full px-5 py-2.5 text-sm font-semibold text-[#fbfaf7] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ background: '#403b35' }}
                >
                  Ver vídeo
                </button>
                <button
                  type="button"
                  onClick={onStop}
                  disabled={enabled !== true}
                  className="rounded-full border px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
                  style={{ borderColor: line, color: ink }}
                >
                  Cerrar conexión
                </button>
              </div>
            </div>
          </div>

          <aside className="rounded-2xl border p-5 sm:p-6" style={{ background: '#eeebe3', borderColor: line }}>
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: muted }}>Cámaras autorizadas</p>
                <h2 className="mt-2 text-xl font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>Acceso disponible</h2>
              </div>
              <span className="rounded-full px-2.5 py-1 text-xs font-semibold" style={{ background: '#e2ddd3', color: muted }}>{cameras.length}</span>
            </div>
            {cameras.length === 0 ? (
              <div className="rounded-xl border border-dashed p-4 text-sm leading-6" style={{ borderColor: 'rgba(52,47,43,.22)', color: muted }}>
                No hay cámaras autorizadas para esta cuenta.
              </div>
            ) : (
              <div className="space-y-2">
                {cameras.map((camera) => {
                  const selected = camera.id === selectedId;
                  return (
                    <button
                      type="button"
                      key={camera.id}
                      onClick={() => onSelect(camera.id)}
                      disabled={busy}
                      aria-pressed={selected}
                      className="w-full rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        borderColor: selected ? '#8a7356' : 'rgba(52,47,43,.12)',
                        background: selected ? '#faf8f3' : 'rgba(255,255,255,.35)',
                      }}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-semibold">{camera.name}</span>
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: camera.ready ? '#82927a' : '#b4a38b' }} />
                      </span>
                      <span className="mt-1.5 block text-[11px]" style={{ color: muted }}>
                        {camera.ready ? 'Señal disponible según el servidor' : 'Estado de señal no listo'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
            {selectedCamera && (
              <dl className="mt-5 space-y-3 border-t pt-4 text-xs" style={{ borderColor: line }}>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: muted }}>Segmentos recibidos</dt>
                  <dd className="font-medium tabular-nums">{selectedCamera.segments}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt style={{ color: muted }}>Datos en búfer</dt>
                  <dd className="font-medium tabular-nums">{selectedCamera.bufferedBytes.toLocaleString('es')} bytes</dd>
                </div>
                <div>
                  <dt className="mb-1" style={{ color: muted }}>Última recepción</dt>
                  <dd className="font-medium leading-5">{formatTimestamp(selectedCamera.lastReceivedAt)}</dd>
                </div>
              </dl>
            )}
          </aside>
        </section>

        {error && (
          <div role="alert" className="mb-6 rounded-xl border px-4 py-3 text-sm leading-6" style={{ borderColor: '#d8b9aa', background: '#f3e9e3', color: '#714b40' }}>
            <span className="font-semibold">No se pudo completar la acción.</span> {error}
          </div>
        )}

        {thresholdExceeded && (
          <div role="status" className="mb-6 flex gap-3 rounded-xl border px-4 py-4 sm:px-5" style={{ borderColor: '#ddc59b', background: '#f5efdf', color: '#765d35' }}>
            <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full" style={{ background: '#b58a45' }} />
            <p className="text-sm leading-6"><strong className="font-semibold">Aviso del umbral:</strong> se ha superado el objetivo de 3 segundos en al menos una medición. Este resultado describe el tiempo hasta movimiento visible, no el retraso real de la cámara en el mundo.</p>
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border" style={{ background: '#fbfaf7', borderColor: line }}>
          <div className="flex flex-col gap-4 border-b px-5 py-5 sm:flex-row sm:items-end sm:justify-between sm:px-6" style={{ borderColor: line }}>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: muted }}>Registro del piloto</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]" style={{ fontFamily: 'Syne, sans-serif' }}>Mediciones de inicio</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5" style={{ color: muted }}>
                El objetivo compara el clic con el movimiento visible en pantalla. No es una medición de latencia de extremo a extremo ni del retraso en tiempo real.
              </p>
            </div>
            <button
              type="button"
              onClick={onExport}
              disabled={results.length === 0}
              className="w-fit rounded-full border px-4 py-2 text-sm font-semibold transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
              style={{ borderColor: line, color: ink }}
            >
              Exportar mediciones
            </button>
          </div>

          {results.length === 0 ? (
            <div className="px-5 py-10 text-center sm:px-6">
              <p className="text-sm font-medium">Todavía no hay mediciones</p>
              <p className="mt-1 text-xs" style={{ color: muted }}>Los resultados aparecerán aquí después de intentar iniciar una conexión.</p>
            </div>
          ) : (
            <>
              <div className="hidden grid-cols-[1.25fr_1fr_1fr_1.3fr] gap-4 px-6 py-3 text-[10px] font-semibold uppercase tracking-[0.15em] sm:grid" style={{ color: muted, background: '#f4f1eb' }}>
                <span>Resultado</span><span>Clic a movimiento</span><span>Tiempo transcurrido</span><span>Detalle</span>
              </div>
              <ol className="divide-y" style={{ borderColor: line }}>
                {results.map((result, index) => (
                  <li key={`${result.elapsedMs}-${index}`} className="grid gap-3 px-5 py-4 sm:grid-cols-[1.25fr_1fr_1fr_1.3fr] sm:items-center sm:gap-4 sm:px-6" style={{ borderColor: line }}>
                    <div>
                      <span className="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" style={outcomeStyle(result.outcome)}>{outcomeLabel(result.outcome)}</span>
                      <p className="mt-1.5 text-[11px]" style={{ color: muted }}>Umbral: ≤ {result.targetMs / 1000} s</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] sm:hidden" style={{ color: muted }}>Clic a movimiento</p>
                      <p className="mt-1 font-semibold tabular-nums">{result.clickToMotionMs === null ? 'No medido' : formatDuration(result.clickToMotionMs)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.12em] sm:hidden" style={{ color: muted }}>Tiempo transcurrido</p>
                      <p className="mt-1 font-medium tabular-nums">{formatDuration(result.elapsedMs)}</p>
                    </div>
                    <div className="text-xs leading-5" style={{ color: muted }}>
                      {result.outcome === 'failed' ? (result.error || 'La conexión no pudo iniciarse.')
                        : result.outcome === 'cancelled' ? (result.error || 'Inicio cancelado antes de completar la medición.')
                          : result.measurementMethod === 'unavailable' ? 'Medición de movimiento no disponible en este navegador.'
                            : 'Movimiento visible detectado; no representa latencia real de cámara.'}
                    </div>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
        <footer className="mt-5 flex flex-col gap-1 text-[11px] sm:flex-row sm:justify-between" style={{ color: muted }}>
          <span>Los estados de la cámara indican información recibida del servidor, no validación visual del vídeo.</span>
          <span>Umbral de inicio: 3 segundos</span>
        </footer>
      </div>
    </main>
  );
};

export default PilotView;
