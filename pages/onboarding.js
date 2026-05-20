import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import DatePicker from '@/components/ui/DatePicker';
import TimePicker from '@/components/ui/TimePicker';
import ThemePicker from '@/components/ui/ThemePicker';
import MessagePreview from '@/components/message/MessagePreview';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  maxScheduleDate,
  minScheduleDate,
  isPaid,
  wordCount,
  wordLimit,
} from '@/lib/plans';
import { formatDeliveryDate, preview } from '@/lib/format';

const STEPS = 4;
const MIN_LOADING_MS = 300;

function applyTime(date, hour, minute) {
  if (!date) return null;
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

const draftKey = (userId) => `everly-onboarding-${userId}`;

function readDraft(userId) {
  if (!userId || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(draftKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.deliverAt) parsed.deliverAt = new Date(parsed.deliverAt);
    return parsed;
  } catch {
    return null;
  }
}

function writeDraft(userId, draft) {
  if (!userId || typeof window === 'undefined') return;
  try {
    const serialised = {
      ...draft,
      deliverAt: draft.deliverAt ? draft.deliverAt.toISOString() : null,
    };
    window.localStorage.setItem(draftKey(userId), JSON.stringify(serialised));
  } catch {
    // quota, private mode — ignore
  }
}

function clearDraft(userId) {
  if (!userId || typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(draftKey(userId));
  } catch {}
}

export default function Onboarding() {
  const router = useRouter();
  const { session, profile, loading, refreshProfile } = useAuth();

  // form state
  const [step, setStep] = useState(1);
  const [recipientName, setRecipientName] = useState('');
  const [body, setBody] = useState('');
  const [deliverAt, setDeliverAt] = useState(null);
  const [timeEnabled, setTimeEnabled] = useState(false);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [theme, setTheme] = useState('forest');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // loading floor — keeps the loading state up for at least MIN_LOADING_MS so a fast
  // redirect doesn't flash the wrong screen on iOS Safari restart.
  const [minLoadingDone, setMinLoadingDone] = useState(false);

  // refs guard against re-mount loops and double-redirects on iOS Safari, which can
  // re-run the redirect effect repeatedly while router.replace is still settling.
  const hydratedRef = useRef(false);
  const redirectedRef = useRef(false);

  // ---------- min loading floor ----------
  useEffect(() => {
    const t = setTimeout(() => setMinLoadingDone(true), MIN_LOADING_MS);
    return () => clearTimeout(t);
  }, []);

  // ---------- prefetch next routes ----------
  // warm the JS chunks for /dashboard and /compose so the conversion-screen
  // CTAs feel instant on mobile networks.
  useEffect(() => {
    router.prefetch('/dashboard');
    router.prefetch('/compose');
  }, [router]);

  // ---------- focus the user on the new step ----------
  // on mobile, after tapping "next →" the viewport is anchored to the bottom
  // of the previous step. scroll to the top of the page on every step change.
  // for step 3 specifically (date picker), also pull the calendar into the
  // centre of the viewport after the slide-in finishes — users were missing it.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!minLoadingDone) return;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (step !== 3) return;
    const t = setTimeout(() => {
      const cal = document.querySelector('.onboard-card .datepicker');
      if (cal && typeof cal.scrollIntoView === 'function') {
        cal.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 360);
    return () => clearTimeout(t);
  }, [step, minLoadingDone]);

  // ---------- hydrate from localStorage on first mount with a known user ----------
  // also re-hydrates if the page is restored from bfcache.
  useEffect(() => {
    if (hydratedRef.current) return;
    if (!session?.user?.id) return;
    const draft = readDraft(session.user.id);
    if (draft) {
      if (typeof draft.step === 'number' && draft.step >= 1 && draft.step <= STEPS) setStep(draft.step);
      if (typeof draft.recipientName === 'string') setRecipientName(draft.recipientName);
      if (typeof draft.body === 'string') setBody(draft.body);
      if (draft.deliverAt instanceof Date && !isNaN(draft.deliverAt)) setDeliverAt(draft.deliverAt);
      if (typeof draft.timeEnabled === 'boolean') setTimeEnabled(draft.timeEnabled);
      if (typeof draft.hour === 'number') setHour(draft.hour);
      if (typeof draft.minute === 'number') setMinute(draft.minute);
      if (typeof draft.recipientEmail === 'string') setRecipientEmail(draft.recipientEmail);
      if (typeof draft.theme === 'string') setTheme(draft.theme);
    }
    hydratedRef.current = true;
  }, [session]);

  // ---------- persist draft on every change ----------
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (!session?.user?.id) return;
    writeDraft(session.user.id, {
      step,
      recipientName,
      body,
      deliverAt,
      timeEnabled,
      hour,
      minute,
      recipientEmail,
      theme,
    });
  }, [session, step, recipientName, body, deliverAt, timeEnabled, hour, minute, recipientEmail, theme]);

  // ---------- redirect logic ----------
  useEffect(() => {
    if (!minLoadingDone) return;
    if (loading) return;
    if (redirectedRef.current) return;
    // never redirect while the conversion screen is showing — the user
    // hasn't seen "your message is saved ✦" yet.
    if (saved) return;
    if (!session) {
      redirectedRef.current = true;
      router.replace('/login');
      return;
    }
    if (profile?.onboarding_complete) {
      redirectedRef.current = true;
      router.replace('/dashboard');
    }
  }, [minLoadingDone, loading, session, profile, router, saved]);

  // ---------- conversion screen (must take precedence over loading gate
  //            so the flash of "holding on..." between refreshProfile and
  //            setSaved doesn't appear) ----------
  if (saved) {
    return (
      <div className="success-screen">
        <h1>
          your message to {recipientName} is saved. <span className="sparkle">✦</span>
        </h1>
        <p>while you were writing, did anyone else come to mind?</p>
        <div className="success-actions">
          <Button onClick={() => router.push('/compose')}>yes, i’d like to write another</Button>
          <button type="button" className="btn btn-ghost" onClick={() => router.push('/dashboard')}>
            no, just {recipientName} for now
          </button>
        </div>
      </div>
    );
  }

  // gate the form until we know we're staying here
  const showLoading = !minLoadingDone || loading || !session || profile?.onboarding_complete;
  if (showLoading) return <div className="loading">holding on a moment...</div>;

  const limit = wordLimit(profile);
  const words = wordCount(body);
  const wordsRemaining = limit != null ? limit - words : null;
  const overLimit = limit != null && words > limit;

  function next() {
    setError('');
    if (step === 1 && !recipientName.trim()) {
      setError('please tell us who you’re writing to.');
      return;
    }
    if (step === 2) {
      if (!body.trim()) {
        setError('please write something — there’s no rush.');
        return;
      }
      if (overLimit) {
        setError(`free plan messages are limited to ${limit} words. please shorten yours or upgrade later.`);
        return;
      }
    }
    if (step === 3 && !deliverAt) {
      setError('please pick a date.');
      return;
    }
    if (step === 4 && !recipientEmail.trim()) {
      setError('please add their email address.');
      return;
    }
    if (step < STEPS) {
      setStep(step + 1);
    } else {
      saveMessage();
    }
  }

  function back() {
    setError('');
    if (step > 1) setStep(step - 1);
  }

  async function saveMessage() {
    if (!session?.user?.id || !profile) {
      setError('still signing you in — please try again in a moment.');
      return;
    }
    setSaving(true);
    setError('');

    const finalDeliverAt = timeEnabled ? applyTime(deliverAt, hour, minute) : deliverAt;

    const { error: err } = await supabase.from('messages').insert({
      user_id: session.user.id,
      recipient_name: recipientName.trim(),
      recipient_email: recipientEmail.trim() || null,
      delivery_channel: 'email',
      body: body.trim(),
      deliver_at: finalDeliverAt.toISOString(),
      status: 'scheduled',
      theme,
    });
    if (err) {
      setSaving(false);
      setError('something went wrong saving your message. please try again.');
      return;
    }

    const { error: profErr } = await supabase
      .from('profiles')
      .update({
        onboarding_complete: true,
        messages_used: (profile?.messages_used || 0) + 1,
      })
      .eq('id', session.user.id);

    if (profErr) {
      setSaving(false);
      setError('your message saved, but we couldn’t complete onboarding. please refresh.');
      return;
    }

    clearDraft(session.user.id);
    // set saved BEFORE refreshing the profile: refreshProfile() updates
    // profile.onboarding_complete=true, which would otherwise satisfy the redirect
    // useEffect and navigate to /dashboard before the conversion screen ever rendered.
    setSaved(true);
    await refreshProfile();
    setSaving(false);
  }

  const min = minScheduleDate();
  const max = maxScheduleDate(profile);
  const userIsPaid = profile ? isPaid(profile.plan) : false;
  const bodyPreview = body ? preview(body, 40) : '';

  return (
    <div className="onboard-page">
      <header className="onboard-header">
        <Logo href="/" />
        <span className="onboard-progress">step {step} of {STEPS}</span>
      </header>

      {step >= 2 && (recipientName || bodyPreview) && (
        <div className="onboard-context" aria-label="current draft summary">
          <span className="onboard-context-label">to:</span>{' '}
          <strong>{recipientName || '...'}</strong>
          {bodyPreview && (
            <>
              <span className="dot" aria-hidden="true" />
              <em>{bodyPreview}</em>
            </>
          )}
        </div>
      )}

      <main className="onboard-main">
        <div key={`step-${step}`} className="onboard-card onboard-slide-in">
          {step === 1 && (
            <>
              <h1 className="onboard-heading">who are you writing to?</h1>
              <p className="onboard-sub">just a first name is fine for now.</p>
              <Input
                label="their name"
                autoFocus
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </>
          )}

          {step === 2 && (
            <>
              <h1 className="onboard-heading">write your message.</h1>
              <p className="onboard-sub">take your time. there’s no rush.</p>
              <Textarea
                label="your message"
                placeholder={`dear ${recipientName || 'name'},`}
                rows={10}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                hint="you can edit this later on paid plans."
              />
              {limit != null && (
                <div className={`word-count ${overLimit ? 'word-count-over' : ''}`}>
                  {overLimit
                    ? `${words - limit} words over · free plan is limited to ${limit} words`
                    : `${wordsRemaining} words remaining of ${limit}`}
                </div>
              )}
            </>
          )}

          {step === 3 && (
            <>
              <h1 className="onboard-heading">when should it arrive?</h1>
              <p className="onboard-sub">
                your message to <strong>{recipientName || 'them'}</strong> will be delivered on...
              </p>
              <DatePicker value={deliverAt} onChange={setDeliverAt} minDate={min} maxDate={max} />
              {!userIsPaid && (
                <p className="schedule-nudge">
                  free plan schedules up to 3 years ahead. <a href="/upgrade">paid plans</a> unlock up to 30 years.
                </p>
              )}
              {deliverAt && (
                <p className="field-hint" style={{ marginTop: '0.75rem' }}>
                  will arrive on {formatDeliveryDate(deliverAt)}
                  {timeEnabled && ` · ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`}.
                </p>
              )}
              <TimePicker
                enabled={timeEnabled}
                onToggle={setTimeEnabled}
                hour={hour}
                minute={minute}
                onChange={({ hour: h, minute: m }) => {
                  setHour(h);
                  setMinute(m);
                }}
              />
            </>
          )}

          {step === 4 && (
            <>
              <h1 className="onboard-heading">how should it arrive?</h1>
              <p className="onboard-sub">choose where to send it.</p>

              <div className="option-list" style={{ marginBottom: '1.5rem' }}>
                <button type="button" className="option option-selected">
                  <span>✉</span>
                  <span>email</span>
                </button>
                <button type="button" className="option option-locked" disabled>
                  <span>💬</span>
                  <span>sms</span>
                  <span className="option-locked-label">🔒 available on paid plans</span>
                </button>
              </div>

              <Input
                label="their email"
                type="email"
                autoComplete="off"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />

              <ThemePicker value={theme} onChange={setTheme} />

              {!userIsPaid && (
                <p className="field-hint">
                  free plan includes 1 message delivered by email. <a href="/upgrade">see paid plans →</a>
                </p>
              )}
            </>
          )}

          {step >= 2 && (
            <section className="onboard-preview" aria-label="live preview">
              <p className="onboard-preview-label">
                <span className="sparkle">✦</span> here’s what they’ll see
              </p>
              <MessagePreview
                senderFirstName={profile?.first_name}
                recipientName={recipientName}
                body={body}
                deliverAt={timeEnabled && deliverAt ? applyTime(deliverAt, hour, minute) : deliverAt}
                theme={theme}
              />
            </section>
          )}

          {error && <div className="alert alert-error">{error}</div>}

          <div className="onboard-actions">
            <Button onClick={next} disabled={saving}>
              {saving ? 'saving your message...' : step < STEPS ? 'next →' : 'save my message →'}
            </Button>
            {step > 1 && (
              <button type="button" className="btn btn-ghost" onClick={back}>
                ← go back
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
