// ============================================================
// plan limits, pricing, and business-rule helpers
// ============================================================

export const PLAN_LIMITS = {
  free: { messages: 1, recipients: 1 },
  single: { messages: 3, recipients: 1 },
  bundle_s: { messages: 15, recipients: 3 },
  bundle_m: { messages: 100, recipients: 10 },
  legacy: { messages: 300, recipients: 30 },
};

export const PLAN_PRICES = {
  // amounts in pence (Stripe expects smallest currency unit)
  single: 599,
  bundle_s: 1499,
  bundle_m: 2999,
  legacy: 9900,
};

export const PLAN_LABELS = {
  free: 'free',
  single: 'single',
  bundle_s: 'bundle s',
  bundle_m: 'bundle m',
  legacy: 'legacy',
};

export const PLAN_OPTIONS = [
  {
    id: 'free',
    name: 'free',
    price: '£0',
    messages: '1 message',
    recipients: '1 recipient',
    window: '3-year scheduling window · not extendable',
    duration: '✦ schedule up to 3 years ahead',
    features: ['1 message', '1 recipient', 'email delivery only'],
  },
  {
    id: 'single',
    name: 'single',
    price: '£5.99',
    messages: '3 messages',
    recipients: '1 recipient',
    window: '3-year edit window · extendable',
    duration: '✦ schedule up to 30 years ahead · 3-year edit window',
    features: ['3 messages', '1 recipient', 'email + sms', '30-year scheduling reach', '3-year edit window (extendable)', 'edit each message within 10 days'],
  },
  {
    id: 'bundle_s',
    name: 'bundle s',
    price: '£14.99',
    messages: '5 messages × 3 recipients',
    recipients: '3 recipients',
    window: '3-year edit window · extendable',
    duration: '✦ schedule up to 30 years ahead · 3-year edit window',
    features: ['15 messages total', '3 recipients', 'email + sms', '30-year scheduling reach', '3-year edit window (extendable)', 'edit each message within 10 days'],
  },
  {
    id: 'bundle_m',
    name: 'bundle m',
    price: '£29.99',
    messages: '10 messages × 10 recipients',
    recipients: '10 recipients',
    window: '3-year edit window · extendable',
    duration: '✦ schedule up to 50 years ahead · 3-year edit window',
    features: ['100 messages total', '10 recipients', 'email + sms', '50-year scheduling reach', '3-year edit window (extendable)', 'edit each message within 10 days'],
  },
  {
    id: 'legacy',
    name: 'legacy',
    price: '£99',
    messages: '10 messages × 30 recipients',
    recipients: '30 recipients',
    window: 'no expiry',
    duration: '✦ held for as long as everly exists',
    label: 'most thoughtful',
    features: ['300 messages total', '30 recipients', 'email + sms', 'no scheduling limit', 'no edit-window expiry'],
  },
];

export const PAID_PLANS = new Set(['single', 'bundle_s', 'bundle_m', 'legacy']);

// scheduling reach (max date a user can schedule for), measured in years
// from plan_purchased_at. legacy is bounded at year 2100 — see maxScheduleDate.
export const PAID_SCHEDULE_YEARS = {
  single: 30,
  bundle_s: 30,
  bundle_m: 50,
};

export const LEGACY_SCHEDULE_END = new Date(2100, 11, 31, 23, 59, 59);

// free users: 300 words. paid: unlimited.
export const WORD_LIMIT_FREE = 300;

export function wordCount(text = '') {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function wordLimit(profile) {
  if (!profile) return WORD_LIMIT_FREE;
  return isPaid(profile.plan) ? null : WORD_LIMIT_FREE;
}

export const THEMES = [
  {
    id: 'forest',
    name: 'forest',
    bg: '#2C4A3E',
    text: '#FAFAF8',
    isLight: false,
  },
  {
    id: 'terracotta',
    name: 'terracotta',
    bg: '#C0604A',
    text: '#FAFAF8',
    isLight: false,
  },
  {
    id: 'sand',
    name: 'sand',
    bg: '#E8D5B0',
    text: '#1C1C1A',
    isLight: true,
  },
  {
    id: 'blush',
    name: 'blush',
    bg: '#FCDFC8',
    text: '#1C1C1A',
    accent: '#C0604A',
    isLight: true,
  },
];

export function themeClass(themeId) {
  switch (themeId) {
    case 'terracotta':
      return 'theme-terracotta';
    case 'sand':
      return 'theme-sand';
    case 'blush':
      return 'theme-blush';
    case 'forest':
    default:
      return 'theme-forest';
  }
}

export function isPaid(plan) {
  return PAID_PLANS.has(plan);
}

export function isLegacy(plan) {
  return plan === 'legacy';
}

export function isWindowExpired(profile) {
  if (!profile) return false;
  if (isLegacy(profile.plan)) return false;
  if (profile.is_window_expired) return true;
  if (!profile.window_expires_at) return false;
  return new Date(profile.window_expires_at).getTime() < Date.now();
}

// the latest date a user can schedule a message for, based on their plan.
//
// the "scheduling reach" is separate from the "management window":
//   • free: schedule up to 3 years from signup (same as their management window)
//   • paid (single/bundle_s/bundle_m): schedule up to 10 years from purchase
//     — even though their 3-year management window controls add/edit/cancel
//   • legacy: no cap
export function maxScheduleDate(profile) {
  if (!profile) {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 3);
    return d;
  }
  if (isLegacy(profile.plan)) {
    // "no limit" — bounded only by the calendar's practical end at Dec 31, 2100
    return new Date(LEGACY_SCHEDULE_END);
  }
  if (isPaid(profile.plan)) {
    // paid: reach varies by plan (single/bundle_s: 30y, bundle_m: 50y),
    // measured from purchase, independent of the 3-year edit window
    const purchaseAnchor = profile.plan_purchased_at
      ? new Date(profile.plan_purchased_at)
      : new Date();
    const max = new Date(purchaseAnchor);
    const years = PAID_SCHEDULE_YEARS[profile.plan] ?? 30;
    max.setFullYear(max.getFullYear() + years);
    return max;
  }
  // free: scheduling cap matches the 3-year management window
  if (profile.window_expires_at) {
    return new Date(profile.window_expires_at);
  }
  const d = new Date();
  d.setFullYear(d.getFullYear() + 3);
  return d;
}

// tomorrow, at start of day (UTC)
export function minScheduleDate() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// returns true if a paid user can still edit this message.
// gated by both:
//   • per-message 10-day edit window (10 days from message creation)
//   • account-level management window (3 years from plan purchase for paid)
// legacy users have no account-level expiry, so only the 10-day rule applies.
export function canEditMessage(message, profile) {
  if (!message || !profile) return false;
  if (!isPaid(profile.plan)) return false;
  if (message.status === 'delivered' || message.status === 'cancelled') return false;
  if (isWindowExpired(profile)) return false;
  const created = new Date(message.created_at);
  const tenDays = 10 * 24 * 60 * 60 * 1000;
  return Date.now() - created.getTime() <= tenDays;
}

// returns the cutoff date after which a message can no longer be edited
export function editWindowEnd(message) {
  if (!message) return null;
  const created = new Date(message.created_at);
  return new Date(created.getTime() + 10 * 24 * 60 * 60 * 1000);
}

// returns true if a user can still cancel this message
// (paid: up to 3 days before delivery · legacy: up to 2 hours before)
// also blocked when the account-level management window has closed.
export function canCancelMessage(message, profile) {
  if (!message || !profile) return false;
  if (!isPaid(profile.plan)) return false;
  if (message.status === 'delivered' || message.status === 'cancelled') return false;
  if (isWindowExpired(profile)) return false;
  const deliver = new Date(message.deliver_at).getTime();
  const cutoff = isLegacy(profile.plan) ? 2 * 60 * 60 * 1000 : 3 * 24 * 60 * 60 * 1000;
  return deliver - Date.now() > cutoff;
}

// derives the canonical messages cap from the user's plan, not from the
// denormalised messages_limit column. The column is a hint that can drift
// (manual DB edits, missed Stripe webhooks); the plan field is the source of truth.
export function planMessagesLimit(profile) {
  if (!profile) return 1;
  return PLAN_LIMITS[profile.plan]?.messages ?? profile.messages_limit ?? 1;
}

export function planRecipientsLimit(profile) {
  if (!profile) return 1;
  return PLAN_LIMITS[profile.plan]?.recipients ?? profile.recipients_limit ?? 1;
}

// returns true if the user has remaining message capacity on their plan
export function hasCapacity(profile) {
  if (!profile) return false;
  return (profile.messages_used || 0) < planMessagesLimit(profile);
}

export function planUpdateForCheckout(planId, purchasedAt = new Date()) {
  const limits = PLAN_LIMITS[planId];
  if (!limits) throw new Error(`unknown plan: ${planId}`);
  const update = {
    plan: planId,
    messages_limit: limits.messages,
    recipients_limit: limits.recipients,
    plan_purchased_at: purchasedAt.toISOString(),
    is_window_expired: false,
  };
  if (planId === 'legacy') {
    update.window_expires_at = null;
  } else {
    // 3-year management window. scheduling reach is computed separately in
    // maxScheduleDate() and is 10 years from purchase for paid plans.
    const expires = new Date(purchasedAt);
    expires.setFullYear(expires.getFullYear() + 3);
    update.window_expires_at = expires.toISOString();
  }
  return update;
}
