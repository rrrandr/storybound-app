import { stripe } from '../lib/stripe.js';
import { createClient } from '@supabase/supabase-js';

// Map tier names to env var keys, Stripe checkout modes, and fortunes granted (for refund reversal)
const TIER_CONFIG = {
  storied:   { envKey: 'STRIPE_PRICE_ID_STORIED',   mode: 'subscription', fortunesGranted: 0 },
  favored:   { envKey: 'STRIPE_PRICE_ID_FAVORED',   mode: 'subscription', fortunesGranted: 0 },
  fortune_20:   { envKey: 'STRIPE_PRICE_ID_FORTUNES_20',    mode: 'payment', fortunesGranted: 20 },
  fortune_60:   { envKey: 'STRIPE_PRICE_ID_FORTUNES_60',    mode: 'payment', fortunesGranted: 60 },
  fortune_120:  { envKey: 'STRIPE_PRICE_ID_FORTUNES_120',   mode: 'payment', fortunesGranted: 120 },
  fortune_240:  { envKey: 'STRIPE_PRICE_ID_FORTUNES_240',   mode: 'payment', fortunesGranted: 240 },
};

// Resolve the base URL for checkout return redirects.
// Priority: APP_BASE_URL env var → validated request origin → production fallback.
function resolveBaseUrl(req) {
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;

  const raw = req.headers.origin || req.headers.referer || '';
  let origin;
  try { origin = new URL(raw).origin; } catch { origin = raw.replace(/\/+$/, ''); }

  if (origin === 'https://storybound.love') return origin;
  if (origin === 'https://www.storybound.love') return origin;
  if (origin.startsWith('http://localhost')) return origin;
  if (origin.includes('.vercel.app')) return origin;

  return 'https://storybound.love';
}

export default async function handler(req, res) {
  const baseUrl = resolveBaseUrl(req);

  const corsOrigin = req.headers.origin || baseUrl;
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('[checkout] STRIPE_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const { tier, supabaseUserId, resumeAction, resumePayload } = req.body || {};
  if (!tier) return res.status(400).json({ error: 'tier required' });
  if (!supabaseUserId) return res.status(400).json({ error: 'supabaseUserId required' });

  const config = TIER_CONFIG[tier];
  if (!config) return res.status(400).json({ error: 'Unknown tier' });

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = (sbUrl && sbKey) ? createClient(sbUrl, sbKey) : null;

  const priceId = process.env[config.envKey];
  if (!priceId) {
    console.error(`[checkout] ${config.envKey} not configured`);
    return res.status(500).json({ error: 'Price not configured' });
  }

  try {
    let purchaseIntentId = null;
    if (supabase) {
      const intentRow = {
        user_id: supabaseUserId,
        type: tier,
        status: 'pending',
        resume_action: resumeAction || null,
        resume_payload: resumePayload || null,
      };
      const { data: intent, error: intentErr } = await supabase
        .from('purchase_intents')
        .insert(intentRow)
        .select('id')
        .single();

      if (intentErr) {
        console.warn('[checkout] Failed to create purchase intent:', intentErr.message);
      } else if (intent) {
        purchaseIntentId = intent.id;
        console.log(`[checkout] Purchase intent created: ${purchaseIntentId}`);
      }
    }

    const metadata = {
      supabase_user_id: supabaseUserId,
      price_id: priceId,
      purchase_type: tier,
      fortunes_granted: String(config.fortunesGranted || 0),
    };
    if (config.mode === 'subscription') metadata.subscription_tier = tier;
    if (purchaseIntentId) metadata.purchase_intent_id = purchaseIntentId;

    const successParams = new URLSearchParams({ purchase_return: '1', tier });
    if (purchaseIntentId) successParams.set('purchase_intent_id', purchaseIntentId);
    const successUrl = `${baseUrl}/?${successParams.toString()}`;
    const cancelUrl = `${baseUrl}/checkout-cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: config.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: supabaseUserId,
      metadata,
    });

    if (purchaseIntentId && supabase) {
      await supabase
        .from('purchase_intents')
        .update({ stripe_session_id: session.id })
        .eq('id', purchaseIntentId);
    }

    console.log(`[checkout] Session created: ${session.id} for tier: ${tier} (price: ${priceId}) intent: ${purchaseIntentId || 'none'} → ${baseUrl}`);
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[checkout] Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
