import { useRouter } from 'next/router';
import Link from 'next/link';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import PageWrapper from '@/components/layout/PageWrapper';
import PlanBar from '@/components/layout/PlanBar';
import MessageComposer from '@/components/message/MessageComposer';
import { useMessage } from '@/hooks/useMessages';
import { useAuth } from '@/context/AuthContext';
import { isPaid } from '@/lib/plans';
import { useEffect } from 'react';

function EditInner() {
  const router = useRouter();
  const { id } = router.query;
  const { profile, loading: authLoading } = useAuth();
  const { message, loading } = useMessage(id);

  useEffect(() => {
    if (authLoading) return;
    if (profile && !isPaid(profile.plan)) {
      router.replace('/upgrade');
    }
  }, [authLoading, profile, router]);

  if (loading || !message) return <div className="loading">holding your message...</div>;

  return (
    <PageWrapper planBar={<PlanBar />} showCompose={false}>
      <div className="container">
        <p className="muted" style={{ marginBottom: '0.5rem' }}>
          <Link href={`/message/${id}`}>← back</Link>
        </p>
        <h1 style={{ marginBottom: '0.25rem' }}>edit your message</h1>
        <p className="muted" style={{ marginBottom: '2rem' }}>changes are saved to the same message.</p>
        <MessageComposer existing={message} />
      </div>
    </PageWrapper>
  );
}

export default function EditMessage() {
  return (
    <ProtectedRoute>
      <EditInner />
    </ProtectedRoute>
  );
}
