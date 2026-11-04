// ── AUTHOR CACHE ROUTER ───────────────────────────────────────────────────────────────────
// Chooses the prose author for ORDINARY GENERAL-PROSE scenes, and nothing else. It does not
// touch the explicit-content workflow: Grok's explicit-content routing requirement is decided
// upstream of this module by `_sniffAndRouteExplicit`, and this router is only consulted for
// scenes that did NOT route there.
//
// THE POLICY THIS IMPLEMENTS (2026-10-30, as agreed):
//   1. Sol ALWAYS authors the opening. That is an explicit exception, evaluated before any
//      cache reasoning runs — never the output of a cache prediction.
//   2. For continuations, Sol remains primary while MEANINGFUL PREFIX REUSE IS REASONABLY
//      EXPECTED. Haiku takes over on insufficient reuse or UNKNOWN.
//   3. CACHE EVIDENCE AND THE SPENDING DECISION ARE SEPARATE, AND NAMED SEPARATELY.
//      Cache evidence answers "is a prefix likely to still be reusable?" — likely_reusable /
//      ineligible / unknown. The spending decision answers "is the reuse we expect worth
//      keeping the expensive author?" — material / immaterial against OUR CHOSEN thresholds.
//      A prefix that is likely still reusable but falls under our economics threshold is
//      reported as exactly that. IT IS NOT CALLED COLD. Time beyond the documented MINIMUM
//      retention means UNKNOWN: the provider may retain an entry longer and exposes no expiry.
//      UNKNOWN selects Haiku as a DECLARED CONSERVATIVE SPENDING POLICY, not because cold
//      was observed.
//   4. A PREDICTION IS NEVER LABELLED A MEASURED CACHE STATE. Every decision carries
//      `prediction` (ours) and `measurement` (the provider's, or null). They are separate
//      fields and the measurement field is only ever filled from a usage receipt.
//   5. The retention clock is renewed only by a completed Sol request whose receipt reports
//      a cache READ or WRITE. Failed attempts and missing usage cannot restart it.
//   6. After Haiku takes over, the handoff is STICKY. No automatic paid cache probe, no
//      prewarming, no speculative return to Sol. Only an explicit caller instruction
//      (`releaseHandoff`) can hand authorship back.
//   7. Routing evidence persists with the story, so a save/resume is NOT automatically cold:
//      the record is restored and the decision recomputed from elapsed time.
//
// WHAT THE 1,024-TOKEN FLOOR IS AND IS NOT: OpenAI's minimum cacheable prefix is 1,024 visible
// input tokens. That is ELIGIBILITY. It is not evidence that reuse is economically meaningful
// for a prompt of ours, which measures roughly 21k prompt tokens on this packet family. A
// mostly-changed request is therefore NOT classified as usefully warm merely because a small
// prefix survives: materiality is judged against the NEW REQUEST'S OWN SIZE as well as against
// an absolute floor well above eligibility.
//
// RETENTION SOURCE (checked 2026-11-02):
// https://developers.openai.com/api/docs/guides/prompt-caching#cache-lifetime
// https://developers.openai.com/api/reference/resources/chat/subresources/completions/methods/create
// Sol Chat Completions defaults to a 30-minute MINIMUM, also its only documented request TTL.
// A cache read refreshes that minimum. This is pricing coverage, not an actual eviction timer
// or a latency guarantee. There is NO arbitrary safety subtraction and NO one-hour assumption.
// The dispatch timestamp is a lower bound on when the provider read/wrote the cache; response
// completion would incorrectly add generation time to the coverage window. Matching a prefix
// at an eligible provider boundary is a separate requirement; text overlap alone is not proof.
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (root) root.SBAuthorCacheRouter = api;
}(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null),
function () {
  'use strict';

  // TTL_MINIMUM_MS is DOCUMENTED BEHAVIOUR, not an observed expiry. ELIGIBILITY_FLOOR_TOKENS is DOCUMENTED
  // BEHAVIOUR: 1,024 visible input tokens is the minimum cacheable prefix.
  //
  // EVERYTHING ELSE IS OURS, CHOSEN, AND NOT MEASURED:
  //   · MIN_REUSE_TOKENS (8,192) and MIN_REUSE_FRACTION (0.10) — chosen ECONOMICS thresholds,
  //     not measured cost breakpoints. No break-even point has been computed for this packet
  //     family, and none can be without real receipts on both authors for comparable prompts.
  //     They say "below this we would rather not pay for the expensive author", and nothing
  //     about whether the provider would in fact serve a cached prefix.
  //
  //     THEY WERE 4,096 AND 0.50 AND THAT WAS MEASURABLY WRONG. _nf_author_prefix_measure.mjs
  //     ran the real production-built author prompts from the paid run through this router:
  //     consecutive continuations share 169,984-192,512 leading chars, i.e. ~38,000-43,000
  //     tokens, which is 38-43% of a ~100,000-token prompt. The old 50% FRACTION rejected every
  //     one of them as "immaterial" while the absolute test passed by a factor of ten. Rejecting
  //     38,000 tokens of reuse is not conservatism, it is the unconditional Sol->Haiku switch
  //     wearing a cache-aware label. The fraction was the wrong instrument: savings scale with
  //     the ABSOLUTE reused token count, and the fraction only usefully catches the degenerate
  //     case of a trivial surviving prefix. So the absolute floor leads (raised to 8x the
  //     documented eligibility minimum) and the fraction is demoted to a weak sanity floor.
  //     Both numbers remain CHOICES — now choices informed by measured geometry rather than by
  //     nothing. What would make them measured: receipts for comparable prompts on both authors.
  //   · CHARS_PER_TOKEN (4.45) — measured for this provider family on this packet family.
  //   · CHUNK_CHARS (2,048) — comparison granularity, chosen.
  // A threshold that is too conservative recreates exactly the unconditional Sol→Haiku switch
  // this router exists to remove, and with a sticky handoff it does so permanently for the
  // story. That is why these are named as choices and measured separately in
  // _nf_author_prefix_measure.mjs against real production-built requests.
  var POLICY = {
    TTL_MINIMUM_MS: 30 * 60 * 1000,        // DOCUMENTED minimum, not actual eviction
    MIN_REUSE_TOKENS: 8192,                // CHOSEN — informed by measured geometry, not a break-even
    MIN_REUSE_FRACTION: 0.10,              // CHOSEN — a weak sanity floor, not a break-even
    // Eligibility, recorded so the distinction stays visible in the trace. Never used as a
    // sufficient condition.
    ELIGIBILITY_FLOOR_TOKENS: 1024,
    // Measured for the OpenAI/xAI family on this packet family. Anthropic's ratio is 2.65 and is
    // deliberately not used here: this router only ever sizes SOL prompts.
    CHARS_PER_TOKEN: 4.45,
    // Prefix comparison granularity. Chunked so the comparison yields a LENGTH of shared prefix
    // rather than a whole-prompt equal/not-equal verdict, which would wrongly treat any edit as
    // total loss of reuse.
    CHUNK_CHARS: 2048,
    SCHEMA: 3,
  };

  var AUTHORS = {
    SOL:   { key: 'sol',   label: 'Sol',   model: 'gpt-6.1-sol' },
    HAIKU: { key: 'haiku', label: 'Haiku', model: 'claude-haiku-5-5' },
  };

  // FNV-1a. Chosen for determinism and zero dependencies in both browser and node; this is a
  // change detector, not a security primitive, and is never used as one.
  function hashChunk(s) {
    var h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    }
    return h.toString(16);
  }

  // The prefix is stored as a chain of chunk hashes, never as text: a story's routing record
  // must not carry a copy of the prompt into localStorage.
  function chunkHashes(text) {
    var out = [];
    var s = String(text == null ? '' : text);
    for (var i = 0; i + POLICY.CHUNK_CHARS <= s.length; i += POLICY.CHUNK_CHARS) {
      out.push(hashChunk(s.substr(i, POLICY.CHUNK_CHARS)));
    }
    return out;   // a trailing partial chunk is DROPPED — counting it could only overstate reuse
  }

  function sharedLeadingChars(prevChunks, nextChunks) {
    if (!Array.isArray(prevChunks) || !Array.isArray(nextChunks)) return 0;
    var n = Math.min(prevChunks.length, nextChunks.length);
    var i = 0;
    while (i < n && prevChunks[i] === nextChunks[i]) i++;
    return i * POLICY.CHUNK_CHARS;
  }

  function toTokens(chars) { return Math.floor(Number(chars || 0) / POLICY.CHARS_PER_TOKEN); }

  function emptyEvidence() {
    return {
      schema: POLICY.SCHEMA,
      // Set ONLY by recordCompletion, i.e. only by a request that completed with a receipt.
      lastCompletedSolAt: null,
      lastCompletedSolPrefixChunks: null,
      lastCompletedSolPrefixChars: null,
      lastCompletedSolPromptChars: null,
      lastCacheTouchStartedAt: null, // dispatch lower bound; set only after a read/write receipt
      cacheMinimumRetentionMs: null,
      cacheTtlSource: null,
      // Latest successful response's provider counts, not necessarily the request establishing
      // coverage above (a later response can have missing usage). These are observations, not
      // predictions of the NEXT request's cache-hit count.
      lastMeasuredCachedTokens: null,
      lastMeasuredCacheWriteTokens: null,
      lastMeasuredAt: null,
      // Attempts that did not complete. Kept so "we tried" is never mistaken for "we have a
      // warm prefix", and so a run of failures is visible in the trace.
      attemptsSinceLastCompletion: 0,
      lastFailure: null,
      // Sticky handoff.
      handoffDone: false,
      handoffAt: null,
      handoffReason: null,
      decisions: [],
    };
  }

  function restore(raw) {
    var e = emptyEvidence();
    if (!raw || typeof raw !== 'object') return e;
    var keys = Object.keys(e);
    for (var i = 0; i < keys.length; i++) {
      if (raw[keys[i]] !== undefined) e[keys[i]] = raw[keys[i]];
    }
    e.schema = POLICY.SCHEMA;
    if (!Array.isArray(e.decisions)) e.decisions = [];
    if (Number(raw.schema) !== POLICY.SCHEMA) {
      // Preserve old measurements, decisions and sticky handoffs as history. A legacy
      // completion timestamp is NOT a cache-touch timestamp, so only coverage is invalidated.
      e.lastCacheTouchStartedAt = null;
      e.cacheMinimumRetentionMs = null;
      e.cacheTtlSource = null;
    }
    return e;
  }

  // ── STEP 1: CACHE EVIDENCE. What we believe about the PREFIX, and nothing about money. ────
  // Returns 'likely_reusable' | 'ineligible' | 'unknown'. Timing cannot establish eviction.
  function assessCacheEvidence(evidence, promptPrefix, promptChars, now) {
    var e = evidence || emptyEvidence();
    var at = Number(e.lastCacheTouchStartedAt);
    if (!at || !Array.isArray(e.lastCompletedSolPrefixChunks) || !e.lastCompletedSolPrefixChunks.length) {
      return { state: 'unknown', reason: 'UNKNOWN_NO_RECEIPT_BOUND_CACHE_TOUCH',
        detail: 'no completed Sol request has a cache read/write receipt, known retention and '
          + 'dispatch timestamp for this prefix; attempts alone establish no coverage',
        attemptsSinceLastCompletion: Number(e.attemptsSinceLastCompletion || 0) };
    }
    var total = Number(promptChars || 0);
    if (!total || typeof promptPrefix !== 'string' || !promptPrefix.length) {
      return { state: 'unknown', reason: 'UNKNOWN_EVIDENCE_INCOMPLETE',
        detail: 'the caller supplied no candidate prefix or no prompt size, so reuse cannot be '
          + 'sized; this is unknown — neither reusable nor expired' };
    }
    var elapsedMs = Number(now) - at;
    var minimumRetentionMs = Number(e.cacheMinimumRetentionMs);
    var nextChunks = chunkHashes(promptPrefix);
    var sharedChars = sharedLeadingChars(e.lastCompletedSolPrefixChunks, nextChunks);
    var sharedTokens = toTokens(sharedChars);
    var fraction = total > 0 ? sharedChars / total : 0;
    var numbers = {
      elapsedMs: elapsedMs,
      minimumRetentionMs: minimumRetentionMs,
      coverageLowerBoundUntil: at + minimumRetentionMs,
      clockBasis: 'dispatch_lower_bound_confirmed_by_receipt',
      ttlSource: e.cacheTtlSource,
      actualExpiryKnown: false,
      prefixBoundaryMatchVerified: false, // this module still compares text geometry, not provider lookups
      sharedPrefixChars: sharedChars,
      sharedPrefixTokensApprox: sharedTokens,
      newPromptChars: total,
      newPromptTokensApprox: toTokens(total),
      sharedFractionOfNewPrompt: Math.round(fraction * 1000) / 1000,
      eligibilityFloorTokens: POLICY.ELIGIBILITY_FLOOR_TOKENS,
      clearsDocumentedEligibilityFloor: sharedTokens >= POLICY.ELIGIBILITY_FLOOR_TOKENS,
    };
    if (elapsedMs < 0 || !(minimumRetentionMs > 0)) {
      return { state: 'unknown', reason: 'UNKNOWN_EVIDENCE_INCOMPLETE', numbers: numbers,
        detail: 'the cache-touch clock or supported retention is invalid; no timing conclusion' };
    }
    if (elapsedMs >= minimumRetentionMs) {
      return { state: 'unknown', reason: 'UNKNOWN_BEYOND_MINIMUM_RETENTION',
        numbers: numbers,
        detail: Math.round(elapsedMs / 60000) + ' min since dispatch of a receipt-confirmed '
          + 'cache read/write, beyond the documented ' + minimumRetentionMs / 60000
          + '-minute minimum. The provider may retain it longer; actual expiry is unknown. '
          + 'No margin was subtracted and no cache probe was bought.' };
    }
    if (!numbers.clearsDocumentedEligibilityFloor) {
      // THIS one is documented: under 1,024 tokens there is nothing for the provider to cache.
      return { state: 'ineligible', reason: 'PREFIX_BELOW_DOCUMENTED_ELIGIBILITY_FLOOR',
        numbers: numbers,
        detail: 'the shared leading prefix is ~' + sharedTokens + ' tok, under the DOCUMENTED '
          + POLICY.ELIGIBILITY_FLOOR_TOKENS + '-token minimum cacheable prefix, so there is no '
          + 'eligible prefix to reuse. This is the one size test that is documented behaviour '
          + 'rather than our choice.' };
    }
    return { state: 'likely_reusable', reason: 'PREFIX_WITHIN_MINIMUM_RETENTION_AND_ELIGIBLE',
      numbers: numbers,
      detail: 'a ~' + sharedTokens + ' tok shared leading prefix (' + Math.round(fraction * 100)
        + '% of the new prompt), ' + Math.round(elapsedMs / 60000) + ' min after dispatch of a '
        + 'receipt-confirmed cache touch, within the documented minimum. This is a reuse '
        + 'prediction, not a verified eligible-boundary match or a measured hit.' };
  }

  // ── STEP 2: THE SPENDING DECISION. Our economics, applied to a reusable prefix. ───────────
  // Only consulted when the cache evidence says likely_reusable. Saying "immaterial" says
  // nothing about whether the provider would serve the prefix — it says we chose not to pay
  // the expensive author for reuse this small.
  function assessSpending(cacheEvidence) {
    var n = (cacheEvidence && cacheEvidence.numbers) || {};
    var tok = Number(n.sharedPrefixTokensApprox || 0);
    var frac = Number(n.sharedFractionOfNewPrompt || 0);
    var material = tok >= POLICY.MIN_REUSE_TOKENS && frac >= POLICY.MIN_REUSE_FRACTION;
    return {
      material: material,
      thresholds: { minReuseTokens: POLICY.MIN_REUSE_TOKENS,
        minReuseFraction: POLICY.MIN_REUSE_FRACTION,
        provenance: 'CHOSEN IMPLEMENTATION THRESHOLDS — not measured cost break-evens' },
      detail: material
        ? 'reuse of ~' + tok + ' tok (' + Math.round(frac * 100) + '% of the prompt) is at or '
          + 'above our chosen thresholds, so Sol stays primary.'
        : 'the prefix is eligible and plausibly still held, but reuse of ~' + tok + ' tok ('
          + Math.round(frac * 100) + '% of the prompt) is below OUR CHOSEN thresholds of >='
          + POLICY.MIN_REUSE_TOKENS + ' tok AND >=' + Math.round(POLICY.MIN_REUSE_FRACTION * 100)
          + '%. THIS IS NOT A CLAIM THAT THE CACHE IS COLD. It is a spending choice, and if it '
          + 'fires on ordinary rapid continuations the thresholds are wrong, not the cache.',
    };
  }

  // Kept as a named export because callers and tests read one combined view. It reports both
  // steps and never collapses them into a single warm/cold word.
  function predictCacheState(evidence, promptPrefix, promptChars, now) {
    var cache = assessCacheEvidence(evidence, promptPrefix, promptChars, now);
    var spending = cache.state === 'likely_reusable' ? assessSpending(cache) : null;
    return { cache: cache, spending: spending,
      state: cache.state, numbers: cache.numbers, reason: cache.reason, detail: cache.detail };
  }

  // ── THE DECISION ──────────────────────────────────────────────────────────────────────────
  // opts: { isOpening, sceneNumber, promptPrefix, promptChars, now, evidence }
  function decide(opts) {
    var o = opts || {};
    var evidence = restore(o.evidence);
    var now = Number(o.now || Date.now());
    var isOpening = !!o.isOpening || Number(o.sceneNumber) === 1;
    var d;

    if (isOpening) {
      // THE EXPLICIT EXCEPTION, AND IT COMES FIRST. No cache state is consulted, so no cache
      // prediction can ever divert the opening away from Sol.
      d = { author: AUTHORS.SOL, reason: 'OPENING_EXCEPTION_SOL_ALWAYS_AUTHORS',
        prediction: { state: 'not_consulted',
          detail: 'Sol authors the opening unconditionally; cache state is irrelevant to this '
            + 'decision and was not evaluated' },
        measurement: null };
    } else if (evidence.handoffDone) {
      // STICKY. Nothing here buys a probe or a prewarm to find out whether Sol went warm again.
      d = { author: AUTHORS.HAIKU, reason: 'HANDOFF_STICKY_NO_SPECULATIVE_RETURN',
        prediction: { state: 'not_consulted',
          detail: 'Haiku already took over at ' + new Date(Number(evidence.handoffAt || 0)).toISOString()
            + ' (' + evidence.handoffReason + '). The handoff is sticky by policy: no automatic '
            + 'paid cache probe, no prewarming and no speculative return to Sol. Only an '
            + 'explicit releaseHandoff() hands authorship back.' },
        measurement: null };
    } else {
      var cache = assessCacheEvidence(evidence, o.promptPrefix, o.promptChars, now);
      var spending = cache.state === 'likely_reusable' ? assessSpending(cache) : null;
      var p = { cache: cache, spending: spending, state: cache.state,
        numbers: cache.numbers, reason: cache.reason, detail: cache.detail };
      if (cache.state === 'likely_reusable' && spending.material) {
        d = { author: AUTHORS.SOL, reason: 'SOL_PRIMARY_REUSE_EXPECTED', prediction: p,
          measurement: null };
      } else if (cache.state === 'likely_reusable') {
        // THE PREFIX IS NOT CALLED COLD HERE. It is reusable; we chose not to pay for it.
        d = { author: AUTHORS.HAIKU, reason: 'HAIKU_REUSE_BELOW_CHOSEN_ECONOMICS_THRESHOLD',
          prediction: p, measurement: null,
          spendingPolicy: 'The prefix is eligible and within the documented lifetime — NOT cold. '
            + 'Haiku is selected purely by our chosen economics threshold. ' + spending.detail };
      } else if (cache.state === 'unknown') {
        d = { author: AUTHORS.HAIKU, reason: 'HAIKU_UNKNOWN_CONSERVATIVE_SPENDING_POLICY',
          prediction: p, measurement: null,
          spendingPolicy: 'UNKNOWN selects Haiku as a DECLARED CONSERVATIVE SPENDING POLICY. '
            + 'A policy choice under uncertainty, NOT an observation about Sol\'s cache.' };
      } else {
        d = { author: AUTHORS.HAIKU, reason: 'HAIKU_PREFIX_INELIGIBLE',
          prediction: p, measurement: null,
          spendingPolicy: 'No eligible shared prefix was identified (' + cache.reason
            + '). This says nothing about when a provider cache entry expires.' };
      }
      if (d.author.key === AUTHORS.HAIKU.key) {
        evidence.handoffDone = true;
        evidence.handoffAt = now;
        evidence.handoffReason = d.reason;
      }
    }

    // The measurement field exists on every decision and is null on every decision, because a
    // decision is made BEFORE the request it decides. It can only ever be filled afterwards, by
    // recordCompletion, from a provider receipt.
    d.at = now;
    d.sceneNumber = o.sceneNumber == null ? null : Number(o.sceneNumber);
    d.cacheStateIsPrediction = true;
    evidence.decisions.push({ at: now, sceneNumber: d.sceneNumber, author: d.author.key,
      reason: d.reason, predictedState: d.prediction.state,
      numbers: d.prediction.numbers || null });
    return { decision: d, evidence: evidence };
  }

  // Only this model/endpoint's documented retention is supported; another model or an unknown
  // TTL must not inherit Sol's clock. Omission means the documented Chat Completions default.
  function retentionForRequest(info) {
    var i = info || {};
    if (i.model !== AUTHORS.SOL.model) return null;
    var options = i.promptCacheOptions;
    if (options != null && (typeof options !== 'object' || Array.isArray(options))) return null;
    var ttl = options && options.ttl;
    if (ttl != null && ttl !== '30m') return null;
    return { ms: POLICY.TTL_MINIMUM_MS,
      source: ttl === '30m' ? 'request_prompt_cache_options.ttl=30m' : 'documented_sol_chat_default_30m' };
  }

  function cacheUsage(usage) {
    var u = usage || {};
    var p = u.prompt_tokens_details || {};
    var r = u.input_tokens_details || {};
    function count(values) {
      for (var j = 0; j < values.length; j++) {
        if (typeof values[j] === 'number' && isFinite(values[j]) && values[j] >= 0) return values[j];
      }
      return null;
    }
    return { read: count([p.cached_tokens, r.cached_tokens, u.cached_tokens]),
      write: count([p.cache_write_tokens, r.cache_write_tokens, u.cache_write_tokens]) };
  }

  // A receipt confirms the cache touch; dispatch supplies its earliest possible timestamp.
  // Missing usage/timing cannot extend coverage. Keep older valid evidence instead: an
  // unanswered request neither proves nor disproves that its previous prefix still exists.
  function recordCompletion(evidence, info) {
    var e = restore(evidence);
    var i = info || {};
    if (String(i.author || '') !== AUTHORS.SOL.key) return e;   // only Sol has a prefix to reuse
    if (Number(i.status) !== 200) return recordFailure(e, i);
    e.attemptsSinceLastCompletion = 0;
    e.lastFailure = null;
    var measured = cacheUsage(i.usage);
    e.lastMeasuredCachedTokens = measured.read;
    e.lastMeasuredCacheWriteTokens = measured.write;
    var completedAt = Number(i.at == null ? Date.now() : i.at);
    e.lastMeasuredAt = measured.read !== null || measured.write !== null ? completedAt : null;
    var retention = retentionForRequest(i);
    var startedAt = Number(i.dispatchedAt);
    var prefix = typeof i.promptPrefix === 'string' ? i.promptPrefix : '';
    var chunks = chunkHashes(prefix);
    if (!retention || !(startedAt > 0) || !isFinite(completedAt) || completedAt < startedAt
        || !(measured.read > 0 || measured.write > 0) || !chunks.length) return e;
    // A late response from an older request must not rewind the latest confirmed cache touch.
    if (startedAt < Number(e.lastCacheTouchStartedAt || 0)) return e;
    e.lastCompletedSolAt = completedAt;
    e.lastCacheTouchStartedAt = startedAt;
    e.cacheMinimumRetentionMs = retention.ms;
    e.cacheTtlSource = retention.source;
    e.lastCompletedSolPrefixChunks = chunks;
    e.lastCompletedSolPrefixChars = chunks.length * POLICY.CHUNK_CHARS;
    e.lastCompletedSolPromptChars = Number(i.promptChars || 0) || null;
    return e;
  }

  function recordFailure(evidence, info) {
    var e = restore(evidence);
    var i = info || {};
    e.attemptsSinceLastCompletion = Number(e.attemptsSinceLastCompletion || 0) + 1;
    e.lastFailure = { at: Number(i.at || Date.now()), status: i.status == null ? null : Number(i.status),
      note: String(i.note || 'dispatch did not complete') };
    // Deliberately NOT touched: lastCompletedSolAt and the recorded prefix. A failed attempt
    // neither creates nor destroys a warm prefix, and must not be read as either.
    return e;
  }

  function releaseHandoff(evidence, reason) {
    var e = restore(evidence);
    e.handoffDone = false;
    e.handoffAt = null;
    e.handoffReason = null;
    e.releasedBy = String(reason || 'explicit caller instruction');
    e.releasedAt = Date.now();
    return e;
  }

  return {
    POLICY: POLICY,
    AUTHORS: AUTHORS,
    emptyEvidence: emptyEvidence,
    restore: restore,
    chunkHashes: chunkHashes,
    sharedLeadingChars: sharedLeadingChars,
    assessCacheEvidence: assessCacheEvidence,
    assessSpending: assessSpending,
    predictCacheState: predictCacheState,
    decide: decide,
    recordCompletion: recordCompletion,
    retentionForRequest: retentionForRequest,
    cacheUsage: cacheUsage,
    recordFailure: recordFailure,
    releaseHandoff: releaseHandoff,
  };
}));
