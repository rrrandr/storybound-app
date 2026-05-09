import { createClient } from '@supabase/supabase-js';

/**
 * Bug-report user-side awards check — runs through service role to bypass
 * RLS. RLS on bug_reports requires auth.uid() = user_id, but the client's
 * anon session uid often doesn't match the profile id this app uses, so
 * a direct query from the browser returns 0 rows. This endpoint trusts
 * the userId param; data returned is non-sensitive (severity + timestamp,
 * no description) and the POST mark-seen path verifies user_id ownership
 * before updating.
 *
 *   GET  /api/bug-report-awards?userId=<uuid>
 *     → { awards: [{ id, severity, awarded_at }] }
 *
 *   POST /api/bug-report-awards   { userId, ids }
 *     → { success: true, updated: N }
 */
export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) return res.status(500).json({ error: 'Server not configured' });
  const supabase = createClient(sbUrl, sbKey);

  // ── GET: list user's awarded-but-unseen reports ─────────────────────
  if (req.method === 'GET') {
    const userId = req.query.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('bug_reports')
      .select('id, severity, awarded_at')
      .eq('user_id', userId)
      .not('awarded_at', 'is', null)
      .is('awarded_seen_at', null)
      .gte('awarded_at', since)
      .order('awarded_at', { ascending: false });
    if (error) {
      console.error('[bug-report-awards] list failed:', error);
      return res.status(500).json({ error: 'list failed' });
    }
    return res.status(200).json({ awards: data || [] });
  }

  // ── POST: mark reports as seen (caller-scoped to their userId) ──────
  if (req.method === 'POST') {
    const { userId, ids } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids required' });
    // Update only rows owned by this user — prevents cross-user mark-seen abuse.
    const { error, count } = await supabase
      .from('bug_reports')
      .update({ awarded_seen_at: new Date().toISOString() }, { count: 'exact' })
      .in('id', ids)
      .eq('user_id', userId);
    if (error) {
      console.error('[bug-report-awards] mark-seen failed:', error);
      return res.status(500).json({ error: 'mark-seen failed' });
    }
    return res.status(200).json({ success: true, updated: count || 0 });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
