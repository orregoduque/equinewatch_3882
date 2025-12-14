import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import Button from '../../components/ui/Button';
import ProfileHeader from './components/ProfileHeader';
import StatCard from './components/StatCard';
import { UserProfile, ProfileStats } from './types';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);

  useEffect(() => {
    const loadProfileData = async () => {
      setIsLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockProfile: UserProfile = {
        id: '1',
        name: 'Sarah Anderson',
        email: 'sarah.anderson@equinewatch.com',
        memberSince: new Date('2023-03-15'),
        horsesOwned: 12,
      };

      const mockStats: ProfileStats = {
        totalObservations: 1547,
        activeHorses: 11,
        averageTemperature: 37.8,
        lastObservation: new Date('2025-12-12T13:45:00'),
      };

      setProfile(mockProfile);
      setStats(mockStats);
      setIsLoading(false);
    };

    loadProfileData();
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/#team';
  };

  const formatLastObservation = (date: Date): string => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  };

  if (isLoading) {
    return (
      <>
        <Helmet>
          <title>Profile - EquineWatch</title>
        </Helmet>
        <div className="min-h-screen bg-background">
          <Header />
          <main className="pt-16 pb-20 md:pb-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="animate-pulse space-y-6">
                <div className="h-48 bg-white/[0.03] rounded-xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-32 bg-white/[0.03] rounded-xl" />
                  ))}
                </div>
              </div>
            </div>
          </main>
          <MobileNavigation />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Profile - EquineWatch</title>
        <meta 
          name="description" 
          content="View and manage your EquineWatch profile and account settings" 
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        
        <main className="pt-16 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-8">
              {/* Profile Header */}
              {profile && <ProfileHeader profile={profile} />}

              {/* Statistics Grid */}
              {stats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    icon="Camera"
                    label="Total Observations"
                    value={stats.totalObservations.toLocaleString()}
                    description="All time photos captured"
                  />
                  <StatCard
                    icon="Activity"
                    label="Active Horses"
                    value={stats.activeHorses}
                    description="Currently monitored"
                  />
                  <StatCard
                    icon="Thermometer"
                    label="Avg Temperature"
                    value={`${stats.averageTemperature}°C`}
                    description="Across all horses"
                  />
                  <StatCard
                    icon="Clock"
                    label="Last Observation"
                    value={formatLastObservation(stats.lastObservation)}
                    description="Most recent activity"
                  />
                </div>
              )}

              {/* Account Actions */}
              <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-4">
                  Account Settings
                </h2>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    variant="outline"
                    iconName="Settings"
                    className="flex-1"
                  >
                    Edit Profile
                  </Button>
                  <Button
                    variant="outline"
                    iconName="Bell"
                    className="flex-1"
                  >
                    Notifications
                  </Button>
                  <Button
                    variant="outline"
                    iconName="Shield"
                    className="flex-1"
                  >
                    Privacy
                  </Button>
                </div>
              </div>

              {/* Talk to Us Section */}
              <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
                <h2 className="text-xl font-semibold text-text-primary mb-2">
                  Talk to Us
                </h2>
                <p className="text-sm text-secondary mb-4">
                  Have questions or need support? Reach out to us directly.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <a
                    href="https://wa.me/573001234567"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] font-semibold hover:bg-[#25D366]/20 transition-all duration-300"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    WhatsApp
                  </a>
                  <a
                    href="sms:+573001234567"
                    className="flex-1 flex items-center justify-center gap-3 px-6 py-4 rounded-xl bg-[#007AFF]/10 border border-[#007AFF]/30 text-[#007AFF] font-semibold hover:bg-[#007AFF]/20 transition-all duration-300"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
                      <path d="M7 9h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>
                    </svg>
                    iMessage
                  </a>
                </div>
              </div>

              {/* Logout Section */}
              <div className="backdrop-blur-xl bg-white/[0.03] border border-white/[0.08] rounded-xl p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary mb-1">
                      Sign Out
                    </h3>
                    <p className="text-sm text-secondary">
                      You will be logged out of your EquineWatch account
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    iconName="LogOut"
                    onClick={handleLogout}
                    className="w-full sm:w-auto"
                  >
                    Log Out
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>

        <MobileNavigation />
      </div>
    </>
  );
};

export default Profile;