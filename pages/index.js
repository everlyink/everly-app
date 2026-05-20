import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@/context/AuthContext';

export default function LandingRedirect() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace('/login');
      return;
    }
    if (profile && !profile.onboarding_complete) {
      router.replace('/onboarding');
      return;
    }
    router.replace('/dashboard');
  }, [session, profile, loading, router]);

  return <div className="loading">holding on a moment...</div>;
}
