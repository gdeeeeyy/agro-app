import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined;
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;