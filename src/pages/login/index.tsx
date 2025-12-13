import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import LoginHeader from './components/LoginHeader';
import LoginForm from './components/LoginForm';
import TrustSignals from './components/TrustSignals';
import type { LoginFormData, TrustBadge } from './types';

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);

  const trustBadges: TrustBadge[] = [
    {
      id: '1',
      icon: 'Shield',
      label: 'Bank-Grade Security',
      description: 'Military-grade 256-bit encryption',
    },
    {
      id: '2',
      icon: 'Award',
      label: 'Veterinary Excellence',
      description: 'Endorsed by leading equine specialists',
    },
    {
      id: '3',
      icon: 'Crown',
      label: 'Premium Service',
      description: 'White-glove support for discerning owners',
    },
  ];

  const mockCredentials = {
    owner: { email: 'owner@equinewatch.com', password: 'owner123' },
    caretaker: { email: 'caretaker@equinewatch.com', password: 'care123' },
    admin: { email: 'admin@equinewatch.com', password: 'admin123' },
  };

  const handleLogin = async (data: LoginFormData): Promise<void> => {
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    const isValidCredential = Object.values(mockCredentials).some(
      (cred) => cred.email === data.email && cred.password === data.password
    );

    if (!isValidCredential) {
      setIsLoading(false);
      throw new Error(
        'Invalid credentials. Please use one of the following:\n' + 'Owner: owner@equinewatch.com / owner123\n'+ 'Caretaker: caretaker@equinewatch.com / care123\n'+ 'Admin: admin@equinewatch.com / admin123'
      );
    }

    setIsLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Welcome - Stable Eye</title>
        <meta
          name="description"
          content="Stable Eye - Premium equine health monitoring for discerning owners"
        />
      </Helmet>

      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-96 h-96 bg-[#c9a962]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-[#c9a962]/3 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#c9a962]/2 rounded-full blur-3xl" />
        </div>

        <div className="w-full max-w-md relative z-10 animate-slide-up">
          <div className="glass-card p-10 md:p-12 luxury-border">
            <LoginHeader />
            <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
            <TrustSignals badges={trustBadges} />
          </div>

          <p className="text-center text-sm text-[#6b6b6b] mt-8 tracking-wide">
            &copy; {new Date().getFullYear()} Stable Eye. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
};

export default Login;
