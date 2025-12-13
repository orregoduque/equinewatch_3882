import React from 'react';

const HorseCardSkeleton: React.FC = () => {
  return (
    <div className="animate-slide-up">
      <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl bg-white/[0.03] border border-white/[0.08]">
        {/* Animated Shimmer Effect */}
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/[0.05] to-transparent" />
        
        {/* Image Skeleton */}
        <div className="w-full aspect-[4/3] bg-white/[0.03]">
          <div className="w-full h-full bg-gradient-to-br from-white/[0.05] to-transparent animate-pulse" />
        </div>
        
        {/* Content Skeleton */}
        <div className="p-6 space-y-4">
          {/* Title Skeleton */}
          <div className="space-y-2">
            <div className="h-5 bg-white/[0.05] rounded-lg w-3/4 animate-pulse" />
            <div className="h-4 bg-white/[0.03] rounded-lg w-1/2 animate-pulse" />
          </div>
          
          {/* Status Badge Skeleton */}
          <div className="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
            <div className="h-7 bg-white/[0.05] rounded-full w-32 animate-pulse" />
            <div className="h-7 bg-white/[0.05] rounded-full w-20 animate-pulse" />
          </div>
          
          {/* Notes Skeleton */}
          <div className="pt-3 border-t border-white/[0.06] space-y-2">
            <div className="h-3 bg-white/[0.03] rounded w-full animate-pulse" />
            <div className="h-3 bg-white/[0.03] rounded w-4/5 animate-pulse" />
          </div>
          
          {/* Temperature Skeleton */}
          <div className="pt-2">
            <div className="h-7 bg-white/[0.05] rounded-full w-24 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default HorseCardSkeleton;