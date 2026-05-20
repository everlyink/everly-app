import ProtectedRoute from '@/components/layout/ProtectedRoute';
import PageWrapper from '@/components/layout/PageWrapper';
import PlanBar from '@/components/layout/PlanBar';
import MessageComposer from '@/components/message/MessageComposer';

function ComposeInner() {
  return (
    <PageWrapper planBar={<PlanBar />} showCompose={false}>
      <div className="container">
        <h1 style={{ marginBottom: '0.25rem' }}>write a message</h1>
        <p className="muted" style={{ marginBottom: '2rem' }}>
          take your time. there’s no rush.
        </p>
        <MessageComposer />
      </div>
    </PageWrapper>
  );
}

export default function Compose() {
  return (
    <ProtectedRoute>
      <ComposeInner />
    </ProtectedRoute>
  );
}
