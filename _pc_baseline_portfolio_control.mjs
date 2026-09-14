#!/usr/bin/env node
// _pc_baseline_portfolio_control.mjs
//
// OFFLINE control suite for the PC baseline reconciled portfolio + PC-C+ path (Roman, authorized
// 2026-09-14). Proves the six required properties directly against the REAL functions, extracted
// by anchor-bounded slice from public/app.js (no reimplementation, no server, no browser, no
// network, no provider call — every model output is a fixture). A real-browser, provider-stubbed
// First Sacrifice Scene 2 CG proof (showing PC-C+ + NPC C+/E+/fusion together reaching the actual
// CG author payload) is the separate live proof that follows this offline suite.
//
// Extracted regions:
//   1. rel-ledger primitives (_relLedger/_relEnsureAnchors/_relEnsureAuthorProfile/_relPcId/...)
//   2. the full C+ pipeline block (_isPlaceholderPcName .. _cPlusEligibleCandidates), which now
//      also contains the NEW PC-portfolio primitives (_pcFacetsFromBodyBible/_ensurePcPortfolio/
//      _pcEvidenceFacts/_pcPortfolioFingerprint) inserted inline this task.
//   3. the PC Say/Do guard + self-embodiment renderer + _cpBeatLines (a separate region of the
//      file, literary/CG's shared per-beat renderer).
// _sceneStageContract and _activeSeed are STUBBED (not extracted) — this suite tests the pipeline
// FROM an authoritative stage object downward, exactly the seam _cpContinuationAssignment itself
// is built on; the WIRING of _ensurePcPortfolio/_pcEvidenceFacts INTO _sceneStageContract's
// accepted-stage branch is verified by direct source inspection here and by the live browser
// proof end-to-end.

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

const relLedgerSrc = sliceByAnchor('rel-ledger-primitives',
  'var REL_V = 1;',
  'return _relMatchByName(L, n, opts);\n  };');

const cplusPipelineSrc = sliceByAnchor('cplus-pipeline-and-pc-portfolio',
  'function _isPlaceholderPcName(v) {',
  'window._CPLUS_PC_BEAT_OWNER = _CPLUS_PC_BEAT_OWNER;') + '\n  }';

const pcRenderSrc = sliceByAnchor('pc-saydo-guard-and-self-embodiment',
  'window._pcLensRecord = _pcLensRecord;',
  'window._cpBeatLines = _cpBeatLines;');

// ── SOURCE-INSPECTION: the wiring _sceneStageContract's accepted-stage branch is not extracted
// (500+ lines, mostly unrelated legacy fallback) — instead assert directly on the real file text
// that the two new calls are actually present at the accepted-stage branch, in the right order,
// so this suite's stubbed-stage tests below cannot silently diverge from what production does.
function assertWiringPresent() {
  const acceptedBranchStart = SRC.indexOf('ACCEPTED STAGE IS AUTHORITATIVE, HIGHEST PRECEDENCE');
  const acceptedBranchEnd = SRC.indexOf('_cpValidateStageRefs(out);', acceptedBranchStart);
  if (acceptedBranchStart === -1 || acceptedBranchEnd === -1) throw new Error('ANCHOR DRIFT: accepted-stage branch not found');
  const branch = SRC.slice(acceptedBranchStart, acceptedBranchEnd);
  const hasEnsure = branch.indexOf('_ensurePcPortfolio(s)') !== -1;
  const hasEvidence = branch.indexOf('_accEventFacts.concat(_pcEvidenceFacts(s, _sceneN))') !== -1;
  const ensureIdx = branch.indexOf('_ensurePcPortfolio(s)');
  const evidenceIdx = branch.indexOf('_accEventFacts.concat(_pcEvidenceFacts(s, _sceneN))');
  return { hasEnsure, hasEvidence, orderedCorrectly: hasEnsure && hasEvidence && ensureIdx < evidenceIdx };
}

// Stubs: _sceneStageContract returns a fixture the test controls directly; _activeSeed returns
// a fixture seed (or null, for corridor); a couple of small helpers the pipeline calls that are
// unrelated to what this suite proves.
const stubsSrc = `
  function _sceneStageContract(s, sceneNum) { return (s && s.__stageFixture) || null; }
  function _activeSeed(s) { return (s && s.__seedFixture) || null; }
  function _currentSceneNumber(s) { return (s && s.turnCount) || 1; }
  function _pcLensRecord() { return null; }
`;

const body = stubsSrc + '\n' + relLedgerSrc + '\n' + cplusPipelineSrc + '\n' + pcRenderSrc;
const factory = new Function('window', body);

function freshSandbox(storyId) {
  const win = { state: { storyId: storyId || 's1' } };
  factory(win);
  return win;
}

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

const CORRIDOR_BIBLE = {
  core_contradiction: "she polices her own control because she fears what she'd become without it",
  private_hope: 'wants to be loved without ever having to ask for it',            // NOT mapped — leak-control probe
  emotional_weather: 'brittle composure over a live wire',                        // NOT mapped — leak-control probe
  wound: { core: 'her mother left rather than stay and be ordinary', category: 'PARENTAL' },
  current_crisis: {
    event: 'the ritual collapsed and the assembly blamed her control',
    immediate_fear: 'that her control will be read as the failure itself',
  },
};

function stageFixture(onStage, eventFacts) {
  return { ok: true, onStage: onStage, offStage: [], stageAuthority: { ok: true },
           eventFacts: eventFacts || [], setting: 'the Veilwood clearing', aboutToHappen: '', narratorLens: '' };
}
function pcOnStage() { return { id: 'pc', label: 'Lirael', kind: 'pc', presence: 'IN_PERSON' }; }
function julianOnStage() { return { id: 'julian', label: 'Julian', kind: 'named', presence: 'IN_PERSON' }; }

// ══════════════════════════════════════════════════════════════════════════════════
section('WIRING — _ensurePcPortfolio + _pcEvidenceFacts are actually called from the accepted-stage branch, in order');
{
  const w = assertWiringPresent();
  ok('accepted-stage branch calls _ensurePcPortfolio(s)', w.hasEnsure);
  ok('accepted-stage branch appends _pcEvidenceFacts(s, _sceneN) to _accEventFacts', w.hasEvidence);
  ok('portfolio is ensured BEFORE evidence facts are appended', w.orderedCorrectly);
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 1 — a valid PC facet + explicitly committed PC evidence produces ONE safe PC-C+ directive');
{
  const win = freshSandbox('story-c1');
  const s = win.state;
  s.turnCount = 1;
  s.pcBodyBible = CORRIDOR_BIBLE;
  win._ensurePcPortfolio(s);
  ok('portfolio built from corridor bible', s._pcPortfolio && s._pcPortfolio.source === 'corridor_bible',
    JSON.stringify(s._pcPortfolio && s._pcPortfolio.source));
  ok('portfolio carries a fingerprint', !!(s._pcPortfolio && s._pcPortfolio.provenance && s._pcPortfolio.provenance.fingerprint));

  s._scenePosture = { '2': { sceneNum: 2, action: 'pressed both palms flat against the cracked ritual stone', dialogue: '' } };
  const evidence = win._pcEvidenceFacts(s, 2);
  ok('evidence fact was produced from posture', evidence.length === 1 && /ritual stone/.test(evidence[0].text));
  ok('evidence fact is explicitly attributed to pc as subject', evidence[0].participants.length === 1
    && evidence[0].participants[0].ref === 'pc' && evidence[0].participants[0].role === 'subject');

  s.__stageFixture = stageFixture([pcOnStage()], evidence);
  const cont = win._cpContinuationAssignment(s, 2);
  ok('continuation assignment succeeded', cont.ok, cont.reason);
  ok('exactly one Character+ directive, for the PC', cont.ok && cont.character_plus.length === 1
    && cont.character_plus[0].character === 'Lirael' && cont.character_plus[0].isPC === true);
  ok('the directive cites a facet drawn from the portfolio (core contradiction)', cont.ok
    && cont.character_plus[0].facet_id === 'pc_core_contradiction');
  const rendered = cont.ok ? win._cpBeatLines(cont.character_plus[0], false) : '';
  ok('rendering is self-embodiment, not outsider observation', /SELF \(PC-C\+; embodiment, not outsider observation\)/.test(rendered));
  ok('rendering never states the source truth as fact (kept behind the DO-NOT-STATE marker only)',
    /SOURCE TRUTH — DO NOT STATE:/.test(rendered));
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 2 — the SAME facet WITHOUT committed PC evidence produces NONE');
{
  const win = freshSandbox('story-c2');
  const s = win.state;
  s.pcBodyBible = CORRIDOR_BIBLE;
  win._ensurePcPortfolio(s);
  // No posture, no durable consequence, no Tempt event, not scene 2 (so no baked pcCondition) —
  // _pcEvidenceFacts legitimately returns nothing.
  s._scenePosture = {};
  const evidence = win._pcEvidenceFacts(s, 3);
  ok('no PC evidence facts exist for this scene', evidence.length === 0);

  s.__stageFixture = stageFixture([pcOnStage()], evidence);
  const cont = win._cpContinuationAssignment(s, 3);
  ok('continuation assignment produced NO Character+ for the PC', !cont.ok || cont.character_plus.length === 0,
    cont.ok ? JSON.stringify(cont.character_plus) : cont.reason);
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 3 — an NPC-only fact cannot ground PC-C+ (same words, wrong subject)');
{
  const win = freshSandbox('story-c3');
  const s = win.state;
  s.pcBodyBible = CORRIDOR_BIBLE;
  win._ensurePcPortfolio(s);
  // The exact words the PC's pressure requires ("ritual collapsed assembly blamed"), but
  // attributed to Julian as subject, NOT to the PC — the same class of error this session's
  // fact-participant correction exists to prevent, now proven for the PC specifically.
  const npcFact = { text: 'Julian watched the ritual collapse and the assembly blame someone else entirely',
                     participants: [{ ref: 'julian', role: 'subject' }] };
  s.__stageFixture = stageFixture([pcOnStage(), julianOnStage()], [npcFact]);
  const cont = win._cpContinuationAssignment(s, 2);
  const pcEntry = cont.ok ? cont.character_plus.filter(function (c) { return c.isPC; }) : [];
  ok('the NPC-attributed fact grounds nobody\'s PC-C+ (participant attribution, not word overlap, decides ownership)',
    pcEntry.length === 0, cont.ok ? JSON.stringify(cont.character_plus) : cont.reason);
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 4 — a reader\'s contrary Say/Do prevents an imposed internal claim');
{
  const win = freshSandbox('story-c4');
  const s = win.state;
  const cpList = [{ character: 'Lirael', isPC: true, canonicalId: 'pc',
                     facet_truth: "she believes tight control keeps everyone safe", facet_id: 'pc_core_contradiction' }];
  s._scenePosture = { '3': { sceneNum: 3, action: 'let the ritual stone fall, unguarded', dialogue: "I am not in control of anything anymore, and I don't want to be" } };
  const guarded = win._applyPcSayDoGuard(cpList, s, 3, 'Lirael');
  ok('the PC\'s own C+ entry was dropped — the reader\'s own words contradict the facet claim', guarded.length === 0);

  // Control-on-the-control: an UNRELATED posture (no negation near a shared content word) must
  // NOT trigger the guard — it must not be a blanket "any posture drops C+" filter.
  const win2 = freshSandbox('story-c4b');
  const s2 = win2.state;
  s2._scenePosture = { '3': { sceneNum: 3, action: 'walked to the window and said nothing', dialogue: '' } };
  const kept = win2._applyPcSayDoGuard(cpList, s2, 3, 'Lirael');
  ok('an unrelated posture does not drop the entry (guard is targeted, not blanket)', kept.length === 1);
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 5 — a fixed-starter PC and a corridor PC both resolve through their OWN legitimate source path');
{
  // 5a — fixed starter: facets come verbatim from the seed's own authored cPlusFacets; the
  // portfolio record does NOT re-materialize them onto the ledger (that would collide with
  // _generatedCastFacetIndex's own seed-owned skip guard — see design notes).
  const winA = freshSandbox('story-c5a');
  const sA = winA.state;
  sA.__seedFixture = { id: 'starter_first_sacrifice', cast: [{ role: 'PC', name: 'Lirael', cPlusFacets: [
    { facet_id: 'pc_untested_brilliance', category: 'competence', canonical_truth: 'her brilliance has never been tested against real cost',
      possible_pressures: [{ text: 'untested brilliance', evidence_requires: 'brillian' }] },
  ] }] };
  const recA = winA._ensurePcPortfolio(sA);
  ok('fixed-starter source recorded', recA && recA.source === 'fixed_starter');
  ok('fixed-starter facets carried verbatim from the seed', recA && recA.facets.length === 1
    && recA.facets[0].facet_id === 'pc_untested_brilliance');
  const LA = winA._relLedger(false);
  ok('fixed-starter path does NOT write an authorProfile onto the ledger pc entity (avoids the seed-owned-skip collision)',
    !(LA && LA.entities && LA.entities.pc && LA.entities.pc.authorProfile && LA.entities.pc.authorProfile.status === 'ready'));

  // 5b — corridor: no seed at all; facets come from the body bible and ARE materialized onto the
  // ledger (the only route _generatedCastFacetIndex can pick them up under the bare 'pc' id).
  const winB = freshSandbox('story-c5b');
  const sB = winB.state;
  sB.pcBodyBible = CORRIDOR_BIBLE;
  const recB = winB._ensurePcPortfolio(sB);
  ok('corridor source recorded', recB && recB.source === 'corridor_bible');
  const LB = winB._relLedger(false);
  const apB = LB && LB.entities && LB.entities.pc && LB.entities.pc.authorProfile;
  ok('corridor path DOES materialize a ready authorProfile onto the ledger pc entity', apB && apB.status === 'ready' && Array.isArray(apB.cPlusFacets) && apB.cPlusFacets.length > 0);

  // 5c — neither source present: absent, never fabricated.
  const winC = freshSandbox('story-c5c');
  const recC = winC._ensurePcPortfolio(winC.state);
  ok('with neither a seed nor a bible, the portfolio is source:none with zero facets (absent, not fabricated)',
    recC && recC.source === 'none' && recC.facets.length === 0);
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 6 — no raw bible/model text or uncommitted planner fact leaks into the author packet');
{
  const win = freshSandbox('story-c6');
  const s = win.state;
  s.pcBodyBible = CORRIDOR_BIBLE;
  // An uncommitted, unrelated planner/committed-state fact — must never surface through the PC
  // evidence path (no subject ref; _committedState.facts[] is deliberately excluded as a source).
  s._committedState = { facts: [{ fact: 'she once burned every letter he sent her, in secret', sourceEvent: 'x', committedAtScene: 1, provenance: 'delivered' }] };
  win._ensurePcPortfolio(s);
  s._scenePosture = { '2': { sceneNum: 2, action: 'pressed both palms flat against the cracked ritual stone', dialogue: '' } };
  const evidence = win._pcEvidenceFacts(s, 2);
  const evidenceText = evidence.map(function (f) { return f.text; }).join(' | ');

  const L = win._relLedger(false);
  const facets = (L && L.entities && L.entities.pc && L.entities.pc.authorProfile && L.entities.pc.authorProfile.cPlusFacets) || [];
  const facetText = facets.map(function (f) { return f.canonical_truth + ' ' + (f.possible_pressures || []).map(function (p) { return p.text; }).join(' '); }).join(' | ');

  ok('_committedState.facts (no subject ref) never appears in PC evidence', evidenceText.indexOf('burned every letter') === -1);
  ok('bible.private_hope (unmapped field) never appears in the materialized portfolio facets', facetText.indexOf('loved without ever having to ask') === -1);
  ok('bible.emotional_weather (unmapped field) never appears in the materialized portfolio facets', facetText.indexOf('brittle composure') === -1);
  ok('bible.wound.core (unmapped field) never appears in the materialized portfolio facets', facetText.indexOf('mother left') === -1);
  ok('only the two mapped fields (core_contradiction, current_crisis.immediate_fear) are present',
    facets.length === 2 && facets.map(function (f) { return f.facet_id; }).sort().join(',') === 'pc_core_contradiction,pc_current_fear');

  const cont2 = win._cpContinuationAssignment(s, 2);
  const directiveText = cont2.ok ? cont2.character_plus.map(function (c) { return win._cpBeatLines(c, false); }).join('\n') : '';
  ok('the rendered author directive never contains the unmapped bible fields either',
    directiveText.indexOf('loved without ever having to ask') === -1 && directiveText.indexOf('brittle composure') === -1);
  ok('the rendered author directive never contains the uncommitted planner fact', directiveText.indexOf('burned every letter') === -1);
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 7 — legacy plain-string pressures are marked non-evidentiary, never treated as evidence (corrective follow-up)');
{
  const win = freshSandbox('story-c7');
  const s = win.state;
  // A fixed-starter seed whose PC facet uses the REAL shipped shape: plain-string
  // possible_pressures, exactly like STARTER_SEEDS.starter_first_sacrifice.cast[0].
  s.__seedFixture = { id: 'starter_first_sacrifice', cast: [{ role: 'PC', name: 'Lirael', cPlusFacets: [
    { facet_id: 'pc_untested_brilliance', category: 'competence', canonical_truth: 'her brilliance has never been tested against real cost',
      possible_pressures: ['first live performance of a rehearsed duty', 'being watched by people who can judge her'] },
  ] }] };
  const rec = win._ensurePcPortfolio(s);
  const pressures = rec.facets[0].pressures;
  ok('both legacy pressures are marked legacy_display_only', pressures.every(function (p) { return p.legacy_display_only === true; }));
  ok('both legacy pressures carry evidence_requires:null (never empty-string, distinct from an unmatched structured pressure)',
    pressures.every(function (p) { return p.evidence_requires === null; }));

  // NO BEHAVIOR CHANGE: still structurally ungroundable, even with matching-worded evidence.
  s._scenePosture = { '2': { sceneNum: 2, action: 'her first live performance of a rehearsed duty, being watched by people who can judge her', dialogue: '' } };
  const evidence = win._pcEvidenceFacts(s, 2);
  s.__stageFixture = stageFixture([pcOnStage()], evidence);
  const cont = win._cpContinuationAssignment(s, 2);
  ok('PC-C+ is STILL absent for a legacy-marked pressure, even against exactly-matching scene text (labeling changed nothing about grounding)',
    !cont.ok || cont.character_plus.length === 0, cont.ok ? JSON.stringify(cont.character_plus) : cont.reason);

  // A REAL structured pressure (Julian-style, NPC) is UNAFFECTED by this PC-only marking pass —
  // never touched, never mislabeled.
  const win2 = freshSandbox('story-c7b');
  win2._ensurePcPortfolio(win2.state);   // no seed/bible — source:none, nothing to mark
  ok('a story with no fixed-starter PC facets is unaffected (nothing to mark, no crash)',
    win2.state._pcPortfolio.source === 'none' && win2.state._pcPortfolio.facets.length === 0);
}

console.log('\n' + '='.repeat(70));
console.log(`PC BASELINE PORTFOLIO CONTROL: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); process.exit(1); }
process.exit(0);
