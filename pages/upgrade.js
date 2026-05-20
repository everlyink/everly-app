import { useState } from 'react';
import { useRouter } from 'next/router';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import PageWrapper from '@/components/layout/PageWrapper';
import Button from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';
import { PLAN_OPTIONS } from '@/lib/plans';

function UpgradeInner() {
  const router = useRouter();
  const { profile, session } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState(null);
  const [error, setError] = useState('');

  async function startCheckout(planId) {
    if (planId === 'free') return;
    setError('');
    setLoadingPlan(planId);
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          plan: planId,
          email: session?.user?.email,
          userId: session?.user?.id,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setError('something went wrong starting checkout. please try again.');
        setLoadingPlan(null);
        return;
      }
      window.location.href = json.url;
    } catch (e) {
      setError('something went wrong starting checkout. please try again.');
      setLoadingPlan(null);
    }
  }

  return (
    <PageWrapper>
      <div className="container">
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <h1>ready to write more?</h1>
          <p className="muted">
            one-off payment. no subscription. yours for as long as you keep writing.
          </p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="pricing-grid">
          {PLAN_OPTIONS.map((plan) => {
            const current = profile?.plan === plan.id;
            return (
              <div
                key={plan.id}
                className={`pricing-card ${plan.id === 'legacy' ? 'pricing-card-legacy' : ''}`}
              >
                {plan.label && <span className="pricing-card-label">{plan.label}</span>}
                <h3>{plan.name}</h3>
                <div className="price">
                  {plan.price} <small>once</small>
                </div>
                <ul>
                  {plan.features.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
                <p className="pricing-duration">{plan.duration}</p>
                {plan.id === 'free' ? (
                  <Button variant="secondary" disabled>
                    {current ? 'your current plan' : 'free tier'}
                  </Button>
                ) : current ? (
                  <Button variant="secondary" disabled>
                    your current plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => startCheckout(plan.id)}
                    disabled={loadingPlan === plan.id}
                  >
                    {loadingPlan === plan.id ? 'opening checkout...' : 'choose this plan →'}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <p className="muted text-center" style={{ marginTop: '2rem', fontSize: '0.875rem' }}>
          no refunds. messages are held with care for the length of your plan.
        </p>
      </div>
    </PageWrapper>
  );
}

export default function Upgrade() {
  return (
    <ProtectedRoute>
      <UpgradeInner />
    </ProtectedRoute>
  );
}
