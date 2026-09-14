#!/usr/bin/env node
// _stage_issuer_budget_control.mjs
//
// OFFLINE control suite for the stage-directive BUDGET SAFEGUARD (Roman, authorized 2026-09-14):
// the stage directive shares the single _SPINE_MAX_CHARS=2200 continuity-spine budget with
// durable consequences, reader posture/history and the header/footer lines. Proves one of two
// explicit outcomes for a maximum valid stage packet: (a) the complete ordered stage directive
// plus higher-priority continuity material fits the budget, or (b) _validateStageProposal
// rejects/caps it before commit with a named reason — NEVER a silent truncation of any accepted
// stage fact, object, exclusion, ownership field, posture, or durable consequence.
//
// Loads the REAL, unmodified _buildContinuitySpineBlock / _renderStageDirectiveText /
// _buildCurrentStageDirective / _validateStageProposal / _acceptStageProposal /
// _computeDisambiguators / entity-ledger primitives by anchor-bounded slice of public/app.js.
// _sceneLedgerGet / _resolvePcIdentity / _currentSceneNumber / _buildDurableFateConsequenceDirective
// are NOT extracted (their own correctness is covered elsewhere, out of scope for a budget-
// priority control) — this harness supplies minimal, shape-faithful stand-ins with CONTROLLED,
// injectable output, which is what a budget-priority test needs: known sizes, not their own logic.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_PATH = path.join(__dirname, 'public/app.js');
const SRC = fs.readFileSync(APP_PATH, 'utf8');

function sliceByAnchor(label, startAnchor, endAnchor) {
  const from = SRC.indexOf(startAnchor);
  if (from === -1) throw new Error(`ANCHOR DRIFT (${label}): start anchor not found: "${startAnchor.slice(0, 80)}"`);
  const to = SRC.indexOf(endAnchor, from + startAnchor.length);
  if (to === -1) throw new Error(`ANCHOR DRIFT (${label}): end anchor not found after start: "${endAnchor.slice(0, 80)}"`);
  return SRC.slice(from, to + endAnchor.length);
}

const spineConstantsSrc = sliceByAnchor('spine-constants',
  'var _SPINE_RECENT = 6, _SPINE_MAX_CHARS = 2200;',
  "return t ? t.slice(0, n) : null; }");

const spineBlockSrc = sliceByAnchor('continuity-spine-block',
  'function _buildContinuitySpineBlock(s, opts) {',
  'window._buildContinuitySpineBlock = _buildContinuitySpineBlock;\n  } } catch (_) {}');

const relLedgerSrc = sliceByAnchor('rel-ledger-primitives',
  'var REL_V = 1;',
  'return _relMatchByName(L, n, opts);\n  };');

const stageSubstrateSrc = sliceByAnchor('stage-state-substrate',
  '// GENERIC STAGE-STATE SUBSTRATE (Roman, authorized 2026-09-14)',
  'window._acceptStageProposal = _acceptStageProposal;');

const deliverySrc = sliceByAnchor('render-and-current-stage-directive',
  'function _renderStageDirectiveText(rec) {',
  'window._buildCurrentStageDirective = _buildCurrentStageDirective;');

// Shape-faithful stand-ins for the dependencies this control deliberately does NOT extract —
// controlled, injectable output; their own correctness is out of scope here.
const stubsSrc = `
  var __durableStub = '';
  function _buildDurableFateConsequenceDirective() { return __durableStub; }
  function _sceneLedgerGet(s, create) { return { entries: (s && s.__testEntries) || [] }; }
  function _sceneLedgerStamp() {} function _sceneLedgerCommit() {} function _sceneLedgerRestamp() {}
  function _resolvePcIdentity(s) { return { v: 'Lirael' }; }
  function _currentSceneNumber(s) { return (s && s.__testSceneNumber) || 5; }
`;

const body = stubsSrc + '\n' + spineConstantsSrc + '\n' + spineBlockSrc + '\n'
  + relLedgerSrc + '\n' + stageSubstrateSrc + '\n' + deliverySrc;
const factory = new Function('window', body);

function freshSandbox(overrides) {
  const win = { state: Object.assign({ storyId: 's1' }, overrides || {}) };
  factory(win);
  return win;
}

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

function makeLedger(entities) {
  return { v: 1, storyId: 's1', processed: {}, seq: Object.keys(entities).length, entities, edges: {} };
}
function historyEntries(n, opts) {
  opts = opts || {};
  const out = [];
  for (let i = 1; i <= n; i++) {
    out.push({ sceneNumber: i, issue: 1, act: (opts.actText || 'walked across the room and said nothing at all for a long moment') + ' (' + i + ')', dia: (opts.diaText || 'I do not know what to say to you right now, truly') + ' (' + i + ')' });
  }
  return out;
}

// A "maximum valid" stage packet: every field populated generously (multiple present entities,
// several issued facts, several issued objects each with ownership + addressable-by, several
// affordances, exclusions) — everything _validateStageProposal's referential checks accept today
// (no pre-existing count cap), which is exactly the adversarial case this safeguard must handle.
function maxValidProposal(entityIds) {
  return {
    present: entityIds,
    location: { label: 'the long colonnade outside the assembly hall, rain just beginning to fall on the old stone' },
    issued_facts: [
      'the crowd has not yet dispersed from the formal assembly that just concluded',
      'Julian still holds the Answer visibly at his belt, in full view of everyone present',
      'the presiding Dohkar has been sent for but has not yet arrived at the colonnade',
      'word of the accusation has already reached the outer courtyard through whispered relay',
      'the sealed ledger of names remains open on the table inside, unattended'
    ],
    issued_objects: entityIds.slice(0, 3).map((id, i) => ({
      label: 'a ceremonial object #' + (i + 1) + ', heavy with old symbolism and formally significant to the rite',
      kind: 'relic', owner_or_caretaker_ref: id, addressable_by: entityIds
    })),
    affordances: [
      'the colonnade steps lead back down toward the Veilwood treeline',
      'the side door into the assembly hall stands unlatched and unwatched',
      'the bell-rope for summoning the Dohkar hangs within reach, untouched'
    ],
    exclusions: { locations: ['the Open'], objects: ['the Answer itself, still Julian\'s to hold'] }
  };
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 1 — a maximum valid stage packet with NO competing durable/history content: proves
// outcome (a), fits comfortably.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 1 — max valid packet, minimal competing content: fits (outcome a)');
{
  const win = freshSandbox();
  win.state._relationshipLedger = makeLedger({
    pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Lirael', aliases: [] },
    'ent:stage:1': { id: 'ent:stage:1', kind: 'named', label: 'Julian', aliases: [] },
    'ent:stage:2': { id: 'ent:stage:2', kind: 'named', label: 'the presiding Dohkar', aliases: [] }
  });
  const proposal = maxValidProposal(['pc', 'ent:stage:1', 'ent:stage:2']);
  const check = win._validateStageProposal(proposal);
  ok('the maximum valid packet is ACCEPTED (outcome a: fits within budget)', check.ok === true, JSON.stringify(check.why));
  if (check.ok) {
    const accepted = win._acceptStageProposal('3', proposal);
    ok('commit succeeds', accepted.ok === true);
    const rendered = win._buildCurrentStageDirective(win.state);
    ok('every issued fact survives intact in the delivered directive', proposal.issued_facts.every(f => rendered.indexOf(f) !== -1));
    ok('every issued object label survives intact', proposal.issued_objects.every(o => rendered.indexOf(o.label) !== -1));
    ok('every exclusion survives intact', rendered.indexOf('the Open') !== -1 && rendered.indexOf('the Answer itself') !== -1);
    const full = win._buildContinuitySpineBlock(win.state);
    ok('the full continuity-spine block (with this stage) stays within the shared budget', full.length <= 2200, full.length + ' chars');
  }
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 2 — the SAME max valid packet, but with heavy competing durable consequences AND a
// full 6-page history window already present. Proves the priority order: durable is NEVER
// truncated, the stage is NEVER truncated (only fully accepted or rejected), and history is what
// degrades.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 2 — max valid packet vs heavy durable consequences + full history: priority holds');
{
  const win = freshSandbox();
  win.state._relationshipLedger = makeLedger({
    pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Lirael', aliases: [] },
    'ent:stage:1': { id: 'ent:stage:1', kind: 'named', label: 'Julian', aliases: [] },
    'ent:stage:2': { id: 'ent:stage:2', kind: 'named', label: 'the presiding Dohkar', aliases: [] }
  });
  // Heavy but realistic durable-consequence text (simulating several accumulated Fate tolls).
  win.__durableStubOverride = null;
  const durableText = '\nDURABLE CONSEQUENCES ALREADY IN FORCE (never reversed, never re-argued):\n'
    + '  • the first toll: a permanent mark on her left palm, visible to anyone who looks\n'
    + '  • the second toll: Seren no longer trusts her word in front of the assembly\n'
    + '  • the third toll: the Institution has opened a formal inquiry file in her name\n';
  // Inject the durable stub's output for this sandbox instance.
  win.state.__testEntries = historyEntries(6);
  win.state.__testSceneNumber = 9;
  // Monkey-patch the stub durable function on THIS window to return the heavy text (the stub is a
  // plain function on the sandbox's own scope; re-assigning window-level export reaches it since
  // _buildContinuitySpineBlock reads the bare `_buildDurableFateConsequenceDirective` name inside
  // the SAME factory-evaluated closure, which closes over the function declared in stubsSrc — so
  // instead we rebuild a sandbox whose stub source embeds the heavy text directly).
  const win2 = (() => {
    const heavyStubsSrc = `
      var __durableStub = ${JSON.stringify(durableText)};
      function _buildDurableFateConsequenceDirective() { return __durableStub; }
      function _sceneLedgerGet(s, create) { return { entries: (s && s.__testEntries) || [] }; }
      function _sceneLedgerStamp() {} function _sceneLedgerCommit() {} function _sceneLedgerRestamp() {}
      function _resolvePcIdentity(s) { return { v: 'Lirael' }; }
      function _currentSceneNumber(s) { return (s && s.__testSceneNumber) || 5; }
    `;
    const heavyBody = heavyStubsSrc + '\n' + spineConstantsSrc + '\n' + spineBlockSrc + '\n'
      + relLedgerSrc + '\n' + stageSubstrateSrc + '\n' + deliverySrc;
    const heavyFactory = new Function('window', heavyBody);
    const w = { state: { storyId: 's1', __testEntries: historyEntries(6), __testSceneNumber: 9 } };
    heavyFactory(w);
    return w;
  })();
  win2.state._relationshipLedger = makeLedger({
    pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Lirael', aliases: [] },
    'ent:stage:1': { id: 'ent:stage:1', kind: 'named', label: 'Julian', aliases: [] },
    'ent:stage:2': { id: 'ent:stage:2', kind: 'named', label: 'the presiding Dohkar', aliases: [] }
  });
  const proposal = maxValidProposal(['pc', 'ent:stage:1', 'ent:stage:2']);
  const check = win2._validateStageProposal(proposal);
  console.log('  verdict: ' + (check.ok ? 'ACCEPTED (outcome a — fits)' : 'REJECTED (outcome b — named reason)'));
  if (check.ok) {
    // OUTCOME (a): prove it genuinely fits, with durable + at least some history still present.
    win2._acceptStageProposal('9', proposal);
    const full = win2._buildContinuitySpineBlock(win2.state);
    ok('fits the shared budget', full.length <= 2200, full.length + ' chars');
    ok('durable consequences text is present, UNTRUNCATED', full.indexOf('the third toll: the Institution has opened a formal inquiry file in her name') !== -1, full);
    ok('the full stage directive is present, UNTRUNCATED (last issued fact intact)', full.indexOf('the sealed ledger of names remains open on the table inside, unattended') !== -1, full);
    ok('at least the NOW line survives', full.indexOf('NOW: page') !== -1);
  } else {
    // OUTCOME (b): the rejection must name the budget as the reason, not a generic failure.
    ok('the rejection reason explicitly names the continuity-spine delivery budget', check.why.some(w => /continuity-spine delivery budget/.test(w)), JSON.stringify(check.why));
    ok('no partial record was committed on rejection', !(win2.state._stageState && win2.state._stageState['9']));
  }
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 3 — PRIORITY UNDER PRESSURE, directly: durable consequences are LARGE enough alone that
// history must degrade to make room. Proves history (oldest-first) is what shrinks, never durable,
// never the stage, and the most RECENT history entry (carrying the reader's own current posture)
// survives longest.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 3 — under real pressure, history degrades oldest-first; durable/stage/current-posture protected');
{
  const heavyDurable = '\nDURABLE CONSEQUENCES ALREADY IN FORCE:\n' + Array.from({ length: 8 }, (_, i) =>
    '  • toll #' + (i + 1) + ': a lasting, specific, named consequence that must never be reversed or re-argued, described at real length so this block alone consumes a meaningful share of the shared budget'
  ).join('\n') + '\n';
  const heavyStubsSrc = `
    var __durableStub = ${JSON.stringify(heavyDurable)};
    function _buildDurableFateConsequenceDirective() { return __durableStub; }
    function _sceneLedgerGet(s, create) { return { entries: (s && s.__testEntries) || [] }; }
    function _sceneLedgerStamp() {} function _sceneLedgerCommit() {} function _sceneLedgerRestamp() {}
    function _resolvePcIdentity(s) { return { v: 'Lirael' }; }
    function _currentSceneNumber(s) { return (s && s.__testSceneNumber) || 5; }
  `;
  const heavyBody = heavyStubsSrc + '\n' + spineConstantsSrc + '\n' + spineBlockSrc + '\n'
    + relLedgerSrc + '\n' + stageSubstrateSrc + '\n' + deliverySrc;
  const win = { state: { storyId: 's1' } };
  new Function('window', heavyBody)(win);
  win.state._relationshipLedger = makeLedger({ pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Lirael', aliases: [] } });
  win.state.__testSceneNumber = 12;
  // 6 history entries, each distinctly numbered/markered so we can tell exactly which survive.
  win.state.__testEntries = historyEntries(6, { actText: 'MARKER-OLD-FILLER-TEXT-PADDED-OUT-TO-BE-REALISTIC-LENGTH', diaText: 'MARKER-OLD-FILLER-DIALOGUE-PADDED-OUT-TO-BE-REALISTIC-LENGTH' });
  // Overwrite the LAST (most recent / current-turn) entry with a distinctive, checkable marker.
  win.state.__testEntries[5] = { sceneNumber: 6, issue: 1, act: 'MARKER-CURRENT-TURN-POSTURE-ACT', dia: 'MARKER-CURRENT-TURN-POSTURE-DIA' };

  const full = win._buildContinuitySpineBlock(win.state);
  ok('stays within the shared budget even under real pressure', full.length <= 2200, full.length + ' chars');
  ok('durable consequences text is COMPLETE, all 8 tolls present, none truncated', Array.from({ length: 8 }, (_, i) => 'toll #' + (i + 1)).every(t => full.indexOf(t) !== -1), full.length);
  ok('the CURRENT TURN posture (most recent entry) survived', full.indexOf('MARKER-CURRENT-TURN-POSTURE-ACT') !== -1 && full.indexOf('MARKER-CURRENT-TURN-POSTURE-DIA') !== -1, full);
  const oldMarkerCount = (full.match(/MARKER-OLD-FILLER-TEXT/g) || []).length;
  ok('at least one OLDER entry was dropped to protect durable consequences (oldest-first degradation actually fired)', oldMarkerCount < 5, 'older markers remaining: ' + oldMarkerCount);
  ok('the "N earlier not listed" note appears when entries were dropped', oldMarkerCount < 5 ? /earlier not listed/.test(full) : true, full);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 4 — a genuinely oversized stage proposal (deliberately excessive, beyond anything a real
// planner reply would produce) against a budget with NO room left at all (durable consequences
// alone consume the whole allowance). Proves the hard-reject path fires with a named reason and
// commits nothing.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 4 — genuinely oversized packet, zero headroom: hard reject, named reason, no commit');
{
  const hugeDurable = '\nDURABLE CONSEQUENCES:\n' + Array.from({ length: 30 }, (_, i) =>
    '  • toll #' + i + ': ' + 'x'.repeat(40)
  ).join('\n') + '\n'; // alone consumes nearly the entire 2200-char budget
  const heavyStubsSrc = `
    var __durableStub = ${JSON.stringify(hugeDurable)};
    function _buildDurableFateConsequenceDirective() { return __durableStub; }
    function _sceneLedgerGet(s, create) { return { entries: [] }; }
    function _sceneLedgerStamp() {} function _sceneLedgerCommit() {} function _sceneLedgerRestamp() {}
    function _resolvePcIdentity(s) { return { v: 'Lirael' }; }
    function _currentSceneNumber(s) { return 20; }
  `;
  const heavyBody = heavyStubsSrc + '\n' + spineConstantsSrc + '\n' + spineBlockSrc + '\n'
    + relLedgerSrc + '\n' + stageSubstrateSrc + '\n' + deliverySrc;
  const win = { state: { storyId: 's1' } };
  new Function('window', heavyBody)(win);
  win.state._relationshipLedger = makeLedger({
    pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Lirael', aliases: [] },
    'ent:stage:1': { id: 'ent:stage:1', kind: 'named', label: 'Julian', aliases: [] }
  });
  const proposal = maxValidProposal(['pc', 'ent:stage:1']);
  const check = win._validateStageProposal(proposal);
  ok('a proposal that cannot possibly fit is REJECTED', check.ok === false, JSON.stringify(check));
  ok('the reason explicitly names the continuity-spine delivery budget', check.why.some(w => /continuity-spine delivery budget/.test(w)), JSON.stringify(check.why));
  const before = JSON.stringify(win.state._stageState || null);
  const accepted = win._acceptStageProposal('20', proposal);
  ok('commit is refused too (validate-then-accept discipline holds)', accepted.ok === false);
  ok('nothing was written', JSON.stringify(win.state._stageState || null) === before);
  // And durable consequences themselves remain intact and reachable — the rejection protected
  // them rather than letting a bad stage crowd them out and THEN fail messily downstream.
  const coreOnly = win._buildContinuitySpineBlock(win.state, { includeStage: false });
  ok('durable consequences alone (no stage committed) still render intact', coreOnly.indexOf('toll #0') !== -1 && coreOnly.indexOf('toll #29') !== -1, coreOnly.length);
}

// ══════════════════════════════════════════════════════════════════════════
// CONTROL 5 — includeStage:false genuinely excludes the stage from the measurement (no recursion,
// no accidental inclusion) — the mechanism _validateStageProposal's budget check depends on.
// ══════════════════════════════════════════════════════════════════════════
section('CONTROL 5 — includeStage:false measurement excludes the stage cleanly');
{
  const win = freshSandbox();
  win.state._relationshipLedger = makeLedger({ pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Lirael', aliases: [] } });
  win.state._stageState = {
    '1': { v: 1, storyId: 's1', issueId: 1, sceneKey: '1', status: 'accepted', location: { label: 'A DISTINCTIVE LOCATION MARKER' }, present: ['pc'], present_disambiguators: {}, issued_facts: [], issued_objects: [], affordances: [], exclusions: { locations: [], objects: [] }, provenance: { source: 'test' }, lifecycle: { issuedAt: Date.now(), supersededAt: null, closedAt: null, closedReason: null } }
  };
  const withStage = win._buildContinuitySpineBlock(win.state);
  const withoutStage = win._buildContinuitySpineBlock(win.state, { includeStage: false });
  ok('with the stage included, the marker is present', withStage.indexOf('A DISTINCTIVE LOCATION MARKER') !== -1);
  ok('with includeStage:false, the marker is ABSENT', withoutStage.indexOf('A DISTINCTIVE LOCATION MARKER') === -1);
  ok('includeStage:false output is strictly shorter', withoutStage.length < withStage.length);
}

console.log('\n' + '='.repeat(60));
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (fail) { console.log('FAILURES:\n  - ' + fails.join('\n  - ')); process.exit(1); }
process.exit(0);
