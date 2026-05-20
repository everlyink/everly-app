import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import PageWrapper from '@/components/layout/PageWrapper';
import PlanBar from '@/components/layout/PlanBar';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import MessagePreview from '@/components/message/MessagePreview';
import { useMessage } from '@/hooks/useMessages';
import { useAuth } from '@/context/AuthContext';
import { canEditMessage, editWindowEnd } from '@/lib/plans';
import { formatDeliveryDate } from '@/lib/format';

function MessageDetailInner() {
  const router = useRouter();
  const { id } = router.query;
  const { profile } = useAuth();
  const { message, loading } = useMessage(id);

  if (loading) return <div className="loading">holding your message...</div>;

  if (!message) {
    return (
      <div className="container container-reading">
        <h1>we couldn’t find that message.</h1>
        <p className="muted">it may have been removed.</p>
        <Link href="/dashboard">← back to your word clock</Link>
      </div>
    );
  }

  const editable = canEditMessage(message, profile);
  const editEnd = editWindowEnd(message);

  return (
    <PageWrapper planBar={<PlanBar />}>
      <div className="container container-reading">
        <p className="muted" style={{ marginBottom: '0.5rem' }}>
          <Link href="/dashboard">← back</Link>
        </p>

        <div className="row-between" style={{ marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: 0 }}>to {message.recipient_name}</h1>
            <p className="muted" style={{ margin: '0.25rem 0 0' }}>
              {formatDeliveryDate(message.deliver_at)}
            </p>
          </div>
          <StatusBadge status={message.status} />
        </div>

        <MessagePreview
          senderFirstName={profile?.first_name}
          recipientName={message.recipient_name}
          body={message.body}
          deliverAt={message.deliver_at}
          writtenAt={message.written_at || message.created_at}
        />

        <div className="row" style={{ marginTop: '2rem', flexWrap: 'wrap' }}>
          {editable && (
            <Button href={`/message/${message.id}/edit`}>edit this message →</Button>
          )}
          {!editable && message.status !== 'delivered' && (
            <p className="muted">
              {editEnd && new Date(editEnd) < new Date()
                ? 'the 10-day edit window has closed.'
                : 'edit not available on your plan.'}
            </p>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}

export default function MessageDetail() {
  return (
    <ProtectedRoute>
      <MessageDetailInner />
    </ProtectedRoute>
  );
}
