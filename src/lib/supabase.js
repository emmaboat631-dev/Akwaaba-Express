import { createClient } from '@supabase/supabase-js';

// Supabase client. URL + anon key are safe to expose to the browser (they're
// gated by Row-Level Security). Put them in .env (see .env.example).
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Loud, early failure beats mysterious 401s later.
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY — copy .env.example to .env and fill them in.');
}

export const supabase = createClient(url, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});
