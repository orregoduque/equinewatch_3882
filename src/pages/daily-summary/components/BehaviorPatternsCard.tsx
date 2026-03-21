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
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.07)' }}>
            <Icon name="Activity" size={20} style={{ color: '#40352C' }} />
          </div>
          <h3 className="text-xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
            Behavior Patterns
          </h3>
        </div>
        <span className="text-sm" style={{ color: 'rgba(64,53,44,0.5)' }}>
          {totalCount} observations
        </span>
      </div>

      <div className="space-y-4">
        {patterns.map((pattern) => (
          <div key={pattern.type} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: pattern.color }} />
                <span className="text-sm font-medium" style={{ color: '#40352C' }}>
                  {pattern.type}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm" style={{ color: 'rgba(64,53,44,0.5)' }}>
                  {pattern.count} observations
                </span>
                <span className="text-sm font-bold" style={{ color: '#40352C' }}>
                  {pattern.percentage}%
                </span>
              </div>
            </div>

            <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(64,53,44,0.08)' }}>
              <div
                className="h-full transition-all duration-500 ease-out rounded-full"
                style={{ width: `${pattern.percentage}%`, backgroundColor: pattern.color }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4" style={{ borderTop: '1px solid rgba(64,53,44,0.08)' }}>
        <div className="flex items-center gap-2 text-xs" style={{ color: 'rgba(64,53,44,0.5)' }}>
          <Icon name="Info" size={14} style={{ color: '#40352C' }} />
          <span>Behavior patterns help identify potential health concerns early</span>
        </div>
      </div>
    </div>
  );
};

export default BehaviorPatternsCard;
