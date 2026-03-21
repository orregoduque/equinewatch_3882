import React from 'react';
import Icon from '../../../components/AppIcon';
import { TimeDistribution } from '../types';

interface TimeDistributionChartProps {
  data: TimeDistribution[];
}

const TimeDistributionChart: React.FC<TimeDistributionChartProps> = ({ data }) => {
  if (!data?.length) return null;

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const keyHours = data.filter((_, i) => i % 4 === 0 || i === data.length - 1);

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.07)' }}>
            <Icon name="Clock" size={20} style={{ color: '#40352C' }} />
          </div>
          <div>
            <h3 className="text-xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
              Observation Timeline
            </h3>
            <p className="text-sm" style={{ color: 'rgba(64,53,44,0.5)' }}>24-hour activity view</p>
          </div>
        </div>
      </div>

      <div className="relative h-32 mb-4">
        <div className="absolute inset-0 flex items-end gap-1">
          {data.map((item) => {
            const percentage = (item.count / maxCount) * 100;
            return (
              <div key={item.hour} className="flex-1 flex flex-col items-center justify-end h-full">
                <div
                  className="w-full rounded-t transition-all duration-500"
                  style={{
                    height: `${Math.max(percentage, 4)}%`,
                    background: 'linear-gradient(to top, rgba(64,53,44,0.25), rgba(64,53,44,0.1))',
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between text-xs mb-4" style={{ color: 'rgba(64,53,44,0.45)' }}>
        {keyHours.map((item) => (
          <span key={item.hour}>{item.label}</span>
        ))}
      </div>

      <div className="pt-4" style={{ borderTop: '1px solid rgba(64,53,44,0.08)' }}>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Icon name="TrendingUp" size={14} style={{ color: '#40352C' }} />
            <span style={{ color: 'rgba(64,53,44,0.55)' }}>
              Peak: <span style={{ color: '#40352C', fontWeight: 600 }}>{data.reduce((max, curr) => curr.count > max.count ? curr : max).label}</span>
            </span>
          </div>
          <span style={{ color: 'rgba(64,53,44,0.45)' }}>Total: {data.reduce((sum, curr) => sum + curr.count, 0)} observations</span>
        </div>
      </div>
    </div>
  );
};

export default TimeDistributionChart;
