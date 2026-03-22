import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import LoginHeader from './components/LoginHeader';
import LoginForm from './components/LoginForm';
import TrustSignals from './components/TrustSignals';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import type { LoginFormData, TrustBadge } from './types';

const Login: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

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

  const handleLogin = async (data: LoginFormData): Promise<void> => {
    setIsLoading(true);

    const result = await login(data.email, data.password);

    if (!result.success) {
      setIsLoading(false);
      throw new Error(result.error);
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

      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden" style={{ backgroundColor: '#F8F6F2' }}>
        <Link
          to="/#team"
          className="absolute top-6 left-6 flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-300 z-20"
          style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.15)', color: '#40352C' }}
        >
          <Icon name="ArrowLeft" size={18} />
          <span className="text-sm font-medium" style={{ fontFamily: 'Montserrat, sans-serif' }}>Back</span>
        </Link>

        <div className="w-full max-w-md relative z-10 animate-slide-up">
          <div className="rounded-2xl p-10 md:p-12" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 4px 24px rgba(64,53,44,0.08)' }}>
            <LoginHeader />
            <LoginForm onSubmit={handleLogin} isLoading={isLoading} />
            <TrustSignals badges={trustBadges} />
          </div>

          <p className="text-center text-sm mt-8 tracking-wide" style={{ color: 'rgba(64,53,44,0.45)', fontFamily: 'Montserrat, sans-serif' }}>
            &copy; {new Date().getFullYear()} Stable Eye. All rights reserved.
          </p>
        </div>
      </div>
    </>
  );
};

export default Login;
