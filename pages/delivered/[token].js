import { useState } from 'react';
import Head from 'next/head';
import Logo from '@/components/ui/Logo';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { formatDeliveryDate } from '@/lib/format';
import { themeClass } from '@/lib/plans';

export async function getServerSideProps({ params }) {
  const { token } = params || {};
  if (!token) return { props: { message: null } };
  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin.rpc('get_delivered_message', { token });
    if (error) {
      return { props: { message: null, errorReason: 'lookup-failed' } };
    }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return { props: { message: null, errorReason: 'not-ready' } };
    }
    return {
      props: {
        message: {
          recipient_name: row.recipient_name,
          body: row.body,
          deliver_at: row.deliver_at,
          delivered_at: row.delivered_at,
          written_at: row.written_at,
          sender_first_name: row.sender_first_name,
          theme: row.theme || 'forest',
        },
      },
    };
  } catch (err) {
    return { props: { message: null, errorReason: 'lookup-failed' } };
  }
}

export default function Delivered({ message, errorReason }) {
  const [opened, setOpened] = useState(false);

  if (!message) {
    return (
      <>
        <Head>
          <title>your message · everly</title>
        </Head>
        <div className="delivered-verify">
          <div className="delivered-verify-card">
            <div style={{ marginBottom: '2rem' }}>
              <Logo href={null} />
            </div>
            <h1>this message isn&apos;t ready yet.</h1>
            <p>
              {errorReason === 'not-ready'
                ? 'it may be scheduled for a later date, or the link may be incorrect.'
                : "we couldn't find this message. please check the link, or come back later."}
            </p>
          </div>
        </div>
      </>
    );
  }

  if (!opened) {
    return (
      <>
        <Head>
          <title>you have a message · everly</title>
        </Head>
        <div className="delivered-verify">
          <div className="delivered-verify-card">
            <div style={{ marginBottom: '2rem' }}>
              <Logo href={null} />
            </div>
            <h1>you have a message.</h1>
            <p>someone wrote this for you — and chose today to send it.</p>
            <button type="button" className="btn btn-primary" onClick={() => setOpened(true)}>
              open your message →
            </button>
          </div>
        </div>
      </>
    );
  }

  const writtenDate = formatDeliveryDate(message.written_at);
  const writtenYearOnly = message.written_at ? new Date(message.written_at).getFullYear() : '';
  const deliveredDate = formatDeliveryDate(message.delivered_at || message.deliver_at);

  return (
    <>
      <Head>
        <title>a message from {message.sender_first_name || 'someone'} · everly</title>
      </Head>
      <div className={`delivered-message ${themeClass(message.theme)}`}>
        <div className="delivered-message-inner">
          <p className="delivered-message-from">
            a message from {message.sender_first_name || 'someone'}
          </p>
          <h1>dear {message.recipient_name},</h1>
          <p className="delivered-meta">
            {deliveredDate} · written {writtenDate} · delivered by{' '}
            
              href="https://everly.ink"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline', opacity: 0.7 }}
            >
              everly
            </a>
          </p>
          <div className="delivered-divider" />
          <div className="delivered-body">{message.body}</div>
          <div className="delivered-closing">
            <span className="sparkle">✦</span> this message was written in {writtenYearOnly} and held safely until today.
          </div>
          <div className="delivered-brand">
            
              href="https://everly.ink"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'none' }}
            >
              everly
            </a>
            {' · now in words. always in time. · '}
            
              href="https://everly.ink"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline', opacity: 0.7 }}
            >
              everly.ink
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

