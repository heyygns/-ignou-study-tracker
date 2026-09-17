import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// window.supabase is provided by the CDN script tag in index.html
export const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
