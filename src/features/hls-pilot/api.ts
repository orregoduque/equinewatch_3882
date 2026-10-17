import { supabase } from '../../utils/supabase';

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
  ready: boolean;
  expiresAt: number;
  playbackUrl: string;
}

export async function pilotRequest<T>(path: string, signal?: AbortSignal, expectedUid?: string): Promise<T> {
  if (!expectedUid || !/^[0-9a-f-]{36}$/i.test(expectedUid))
    throw new Error('Inicia sesión con una cuenta real de Supabase; las cuentas de demostración no permiten ver cámaras.');
  // getSession includes the SDK's refresh work; call only after recording the click.
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session || data.session.user.id !== expectedUid)
    throw new Error('La sesión de Supabase no coincide con la cuenta actual. Inicia sesión de nuevo.');
  const response = await fetch(`/api/hls-pilot/${path}`, {
    method: path.startsWith('session/') ? 'POST' : 'GET',
    headers: {
      Authorization: `Bearer ${data.session.access_token}`,
      ...(path.startsWith('session/') ? { 'Content-Type': 'application/json' } : {}),
    },
    cache: 'no-store', credentials: 'same-origin', signal,
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || 'No se pudo autorizar la cámara.');
  return body;
}
