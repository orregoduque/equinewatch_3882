import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface FullscreenPhotoProps {
  src: string;
  alt: string;
  onClose: () => void;
}

type Point = { x: number; y: number };

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

export default function FullscreenPhoto({ src, alt, onClose }: FullscreenPhotoProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const closeRef = useRef(onClose);
  const pointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<{
    distance: number;
    zoom: number;
    pan: Point;
    center: Point;
  } | null>(null);
  const dragRef = useRef<{ pointer: Point; pan: Point } | null>(null);
  const tapRef = useRef<{ time: number; point: Point } | null>(null);
  const gestureRef = useRef<{ start: Point; moved: boolean; pinched: boolean } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState(false);

  closeRef.current = onClose;

  const constrainPan = useCallback((nextPan: Point, nextZoom: number) => {
    const stage = stageRef.current;
    const image = imageRef.current;
    if (!stage || !image?.naturalWidth || !image.naturalHeight) return nextPan;

    const stageWidth = stage.clientWidth;
    const stageHeight = stage.clientHeight;
    const ratio = image.naturalWidth / image.naturalHeight;
    const baseWidth = Math.min(stageWidth, stageHeight * ratio);
    const baseHeight = baseWidth / ratio;
    const maxX = Math.max(0, (baseWidth * nextZoom - stageWidth) / 2);
    const maxY = Math.max(0, (baseHeight * nextZoom - stageHeight) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, nextPan.x)),
      y: Math.max(-maxY, Math.min(maxY, nextPan.y)),
    };
  }, []);

  const updateView = useCallback((nextZoom: number, nextPan: Point) => {
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, nextZoom));
    const constrainedPan = clampedZoom === 1
      ? { x: 0, y: 0 }
      : constrainPan(nextPan, clampedZoom);
    setZoom(clampedZoom);
    setPan(constrainedPan);
  }, [constrainPan]);

  const resetView = useCallback(() => updateView(1, { x: 0, y: 0 }), [updateView]);

  useEffect(() => {
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = stageRef.current?.parentElement;
      const focusable = dialog?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable?.length) {
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, []);

  useEffect(() => {
    const handleResize = () => updateView(zoom, pan);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [zoom, pan, updateView]);

  const pointFromEvent = (event: React.PointerEvent): Point => ({
    x: event.clientX,
    y: event.clientY,
  });

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = pointFromEvent(event);
    pointersRef.current.set(event.pointerId, point);

    if (pointersRef.current.size === 2) {
      if (gestureRef.current) gestureRef.current.pinched = true;
      tapRef.current = null;
      const [first, second] = Array.from(pointersRef.current.values());
      pinchRef.current = {
        distance: Math.max(1, distance(first, second)),
        zoom,
        pan,
        center: midpoint(first, second),
      };
      dragRef.current = null;
    } else if (pointersRef.current.size === 1) {
      gestureRef.current = { start: point, moved: false, pinched: false };
      dragRef.current = { pointer: point, pan };
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointersRef.current.has(event.pointerId)) return;
    const point = pointFromEvent(event);
    if (gestureRef.current && distance(point, gestureRef.current.start) > 12)
      gestureRef.current.moved = true;
    pointersRef.current.set(event.pointerId, point);

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const [first, second] = Array.from(pointersRef.current.values());
      const pinch = pinchRef.current;
      const nextZoom = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, pinch.zoom * (distance(first, second) / pinch.distance)),
      );
      const center = midpoint(first, second);
      updateView(nextZoom, {
        x: pinch.pan.x + center.x - pinch.center.x,
        y: pinch.pan.y + center.y - pinch.center.y,
      });
      return;
    }

    if (pointersRef.current.size === 1 && dragRef.current && zoom > 1) {
      updateView(zoom, {
        x: dragRef.current.pan.x + point.x - dragRef.current.pointer.x,
        y: dragRef.current.pan.y + point.y - dragRef.current.pointer.y,
      });
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = pointFromEvent(event);
    const wasTap = event.type !== 'pointercancel' && pointersRef.current.size === 1
      && gestureRef.current && !gestureRef.current.moved && !gestureRef.current.pinched;
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
    if (pointersRef.current.size === 1) {
      const remaining = Array.from(pointersRef.current.values())[0];
      dragRef.current = { pointer: remaining, pan };
    } else {
      dragRef.current = null;
    }

    const now = Date.now();
    if (!wasTap) {
      tapRef.current = null;
      return;
    }
    const previousTap = tapRef.current;
    if (
      previousTap
      && now - previousTap.time < 320
      && distance(point, previousTap.point) < 28
    ) {
      resetView();
      tapRef.current = null;
    } else {
      tapRef.current = { time: now, point };
    }
  };

  useEffect(() => {
    const stage = stageRef.current;
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      updateView(zoom * Math.exp(-event.deltaY * 0.002), pan);
    };
    stage?.addEventListener('wheel', handleWheel, { passive: false });
    return () => stage?.removeEventListener('wheel', handleWheel);
  }, [zoom, pan, updateView]);

  const handleDoubleClick = () => resetView();

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Foto ampliada"
      className="fixed inset-0 z-[120] flex h-[100dvh] flex-col overflow-hidden bg-[#151411] text-[#f3eee5]"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeRef.current();
      }}
    >
      <div className="relative z-10 flex min-h-[76px] items-center justify-between px-4 pt-[env(safe-area-inset-top)] sm:px-6">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#b9ae9d]">
            Stable Eye
          </span>
          <span className="text-sm text-[#e4ddd1]">Vista de cámara</span>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Cerrar foto ampliada"
          onClick={() => closeRef.current()}
          className="flex h-12 w-12 items-center justify-center rounded-full border border-[#777064]/50 bg-[#282620] text-[#f3eee5] transition-colors hover:bg-[#3a372f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4c5a9]"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none">
            <path d="m6 6 12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div
        ref={stageRef}
        className="relative flex min-h-0 flex-1 touch-none select-none items-center justify-center overflow-hidden"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(event) => event.preventDefault()}
        aria-label="Área de foto. Pellizca o desplaza para ampliar y mover."
      >
        {!imageLoaded && (
          <div
            aria-hidden="true"
            className="absolute inset-8 animate-pulse rounded-xl bg-[#292720]"
          />
        )}
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          draggable={false}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)}
          className="pointer-events-none max-h-full max-w-full object-contain"
          style={{
            maxHeight: '100%',
            maxWidth: '100%',
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: 'transform 90ms ease-out',
            visibility: imageLoaded ? 'visible' : 'hidden',
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-[76px] items-center justify-between gap-4 px-4 pb-[env(safe-area-inset-bottom)] sm:px-6">
        <div
          className="rounded-full border border-[#777064]/40 bg-[#25231e] px-3.5 py-2 font-mono text-xs tabular-nums text-[#e7dfd2]"
          aria-live="polite"
          aria-label={`Ampliación ${Math.round(zoom * 100)} por ciento`}
        >
          {Math.round(zoom * 100)}%
        </div>
        <button
          type="button"
          onClick={resetView}
          disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
          className="flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#777064]/50 bg-[#282620] px-4 text-sm font-medium text-[#f3eee5] transition-colors hover:bg-[#3a372f] disabled:cursor-default disabled:opacity-45 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d4c5a9]"
        >
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
            <path d="M3.5 8A6.5 6.5 0 0 1 15 4.4L17 6.3M16.5 12A6.5 6.5 0 0 1 5 15.6L3 13.7M17 3.8v2.8h-2.8M3 16.2v-2.8h2.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Restablecer
        </button>
      </div>
    </div>,
    document.body,
  );
}
