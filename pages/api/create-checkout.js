import { getStripe } from '@/lib/stripeServer';
import { PLAN_PRICES, PLAN_LABELS } from '@/lib/plans';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method not allowed' });
  }

  const { plan, email, userId } = req.body || {};

  if (!plan || !PLAN_PRICES[plan]) {
    return res.status(400).json({ error: 'unknown plan' });
  }
  if (!email || !userId) {
    return res.status(400).json({ error: 'missing user identity' });
  }

  try {
    const stripe = getStripe();
    const amount = PLAN_PRICES[plan];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: 'gbp',
            unit_amount: amount,
            product_data: {
              name: `everly · ${PLAN_LABELS[plan]}`,
              description: `everly ${PLAN_LABELS[plan]} plan — one-off purchase.`,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${APP_URL}/dashboard?upgraded=true`,
      cancel_url: `${APP_URL}/upgrade`,
      metadata: {
        user_id: userId,
        plan,
        email,
      },
    });

    return res.status(200).json({ url: session.url, id: session.id });
  } catch (err) {
    console.error('[create-checkout] error:', err);
    return res.status(500).json({ error: 'checkout failed' });
  }
}
