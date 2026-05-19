import { Router } from 'express';
import Stripe from 'stripe';
import { query } from '../lib/db.js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

// POST /webhooks/stripe
router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !secret) {
    res.status(400).json({ error: 'Missing signature or secret' });
    return;
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('Stripe webhook error:', (err as Error).message);
    res.status(400).json({ error: 'Webhook signature invalid' });
    return;
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const planName = getPlanFromStripe(sub);
        await query(
          `UPDATE users SET plan = $1 WHERE stripe_customer_id = $2`,
          [planName, sub.customer]
        );
        await query(
          `INSERT INTO subscriptions (user_id, stripe_subscription_id, plan, status, current_period_start, current_period_end)
           SELECT id, $2, $3, $4, to_timestamp($5), to_timestamp($6)
           FROM users WHERE stripe_customer_id = $1
           ON CONFLICT (stripe_subscription_id)
           DO UPDATE SET plan = EXCLUDED.plan, status = EXCLUDED.status,
             current_period_start = EXCLUDED.current_period_start,
             current_period_end = EXCLUDED.current_period_end, updated_at = NOW()`,
          [sub.customer, sub.id, planName, sub.status,
           (sub as any).current_period_start, (sub as any).current_period_end]
        );
        console.log(`Stripe: subscription ${event.type} — plan ${planName}`);
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await query(`UPDATE users SET plan = 'free' WHERE stripe_customer_id = $1`, [sub.customer]);
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('Stripe handler error:', err);
    res.status(500).json({ error: 'Handler error' });
  }
});

function getPlanFromStripe(sub: Stripe.Subscription): string {
  const priceId = (sub as any).items?.data?.[0]?.price?.id || '';
  const map: Record<string, string> = {
    [process.env.STRIPE_PRICE_STARTER || '']: 'starter',
    [process.env.STRIPE_PRICE_PRO || '']: 'pro',
    [process.env.STRIPE_PRICE_ENTERPRISE || '']: 'enterprise',
  };
  return map[priceId] || 'starter';
}

// Need to import express for raw body parsing in this route file
import express from 'express';
export default router;
