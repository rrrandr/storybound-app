#!/usr/bin/env node
// _tier0_seeded_first_page_control.mjs
//
// OFFLINE control for TIER 0 — SEEDED FIRST PAGE (Roman, 2026-09-16): the new
// _tier0PcBibleFromSeed / _tier0SentenceCiting adapter (public/app.js, right after
// _commitValidatedPcFoundation) that derives a fixed starter's PC Body Bible FOUNDATION content
// LOCALLY from already-approved seed canon, with zero live model call. Sliced directly from the
// REAL app.js source (never hand-reimplemented), same anchor-slice sandbox convention
// _pc_foundation_output_validator_control.mjs already uses and proves 126/126 green — this file
// does NOT re-prove that existing validator/commit machinery, only the NEW adapter and its
// citation-exactness against the real seed.
//
// Zero network, zero browser, zero cost by construction — nothing here can make a live call.

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
  if (from === -1) throw new Error('ANCHOR DRIFT (active-seed-line): not found');
  const eol = SRC.indexOf('\n', from);
  return SRC.slice(from, eol === -1 ? undefined : eol);
}

const activeSeedLine = extractLine('function _activeSeed(s) {');
const relLedgerSrc = sliceByAnchor('rel-ledger-primitives',
  'var REL_V = 1;',
  'return _relMatchByName(L, n, opts);\n  };');
const cplusPipelineSrc = sliceByAnchor('cplus-pipeline-and-pc-portfolio',
  'function _isPlaceholderPcName(v) {',
  'window._CPLUS_PC_BEAT_OWNER = _CPLUS_PC_BEAT_OWNER;') + '\n  }';
// Extended past the original control's end anchor to also pull in the new TIER 0 adapter
// (_tier0SentenceCiting / _tier0PcBibleFromSeed), which this session added immediately after
// _commitValidatedPcFoundation's own window export, in real file order.
const validatorAndTier0Src = sliceByAnchor('pc-foundation-source-validator-merge-and-tier0',
  'function _pcFoundationSourceFacts(s) {',
  'window._tier0PcBibleFromSeed = _tier0PcBibleFromSeed;') + ' } catch (_) {}';

const body = activeSeedLine + '\n' + relLedgerSrc + '\n' + cplusPipelineSrc + '\n' + validatorAndTier0Src;
const factory = new Function('window', 'STARTER_SEEDS', body);
function freshSandbox(seeds) { const win = {}; factory(win, seeds || {}); return win; }

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

// ── SOURCE-PARITY (like the real-path proof's own section): confirm these hand-copied fixture
// strings are REAL, exact substrings of the REAL shipped seed, not an independently-drifted
// approximation. Grep-checked directly against public/app.js text, not against this file's own
// sandbox copy — an actual cross-check, not a self-consistency tautology.
section('SOURCE PARITY — fixture strings vs. the real shipped seed text');
const PC_UNTESTED_BRILLIANCE = 'She knows the procedure better than she has ever performed it, and the gap between knowing and doing is where her fear lives.';
const PC_FEARS_PUBLIC_FAILURE = 'Failing is survivable; failing where it can be witnessed and recounted is not, so she manages the audience as much as the task.';
const PC_BIO = 'A young First Favored apprentice. Today is her first time SUPERVISING another person’s First Sacrifice — responsible for the ritual being conducted correctly, not for the wish itself. Brilliant but untested; terrified of failing publicly.';
const LI_BIO = 'An older First Favored: calm, quietly respected. Already knows something about the PC’s lineage. Present at the ritual only as an observer.';
[
  ['pc_untested_brilliance canonical_truth', PC_UNTESTED_BRILLIANCE],
  ['pc_fears_public_failure canonical_truth', PC_FEARS_PUBLIC_FAILURE],
  ['Lirael bio', PC_BIO],
  ['Julian bio', LI_BIO],
].forEach(([label, needle]) => ok('real app.js contains exact ' + label, SRC.indexOf(needle) !== -1, 'not found verbatim in public/app.js'));

const FIRST_SACRIFICE_SEED = {
  cast: [
    { role: 'PC', name: 'Lirael', species: 'First Favored', bio: PC_BIO,
      cPlusFacets: [
        { facet_id: 'pc_untested_brilliance', category: 'competence', canonical_truth: PC_UNTESTED_BRILLIANCE },
        { facet_id: 'pc_fears_public_failure', category: 'fear', canonical_truth: PC_FEARS_PUBLIC_FAILURE },
      ] },
    { role: 'LI', name: 'Julian', species: 'First Favored', bio: LI_BIO },
  ],
  constraints: [
    'Julian must never read as suspicious before Scene 8.',
    'The PC must never consciously suspect Julian before the planner allows it.',
  ],
};
function baseState(overrides) {
  return Object.assign({ storyId: 'test-story-1', _starterId: 'starter_first_sacrifice', _bakedEmitted: null, _scenePosture: null }, overrides || {});
}

// ══════════════════════════════════════════════════════════════════════════════════
section('ADAPTER OUTPUT — First Sacrifice (sufficient seed: 2 PC cPlusFacets)');
// ══════════════════════════════════════════════════════════════════════════════════
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const bible = win._tier0PcBibleFromSeed(s);
  ok('adapter returns a non-null bible', !!bible, JSON.stringify(bible));
  if (bible) {
    ok('core_contradiction populated from the competence facet', bible.core_contradiction === PC_UNTESTED_BRILLIANCE);
    ok('wound.core populated from the fear facet', bible.wound && bible.wound.core === PC_FEARS_PUBLIC_FAILURE);
    ok('current_crisis.event populated (a real sentence of the bio)', !!(bible.current_crisis && bible.current_crisis.event) && PC_BIO.indexOf(bible.current_crisis.event) !== -1);
    ok('current_crisis.li_complication populated (a real sentence of Julian\'s bio)', !!(bible.current_crisis && bible.current_crisis.li_complication) && LI_BIO.indexOf(bible.current_crisis.li_complication) !== -1);
    // EXACT-SUBSTRING CITATION REQUIREMENT — every populated field's cited text must be a real,
    // byte-exact substring of the real seed text it claims, not a paraphrase.
    ok('_provenance.core_contradiction.cites is an EXACT substring of the real facet text', PC_UNTESTED_BRILLIANCE.indexOf(bible._provenance.core_contradiction.cites) !== -1 && bible._provenance.core_contradiction.cites === bible.core_contradiction);
    ok('_provenance["wound.core"].cites is an EXACT substring of the real facet text', bible._provenance['wound.core'].cites === PC_FEARS_PUBLIC_FAILURE);
    ok('_provenance["current_crisis.event"].cites is an EXACT substring of the real bio', PC_BIO.indexOf(bible._provenance['current_crisis.event'].cites) !== -1);
    ok('_provenance["current_crisis.li_complication"].cites is an EXACT substring of the real LI bio', LI_BIO.indexOf(bible._provenance['current_crisis.li_complication'].cites) !== -1);
    ['core_contradiction', 'wound.core', 'current_crisis.event', 'current_crisis.li_complication'].forEach((k) => {
      ok('kind declared locked_canon_fact for ' + k, bible._provenance[k].kind === 'locked_canon_fact');
    });
    // NEVER-INVENTED FIELDS — nothing seed-uncitable is populated.
    ['private_hope', 'signature_feature', 'height', 'build', 'hair', 'stress_tic', 'desire_tell',
     'emotional_weather', 'signature_habits'].forEach((k) => {
      ok('non-citable field "' + k + '" left ABSENT, never invented', bible[k] === undefined);
    });
    ok('current_crisis.immediate_fear left ABSENT (no seed source for it)', bible.current_crisis.immediate_fear === undefined);
    ok('current_crisis.refusal left ABSENT (no seed source for it)', bible.current_crisis.refusal === undefined);
    ok('wound.surfacing_hint left ABSENT (no seed source for it)', bible.wound.surfacing_hint === undefined);
  }

  section('VALIDATOR + COMMIT — the tier0 bible passes the SAME real validator live generation uses');
  const source = win._pcFoundationSourceFacts(s);
  const validation = win._validatePcFoundationOutput(bible, source);
  ok('validator accepts the tier0 bible (validation.ok===true)', validation.ok === true, JSON.stringify(validation.rejections));
  ok('4 fields accepted, all locked_canon_fact', validation.accepted.length === 4 && validation.accepted.every(a => a.kind === 'locked_canon_fact'), JSON.stringify(validation.accepted));

  const commit = win._commitValidatedPcFoundation(s, bible);
  ok('commit succeeds (committed===true)', commit.committed === true, commit.reason);
  ok('portfolio source stamped fixed_starter', s._pcPortfolio && s._pcPortfolio.source === 'fixed_starter');
  ok('portfolio carries a validatedMerge provenance stamp', !!(s._pcPortfolio.provenance && s._pcPortfolio.provenance.validatedMerge));
  // _pcFacetsFromBodyBible only unconditionally maps core_contradiction + current_crisis.event
  // (+ immediate_fear, absent here) into portfolio facets — wound.core/li_complication, though
  // validated and present on state.pcBodyBible itself, are NOT separately merged into
  // _pcPortfolio.facets under kind:'locked_canon_fact' (only under 'generated_foundation', which
  // this adapter never declares). This is EXISTING, already-proven behavior of the shared
  // committer/mapper (unchanged by this adapter) — asserted here so it is a disclosed, understood
  // characteristic of Tier 0's output, not a silent gap.
  const mergedIds = (commit.mergedFacetIds || []).slice().sort();
  ok('exactly the 2 unconditionally-mapped facets merged into the portfolio', JSON.stringify(mergedIds) === JSON.stringify(['pc_core_contradiction', 'pc_current_crisis_event']), JSON.stringify(mergedIds));
}

// ══════════════════════════════════════════════════════════════════════════════════
section('GATE CORRECTNESS — Corridor and insufficient-seed populations are UNTOUCHED');
// ══════════════════════════════════════════════════════════════════════════════════
{
  // CORRIDOR: no _starterId at all → _activeSeed returns null → _pcFoundationSourceFacts returns
  // null → adapter must return null (falls through to live generation, unmodified).
  const winCorridor = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const corridorState = { storyId: 'corridor-story-1', _starterId: '', _bakedEmitted: null };
  ok('Corridor (no _starterId): adapter returns null', winCorridor._tier0PcBibleFromSeed(corridorState) === null);

  // INSUFFICIENT SEED: a fixed starter whose PC cast entry carries an empty cPlusFacets array —
  // the general "sufficient seed" gate (cPlusFacets.length>0) must refuse, not half-populate.
  const thinSeed = { cast: [{ role: 'PC', name: 'Nobody', bio: 'A bio with no facets.', cPlusFacets: [] }] };
  const winThin = freshSandbox({ starter_thin: thinSeed });
  const thinState = { storyId: 'thin-story-1', _starterId: 'starter_thin', _bakedEmitted: null };
  ok('insufficient seed (cPlusFacets.length===0): adapter returns null', winThin._tier0PcBibleFromSeed(thinState) === null);
}

// ══════════════════════════════════════════════════════════════════════════════════
section('RED CONTROL — a tampered citation must still be REJECTED (the control must bite)');
// ══════════════════════════════════════════════════════════════════════════════════
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const bible = win._tier0PcBibleFromSeed(s);
  // Corrupt the citation so it is no longer an exact substring of the real facet text — proves
  // the real validator (not a rubber-stamp) is genuinely load-bearing here, not merely present.
  bible._provenance.core_contradiction.cites = bible._provenance.core_contradiction.cites.slice(0, -5) + 'XXXXX';
  const source = win._pcFoundationSourceFacts(s);
  const validation = win._validatePcFoundationOutput(bible, source);
  ok('a tampered citation is REJECTED, not silently accepted', validation.ok === false);
  ok('rejection reason is citation_not_supported', validation.rejections.some(r => r.reason === 'citation_not_supported'), JSON.stringify(validation.rejections));
  const s2 = baseState();
  const commit = win._commitValidatedPcFoundation(s2, bible);
  ok('commit REFUSES a validation failure (committed===false)', commit.committed === false);
  ok('zero state mutation on refusal (no portfolio created)', s2._pcPortfolio === undefined);
}

console.log('\n' + '='.repeat(70));
console.log(`TIER 0 SEEDED FIRST PAGE CONTROL: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); process.exitCode = 1; }
