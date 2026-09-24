#!/usr/bin/env node
// _stage_state_substrate_control.mjs
//
// OFFLINE control suite for the generic stage-state substrate (Roman, authorized 2026-09-14).
// Design: _audit_out/generic_stage_state_substrate_design.md (+ corrections).
//
// Loads the REAL, unmodified source of _relationshipLedger, the canonical PC-identity resolver and
// the stage-state helpers verbatim out of public/app.js, executes them in a sandboxed
// `new Function('window', ...)` scope with a minimal state stub, and runs the six required
// controls against the real functions. No server, no browser, no network, no provider call.
//
// ── LOCATING THE SOURCE: MARKERS, NOT LINE NUMBERS (Roman 2026-09-24) ───────────────────────────
// This suite used to slice app.js by hardcoded line ranges (31162-31272 etc.). That is not
// regression protection: app.js moved ~870 lines under it and the suite simply stopped running,
// throwing ANCHOR DRIFT for eight days while every other control reported green.
//
//   "Hardcoded line windows are not meaningful regression protection."
//
// Regions are now located by UNIQUE SOURCE MARKERS and closed at real FUNCTION/BLOCK BOUNDARIES by
// a brace scanner that understands strings and comments. A marker that goes missing or becomes
// ambiguous still fails LOUD — the point was never to soften the failure, only to stop tying it to
// line arithmetic that no edit can be expected to preserve.
//
// REPAIR NOTE — the evidence that this was real staleness, not a genuine drift being papered over.
// At the moment of repair, every one of the old hardcoded windows had lost its anchor outright:
//
//     old window 31162-31272   'var REL_V = 1;'                            → actually line 32035
//     old window 197995-198257 'GENERIC STAGE-STATE SUBSTRATE (…2026-09-14)' → actually line 202554
//     old window 198550-198558 'function _deriveObjectHead(label) {'       → actually line 203109
//
// The suite therefore threw ANCHOR DRIFT before its first assertion and had been dead for eight
// days (last touched 2026-09-16) while every other control reported green. CONTROL 0 still prints
// the current reading of those windows, but INFORMATIONALLY: it is history, not an invariant, and
// an unrelated edit that moved a marker back into one of those ranges must not turn this red.
// The ongoing invariants are marker uniqueness, balanced extraction, compilation, and behaviour.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.join(__dirname, 'public/app.js');
const lines = fs.readFileSync(APP_PATH, 'utf8').split('\n');

// Brace depth of a chunk of source, ignoring braces inside strings, template literals, line
// comments and block comments. Used only to find where a region's outermost block closes.
function braceDelta(src, startState) {
  let depth = startState.depth, i = 0;
  let inLine = false, inBlock = startState.inBlock, quote = startState.quote;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (inLine) { if (c === '\n') inLine = false; i++; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i += 2; continue; } i++; continue; }
    if (quote) {
      if (c === '\\') { i += 2; continue; }
      if (c === quote) quote = null;
      i++; continue;
    }
    if (c === '/' && n === '/') { inLine = true; i += 2; continue; }
    if (c === '/' && n === '*') { inBlock = true; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; i++; continue; }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    i++;
  }
  return { depth, inBlock, quote };
}

function uniqueMarkerLine(marker) {
  const hits = [];
  for (let i = 0; i < lines.length; i++) if (lines[i].includes(marker)) hits.push(i);
  if (hits.length === 0) throw new Error(`MARKER MISSING: "${marker}" is not in public/app.js — the region it anchors was renamed or removed`);
  if (hits.length > 1) throw new Error(`MARKER AMBIGUOUS: "${marker}" appears on ${hits.length} lines (${hits.map((h) => h + 1).join(', ')}) — pick a more specific anchor`);
  return hits[0];
}

// From startMarker through endMarker, then extended forward to whatever line actually closes the
// region's outermost open block — so an end marker that sits INSIDE a function or try block
// (e.g. an export line) still yields syntactically complete source.
const located = [];
function sliceRegion(label, startMarker, endMarker) {
  const from = uniqueMarkerLine(startMarker);
  const to = uniqueMarkerLine(endMarker);
  if (to < from) throw new Error(`MARKER ORDER: "${endMarker}" (line ${to + 1}) precedes "${startMarker}" (line ${from + 1})`);
  let state = { depth: 0, inBlock: false, quote: null };
  for (let i = from; i <= to; i++) state = braceDelta(lines[i] + '\n', state);
  let end = to;
  while (state.depth > 0 && end + 1 < lines.length) { end++; state = braceDelta(lines[end] + '\n', state); }
  if (state.depth !== 0) throw new Error(`UNBALANCED REGION: "${label}" never closes (depth ${state.depth} at EOF)`);
  located.push({ label, from: from + 1, to: end + 1, lines: end - from + 1 });
  return lines.slice(from, end + 1).join('\n');
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 0 — the repair itself: the OLD fixed-line slice is broken, the
// marker-based locator is not. Proven here rather than asserted in a comment.
// ══════════════════════════════════════════════════════════════════════════
const OLD_FIXED_SLICES = [
  { from: 31162, to: 31272, anchor: 'var REL_V = 1;' },
  { from: 197995, to: 198257, anchor: 'GENERIC STAGE-STATE SUBSTRATE (Roman, authorized 2026-09-14)' },
  { from: 198550, to: 198558, anchor: 'function _deriveObjectHead(label) {' }
];
const oldSliceBroken = OLD_FIXED_SLICES.map((s) => ({
  ...s,
  actualLine: (() => { try { return uniqueMarkerLine(s.anchor) + 1; } catch (_) { return null; } })(),
  containsAnchor: lines.slice(s.from - 1, s.to).join('\n').includes(s.anchor)
}));

const relLedgerSrc = sliceRegion('relationship ledger',
  'var REL_V = 1;',
  'function _relEnsureEntity(L, id, patch) {');
// ADDED 2026-09-24: the canonical PC-identity resolver. _relEnsureAnchors now labels the PC anchor
// through _resolvePcIdentity, so a sandbox without it exercises a degraded fallback rather than the
// code that actually ships. STARTER_SEEDS is absent here, but the resolver already guards it with
// `typeof`, so seedless resolution is the real behaviour, not a stub.
const pcIdentitySrc = sliceRegion('canonical PC identity',
  'function _isPlaceholderPcName(v) {',
  'window._isPlaceholderPcName = _isPlaceholderPcName;');
const stageStateSrc = sliceRegion('stage-state substrate',
  'GENERIC STAGE-STATE SUBSTRATE (Roman, authorized 2026-09-14)',
  'window._acceptStageProposal = _acceptStageProposal;') + '\n'
  + sliceRegion('_deriveObjectHead',
    'function _deriveObjectHead(label) {',
    'window._deriveObjectHead = _deriveObjectHead;');

const body = pcIdentitySrc + '\n' + relLedgerSrc + '\n' + stageStateSrc;
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
// SECTION 0 — THE STALENESS REPAIR ITSELF
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 0 — the old fixed-line slice is stale; the marker locator is not');
{
  // INFORMATIONAL ONLY — deliberately not a pass/fail assertion (Roman 2026-09-24). Whether the
  // old fixed windows still happen to contain their anchors is a fact about this repair's history,
  // not an invariant worth defending: an unrelated edit could move a marker back into one of those
  // ranges and turn a healthy suite red for no reason. The repair note in this file's header is
  // the durable evidence; this printout is just the current reading.
  console.log('    [informational — not asserted] the line windows this suite used before 2026-09-24:');
  oldSliceBroken.forEach((s) => {
    console.log(`      ${s.from}-${s.to} for "${s.anchor.slice(0, 52)}" → `
      + (s.containsAnchor ? `still inside that window` : `now at line ${s.actualLine}, OUTSIDE it`));
  });
  ok('every marker-located region resolved, and each is non-trivial',
    located.length === 4 && located.every((r) => r.lines > 3), JSON.stringify(located));
  ok('every located region is syntactically COMPLETE — the extracted source compiled',
    typeof factory === 'function');
  located.forEach((r) => console.log(`    located "${r.label}" at ${r.from}-${r.to} (${r.lines} lines)`));
  // The locator must fail LOUD, not silently return something plausible, when a marker goes.
  let missingThrew = false;
  try { uniqueMarkerLine('var REL_V = 9999;'); } catch (_) { missingThrew = true; }
  ok('a MISSING marker still throws rather than silently testing stale code', missingThrew);
  let ambiguousThrew = false;
  try { uniqueMarkerLine('  }'); } catch (e) { ambiguousThrew = /MARKER AMBIGUOUS/.test(e.message); }
  ok('an AMBIGUOUS marker throws rather than picking the first match', ambiguousThrew);
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 0b — the sandbox now runs the PC anchor as it actually ships
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 0b — PC anchor labels through the canonical resolver');
{
  const win = freshSandbox('story-c0b');
  // Real path into _relLedger(true) → _relEnsureAnchors, via the same production bootstrap
  // BOOTSTRAP CONTROL A uses (_relEntityForName sits outside the extracted region).
  win._ensureStoryEntityAnchors();
  const pc = win.state._relationshipLedger.entities.pc;
  ok('the canonical resolver is present in the sandbox, so the anchor is not running a degraded fallback',
    typeof win._resolvePcIdentity === 'function');
  ok('the PC anchor resolves the configured name rather than "the protagonist"',
    pc && pc.label === 'Lirael', JSON.stringify(pc));
  // By anchorRole, not by id: _relLiId() derives the LI's id from the configured name, so 'li' is
  // not a stable key (BOOTSTRAP CONTROL A hedges the same way).
  const liEnt = Object.values(win.state._relationshipLedger.entities).filter((e) => e && e.anchorRole === 'li')[0];
  ok('the LI anchor still resolves alongside it', liEnt && liEnt.label === 'Julian', JSON.stringify(liEnt));
}

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
    // D1 (Roman, authorized 2026-09-14): object_id is now BACKEND-MINTED at accept time — a
    // proposal never supplies one. The real minted id is read back from s1.record below.
    issued_objects: [{ label: 'the ceremonial sash', owner_or_caretaker_ref: 'pc', held_by: 'pc', addressable_by: ['pc'] }]
  });
  ok('Issue 1 stage accepted with an issued object', s1.ok === true, JSON.stringify(s1.why));
  const s1ObjectId = s1.ok ? s1.record.issued_objects[0].object_id : null;
  ok('Issue 1\'s object was minted a real backend object_id', /^obj:stage:\d+$/.test(s1ObjectId || ''), s1ObjectId);

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
    JSON.stringify(active.issued_objects).indexOf(s1ObjectId) === -1);
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
    // D1: object_id is backend-minted at accept time — never supplied by the proposal.
    issued_objects: [{ label: 'the sash', addressable_by: ['pc'] }]
  });
  ok('Control 4 setup: stage accepted', s1.ok === true, JSON.stringify(s1.why));
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
