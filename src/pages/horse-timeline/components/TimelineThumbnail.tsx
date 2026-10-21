import React, { useEffect, useRef, useState } from 'react';

interface TimelineThumbnailProps {
  src: string;
  originalSrc: string;
  alt: string;
  scrollRoot: React.RefObject<HTMLDivElement>;
  enabled: boolean;
}

/** Attach once near the strip, after the main photo settles; retain visited images. */
export default function TimelineThumbnail({
  src, originalSrc, alt, scrollRoot, enabled,
}: TimelineThumbnailProps) {
  const slot = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [fallback, setFallback] = useState(0);

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
      {nearViewport && (
        <img
          src={fallback === 0 ? src : fallback === 1 ? originalSrc : '/assets/images/no_image.png'}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-contain"
          onError={fallback < 2 ? () => setFallback(stage => Math.min(stage + 1, 2)) : undefined}
        />
      )}
    </div>
  );
}
