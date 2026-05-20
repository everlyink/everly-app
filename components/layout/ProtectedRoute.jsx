import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';

const STUCK_LOADING_MS = 3000;

export default function ProtectedRoute({ children, requireOnboarding = true }) {
  const {
    session,
    profile,
    loading,
    profileLoading,
    profileError,
    refreshProfile,
    signOut,
  } = useAuth();
  const router = useRouter();
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (profileLoading) return;
    if (profileError) return;
    if (!profile) return;
    if (requireOnboarding && !profile.onboarding_complete) {
      router.replace('/onboarding');
    }
  }, [loading, session, profile, profileLoading, profileError, requireOnboarding, router]);

  // if a true blocking load (no cached profile) hangs for more than 3s, surface
  // a retry path so iOS users aren't stuck on "holding on a moment..." forever.
  const inBlockingLoad = loading || (profileLoading && !profile) || (!profile && session && !profileError);
  useEffect(() => {
    if (!inBlockingLoad) {
      setStuck(false);
      return;
    }
    const t = setTimeout(() => setStuck(true), STUCK_LOADING_MS);
    return () => clearTimeout(t);
  }, [inBlockingLoad]);

  if (loading) return <BlockingLoading stuck={stuck} onRetry={refreshProfile} onSignOut={signOut} />;
  if (!session) return null;

  if (profileLoading && !profile) {
    return <BlockingLoading stuck={stuck} onRetry={refreshProfile} onSignOut={signOut} />;
  }

  if (profileError) {
    return (
      <div className="error-fallback">
        <header className="onboard-header">
          <Logo href="/" />
        </header>
        <main className="auth-main">
          <div className="auth-card text-center">
            <h1>we couldn’t load your account.</h1>
            <p className="sub">{profileError}</p>
            <div className="success-actions" style={{ alignItems: 'stretch' }}>
              <Button onClick={() => refreshProfile()}>try again</Button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={async () => {
                  await signOut();
                  window.location.href = '/login';
                }}
              >
                sign out
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return <BlockingLoading stuck={stuck} onRetry={refreshProfile} onSignOut={signOut} />;
  if (requireOnboarding && !profile.onboarding_complete) return null;

  return children;
}

function BlockingLoading({ stuck, onRetry, onSignOut }) {
  return (
    <div className="loading-screen">
      <p className="loading">holding on a moment...</p>
      {stuck && (
        <div className="loading-retry">
          <p className="muted">taking longer than usual.</p>
          <Button onClick={() => onRetry()}>try again</Button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={async () => {
              await onSignOut();
              if (typeof window !== 'undefined') window.location.href = '/login';
            }}
          >
            sign out
          </button>
        </div>
      )}
    </div>
  );
}
