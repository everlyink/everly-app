import { createContext, useContext, useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext({
  session: null,
  user: null,
  profile: null,
  loading: true,
  profileLoading: false,
  profileError: null,
  refreshProfile: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // guard against late responses overwriting newer state when sessions change
  const currentUserIdRef = useRef(null);

  const fetchProfile = useCallback(async (user) => {
    if (!user?.id) {
      setProfile(null);
      setProfileLoading(false);
      setProfileError(null);
      return null;
    }

    currentUserIdRef.current = user.id;
    setProfileLoading(true);
    setProfileError(null);

    try {
      // 1) try to load an existing profile row
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (currentUserIdRef.current !== user.id) return null; // stale

      if (error) {
        console.warn('[everly] profile fetch error:', error.message);
        setProfileError(humaniseProfileError(error));
        setProfileLoading(false);
        return null;
      }

      // 2) if no row, attempt to create one (defensive — covers cases where the DB
      // trigger isn't installed or didn't fire). RLS allows self-insert.
      if (!data) {
        const threeYearsFromNow = new Date();
        threeYearsFromNow.setFullYear(threeYearsFromNow.getFullYear() + 3);

        const newProfile = {
          id: user.id,
          email: user.email || '',
          first_name: user.user_metadata?.first_name || '',
          plan: 'free',
          messages_limit: 1,
          recipients_limit: 1,
          window_expires_at: threeYearsFromNow.toISOString(),
        };

        const { data: created, error: insertErr } = await supabase
          .from('profiles')
          .insert(newProfile)
          .select()
          .single();

        if (currentUserIdRef.current !== user.id) return null; // stale

        if (insertErr) {
          // someone (likely the DB trigger) raced us — try one more read
          const { data: retry, error: retryErr } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (currentUserIdRef.current !== user.id) return null;

          if (retry) {
            setProfile(retry);
            setProfileLoading(false);
            return retry;
          }

          console.warn('[everly] profile create error:', insertErr.message);
          setProfileError(humaniseProfileError(insertErr));
          setProfileLoading(false);
          return null;
        }

        setProfile(created);
        setProfileLoading(false);
        return created;
      }

      setProfile(data);
      setProfileLoading(false);
      return data;
    } catch (err) {
      if (currentUserIdRef.current !== user.id) return null;
      console.warn('[everly] profile fetch threw:', err);
      setProfileError('something went wrong loading your account.');
      setProfileLoading(false);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        await fetchProfile(data.session.user);
      } else {
        currentUserIdRef.current = null;
        setProfile(null);
      }
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;
      setSession(newSession);

      // Supabase fires TOKEN_REFRESHED roughly hourly (and on bfcache restore).
      // The profile row hasn't changed — refetching it would unnecessarily flip
      // profileLoading and could unmount downstream UI mid-interaction. Same for
      // USER_UPDATED, which is auth-user metadata, not the profile row.
      if (event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') return;

      if (newSession?.user) {
        await fetchProfile(newSession.user);
      } else {
        currentUserIdRef.current = null;
        setProfile(null);
        setProfileError(null);
      }
    });

    // iOS Safari aggressively suspends backgrounded tabs. When the user
    // returns, silently verify the session is still valid; if it isn't,
    // attempt a refresh without flipping profileLoading or causing any
    // visible re-render. The cached profile + token stay live.
    let visibilityHandler = null;
    if (typeof document !== 'undefined') {
      visibilityHandler = async () => {
        if (document.visibilityState !== 'visible') return;
        try {
          const { data } = await supabase.auth.getSession();
          if (!data?.session) {
            // session was dropped on suspend — try to recover silently
            await supabase.auth.refreshSession();
          }
        } catch {
          // ignore — onAuthStateChange will fire if anything substantive changed
        }
      };
      document.addEventListener('visibilitychange', visibilityHandler);
    }

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      if (visibilityHandler && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', visibilityHandler);
      }
    };
  }, [fetchProfile]);

  const refreshProfile = useCallback(async () => {
    if (session?.user) return fetchProfile(session.user);
    return null;
  }, [session, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    currentUserIdRef.current = null;
    setSession(null);
    setProfile(null);
    setProfileError(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      profile,
      loading,
      profileLoading,
      profileError,
      refreshProfile,
      signOut,
    }),
    [session, profile, loading, profileLoading, profileError, refreshProfile, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

function humaniseProfileError(err) {
  if (!err) return 'something went wrong loading your account.';
  const msg = err.message || '';
  if (msg.includes('relation') && msg.includes('profiles')) {
    return 'the profiles table is missing — please run supabase/schema.sql against your project.';
  }
  if (msg.toLowerCase().includes('jwt')) {
    return 'your session has expired. please sign in again.';
  }
  if (err.code === 'PGRST301' || msg.toLowerCase().includes('row-level security')) {
    return 'we couldn’t read your profile — row-level security may not be configured.';
  }
  return msg || 'something went wrong loading your account.';
}
