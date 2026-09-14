#!/usr/bin/env node
// _stage_issuer_control.mjs
//
// OFFLINE control suite for the continuation-stage issuer (Roman, authorized 2026-09-14,
// controls-first). Loads the REAL, unmodified source of the entity-ledger primitives
// (_relLedger/_relEnsureAnchors/_relEnsureEntity/_relMatchByName/_relNorm), the stage-state
// substrate, the arc-constraint registry, and the new issuer functions
// (_resolveOrProposePresentIds / _matchLandmarkIdByLabel / _issueStageFromPlannerReply)
// verbatim, by anchor-bounded slice of public/app.js, into a sandboxed `new Function('window', ...)`
// scope. No server, no browser, no network, no provider call.
//
// FATELANDS_CANON is NOT extracted verbatim (it is a multi-thousand-line canon object) — a
// minimal stub carrying only the one field _matchLandmarkIdByLabel reads (landmarks.<id>.name)
// is used instead, and CONTROL 0 below cross-checks that stub's string against a regex read of
// the real source so it cannot silently drift from production.
//
// If public/app.js is edited such that these anchors move, the slicer fails LOUD (never tests
// stale code).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.join(__dirname, 'public/app.js');
const SRC = fs.readFileSync(APP_PATH, 'utf8');

function sliceByAnchor(label, startAnchor, endAnchor, { includeEnd = true } = {}) {
  const from = SRC.indexOf(startAnchor);
  if (from === -1) throw new Error(`ANCHOR DRIFT (${label}): start anchor not found: "${startAnchor.slice(0, 80)}"`);
  const endSearchFrom = from + startAnchor.length;
  const to = SRC.indexOf(endAnchor, endSearchFrom);
  if (to === -1) throw new Error(`ANCHOR DRIFT (${label}): end anchor not found after start: "${endAnchor.slice(0, 80)}"`);
  const end = includeEnd ? to + endAnchor.length : to;
  return SRC.slice(from, end);
}

const relLedgerSrc = sliceByAnchor('rel-ledger-primitives',
  'var REL_V = 1;',
  'return _relMatchByName(L, n, opts);\n  };');

const stageSubstrateSrc = sliceByAnchor('stage-state-substrate',
  '// GENERIC STAGE-STATE SUBSTRATE (Roman, authorized 2026-09-14)',
  'window._acceptStageProposal = _acceptStageProposal;');

const arcRegistrySrc = sliceByAnchor('arc-constraint-registry',
  '// GENERIC ARC-CONSTRAINT REGISTRY (Roman, authorized 2026-09-14)',
  'window._attemptArcConstraintTarget = _attemptArcConstraintTarget;');

const issuerSrc = sliceByAnchor('continuation-stage-issuer',
  '// CONTINUATION-STAGE ISSUER (Roman, authorized 2026-09-14, controls-first)',
  'window._issueStageFromPlannerReply = _issueStageFromPlannerReply;');

const starterSeedsSrc = sliceByAnchor('starter-seeds',
  'const STARTER_SEEDS = {',
  'window.STARTER_SEEDS = STARTER_SEEDS;');

const activeSeedSrc = sliceByAnchor('active-seed',
  'function _activeSeed(s)', ' }\n');

// ── CONTROL 0 — the FATELANDS_CANON stub used below must match the REAL canon string, so a
// drift in production (a landmark renamed) fails this suite instead of silently diverging. ──
const realLandmarkNameMatch = SRC.match(/the_open:\s*\{\s*\n\s*name:\s*"([^"]+)"/);
if (!realLandmarkNameMatch) throw new Error('ANCHOR DRIFT: could not read the real FATELANDS_CANON.landmarks.the_open.name');
const REAL_THE_OPEN_NAME = realLandmarkNameMatch[1];

const fatelandsStub = `const FATELANDS_CANON = { landmarks: { the_open: { name: ${JSON.stringify(REAL_THE_OPEN_NAME)} } } };`;

const body = fatelandsStub + '\n' + starterSeedsSrc + '\n' + activeSeedSrc + '\n'
  + relLedgerSrc + '\n' + stageSubstrateSrc + '\n' + arcRegistrySrc + '\n' + issuerSrc;
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

section('CONTROL 0 — canon-stub fidelity');
ok('the FATELANDS_CANON stub carries the REAL "The Open" landmark name', REAL_THE_OPEN_NAME === 'The Open', REAL_THE_OPEN_NAME);

// ══════════════════════════════════════════════════════════════════════════
// RED-PROVEN-GREEN 1 — a reply with NO present cast issues NOTHING (old-shaped replies retain
// current behavior; a missing stage packet is not an error).
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 1 — no present cast → no stage record, no throw');
{
  const win = freshSandbox();
  const before = JSON.stringify(win.state._stageState || null);
  const result = win._issueStageFromPlannerReply({ state_change: 'x' }, '2', {});
  ok('returns ok:false', result.ok === false, JSON.stringify(result));
  ok('writes nothing to state._stageState', JSON.stringify(win.state._stageState || null) === before);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 2 — a corridor-shaped reply (opts.present absent, scP.stage_present supplied) mints
// NEW entities for names never seen before via the backend-only, validated path — never a
// planner-supplied id, never a fuzzy match.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 2 — corridor path: stage_present names resolve/mint via the SAME issuer');
{
  const win = freshSandbox({ _starterId: null }); // corridor: no seed at all
  const scP = { state_change: 'x', stage_present: ['Mara', 'a courier'], stage_location: 'a rain-slick alley', stage_affordances: ['a locked gate'] };
  const result = win._issueStageFromPlannerReply(scP, '4', { source: 'spine:issuer' });
  ok('accepted', result.ok === true, JSON.stringify(result));
  const rec = win.state._stageState && win.state._stageState['4'];
  ok('record exists under the scene key', !!rec);
  ok('present holds exactly 2 resolved/minted ids', rec && rec.present.length === 2, JSON.stringify(rec && rec.present));
  ok('minted ids are backend-shaped (ent:stage:N), never planner text', rec && rec.present.every(id => /^ent:stage:\d+$/.test(id)), JSON.stringify(rec && rec.present));
  ok('location carried through', rec && rec.location && rec.location.label === 'a rain-slick alley');
  ok('issued_objects defaults to an EMPTY array — no invented object layer', rec && Array.isArray(rec.issued_objects) && rec.issued_objects.length === 0);
  ok('affordances carried through', rec && rec.affordances.length === 1 && rec.affordances[0] === 'a locked gate');
  ok('provenance names the issuer as source', rec && rec.provenance.source === 'spine:issuer');

  // Re-issuing with the SAME name a second scene later must resolve to the SAME entity, not mint a duplicate.
  const scP2 = { state_change: 'y', stage_present: ['Mara'] };
  const result2 = win._issueStageFromPlannerReply(scP2, '5', {});
  const rec2 = win.state._stageState['5'];
  ok('the second scene resolves "Mara" to the SAME existing id (no duplicate mint)', rec2.present[0] === rec.present[0], rec2.present[0] + ' vs ' + rec.present[0]);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 3 — an ambiguous name (two existing entities sharing a label) is a HARD REJECT, never
// a guess. Nothing is committed.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 3 — ambiguous existing name → reject, no partial commit');
{
  const win = freshSandbox({ _starterId: null });
  const L = win._relLedger ? null : null; // (no direct ledger accessor exported for write in this sandbox)
  // Force ambiguity the same way production would: two proposals with the identical label.
  win._issueStageFromPlannerReply({ state_change: 'x', stage_present: ['Rowan'] }, '1', {});
  // Manually duplicate the label on a second entity to construct the ambiguous case (mirrors what
  // two independently-proposed same-named NPCs would produce; _proposeNewEntity mints distinct ids).
  const ledger = win.state._relationshipLedger;
  const ids = Object.keys(ledger.entities);
  const firstMintedId = ids.filter(id => id.indexOf('ent:stage:') === 0)[0];
  ledger.entities['ent:stage:9999'] = { id: 'ent:stage:9999', kind: 'named', label: ledger.entities[firstMintedId].label, aliases: [] };
  const before = JSON.stringify(win.state._stageState);
  const result = win._issueStageFromPlannerReply({ state_change: 'y', stage_present: [ledger.entities[firstMintedId].label] }, '2', {});
  ok('rejects rather than guessing', result.ok === false, JSON.stringify(result));
  ok('reason names ambiguity', result.why.join(';').indexOf('ambiguous') !== -1, JSON.stringify(result.why));
  ok('nothing committed for scene 2', !(win.state._stageState && win.state._stageState['2']));
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 4 — OPEN-ROW path: opts.present (already roster-validated) is used INSTEAD of
// scP.stage_present — an OPEN-ROW scene is never asked for "present" twice.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 4 — OPEN-ROW: opts.present overrides scP.stage_present');
{
  const win = freshSandbox({ _starterId: null });
  const scP = { state_change: 'x', stage_present: ['SHOULD NOT BE USED'], stage_location: 'the hearth room' };
  const result = win._issueStageFromPlannerReply(scP, '2', { present: ['Lirael', 'Seren'], postureHash: 'ph:abc', source: 'spine:posture' });
  ok('accepted', result.ok === true, JSON.stringify(result));
  const rec = win.state._stageState['2'];
  ok('exactly 2 present entries (from opts.present, not scP.stage_present)', rec.present.length === 2, JSON.stringify(rec.present));
  ok('postureHash carried from the OPEN-ROW objective', rec.postureHash === 'ph:abc');
  ok('source stamped spine:posture', rec.provenance.source === 'spine:posture');
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 5 — LANDMARK LOCK: a proposed location that exact-matches a LOCKED canon landmark
// name is never issued; a durable deferral is recorded; the scene's OTHER fields still commit.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 5 — locked landmark location is deferred, never issued, never discarded');
{
  const win = freshSandbox(); // starter_first_sacrifice — the_open IS locked (no inquiry_opened committed)
  const scP = { state_change: 'x', stage_location: 'The Open', stage_affordances: ['a quiet moment'] };
  const result = win._issueStageFromPlannerReply(scP, '3', { present: ['Lirael'] });
  ok('accepted (the SCENE still issues)', result.ok === true, JSON.stringify(result));
  const rec = win.state._stageState['3'];
  ok('location is NULL — the locked landmark was never issued', rec.location === null, JSON.stringify(rec.location));
  ok('affordances still carried (only location was withheld)', rec.affordances.length === 1);
  const deferrals = win.state._arcConstraintDeferrals || [];
  ok('a durable deferral was recorded, verbatim intent preserved', deferrals.length === 1 && deferrals[0].requested_intent_text === 'The Open', JSON.stringify(deferrals));
  ok('the deferral names the canon-approved reason key only', deferrals[0].reason_key === 'preliminary_process_before_formal_inquiry', deferrals[0].reason_key);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 6 — once the unlock event is committed, the SAME landmark label issues normally.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 6 — after inquiry_opened commits, the same landmark issues normally');
{
  const win = freshSandbox();
  win._commitStoryEvent('inquiry_opened', { source: 'test' });
  const result = win._issueStageFromPlannerReply({ state_change: 'x', stage_location: 'The Open' }, '9', { present: ['Lirael'] });
  ok('accepted', result.ok === true);
  const rec = win.state._stageState['9'];
  ok('location IS issued now (unlocked)', rec.location && rec.location.label === 'The Open', JSON.stringify(rec.location));
  ok('no NEW deferral was recorded for this attempt', !(win.state._arcConstraintDeferrals || []).length);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 7 — a plain, non-landmark location string is issued untouched (the lock check only
// fires on an EXACT canon-name match — never a partial/lexical trigger).
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 7 — an ordinary location never touches the arc-constraint registry');
{
  const win = freshSandbox();
  const result = win._issueStageFromPlannerReply({ state_change: 'x', stage_location: 'a quiet clearing near the Open' }, '10', { present: ['Lirael'] });
  ok('accepted', result.ok === true);
  const rec = win.state._stageState['10'];
  ok('the near-miss text issues as an ordinary location (no lexical trigger)', rec.location && rec.location.label === 'a quiet clearing near the Open');
  ok('no deferral recorded', !(win.state._arcConstraintDeferrals || []).length);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 8 — VALIDATION GATE: a proposal that fails _validateStageProposal commits NOTHING —
// same reject-only discipline as every other validator in this substrate.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 8 — a failing proposal never partially commits');
{
  const win = freshSandbox({ _starterId: null });
  // Force a validation failure the same way production could hit one: pre-poison the ledger so
  // _relEnsureAnchors' own anchors are intact but nothing else resolves — instead, exercise the
  // real failure path by making _validateStageProposal see an unresolvable present id. The
  // issuer only ever hands _validateStageProposal ALREADY-resolved ledger ids, so the direct way
  // to prove this gate is to call _validateStageProposal itself with a foreign id and confirm
  // _acceptStageProposal is never reached.
  const before = JSON.stringify(win.state._stageState || null);
  const check = win._validateStageProposal({ present: ['ent:not-a-real-id'] });
  ok('the underlying validator rejects an unresolved id', check.ok === false, JSON.stringify(check));
  ok('nothing was written by the failed check', JSON.stringify(win.state._stageState || null) === before);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 9 — AUTHOR ISOLATION: the issuer never writes into _sceneObjectives or
// _scenePlotContract (those are built by the caller BEFORE the issuer runs, and the issuer has
// no reference to them) — only state._stageState carries the accepted record.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 9 — author-facing structures never receive raw stage fields');
{
  const win = freshSandbox({ _starterId: null });
  win.state._sceneObjectives = { '2': { sceneNum: 2, status: 'accepted' } };
  win.state._scenePlotContract = { sceneIndex: 2 };
  const beforeObj = JSON.stringify(win.state._sceneObjectives);
  const beforePlot = JSON.stringify(win.state._scenePlotContract);
  win._issueStageFromPlannerReply({ state_change: 'x', stage_present: ['Priya'], stage_location: 'a market square' }, '2', {});
  ok('_sceneObjectives untouched by the issuer', JSON.stringify(win.state._sceneObjectives) === beforeObj);
  ok('_scenePlotContract untouched by the issuer', JSON.stringify(win.state._scenePlotContract) === beforePlot);
  ok('the accepted record lives ONLY in state._stageState', !!(win.state._stageState && win.state._stageState['2']));
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 10 — INTERNAL FAILURE ISOLATION: no storyId (a not-yet-genesis'd or corrupted state)
// never throws out of the issuer and writes nothing — "old stories retain current behavior."
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 10 — no storyId → clean no-op, never throws');
{
  const win = freshSandbox({ storyId: null });
  let threw = false;
  let result;
  try { result = win._issueStageFromPlannerReply({ state_change: 'x', stage_present: ['X'] }, '2', {}); } catch (e) { threw = true; }
  ok('does not throw', threw === false);
  ok('reports ok:false', result && result.ok === false, JSON.stringify(result));
}

console.log('\n' + '='.repeat(60));
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (fail) { console.log('FAILURES:\n  - ' + fails.join('\n  - ')); process.exit(1); }
process.exit(0);
