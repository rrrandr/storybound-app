import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, amount, context, operationId } = req.body || {};
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

  // ── Idempotency guard: reject duplicate operationIds ──
  if (operationId) {
    const { data: existing } = await supabase
      .from('fortune_operations')
      .select('operation_id')
      .eq('operation_id', operationId)
      .maybeSingle();

    if (existing) {
      console.log('[consume-fortune] Duplicate blocked:', operationId);
      // Return success (idempotent) — the original operation already succeeded
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_fortunes, purchased_fortunes')
        .eq('id', userId)
        .maybeSingle();
      const sub = profile?.subscription_fortunes || 0;
      const pur = profile?.purchased_fortunes || 0;
      return res.status(200).json({
        success: true,
        duplicate: true,
        fortunesRemaining: sub + pur,
        subscriptionFortunes: sub,
        purchasedFortunes: pur,
      });
    }

    // Insert operation record (will be consumed below)
    await supabase.from('fortune_operations').insert({
      operation_id: operationId,
      user_id: userId,
      context: context || null,
      amount: burnAmount,
    });
  }

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
  return res.status(200).json({
    success: true,
    fortunesRemaining: remaining,
    subscriptionFortunes: result.subscription_fortunes || 0,
    purchasedFortunes: result.purchased_fortunes || 0,
  });
}
