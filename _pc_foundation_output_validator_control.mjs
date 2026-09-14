#!/usr/bin/env node
// _pc_foundation_output_validator_control.mjs
//
// OFFLINE control suite for _validatePcFoundationOutput + _commitValidatedPcFoundation (Roman,
// corrective follow-up #4, 2026-09-15). Covers the full corrected contract:
//   - PROVENANCE IS MANDATORY: a response with no valid _provenance object is rejected by name
//     (no_provenance_block) for every durable claim, never a content-only fallback.
//   - PER-FIELD, PER-BASIS-CATEGORY citation verification: a citation must be found within the
//     SPECIFIC source category its basis claims (bio / a named facet / relationship / scene1 /
//     posture) — a real snippet from the WRONG category is rejected too (citation_not_supported).
//   - The content layer (three named pattern checks) is an INDEPENDENT second fence: it runs
//     regardless of the provenance outcome, so a missing or malformed _provenance block cannot
//     evade it.
//   - _commitValidatedPcFoundation is ATOMIC: any rejection leaves state completely untouched
//     (no partial write); acceptance commits ONE additive, provenance-stamped update.
// Replays the ACTUAL retained failed sample (_audit_out/pc_foundation_samples/) and proves it is
// rejected by the three named reasons Roman identified, with zero state mutation. All sandboxed,
// offline, synthetic state only — nothing here touches real app/story state.

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
// The REAL _activeSeed (a one-liner reading real STARTER_SEEDS) — NOT the __seedFixture stub
// _pc_baseline_portfolio_control.mjs uses; _commitValidatedPcFoundation needs real seed
// resolution to reach _ensurePcPortfolio's genuine fixed-starter branch.
const activeSeedLine = extractLine('function _activeSeed(s) {');

// _ensurePcPortfolio/_pcFacetsFromBodyBible/_normFacet all live in this one region (same slice
// _pc_baseline_portfolio_control.mjs already extracts and proves, reused verbatim here — never a
// second, independently-drifting copy of "how the fixed-starter portfolio is built").
const relLedgerSrc = sliceByAnchor('rel-ledger-primitives',
  'var REL_V = 1;',
  'return _relMatchByName(L, n, opts);\n  };');
const cplusPipelineSrc = sliceByAnchor('cplus-pipeline-and-pc-portfolio',
  'function _isPlaceholderPcName(v) {',
  'window._CPLUS_PC_BEAT_OWNER = _CPLUS_PC_BEAT_OWNER;') + '\n  }';

// The NEW validator + merge region (this task) — source-facts extractor through the merge
// function's own export, in real file order.
const validatorSrc = sliceByAnchor('pc-foundation-source-validator-and-merge',
  'function _pcFoundationSourceFacts(s) {',
  "window._commitValidatedPcFoundation = _commitValidatedPcFoundation;") + ' } catch (_) {}';

const body = activeSeedLine + '\n' + relLedgerSrc + '\n' + cplusPipelineSrc + '\n' + validatorSrc;
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
    storyId: 'test-story-1',
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

// A FULLY, CORRECTLY cited green bible — covers all 8 durable fields the schema now requires
// provenance for, every citation genuinely found within its claimed category.
function fullyCoveredGreenBible() {
  return {
    wound: {
      core: 'Failing is survivable; failing where it can be witnessed and recounted is not, so she manages the audience as much as the task.',
      category: 'PUBLIC',
      surfacing_hint: 'a public misalignment forcing her competence into question',
    },
    core_contradiction: 'She knows the procedure better than she has ever performed it, and the gap between knowing and doing is where her fear lives now that everyone is watching.',
    private_hope: 'That the assembly sees her as capable, not merely lucky, once the truth of the misalignment comes out.',
    current_crisis: {
      event: 'The presiding Dohkar has charged her with shaping and interfering, and the matter has not yet been resolved before the gathered assembly.',
      immediate_fear: 'That the accusation outlives any answer she gives before the inquiry opens.',
      li_complication: 'Julian, who already knows something about her lineage, questioned her before the assembly as part of the same incident.',
      refusal: 'To let the presiding Dohkar’s unproven charge stand unanswered before the coming inquiry convenes.',
    },
    _provenance: {
      'wound.core': { basis: 'approved_facet:pc_fears_public_failure', cites: 'Failing is survivable; failing where it can be witnessed and recounted is not' },
      'wound.surfacing_hint': { basis: 'inferred', cites: '' },
      'core_contradiction': { basis: 'approved_facet:pc_untested_brilliance', cites: 'She knows the procedure better than she has ever performed it' },
      'private_hope': { basis: 'inferred', cites: '' },
      'current_crisis.event': { basis: 'approved_scene1', cites: 'The presiding Dohkar has charged Lirael with shaping the wish and with interfering' },
      'current_crisis.immediate_fear': { basis: 'inferred', cites: '' },
      'current_crisis.li_complication': { basis: 'approved_relationship', cites: 'Already knows something about the PC’s lineage' },
      'current_crisis.refusal': { basis: 'approved_scene1', cites: 'he has not yet ruled' },
    },
  };
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 1 (RETAINED SAMPLE) — the ACTUAL failed live response is rejected by the three named reasons, with ZERO state mutation');
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
    ok('REJECTED — no_provenance_block (the retained sample carries no _provenance at all — mandatory, not optional)',
      result.rejections.some(r => r.reason === 'no_provenance_block'));
    ok('REJECTED — unsupported_family_death_or_disappearance (the vanished/dead mother)',
      result.rejections.some(r => r.field === 'wound.core' && r.reason === 'unsupported_family_death_or_disappearance'),
      JSON.stringify(result.rejections.filter(r => r.field === 'wound.core')));
    ok('REJECTED — unsupported_li_intimacy_precedent (the "only one who" Julian claim)',
      result.rejections.some(r => r.reason === 'unsupported_li_intimacy_precedent'),
      JSON.stringify(result.rejections.filter(r => r.reason === 'unsupported_li_intimacy_precedent')));
    ok('REJECTED — authority_misattributed_to_li (Julian deciding guilt, not the Dohkar)',
      result.rejections.some(r => r.reason === 'authority_misattributed_to_li'),
      JSON.stringify(result.rejections.filter(r => r.reason === 'authority_misattributed_to_li')));

    // NO WRITE/MERGE ON REJECTION — sandboxed state, never real app state.
    const sBefore = JSON.parse(JSON.stringify(s));
    const merge = win._commitValidatedPcFoundation(s, bible);
    ok('the merge REFUSES to commit a rejected response', merge.committed === false && merge.reason === 'validation_failed', JSON.stringify(merge));
    ok('sandboxed state is byte-identical after the refused merge — zero mutation', JSON.stringify(s) === JSON.stringify(sBefore));
    ok('no _pcPortfolio was created as a side effect of the refused merge', s._pcPortfolio === undefined);
  }
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 2 (GREEN FIXTURE) — a fully cited, source-supported response is ACCEPTED and merges atomically');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const source = win._pcFoundationSourceFacts(s);
  const greenBible = fullyCoveredGreenBible();
  const result = win._validatePcFoundationOutput(greenBible, source);
  console.log('    full rejection list: ' + JSON.stringify(result.rejections));
  console.log('    accepted fields: ' + JSON.stringify(result.accepted));
  ok('the green fixture is ACCEPTED overall', result.ok === true, JSON.stringify(result.rejections));
  ok('all 8 durable fields were accepted', result.accepted.length === 8, JSON.stringify(result.accepted));

  // Seed the real portfolio first (fixed-starter branch — her own two authored facets).
  win._ensurePcPortfolio(s);
  const seedFacetIdsBefore = (s._pcPortfolio.facets || []).map(f => f.facet_id).sort();
  const seedFacetsSnapshot = JSON.parse(JSON.stringify(s._pcPortfolio.facets));

  const merge = win._commitValidatedPcFoundation(s, greenBible);
  ok('the merge COMMITS for an accepted response', merge.committed === true, JSON.stringify(merge));
  const stillPresent = seedFacetsSnapshot.every(orig => (s._pcPortfolio.facets || []).some(f => JSON.stringify(f) === JSON.stringify(orig)));
  ok('the seed\'s own facets remain byte-identical after the merge (additive, never overwritten)', stillPresent);
  const newIds = (s._pcPortfolio.facets || []).map(f => f.facet_id).filter(id => !seedFacetIdsBefore.includes(id));
  ok('new bible-derived facets were actually added', newIds.length > 0, JSON.stringify(newIds));
  ok('new facets are tagged with a distinct origin, never confusable with seed canon',
    (s._pcPortfolio.facets || []).filter(f => newIds.includes(f.facet_id)).every(f => f.origin === 'pc_body_bible_validated'));
  ok('the portfolio carries a validated-merge provenance stamp', !!(s._pcPortfolio.provenance && s._pcPortfolio.provenance.validatedMerge));
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 3 — MANDATORY PROVENANCE: a response with NO _provenance object at all is rejected by name, never content-only-accepted');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const source = win._pcFoundationSourceFacts(s);
  const noProvBible = { core_contradiction: 'She knows the procedure better than she has ever performed it.' };   // real, source-supported content, but NO _provenance at all
  const result = win._validatePcFoundationOutput(noProvBible, source);
  ok('a response with NO _provenance object is REJECTED overall, even though the content itself is genuinely supported',
    result.ok === false && result.rejections.some(r => r.field === 'core_contradiction' && r.reason === 'no_provenance_block'));
  ok('nothing was accepted (no content-only fallback)', result.accepted.length === 0, JSON.stringify(result.accepted));

  // Malformed shapes must never crash and must never silently pass. Two distinct, both
  // legitimately named, rejection shapes: something that isn't an object at all (null / string /
  // number / array) fails the mandatory-provenance gate outright (no_provenance_block); a real
  // but EMPTY/irrelevant object (no entry for this field) falls through to the ordinary
  // per-field check (no_valid_citation) — both are still a NAMED reject, never a silent pass.
  const notAnObject = [null, 'a string', 42, []];
  notAnObject.forEach(bad => {
    const b = { core_contradiction: 'She knows the procedure better than she has ever performed it.', _provenance: bad };
    const r = win._validatePcFoundationOutput(b, source);
    ok('_provenance = ' + JSON.stringify(bad) + ' (not an object) is treated as missing — no_provenance_block', r.ok === false && r.rejections.some(x => x.reason === 'no_provenance_block'));
  });
  {
    const b = { core_contradiction: 'She knows the procedure better than she has ever performed it.', _provenance: { random: 'garbage' } };
    const r = win._validatePcFoundationOutput(b, source);
    ok('_provenance = a real object with no entry for this field is rejected — no_valid_citation (never silently passed)', r.ok === false && r.rejections.some(x => x.reason === 'no_valid_citation'), JSON.stringify(r.rejections));
  }
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 4 — a citation that names a REAL source but the WRONG category is rejected (not the same as a fabricated citation)');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const source = win._pcFoundationSourceFacts(s);
  const wrongCategoryBible = {
    core_contradiction: 'She rehearses control because everyone is watching.',
    _provenance: {
      // basis claims this comes from HER OWN facet, but the cited text is real — it is Julian's
      // bio, not her facet. A real, existing string, the WRONG category for this claim.
      'core_contradiction': { basis: 'approved_facet:pc_untested_brilliance', cites: 'Already knows something about the PC’s lineage' },
    },
  };
  const result = win._validatePcFoundationOutput(wrongCategoryBible, source);
  ok('a real-but-wrong-category citation is REJECTED — citation_not_supported', result.ok === false
    && result.rejections.some(r => r.field === 'core_contradiction' && r.reason === 'citation_not_supported'));

  const fabricatedBible = {
    core_contradiction: 'She secretly wishes she had never been chosen for this role at all.',
    _provenance: { 'core_contradiction': { basis: 'approved_facet:pc_untested_brilliance', cites: 'she secretly wishes she had never been chosen' } },
  };
  const result2 = win._validatePcFoundationOutput(fabricatedBible, source);
  ok('a wholly fabricated citation is ALSO rejected — citation_not_supported', result2.ok === false
    && result2.rejections.some(r => r.field === 'core_contradiction' && r.reason === 'citation_not_supported'));

  const badFacetIdBible = {
    core_contradiction: 'She knows the procedure better than she has ever performed it.',
    _provenance: { 'core_contradiction': { basis: 'approved_facet:pc_does_not_exist', cites: 'anything' } },
  };
  const result3 = win._validatePcFoundationOutput(badFacetIdBible, source);
  ok('a basis naming a facet_id that does not exist is rejected — citation_basis_not_found', result3.ok === false
    && result3.rejections.some(r => r.field === 'core_contradiction' && r.reason === 'citation_basis_not_found'));

  const badBasisBible = {
    core_contradiction: 'She knows the procedure better than she has ever performed it.',
    _provenance: { 'core_contradiction': { basis: 'made_up_basis_value', cites: 'anything' } },
  };
  const result4 = win._validatePcFoundationOutput(badBasisBible, source);
  ok('an unrecognized basis enum value is rejected — invalid_basis_value', result4.ok === false
    && result4.rejections.some(r => r.field === 'core_contradiction' && r.reason === 'invalid_basis_value'));
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 5 — a partially cited response: seven fields correct, ONE durable claim unsupported, is rejected overall (no averaging, no majority pass)');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const source = win._pcFoundationSourceFacts(s);
  const partial = fullyCoveredGreenBible();
  // Sabotage exactly one field's citation — everything else stays fully correct.
  partial._provenance['current_crisis.refusal'] = { basis: 'approved_bio', cites: 'a phrase that is not in her approved bio at all' };
  const result = win._validatePcFoundationOutput(partial, source);
  ok('the response is REJECTED overall from a single bad field', result.ok === false);
  ok('exactly the sabotaged field is rejected — citation_not_supported',
    result.rejections.length === 1 && result.rejections[0].field === 'current_crisis.refusal' && result.rejections[0].reason === 'citation_not_supported',
    JSON.stringify(result.rejections));
  ok('the other seven, genuinely correct fields are still individually accepted', result.accepted.length === 7, JSON.stringify(result.accepted));

  const sBefore = JSON.parse(JSON.stringify(s));
  const merge = win._commitValidatedPcFoundation(s, partial);
  ok('the merge REFUSES a partially-valid response too — all-or-nothing, never a partial portfolio', merge.committed === false);
  ok('sandboxed state is untouched after the refused partial merge', JSON.stringify(s) === JSON.stringify(sBefore));
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 6 — the content-layer fence fires independently of provenance status (malformed or missing provenance cannot evade it)');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const source = win._pcFoundationSourceFacts(s);

  // Dangerous content, NO _provenance at all.
  const noProv = { wound: { core: 'Her father vanished during a sacrifice and never came back.' } };
  const r1 = win._validatePcFoundationOutput(noProv, source);
  ok('dangerous content with NO _provenance is rejected for BOTH reasons (mandatory-provenance AND content)',
    r1.ok === false && r1.rejections.some(x => x.reason === 'no_provenance_block') && r1.rejections.some(x => x.reason === 'unsupported_family_death_or_disappearance'));

  // Dangerous content, a self-reported "inferred" basis — does NOT excuse it.
  const inferredEvasion = {
    wound: { core: 'Her father vanished during a sacrifice and never came back.' },
    _provenance: { 'wound.core': { basis: 'inferred', cites: '' } },
  };
  const r2 = win._validatePcFoundationOutput(inferredEvasion, source);
  ok('marking a minted family-death event "inferred" does NOT excuse it — content layer still rejects it',
    r2.ok === false && r2.rejections.some(x => x.field === 'wound.core' && x.reason === 'unsupported_family_death_or_disappearance'), JSON.stringify(r2.rejections));

  // Dangerous content, a FABRICATED but well-formed citation trying to look legitimate.
  const fakedCitation = {
    wound: { core: 'Her father vanished during a sacrifice and never came back.' },
    _provenance: { 'wound.core': { basis: 'approved_facet:pc_fears_public_failure', cites: 'Failing is survivable; failing where it can be witnessed and recounted is not' } },
  };
  const r3 = win._validatePcFoundationOutput(fakedCitation, source);
  ok('a real, valid-LOOKING citation attached to dangerous content still gets caught by the content layer',
    r3.ok === false && r3.rejections.some(x => x.field === 'wound.core' && x.reason === 'unsupported_family_death_or_disappearance'), JSON.stringify(r3.rejections));
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 7 — ordinary, source-neutral claims with COMPLETE citations are not falsely rejected');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const source = win._pcFoundationSourceFacts(s);
  const mundane = {
    core_contradiction: 'She rehearses control because an unrehearsed moment once cost her a clean performance in front of her whole cohort.',
    private_hope: 'To finish a rite without a single visible tremor.',
    _provenance: {
      'core_contradiction': { basis: 'inferred', cites: '' },
      'private_hope': { basis: 'inferred', cites: '' },
    },
  };
  const result = win._validatePcFoundationOutput(mundane, source);
  ok('ordinary, source-neutral, fully-cited claims are not falsely rejected', result.ok === true, JSON.stringify(result.rejections));
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 8 — corridor / no fixed-starter source: the merge refuses cleanly, never crashes, never half-writes');
{
  const win = freshSandbox({});
  const s = { _starterId: null };   // corridor — no seed at all
  const merge = win._commitValidatedPcFoundation(s, fullyCoveredGreenBible());
  ok('the merge refuses for a non-fixed-starter story', merge.committed === false && merge.reason === 'no_fixed_starter_source', JSON.stringify(merge));
}

console.log('\n' + '='.repeat(70));
console.log(`PC FOUNDATION OUTPUT VALIDATOR + MERGE CONTROL: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); process.exit(1); }
process.exit(0);
