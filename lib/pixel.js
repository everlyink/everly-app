// OpenAI Ads Manager pixel (oaiq) helpers.
// Consent is stored in a cookie on .everly.ink so everly.ink and app.everly.ink share one choice.
const COOKIE = 'everly_consent';
const REG_KEY = 'everly-reg-fired';

export function getConsent() {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp('(?:^|; )' + COOKIE + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : null; // 'granted' | 'denied' | null
}

export function setConsent(value) {
  if (typeof document === 'undefined') return;
  const host = window.location.hostname;
  const domain = host.endsWith('everly.ink') ? '; domain=.everly.ink' : '';
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${COOKIE}=${value}; max-age=${60 * 60 * 24 * 180}; path=/; SameSite=Lax${domain}${secure}`;
  if (typeof window.oaiq === 'function') window.oaiq('consent', value === 'granted');
  if (value === 'granted') {
    window.__everlyLastPv = null;
    pageView();
  }
}

function pixelAllowed() {
  if (typeof window === 'undefined' || typeof window.oaiq !== 'function') return false;
  if (getConsent() !== 'granted') return false;
  if (window.location.pathname.startsWith('/delivered/')) return false; // secret-token URLs
  return true;
}

// never send page views from auth-callback URLs that carry tokens
function hasAuthTokens() {
  const { hash, search } = window.location;
  return /access_token|refresh_token|[?&](code|token_hash|token)=/.test(hash + search);
}

// one page_viewed per distinct pathname (guards route events + StrictMode double effects)
export function pageView() {
  if (!pixelAllowed() || hasAuthTokens()) return;
  const path = window.location.pathname;
  if (window.__everlyLastPv === path) return;
  window.__everlyLastPv = path;
  window.oaiq('measure', 'page_viewed', { type: 'contents' });
}

// registration_completed: only after email verification, once per account
export function trackVerifiedRegistration(user) {
  if (!user?.id || !user.email_confirmed_at) return;
  if (Date.now() - new Date(user.email_confirmed_at).getTime() > 60 * 60 * 1000) return; // fresh verification only
  if (!pixelAllowed()) return; // no consent -> don't mark as fired
  try {
    const fired = JSON.parse(localStorage.getItem(REG_KEY) || '[]');
    if (fired.includes(user.id)) return;
    fired.push(user.id);
    localStorage.setItem(REG_KEY, JSON.stringify(fired.slice(-20)));
  } catch {}
  const send = () =>
    window.oaiq('measure', 'registration_completed', { type: 'customer_action' }, { event_id: 'registration_' + user.id });
  if (hasAuthTokens()) setTimeout(send, 800); else send();
}
