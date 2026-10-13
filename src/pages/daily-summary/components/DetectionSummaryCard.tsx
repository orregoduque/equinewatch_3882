import React from 'react';
import Icon from '../../../components/AppIcon';
import {
  formatDetectionPercentage,
  formatDetectionTime,
} from '../detectionAnalysis';
import { DailyPhotoDetection } from '../types';

interface DetectionSummaryCardProps {
  detections: DailyPhotoDetection[];
  error?: string;
}

const DetectionSummaryCard: React.FC<DetectionSummaryCardProps> = ({ detections, error }) => {
  const detectedCount = detections.filter(({ analysis }) => analysis.outcome === 'detected').length;
  const notDetectedCount = detections.filter(({ analysis }) => analysis.outcome === 'not_detected').length;
  const unreadableCount = detections.filter(({ analysis }) => analysis.outcome === 'unknown').length;
  const confidenceValues = detections
    .filter(({ analysis }) => analysis.outcome === 'detected' && analysis.confidence !== null)
    .map(({ analysis }) => analysis.confidence as number);
  const averageConfidence = confidenceValues.length
    ? confidenceValues.reduce((total, confidence) => total + confidence, 0) / confidenceValues.length
    : null;

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
          {detections.length} {detections.length === 1 ? 'foto analizada' : 'fotos analizadas'}
        </span>
      </div>

      {error && (
        <div role="alert" className="mb-4 rounded-lg px-4 py-3 text-sm" style={{ color: '#9f3f3f', backgroundColor: 'rgba(199,80,80,0.08)', border: '1px solid rgba(199,80,80,0.2)' }}>
          No se pudieron cargar los análisis: {error}
        </div>
      )}

      {detections.length > 0 ? (
        <>
          <p className="mb-5 rounded-lg px-4 py-3 text-sm" style={{ color: '#40352C', backgroundColor: '#F8F6F2' }}>
            El modelo señaló al caballo en <strong>{detectedCount}</strong> de{' '}
            <strong>{detectedCount + notDetectedCount}</strong> análisis interpretables.
            {unreadableCount > 0 && <> Hay {unreadableCount} {unreadableCount === 1 ? 'resultado que no se pudo interpretar' : 'resultados que no se pudieron interpretar'}.</>}
            {' '}Un resultado sin detección no confirma que el caballo estuviera ausente.
          </p>

          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Fotos analizadas', value: detections.length, color: '#40352C' },
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

          <div>
            <h3 className="text-sm font-semibold mb-3" style={{ color: '#40352C' }}>Detalle por foto</h3>
            <ol className="divide-y max-h-96 overflow-y-auto rounded-lg" style={{ borderColor: 'rgba(64,53,44,0.1)' }}>
              {detections.map((detection) => {
                const { analysis } = detection;
                const hasDetection = analysis.outcome === 'detected';
                const isReadable = analysis.outcome !== 'unknown';

                return (
                  <li key={detection.id} className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className="mt-0.5 shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold"
                        style={isReadable
                          ? hasDetection
                            ? { color: '#32734a', backgroundColor: 'rgba(74,157,107,0.12)' }
                            : { color: '#596e7a', backgroundColor: 'rgba(107,142,159,0.14)' }
                          : { color: '#806522', backgroundColor: 'rgba(212,168,75,0.15)' }}
                      >
                        {!isReadable ? 'Resultado no interpretado' : hasDetection ? 'Caballo detectado' : 'Sin detección'}
                      </span>
                      <div className="min-w-0">
                        {analysis.rawText && !isReadable ? (
                          <p className="break-words whitespace-pre-wrap text-sm" style={{ color: 'rgba(64,53,44,0.7)' }}>
                            {analysis.rawText}
                          </p>
                        ) : (
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm" style={{ color: 'rgba(64,53,44,0.7)' }}>
                            {analysis.confidence !== null && <span>Confianza: {formatDetectionPercentage(analysis.confidence)}</span>}
                            {analysis.threshold !== null && <span>Umbral: {formatDetectionPercentage(analysis.threshold)}</span>}
                            {analysis.model && <span>Modelo: {analysis.model}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <time dateTime={detection.createdAt} className="shrink-0 pl-1 text-xs sm:pt-1" style={{ color: 'rgba(64,53,44,0.5)' }}>
                      {formatDetectionTime(detection.createdAt)}
                    </time>
                  </li>
                );
              })}
            </ol>
          </div>
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
