import React from 'react';

const HorseCardSkeleton: React.FC = () => {
  return (
    <div aria-hidden="true" className="rounded-2xl border border-stone-200 bg-white p-6 animate-pulse">
      <div className="h-7 w-3/4 rounded bg-stone-100" />
      <div className="mt-3 flex h-10 items-center px-3">
        <div className="h-4 w-20 rounded bg-stone-100" />
      </div>
    </div>
  );
};

export default HorseCardSkeleton;