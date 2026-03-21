import React from 'react';
import Icon from '../../../components/AppIcon';
import { GutHealthData } from '../types';

interface GutHealthMonitorProps {
  data: GutHealthData[];
}

const GutHealthMonitor: React.FC<GutHealthMonitorProps> = ({ data }) => {
  if (!data?.length) return null;

  const getSoundLevelColor = (level: string) => {
    switch (level) {
      case 'normal': return { dot: '#16a34a', text: '#16a34a', border: 'rgba(22,163,74,0.35)' };
      case 'reduced': return { dot: '#d97706', text: '#d97706', border: 'rgba(217,119,6,0.35)' };
      case 'absent': return { dot: '#dc2626', text: '#dc2626', border: 'rgba(220,38,38,0.35)' };
      case 'hyperactive': return { dot: '#2563eb', text: '#2563eb', border: 'rgba(37,99,235,0.35)' };
      default: return { dot: 'rgba(64,53,44,0.4)', text: 'rgba(64,53,44,0.4)', border: 'rgba(64,53,44,0.2)' };
    }
  };

  const quadrantPositions: Record<string, string> = {
    'Upper Left': 'top-4 left-4',
    'Upper Right': 'top-4 right-4',
    'Lower Left': 'bottom-4 left-4',
    'Lower Right': 'bottom-4 right-4',
  };

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.07)' }}>
            <Icon name="Stethoscope" size={20} style={{ color: '#40352C' }} />
          </div>
          <div>
            <h3 className="text-xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>Gut Sounds Assessment</h3>
            <p className="text-sm" style={{ color: 'rgba(64,53,44,0.5)' }}>Critical for colic detection</p>
          </div>
        </div>
      </div>

      <div className="relative w-full aspect-square max-w-[280px] mx-auto mb-6">
        <div
          className="absolute inset-0 rounded-full"
          style={{ border: '2px solid rgba(64,53,44,0.12)', background: 'radial-gradient(circle, rgba(64,53,44,0.04) 0%, transparent 70%)' }}
        />
        <div className="absolute inset-4 rounded-full" style={{ border: '1px solid rgba(64,53,44,0.07)' }} />
        <div className="absolute inset-8 rounded-full" style={{ border: '1px dashed rgba(64,53,44,0.07)' }} />

        <div className="absolute inset-0 flex items-center justify-center">
          <Icon name="Heart" size={32} style={{ color: 'rgba(64,53,44,0.15)' }} />
        </div>

        {data.map((quadrant, index) => {
          const colors = getSoundLevelColor(quadrant.soundLevel);
          const position = quadrantPositions[quadrant.quadrant] || 'top-1/2 left-1/2';

          return (
            <div
              key={index}
              className={`absolute ${position} w-16 h-16 rounded-xl flex flex-col items-center justify-center transition-all duration-300 hover:scale-105`}
              style={{ border: `2px solid ${colors.border}`, backgroundColor: 'rgba(248,246,242,0.95)', backdropFilter: 'blur(4px)' }}
            >
              <div
                className="w-3 h-3 rounded-full"
                style={{
                  backgroundColor: colors.dot,
                  animation: quadrant.soundLevel === 'absent' ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined,
                }}
              />
              <span className="text-[10px] font-medium mt-1" style={{ color: colors.text }}>
                {quadrant.soundLevel.charAt(0).toUpperCase() + quadrant.soundLevel.slice(1)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="text-xs text-center mb-4" style={{ color: 'rgba(64,53,44,0.45)' }}>Last auscultation: 15 minutes ago</div>

        <div className="grid grid-cols-4 gap-2">
          {[
            { level: 'normal', color: '#16a34a' },
            { level: 'reduced', color: '#d97706' },
            { level: 'absent', color: '#dc2626' },
            { level: 'hyperactive', color: '#2563eb' },
          ].map(({ level, color }) => (
            <div key={level} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
              <span className="text-[10px] capitalize" style={{ color: 'rgba(64,53,44,0.55)' }}>{level}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-amber-50 border border-amber-200">
        <div className="flex items-start gap-2">
          <Icon name="AlertTriangle" size={16} className="text-amber-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-700">Reduced Activity Detected</p>
            <p className="text-xs text-amber-600 mt-1">Lower right quadrant showing decreased motility. Continue monitoring every 15 minutes.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GutHealthMonitor;
