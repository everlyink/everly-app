import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { createClient } from '@supabase/supabase-js';

// deletes the calling user's auth.users row, which cascades to profile + messages.
// authentication: verifies the access token in the Authorization header belongs
// to the userId being deleted.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'missing userId' });

  // verify the request is authenticated as that user
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  // alternative: check by reading the Supabase session cookie. For browser fetches the
  // supabase-js client doesn't automatically send the bearer token, so we use anon client
  // with the user's session passed via cookies or the body. Simpler approach: require
  // the user is signed-in via Supabase, then look up the request user via the access_token.

  if (!token) {
    // fall back to verifying via a temporary anon-key lookup using whatever the browser stored
    // (no good way without explicit auth header — reject)
    return res.status(401).json({ error: 'missing auth token' });
  }

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const client = createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userResp, error: userErr } = await client.auth.getUser(token);
    if (userErr || !userResp?.user || userResp.user.id !== userId) {
      return res.status(403).json({ error: 'forbidden' });
    }

    const admin = getSupabaseAdmin();
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      console.error('[delete-account] delete failed:', delErr);
      return res.status(500).json({ error: 'delete failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[delete-account] error:', err);
    return res.status(500).json({ error: 'delete failed' });
  }
}
