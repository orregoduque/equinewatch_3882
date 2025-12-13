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
  color = '#00f0ff'
}) => {
  return (
    <div className="group relative overflow-hidden backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-xl p-6 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.05]">
      {/* Gradient Background on Hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-[#00f0ff]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className="p-3 rounded-xl bg-white/[0.05] group-hover:bg-[#00f0ff]/10 transition-colors duration-300">
            <Icon 
              name={icon} 
              size={24} 
              className="text-[#00f0ff] group-hover:scale-110 transition-transform duration-300" 
            />
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-sm text-secondary font-medium">{label}</p>
          <p className="text-3xl font-bold text-text-primary">{value}</p>
          {description && (
            <p className="text-xs text-secondary mt-2">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatCard;