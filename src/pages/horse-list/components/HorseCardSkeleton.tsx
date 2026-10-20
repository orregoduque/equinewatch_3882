import React from 'react';

const HorseCardSkeleton: React.FC = () => {
  return (
    <div aria-hidden="true" className="overflow-hidden rounded-2xl border border-stone-200 bg-white animate-pulse">
      <div className="aspect-[4/3] w-full bg-stone-100" />
      <div className="p-6">
      <div className="h-7 w-3/4 rounded bg-stone-100" />
      <div className="mt-3 flex h-10 items-center px-3">
        <div className="h-4 w-20 rounded bg-stone-100" />
      </div>
      </div>
    </div>
  );
};

export default HorseCardSkeleton;