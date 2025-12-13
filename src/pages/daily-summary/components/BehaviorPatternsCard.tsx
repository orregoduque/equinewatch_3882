import React from 'react';
import Icon from '../../../components/AppIcon';
import { BehaviorPattern } from '../types';

interface BehaviorPatternsCardProps {
  patterns: BehaviorPattern[];
}

const BehaviorPatternsCard: React.FC<BehaviorPatternsCardProps> = ({ patterns }) => {
  const totalCount = patterns.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="bg-card rounded-xl p-6 border border-border shadow-card">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">
          Behavior Patterns
        </h3>
        <span className="text-sm text-secondary">
          {totalCount} total observations
        </span>
      </div>

      <div className="space-y-4">
        {patterns.map((pattern) => (
          <div key={pattern.type} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: pattern.color }}
                />
                <span className="text-sm font-medium text-text-primary">
                  {pattern.type}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-secondary">
                  {pattern.count} observations
                </span>
                <span className="text-sm font-semibold text-text-primary">
                  {pattern.percentage}%
                </span>
              </div>
            </div>

            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-out"
                style={{
                  width: `${pattern.percentage}%`,
                  backgroundColor: pattern.color
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-secondary">
          <Icon name="Info" size={14} />
          <span>
            Behavior patterns help identify potential health concerns early
          </span>
        </div>
      </div>
    </div>
  );
};

export default BehaviorPatternsCard;