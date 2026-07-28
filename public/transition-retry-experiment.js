/* ─────────────────────────────────────────────────────────────────────────────
 * transition-retry-experiment.js — a FALSIFICATION experiment, not "Storybound v2".
 *
 * QUESTION IT TESTS: "Is semantic correction AFTER generation sufficient to solve the
 * momentum problem?"  Mechanism = verify the authored scene against its required
 * transition; if MISSED/PARTIAL, regenerate ONCE with an explicit (deliberately simple)
 * failure note. Named after the MECHANISM (retry/repair), not the hoped outcome.
 *
 * MINDSET: trying to DISPROVE retry. A clean "no" is a SUCCESSFUL experiment — it
 * eliminates a class of architectures and earns the two-pass build.
 *
 * STOPPING RULE (decide BEFORE reading results): retry improves delivery BUT readers
 * don't prefer the scenes → DISCARD. Retry doesn't materially improve delivery → DISCARD.
 * Continue ONLY if BOTH improve. Reader preference is the deciding metric — not delivery %.
 *
 * SCOPE: the ONLY behavioral change is author → verify → (if missed) regenerate-with-
 * failure-note → else continue. Touches NOTHING else (planner/spine/scaffold/prompts/
 * cache/continuity/pacing). Gated behind window.__transitionRetryExperiment (default OFF).
 * Reuses the existing _commitScene verifier prompt verbatim (narrow SEMANTIC delivery only).
 * ───────────────────────────────────────────────────────────────────────────── */
(function () {
  if (typeof window === 'undefined') return;

  // Do NOT optimize this — deliberately simple; if it fails, that is a finding.
  // Roman refinement: the wire injects this as a SEPARATE SYSTEM correction on the ORIGINAL
  // inputs — NOT appended to the prior user message (appending anchors the model to preserving
  // the first draft's TEXT, which can block the structural change). Preserve INTENT, not text.
  var CORRECTION =
    'The scene you just wrote did NOT deliver the required transition: the required irreversible ' +
    'on-page event did not concretely happen. Rewrite the scene so that it DOES happen. Ignore the ' +
    'exact wording of your previous draft — preserve the INTENT, tone, and characterization, NOT ' +
    'the text. You may restructure freely.';

  // ---- narrow SEMANTIC verifier: copied verbatim from _commitScene (app.js:92291) ----
  // Judges ONLY delivery (DELIVERED / PARTIAL / MISSED) + reports what displaced it and
  // where it lands. It is NOT allowed to judge pacing / inevitability / prose quality.
  var VERIFY_SYS =
    'You are the RUNTIME COMMIT verifier for an interactive story engine. Given a PROPOSED TRANSITION (an intended irreversible on-page event) and the SCENE PROSE that was rendered, decide ONE thing: did the prose DELIVER that transition as a concrete, externally-observable ON-PAGE event? Then report the scene end-state tableau. This is a runtime gate, not a critique — judge ONLY delivery. Output STRICT JSON only.\n' +
    'delivery: "DELIVERED" (the event concretely happened on the page), "PARTIAL" (begun / only gestured / not completed), or "MISSED" (did not happen).\n' +
    'dominant_replacement (AUTHOR PRIORITY INDEX — when delivery is PARTIAL or MISSED, what did the scene spend MOST of its words on INSTEAD of staging the transition?): "atmosphere", "relationship_dialogue", "internal_monologue", "world_exposition", "different_event", or "none" (when DELIVERED).\n' +
    'transition_position (INTEGER PERCENTAGE 0-100 marking how far through the prose the transition FIRST concretely occurs; -1 if it NEVER occurs).\n' +
    'first_irreversible_position (INTEGER PERCENTAGE 0-100 of the FIRST point where SOMETHING irreversible happens, regardless of whether it is the proposed transition; -1 if nothing irreversible happens).\n' +
    'JSON: {"delivery":"MISSED","dominant_replacement":"atmosphere","transition_position":-1,"first_irreversible_position":-1}';

  window._verifyDelivery = async function (proseText, proposedEvent) {
    var out = { delivery: 'MISSED', transition_position: -1, first_irreversible_position: -1, dominant_replacement: 'none', ok: false };
    try {
      var pt = String(proseText || '').replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').trim();
      if (pt.length < 40 || !proposedEvent) return out;
      var usr = 'PROPOSED TRANSITION: ' + String(proposedEvent).slice(0, 240) + '\n\nSCENE PROSE:\n' + pt.slice(0, 6000) + '\n\nReturn the JSON now.';
      var res = await fetch('/api/chatgpt-proxy', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: VERIFY_SYS }, { role: 'user', content: usr }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 280, jsonMode: true })
      });
      if (res.ok) {
        var d = await res.json();
        var c = (d && d.content) || (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content);
        var p; try { p = JSON.parse(c); } catch (e) { var m = String(c || '').match(/\{[\s\S]*\}/); if (m) { try { p = JSON.parse(m[0]); } catch (_) {} } }
        if (p) {
          out.delivery = String(p.delivery || 'MISSED').toUpperCase();
          out.transition_position = (typeof p.transition_position === 'number') ? p.transition_position : -1;
          out.first_irreversible_position = (typeof p.first_irreversible_position === 'number') ? p.first_irreversible_position : -1;
          out.dominant_replacement = String(p.dominant_replacement || 'none');
          out.ok = true;
        }
      }
    } catch (_) { /* verifier unreachable → treat as MISSED */ }
    return out;
  };

  // ---- the experiment: verify → (retry once if missed) → log EVERYTHING → return best prose.
  // `reauthor(failureNote)` re-invokes the author (supplied by the app.js seam). `usage(prose)`
  // optionally returns a cost estimate. Pure w.r.t. those injected deps → headless-testable.
  var rank = function (d) { return d === 'DELIVERED' ? 2 : d === 'PARTIAL' ? 1 : 0; };
  window._runTransitionRetry = async function (opts) {
    opts = opts || {};
    var raw = opts.raw, proposedEvent = opts.proposedEvent, sceneNum = opts.sceneNum;
    var reauthor = opts.reauthor, retryBudget = opts.retryBudget == null ? 1 : opts.retryBudget;
    var now = (typeof performance !== 'undefined' && performance.now) ? function () { return performance.now(); } : function () { return 0; };
    var t0 = now();
    var log = {
      // ── SHARED TELEMETRY SCHEMA — BOTH momentum arms emit these (A: SCENE-SPINE / upstream,
      //    B: retry / downstream), so the eventual comparison is apples-to-apples. Instrumentation
      //    is shared; BEHAVIOR is not. Arm A should log the same fields with architecture:'scene_spine'.
      scene_id: sceneNum, architecture: 'retry', first_verdict: null, final_verdict: null, retry_count: 0,
      transition_position: null, latency_ms: 0, reader_score: null, // reader_score filled later by the blind read
      // dominant_replacement = the FAILURE-CLUSTER key (Roman's success-bias guard): what displaced
      // the transition on a miss — atmosphere/relationship_dialogue/internal_monologue/world_exposition/
      // different_event, or 'none' when delivered. Cluster residual misses by THIS, don't optimize the average.
      dominant_replacement: null,
      // "was the reader gain worth the tokens?" — join to app.js _sceneCostsThisStory spend:
      // first_pass_cost ≈ spend.initial · final_cost ≈ spend.total (the retry regen lands in spend.regens).
      first_pass_cost: null, final_cost: null,
      // ── retry-arm extras (beyond the shared schema) ──
      retried: false, second_verdict: null, transition_position_1: null, transition_position_delta: null, dominant_replacement_1: null
    };
    var v1 = await window._verifyDelivery(raw, proposedEvent);
    log.first_verdict = v1.delivery; log.transition_position_1 = v1.transition_position; log.dominant_replacement_1 = v1.dominant_replacement;
    var best = raw, finalV = v1, secondDraft = null, secondPos = null;
    if ((v1.delivery === 'MISSED' || v1.delivery === 'PARTIAL') && typeof reauthor === 'function') {
      for (var i = 0; i < retryBudget; i++) {
        log.retried = true; log.retry_count++;
        var raw2;
        try { raw2 = await reauthor(CORRECTION); } catch (e) { break; }
        if (!raw2) break;
        secondDraft = raw2;
        var v2 = await window._verifyDelivery(raw2, proposedEvent);
        log.second_verdict = v2.delivery; secondPos = v2.transition_position;
        if (rank(v2.delivery) > rank(finalV.delivery)) { best = raw2; finalV = v2; } // monotonic: only accept if better
        if (v2.delivery === 'DELIVERED') break;
      }
    }
    log.transition_position = finalV.transition_position; // the delivered position (shared schema)
    log.dominant_replacement = finalV.dominant_replacement; // failure-cluster key ('none' when delivered)
    log.final_verdict = finalV.delivery; // what the reader saw (post-retry)
    // does semantic repair MOVE the turning point (e.g. 90% → 55%)? null when no valid retry.
    log.transition_position_delta = (secondPos != null && secondPos >= 0 && v1.transition_position >= 0) ? (secondPos - v1.transition_position) : null;
    log.latency_ms = Math.round(now() - t0);
    try { console.log('[TXN-RETRY-EXP] ' + JSON.stringify(log)); } catch (_) {}
    // rich record keeps BOTH drafts for side-by-side analysis — storage is cheap, learning isn't.
    (window.__txnRetryLog = window.__txnRetryLog || []).push(Object.assign({}, log, { first_draft: raw, second_draft: secondDraft }));
    return { prose: best, verdict: finalV.delivery, replaced: (best !== raw), log: log };
  };

  window.__transitionRetryDump = function () { return window.__txnRetryLog || []; };
})();
