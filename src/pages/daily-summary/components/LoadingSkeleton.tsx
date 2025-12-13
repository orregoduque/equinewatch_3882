import React from 'react';

const LoadingSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="glass-card p-4 luxury-border h-24">
        <div className="h-4 bg-white/5 rounded w-1/3 mb-2" />
        <div className="h-3 bg-white/5 rounded w-1/4" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="glass-card p-6 luxury-border h-48">
            <div className="w-12 h-12 rounded-xl bg-white/5 mb-4" />
            <div className="h-3 bg-white/5 rounded w-2/3 mb-2" />
            <div className="h-8 bg-white/5 rounded w-1/2" />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 luxury-border h-96">
          <div className="h-5 bg-white/5 rounded w-1/3 mb-4" />
          <div className="h-64 bg-white/5 rounded" />
        </div>
        <div className="glass-card p-6 luxury-border h-96">
          <div className="h-5 bg-white/5 rounded w-1/3 mb-4" />
          <div className="h-64 bg-white/5 rounded" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 luxury-border h-80">
          <div className="h-5 bg-white/5 rounded w-1/3 mb-4" />
          <div className="h-48 bg-white/5 rounded" />
        </div>
        <div className="glass-card p-6 luxury-border h-80">
          <div className="h-5 bg-white/5 rounded w-1/3 mb-4" />
          <div className="h-48 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;