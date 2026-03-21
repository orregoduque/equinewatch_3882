import React from 'react';
import Icon from '../../../components/AppIcon';

interface CoverageIndicatorProps {
  totalHorses: number;
  monitoredHorses: number;
}

const CoverageIndicator: React.FC<CoverageIndicatorProps> = ({ totalHorses, monitoredHorses }) => {
  const coveragePercentage = (monitoredHorses / totalHorses) * 100;
  const isFullCoverage = coveragePercentage === 100;

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.07)' }}>
            <Icon name="Users" size={20} style={{ color: '#40352C' }} />
          </div>
          <h3 className="text-xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
            Monitoring Coverage
          </h3>
        </div>
        <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium ${
          isFullCoverage ? 'bg-green-50 border border-green-200 text-green-600' : 'bg-amber-50 border border-amber-200 text-amber-600'
        }`}>
          <Icon name={isFullCoverage ? 'CheckCircle2' : 'AlertCircle'} size={14} />
          <span>{coveragePercentage.toFixed(0)}%</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>Horses monitored today</span>
          <span className="text-2xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
            {monitoredHorses} / {totalHorses}
          </span>
        </div>

        <div className="h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(64,53,44,0.08)' }}>
          <div
            className="h-full transition-all duration-500 ease-out rounded-full"
            style={{
              width: `${coveragePercentage}%`,
              backgroundColor: isFullCoverage ? '#16a34a' : '#d97706',
            }}
          />
        </div>

        {!isFullCoverage && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
            <Icon name="AlertTriangle" size={16} className="text-amber-500 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-700 mb-1">Incomplete Coverage</p>
              <p className="text-xs text-amber-600">
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
