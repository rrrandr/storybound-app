import { createClient } from '@supabase/supabase-js';

/**
 * TEASE TIER SERVER-SIDE COST GUARD
 *
 * Prevents client tampering from bypassing scene cap.
 * Tracks total_tease_scenes_generated per user.
 *
 * POST /api/tease-guard
 *   { userId, action: 'check' }  → { allowed: true/false, scenesGenerated, cap }
 *   { userId, action: 'increment' } → { scenesGenerated }
 *
 * NOTE: Requires profiles.total_tease_scenes_generated column (integer, default 0).
 *       If column does not exist, add via migration:
 *       ALTER TABLE profiles ADD COLUMN total_tease_scenes_generated integer DEFAULT 0;
 */

const TEASE_SCENE_CAP_SERVER = 20; // Server-side hard ceiling (max configurable cap)

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, action } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (!action || !['check', 'increment'].includes(action)) {
    return res.status(400).json({ error: 'action must be "check" or "increment"' });
  }

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    console.error('[tease-guard] Supabase env vars missing');
    return res.status(500).json({ error: 'Server not configured' });
  }

  const supabase = createClient(sbUrl, sbKey);

  const { data: profile, error: readErr } = await supabase
    .from('profiles')
    .select('total_tease_scenes_generated, is_subscriber, has_storypass')
    .eq('id', userId)
    .single();

  if (readErr || !profile) {
    console.error('[tease-guard] Profile read failed:', readErr);
    return res.status(404).json({ error: 'profile_not_found' });
  }

  // Subscribers and storypass holders bypass tease guard
  if (profile.is_subscriber || profile.has_storypass) {
    return res.status(200).json({ allowed: true, bypassed: true });
  }

  const scenesGenerated = profile.total_tease_scenes_generated || 0;

  if (action === 'check') {
    const allowed = scenesGenerated < TEASE_SCENE_CAP_SERVER;
    return res.status(allowed ? 200 : 403).json({
      allowed,
      scenesGenerated,
      cap: TEASE_SCENE_CAP_SERVER,
      error: allowed ? undefined : 'tease_cap_reached'
    });
  }

  if (action === 'increment') {
    if (scenesGenerated >= TEASE_SCENE_CAP_SERVER) {
      return res.status(403).json({
        error: 'tease_cap_reached',
        scenesGenerated,
        cap: TEASE_SCENE_CAP_SERVER
      });
    }

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ total_tease_scenes_generated: scenesGenerated + 1 })
      .eq('id', userId);

    if (updateErr) {
      console.error('[tease-guard] Increment failed:', updateErr);
      return res.status(500).json({ error: 'increment_failed' });
    }

    console.log(`[tease-guard] User ${userId}: scene ${scenesGenerated + 1}/${TEASE_SCENE_CAP_SERVER}`);
    return res.status(200).json({
      allowed: true,
      scenesGenerated: scenesGenerated + 1,
      cap: TEASE_SCENE_CAP_SERVER
    });
  }
}
