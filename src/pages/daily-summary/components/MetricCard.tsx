import React from 'react';
import Icon from '../../../components/AppIcon';
import { DailySummaryMetric } from '../types';

interface MetricCardProps {
  metric: DailySummaryMetric;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  const isPositiveTrend = metric.trend >= 0;

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-card transition-smooth hover:shadow-modal">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
          <Icon name={metric.icon} size={24} className="text-accent" />
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
          isPositiveTrend ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
        }`}>
          <Icon 
            name={isPositiveTrend ? 'TrendingUp' : 'TrendingDown'} 
            size={14} 
          />
          <span>{Math.abs(metric.trend)}%</span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-secondary">{metric.title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-semibold text-text-primary">
            {metric.value}
          </span>
          <span className="text-lg text-secondary">{metric.unit}</span>
        </div>
        <p className="text-xs text-secondary mt-2">{metric.description}</p>
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-xs text-secondary">{metric.trendLabel}</p>
      </div>
    </div>
  );
};

export default MetricCard;