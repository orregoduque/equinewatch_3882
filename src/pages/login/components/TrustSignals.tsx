import React from 'react';
import Icon from '../../../components/AppIcon';
import type { TrustBadge } from '../types';

interface TrustSignalsProps {
  badges: TrustBadge[];
}

const TrustSignals: React.FC<TrustSignalsProps> = ({ badges }) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-6 mt-8 pt-6 border-t border-border">
      {badges.map((badge) => (
        <div
          key={badge.id}
          className="flex items-center gap-2 text-secondary transition-smooth hover:text-text-primary"
          title={badge.description}
        >
          <Icon name={badge.icon} size={20} strokeWidth={1.5} />
          <span className="text-sm font-medium">{badge.label}</span>
        </div>
      ))}
    </div>
  );
};

export default TrustSignals;