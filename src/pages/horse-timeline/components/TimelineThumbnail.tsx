import React, { useEffect, useRef, useState } from 'react';
import { loadPrivatePhoto, type CameraImage, type HorseViewer } from '../../../utils/supabase';

interface TimelineThumbnailProps {
  src: string;
  originalSrc: string;
  alt: string;
  scrollRoot: React.RefObject<HTMLDivElement>;
  enabled: boolean;
  privateImage?: CameraImage;
  viewer?: HorseViewer | null;
}

/** Attach once near the strip, after the main photo settles; retain visited images. */
export default function TimelineThumbnail({
  src, originalSrc, alt, scrollRoot, enabled, privateImage, viewer,
}: TimelineThumbnailProps) {
  const slot = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [fallback, setFallback] = useState(0);
  const [privateSrc, setPrivateSrc] = useState('');
  const [privateFailed, setPrivateFailed] = useState(false);
  useEffect(() => {
    if (!privateImage || !viewer || !nearViewport || !enabled) return;
    const controller = new AbortController();
    setPrivateFailed(false);
    loadPrivatePhoto(privateImage, viewer, controller.signal)
      .then(image => { if (!controller.signal.aborted) setPrivateSrc((image.photo_url || image.imageUrl)!); })
      .catch(() => { if (!controller.signal.aborted) { setPrivateSrc(''); setPrivateFailed(true); } });
    return () => controller.abort();
  }, [nearViewport, enabled, privateImage?.id, privateImage?.horse_id,
    privateImage?.imageUrl, privateImage?.expiresAt, viewer?.id]);
  // A renewed private URL must recover from a previous expiry without unmounting the slot.
  useEffect(() => setFallback(0), [src]);

  useEffect(() => {
    if (!enabled || nearViewport || !slot.current || !scrollRoot.current) return;
    if (typeof IntersectionObserver === 'undefined') {
      setNearViewport(true); // Older browsers still retain native lazy loading.
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { root: scrollRoot.current, rootMargin: '0px 320px', threshold: 0 });
    observer.observe(slot.current);
    return () => observer.disconnect();
  }, [scrollRoot, enabled, nearViewport]);

  return (
    <div ref={slot} className="aspect-[4/3] bg-black/20">
      {nearViewport && (!privateImage || privateSrc || privateFailed) && (
        <img
          src={privateImage ? privateFailed ? '/assets/images/no_image.png' : privateSrc
            : fallback === 0 ? src : fallback === 1 ? originalSrc : '/assets/images/no_image.png'}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain"
          onError={privateImage ? () => setPrivateFailed(true)
            : fallback < 2 ? () => setFallback(stage => Math.min(stage + 1, 2)) : undefined}
        />
      )}
    </div>
  );
}
