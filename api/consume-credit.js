import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    console.error('[consume-credit] Supabase env vars missing');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const supabase = createClient(sbUrl, sbKey);

  // Atomic decrement via DB function — safe under parallel requests.
  // Deduction order: subscription_credits first → image_credits fallback.
  // See SQL migration: consume_one_credit(p_user_id uuid)
  const { data: rpcResult, error: rpcErr } = await supabase
    .rpc('consume_one_credit', { p_user_id: userId });

  if (rpcErr) {
    console.error('[consume-credit] RPC failed:', rpcErr);
    return res.status(500).json({ error: 'credit_deduction_failed' });
  }

  // rpcResult is a single row: { source, subscription_credits, image_credits }
  const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;

  if (!result || result.source === 'none') {
    return res.status(403).json({ error: 'no_credits', creditsRemaining: 0 });
  }

  const remaining = (result.subscription_credits || 0) + (result.image_credits || 0);
  console.log(`[consume-credit] User ${userId}: ${result.source} credit consumed. Sub: ${result.subscription_credits}, Purchased: ${result.image_credits}, Total: ${remaining}`);
  return res.status(200).json({ success: true, creditsRemaining: remaining });
}
