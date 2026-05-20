import { useEffect, useState } from 'react';
import Link from 'next/link';
import Head from 'next/head';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/Field';
import { supabase } from '@/lib/supabase';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  // tracks whether we have an authenticated reset session (set by Supabase
  // after parsing the access_token from the URL hash via detectSessionInUrl).
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionMissing, setSessionMissing] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data?.session) {
        setSessionReady(true);
      } else {
        // wait a beat — detectSessionInUrl runs asynchronously after the hash
        // is parsed. if there's still no session after 1.5s, the link is bad.
        setTimeout(() => {
          if (!mounted) return;
          supabase.auth.getSession().then(({ data: data2 }) => {
            if (!mounted) return;
            if (data2?.session) setSessionReady(true);
            else setSessionMissing(true);
          });
        }, 1500);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      if (session) {
        setSessionReady(true);
        setSessionMissing(false);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('please use at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('your passwords don’t match. please try again.');
      return;
    }

    setSubmitting(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setSubmitting(false);

    if (err) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('jwt') || msg.includes('expired') || msg.includes('invalid')) {
        setError('your reset link has expired. please request a fresh one from the sign-in page.');
      } else if (msg.includes('same')) {
        setError('that’s your existing password. please choose a different one.');
      } else if (msg.includes('weak') || msg.includes('password')) {
        setError('please choose a stronger password.');
      } else {
        setError('something went wrong updating your password. please try again.');
      }
      return;
    }

    setSuccess(true);
  }

  return (
    <>
      <Head>
        <title>reset your password · everly</title>
      </Head>

      {success ? (
        <div className="success-screen">
          <h1>
            your password has been updated. <span className="sparkle">✦</span>
          </h1>
          <p>you can sign in with it now.</p>
          <div className="success-actions">
            <Button href="/login">go to sign in →</Button>
          </div>
        </div>
      ) : (
        <div className="reset-page">
          <header className="reset-header">
            <Logo href="https://everly.ink" />
          </header>

          <main className="reset-main">
            <div className="reset-card">
              <h1 className="reset-heading">choose a new password.</h1>
              <p className="reset-sub">it’ll be saved as soon as you submit.</p>

              {sessionMissing && (
                <div className="alert alert-error">
                  this reset link has expired or is invalid. please request a new one from the{' '}
                  <Link href="/login">sign-in page</Link>.
                </div>
              )}

              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleSubmit} noValidate>
                <PasswordInput
                  label="new password"
                  hint="at least 8 characters"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={sessionMissing}
                />
                <PasswordInput
                  label="confirm password"
                  autoComplete="new-password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={sessionMissing}
                />

                <Button type="submit" block disabled={submitting || sessionMissing || !sessionReady}>
                  {submitting ? 'updating your password...' : 'update password →'}
                </Button>
              </form>

              <p className="reset-foot">
                remembered it? <Link href="/login">sign in instead</Link>
              </p>
            </div>
          </main>
        </div>
      )}
    </>
  );
}
