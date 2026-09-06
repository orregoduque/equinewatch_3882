import React from 'react';

const LoginHeader: React.FC = () => {
  return (
    <div className="text-center mb-7">
      <div className="flex justify-center mb-5">
        <div
          role="img"
          aria-label="Stable Eye"
          className="h-14 w-64 bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/logo-dark.png)', backgroundSize: '430px 430px' }}
        />
      </div>

      <h1 className="text-xl md:text-2xl font-bold mb-1 tracking-wide" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
        Welcome to{' '}
        <span style={{ color: '#40352C' }}>Stable Eye</span>
      </h1>
      
      <div className="w-12 mx-auto my-3" style={{ height: '1px', backgroundColor: 'rgba(64,53,44,0.15)' }} />
      
      <p className="text-xs font-medium leading-relaxed max-w-xs mx-auto" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }}>
        Premium equine health monitoring for the discerning owner
      </p>
    </div>
  );
};

export default LoginHeader;
