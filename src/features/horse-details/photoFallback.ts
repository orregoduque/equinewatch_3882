import { supabase, requireHorseAccess, type HorseViewer } from '../../utils/supabase';

/** Used only when horses.profile_photo_url is empty, never instead of a profile. */
export async function fetchCameraPhotoFallback(
  horseId: string, viewer: HorseViewer, signal?: AbortSignal,
): Promise<string | null> {
  signal?.throwIfAborted();
  const { data: auth, error: authError } = await supabase.auth.getSession();
  signal?.throwIfAborted();
  if (authError || !auth.session || auth.session.user.id !== viewer.id)
    throw new Error('Inicia sesión para consultar la foto de cámara.');
  await requireHorseAccess(horseId, viewer);
  signal?.throwIfAborted();
  let query = supabase.from('images')
    .select('storage_path_enhanced')
    .eq('horse_id', horseId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(1);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query.maybeSingle<{ storage_path_enhanced: string | null }>();
  signal?.throwIfAborted();
  if (error) throw new Error('No se pudo cargar la foto de cámara.');
  const path = data?.storage_path_enhanced?.trim();
  return path ? supabase.storage.from('images').getPublicUrl(path).data.publicUrl : null;
}
