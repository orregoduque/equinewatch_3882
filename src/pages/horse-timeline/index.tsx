import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import ObservationCard from './components/ObservationCard';
import DateFilter from './components/DateFilter';
import ObservationSkeleton from './components/ObservationSkeleton';
import EmptyState from './components/EmptyState';
import HorseSelector from './components/HorseSelector';
import { Observation, Horse } from './types';

const HorseTimeline: React.FC = () => {
  const [selectedHorseId, setSelectedHorseId] = useState<string>('horse-1');
  const [observations, setObservations] = useState<Observation[]>([]);
  const [filteredObservations, setFilteredObservations] = useState<Observation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastObservationRef = useRef<HTMLDivElement | null>(null);

  // Mock horses data
  const horses: Horse[] = [
  {
    id: 'horse-1',
    name: 'Thunder',
    breed: 'Thoroughbred',
    age: 5,
    owner: 'John Smith',
    lastObservation: new Date(),
    profileImage: "https://img.rocket.new/generatedImages/rocket_gen_img_12f7dfca2-1765393004995.png",
    profileImageAlt: 'Majestic brown thoroughbred horse standing in green pasture with white fence'
  },
  {
    id: 'horse-2',
    name: 'Midnight',
    breed: 'Arabian',
    age: 7,
    owner: 'Sarah Johnson',
    lastObservation: new Date(Date.now() - 3600000),
    profileImage: "https://img.rocket.new/generatedImages/rocket_gen_img_1594b846c-1764835401410.png",
    profileImageAlt: 'Elegant black Arabian horse with flowing mane in golden sunset light'
  },
  {
    id: 'horse-3',
    name: 'Spirit',
    breed: 'Quarter Horse',
    age: 4,
    owner: 'Michael Brown',
    lastObservation: new Date(Date.now() - 7200000),
    profileImage: "https://img.rocket.new/generatedImages/rocket_gen_img_137bef0d8-1765170668258.png",
    profileImageAlt: 'Strong chestnut quarter horse galloping freely across open meadow'
  }];


  // Mock observations data
  const mockObservations: Observation[] = [
  {
    id: 'obs-1',
    horseId: 'horse-1',
    horseName: 'Thunder',
    imageUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_189a2df76-1765536993983.png",
    imageAlt: 'Thunder standing calmly in stable with bright natural lighting showing healthy posture',
    timestamp: new Date(Date.now() - 1800000),
    temperature: 37.8,
    behaviorStatus: 'normal',
    notes: 'Horse appears calm and alert. Eating normally and responding well to commands. No signs of distress or unusual behavior.',
    uploadedBy: 'Emily Carter'
  },
  {
    id: 'obs-2',
    horseId: 'horse-1',
    horseName: 'Thunder',
    imageUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_130253821-1765536994698.png",
    imageAlt: 'Thunder lying down in straw bedding appearing restless with ears pinned back',
    timestamp: new Date(Date.now() - 5400000),
    temperature: 38.2,
    behaviorStatus: 'suspicious',
    notes: 'Horse showing signs of restlessness. Lying down more frequently than usual. Monitoring closely for colic symptoms. Temperature slightly elevated.',
    uploadedBy: 'David Martinez'
  },
  {
    id: 'obs-3',
    horseId: 'horse-1',
    horseName: 'Thunder',
    imageUrl: "https://images.unsplash.com/photo-1626617158255-152c32b4b957",
    imageAlt: 'Thunder grazing peacefully in pasture with head down eating grass contentedly',
    timestamp: new Date(Date.now() - 10800000),
    temperature: 37.5,
    behaviorStatus: 'normal',
    notes: 'Morning check completed. Horse is grazing normally and showing good appetite. Coat condition excellent.',
    uploadedBy: 'Emily Carter'
  },
  {
    id: 'obs-4',
    horseId: 'horse-1',
    horseName: 'Thunder',
    imageUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_1d2835970-1765536992071.png",
    imageAlt: 'Thunder drinking water from trough with clear eyes and relaxed body language',
    timestamp: new Date(Date.now() - 14400000),
    temperature: 37.6,
    behaviorStatus: 'normal',
    notes: 'Hydration check - drinking water regularly. No signs of dehydration. All vital signs within normal range.',
    uploadedBy: 'David Martinez'
  },
  {
    id: 'obs-5',
    horseId: 'horse-2',
    horseName: 'Midnight',
    imageUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_1ec8e5470-1765536992858.png",
    imageAlt: 'Midnight trotting in arena with high energy and alert expression',
    timestamp: new Date(Date.now() - 7200000),
    temperature: 37.9,
    behaviorStatus: 'normal',
    notes: 'Exercise session completed successfully. Horse showing excellent energy levels and responsiveness.',
    uploadedBy: 'Emily Carter'
  },
  {
    id: 'obs-6',
    horseId: 'horse-3',
    horseName: 'Spirit',
    imageUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_1d09d4e88-1765536992034.png",
    imageAlt: 'Spirit standing in paddock with ears forward showing attentive and healthy demeanor',
    timestamp: new Date(Date.now() - 3600000),
    temperature: 37.7,
    behaviorStatus: 'normal',
    notes: 'Routine health check completed. All parameters normal. Horse is in excellent condition.',
    uploadedBy: 'David Martinez'
  }];


  // Filter observations by selected horse and date range
  const filterObservations = useCallback(() => {
    let filtered = mockObservations.filter((obs) => obs.horseId === selectedHorseId);

    if (startDate) {
      filtered = filtered.filter((obs) => obs.timestamp >= startDate);
    }

    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter((obs) => obs.timestamp <= endOfDay);
    }

    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return filtered;
  }, [selectedHorseId, startDate, endDate]);

  // Load initial observations
  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      let filtered = filterObservations();
      setObservations(filtered);
      setFilteredObservations(filtered.slice(0, 6));
      setIsLoading(false);
      setHasMore(filtered.length > 6);
      setPage(1);
    }, 800);
  }, [selectedHorseId, startDate, endDate, filterObservations]);

  // Infinite scroll implementation
  const loadMoreObservations = useCallback(() => {
    if (!hasMore || isLoading) return;

    const nextPage = page + 1;
    const startIndex = nextPage * 6;
    const endIndex = startIndex + 6;
    const moreObservations = observations.slice(startIndex, endIndex);

    if (moreObservations.length > 0) {
      setTimeout(() => {
        setFilteredObservations((prev) => [...prev, ...moreObservations]);
        setPage(nextPage);
        setHasMore(endIndex < observations.length);
      }, 500);
    } else {
      setHasMore(false);
    }
  }, [hasMore, isLoading, page, observations]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          loadMoreObservations();
        }
      },
      { threshold: 0.1 }
    );

    if (lastObservationRef.current) {
      observerRef.current.observe(lastObservationRef.current);
    }

    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
  }, [hasMore, isLoading, loadMoreObservations]);

  const handleDateChange = (newStartDate: Date | null, newEndDate: Date | null) => {
    setStartDate(newStartDate);
    setEndDate(newEndDate);
  };

  const handleClearFilters = () => {
    setStartDate(null);
    setEndDate(null);
  };

  const hasActiveFilters = startDate !== null || endDate !== null;

  return (
    <>
      <Helmet>
        <title>Horse Timeline - EquineWatch</title>
        <meta
          name="description"
          content="Monitor your horse's health through chronological photo observations with behavioral insights for early colic detection" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        <MobileNavigation />

        <main className="pt-20 pb-20 md:pb-8 px-4 md:px-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-semibold text-text-primary mb-2">
              Horse Timeline
            </h1>
            <p className="text-text-secondary">
              Monitor behavioral patterns and health observations through chronological photo updates
            </p>
          </div>

          <HorseSelector
            horses={horses}
            selectedHorseId={selectedHorseId}
            onHorseChange={setSelectedHorseId} />


          <DateFilter
            onDateChange={handleDateChange}
            selectedStartDate={startDate}
            selectedEndDate={endDate} />


          {isLoading ?
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) =>
            <ObservationSkeleton key={index} />
            )}
            </div> :
          filteredObservations.length === 0 ?
          <EmptyState hasFilters={hasActiveFilters} onClearFilters={handleClearFilters} /> :

          <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredObservations.map((observation, index) =>
              <div
                key={observation.id}
                ref={index === filteredObservations.length - 1 ? lastObservationRef : null}>

                    <ObservationCard observation={observation} />
                  </div>
              )}
              </div>

              {hasMore &&
            <div className="flex justify-center mt-8">
                  <div className="animate-pulse text-text-secondary">Loading more observations...</div>
                </div>
            }
            </>
          }
        </main>
      </div>
    </>);

};

export default HorseTimeline;