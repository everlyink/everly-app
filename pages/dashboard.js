import { useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import PageWrapper from '@/components/layout/PageWrapper';
import PlanBar from '@/components/layout/PlanBar';
import MessageCard from '@/components/message/MessageCard';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useMessages } from '@/hooks/useMessages';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { hasCapacity, isPaid, isWindowExpired } from '@/lib/plans';

const TABS = [
  { id: 'all', label: 'all' },
  { id: 'scheduled', label: 'scheduled' },
  { id: 'delivered', label: 'delivered' },
  { id: 'draft', label: 'draft' },
  { id: 'cancelled', label: 'cancelled' },
];

const SORTS = [
  { id: 'delivery', label: 'by delivery date' },
  { id: 'created', label: 'by created date' },
  { id: 'status', label: 'by status' },
];

const STATUS_RANK = { scheduled: 0, draft: 1, delivered: 2, cancelled: 3 };

function DashboardInner() {
  const router = useRouter();
  const { profile, refreshProfile } = useAuth();
  const { messages, loading, refresh } = useMessages();
  const [tab, setTab] = useState('all');
  const [sort, setSort] = useState('delivery');
  const [confirmCancel, setConfirmCancel] = useState(null);
  const upgraded = router.query.upgraded === 'true';

  const filtered = useMemo(() => {
    const base = tab === 'all' ? messages : messages.filter((m) => m.status === tab);
    const arr = [...base];
    if (sort === 'delivery') {
      arr.sort((a, b) => new Date(a.deliver_at).getTime() - new Date(b.deliver_at).getTime());
    } else if (sort === 'created') {
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sort === 'status') {
      arr.sort((a, b) => {
        const sa = STATUS_RANK[a.status] ?? 99;
        const sb = STATUS_RANK[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return new Date(a.deliver_at).getTime() - new Date(b.deliver_at).getTime();
      });
    }
    return arr;
  }, [messages, tab, sort]);

  async function handleDuplicate(message) {
    if (!hasCapacity(profile)) {
      router.push('/upgrade');
      return;
    }
    if (isWindowExpired(profile)) {
      router.push('/upgrade');
      return;
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const { error } = await supabase.from('messages').insert({
      user_id: message.user_id,
      recipient_name: message.recipient_name,
      recipient_email: message.recipient_email,
      recipient_phone: message.recipient_phone,
      delivery_channel: message.delivery_channel,
      subject: message.subject,
      body: message.body,
      deliver_at: tomorrow.toISOString(),
      status: 'draft',
    });
    if (error) {
      window.alert('something went wrong duplicating this message. please try again.');
      return;
    }
    await refresh();
    await refreshProfile();
  }

  async function handleCancel(message) {
    const { error } = await supabase
      .from('messages')
      .update({ status: 'cancelled' })
      .eq('id', message.id);
    if (error) {
      window.alert('something went wrong cancelling this message. please try again.');
      return;
    }
    setConfirmCancel(null);
    await refresh();
  }

  return (
    <PageWrapper planBar={<PlanBar />}>
      <div className="container">
        {upgraded && (
          <div className="alert alert-success">
            your plan is active. <span className="sparkle">✦</span> welcome to a fuller word clock.
          </div>
        )}

        <div className="row-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0 }}>
              {profile?.first_name
                ? `${profile.first_name.trim().toLowerCase()}'s word clock`
                : 'your word clock'}
            </h1>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              messages held safely, waiting for their moment.
            </p>
          </div>
        </div>

        <div className="dashboard-filters">
          <div className="tabs" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                className={`tab ${tab === t.id ? 'tab-active' : ''}`}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>
          <label className="dashboard-sort">
            <span className="visually-hidden">sort messages</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="datepicker-select">
              {SORTS.map((s) => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="loading">holding your messages...</div>
        ) : filtered.length === 0 ? (
          <EmptyState hasMessages={messages.length > 0} tab={tab} />
        ) : (
          <div className="stack stack-md">
            {filtered.map((m) => (
              <MessageCard
                key={m.id}
                message={m}
                profile={profile}
                onDuplicate={handleDuplicate}
                onCancel={(msg) => setConfirmCancel(msg)}
              />
            ))}
          </div>
        )}
      </div>

      <Modal
        open={!!confirmCancel}
        title="cancel this message?"
        onClose={() => setConfirmCancel(null)}
        actions={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmCancel(null)}>
              keep it
            </button>
            <Button variant="danger" onClick={() => handleCancel(confirmCancel)}>
              cancel it
            </Button>
          </>
        }
      >
        <p>
          this will stop the message to <strong>{confirmCancel?.recipient_name}</strong> from being delivered. you can’t
          undo this.
        </p>
      </Modal>
    </PageWrapper>
  );
}

function EmptyState({ hasMessages, tab }) {
  if (!hasMessages) {
    return (
      <div className="empty">
        <h2>your word clock is waiting.</h2>
        <p>write your first message — to someone you love, for a moment that matters.</p>
        <Button href="/compose">write your first message →</Button>
      </div>
    );
  }
  return (
    <div className="empty">
      <h2>nothing here yet.</h2>
      <p>no messages with status “{tab}”.</p>
    </div>
  );
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardInner />
    </ProtectedRoute>
  );
}
