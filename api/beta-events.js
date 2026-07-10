// Beta Observatory collector (Roman 2026-07-10).
//   POST  /api/beta-events        { events: [ {ev, sid, uh, ts, p} ... ] }   — clients log (public, capped)
//   GET   /api/beta-events?adminKey=...&hours=24                              — admin reads (service-role only)
// Privacy: stores user_id_hash only (never email/PII/card). Mirrors the bug-report/famous-fate-report admin
// pattern (adminKey === process.env.ADMIN_BUG_KEY). Non-critical: failures never block the app.
import { createClient } from '@supabase/supabase-js';

const MAX_BATCH = 100;                 // per POST
const MAX_TEXT = 4000;                 // clamp any payload string
const ALLOWED = new Set([
  'beta_session_started','story_setup_started','story_setup_completed','story_started','story_mode_selected',
  'scene_generation_started','scene_generation_completed','scene_generation_failed',
  'story_resumed','page_refreshed_resume_attempted','page_refreshed_resume_completed','library_resume_clicked',
  'fortune_balance_seen','fortune_debit_attempted','fortune_debit_succeeded','fortune_debit_failed',
  'scene_delivered_after_debit','debit_without_scene_detected','scene_without_expected_debit_detected',
  'preview_stop_shown','continuation_prompt_shown','continuation_accepted','subscription_lock_shown',
  'submit_clicked','duplicate_submit_blocked','modal_opened','modal_resolved','modal_cancelled','modal_stale_timeout',
  'spinner_started','spinner_stopped','spinner_timeout','choice_rendered','choice_clicked','choice_missing_detected',
  'ff_contract_created','speculative_package_created','crossover_contract_created','substitution_modal_shown',
  'ambiguous_modal_shown','stale_flag_detected','stale_flag_suppressed','mode_leak_guard_triggered',
  'scene_quality_scan_completed','scene_quality_scan_warn','scene_quality_scan_fail',
  // reader-behavior (Phase 2 — accepted if clients emit them)
  'scene_mounted','scene_timing','fate_card_opened','fate_card_closed','fate_card_selected','fate_card_cancelled',
  'petition_fate_opened','petition_fate_submitted','tempt_fate_opened','tempt_fate_submitted',
  'concierge_opened','concierge_message_submitted','concierge_response_generated','concierge_closed'
]);

function sb() {
  const url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}
function clampStrings(o) {
  if (!o || typeof o !== 'object') return {};
  const out = {};
  for (const k of Object.keys(o)) {
    let v = o[k];
    if (typeof v === 'string') v = v.slice(0, MAX_TEXT);
    else if (v && typeof v === 'object') { try { v = JSON.parse(JSON.stringify(v).slice(0, MAX_TEXT * 2)); } catch (_) { v = null; } }
    // hard privacy strip: never persist obvious PII keys
    if (/email|card|cvv|token|password|secret/i.test(k)) continue;
    out[k] = v;
  }
  return out;
}

export default async function handler(req, res) {
  const supabase = sb();
  if (!supabase) return res.status(500).json({ error: 'telemetry store not configured' });

  // ── POST — clients log events (public, non-critical) ──
  if (req.method === 'POST') {
    try {
      const evs = Array.isArray(req.body && req.body.events) ? req.body.events.slice(0, MAX_BATCH) : [];
      if (!evs.length) return res.status(200).json({ ok: true, inserted: 0 });
      const rows = evs
        .filter(e => e && typeof e.ev === 'string' && ALLOWED.has(e.ev))
        .map(e => {
          const p = clampStrings(e.p || {});
          return {
            event_name: String(e.ev).slice(0, 60),
            session_id: e.sid ? String(e.sid).slice(0, 64) : null,
            user_id_hash: e.uh ? String(e.uh).slice(0, 64) : null,
            story_id: (p.storyId != null) ? String(p.storyId).slice(0, 80) : null,
            scene_index: Number.isInteger(p.sceneIndex) ? p.sceneIndex : (Number.isInteger(p.turnCount) ? p.turnCount : null),
            mode: p.fateMode ? String(p.fateMode).slice(0, 40) : null,
            payload: p,
            created_at: (typeof e.ts === 'number') ? new Date(e.ts).toISOString() : new Date().toISOString()
          };
        });
      if (!rows.length) return res.status(200).json({ ok: true, inserted: 0 });
      const { error } = await supabase.from('beta_events').insert(rows);
      if (error) { console.error('[beta-events] insert failed:', error.message); return res.status(200).json({ ok: false }); }
      return res.status(200).json({ ok: true, inserted: rows.length });
    } catch (e) { console.error('[beta-events] POST threw:', e && e.message); return res.status(200).json({ ok: false }); }
  }

  // ── GET — admin reads (service-role only, adminKey gate) ──
  if (req.method === 'GET') {
    const adminKey = req.query.adminKey;
    const expected = process.env.ADMIN_BUG_KEY;
    if (!expected) return res.status(500).json({ error: 'admin gate not configured' });
    if (!adminKey || adminKey !== expected) return res.status(403).json({ error: 'forbidden' });
    const hours = Math.min(168, Math.max(1, parseInt(req.query.hours, 10) || 24));
    const since = new Date(Date.now() - hours * 3600 * 1000).toISOString();
    const { data, error } = await supabase
      .from('beta_events')
      .select('event_name,session_id,user_id_hash,story_id,scene_index,mode,payload,created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(10000);
    if (error) { console.error('[beta-events] read failed:', error.message); return res.status(500).json({ error: 'read failed' }); }
    // normalize to the sbLogBeta event shape the admin page expects
    const events = (data || []).map(r => ({
      ev: r.event_name, sid: r.session_id, uh: r.user_id_hash, ts: new Date(r.created_at).getTime(),
      p: Object.assign({ storyId: r.story_id, sceneIndex: r.scene_index, fateMode: r.mode }, r.payload || {})
    }));
    return res.status(200).json({ window_hours: hours, generatedAt: new Date().toISOString(), source: 'beta_events', count: events.length, events });
  }

  return res.status(405).json({ error: 'method not allowed' });
}
