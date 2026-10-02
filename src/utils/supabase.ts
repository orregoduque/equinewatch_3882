import { createClient } from '@supabase/supabase-js';

declare global {
  interface ImportMetaEnv {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
  }
}

const supabaseUrl = 'https://zmxppbpywizdjlhstfkf.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpteHBwYnB5d2l6ZGpsaHN0ZmtmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzNzY4MTksImV4cCI6MjA3ODk1MjgxOX0.AR2B4sNbkf0A_Sm_M-YFtR25ySZMP1FsM93acnuVYWc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

export const getImageUrl = (storagePath: string): string => {
  return `${supabaseUrl}/storage/v1/object/public/images/${storagePath}`;
};

export interface HorseViewer {
  id: string;
  email: string;
  role: string;
}

const isHorseOwner = (viewer: HorseViewer) =>
  viewer.role === 'horse_owner' || viewer.role === 'owner';

export const fetchHorseImages = async (
  limit: number = 20,
  horseId?: string,
  viewer: HorseViewer | null = null,
): Promise<HorseImage[]> => {
  await requireHorseAccess(horseId, viewer);
  console.log('Fetching images from Supabase...', { supabaseUrl, limit, horseId });
  try {
    let query = supabase
      .from('images')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (horseId) {
      query = query.eq('horse_id', horseId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Supabase error fetching images:', error);
      return [];
    }
    console.log('Fetched images count:', data?.length || 0);
    return data || [];
  } catch (err) {
    console.error('Exception fetching images:', err);
    return [];
  }
};

export const fetchHorses = async (viewer: HorseViewer | null = null): Promise<SupabaseHorse[]> => {
  if (!viewer) return [];
  if (!isHorseOwner(viewer) && !['admin', 'stable_owner'].includes(viewer.role)) return [];

  let query = supabase
    .from('horses')
    .select('id, name, breed, profile_photo_url, owner_id, age, gender, color, is_active, created_at, updated_at')
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

const requireHorseAccess = async (horseId: string | undefined, viewer: HorseViewer | null) => {
  if (!horseId || !viewer) throw new Error('Sign in to access this horse.');
  const horses = await fetchHorses(viewer);
  if (!horses.some((horse) => horse.id === horseId)) {
    throw new Error('You do not have access to this horse.');
  }
};

export const fetchDetectionsForDay = async (
  horseId: string,
  dayStart: Date,
  dayEnd: Date,
  viewer: HorseViewer | null = null,
): Promise<DetectionRecord[]> => {
  await requireHorseAccess(horseId, viewer);
  const { data, error } = await supabase
    .from('detection')
    .select('id, horse_id, analysis, created_at')
    .eq('horse_id', horseId)
    .gte('created_at', dayStart.toISOString())
    .lt('created_at', dayEnd.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
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
