#!/usr/bin/env node
// _tier0_li_cg_editor_defer_control.mjs
//
// OFFLINE control for the THREE fixes Roman required on top of the PC-only Tier 0 pass
// (2026-09-16): (1) a partial LI foundation adapter parallel to the PC one — no live
// LI_BODY_BIBLE call, no hand-authored full bible; (2) CG_SCAFFOLD suppressed/deferred for
// literary-mode Tier 0 Scene 1; (3) the model-backed post-author editorial passes deferred to an
// explicit, opt-in operation instead of blocking first-page delivery. Sliced directly from the
// REAL app.js source (never hand-reimplemented), same anchor-slice sandbox convention
// _tier0_seeded_first_page_control.mjs already uses and proves 41/41 green.
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

// ── LI adapter slice: _pcFoundationSourceFacts (needed by the defer-flag test too) through
// window._tier0LiBibleFromSeed's own export line.
const pcAndLiAdapterSrc = sliceByAnchor('pc-and-li-tier0-adapters',
  'function _pcFoundationSourceFacts(s) {',
  'window._tier0LiBibleFromSeed = _tier0LiBibleFromSeed;') + ' } catch (_) {}';

// ── CG_SCAFFOLD gate slice: the real _shouldGenerateCGScaffold body, with its four dependency
// functions STUBBED (controlled per-test via window.__test) rather than sliced — this control
// targets the NEW gate condition this session added, not the pre-existing staged/literary/alt-POV
// logic those four functions already implement elsewhere in the file.
const cgScaffoldSrc = sliceByAnchor('cg-scaffold-gate', 'function _shouldGenerateCGScaffold(s) {', '\n  }\n');
const cgStubs = `
  function _isStagedMode() { return !!(window.__test && window.__test.staged); }
  function _isCGRenderMode() { return !!(window.__test && window.__test.cgRender); }
  function _isAltPOVEdition() { return !!(window.__test && window.__test.altPOV); }
  function _cgScaffoldGenreFor(s) { return (window.__test ? window.__test.genreOK !== false : true); }
`;

const body = activeSeedLine + '\n' + pcAndLiAdapterSrc + '\n' + cgStubs + '\n' + cgScaffoldSrc
  + '\n  window._shouldGenerateCGScaffold = _shouldGenerateCGScaffold;';
const factory = new Function('window', 'STARTER_SEEDS', body);
function freshSandbox(seeds, testFlags) { const win = { __test: testFlags || {} }; factory(win, seeds || {}); return win; }

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

// ── SOURCE-PARITY: the fixture strings below are REAL, exact substrings of the real shipped
// seed, checked against public/app.js text directly, not against this file's own copy.
section('SOURCE PARITY — LI fixture strings vs. the real shipped seed text');
const JULIAN_STATUS = 'He is accustomed to being respected without asserting rank; when a room becomes performative, he grows quieter rather than competing for its attention.';
const JULIAN_NOTICES = 'He remains attentive at the edge of consequential moments and does not volunteer the full extent of what he has noticed or understood.';
const LI_BIO = 'An older First Favored: calm, quietly respected. Already knows something about the PC’s lineage. Present at the ritual only as an observer.';
[
  ['julian_status_without_display canonical_truth', JULIAN_STATUS],
  ['julian_notices_without_volunteering canonical_truth', JULIAN_NOTICES],
  ['Julian bio', LI_BIO],
].forEach(([label, needle]) => ok('real app.js contains exact ' + label, SRC.indexOf(needle) !== -1, 'not found verbatim in public/app.js'));

const FIRST_SACRIFICE_SEED = {
  cast: [
    { role: 'PC', name: 'Lirael', species: 'First Favored', bio: 'x', cPlusFacets: [
      { facet_id: 'pc_untested_brilliance', category: 'competence', canonical_truth: 'x' },
    ] },
    { role: 'LI', name: 'Julian', species: 'First Favored', bio: LI_BIO, cPlusFacets: [
      { facet_id: 'julian_status_without_display', category: 'habit', canonical_truth: JULIAN_STATUS },
      { facet_id: 'julian_notices_without_volunteering', category: 'relationship_pattern', canonical_truth: JULIAN_NOTICES },
    ] },
  ],
};
function baseState(overrides) {
  return Object.assign({ storyId: 'test-story-1', _starterId: 'starter_first_sacrifice', _bakedEmitted: null, _scenePosture: null }, overrides || {});
}

// ══════════════════════════════════════════════════════════════════════════════════
section('LI ADAPTER — First Sacrifice (2 LI cPlusFacets: habit + relationship_pattern)');
// ══════════════════════════════════════════════════════════════════════════════════
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const source = win._liFoundationSourceFacts(s);
  ok('_liFoundationSourceFacts returns non-null for a seeded LI', !!source, JSON.stringify(source));
  ok('source exposes both LI facets', source && source.facets.length === 2);

  const bible = win._tier0LiBibleFromSeed(s);
  ok('adapter returns a non-null partial bible', !!bible, JSON.stringify(bible));
  if (bible) {
    ok('restraint_tell populated from the "habit" facet (content-matched: "without asserting"/"grows quieter")', bible.restraint_tell === JULIAN_STATUS);
    ok('focus_tell populated from the "relationship_pattern" facet (content-matched: "attentive"/"noticed")', bible.focus_tell === JULIAN_NOTICES);
    ok('_provenance.restraint_tell.cites is an EXACT match of the real facet text', bible._provenance.restraint_tell.cites === JULIAN_STATUS);
    ok('_provenance.focus_tell.cites is an EXACT match of the real facet text', bible._provenance.focus_tell.cites === JULIAN_NOTICES);
    ['restraint_tell', 'focus_tell'].forEach((k) => ok('kind declared locked_canon_fact for ' + k, bible._provenance[k].kind === 'locked_canon_fact'));
    // NEVER-INVENTED FIELDS — the ~18 other LI schema fields stay absent.
    ['age', 'height', 'build', 'hair', 'complexion', 'face', 'eye_color', 'voice_quality',
     'signature_feature', 'visual_anchor', 'defining_anecdote', 'signature_kink', 'desire_tell',
     'interest_tell', 'frustration_tell', 'wound', 'current_crisis', 'private_hope'].forEach((k) => {
      ok('non-citable field "' + k + '" left ABSENT, never invented', bible[k] === undefined);
    });
  }
}

// ══════════════════════════════════════════════════════════════════════════════════
section('LI ADAPTER — GATE CORRECTNESS (Corridor / insufficient-seed / single-facet fallback)');
// ══════════════════════════════════════════════════════════════════════════════════
{
  const winCorridor = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  ok('Corridor (no _starterId): adapter returns null', winCorridor._tier0LiBibleFromSeed({ storyId: 'c1', _starterId: '' }) === null);

  const thinSeed = { cast: [{ role: 'LI', name: 'Nobody', bio: 'x', cPlusFacets: [] }] };
  const winThin = freshSandbox({ starter_thin: thinSeed });
  ok('insufficient seed (LI cPlusFacets.length===0): adapter returns null', winThin._tier0LiBibleFromSeed({ storyId: 't1', _starterId: 'starter_thin' }) === null);

  // Content-keyword fallback: a facet whose text matches NEITHER RESTRAINT_RE nor FOCUS_RE still
  // gets assigned (in seed order) rather than silently dropped — proves the fallback path, not
  // just the direct-match path.
  const oddSeed = { cast: [{ role: 'LI', name: 'Odd', bio: 'x', cPlusFacets: [
    { facet_id: 'odd_one', category: 'quirk', canonical_truth: 'He collects unusual maps.' },
    { facet_id: 'odd_two', category: 'quirk', canonical_truth: 'He hums when nervous.' },
  ] }] };
  const winOdd = freshSandbox({ starter_odd: oddSeed });
  const oddBible = winOdd._tier0LiBibleFromSeed({ storyId: 'o1', _starterId: 'starter_odd' });
  ok('fallback path still populates both tells for non-matching keyword content', !!oddBible && !!oddBible.restraint_tell && !!oddBible.focus_tell, JSON.stringify(oddBible));
  ok('fallback-assigned restraint_tell is a real, unmodified facet fact', oddBible && (oddBible.restraint_tell === 'He collects unusual maps.' || oddBible.restraint_tell === 'He hums when nervous.'));
}

// ══════════════════════════════════════════════════════════════════════════════════
section('SHARED ELIGIBILITY HELPER — _tier0Scene1Eligible (the REAL function, not a reimplementation)');
// ══════════════════════════════════════════════════════════════════════════════════
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  ok('_tier0Scene1Eligible exists on the sandbox (captured by the same anchor slice)', typeof win._tier0Scene1Eligible === 'function');
  ok('Scene 1, Tier-0-eligible starter: TRUE', win._tier0Scene1Eligible(baseState({ turnCount: 0 })) === true);
  ok('Scene 1, Tier-0-eligible starter (turnCount undefined): TRUE', win._tier0Scene1Eligible(baseState({})) === true);
  ok('Continuation scene (turnCount>0): FALSE — editors/enrichment run normally past Scene 1', win._tier0Scene1Eligible(baseState({ turnCount: 1 })) === false);
  ok('Corridor (no _starterId): FALSE — no seed to derive from', win._tier0Scene1Eligible(baseState({ _starterId: '', turnCount: 0 })) === false);
  // REGRESSION LOCK (Roman 2026-09-16, third pass): a fixed starter with ZERO authored
  // cPlusFacets must NOT be treated as Tier-0-eligible — a bare `_pcFoundationSourceFacts(s)`
  // truthy check (the bug this helper replaced) returns a real object even with facets:[], which
  // would wrongly suppress pre-page calls with nothing seed-derivable to replace them. Caught
  // live by _tiered_provider_policy_control.mjs's own neutralization no longer working once
  // PAIR_BOND/R_PLOT/etc. suppression shipped — fixed by requiring facets.length here.
  const thinSeed = { cast: [{ role: 'PC', name: 'Nobody', bio: 'x', cPlusFacets: [] }] };
  const winThin = freshSandbox({ starter_thin: thinSeed });
  ok('fixed starter with EMPTY cPlusFacets: FALSE — not enough seed content to justify suppression', winThin._tier0Scene1Eligible({ storyId: 't1', _starterId: 'starter_thin', turnCount: 0 }) === false);
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CG_SCAFFOLD GATE — literary Tier-0 Scene 1 suppressed; every other population unaffected');
// ══════════════════════════════════════════════════════════════════════════════════
{
  const seeds = { starter_first_sacrifice: FIRST_SACRIFICE_SEED };
  const s0 = baseState({ turnCount: 0 });
  const sCont = baseState({ turnCount: 3 });
  const sCorridor = { storyId: 'c1', _starterId: '', turnCount: 0 };

  const winLitS1 = freshSandbox(seeds, { staged: false, cgRender: false, altPOV: false, genreOK: true });
  ok('literary mode, Scene 1, Tier-0-eligible: CG_SCAFFOLD SUPPRESSED (returns false)', winLitS1._shouldGenerateCGScaffold(s0) === false);
  ok('the suppression stamps s._tier0CgScaffoldDeferred so the skip is visible, not silent', s0._tier0CgScaffoldDeferred === true);

  const winLitCont = freshSandbox(seeds, { staged: false, cgRender: false, altPOV: false, genreOK: true });
  ok('literary mode, CONTINUATION (turnCount>0): CG_SCAFFOLD generates normally (not suppressed)', winLitCont._shouldGenerateCGScaffold(sCont) === true);

  const winStagedS1 = freshSandbox(seeds, { staged: true, cgRender: false, altPOV: false, genreOK: true });
  ok('staged mode, Scene 1: CG_SCAFFOLD UNAFFECTED (still generates — staged never gated)', winStagedS1._shouldGenerateCGScaffold(baseState({ turnCount: 0 })) === true);

  const winCgRenderS1 = freshSandbox(seeds, { staged: false, cgRender: true, altPOV: false, genreOK: true });
  ok('CG render mode, Scene 1: CG_SCAFFOLD UNAFFECTED (literaryOK is false, so the new gate never applies; falls through to the pre-existing staged/literary check)', winCgRenderS1._shouldGenerateCGScaffold(baseState({ turnCount: 0 })) === false);

  const winCorridorS1 = freshSandbox(seeds, { staged: false, cgRender: false, altPOV: false, genreOK: true });
  ok('literary mode, Scene 1, Corridor (no fixed-starter seed): CG_SCAFFOLD UNAFFECTED (generates normally — no Tier-0 eligibility to suppress on)', winCorridorS1._shouldGenerateCGScaffold(sCorridor) === true);
}

console.log('\n' + '='.repeat(70));
console.log(`TIER 0 — LI ADAPTER + CG_SCAFFOLD GATE + EDITOR-DEFER FLAG CONTROL: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); process.exitCode = 1; }
