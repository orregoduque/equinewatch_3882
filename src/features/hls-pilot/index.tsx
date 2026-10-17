import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { pilotRequest, PilotCamera, PilotSession } from './api';
import { createStartupMeasurement, StartupMeasurement } from './measurement';
import { startPilotPlayback } from './playback';
import PilotView from './PilotView';

export default function HlsPilotPage() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [cameras, setCameras] = useState<PilotCamera[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [status, setStatus] = useState('Sin conexión');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [thresholdExceeded, setThresholdExceeded] = useState(false);
  const [results, setResults] = useState<StartupMeasurement[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const connection = useRef<(() => void) | null>(null);
  const reloadController = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const identity = useRef(user?.id);
  identity.current = user?.id;
  const stop = () => {
    connection.current?.();
    connection.current = null;
    setBusy(false);
    setStatus('Sin conexión');
  };

  const reload = async () => {
    stop();
    reloadController.current?.abort();
    const controller = new AbortController();
    reloadController.current = controller;
    setError(''); setCameras([]); setSelectedId('');
    try {
      const response = await fetch('/api/hls-pilot/config', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('No se pudo consultar el piloto.');
      const config = await response.json();
      setEnabled(config.enabled === true);
      if (!config.enabled) return;
      const data = await pilotRequest<{ cameras: PilotCamera[] }>('cameras', controller.signal, user?.id);
      if (controller.signal.aborted) return;
      setCameras(data.cameras);
      setSelectedId(data.cameras[0]?.id || '');
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'No se pudieron cargar las cámaras.');
    }
  };
  useEffect(() => {
    mounted.current = true;
    void reload();
    return () => {
      mounted.current = false;
      reloadController.current?.abort();
      connection.current?.(); connection.current = null;
    };
  }, [user?.id]);

  const start = () => {
    const measurement = createStartupMeasurement(); // First operation in the actual click handler.
    stop();
    const video = videoRef.current;
    if (!video || !selectedId || enabled !== true) return;
    const uid = user?.id;
    setError(''); setBusy(true); setThresholdExceeded(false);
    connection.current = startPilotPlayback(video, selectedId, {
      request: (path, signal) => pilotRequest<PilotSession>(path, signal, uid),
      onStatus: value => { if (mounted.current && identity.current === uid) setStatus(value); },
      onError: value => { if (mounted.current && identity.current === uid) { setError(value); setBusy(false); } },
      onMoving: () => { if (mounted.current && identity.current === uid) setBusy(false); },
      onThreshold: () => { if (mounted.current && identity.current === uid) setThresholdExceeded(true); },
      onMeasurement: value => {
        if (mounted.current && identity.current === uid) {
          setResults(previous => [...previous.slice(-49), value]);
          if (value.outcome === 'over-target') setThresholdExceeded(true);
        }
      },
    }, measurement);
  };
  const exportResults = () => {
    const blob = new Blob([JSON.stringify({
      exportedAt: new Date().toISOString(), results, realWorldDelay: 'not-measured',
      note: 'Medición local del navegador. No demuestra capacidad de la cámara ni un máximo garantizado.',
    }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = 'hls-pilot-measurements.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <>
    <nav className="px-4 py-3 bg-white text-sm"><Link to="/horse-timeline">Volver al Timeline</Link>
      {!user && <Link className="ml-6 underline" to="/login">Iniciar sesión</Link>}</nav>
    <PilotView enabled={enabled} cameras={cameras} selectedId={selectedId}
      onSelect={id => { stop(); setSelectedId(id); }} onReload={() => void reload()}
      onStart={start} onStop={stop} onExport={exportResults}
      status={status} error={error} busy={busy} thresholdExceeded={thresholdExceeded}
      results={results} videoRef={videoRef} />
  </>;
}
