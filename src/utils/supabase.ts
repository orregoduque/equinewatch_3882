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
  console.log('Fetching images from Supabase...', { supabaseUrl, limit });
  
  try {
    const { data, error } = await supabase
      .from('images')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

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
