// ════════════════════════════════════════════════════════════════════════════════════════
//  STORAGE ADAPTERS FOR THE MISTRAL QUOTA GOVERNOR
//
//  ONE BOUNDARY, TWO IMPLEMENTATIONS. The proxy talks only to this interface, so the shape it
//  depends on is the shape the tests exercise:
//      admit({bucket, nowMs, reserve, opId, tpm, windowMs, minIntervalMs})
//        → {admitted:true, usedTokens} | {admitted:false, reason:'tpm'|'rps',
//           usedTokens, retryTpmMs, retryRpsMs, retryAfterMs}
//      reconcile({opId, actual})  → {ok, released, held, exact}
//      release({opId, reason})    → {ok, released}
//
//  supabaseStore calls the SQL RPCs in 20260904_mistral_quota_governor.sql.
//  memoryStore mirrors those semantics for deterministic tests with an injected clock.
//
//  THE MIRRORING IS ITSELF A RISK, and is stated rather than hidden: the tests prove the
//  CONTRACT, not the PL/pgSQL. Only applying the migration to a database and running the same
//  matrix against supabaseStore closes that gap.
// ════════════════════════════════════════════════════════════════════════════════════════
'use strict';

function supabaseStore(sb) {
  const unwrap = (res) => {
    if (res.error) throw new Error('quota store: ' + res.error.message);
    return res.data || {};
  };
  return {
    kind: 'supabase',
    async admit({ bucket, nowMs, reserve, opId, tpm, windowMs, minIntervalMs, retentionMs, pruneLimit }) {
      const d = unwrap(await sb.rpc('mistral_quota_admit', {
        p_op_id: opId, p_bucket: bucket, p_now_ms: nowMs, p_reserve: reserve,
        p_tpm: tpm, p_window_ms: windowMs, p_min_interval_ms: minIntervalMs,
        p_retention_ms: retentionMs, p_prune_limit: pruneLimit
      }));
      return { admitted: !!d.admitted, reason: d.reason || null, replay: !!d.replay,
               usedTokens: d.used_tokens ?? null, state: d.state ?? null,
               existingBucket: d.existing_bucket ?? null, existingReserved: d.existing_reserved ?? null,
               retryTpmMs: d.retry_tpm_ms ?? null, retryRpsMs: d.retry_rps_ms ?? null,
               retryAfterMs: d.retry_after_ms ?? null, pruned: d.pruned ?? 0 };
    },
    async reconcile({ opId, actual, nowMs, windowMs, retentionMs, pruneLimit }) {
      // Every prune argument is forwarded explicitly, including the window: reconcile validates
      // retention > window itself and refuses the call otherwise. `?? null` rather than a
      // default, so a caller that omits one gets a typed refusal instead of a guessed horizon.
      const d = unwrap(await sb.rpc('mistral_quota_reconcile', {
        p_op_id: opId, p_actual: actual,
        p_now_ms: nowMs ?? null, p_window_ms: windowMs ?? null,
        p_retention_ms: retentionMs ?? null, p_prune_limit: pruneLimit ?? null
      }));
      return { ok: !!d.ok, reason: d.reason ?? null, released: d.released ?? 0, held: d.held ?? null,
               exact: !!d.exact, late: !!d.late, pruned: d.pruned ?? 0 };
    },
    async release({ opId, reason }) {
      const d = unwrap(await sb.rpc('mistral_quota_release', { p_op_id: opId, p_reason: reason || null }));
      return { ok: !!d.ok, released: d.released ?? 0, late: !!d.late };
    }
  };
}

// Deterministic mirror of the SQL. No wall clock: every time comes from the caller, so a test
// can advance a minute without waiting one.
// opts.yieldAt  — async hook called at named points, so a test can force an interleaving that
//                  would otherwise be impossible in a single-threaded runtime.
// opts.noOpLock — MUTATION CONTROL: drops the op-id lock, reproducing the pre-fix race where
//                  two same-op/different-bucket admissions both saw no row. A control that
//                  cannot reproduce the bug proves nothing about the fix.
function memoryStore(opts = {}) {
  const rows = new Map();   // opId → {bucket, reserved, actual, state, createdMs}
  const locks = new Map();  // key → tail of a promise chain
  const yieldAt = opts.yieldAt || (async () => {});
  // Mirrors pg_advisory_xact_lock: exclusive, serialised, released at the end of the operation.
  // The SAME FIXED ORDER as the SQL — op before bucket — so neither can deadlock the other.
  async function withLock(key, fn) {
    const prev = locks.get(key) || Promise.resolve();
    let release;
    const mine = new Promise(r => { release = r; });
    locks.set(key, prev.then(() => mine));
    await prev;
    try { return await fn(); } finally { release(); }
  }
  return {
    kind: 'memory',
    _rows: rows,
    async admit(a) {
      const { bucket, nowMs, reserve, opId, tpm, windowMs, minIntervalMs, retentionMs, pruneLimit } = a;
      if (opId == null || bucket == null || nowMs == null
          || !(reserve > 0) || !(tpm > 0) || !(windowMs > 0)
          || !(minIntervalMs >= 0) || !(retentionMs > 0) || !(pruneLimit > 0)) {
        return { admitted: false, reason: 'invalid_arguments', usedTokens: null,
                 retryTpmMs: null, retryRpsMs: null, retryAfterMs: null };
      }
      if (retentionMs <= windowMs) throw new Error('retention must exceed the admission window');

      const sumAt = (b, at) => [...rows.values()]
        .filter(r => r.bucket === b && r.state !== 'released' && r.createdMs > at - windowMs)
        .reduce((acc, r) => acc + (r.actual != null ? r.actual : r.reserved), 0);

      const body = async () => {
        // IDEMPOTENCY FIRST, under the OP lock — before pruning and before RPS/TPM.
        const existing = rows.get(opId);
        await yieldAt('after-lookup');
        if (existing) {
          if (existing.bucket !== bucket || existing.reserved !== reserve) {
            return { admitted: false, reason: 'op_id_mismatch', usedTokens: null,
                     existingBucket: existing.bucket, existingReserved: existing.reserved,
                     retryTpmMs: null, retryRpsMs: null, retryAfterMs: null };
          }
          return await withLock('bucket:' + existing.bucket, async () => ({
            admitted: existing.state !== 'released', replay: true,
            reason: existing.state === 'released' ? 'already_released' : null,
            usedTokens: sumAt(bucket, nowMs), state: existing.state,
            retryTpmMs: null, retryRpsMs: null, retryAfterMs: null, pruned: 0 }));
        }
        return await withLock('bucket:' + bucket, async () => {
          // Re-validate under BOTH locks before inserting.
          const again = rows.get(opId);
          if (again) {
            if (again.bucket !== bucket || again.reserved !== reserve) {
              return { admitted: false, reason: 'op_id_mismatch', usedTokens: null,
                       existingBucket: again.bucket, existingReserved: again.reserved,
                       retryTpmMs: null, retryRpsMs: null, retryAfterMs: null };
            }
            return { admitted: again.state !== 'released', replay: true,
                     reason: again.state === 'released' ? 'already_released' : null,
                     usedTokens: sumAt(bucket, nowMs), state: again.state,
                     retryTpmMs: null, retryRpsMs: null, retryAfterMs: null, pruned: 0 };
          }
          let pruned = 0;
          { let budget = pruneLimit;
            for (const [k, r] of [...rows.entries()]) {
              if (budget <= 0) break;
              if (r.bucket === bucket && r.createdMs < nowMs - retentionMs) { rows.delete(k); budget--; pruned++; }
            } }
          const live = [...rows.values()].filter(r =>
            r.bucket === bucket && r.state !== 'released' && r.createdMs > nowMs - windowMs);
          const used = live.reduce((acc, r) => acc + (r.actual != null ? r.actual : r.reserved), 0);
          const lastMs = live.length ? Math.max(...live.map(r => r.createdMs)) : null;
          const oldestMs = live.length ? Math.min(...live.map(r => r.createdMs)) : null;
          if (lastMs !== null && (nowMs - lastMs) < minIntervalMs) {
            const w = minIntervalMs - (nowMs - lastMs);
            return { admitted: false, reason: 'rps', usedTokens: used,
                     retryTpmMs: null, retryRpsMs: w, retryAfterMs: w, pruned };
          }
          if (used + reserve > tpm) {
            const w = Math.max(1, (oldestMs + windowMs) - nowMs);
            return { admitted: false, reason: 'tpm', usedTokens: used,
                     retryTpmMs: w, retryRpsMs: null, retryAfterMs: w, pruned };
          }
          // The PRIMARY KEY is global. Without the op lock two different buckets reach here
          // for one id; this is the collision the SQL used to raise on.
          if (rows.has(opId)) {
            const ex = rows.get(opId);
            return { admitted: false, reason: 'op_id_mismatch', usedTokens: null,
                     existingBucket: ex.bucket, existingReserved: ex.reserved,
                     retryTpmMs: null, retryRpsMs: null, retryAfterMs: null };
          }
          rows.set(opId, { bucket, reserved: reserve, actual: null, state: 'reserved', createdMs: nowMs });
          return { admitted: true, replay: false, reason: null, usedTokens: used + reserve,
                   retryTpmMs: null, retryRpsMs: null, retryAfterMs: null, pruned };
        });
      };
      return opts.noOpLock ? await body() : await withLock('op:' + opId, body);
    },
    async reconcile({ opId, actual, nowMs, windowMs, retentionMs, pruneLimit }) {
      if (opId == null) return { ok: false, reason: 'invalid_arguments', released: 0 };
      // ALL-OR-NOTHING PRUNE ARGUMENTS, mirroring the SQL. Supplying none means "reconcile
      // only". Supplying some means a caller meant to prune and got it wrong — refused, never
      // silently downgraded, and nothing is touched.
      const pruneRequested = [nowMs, windowMs, retentionMs, pruneLimit].some(v => v != null);
      if (pruneRequested) {
        const bad = nowMs == null || windowMs == null || retentionMs == null || pruneLimit == null
          || !(windowMs > 0) || !(retentionMs > 0) || !(pruneLimit > 0) || !(retentionMs > windowMs);
        if (bad) {
          return { ok: false, reason: 'invalid_arguments', released: 0,
                   detail: 'prune arguments must all be present and positive, with retention > window' };
        }
      }
      const r = rows.get(opId);
      // Late response: the reservation was pruned. No capacity to return, no throw, no re-insert.
      if (!r) return { ok: false, released: 0, held: 0, exact: false, late: true, reason: 'unknown_op' };
      // An invalid actual is not evidence that less was spent: the conservative reservation
      // stands. Mirrors the SQL, which refuses to reduce a charge on a malformed number.
      if (actual == null || !(actual >= 0)) {
        return { ok: true, released: 0, held: r.reserved, exact: false,
                 invalidActual: actual != null && !(actual >= 0) };
      }
      const released = r.reserved - actual;
      r.actual = actual; r.state = 'reconciled';
      let pruned = 0;
      if (pruneRequested) {
        let budget = pruneLimit;
        for (const [k, row] of [...rows.entries()]) {
          if (budget <= 0) break;
          if (row.bucket === r.bucket && row.createdMs < nowMs - retentionMs) { rows.delete(k); budget--; pruned++; }
        }
      }
      return { ok: true, released, held: actual, exact: true, pruned };
    },
    async release({ opId, reason }) {
      const r = rows.get(opId);
      // Unknown covers BOTH already-released and pruned-away. Either way: no credit, no throw.
      if (!r || r.state === 'released') return { ok: false, released: 0, late: !r };
      r.state = 'released';
      return { ok: true, released: r.reserved, reason };
    }
  };
}

// Fails every call — for the fail-closed test.
function brokenStore(msg) {
  const boom = async () => { throw new Error(msg || 'store unavailable'); };
  return { kind: 'broken', admit: boom, reconcile: boom, release: boom };
}

module.exports = { supabaseStore, memoryStore, brokenStore };
