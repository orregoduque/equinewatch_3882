import React from 'react';
import Icon from '../../../components/AppIcon';
import { VitalSign } from '../types';

interface VitalSignsPanelProps {
  vitals: VitalSign[];
}

const VitalSignsPanel: React.FC<VitalSignsPanelProps> = ({ vitals }) => {
  if (!vitals?.length) return null;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'normal': return 'text-[#4a9d6b]';
      case 'elevated': return 'text-[#d4a84b]';
      case 'critical': return 'text-[#c75050]';
      case 'low': return 'text-[#5a8dc7]';
      default: return 'text-[#a8a8a8]';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'normal': return 'bg-[#4a9d6b]/10 border-[#4a9d6b]/30';
      case 'elevated': return 'bg-[#d4a84b]/10 border-[#d4a84b]/30';
      case 'critical': return 'bg-[#c75050]/10 border-[#c75050]/30 animate-pulse';
      case 'low': return 'bg-[#5a8dc7]/10 border-[#5a8dc7]/30';
      default: return 'bg-white/5 border-[#c9a962]/10';
    }
  };

  const getGaugePercentage = (value: number, min: number, max: number) => {
    const range = max - min;
    const midpoint = min + range / 2;
    const deviation = ((value - midpoint) / (range / 2)) * 50;
    return Math.max(0, Math.min(100, 50 + deviation));
  };

  return (
    <div className="glass-card p-6 luxury-border">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#c9a962]/10">
            <Icon name="Activity" size={20} className="text-[#c9a962]" />
          </div>
          <div>
            <h3 className="font-serif text-xl font-medium text-[#faf9f6]">Vital Signs Monitor</h3>
            <p className="text-sm text-[#6b6b6b]">Real-time colic indicators</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#4a9d6b]/10 border border-[#4a9d6b]/30">
          <div className="w-2 h-2 rounded-full bg-[#4a9d6b] animate-pulse" />
          <span className="text-xs font-medium text-[#4a9d6b]">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vitals.map((vital) => (
          <div key={vital.id} className={`p-4 rounded-xl border ${getStatusBg(vital.status)} transition-all duration-300`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icon name={vital.icon} size={18} className={getStatusColor(vital.status)} />
                <span className="text-sm font-medium text-[#a8a8a8]">{vital.name}</span>
              </div>
              <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${getStatusColor(vital.status)}`}>
                {vital.status}
              </span>
            </div>
            
            <div className="flex items-baseline gap-2 mb-3">
              <span className={`text-3xl font-light ${getStatusColor(vital.status)}`}>{vital.value}</span>
              <span className="text-sm text-[#6b6b6b]">{vital.unit}</span>
            </div>

            <div className="relative h-2 bg-white/5 rounded-full overflow-hidden mb-2">
              <div className="absolute inset-y-0 left-0 w-1/3 bg-[#5a8dc7]/30" />
              <div className="absolute inset-y-0 left-1/3 w-1/3 bg-[#4a9d6b]/30" />
              <div className="absolute inset-y-0 right-0 w-1/3 bg-[#c75050]/30" />
              <div 
                className={`absolute top-0 w-3 h-full rounded-full ${vital.status === 'normal' ? 'bg-[#4a9d6b]' : vital.status === 'critical' ? 'bg-[#c75050]' : 'bg-[#d4a84b]'}`}
                style={{ left: `${getGaugePercentage(vital.value, vital.normalMin, vital.normalMax)}%`, transform: 'translateX(-50%)' }}
              />
            </div>

            <div className="flex justify-between text-xs text-[#6b6b6b]">
              <span>{vital.normalMin} {vital.unit}</span>
              <span className="text-[#4a9d6b]">Normal Range</span>
              <span>{vital.normalMax} {vital.unit}</span>
            </div>

            <div className="mt-3 flex items-center gap-1">
              {vital.trend.slice(-8).map((val, i) => (
                <div 
                  key={i} 
                  className="flex-1 bg-white/10 rounded-sm"
                  style={{ height: `${Math.max(4, (val / Math.max(...vital.trend)) * 24)}px` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VitalSignsPanel;
