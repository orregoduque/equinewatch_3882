import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import MetricCard from './components/MetricCard';
import DateSelector from './components/DateSelector';
import TimeDistributionChart from './components/TimeDistributionChart';
import TemperatureTrendChart from './components/TemperatureTrendChart';
import BehaviorPatternsCard from './components/BehaviorPatternsCard';
import CoverageIndicator from './components/CoverageIndicator';
import VitalSignsPanel from './components/VitalSignsPanel';
import GutHealthMonitor from './components/GutHealthMonitor';
import ColicRiskAssessment from './components/ColicRiskAssessment';
import PainScoreTimeline from './components/PainScoreTimeline';
import LoadingSkeleton from './components/LoadingSkeleton';
import { DailySummaryData, VitalSign, GutHealthData, ColicRiskIndicator, PainAssessment } from './types';

const DailySummary: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);

  const vitalSigns: VitalSign[] = [
    { id: '1', name: 'Heart Rate', value: 48, unit: 'bpm', normalMin: 28, normalMax: 44, status: 'elevated', icon: 'Heart', trend: [36, 38, 42, 44, 46, 48, 47, 48] },
    { id: '2', name: 'Respiratory Rate', value: 14, unit: '/min', normalMin: 8, normalMax: 16, status: 'normal', icon: 'Wind', trend: [12, 13, 12, 14, 13, 14, 14, 14] },
    { id: '3', name: 'Temperature', value: 38.6, unit: '°C', normalMin: 37.2, normalMax: 38.3, status: 'elevated', icon: 'Thermometer', trend: [37.5, 37.8, 38.0, 38.2, 38.4, 38.5, 38.6, 38.6] },
    { id: '4', name: 'Capillary Refill', value: 3.2, unit: 'sec', normalMin: 1, normalMax: 2, status: 'critical', icon: 'Droplet', trend: [1.5, 1.8, 2.0, 2.4, 2.8, 3.0, 3.1, 3.2] },
  ];

  const gutHealth: GutHealthData[] = [
    { quadrant: 'Upper Left', soundLevel: 'normal', lastChecked: '10 min ago' },
    { quadrant: 'Upper Right', soundLevel: 'reduced', lastChecked: '10 min ago' },
    { quadrant: 'Lower Left', soundLevel: 'normal', lastChecked: '10 min ago' },
    { quadrant: 'Lower Right', soundLevel: 'reduced', lastChecked: '10 min ago' },
  ];

  const colicRisk: ColicRiskIndicator[] = [
    { factor: 'Heart Rate Elevation', score: 7, maxScore: 10, status: 'moderate', description: 'Elevated above normal resting rate' },
    { factor: 'Gut Motility', score: 5, maxScore: 10, status: 'moderate', description: 'Reduced sounds in 2 quadrants' },
    { factor: 'Pain Indicators', score: 4, maxScore: 10, status: 'moderate', description: 'Intermittent pawing observed' },
    { factor: 'Hydration Status', score: 6, maxScore: 10, status: 'moderate', description: 'Slightly delayed capillary refill' },
    { factor: 'Manure Output', score: 3, maxScore: 10, status: 'low', description: 'Reduced but present' },
  ];

  const painHistory: PainAssessment[] = [
    { time: '6 AM', score: 1, behaviors: ['Alert', 'Eating'] },
    { time: '9 AM', score: 2, behaviors: ['Restless', 'Looking at flank'] },
    { time: '12 PM', score: 3, behaviors: ['Pawing', 'Reduced appetite'] },
    { time: '3 PM', score: 4, behaviors: ['Pawing', 'Lying down', 'Rolling attempt'] },
    { time: '6 PM', score: 3, behaviors: ['Pawing', 'Standing quietly'] },
  ];

  useEffect(() => {
    const loadSummaryData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 300));

      const mockData: DailySummaryData = {
        date: selectedDate,
        metrics: [
          { id: '1', title: 'Observations Today', value: 42, unit: 'checks', trend: 15, trendLabel: 'vs. yesterday', icon: 'Eye', description: 'Health checks performed', status: 'normal' },
          { id: '2', title: 'Alert Level', value: 3, unit: '/5', trend: 50, trendLabel: 'elevated', icon: 'AlertTriangle', description: 'Current colic watch status', status: 'warning' },
          { id: '3', title: 'Water Intake', value: 18, unit: 'L', trend: -25, trendLabel: 'below normal', icon: 'Droplets', description: 'Last 12 hours', status: 'warning' },
          { id: '4', title: 'Last Manure', value: 4, unit: 'hrs ago', trend: 0, trendLabel: 'monitoring', icon: 'Clock', description: 'Time since last passage', status: 'normal' },
        ],
        timeDistribution: [
          { hour: 0, count: 2, label: '12 AM' }, { hour: 1, count: 2, label: '1 AM' }, { hour: 2, count: 1, label: '2 AM' },
          { hour: 3, count: 1, label: '3 AM' }, { hour: 4, count: 2, label: '4 AM' }, { hour: 5, count: 3, label: '5 AM' },
          { hour: 6, count: 4, label: '6 AM' }, { hour: 7, count: 3, label: '7 AM' }, { hour: 8, count: 4, label: '8 AM' },
          { hour: 9, count: 3, label: '9 AM' }, { hour: 10, count: 3, label: '10 AM' }, { hour: 11, count: 2, label: '11 AM' },
          { hour: 12, count: 4, label: '12 PM' }, { hour: 13, count: 3, label: '1 PM' }, { hour: 14, count: 2, label: '2 PM' },
          { hour: 15, count: 3, label: '3 PM' }, { hour: 16, count: 2, label: '4 PM' }, { hour: 17, count: 2, label: '5 PM' },
          { hour: 18, count: 1, label: '6 PM' }, { hour: 19, count: 1, label: '7 PM' }, { hour: 20, count: 1, label: '8 PM' },
          { hour: 21, count: 1, label: '9 PM' }, { hour: 22, count: 1, label: '10 PM' }, { hour: 23, count: 1, label: '11 PM' },
        ],
        temperatureTrends: [
          { time: '6 AM', avgTemp: 37.5, minTemp: 37.2, maxTemp: 37.8 },
          { time: '9 AM', avgTemp: 37.8, minTemp: 37.5, maxTemp: 38.1 },
          { time: '12 PM', avgTemp: 38.2, minTemp: 37.9, maxTemp: 38.5 },
          { time: '3 PM', avgTemp: 38.5, minTemp: 38.2, maxTemp: 38.8 },
          { time: '6 PM', avgTemp: 38.6, minTemp: 38.3, maxTemp: 38.9 },
        ],
        behaviorPatterns: [
          { type: 'Normal', count: 28, percentage: 67, color: '#4a9d6b' },
          { type: 'Pawing', count: 8, percentage: 19, color: '#d4a84b' },
          { type: 'Restless', count: 4, percentage: 9, color: '#d4a84b' },
          { type: 'Rolling', count: 2, percentage: 5, color: '#c75050' },
        ],
        totalHorses: 6,
        monitoredHorses: 6,
        vitalSigns,
        gutHealth,
        colicRisk,
        painHistory,
      };

      setSummaryData(mockData);
      setIsLoading(false);
    };

    loadSummaryData();
  }, [selectedDate]);

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
  };

  const overallColicScore = colicRisk.reduce((sum, r) => sum + (r.score / r.maxScore) * 20, 0);

  return (
    <>
      <Helmet>
        <title>Colic Monitoring - Stable Eye</title>
        <meta name="description" content="Comprehensive colic monitoring and early warning system for equine health" />
      </Helmet>

      <div className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#0f0f18]" />
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#c9a962]/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#c9a962]/3 rounded-full blur-[150px]" />
        </div>

        <Header />
        
        <main className="pt-24 pb-24 md:pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-12 rounded-full bg-gradient-to-b from-[#c9a962] to-[#a88a45]" />
                <div>
                  <h1 className="font-serif text-4xl md:text-5xl font-light text-[#faf9f6]">
                    Colic <span className="gradient-text font-medium">Monitoring</span>
                  </h1>
                  <p className="text-base mt-2 font-light text-[#a8a8a8] tracking-wide">
                    Early warning system & vital sign tracking
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d4a84b]/10 border border-[#d4a84b]/30">
                  <div className="w-2 h-2 rounded-full bg-[#d4a84b] animate-pulse" />
                  <span className="text-sm font-medium text-[#d4a84b]">Colic Watch Active</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-[#c9a962]/10">
                  <span className="text-sm font-medium text-[#a8a8a8]">Thunder - Barn A</span>
                </div>
              </div>
            </div>

            {isLoading ? (
              <LoadingSkeleton />
            ) : summaryData ? (
              <div className="space-y-6 animate-slide-up">
                <DateSelector selectedDate={selectedDate} onDateChange={handleDateChange} />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {summaryData.metrics.map((metric) => (
                    <MetricCard key={metric.id} metric={metric} />
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <VitalSignsPanel vitals={vitalSigns} />
                  <ColicRiskAssessment indicators={colicRisk} overallScore={Math.round(overallColicScore)} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <GutHealthMonitor data={gutHealth} />
                  <PainScoreTimeline data={painHistory} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BehaviorPatternsCard patterns={summaryData.behaviorPatterns} />
                  <CoverageIndicator totalHorses={summaryData.totalHorses} monitoredHorses={summaryData.monitoredHorses} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TimeDistributionChart data={summaryData.timeDistribution} />
                  <TemperatureTrendChart data={summaryData.temperatureTrends} />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <p className="text-lg text-[#a8a8a8] mb-2">No data available for this date</p>
                  <p className="text-sm text-[#6b6b6b]">Try selecting a different date</p>
                </div>
              </div>
            )}
          </div>
        </main>

        <MobileNavigation />
      </div>
    </>
  );
};

export default DailySummary;
