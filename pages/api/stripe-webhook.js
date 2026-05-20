import { buffer } from 'micro';
import { getStripe } from '@/lib/stripeServer';
import { getSupabaseAdmin } from '@/lib/supabaseAdmin';
import { planUpdateForCheckout, PLAN_LABELS } from '@/lib/plans';
import { sendCheckoutConfirmationEmail } from '@/lib/resendServer';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return res.status(400).json({ error: 'missing signature or secret' });
  }

  let event;
  try {
    const stripe = getStripe();
    const buf = await buffer(req);
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret);
  } catch (err) {
    console.error('[stripe-webhook] signature verification failed:', err.message);
    return res.status(400).json({ error: `webhook error: ${err.message}` });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const planId = session.metadata?.plan;
      const userId = session.metadata?.user_id;
      const email = session.customer_email || session.metadata?.email;

      if (!planId || !userId) {
        console.warn('[stripe-webhook] missing plan or user_id in metadata');
        return res.status(200).json({ received: true });
      }

      const admin = getSupabaseAdmin();
      const update = planUpdateForCheckout(planId);
      update.stripe_customer_id = session.customer || null;
      update.stripe_session_id = session.id;

      const { error: updateErr } = await admin
        .from('profiles')
        .update(update)
        .eq('id', userId);

      if (updateErr) {
        console.error('[stripe-webhook] profile update failed:', updateErr);
        return res.status(500).json({ error: 'profile update failed' });
      }

      // fetch first name for the confirmation email
      const { data: profile } = await admin
        .from('profiles')
        .select('first_name')
        .eq('id', userId)
        .single();

      if (email) {
        try {
          await sendCheckoutConfirmationEmail({
            to: email,
            firstName: profile?.first_name,
            planLabel: PLAN_LABELS[planId] || planId,
          });
        } catch (err) {
          console.error('[stripe-webhook] confirmation email failed:', err);
        }
      }
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[stripe-webhook] handler error:', err);
    return res.status(500).json({ error: 'webhook handler failed' });
  }
}
