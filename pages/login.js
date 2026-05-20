import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Field';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function Login() {
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (session) {
      if (profile && !profile.onboarding_complete) router.replace('/onboarding');
      else router.replace('/dashboard');
    }
  }, [authLoading, session, profile, router]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setSubmitting(false);
    if (err) {
      if (err.message?.toLowerCase().includes('invalid')) {
        setError('that email and password don’t match. try again, or reset your password below.');
      } else {
        setError('something went wrong. please try again in a moment.');
      }
      return;
    }
    // onAuthStateChange will fire and the useEffect above will redirect
  }

  async function handleReset() {
    if (!email) {
      setError('please enter your email above first.');
      return;
    }
    setError('');
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (err) setError('something went wrong sending the reset email.');
    else setResetSent(true);
  }

  return (
    <div className="auth-page">
      <header className="onboard-header">
        <Logo href="/" />
      </header>
      <div className="auth-main">
        <div className="auth-card">
          <h1>welcome back.</h1>
          <p className="sub">sign in to your word clock.</p>

          {error && <div className="alert alert-error">{error}</div>}
          {resetSent && <div className="alert alert-success">we’ve sent you a link to reset your password.</div>}

          <form onSubmit={handleSubmit} noValidate>
            <Input
              label="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <PasswordInput
              label="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" block disabled={submitting}>
              {submitting ? 'signing you in...' : 'sign in →'}
            </Button>
          </form>

          <p className="auth-foot">
            <button type="button" className="btn btn-ghost" onClick={handleReset}>
              forgot password?
            </button>
          </p>

          <p className="auth-foot">
            new here? <Link href="/signup">create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
