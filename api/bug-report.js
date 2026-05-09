import { createClient } from '@supabase/supabase-js';

/**
 * Bug Report endpoint — three operations:
 *
 *   POST   /api/bug-report                 — user submits a new report
 *     body: { userId, userEmail, description, severity,
 *             storyId, sceneIdx, renderMode, userAgent,
 *             consoleBuffer, stateSnapshot }
 *     returns: { success, reportId } | { error }
 *
 *   GET    /api/bug-report?adminKey=...    — admin lists pending reports
 *     returns: { reports: [...] }
 *
 *   PATCH  /api/bug-report                 — admin approves or rejects a report
 *     body: { adminKey, reportId, action: 'approve' | 'reject', notes? }
 *     returns: { success, source, fortunes? }
 *
 * Admin gate: shared secret in env var `ADMIN_BUG_KEY`. Set in Vercel env
 * settings; admin page reads it from a separate URL fragment or pasted
 * by the operator. NOT secure for multi-admin scenarios; sufficient for
 * single-operator dev/staging use.
 *
 * Rate limit: server-side check on POST — max 3 submissions per user per
 * 24h. Returns 429 if exceeded. The DB doesn't enforce; the API does.
 */
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
    console.error('[bug-report] Supabase env vars missing');
    return res.status(500).json({ error: 'Server not configured' });
  }
  const supabase = createClient(sbUrl, sbKey);

  // ── POST — user submits a report ───────────────────────────────────
  if (req.method === 'POST') {
    const {
      userId, userEmail, description, severity,
      storyId, sceneIdx, renderMode, userAgent,
      consoleBuffer, stateSnapshot
    } = req.body || {};

    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (typeof description !== 'string' || description.trim().length < 30) {
      return res.status(400).json({ error: 'description must be at least 30 characters' });
    }
    if (description.length > 4000) {
      return res.status(400).json({ error: 'description too long (4000 char max)' });
    }
    const sevAllowed = ['typo', 'minor', 'breaking'];
    const sev = sevAllowed.includes(severity) ? severity : 'minor';

    // Rate limit: max 3 submissions per user per 24h
    const { data: recent, error: recentErr } = await supabase
      .from('bug_reports')
      .select('id')
      .eq('user_id', userId)
      .gte('submitted_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    if (recentErr) {
      console.error('[bug-report] rate-limit query failed:', recentErr);
      return res.status(500).json({ error: 'Rate-limit check failed' });
    }
    if (Array.isArray(recent) && recent.length >= 3) {
      return res.status(429).json({
        error: 'rate_limited',
        message: 'You\'ve submitted 3 reports in the last 24 hours. Try again tomorrow.'
      });
    }

    const insertRow = {
      user_id:        userId,
      user_email:     userEmail || null,
      description:    description.trim(),
      severity:       sev,
      story_id:       storyId || null,
      scene_idx:      typeof sceneIdx === 'number' ? sceneIdx : null,
      render_mode:    renderMode || null,
      user_agent:     userAgent || null,
      console_buffer: Array.isArray(consoleBuffer) ? consoleBuffer.slice(-15) : [],
      state_snapshot: stateSnapshot && typeof stateSnapshot === 'object' ? stateSnapshot : {}
    };

    const { data, error } = await supabase
      .from('bug_reports')
      .insert(insertRow)
      .select('id')
      .single();

    if (error) {
      console.error('[bug-report] insert failed:', error);
      return res.status(500).json({ error: 'Insert failed' });
    }

    console.log(`[bug-report] submitted: id=${data.id} user=${userId} severity=${sev}`);
    return res.status(200).json({ success: true, reportId: data.id });
  }

  // ── Admin gate (GET + PATCH) ────────────────────────────────────────
  const adminKey = req.method === 'GET' ? req.query.adminKey : (req.body && req.body.adminKey);
  const expected = process.env.ADMIN_BUG_KEY;
  if (!expected) {
    console.error('[bug-report] ADMIN_BUG_KEY not configured');
    return res.status(500).json({ error: 'Admin gate not configured' });
  }
  if (!adminKey || adminKey !== expected) {
    return res.status(403).json({ error: 'forbidden' });
  }

  // ── GET — admin lists reports ─────────────────────────────────────
  if (req.method === 'GET') {
    const filter = (req.query.filter || 'pending').toLowerCase();
    let query = supabase
      .from('bug_reports')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(200);
    if (filter === 'pending') {
      query = query.is('awarded_at', null).is('rejected_at', null);
    } else if (filter === 'awarded') {
      query = query.not('awarded_at', 'is', null);
    } else if (filter === 'rejected') {
      query = query.not('rejected_at', 'is', null);
    }
    const { data, error } = await query;
    if (error) {
      console.error('[bug-report] list failed:', error);
      return res.status(500).json({ error: 'List failed' });
    }
    return res.status(200).json({ reports: data || [] });
  }

  // ── PATCH — admin approves or rejects ─────────────────────────────
  if (req.method === 'PATCH') {
    const { reportId, action, notes } = req.body || {};
    if (!reportId) return res.status(400).json({ error: 'reportId required' });
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'action must be approve or reject' });
    }
    const rpcName = action === 'approve' ? 'grant_bug_bounty' : 'reject_bug_report';
    const rpcArgs = action === 'approve'
      ? { p_report_id: reportId, p_admin_notes: notes || null }
      : { p_report_id: reportId, p_admin_notes: notes || null };
    const { data, error } = await supabase.rpc(rpcName, rpcArgs);
    if (error) {
      console.error(`[bug-report] ${action} RPC failed:`, error);
      return res.status(500).json({ error: 'RPC failed' });
    }
    const result = Array.isArray(data) ? data[0] : data;
    console.log(`[bug-report] ${action}: id=${reportId} → ${result?.source}`);
    return res.status(200).json({
      success: true,
      source: result?.source || null,
      fortunes: result?.fortunes ?? null,
      userId: result?.user_id ?? null
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
