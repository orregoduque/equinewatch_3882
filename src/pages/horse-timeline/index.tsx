import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { format, formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import Header from '../../components/ui/Header';
import MobileNavigation from '../../components/ui/MobileNavigation';
import Image from '../../components/AppImage';
import Icon from '../../components/AppIcon';
import { Observation, Horse } from './types';
import { getImageUrl, CameraImage, renewPrivatePhotos, loadPrivatePhoto } from '../../utils/supabase';
import { useAccessibleHorses } from '../../hooks/useAccessibleHorses';
import { watchHorseImages } from '../../utils/liveHorseImages';
import TimelineLiveVideo from './components/TimelineLiveVideo';
import TimelineThumbnail from './components/TimelineThumbnail';
import FullscreenPhoto from './components/FullscreenPhoto';
import HourlyTimelapse from './components/HourlyTimelapse';
import { useHourlyHorseImages } from '../../hooks/useHourlyHorseImages';
import { localToday } from '../../utils/hourlyHorseImages';

const PHOTO_LIMIT = 20;
const mapHorseImagesToObservations = (
  images: CameraImage[],
  horseId: string,
  horseName: string,
): Observation[] =>
  images.map((img, index) => ({
    id: `obs-${img.source === 'wasabi' ? 'wasabi-' : ''}${img.id}`,
    horseId,
    horseName,
    imageUrl: img.source === 'wasabi' ? img.imageUrl! : getImageUrl(img.storage_path_enhanced),
    thumbnailUrl: img.source === 'wasabi' ? img.imageUrl! : getImageUrl(img.storage_path_enhanced, { width: 320, quality: 60 }),
    imageVersion: img.source === 'wasabi' ? `${img.captured_at}:${img.storage_path_enhanced}` : `${img.uploaded_at}:${img.is_processed}`,
    privateImage: img.source === 'wasabi' ? img : undefined,
    imageAlt: `${horseName} observation ${img.image_number}`,
    timestamp: new Date(img.created_at),
    temperature: 37.5 + (Math.random() * 1.5 - 0.5),
    behaviorStatus: index === 0 ? 'normal' : (Math.random() > 0.8 ? 'suspicious' : 'normal') as 'normal' | 'suspicious',
    notes: img.notes || `Observation #${img.image_number} - Captured at ${format(new Date(img.created_at), 'HH:mm')}`,
    uploadedBy: 'Stable Eye Camera',
  }));

const HorseTimeline: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedHorseId = searchParams.get('horseId') || '';
  const [selectedHorseId, setSelectedHorseId] = useState<string>('');
  const { horses: records, viewer, viewerKey, isLoading: isLoadingHorses, error: horseError } = useAccessibleHorses();
  const photoStripRef = useRef<HTMLDivElement>(null);
  const photoSelectionRequest = useRef(0);
  const photoSelectionAbort = useRef<AbortController>();
  const horses = useMemo<Horse[]>(() => records.map((horse) => {
    const profilePhoto = horse.profile_photo_url?.trim();
    return {
      id: horse.id,
      name: horse.name,
      breed: horse.breed || 'Horse',
      age: horse.age || 0,
      owner: horse.owner_id || '',
      lastObservation: new Date(horse.updated_at || horse.created_at),
      profileImage: profilePhoto
        ? (/^https?:\/\//i.test(profilePhoto) ? profilePhoto : getImageUrl(profilePhoto))
        : '',
      profileImageAlt: horse.name,
    };
  }), [records]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedObservation, setSelectedObservation] = useState<Observation | null>(null);
  const [refreshError, setRefreshError] = useState('');
  const [reviewSelection, setReviewSelection] = useState<{ day: string; hour: number } | null>(null);
  const [reviewDay, setReviewDay] = useState(localToday);
  const [expandedPhoto, setExpandedPhoto] = useState<Observation | null>(null);
  const [timelapseKey, setTimelapseKey] = useState<string | null>(null);
  const selectedHourKey = reviewSelection
    ? JSON.stringify([viewerKey, selectedHorseId, reviewSelection.day, reviewSelection.hour]) : null;

  useEffect(() => {
    if (isLoadingHorses) {
      setSelectedHorseId('');
      return;
    }
    const requestedExists = horses.some((horse) => horse.id === requestedHorseId);
    const initialHorseId = requestedExists ? requestedHorseId : horses[0]?.id || '';
    setSelectedHorseId(initialHorseId);
    if (initialHorseId !== requestedHorseId) {
      setSearchParams(initialHorseId ? { horseId: initialHorseId } : {}, { replace: true });
    }
  }, [horses, isLoadingHorses, requestedHorseId, setSearchParams]);

  useEffect(() => {
    if (reviewSelection) return;
    const selectedHorse = horses.find((horse) => horse.id === selectedHorseId);
    setObservations([]);
    setSelectedObservation(null);
    setRefreshError('');
    if (!viewer || !selectedHorse) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    return watchHorseImages({
      horseId: selectedHorseId,
      viewer,
      limit: PHOTO_LIMIT,
      captureOrder: true,
      photoBackend: records.find(row => row.id === selectedHorseId)?.photo_backend,
      onImages: (images) => {
        const realObservations = mapHorseImagesToObservations(
          images, selectedHorseId, selectedHorse.name,
        );
        setObservations(realObservations);
        // null follows the newest photo; an explicit historical selection stays pinned.
        setSelectedObservation(current => !realObservations.length ? null
          : current ? realObservations.find(item => item.id === current.id && item.imageUrl) || current : null);
      },
      onError: error => setRefreshError(error
        ? selectedHorse && records.find(row => row.id === selectedHorse.id)?.photo_backend === 'wasabi'
          ? error.message : 'No se pudieron actualizar las fotos. Se reintentará automáticamente.' : ''),
      onSettled: () => setIsLoading(false),
    });
  }, [selectedHorseId, horses, viewerKey, reviewSelection !== null]);

  useEffect(() => {
    setReviewSelection(null);
    setExpandedPhoto(null);
  }, [selectedHorseId, viewerKey]);

  const selectedHorse = horses.find(h => h.id === selectedHorseId);
  const hourly = useHourlyHorseImages(selectedHorseId, viewer, viewerKey, reviewSelection,
    records.find(row => row.id === selectedHorseId)?.photo_backend);
  const displayedObservations = reviewSelection
    ? mapHorseImagesToObservations(hourly.images, selectedHorseId, selectedHorse?.name || '')
    : observations;
  const latestObservation = reviewSelection && displayedObservations[0]?.privateImage
    ? displayedObservations.at(-1)
    : selectedHorse ? displayedObservations.find((observation) => observation.horseId === selectedHorse.id) : undefined;
  const activePhoto = (selectedObservation?.horseId === selectedHorseId
    ? displayedObservations.find(photo => photo.id === selectedObservation.id && photo.imageUrl) || selectedObservation
    : null) || latestObservation;
  const mainPhotoKey = JSON.stringify([viewerKey, selectedHorseId, reviewSelection, activePhoto?.id, activePhoto?.imageVersion, activePhoto?.imageUrl]);
  const [settledMainPhotoKey, setSettledMainPhotoKey] = useState('');
  const [failedPrivatePhotoKey, setFailedPrivatePhotoKey] = useState('');
  useEffect(() => {
    photoSelectionRequest.current++;
    photoSelectionAbort.current?.abort();
    return () => { photoSelectionRequest.current++; photoSelectionAbort.current?.abort(); };
  }, [selectedHorseId, viewerKey, reviewSelection]);
  const selectPhoto = async (photo: Observation) => {
    const request = ++photoSelectionRequest.current;
    photoSelectionAbort.current?.abort();
    if (photo.id === latestObservation?.id) { setSelectedObservation(null); return; }
    if (!photo.privateImage || !viewer) { setSelectedObservation(photo); return; }
    const controller = new AbortController();
    photoSelectionAbort.current = controller;
    try {
      const image = await loadPrivatePhoto(photo.privateImage, viewer, controller.signal);
      if (request === photoSelectionRequest.current)
        setSelectedObservation({ ...photo, imageUrl: image.imageUrl!, thumbnailUrl: image.imageUrl!, privateImage: image });
    } catch {
      if (request === photoSelectionRequest.current) setRefreshError('No se pudo abrir la foto privada.');
    }
  };
  // Explicitly selected/expanded photos may outlive the 20-photo live window.
  // Renew those objects too, without replacing the photo the user is inspecting.
  useEffect(() => {
    if (reviewSelection || !viewer) return;
    const pinned = [selectedObservation, expandedPhoto]
      .filter((photo): photo is Observation => !!photo?.privateImage && photo.horseId === selectedHorseId);
    if (!pinned.length) return;
    const rows = [...new Map(pinned.map(photo => [photo.id, photo.privateImage!])).values()];
    const controller = new AbortController();
    let active = true, busy = false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = (delay?: number) => {
      clearTimeout(timer);
      if (document.visibilityState !== 'hidden')
        timer = setTimeout(() => { void renew(); }, delay ?? Math.max(1000,
          Math.min(...rows.map(row => Date.parse(row.expiresAt!))) - Date.now() - 60_000));
    };
    const renew = async () => {
      if (!active || busy || document.visibilityState === 'hidden') return;
      if (rows.every(row => Date.parse(row.expiresAt!) > Date.now() + 60_000)) { schedule(); return; }
      busy = true;
      try {
        const updated = await renewPrivatePhotos(rows, viewer, controller.signal);
        if (!active) return;
        const update = (photo: Observation | null) => {
          const row = updated.find(row => row.id === photo?.privateImage?.id);
          return photo && row ? { ...photo, imageUrl: row.imageUrl!, thumbnailUrl: row.imageUrl!, privateImage: row } : photo;
        };
        setSelectedObservation(update);
        setExpandedPhoto(update);
      } catch {
        if (active) {
          setSelectedObservation(null);
          setExpandedPhoto(null);
          setRefreshError('No se pudo renovar la foto privada. Vuelve a intentarlo con una sesión válida.');
        }
      } finally { busy = false; }
    };
    const resume = () => {
      if (document.visibilityState === 'hidden') clearTimeout(timer);
      else void renew();
    };
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('focus', resume);
    schedule();
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('focus', resume);
    };
  }, [selectedObservation, expandedPhoto, selectedHorseId, viewerKey, !!reviewSelection]);
  const chooseHour = (hour: number, day = reviewDay) => {
    if (!day) return;
    setTimelapseKey(null);
    setSelectedObservation(null);
    setExpandedPhoto(null);
    setReviewSelection({ day, hour });
    if (photoStripRef.current) photoStripRef.current.scrollLeft = 0;
  };
  const returnToLive = () => {
    setTimelapseKey(null);
    setSelectedObservation(null);
    setExpandedPhoto(null);
    setReviewSelection(null);
    if (photoStripRef.current) photoStripRef.current.scrollLeft = 0;
  };

  return (
    <>
      <Helmet>
        <title>Live Monitoring - Stable Eye</title>
        <meta name="description" content="Real-time horse monitoring with photos every 10 seconds" />
      </Helmet>

      <div className="min-h-screen" style={{ backgroundColor: '#F8F6F2' }}>
        <Header />

        <main className="pt-20 pb-24 md:pb-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="mb-3 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-1 h-12 rounded-full" style={{ backgroundColor: '#40352C' }} />
                <div>
                  <h1 className="text-xl md:text-3xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>
                    Live Monitoring
                  </h1>
                  <p className="text-xs mt-1" style={{ color: 'rgba(64,53,44,0.55)', fontFamily: 'Montserrat, sans-serif' }}>
                    Photos captured every 10 seconds
                  </p>
                </div>
              </div>
              <TimelineLiveVideo
                key={`${viewerKey}:${selectedHorseId}`}
                horseId={selectedHorse?.id || ''}
                horseName={selectedHorse?.name || ''}
              />
            </div>

            {/* Horse Selector Tabs */}
            <div className="flex gap-3 mb-3 overflow-x-auto pb-2">
              {horses.map((horse) => (
                <button
                  key={horse.id}
                  onClick={() => {
                    setSelectedHorseId(horse.id);
                    setSearchParams({ horseId: horse.id });
                  }}
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

            {selectedHorse && (
              <section aria-label="Revisar fotos por hora" className="mb-3 space-y-2">
                <div className="flex gap-2">
                  <button type="button" aria-pressed={!reviewSelection} onClick={returnToLive}
                    className="min-h-[44px] flex-1 rounded-xl border px-3 text-sm font-semibold bg-white">
                    {reviewSelection ? 'Volver a en vivo' : 'En vivo'}
                  </button>
                  <button type="button" aria-pressed={!!reviewSelection}
                    onClick={() => chooseHour(new Date().getHours())}
                    className="min-h-[44px] flex-1 rounded-xl px-3 text-sm font-semibold bg-[#40352C] text-white">
                    Revisar el día
                  </button>
                </div>
                {reviewSelection && (
                  <>
                    <label className="flex items-center justify-between gap-3 text-sm text-[#40352C]">
                      Día · hora local
                      <input type="date" aria-label="Día a revisar" value={reviewDay}
                        className="min-h-[44px] min-w-0 rounded-lg border px-3 bg-white"
                        onChange={event => {
                          const day = event.target.value;
                          setReviewDay(day);
                          if (day) chooseHour(reviewSelection.hour, day);
                        }} />
                    </label>
                    <button type="button" onClick={() => setTimelapseKey(selectedHourKey)}
                      disabled={!viewer || !selectedHorseId}
                      className="min-h-[44px] px-4 py-2 rounded-xl bg-[#40352C] text-white font-semibold disabled:opacity-40">
                      Generar timelapse
                    </button>
                    <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Horas del día">
                      {Array.from({ length: 24 }, (_, hour) => (
                        <button type="button" key={hour} aria-pressed={reviewSelection.hour === hour}
                          aria-label={`Revisar ${String(hour).padStart(2, '0')}:00`}
                          onClick={() => chooseHour(hour)}
                          className={`min-h-[44px] min-w-[64px] shrink-0 rounded-xl border text-sm font-semibold ${reviewSelection.hour === hour ? 'bg-[#40352C] text-white' : 'bg-white text-[#40352C]'}`}>
                          {String(hour).padStart(2, '0')}:00
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </section>
            )}

            {!reviewSelection && refreshError && (
              <p role="status" className="mb-4 text-sm text-amber-800">{refreshError}</p>
            )}
            {activePhoto?.privateImage && failedPrivatePhotoKey === mainPhotoKey && (
              <p role="alert" className="mb-4 text-sm text-amber-800">
                No se pudo descargar esta foto privada. Selecciona otra foto o vuelve a intentarlo más tarde.
              </p>
            )}
            {isLoadingHorses || (reviewSelection ? hourly.loading : isLoading) ? (
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
                  <div className="flex flex-wrap gap-2 items-center justify-between px-3 py-2" style={{ backgroundColor: 'rgba(64,53,44,0.04)', borderBottom: '1px solid rgba(64,53,44,0.08)' }}>
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${refreshError ? 'bg-amber-500' : 'bg-green-500 animate-pulse'}`} />
                      <span className="text-sm font-medium" style={{ color: '#40352C' }}>
                        {reviewSelection ? `${reviewSelection.day} · ${String(reviewSelection.hour).padStart(2, '0')}:00 · hora local` : selectedObservation ? 'Foto anterior' : 'Última foto · actualización cada 10 s'}
                      </span>
                    </div>
                    <div className="hidden sm:flex items-center gap-2" style={{ color: 'rgba(64,53,44,0.6)' }}>
                      <Icon name="Clock" size={14} />
                      <span className="text-sm font-medium">
                        {formatDistanceToNow(activePhoto!.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {selectedObservation && !reviewSelection && (
                    <button type="button" onClick={() => setSelectedObservation(null)}
                      className="m-3 min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium border"
                      style={{ color: '#40352C', borderColor: 'rgba(64,53,44,0.2)' }}>
                      Volver a la última foto
                    </button>
                  )}

                  {/* Original camera image, full available width on phones and desktop. */}
                  <div className="flex justify-center">
                    <div className="relative w-full">
                      <div className="h-[max(240px,calc(100dvh-600px))] md:h-[max(320px,calc(100dvh-420px))] max-h-[70dvh] overflow-hidden bg-black/90">
                        <Image
                          key={`${activePhoto!.id}:${activePhoto!.imageVersion}`}
                          src={activePhoto!.imageUrl}
                          alt={activePhoto!.imageAlt}
                          loading="eager"
                          {...{ fetchpriority: 'high' }}
                          decoding="async"
                          onLoad={() => setSettledMainPhotoKey(mainPhotoKey)}
                          onError={event => {
                            setSettledMainPhotoKey(mainPhotoKey);
                            if (activePhoto?.privateImage) setFailedPrivatePhotoKey(mainPhotoKey);
                            if (event.currentTarget.getAttribute('src') !== '/assets/images/no_image.png')
                              event.currentTarget.src = '/assets/images/no_image.png';
                          }}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <button type="button" onClick={() => setExpandedPhoto(activePhoto!)}
                        className="absolute top-3 right-3 min-h-[44px] px-4 rounded-xl bg-black/65 text-white text-sm font-semibold border border-white/30">
                        Ampliar
                      </button>

                      {/* Timestamp */}
                      <div className="absolute bottom-4 left-4">
                        <div className="px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 backdrop-blur-xl">
                          <p className="text-xs font-medium text-[#faf9f6]">
                            {format(activePhoto!.timestamp, 'dd/MM/yyyy')}
                          </p>
                          <p className="text-sm font-semibold text-[#c9a962]">
                            {format(activePhoto!.timestamp, 'HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Photos Strip */}
                <div className="rounded-xl p-3" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)', boxShadow: '0 2px 8px rgba(64,53,44,0.05)' }}>
                  <div className="flex flex-wrap gap-2 items-center justify-between mb-3">
                    <h3 className="text-base font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{reviewSelection ? 'Fotos de esta hora' : 'Recent Photos'}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'rgba(64,53,44,0.5)' }}>{displayedObservations.length} fotos</span>
                    </div>
                  </div>

                  <div ref={photoStripRef} key={reviewSelection ? `${viewerKey}:${selectedHorseId}:${reviewSelection.day}:${reviewSelection.hour}` : `${viewerKey}:${selectedHorseId}:live`} className="flex gap-3 overflow-x-auto pb-2">
                    {displayedObservations.map((obs, index) => {
                      const isSelected = activePhoto!.id === obs.id;
                      return (
                        <button
                          key={obs.id}
                          aria-label={`Ver foto ${format(obs.timestamp, 'HH:mm:ss')}`}
                          aria-pressed={isSelected}
                          onClick={() => { void selectPhoto(obs); }}
                          className={`relative flex-shrink-0 w-32 md:w-40 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                            isSelected
                              ? 'shadow-md'
                              : 'border-transparent'
                          }`}
                          style={isSelected ? { borderColor: '#40352C' } : { borderColor: 'transparent' }}
                        >
                          <TimelineThumbnail
                            key={obs.imageVersion}
                            src={obs.thumbnailUrl || obs.imageUrl}
                            originalSrc={obs.imageUrl}
                            alt={obs.imageAlt}
                            scrollRoot={photoStripRef}
                            enabled={!!activePhoto && settledMainPhotoKey === mainPhotoKey}
                            privateImage={obs.privateImage}
                            viewer={viewer}
                          />
                          <div className="absolute bottom-0 left-0 right-0 p-2">
                            <span className="rounded bg-black/50 px-1.5 py-0.5 text-xs font-semibold text-white">
                              {format(obs.timestamp, 'HH:mm')}
                            </span>
                          </div>
                          {index === 0 && !reviewSelection && (
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
                {!reviewSelection && <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}>
                    <Icon name="Camera" size={24} style={{ color: '#40352C' }} className="mx-auto mb-2" />
                    <p className="text-2xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{observations.length}</p>
                    <p className="text-xs" style={{ color: 'rgba(64,53,44,0.5)' }}>Recent Photos</p>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}>
                    <Icon name="Clock" size={24} style={{ color: '#40352C' }} className="mx-auto mb-2" />
                    <p className="text-2xl font-bold" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>10</p>
                    <p className="text-xs" style={{ color: 'rgba(64,53,44,0.5)' }}>Sec Interval</p>
                  </div>
                  <div className="rounded-xl p-4 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}>
                    <Icon name="CheckCircle" size={24} className="text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-600" style={{ fontFamily: 'Syne, sans-serif' }}>
                      {observations.filter(o => o.behaviorStatus === 'normal').length}
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(64,53,44,0.5)' }}>Normal Status</p>
                  </div>
                </div>}
              </div>
            ) : (
              <div className="rounded-xl p-12 text-center" style={{ backgroundColor: '#ffffff', border: '1px solid rgba(64,53,44,0.1)' }}>
                <Icon name="Camera" size={48} style={{ color: 'rgba(64,53,44,0.3)' }} className="mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2" style={{ color: '#40352C', fontFamily: 'Syne, sans-serif' }}>{reviewSelection ? hourly.error ? 'No se pudo revisar esta hora' : 'No hay fotos en esta hora' : horseError ? 'Unable to load horses' : horses.length ? 'No Photos Yet' : 'No Horses Available'}</h3>
                <p role="status" style={{ color: 'rgba(64,53,44,0.5)' }}>{reviewSelection ? hourly.error || 'Elige otra hora o vuelve a en vivo.' : horseError || (horses.length ? 'Photos will appear here once monitoring begins' : 'No horses are assigned to your account')}</p>
                {reviewSelection && hourly.error && <button type="button" className="min-h-[44px] mt-3 rounded-xl border px-4" onClick={hourly.retry}>Reintentar</button>}
              </div>
            )}
          </div>
        </main>

        <MobileNavigation />
        {timelapseKey && timelapseKey === selectedHourKey && reviewSelection && viewer && selectedHorse && (
          <HourlyTimelapse key={timelapseKey} horseId={selectedHorseId} horseName={selectedHorse.name}
            viewer={viewer} day={reviewSelection.day} hour={reviewSelection.hour}
            photoBackend={records.find(row => row.id === selectedHorseId)?.photo_backend}
            onClose={() => setTimelapseKey(null)} />
        )}
        {expandedPhoto && expandedPhoto.horseId === selectedHorseId && selectedHorse && !isLoadingHorses && (
          <FullscreenPhoto
            src={displayedObservations.find(photo => photo.id === expandedPhoto.id)?.imageUrl || expandedPhoto.imageUrl}
            alt={expandedPhoto.imageAlt} onClose={() => setExpandedPhoto(null)} />
        )}

      </div>
    </>
  );
};

export default HorseTimeline;
