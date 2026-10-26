import { createStartupMeasurement, StartupMeasurement } from "./measurement";
import type { PilotSession } from "./api";
import { NO_ACCESS_MESSAGE } from "./access";

interface Callbacks {
  request: (path: string, signal: AbortSignal) => Promise<PilotSession>;
  onStatus: (status: string) => void;
  onError: (message: string) => void;
  onMeasurement: (result: StartupMeasurement) => void;
  onThreshold: () => void;
  onMoving: () => void;
}

export function startPilotPlayback(
  video: HTMLVideoElement,
  cameraId: string,
  callbacks: Callbacks,
  measurement = createStartupMeasurement(),
  prepareOnly = false,
) {
  const controller = new AbortController();
  const { signal } = controller;
  let disposed = false;
  let measured = false;
  let hls:
    | {
        destroy: () => void;
        liveSyncPosition?: number | null;
        latency?: number;
        startLoad?: () => void;
        recoverMediaError?: () => void;
      }
    | undefined;
  let activated = !prepareOnly;
  let frameCallback: number | undefined;
  let renewal: ReturnType<typeof setTimeout> | undefined;
  let statusTimer: ReturnType<typeof setTimeout> | undefined;
  let lastFrame = performance.now();
  let lastMediaTime = -1;
  let watchdogMediaTime = -1;
  let stage = "Autorizando cámara";
  let lastHlsError = "";
  let recoveryTimer: ReturnType<typeof setTimeout> | undefined;
  let recoveryAttempts = 0;
  let recoveryStarted = 0;
  let lastRecoveryAttempt = -Infinity;
  let statusFailureSince: number | undefined;
  let renewalFailures = 0;
  let buffering = false;
  let stalls = 0;
  let recoveries = 0;
  const supported = typeof video.requestVideoFrameCallback === "function";
  let threshold: ReturnType<typeof setTimeout> | undefined;
  let deadline: ReturnType<typeof setTimeout> | undefined;
  function armMeasurement() {
    threshold = setTimeout(
      callbacks.onThreshold,
      Math.max(0, 3000 - measurement.elapsed()),
    );
    deadline = setTimeout(
      () => {
        const detail =
          video.readyState === 0
            ? "No se recibieron metadatos del vídeo."
            : video.readyState === 1
              ? "Se recibieron metadatos, pero todavía no hay fotogramas decodificados."
              : "Se recibieron datos, pero no se confirmó avance de los fotogramas.";
        fail(
          `No se confirmaron fotogramas avanzando en 12 segundos. ${stage}. ${detail}${lastHlsError ? ` ${lastHlsError}` : ""}`,
        );
      },
      Math.max(0, 12_000 - measurement.elapsed()),
    );
  }
  if (activated) armMeasurement();
  const watchdog = setInterval(() => {
    if (disposed || !measured || !activated) return;
    if (video.paused || (typeof document !== "undefined" && document.hidden)) {
      lastFrame = performance.now();
      return;
    }
    // Occluded windows can throttle presentation callbacks while media advances.
    // Startup still requires presented frames; do not restart healthy playback.
    if (
      !video.paused &&
      video.readyState >= 2 &&
      video.currentTime > watchdogMediaTime
    ) {
      watchdogMediaTime = video.currentTime;
      lastFrame = performance.now();
    }
    const stoppedFor = performance.now() - lastFrame;
    if (stoppedFor > 20_000)
      fail(
        "No se pudo recuperar el vídeo; comprueba la conexión de la cámara.",
      );
    else if (stoppedFor > 8000) recover("network", "watchdog");
  }, 1000);

  function record(outcome?: "failed" | "cancelled", message?: string) {
    if (measured || !activated) return;
    measured = true;
    clearTimeout(threshold);
    clearTimeout(deadline);
    callbacks.onMeasurement(measurement.finish(outcome, message, supported));
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    controller.abort();
    clearTimeout(threshold);
    clearTimeout(deadline);
    clearInterval(watchdog);
    clearTimeout(renewal);
    clearTimeout(statusTimer);
    clearTimeout(recoveryTimer);
    if (frameCallback !== undefined)
      video.cancelVideoFrameCallback(frameCallback);
    video.removeEventListener("error", videoError);
    video.removeEventListener("loadeddata", loaded);
    video.removeEventListener("waiting", waiting);
    hls?.destroy();
    video.pause();
    video.removeAttribute("src");
    video.load();
  }
  function fail(message: string) {
    if (disposed) return;
    // No credentials, identifiers, signed URLs or raw network responses.
    console.warn("[HLS playback]", {
      stage,
      readyState: video.readyState,
      networkState: video.networkState,
      elapsedMs: Math.round(measurement.elapsed()),
      detail: lastHlsError,
    });
    record("failed", message);
    callbacks.onStatus("Conexión interrumpida");
    callbacks.onError(message);
    dispose();
  }
  function videoError() {
    if (video.error?.code === 2 && measured) {
      recover("network", "video");
      return;
    }
    fail(
      `El navegador no pudo reproducir el vídeo H.264 (código ${video.error?.code ?? "desconocido"}).`,
    );
  }
  function waiting() {
    if (!activated || !measured || disposed || buffering || video.paused)
      return;
    buffering = true;
    stalls++;
    if (video.dataset) video.dataset.liveStalls = String(stalls);
    callbacks.onStatus("Ajustando la conexión");
  }
  function recover(
    kind: "network" | "media",
    trigger: "hls" | "video" | "watchdog" = "hls",
  ) {
    if (disposed || recoveryTimer !== undefined) return;
    const now = performance.now();
    if (now - lastRecoveryAttempt < 2000) return;
    lastRecoveryAttempt = now;
    if (!recoveryStarted || now - recoveryStarted > 30_000) {
      recoveryStarted = now;
      recoveryAttempts = 0;
    }
    if (++recoveryAttempts > 3) {
      fail("No se pudo recuperar la transmisión; vuelve a abrir el vídeo.");
      return;
    }
    recoveries++;
    buffering = true;
    if (video.dataset) video.dataset.liveRecoveries = String(recoveries);
    if (video.dataset) video.dataset.liveLastRecovery = `${trigger}:${kind}`;
    console.info("[HLS recovery]", { trigger, kind, detail: lastHlsError });
    callbacks.onStatus("Recuperando conexión");
    recoveryTimer = setTimeout(
      () => {
        recoveryTimer = undefined;
        if (disposed) return;
        if (kind === "media" && hls?.recoverMediaError) hls.recoverMediaError();
        else if (hls?.startLoad) hls.startLoad();
        else {
          video.load();
          play();
        }
      },
      Math.min(250 * 2 ** (recoveryAttempts - 1), 1500),
    );
  }
  function setStage(value: string) {
    stage = value;
    callbacks.onStatus(value);
  }
  function play() {
    if (!activated) return;
    video
      .play()
      .catch(() =>
        fail(
          "El navegador bloqueó la reproducción; vuelve a pulsar Ver vídeo.",
        ),
      );
  }
  function loaded() {
    measurement.mark("connectionReadyMs");
    play();
  }
  function frame(_now: number, metadata: VideoFrameCallbackMetadata) {
    if (disposed) return;
    if (metadata.mediaTime > lastMediaTime) {
      lastFrame = performance.now();
      lastMediaTime = metadata.mediaTime;
      if (video.dataset) {
        video.dataset.livePresentedFrames = String(metadata.presentedFrames);
        const end = video.buffered?.length
          ? video.buffered.end(video.buffered.length - 1)
          : video.currentTime;
        video.dataset.liveBufferSeconds = Math.max(
          0,
          end - video.currentTime,
        ).toFixed(3);
        if (typeof hls?.latency === "number" && Number.isFinite(hls.latency))
          video.dataset.liveEdgeDistanceSeconds = hls.latency.toFixed(3);
      }
      if (buffering && measured) {
        buffering = false;
        callbacks.onStatus("Reproduciendo · retraso real no medido");
      }
      if (recoveryStarted && performance.now() - recoveryStarted > 10_000) {
        recoveryAttempts = 0;
        recoveryStarted = 0;
      }
    }
    if (
      activated &&
      measurement.frame(metadata.mediaTime, metadata.presentedFrames) &&
      !measured
    ) {
      record();
      callbacks.onStatus("Reproduciendo · retraso real no medido");
      callbacks.onMoving();
    }
    frameCallback = video.requestVideoFrameCallback(frame);
  }
  async function checkStatus() {
    if (disposed) return;
    try {
      const response = await fetch(`/api/hls-pilot/media/${cameraId}/status`, {
        credentials: "same-origin",
        cache: "no-store",
        signal,
      });
      if (!response.ok) {
        if (response.status === 401 || response.status === 403)
          throw new Error(NO_ACCESS_MESSAGE);
        const body = await response.json().catch(() => ({}));
        const reason =
          typeof body.error === "string"
            ? body.error
            : "Receptor no disponible.";
        throw new Error(
          `Estado de la cámara: HTTP ${response.status}. ${reason}`,
        );
      }
      const status = await response.json();
      if (!status.ready)
        throw new Error("Cámara desconectada o preparando segmentos.");
      statusFailureSince = undefined;
      statusTimer = setTimeout(checkStatus, 3000);
    } catch (error) {
      if (disposed || signal.aborted) return;
      if (error instanceof Error && error.message === NO_ACCESS_MESSAGE) {
        fail(NO_ACCESS_MESSAGE);
        return;
      }
      statusFailureSince ??= performance.now();
      if (performance.now() - statusFailureSince >= 15_000) {
        fail(
          "La cámara no recuperó la conexión. Comprueba su red y alimentación.",
        );
        return;
      }
      // Keep already buffered frames and let HLS recover a temporary outage.
      callbacks.onStatus("Recuperando señal de la cámara");
      buffering = true;
      statusTimer = setTimeout(checkStatus, 1000);
    }
  }
  async function renew() {
    if (disposed) return;
    try {
      await callbacks.request(`session/${cameraId}`, signal);
      renewalFailures = 0;
      if (!disposed) renewal = setTimeout(renew, 45_000);
    } catch (error) {
      if (disposed || signal.aborted) return;
      if (error instanceof Error && error.message === NO_ACCESS_MESSAGE) {
        fail(NO_ACCESS_MESSAGE);
        return;
      }
      if (++renewalFailures >= 3)
        fail("No se pudo renovar el acceso a esta cámara.");
      else renewal = setTimeout(renew, 2000);
    }
  }
  async function connect() {
    try {
      setStage("Autorizando cámara");
      const session = await callbacks.request(`session/${cameraId}`, signal);
      if (disposed) return;
      measurement.mark("authorizationMs");
      if (!session.ready)
        throw new Error(
          "Cámara desconectada o preparando segmentos; prueba cuando esté lista.",
        );
      if (session.playbackUrl !== `/api/hls-pilot/media/${cameraId}/index.m3u8`)
        throw new Error("Dirección de reproducción no válida.");
      if (!supported)
        throw new Error(
          "Este navegador no permite medir fotogramas presentados. Actualízalo para validar el piloto.",
        );
      video.muted = true;
      video.playsInline = true;
      // Preloading is permitted only after server authorization. On activation,
      // play immediately: native HLS must not wait for loadeddata to start.
      video.preload = "auto";
      video.addEventListener("error", videoError);
      video.addEventListener("loadeddata", loaded);
      video.addEventListener("waiting", waiting);
      if (video.dataset) {
        video.dataset.liveStalls = "0";
        video.dataset.liveRecoveries = "0";
      }
      frameCallback = video.requestVideoFrameCallback(frame);
      // Safari retains native HLS. Chromium uses MSE even when it also advertises
      // native HLS, so the continuity and live-edge policy remains configurable.
      const nativeHls = video.canPlayType("application/vnd.apple.mpegurl");
      if (
        nativeHls &&
        (typeof navigator === "undefined" || /Apple/.test(navigator.vendor))
      ) {
        if (video.dataset) video.dataset.liveEngine = "native";
        setStage("Solicitando vídeo HLS al receptor");
        measurement.mark("playerReadyMs");
        video.src = session.playbackUrl;
        video.load();
        play();
      } else {
        setStage("Preparando reproductor HLS");
        // Loaded only for an authorized camera, including bounded timeline preloading.
        const { default: Hls } = await import("hls.js");
        if (disposed) return;
        if (!Hls.isSupported()) {
          if (!nativeHls)
            throw new Error("HLS no está disponible en este navegador.");
          if (video.dataset) video.dataset.liveEngine = "native";
          video.src = session.playbackUrl;
          video.load();
          play();
          renewal = setTimeout(renew, 45_000);
          statusTimer = setTimeout(checkStatus, 3000);
          return;
        }
        if (video.dataset) video.dataset.liveEngine = "mse";
        const player = new Hls({
          enableWorker: false,
          lowLatencyMode: false,
          // Seconds, not multiples of the receiver's conservative TARGETDURATION.
          liveSyncDuration: 3,
          liveMaxLatencyDuration: 12,
          liveSyncOnStallIncrease: 1,
          maxLiveSyncPlaybackRate: 1.01,
          maxBufferLength: 8,
          maxMaxBufferLength: 12,
          backBufferLength: 4,
          maxBufferSize: 12 * 1024 * 1024,
        });
        hls = player;
        player.on(Hls.Events.ERROR, (_event, data) => {
          lastHlsError = `HLS: ${data.details}${data.response?.code ? ` · HTTP ${data.response.code}` : ""}.`;
          if (video.dataset) {
            video.dataset.liveLastHlsError = String(data.details);
            video.dataset.liveLastHlsFatal = String(data.fatal === true);
            if (data.fatal) {
              video.dataset.liveLastFatalError = String(data.details);
              video.dataset.liveLastFatalType = String(data.type);
              video.dataset.liveLastFatalCode = String(
                data.response?.code ?? 0,
              );
            }
          }
          if (data.response?.code === 401 || data.response?.code === 403) {
            fail(NO_ACCESS_MESSAGE);
            return;
          }
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR) recover("network");
            else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) recover("media");
            else fail(`Se interrumpió HLS. ${lastHlsError}`);
          }
        });
        player.on(Hls.Events.MANIFEST_PARSED, () => {
          measurement.mark("connectionReadyMs");
          setStage("Lista HLS recibida; solicitando fotogramas");
          play();
        });
        setStage("Solicitando la lista HLS al receptor");
        player.attachMedia(video);
        player.loadSource(session.playbackUrl);
        measurement.mark("playerReadyMs");
      }
      if (!disposed) {
        renewal = setTimeout(renew, 45_000);
        statusTimer = setTimeout(checkStatus, 3000);
      }
    } catch (error) {
      if (!disposed)
        fail(
          error instanceof Error
            ? error.message
            : "No se pudo abrir la cámara.",
        );
    }
  }
  void connect();
  const stop = () => {
    record("cancelled");
    dispose();
  };
  stop.activate = (
    clickMeasurement: ReturnType<typeof createStartupMeasurement>,
  ) => {
    if (disposed || activated) return;
    measurement = clickMeasurement;
    activated = true;
    armMeasurement();
    // A paused prebuffer can be behind the current live window.
    const livePosition = hls?.liveSyncPosition;
    if (typeof livePosition === "number" && Number.isFinite(livePosition))
      video.currentTime = livePosition;
    else if (video.seekable.length)
      video.currentTime = Math.max(
        video.seekable.start(0),
        video.seekable.end(video.seekable.length - 1) - 2,
      );
    hls?.startLoad?.();
    if (video.src || hls) play();
  };
  return stop;
}
