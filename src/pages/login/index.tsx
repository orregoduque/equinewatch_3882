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
      label: 'SSL Secured',
      description: 'Bank-grade encryption for your data',
    },
    {
      id: '2',
      icon: 'Award',
      label: 'Veterinary Endorsed',
      description: 'Trusted by equine professionals',
    },
    {
      id: '3',
      icon: 'Lock',
      label: 'HIPAA Compliant',
      description: 'Medical-grade privacy standards',
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
        <title>Sign In - EquineWatch</title>
        <meta
          name="description"
          content="Sign in to EquineWatch - Premium equine health monitoring platform"
        />
      </Helmet>

      <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-card p-8 md:p-10 border border-border">
            <LoginHeader />
            <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
            <TrustSignals badges={trustBadges} />
          </div>

          <p className="text-center text-sm text-secondary mt-6">
            &copy; {new Date().getFullYear()} EquineWatch. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
};

export default Login;