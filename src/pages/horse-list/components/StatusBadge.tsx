import React from 'react';
import { StatusBadgeProps } from '../types';
import { useTheme } from '../../../contexts/ThemeContext';

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, lastObservation }) => {
  const { theme } = useTheme();
  
  const getStatusConfig = () => {
    const minutesAgo = Math.floor((Date.now() - lastObservation.getTime()) / 60000);
    
    switch (status) {
      case 'normal':
        return {
          label: 'Normal',
          bgClass: 'bg-gradient-to-r from-emerald-500/20 to-green-500/20',
          borderClass: 'border-emerald-400/30',
          textClass: 'text-emerald-300',
          dotClass: 'bg-emerald-400',
          glowClass: 'shadow-[0_0_20px_rgba(16,185,129,0.3)]',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      case 'suspicious':
        return {
          label: 'Needs Attention',
          bgClass: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20',
          borderClass: 'border-amber-400/30',
          textClass: 'text-amber-300',
          dotClass: 'bg-amber-400 animate-pulse',
          glowClass: 'shadow-[0_0_20px_rgba(245,158,11,0.3)]',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )
        };
      case 'inactive':
        return {
          label: 'No Recent Data',
          bgClass: 'bg-gradient-to-r from-slate-500/20 to-gray-500/20',
          borderClass: 'border-slate-400/30',
          textClass: 'text-slate-300',
          dotClass: 'bg-slate-400',
          glowClass: 'shadow-[0_0_15px_rgba(100,116,139,0.2)]',
          icon: (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        };
      default:
        return {
          label: 'Unknown',
          bgClass: 'bg-gradient-to-r from-slate-500/20 to-gray-500/20',
          borderClass: 'border-slate-400/30',
          textClass: 'text-slate-300',
          dotClass: 'bg-slate-400',
          glowClass: '',
          icon: null
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
      {/* Status Pill */}
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl ${config.bgClass} border ${config.borderClass} ${config.glowClass} transition-all duration-300`}>
        {/* Animated Dot Indicator */}
        <span className={`relative flex h-2 w-2`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dotClass} opacity-40`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dotClass}`}></span>
        </span>
        
        {/* Icon */}
        <span className={config.textClass}>
          {config.icon}
        </span>
        
        {/* Status Text */}
        <span className={`text-xs font-semibold ${config.textClass}`}>
          {config.label}
        </span>
      </div>

      {/* Time Indicator */}
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full backdrop-blur-xl border ${
        theme === 'dark' ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-black/[0.03] border-black/[0.1]'
      }`}>
        <svg className={`w-3 h-3 ${theme === 'dark' ? 'text-white/40' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span className={`text-xs font-medium ${theme === 'dark' ? 'text-white/50' : 'text-gray-600'}`}>
          {getTimeText()}
        </span>
      </div>
    </div>
  );
};

export default StatusBadge;