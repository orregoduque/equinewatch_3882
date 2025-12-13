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
    <div className="glass-card p-6 luxury-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#c9a962]/10">
            <Icon name="Thermometer" size={20} className="text-[#c9a962]" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-medium text-[#faf9f6]">
              Temperature Trends
            </h3>
            <p className="text-sm text-[#6b6b6b]">Body temperature monitoring</p>
          </div>
        </div>
      </div>

      <div className="relative h-48 mb-4">
        <svg className="w-full h-full" viewBox="0 0 400 192" preserveAspectRatio="none">
          <defs>
            <linearGradient id="tempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c9a962" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#c9a962" stopOpacity="0" />
            </linearGradient>
          </defs>

          {data.length > 1 && (
            <>
              <path
                d={`M ${data.map((d, i) => 
                  `${(i / (data.length - 1)) * 400},${getYPosition(d.avgTemp) * 1.92}`
                ).join(' L ')}`}
                fill="none"
                stroke="#c9a962"
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
              fill="#c9a962"
              stroke="#0a0a0f"
              strokeWidth="2"
            />
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-between text-xs border-t border-[#c9a962]/10 pt-4">
        {data.map((item, index) => (
          <div key={index} className="text-center">
            <p className="font-medium text-[#faf9f6] mb-1">
              {item.avgTemp.toFixed(1)}°C
            </p>
            <p className="text-[#6b6b6b]">{item.time}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-[#c9a962]/10">
          <p className="text-xs text-[#6b6b6b] mb-1">Average</p>
          <p className="text-lg font-light text-[#faf9f6]">
            {(data.reduce((sum, d) => sum + d.avgTemp, 0) / data.length).toFixed(1)}°C
          </p>
        </div>
        <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-[#c9a962]/10">
          <p className="text-xs text-[#6b6b6b] mb-1">Minimum</p>
          <p className="text-lg font-light text-[#4a9d6b]">
            {minTemp.toFixed(1)}°C
          </p>
        </div>
        <div className="text-center p-3 rounded-xl bg-white/[0.03] border border-[#c9a962]/10">
          <p className="text-xs text-[#6b6b6b] mb-1">Maximum</p>
          <p className="text-lg font-light text-[#d4a84b]">
            {maxTemp.toFixed(1)}°C
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemperatureTrendChart;