import React from 'react';
import Icon from '../../../components/AppIcon';
import { TemperatureTrend } from '../types';

interface TemperatureTrendChartProps {
  data: TemperatureTrend[];
}

const TemperatureTrendChart: React.FC<TemperatureTrendChartProps> = ({ data }) => {
  const allTemps = data.flatMap(d => [d.avgTemp, d.minTemp, d.maxTemp]);
  const minTemp = Math.min(...allTemps);
  const maxTemp = Math.max(...allTemps);
  const tempRange = maxTemp - minTemp || 1;

  const getYPosition = (temp: number) => {
    return ((maxTemp - temp) / tempRange) * 100;
  };

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">
          Temperature Trends
        </h3>
        <div className="flex items-center gap-2 text-sm text-secondary">
          <Icon name="Thermometer" size={16} />
          <span>Celsius</span>
        </div>
      </div>

      <div className="relative h-48 mb-4">
        <svg className="w-full h-full" viewBox="0 0 400 192" preserveAspectRatio="none">
          <defs>
            <linearGradient id="tempGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.2" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {data.length > 1 && (
            <>
              <path
                d={`M ${data.map((d, i) => 
                  `${(i / (data.length - 1)) * 400},${getYPosition(d.avgTemp) * 1.92}`
                ).join(' L ')}`}
                fill="none"
                stroke="var(--color-accent)"
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
              r="4"
              fill="var(--color-accent)"
              className="transition-smooth hover:r-6"
            />
          ))}
        </svg>
      </div>

      <div className="flex items-center justify-between text-xs text-secondary border-t border-border pt-4">
        {data.map((item, index) => (
          <div key={index} className="text-center">
            <p className="font-medium text-text-primary mb-1">
              {item.avgTemp.toFixed(1)}°C
            </p>
            <p>{item.time}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-xs text-secondary mb-1">Average</p>
          <p className="text-lg font-semibold text-text-primary">
            {(data.reduce((sum, d) => sum + d.avgTemp, 0) / data.length).toFixed(1)}°C
          </p>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-xs text-secondary mb-1">Minimum</p>
          <p className="text-lg font-semibold text-text-primary">
            {minTemp.toFixed(1)}°C
          </p>
        </div>
        <div className="text-center p-3 bg-muted rounded-lg">
          <p className="text-xs text-secondary mb-1">Maximum</p>
          <p className="text-lg font-semibold text-text-primary">
            {maxTemp.toFixed(1)}°C
          </p>
        </div>
      </div>
    </div>
  );
};

export default TemperatureTrendChart;