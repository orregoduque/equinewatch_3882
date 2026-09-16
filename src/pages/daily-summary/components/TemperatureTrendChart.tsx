import React from 'react';
import Icon from '../../../components/AppIcon';
import { TemperatureTrend } from '../types';

interface TemperatureTrendChartProps {
  data: TemperatureTrend[];
  error?: string;
}

const TemperatureTrendChart: React.FC<TemperatureTrendChartProps> = ({ data, error }) => {
  const hasData = Boolean(data?.length);

  const allTemps = hasData ? data.flatMap(d => [d.avgTemp, d.minTemp, d.maxTemp]) : [];
  const minTemp = Math.min(...allTemps);
  const maxTemp = Math.max(...allTemps);
  const chartWidth = 720;
  const chartHeight = 240;
  const margin = { top: 16, right: 18, bottom: 38, left: 46 };
  const plotWidth = chartWidth - margin.left - margin.right;
  const plotHeight = chartHeight - margin.top - margin.bottom;
  const hourTicks = Array.from({ length: 25 }, (_, hour) => hour);
  const temperatureTicks = [0, 10, 20, 30, 40];
  const getXPosition = (hour: number) => margin.left + (Math.min(Math.max(hour, 0), 24) / 24) * plotWidth;
  const getYPosition = (temperature: number) => margin.top + ((40 - Math.min(Math.max(temperature, 0), 40)) / 40) * plotHeight;

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.07)' }}>
            <Icon name="Thermometer" size={20} style={{ color: '#40352C' }} />
          </div>
          <div>
            <h3 className="text-xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
              Temperature Trends
            </h3>
            <p className="text-sm" style={{ color: 'rgba(64,53,44,0.5)' }}>Body temperature monitoring</p>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg px-4 py-3 text-sm" style={{ color: '#9f3f3f', backgroundColor: 'rgba(199,80,80,0.08)', border: '1px solid rgba(199,80,80,0.2)' }}>
          Unable to load temperatures: {error}
        </div>
      ) : !hasData ? (
        <div className="flex h-48 items-center justify-center text-sm" style={{ color: 'rgba(64,53,44,0.5)' }}>
          No temperature readings for the selected day
        </div>
      ) : (
        <>
      <div className="relative mb-4 overflow-x-auto">
        <svg className="h-60 min-w-[720px] w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Temperature readings across the 24 hours of the selected day">
          <defs>
            <linearGradient id="tempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#40352C" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#40352C" stopOpacity="0" />
            </linearGradient>
          </defs>

          {temperatureTicks.map((temperature) => {
            const y = getYPosition(temperature);
            return (
              <g key={temperature}>
                <line
                  x1={margin.left}
                  x2={chartWidth - margin.right}
                  y1={y}
                  y2={y}
                  stroke="rgba(64,53,44,0.12)"
                  strokeWidth="1"
                />
                <text
                  x={margin.left - 9}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="rgba(64,53,44,0.55)"
                >
                  {temperature}°
                </text>
              </g>
            );
          })}

          {hourTicks.map((hour) => {
            const x = getXPosition(hour);
            return (
              <g key={hour}>
                <line
                  x1={x}
                  x2={x}
                  y1={margin.top}
                  y2={chartHeight - margin.bottom}
                  stroke="rgba(64,53,44,0.07)"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={chartHeight - 17}
                  textAnchor="middle"
                  fontSize="8"
                  fill="rgba(64,53,44,0.5)"
                >
                  {String(hour).padStart(2, '0')}
                </text>
              </g>
            );
          })}

          <text
            x={12}
            y={margin.top + plotHeight / 2}
            textAnchor="middle"
            fontSize="10"
            fill="rgba(64,53,44,0.6)"
            transform={`rotate(-90 12 ${margin.top + plotHeight / 2})`}
          >
            Temperature (°C)
          </text>

          {data.map((reading, index) => (
            <circle
              key={`${reading.time}-${index}`}
              cx={getXPosition(reading.hour)}
              cy={getYPosition(reading.avgTemp)}
              r="4.5"
              fill="#40352C"
              stroke="#F8F6F2"
              strokeWidth="2"
            >
              <title>{`${reading.time}: ${reading.avgTemp.toFixed(1)}°C`}</title>
            </circle>
          ))}
        </svg>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center p-3 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.04)', border: '1px solid rgba(64,53,44,0.08)' }}>
          <p className="text-xs mb-1" style={{ color: 'rgba(64,53,44,0.5)' }}>Average</p>
          <p className="text-lg font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
            {(data.reduce((sum, d) => sum + d.avgTemp, 0) / data.length).toFixed(1)}°C
          </p>
        </div>
        <div className="text-center p-3 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.04)', border: '1px solid rgba(64,53,44,0.08)' }}>
          <p className="text-xs mb-1" style={{ color: 'rgba(64,53,44,0.5)' }}>Minimum</p>
          <p className="text-lg font-bold text-green-600" style={{ fontFamily: 'Syne, sans-serif' }}>
            {minTemp.toFixed(1)}°C
          </p>
        </div>
        <div className="text-center p-3 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.04)', border: '1px solid rgba(64,53,44,0.08)' }}>
          <p className="text-xs mb-1" style={{ color: 'rgba(64,53,44,0.5)' }}>Maximum</p>
          <p className="text-lg font-bold text-amber-600" style={{ fontFamily: 'Syne, sans-serif' }}>
            {maxTemp.toFixed(1)}°C
          </p>
        </div>
      </div>
        </>
      )}
    </div>
  );
};

export default TemperatureTrendChart;
