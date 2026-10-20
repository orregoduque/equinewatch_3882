import React from 'react';
import { Link } from 'react-router-dom';
import { HorseCardProps } from '../types';

const HorseCard: React.FC<HorseCardProps> = ({ horse }) => {
  return (
    <article
      className="min-w-0 rounded-2xl bg-white p-6 animate-slide-up"
      style={{
        border: '1px solid rgba(64,53,44,0.1)',
        boxShadow: '0 2px 12px rgba(64,53,44,0.06)',
      }}
    >
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
    </article>
  );
};

export default HorseCard;
