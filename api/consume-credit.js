import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
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

  // Read current profile
  const { data: profile, error: readErr } = await supabase
    .from('profiles')
    .select('image_credits, has_god_mode')
    .eq('id', userId)
    .single();

  if (readErr || !profile) {
    console.error('[consume-credit] Profile read failed:', readErr);
    return res.status(404).json({ error: 'profile_not_found' });
  }

  // God mode: unlimited credits, no decrement
  if (profile.has_god_mode) {
    return res.status(200).json({ success: true, creditsRemaining: null, godMode: true });
  }

  // Check credit balance
  const credits = profile.image_credits || 0;
  if (credits <= 0) {
    return res.status(403).json({ error: 'no_credits', creditsRemaining: 0 });
  }

  // Atomic decrement with guard: only decrement if credits > 0
  const { data: updated, error: updateErr } = await supabase
    .from('profiles')
    .update({ image_credits: credits - 1 })
    .eq('id', userId)
    .gt('image_credits', 0)
    .select('image_credits')
    .single();

  if (updateErr || !updated) {
    console.error('[consume-credit] Atomic decrement failed:', updateErr);
    return res.status(403).json({ error: 'no_credits', creditsRemaining: 0 });
  }

  console.log(`[consume-credit] User ${userId}: ${credits} → ${updated.image_credits}`);
  return res.status(200).json({ success: true, creditsRemaining: updated.image_credits });
}
