#!/usr/bin/env node
// _tier0_prepage_enrichment_suppress_control.mjs
//
// OFFLINE control for the THIRD Tier 0 pass (Roman, 2026-09-16): PAIR_BOND, R_PLOT,
// WOUND_LI_INTEGRATION_AUDIT, CHARACTER_DISCLOSURE_EXTRACTION, VOICE_ANCHOR, and
// PREWRITE_HINT_EXPANSION are all suppressed pre-page for a Tier-0-eligible fixed starter's
// Scene 1 (no deferred-call registry — genuinely suppressed, not rescheduled). Most of these
// wrap deeply-embedded call sites inside handleBeginStory/finalize (same shape as the second
// pass's post-author editors) and are proven LIVE, not offline (see _scene1_call_census.mjs,
// which now shows exactly 2 physical calls — OPENING_PLANNER + AUTHOR — for a real
// handleBeginStory() drive, and _tiered_provider_policy_control.mjs, whose real-browser
// scenarios prove the suppression is CONDITIONAL — a non-Tier0 story still reaches PAIR_BOND/
// R_PLOT/etc. normally). This file offline-proves the one genuinely new, cleanly-sliceable piece
// of LOGIC this pass introduced: _deriveRomancePacket's gate no longer requires pairBond, and
// _tier0Scene1Eligible (the shared helper this pass factored out to fix a real bug — a bare
// _pcFoundationSourceFacts(s) truthy check does not require facets.length, so it wrongly marked
// a facets-empty fixed starter "Tier 0 eligible") is correct on its own.
//
// Zero network, zero browser, zero cost by construction.

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
function extractLine(startAnchor) {
  const from = SRC.indexOf(startAnchor);
  if (from === -1) throw new Error('ANCHOR DRIFT: not found: ' + startAnchor.slice(0, 60));
  const eol = SRC.indexOf('\n', from);
  return SRC.slice(from, eol === -1 ? undefined : eol);
}

const activeSeedLine = extractLine('function _activeSeed(s) {');
// _pcFoundationSourceFacts through _tier0Scene1Eligible's own window export.
const eligibilitySrc = sliceByAnchor('pc-source-facts-and-tier0-eligibility',
  'function _pcFoundationSourceFacts(s) {',
  'window._tier0Scene1Eligible = _tier0Scene1Eligible;') + ' } catch (_) {}';
const romancePacketSrc = sliceByAnchor('derive-romance-packet',
  'var _SCENE1_PACKET_TEMPLATES = {',
  '\n      derived_at: Date.now()\n    };\n  }');

const body = activeSeedLine + '\n' + eligibilitySrc + '\n' + romancePacketSrc
  + '\n  window._deriveRomancePacket = _deriveRomancePacket;';
const factory = new Function('window', 'STARTER_SEEDS', body);
function freshSandbox(seeds) { const win = {}; factory(win, seeds || {}); return win; }

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

const FIRST_SACRIFICE_SEED = {
  cast: [
    { role: 'PC', name: 'Lirael', species: 'First Favored', bio: 'x', cPlusFacets: [
      { facet_id: 'pc_untested_brilliance', category: 'competence', canonical_truth: 'x' },
    ] },
    { role: 'LI', name: 'Julian', species: 'First Favored', bio: 'x', cPlusFacets: [
      { facet_id: 'julian_status_without_display', category: 'habit', canonical_truth: 'x' },
    ] },
  ],
};

section('_deriveRomancePacket — GATE FIX: pairBond no longer required');
{
  const win = freshSandbox({});
  const pcBible = { signature_feature: 'a scar', attraction_manifestation: 'leans in', deflection_pattern: 'changes subject', voice_quality: 'low' };
  const liBible = { signature_feature: 'grey eyes', attraction_manifestation: 'watches closely', deflection_pattern: 'goes quiet', voice_quality: 'even' };
  const stateNoPairBond = { pcBodyBible: pcBible, liBodyBible: liBible, pairBond: null };
  const packet = win._deriveRomancePacket(stateNoPairBond);
  ok('returns non-null with pairBond ABSENT (the actual bug this pass fixed)', packet !== null, JSON.stringify(packet));
  ok('uncertainty_ref safely null when pairBond absent (pre-existing guard, unaffected)', packet && packet.uncertainty_ref === null);

  const stateNoPc = { pcBodyBible: null, liBodyBible: liBible, pairBond: null };
  ok('still returns null when pcBodyBible is ABSENT (the real prerequisite, untouched)', win._deriveRomancePacket(stateNoPc) === null);
  const stateNoLi = { pcBodyBible: pcBible, liBodyBible: null, pairBond: null };
  ok('still returns null when liBodyBible is ABSENT (the real prerequisite, untouched)', win._deriveRomancePacket(stateNoLi) === null);

  const statePairBondUncertainty = { pcBodyBible: pcBible, liBodyBible: liBible, pairBond: { uncertainty: { source_lock: 'a real lock value' } } };
  const packet2 = win._deriveRomancePacket(statePairBondUncertainty);
  ok('when pairBond IS present with uncertainty data, that field still flows through (not dropped by the gate fix)', packet2 && packet2.uncertainty_ref === 'a real lock value', JSON.stringify(packet2 && packet2.uncertainty_ref));
}

section('_tier0Scene1Eligible — REGRESSION LOCK for the facets.length bug this pass found and fixed');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  ok('Scene 1, real First Sacrifice seed (has facets): TRUE', win._tier0Scene1Eligible({ storyId: 's1', _starterId: 'starter_first_sacrifice', turnCount: 0 }) === true);
  ok('Continuation (turnCount>0): FALSE', win._tier0Scene1Eligible({ storyId: 's1', _starterId: 'starter_first_sacrifice', turnCount: 2 }) === false);

  const thinSeed = { cast: [{ role: 'PC', name: 'Nobody', bio: 'x', cPlusFacets: [] }] };
  const winThin = freshSandbox({ starter_thin: thinSeed });
  ok('fixed starter with EMPTY cPlusFacets: FALSE (the exact bug — a bare truthy check on _pcFoundationSourceFacts would wrongly say TRUE here)', winThin._tier0Scene1Eligible({ storyId: 't1', _starterId: 'starter_thin', turnCount: 0 }) === false);

  const winCorridor = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  ok('Corridor (no _starterId): FALSE', winCorridor._tier0Scene1Eligible({ storyId: 'c1', _starterId: '', turnCount: 0 }) === false);
}

console.log('\n' + '='.repeat(70));
console.log(`TIER 0 PRE-PAGE ENRICHMENT SUPPRESSION CONTROL: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); process.exitCode = 1; }
