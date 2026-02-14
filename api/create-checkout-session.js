import Stripe from 'stripe';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    console.error('[checkout] STRIPE_SECRET_KEY not configured');
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const { priceId, supabaseUserId } = req.body || {};
  if (!priceId) return res.status(400).json({ error: 'priceId required' });
  if (!supabaseUserId) return res.status(400).json({ error: 'supabaseUserId required' });

  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.create({
      mode: priceId === process.env.STRIPE_PRICE_ID_SUBSCRIPTION
        ? 'subscription'
        : 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: 'https://storybound.love',
      cancel_url: 'https://storybound.love',
      client_reference_id: supabaseUserId,
      metadata: {
        supabase_user_id: supabaseUserId,
        price_id: priceId,
      },
    });

    console.log(`[checkout] Session created: ${session.id} for price: ${priceId}`);
    res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[checkout] Stripe error:', err.message);
    res.status(500).json({ error: err.message });
  }
}
