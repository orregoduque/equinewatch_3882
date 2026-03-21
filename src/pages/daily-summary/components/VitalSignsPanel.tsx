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
      case 'normal': return '#16a34a';
      case 'elevated': return '#d97706';
      case 'critical': return '#dc2626';
      case 'low': return '#2563eb';
      default: return 'rgba(64,53,44,0.55)';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'normal': return { bg: 'rgba(22,163,74,0.07)', border: 'rgba(22,163,74,0.2)' };
      case 'elevated': return { bg: 'rgba(217,119,6,0.07)', border: 'rgba(217,119,6,0.2)' };
      case 'critical': return { bg: 'rgba(220,38,38,0.07)', border: 'rgba(220,38,38,0.2)' };
      case 'low': return { bg: 'rgba(37,99,235,0.07)', border: 'rgba(37,99,235,0.2)' };
      default: return { bg: 'rgba(64,53,44,0.04)', border: 'rgba(64,53,44,0.1)' };
    }
  };

  const getGaugePercentage = (value: number, min: number, max: number) => {
    const range = max - min;
    const midpoint = min + range / 2;
    const deviation = ((value - midpoint) / (range / 2)) * 50;
    return Math.max(0, Math.min(100, 50 + deviation));
  };

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
          <div>
            <h3 className="text-xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>Vital Signs Monitor</h3>
            <p className="text-sm" style={{ color: 'rgba(64,53,44,0.5)' }}>Real-time colic indicators</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-green-600">Live</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vitals.map((vital) => {
          const statusBg = getStatusBg(vital.status);
          const statusColor = getStatusColor(vital.status);
          return (
            <div
              key={vital.id}
              className="p-4 rounded-xl transition-all duration-300"
              style={{ backgroundColor: statusBg.bg, border: `1px solid ${statusBg.border}` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon name={vital.icon} size={18} style={{ color: statusColor }} />
                  <span className="text-sm font-medium" style={{ color: 'rgba(64,53,44,0.7)' }}>{vital.name}</span>
                </div>
                <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded" style={{ color: statusColor }}>
                  {vital.status}
                </span>
              </div>

              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-3xl font-bold" style={{ color: statusColor, fontFamily: 'Syne, sans-serif' }}>{vital.value}</span>
                <span className="text-sm" style={{ color: 'rgba(64,53,44,0.4)' }}>{vital.unit}</span>
              </div>

              <div className="relative h-2 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'rgba(64,53,44,0.08)' }}>
                <div className="absolute inset-y-0 left-0 w-1/3 bg-blue-200/60" />
                <div className="absolute inset-y-0 left-1/3 w-1/3 bg-green-200/60" />
                <div className="absolute inset-y-0 right-0 w-1/3 bg-red-200/60" />
                <div
                  className="absolute top-0 w-3 h-full rounded-full"
                  style={{
                    backgroundColor: statusColor,
                    left: `${getGaugePercentage(vital.value, vital.normalMin, vital.normalMax)}%`,
                    transform: 'translateX(-50%)',
                  }}
                />
              </div>

              <div className="flex justify-between text-xs" style={{ color: 'rgba(64,53,44,0.45)' }}>
                <span>{vital.normalMin} {vital.unit}</span>
                <span className="text-green-600">Normal Range</span>
                <span>{vital.normalMax} {vital.unit}</span>
              </div>

              <div className="mt-3 flex items-end gap-0.5">
                {vital.trend.slice(-8).map((val, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${Math.max(4, (val / Math.max(...vital.trend)) * 24)}px`,
                      backgroundColor: 'rgba(64,53,44,0.12)',
                    }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VitalSignsPanel;
