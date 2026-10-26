import { supabase } from '../../utils/supabase';
import { PilotAccessError } from './access';

export interface PilotCamera {
  id: string;
  name: string;
  horseId: string;
  ready: boolean;
  segments: number;
  bufferedBytes: number;
  lastReceivedAt: string | null;
}
export interface PilotSession {
  cameraId?: string;
  horseId?: string;
  ready: boolean;
  expiresAt: number;
  playbackUrl: string;
}

export async function pilotRequest<T>(path: string, signal?: AbortSignal, expectedUid?: string): Promise<T> {
  if (!expectedUid || !/^[0-9a-f-]{36}$/i.test(expectedUid))
    throw new PilotAccessError();
  // The SDK refreshes the real session, including during authorized preloading.
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session || data.session.user.id !== expectedUid)
    throw new PilotAccessError();
  const sessionRequest = path.startsWith('session/') || /^horses\/[^/]+\/session$/.test(path);
  const response = await fetch(`/api/hls-pilot/${path}`, {
    method: sessionRequest ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(sessionRequest ? { 'Content-Type': 'application/json' } : {}),
    },
    cache: 'no-store', credentials: 'same-origin', signal,
  });
  if (response.status === 401 || response.status === 403) throw new PilotAccessError();
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'No se pudo autorizar la cámara.');
  return body;
}
