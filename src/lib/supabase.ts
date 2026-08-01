import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || 'https://pohxgdgszyovtohlxrni.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvaHhnZGdzenlvdnRvaGx4cm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU1NzIxNTksImV4cCI6MjEwMTE0ODE1OX0.Py7CJMBHgr__Qtwg3QB4ZSo9rI24ks-1zBDvuGBDAUA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function getSiteUrl(): string {
  const envUrl = import.meta.env.VITE_SITE_URL || import.meta.env.NEXT_PUBLIC_SITE_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim() !== '') {
    return envUrl.trim().replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return window.location.origin;
  }
  return 'https://gov-form-ai.vercel.app';
}
