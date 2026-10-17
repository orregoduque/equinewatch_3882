export interface StartupMeasurement {
  outcome: 'within-target' | 'over-target' | 'failed' | 'cancelled';
  clickToMotionMs: number | null;
  elapsedMs: number;
  authorizationMs: number | null;
  playerReadyMs: number | null;
  connectionReadyMs: number | null;
  firstFrameMs: number | null;
  targetMs: 3000;
  measurementMethod: 'video-frame-callback' | 'unavailable';
  error?: string;
}

export function createStartupMeasurement(clock = () => performance.now()) {
  const click = clock();
  const marks: Record<string, number> = {};
  let firstMediaTime: number | null = null;
  let firstFrames = 0;
  let finished: StartupMeasurement | null = null;
  return {
    mark(name: 'authorizationMs' | 'playerReadyMs' | 'connectionReadyMs') {
      marks[name] ??= clock() - click;
    },
    frame(mediaTime: number, presentedFrames: number) {
      if (!Number.isFinite(mediaTime)) return false;
      marks.firstFrameMs ??= clock() - click;
      if (firstMediaTime === null) { firstMediaTime = mediaTime; firstFrames = presentedFrames; return false; }
      return mediaTime > firstMediaTime && presentedFrames > firstFrames;
    },
    finish(outcome?: 'failed' | 'cancelled', error?: string, supported = true): StartupMeasurement {
      if (finished) return finished;
      const elapsed = clock() - click;
      finished = {
        outcome: outcome || (elapsed <= 3000 ? 'within-target' : 'over-target'),
        elapsedMs: elapsed, clickToMotionMs: outcome ? null : elapsed,
        authorizationMs: marks.authorizationMs ?? null,
        playerReadyMs: marks.playerReadyMs ?? null,
        connectionReadyMs: marks.connectionReadyMs ?? null,
        firstFrameMs: marks.firstFrameMs ?? null,
        targetMs: 3000, measurementMethod: supported ? 'video-frame-callback' : 'unavailable',
        ...(error ? { error } : {}),
      };
      return finished;
    },
  };
}
