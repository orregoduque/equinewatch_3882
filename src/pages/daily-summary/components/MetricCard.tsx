import React from 'react';
import Icon from '../../../components/AppIcon';
import { DailySummaryMetric } from '../types';

interface MetricCardProps {
  metric: DailySummaryMetric;
}

const MetricCard: React.FC<MetricCardProps> = ({ metric }) => {
  const isPositiveTrend = metric.trend >= 0;
  
  const getStatusColor = () => {
    switch (metric.status) {
      case 'warning': return { bg: 'bg-[#d4a84b]/10', border: 'border-[#d4a84b]/30', text: 'text-[#d4a84b]' };
      case 'critical': return { bg: 'bg-[#c75050]/10', border: 'border-[#c75050]/30', text: 'text-[#c75050]' };
      default: return { bg: 'bg-[#c9a962]/10', border: 'border-[#c9a962]/20', text: 'text-[#c9a962]' };
    }
  };

  const statusColors = getStatusColor();

  return (
    <div className="glass-card p-6 luxury-border hover:bg-white/[0.04] transition-all duration-300">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${statusColors.bg} ${statusColors.border} border flex items-center justify-center`}>
          <Icon name={metric.icon} size={24} className={statusColors.text} />
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
          isPositiveTrend ? 'bg-[#4a9d6b]/10 text-[#4a9d6b]' : 'bg-[#c75050]/10 text-[#c75050]'
        }`}>
          <Icon 
            name={isPositiveTrend ? 'TrendingUp' : 'TrendingDown'} 
            size={14} 
          />
          <span>{Math.abs(metric.trend)}%</span>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-[#a8a8a8]">{metric.title}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-light text-[#faf9f6]">
            {metric.value}
          </span>
          <span className="text-lg text-[#6b6b6b]">{metric.unit}</span>
        </div>
        <p className="text-xs text-[#6b6b6b] mt-2">{metric.description}</p>
      </div>

      <div className="mt-4 pt-4 border-t border-[#c9a962]/10">
        <p className="text-xs text-[#a8a8a8]">{metric.trendLabel}</p>
      </div>
    </div>
  );
};

export default MetricCard;