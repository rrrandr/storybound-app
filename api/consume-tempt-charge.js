import { createClient } from '@supabase/supabase-js';

// Durably consume ONE monthly subscription Tempt Fate charge
// (profiles.bonus_tempt_charges). Without this server-side decrement the
// charge balance would re-hydrate to its granted value on every reload — i.e.
// infinite Tempt Fates. Clamps at 0. Idempotent-ish via optional operationId.
export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
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
    console.error('[consume-tempt-charge] Supabase env vars missing');
    return res.status(500).json({ error: 'Server not configured' });
  }
  const supabase = createClient(sbUrl, sbKey);

  const { data: profile, error: readErr } = await supabase
    .from('profiles')
    .select('bonus_tempt_charges')
    .eq('id', userId)
    .maybeSingle();
  if (readErr || !profile) {
    return res.status(404).json({ error: 'profile not found' });
  }

  const current = profile.bonus_tempt_charges || 0;
  if (current < 1) {
    return res.status(200).json({ ok: false, reason: 'no_charges', bonus_tempt_charges: 0 });
  }
  const next = current - 1;
  const { error: updErr } = await supabase
    .from('profiles')
    .update({ bonus_tempt_charges: next })
    .eq('id', userId);
  if (updErr) {
    console.error('[consume-tempt-charge] update failed:', updErr.message);
    return res.status(500).json({ error: 'update_failed' });
  }
  console.log(`[consume-tempt-charge] user ${userId} consumed 1 Tempt Fate charge → ${next}`);
  return res.status(200).json({ ok: true, bonus_tempt_charges: next });
}
