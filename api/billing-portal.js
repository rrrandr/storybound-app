import { stripe } from '../lib/stripe.js';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { supabaseUserId } = req.body || {};
  if (!supabaseUserId) return res.status(400).json({ error: 'supabaseUserId required' });

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  // Look up the Stripe customer ID from the user's profile
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  const supabase = createClient(sbUrl, sbKey);
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', supabaseUserId)
    .single();

  if (profileErr || !profile?.stripe_customer_id) {
    console.error('[billing-portal] No Stripe customer found for user:', supabaseUserId, profileErr?.message);
    return res.status(404).json({ error: 'No billing account found. Please subscribe first.' });
  }

  try {
    const baseUrl = process.env.APP_BASE_URL || origin || 'https://storybound.love';
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: baseUrl,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('[billing-portal] Failed to create portal session:', err.message);
    return res.status(500).json({ error: 'Failed to open billing portal' });
  }
}
