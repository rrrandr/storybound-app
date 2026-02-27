import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, amount, context } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const burnAmount = parseInt(amount, 10) || 1;
  if (burnAmount < 1) return res.status(400).json({ error: 'amount must be >= 1' });

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    console.error('[consume-fortune] Supabase env vars missing');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const supabase = createClient(sbUrl, sbKey);

  const { data: rpcResult, error: rpcErr } = await supabase
    .rpc('consume_fortunes', { p_user_id: userId, p_amount: burnAmount });

  if (rpcErr) {
    console.error('[consume-fortune] RPC failed:', rpcErr);
    return res.status(500).json({ error: 'fortune_deduction_failed' });
  }

  const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;

  if (!result || result.source === 'not_found') {
    return res.status(404).json({ error: 'profile_not_found' });
  }

  if (result.source === 'insufficient') {
    return res.status(403).json({ error: 'insufficient_fortunes', fortunesRemaining: (result.subscription_fortunes || 0) + (result.purchased_fortunes || 0) });
  }

  const remaining = (result.subscription_fortunes || 0) + (result.purchased_fortunes || 0);
  console.log(`[consume-fortune] User ${userId}: ${burnAmount} fortune(s) consumed (context: ${context || 'none'}). Sub: ${result.subscription_fortunes}, Purchased: ${result.purchased_fortunes}, Total: ${remaining}`);
  return res.status(200).json({ success: true, fortunesRemaining: remaining });
}
