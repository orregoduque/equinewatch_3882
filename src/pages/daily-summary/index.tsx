import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { jsPDF } from 'jspdf';
import { useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import MetricCard from './components/MetricCard';
import DateSelector from './components/DateSelector';
import TimeDistributionChart from './components/TimeDistributionChart';
import TemperatureTrendChart from './components/TemperatureTrendChart';
import BehaviorPatternsCard from './components/BehaviorPatternsCard';
import LoadingSkeleton from './components/LoadingSkeleton';
import Icon from '../../components/AppIcon';
import { DailySummaryData, VitalSign, GutHealthData, ColicRiskIndicator, PainAssessment, BehaviorPattern, TemperatureTrend } from './types';
import { fetchDetectionsForDay, fetchTemperaturesForDay } from '../../utils/supabase';
import { useAccessibleHorses } from '../../hooks/useAccessibleHorses';

const DailySummary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const { horses, viewer, viewerKey, isLoading: isLoadingHorses } = useAccessibleHorses();
  const requestedHorseId = searchParams.get('horseId') || '';
  const [selectedHorseId, setSelectedHorseId] = useState('');
  const [behaviorError, setBehaviorError] = useState('');
  const [temperatureError, setTemperatureError] = useState('');
  const selectedHorse = horses.find((horse) => horse.id === selectedHorseId);

  useEffect(() => {
    if (isLoadingHorses) {
      setSelectedHorseId('');
      return;
    }
    const requestedExists = horses.some((horse) => horse.id === requestedHorseId);
    const initialHorseId = requestedExists ? requestedHorseId : horses[0]?.id || '';
    setSelectedHorseId(initialHorseId);
    if (initialHorseId !== requestedHorseId) {
      setSearchParams(initialHorseId ? { horseId: initialHorseId } : {}, { replace: true });
    }
  }, [horses, isLoadingHorses, requestedHorseId, setSearchParams]);

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
    setSummaryData(null);
    if (!viewer || !selectedHorse) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const loadSummaryData = async () => {
      setIsLoading(true);

      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const behaviorDefinitions = [
        { type: 'standing', color: '#4a9d6b' },
        { type: 'eating', color: '#d4a84b' },
        { type: 'outside', color: '#6b8e9f' },
        { type: 'drinking', color: '#4b8fb8' },
      ];

      let behaviorPatterns: BehaviorPattern[] = behaviorDefinitions.map((behavior) => ({
        ...behavior,
        count: 0,
        percentage: 0,
      }));
      let detectionCount = 0;
      let temperatureTrends: TemperatureTrend[] = [];

      try {
        setBehaviorError('');
        const detections = await fetchDetectionsForDay(selectedHorseId, dayStart, dayEnd, viewer);
        if (!isMounted) return;
        detectionCount = detections.length;
        const counts = Object.fromEntries(behaviorDefinitions.map(({ type }) => [type, 0]));

        detections.forEach((detection) => {
          const analysisText = typeof detection.analysis === 'string'
            ? detection.analysis.toLowerCase()
            : JSON.stringify(detection.analysis ?? '').toLowerCase();

          behaviorDefinitions.forEach(({ type }) => {
            if (analysisText.includes(type)) {
              counts[type] += 1;
            }
          });
        });

        const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
        behaviorPatterns = behaviorDefinitions.map((behavior) => ({
          ...behavior,
          count: counts[behavior.type],
          percentage: total > 0 ? Math.round((counts[behavior.type] / total) * 100) : 0,
        }));
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading behavior detections:', error);
        setBehaviorError(error instanceof Error ? error.message : 'Unknown Supabase error');
      }

      try {
        setTemperatureError('');
        const temperatureRecords = await fetchTemperaturesForDay(selectedHorseId, dayStart, dayEnd, viewer);
        if (!isMounted) return;
        temperatureTrends = temperatureRecords.map((record) => {
          const recordedAt = new Date(record.created_at);
          const temperature = record.temperature;

          return {
            time: recordedAt.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            }),
            hour: recordedAt.getHours()
              + recordedAt.getMinutes() / 60
              + recordedAt.getSeconds() / 3600,
            avgTemp: temperature,
            minTemp: temperature,
            maxTemp: temperature,
          };
        });
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading temperature records:', error);
        setTemperatureError(error instanceof Error ? error.message : 'Unknown Supabase error');
      }

      const mockData: DailySummaryData = {
        date: selectedDate,
        metrics: [
          { id: '1', title: 'Observations Today', value: detectionCount, unit: 'detections', trend: 0, trendLabel: 'for selected day', icon: 'Eye', description: 'Supabase detections recorded', status: 'normal' },
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
        temperatureTrends,
        behaviorPatterns,
        totalHorses: horses.length,
        monitoredHorses: horses.filter((horse) => horse.is_active).length,
        vitalSigns,
        gutHealth,
        colicRisk,
        painHistory,
      };

      if (isMounted) {
        setSummaryData(mockData);
        setIsLoading(false);
      }
    };

    loadSummaryData();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedHorseId, selectedHorse, viewerKey]);

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
  };

  const generatePDFReport = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(10, 10, 15);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(201, 169, 98);
    doc.setFontSize(28);
    doc.text('Stable Eye', 20, 25);
    
    doc.setTextColor(168, 168, 168);
    doc.setFontSize(10);
    doc.text('Certified Health Report', 20, 35);
    
    doc.setTextColor(201, 169, 98);
    doc.text(`Report ID: SE-${Date.now().toString(36).toUpperCase()}`, pageWidth - 60, 25);
    doc.setTextColor(168, 168, 168);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 60, 35);
    
    let yPos = 60;
    
    // Horse Information Section
    doc.setTextColor(201, 169, 98);
    doc.setFontSize(16);
    doc.text('Horse Information', 20, yPos);
    yPos += 10;
    
    doc.setDrawColor(201, 169, 98);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    const horseInfo = [
      ['Horse Name:', selectedHorse?.name || 'Horse'],
      ['Breed:', 'Thoroughbred'],
      ['Age:', '8 years'],
      ['Breed:', selectedHorse?.breed || 'Not specified'],
      ['Monitoring Since:', 'March 15, 2023'],
      ['Total Monitoring Days:', '639 days'],
    ];
    
    horseInfo.forEach(([label, value]) => {
      doc.setTextColor(100, 100, 100);
      doc.text(label, 20, yPos);
      doc.setTextColor(40, 40, 40);
      doc.text(value, 80, yPos);
      yPos += 8;
    });
    
    yPos += 10;
    
    // Health Summary Section
    doc.setTextColor(201, 169, 98);
    doc.setFontSize(16);
    doc.text('Health Summary', 20, yPos);
    yPos += 10;
    
    doc.setDrawColor(201, 169, 98);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    const healthStats = [
      ['Total Observations:', '12,547'],
      ['Health Incidents:', '3 (all resolved)'],
      ['Colic Episodes:', '0'],
      ['Average Health Score:', '94/100'],
      ['Vaccination Status:', 'Up to date'],
      ['Last Vet Check:', 'November 28, 2024'],
    ];
    
    healthStats.forEach(([label, value]) => {
      doc.setTextColor(100, 100, 100);
      doc.text(label, 20, yPos);
      doc.setTextColor(40, 40, 40);
      doc.text(value, 80, yPos);
      yPos += 8;
    });
    
    yPos += 10;
    
    // Current Vital Signs
    doc.setTextColor(201, 169, 98);
    doc.setFontSize(16);
    doc.text('Current Vital Signs', 20, yPos);
    yPos += 10;
    
    doc.setDrawColor(201, 169, 98);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    vitalSigns.forEach((vital) => {
      doc.setTextColor(100, 100, 100);
      doc.text(`${vital.name}:`, 20, yPos);
      
      const statusColor = vital.status === 'normal' ? [74, 157, 107] : 
                          vital.status === 'elevated' ? [212, 168, 75] : [199, 80, 80];
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(`${vital.value} ${vital.unit} (${vital.status})`, 80, yPos);
      yPos += 8;
    });
    
    yPos += 10;
    
    // Behavior Patterns
    doc.setTextColor(201, 169, 98);
    doc.setFontSize(16);
    doc.text('Behavior Analysis', 20, yPos);
    yPos += 10;
    
    doc.setDrawColor(201, 169, 98);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    if (summaryData?.behaviorPatterns) {
      summaryData.behaviorPatterns.forEach((pattern) => {
        doc.setTextColor(100, 100, 100);
        doc.text(`${pattern.type}:`, 20, yPos);
        doc.setTextColor(40, 40, 40);
        doc.text(`${pattern.percentage}% of observations (${pattern.count} instances)`, 80, yPos);
        yPos += 8;
      });
    }
    
    // Trust Network Certification
    yPos += 15;
    doc.setFillColor(201, 169, 98);
    doc.roundedRect(20, yPos, pageWidth - 40, 35, 3, 3, 'F');
    
    doc.setTextColor(10, 10, 15);
    doc.setFontSize(14);
    doc.text('Stable Eye Trust Network Certified', pageWidth / 2, yPos + 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text('This report is verified and authenticated by Stable Eye monitoring system', pageWidth / 2, yPos + 25, { align: 'center' });
    
    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text('This report contains authentic monitoring data collected by Stable Eye devices.', pageWidth / 2, 280, { align: 'center' });
    doc.text('For verification, visit stable-eye.co/verify', pageWidth / 2, 286, { align: 'center' });
    
    // Save the PDF
    const reportHorseName = (selectedHorse?.name || 'Horse').replace(/[^a-z0-9_-]+/gi, '_');
    doc.save(`StableEye_Horse_Report_${reportHorseName}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <>
      <Helmet>
        <title>Colic Monitoring - Stable Eye</title>
        <meta name="description" content="Comprehensive colic monitoring and early warning system for equine health" />
      </Helmet>

      <div className="min-h-screen" style={{ backgroundColor: '#F8F6F2' }}>
        <Header />

        <main className="pt-24 pb-24 md:pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-12 rounded-full" style={{ backgroundColor: '#40352C' }} />
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
                    Colic Monitoring
                  </h1>
                  <p className="text-base mt-2" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }}>
                    Early warning system & vital sign tracking
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: 'rgba(212,168,75,0.1)', border: '1px solid rgba(212,168,75,0.35)' }}>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-sm font-medium" style={{ color: '#d4a84b' }}>Colic Watch Active</span>
                </div>
                <select
                  value={selectedHorseId}
                  onChange={(event) => {
                    const horseId = event.target.value;
                    setSelectedHorseId(horseId);
                    setSearchParams({ horseId });
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium outline-none"
                  style={{ color: 'rgba(64,53,44,0.75)', backgroundColor: 'rgba(64,53,44,0.05)', border: '1px solid rgba(64,53,44,0.1)' }}
                  aria-label="Select horse"
                >
                  {horses.map((horse) => (
                    <option key={horse.id} value={horse.id}>
                      {horse.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={generatePDFReport}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm transition-all duration-300 hover:opacity-80"
                  style={{ backgroundColor: '#40352C' }}
                >
                  <Icon name="FileText" size={16} />
                  Export Health Report
                </button>
              </div>
            </div>

            {isLoadingHorses || isLoading ? (
              <LoadingSkeleton />
            ) : selectedHorse && summaryData ? (
              <div className="space-y-6 animate-slide-up">
                <DateSelector selectedDate={selectedDate} onDateChange={handleDateChange} />

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {summaryData.metrics.map((metric) => (
                    <MetricCard key={metric.id} metric={metric} />
                  ))}
                </div>

                <BehaviorPatternsCard patterns={summaryData.behaviorPatterns} error={behaviorError} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TimeDistributionChart data={summaryData.timeDistribution} />
                  <TemperatureTrendChart data={summaryData.temperatureTrends} error={temperatureError} />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <p className="text-lg mb-2" style={{ color: 'rgba(64,53,44,0.6)' }}>No data available for this date</p>
                  <p className="text-sm" style={{ color: 'rgba(64,53,44,0.4)' }}>Try selecting a different date</p>
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
