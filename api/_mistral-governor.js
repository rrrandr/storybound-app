// ════════════════════════════════════════════════════════════════════════════════════════
//  MISTRAL QUOTA GOVERNOR — shared, durable, cross-instance
//
//  WHY THIS EXISTS. Vercel Node functions are stateless and horizontally scaled, so an
//  in-process limiter governs one instance and nothing else: two users on two instances both
//  pass it and collide at the provider. The browser pacing gate that preceded this was worse
//  still — it governed one TAB. Admission has to be decided in a store every instance shares.
//
//  WHAT IT IS NOT. It is not the minute-bucket counter used for concierge IP limiting. A
//  fixed minute bucket permits a full window's worth of traffic in the last millisecond of one
//  bucket and again in the first millisecond of the next — a 2x burst straddling the boundary,
//  which is exactly the shape that trips an RPS ceiling. This uses a ROLLING window.
//
//  THE RESERVATION IS DELIBERATELY TOO LARGE. Before dispatch nobody knows the token count, so
//  admission reserves UTF-8 request bytes + max_tokens. Bytes over-state input tokens by
//  roughly 4x for English text, so the reservation is conservative by construction: the
//  governor will refuse admissions the provider would have accepted, and will never admit one
//  it should have refused. Reconciliation replaces the reservation with the provider's own
//  reported total the moment the response lands, releasing the difference for other callers.
//  A response with NO usage block keeps the conservative charge until it rolls out of the
//  window — unknown is never treated as zero.
// ════════════════════════════════════════════════════════════════════════════════════════
'use strict';

// ── EXPLICIT, MODEL-KEYED LIMITS ──
// Nothing is inferred from a model name. A model absent here, or missing either limit, is
// REFUSED — a governor that guesses a limit is not a governor. tpm/rps come from the account's
// own limits page; rps is null where the account has not been read, and those models are
// refused with a named configuration error rather than admitted on an assumed rate.
// PROVENANCE, NOT JUST NUMBERS. Each entry records WHERE the figure came from and WHEN it was
// read, because a rate limit is an account fact that changes when the tier changes — an
// undated constant silently becomes a stale guess. `readOn` is the date the account's Limits
// page was read; `source` names the page. An entry missing tpm, rps, source or readOn is
// treated as unconfigured and REFUSED, so a half-filled row fails closed instead of admitting
// on a default.
//
// WHY CODE CONSTANTS rather than env vars or a DB table: these must be reviewable in a diff and
// identical across every instance at a given deploy. An env var can differ per environment
// without review; a DB row can be edited without one, and the governor would then be enforcing
// a limit nobody approved. The cost is that a tier change needs a deploy — which is the right
// friction for a number that authorises spend.
const LIMITS_SOURCE = 'https://admin.mistral.ai/plateforme/limits';
const LIMITS_READ_ON = '2026-09-04';
const MODEL_LIMITS = {
  // Mistral Small: 20,000 TPM / 1 RPS, shared across reasoning settings (none and high are the
  // same bucket — reasoning_effort is a mode, not a separate allowance).
  'mistral-small-latest': { tpm: 20000,   rps: 1,     source: LIMITS_SOURCE, readOn: LIMITS_READ_ON },
  'mistral-small-2603':   { tpm: 20000,   rps: 1,     source: LIMITS_SOURCE, readOn: LIMITS_READ_ON },
  // Ministral 3 family — all three read off the account Limits page on the same date.
  // NOTE 14B: 0.5 RPS is the TIGHTEST rate in the table despite the second-largest TPM. It
  // admits one request per 2 s, so it suits large infrequent calls and is a poor fit for
  // anything bursty — a fact that bears directly on the 8B-vs-14B preprocessor choice.
  'ministral-3b-2512':    { tpm: 1300000, rps: 12.5,  source: LIMITS_SOURCE, readOn: LIMITS_READ_ON },
  'ministral-8b-2512':    { tpm: 625000,  rps: 3.13,  source: LIMITS_SOURCE, readOn: LIMITS_READ_ON },
  'ministral-14b-2512':   { tpm: 937500,  rps: 0.5,   source: LIMITS_SOURCE, readOn: LIMITS_READ_ON }
};

// Models that SHARE one provider bucket must share one governor key, or two "separate" keys
// each admit up to the full limit and together admit twice it.
const BUCKET_KEY = {
  'mistral-small-latest': 'mistral-small',
  'mistral-small-2603':   'mistral-small'
};
const bucketOf = (model) => BUCKET_KEY[model] || model;

const WINDOW_MS = 60000;
// RETENTION HORIZON. Rows are deleted only once they are this far past their creation, which is
// four windows — strictly greater than WINDOW_MS, so a pruned row was already outside every live
// sum and its deletion cannot hand capacity back. The margin is generous on purpose: it leaves
// room for a slow provider response to still find its reservation and reconcile against it.
const RETENTION_MS = WINDOW_MS * 4;
// Bounded work per CALL — not bounded storage. A backlog costs the next request a fixed amount
// rather than all of it, but rows are only removed when a later admission or reconcile touches
// that bucket: a bucket that goes quiet keeps its historical rows until traffic returns.
const PRUNE_LIMIT = 500;

// FRACTIONAL RATES ARE NEVER ROUNDED UP. 3.13 rps does not become 4. The admissible spacing is
// ceil(1000/rps) ms — 320 ms for 3.13 rps, i.e. an effective 3.125 rps, slightly UNDER the
// allowance. Rounding the rate up would exceed it; rounding the interval up cannot.
function minIntervalMs(rps) { return Math.ceil(1000 / rps); }

function utf8Len(s) { return Buffer.byteLength(String(s == null ? '' : s), 'utf8'); }

// The conservative pre-dispatch reservation. Stated in one place so tests and the proxy cannot
// disagree about what was reserved.
function reservationFor(messages, maxTokens) {
  let bytes = 0;
  for (const m of (Array.isArray(messages) ? messages : [])) bytes += utf8Len(m && m.content);
  return bytes + (Number(maxTokens) > 0 ? Number(maxTokens) : 0);
}

// Typed outcomes. The proxy maps these to HTTP; nothing else invents a shape.
const OUTCOME = {
  ADMITTED: 'admitted',
  TPM: 'quota_exhausted_tpm',
  RPS: 'quota_exhausted_rps',
  OVERSIZED: 'reservation_exceeds_model_allowance',
  UNCONFIGURED: 'model_limits_not_configured',
  STORE_DOWN: 'quota_store_unavailable'
};

// ── THE GOVERNOR ──
// `store` is the adapter boundary: admit / reconcile / release. The Supabase adapter calls the
// SQL RPCs; the test adapter mirrors their semantics against a fake clock. Both are exercised
// through this same object, so the proxy cannot behave differently under test.
function createGovernor(store, opts) {
  const now = (opts && opts.now) || (() => Date.now());
  return {
    OUTCOME, MODEL_LIMITS, reservationFor, minIntervalMs, bucketOf,

    async admit({ model, messages, maxTokens, opId }) {
      const limits = MODEL_LIMITS[model];
      const missing = !limits ? ['entry']
        : ['tpm', 'rps'].filter(k => !(limits[k] > 0)).concat(['source', 'readOn'].filter(k => !limits[k]));
      if (missing.length) {
        return { outcome: OUTCOME.UNCONFIGURED, model,
                 detail: 'model limits incomplete — missing: ' + missing.join(', '),
                 missing, retryAfterMs: null };
      }
      const reserve = reservationFor(messages, maxTokens);
      // A request that cannot fit its model's ENTIRE minute can never be admitted, so waiting
      // is not a remedy and no Retry-After is offered. It fails here, before dispatch — never
      // sent over-budget, never quietly moved to a bigger model.
      if (reserve > limits.tpm) {
        return { outcome: OUTCOME.OVERSIZED, model, reserve, limitTpm: limits.tpm,
                 detail: 'conservative reservation ' + reserve + ' exceeds the model allowance of '
                       + limits.tpm + ' tokens/min', retryAfterMs: null };
      }
      let r;
      try {
        r = await store.admit({
          bucket: bucketOf(model), nowMs: now(), reserve, opId,
          tpm: limits.tpm, windowMs: WINDOW_MS, minIntervalMs: minIntervalMs(limits.rps),
          retentionMs: RETENTION_MS, pruneLimit: PRUNE_LIMIT
        });
      } catch (e) {
        // FAIL CLOSED. The concierge IP limiter fails open because blocking help traffic is
        // worse than allowing it; a spend governor is the opposite — an unknown budget must
        // not authorise a paid call.
        return { outcome: OUTCOME.STORE_DOWN, model, detail: String((e && e.message) || e),
                 retryAfterMs: 1000 };
      }
      if (r.admitted) return { outcome: OUTCOME.ADMITTED, model, reserve, opId, usedTokens: r.usedTokens };
      // TPM and RPS wait times are computed separately and reported separately: they answer
      // different questions and can differ by orders of magnitude.
      return {
        outcome: r.reason === 'rps' ? OUTCOME.RPS : OUTCOME.TPM,
        model, reserve, usedTokens: r.usedTokens, limitTpm: limits.tpm,
        retryAfterMs: r.retryAfterMs,
        retryTpmMs: r.retryTpmMs == null ? null : r.retryTpmMs,
        retryRpsMs: r.retryRpsMs == null ? null : r.retryRpsMs
      };
    },

    // Replace the conservative reservation with the provider's own number. Returns the tokens
    // handed back to the bucket, so a test can prove the release actually happened.
    async reconcile({ opId, usage }) {
      const total = usage && (usage.total_tokens != null
        ? usage.total_tokens
        : ((usage.prompt_tokens || 0) + (usage.completion_tokens || 0)));
      const common = { opId, nowMs: now(), windowMs: WINDOW_MS,
                       retentionMs: RETENTION_MS, pruneLimit: PRUNE_LIMIT };
      if (!(typeof total === 'number' && isFinite(total) && total > 0)) {
        // ABSENT USAGE IS NOT ZERO USAGE. The reservation stands until the window rolls past it.
        return await store.reconcile({ ...common, actual: null });
      }
      return await store.reconcile({ ...common, actual: total });
    },

    // ── RELEASE IS ONLY FOR OUTCOMES THAT PROVE NO PROVIDER WORK ──
    // An earlier version of this comment said "429, transport error". That is no longer true
    // and was never safe: a transport error proves nothing — a socket that closed after the
    // provider began work looks exactly like one that never opened, and releasing would hand
    // back capacity that was in fact consumed. The proxy calls this ONLY for a provider 429
    // and for face-rejection 4xx (400/401/403/404/422), where generation never starts. A 5xx
    // and a thrown fetch RETAIN their reservation until the window expires.
    async release({ opId, reason }) { return await store.release({ opId, reason }); }
  };
}

module.exports = { createGovernor, MODEL_LIMITS, LIMITS_SOURCE, LIMITS_READ_ON, OUTCOME, reservationFor, minIntervalMs, bucketOf, WINDOW_MS, RETENTION_MS, PRUNE_LIMIT };
