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

export const getImageUrl = (storagePath: string): string => {
  return `${supabaseUrl}/storage/v1/object/public/images/${storagePath}`;
};

export const fetchHorseImages = async (limit: number = 20, horseId?: string): Promise<HorseImage[]> => {
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

export const fetchHorses = async (): Promise<SupabaseHorse[]> => {
  const { data, error } = await supabase
    .from('horses')
    .select('id, name, breed, profile_photo_url, owner_id, age, gender, color, is_active, created_at, updated_at')
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
};

export const fetchDetectionsForDay = async (
  horseId: string,
  dayStart: Date,
  dayEnd: Date,
): Promise<DetectionRecord[]> => {
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
): Promise<TemperatureRecord[]> => {
  const { data, error } = await supabase
    .from('temperatura')
    .select('*')
    .eq('horse_id', horseId)
    .gte('created_at', dayStart.toISOString())
    .lt('created_at', dayEnd.toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).flatMap((record) => {
    const temperatureEntry = Object.entries(record).find(([key, rawValue]) => {
      if (['id', 'horse_id', 'created_at', 'updated_at'].includes(key)) return false;
      const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);
      return Number.isFinite(value) && value >= 30 && value <= 45;
    });

    if (!temperatureEntry) return [];

    return [{
      id: record.id,
      horse_id: record.horse_id,
      temperature: Number(temperatureEntry[1]),
      created_at: record.created_at,
    }];
  });
};

export const fetchUserProfiles = async (): Promise<UserProfile[]> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) return [];
    return data || [];
  } catch {
    return [];
  }
};

export const insertUserProfile = async (profile: Omit<UserProfile, 'id' | 'created_at'>): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .insert([profile]);
    return !error;
  } catch {
    return false;
  }
};
