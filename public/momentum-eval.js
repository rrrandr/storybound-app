/* ─────────────────────────────────────────────────────────────────────────────
 * momentum-eval.js — analyzer for the momentum experiment arms. PURE (no API): it
 * aggregates shared-schema records (from window.__txnRetryLog, the SCENE-SPINE arm's
 * logs, or a dumped batch JSON) and reports per-architecture results.
 *
 * Enforces Roman's success-bias guard: it does NOT just report the average delivery
 * rate — it CLUSTERS the residual misses by dominant_replacement, so "is the remainder
 * one failure mode or several?" is answered directly, not eyeballed. Different clusters
 * argue for different solutions, not one ever-more-elaborate architecture.
 *
 * Shared record schema (both arms emit): { scene_id, architecture, first_verdict,
 * final_verdict, retry_count, transition_position, dominant_replacement, latency_ms,
 * reader_score, first_pass_cost, final_cost }.
 * ───────────────────────────────────────────────────────────────────────────── */
(function (root) {
  var DELIVERED = 'DELIVERED';
  function mean(xs) { var v = xs.filter(function (x) { return typeof x === 'number' && !isNaN(x); }); return v.length ? v.reduce(function (a, b) { return a + b; }, 0) / v.length : null; }
  function pct(n, d) { return d ? Math.round((n / d) * 1000) / 10 : null; }
  function tally(items) { var m = {}; items.forEach(function (k) { k = k || 'unknown'; m[k] = (m[k] || 0) + 1; }); return m; }

  function analyzeArm(records) {
    var n = records.length;
    var firstDelivered = records.filter(function (r) { return r.first_verdict === DELIVERED; });
    var finalDelivered = records.filter(function (r) { return (r.final_verdict || r.first_verdict) === DELIVERED; });
    // RESIDUAL misses = what the READER still gets wrong (final verdict not delivered) — cluster these.
    var residualMisses = records.filter(function (r) { return (r.final_verdict || r.first_verdict) !== DELIVERED; });
    // first-pass misses = what the author failed BEFORE any repair (cluster by dominant_replacement_1 if present).
    var firstMisses = records.filter(function (r) { return r.first_verdict !== DELIVERED; });
    var retried = records.filter(function (r) { return r.retried === true || (r.retry_count || 0) > 0; });
    var retryRescued = retried.filter(function (r) { return (r.final_verdict || r.second_verdict) === DELIVERED; });
    return {
      n: n,
      first_pass_delivery_pct: pct(firstDelivered.length, n),
      final_delivery_pct: pct(finalDelivered.length, n),
      // ── the success-bias guard: the residual, CLUSTERED ──
      residual_miss_count: residualMisses.length,
      residual_miss_clusters: tally(residualMisses.map(function (r) { return r.dominant_replacement; })),
      first_pass_miss_clusters: tally(firstMisses.map(function (r) { return r.dominant_replacement_1 || r.dominant_replacement; })),
      // pacing / cost / retry economics
      avg_delivered_position: mean(finalDelivered.map(function (r) { return r.transition_position; }).filter(function (p) { return p >= 0; })),
      avg_position_delta: mean(records.map(function (r) { return r.transition_position_delta; })),
      avg_latency_ms: mean(records.map(function (r) { return r.latency_ms; })),
      avg_first_pass_cost: mean(records.map(function (r) { return r.first_pass_cost; })),
      avg_final_cost: mean(records.map(function (r) { return r.final_cost; })),
      retry_rate_pct: pct(retried.length, n),
      retry_rescue_pct: retried.length ? pct(retryRescued.length, retried.length) : null,
      avg_reader_score: mean(records.map(function (r) { return r.reader_score; }))
    };
  }

  // records: array (or window.__txnRetryLog if omitted). Groups by architecture, analyzes each.
  root._momentumEval = function (records) {
    records = records || (root.window && root.window.__txnRetryLog) || (typeof window !== 'undefined' && window.__txnRetryLog) || [];
    if (!Array.isArray(records) || !records.length) return { error: 'no records', n: 0 };
    var byArch = {};
    records.forEach(function (r) { (byArch[r.architecture || 'unknown'] = byArch[r.architecture || 'unknown'] || []).push(r); });
    var out = { total_records: records.length, by_architecture: {} };
    Object.keys(byArch).forEach(function (a) { out.by_architecture[a] = analyzeArm(byArch[a]); });
    // head-to-head when both arms present
    var archs = Object.keys(out.by_architecture);
    if (archs.length === 2) {
      var A = out.by_architecture[archs[0]], B = out.by_architecture[archs[1]];
      out.comparison = {
        arms: archs,
        first_pass_delivery_delta: (A.first_pass_delivery_pct != null && B.first_pass_delivery_pct != null) ? Math.round((B.first_pass_delivery_pct - A.first_pass_delivery_pct) * 10) / 10 : null,
        final_delivery_delta: (A.final_delivery_pct != null && B.final_delivery_pct != null) ? Math.round((B.final_delivery_pct - A.final_delivery_pct) * 10) / 10 : null,
        reader_score_delta: (A.avg_reader_score != null && B.avg_reader_score != null) ? Math.round((B.avg_reader_score - A.avg_reader_score) * 100) / 100 : null,
        note: 'positive = ' + archs[1] + ' better. Judge on reader_score, not delivery %. If clusters differ, the arms attack different failure modes → do not average them into one architecture.'
      };
    }
    try { console.log('[MOMENTUM-EVAL]', JSON.stringify(out, null, 2)); } catch (_) {}
    return out;
  };

  // ── CORPUS SELECTOR (Roman): before spending a single API dollar, mine EXISTING telemetry
  //    (browser sb_scene_audit_v1 / commit-scene logs / realization audit) for a purpose-built
  //    CONTRAST corpus — not "30 scenes" but 10 likely-succeed / 10 historically-fail / 10 near-
  //    boundary, so the eval tests the HARD cases first (higher information density). Pure, no API.
  //    Flexible field access so it runs over any of the telemetry shapes.
  function _v(r) { return String(r.final_verdict || r.delivery || (r.move_executed === 'no' ? 'MISSED' : (r.move_executed === 'yes' ? 'DELIVERED' : '')) || '').toUpperCase(); }
  function _ret(r) { return r.retry_count != null ? r.retry_count : (Array.isArray(r.regens) ? r.regens.length : 0); }
  function _pos(r) { return typeof r.transition_position === 'number' ? r.transition_position : -1; }
  function _pend(r) { return !!(r.pendingIntent || r.pending_unresolved); }
  function _slipped(r) { var v = _v(r); return v === 'MISSED' || v === 'ABSENT' || r.state_change_ownership === 'absent' || r.outcome_delivered === false; }
  root._momentumCorpus = function (records, opts) {
    opts = opts || {}; var per = opts.perBucket || 10;
    if (!Array.isArray(records) || !records.length) return { error: 'no records — pass _auditTail(200) / a dumped log / the realization audit', pool: 0 };
    var hard = [], boundary = [], easy = [];
    records.forEach(function (r) {
      var v = _v(r), p = _pos(r), rt = _ret(r);
      if (_slipped(r) || rt >= 2 || _pend(r)) hard.push(r);                       // historically fail: miss / repeated retries / unresolved intent
      else if (v === 'PARTIAL' || (v === 'DELIVERED' && p >= 85) || rt === 1) boundary.push(r); // near boundary: partial / barely-landed / 1-retry rescue
      else if (v === 'DELIVERED') easy.push(r);                                    // likely succeed: clean early delivery
    });
    hard.sort(function (a, b) { return _ret(b) - _ret(a); }); // most-retried first = hardest
    var out = {
      likely_succeed: easy.slice(0, per),
      historically_fail: hard.slice(0, per),
      near_boundary: boundary.slice(0, per),
      counts: { pool: records.length, easy: easy.length, hard: hard.length, boundary: boundary.length,
        selected: { likely_succeed: Math.min(easy.length, per), historically_fail: Math.min(hard.length, per), near_boundary: Math.min(boundary.length, per) } },
      note: 'Regenerate THESE scenes under SCENE-SPINE (then retry) — hard cases first. If any bucket is thin, that itself is a finding about where the corpus is scarce.'
    };
    try { console.log('[MOMENTUM-CORPUS]', JSON.stringify(out.counts, null, 2)); } catch (_) {}
    return out;
  };
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
