import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import HorseCard from './components/HorseCard';
import HorseCardSkeleton from './components/HorseCardSkeleton';
import EmptyState from './components/EmptyState';
import { Horse } from './types';
import { fetchHorses, getImageUrl } from '../../utils/supabase';

const HorseList: React.FC = () => {
  const navigate = useNavigate();
  const [horses, setHorses] = useState<Horse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let isMounted = true;

    const loadHorses = async () => {
      try {
        const records = await fetchHorses();
        if (!isMounted) return;

        setHorses(records.map((horse) => {
          const details = [
            horse.breed,
            horse.color,
            horse.gender,
            typeof horse.age === 'number' ? `${horse.age} years old` : null,
          ].filter(Boolean).join(' · ');
          const profilePhoto = horse.profile_photo_url?.trim();
          const imageUrl = profilePhoto
            ? (/^https?:\/\//i.test(profilePhoto) ? profilePhoto : getImageUrl(profilePhoto))
            : '';

          return {
            id: horse.id,
            name: horse.name,
            image: imageUrl,
            alt: `${horse.name}${horse.breed ? `, ${horse.breed}` : ''}`,
            lastObservation: new Date(horse.updated_at || horse.created_at),
            status: horse.is_active ? 'normal' : 'inactive',
            ownerId: horse.owner_id || '',
            ownerName: horse.breed || 'Stable Eye',
            notes: details,
          };
        }));
      } catch (error) {
        if (!isMounted) return;
        setLoadError(error instanceof Error ? error.message : 'Unable to load horses');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadHorses();
    return () => {
      isMounted = false;
    };
  }, []);


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
                  <span className="text-sm font-medium" style={{ color: 'rgba(64,53,44,0.7)', fontFamily: 'Montserrat, sans-serif' }}>{horses.filter(h => h.status === 'normal').length} Active</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl" style={{ backgroundColor: 'rgba(64,53,44,0.04)', border: '1px solid rgba(64,53,44,0.1)' }}>
                  <span className="text-sm font-medium" style={{ color: 'rgba(64,53,44,0.6)', fontFamily: 'Montserrat, sans-serif' }}>{horses.length} Total Horses</span>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {[...Array(6)].map((_, index) => (
                  <HorseCardSkeleton key={index} />
                ))}
              </div>
            ) : loadError ? (
              <EmptyState
                message="Unable to load horses"
                description={loadError}
              />
            ) : horses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {horses.map((horse) => (
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
