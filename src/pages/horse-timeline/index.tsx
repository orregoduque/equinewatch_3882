import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { format, formatDistanceToNow } from 'date-fns';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import Image from '../../components/AppImage';
import Icon from '../../components/AppIcon';
import { Observation, Horse } from './types';

const HorseTimeline: React.FC = () => {
  const [selectedHorseId, setSelectedHorseId] = useState<string>('horse-1');
  const [observations, setObservations] = useState<Observation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);

  const horses: Horse[] = [
    {
      id: 'horse-1',
      name: 'Thunder',
      breed: 'Thoroughbred',
      age: 5,
      owner: 'John Smith',
      lastObservation: new Date(),
      profileImage: "https://img.rocket.new/generatedImages/rocket_gen_img_12f7dfca2-1765393004995.png",
      profileImageAlt: 'Majestic brown thoroughbred horse'
    },
    {
      id: 'horse-2',
      name: 'Midnight',
      breed: 'Arabian',
      age: 7,
      owner: 'Sarah Johnson',
      lastObservation: new Date(Date.now() - 3600000),
      profileImage: "https://img.rocket.new/generatedImages/rocket_gen_img_1594b846c-1764835401410.png",
      profileImageAlt: 'Elegant black Arabian horse'
    },
    {
      id: 'horse-3',
      name: 'Spirit',
      breed: 'Quarter Horse',
      age: 4,
      owner: 'Michael Brown',
      lastObservation: new Date(Date.now() - 7200000),
      profileImage: "https://img.rocket.new/generatedImages/rocket_gen_img_137bef0d8-1765170668258.png",
      profileImageAlt: 'Strong chestnut quarter horse'
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
    const filtered = mockObservations
      .filter((obs) => obs.horseId === selectedHorseId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setObservations(filtered);
    setSelectedObservation(filtered[0] || null);
    setIsLoading(false);
  }, [selectedHorseId]);

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

      <div className="min-h-screen relative overflow-hidden">
        <div className="fixed inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a0f] via-[#12121a] to-[#0f0f18]" />
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#c9a962]/5 rounded-full blur-[150px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-[#c9a962]/3 rounded-full blur-[150px]" />
        </div>

        <Header />

        <main className="pt-24 pb-24 md:pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-12 rounded-full bg-gradient-to-b from-[#c9a962] to-[#a88a45]" />
                <div>
                  <h1 className="font-serif text-4xl md:text-5xl font-light text-[#faf9f6]">
                    Live <span className="gradient-text font-medium">Monitoring</span>
                  </h1>
                  <p className="text-base mt-2 font-light text-[#a8a8a8] tracking-wide">
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-300 whitespace-nowrap ${
                    selectedHorseId === horse.id
                      ? 'bg-[#c9a962]/10 border-[#c9a962]/50 shadow-[0_0_20px_rgba(201,169,98,0.15)]'
                      : 'bg-white/[0.02] border-[#c9a962]/10 hover:bg-white/[0.04] hover:border-[#c9a962]/20'
                  }`}
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#c9a962]/30">
                    <Image src={horse.profileImage} alt={horse.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="text-left">
                    <p className={`font-medium ${selectedHorseId === horse.id ? 'text-[#c9a962]' : 'text-[#faf9f6]'}`}>
                      {horse.name}
                    </p>
                    <p className="text-xs text-[#6b6b6b]">{horse.breed}</p>
                  </div>
                </button>
              ))}
            </div>

            {isLoading ? (
              <div className="glass-card luxury-border p-8 animate-pulse">
                <div className="aspect-video bg-white/5 rounded-xl mb-6" />
                <div className="h-6 bg-white/5 rounded w-1/3 mb-4" />
                <div className="h-4 bg-white/5 rounded w-2/3" />
              </div>
            ) : latestObservation ? (
              <div className="space-y-6">
                {/* Latest Photo - Featured */}
                <div className="glass-card luxury-border overflow-hidden">
                  {/* Last Updated Banner */}
                  <div className="flex items-center justify-between px-6 py-3 bg-[#c9a962]/5 border-b border-[#c9a962]/10">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-[#4a9d6b] animate-pulse" />
                      <span className="text-sm font-medium text-[#faf9f6]">Latest Photo</span>
                    </div>
                    <div className="flex items-center gap-2 text-[#c9a962]">
                      <Icon name="Clock" size={14} />
                      <span className="text-sm font-medium">
                        {formatDistanceToNow(selectedObservation?.timestamp || latestObservation.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Main Photo */}
                  <div className="relative">
                    <div className="aspect-video md:aspect-[21/9] overflow-hidden bg-black/20">
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
                          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${status.bg} ${status.border} border backdrop-blur-xl`}>
                            <div className={`w-2 h-2 rounded-full ${status.dot} animate-pulse`} />
                            <span className={`text-sm font-semibold uppercase tracking-wide ${status.text}`}>
                              {selectedObservation?.behaviorStatus || latestObservation.behaviorStatus}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Temperature Badge */}
                    <div className="absolute top-4 right-4">
                      <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 border border-white/20 backdrop-blur-xl">
                        <Icon name="Thermometer" size={16} className="text-[#c9a962]" />
                        <span className="text-lg font-semibold text-[#faf9f6]">
                          {selectedObservation?.temperature || latestObservation.temperature}°C
                        </span>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="absolute bottom-4 left-4">
                      <div className="px-4 py-2 rounded-xl bg-black/50 border border-white/10 backdrop-blur-xl">
                        <p className="text-sm font-medium text-[#faf9f6]">
                          {format(selectedObservation?.timestamp || latestObservation.timestamp, 'EEEE, MMMM d, yyyy')}
                        </p>
                        <p className="text-lg font-semibold text-[#c9a962]">
                          {format(selectedObservation?.timestamp || latestObservation.timestamp, 'HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Notes Section */}
                  <div className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 rounded-xl bg-[#c9a962]/10">
                        <Icon name="FileText" size={20} className="text-[#c9a962]" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-[#faf9f6] mb-2">Observation Notes</h3>
                        <p className="text-[#a8a8a8] leading-relaxed">
                          {selectedObservation?.notes || latestObservation.notes}
                        </p>
                        <p className="text-sm text-[#6b6b6b] mt-3">
                          Recorded by {selectedObservation?.uploadedBy || latestObservation.uploadedBy}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Photos Strip */}
                <div className="glass-card p-6 luxury-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif text-xl font-medium text-[#faf9f6]">Recent Photos</h3>
                    <span className="text-sm text-[#6b6b6b]">{observations.length} photos today</span>
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
                              ? 'border-[#c9a962] shadow-[0_0_20px_rgba(201,169,98,0.3)]'
                              : 'border-transparent hover:border-[#c9a962]/30'
                          }`}
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
                  <div className="glass-card p-4 luxury-border text-center">
                    <Icon name="Camera" size={24} className="text-[#c9a962] mx-auto mb-2" />
                    <p className="text-2xl font-light text-[#faf9f6]">{observations.length}</p>
                    <p className="text-xs text-[#6b6b6b]">Photos Today</p>
                  </div>
                  <div className="glass-card p-4 luxury-border text-center">
                    <Icon name="Clock" size={24} className="text-[#c9a962] mx-auto mb-2" />
                    <p className="text-2xl font-light text-[#faf9f6]">10</p>
                    <p className="text-xs text-[#6b6b6b]">Min Interval</p>
                  </div>
                  <div className="glass-card p-4 luxury-border text-center">
                    <Icon name="Thermometer" size={24} className="text-[#c9a962] mx-auto mb-2" />
                    <p className="text-2xl font-light text-[#faf9f6]">{latestObservation.temperature}°C</p>
                    <p className="text-xs text-[#6b6b6b]">Last Temp</p>
                  </div>
                  <div className="glass-card p-4 luxury-border text-center">
                    <Icon name="CheckCircle" size={24} className="text-[#4a9d6b] mx-auto mb-2" />
                    <p className="text-2xl font-light text-[#4a9d6b]">
                      {observations.filter(o => o.behaviorStatus === 'normal').length}
                    </p>
                    <p className="text-xs text-[#6b6b6b]">Normal Status</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card p-12 luxury-border text-center">
                <Icon name="Camera" size={48} className="text-[#6b6b6b] mx-auto mb-4" />
                <h3 className="text-xl font-medium text-[#faf9f6] mb-2">No Photos Yet</h3>
                <p className="text-[#6b6b6b]">Photos will appear here once monitoring begins</p>
              </div>
            )}
          </div>
        </main>

        <MobileNavigation />
      </div>
    </>
  );
};

export default HorseTimeline;
