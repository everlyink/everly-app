import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { sendDeliveryEmail } from '@/lib/resendServer';
import { sendDeliverySms } from '@/lib/twilioServer';

// invoked hourly by Vercel Cron. authenticates via the CRON_SECRET header
// that Vercel automatically attaches (or via a manual secret for local testing).

export default async function handler(req, res) {
  // Vercel cron sends GET requests with an Authorization: Bearer <CRON_SECRET> header
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.authorization;
    if (auth !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'unauthorized' });
    }
  }

  let admin;
  try {
    admin = getSupabaseAdmin();
  } catch (err) {
    console.error('[send-message] admin client init failed:', err);
    return res.status(500).json({
      error: 'admin client init failed',
      message: err.message,
      stack: err.stack,
    });
  }

  const nowIso = new Date().toISOString();

  const { data: due, error } = await admin
    .from('messages')
    .select('*')
    .eq('status', 'scheduled')
    .lte('deliver_at', nowIso);

  if (error) {
    console.error('[send-message] query failed:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
      full: error,
    });
    return res.status(500).json({
      error: 'query failed',
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
  }

  if (!due || due.length === 0) {
    return res.status(200).json({ sent: 0, message: 'nothing due' });
  }

  // pre-fetch sender first names to avoid N+1 lookups
  const senderIds = Array.from(new Set(due.map((m) => m.user_id)));
  const { data: senders } = await admin
    .from('profiles')
    .select('id, first_name')
    .in('id', senderIds);
  const senderMap = new Map((senders || []).map((s) => [s.id, s.first_name]));

  let sent = 0;
  let failed = 0;

  for (const message of due) {
    const senderFirstName = senderMap.get(message.user_id);
    let providerResponse = null;
    let status = 'failed';

    try {
      if (message.delivery_channel === 'sms') {
        providerResponse = await sendDeliverySms(message, senderFirstName);
        status = 'sent';
      } else {
        providerResponse = await sendDeliveryEmail(message);
        status = 'sent';
      }
    } catch (err) {
      providerResponse = { error: String(err.message || err) };
      status = 'failed';
    }

    // log every attempt
    await admin.from('delivery_log').insert({
      message_id: message.id,
      channel: message.delivery_channel,
      status,
      provider_response: serialiseResponse(providerResponse),
    });

    if (status === 'sent') {
      await admin
        .from('messages')
        .update({ status: 'delivered', delivered_at: new Date().toISOString() })
        .eq('id', message.id);
      sent += 1;
    } else {
      failed += 1;
    }
  }

  return res.status(200).json({ sent, failed, processed: due.length });
}

function serialiseResponse(resp) {
  if (!resp) return null;
  try {
    // strip non-serialisable fields, keep useful surface
    if (resp.error) return { error: resp.error };
    return JSON.parse(JSON.stringify(resp));
  } catch {
    return { note: 'response not serialisable' };
  }
}
