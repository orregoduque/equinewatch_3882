export interface DailySummaryMetric {
  id: string;
  title: string;
  value: number;
  unit: string;
  trend: number;
  trendLabel: string;
  icon: string;
  description: string;
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

export interface DailySummaryData {
  date: Date;
  metrics: DailySummaryMetric[];
  timeDistribution: TimeDistribution[];
  temperatureTrends: TemperatureTrend[];
  behaviorPatterns: BehaviorPattern[];
  totalHorses: number;
  monitoredHorses: number;
}