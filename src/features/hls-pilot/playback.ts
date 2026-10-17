import { createStartupMeasurement, StartupMeasurement } from './measurement';
import type { PilotSession } from './api';
import { NO_ACCESS_MESSAGE } from './access';

interface Callbacks {
  request: (path: string, signal: AbortSignal) => Promise<PilotSession>;
  onStatus: (status: string) => void;
  onError: (message: string) => void;
  onMeasurement: (result: StartupMeasurement) => void;
  onThreshold: () => void;
  onMoving: () => void;
}

export function startPilotPlayback(
  video: HTMLVideoElement, cameraId: string, callbacks: Callbacks,
  measurement = createStartupMeasurement(),
) {
  const controller = new AbortController();
  const { signal } = controller;
  let disposed = false;
  let measured = false;
  let hls: { destroy: () => void } | undefined;
  let frameCallback: number | undefined;
  let renewal: ReturnType<typeof setTimeout> | undefined;
  let statusTimer: ReturnType<typeof setTimeout> | undefined;
  let lastFrame = performance.now();
  let lastMediaTime = -1;
  let stage = 'Autorizando cámara';
  let lastHlsError = '';
  const supported = typeof video.requestVideoFrameCallback === 'function';
  const threshold = setTimeout(callbacks.onThreshold, Math.max(0, 3000 - measurement.elapsed()));
  const deadline = setTimeout(() => {
    const detail = video.readyState === 0
      ? 'No se recibieron metadatos del vídeo.'
      : video.readyState === 1
        ? 'Se recibieron metadatos, pero todavía no hay fotogramas decodificados.'
        : 'Se recibieron datos, pero no se confirmó avance de los fotogramas.';
    fail(`No se confirmaron fotogramas avanzando en 12 segundos. ${stage}. ${detail}${lastHlsError ? ` ${lastHlsError}` : ''}`);
  },
    Math.max(0, 12_000 - measurement.elapsed()));
  const watchdog = setInterval(() => {
    if (!disposed && measured && performance.now() - lastFrame > 8000)
      fail('Vídeo detenido: ya no avanzan los fotogramas.');
  }, 1000);

  function record(outcome?: 'failed' | 'cancelled', message?: string) {
    if (measured) return;
    measured = true;
    clearTimeout(threshold);
    clearTimeout(deadline);
    callbacks.onMeasurement(measurement.finish(outcome, message, supported));
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    controller.abort();
    clearTimeout(threshold); clearTimeout(deadline);
    clearInterval(watchdog);
    clearTimeout(renewal); clearTimeout(statusTimer);
    if (frameCallback !== undefined) video.cancelVideoFrameCallback(frameCallback);
    video.removeEventListener('error', videoError);
    video.removeEventListener('loadeddata', loaded);
    hls?.destroy();
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
  function fail(message: string) {
    if (disposed) return;
    // No credentials, identifiers, signed URLs or raw network responses.
    console.warn('[HLS playback]', {
      stage, readyState: video.readyState, networkState: video.networkState,
      elapsedMs: Math.round(measurement.elapsed()), detail: lastHlsError,
    });
    record('failed', message);
    callbacks.onStatus('Conexión interrumpida');
    callbacks.onError(message);
    dispose();
  }
  function videoError() {
    fail(`El navegador no pudo reproducir el vídeo H.264 (código ${video.error?.code ?? 'desconocido'}).`);
  }
  function setStage(value: string) {
    stage = value;
    callbacks.onStatus(value);
  }
  function play() {
    video.play().catch(() => fail('El navegador bloqueó la reproducción; vuelve a pulsar Ver vídeo.'));
  }
  function loaded() {
    measurement.mark('connectionReadyMs');
    play();
  }
  function frame(_now: number, metadata: VideoFrameCallbackMetadata) {
    if (disposed) return;
    if (metadata.mediaTime > lastMediaTime) {
      lastFrame = performance.now();
      lastMediaTime = metadata.mediaTime;
    }
    if (measurement.frame(metadata.mediaTime, metadata.presentedFrames) && !measured) {
      record();
      callbacks.onStatus('Reproduciendo · retraso real no medido');
      callbacks.onMoving();
    }
    frameCallback = video.requestVideoFrameCallback(frame);
  }
  async function checkStatus() {
    if (disposed) return;
    try {
      const response = await fetch(`/api/hls-pilot/media/${cameraId}/status`, {
        credentials: 'same-origin', cache: 'no-store', signal,
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) throw new Error(NO_ACCESS_MESSAGE);
        const body = await response.json().catch(() => ({}));
        const reason = typeof body.error === 'string' ? body.error : 'Receptor no disponible.';
        throw new Error(`Estado de la cámara: HTTP ${response.status}. ${reason}`);
      }
      const status = await response.json();
      if (!status.ready) throw new Error('Cámara desconectada o preparando segmentos.');
      if (measured && performance.now() - lastFrame > 8000)
        throw new Error('Vídeo detenido: ya no avanzan los fotogramas.');
      statusTimer = setTimeout(checkStatus, 3000);
    } catch (error) { if (!disposed) fail(error instanceof Error ? error.message : 'No se pudo comprobar la cámara.'); }
  }
  async function renew() {
    if (disposed) return;
    try {
      await callbacks.request(`session/${cameraId}`, signal);
      if (!disposed) renewal = setTimeout(renew, 45_000);
    } catch { if (!disposed) fail('No se pudo renovar el acceso a esta cámara.'); }
  }
  async function connect() {
    try {
      setStage('Autorizando cámara');
      const session = await callbacks.request(`session/${cameraId}`, signal);
      if (disposed) return;
      measurement.mark('authorizationMs');
      if (!session.ready) throw new Error('Cámara desconectada o preparando segmentos; prueba cuando esté lista.');
      if (session.playbackUrl !== `/api/hls-pilot/media/${cameraId}/index.m3u8`)
        throw new Error('Dirección de reproducción no válida.');
      if (!supported) throw new Error('Este navegador no permite medir fotogramas presentados. Actualízalo para validar el piloto.');
      video.muted = true;
      video.playsInline = true;
      // Set only after a click and authorization. `preload=none` + waiting for
      // loadeddata before play can deadlock native HLS on real browsers.
      video.preload = 'auto';
      video.addEventListener('error', videoError);
      video.addEventListener('loadeddata', loaded);
      frameCallback = video.requestVideoFrameCallback(frame);
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        setStage('Solicitando vídeo HLS al receptor');
        measurement.mark('playerReadyMs');
        video.src = session.playbackUrl;
        video.load();
        play();
      } else {
        setStage('Preparando reproductor HLS');
        // Optional chunk, imported AFTER the click; its load time is included in the measurement.
        const { default: Hls } = await import('hls.js');
        if (disposed) return;
        if (!Hls.isSupported()) throw new Error('HLS no está disponible en este navegador.');
        const player = new Hls({
          enableWorker: false, lowLatencyMode: false, liveSyncDurationCount: 3,
          maxBufferLength: 6, maxMaxBufferLength: 10, backBufferLength: 0,
          maxBufferSize: 8 * 1024 * 1024,
        });
        hls = player;
        player.on(Hls.Events.ERROR, (_event, data) => {
          lastHlsError = `HLS: ${data.details}${data.response?.code ? ` · HTTP ${data.response.code}` : ''}.`;
          if (data.fatal) fail(`Se interrumpió HLS. ${lastHlsError} Vuelve a abrir el vídeo para reconectar.`);
        });
        player.on(Hls.Events.MANIFEST_PARSED, () => {
          measurement.mark('connectionReadyMs');
          setStage('Lista HLS recibida; solicitando fotogramas');
          play();
        });
        setStage('Solicitando la lista HLS al receptor');
        player.attachMedia(video);
        player.loadSource(session.playbackUrl);
        measurement.mark('playerReadyMs');
      }
      if (!disposed) {
        renewal = setTimeout(renew, 45_000);
        statusTimer = setTimeout(checkStatus, 3000);
      }
    } catch (error) {
      if (!disposed) fail(error instanceof Error ? error.message : 'No se pudo abrir la cámara.');
    }
  }
  void connect();
  return () => { record('cancelled'); dispose(); };
}
