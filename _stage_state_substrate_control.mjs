#!/usr/bin/env node
// _stage_state_substrate_control.mjs
//
// OFFLINE control suite for the generic stage-state substrate (Roman, authorized 2026-09-14).
// Design: _audit_out/generic_stage_state_substrate_design.md (+ corrections).
//
// Loads the REAL, unmodified source of _relationshipLedger (public/app.js ~31116-31226) and the
// new stage-state helpers (~196969-197153) verbatim by line range, executes them in a sandboxed
// `new Function('window', ...)` scope with a minimal state stub, and runs the six required
// controls against the real functions. No server, no browser, no network, no provider call.
//
// If public/app.js is edited such that these line ranges drift, the anchor checks below fail
// LOUD (not silently test stale code) — this suite is tied to specific line numbers by design,
// consistent with this session's other extraction-based proofs.

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

const relLedgerSrc = sliceLines(31125, 31235, 'var REL_V = 1;', 'function _relEnsureEntity(L, id, patch)');
const stageStateSrc = sliceLines(197100, 197324,
  'GENERIC STAGE-STATE SUBSTRATE (Roman, authorized 2026-09-14)',
  'window._acceptStageProposal = _acceptStageProposal;');

const body = relLedgerSrc + '\n' + stageStateSrc;
const factory = new Function('window', body);

function freshSandbox(storyId) {
  const win = { state: { storyId: storyId || 's1', name: 'Lirael', loveInterestName: 'Julian' } };
  factory(win);
  return win;
}

// ── tiny assertion harness ──
let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 1 — Unissued recurring entity: bare name / unminted id as a present
// participant → named rejection.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 1 — unissued recurring entity');
{
  const win = freshSandbox('story-c1');
  const before = JSON.stringify(win.state._stageState || null);
  const r1 = win._acceptStageProposal('s2', { present: ['Seren'], source: 'test' }); // bare name, not an id
  ok('bare name "Seren" rejected', r1.ok === false, JSON.stringify(r1.why));
  ok('rejection names the exact reference', r1.ok === false && r1.why.some(w => w.indexOf('Seren') !== -1));
  const r2 = win._acceptStageProposal('s2', { present: ['ent:stage:999'], source: 'test' }); // unminted id
  ok('unminted id "ent:stage:999" rejected', r2.ok === false);
  ok('no _stageState mutation on reject', JSON.stringify(win.state._stageState || null) === before);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 2 — Valid new entity: backend mints on acceptance; a later stage
// proposal can reuse that id. Also proves the planner-cannot-mint-its-own-id
// and provenance-is-backend-only rules.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 2 — valid new entity, backend-minted, later reused');
{
  const win = freshSandbox('story-c2');
  const rejectSelfId = win._proposeNewEntity({ label: 'the Herald', id: 'ent:whatever' });
  ok('caller-supplied id is rejected (backend mints, never the caller)', rejectSelfId.ok === false);
  const rejectSelfProvenance = win._proposeNewEntity({ label: 'the Herald', provenance: 'seed' });
  ok('caller-supplied provenance is rejected (backend stamps it)', rejectSelfProvenance.ok === false);
  const rejectNoLabel = win._proposeNewEntity({ aliases: ['x'] });
  ok('missing label rejected (schema failure)', rejectNoLabel.ok === false);
  const rejectBadKind = win._proposeNewEntity({ label: 'the Herald', kind: 'monster_truck' });
  ok('forbidden/unknown kind rejected', rejectBadKind.ok === false);

  const created = win._proposeNewEntity({ label: 'the Herald', aliases: ['Herald'], kind: 'named', roleHint: 'town crier' });
  ok('valid minimal proposal accepted', created.ok === true, JSON.stringify(created));
  ok('backend minted a stable id', !!(created.entity && created.entity.id), created.entity && created.entity.id);
  ok('minted id is NOT the caller-guessed one', created.ok && created.entity.id !== 'ent:whatever');
  ok('provenance stamped by backend', created.ok && created.entity.provenance === 'stage_issuer_generated');
  const mintedId = created.entity.id;
  ok('committed into _relationshipLedger.entities (the existing authority, no second registry)',
    !!(win.state._relationshipLedger && win.state._relationshipLedger.entities && win.state._relationshipLedger.entities[mintedId]));

  const reuse = win._acceptStageProposal('s3', { present: [mintedId, 'pc'], source: 'test' });
  ok('a LATER stage proposal can reuse the minted id', reuse.ok === true, JSON.stringify(reuse.why));
  ok('accepted record lists the reused id', reuse.ok && reuse.record.present.indexOf(mintedId) !== -1);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 3 — Issue-boundary smuggling: a Scene 1 object cannot be treated as
// present/addressable in Issue 2 unless the new active stage explicitly
// reissues it. Modeled here as: Issue 1's object never appears in Issue 2's
// accepted stage unless a fresh proposal includes it.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 3 — Issue-boundary smuggling');
{
  const win = freshSandbox('story-c3');
  win._ensureStoryEntityAnchors();   // explicit lifecycle bootstrap — NOT implicit inside validation/accept
  const s1 = win._acceptStageProposal('s1', {
    present: ['pc'], source: 'test',
    issued_objects: [{ object_id: 's:s1:O1', label: 'the ceremonial sash', owner_or_caretaker_ref: 'pc', held_by: 'pc', addressable_by: ['pc'] }]
  });
  ok('Issue 1 stage accepted with an issued object', s1.ok === true, JSON.stringify(s1.why));

  // Simulate the Issue boundary the same way _resetStoryState now does: close the active stage.
  const closed = win._closeActiveStage('issue_boundary');
  ok('Issue boundary closes the active stage', !!closed && closed.lifecycle.closedReason === 'issue_boundary');
  ok('no active stage remains after the boundary', win._activeStageRecord(win.state) === null);

  // Issue 2's own first stage proposal does NOT reissue O1 — the object must not silently persist.
  const s2 = win._acceptStageProposal('s2', { present: ['pc'], source: 'test' });
  ok('Issue 2 stage accepted with no active-stage inheritance required', s2.ok === true, JSON.stringify(s2.why));
  ok('Issue 2\'s accepted record carries NO issued_objects unless reissued', s2.ok && s2.record.issued_objects.length === 0);
  const active = win._activeStageRecord(win.state);
  ok('the active stage is now Issue 2\'s, not Issue 1\'s', !!active && active.sceneKey === 's2');
  ok('the active stage does not expose Issue 1\'s object id anywhere in its own issued content',
    JSON.stringify(active.issued_objects).indexOf('s:s1:O1') === -1);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 4 — Immutable historical stage: a closed prior-Issue stage remains
// readable, unchanged, as history; no active stage survives into the next Issue.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 4 — immutable historical stage');
{
  const win = freshSandbox('story-c4');
  win._ensureStoryEntityAnchors();
  const s1 = win._acceptStageProposal('s1', {
    present: ['pc'], source: 'test',
    issued_objects: [{ object_id: 's:s1:O1', label: 'the sash', addressable_by: ['pc'] }]
  });
  const snapshotBefore = JSON.parse(JSON.stringify(win.state._stageState.s1));
  win._closeActiveStage('issue_boundary');
  const historical = win.state._stageState.s1;
  ok('historical record\'s issued content is byte-identical after closing',
    JSON.stringify({ location: historical.location, present: historical.present, issued_objects: historical.issued_objects, issued_facts: historical.issued_facts })
    === JSON.stringify({ location: snapshotBefore.location, present: snapshotBefore.present, issued_objects: snapshotBefore.issued_objects, issued_facts: snapshotBefore.issued_facts }));
  ok('closure only appended lifecycle metadata', historical.lifecycle.closedAt != null && historical.lifecycle.closedReason === 'issue_boundary');
  ok('historical record is still present in state._stageState (never deleted)', !!win.state._stageState.s1);
  ok('no active stage survives the boundary', win._activeStageRecord(win.state) === null);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 5 — Same display name: two distinct valid entity ids with the same
// exact display label both enter the active stage; present_disambiguators
// reaches the consumer packet. Exact-string only — no fuzzy matching.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 5 — same display name, distinct ids, disambiguators issued');
{
  const win = freshSandbox('story-c5');
  const j1 = win._proposeNewEntity({ label: 'Julian', kind: 'named', roleHint: 'the elder scholar' });
  const j2 = win._proposeNewEntity({ label: 'Julian', kind: 'named', roleHint: 'the stable hand' });
  ok('first "Julian" creation accepted (name resemblance is never a rejection ground)', j1.ok === true);
  ok('second, exact-name-duplicate "Julian" creation ALSO accepted, no near-duplicate check', j2.ok === true, JSON.stringify(j2));
  ok('two DIFFERENT ids were minted for the two same-named entities', j1.ok && j2.ok && j1.entity.id !== j2.entity.id);

  const staged = win._acceptStageProposal('s1', { present: [j1.entity.id, j2.entity.id], source: 'test' });
  ok('both same-named entities accepted into the same active stage', staged.ok === true, JSON.stringify(staged.why));
  const dis = staged.ok ? staged.record.present_disambiguators : {};
  ok('present_disambiguators populated for BOTH colliding ids', !!dis[j1.entity.id] && !!dis[j2.entity.id]);
  ok('disambiguators are distinct from each other', dis[j1.entity.id] !== dis[j2.entity.id]);

  // Negative control: a single unique-labeled entity gets no disambiguator at all.
  const win2 = freshSandbox('story-c5b');
  const solo = win2._proposeNewEntity({ label: 'Seren', kind: 'named' });
  const stagedSolo = win2._acceptStageProposal('s1', { present: [solo.entity.id], source: 'test' });
  ok('a non-colliding entity gets NO disambiguator entry', stagedSolo.ok && Object.keys(stagedSolo.record.present_disambiguators).length === 0);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 6 — Existing-id conflict: a proposal reuses one existing stable
// entity id with incompatible canonical role/kind data → named rejection; no
// mutation. Display-name is never checked for this case.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 6 — existing-id conflict (canonical data, never name)');
{
  const win = freshSandbox('story-c6');
  const created = win._proposeNewEntity({ label: 'the Warden', kind: 'role', roleHint: 'prison keeper' });
  const id = created.entity.id;
  const before = JSON.parse(JSON.stringify(win.state._relationshipLedger.entities[id]));

  // Conflicting kind under the SAME id → reject.
  const conflict = win._acceptStageProposal('s1', {
    present: [id], source: 'test',
    identityClaims: { [id]: { kind: 'named' } }   // existing record's kind is 'role' — conflict
  });
  ok('existing id + conflicting canonical kind is rejected', conflict.ok === false, JSON.stringify(conflict.why));
  ok('rejection is BY ID, not by name/label', conflict.ok === false && conflict.why.some(w => w.indexOf(id) !== -1));
  ok('no mutation of the existing entity on reject', JSON.stringify(win.state._relationshipLedger.entities[id]) === JSON.stringify(before));

  // Compatible/matching claim under the SAME id → accept (sanity: the check isn't just "any claim rejects").
  const matching = win._acceptStageProposal('s2', {
    present: [id], source: 'test',
    identityClaims: { [id]: { kind: 'role' } }   // matches the existing record
  });
  ok('existing id + MATCHING canonical kind is accepted', matching.ok === true, JSON.stringify(matching.why));

  // Display-name similarity to a DIFFERENT entity must never be a rejection reason, even here.
  const other = win._proposeNewEntity({ label: 'the Warden', kind: 'role' }); // exact name match to `created`
  ok('a second, differently-id\'d entity with the IDENTICAL display name is accepted, not rejected', other.ok === true);
}

// ══════════════════════════════════════════════════════════════════════════
// BOOTSTRAP CONTROL A — a legacy/empty ledger bootstraps PC and LI once before
// a valid proposal. Proves the SEPARATE lifecycle helper, not the validator,
// is what creates the anchors.
// ══════════════════════════════════════════════════════════════════════════
section('BOOTSTRAP CONTROL A — legacy/empty ledger bootstraps pc+li, then a proposal succeeds');
{
  const win = freshSandbox('story-boot-a');
  ok('no _relationshipLedger exists yet (genuinely legacy/empty)', !win.state._relationshipLedger);
  const anchors = win._ensureStoryEntityAnchors();
  ok('bootstrap returns the ledger', !!anchors);
  ok('pc anchor exists after bootstrap', !!(win.state._relationshipLedger.entities.pc));
  ok('li anchor exists after bootstrap', !!(win.state._relationshipLedger.entities.li || win.state._relationshipLedger.entities['ent:julian']));
  const staged = win._acceptStageProposal('s1', { present: ['pc'], source: 'test' });
  ok('a stage proposal referencing "pc" now succeeds', staged.ok === true, JSON.stringify(staged.why));
}

// ══════════════════════════════════════════════════════════════════════════
// BOOTSTRAP CONTROL B — a missing entity during DIRECT stage validation (no
// bootstrap called first) rejects by name with NO ledger mutation. Proves
// _validateStageProposal is strictly read-only.
// ══════════════════════════════════════════════════════════════════════════
section('BOOTSTRAP CONTROL B — direct validation rejects with zero ledger mutation');
{
  const win = freshSandbox('story-boot-b');
  ok('no _relationshipLedger exists (no bootstrap called)', !win.state._relationshipLedger);
  const result = win._validateStageProposal({ present: ['pc'], source: 'test' });
  ok('validation rejects "pc" when anchors were never bootstrapped', result.ok === false, JSON.stringify(result.why));
  ok('rejection names "pc" by id, not a generic error', result.why.some(w => w.indexOf('pc') !== -1));
  ok('_relationshipLedger is STILL absent after a rejected direct validation call (zero mutation)', !win.state._relationshipLedger);
  // Also prove _acceptStageProposal (which calls the same validator) doesn't silently self-heal it.
  const accept = win._acceptStageProposal('s1', { present: ['pc'], source: 'test' });
  ok('_acceptStageProposal also rejects (no implicit bootstrap inside accept either)', accept.ok === false);
  ok('_relationshipLedger is STILL absent after the rejected accept call too', !win.state._relationshipLedger);
  ok('state._stageState was never created by the rejected accept call', !win.state._stageState);
}

// ══════════════════════════════════════════════════════════════════════════
// BOOTSTRAP CONTROL C — retrying the same bootstrap does not duplicate entities.
// ══════════════════════════════════════════════════════════════════════════
section('BOOTSTRAP CONTROL C — retrying bootstrap is idempotent, no duplicates');
{
  const win = freshSandbox('story-boot-c');
  win._ensureStoryEntityAnchors();
  const idsAfterFirst = Object.keys(win.state._relationshipLedger.entities).sort();
  const pcRefAfterFirst = win.state._relationshipLedger.entities.pc;
  win._ensureStoryEntityAnchors();
  win._ensureStoryEntityAnchors();
  win._ensureStoryEntityAnchors();
  const idsAfterRetries = Object.keys(win.state._relationshipLedger.entities).sort();
  ok('entity id set is UNCHANGED after 3 redundant bootstrap calls', JSON.stringify(idsAfterFirst) === JSON.stringify(idsAfterRetries), JSON.stringify({ idsAfterFirst, idsAfterRetries }));
  ok('the pc entity object is the SAME reference, not a replaced duplicate', win.state._relationshipLedger.entities.pc === pcRefAfterFirst);
  ok('exactly one "pc"-kind anchor exists (no duplicate anchor under a different id)',
    Object.values(win.state._relationshipLedger.entities).filter(e => e && e.anchorRole === 'pc').length === 1);
}

// ── final report ──
console.log('\n' + '='.repeat(60));
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (fail) { fails.forEach(f => console.log('  FAILED: ' + f)); process.exitCode = 1; }
process.exit(process.exitCode || 0);
