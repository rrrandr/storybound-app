import Stripe from 'stripe';

// Map tier names to env var keys, Stripe checkout modes, and fortunes granted (for refund reversal)
const TIER_CONFIG = {
  storypass: { envKey: 'STRIPE_PRICE_ID_STORYPASS', mode: 'payment', fortunesGranted: 20 },
  storied:   { envKey: 'STRIPE_PRICE_ID_STORIED',   mode: 'subscription', fortunesGranted: 0 },
  favored:   { envKey: 'STRIPE_PRICE_ID_FAVORED',   mode: 'subscription', fortunesGranted: 0 },
  offering:  { envKey: 'STRIPE_PRICE_ID_OFFERING',  mode: 'payment', fortunesGranted: 10 },
};

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error('[checkout] STRIPE_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const { tier, supabaseUserId } = req.body || {};
  if (!tier) return res.status(400).json({ error: 'tier required' });
  if (!supabaseUserId) return res.status(400).json({ error: 'supabaseUserId required' });

  const config = TIER_CONFIG[tier];
  if (!config) return res.status(400).json({ error: 'Unknown tier' });

  const priceId = process.env[config.envKey];
  if (!priceId) {
    console.error(`[checkout] ${config.envKey} not configured`);
    return res.status(500).json({ error: 'Price not configured' });
  }

  try {
    const stripe = new Stripe(secret);

    const metadata = {
      supabase_user_id: supabaseUserId,
      price_id: priceId,
      fortunes_granted: String(config.fortunesGranted || 0),
    };
    if (config.mode === 'subscription') metadata.subscription_tier = tier;

    const session = await stripe.checkout.sessions.create({
      mode: config.mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://storybound.love',
      cancel_url: 'https://storybound.love',
      client_reference_id: supabaseUserId,
      metadata,
    });

    console.log(`[checkout] Session created: ${session.id} for tier: ${tier} (price: ${priceId})`);
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[checkout] Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
