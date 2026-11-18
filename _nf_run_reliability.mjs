// ══════════════════════════════════════════════════════════════════════════════════════════
// RUN RELIABILITY — the three mechanisms the 2026-11-02 attempt was missing, in ONE module so
// the harness and the controls exercise the SAME code rather than a copy of it.
//
//   1. allocateArtifactPath   an artifact name that CANNOT silently overwrite another.
//   2. scaffoldPrerequisite   the test's precondition, evaluated BEFORE paid downstream dispatch.
//   3. evidenceBundle         what must reach disk even when the run dies mid-launch.
//
// NOTHING HERE DISPATCHES, PRICES OR DECIDES A FALLBACK. It is pure functions over data the
// caller already holds, so every branch is reachable from a provider-free control.
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';

// ── 1. ARTIFACT NAMING ────────────────────────────────────────────────────────────────────
// THE DEFECT THIS REPLACES: the old name was `response_<requests.length>_<role>_<status>.json`,
// and `requests.length` was read AFTER awaiting route.fetch(). Concurrent in-flight requests
// therefore resolved against the same array length and produced the same filename, so a later
// response overwrote an earlier one — two complete 200s with their receipts were lost that way
// and the loss was only visible by counting lines in RUN.log.
//
// The id now comes from the CALLER, allocated before dispatch, and this function additionally
// refuses to return a path that already exists. Both halves matter: the id removes the
// collision, and the existence check means a future id bug degrades into a `__dup2` file rather
// than silent destruction. `allocated` reports which happened, so a collision is loud.
export function allocateArtifactPath(dir, kind, reqId, role, status, opts) {
  const o = opts || {};
  const safe = (s) => String(s == null ? 'none' : s).replace(/[^A-Za-z0-9_.-]/g, '-');
  const base = kind + '_r' + safe(reqId) + '_' + safe(role) + '_' + safe(status);
  const exists = o.exists || ((p) => fs.existsSync(p));
  let name = base + '.json';
  let dup = 1;
  while (exists(path.join(dir, name))) {
    dup += 1;
    name = base + '__dup' + dup + '.json';
  }
  return { name, path: path.join(dir, name), collided: dup > 1, duplicateIndex: dup };
}

// ── 2. THE TEST'S PRECONDITION ────────────────────────────────────────────────────────────
// THE DEFECT THIS REPLACES: the post-launch block ASSERTED the scaffold after `_launchStarterStory`
// had already generated and paid for scene 1 — it detected the missing scaffold instead of
// preventing the spend. It also READ `servedBy` and `isSolArchitecture` into its record and never
// asserted either, so a scaffold produced by the ministral/grok/4o-mini fallback chain would have
// satisfied every check and been reported as a clean fresh-plan run.
//
// SCOPE. This is the EXPERIMENT's precondition, not a product rule: the configuration under test
// is "a fresh Sol scaffold supplies the opening assignment", so anything else is a different
// experiment and must not be paid for. Production's own fallback chain is untouched — it still
// does exactly what it did; this gate only decides whether THIS TEST keeps spending.
//
// `snapshot` is read from the page by the caller. Missing fields are treated as unmet, never as
// satisfied: an unreadable precondition is not a met precondition.
// WHICH CHECKS APPLY IN WHICH MODE, DERIVED FROM THE MODE AND NOTHING ELSE ────────────────
// The Sol-identity requirement exists to stop PAID dispatch when a different planner is running.
// In `drive` nothing is paid and nothing can be Sol: the driver's own fixtures declare
// `model: 'synthetic-driver'` on purpose, because a synthetic reply must never claim a real
// model's identity. Asserting Sol there would make every provider-free run halt at the opening
// planner, which is what hid the continuation regression — the only reachable state was failure.
//
// So the requirement is scoped BY MODE, explicitly, and defaults to ON. This is a pure function
// of the mode so the seam itself is testable: a control asserts that 'run' and 'run-resume'
// require Sol and only 'drive' does not, without any run at all.
// ── THE PLANNER UNDER TEST IS THE ONE THE RUN SELECTED (Roman 2026-11-06) ──────────────────
// MEASURED FAILURE: the requirement above was "isSolArchitecture === true", hardcoded. With
// architectureModel: "gpt-6-luna" — a selection that was approved and frozen — it demanded the
// one model the configuration excludes, so it was unsatisfiable by construction. A 20-scene run
// died on it AFTER the three-issue spine and the opening planner had both been paid for and had
// both succeeded. The check was right to exist and wrong about what it compared against.
//
// IT IS STILL STRICT. The scaffold must be served by the SELECTED architecture model, compared
// exactly (case and punctuation normalised, nothing else); any other provider fails, including a
// model that merely resembles it and including the fallback chain. Nothing is relaxed — what
// changes is that the expectation comes from the run's own configuration instead of this file.
export const DEFAULT_EXPECTED_ARCHITECTURE_MODEL = 'gpt-6.1-sol';
// What the provider-blocked driver's own fixtures declare. A synthetic reply must never claim a
// real model's identity, so it declares this instead.
export const PROVIDER_FREE_IDENTITY = 'synthetic-driver';

export function verifyScaffoldProvenance(o) {
  const expected = String((o && o.expectedModel) || '').trim();
  const served = String((o && o.servedBy) || '').trim();
  const allowSynthetic = (o && o.allowProviderFreeIdentity) === true;
  const n = (s) => s.toLowerCase().replace(/[^a-z0-9.]+/g, '');
  if (!expected) {
    return { ok: false, code: 'no_expected_model', served, expected,
      why: 'no architecture model was selected for this run, so the scaffold\'s provenance '
        + 'cannot be verified against anything — which is not the same as it being correct' };
  }
  if (!served) {
    return { ok: false, code: 'provenance_unrecorded', served, expected,
      why: 'the scaffold records no serving model, so its provenance is UNKNOWN — and unknown '
        + 'provenance is not met provenance' };
  }
  if (n(served) === n(expected)) {
    return { ok: true, code: 'match', served, expected,
      why: 'the scaffold was served by the selected architecture model ' + JSON.stringify(served) };
  }
  if (allowSynthetic && n(served) === n(PROVIDER_FREE_IDENTITY)) {
    return { ok: true, code: 'provider_free_identity', served, expected,
      why: 'the scaffold carries the driver\'s declared synthetic identity '
        + JSON.stringify(served) + ' — the check RAN and passed as a provider-free reply; it '
        + 'establishes nothing about any provider, and a real model other than '
        + JSON.stringify(expected) + ' would still have failed here' };
  }
  return { ok: false, code: 'unexpected_provider', served, expected,
    why: 'the scaffold was served by ' + JSON.stringify(served) + ', not the selected '
      + JSON.stringify(expected) + ' — that is a different planner than the one under test' };
}

export function prerequisiteOptionsFor(mode, expectedModel) {
  const m = String(mode || '');
  return {
    mode: m || '(unset)',
    // FAIL-CLOSED on the EXPECTATION, not on a model name written here: an unset selection falls
    // back to the historical expectation rather than to "anything will do".
    expectedModel: String(expectedModel || DEFAULT_EXPECTED_ARCHITECTURE_MODEL),
    // THE ASSERTION IS NEVER SKIPPED. The previous version turned it off entirely in the
    // provider-blocked driver, and that exemption is exactly what hid the defect above: the one
    // mode that could have caught it was the one mode excused from checking. Now the driver
    // checks too — it simply accepts its own declared synthetic identity as a legitimate server,
    // while a real provider that is not the selected one still fails there. That is strictly
    // more than either the old requirement or the old exemption could detect.
    allowProviderFreeIdentity: m === 'drive',
  };
}

// ── THE DISPATCH WAITING BUDGET, AS A PURE FUNCTION (Roman 2026-11-06) ────────────────────
// Extracted so the policy can be exercised without a run, which is the only reason the previous
// two versions of it survived: both were lists of operation NAMES, both were written after
// watching a specific call fail, and neither could be tested except by letting the next unnamed
// call fail too. Measured cost of that: the A-plot and the opening author both died at exactly
// 120,003ms on allowances of 16,000 — the author having carried that allowance, unexercised,
// since the configuration was frozen.
//
// THE DECISION IS ABOUT WHAT GOES OUT: the model that will serve the call and the completion
// allowance it declares. REASONING_OUT is the same expression api/chatgpt-proxy.js uses to pick
// the allowance FIELD, so the harness and the route cannot disagree about what a reasoning call
// is. A reasoning model spends its allowance on thinking before one visible token appears, so
// the budget has to cover the allowance; a non-reasoning model keeps its default.
//
// IT IS A WAITING BUDGET, NOT A COMPLETION TIME. 90 tok/s is below every rate measured here
// (94 and 105 on this model), but a provider may be slower; exceeding the budget is still a
// transit failure. The function can only ever LENGTHEN a deadline relative to the 120s default.
export const REASONING_OUT = /^(gpt-6|gpt-5|o1|o3|o4)/;

// ── THE GROK LEG, WHICH THIS POLICY USED TO EXCLUDE (Roman 2026-11-07) ──────────────────────
// MEASURED at the scene-19 halt. Request #12, NARRATIVE_AUTHOR on grok-4.3, was recorded as
// `operationClass:'other'`, `reasoningCall:false`, `dispatchTimeoutMs:120000` — and abandoned at
// exactly 120000ms with no HTTP response, so it may have billed. Two separate mistakes produced
// that number, and REASONING_OUT is NOT the place to fix either:
//
//   REASONING_OUT deliberately mirrors api/chatgpt-proxy.js:379 (REASONING_MODELS) because that
//   route uses the same expression to choose `max_completion_tokens` over `max_tokens`. Widening
//   it to match grok would change which ALLOWANCE FIELD an OpenAI-route request carries, which is
//   a different contract on a different route. It stays byte-identical.
//
// MISTAKE 1 — grok-4.3 IS a reasoning call. api/proxy.js:215 resolves effort as
//   `(/non-reasoning|4\.20/.test(name)) ? 'none' : 'high'`, so a plain 'grok-4.3' runs at effort
//   HIGH and spends its budget thinking before the first visible token — precisely the condition
//   `deadlineForAllowance` exists for. The classifier simply never looked at the grok family.
//
// MISTAKE 2 — and this one is not about the model at all. api/proxy.js guards each upstream
//   attempt with XAI_CALL_TIMEOUT_MS (90000) and ADVANCES ITS CHAIN on a hang; NARRATIVE_AUTHOR
//   has three entries and SPECIALIST_RENDERER/INTIMACY_SPECIALIST four. So the server's own
//   envelope for one client request reaches 4 x 90000ms. A 120000ms client deadline expires while
//   the server is still on its first or second attempt — the client gives up on a request the
//   server is still paying for, which is the one outcome the stop policy calls unrecoverable.
//   The deadline therefore has to cover the TRANSPORT CHAIN, not just the model's own thinking.
//
// Mirrors of the server's constants. If api/proxy.js changes either, the control that reads them
// out of that file fails rather than this drifting silently.
export const UPSTREAM_ATTEMPT_MS = 90000;    // api/proxy.js XAI_CALL_TIMEOUT_MS
export const UPSTREAM_MAX_ATTEMPTS = 4;      // longest role chain in api/proxy.js ROLE_MODEL_CHAIN
export const GROK_NON_REASONING = /non-reasoning|4\.20/;

// Same decision api/proxy.js:215 makes, asked here so the deadline matches the effort the server
// will actually request. A name this harness cannot classify is treated as reasoning: being wrong
// in that direction only lengthens the wait, while being wrong the other way abandons a paid call.
export function isGrokReasoningModel(m) {
  const s = String(m || '');
  return /grok/i.test(s) && !GROK_NON_REASONING.test(s);
}

// What the SERVER may spend on one client request before it has nothing left to try.
export function upstreamEnvelopeMs(attempts) {
  const n = Math.max(1, Math.min(UPSTREAM_MAX_ATTEMPTS, Number(attempts) || UPSTREAM_MAX_ATTEMPTS));
  return n * UPSTREAM_ATTEMPT_MS + DEADLINE_CONNECT_MS + DEADLINE_OUTSIDE_ROUTE_MS;
}
export const DEADLINE_FLOOR_MS = 300000;      // what long calls already had
export const DEADLINE_TOKENS_PER_SEC = 90;    // below every measured rate
export const DEADLINE_CONNECT_MS = 60000;     // connection, queueing, the route's own overhead
export const DEADLINE_OUTSIDE_ROUTE_MS = 30000; // sit just outside the route's own window
export const DEADLINE_DEFAULT_MS = 120000;
export const DEADLINE_AUTHOR_OVERRIDE_MS = 300000;

export function deadlineForAllowance(n) {
  return Math.max(DEADLINE_FLOOR_MS,
    Math.ceil((Number(n) / DEADLINE_TOKENS_PER_SEC) * 1000) + DEADLINE_CONNECT_MS)
    + DEADLINE_OUTSIDE_ROUTE_MS;
}

export function dispatchDeadlineMs(o) {
  const outModel = String((o && o.outModel) || '');
  const allowanceOut = Number((o && o.allowanceOut) || 0);
  // A grok dispatch is a reasoning call on its own terms (the server picks effort from the model
  // name, not from the allowance), so it does NOT carry the `allowanceOut > 0` condition the
  // OpenAI-route test uses — request #12 declared only 2200 output tokens and still ran at
  // effort HIGH over a 590,002-character packet.
  const grokReasoning = isGrokReasoningModel(outModel);
  const isReasoningCall = (REASONING_OUT.test(outModel) && allowanceOut > 0) || grokReasoning;
  // THE TRANSPORT FLOOR. For anything going to the grok route, the budget must outlast the
  // server's retry envelope, or the client abandons a request that is still being paid for.
  if (grokReasoning) {
    const envelope = upstreamEnvelopeMs(o && o.upstreamAttempts);
    return { ms: Math.max(deadlineForAllowance(allowanceOut), envelope),
      basis: 'grok_upstream_envelope', outModel, allowanceOut,
      reasoningCall: true, upstreamEnvelopeMs: envelope,
      upstreamAttempts: (o && o.upstreamAttempts) || UPSTREAM_MAX_ATTEMPTS };
  }
  if (isReasoningCall || (o && o.solArchitecture === true)) {
    return { ms: deadlineForAllowance(allowanceOut), basis: 'reasoning_allowance',
      outModel, allowanceOut, reasoningCall: isReasoningCall };
  }
  if (o && o.authorOverride) {
    return { ms: DEADLINE_AUTHOR_OVERRIDE_MS, basis: 'author_override',
      outModel, allowanceOut, reasoningCall: false };
  }
  return { ms: DEADLINE_DEFAULT_MS, basis: 'default', outModel, allowanceOut, reasoningCall: false };
}

export function scaffoldPrerequisite(snapshot, opts) {
  const o = opts || {};
  // DEFAULT ON. A caller that forgets to pass options gets the strict check, never the lax one:
  // no options means no selection, which `verifyScaffoldProvenance` treats as the historical
  // expectation and never as "unverified is fine".
  const s = snapshot || {};
  if (s.readable === false) {
    return { ok: false, code: 'snapshot_unreadable',
      why: 'the page state could not be read, so the precondition is UNKNOWN — which is not met' };
  }
  if (!s.scaffoldPresent) {
    return { ok: false, code: 'scaffold_absent',
      why: 'no scaffold on state: the opening would be assigned by the stale no-row fallback' };
  }
  if (!(Number(s.scaffoldRows) > 0)) {
    return { ok: false, code: 'scaffold_empty',
      why: 'the scaffold carries 0 outline rows, so it supplies no scene assignment' };
  }
  // THE SELECTED PLANNER IS THE CONFIGURATION, SO A FALLBACK IS A MISMATCH — NOT A DEGRADED
  // PASS. One predicate, consulted here and by the post-launch assertion, so the dispatch gate
  // and the launch check cannot disagree about whose plan this is.
  // A CALLER THAT PASSES NO EXPECTATION GETS THE STRICT HISTORICAL ONE, never "unverifiable".
  // Caught by running the existing controls: several of them call this with raw options and no
  // expectedModel, and without this fallback they all reported "no architecture model was
  // selected" instead of exercising the provenance rule they were written to exercise.
  const prov = verifyScaffoldProvenance({
    servedBy: s.servedBy,
    expectedModel: o.expectedModel || DEFAULT_EXPECTED_ARCHITECTURE_MODEL,
    allowProviderFreeIdentity: o.allowProviderFreeIdentity === true });
  if (!prov.ok) {
    return { ok: false, code: 'scaffold_provenance_' + prov.code, provenance: prov, why: prov.why };
  }
  // The stale scene-mission is the known mismatch signature. Only gate on it once the assignment
  // actually resolves — an unresolved assignment at this point is normal, not a failure.
  if (s.assignmentSource && s.assignmentSource === 'scene-mission') {
    return { ok: false, code: 'assignment_stale',
      why: 'the scene-1 assignment resolved to a stale scene-mission, so the scaffold did not reach the opening' };
  }
  return { ok: true, code: 'ok', provenance: prov,
    why: 'scaffold present with ' + s.scaffoldRows + ' rows'
      + (s.assignmentSource ? ', assignment source ' + s.assignmentSource : '')
      + '; ' + prov.why };
}

// WHICH REQUESTS THE PRECONDITION GUARDS. The scaffold stage itself and its own preamble must be
// allowed through — they are what PRODUCES the scaffold. Everything downstream of it is what the
// test refuses to pay for without one. Named explicitly so the boundary is reviewable.
export function isPrerequisiteGuarded(role, bodyText, isAuthor) {
  if (isAuthor) return true;
  const r = String(role || '');
  if (r === 'OPENING_PLANNER' || r === 'NARRATIVE_AUTHOR' || r === 'FALLBACK_AUTHOR') return true;
  // SPECIALIST_RENDERER / LINE_EDITOR / the C+ editor only ever run on prose that already exists,
  // so they are unreachable before an author call and need no separate gate. Listing them here
  // would also wrongly block the scaffold stage's own specialist legs.
  return false;
}

// ── 3. THE EVIDENCE BUNDLE ────────────────────────────────────────────────────────────────
// THE DEFECT THIS REPLACES: the post-launch assertion threw at top level, so the harness's finally
// block never ran. No request ledger, no accounting summary, no state snapshot and no
// transformation record reached disk — which is why "nothing was published" could only be
// inferred from the ABSENCE of a handoff file rather than read off a preserved page count.
//
// This writes what is available and NAMES WHAT IS NOT. A field that could not be collected is
// recorded as unavailable with its reason; it is never defaulted to a value that reads like a
// measurement. The caller supplies the parts; this function only assembles and labels them.
export function evidenceBundle(parts) {
  const p = parts || {};
  const unavailable = [];
  const field = (name, value, why) => {
    if (value === undefined || value === null) {
      unavailable.push({ field: name, why: why || 'not collected before the run ended' });
      return { available: false, why: why || 'not collected before the run ended' };
    }
    return { available: true, value };
  };
  return {
    at: new Date().toISOString(),
    endedBecause: p.endedBecause || 'unspecified',
    endedCleanly: !!p.endedCleanly,
    requestLedger: field('requestLedger', p.requests),
    accounting: field('accounting', p.accounting),
    pageCount: field('pageCount', p.pageCount,
      'the page could not be read — publication state is UNVERIFIED, not "nothing published"'),
    committedScenes: field('committedScenes', p.committedScenes,
      'committed state could not be read before the run ended'),
    transformations: field('transformations', p.transformations,
      'no draft/page pair was captured, so no transformation record exists'),
    // NAMED FOR WHAT IT IS. This was called `stateSnapshot`, which reads as a resumable dump of
    // window.state. It is not: it is a SIX-FIELD SUMMARY (storyId, starterId, scaffoldPresent,
    // scaffoldRows, scaffoldServedBy, scaffoldIsSol) chosen to answer "did the configuration
    // under test actually run". A resumable snapshot is RESUMABLE_STATE.json, which only a run
    // that reaches its end writes. The old name invited a report to claim more than it held.
    stateSummary: field('stateSummary', p.stateSnapshot,
      'the six-field state summary could not be read before the run ended'),
    stateSummaryFields: ['storyId', 'starterId', 'scaffoldPresent', 'scaffoldRows',
      'scaffoldServedBy', 'scaffoldIsSol'],
    resumableSnapshot: { available: false,
      why: 'not part of this bundle — a resumable snapshot is RESUMABLE_STATE.json and is '
        + 'written only by a run that reaches its end' },
    unavailable,
    // THE HONESTY LINE. Anything absent above is absent — a reader of this bundle must not be
    // able to mistake a gap for a zero, and a later report must not reconstruct it as original.
    note: unavailable.length
      ? unavailable.length + ' field(s) are UNAVAILABLE and must be reported as unknown, not as zero'
      : 'all fields collected',
  };
}
