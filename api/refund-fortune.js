import requestAuth from './_request-auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://storybound.love');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const account = await requestAuth.requireAccount(req, res);
  if (!account) return;
  const { operationId, amount } = req.body || {};
  if (typeof operationId !== 'string' || !operationId || operationId.length > 200) return res.status(400).json({ error: 'operation_id_required' });
  if (amount != null && (!Number.isSafeInteger(Number(amount)) || Number(amount) < 1 || Number(amount) > 2147483647)) return res.status(400).json({ error: 'invalid_amount' });
  const { data, error } = await account.db.rpc('refund_fortunes_v4', {
    p_user_id: account.id, p_operation_id: operationId, p_requested_amount: amount == null ? null : Number(amount)
  });
  if (error || !data?.outcome) return res.status(503).json({ error: 'refund_outcome_unavailable', retryable: true });
  if (data.outcome === 'amount_mismatch') return res.status(409).json({ error: 'refund_amount_mismatch' });
  if (!['refunded', 'replay'].includes(data.outcome)) return res.status(403).json({ error: 'verified_payment_required' });
  return res.status(200).json({ success: true, duplicate: data.outcome === 'replay', fortunesRemaining: data.fortunes });
}
