import React from 'react';
import Icon from '../../../components/AppIcon';
import { BehaviorPattern } from '../types';

interface BehaviorPatternsCardProps {
  patterns: BehaviorPattern[];
}

const BehaviorPatternsCard: React.FC<BehaviorPatternsCardProps> = ({ patterns }) => {
  if (!patterns?.length) return null;
  
  const totalCount = patterns.reduce((sum, p) => sum + p.count, 0);

  return (
    <div className="glass-card p-6 luxury-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#c9a962]/10">
            <Icon name="Activity" size={20} className="text-[#c9a962]" />
          </div>
          <h3 className="font-serif text-xl font-medium text-[#faf9f6]">
            Behavior Patterns
          </h3>
        </div>
        <span className="text-sm text-[#6b6b6b]">
          {totalCount} observations
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
                <span className="text-sm font-medium text-[#faf9f6]">
                  {pattern.type}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-[#6b6b6b]">
                  {pattern.count} observations
                </span>
                <span className="text-sm font-semibold text-[#faf9f6]">
                  {pattern.percentage}%
                </span>
              </div>
            </div>

            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full transition-all duration-500 ease-out rounded-full"
                style={{
                  width: `${pattern.percentage}%`,
                  backgroundColor: pattern.color
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-[#c9a962]/10">
        <div className="flex items-center gap-2 text-xs text-[#6b6b6b]">
          <Icon name="Info" size={14} className="text-[#c9a962]" />
          <span>
            Behavior patterns help identify potential health concerns early
          </span>
        </div>
      </div>
    </div>
  );
};

export default BehaviorPatternsCard;