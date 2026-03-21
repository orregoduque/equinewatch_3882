import React from 'react';
import Icon from '../../../components/AppIcon';
import { DailySummaryMetric } from '../types';

interface MetricCardProps {
  metric: DailySummaryMetric;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  const isPositiveTrend = metric.trend >= 0;

  const getStatusIcon = () => {
    switch (metric.status) {
      case 'warning': return { bg: 'rgba(217,119,6,0.1)', border: 'rgba(217,119,6,0.25)', icon: '#d97706' };
      case 'critical': return { bg: 'rgba(220,38,38,0.1)', border: 'rgba(220,38,38,0.25)', icon: '#dc2626' };
      default: return { bg: 'rgba(64,53,44,0.07)', border: 'rgba(64,53,44,0.15)', icon: '#40352C' };
    }
  };

  const statusColors = getStatusIcon();

  return (
    <div
      className="rounded-xl p-6 transition-all duration-300 hover:shadow-md"
      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: statusColors.bg, border: `1px solid ${statusColors.border}` }}
        >
          <Icon name={metric.icon} size={24} style={{ color: statusColors.icon }} />
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
          isPositiveTrend ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
        }`}>
          <Icon name={isPositiveTrend ? 'TrendingUp' : 'TrendingDown'} size={14} />
          <span>{Math.abs(metric.trend)}%</span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium" style={{ color: 'rgba(64,53,44,0.55)' }}>{metric.title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
            {metric.value}
          </span>
          <span className="text-lg" style={{ color: 'rgba(64,53,44,0.4)' }}>{metric.unit}</span>
        </div>
        <p className="text-xs mt-2" style={{ color: 'rgba(64,53,44,0.4)' }}>{metric.description}</p>
      </div>

      <div className="mt-4 pt-4" style={{ borderTop: '1px solid rgba(64,53,44,0.08)' }}>
        <p className="text-xs" style={{ color: 'rgba(64,53,44,0.5)' }}>{metric.trendLabel}</p>
      </div>
    </div>
  );
};

export default MetricCard;
