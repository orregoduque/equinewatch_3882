import React from 'react';

const LoadingSkeleton: React.FC = () => {
  const shimmer = { backgroundColor: 'rgba(64,53,44,0.06)' };
  const card = { backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.08)', borderRadius: '12px' };

  return (
    <div className="space-y-6 animate-pulse">
      <div className="p-4 h-24" style={card}>
        <div className="h-4 rounded w-1/3 mb-2" style={shimmer} />
        <div className="h-3 rounded w-1/4" style={shimmer} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="p-6 h-48" style={card}>
            <div className="w-12 h-12 rounded-xl mb-4" style={shimmer} />
            <div className="h-3 rounded w-2/3 mb-2" style={shimmer} />
            <div className="h-8 rounded w-1/2" style={shimmer} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 h-96" style={card}>
          <div className="h-5 rounded w-1/3 mb-4" style={shimmer} />
          <div className="h-64 rounded" style={shimmer} />
        </div>
        <div className="p-6 h-96" style={card}>
          <div className="h-5 rounded w-1/3 mb-4" style={shimmer} />
          <div className="h-64 rounded" style={shimmer} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 h-80" style={card}>
          <div className="h-5 rounded w-1/3 mb-4" style={shimmer} />
          <div className="h-48 rounded" style={shimmer} />
        </div>
        <div className="p-6 h-80" style={card}>
          <div className="h-5 rounded w-1/3 mb-4" style={shimmer} />
          <div className="h-48 rounded" style={shimmer} />
        </div>
      </div>
    </div>
  );
};

export default LoadingSkeleton;
