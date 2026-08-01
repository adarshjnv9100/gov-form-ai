import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pohxgdgszyovtohlxrni.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvaHhnZGdzenlvdnRvaGx4cm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NzIxNTksImV4cCI6MjEwMTE0ODE1OX0.Py7CJMBHgr__Qtwg3QB4ZSo9rI24ks-1zBDvuGBDAUA';

class SupabaseSingleton {
  private static instance: SupabaseClient;

  private constructor() {}

  public static getInstance(): SupabaseClient {
    if (!SupabaseSingleton.instance) {
      SupabaseSingleton.instance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    }
    return SupabaseSingleton.instance;
  }
}

export const supabase = SupabaseSingleton.getInstance();
