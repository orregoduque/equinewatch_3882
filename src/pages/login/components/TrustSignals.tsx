import React from 'react';
import Icon from '../../../components/AppIcon';
import type { TrustBadge } from '../types';

interface TrustSignalsProps {
  badges: TrustBadge[];
}

const TrustSignals: React.FC<TrustSignalsProps> = ({ badges }) => {
  return (
    <div className="mt-10 pt-8" style={{ borderTop: '1px solid rgba(64,53,44,0.1)' }}>
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className="flex items-center gap-2.5 cursor-default"
            style={{ color: 'rgba(64,53,44,0.5)' }}
            title={badge.description}
          >
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(64,53,44,0.06)' }}>
              <Icon name={badge.icon} size={16} strokeWidth={1.5} style={{ color: 'rgba(64,53,44,0.55)' }} />
            </div>
            <span className="text-xs font-semibold tracking-wide uppercase" style={{ fontFamily: 'Montserrat, sans-serif' }}>{badge.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustSignals;
