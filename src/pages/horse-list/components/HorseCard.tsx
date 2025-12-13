import React from 'react';
import Image from '../../../components/AppImage';
import StatusBadge from './StatusBadge';
import { HorseCardProps } from '../types';

const HorseCard: React.FC<HorseCardProps> = ({ horse, onClick }) => {
  return (
    <div
      onClick={() => onClick(horse.id)}
      className="group relative cursor-pointer animate-slide-up"
    >
      <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/[0.02] border border-[#c9a962]/10 transition-all duration-500 hover:scale-[1.02] hover:bg-white/[0.04] hover:border-[#c9a962]/20 hover:shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_40px_rgba(201,169,98,0.1)]">
        
        <div className="absolute inset-0 bg-gradient-to-br from-[#c9a962]/[0.02] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
        
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-black/20">
          <Image
            src={horse.image}
            alt={horse.alt}
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110 group-hover:brightness-110"
          />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
          
          <div className="absolute inset-0 bg-gradient-to-t from-[#c9a962]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
        
        <div className="relative p-6 space-y-4">
          <div className="space-y-2">
            <h3 className="font-serif text-xl font-medium text-[#faf9f6] group-hover:text-[#c9a962] transition-colors duration-300">
              {horse.name}
            </h3>
            <p className="text-sm text-[#a8a8a8] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#c9a962]/60 group-hover:bg-[#c9a962]" />
              {horse.ownerName}
            </p>
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-[#c9a962]/10 group-hover:border-[#c9a962]/20 transition-colors duration-300">
            <StatusBadge status={horse.status} lastObservation={horse.lastObservation} />
          </div>
          
          {horse.notes && (
            <div className="pt-3 border-t border-[#c9a962]/10 group-hover:border-[#c9a962]/20 transition-colors duration-300">
              <p className="text-xs text-[#6b6b6b] group-hover:text-[#a8a8a8] line-clamp-2 leading-relaxed transition-colors duration-300">
                {horse.notes}
              </p>
            </div>
          )}
          
          <div className="flex items-center gap-2 pt-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-xl bg-white/[0.03] border border-[#c9a962]/10 group-hover:border-[#c9a962]/20 transition-all duration-300">
              <svg className="w-3.5 h-3.5 text-[#c9a962]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium text-[#a8a8a8]">{horse.temperatureC}°C</span>
            </div>
          </div>
        </div>

        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <div className="w-8 h-8 rounded-full backdrop-blur-xl bg-[#c9a962]/20 border border-[#c9a962]/40 flex items-center justify-center">
            <svg className="w-4 h-4 text-[#c9a962]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HorseCard;
