import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('⚠️ Variables Supabase manquantes !');
  console.error('Créez un fichier .env avec :');
  console.error('VITE_SUPABASE_URL=https://xxxxx.supabase.co');
  console.error('VITE_SUPABASE_ANON_KEY=eyJhbGci...');
}

export const supabase = createClient<Database>(
  supabaseUrl || '',
  supabaseAnonKey || ''
);

// Helper pour vérifier si Supabase est configuré
export const isSupabaseConfigured = () => {
  return !!supabaseUrl && !!supabaseAnonKey;
};
