import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

// Vercel: disable automatic body parsing so we can read the raw buffer
export const config = { api: { bodyParser: false } };

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verifyStripeSignature(rawBody, sigHeader, secret) {
  if (!sigHeader || !secret) return false;

  const parts = {};
  for (const item of sigHeader.split(',')) {
    const [key, val] = item.split('=');
    parts[key] = val;
  }

  const timestamp = parts.t;
  const expectedSig = parts.v1;
  if (!timestamp || !expectedSig) return false;

  const payload = `${timestamp}.${rawBody}`;
  const computed = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(computed, 'hex'),
    Buffer.from(expectedSig, 'hex')
  );
}

/**
 * Look up a profile by stripe_subscription_id first, fall back to stripe_customer_id.
 */
async function resolveProfileBySubscription(supabase, subscriptionId, customerId) {
  if (subscriptionId) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_subscription_id', subscriptionId)
      .single();
    if (data) return data.id;
  }
  if (customerId) {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .single();
    if (data) return data.id;
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    console.error('[stripe-webhook] Failed to read body:', err);
    return res.status(400).json({ error: 'Bad request' });
  }

  const sig = req.headers['stripe-signature'];
  if (!verifyStripeSignature(rawBody.toString('utf8'), sig, secret)) {
    console.warn('[stripe-webhook] Signature verification failed');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(rawBody.toString('utf8'));
  } catch (err) {
    console.error('[stripe-webhook] Invalid JSON:', err);
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  console.log(`[stripe-webhook] Received event: ${event.type} (${event.id})`);

  // ── Shared Supabase client (after signature verification) ──
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    console.error('[stripe-webhook] Supabase env vars missing');
    return res.status(200).json({ received: true, error: 'supabase_not_configured' });
  }
  const supabase = createClient(sbUrl, sbKey);

  // ── Idempotency guard — prevent duplicate event processing ──
  // Requires table: stripe_events (id text primary key, created_at timestamptz default now())
  {
    const { data: existing } = await supabase
      .from('stripe_events')
      .select('id')
      .eq('id', event.id)
      .single();

    if (existing) {
      console.log(`[stripe-webhook] Duplicate event ${event.id}, skipping`);
      return res.status(200).json({ received: true });
    }

    const { error: insertErr } = await supabase
      .from('stripe_events')
      .insert({ id: event.id });

    if (insertErr) {
      // Race: another instance already inserted — safe to skip
      console.warn(`[stripe-webhook] Event insert race (${event.id}):`, insertErr.message);
      return res.status(200).json({ received: true });
    }
  }

  // ── checkout.session.completed ──
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const supabaseUserId = session.client_reference_id || session.metadata?.supabase_user_id;
    const stripeCustomerId = session.customer;
    const stripeSubscriptionId = session.subscription;
    const priceId = session.metadata?.price_id;
    if (!priceId) console.warn('[stripe-webhook] No price_id found in session metadata');

    if (!supabaseUserId) {
      console.error('[stripe-webhook] No supabaseUserId in session:', session.id);
      return res.status(200).json({ received: true, error: 'no_user_id' });
    }

    console.log(`[stripe-webhook] checkout.session.completed — user: ${supabaseUserId}, price: ${priceId}, customer: ${stripeCustomerId}, subscription: ${stripeSubscriptionId}`);

    const updates = {};
    if (stripeCustomerId) updates.stripe_customer_id = stripeCustomerId;
    if (stripeSubscriptionId) updates.stripe_subscription_id = stripeSubscriptionId;

    if (priceId && priceId === process.env.STRIPE_PRICE_ID_STORYPASS) {
      updates.has_storypass = true;
      console.log(`[stripe-webhook] Granting StoryPass to ${supabaseUserId}`);
    }

    if (priceId && priceId === process.env.STRIPE_PRICE_ID_GODMODE) {
      updates.has_god_mode = true;
      console.log(`[stripe-webhook] Granting God Mode to ${supabaseUserId}`);
    }

    const isSubscription = priceId && (
      priceId === process.env.STRIPE_PRICE_ID_STORIED ||
      priceId === process.env.STRIPE_PRICE_ID_FAVORED
    );

    if (isSubscription) {
      const tier = session.metadata?.subscription_tier;
      if (!tier || (tier !== 'storied' && tier !== 'favored')) {
        console.error(`[stripe-webhook] Subscription session missing valid subscription_tier in metadata. Got: ${tier}. Session: ${session.id}`);
      } else {
        updates.is_subscriber = true;
        updates.subscription_tier = tier;
        updates.subscription_credits = 100;
        console.log(`[stripe-webhook] Granting ${tier} subscription + 100 subscription credits to ${supabaseUserId}`);
      }
    }

    if (!updates.has_storypass && !updates.has_god_mode && !updates.is_subscriber) {
      console.warn(`[stripe-webhook] No entitlement matched for priceId: ${priceId}`);
    }

    if (Object.keys(updates).length > 0) {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', supabaseUserId);

      if (updateErr) {
        console.error('[stripe-webhook] Supabase update failed:', updateErr);
      } else {
        console.log(`[stripe-webhook] Profile updated for ${supabaseUserId}:`, updates);
      }
    }
  }

  // ── invoice.paid — subscription renewal ──
  if (event.type === 'invoice.paid') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    const userId = await resolveProfileBySubscription(supabase, subscriptionId, customerId);
    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_subscriber: true, subscription_credits: 100 })
        .eq('id', userId);
      if (error) {
        console.error('[stripe-webhook] invoice.paid update failed:', error);
      } else {
        console.log(`[stripe-webhook] invoice.paid — restored is_subscriber + reset 100 subscription credits for ${userId}`);
      }
    } else {
      console.warn(`[stripe-webhook] invoice.paid — no profile found for subscription: ${subscriptionId}, customer: ${customerId}`);
    }
  }

  // ── invoice.payment_failed — payment failure ──
  // GRACE MODEL: We intentionally preserve subscription_credits during payment_failed.
  // Stripe may retry payment (up to 3x) before firing customer.subscription.deleted.
  // Credits are only zeroed on customer.subscription.deleted — not here.
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const subscriptionId = invoice.subscription;
    const customerId = invoice.customer;

    const userId = await resolveProfileBySubscription(supabase, subscriptionId, customerId);
    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_subscriber: false })
        .eq('id', userId);
      if (error) {
        console.error('[stripe-webhook] invoice.payment_failed update failed:', error);
      } else {
        console.log(`[stripe-webhook] invoice.payment_failed — revoked is_subscriber for ${userId}`);
      }
    } else {
      console.warn(`[stripe-webhook] invoice.payment_failed — no profile found for subscription: ${subscriptionId}, customer: ${customerId}`);
    }
  }

  // ── customer.subscription.deleted — subscription cancelled ──
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const subscriptionId = subscription.id;
    const customerId = subscription.customer;

    const userId = await resolveProfileBySubscription(supabase, subscriptionId, customerId);
    if (userId) {
      const { error } = await supabase
        .from('profiles')
        .update({ is_subscriber: false, subscription_tier: null, subscription_credits: 0 })
        .eq('id', userId);
      if (error) {
        console.error('[stripe-webhook] customer.subscription.deleted update failed:', error);
      } else {
        console.log(`[stripe-webhook] customer.subscription.deleted — revoked subscription for ${userId}`);
      }
    } else {
      console.warn(`[stripe-webhook] customer.subscription.deleted — no profile found for subscription: ${subscriptionId}, customer: ${customerId}`);
    }
  }

  // ── charge.refunded — revoke entitlements for refunded charges ──
  // Resolves what was purchased via Stripe API → metadata.price_id → targeted revocation.
  // Falls back to full revocation if resolution fails.
  if (event.type === 'charge.refunded') {
    const charge = event.data.object;
    const customerId = charge.customer;

    if (customerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id, image_credits')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        // Try to resolve what was purchased via checkout session metadata
        let priceId = null;
        let creditsGranted = 0;
        try {
          const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
          const paymentIntent = charge.payment_intent;
          if (paymentIntent) {
            const sessions = await stripe.checkout.sessions.list({ payment_intent: paymentIntent, limit: 1 });
            const session = sessions.data?.[0];
            if (session?.metadata) {
              priceId = session.metadata.price_id || null;
              creditsGranted = parseInt(session.metadata.credits_granted, 10) || 0;
            }
          }
        } catch (err) {
          console.warn('[stripe-webhook] charge.refunded — Stripe lookup failed, full revocation:', err.message);
        }

        // Targeted revocation based on price_id
        const updates = {};
        if (priceId === process.env.STRIPE_PRICE_ID_STORYPASS) {
          updates.has_storypass = false;
        } else if (priceId === process.env.STRIPE_PRICE_ID_GODMODE) {
          updates.has_god_mode = false;
        } else if (priceId === process.env.STRIPE_PRICE_ID_STORIED || priceId === process.env.STRIPE_PRICE_ID_FAVORED) {
          updates.is_subscriber = false;
          updates.subscription_tier = null;
          updates.subscription_credits = 0;
        } else if (creditsGranted > 0) {
          // Credit pack refund — deduct granted credits, prevent negative
          updates.image_credits = Math.max(0, (profile.image_credits || 0) - creditsGranted);
        } else {
          // Unknown product or lookup failed — full revocation (safe over-revoke)
          updates.has_storypass = false;
          updates.has_god_mode = false;
          updates.is_subscriber = false;
          updates.subscription_tier = null;
          updates.subscription_credits = 0;
        }

        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', profile.id);
        if (error) {
          console.error('[stripe-webhook] charge.refunded update failed:', error);
        } else {
          console.log(`[stripe-webhook] charge.refunded — revoked for ${profile.id}:`, Object.keys(updates).join(', '));
        }
      } else {
        console.warn(`[stripe-webhook] charge.refunded — no profile found for customer: ${customerId}`);
      }
    }
  }

  // ── charge.dispute.created — revoke entitlements on chargeback ──
  if (event.type === 'charge.dispute.created') {
    const dispute = event.data.object;
    const chargeId = dispute.charge;

    // Resolve customer from the disputed charge
    let customerId = null;
    try {
      const stripe = new (await import('stripe')).default(process.env.STRIPE_SECRET_KEY);
      const charge = await stripe.charges.retrieve(chargeId);
      customerId = charge.customer;
    } catch (err) {
      console.error('[stripe-webhook] charge.dispute.created — failed to retrieve charge:', err.message);
    }

    if (customerId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single();

      if (profile) {
        const { error } = await supabase
          .from('profiles')
          .update({
            has_storypass: false,
            has_god_mode: false,
            is_subscriber: false,
            subscription_tier: null,
            subscription_credits: 0,
          })
          .eq('id', profile.id);
        if (error) {
          console.error('[stripe-webhook] charge.dispute.created update failed:', error);
        } else {
          console.log(`[stripe-webhook] charge.dispute.created — revoked entitlements for ${profile.id}`);
        }
      } else {
        console.warn(`[stripe-webhook] charge.dispute.created — no profile found for customer: ${customerId}`);
      }
    }
  }

  res.status(200).json({ received: true });
}
