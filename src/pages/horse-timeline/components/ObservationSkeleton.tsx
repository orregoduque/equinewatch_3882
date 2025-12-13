import React from 'react';

const ObservationSkeleton: React.FC = () => {
  return (
    <div className="bg-card rounded-lg overflow-hidden shadow-card animate-pulse">
      <div className="w-full h-96 bg-muted" />
      
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-muted rounded w-32" />
            <div className="h-4 bg-muted rounded w-48" />
          </div>
          <div className="h-10 w-24 bg-muted rounded-lg" />
        </div>

        <div className="pt-4 border-t border-border">
          <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-3/4" />
          </div>
        </div>

        <div className="h-3 bg-muted rounded w-32" />
      </div>
    </div>
  );
};

export default ObservationSkeleton;