import React from 'react';
import Icon from '../../../components/AppIcon';
import type { TrustBadge } from '../types';

interface TrustSignalsProps {
  badges: TrustBadge[];
}

const TrustSignals: React.FC<TrustSignalsProps> = ({ badges }) => {
  return (
    <div className="mt-10 pt-8">
      <div className="divider-luxury mb-8" />
      
      <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className="flex items-center gap-2.5 text-[#6b6b6b] transition-all duration-300 hover:text-[#c9a962] group cursor-default"
            title={badge.description}
          >
            <div className="p-1.5 rounded-lg bg-[#c9a962]/5 group-hover:bg-[#c9a962]/10 transition-colors duration-300">
              <Icon name={badge.icon} size={16} strokeWidth={1.5} className="text-[#c9a962]/70 group-hover:text-[#c9a962] transition-colors duration-300" />
            </div>
            <span className="text-xs font-medium tracking-wide uppercase">{badge.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TrustSignals;
