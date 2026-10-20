import React, { useEffect, useState } from 'react';
import Image from './AppImage';
import { useAuth } from '../contexts/AuthContext';
import { fetchCameraPhotoFallback } from '../features/horse-details/photoFallback';

interface HorseProfilePhotoProps {
  horseId: string;
  profilePhotoUrl: string | null | undefined;
  alt: string;
  className?: string;
}

export default function HorseProfilePhoto({
  horseId, profilePhotoUrl, alt, className,
}: HorseProfilePhotoProps) {
  const { user } = useAuth();
  const profilePhoto = profilePhotoUrl?.trim() || '';
  const scope = JSON.stringify([horseId, profilePhoto, user?.id, user?.email, user?.role]);
  const [fallback, setFallback] = useState({ scope: '', url: '', error: '' });

  useEffect(() => {
    // A saved profile URL is authoritative. Even a broken URL must not trigger
    // a camera query; the ordinary unavailable-image placeholder handles that.
    if (profilePhoto || !user) return;
    const controller = new AbortController();
    fetchCameraPhotoFallback(horseId, user, controller.signal).then(
      url => {
        if (!controller.signal.aborted) setFallback({ scope, url: url || '', error: '' });
      },
      error => {
        if (!controller.signal.aborted) setFallback({
          scope, url: '',
          error: error instanceof Error ? error.message : 'No se pudo cargar la foto.',
        });
      },
    );
    return () => controller.abort();
  }, [scope]);

  const current = fallback.scope === scope;
  const src = profilePhoto || (current ? fallback.url : '') || '/assets/images/no_image.png';
  return <Image key={src} src={src} alt={alt} className={className}
    title={current && fallback.error ? fallback.error : undefined} />;
}
