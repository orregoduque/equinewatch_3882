import { createClient } from '@supabase/supabase-js';
import { freshHorseFetch } from './freshHorseFetch';
import { localHourRange } from './hourlyHorseImages';
import { createWasabiPhotoReader, PrivatePhotoError } from './wasabiPhotos';

declare global {
  interface ImportMetaEnv {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
  }
}

const supabaseUrl = 'https://zmxppbpywizdjlhstfkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteHBwYnB5d2l6ZGpsaHN0ZmtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNzY4MTksImV4cCI6MjA3ODk1MjgxOX0.AR2B4sNbkf0A_Sm_M-YFtR25ySZMP1FsM93acnuVYWc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: freshHorseFetch },
});

export interface HorseImage {
  id: number;
  horse_id: string;
  image_number: number;
  filename_raw: string;
  filename_enhanced: string;
  storage_path_raw: string;
  storage_path_enhanced: string;
  file_size_raw: number;
  file_size_enhanced: number;
  created_at: string;
  uploaded_at: string;
  is_processed: boolean;
  notes: string | null;
  user_id: string;
}

export type CameraImage = Omit<Pick<HorseImage,
  'id' | 'storage_path_enhanced' | 'uploaded_at' | 'created_at' |
  'horse_id' | 'image_number' | 'is_processed' | 'notes'>, 'id'> & {
    id: number | string;
    source?: 'wasabi';
    captured_at?: string;
    imageUrl?: string;
    expiresAt?: string;
  };

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  role: 'horse_owner' | 'stable_owner' | 'admin';
  stable_name: string | null;
  avatar_url: string | null;
  created_at: string;
}

export interface SupabaseHorse {
  id: string;
  name: string;
  breed: string | null;
  profile_photo_url: string | null;
  photo_backend?: string | null;
  stall_number: string | null;
  owner_id: string | null;
  age: number | null;
  gender: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string | null;
}

export interface DetectionRecord {
  id: string | number;
  horse_id: string;
  analysis: unknown;
  created_at: string;
}

export interface TemperatureRecord {
  id: string | number;
  horse_id: string;
  temperature: number;
  created_at: string;
}

export interface ProfileStatsRecord {
  totalObservations: number;
  totalHorses: number;
  activeHorses: number;
  averageTemperature: number | null;
  lastObservation: string | null;
}

export const getImageUrl = (
  storagePath: string,
  options?: { width: number; quality?: number },
): string => {
  const path = storagePath.split('/').map(segment => encodeURIComponent(segment)).join('/');
  if (options?.width) {
    const query = new URLSearchParams({
      width: String(options.width),
      quality: String(options.quality ?? 60),
      resize: 'contain',
    });
    return `${supabaseUrl}/storage/v1/render/image/public/images/${path}?${query}`;
  }
  return `${supabaseUrl}/storage/v1/object/public/images/${path}`;
};

export interface HorseViewer {
  id: string;
  email: string;
  role: string;
}

const isHorseOwner = (viewer: HorseViewer) =>
  viewer.role === 'horse_owner' || viewer.role === 'owner';

export class HorseAccessError extends Error {}
let privateReader: ReturnType<typeof createWasabiPhotoReader> | undefined;
const getPrivateReader = () => privateReader ??= createWasabiPhotoReader(supabase.auth);
export const renewPrivatePhotos = (images: CameraImage[], viewer: HorseViewer, signal?: AbortSignal) =>
  getPrivateReader().renew(images, viewer, signal);
export const renewKnownPrivatePhotos = (images: CameraImage[], viewer: HorseViewer, signal?: AbortSignal) =>
  getPrivateReader().renew(images, viewer, signal, true);
export const loadPrivatePhoto = (image: CameraImage, viewer: HorseViewer, signal?: AbortSignal) =>
  getPrivateReader().load(image, viewer, signal);

const privateRead = async (
  horseId: string, viewer: HorseViewer,
  options: Parameters<ReturnType<typeof createWasabiPhotoReader>['read']>[2],
) => {
  try {
    return (await getPrivateReader().read(horseId, viewer, options)).images;
  } catch (error) {
    if (error instanceof PrivatePhotoError && [401, 403].includes(error.status))
      throw new HorseAccessError(error.message);
    throw error;
  }
};

export const fetchHorseImages = async (
  limit: number = 20,
  horseId?: string,
  viewer: HorseViewer | null = null,
  uploadedSince?: string,
  signal?: AbortSignal,
  photoBackend?: string | null,
  captureOrder = false,
): Promise<CameraImage[]> => {
  // This hint only selects transport. The private API still verifies Auth,
  // horse ownership/staff, backend and prefix on every request.
  if (photoBackend === 'wasabi' && horseId && viewer)
    return privateRead(horseId, viewer, { limit, since: uploadedSince, signal });
  const horse = await requireHorseAccess(horseId, viewer);
  if (horse.photo_backend === 'wasabi')
    return privateRead(horseId!, viewer!, { limit, since: uploadedSince, signal });
  let query = supabase
    .from('images')
    .select('id, storage_path_enhanced, uploaded_at, created_at, horse_id, image_number, is_processed, notes')
    .eq('horse_id', horseId)
    .not('storage_path_enhanced', 'is', null)
    .order(captureOrder ? 'created_at' : 'uploaded_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .limit(limit);
  if (uploadedSince) query = query.gte(captureOrder ? 'created_at' : 'uploaded_at', uploadedSince);
  if (signal) query = query.abortSignal(signal);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
};

const pendingHorseRequests = new Map<string, Promise<SupabaseHorse[]>>();

export const fetchHorseImagesForHour = async (
  horseId: string,
  viewer: HorseViewer,
  day: string,
  hour: number,
  signal?: AbortSignal,
  photoBackend?: string | null,
): Promise<CameraImage[]> => {
  const { start, end } = localHourRange(day, hour);
  if (photoBackend === 'wasabi')
    return privateRead(horseId, viewer, { limit: 400, from: start, to: end, signal });
  const horse = await requireHorseAccess(horseId, viewer);
  if (horse.photo_backend === 'wasabi')
    return privateRead(horseId, viewer, { limit: 400, from: start, to: end, signal });
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  let query = supabase.from('images')
    .select('id, storage_path_enhanced, uploaded_at, created_at, horse_id, image_number, is_processed, notes')
    .eq('horse_id', horseId)
    .not('storage_path_enhanced', 'is', null)
    .gte('created_at', start)
    .lt('created_at', end)
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .limit(400);
  if (signal) query = query.abortSignal(signal);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
};

export const fetchHorses = (viewer: HorseViewer | null = null): Promise<SupabaseHorse[]> => {
  if (!viewer) return Promise.resolve([]);
  if (!isHorseOwner(viewer) && !['admin', 'stable_owner'].includes(viewer.role)) return Promise.resolve([]);

  // Share only simultaneous requests for this account and role. Never retain
  // resolved authorization data: subsequent requests must see fresh assignments.
  const key = JSON.stringify([viewer.id, viewer.email, viewer.role]);
  const pending = pendingHorseRequests.get(key);
  if (pending) return pending;
  const request = loadHorses(viewer).finally(() => pendingHorseRequests.delete(key));
  pendingHorseRequests.set(key, request);
  return request;
};

const loadHorses = async (viewer: HorseViewer): Promise<SupabaseHorse[]> => {
  let query = supabase
    .from('horses')
    .select('id, name, profile_photo_url, photo_backend, stall_number, breed, age, owner_id, gender, color, is_active, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (isHorseOwner(viewer)) {
    // Demo IDs cannot represent a real Supabase owner assignment.
    const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    if (!isUuid(viewer.id)) return [];
    const profile = await fetchUserProfileByEmail(viewer.email);
    // Existing projects may associate horses to the auth ID or the profile ID.
    const ownerIds = [...new Set([viewer.id, profile?.id].filter((id): id is string => !!id && isUuid(id)))];
    query = query.in('owner_id', ownerIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};

export const requireHorseAccess = async (horseId: string | undefined, viewer: HorseViewer | null) => {
  if (!horseId || !viewer) throw new HorseAccessError('Sign in to access this horse.');
  const horses = await fetchHorses(viewer);
  const horse = horses.find((horse) => horse.id === horseId);
  if (!horse) {
    throw new HorseAccessError('You do not have access to this horse.');
  }
  return horse;
};

export const fetchDetectionsForDay = async (
  horseId: string,
  dayStart: Date,
  dayEnd: Date,
  viewer: HorseViewer | null = null,
): Promise<DetectionRecord[]> => {
  await requireHorseAccess(horseId, viewer);
  const readPage = (start: number, size: number, withCount = false) => supabase
    .from('detection')
    .select('id, horse_id, analysis, created_at', withCount ? { count: 'exact' } : {})
    .eq('horse_id', horseId)
    .gte('created_at', dayStart.toISOString())
    .lt('created_at', dayEnd.toISOString())
    .order('created_at', { ascending: true })
    .order('id', { ascending: true })
    .range(start, start + size - 1);

  const { data, error, count } = await readPage(0, 1000, true);
  if (error) throw new Error(error.message);
  if (count === null || count === undefined) {
    throw new Error('No se pudo comprobar el número de análisis del día.');
  }
  if (count === 0) return [];
  const firstPage = data || [];
  if (!firstPage.length) {
    throw new Error('No se pudieron cargar todos los análisis del día. Vuelve a intentarlo.');
  }

  // One photo every 10 seconds can yield 8,640 analyses per day. Respect the
  // actual server page cap, use stable ordering, and never report partial totals.
  const pageSize = firstPage.length;
  const records: DetectionRecord[] = firstPage.slice(0, count);
  for (let start = pageSize; start < count; start += pageSize * 3) {
    const starts = [start, start + pageSize, start + pageSize * 2].filter(offset => offset < count);
    const pages = await Promise.all(starts.map(async (offset) => {
      const expectedSize = Math.min(pageSize, count - offset);
      const result = await readPage(offset, expectedSize);
      if (result.error) throw new Error(result.error.message);
      if (!result.data || result.data.length !== expectedSize) {
        throw new Error('Los análisis cambiaron durante la carga. Vuelve a intentarlo para obtener el resumen completo.');
      }
      return result.data;
    }));
    records.push(...pages.flat());
  }
  return records;
};

export const fetchTemperaturesForDay = async (
  horseId: string,
  dayStart: Date,
  dayEnd: Date,
  viewer: HorseViewer | null = null,
): Promise<TemperatureRecord[]> => {
  await requireHorseAccess(horseId, viewer);
  const { data, error } = await supabase
    .from('temperatura')
    .select('id, horse_id, box_temperature, created_at')
    .eq('horse_id', horseId)
    .gte('created_at', dayStart.toISOString())
    .lt('created_at', dayEnd.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || [])
    .map((record) => ({
      id: record.id,
      horse_id: record.horse_id,
      temperature: Number(record.box_temperature),
      created_at: record.created_at,
    }))
    .filter((record) => Number.isFinite(record.temperature));
};

export const fetchUserProfiles = async (): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, role, avatar_url, created_at')
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map((profile) => ({
      id: profile.id,
      email: profile.email,
      name: profile.full_name,
      role: profile.role,
      stable_name: null,
      avatar_url: profile.avatar_url,
      created_at: profile.created_at,
    }));
  } catch {
    return [];
  }
};

export const fetchUserProfileByEmail = async (email: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, email, full_name, role, avatar_url, created_at')
    .eq('email', email)
    .limit(1);

  if (error) {
    throw new Error(error.message);
  }

  const profile = data?.[0];
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.full_name,
    role: profile.role,
    stable_name: null,
    avatar_url: profile.avatar_url,
    created_at: profile.created_at,
  };
};

export const fetchProfileStats = async (viewer: HorseViewer | null = null): Promise<ProfileStatsRecord> => {
  const horses = await fetchHorses(viewer);
  const horseIds = horses.map((horse) => horse.id);
  if (!horseIds.length) {
    return { totalObservations: 0, totalHorses: 0, activeHorses: 0, averageTemperature: null, lastObservation: null };
  }
  const [
    observationsResult,
    temperaturesResult,
    latestObservationResult,
  ] = await Promise.all([
    supabase
      .from('images')
       .select('id', { count: 'exact', head: true })
       .in('horse_id', horseIds),
    supabase
      .from('temperatura')
       .select('box_temperature')
       .in('horse_id', horseIds),
    supabase
      .from('images')
      .select('created_at')
       .in('horse_id', horseIds)
      .order('created_at', { ascending: false })
      .limit(1),
  ]);

  const firstError = [
    observationsResult.error,
    temperaturesResult.error,
    latestObservationResult.error,
  ].find(Boolean);

  if (firstError) {
    throw new Error(firstError.message);
  }

  const temperatures = (temperaturesResult.data || [])
    .map((record) => Number(record.box_temperature))
    .filter((temperature) => Number.isFinite(temperature));

  return {
    totalObservations: observationsResult.count || 0,
    totalHorses: horses.length,
    activeHorses: horses.filter((horse) => horse.is_active).length,
    averageTemperature: temperatures.length
      ? temperatures.reduce((sum, temperature) => sum + temperature, 0) / temperatures.length
      : null,
    lastObservation: latestObservationResult.data?.[0]?.created_at || null,
  };
};

export const insertUserProfile = async (profile: Omit<UserProfile, 'id' | 'created_at'>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .insert([{
        email: profile.email,
        full_name: profile.name,
        role: profile.role,
        avatar_url: profile.avatar_url,
      }]);
    return !error;
  } catch {
    return false;
  }
};
