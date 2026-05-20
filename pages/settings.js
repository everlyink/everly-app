import { useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import PageWrapper from '@/components/layout/PageWrapper';
import Button from '@/components/ui/Button';
import { Input, PasswordInput } from '@/components/ui/Field';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { PLAN_LABELS, isLegacy, planMessagesLimit } from '@/lib/plans';
import { formatDeliveryDate } from '@/lib/format';

function SettingsInner() {
  const router = useRouter();
  const { session, profile, refreshProfile, signOut } = useAuth();
  const [firstName, setFirstName] = useState(profile?.first_name || '');
  const [newPassword, setNewPassword] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [notifyExpiry, setNotifyExpiry] = useState(profile?.notify_window_expiry ?? true);
  const [savedMessage, setSavedMessage] = useState('');
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function saveFirstName() {
    setError('');
    setSavingName(true);
    const { error: err } = await supabase
      .from('profiles')
      .update({ first_name: firstName.trim() })
      .eq('id', session.user.id);
    setSavingName(false);
    if (err) {
      setError('something went wrong saving your name. please try again.');
      return;
    }
    setSavedMessage('your name has been updated. ✦');
    await refreshProfile();
  }

  async function updatePassword() {
    setError('');
    if (newPassword.length < 8) {
      setError('please use at least 8 characters for your new password.');
      return;
    }
    setSavingPassword(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (err) {
      setError('something went wrong updating your password. please try again.');
      return;
    }
    setNewPassword('');
    setSavedMessage('your password has been updated. ✦');
  }

  async function saveNotifications(next) {
    setNotifyExpiry(next);
    await supabase
      .from('profiles')
      .update({ notify_window_expiry: next })
      .eq('id', session.user.id);
    await refreshProfile();
  }

  async function deleteAccount() {
    setDeleting(true);
    const accessToken = session?.access_token;
    const res = await fetch('/api/delete-account', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ userId: session.user.id }),
    });
    if (!res.ok) {
      setDeleting(false);
      setError('something went wrong deleting your account. please try again, or contact us.');
      return;
    }
    await signOut();
    router.replace('/login');
  }

  if (!profile) return <div className="loading">holding on a moment...</div>;

  const legacy = isLegacy(profile.plan);

  return (
    <PageWrapper>
      <div className="container container-reading">
        <h1>settings</h1>

        {savedMessage && <div className="alert alert-success">{savedMessage}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <section className="settings-section">
          <h2>account</h2>
          <Input
            label="first name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <Button onClick={saveFirstName} disabled={savingName}>
            {savingName ? 'saving...' : 'save name'}
          </Button>

          <div className="settings-row" style={{ marginTop: '1.5rem' }}>
            <span className="settings-row-label">email</span>
            <span className="settings-row-value">{session.user.email}</span>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
            <PasswordInput
              label="new password"
              hint="at least 8 characters"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button onClick={updatePassword} disabled={savingPassword || !newPassword}>
              {savingPassword ? 'updating...' : 'update password'}
            </Button>
          </div>
        </section>

        <section className="settings-section">
          <h2>your plan</h2>
          <div className="settings-row">
            <span className="settings-row-label">plan</span>
            <span className="settings-row-value">{PLAN_LABELS[profile.plan]}</span>
          </div>
          <div className="settings-row">
            <span className="settings-row-label">messages</span>
            <span className="settings-row-value">
              {profile.messages_used || 0} / {planMessagesLimit(profile)}
            </span>
          </div>
          <div className="settings-row">
            <span className="settings-row-label">edit window</span>
            <span className="settings-row-value">
              {legacy
                ? 'no expiry'
                : profile.window_expires_at
                  ? `closes ${formatDeliveryDate(profile.window_expires_at)}`
                  : '—'}
            </span>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <Button variant="secondary" href="/upgrade">
              upgrade your plan →
            </Button>
          </div>
        </section>

        <section className="settings-section">
          <h2>billing</h2>
          <p className="muted">receipts and billing are managed through Stripe.</p>
          <p className="muted" style={{ fontSize: '0.875rem' }}>
            (if you’d like a receipt for a recent purchase, please contact us.)
          </p>
        </section>

        <section className="settings-section">
          <h2>notifications</h2>
          <div className="settings-row">
            <span className="settings-row-label">remind me before my scheduling window closes</span>
            <span className="settings-row-value">
              <button
                type="button"
                className={`btn btn-small ${notifyExpiry ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => saveNotifications(!notifyExpiry)}
              >
                {notifyExpiry ? 'on' : 'off'}
              </button>
            </span>
          </div>
        </section>

        <section className="settings-section">
          <h2>delete account</h2>
          <p className="muted">
            this permanently removes your account and all messages you’ve written. it cannot be undone.
          </p>
          <Button variant="danger" onClick={() => setConfirmDelete(true)}>
            delete my account
          </Button>
        </section>
      </div>

      <Modal
        open={confirmDelete}
        title="are you sure?"
        onClose={() => !deleting && setConfirmDelete(false)}
        actions={
          <>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              keep my account
            </button>
            <Button variant="danger" onClick={deleteAccount} disabled={deleting}>
              {deleting ? 'deleting...' : 'yes, delete my account'}
            </Button>
          </>
        }
      >
        <p>
          this will permanently remove your account, your profile, and every message you’ve written. messages already
          delivered will remain readable to their recipients.
        </p>
      </Modal>
    </PageWrapper>
  );
}

export default function Settings() {
  return (
    <ProtectedRoute>
      <SettingsInner />
    </ProtectedRoute>
  );
}
