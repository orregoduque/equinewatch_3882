import React from 'react';

const LoginHeader: React.FC = () => {
  return (
    <div className="text-center mb-10">
      <div className="flex justify-center mb-8">
        <img 
          src="/logo-dark.png" 
          alt="Stable Eye" 
          className="h-14 w-auto"
        />
      </div>

      <h1 className="text-4xl md:text-5xl font-bold mb-2 tracking-wide" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
        Welcome to{' '}
        <span style={{ color: '#40352C' }}>Stable Eye</span>
      </h1>
      
      <div className="w-16 mx-auto my-5" style={{ height: '2px', backgroundColor: 'rgba(64,53,44,0.15)' }} />
      
      <p className="text-base font-medium leading-relaxed max-w-sm mx-auto" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }}>
        Premium equine health monitoring for the discerning owner
      </p>
    </div>
  );
};

export default LoginHeader;
