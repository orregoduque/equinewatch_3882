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
      case 'normal': return { bg: 'bg-[#4a9d6b]', text: 'text-[#4a9d6b]', border: 'border-[#4a9d6b]/50' };
      case 'reduced': return { bg: 'bg-[#d4a84b]', text: 'text-[#d4a84b]', border: 'border-[#d4a84b]/50' };
      case 'absent': return { bg: 'bg-[#c75050]', text: 'text-[#c75050]', border: 'border-[#c75050]/50' };
      case 'hyperactive': return { bg: 'bg-[#5a8dc7]', text: 'text-[#5a8dc7]', border: 'border-[#5a8dc7]/50' };
      default: return { bg: 'bg-[#6b6b6b]', text: 'text-[#6b6b6b]', border: 'border-[#6b6b6b]/50' };
    }
  };

  const quadrantPositions: Record<string, string> = {
    'Upper Left': 'top-4 left-4',
    'Upper Right': 'top-4 right-4',
    'Lower Left': 'bottom-4 left-4',
    'Lower Right': 'bottom-4 right-4',
  };

  return (
    <div className="glass-card p-6 luxury-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#c9a962]/10">
            <Icon name="Stethoscope" size={20} className="text-[#c9a962]" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-medium text-[#faf9f6]">Gut Sounds Assessment</h3>
            <p className="text-sm text-[#6b6b6b]">Critical for colic detection</p>
          </div>
        </div>
      </div>

      <div className="relative w-full aspect-square max-w-[280px] mx-auto mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-[#c9a962]/20 bg-gradient-to-br from-[#c9a962]/5 to-transparent" />
        <div className="absolute inset-4 rounded-full border border-[#c9a962]/10" />
        <div className="absolute inset-8 rounded-full border border-dashed border-[#c9a962]/10" />
        
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon name="Heart" size={32} className="text-[#c9a962]/30" />
        </div>

        {data.map((quadrant, index) => {
          const colors = getSoundLevelColor(quadrant.soundLevel);
          const position = quadrantPositions[quadrant.quadrant] || 'top-1/2 left-1/2';
          
          return (
            <div 
              key={index}
              className={`absolute ${position} w-16 h-16 rounded-xl ${colors.border} border-2 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center transition-all duration-300 hover:scale-105`}
            >
              <div className={`w-3 h-3 rounded-full ${colors.bg} ${quadrant.soundLevel === 'absent' ? 'animate-pulse' : ''}`} />
              <span className={`text-[10px] font-medium mt-1 ${colors.text}`}>
                {quadrant.soundLevel.charAt(0).toUpperCase() + quadrant.soundLevel.slice(1)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="space-y-3">
        <div className="text-xs text-[#6b6b6b] text-center mb-4">Last auscultation: 15 minutes ago</div>
        
        <div className="grid grid-cols-4 gap-2">
          {['normal', 'reduced', 'absent', 'hyperactive'].map((level) => {
            const colors = getSoundLevelColor(level);
            return (
              <div key={level} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${colors.bg}`} />
                <span className="text-[10px] text-[#a8a8a8] capitalize">{level}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 p-3 rounded-xl bg-[#d4a84b]/10 border border-[#d4a84b]/30">
        <div className="flex items-start gap-2">
          <Icon name="AlertTriangle" size={16} className="text-[#d4a84b] mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[#d4a84b]">Reduced Activity Detected</p>
            <p className="text-xs text-[#a8a8a8] mt-1">Lower right quadrant showing decreased motility. Continue monitoring every 15 minutes.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GutHealthMonitor;
