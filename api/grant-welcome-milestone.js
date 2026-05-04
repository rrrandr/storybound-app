import { createClient } from '@supabase/supabase-js';

/**
 * Grant a welcome milestone (first_arc | day2) atomically.
 *
 * The grant_welcome_milestone() RPC uses a WHERE clause on the milestone flag
 * as its idempotency guard: if the milestone is already granted, the UPDATE
 * affects zero rows and returns 'already_granted' without modifying balance.
 * Safe against multi-tab races, retries, and concurrent calls.
 *
 * POST /api/grant-welcome-milestone
 *   { userId, milestone: 'first_arc' | 'day2' }
 *   → { source, fortunes }
 */
export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, milestone } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (milestone !== 'first_arc' && milestone !== 'day2') {
    return res.status(400).json({ error: 'milestone must be "first_arc" or "day2"' });
  }

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    console.error('[grant-welcome-milestone] Supabase env vars missing');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const supabase = createClient(sbUrl, sbKey);

  const { data: rpcResult, error: rpcErr } = await supabase
    .rpc('grant_welcome_milestone', { p_user_id: userId, p_milestone: milestone });

  if (rpcErr) {
    console.error('[grant-welcome-milestone] RPC failed:', rpcErr);
    return res.status(500).json({ error: 'grant_failed' });
  }

  const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;

  if (!result || result.source === 'not_found') {
    return res.status(404).json({ error: 'profile_not_found' });
  }

  if (result.source === 'unknown_milestone') {
    return res.status(400).json({ error: 'unknown_milestone' });
  }

  console.log(`[grant-welcome-milestone] User ${userId}: milestone=${milestone}, source=${result.source}, fortunes=${result.fortunes}`);
  return res.status(200).json({
    success: true,
    granted: result.source === 'granted',
    alreadyGranted: result.source === 'already_granted',
    fortunes: result.fortunes || 0,
  });
}
