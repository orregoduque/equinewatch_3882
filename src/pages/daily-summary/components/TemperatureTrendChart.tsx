import React from 'react';
import Icon from '../../../components/AppIcon';
import { TemperatureTrend } from '../types';

interface TemperatureTrendChartProps {
  data: TemperatureTrend[];
}

const TemperatureTrendChart: React.FC<TemperatureTrendChartProps> = ({ data }) => {
  if (!data?.length) return null;

  const allTemps = data.flatMap(d => [d.avgTemp, d.minTemp, d.maxTemp]);
  const minTemp = Math.min(...allTemps);
  const maxTemp = Math.max(...allTemps);
  const tempRange = maxTemp - minTemp || 1;

  const getYPosition = (temp: number) => {
    return ((maxTemp - temp) / tempRange) * 100;
  };

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

      <div className="relative h-48 mb-4">
        <svg className="w-full h-full" viewBox="0 0 400 192" preserveAspectRatio="none">
          <defs>
            <linearGradient id="tempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#40352C" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#40352C" stopOpacity="0" />
            </linearGradient>
          </defs>

          {data.length > 1 && (
            <>
              <path
                d={`M ${data.map((d, i) =>
                  `${(i / (data.length - 1)) * 400},${getYPosition(d.avgTemp) * 1.92}`
                ).join(' L ')}`}
                fill="none"
                stroke="#40352C"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={`M ${data.map((d, i) =>
                  `${(i / (data.length - 1)) * 400},${getYPosition(d.avgTemp) * 1.92}`
                ).join(' L ')} L 400,192 L 0,192 Z`}
                fill="url(#tempGradient)"
              />
            </>
          )}

          {data.map((d, i) => (
            <circle
              key={i}
              cx={(i / (data.length - 1)) * 400}
              cy={getYPosition(d.avgTemp) * 1.92}
              r="5"
              fill="#40352C"
              stroke="#F8F6F2"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-between text-xs pt-4" style={{ borderTop: '1px solid rgba(64,53,44,0.08)' }}>
        {data.map((item, index) => (
          <div key={index} className="text-center">
            <p className="font-bold mb-1" style={{ color: '#40352C' }}>
              {item.avgTemp.toFixed(1)}°C
            </p>
            <p style={{ color: 'rgba(64,53,44,0.45)' }}>{item.time}</p>
          </div>
        ))}
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
    </div>
  );
};

export default TemperatureTrendChart;
