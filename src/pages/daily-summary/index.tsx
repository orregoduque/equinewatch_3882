import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import DateSelector from './components/DateSelector';
import TimeDistributionChart from './components/TimeDistributionChart';
import TemperatureTrendChart from './components/TemperatureTrendChart';
import DetectionSummaryCard from './components/DetectionSummaryCard';
import LoadingSkeleton from './components/LoadingSkeleton';
import Icon from '../../components/AppIcon';
import { DailyPhotoDetection, DailySummaryData, TemperatureTrend, TimeDistribution } from './types';
import { fetchDetectionsForDay, fetchTemperaturesForDay } from '../../utils/supabase';
import { useAccessibleHorses } from '../../hooks/useAccessibleHorses';
import {
  formatDetectionPercentage,
  formatDetectionTime,
  parseDetectionAnalysis,
} from './detectionAnalysis';

const DailySummary: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [summaryData, setSummaryData] = useState<DailySummaryData | null>(null);
  const { horses, viewer, viewerKey, isLoading: isLoadingHorses } = useAccessibleHorses();
  const requestedHorseId = searchParams.get('horseId') || '';
  const [selectedHorseId, setSelectedHorseId] = useState('');
  const [detectionError, setDetectionError] = useState('');
  const [temperatureError, setTemperatureError] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const selectedHorse = horses.find((horse) => horse.id === selectedHorseId);
  const exportScope = useRef('');
  exportScope.current = JSON.stringify([viewerKey, selectedHorseId, selectedDate.toISOString()]);

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

      let photoDetections: DailyPhotoDetection[] = [];
      const hourlyCounts = new Array(24).fill(0);
      let temperatureTrends: TemperatureTrend[] = [];

      setDetectionError('');
      setTemperatureError('');
      const [detectionsResult, temperaturesResult] = await Promise.allSettled([
        fetchDetectionsForDay(selectedHorseId, dayStart, dayEnd, viewer),
        fetchTemperaturesForDay(selectedHorseId, dayStart, dayEnd, viewer),
      ]);
      if (!isMounted) return;

      try {
        if (detectionsResult.status === 'rejected') throw detectionsResult.reason;
        photoDetections = detectionsResult.value.map((record) => {
          const recordedAt = new Date(record.created_at);
          if (!Number.isNaN(recordedAt.getTime())) {
            hourlyCounts[recordedAt.getHours()] += 1;
          }
          return {
            id: String(record.id),
            createdAt: record.created_at,
            analysis: parseDetectionAnalysis(record.analysis),
          };
        }).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading photo detections:', error);
        setDetectionError(error instanceof Error ? error.message : 'Unknown Supabase error');
      }

      try {
        if (temperaturesResult.status === 'rejected') throw temperaturesResult.reason;
        const temperatureRecords = temperaturesResult.value;
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

      const timeDistribution: TimeDistribution[] = hourlyCounts.map((count, hour) => ({
        hour,
        count,
        label: `${String(hour).padStart(2, '0')}:00`,
      }));
      const dailyData: DailySummaryData = {
        date: selectedDate,
        timeDistribution,
        temperatureTrends,
        photoDetections,
      };

      if (isMounted) {
        setSummaryData(dailyData);
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

  const writePDFReport = (doc: import('jspdf').jsPDF) => {
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFillColor(10, 10, 15);
    doc.rect(0, 0, pageWidth, 45, 'F');
    
    doc.setTextColor(201, 169, 98);
    doc.setFontSize(28);
    doc.text('Stable Eye', 20, 25);
    
    doc.setTextColor(168, 168, 168);
    doc.setFontSize(10);
    doc.text('Resumen diario de análisis de fotos', 20, 35);
    
    doc.setTextColor(201, 169, 98);
    doc.text(`Report ID: SE-${Date.now().toString(36).toUpperCase()}`, pageWidth - 60, 25);
    doc.setTextColor(168, 168, 168);
    doc.text(`Fecha: ${selectedDate.toLocaleDateString('es-ES')}`, pageWidth - 60, 35);
    
    let yPos = 60;
    
    // Horse Information Section
    doc.setTextColor(201, 169, 98);
    doc.setFontSize(16);
    doc.text('Datos del caballo', 20, yPos);
    yPos += 10;
    
    doc.setDrawColor(201, 169, 98);
    doc.setLineWidth(0.5);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;
    
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(11);
    const horseInfo: [string, string][] = [
      ['Nombre:', selectedHorse?.name || 'Sin nombre'],
      ['Raza:', selectedHorse?.breed || 'No registrada'],
      ['Edad:', selectedHorse?.age == null ? 'No registrada' : `${selectedHorse.age} años`],
    ];
    
    horseInfo.forEach(([label, value]) => {
      doc.setTextColor(100, 100, 100);
      doc.text(label, 20, yPos);
      doc.setTextColor(40, 40, 40);
      doc.text(value, 80, yPos);
      yPos += 8;
    });
    
    yPos += 10;
    
    // Photo analysis summary from the selected horse's actual Supabase records.
    doc.setTextColor(201, 169, 98);
    doc.setFontSize(16);
    doc.text('Resumen del análisis', 20, yPos);
    yPos += 10;
    
    doc.setDrawColor(201, 169, 98);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    const detectionCount = summaryData.photoDetections.filter(({ analysis }) => analysis.outcome === 'detected').length;
    const noDetectionCount = summaryData.photoDetections.filter(({ analysis }) => analysis.outcome === 'not_detected').length;
    const unreadableCount = summaryData.photoDetections.filter(({ analysis }) => analysis.outcome === 'unknown').length;
    const confidenceValues = summaryData.photoDetections
      .filter(({ analysis }) => analysis.outcome === 'detected' && analysis.confidence !== null)
      .map(({ analysis }) => analysis.confidence as number);
    const averageConfidence = confidenceValues.length
      ? confidenceValues.reduce((total, confidence) => total + confidence, 0) / confidenceValues.length
      : null;
    const detectionStats: [string, string][] = [
      ['Fotos analizadas:', String(summaryData.photoDetections.length)],
      ['El modelo detectó al caballo:', String(detectionCount)],
      ['El modelo no informó detección:', String(noDetectionCount)],
      ['Resultados no interpretados:', String(unreadableCount)],
      ['Confianza media de las detecciones:', averageConfidence === null ? 'No disponible' : formatDetectionPercentage(averageConfidence)],
    ];

    detectionStats.forEach(([label, value]) => {
      doc.setTextColor(100, 100, 100);
      doc.text(label, 20, yPos);
      doc.setTextColor(40, 40, 40);
      doc.text(value, 80, yPos);
      yPos += 8;
    });
    
    yPos += 10;
    
    // Detailed results for each analyzed photo.
    doc.setTextColor(201, 169, 98);
    doc.setFontSize(16);
    doc.text('Resultado de cada foto', 20, yPos);
    yPos += 10;
    
    doc.setDrawColor(201, 169, 98);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;
    
    doc.setFontSize(11);
    summaryData.photoDetections.forEach(({ createdAt, analysis }) => {
      const resultLabel = analysis.outcome === 'detected'
        ? 'Caballo detectado'
        : analysis.outcome === 'not_detected'
          ? 'Sin detección del caballo'
          : 'Resultado no interpretado';
      const details = [
        resultLabel,
        formatDetectionTime(createdAt),
        analysis.confidence !== null ? `Confianza: ${formatDetectionPercentage(analysis.confidence)}` : '',
        analysis.threshold !== null ? `Umbral: ${formatDetectionPercentage(analysis.threshold)}` : '',
        analysis.model ? `Modelo: ${analysis.model}` : '',
        analysis.outcome === 'unknown' && analysis.rawText ? `Texto original: ${analysis.rawText.slice(0, 250)}` : '',
      ].filter(Boolean).join(' | ');
      const lines = doc.splitTextToSize(details, pageWidth - 40);
      const lineHeight = 6;
      if (yPos + lines.length * lineHeight > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.setTextColor(40, 40, 40);
      doc.text(lines, 20, yPos);
      yPos += lines.length * lineHeight + 2;
    });

    yPos += 7;
    const disclaimer = 'Este informe resume resultados automáticos de detección en fotos; no constituye un diagnóstico veterinario.';
    const disclaimerLines = doc.splitTextToSize(disclaimer, pageWidth - 40);
    if (yPos + disclaimerLines.length * 6 > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(9);
    doc.text(disclaimerLines, 20, yPos);
    
    // Save the PDF
    const reportHorseName = (selectedHorse?.name || 'Horse').replace(/[^a-z0-9_-]+/gi, '_');
    doc.save(`StableEye_Resumen_${reportHorseName}_${selectedDate.toISOString().split('T')[0]}.pdf`);
  };

  const generatePDFReport = async () => {
    if (isExporting || isLoading || isLoadingHorses || !selectedHorse || !summaryData) return;
    const scope = exportScope.current;
    setIsExporting(true);
    setExportError('');
    try {
      const { jsPDF } = await import('jspdf');
      // Skip a stale report if the account, horse or date changes while loading.
      if (scope !== exportScope.current) return;
      writePDFReport(new jsPDF());
    } catch (error) {
      if (scope === exportScope.current) {
        setExportError(error instanceof Error ? error.message : 'Unable to export the report. Please try again.');
      }
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Resumen diario - Stable Eye</title>
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
                    Resumen diario
                  </h1>
                  <p className="text-base mt-2" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }}>
                    Análisis de fotos del caballo y lecturas de temperatura
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-4">
                <select
                  value={selectedHorseId}
                  onChange={(event) => {
                    const horseId = event.target.value;
                    setSelectedHorseId(horseId);
                    setSearchParams({ horseId });
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-medium outline-none"
                  style={{ color: 'rgba(64,53,44,0.75)', backgroundColor: 'rgba(64,53,44,0.05)', border: '1px solid rgba(64,53,44,0.1)' }}
                  aria-label="Selecciona un caballo"
                >
                  {horses.map((horse) => (
                    <option key={horse.id} value={horse.id}>
                      {horse.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={generatePDFReport}
                  disabled={isExporting || isLoadingHorses || isLoading || !selectedHorse || !summaryData}
                  aria-busy={isExporting}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm transition-all duration-300 hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#40352C' }}
                >
                  <Icon name="FileText" size={16} />
                  {isExporting ? 'Preparando informe…' : 'Descargar informe diario'}
                </button>
              </div>
              {exportError && <p role="alert" className="mt-3 text-sm text-red-600">{exportError}</p>}
            </div>

            {isLoadingHorses || isLoading ? (
              <LoadingSkeleton />
            ) : selectedHorse && summaryData ? (
              <div className="space-y-6 animate-slide-up">
                <DateSelector selectedDate={selectedDate} onDateChange={handleDateChange} />

                <DetectionSummaryCard detections={summaryData.photoDetections} error={detectionError} />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <TimeDistributionChart data={summaryData.timeDistribution} />
                  <TemperatureTrendChart data={summaryData.temperatureTrends} error={temperatureError} />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <p className="text-lg mb-2" style={{ color: 'rgba(64,53,44,0.6)' }}>No hay datos para este caballo en esta fecha</p>
                  <p className="text-sm" style={{ color: 'rgba(64,53,44,0.4)' }}>Prueba a seleccionar otro día</p>
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
