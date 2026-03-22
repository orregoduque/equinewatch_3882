import React from 'react';

const LoginHeader: React.FC = () => {
  return (
    <div className="text-center mb-7">
      <div className="flex justify-center mb-5">
        <img 
          src="/logo-dark.png" 
          alt="Stable Eye" 
          className="h-9 w-auto"
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
