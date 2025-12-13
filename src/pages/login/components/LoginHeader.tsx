import React from 'react';

const LoginHeader: React.FC = () => {
  return (
    <div className="text-center mb-8">
      <div className="flex justify-center mb-6">
        <img 
          src="/assets/images/HQ_logo-1765539668496.png" 
          alt="Stable Eye - Professional horse head logo with camera aperture symbol representing equine monitoring and photography excellence" 
          className="h-20 w-auto transition-smooth hover:opacity-80"
        />
      </div>

      <h1 className="text-3xl md:text-4xl font-semibold text-text-primary mb-3">
        Welcome to Stable Eye
      </h1>
      <p className="text-base text-secondary max-w-md mx-auto">
        Premium equine health monitoring through continuous photographic observation
      </p>
    </div>
  );
};

export default LoginHeader;