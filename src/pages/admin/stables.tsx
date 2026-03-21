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
    <div className="min-h-screen" style={{ backgroundColor: '#F8F6F2' }}>
      <Header />
      
      <main className="pt-24 pb-24 md:pb-12 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-8 animate-slide-up">
            <div className="flex items-center gap-3">
              <Link
                to="/admin"
                className="p-2 rounded-lg transition-colors hover:bg-stone-100"
                style={{ color: 'rgba(64,53,44,0.55)' }}
              >
                <Icon name="ArrowLeft" size={20} />
              </Link>
              <div className="w-1 h-12 rounded-full" style={{ backgroundColor: '#40352C' }} />
              <div>
                <h1 className="text-4xl md:text-5xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
                  All Stables
                </h1>
                <p className="text-base mt-2" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }}>
                  Overview of all registered stables
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="rounded-xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'rgba(64,53,44,0.07)', border: '1px solid rgba(64,53,44,0.12)' }}>
                    <Icon name="Building" size={18} style={{ color: '#40352C' }} />
                  </div>
                  <span className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>Total Stables</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{mockStables.length}</p>
              </div>
              <div className="rounded-xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-green-50 border border-green-100">
                    <Icon name="CheckCircle" size={18} className="text-green-600" />
                  </div>
                  <span className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>Active</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{activeStables}</p>
              </div>
              <div className="rounded-xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-100">
                    <Icon name="Heart" size={18} className="text-blue-500" />
                  </div>
                  <span className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>Total Horses</span>
                </div>
                <p className="text-3xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{totalHorses}</p>
              </div>
              <div className="rounded-xl p-5" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100">
                    <Icon name="DollarSign" size={18} className="text-emerald-600" />
                  </div>
                  <span className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>Monthly Revenue</span>
                </div>
                <p className="text-2xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{formatCurrency(totalRevenue)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockStables.map((stable) => (
                <div
                  key={stable.id}
                  className="rounded-xl p-6 transition-all duration-300 hover:shadow-md"
                  style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{stable.name}</h3>
                      <p className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>{stable.location}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${getStatusColor(stable.status)}`}>
                      {stable.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: 'rgba(64,53,44,0.08)', border: '1px solid rgba(64,53,44,0.15)' }}>
                      <span className="text-sm font-medium" style={{ color: '#40352C' }}>
                        {stable.owner.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#40352C' }}>{stable.owner}</p>
                      <p className="text-xs" style={{ color: 'rgba(64,53,44,0.45)' }}>{stable.ownerEmail}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4" style={{ borderTop: '1px solid rgba(64,53,44,0.08)', borderBottom: '1px solid rgba(64,53,44,0.08)' }}>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'rgba(64,53,44,0.4)' }}>Horses</p>
                      <p className="text-lg font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{stable.horsesCount}</p>
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: 'rgba(64,53,44,0.4)' }}>Devices</p>
                      <p className="text-lg font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{stable.devicesCount}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border capitalize ${getPlanColor(stable.plan)}`}>
                      {stable.plan}
                    </span>
                    <span className="text-lg font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
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
