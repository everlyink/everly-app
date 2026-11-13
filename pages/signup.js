import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Field';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function Signup() {
  const router = useRouter();
  const { session, profile, loading: authLoading } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [confirmSent, setConfirmSent] = useState(false);

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

    if (!firstName.trim()) {
      setError('please tell us your first name.');
      return;
    }
    if (password.length < 8) {
      setError('please use at least 8 characters for your password.');
      return;
    }

    setSubmitting(true);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { first_name: firstName.trim() },
      },
    });
    setSubmitting(false);

    if (err) {
      if (err.message?.toLowerCase().includes('already')) {
        setError('that email is already registered — try logging in.');
      } else if (err.message?.toLowerCase().includes('password')) {
        setError('please use a stronger password (at least 8 characters).');
      } else {
        setError('something went wrong. please try again in a moment.');
      }
      return;
    }

    // if email confirmation is required by the Supabase project, no session is created
    if (!data.session) {
      setConfirmSent(true);
      return;
    }
    // session arrived — onAuthStateChange will redirect via useEffect
  }

  return (
    <div className="auth-page">
      <header className="onboard-header">
        <Logo href="/" />
      </header>
      <div className="auth-main">
        <div className="auth-card">
          <h1>let’s get started.</h1>
          <p className="sub">your words. their moment. saved with care.</p>

          {error && <div className="alert alert-error">{error}</div>}
          {confirmSent ? (
            <div className="alert alert-success">
              we’ve sent a confirmation link to <strong>{email}</strong>. open it to finish setting up your account.
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <Input
                label="your first name"
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
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
                hint="at least 8 characters"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              <Button type="submit" block disabled={submitting}>
                {submitting ? 'creating your account...' : 'create my account →'}
              </Button>
            </form>
          )}

          <p className="auth-foot">
            already with us? <Link href="/login">sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
