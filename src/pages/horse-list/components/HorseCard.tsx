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
      <div
        className="relative overflow-hidden rounded-2xl transition-all duration-500 hover:scale-[1.02]"
        style={{
          backgroundColor: '#ffffff',
          border: '1px solid rgba(64,53,44,0.1)',
          boxShadow: '0 2px 12px rgba(64,53,44,0.06)',
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 8px 32px rgba(64,53,44,0.14)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 2px 12px rgba(64,53,44,0.06)')}
      >
        <div className="relative w-full aspect-[4/3] overflow-hidden bg-stone-100">
          <Image
            src={horse.image}
            alt={horse.alt}
            className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
        </div>

        <div className="relative p-6 space-y-4">
          <div className="space-y-2">
            <h3
              className="text-xl font-bold transition-colors duration-300"
              style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}
            >
              {horse.name}
            </h3>
            <p className="text-sm flex items-center gap-2" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(64,53,44,0.4)' }} />
              {horse.ownerName}
            </p>
          </div>

          <div
            className="flex items-center justify-between pt-2"
            style={{ borderTop: '1px solid rgba(64,53,44,0.08)' }}
          >
            <StatusBadge status={horse.status} lastObservation={horse.lastObservation} />
          </div>

          {horse.notes && (
            <div className="pt-3" style={{ borderTop: '1px solid rgba(64,53,44,0.08)' }}>
              <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'rgba(64,53,44,0.45)', fontFamily: 'Montserrat, sans-serif' }}>
                {horse.notes}
              </p>
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300"
              style={{ backgroundColor: 'rgba(64,53,44,0.05)', border: '1px solid rgba(64,53,44,0.1)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#40352C' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-medium" style={{ color: 'rgba(64,53,44,0.7)', fontFamily: 'Montserrat, sans-serif' }}>{horse.temperatureC}°C</span>
            </div>
          </div>
        </div>

        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(64,53,44,0.15)', border: '1px solid rgba(64,53,44,0.3)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: '#40352C' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HorseCard;
