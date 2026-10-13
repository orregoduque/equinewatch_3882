export type DetectionOutcome = 'detected' | 'not_detected' | 'unknown';

export interface ParsedDetectionAnalysis {
  outcome: DetectionOutcome;
  confidence: number | null;
  threshold: number | null;
  model: string | null;
  rawText: string;
}

export const PHOTO_INTERVAL_SECONDS = 10;

export interface DetectionSummary {
  totalPhotos: number;
  detectedPhotos: number;
  notDetectedPhotos: number;
  unknownPhotos: number;
  averageConfidence: number | null;
  estimatedPresenceSeconds: number;
  analyzedSeconds: number;
  models: string[];
  thresholds: number[];
}

const readPercentage = (text: string, expression: RegExp): number | null => {
  const match = text.match(expression);
  if (!match) return null;

  const value = Number(match[1].replace(',', '.'));
  return Number.isFinite(value) && value >= 0 && value <= 100 ? value : null;
};

export const parseDetectionAnalysis = (value: unknown): ParsedDetectionAnalysis => {
  let rawText = '';
  try {
    rawText = typeof value === 'string'
      ? value.trim()
      : value == null
        ? ''
        : JSON.stringify(value, null, 2) || '';
  } catch {
    rawText = '';
  }

  const normalized = rawText.replace(/\u00a0/g, ' ');
  const status = normalized.match(/\b(?:caballo|horse)\s+(no\s+)?detectado\b/i);
  const modelMatch = normalized.match(/\b(?:modelo|model)\s*:\s*([^\r\n]+)/i);

  return {
    outcome: status ? (status[1] ? 'not_detected' : 'detected') : 'unknown',
    confidence: readPercentage(normalized, /\b(?:confianza|confidence)\s*:\s*(-?\d+(?:[.,]\d+)?)\s*[%％]?/i),
    threshold: readPercentage(normalized, /\b(?:umbral|threshold)\s*:?\s*(-?\d+(?:[.,]\d+)?)\s*[%％]?/i),
    model: modelMatch?.[1].trim().replace(/[.,;!?]+\s*$/, '') || null,
    rawText,
  };
};

export const formatDetectionPercentage = (value: number): string =>
  `${new Intl.NumberFormat('es-ES', { maximumFractionDigits: 1 }).format(value)} %`;

export const summarizeDetectionAnalyses = (values: unknown[]): DetectionSummary => {
  const analyses = values.map(parseDetectionAnalysis);
  const detected = analyses.filter(analysis => analysis.outcome === 'detected');
  const confidences = detected
    .filter(analysis => analysis.confidence !== null)
    .map(analysis => analysis.confidence as number);

  return {
    totalPhotos: analyses.length,
    detectedPhotos: detected.length,
    notDetectedPhotos: analyses.filter(analysis => analysis.outcome === 'not_detected').length,
    unknownPhotos: analyses.filter(analysis => analysis.outcome === 'unknown').length,
    averageConfidence: confidences.length
      ? confidences.reduce((total, confidence) => total + confidence, 0) / confidences.length
      : null,
    estimatedPresenceSeconds: detected.length * PHOTO_INTERVAL_SECONDS,
    analyzedSeconds: analyses.length * PHOTO_INTERVAL_SECONDS,
    models: [...new Set(analyses.map(analysis => analysis.model).filter((model): model is string => !!model))],
    thresholds: [...new Set(analyses
      .map(analysis => analysis.threshold)
      .filter((threshold): threshold is number => threshold !== null))].sort((a, b) => a - b),
  };
};

export const formatDetectionDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) return `${hours} h ${minutes} min ${remainingSeconds} s`;
  if (minutes > 0) return `${minutes} min ${remainingSeconds} s`;
  return `${remainingSeconds} s`;
};
