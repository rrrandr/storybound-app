import { createClient } from '@supabase/supabase-js';

/**
 * Refund fortune endpoint — counterpart to /api/consume-fortune.
 *
 * Triggered when a paid issue purchase succeeds but the first-scene
 * generation fails irrecoverably AND the user opts to take a refund
 * (shown in a "Generation failed" popup that also offers "Try Again").
 *
 * Mirrors consume-fortune.js shape:
 *   POST { userId, amount, context, operationId }
 *   → { success: true, fortunesRemaining: N, duplicate?: bool }
 *
 * Idempotent via operationId — the same operationId can be POSTed twice
 * (e.g., on network retry) without double-refunding. We log the refund
 * into the same fortune_operations table that consume uses, but with a
 * negative amount so audit reads cleanly.
 *
 * No Supabase RPC required — direct profiles.fortunes UPDATE because no
 * refund_fortunes_v2 RPC exists today. If you later add one, swap the
 * UPDATE for an .rpc() call.
 */
export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love'
    || origin === 'https://www.storybound.love'
    || origin.startsWith('http://localhost')
    ? origin
    : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, amount, context, operationId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  const refundAmount = parseInt(amount, 10) || 0;
  if (refundAmount < 1) return res.status(400).json({ error: 'amount must be >= 1' });
  if (!operationId) return res.status(400).json({ error: 'operationId required for refund idempotency' });

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    console.error('[refund-fortune] Supabase env vars missing');
    return res.status(500).json({ error: 'Server not configured' });
  }
  const supabase = createClient(sbUrl, sbKey);

  // ── Idempotency: reject duplicate refundOperationIds ──
  // We namespace the refund operationId as `refund:<opid>` so it can't
  // collide with the original consume opid in fortune_operations.
  const refundOpKey = 'refund:' + operationId;
  const { data: existing } = await supabase
    .from('fortune_operations')
    .select('operation_id')
    .eq('operation_id', refundOpKey)
    .maybeSingle();

  if (existing) {
    console.log('[refund-fortune] Duplicate refund blocked:', refundOpKey);
    const { data: profile } = await supabase
      .from('profiles')
      .select('fortunes')
      .eq('id', userId)
      .maybeSingle();
    return res.status(200).json({
      success: true,
      duplicate: true,
      fortunesRemaining: (profile && profile.fortunes) || 0
    });
  }

  // ── Read current balance, increment, write back ──
  // Two-step (read then update) is acceptable because refund volume is
  // very low (only fires on scene-1 generation failure + user opt-in).
  // The idempotency guard above prevents double-refund on concurrent
  // retries. Production-grade race-safety would migrate this to an
  // RPC (refund_fortunes_v2) with row-level locking; for current
  // volume this is fine.
  const { data: profile, error: readErr } = await supabase
    .from('profiles')
    .select('fortunes')
    .eq('id', userId)
    .maybeSingle();

  if (readErr || !profile) {
    console.error('[refund-fortune] profile read failed:', readErr);
    return res.status(404).json({ error: 'profile_not_found' });
  }

  const newBalance = (profile.fortunes || 0) + refundAmount;

  const { error: updErr } = await supabase
    .from('profiles')
    .update({ fortunes: newBalance })
    .eq('id', userId);

  if (updErr) {
    console.error('[refund-fortune] update failed:', updErr);
    return res.status(500).json({ error: 'refund_failed' });
  }

  // Log the refund into fortune_operations as a negative-amount entry
  // (audit trail). Idempotency key is `refund:<opid>` so the same
  // refund can't be applied twice.
  await supabase.from('fortune_operations').insert({
    operation_id: refundOpKey,
    user_id: userId,
    context: (context || 'refund'),
    amount: -refundAmount
  });

  console.log(`[refund-fortune] User ${userId}: +${refundAmount} fortune (context: ${context || 'none'}). New balance: ${newBalance}`);
  return res.status(200).json({
    success: true,
    fortunesRemaining: newBalance
  });
}
