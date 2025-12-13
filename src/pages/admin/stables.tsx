import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import Icon from '../../components/AppIcon';

interface Stable {
  id: string;
  name: string;
  owner: string;
  ownerEmail: string;
  location: string;
  horsesCount: number;
  devicesCount: number;
  status: 'active' | 'inactive' | 'trial';
  plan: 'basic' | 'premium' | 'enterprise';
  monthlyRevenue: number;
  createdAt: Date;
}

const AdminStables: React.FC = () => {
  const mockStables: Stable[] = [
    {
      id: 'stable-1',
      name: 'Sterling Stables',
      owner: 'Alexandra Sterling',
      ownerEmail: 'owner@equinewatch.com',
      location: 'Wellington, FL',
      horsesCount: 12,
      devicesCount: 12,
      status: 'active',
      plan: 'enterprise',
      monthlyRevenue: 4999,
      createdAt: new Date('2023-06-15'),
    },
    {
      id: 'stable-2',
      name: 'Ashford Equestrian',
      owner: 'Victoria Ashford',
      ownerEmail: 'stable@equinewatch.com',
      location: 'Lexington, KY',
      horsesCount: 8,
      devicesCount: 8,
      status: 'active',
      plan: 'premium',
      monthlyRevenue: 2499,
      createdAt: new Date('2024-01-20'),
    },
    {
      id: 'stable-3',
      name: 'Martinez Ranch',
      owner: 'Robert Martinez',
      ownerEmail: 'robert.m@stable.com',
      location: 'Scottsdale, AZ',
      horsesCount: 6,
      devicesCount: 6,
      status: 'trial',
      plan: 'premium',
      monthlyRevenue: 0,
      createdAt: new Date('2024-11-28'),
    },
    {
      id: 'stable-4',
      name: 'Thompson Stables',
      owner: 'Emily Thompson',
      ownerEmail: 'emily.t@equine.org',
      location: 'Ocala, FL',
      horsesCount: 4,
      devicesCount: 4,
      status: 'inactive',
      plan: 'basic',
      monthlyRevenue: 0,
      createdAt: new Date('2024-08-10'),
    },
    {
      id: 'stable-5',
      name: 'Royal Oak Equestrian',
      owner: 'William Pemberton',
      ownerEmail: 'w.pemberton@royaloak.com',
      location: 'Greenwich, CT',
      horsesCount: 18,
      devicesCount: 20,
      status: 'active',
      plan: 'enterprise',
      monthlyRevenue: 7499,
      createdAt: new Date('2023-03-01'),
    },
    {
      id: 'stable-6',
      name: 'Sunrise Stables',
      owner: 'Sarah Chen',
      ownerEmail: 's.chen@sunrise.com',
      location: 'San Diego, CA',
      horsesCount: 10,
      devicesCount: 10,
      status: 'active',
      plan: 'premium',
      monthlyRevenue: 2499,
      createdAt: new Date('2024-04-15'),
    },
  ];

  const getStatusColor = (status: Stable['status']) => {
    switch (status) {
      case 'active':
        return 'bg-[#4a9d6b]/20 text-[#4a9d6b] border-[#4a9d6b]/30';
      case 'inactive':
        return 'bg-[#c75050]/20 text-[#c75050] border-[#c75050]/30';
      case 'trial':
        return 'bg-[#c9a962]/20 text-[#c9a962] border-[#c9a962]/30';
    }
  };

  const getPlanColor = (plan: Stable['plan']) => {
    switch (plan) {
      case 'enterprise':
        return 'bg-[#8b5cf6]/20 text-[#8b5cf6] border-[#8b5cf6]/30';
      case 'premium':
        return 'bg-[#c9a962]/20 text-[#c9a962] border-[#c9a962]/30';
      case 'basic':
        return 'bg-[#6b7280]/20 text-[#6b7280] border-[#6b7280]/30';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const totalRevenue = mockStables.reduce((sum, s) => sum + s.monthlyRevenue, 0);
  const totalHorses = mockStables.reduce((sum, s) => sum + s.horsesCount, 0);
  const activeStables = mockStables.filter(s => s.status === 'active').length;

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#0f0f18]" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#c9a962]/5 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#c9a962]/3 rounded-full blur-[150px]" />
      </div>

      <Header />
      
      <main className="pt-24 pb-24 md:pb-12 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-8 animate-slide-up">
            <div className="flex items-center gap-3">
              <Link
                to="/admin"
                className="p-2 rounded-lg hover:bg-white/[0.05] text-[#a8a8a8] hover:text-[#c9a962] transition-colors"
              >
                <Icon name="ArrowLeft" size={20} />
              </Link>
              <div className="w-1 h-12 rounded-full bg-gradient-to-b from-[#c9a962] to-[#a88a45]" />
              <div>
                <h1 className="font-serif text-4xl md:text-5xl font-light text-[#faf9f6]">
                  All <span className="gradient-text font-medium">Stables</span>
                </h1>
                <p className="text-base mt-2 font-light text-[#a8a8a8] tracking-wide">
                  Overview of all registered stables
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-5 luxury-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#c9a962]/10 border border-[#c9a962]/20">
                    <Icon name="Building" size={18} className="text-[#c9a962]" />
                  </div>
                  <span className="text-sm text-[#a8a8a8]">Total Stables</span>
                </div>
                <p className="text-3xl font-semibold text-[#faf9f6]">{mockStables.length}</p>
              </div>
              <div className="glass-card p-5 luxury-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#4a9d6b]/10 border border-[#4a9d6b]/20">
                    <Icon name="CheckCircle" size={18} className="text-[#4a9d6b]" />
                  </div>
                  <span className="text-sm text-[#a8a8a8]">Active</span>
                </div>
                <p className="text-3xl font-semibold text-[#faf9f6]">{activeStables}</p>
              </div>
              <div className="glass-card p-5 luxury-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#3b82f6]/10 border border-[#3b82f6]/20">
                    <Icon name="Heart" size={18} className="text-[#3b82f6]" />
                  </div>
                  <span className="text-sm text-[#a8a8a8]">Total Horses</span>
                </div>
                <p className="text-3xl font-semibold text-[#faf9f6]">{totalHorses}</p>
              </div>
              <div className="glass-card p-5 luxury-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20">
                    <Icon name="DollarSign" size={18} className="text-[#10b981]" />
                  </div>
                  <span className="text-sm text-[#a8a8a8]">Monthly Revenue</span>
                </div>
                <p className="text-2xl font-semibold text-[#faf9f6]">{formatCurrency(totalRevenue)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockStables.map((stable) => (
                <div
                  key={stable.id}
                  className="glass-card p-6 luxury-border hover:border-[#c9a962]/30 transition-all duration-300"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-medium text-[#faf9f6]">{stable.name}</h3>
                      <p className="text-sm text-[#a8a8a8]">{stable.location}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(stable.status)}`}>
                      {stable.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-[#c9a962]/10 border border-[#c9a962]/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-[#c9a962]">
                        {stable.owner.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#faf9f6]">{stable.owner}</p>
                      <p className="text-xs text-[#6b6b6b]">{stable.ownerEmail}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-[#c9a962]/10">
                    <div>
                      <p className="text-xs text-[#6b6b6b] mb-1">Horses</p>
                      <p className="text-lg font-medium text-[#faf9f6]">{stable.horsesCount}</p>
                    </div>
                    <div>
                      <p className="text-xs text-[#6b6b6b] mb-1">Devices</p>
                      <p className="text-lg font-medium text-[#faf9f6]">{stable.devicesCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${getPlanColor(stable.plan)}`}>
                      {stable.plan}
                    </span>
                    <span className="text-lg font-semibold text-[#c9a962]">
                      {stable.monthlyRevenue > 0 ? formatCurrency(stable.monthlyRevenue) : 'Trial'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <MobileNavigation />
    </div>
  );
};

export default AdminStables;
