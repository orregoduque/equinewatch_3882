import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { jsPDF } from 'jspdf';
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
import Icon from '../../components/AppIcon';
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
    const loadSummaryData = () => {
      setIsLoading(true);

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
      ['Horse Name:', 'Thunder'],
      ['Breed:', 'Thoroughbred'],
      ['Age:', '8 years'],
      ['Location:', 'Barn A - Stall 12'],
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
    doc.save(`StableEye_Horse_Report_Thunder_${new Date().toISOString().split('T')[0]}.pdf`);
  };

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

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#d4a84b]/10 border border-[#d4a84b]/30">
                  <div className="w-2 h-2 rounded-full bg-[#d4a84b] animate-pulse" />
                  <span className="text-sm font-medium text-[#d4a84b]">Colic Watch Active</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-[#c9a962]/10">
                  <span className="text-sm font-medium text-[#a8a8a8]">Thunder - Barn A</span>
                </div>
                <button
                  onClick={generatePDFReport}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#c9a962] to-[#a88a45] text-[#0a0a0f] font-semibold text-sm hover:shadow-[0_0_20px_rgba(201,169,98,0.3)] transition-all duration-300"
                >
                  <Icon name="FileText" size={16} />
                  Export Health Report
                </button>
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
