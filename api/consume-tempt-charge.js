import requestAuth from './_request-auth.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', 'https://storybound.love');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
  const account = await requestAuth.requireAccount(req, res);
  if (!account) return;
  const operationId = req.body?.operationId;
  if (typeof operationId !== 'string' || !operationId || operationId.length > 200) return res.status(400).json({ error: 'operation_id_required' });
  const { data, error } = await account.db.rpc('consume_tempt_charge_v1', { p_user_id: account.id, p_operation_id: operationId });
  if (error || !data?.outcome) return res.status(503).json({ error: 'charge_outcome_unavailable', retryable: true });
  if (data.outcome === 'mismatch') return res.status(409).json({ error: 'operation_mismatch' });
  if (data.outcome === 'insufficient') return res.status(200).json({ ok: false, reason: 'no_charges', bonus_tempt_charges: 0 });
  if (!['consumed', 'replay'].includes(data.outcome)) return res.status(503).json({ error: 'charge_unavailable' });
  return res.status(200).json({ ok: true, duplicate: data.outcome === 'replay', bonus_tempt_charges: data.remaining });
}
