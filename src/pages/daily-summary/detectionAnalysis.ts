export type DetectionOutcome = 'detected' | 'not_detected' | 'unknown';

export interface ParsedDetectionAnalysis {
  outcome: DetectionOutcome;
  confidence: number | null;
  threshold: number | null;
  model: string | null;
  rawText: string;
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

export const formatDetectionTime = (createdAt: string): string => {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime())
    ? 'Hora no disponible'
    : date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
};
