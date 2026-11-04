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
export function prerequisiteOptionsFor(mode) {
  const m = String(mode || '');
  return {
    // FAIL-CLOSED: anything that is not explicitly the provider-blocked driver requires Sol.
    requireSol: m !== 'drive',
    mode: m || '(unset)',
  };
}

export function scaffoldPrerequisite(snapshot, opts) {
  const o = opts || {};
  // DEFAULT ON. A caller that forgets to pass options gets the strict check, never the lax one.
  const requireSol = o.requireSol !== false;
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
  // SOL IS THE CONFIGURATION, SO A FALLBACK IS A MISMATCH — NOT A DEGRADED PASS.
  if (requireSol && s.isSolArchitecture !== true) {
    return { ok: false, code: 'scaffold_not_sol',
      why: 'the scaffold was served by ' + JSON.stringify(s.servedBy || 'unrecorded')
        + ', not Sol; that is a different planner and a different experiment' };
  }
  // The stale scene-mission is the known mismatch signature. Only gate on it once the assignment
  // actually resolves — an unresolved assignment at this point is normal, not a failure.
  if (s.assignmentSource && s.assignmentSource === 'scene-mission') {
    return { ok: false, code: 'assignment_stale',
      why: 'the scene-1 assignment resolved to a stale scene-mission, so the scaffold did not reach the opening' };
  }
  return { ok: true, code: 'ok', requireSol,
    why: (requireSol ? 'fresh Sol scaffold present with ' : 'scaffold present with ')
      + s.scaffoldRows + ' rows'
      + (s.assignmentSource ? ', assignment source ' + s.assignmentSource : '')
      + (requireSol ? '' : ' (Sol identity NOT required: provider-blocked driver)') };
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
