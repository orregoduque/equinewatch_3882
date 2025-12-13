import React from 'react';

const LoginHeader: React.FC = () => {
  return (
    <div className="text-center mb-10">
      <div className="flex justify-center mb-8">
        <div className="relative">
          <div className="absolute inset-0 bg-[#c9a962]/20 rounded-full blur-2xl scale-150" />
          <img 
            src="/assets/images/HQ_logo-1765539668496.png" 
            alt="Stable Eye" 
            className="h-24 w-auto relative z-10 drop-shadow-2xl"
          />
        </div>
      </div>

      <h1 className="font-serif text-4xl md:text-5xl font-light text-[#faf9f6] mb-4 tracking-wide">
        Welcome to{' '}
        <span className="gradient-text font-medium">Stable Eye</span>
      </h1>
      
      <div className="divider-luxury w-24 mx-auto my-6" />
      
      <p className="text-lg text-[#a8a8a8] font-light tracking-wide leading-relaxed max-w-sm mx-auto">
        Premium equine health monitoring for the discerning owner
      </p>
    </div>
  );
};

export default LoginHeader;
