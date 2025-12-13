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
    <div className="absolute top-4 left-4 z-[1000] bg-white/10 dark:bg-primary-900/10 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl">
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-primary-900 dark:text-white mb-2">
            Global Monitoring
          </h3>
          <p className="text-2xl font-bold text-accent">{deviceCount} Devices</p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Status Filter
          </label>
          <select
            value={filters.status}
            onChange={(e) =>
              onFilterChange({ ...filters, status: e.target.value as MapFilters['status'] })
            }
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-primary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
            Region Filter
          </label>
          <select
            value={filters.region}
            onChange={(e) => onFilterChange({ ...filters, region: e.target.value })}
            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-primary-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
          >
            {regionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-3 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>Active</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
              <span>Warning</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>Offline</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapControls;