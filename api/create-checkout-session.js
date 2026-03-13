import { stripe } from '../lib/stripe.js';
import { createClient } from '@supabase/supabase-js';

// Map tier names to env var keys, Stripe checkout modes, and fortunes granted (for refund reversal)
const TIER_CONFIG = {
  storypass: { envKey: 'STRIPE_PRICE_ID_STORYPASS', mode: 'payment', fortunesGranted: 0 },  // fortunes are story-scoped (on storypass_entitlements), not global
  storied:   { envKey: 'STRIPE_PRICE_ID_STORIED',   mode: 'subscription', fortunesGranted: 0 },
  favored:   { envKey: 'STRIPE_PRICE_ID_FAVORED',   mode: 'subscription', fortunesGranted: 0 },
  fortune_pack: { envKey: 'STRIPE_PRICE_ID_FORTUNE_PACK', mode: 'payment', fortunesGranted: 10 },
};

// Resolve the base URL for checkout return redirects.
// Priority: APP_BASE_URL env var → validated request origin → production fallback.
function resolveBaseUrl(req) {
  // APP_BASE_URL is the authoritative source (set per-environment in Vercel / .env.local)
  if (process.env.APP_BASE_URL) return process.env.APP_BASE_URL;

  // Fallback: infer from request origin (for environments where APP_BASE_URL isn't set yet)
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

  // CORS — allow the requesting origin
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

  const { tier, supabaseUserId, storyId, arcNumber, resumeAction, resumePayload } = req.body || {};
  if (!tier) return res.status(400).json({ error: 'tier required' });
  if (!supabaseUserId) return res.status(400).json({ error: 'supabaseUserId required' });

  const config = TIER_CONFIG[tier];
  if (!config) return res.status(400).json({ error: 'Unknown tier' });

  // ── Shared Supabase client ──
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = (sbUrl && sbKey) ? createClient(sbUrl, sbKey) : null;

  // ── Storypass duplicate arc check ──
  if (tier === 'storypass' && storyId && arcNumber && supabase) {
    const { data: existing } = await supabase
      .from('storypass_entitlements')
      .select('id')
      .eq('user_id', supabaseUserId)
      .eq('story_id', storyId)
      .eq('arc_number', arcNumber)
      .single();
    if (existing) {
      return res.status(409).json({ error: 'arc_already_owned', message: 'You already unlocked this arc.' });
    }
  }

  const priceId = process.env[config.envKey];
  if (!priceId) {
    console.error(`[checkout] ${config.envKey} not configured`);
    return res.status(500).json({ error: 'Price not configured' });
  }

  try {
    // ── Create purchase intent (server-side, survives browser state loss) ──
    let purchaseIntentId = null;
    if (supabase) {
      // Upsert: replace any existing pending intent for this user+type
      // (partial unique index on (user_id, type) WHERE status = 'pending')
      const intentRow = {
        user_id: supabaseUserId,
        type: tier,
        status: 'pending',
        resume_action: resumeAction || null,
        resume_payload: resumePayload || null,
      };
      const { data: intent, error: intentErr } = await supabase
        .from('purchase_intents')
        .upsert(intentRow, { onConflict: 'idx_purchase_intents_pending' })
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
    if (storyId) metadata.story_id = storyId;
    if (arcNumber) metadata.arc_number = String(arcNumber);
    if (config.mode === 'subscription') metadata.subscription_tier = tier;
    if (purchaseIntentId) metadata.purchase_intent_id = purchaseIntentId;

    // Build return URLs using the resolved base URL (environment-aware)
    // All tiers use ?purchase_return=1 — boot handler resumes via purchase intent
    const successParams = new URLSearchParams({ purchase_return: '1', tier });
    if (storyId) successParams.set('story_id', storyId);
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

    // Back-fill stripe_session_id on the intent
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
