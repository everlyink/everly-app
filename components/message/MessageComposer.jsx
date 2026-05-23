import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import Button from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import DatePicker from '@/components/ui/DatePicker';
import ThemePicker from '@/components/ui/ThemePicker';
import EmojiBar from '@/components/ui/EmojiBar';
import MessagePreview from './MessagePreview';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import {
  isPaid,
  hasCapacity,
  maxScheduleDate,
  minScheduleDate,
  isWindowExpired,
  canEditMessage,
  editWindowEnd,
  wordCount,
  wordLimit,
} from '@/lib/plans';
import { formatDeliveryDate } from '@/lib/format';
import { readComposerDraft, writeComposerDraft, clearComposerDraft } from '@/lib/composerDraft';

const SAVE_TIMEOUT_MS = 12000;

function withTimeout(thenable, ms, label) {
  return Promise.race([
    Promise.resolve(thenable),
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

function applyTime(date, hour, minute) {
  if (!date) return null;
  const next = new Date(date);
  next.setHours(hour, minute, 0, 0);
  return next;
}

export default function MessageComposer({ existing }) {
  const router = useRouter();
  const { session, profile, loading: authLoading, refreshProfile } = useAuth();
  const editing = !!existing;


  const [recipientName, setRecipientName] = useState(existing?.recipient_name || '');
  const [recipientEmail, setRecipientEmail] = useState(existing?.recipient_email || '');
  const [recipientPhone, setRecipientPhone] = useState(existing?.recipient_phone || '');
  const [channel, setChannel] = useState(existing?.delivery_channel || 'email');
  const [body, setBody] = useState(existing?.body || '');
  const [deliverAt, setDeliverAt] = useState(existing?.deliver_at ? new Date(existing.deliver_at) : null);
  const [theme, setTheme] = useState(existing?.theme || 'forest');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedAs, setSavedAs] = useState(null);
  const [reviewing, setReviewing] = useState(false);

  const textareaRef = useRef(null);
  const hydratedRef = useRef(false);
  const userId = session?.user?.id;

  // ---------- hydrate from localStorage (new messages only) ----------
  useEffect(() => {
    if (editing) return;
    if (hydratedRef.current) return;
    if (!userId) return;
    const draft = readComposerDraft(userId);
    if (draft) {
      if (typeof draft.recipientName === 'string') setRecipientName(draft.recipientName);
      if (typeof draft.recipientEmail === 'string') setRecipientEmail(draft.recipientEmail);
      if (typeof draft.recipientPhone === 'string') setRecipientPhone(draft.recipientPhone);
      if (typeof draft.channel === 'string') setChannel(draft.channel);
      if (typeof draft.body === 'string') setBody(draft.body);
      if (draft.deliverAt instanceof Date && !isNaN(draft.deliverAt)) setDeliverAt(draft.deliverAt);      if (typeof draft.theme === 'string') setTheme(draft.theme);
    }
    hydratedRef.current = true;
  }, [editing, userId]);

  // ---------- persist every change ----------
  useEffect(() => {
    if (editing) return;
    if (!hydratedRef.current) return;
    if (!userId) return;
    writeComposerDraft(userId, {
      recipientName,
      recipientEmail,
      recipientPhone,
      channel,
      body,
      deliverAt,
      theme,
    });
  }, [editing, userId, recipientName, recipientEmail, recipientPhone, channel, body, deliverAt, theme]);

  function insertAtCursor(char) {
    const ta = textareaRef.current;
    if (!ta) {
      setBody((prev) => prev + char);
      return;
    }
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const next = body.slice(0, start) + char + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      try {
        ta.focus();
        const pos = start + char.length;
        ta.setSelectionRange(pos, pos);
      } catch {}
    });
  }

  const paid = profile ? isPaid(profile.plan) : false;
  const editable = editing ? canEditMessage(existing, profile) : true;
  const canSchedule = editing ? editable : hasCapacity(profile) && !isWindowExpired(profile);

  const limit = wordLimit(profile);
  const words = wordCount(body);
  const wordsRemaining = limit != null ? limit - words : null;
  const overLimit = limit != null && words > limit;

  const finalDeliverAt = deliverAt;

  useEffect(() => {
    if (authLoading || !profile) return;
    if (!editing && !hasCapacity(profile)) {
      router.replace('/upgrade');
    }
    if (!editing && isWindowExpired(profile)) {
      router.replace('/upgrade');
    }
  }, [profile, authLoading, editing, router]);

  function validate(forStatus) {
    if (!recipientName.trim()) return 'please add a recipient name.';
    if (!body.trim()) return 'please write something — there’s no rush.';
    if (overLimit) {
      return `free plan messages are limited to ${limit} words. please shorten your message or upgrade.`;
    }
    if (forStatus === 'scheduled') {
      if (!deliverAt) return 'please pick a delivery date.';
      if (channel === 'email' && !recipientEmail.trim()) return 'please add their email address.';
      if (channel === 'sms' && !recipientPhone.trim()) return 'please add their phone number.';
    }
    return null;
  }

  function review() {
    setError('');
    const v = validate('scheduled');
    if (v) {
      setError(v);
      return;
    }
    if (!canSchedule) return;
    setReviewing(true);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function backToEdit() {
    setReviewing(false);
    setError('');
  }

  async function save(status) {
    setError('');
    if (!userId) {
      setError('still signing you in — please try again in a moment.');
      return;
    }
    if (!profile) {
      setError('still loading your account — please try again in a moment.');
      return;
    }

    const v = validate(status);
    if (v) {
      setError(v);
      return;
    }
    setSaving(true);

    const payload = {
      recipient_name: recipientName.trim(),
      recipient_email: recipientEmail.trim() || null,
      recipient_phone: recipientPhone.trim() || null,
      delivery_channel: channel,
      body: body.trim(),
      deliver_at: finalDeliverAt
        ? finalDeliverAt.toISOString()
        : existing?.deliver_at || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      status,
      theme,
    };

    try {
      if (editing) {
        const { error: err } = await supabase.from('messages').update(payload).eq('id', existing.id);
        if (err) throw err;
      } else {
        const { error: err } = await supabase.from('messages').insert({ ...payload, user_id: userId });
        if (err) throw err;

        // best-effort increment of messages_used. don't block the success
        // flow on this — if it hangs or fails, the planMessagesLimit fallback
        // in lib/plans.js still derives the correct cap from the plan id.
        supabase
          .from('profiles')
          .update({ messages_used: (profile.messages_used || 0) + 1 })
          .eq('id', userId)
          .then(() => {})
          .catch((e) => console.warn('[everly] messages_used update failed:', e));

        // refresh profile in the background — the user shouldn't wait on this.
        // previously this `await` was the most common cause of the "scheduling..."
        // freeze on slow networks.
        refreshProfile();
        clearComposerDraft(userId);
      }

      setSaving(false);
      setReviewing(false);
      setSavedAs(status);
    } catch (e) {
      console.error('[everly] save error:', e);
      setSaving(false);
      const message = 'something went wrong scheduling your message. please try again.';
      setError(message);
    }
  }

  // ---------- success screens ----------
  if (savedAs === 'scheduled') {
    return (
      <div className="success-screen">
        <h1>
          scheduled. <span className="sparkle">✦</span>
        </h1>
        <p>
          your message to {recipientName} will arrive on{' '}
          {finalDeliverAt ? formatDeliveryDate(finalDeliverAt) : 'the date you chose'}.
        </p>
        <div className="success-actions">
          <Button href="/dashboard">back to your word clock →</Button>
        </div>
      </div>
    );
  }

  if (savedAs === 'draft') {
    return (
      <div className="success-screen">
        <h1>
          draft saved. <span className="sparkle">✦</span>
        </h1>
        <p>you can finish this whenever you’re ready.</p>
        <div className="success-actions">
          <Button href="/dashboard">back to your word clock →</Button>
        </div>
      </div>
    );
  }

  // ---------- review screen ----------
  if (reviewing) {
    return (
      <div className="review-screen">
        <header className="review-header">
          <button type="button" className="btn btn-ghost btn-small" onClick={backToEdit}>
            ← go back and edit
          </button>
        </header>
        <main className="review-main">
          <div className="review-card">
            <h1 className="review-heading">{editing ? 'ready to save these changes?' : 'ready to schedule?'}</h1>
            <p className="review-sub">
              to <strong>{recipientName}</strong> · arriving {formatDeliveryDate(finalDeliverAt)}
            </p>

            <MessagePreview
              senderFirstName={profile?.first_name}
              recipientName={recipientName}
              body={body}
              deliverAt={finalDeliverAt}
              theme={theme}
            />

            {paid ? (
              <div className="review-note review-note-info">
                <span className="review-note-icon" aria-hidden="true">✦</span>
                <span>
                  you can edit this message for the next 10 days. after that, it will be held safely until delivery.
                </span>
              </div>
            ) : (
              <div className="review-note review-note-warning">
                <span className="review-note-icon" aria-hidden="true">!</span>
                <span>
                  once scheduled, this message cannot be edited or cancelled. <a href="/upgrade">upgrade to a paid plan</a> to keep full control.
                </span>
              </div>
            )}

            {error && <div className="alert alert-error" style={{ marginTop: '1.5rem' }}>{error}</div>}

            <div className="review-actions">
              <Button onClick={() => save('scheduled')} disabled={saving}>
                {saving ? 'scheduling...' : editing ? 'confirm & save ✦' : 'confirm & schedule ✦'}
              </Button>
              <button type="button" className="btn btn-ghost" onClick={backToEdit} disabled={saving}>
                ← go back and edit
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ---------- editing screen ----------
  const min = minScheduleDate();
  const max = maxScheduleDate(profile);
  const editEnd = editing ? editWindowEnd(existing) : null;

  return (
    <>
      <div className="composer">
        <div className="composer-form">
          {editing && !editable && (
            <div className="alert alert-error">
              you can’t edit this message any more — the 10-day window has closed.
            </div>
          )}
          {editing && editable && editEnd && (
            <div className="alert alert-success" style={{ marginBottom: '1.25rem' }}>
              edit window closes {formatDeliveryDate(editEnd)}.
            </div>
          )}

          <Input
            label="to"
            placeholder="recipient name"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
            disabled={editing && !editable}
          />

          <div className="field">
            <span className="field-label">deliver via</span>
            <div className="option-list">
              <button
                type="button"
                className={`option ${channel === 'email' ? 'option-selected' : ''}`}
                onClick={() => setChannel('email')}
                disabled={editing && !editable}
              >
                <span>✉</span> email
              </button>
              <button
                type="button"
                className={`option ${channel === 'sms' ? 'option-selected' : ''} ${!paid ? 'option-locked' : ''}`}
                onClick={() => paid && setChannel('sms')}
                disabled={!paid || (editing && !editable)}
              >
                <span>💬</span> sms
                {!paid && <span className="option-locked-label">🔒 paid plans</span>}
              </button>
            </div>
            {channel === 'sms' && (
              <p className="field-hint" style={{ marginTop: '0.5rem' }}>
                we’ll text a short link. your full message opens on everly when they tap it.
              </p>
            )}
          </div>

          {channel === 'email' && (
            <Input
              label="their email"
              type="email"
              value={recipientEmail}
              onChange={(e) => setRecipientEmail(e.target.value)}
              disabled={editing && !editable}
            />
          )}
          {channel === 'sms' && (
            <Input
              label="their phone"
              type="tel"
              placeholder="+44..."
              value={recipientPhone}
              onChange={(e) => setRecipientPhone(e.target.value)}
              disabled={editing && !editable}
            />
          )}

          <div className="field">
            <span className="field-label">deliver on</span>
            <DatePicker value={deliverAt} onChange={setDeliverAt} minDate={min} maxDate={max} />
            {!paid && (
              <p className="schedule-nudge">
                free plan schedules up to 3 years ahead. <a href="/upgrade">paid plans</a> unlock up to 30 years.
              </p>
            )}
            {deliverAt && (
              <span className="field-hint">
                {formatDeliveryDate(deliverAt)}
                
              </span>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="composer-body">your message</label>
            <EmojiBar onInsert={insertAtCursor} />
            <textarea
              ref={textareaRef}
              id="composer-body"
              className="textarea"
              placeholder={`dear ${recipientName || 'name'},`}
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              disabled={editing && !editable}
            />
          </div>

          {limit != null ? (
            <div className={`word-count ${overLimit ? 'word-count-over' : ''}`}>
              {overLimit
                ? `${words - limit} words over · free plan is limited to ${limit} words`
                : `${wordsRemaining} words remaining of ${limit}`}
            </div>
          ) : (
            <div className="char-count">{body.length} characters</div>
          )}

          <ThemePicker value={theme} onChange={setTheme} />

          {error && <div className="alert alert-error">{error}</div>}

          <div className="composer-actions">
            <Button
              onClick={review}
              disabled={saving || !canSchedule || (editing && !editable) || overLimit}
            >
              {editing ? 'review & save →' : 'review & schedule →'}
            </Button>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={saving || (editing && !editable)}
              onClick={() => save('draft')}
            >
              {saving ? 'saving...' : 'save as draft'}
            </button>
          </div>
        </div>

        <aside className="composer-preview-wrap" aria-label="live preview">
          <p className="composer-preview-label">
            <span className="sparkle">✦</span> here’s what they’ll see
          </p>
          <MessagePreview
            senderFirstName={profile?.first_name}
            recipientName={recipientName}
            body={body}
            deliverAt={finalDeliverAt}
            theme={theme}
          />
        </aside>
      </div>
    </>
  );
}
