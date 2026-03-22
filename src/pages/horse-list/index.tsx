import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import HorseCard from './components/HorseCard';
import HorseCardSkeleton from './components/HorseCardSkeleton';
import EmptyState from './components/EmptyState';
import { Horse, User } from './types';

const HorseList: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const currentUser: User = {
    id: 'user-1',
    role: 'caretaker',
    name: 'Sarah Johnson'
  };

  const mockHorses: Horse[] = [
  {
    id: 'horse-1',
    name: 'Thunder',
    image: "https://zmxppbpywizdjlhstfkf.supabase.co/storage/v1/object/public/images/image_111_enhanced.jpg",
    alt: 'Majestic brown thoroughbred horse with white blaze standing in green pasture',
    lastObservation: new Date(Date.now() - 1800000),
    status: 'normal',
    ownerId: 'owner-1',
    ownerName: 'Michael Anderson',
    temperatureC: 37.8,
    notes: 'Active and alert during morning rounds. Eating well and showing good energy levels.'
  }];


  const handleHorseClick = (horseId: string) => {
    navigate('/horse-timeline', { state: { horseId } });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F6F2' }}>
      <Header />
      
      <main className="pt-24 pb-24 md:pb-12 px-6 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col gap-8 animate-slide-up">
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-1 h-12 rounded-full" style={{ backgroundColor: '#40352C' }} />
                <div>
                  <h1 className="font-serif text-2xl md:text-3xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
                    Horse Monitoring
                  </h1>
                  <p className="text-base mt-2" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }}>
                    Real-time health tracking and behavioral insights
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.06)', border: '1px solid rgba(64,53,44,0.12)' }}>
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium" style={{ color: 'rgba(64,53,44,0.7)', fontFamily: 'Montserrat, sans-serif' }}>{mockHorses.filter(h => h.status === 'normal').length} Active</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.04)', border: '1px solid rgba(64,53,44,0.1)' }}>
                  <span className="text-sm font-medium" style={{ color: 'rgba(64,53,44,0.6)', fontFamily: 'Montserrat, sans-serif' }}>{mockHorses.length} Total Horses</span>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, index) => (
                  <HorseCardSkeleton key={index} />
                ))}
              </div>
            ) : mockHorses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {mockHorses.map((horse) => (
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
                description="No horses are currently registered in the system"
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
