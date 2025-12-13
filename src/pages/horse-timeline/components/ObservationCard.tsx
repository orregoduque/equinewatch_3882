import React from 'react';
import { format } from 'date-fns';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';
import { ObservationCardProps } from '../types';

const ObservationCard: React.FC<ObservationCardProps> = ({ observation }) => {
  const getStatusConfig = () => {
    switch (observation.behaviorStatus) {
      case 'normal':
        return {
          bgClass: 'from-emerald-500/20 to-green-500/20',
          borderClass: 'border-emerald-400/30',
          textClass: 'text-emerald-300',
          glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
          icon: 'CheckCircle'
        };
      case 'suspicious':
        return {
          bgClass: 'from-amber-500/20 to-orange-500/20',
          borderClass: 'border-amber-400/30',
          textClass: 'text-amber-300',
          glowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.3)]',
          icon: 'AlertTriangle'
        };
      default:
        return {
          bgClass: 'from-slate-500/20 to-gray-500/20',
          borderClass: 'border-slate-400/30',
          textClass: 'text-slate-300',
          glowClass: '',
          icon: 'Info'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <article className="group animate-slide-up">
      {/* Premium Glassmorphism Card */}
      <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] transition-all duration-500 hover:bg-white/[0.06] hover:border-white/[0.15] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(0,240,255,0.1)]">
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#00f0ff]/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        {/* Image Section */}
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-black/20">
          <Image
            src={observation.imageUrl}
            alt={observation.imageAlt}
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105"
          />
          
          {/* Image Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          
          {/* Status Badge Overlay */}
          <div className="absolute top-4 left-4">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl bg-gradient-to-r ${config.bgClass} border ${config.borderClass} ${config.glowClass}`}>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-40" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
              </span>
              <span className={`text-xs font-bold ${config.textClass} uppercase tracking-wide`}>
                {observation.behaviorStatus}
              </span>
            </div>
          </div>

          {/* Temperature Badge */}
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl bg-white/[0.08] border border-white/[0.12]">
              <Icon name="Thermometer" size={14} className="text-[#00f0ff]" />
              <span className="text-xs font-bold text-white">{observation.temperature}°C</span>
            </div>
          </div>

          {/* Timestamp Badge */}
          <div className="absolute bottom-4 left-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-xl bg-black/40 border border-white/[0.12]">
              <Icon name="Clock" size={14} className="text-white/70" />
              <span className="text-xs font-semibold text-white">
                {format(observation.timestamp, 'HH:mm')}
              </span>
            </div>
          </div>
        </div>
        
        {/* Content Section */}
        <div className="p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-white group-hover:text-[#00f0ff] transition-colors duration-300">
                {observation.horseName}
              </h3>
              <p className="text-sm text-white/50 mt-1">
                {format(observation.timestamp, 'MMMM d, yyyy')}
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="pt-3 border-t border-white/[0.06] group-hover:border-white/[0.12] transition-colors duration-300">
            <p className="text-sm text-white/70 leading-relaxed">
              {observation.notes}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00f0ff]/20 to-[#0099ff]/20 border border-[#00f0ff]/30 flex items-center justify-center">
                <Icon name="User" size={14} className="text-[#00f0ff]" />
              </div>
              <span className="text-xs font-medium text-white/60">
                {observation.uploadedBy}
              </span>
            </div>

            <button className="p-2 rounded-lg backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] transition-all duration-300 group">
              <Icon name="MoreVertical" size={16} className="text-white/50 group-hover:text-white/80 transition-colors" />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

export default ObservationCard;