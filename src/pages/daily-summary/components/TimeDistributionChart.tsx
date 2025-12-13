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
    <div className="glass-card p-6 luxury-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#c9a962]/10">
            <Icon name="Clock" size={20} className="text-[#c9a962]" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-medium text-[#faf9f6]">
              Observation Timeline
            </h3>
            <p className="text-sm text-[#6b6b6b]">24-hour activity view</p>
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
                  className="w-full bg-gradient-to-t from-[#c9a962]/40 to-[#c9a962]/20 rounded-t transition-all duration-500"
                  style={{ height: `${Math.max(percentage, 4)}%` }}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between text-xs text-[#6b6b6b] mb-4">
        {keyHours.map((item) => (
          <span key={item.hour}>{item.label}</span>
        ))}
      </div>

      <div className="pt-4 border-t border-[#c9a962]/10">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Icon name="TrendingUp" size={14} className="text-[#c9a962]" />
            <span className="text-[#a8a8a8]">Peak: <span className="text-[#faf9f6]">{data.reduce((max, curr) => curr.count > max.count ? curr : max).label}</span></span>
          </div>
          <span className="text-[#6b6b6b]">Total: {data.reduce((sum, curr) => sum + curr.count, 0)} observations</span>
        </div>
      </div>
    </div>
  );
};

export default TimeDistributionChart;