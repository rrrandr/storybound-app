import { createClient } from '@supabase/supabase-js';

/**
 * Returns the phase-image URLs for a completed parent run so an Alt POV
 * edition can reuse them instead of regenerating from scratch.
 *
 *   POST { userId, parentStoryId }
 *   → { images: [{ scene_idx, phase_idx, image_url }, ...] }
 *
 * DEFENSIVE STORAGE LOOKUP — tries two possible shapes:
 *
 *   (1) JSONB blob on library_entries.scene_images_jsonb keyed by
 *       'sceneIdx:phaseIdx' (e.g., {"0:0": "https://...", "0:1": "..."})
 *
 *   (2) Separate scene_phase_images table with columns (user_id,
 *       story_id, scene_idx, phase_idx, image_url)
 *
 * If neither storage path is populated yet, returns { images: [] } and
 * the client's _getAltPOVReusableImage falls through to fresh
 * generation. This endpoint is callable as soon as it ships; alt POV
 * cost savings activate the moment server-side image persistence is
 * in place — no client redeploy needed.
 *
 * SECURITY: enforces user_id ownership of the parent story before
 * returning image URLs (defense in depth — RLS catches it too).
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

  const { userId, parentStoryId } = req.body || {};
  if (!userId) return res.status(400).json({ error: 'userId required' });
  if (!parentStoryId) return res.status(400).json({ error: 'parentStoryId required' });

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    console.error('[get-parent-images] Supabase env vars missing');
    return res.status(500).json({ error: 'Server not configured' });
  }
  const supabase = createClient(sbUrl, sbKey);

  // ── Verify parent story ownership ──
  const { data: parentEntry, error: ownErr } = await supabase
    .from('library_entries')
    .select('id, user_id, story_id')
    .eq('story_id', parentStoryId)
    .eq('user_id', userId)
    .maybeSingle();

  if (ownErr) {
    console.error('[get-parent-images] ownership check failed:', ownErr);
    return res.status(500).json({ error: 'lookup_failed' });
  }
  if (!parentEntry) {
    // Either the parent story doesn't exist or it doesn't belong to
    // this user. Either way, refuse — don't leak existence.
    return res.status(404).json({ error: 'parent_not_found', images: [] });
  }

  const images = [];

  // ── Storage path (1): JSONB blob on library_entries ──
  try {
    const { data: entryWithBlob } = await supabase
      .from('library_entries')
      .select('scene_images_jsonb')
      .eq('id', parentEntry.id)
      .maybeSingle();
    const blob = entryWithBlob && entryWithBlob.scene_images_jsonb;
    if (blob && typeof blob === 'object') {
      // Keys are 'sceneIdx:phaseIdx' → image_url. Walk and flatten.
      for (const key in blob) {
        if (!Object.prototype.hasOwnProperty.call(blob, key)) continue;
        const parts = String(key).split(':');
        if (parts.length !== 2) continue;
        const sceneIdx = parseInt(parts[0], 10);
        const phaseIdx = parseInt(parts[1], 10);
        if (Number.isNaN(sceneIdx) || Number.isNaN(phaseIdx)) continue;
        if (typeof blob[key] !== 'string') continue;
        images.push({ scene_idx: sceneIdx, phase_idx: phaseIdx, image_url: blob[key] });
      }
    }
  } catch (e) {
    // Column doesn't exist or other read error — fall through to path (2).
    // Don't log noisily; this is expected during the migration window.
  }

  // ── Storage path (2): scene_phase_images table ──
  if (images.length === 0) {
    try {
      const { data: rows } = await supabase
        .from('scene_phase_images')
        .select('scene_idx, phase_idx, image_url')
        .eq('user_id', userId)
        .eq('story_id', parentStoryId);
      if (Array.isArray(rows)) {
        for (const r of rows) {
          if (typeof r.image_url === 'string' && Number.isInteger(r.scene_idx) && Number.isInteger(r.phase_idx)) {
            images.push({ scene_idx: r.scene_idx, phase_idx: r.phase_idx, image_url: r.image_url });
          }
        }
      }
    } catch (e) {
      // Table doesn't exist or other read error — return whatever we got
      // (likely empty). Client handles empty gracefully.
    }
  }

  console.log(`[get-parent-images] user=${userId} parent=${parentStoryId} → ${images.length} images`);
  return res.status(200).json({ images: images });
}
