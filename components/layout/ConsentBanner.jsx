import { useEffect, useState } from 'react';
import { getConsent, setConsent } from '@/lib/pixel';

export default function ConsentBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => { setShow(getConsent() === null); }, []);
  if (!show) return null;
  const choose = (v) => { setConsent(v); setShow(false); };
  const btn = {
    flex: '1 1 0', minHeight: 44, padding: '0 18px', borderRadius: 999, cursor: 'pointer',
    fontFamily: 'var(--font-ui)', fontSize: 14, border: '1.5px solid var(--forest)',
    background: 'var(--forest)', color: 'var(--warm-white)',
  };
  return (
    <div role="dialog" aria-label="cookie choices" style={{
      position: 'fixed', left: 16, right: 16, bottom: 16, maxWidth: 440, margin: '0 auto', zIndex: 9999,
      background: 'var(--warm-white)', color: 'var(--warm-black)', border: '1px solid var(--sand)',
      borderRadius: 12, padding: 18, boxShadow: 'var(--shadow-lift)', fontFamily: 'var(--font-ui)',
    }}>
      <p style={{ margin: '0 0 14px', fontSize: 14, lineHeight: 1.5 }}>
        may we use a measurement cookie to learn which of our ads bring people to everly? it’s optional, and everything works either way. <a href="https://everly.ink/privacy.html" style={{ color: 'var(--forest)' }}>privacy &amp; cookies</a>
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button style={btn} onClick={() => choose('denied')}>no thanks</button>
        <button style={btn} onClick={() => choose('granted')}>yes, that’s fine</button>
      </div>
    </div>
  );
}
