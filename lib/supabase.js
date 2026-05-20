import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.warn('[everly] Supabase env vars missing — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
}

// explicitly use localStorage so iOS Safari — which aggressively suspends
// backgrounded tabs and can drop sessionStorage when it restarts the page —
// keeps the auth session across backgrounding, force-quits, and bfcache restores.
const storage =
  typeof window !== 'undefined' && window.localStorage ? window.localStorage : undefined;

export const supabase = createClient(
  supabaseUrl || 'http://localhost:54321',
  supabaseAnonKey || 'anon-key-placeholder',
  {
    auth: {
      storage,
      storageKey: 'everly-auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
