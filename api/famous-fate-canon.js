import { createClient } from '@supabase/supabase-js';

/**
 * Famous Fate — CANON CACHE endpoint (shared cross-story reuse of generated
 * Character / World / Relationship contracts). Two operations, both POST:
 *
 *   POST /api/famous-fate-canon  { op:'get', universe, version?, keys? }
 *     → { entries: [{ entry_type, entry_key, role, payload }] }
 *       (keys optional: restrict character entries to these normalized keys;
 *        world + relationship rows for the universe are always returned)
 *
 *   POST /api/famous-fate-canon  { op:'put', universe, version?, entries:[
 *           { entry_type:'character'|'world'|'relationship', entry_key, role?, payload } ] }
 *     → { success, upserted }
 *
 * Service-role; the table is RLS-locked so this endpoint is the only access
 * path. Payloads are non-sensitive canon text. Light abuse guards: origin
 * check, required universe, per-entry + total size caps, entry count cap.
 */

const TYPES = ['character', 'world', 'relationship', 'pools'];
const MAX_ENTRIES = 24;
const MAX_PAYLOAD_BYTES = 24_000;     // per entry
const MAX_TOTAL_BYTES = 200_000;      // whole put

function norm(s, max) {
  if (typeof s !== 'string') return '';
  let t = s.trim().toLowerCase().replace(/\s+/g, ' ');
  if (max && t.length > max) t = t.slice(0, max);
  return t;
}

export default async function handler(req, res) {
  const origin = req.headers.origin || '';
  const allowedOrigin = origin === 'https://storybound.love' || origin === 'https://www.storybound.love' || origin.startsWith('http://localhost') ? origin : 'https://storybound.love';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    console.error('[ff-canon] Supabase env vars missing');
    return res.status(500).json({ error: 'Server not configured' });
  }
  const supabase = createClient(sbUrl, sbKey);

  const body = req.body || {};
  const op = body.op;
  const universe = norm(body.universe, 200);
  const version = norm(body.version, 80);
  if (!universe) return res.status(400).json({ error: 'universe required' });

  // ── GET ──
  if (op === 'get') {
    let query = supabase
      .from('ff_canon_cache')
      .select('entry_type, entry_key, role, payload')
      .eq('universe', universe)
      .eq('version', version)
      .limit(200);
    const { data, error } = await query;
    if (error) {
      console.error('[ff-canon] get failed:', error.message);
      return res.status(500).json({ error: 'get failed' });
    }
    let entries = data || [];
    // Optional key restriction for character rows (world + relationship always pass).
    if (Array.isArray(body.keys) && body.keys.length) {
      const wanted = new Set(body.keys.map((k) => norm(k, 120)));
      entries = entries.filter((e) => e.entry_type !== 'character' || wanted.has(e.entry_key));
    }
    return res.status(200).json({ entries });
  }

  // ── PUT (upsert) ──
  if (op === 'put') {
    const entries = Array.isArray(body.entries) ? body.entries : [];
    if (!entries.length) return res.status(400).json({ error: 'entries required' });
    if (entries.length > MAX_ENTRIES) return res.status(400).json({ error: 'too many entries' });

    let total = 0;
    const rows = [];
    for (const e of entries) {
      if (!e || !TYPES.includes(e.entry_type)) continue;
      const key = norm(e.entry_key, 160);
      if (!key) continue;
      if (!e.payload || typeof e.payload !== 'object') continue;
      let bytes;
      try { bytes = Buffer.byteLength(JSON.stringify(e.payload), 'utf8'); } catch (_) { continue; }
      if (bytes > MAX_PAYLOAD_BYTES) continue;
      total += bytes;
      if (total > MAX_TOTAL_BYTES) break;
      rows.push({
        universe,
        version,
        entry_type: e.entry_type,
        entry_key: key,
        role: typeof e.role === 'string' ? e.role.slice(0, 120) : null,
        payload: e.payload,
        updated_at: new Date().toISOString()
      });
    }
    if (!rows.length) return res.status(400).json({ error: 'no valid entries' });

    const { error } = await supabase
      .from('ff_canon_cache')
      .upsert(rows, { onConflict: 'universe,entry_type,entry_key,version' });
    if (error) {
      console.error('[ff-canon] put failed:', error.message);
      return res.status(500).json({ error: 'put failed' });
    }
    console.log(`[ff-canon] upserted ${rows.length} entr(ies) for universe="${universe}"`);
    return res.status(200).json({ success: true, upserted: rows.length });
  }

  return res.status(400).json({ error: 'unknown op' });
}
