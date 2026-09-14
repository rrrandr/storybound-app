#!/usr/bin/env node
// _cplus_eplus_fusion_contract_control.mjs
//
// OFFLINE control suite for the C+/E+/Fusion generic stage-consumption contract (Roman, authorized
// 2026-09-14, D1-D6 — see _audit_out/cplus_eplus_fusion_generic_contract.md). Loads the REAL,
// unmodified primitives (_deriveObjectHead / _resolveStageBeatInventory / _resolveEPlusTarget /
// _resolveCPlusParticipant / _checkFusionReachability / _resolveStageBeatEligibility) plus the
// stage-state substrate and entity-ledger primitives they compose, by anchor-bounded slice of
// public/app.js, into a sandboxed `new Function('window', ...)` scope. _facetIndex is a
// shape-faithful STUB (the real one pulls in the whole facet-provider stack, unrelated to what
// this control proves); _resolveFacetIndexEntry — the pure resolution logic D4 actually depends
// on — is extracted REAL. No server, no browser, no network, no provider call.

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

const spineConstantsSrc = sliceByAnchor('spine-constants',
  'var _SPINE_RECENT = 6, _SPINE_MAX_CHARS = 2200;',
  "return t ? t.slice(0, n) : null; }");

const spineBlockSrc = sliceByAnchor('continuity-spine-block',
  'function _buildContinuitySpineBlock(s, opts) {',
  'window._buildContinuitySpineBlock = _buildContinuitySpineBlock;\n  } } catch (_) {}');

const stageSubstrateSrc = sliceByAnchor('stage-state-substrate',
  '// GENERIC STAGE-STATE SUBSTRATE (Roman, authorized 2026-09-14)',
  'window._issueStageFromPlannerReply = _issueStageFromPlannerReply;');

const contractSrc = sliceByAnchor('cplus-eplus-fusion-contract',
  '// C+/E+/FUSION GENERIC STAGE CONSUMPTION CONTRACT (Roman, authorized 2026-09-14, D1-D6)',
  'window._resolveStageBeatEligibility = _resolveStageBeatEligibility;');

const resolveFacetIndexEntrySrc = sliceByAnchor('resolve-facet-index-entry',
  'function _resolveFacetIndexEntry(stageRec, idx, sceneNo) {',
  '} catch (_) { return []; }\n  }');

const activeSeedSrc = sliceByAnchor('active-seed',
  'function _activeSeed(s)', ' }\n');

// Shape-faithful stand-ins for dependencies this control deliberately does NOT extract. Both are
// redirects onto `window.__test*` so a test can populate them on the `win` object BEFORE the
// sandbox factory runs (a `var` declared inside the generated function is otherwise invisible to
// code outside it — these two lines are the deliberate bridge).
const stubsSrc = `
  function _facetIndex(s, opts) { return window.__facetIndexStub || {}; }
  var STARTER_SEEDS = window.__testStarterSeeds || {};
  function _currentSceneNumber(s) { return (s && s.__testSceneNumber) || 5; }
`;

const body = stubsSrc + '\n' + relLedgerSrc + '\n' + spineConstantsSrc + '\n' + spineBlockSrc + '\n'
  + stageSubstrateSrc + '\n' + resolveFacetIndexEntrySrc + '\n' + activeSeedSrc + '\n' + contractSrc;

function freshSandbox(overrides) {
  const win = { state: Object.assign({ storyId: 's1' }, overrides || {}), __facetIndexStub: {}, __testStarterSeeds: (overrides && overrides.__testStarterSeeds) || {} };
  const factory = new Function('window', body);
  factory(win);
  return win;
}
function makeLedger(entities) { return { v: 1, storyId: 's1', processed: {}, seq: Object.keys(entities).length, entities, edges: {} }; }

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

// ══════════════════════════════════════════════════════════════════════════
// D1 — object identity: backend-minted object_id + derived head; planner-supplied object_id
// rejected before commit.
// ══════════════════════════════════════════════════════════════════════════
section('D1 — object identity: backend-minted, never a planner claim');
{
  const win = freshSandbox();
  win.state._relationshipLedger = makeLedger({ pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Lirael', aliases: [] } });
  const proposal = { present: ['pc'], location: { label: 'the colonnade' }, issued_objects: [{ label: 'the sealed ledger, half open', kind: 'object', addressable_by: ['pc'] }] };
  const check = win._validateStageProposal(proposal);
  ok('accepted (no object_id supplied)', check.ok === true, JSON.stringify(check.why));
  const accepted = win._acceptStageProposal('2', proposal);
  ok('commit succeeds', accepted.ok === true);
  const obj = accepted.record.issued_objects[0];
  ok('a stable object_id was minted', /^obj:stage:\d+$/.test(obj.object_id), obj.object_id);
  ok('a derived head was computed, article stripped, trailing clause dropped', obj.head === 'sealed ledger', obj.head);

  // A proposal that supplies its own object_id is rejected — the backend mints, never the caller.
  const bad = { present: ['pc'], issued_objects: [{ object_id: 'obj:stage:9999', label: 'a forged object' }] };
  const badCheck = win._validateStageProposal(bad);
  ok('a caller-supplied object_id is rejected', badCheck.ok === false, JSON.stringify(badCheck.why));
  ok('the reason names the backend-mints-only rule', badCheck.why.some(w => /backend mints object ids, never the caller/.test(w)), JSON.stringify(badCheck.why));
}

// ══════════════════════════════════════════════════════════════════════════
// D2 — precedence: active stage wins; legacy Scene-1 groundedObjects normalized when no active
// stage; otherwise empty (no free-text fallback).
// ══════════════════════════════════════════════════════════════════════════
section('D2 — inventory precedence: active stage > legacy seed groundedObjects > none');
{
  // 1) Active stage present → wins outright, even if a seed with groundedObjects also exists.
  const win = freshSandbox({ _starterId: 'fake_seed', __testStarterSeeds: { fake_seed: { sceneOne: { groundedObjects: [{ object_id: 'O1', name: 'the brass key', owner_ref: 'pc' }] } } } });
  win.state._relationshipLedger = makeLedger({ pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Lirael', aliases: [] } });
  win.state.__testSceneNumber = 1;
  win._acceptStageProposal('1', { present: ['pc'], issued_objects: [{ label: 'the ACTIVE STAGE object', addressable_by: ['pc'] }] });
  let inv = win._resolveStageBeatInventory(win.state);
  ok('active stage source wins over a coexisting seed', inv.source === 'active_stage', inv.source);
  ok('active stage objects are what is offered', inv.objects.length === 1 && inv.objects[0].label === 'the ACTIVE STAGE object');

  // 2) No active stage, Scene 1, seed HAS groundedObjects → normalized legacy path.
  const win2 = freshSandbox({ _starterId: 'fake_seed', __testStarterSeeds: { fake_seed: { sceneOne: { groundedObjects: [{ object_id: 'O1', name: 'the brass key', owner_ref: 'pc', head: 'key' }] } } } });
  win2.state.__testSceneNumber = 1;
  let inv2 = win2._resolveStageBeatInventory(win2.state);
  ok('no active stage → falls back to legacy seed groundedObjects', inv2.source === 'legacy_seed_grounded_objects', inv2.source);
  ok('legacy object normalized into the SAME shape (object_id/label/head/owner_or_caretaker_ref)',
    inv2.objects.length === 1 && inv2.objects[0].label === 'the brass key' && inv2.objects[0].head === 'key' && inv2.objects[0].owner_or_caretaker_ref === 'pc',
    JSON.stringify(inv2.objects));

  // 3) No active stage, no seed at all (corridor/Famous Fate) → empty, NOT a free-text fallback.
  const win3 = freshSandbox({ _starterId: null });
  win3.state.__testSceneNumber = 4;
  let inv3 = win3._resolveStageBeatInventory(win3.state);
  ok('corridor/FF with no active stage and no seed → empty inventory', inv3.source === 'none' && inv3.objects.length === 0, JSON.stringify(inv3));
}

// ══════════════════════════════════════════════════════════════════════════
// D3 — exclusions: filter (never in the offered pool) AND reject (named code for a bypass
// attempt), distinguishable from a plain "not found".
// ══════════════════════════════════════════════════════════════════════════
section('D3 — exclusions: filtered from the pool AND explicitly rejected on a bypass attempt');
{
  const inventory = {
    objects: [
      { object_id: 'obj:stage:1', label: 'the sealed ledger', addressable_by: [] },
      { object_id: 'obj:stage:2', label: 'the Answer', addressable_by: [] }
    ],
    exclusions: { locations: [], objects: ['the Answer'] }
  };
  const win = freshSandbox();
  const ok1 = win._resolveEPlusTarget('the sealed ledger', inventory);
  ok('a non-excluded target resolves normally', ok1.ok === true, JSON.stringify(ok1));
  const excludedById = win._resolveEPlusTarget('obj:stage:2', inventory);
  ok('an excluded object is unreachable by id (filtered from the pool)', excludedById.ok === false);
  ok('the reason names exclusion specifically, not a generic miss', excludedById.why === 'TARGET_EXCLUDED', excludedById.why);
  const excludedByLabel = win._resolveEPlusTarget('the Answer', inventory);
  ok('an excluded object is unreachable by label too', excludedByLabel.ok === false && excludedByLabel.why === 'TARGET_EXCLUDED', excludedByLabel.why);
  const genuinelyMissing = win._resolveEPlusTarget('a thing nobody issued', inventory);
  ok('a genuinely-absent target is distinguishable from an excluded one', genuinelyMissing.why === 'TARGET_NOT_IN_INVENTORY', genuinelyMissing.why);
}

// ══════════════════════════════════════════════════════════════════════════
// D4 — C+ participant resolution: resolves to facet/evidence material via the REAL
// _resolveFacetIndexEntry, or reports unavailable — never inferred from a bare label.
// ══════════════════════════════════════════════════════════════════════════
section('D4 — C+ participant resolution: facet-gated, never inferred from a label');
{
  const win = freshSandbox();
  win.state._relationshipLedger = makeLedger({
    'ent:stage:1': { id: 'ent:stage:1', kind: 'named', label: 'Julian', aliases: [] },
    'ent:stage:2': { id: 'ent:stage:2', kind: 'named', label: 'a nameless guard', aliases: [] }
  });
  win.__facetIndexStub['ent:stage:1'] = { facets: [{ facet_id: 'julian.f1' }], aliases: ['Julian'] };
  // ent:stage:2 has NO entry in the facet index at all — no authored material.
  const withMaterial = win._resolveCPlusParticipant('ent:stage:1', win.state, 4);
  ok('an entity with authored facet material resolves', withMaterial.ok === true, JSON.stringify(withMaterial));
  ok('the resolved participant carries its facets', withMaterial.participant.facets.length === 1);
  const withoutMaterial = win._resolveCPlusParticipant('ent:stage:2', win.state, 4);
  ok('an entity with NO authored material is UNAVAILABLE, not invented', withoutMaterial.ok === false && withoutMaterial.why === 'NO_AUTHORED_MATERIAL', JSON.stringify(withoutMaterial));
  const notOnStage = win._resolveCPlusParticipant('ent:stage:99', win.state, 4);
  ok('an id not on the ledger at all is refused cleanly', notOnStage.ok === false && notOnStage.why === 'NOT_ON_STAGE');
}

// ══════════════════════════════════════════════════════════════════════════
// D5 — fusion reachability: fail-closed on missing addressable_by; bare co-occurrence is
// explicitly insufficient.
// ══════════════════════════════════════════════════════════════════════════
section('D5 — fusion reachability: addressable_by required, fail-closed, never bare co-occurrence');
{
  const win = freshSandbox();
  const participant = { id: 'ent:stage:1', label: 'Julian' };
  const reachable = { object_id: 'obj:stage:1', label: 'the Answer', addressable_by: ['ent:stage:1'] };
  const unreachable = { object_id: 'obj:stage:2', label: 'a stranger\'s satchel', addressable_by: ['ent:stage:2'] };
  const undeclared = { object_id: 'obj:stage:3', label: 'an object nobody was told they could touch', addressable_by: [] };
  ok('reachable when the participant is in addressable_by', win._checkFusionReachability(participant, reachable).ok === true);
  const r2 = win._checkFusionReachability(participant, unreachable);
  ok('NOT reachable when addressable_by names someone else (bare co-occurrence insufficient)', r2.ok === false && r2.why === 'NOT_REACHABLE', JSON.stringify(r2));
  const r3 = win._checkFusionReachability(participant, undeclared);
  ok('fail-closed on empty/undeclared addressable_by — never a permissive default', r3.ok === false && r3.why === 'NO_ADDRESSABLE_BY_DECLARED', JSON.stringify(r3));
}

// ══════════════════════════════════════════════════════════════════════════
// D6 — composition: the full contract fails closed per beat. C+ alone where eligible; E+ alone
// where eligible; fusion ONLY where both resolve AND are mutually reachable for the SAME actor.
// ══════════════════════════════════════════════════════════════════════════
section('D6 — composed eligibility: fail-closed per beat, C+/E+/fusion independently correct');
{
  const win = freshSandbox();
  win.state._relationshipLedger = makeLedger({
    pc: { id: 'pc', kind: 'named', anchorRole: 'pc', label: 'Lirael', aliases: [] },
    'ent:stage:1': { id: 'ent:stage:1', kind: 'named', label: 'Julian', aliases: [] },
    'ent:stage:2': { id: 'ent:stage:2', kind: 'named', label: 'a nameless guard', aliases: [] }
  });
  // Julian has authored material; the nameless guard does not.
  win.__facetIndexStub['ent:stage:1'] = { facets: [{ facet_id: 'julian.f1' }], aliases: ['Julian'] };
  win.state.__testSceneNumber = 6;
  const proposal = {
    present: ['pc', 'ent:stage:1', 'ent:stage:2'],
    location: { label: 'the colonnade' },
    issued_objects: [
      { label: 'the Answer', addressable_by: ['ent:stage:1'] },          // Julian can reach this
      { label: 'a locked chest', addressable_by: ['ent:stage:2'] },      // only the guard can reach this
      { label: 'a decorative urn', addressable_by: [] }                  // nobody can reach this (fail-closed)
    ]
  };
  win._acceptStageProposal('6', proposal);
  const elig = win._resolveStageBeatEligibility(win.state, 6);
  ok('C+ is eligible for Julian (has authored material)', elig.cplus.some(p => p.id === 'ent:stage:1'));
  ok('C+ is NOT eligible for the nameless guard (no authored material) — beat absent, never invented', !elig.cplus.some(p => p.id === 'ent:stage:2'));
  ok('C+ is NOT eligible for the PC in this composer (the PC pool is whoever is present with material — pc has none stubbed, so correctly absent)', !elig.cplus.some(p => p.id === 'pc'));
  ok('E+ inventory carries ALL issued objects (E+ eligibility is per-target, resolved separately)', elig.eplus.length === 3);
  ok('fusion pairs Julian with the Answer (reachable)', elig.fusionPairs.some(fp => fp.participant.id === 'ent:stage:1' && fp.object.label === 'the Answer'));
  ok('fusion does NOT pair Julian with the locked chest (not his to reach)', !elig.fusionPairs.some(fp => fp.participant.id === 'ent:stage:1' && fp.object.label === 'a locked chest'));
  ok('fusion does NOT pair anyone with the decorative urn (no addressable_by at all — fail-closed)', !elig.fusionPairs.some(fp => fp.object.label === 'a decorative urn'));
  ok('the nameless guard never appears in ANY fusion pair (no C+ eligibility, even though the chest addresses them)', !elig.fusionPairs.some(fp => fp.participant.id === 'ent:stage:2'));
}

console.log('\n' + '='.repeat(60));
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (fail) { console.log('FAILURES:\n  - ' + fails.join('\n  - ')); process.exit(1); }
process.exit(0);
