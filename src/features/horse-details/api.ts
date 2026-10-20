import { supabase, type HorseViewer } from '../../utils/supabase';

export const HORSE_DETAIL_COLUMNS = [
  'id', 'name', 'breed', 'age', 'date_of_birth', 'gender', 'color', 'stall_number', 'weight',
  'height', 'medical_notes', 'registration_number', 'dietary_requirements',
  'emergency_contact', 'emergency_phone', 'veterinarian', 'veterinarian_phone',
  'insurance_details', 'profile_photo_url',
].join(',');

export interface HorseDetails {
  id: string;
  name: string | null;
  breed: string | null;
  age: number | string | null;
  date_of_birth: string | null;
  gender: string | null;
  color: string | null;
  stall_number: string | null;
  weight: number | string | null;
  height: number | string | null;
  medical_notes: string | null;
  registration_number: string | null;
  dietary_requirements: string | null;
  emergency_contact: string | null;
  emergency_phone: string | null;
  veterinarian: string | null;
  veterinarian_phone: string | null;
  insurance_details: string | null;
  profile_photo_url: string | null;
}

export class HorseDetailsSessionError extends Error {}

/** Read-only: the actual authenticated Supabase session and RLS decide access. */
export async function fetchHorseDetails(
  horseId: string,
  viewer: HorseViewer | null,
  signal?: AbortSignal,
): Promise<HorseDetails | null> {
  signal?.throwIfAborted();
  if (!viewer) throw new HorseDetailsSessionError('Inicia sesión para consultar la ficha del caballo.');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(horseId))
    throw new Error('El identificador del caballo no es válido.');
  const { data: auth, error: authError } = await supabase.auth.getSession();
  signal?.throwIfAborted();
  if (authError || !auth.session || auth.session.user.id !== viewer.id)
    throw new HorseDetailsSessionError('Inicia sesión con tu cuenta para consultar la ficha del caballo.');

  let query = supabase.from('horses').select(HORSE_DETAIL_COLUMNS).eq('id', horseId);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle<HorseDetails>();
  signal?.throwIfAborted();
  if (error) throw new Error('No se pudo cargar la ficha del caballo. Inténtalo de nuevo.');
  if (!data) return null; // Includes a missing horse or one hidden by RLS.
  if (data.id !== horseId) throw new Error('No se pudo confirmar la ficha del caballo.');
  return data;
}
