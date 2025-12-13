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
    <div className="bg-card rounded-xl p-6 border border-border shadow-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text-primary">
          Monitoring Coverage
        </h3>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${
          isFullCoverage ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
        }`}>
          <Icon name={isFullCoverage ? 'CheckCircle2' : 'AlertCircle'} size={14} />
          <span>{coveragePercentage.toFixed(0)}%</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-secondary">Horses monitored today</span>
          <span className="text-2xl font-semibold text-text-primary">
            {monitoredHorses} / {totalHorses}
          </span>
        </div>

        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ease-out ${
              isFullCoverage ? 'bg-success' : 'bg-warning'
            }`}
            style={{ width: `${coveragePercentage}%` }}
          />
        </div>

        {!isFullCoverage && (
          <div className="flex items-start gap-2 p-3 bg-warning/5 rounded-lg border border-warning/20">
            <Icon name="AlertTriangle" size={16} className="text-warning mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-warning mb-1">
                Incomplete Coverage
              </p>
              <p className="text-xs text-secondary">
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