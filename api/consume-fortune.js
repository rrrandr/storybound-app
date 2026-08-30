import { createClient as _realCreateClient } from '@supabase/supabase-js';

/**
 * Fortune deduction — authenticated, atomic, user-bound.
 *
 * Two things this endpoint must never do again:
 *
 *   1. RECORD A CLAIM SEPARATELY FROM THE DEDUCTION. It used to INSERT into
 *      fortune_operations and then call the RPC. A failed or insufficient
 *      deduction left the claim behind, and the next retry was answered
 *      {success:true, duplicate:true} — an unpaid purchase replaying as paid.
 *      Claim and deduction now happen inside consume_fortunes_v3, which is one
 *      transaction: no deduction, no claim.
 *
 *   2. TRUST THE CALLER'S userId. The account is derived from the access token,
 *      never from the body. A body userId is accepted only as a cross-check and
 *      must match, so a stale client that disagrees with its own session is
 *      rejected rather than charged.
 *
 * An operation id is not a bearer token: consume_fortunes_v3 replays one only
 * for the account that created it and only for the same amount / context /
 * story. Anything else comes back operation_mismatch.
 */
/**
 * The handler, with its Supabase factory injectable so the contract can be
 * tested for real rather than through a hand-written model of it. A model of a
 * server is only ever as accurate as the author's belief about the server —
 * which is precisely how the claim-before-deduct defect stayed hidden.
 */
export async function handleConsumeFortune(req, res, deps = {}) {
  const createClient = deps.createClient || _realCreateClient;
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, amount, context, operationId, storyId, sceneIdx, metadata } = req.body || {};

  // FAIL LOUD — never silently default a bad price to 1F. The old `parseInt(amount,10) || 1`
  // turned every missing/NaN/0 amount into an invisible 1-Fortune charge (untraceable, no audit).
  const burnAmount = Number(amount);
  if (!Number.isInteger(burnAmount) || burnAmount <= 0) {
    console.warn(`[consume-fortune] REJECTED invalid amount=${JSON.stringify(amount)} context=${context || 'none'} story=${storyId || 'none'} scene=${sceneIdx ?? 'none'}`);
    return res.status(400).json({ error: 'invalid_amount', detail: 'amount must be a positive integer' });
  }

  // Idempotency is mandatory. Without an operation id a retry is a second charge.
  if (!operationId || typeof operationId !== 'string') {
    return res.status(400).json({ error: 'operation_id_required' });
  }

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const sbAnon = process.env.SUPABASE_ANON_KEY;
  if (!sbUrl || !sbKey) {
    console.error('[consume-fortune] Supabase env vars missing');
    return res.status(500).json({ error: 'Server not configured' });
  }

  // ── WHO IS SPENDING ────────────────────────────────────────────────────────
  // From the token, not the body. The service-role client that performs the
  // deduction bypasses RLS entirely, so the identity it is handed is the only
  // thing standing between a caller and someone else's wallet.
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!token) {
    return res.status(401).json({ error: 'authentication_required' });
  }

  const authClient = createClient(sbUrl, sbAnon || sbKey);
  const { data: authData, error: authErr } = await authClient.auth.getUser(token);
  const authedUserId = authData?.user?.id || null;
  if (authErr || !authedUserId) {
    console.warn('[consume-fortune] token rejected:', authErr?.message || 'no user');
    return res.status(401).json({ error: 'authentication_failed' });
  }

  // A body userId is optional, but if present it must agree with the session.
  if (userId && userId !== authedUserId) {
    console.warn(`[consume-fortune] body userId does not match the authenticated session (body=${userId} session=${authedUserId}) — rejected`);
    return res.status(403).json({ error: 'user_mismatch' });
  }

  const supabase = createClient(sbUrl, sbKey);

  // ── CLAIM + DEDUCT, ONE TRANSACTION ────────────────────────────────────────
  const { data: rpcResult, error: rpcErr } = await supabase
    .rpc('consume_fortunes_v3', {
      p_operation_id: operationId,
      p_user_id: authedUserId,
      p_amount: burnAmount,
      p_context: context || null,
      p_story_id: storyId || null,
      p_scene_idx: Number.isInteger(sceneIdx) ? sceneIdx : null,
      p_source_endpoint: 'consume-fortune',
      p_metadata: (metadata && typeof metadata === 'object') ? metadata : {},
    });

  if (rpcErr) {
    // Nothing was claimed and nothing was charged — the transaction rolled back.
    // The same operation id may be retried safely.
    console.error('[consume-fortune] RPC failed:', rpcErr);
    return res.status(500).json({ error: 'fortune_deduction_failed', retryable: true });
  }

  const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
  if (!result || result.source === 'not_found') {
    return res.status(404).json({ error: 'profile_not_found' });
  }

  // The operation id belongs to someone else, or names a different purchase.
  if (result.source === 'operation_mismatch') {
    console.warn(`[consume-fortune] operation ${operationId} replayed with mismatched owner or purchase facts — rejected (session=${authedUserId})`);
    return res.status(409).json({ error: 'operation_mismatch' });
  }

  // A pre-v3 claim: written before the deduction was attempted, so it proves
  // neither payment nor non-payment. Refusing is the only reading that cannot
  // either grant a free unlock or charge twice.
  if (result.source === 'operation_unverified') {
    console.warn(`[consume-fortune] operation ${operationId} is a quarantined pre-v3 claim — refusing (session=${authedUserId})`);
    return res.status(409).json({ error: 'operation_unverified', needsReconciliation: true });
  }

  if (result.source === 'insufficient') {
    return res.status(403).json({ error: 'insufficient_fortunes', fortunesRemaining: result.fortunes || 0 });
  }

  // 'duplicate' here means the deduction genuinely committed earlier — the only
  // path on which a claim exists at all.
  const duplicate = result.source === 'duplicate';
  const remaining = result.fortunes || 0;
  console.log(`[consume-fortune] ${authedUserId}: ${burnAmount}F ${duplicate ? 'REPLAYED' : 'consumed'} (context: ${context || 'none'}). Remaining: ${remaining}`);
  return res.status(200).json({
    success: true,
    duplicate,
    fortunesRemaining: remaining,
  });
}

export default function handler(req, res) {
  return handleConsumeFortune(req, res);
}
