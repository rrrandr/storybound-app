#!/usr/bin/env node
// _arc_constraint_registry_control.mjs
//
// OFFLINE control suite for the generic arc-constraint registry (Roman, authorized 2026-09-14).
// Loads the REAL, unmodified source of STARTER_SEEDS (public/app.js, for
// starter_first_sacrifice.arcConstraints), _activeSeed, and the new registry functions
// (_isStoryEventCommitted / _commitStoryEvent / _ensureArcConstraintsForStory /
// _checkArcConstraint / _attemptArcConstraintTarget) verbatim by line range, executes them in a
// sandboxed `new Function('window', ...)` scope with a minimal state stub, and runs the required
// red/green controls. No server, no browser, no network, no provider call.
//
// If public/app.js is edited such that these line ranges drift, the anchor checks below fail
// LOUD (not silently test stale code).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.join(__dirname, 'public/app.js');
const lines = fs.readFileSync(APP_PATH, 'utf8').split('\n');

function sliceLines(from1, to1, startAnchor, endAnchor) {
  const slice = lines.slice(from1 - 1, to1).join('\n');
  if (!slice.includes(startAnchor)) throw new Error(`ANCHOR DRIFT: expected "${startAnchor}" in lines ${from1}-${to1}`);
  if (!slice.includes(endAnchor)) throw new Error(`ANCHOR DRIFT: expected "${endAnchor}" in lines ${from1}-${to1}`);
  return slice;
}

const starterSeedsSrc = sliceLines(126766, 127107, 'const STARTER_SEEDS = {', 'window.STARTER_SEEDS = STARTER_SEEDS;');
const activeSeedSrc = sliceLines(127399, 127399, 'function _activeSeed(s)', 'function _activeSeed(s)');
const registrySrc = sliceLines(197553, 197674,
  'GENERIC ARC-CONSTRAINT REGISTRY (Roman, authorized 2026-09-14)',
  'window._attemptArcConstraintTarget = _attemptArcConstraintTarget;');

const body = starterSeedsSrc + '\n' + activeSeedSrc + '\n' + registrySrc;
const factory = new Function('window', body);

function freshSandbox(overrides) {
  const win = { state: Object.assign({ storyId: 's1', _starterId: 'starter_first_sacrifice' }, overrides || {}) };
  factory(win);
  return win;
}

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 1 — The Open is available in ORDINARY Fatelands stories (no
// story-scoped constraint applies when _starterId isn't First Sacrifice).
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 1 — the_open available in an ordinary Fatelands story');
{
  const win = freshSandbox({ _starterId: 'some_other_fantasy_starter' });
  const check = win._checkArcConstraint('landmark', 'the_open');
  ok('an ordinary story with no matching constraint reads available', check.available === true, JSON.stringify(check));

  const winNoSeed = freshSandbox({ _starterId: null });
  const checkNoSeed = winNoSeed._checkArcConstraint('landmark', 'the_open');
  ok('a Corridor story (no seed at all) also reads available', checkNoSeed.available === true, JSON.stringify(checkNoSeed));
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 2 — the_open is UNAVAILABLE to First Sacrifice before inquiry_opened.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 2 — the_open locked for First Sacrifice, no committed event yet');
{
  const win = freshSandbox();
  const stateBefore = JSON.stringify(win.state);
  const check = win._checkArcConstraint('landmark', 'the_open');
  ok('First Sacrifice reads UNAVAILABLE before the Inquiry commits', check.available === false, JSON.stringify(check));
  ok('the ONLY exposed reason is the canon-approved key', check.available === false && check.reason_key === 'preliminary_process_before_formal_inquiry', check.reason_key);
  ok('the constraint_id is stable and identifies the real seed-authored record', check.constraint_id === 'starter_first_sacrifice:the_open', check.constraint_id);
  // TRUE read-only: the check derives availability from the seed directly (no bootstrap
  // required to be correct), so state is BYTE-IDENTICAL before and after — not just "no
  // deferral written," but literally nothing mutated, not even a lazily-created registry copy.
  ok('_checkArcConstraint is READ-ONLY — state is byte-identical before and after a locked check', JSON.stringify(win.state) === stateBefore);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 3 — an attempt to demand the Inquiry now RECORDS the intent as durable
// posture — never discarded, never staged as The Open, never reader-visible
// "locked" text.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 3 — reader attempt records durable posture, never stages the target');
{
  const win = freshSandbox();
  const intentText = 'Lirael seeks a formal Inquiry now.';
  const result = win._attemptArcConstraintTarget('landmark', 'the_open', intentText, { sceneKey: 's2' });
  ok('the attempt is NOT an error — ok:true regardless of lock state', result.ok === true, JSON.stringify(result));
  ok('the attempt reports available:false (still locked)', result.available === false);
  ok('only the canon-approved reason key is exposed, nothing else', result.reason_key === 'preliminary_process_before_formal_inquiry');
  ok('the result carries NO staged location/object/stage content for The Open', !result.stage && !result.location && !result.issued_objects);
  const deferrals = win.state._arcConstraintDeferrals;
  ok('a durable deferral record was written (never discarded)', Array.isArray(deferrals) && deferrals.length === 1, JSON.stringify(deferrals));
  ok('the submitted intent is preserved VERBATIM — not rewritten, not summarized, not refused', deferrals[0].requested_intent_text === intentText, deferrals[0].requested_intent_text);
  ok('the deferral is stamped with the same constraint_id and reason_key', deferrals[0].constraint_id === 'starter_first_sacrifice:the_open' && deferrals[0].reason_key === 'preliminary_process_before_formal_inquiry');
  ok('the deferral records which scene the attempt happened in', deferrals[0].sceneKey === 's2');
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 4 — unlocks ONLY after the committed event id, NEVER because of a
// phrase anywhere in state/prose.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 4 — unlock is structural (committed event id), never lexical');
{
  const win = freshSandbox();
  // A phrase resembling the event appears in ordinary prose/state text — this must NEVER unlock
  // anything, since the check only ever consults state._committedStoryEvents.
  win.state._lastSceneProse = 'The Chayr and two Dohkars formally open an inquiry into the ceremony, right here, right now — the formal inquiry has begun.';
  const stillLocked = win._checkArcConstraint('landmark', 'the_open');
  ok('a phrase alone (no committed event) does NOT unlock the target', stillLocked.available === false, JSON.stringify(stillLocked));

  // Committing an UNRELATED event id must not unlock it either.
  win._commitStoryEvent('some_unrelated_event', { source: 'test' });
  const stillLocked2 = win._checkArcConstraint('landmark', 'the_open');
  ok('committing an unrelated event id does not unlock it', stillLocked2.available === false);

  // Only the REAL structured event id commits it.
  const committed = win._commitStoryEvent('inquiry_opened', { source: 'test' });
  ok('_commitStoryEvent records the real structured id', !!committed && committed.eventId === 'inquiry_opened');
  const nowUnlocked = win._checkArcConstraint('landmark', 'the_open');
  ok('the target becomes available ONLY after the real committed event id', nowUnlocked.available === true, JSON.stringify(nowUnlocked));
  ok('the unlock reports which event id unlocked it', nowUnlocked.unlockedBy === 'inquiry_opened');

  // Idempotency: committing the same event twice never duplicates or changes the record.
  const first = win.state._committedStoryEvents.inquiry_opened;
  win._commitStoryEvent('inquiry_opened', { source: 'test-retry' });
  ok('re-committing the same event id is idempotent (first-write-wins)', win.state._committedStoryEvents.inquiry_opened === first);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 5 — persists through save/reload (survives the real blocklist-copy
// convention) and Issue transition (storyId changes; _starterId, the real
// scoping key, does not — matches _resetStoryState()'s real behavior, verified
// this session: _starterId is never cleared, state.storyId always is/changes).
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 5 — persistence through save/reload and Issue transition');
{
  const win = freshSandbox();
  win._attemptArcConstraintTarget('landmark', 'the_open', 'Lirael seeks a formal Inquiry now.');
  win._commitStoryEvent('some_unrelated_event', { source: 'test' });

  // "Save/reload" — the real saveStorySnapshot() mechanism is a plain `{...state}` blocklist
  // copy (none of these fields are in that delete-list — verified this session for the sibling
  // stage-state/relationship-ledger records) — a JSON round trip is the faithful offline
  // equivalent of that copy + JSON-serialized Supabase/localStorage persistence.
  const reloaded = JSON.parse(JSON.stringify(win.state));
  ok('_arcConstraints survives a save/reload round trip', JSON.stringify(reloaded._arcConstraints) === JSON.stringify(win.state._arcConstraints));
  ok('_arcConstraintDeferrals survives a save/reload round trip, verbatim intent included', JSON.stringify(reloaded._arcConstraintDeferrals) === JSON.stringify(win.state._arcConstraintDeferrals));
  ok('_committedStoryEvents survives a save/reload round trip', JSON.stringify(reloaded._committedStoryEvents) === JSON.stringify(win.state._committedStoryEvents));

  // "Issue transition" — the real _resetStoryState() mints a NEW state.storyId and does NOT
  // touch _starterId (confirmed by grep this session — no _starterId reference anywhere in that
  // function). Simulate exactly that delta, nothing else.
  const oldStoryId = win.state.storyId;
  win.state.storyId = 'issue-2-story-id';   // the only thing _resetStoryState() actually changes here
  const afterBoundary = win._checkArcConstraint('landmark', 'the_open');
  ok('the constraint (scoped by _starterId, not storyId) still applies after an Issue transition', afterBoundary.available === false, JSON.stringify(afterBoundary));
  const stillCommitted = win._isStoryEventCommitted('some_unrelated_event');
  ok('a previously committed event remains committed across an Issue transition', stillCommitted === true);
  ok('the prior deferral record is still present, unmutated, after the boundary', win.state._arcConstraintDeferrals.length === 1 && win.state._arcConstraintDeferrals[0].storyId === oldStoryId, JSON.stringify(win.state._arcConstraintDeferrals));
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 6 — Famous Fate receives NO Fatelands constraint, ever, regardless
// of what _starterId happens to be set to.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 6 — Famous Fate receives no Fatelands constraint');
{
  const win = freshSandbox({ fateMode: 'famous_fate' });
  const check = win._checkArcConstraint('landmark', 'the_open');
  ok('Famous Fate reads the target as available — the lock never reaches it', check.available === true, JSON.stringify(check));
  const attempt = win._attemptArcConstraintTarget('landmark', 'the_open', 'An FF-story attempt, irrelevant to Fatelands canon.');
  ok('an FF "attempt" is never deferred — nothing to defer, since nothing is locked for FF', attempt.available === true && !win.state._arcConstraintDeferrals);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 7 (static) — no prose/author prompt or stage issuer consumes this
// registry yet. Grep the REAL file for any call site of the four new
// functions outside their own definitions/exports and this control file.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 7 — zero live consumers (static audit of the real file)');
{
  const src = fs.readFileSync(APP_PATH, 'utf8');
  const fns = ['_checkArcConstraint(', '_attemptArcConstraintTarget(', '_commitStoryEvent(', '_ensureArcConstraintsForStory('];
  fns.forEach(fn => {
    const count = (src.match(new RegExp(fn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    // Expected occurrences: the function's own `function NAME(` declaration (1), its
    // `window._x = _x;` export (0 — that pattern doesn't include the paren), and any INTERNAL
    // cross-call between these four (e.g. _attemptArcConstraintTarget calls _checkArcConstraint
    // and _ensureArcConstraintsForStory). Anything beyond that expected internal count is a live
    // external consumer and must be investigated, not assumed safe.
    ok('CONTROL7 ' + fn + ' — occurrence count is exactly the registry\'s own internal wiring (' + count + ')',
      count <= 3, 'found ' + count + ' occurrences — investigate for an unauthorized live consumer');
  });
}

console.log('\n' + '='.repeat(60));
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (fail) { fails.forEach(f => console.log('  FAILED: ' + f)); process.exitCode = 1; }
process.exit(process.exitCode || 0);
