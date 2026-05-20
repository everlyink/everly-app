import { useAuth } from '@/context/AuthContext';
import {
  PLAN_LABELS,
  isLegacy,
  isWindowExpired,
  planMessagesLimit,
} from '@/lib/plans';
import { formatDeliveryDate } from '@/lib/format';

function buildText(profile) {
  if (!profile) return '';
  const label = PLAN_LABELS[profile.plan] || profile.plan;
  const used = profile.messages_used || 0;
  const limit = planMessagesLimit(profile);
  const usage = `${used}/${limit} messages`;

  if (profile.plan === 'free') {
    return `${label} · ${usage} · no edits`;
  }
  if (isLegacy(profile.plan)) {
    return `${label} · ${usage} · edit anytime`;
  }
  const expired = isWindowExpired(profile);
  if (!profile.window_expires_at) {
    return `${label} · ${usage}`;
  }
  const date = formatDeliveryDate(profile.window_expires_at);
  return `${label} · ${usage} · ${expired ? `edit window closed ${date}` : `edit until ${date}`}`;
}

export default function PlanBar() {
  const { profile } = useAuth();
  if (!profile) return null;
  return <div className="plan-bar">{buildText(profile)}</div>;
}
