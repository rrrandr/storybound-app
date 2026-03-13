import { stripe } from '../lib/stripe.js';
import { createClient } from '@supabase/supabase-js';

// Map tier names to env var keys, Stripe checkout modes, and fortunes granted (for refund reversal)
const TIER_CONFIG = {
  storypass: { envKey: 'STRIPE_PRICE_ID_STORYPASS', mode: 'payment', fortunesGranted: 20 },
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

  const { tier, supabaseUserId, storyId, arcNumber } = req.body || {};
  if (!tier) return res.status(400).json({ error: 'tier required' });
  if (!supabaseUserId) return res.status(400).json({ error: 'supabaseUserId required' });

  const config = TIER_CONFIG[tier];
  if (!config) return res.status(400).json({ error: 'Unknown tier' });

  // ── Storypass duplicate arc check ──
  if (tier === 'storypass' && storyId && arcNumber) {
    const sbUrl = process.env.SUPABASE_URL;
    const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (sbUrl && sbKey) {
      const supabase = createClient(sbUrl, sbKey);
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
  }

  const priceId = process.env[config.envKey];
  if (!priceId) {
    console.error(`[checkout] ${config.envKey} not configured`);
    return res.status(500).json({ error: 'Price not configured' });
  }

  try {
    const metadata = {
      supabase_user_id: supabaseUserId,
      price_id: priceId,
      purchase_type: tier,
      fortunes_granted: String(config.fortunesGranted || 0),
    };
    if (storyId) metadata.story_id = storyId;
    if (arcNumber) metadata.arc_number = String(arcNumber);
    if (config.mode === 'subscription') metadata.subscription_tier = tier;

    // Build return URLs using the resolved base URL (environment-aware)
    const successParams = new URLSearchParams({ tier });
    if (storyId) successParams.set('story_id', storyId);
    const successUrl = `${baseUrl}/checkout-success?${successParams.toString()}`;
    const cancelUrl = `${baseUrl}/checkout-cancel`;

    const session = await stripe.checkout.sessions.create({
      mode: config.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: supabaseUserId,
      metadata,
    });

    console.log(`[checkout] Session created: ${session.id} for tier: ${tier} (price: ${priceId}) → ${baseUrl}`);
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[checkout] Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
