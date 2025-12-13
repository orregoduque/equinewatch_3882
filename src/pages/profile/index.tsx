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
    // Clear any stored authentication data
    localStorage.clear();
    sessionStorage.clear();
    
    // Navigate to login page
    navigate('/login');
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