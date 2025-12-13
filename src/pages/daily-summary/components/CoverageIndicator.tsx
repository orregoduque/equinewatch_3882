import React from 'react';
import Icon from '../../../components/AppIcon';

interface CoverageIndicatorProps {
  totalHorses: number;
  monitoredHorses: number;
}

const CoverageIndicator: React.FC<CoverageIndicatorProps> = ({ 
  totalHorses, 
  monitoredHorses 
}) => {
  const coveragePercentage = (monitoredHorses / totalHorses) * 100;
  const isFullCoverage = coveragePercentage === 100;

  return (
    <div className="glass-card p-6 luxury-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#c9a962]/10">
            <Icon name="Users" size={20} className="text-[#c9a962]" />
          </div>
          <h3 className="font-serif text-xl font-medium text-[#faf9f6]">
            Monitoring Coverage
          </h3>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
          isFullCoverage ? 'bg-[#4a9d6b]/10 border border-[#4a9d6b]/30 text-[#4a9d6b]' : 'bg-[#d4a84b]/10 border border-[#d4a84b]/30 text-[#d4a84b]'
        }`}>
          <Icon name={isFullCoverage ? 'CheckCircle2' : 'AlertCircle'} size={14} />
          <span>{coveragePercentage.toFixed(0)}%</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[#a8a8a8]">Horses monitored today</span>
          <span className="text-2xl font-light text-[#faf9f6]">
            {monitoredHorses} / {totalHorses}
          </span>
        </div>

        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out rounded-full ${
              isFullCoverage ? 'bg-[#4a9d6b]' : 'bg-[#d4a84b]'
            }`}
            style={{ width: `${coveragePercentage}%` }}
          />
        </div>

        {!isFullCoverage && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-[#d4a84b]/10 border border-[#d4a84b]/30">
            <Icon name="AlertTriangle" size={16} className="text-[#d4a84b] mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-[#d4a84b] mb-1">
                Incomplete Coverage
              </p>
              <p className="text-xs text-[#a8a8a8]">
                {totalHorses - monitoredHorses} horse(s) have not been observed today
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoverageIndicator;