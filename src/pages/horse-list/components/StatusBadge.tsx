import React from 'react';
import { StatusBadgeProps } from '../types';

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, lastObservation }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'normal':
        return {
          label: 'Normal',
          bgClass: 'bg-gradient-to-r from-[#4a9d6b]/20 to-[#5cb87d]/20',
          borderClass: 'border-[#4a9d6b]/30',
          textClass: 'text-[#5cb87d]',
          dotClass: 'bg-[#4a9d6b]',
          glowClass: 'shadow-[0_0_15px_rgba(74,157,107,0.2)]',
        };
      case 'suspicious':
        return {
          label: 'Needs Attention',
          bgClass: 'bg-gradient-to-r from-[#d4a84b]/20 to-[#e0bc6a]/20',
          borderClass: 'border-[#d4a84b]/30',
          textClass: 'text-[#e0bc6a]',
          dotClass: 'bg-[#d4a84b] animate-pulse',
          glowClass: 'shadow-[0_0_15px_rgba(212,168,75,0.2)]',
        };
      case 'inactive':
        return {
          label: 'No Recent Data',
          bgClass: 'bg-gradient-to-r from-[#6b6b6b]/20 to-[#8b8b8b]/20',
          borderClass: 'border-[#6b6b6b]/30',
          textClass: 'text-[#a8a8a8]',
          dotClass: 'bg-[#6b6b6b]',
          glowClass: '',
        };
      default:
        return {
          label: 'Unknown',
          bgClass: 'bg-gradient-to-r from-[#6b6b6b]/20 to-[#8b8b8b]/20',
          borderClass: 'border-[#6b6b6b]/30',
          textClass: 'text-[#a8a8a8]',
          dotClass: 'bg-[#6b6b6b]',
          glowClass: '',
        };
    }
  };

  const config = getStatusConfig();
  const minutesAgo = Math.floor((Date.now() - lastObservation.getTime()) / 60000);
  
  const getTimeText = () => {
    if (minutesAgo < 1) return 'Just now';
    if (minutesAgo < 60) return `${minutesAgo}m ago`;
    const hoursAgo = Math.floor(minutesAgo / 60);
    if (hoursAgo < 24) return `${hoursAgo}h ago`;
    const daysAgo = Math.floor(hoursAgo / 24);
    return `${daysAgo}d ago`;
  };

  return (
    <div className="flex items-center gap-3 w-full">
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl ${config.bgClass} border ${config.borderClass} ${config.glowClass} transition-all duration-300`}>
        <span className="relative flex h-2 w-2">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dotClass} opacity-40`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotClass}`}></span>
        </span>
        <span className={`text-xs font-semibold ${config.textClass}`}>
          {config.label}
        </span>
      </div>

      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-xl bg-white/[0.03] border border-[#c9a962]/10">
        <svg className="w-3 h-3 text-[#6b6b6b]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className="text-xs font-medium text-[#6b6b6b]">
          {getTimeText()}
        </span>
      </div>
    </div>
  );
};

export default StatusBadge;
