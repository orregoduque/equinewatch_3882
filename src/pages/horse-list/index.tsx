import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import SearchBar from './components/SearchBar';
import HorseCard from './components/HorseCard';
import HorseCardSkeleton from './components/HorseCardSkeleton';
import EmptyState from './components/EmptyState';
import { Horse, User } from './types';
import { useTheme } from '../../contexts/ThemeContext';

const HorseList: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { theme } = useTheme();

  const currentUser: User = {
    id: 'user-1',
    role: 'caretaker',
    name: 'Sarah Johnson'
  };

  const mockHorses: Horse[] = [
  {
    id: 'horse-1',
    name: 'Thunder',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_12f7dfca2-1765393004995.png",
    alt: 'Majestic brown thoroughbred horse with white blaze standing in green pasture',
    lastObservation: new Date(Date.now() - 1800000),
    status: 'normal',
    ownerId: 'owner-1',
    ownerName: 'Michael Anderson',
    temperatureC: 37.8,
    notes: 'Active and alert during morning rounds. Eating well and showing good energy levels.'
  },
  {
    id: 'horse-2',
    name: 'Midnight Star',
    image: "https://images.unsplash.com/photo-1590574746148-05224c8e7930",
    alt: 'Black Arabian horse with flowing mane running freely in open field',
    lastObservation: new Date(Date.now() - 900000),
    status: 'suspicious',
    ownerId: 'owner-2',
    ownerName: 'Jennifer Williams',
    temperatureC: 38.4,
    notes: 'Showing signs of discomfort. Reduced appetite and lying down more frequently than usual.'
  },
  {
    id: 'horse-3',
    name: 'Golden Dawn',
    image: "https://images.unsplash.com/photo-1734703493206-b1ad7583521b",
    alt: 'Palomino horse with golden coat grazing peacefully in morning sunlight',
    lastObservation: new Date(Date.now() - 3600000),
    status: 'normal',
    ownerId: 'owner-1',
    ownerName: 'Michael Anderson',
    temperatureC: 37.5,
    notes: 'Calm and content. Normal behavior patterns observed throughout the day.'
  },
  {
    id: 'horse-4',
    name: 'Storm Chaser',
    image: "https://images.unsplash.com/photo-1717811473202-187a38d15c2a",
    alt: 'Gray dappled horse trotting energetically across sandy arena',
    lastObservation: new Date(Date.now() - 7200000),
    status: 'inactive',
    ownerId: 'owner-3',
    ownerName: 'Robert Martinez',
    temperatureC: 37.6,
    notes: 'No recent observations recorded. Last check showed normal vital signs.'
  },
  {
    id: 'horse-5',
    name: 'Copper Belle',
    image: "https://img.rocket.new/generatedImages/rocket_gen_img_137bef0d8-1765170668258.png",
    alt: 'Chestnut mare with copper-colored coat standing near wooden fence',
    lastObservation: new Date(Date.now() - 2700000),
    status: 'normal',
    ownerId: 'owner-2',
    ownerName: 'Jennifer Williams',
    temperatureC: 37.7,
    notes: 'Excellent condition. Responsive to commands and showing healthy appetite.'
  },
  {
    id: 'horse-6',
    name: 'Silver Shadow',
    image: "https://images.unsplash.com/photo-1667089695292-f429c468fde8",
    alt: 'White horse with silver-gray mane standing majestically against blue sky',
    lastObservation: new Date(Date.now() - 5400000),
    status: 'normal',
    ownerId: 'owner-3',
    ownerName: 'Robert Martinez',
    temperatureC: 37.9,
    notes: 'Stable and healthy. Regular exercise routine maintained without issues.'
  }];


  const filteredHorses = useMemo(() => {
    if (!searchQuery.trim()) return mockHorses;

    const query = searchQuery.toLowerCase();
    return mockHorses.filter((horse) =>
    horse.name.toLowerCase().includes(query) ||
    horse.ownerName.toLowerCase().includes(query) ||
    horse.notes.toLowerCase().includes(query)
    );
  }, [searchQuery, mockHorses]);

  const handleHorseClick = (horseId: string) => {
    navigate('/horse-timeline', { state: { horseId } });
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Theme-aware Premium Animated Background */}
      <div className="fixed inset-0 -z-10">
        {/* Dark theme gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br from-[#000814] via-[#001530] to-[#001a3d] transition-opacity duration-300 ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`} />
        
        {/* Light theme gradient */}
        <div className={`absolute inset-0 bg-gradient-to-br from-white via-[#f8f9fa] to-[#f1f3f5] transition-opacity duration-300 ${theme === 'light' ? 'opacity-100' : 'opacity-0'}`} />
        
        {/* Animated orbs - dark theme */}
        <div className={`absolute top-0 left-1/4 w-96 h-96 bg-[#00f0ff]/10 rounded-full blur-[120px] animate-pulse transition-opacity duration-300 ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 bg-[#0099ff]/10 rounded-full blur-[120px] animate-pulse transition-opacity duration-300 ${theme === 'dark' ? 'opacity-100' : 'opacity-0'}`} style={{ animationDelay: '1s' }} />
        
        {/* Animated orbs - light theme */}
        <div className={`absolute top-0 left-1/4 w-96 h-96 bg-[#00b8d4]/5 rounded-full blur-[120px] animate-pulse transition-opacity duration-300 ${theme === 'light' ? 'opacity-100' : 'opacity-0'}`} />
        <div className={`absolute bottom-0 right-1/4 w-96 h-96 bg-[#0099ff]/5 rounded-full blur-[120px] animate-pulse transition-opacity duration-300 ${theme === 'light' ? 'opacity-100' : 'opacity-0'}`} style={{ animationDelay: '1s' }} />
      </div>

      <Header />
      
      <main className="pt-24 pb-24 md:pb-12 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-8 animate-slide-up">
            {/* Premium Header Section with Theme Support */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-1 h-12 rounded-full bg-gradient-to-b ${theme === 'dark' ? 'from-[#00f0ff] to-[#0099ff]' : 'from-[#00b8d4] to-[#0099ff]'}`} />
                <div>
                  <h1 className={`text-4xl md:text-5xl font-bold bg-gradient-to-r bg-clip-text text-transparent ${theme === 'dark' ? 'from-white via-white to-white/80' : 'from-gray-900 via-gray-800 to-gray-700'}`}>
                    Horse Monitoring
                  </h1>
                  <p className={`text-base mt-2 font-medium ${theme === 'dark' ? 'text-white/60' : 'text-gray-600'}`}>
                    Real-time health tracking and behavioral insights
                  </p>
                </div>
              </div>
              
              {/* Stats Overview with Theme Support */}
              <div className="flex items-center gap-4 mt-2">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-xl border ${theme === 'dark' ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-black/[0.02] border-black/[0.1]'}`}>
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white/70' : 'text-gray-700'}`}>{mockHorses.filter(h => h.status === 'normal').length} Active</span>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-xl border ${theme === 'dark' ? 'bg-white/[0.04] border-white/[0.08]' : 'bg-black/[0.02] border-black/[0.1]'}`}>
                  <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white/70' : 'text-gray-700'}`}>{mockHorses.length} Total Horses</span>
                </div>
              </div>
            </div>

            {/* Search Bar with Enhanced Styling */}
            <div className="max-w-2xl">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by horse name, owner, or notes..."
              />
            </div>

            {/* Results Section */}
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, index) => (
                  <HorseCardSkeleton key={index} />
                ))}
              </div>
            ) : filteredHorses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredHorses.map((horse) => (
                  <HorseCard
                    key={horse.id}
                    horse={horse}
                    onClick={handleHorseClick}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                message="No horses found"
                description={
                  searchQuery
                    ? "Try adjusting your search terms or clear the search to see all horses" :"No horses are currently registered in the system"
                }
              />
            )}
          </div>
        </div>
      </main>

      <MobileNavigation />
    </div>
  );
};

export default HorseList;