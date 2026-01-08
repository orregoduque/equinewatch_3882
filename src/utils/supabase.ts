import { createClient } from '@supabase/supabase-js';

declare global {
  interface ImportMetaEnv {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_ANON_KEY: string;
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface HorseImage {
  id: number;
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

export const getImageUrl = (storagePath: string): string => {
  return `${supabaseUrl}/storage/v1/object/public/images/${storagePath}`;
};

export const fetchHorseImages = async (limit: number = 20): Promise<HorseImage[]> => {
  const { data, error } = await supabase
    .from('images')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching images:', error);
    return [];
  }

  return data || [];
};
