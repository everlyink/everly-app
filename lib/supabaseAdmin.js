import { createClient } from '@supabase/supabase-js';

// server-only client. uses the service role key — never import into client code.
let adminClient = null;

export function getSupabaseAdmin() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Supabase admin env vars missing — set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_KEY');
  }

  adminClient = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return adminClient;
}
