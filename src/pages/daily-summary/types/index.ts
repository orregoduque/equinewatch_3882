export interface DailySummaryMetric {
  id: string;
  title: string;
  value: number;
  unit: string;
  trend: number;
  trendLabel: string;
  icon: string;
  description: string;
  status?: 'normal' | 'warning' | 'critical';
}

export interface TimeDistribution {
  hour: number;
  count: number;
  label: string;
}

export interface TemperatureTrend {
  time: string;
  avgTemp: number;
  minTemp: number;
  maxTemp: number;
}

export interface BehaviorPattern {
  type: string;
  count: number;
  percentage: number;
  color: string;
}

export interface VitalSign {
  id: string;
  name: string;
  value: number;
  unit: string;
  normalMin: number;
  normalMax: number;
  status: 'normal' | 'elevated' | 'critical' | 'low';
  icon: string;
  trend: number[];
}

export interface GutHealthData {
  quadrant: string;
  soundLevel: 'normal' | 'reduced' | 'absent' | 'hyperactive';
  lastChecked: string;
}

export interface ColicRiskIndicator {
  factor: string;
  score: number;
  maxScore: number;
  status: 'low' | 'moderate' | 'high';
  description: string;
}

export interface PainAssessment {
  time: string;
  score: number;
  behaviors: string[];
}

export interface DailySummaryData {
  date: Date;
  metrics: DailySummaryMetric[];
  timeDistribution: TimeDistribution[];
  temperatureTrends: TemperatureTrend[];
  behaviorPatterns: BehaviorPattern[];
  totalHorses: number;
  monitoredHorses: number;
  vitalSigns?: VitalSign[];
  gutHealth?: GutHealthData[];
  colicRisk?: ColicRiskIndicator[];
  painHistory?: PainAssessment[];
}
