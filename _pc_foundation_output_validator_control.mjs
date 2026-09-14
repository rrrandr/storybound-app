#!/usr/bin/env node
// _pc_foundation_output_validator_control.mjs
//
// OFFLINE control suite for _validatePcFoundationOutput (Roman, corrective follow-up #2,
// 2026-09-15): proves the PC-foundation output validator REJECTS the actual retained sample from
// the live run (_audit_out/pc_foundation_samples/2026-09-15_live_sample_01_FAILED.json) by the
// three NAMED reasons Roman identified — unsupported vanished/dead mother, unsupported Julian
// intimacy, Julian-as-guilt-decider — and ACCEPTS a hand-built green fixture whose claims are
// genuinely supported by (or honestly marked inferred-and-safe against) the same approved source
// material. No provider calls, no server, no browser — pure offline replay.

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

const validatorSrc = sliceByAnchor('pc-foundation-source-and-validator',
  'function _pcFoundationSourceFacts(s) {',
  "window._validatePcFoundationOutput = _validatePcFoundationOutput;") + ' } catch (_) {}';

const body = activeSeedLine + '\n' + validatorSrc;
const factory = new Function('window', 'STARTER_SEEDS', body);

function freshSandbox(seeds) {
  const win = {};
  factory(win, seeds || {});
  return win;
}

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

// The REAL, real-shaped First Sacrifice seed data the live sample's request was actually built
// from (same content as _starter_pc_foundation_block_control.mjs's fixture — kept in lockstep
// deliberately, not re-derived, so both controls test against the SAME approved source).
const FIRST_SACRIFICE_SEED = {
  cast: [
    { role: 'PC', name: 'Lirael', species: 'First Favored',
      bio: 'A young First Favored apprentice. Today is her first time SUPERVISING another person’s First Sacrifice — responsible for the ritual being conducted correctly, not for the wish itself. Brilliant but untested; terrified of failing publicly.',
      cPlusFacets: [
        { facet_id: 'pc_untested_brilliance', category: 'competence', canonical_truth: 'She knows the procedure better than she has ever performed it, and the gap between knowing and doing is where her fear lives.' },
        { facet_id: 'pc_fears_public_failure', category: 'fear', canonical_truth: 'Failing is survivable; failing where it can be witnessed and recounted is not, so she manages the audience as much as the task.' },
      ] },
    { role: 'LI', name: 'Julian', species: 'First Favored',
      bio: 'An older First Favored: calm, quietly respected. Already knows something about the PC’s lineage. Present at the ritual only as an observer.' },
  ],
  constraints: [
    'Julian must never read as suspicious before Scene 8.',
    'The PC must never consciously suspect Julian before the planner allows it.',
    'The author must never invent additional wish or Fate laws beyond worldTruths.',
  ],
};
function baseState(overrides) {
  return Object.assign({
    _starterId: 'starter_first_sacrifice',
    _bakedEmitted: {
      ledgerLine: 'Seren’s misaligned wish for Lirael bent; the assembly turned to Lirael. The Dohkar charged her with shaping and interfering, and Julian, the Provast, questioned her before all; the Dohkar cut it off.',
      openState: {
        location: 'the Veilwood ceremony clearing', timeOfDay: 'dawn',
        pcCondition: 'mouth-band torn away, ceremonial sash still on, publicly accused, holding The Answer',
      },
      obligations: [
        'The presiding Dohkar has charged Lirael with shaping the wish and with interfering; he has not yet ruled.',
        'The presiding Dohkar asserted that the rite and the ruling on the Sacrificiant’s conduct are his and named a formal inquiry as the venue; Julian agreed and publicly claimed authority to convene and preside over that inquiry. The inquiry has NOT yet been opened.',
      ],
    },
    _scenePosture: null,
  }, overrides || {});
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 1 (RETAINED SAMPLE) — the ACTUAL failed live response is rejected by the three named reasons');
{
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '_audit_out/pc_foundation_samples/2026-09-15_live_sample_01_FAILED.json'), 'utf8'));
  const bible = raw.parsedBible;
  if (!bible) { ok('retained sample file has a parsedBible to replay', false, 'file missing parsedBible — check the path/shape'); }
  else {
    const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
    const s = baseState();
    const source = win._pcFoundationSourceFacts(s);
    ok('source facts resolved for the replay', !!source);
    const result = win._validatePcFoundationOutput(bible, source);
    console.log('    full rejection list: ' + JSON.stringify(result.rejections));
    ok('the retained response is REJECTED overall', result.ok === false);
    ok('REJECTED — unsupported_family_death_or_disappearance (the vanished/dead mother)',
      result.rejections.some(r => r.field === 'wound.core' && r.reason === 'unsupported_family_death_or_disappearance'),
      JSON.stringify(result.rejections.filter(r => r.field === 'wound.core')));
    ok('REJECTED — unsupported_li_intimacy_precedent (the "only one who" Julian claim)',
      result.rejections.some(r => r.reason === 'unsupported_li_intimacy_precedent'),
      JSON.stringify(result.rejections.filter(r => r.reason === 'unsupported_li_intimacy_precedent')));
    ok('REJECTED — authority_misattributed_to_li (Julian deciding guilt, not the Dohkar)',
      result.rejections.some(r => r.reason === 'authority_misattributed_to_li'),
      JSON.stringify(result.rejections.filter(r => r.reason === 'authority_misattributed_to_li')));
  }
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 2 (GREEN FIXTURE) — a well-behaved, cited, source-supported response is ACCEPTED');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const source = win._pcFoundationSourceFacts(s);
  const greenBible = {
    core_contradiction: 'She knows the procedure better than she has ever performed it, and the gap between knowing and doing is where her fear lives now that everyone is watching.',
    private_hope: 'That the assembly sees her as capable, not merely lucky, once the truth of the misalignment comes out.',
    wound: { core: 'The same fear the facet names: failing where it can be witnessed and recounted, not privately.', category: 'PUBLIC', surfacing_hint: 'a public misalignment forcing her competence into question' },
    current_crisis: {
      event: 'The Dohkar has charged her with shaping and interfering and has not yet ruled; Julian has claimed the inquiry for himself.',
      immediate_fear: 'That the accusation outlives any answer she gives before the inquiry opens.',
      li_complication: 'Julian, who already knows something about her lineage, questioned her before the assembly as part of the same incident.',
      refusal: 'To let the Dohkar’s unproven charge stand unanswered before the inquiry Julian has claimed convenes.',
    },
    _provenance: {
      'wound.core': { basis: 'approved_facet:pc_fears_public_failure', cites: 'Failing is survivable; failing where it can be witnessed and recounted is not' },
      'core_contradiction': { basis: 'approved_facet:pc_untested_brilliance', cites: 'She knows the procedure better than she has ever performed it' },
      'private_hope': { basis: 'inferred', cites: '' },
      'current_crisis.li_complication': { basis: 'approved_bio', cites: 'Already knows something about the PC’s lineage' },
      'current_crisis.refusal': { basis: 'approved_scene1', cites: 'he has not yet ruled' },
    },
  };
  const result = win._validatePcFoundationOutput(greenBible, source);
  console.log('    full rejection list: ' + JSON.stringify(result.rejections));
  console.log('    accepted fields: ' + JSON.stringify(result.accepted));
  ok('the green fixture is ACCEPTED overall', result.ok === true, JSON.stringify(result.rejections));
  ok('every durable field was accepted', result.accepted.length === 5, JSON.stringify(result.accepted));
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 3 — citation layer catches a fabricated cites string even when basis is claimed non-inferred');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const source = win._pcFoundationSourceFacts(s);
  const badCiteBible = {
    core_contradiction: 'She secretly wishes she had never been chosen for this role at all.',
    _provenance: { 'core_contradiction': { basis: 'approved_facet:pc_untested_brilliance', cites: 'she secretly wishes she had never been chosen' } },
  };
  const result = win._validatePcFoundationOutput(badCiteBible, source);
  ok('a citation that does not actually appear in the approved source is REJECTED', result.ok === false
    && result.rejections.some(r => r.field === 'core_contradiction' && r.reason === 'citation_not_supported'));
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 4 — a field with NO _provenance entry at all is REJECTED once the response carries the apparatus');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const source = win._pcFoundationSourceFacts(s);
  const missingProvBible = {
    core_contradiction: 'She knows the procedure better than she has ever performed it.',
    private_hope: 'To be trusted with more than she has been.',
    _provenance: { 'core_contradiction': { basis: 'approved_facet:pc_untested_brilliance', cites: 'She knows the procedure better than she has ever performed it' } },
    // private_hope has NO entry at all
  };
  const result = win._validatePcFoundationOutput(missingProvBible, source);
  ok('private_hope (no _provenance entry) is REJECTED — no_valid_citation', result.rejections.some(r => r.field === 'private_hope' && r.reason === 'no_valid_citation'));
  ok('core_contradiction (has a valid entry) is still accepted', result.accepted.some(a => a.field === 'core_contradiction'));
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 5 — an OLD-SHAPE response (no _provenance at all) skips the citation layer, content layer still runs');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const source = win._pcFoundationSourceFacts(s);
  const oldShapeGood = { core_contradiction: 'She knows the procedure better than she has ever performed it.' };
  const r1 = win._validatePcFoundationOutput(oldShapeGood, source);
  ok('a supported claim with NO _provenance block at all is still accepted (content layer alone)', r1.ok === true, JSON.stringify(r1.rejections));

  const oldShapeBad = { wound: { core: 'Her father vanished during a sacrifice and never came back.' } };
  const r2 = win._validatePcFoundationOutput(oldShapeBad, source);
  ok('an unsupported family-loss claim with NO _provenance block is STILL rejected by the content layer alone',
    r2.ok === false && r2.rejections.some(r => r.reason === 'unsupported_family_death_or_disappearance'));
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 6 — the three named checks do not false-positive on ordinary, unrelated durable claims');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const source = win._pcFoundationSourceFacts(s);
  const mundane = {
    core_contradiction: 'She rehearses control because an unrehearsed moment once cost her a clean performance in front of her whole cohort.',
    private_hope: 'To finish a rite without a single visible tremor.',
  };
  const result = win._validatePcFoundationOutput(mundane, source);
  ok('ordinary, source-neutral claims are not falsely rejected', result.ok === true, JSON.stringify(result.rejections));
}

console.log('\n' + '='.repeat(70));
console.log(`PC FOUNDATION OUTPUT VALIDATOR CONTROL: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); process.exit(1); }
process.exit(0);
