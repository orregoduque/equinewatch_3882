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
import LoadingSkeleton from './components/LoadingSkeleton';
import { DailySummaryData } from './types';

const DailySummary: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);

  useEffect(() => {
    const loadSummaryData = async () => {
      setIsLoading(true);
      
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockData: DailySummaryData = {
        date: selectedDate,
        metrics: [
          {
            id: '1',
            title: 'Total Observations',
            value: 156,
            unit: 'photos',
            trend: 12,
            trendLabel: 'vs. yesterday',
            icon: 'Camera',
            description: 'Photos captured today'
          },
          {
            id: '2',
            title: 'Suspicious Flags',
            value: 3,
            unit: 'alerts',
            trend: -25,
            trendLabel: 'vs. yesterday',
            icon: 'AlertTriangle',
            description: 'Behavior concerns detected'
          },
          {
            id: '3',
            title: 'Average Temperature',
            value: 37.8,
            unit: '°C',
            trend: 0,
            trendLabel: 'within normal range',
            icon: 'Thermometer',
            description: 'Across all observations'
          },
          {
            id: '4',
            title: 'Active Hours',
            value: 18,
            unit: 'hours',
            trend: 5,
            trendLabel: 'vs. yesterday',
            icon: 'Clock',
            description: 'Monitoring coverage'
          }
        ],
        timeDistribution: [
          { hour: 0, count: 4, label: '12 AM' },
          { hour: 1, count: 2, label: '1 AM' },
          { hour: 2, count: 1, label: '2 AM' },
          { hour: 3, count: 0, label: '3 AM' },
          { hour: 4, count: 3, label: '4 AM' },
          { hour: 5, count: 8, label: '5 AM' },
          { hour: 6, count: 12, label: '6 AM' },
          { hour: 7, count: 15, label: '7 AM' },
          { hour: 8, count: 18, label: '8 AM' },
          { hour: 9, count: 14, label: '9 AM' },
          { hour: 10, count: 11, label: '10 AM' },
          { hour: 11, count: 9, label: '11 AM' },
          { hour: 12, count: 13, label: '12 PM' },
          { hour: 13, count: 10, label: '1 PM' },
          { hour: 14, count: 8, label: '2 PM' },
          { hour: 15, count: 7, label: '3 PM' },
          { hour: 16, count: 9, label: '4 PM' },
          { hour: 17, count: 11, label: '5 PM' },
          { hour: 18, count: 6, label: '6 PM' },
          { hour: 19, count: 4, label: '7 PM' },
          { hour: 20, count: 3, label: '8 PM' },
          { hour: 21, count: 2, label: '9 PM' },
          { hour: 22, count: 1, label: '10 PM' },
          { hour: 23, count: 1, label: '11 PM' }
        ],
        temperatureTrends: [
          { time: '6 AM', avgTemp: 37.2, minTemp: 36.8, maxTemp: 37.5 },
          { time: '9 AM', avgTemp: 37.5, minTemp: 37.1, maxTemp: 37.9 },
          { time: '12 PM', avgTemp: 37.8, minTemp: 37.4, maxTemp: 38.2 },
          { time: '3 PM', avgTemp: 38.1, minTemp: 37.7, maxTemp: 38.5 },
          { time: '6 PM', avgTemp: 37.9, minTemp: 37.5, maxTemp: 38.3 },
          { time: '9 PM', avgTemp: 37.6, minTemp: 37.2, maxTemp: 38.0 }
        ],
        behaviorPatterns: [
          { type: 'Normal', count: 142, percentage: 91, color: '#10b981' },
          { type: 'Restless', count: 8, percentage: 5, color: '#f59e0b' },
          { type: 'Lethargic', count: 4, percentage: 3, color: '#ef4444' },
          { type: 'Agitated', count: 2, percentage: 1, color: '#dc2626' }
        ],
        totalHorses: 12,
        monitoredHorses: 11
      };

      setSummaryData(mockData);
      setIsLoading(false);
    };

    loadSummaryData();
  }, [selectedDate]);

  const handleDateChange = (newDate: Date) => {
    setSelectedDate(newDate);
  };

  return (
    <>
      <Helmet>
        <title>Daily Summary - EquineWatch</title>
        <meta 
          name="description" 
          content="View comprehensive daily monitoring insights and analytics for your horses" 
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-16 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-text-primary mb-2">
                Daily Summary
              </h1>
              <p className="text-secondary">
                Comprehensive monitoring insights and performance metrics
              </p>
            </div>

            {isLoading ? (
              <LoadingSkeleton />
            ) : summaryData ? (
              <div className="space-y-6">
                <DateSelector 
                  selectedDate={selectedDate} 
                  onDateChange={handleDateChange} 
                />

                {/* Behavior Patterns - Priority Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <BehaviorPatternsCard patterns={summaryData.behaviorPatterns} />
                  <CoverageIndicator 
                    totalHorses={summaryData.totalHorses}
                    monitoredHorses={summaryData.monitoredHorses}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {summaryData.metrics.map((metric) => (
                    <MetricCard key={metric.id} metric={metric} />
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TimeDistributionChart data={summaryData.timeDistribution} />
                  <TemperatureTrendChart data={summaryData.temperatureTrends} />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <p className="text-lg text-secondary mb-2">
                    No data available for this date
                  </p>
                  <p className="text-sm text-secondary">
                    Try selecting a different date
                  </p>
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