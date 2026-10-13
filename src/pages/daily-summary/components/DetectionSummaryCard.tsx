import React from 'react';
import Icon from '../../../components/AppIcon';
import {
  DetectionSummary,
  formatDetectionDuration,
  formatDetectionPercentage,
} from '../detectionAnalysis';

interface DetectionSummaryCardProps {
  summary: DetectionSummary;
  error?: string;
}

const DetectionSummaryCard: React.FC<DetectionSummaryCardProps> = ({ summary, error }) => {
  const {
    detectedPhotos: detectedCount,
    notDetectedPhotos: notDetectedCount,
    unknownPhotos: unreadableCount,
    averageConfidence,
  } = summary;

  return (
    <section
      aria-labelledby="daily-detection-heading"
      className="rounded-xl p-5 sm:p-6"
      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.07)' }}>
            <Icon name="Activity" size={20} style={{ color: '#40352C' }} />
          </div>
          <div>
            <h2 id="daily-detection-heading" className="text-lg sm:text-xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
              Análisis de fotos
            </h2>
            <p className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>
              Resultados registrados para el día seleccionado
            </p>
          </div>
        </div>
        <span className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>
          {error ? 'Análisis no disponibles' : <>{summary.totalPhotos} {summary.totalPhotos === 1 ? 'foto analizada' : 'fotos analizadas'}</>}
        </span>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ color: '#9f3f3f', backgroundColor: 'rgba(199,80,80,0.08)', border: '1px solid rgba(199,80,80,0.2)' }}>
          No se pudieron cargar los análisis: {error}
        </div>
      )}

      {summary.totalPhotos > 0 ? (
        <>
          <div className="mb-5 rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'rgba(74,157,107,0.08)', border: '1px solid rgba(74,157,107,0.2)' }}>
            <p className="text-sm font-medium" style={{ color: '#32734a' }}>Tiempo estimado en la pesebrera</p>
            <p className="mt-1 text-3xl font-bold" style={{ color: '#32734a', fontFamily: 'Syne, sans-serif' }}>
              {detectedCount + notDetectedCount > 0
                ? formatDetectionDuration(summary.estimatedPresenceSeconds)
                : 'No disponible'}
            </p>
            <p className="mt-2 text-sm" style={{ color: 'rgba(64,53,44,0.7)' }}>
              {detectedCount} fotos con detección × 10 segundos por foto.
              {' '}Tiempo analizado: <strong>{formatDetectionDuration(summary.analyzedSeconds)}</strong>.
            </p>
          </div>
          <p className="mb-5 rounded-lg px-4 py-3 text-sm" style={{ color: '#40352C', backgroundColor: '#F8F6F2' }}>
            {detectedCount + notDetectedCount > 0
              ? <>El modelo señaló al caballo en <strong>{detectedCount}</strong> de{' '}
                <strong>{detectedCount + notDetectedCount}</strong> análisis interpretables.</>
              : <>Los registros del día no contienen un resultado que se pueda interpretar.</>}
            {unreadableCount > 0 && <> Hay {unreadableCount} {unreadableCount === 1 ? 'resultado que no se pudo interpretar' : 'resultados que no se pudieron interpretar'}.</>}
            {' '}Un resultado sin detección no confirma que el caballo estuviera ausente.
          </p>

          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Fotos analizadas', value: summary.totalPhotos, color: '#40352C' },
              { label: 'Detecciones', value: detectedCount, color: '#4a9d6b' },
              { label: 'Sin detección', value: notDetectedCount, color: '#6b8e9f' },
              {
                label: 'Confianza media',
                value: averageConfidence === null ? '—' : formatDetectionPercentage(averageConfidence),
                color: '#d4a84b',
              },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg p-3" style={{ backgroundColor: '#F8F6F2' }}>
                <dt className="text-xs leading-5" style={{ color: 'rgba(64,53,44,0.6)' }}>{stat.label}</dt>
                <dd className="mt-1 text-xl font-bold" style={{ color: stat.color }}>{stat.value}</dd>
              </div>
            ))}
          </dl>
          {averageConfidence !== null && (
            <p className="-mt-3 mb-5 text-xs" style={{ color: 'rgba(64,53,44,0.55)' }}>
              La confianza media considera solo las detecciones que incluyen ese dato.
            </p>
          )}

          {summary.models.length > 0 && (
            <p className="break-words text-xs" style={{ color: 'rgba(64,53,44,0.55)' }}>
              {summary.models.length === 1 ? 'Modelo' : 'Modelos'}: {summary.models.join(', ')}.
              {summary.thresholds.length > 0 && <> Umbrales registrados: {summary.thresholds.map(formatDetectionPercentage).join(', ')}.</>}
            </p>
          )}
          <p className="mt-3 text-xs" style={{ color: 'rgba(64,53,44,0.55)' }}>
            Es una estimación basada únicamente en las fotos recibidas. Los periodos sin fotos o sin detección no se suman al tiempo estimado.
          </p>
        </>
      ) : (
        !error && (
          <p className="rounded-lg px-4 py-6 text-center text-sm" style={{ color: 'rgba(64,53,44,0.6)', backgroundColor: '#F8F6F2' }}>
            No hay fotos analizadas para este caballo en esta fecha.
          </p>
        )
      )}

      <p className="mt-5 flex items-start gap-2 pt-4 text-xs" style={{ color: 'rgba(64,53,44,0.55)', borderTop: '1px solid rgba(64,53,44,0.08)' }}>
        <Icon name="Info" size={14} style={{ color: '#40352C' }} />
        <span>Los resultados describen lo que identificó el modelo en cada foto; no son un diagnóstico veterinario.</span>
      </p>
    </section>
  );
};

export default DetectionSummaryCard;
