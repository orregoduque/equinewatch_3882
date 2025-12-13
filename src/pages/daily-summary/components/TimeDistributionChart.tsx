import React from 'react';
import { TimeDistribution } from '../types';

interface TimeDistributionChartProps {
  data: TimeDistribution[];
}

const TimeDistributionChart: React.FC<TimeDistributionChartProps> = ({ data }) => {
  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">
          Observation Timeline
        </h3>
        <span className="text-sm text-secondary">24-hour view</span>
      </div>

      <div className="space-y-3">
        {data.map((item) => {
          const percentage = (item.count / maxCount) * 100;
          const hasObservations = item.count > 0;

          return (
            <div key={item.hour} className="flex items-center gap-3">
              <span className="text-xs font-medium text-secondary w-16">
                {item.label}
              </span>
              <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden relative">
                {hasObservations && (
                  <div
                    className="h-full bg-accent/20 transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                  >
                    <div className="h-full bg-gradient-to-r from-accent/40 to-accent/20" />
                  </div>
                )}
              </div>
              <span className="text-sm font-medium text-text-primary w-8 text-right">
                {item.count}
              </span>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center justify-between text-xs text-secondary">
          <span>Peak activity: {data.reduce((max, curr) => curr.count > max.count ? curr : max).label}</span>
          <span>Total observations: {data.reduce((sum, curr) => sum + curr.count, 0)}</span>
        </div>
      </div>
    </div>
  );
};

export default TimeDistributionChart;