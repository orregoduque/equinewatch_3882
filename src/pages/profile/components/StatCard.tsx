import React from 'react';
import Icon from '../../../components/AppIcon';
import * as LucideIcons from 'lucide-react';

interface StatCardProps {
  icon: keyof typeof LucideIcons;
  label: string;
  value: string | number;
  description?: string;
  color?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  label,
  value,
  description,
}) => {
  return (
    <div
      className="group relative overflow-hidden rounded-xl p-6 transition-all duration-300"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid rgba(64,53,44,0.1)',
        boxShadow: '0 2px 8px rgba(64,53,44,0.05)',
      }}
      onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 24px rgba(64,53,44,0.1)')}
      onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(64,53,44,0.05)')}
    >
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div
            className="p-3 rounded-xl transition-colors duration-300"
            style={{ backgroundColor: 'rgba(64,53,44,0.07)' }}
          >
            <Icon
              name={icon}
              size={24}
              style={{ color: '#40352C' }}
              className="group-hover:scale-110 transition-transform duration-300"
            />
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm font-medium" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }}>{label}</p>
          <p className="text-3xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{value}</p>
          {description && (
            <p className="text-xs mt-2" style={{ color: 'rgba(64,53,44,0.45)', fontFamily: 'Montserrat, sans-serif' }}>{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;
