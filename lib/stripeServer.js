import Stripe from 'stripe';

let stripeClient = null;

export function getStripe() {
  if (stripeClient) return stripeClient;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  stripeClient = new Stripe(key, { apiVersion: '2024-06-20' });
  return stripeClient;
}
