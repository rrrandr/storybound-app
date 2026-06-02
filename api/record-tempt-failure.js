import { createClient } from '@supabase/supabase-js';

// Record a scene-gen failure and conditionally grant +1 Tempt Fate charge.
// Three-tier behavior (see _tempt-failure-log-migration.sql for the RPC):
//   • attempt 1 of a given (user, story, scene) → 'recovered' (toast only)
//   • attempt 2 (default threshold)              → 'granted' (modal + charge)
//   • attempts after grant                       → 'already_granted' (toast)
//
// PK on the log table is (user_id, story_id, scene_idx). Reason is metadata
// for telemetry, NOT part of the dedup — "scene 12 blew up" is one incident.
//
// POST /api/record-tempt-failure
//   { userId, storyId, sceneIdx, reason }
//   → 200 { ok, source, attemptCount, bonus_tempt_charges }
//   → 400 on missing/invalid fields
//   → 404 if profile not found
//   → 500 on RPC failure
export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin =
    origin === 'https://storybound.love' ||
    origin === 'https://www.storybound.love' ||
    origin.startsWith('http://localhost')
      ? origin
      : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { userId, storyId, sceneIdx, reason } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (!storyId || typeof storyId !== 'string') {
    return res.status(400).json({ error: 'storyId required' });
  }
  if (sceneIdx == null || !Number.isInteger(sceneIdx)) {
    return res.status(400).json({ error: 'sceneIdx required (integer)' });
  }
  if (!reason || typeof reason !== 'string') {
    return res.status(400).json({ error: 'reason required' });
  }
  // Reason is metadata; cap length to keep the log row small.
  const reasonTrimmed = reason.slice(0, 64);

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    console.error('[record-tempt-failure] Supabase env vars missing');
    return res.status(500).json({ error: 'Server not configured' });
  }
  const supabase = createClient(sbUrl, sbKey);

  const { data: rpcResult, error: rpcErr } = await supabase.rpc('record_tempt_failure', {
    p_user_id: userId,
    p_story_id: storyId,
    p_scene_idx: sceneIdx,
    p_reason: reasonTrimmed,
    // p_threshold uses RPC default (2). To experiment with 3, pass explicitly.
  });

  if (rpcErr) {
    console.error('[record-tempt-failure] RPC failed:', rpcErr.message);
    return res.status(500).json({ error: 'record_failed', detail: rpcErr.message });
  }

  const result = Array.isArray(rpcResult) ? rpcResult[0] : rpcResult;
  if (!result) {
    return res.status(500).json({ error: 'record_failed', detail: 'empty_rpc_result' });
  }
  if (result.source === 'profile_not_found') {
    return res.status(404).json({ error: 'profile_not_found' });
  }

  const source = result.source;
  const attemptCount = result.attempt_count || 0;
  const balance = result.bonus_tempt_charges || 0;
  console.log(
    `[record-tempt-failure] user=${userId} story=${storyId} scene=${sceneIdx} attempt=${attemptCount} reason=${reasonTrimmed} → ${source} (balance=${balance})`
  );
  return res.status(200).json({
    ok: true,
    source,
    attemptCount,
    bonus_tempt_charges: balance,
  });
}
