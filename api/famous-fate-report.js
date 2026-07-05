import { createClient } from '@supabase/supabase-js';

/**
 * Famous Fate Beta Report endpoint — three operations:
 *
 *   POST   /api/famous-fate-report          — reader submits a report
 *     body: { userId, userEmail, category, description, expected,
 *             screenshotUrl, telemetry }
 *     returns: { success, reportId } | { error }
 *
 *   GET    /api/famous-fate-report?adminKey=...&filter=pending
 *     filters: pending | confirmed | high_priority | all
 *     returns: { reports: [...] }
 *
 *   PATCH  /api/famous-fate-report          — admin sets status / grants reward
 *     body: { adminKey, reportId, status, reward?, notes? }
 *     returns: { success, source, fortunes? }
 *
 * Admin gate: shared secret env var ADMIN_BUG_KEY (reused from bug-report).
 * Rewards are granted by the set_famous_fate_report_status RPC (idempotent);
 * crediting is admin-triggered today but the logic is server-side so it can be
 * automated later without redesign.
 *
 * Rate limit: max 5 submissions per user per 24h (429 if exceeded).
 */

const CATEGORIES = [
  'technical_bug', 'canon_lore', 'out_of_character', 'romance_relationship',
  'story_continuity', 'writing_quality', 'suggestion', 'other'
];
const STATUSES = [
  'pending', 'confirmed', 'duplicate', 'not_reproducible',
  'working_as_intended', 'needs_discussion'
];
const REWARD_TIERS = [0, 1, 3, 5, 10, 25];

// Trust-boundary scrub: the client already sanitizes, but never trust the
// client. Strip tags/template-expr/control chars and cap length.
function serverScrub(s, max) {
  if (typeof s !== 'string') return '';
  let t = s.trim();
  if (max && t.length > max) t = t.slice(0, max);
  t = t.replace(/<[^>]*>/g, '');
  t = t.replace(/\$\{[^}]*\}/g, '');
  t = t.replace(/[\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF]/g, '');
  return t.trim();
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    console.error('[ff-report] Supabase env vars missing');
    return res.status(500).json({ error: 'Server not configured' });
  }
  const supabase = createClient(sbUrl, sbKey);

  // ── POST — reader submits a report ─────────────────────────────────
  if (req.method === 'POST') {
    const {
      userId, userEmail, category, description, expected,
      screenshotUrl, telemetry
    } = req.body || {};

    if (!userId) return res.status(400).json({ error: 'userId required' });
    const cat = CATEGORIES.includes(category) ? category : 'other';
    const desc = serverScrub(description, 500);
    if (!desc) return res.status(400).json({ error: 'description required' });
    const exp = serverScrub(expected, 500);
    const tele = telemetry && typeof telemetry === 'object' ? telemetry : {};

    // Rate limit: max 5 / user / 24h
    const { data: recent, error: recentErr } = await supabase
      .from('famous_fate_reports')
      .select('id')
      .eq('user_id', userId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    if (recentErr) {
      console.error('[ff-report] rate-limit query failed:', recentErr);
      return res.status(500).json({ error: 'Rate-limit check failed' });
    }
    if (Array.isArray(recent) && recent.length >= 5) {
      return res.status(429).json({
        error: 'rate_limited',
        message: 'You\'ve submitted 5 reports in the last 24 hours. Thanks — try again tomorrow.'
      });
    }

    // Derive denormalized searchable columns from telemetry (best-effort).
    const ff = tele.famousFate || {};
    const orig = ff.original || {};
    const resolved = ff.resolved || {};
    const story = tele.story || {};
    const models = tele.models || {};
    const build = tele.build || {};
    const imagesGenerated = tele.imagesGenerated === true;

    // Screenshot: only accept a reasonably-sized data/https URL (cap ~3MB).
    let shot = null;
    if (typeof screenshotUrl === 'string' &&
        (screenshotUrl.startsWith('data:image/') || screenshotUrl.startsWith('https://')) &&
        screenshotUrl.length <= 3_500_000) {
      shot = screenshotUrl;
    }

    const insertRow = {
      user_id:            userId,
      user_email:         userEmail || null,
      category:           cat,
      description:        desc,
      expected:           exp || null,
      screenshot_url:     shot,
      story_id:           story.storyId || null,
      issue_id:           story.issueId != null ? String(story.issueId) : null,
      scene_number:       typeof story.sceneNumber === 'number' ? story.sceneNumber : null,
      scene_id:           story.sceneId || null,
      franchise:          orig.world || null,
      embodied_character: orig.embody || null,
      resolved_world:     resolved.world || null,
      classifier_version: resolved.classifierVersion || null,
      author_model:       models.author || null,
      build_version:      build.version || null,
      images_generated:   imagesGenerated,
      high_priority:      imagesGenerated,   // images in Famous Fate = contract breach
      telemetry:          tele
    };

    const { data, error } = await supabase
      .from('famous_fate_reports')
      .insert(insertRow)
      .select('id')
      .single();

    if (error) {
      console.error('[ff-report] insert failed:', error);
      return res.status(500).json({ error: 'Insert failed' });
    }
    console.log(`[ff-report] submitted: id=${data.id} user=${userId} category=${cat} hp=${imagesGenerated}`);
    return res.status(200).json({ success: true, reportId: data.id });
  }

  // ── Admin gate (GET + PATCH) ───────────────────────────────────────
  const adminKey = req.method === 'GET' ? req.query.adminKey : (req.body && req.body.adminKey);
  const expectedKey = process.env.ADMIN_BUG_KEY;
  if (!expectedKey) {
    console.error('[ff-report] ADMIN_BUG_KEY not configured');
    return res.status(500).json({ error: 'Admin gate not configured' });
  }
  if (!adminKey || adminKey !== expectedKey) {
    return res.status(403).json({ error: 'forbidden' });
  }

  // ── GET — admin lists reports ──────────────────────────────────────
  if (req.method === 'GET') {
    const filter = (req.query.filter || 'pending').toLowerCase();
    let query = supabase
      .from('famous_fate_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    if (filter === 'pending') query = query.eq('status', 'pending');
    else if (filter === 'confirmed') query = query.eq('status', 'confirmed');
    else if (filter === 'high_priority') query = query.eq('high_priority', true);
    // 'all' → no extra filter
    const { data, error } = await query;
    if (error) {
      console.error('[ff-report] list failed:', error);
      return res.status(500).json({ error: 'List failed' });
    }
    return res.status(200).json({ reports: data || [] });
  }

  // ── PATCH — admin sets status / grants reward ──────────────────────
  if (req.method === 'PATCH') {
    const { reportId, status, reward, notes } = req.body || {};
    if (!reportId) return res.status(400).json({ error: 'reportId required' });
    if (!STATUSES.includes(status)) return res.status(400).json({ error: 'invalid status' });
    let rewardVal = null;
    if (reward != null) {
      const r = parseInt(reward, 10);
      if (!REWARD_TIERS.includes(r)) return res.status(400).json({ error: 'invalid reward tier' });
      rewardVal = r;
    }
    const { data, error } = await supabase.rpc('set_famous_fate_report_status', {
      p_report_id: reportId,
      p_status: status,
      p_reward: rewardVal,
      p_notes: notes || null
    });
    if (error) {
      console.error('[ff-report] status RPC failed:', error);
      return res.status(500).json({ error: 'RPC failed' });
    }
    const result = Array.isArray(data) ? data[0] : data;
    console.log(`[ff-report] status: id=${reportId} → ${status} (${result?.source})`);
    return res.status(200).json({
      success: true,
      source: result?.source || null,
      fortunes: result?.fortunes ?? null,
      userId: result?.user_id ?? null
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
