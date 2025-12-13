import React from 'react';
import { MapFilters } from '../types';

interface MapControlsProps {
  filters: MapFilters;
  onFilterChange: (filters: MapFilters) => void;
  deviceCount: number;
}

const MapControls: React.FC<MapControlsProps> = ({ filters, onFilterChange, deviceCount }) => {
  const statusOptions = [
    { value: 'all', label: 'All Devices' },
    { value: 'active', label: 'Active' },
    { value: 'warning', label: 'Warning' },
    { value: 'offline', label: 'Offline' },
  ];

  const regionOptions = [
    { value: 'all', label: 'All Regions' },
    { value: 'North America', label: 'North America' },
    { value: 'South America', label: 'South America' },
    { value: 'Europe', label: 'Europe' },
    { value: 'Asia', label: 'Asia' },
    { value: 'Africa', label: 'Africa' },
    { value: 'Oceania', label: 'Oceania' },
  ];

  return (
    <div className="absolute top-4 left-4 z-[1000] bg-[#0a0a0f]/90 backdrop-blur-xl border border-[#c9a962]/20 rounded-2xl p-4 shadow-2xl">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[#faf9f6] mb-2">
            Global Monitoring
          </h3>
          <p className="text-2xl font-bold text-[#c9a962]">{deviceCount} Devices</p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-[#a8a8a8]">
            Status Filter
          </label>
          <select
            value={filters.status}
            onChange={(e) =>
              onFilterChange({ ...filters, status: e.target.value as MapFilters['status'] })
            }
            className="w-full px-3 py-2 bg-[#12121a] border border-[#c9a962]/20 rounded-lg text-sm text-[#faf9f6] focus:outline-none focus:ring-2 focus:ring-[#c9a962]/50 transition-all"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#12121a]">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-[#a8a8a8]">
            Region Filter
          </label>
          <select
            value={filters.region}
            onChange={(e) => onFilterChange({ ...filters, region: e.target.value })}
            className="w-full px-3 py-2 bg-[#12121a] border border-[#c9a962]/20 rounded-lg text-sm text-[#faf9f6] focus:outline-none focus:ring-2 focus:ring-[#c9a962]/50 transition-all"
          >
            {regionOptions.map((option) => (
              <option key={option.value} value={option.value} className="bg-[#12121a]">
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-3 border-t border-[#c9a962]/10">
          <div className="flex items-center gap-2 text-xs text-[#a8a8a8]">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#4a9d6b] animate-pulse" />
              <span>Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#c9a962] animate-pulse" />
              <span>Warning</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#c75050]" />
              <span>Offline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapControls;