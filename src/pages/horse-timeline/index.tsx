import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { format, formatDistanceToNow } from 'date-fns';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import Image from '../../components/AppImage';
import Icon from '../../components/AppIcon';
import { Observation, Horse } from './types';
import { fetchHorseImages, getImageUrl, HorseImage } from '../../utils/supabase';

const HorseTimeline: React.FC = () => {
  const [selectedHorseId, setSelectedHorseId] = useState<string>('horse-1');
  const [observations, setObservations] = useState<Observation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [currentVideoFrame, setCurrentVideoFrame] = useState(0);
  const [videoProgress, setVideoProgress] = useState(0);

  const horses: Horse[] = [
    {
      id: 'horse-1',
      name: 'Thunder',
      breed: 'Thoroughbred',
      age: 5,
      owner: 'John Smith',
      lastObservation: new Date(),
      profileImage: "https://zmxppbpywizdjlhstfkf.supabase.co/storage/v1/object/public/images/image_111_enhanced.jpg",
      profileImageAlt: 'Majestic brown thoroughbred horse'
    }
  ];

  const mockObservations: Observation[] = [
    {
      id: 'obs-1',
      horseId: 'horse-1',
      horseName: 'Thunder',
      imageUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_189a2df76-1765536993983.png",
      imageAlt: 'Thunder standing calmly in stable',
      timestamp: new Date(Date.now() - 600000),
      temperature: 37.8,
      behaviorStatus: 'normal',
      notes: 'Horse appears calm and alert. Eating normally and responding well to commands.',
      uploadedBy: 'Emily Carter'
    },
    {
      id: 'obs-2',
      horseId: 'horse-1',
      horseName: 'Thunder',
      imageUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_130253821-1765536994698.png",
      imageAlt: 'Thunder lying down in straw bedding',
      timestamp: new Date(Date.now() - 1200000),
      temperature: 38.2,
      behaviorStatus: 'suspicious',
      notes: 'Horse showing signs of restlessness. Lying down more frequently than usual.',
      uploadedBy: 'David Martinez'
    },
    {
      id: 'obs-3',
      horseId: 'horse-1',
      horseName: 'Thunder',
      imageUrl: "https://images.unsplash.com/photo-1626617158255-152c32b4b957",
      imageAlt: 'Thunder grazing peacefully in pasture',
      timestamp: new Date(Date.now() - 1800000),
      temperature: 37.5,
      behaviorStatus: 'normal',
      notes: 'Morning check completed. Horse is grazing normally.',
      uploadedBy: 'Emily Carter'
    },
    {
      id: 'obs-4',
      horseId: 'horse-1',
      horseName: 'Thunder',
      imageUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_1d2835970-1765536992071.png",
      imageAlt: 'Thunder drinking water from trough',
      timestamp: new Date(Date.now() - 2400000),
      temperature: 37.6,
      behaviorStatus: 'normal',
      notes: 'Hydration check - drinking water regularly.',
      uploadedBy: 'David Martinez'
    },
    {
      id: 'obs-5',
      horseId: 'horse-1',
      horseName: 'Thunder',
      imageUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_1ec8e5470-1765536992858.png",
      imageAlt: 'Thunder in stable morning light',
      timestamp: new Date(Date.now() - 3000000),
      temperature: 37.4,
      behaviorStatus: 'normal',
      notes: 'Early morning observation. All vitals normal.',
      uploadedBy: 'Emily Carter'
    },
    {
      id: 'obs-6',
      horseId: 'horse-2',
      horseName: 'Midnight',
      imageUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_1ec8e5470-1765536992858.png",
      imageAlt: 'Midnight trotting in arena',
      timestamp: new Date(Date.now() - 600000),
      temperature: 37.9,
      behaviorStatus: 'normal',
      notes: 'Exercise session completed successfully.',
      uploadedBy: 'Emily Carter'
    },
    {
      id: 'obs-7',
      horseId: 'horse-3',
      horseName: 'Spirit',
      imageUrl: "https://img.rocket.new/generatedImages/rocket_gen_img_1d09d4e88-1765536992034.png",
      imageAlt: 'Spirit standing in paddock',
      timestamp: new Date(Date.now() - 600000),
      temperature: 37.7,
      behaviorStatus: 'normal',
      notes: 'Routine health check completed.',
      uploadedBy: 'David Martinez'
    }
  ];

  useEffect(() => {
    const loadImages = async () => {
      setIsLoading(true);
      try {
        const images = await fetchHorseImages(30);
        
        const realObservations: Observation[] = images.map((img: HorseImage, index: number) => ({
          id: `obs-${img.id}`,
          horseId: 'horse-1',
          horseName: 'Thunder',
          imageUrl: getImageUrl(img.storage_path_enhanced),
          imageAlt: `Horse observation ${img.image_number}`,
          timestamp: new Date(img.created_at),
          temperature: 37.5 + (Math.random() * 1.5 - 0.5),
          behaviorStatus: index === 0 ? 'normal' : (Math.random() > 0.8 ? 'suspicious' : 'normal') as 'normal' | 'suspicious',
          notes: img.notes || `Observation #${img.image_number} - Captured at ${format(new Date(img.created_at), 'HH:mm')}`,
          uploadedBy: 'Stable Eye Camera'
        }));

        const filtered = selectedHorseId === 'horse-1' 
          ? realObservations 
          : mockObservations.filter((obs) => obs.horseId === selectedHorseId);
        
        setObservations(filtered);
        setSelectedObservation(filtered[0] || null);
      } catch (error) {
        console.error('Error loading images:', error);
        const filtered = mockObservations
          .filter((obs) => obs.horseId === selectedHorseId)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        setObservations(filtered);
        setSelectedObservation(filtered[0] || null);
      }
      setIsLoading(false);
    };

    loadImages();
  }, [selectedHorseId]);

  // Video playback effect - 15 seconds total, divided by number of photos
  useEffect(() => {
    if (!isVideoPlaying || observations.length === 0) return;
    
    const totalDuration = 15000; // 15 seconds
    const frameInterval = totalDuration / observations.length;
    const progressInterval = 50; // Update progress every 50ms
    
    const frameTimer = setInterval(() => {
      setCurrentVideoFrame((prev) => {
        const next = prev + 1;
        if (next >= observations.length) {
          setIsVideoPlaying(false);
          setVideoProgress(100);
          return 0;
        }
        return next;
      });
    }, frameInterval);
    
    const progressTimer = setInterval(() => {
      setVideoProgress((prev) => {
        const increment = (progressInterval / totalDuration) * 100;
        const next = prev + increment;
        return next >= 100 ? 100 : next;
      });
    }, progressInterval);
    
    return () => {
      clearInterval(frameTimer);
      clearInterval(progressTimer);
    };
  }, [isVideoPlaying, observations.length]);

  // Handle body scroll lock when video modal is open
  useEffect(() => {
    if (isVideoModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isVideoModalOpen]);

  const handleGenerateVideo = () => {
    setIsVideoModalOpen(true);
    setCurrentVideoFrame(0);
    setVideoProgress(0);
    setIsVideoPlaying(false);
  };

  const handlePlayVideo = () => {
    setCurrentVideoFrame(0);
    setVideoProgress(0);
    setIsVideoPlaying(true);
  };

  const handleCloseVideo = () => {
    setIsVideoModalOpen(false);
    setIsVideoPlaying(false);
    setCurrentVideoFrame(0);
    setVideoProgress(0);
  };

  const selectedHorse = horses.find(h => h.id === selectedHorseId);
  const latestObservation = observations[0];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'normal':
        return { bg: 'bg-[#4a9d6b]/20', border: 'border-[#4a9d6b]/50', text: 'text-[#4a9d6b]', dot: 'bg-[#4a9d6b]' };
      case 'suspicious':
        return { bg: 'bg-[#d4a84b]/20', border: 'border-[#d4a84b]/50', text: 'text-[#d4a84b]', dot: 'bg-[#d4a84b]' };
      default:
        return { bg: 'bg-[#6b6b6b]/20', border: 'border-[#6b6b6b]/50', text: 'text-[#6b6b6b]', dot: 'bg-[#6b6b6b]' };
    }
  };

  return (
    <>
      <Helmet>
        <title>Live Monitoring - Stable Eye</title>
        <meta name="description" content="Real-time horse monitoring with photos every 10 minutes" />
      </Helmet>

      <div className="min-h-screen" style={{ backgroundColor: '#F8F6F2' }}>
        <Header />

        <main className="pt-24 pb-24 md:pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-12 rounded-full" style={{ backgroundColor: '#40352C' }} />
                <div>
                  <h1 className="text-4xl md:text-5xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
                    Live Monitoring
                  </h1>
                  <p className="text-base mt-2" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }}>
                    Photos captured every 10 minutes
                  </p>
                </div>
              </div>
            </div>

            {/* Horse Selector Tabs */}
            <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
              {horses.map((horse) => (
                <button
                  key={horse.id}
                  onClick={() => setSelectedHorseId(horse.id)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 whitespace-nowrap"
                  style={{
                    backgroundColor: selectedHorseId === horse.id ? 'rgba(64,53,44,0.08)' : '#ffffff',
                    border: selectedHorseId === horse.id ? '1px solid rgba(64,53,44,0.4)' : '1px solid rgba(64,53,44,0.1)',
                  }}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden" style={{ border: '2px solid rgba(64,53,44,0.2)' }}>
                    <Image src={horse.profileImage} alt={horse.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium" style={{ color: '#40352C', fontFamily: 'Montserrat, sans-serif' }}>
                      {horse.name}
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(64,53,44,0.5)' }}>{horse.breed}</p>
                  </div>
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="rounded-xl p-8 animate-pulse" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}>
                <div className="aspect-video rounded-xl mb-6" style={{ backgroundColor: 'rgba(64,53,44,0.05)' }} />
                <div className="h-6 rounded w-1/3 mb-4" style={{ backgroundColor: 'rgba(64,53,44,0.05)' }} />
                <div className="h-4 rounded w-2/3" style={{ backgroundColor: 'rgba(64,53,44,0.05)' }} />
              </div>
            ) : latestObservation ? (
              <div className="space-y-6">
                {/* Latest Photo - Featured */}
                <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}>
                  {/* Last Updated Banner */}
                  <div className="flex items-center justify-between px-6 py-3" style={{ backgroundColor: 'rgba(64,53,44,0.04)', borderBottom: '1px solid rgba(64,53,44,0.08)' }}>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm font-medium" style={{ color: '#40352C' }}>Latest Photo</span>
                    </div>
                    <div className="flex items-center gap-2" style={{ color: 'rgba(64,53,44,0.6)' }}>
                      <Icon name="Clock" size={14} />
                      <span className="text-sm font-medium">
                        {formatDistanceToNow(selectedObservation?.timestamp || latestObservation.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Main Photo — centered, half width on desktop */}
                  <div className="flex justify-center">
                    <div className="relative w-full md:w-1/2">
                      <div className="aspect-video overflow-hidden bg-black/20">
                        <Image
                          src={selectedObservation?.imageUrl || latestObservation.imageUrl}
                          alt={selectedObservation?.imageAlt || latestObservation.imageAlt}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Status Badge */}
                      <div className="absolute top-4 left-4">
                        {(() => {
                          const status = getStatusConfig(selectedObservation?.behaviorStatus || latestObservation.behaviorStatus);
                          return (
                            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${status.bg} ${status.border} border backdrop-blur-xl`}>
                              <div className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`} />
                              <span className={`text-xs font-semibold uppercase tracking-wide ${status.text}`}>
                                {selectedObservation?.behaviorStatus || latestObservation.behaviorStatus}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* Temperature Badge */}
                      <div className="absolute top-4 right-4">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/40 border border-white/20 backdrop-blur-xl">
                          <Icon name="Thermometer" size={14} className="text-[#c9a962]" />
                          <span className="text-sm font-semibold text-[#faf9f6]">
                            {(selectedObservation?.temperature || latestObservation.temperature).toFixed(1)}°C
                          </span>
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="absolute bottom-4 left-4">
                        <div className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 backdrop-blur-xl">
                          <p className="text-xs font-medium text-[#faf9f6]">
                            {format(selectedObservation?.timestamp || latestObservation.timestamp, 'EEEE, MMMM d, yyyy')}
                          </p>
                          <p className="text-sm font-semibold text-[#c9a962]">
                            {format(selectedObservation?.timestamp || latestObservation.timestamp, 'HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Photos Strip */}
                <div className="rounded-xl p-6" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>Recent Photos</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm" style={{ color: 'rgba(64,53,44,0.5)' }}>{observations.length} photos today</span>
                      <button
                        onClick={handleGenerateVideo}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-white font-semibold text-sm transition-all duration-300 hover:opacity-80"
                        style={{ backgroundColor: '#40352C' }}
                      >
                        <Icon name="Video" size={16} />
                        Generate Video
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {observations.map((obs, index) => {
                      const isSelected = selectedObservation?.id === obs.id;
                      const status = getStatusConfig(obs.behaviorStatus);
                      return (
                        <button
                          key={obs.id}
                          onClick={() => setSelectedObservation(obs)}
                          className={`relative flex-shrink-0 w-32 md:w-40 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                            isSelected
                              ? 'shadow-md'
                              : 'border-transparent'
                          }`}
                          style={isSelected ? { borderColor: '#40352C' } : { borderColor: 'transparent' }}
                        >
                          <div className="aspect-[4/3] bg-black/20">
                            <Image src={obs.imageUrl} alt={obs.imageAlt} className="w-full h-full object-cover" />
                          </div>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-white">
                                {format(obs.timestamp, 'HH:mm')}
                              </span>
                              <div className={`w-2 h-2 rounded-full ${status.dot}`} />
                            </div>
                          </div>
                          {index === 0 && (
                            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-[#c9a962] text-[10px] font-bold text-black uppercase">
                              Latest
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}>
                    <Icon name="Camera" size={24} style={{ color: '#40352C' }} className="mx-auto mb-2" />
                    <p className="text-2xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{observations.length}</p>
                    <p className="text-xs" style={{ color: 'rgba(64,53,44,0.5)' }}>Photos Today</p>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}>
                    <Icon name="Clock" size={24} style={{ color: '#40352C' }} className="mx-auto mb-2" />
                    <p className="text-2xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>10</p>
                    <p className="text-xs" style={{ color: 'rgba(64,53,44,0.5)' }}>Min Interval</p>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}>
                    <Icon name="Thermometer" size={24} style={{ color: '#40352C' }} className="mx-auto mb-2" />
                    <p className="text-2xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{latestObservation.temperature}°C</p>
                    <p className="text-xs" style={{ color: 'rgba(64,53,44,0.5)' }}>Last Temp</p>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}>
                    <Icon name="CheckCircle" size={24} className="text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {observations.filter(o => o.behaviorStatus === 'normal').length}
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(64,53,44,0.5)' }}>Normal Status</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl p-12 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}>
                <Icon name="Camera" size={48} style={{ color: 'rgba(64,53,44,0.3)' }} className="mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>No Photos Yet</h3>
                <p style={{ color: 'rgba(64,53,44,0.5)' }}>Photos will appear here once monitoring begins</p>
              </div>
            )}
          </div>
        </main>

        <MobileNavigation />

        {/* Video Modal */}
        {isVideoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl">
            <div className="relative w-full max-w-4xl">
              {/* Close Button */}
              <button
                onClick={handleCloseVideo}
                className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Icon name="X" size={24} className="text-white" />
              </button>

              {/* Video Player Card */}
              <div className="rounded-xl overflow-hidden" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.15)' }}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4" style={{ backgroundColor: 'rgba(64,53,44,0.04)', borderBottom: '1px solid rgba(64,53,44,0.1)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden border-2" style={{ borderColor: 'rgba(64,53,44,0.2)' }}>
                      <Image
                        src={selectedHorse?.profileImage || ''}
                        alt={selectedHorse?.name || ''}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
                        {selectedHorse?.name}'s Daily Recap
                      </h3>
                      <p className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>{observations.length} photos • 15 seconds</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(64,53,44,0.08)', border: '1px solid rgba(64,53,44,0.15)' }}>
                    <Icon name="Video" size={14} style={{ color: '#40352C' }} />
                    <span className="text-sm font-medium" style={{ color: '#40352C' }}>Generated Video</span>
                  </div>
                </div>

                {/* Video Display */}
                <div className="relative aspect-video bg-black">
                  {observations.map((obs, index) => (
                    <div
                      key={obs.id}
                      className={`absolute inset-0 transition-opacity duration-500 ${
                        currentVideoFrame === index ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <Image 
                        src={obs.imageUrl} 
                        alt={obs.imageAlt} 
                        className="w-full h-full object-cover" 
                      />
                      {/* Photo Info Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">{format(obs.timestamp, 'HH:mm')}</p>
                            <p className="text-white/70 text-sm">{obs.notes.substring(0, 50)}...</p>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${
                            obs.behaviorStatus === 'normal' 
                              ? 'bg-[#4a9d6b]/80 text-white' 
                              : 'bg-[#d4a84b]/80 text-white'
                          }`}>
                            {obs.behaviorStatus}
                          </div>
                        </div>
                      </div>
                      {/* Frame Counter */}
                      <div className="absolute top-4 right-4 px-3 py-1 rounded-full bg-black/50 backdrop-blur-sm">
                        <span className="text-white text-sm font-medium">
                          {index + 1} / {observations.length}
                        </span>
                      </div>
                    </div>
                  ))}

                  {/* Play Button Overlay */}
                  {!isVideoPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <button
                        onClick={handlePlayVideo}
                        className="w-20 h-20 rounded-full bg-[#c9a962] flex items-center justify-center hover:scale-110 hover:shadow-[0_0_40px_rgba(201,169,98,0.5)] transition-all duration-300"
                      >
                        <Icon name="Play" size={32} className="text-[#0a0a0f] ml-1" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress Bar & Controls */}
                <div className="px-6 py-4" style={{ backgroundColor: 'rgba(64,53,44,0.04)', borderTop: '1px solid rgba(64,53,44,0.08)' }}>
                  {/* Progress Bar */}
                  <div className="relative h-2 rounded-full overflow-hidden mb-4" style={{ backgroundColor: 'rgba(64,53,44,0.1)' }}>
                    <div
                      className="absolute inset-y-0 left-0 transition-all duration-100"
                      style={{ width: `${videoProgress}%`, backgroundColor: '#40352C' }}
                    />
                  </div>

                  {/* Controls */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={isVideoPlaying ? () => setIsVideoPlaying(false) : handlePlayVideo}
                        className="p-3 rounded-full transition-colors hover:bg-stone-100"
                        style={{ backgroundColor: 'rgba(64,53,44,0.08)' }}
                      >
                        <Icon
                          name={isVideoPlaying ? "Pause" : "Play"}
                          size={20}
                          style={{ color: '#40352C' }}
                        />
                      </button>
                      <span className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>
                        {Math.round((videoProgress / 100) * 15)}s / 15s
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePlayVideo}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl transition-colors hover:bg-stone-100"
                        style={{ backgroundColor: 'rgba(64,53,44,0.06)', border: '1px solid rgba(64,53,44,0.1)' }}
                      >
                        <Icon name="RotateCcw" size={16} style={{ color: 'rgba(64,53,44,0.55)' }} />
                        <span className="text-sm" style={{ color: 'rgba(64,53,44,0.55)' }}>Replay</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default HorseTimeline;
