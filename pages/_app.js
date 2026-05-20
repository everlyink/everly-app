import '@/styles/globals.css';
import { useEffect } from 'react';
import Head from 'next/head';
import { AuthProvider } from '@/context/AuthContext';

export default function App({ Component, pageProps }) {
  // on mobile, when an input/textarea gets focus, scroll it to the centre of
  // the visible viewport after the soft keyboard has finished animating.
  // iOS does this by default for plain inputs, but the behaviour is patchy
  // inside scroll containers and tall forms. desktop is unaffected.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    function handleFocus(e) {
      const target = e.target;
      if (!target || typeof target.matches !== 'function') return;
      if (!target.matches('input, textarea, select')) return;
      if (!window.matchMedia('(max-width: 768px)').matches) return;

      // 350ms ≈ iOS keyboard animation length; tweak only if needed
      setTimeout(() => {
        try {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {
          // older browsers without the options form
          target.scrollIntoView();
        }
      }, 350);
    }

    document.addEventListener('focusin', handleFocus);
    return () => document.removeEventListener('focusin', handleFocus);
  }, []);

  return (
    <AuthProvider>
      <Head>
        <title>everly · now in words. always in time.</title>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content"
        />
        <meta name="description" content="write heartfelt messages today. everly delivers them at exactly the right moment." />
        <meta name="theme-color" content="#FAFAF8" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>
      <Component {...pageProps} />
    </AuthProvider>
  );
}
