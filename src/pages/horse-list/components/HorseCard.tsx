import React from 'react';
import Image from '../../../components/AppImage';
import StatusBadge from './StatusBadge';
import { HorseCardProps } from '../types';
import { useTheme } from '../../../contexts/ThemeContext';

const HorseCard: React.FC<HorseCardProps> = ({ horse, onClick }) => {
  const { theme } = useTheme();
  
  return (
    <div
      onClick={() => onClick(horse.id)}
      className="group relative cursor-pointer animate-slide-up"
    >
      {/* Premium Glassmorphism Card */}
      <div className={`relative overflow-hidden rounded-2xl backdrop-blur-xl border transition-all duration-500 hover:scale-[1.02] ${
        theme === 'dark' ?'bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06] hover:border-white/[0.15] hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(0,240,255,0.15)]' :'bg-black/[0.02] border-black/[0.1] hover:bg-black/[0.04] hover:border-black/[0.15] hover:shadow-[0_10px_40px_rgba(0,0,0,0.15),0_0_20px_rgba(0,180,212,0.1)]'
      }`}>
        
        {/* Gradient Overlay for Premium Effect */}
        <div className={`absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${
          theme === 'dark' ? 'from-[#00f0ff]/[0.03]' : 'from-[#00b8d4]/[0.02]'
        }`} />
        
        {/* Image Container with Enhanced Effects */}
        <div className={`relative w-full aspect-[4/3] overflow-hidden ${theme === 'dark' ? 'bg-black/20' : 'bg-gray-200'}`}>
          <Image
            src={horse.image}
            alt={horse.alt}
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
          />
          
          {/* Premium Gradient Overlay */}
          <div className={`absolute inset-0 bg-gradient-to-t to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500 ${
            theme === 'dark' ? 'from-black/60 via-black/20' : 'from-black/40 via-black/10'
          }`} />
          
          {/* Accent Glow on Hover */}
          <div className={`absolute inset-0 bg-gradient-to-t to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${
            theme === 'dark' ? 'from-[#00f0ff]/20' : 'from-[#00b8d4]/15'
          }`} />
        </div>
        
        {/* Content with Enhanced Spacing */}
        <div className="relative p-6 space-y-4">
          {/* Header Section */}
          <div className="space-y-2">
            <h3 className={`text-xl font-bold bg-gradient-to-r bg-clip-text text-transparent transition-all duration-500 ${
              theme === 'dark' ?'from-white to-white/80 group-hover:from-[#00f0ff] group-hover:to-white' :'from-gray-900 to-gray-700 group-hover:from-[#00b8d4] group-hover:to-gray-900'
            }`}>
              {horse.name}
            </h3>
            <p className={`text-sm transition-colors duration-300 flex items-center gap-2 ${
              theme === 'dark' ? 'text-white/60 group-hover:text-white/80' : 'text-gray-600 group-hover:text-gray-800'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full transition-colors ${
                theme === 'dark' ? 'bg-[#00f0ff]/60 group-hover:bg-[#00f0ff]' : 'bg-[#00b8d4] group-hover:bg-[#00b8d4]'
              }`} />
              {horse.ownerName}
            </p>
          </div>
          
          {/* Status Badge with Enhanced Styling */}
          <div className={`flex items-center justify-between pt-2 border-t transition-colors duration-300 ${
            theme === 'dark' ? 'border-white/[0.06] group-hover:border-white/[0.12]' : 'border-black/[0.08] group-hover:border-black/[0.15]'
          }`}>
            <StatusBadge status={horse.status} lastObservation={horse.lastObservation} />
          </div>
          
          {/* Notes Section with Premium Styling */}
          {horse.notes && (
            <div className={`pt-3 border-t transition-colors duration-300 ${
              theme === 'dark' ? 'border-white/[0.06] group-hover:border-white/[0.12]' : 'border-black/[0.08] group-hover:border-black/[0.15]'
            }`}>
              <p className={`text-xs line-clamp-2 leading-relaxed transition-colors duration-300 ${
                theme === 'dark' ? 'text-white/50 group-hover:text-white/70' : 'text-gray-600 group-hover:text-gray-800'
              }`}>
                {horse.notes}
              </p>
            </div>
          )}
          
          {/* Temperature Indicator */}
          <div className="flex items-center gap-2 pt-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl border transition-all duration-300 ${
              theme === 'dark' ?'bg-white/[0.05] border-white/[0.08] group-hover:bg-white/[0.08] group-hover:border-white/[0.12]' :'bg-black/[0.03] border-black/[0.1] group-hover:bg-black/[0.05] group-hover:border-black/[0.15]'
            }`}>
              <svg className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-[#00f0ff]' : 'text-[#00b8d4]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className={`text-xs font-medium ${theme === 'dark' ? 'text-white/70' : 'text-gray-700'}`}>{horse.temperatureC}°C</span>
            </div>
          </div>
        </div>

        {/* Hover Arrow Indicator */}
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <div className={`w-8 h-8 rounded-full backdrop-blur-xl border flex items-center justify-center ${
            theme === 'dark' ? 'bg-[#00f0ff]/20 border-[#00f0ff]/40' : 'bg-[#00b8d4]/15 border-[#00b8d4]/50'
          }`}>
            <svg className={`w-4 h-4 ${theme === 'dark' ? 'text-[#00f0ff]' : 'text-[#00b8d4]'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HorseCard;