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

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const supabaseUserId = session.client_reference_id || session.metadata?.supabase_user_id;
    const stripeCustomerId = session.customer;
    const priceId = session.metadata?.price_id;
    if (!priceId) console.warn('[stripe-webhook] No price_id found in session metadata');

    if (!supabaseUserId) {
      console.error('[stripe-webhook] No supabaseUserId in session:', session.id);
      return res.status(200).json({ received: true, error: 'no_user_id' });
    }

    console.log(`[stripe-webhook] checkout.session.completed — user: ${supabaseUserId}, price: ${priceId}, customer: ${stripeCustomerId}`);

    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!sbUrl || !sbKey) {
      console.error('[stripe-webhook] Supabase env vars missing');
      return res.status(200).json({ received: true, error: 'supabase_not_configured' });
    }

    const supabase = createClient(sbUrl, sbKey);

    const updates = {};
    if (stripeCustomerId) updates.stripe_customer_id = stripeCustomerId;

    if (priceId && priceId === process.env.STRIPE_PRICE_ID_STORYPASS) {
      updates.has_storypass = true;
      console.log(`[stripe-webhook] Granting StoryPass to ${supabaseUserId}`);
    }

    if (priceId && priceId === process.env.STRIPE_PRICE_ID_GODMODE) {
      updates.has_god_mode = true;
      console.log(`[stripe-webhook] Granting God Mode to ${supabaseUserId}`);
    }

    if (priceId && priceId === process.env.STRIPE_PRICE_ID_SUBSCRIPTION) {
      updates.is_subscriber = true;
      console.log(`[stripe-webhook] Granting Subscription to ${supabaseUserId}`);
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

  res.status(200).json({ received: true });
}
