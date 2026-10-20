import React from 'react';
import { Link } from 'react-router-dom';
import HorseProfilePhoto from '../../../components/HorseProfilePhoto';
import { HorseCardProps } from '../types';

const HorseCard: React.FC<HorseCardProps> = ({ horse }) => {
  return (
    <article
      className="group min-w-0 overflow-hidden rounded-2xl bg-white animate-slide-up"
      style={{
        border: '1px solid rgba(64,53,44,0.1)',
        boxShadow: '0 2px 12px rgba(64,53,44,0.06)',
      }}
    >
      <div className="relative w-full aspect-[4/3] overflow-hidden bg-stone-100">
        <HorseProfilePhoto
          horseId={horse.id}
          profilePhotoUrl={horse.profile_photo_url}
          alt={horse.name}
          className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
      </div>
      <div className="p-6">
      <h3
        className="break-words text-xl font-bold"
        style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}
      >
        {horse.name}
      </h3>
      <Link
        to={`/horses/${encodeURIComponent(horse.id)}`}
        className="mt-3 inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-[#756044] transition-colors hover:bg-[#F4F0E9] focus:outline-none focus:ring-2 focus:ring-[#8C7350] focus:ring-offset-2"
        aria-label={`Ver ficha de ${horse.name}`}
      >
        Ver ficha
      </Link>
      </div>
    </article>
  );
};

export default HorseCard;
