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
      refusal: 'To let the Dohkar’s claim that she was shaping the wish and interfering go unanswered before he has ruled.',
    },
    _provenance: {
      'wound.core': { kind: 'locked_canon_fact', basis: 'approved_facet:pc_fears_public_failure', cites: 'Failing is survivable; failing where it can be witnessed and recounted is not' },
      'wound.surfacing_hint': { kind: 'grounded_inference', basis: 'inferred', cites: '' },
      'core_contradiction': { kind: 'locked_canon_fact', basis: 'approved_facet:pc_untested_brilliance', cites: 'She knows the procedure better than she has ever performed it' },
      'private_hope': { kind: 'grounded_inference', basis: 'inferred', cites: '' },
      'current_crisis.event': { kind: 'locked_canon_fact', basis: 'approved_scene1', cites: 'The presiding Dohkar has charged Lirael with shaping the wish and with interfering' },
      'current_crisis.immediate_fear': { kind: 'grounded_inference', basis: 'inferred', cites: '' },
      'current_crisis.li_complication': { kind: 'locked_canon_fact', basis: 'approved_relationship', cites: 'Already knows something about the PC’s lineage' },
      'current_crisis.refusal': { kind: 'locked_canon_fact', basis: 'approved_scene1', cites: 'The presiding Dohkar has charged Lirael with shaping the wish and with interfering; he has not yet ruled' },
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
      'core_contradiction': { kind: 'locked_canon_fact', basis: 'approved_facet:pc_untested_brilliance', cites: 'Already knows something about the PC’s lineage' },
    },
  };
  const result = win._validatePcFoundationOutput(wrongCategoryBible, source);
  ok('a real-but-wrong-category citation is REJECTED — citation_not_supported', result.ok === false
    && result.rejections.some(r => r.field === 'core_contradiction' && r.reason === 'citation_not_supported'));

  const fabricatedBible = {
    core_contradiction: 'She secretly wishes she had never been chosen for this role at all.',
    _provenance: { 'core_contradiction': { kind: 'locked_canon_fact', basis: 'approved_facet:pc_untested_brilliance', cites: 'she secretly wishes she had never been chosen' } },
  };
  const result2 = win._validatePcFoundationOutput(fabricatedBible, source);
  ok('a wholly fabricated citation is ALSO rejected — citation_not_supported', result2.ok === false
    && result2.rejections.some(r => r.field === 'core_contradiction' && r.reason === 'citation_not_supported'));

  const badFacetIdBible = {
    core_contradiction: 'She knows the procedure better than she has ever performed it.',
    _provenance: { 'core_contradiction': { kind: 'locked_canon_fact', basis: 'approved_facet:pc_does_not_exist', cites: 'anything' } },
  };
  const result3 = win._validatePcFoundationOutput(badFacetIdBible, source);
  ok('a basis naming a facet_id that does not exist is rejected — citation_basis_not_found', result3.ok === false
    && result3.rejections.some(r => r.field === 'core_contradiction' && r.reason === 'citation_basis_not_found'));

  const badBasisBible = {
    core_contradiction: 'She knows the procedure better than she has ever performed it.',
    _provenance: { 'core_contradiction': { kind: 'locked_canon_fact', basis: 'made_up_basis_value', cites: 'anything' } },
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
  partial._provenance['current_crisis.refusal'] = { kind: 'locked_canon_fact', basis: 'approved_bio', cites: 'a phrase that is not in her approved bio at all' };
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
    _provenance: { 'wound.core': { kind: 'grounded_inference', basis: 'inferred', cites: '' } },
  };
  const r2 = win._validatePcFoundationOutput(inferredEvasion, source);
  ok('marking a minted family-death event "inferred" does NOT excuse it — content layer still rejects it',
    r2.ok === false && r2.rejections.some(x => x.field === 'wound.core' && x.reason === 'unsupported_family_death_or_disappearance'), JSON.stringify(r2.rejections));

  // Dangerous content, a FABRICATED but well-formed citation trying to look legitimate.
  const fakedCitation = {
    wound: { core: 'Her father vanished during a sacrifice and never came back.' },
    _provenance: { 'wound.core': { kind: 'locked_canon_fact', basis: 'approved_facet:pc_fears_public_failure', cites: 'Failing is survivable; failing where it can be witnessed and recounted is not' } },
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
      'core_contradiction': { kind: 'grounded_inference', basis: 'inferred', cites: '' },
      'private_hope': { kind: 'grounded_inference', basis: 'inferred', cites: '' },
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

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 9 (Roman\'s exact exploit) — a citation to the RIGHT category that does NOT support THIS specific claim is rejected, category membership alone is not entailment');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
  const s = baseState();
  const source = win._pcFoundationSourceFacts(s);
  // "A Lirael bio citation should not be able to justify any arbitrary wound merely because both
  // are seed_bio" — cites a REAL, CORRECTLY-CATEGORIZED (approved_bio) fragment of her own bio
  // that has nothing to do with the invented wound it is attached to.
  const sameCategoryUnrelated = {
    wound: { core: 'Her mother vanished during a ritual sacrifice years ago and was never seen again.' },
    _provenance: {
      'wound.core': { kind: 'locked_canon_fact', basis: 'approved_bio', cites: 'Today is her first time SUPERVISING another person’s First Sacrifice' },
    },
  };
  const result = win._validatePcFoundationOutput(sameCategoryUnrelated, source);
  ok('REJECTED overall despite a real, correctly-categorized citation', result.ok === false);
  ok('rejected specifically for citation_does_not_support_claim (not citation_not_supported — the category WAS right)',
    result.rejections.some(r => r.field === 'wound.core' && r.reason === 'citation_does_not_support_claim'), JSON.stringify(result.rejections));
  ok('the content-layer fence ALSO independently catches this (belt and suspenders — a family-death claim is dangerous regardless of citation shape)',
    result.rejections.some(r => r.field === 'wound.core' && r.reason === 'unsupported_family_death_or_disappearance'), JSON.stringify(result.rejections));

  const sBefore = JSON.parse(JSON.stringify(s));
  win._ensurePcPortfolio(s);
  const beforeMerge = JSON.parse(JSON.stringify(s));
  const merge = win._commitValidatedPcFoundation(s, sameCategoryUnrelated);
  ok('the merge REFUSES this exploit attempt', merge.committed === false);
  ok('sandboxed state is unchanged by the refused merge', JSON.stringify(s) === JSON.stringify(beforeMerge));

  // Now the POSITIVE contrast, same category, but a citation that GENUINELY entails the claim.
  const sameCategorySupported = {
    core_contradiction: 'She is brilliant but untested, and she is terrified of failing publicly now that the whole assembly is watching.',
    _provenance: {
      'core_contradiction': { kind: 'locked_canon_fact', basis: 'approved_bio', cites: 'Brilliant but untested; terrified of failing publicly' },
    },
  };
  const result2 = win._validatePcFoundationOutput(sameCategorySupported, source);
  ok('the SAME category, when the citation genuinely entails the claim, is ACCEPTED', result2.ok === true, JSON.stringify(result2.rejections));
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 10 (FACET-INDEX WIRING) — a validated, committed portfolio reaches _facetIndex; PC-only, additive, refuses stale/foreign material');
{
  // 10a — REGRESSION: no portfolio at all. _facetIndex for the PC id must be IDENTICAL to
  // seed-only behavior — the seed's own two facets, nothing from a portfolio that doesn't exist.
  {
    const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
    const s = baseState({ playerName: "Lirael" });
    const idx = win._facetIndex(s, { sceneNumber: 2 });
    const rec = idx['pc:lirael'];
    ok('10a: with no portfolio, pc:lirael resolves (seed provider alone)', !!rec, JSON.stringify(Object.keys(idx)));
    const ids = (rec && rec.facets || []).map(f => f.facet_id).sort();
    ok('10a: exactly the seed\'s own two facets, no validated-merge facets present',
      JSON.stringify(ids) === JSON.stringify(['pc_fears_public_failure', 'pc_untested_brilliance']), JSON.stringify(ids));
  }

  // 10b — GREEN: a real _commitValidatedPcFoundation merge, then _facetIndex must carry the
  // validated facets ADDITIVELY alongside the seed's own — neither replaced nor duplicated.
  {
    const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
    const s = baseState({ playerName: "Lirael" });
    const commit = win._commitValidatedPcFoundation(s, fullyCoveredGreenBible());
    ok('10b: the green bible commits successfully (precondition for this control)', commit.committed === true, JSON.stringify(commit));
    const idx = win._facetIndex(s, { sceneNumber: 2 });
    const rec = idx['pc:lirael'];
    const ids = (rec && rec.facets || []).map(f => f.facet_id).sort();
    ok('10b: all four facet_ids present — 2 seed-authored + 2 validated-merge, additive',
      JSON.stringify(ids) === JSON.stringify(['pc_core_contradiction', 'pc_current_fear', 'pc_fears_public_failure', 'pc_untested_brilliance']),
      JSON.stringify(ids));
    const validatedOnes = (rec.facets || []).filter(f => f.origin === 'pc_body_bible_validated');
    ok('10b: the two validated facets are tagged origin:pc_body_bible_validated', validatedOnes.length === 2, JSON.stringify(validatedOnes.map(f => f.facet_id)));
    const seedOnes = (rec.facets || []).filter(f => f.facet_id === 'pc_untested_brilliance' || f.facet_id === 'pc_fears_public_failure');
    ok('10b: the seed\'s own two facets are UNTOUCHED (same canonical_truth as the raw fixture)',
      seedOnes.length === 2
      && seedOnes.every(f => FIRST_SACRIFICE_SEED.cast[0].cPlusFacets.some(sf => sf.facet_id === f.facet_id && sf.canonical_truth === f.canonical_truth)));
    ok('10b: no identity conflict was raised for pc:lirael (seed and validated-portfolio providers agree on who she is)', !rec.identity_conflict);
    // Resolution as a live consumer (_cpContinuationAssignment/_facetsForCharacter) would see it —
    // a staged record keyed the same way _cPlusCandidateSet stages the PC.
    const resolved = win._resolveFacetIndexEntry({ id: 'pc:lirael', label: 'Lirael', aliases: ['Lirael'] }, idx, 2);
    ok('10b: _resolveFacetIndexEntry (the exact function _facetsForCharacter/_cpContinuationAssignment call) returns all 4 facets',
      resolved.length === 4, JSON.stringify(resolved.map(f => f.facet_id)));
  }

  // 10c — NPC RESOLUTION UNTOUCHED: add a real NPC-shaped seed facet source alongside the PC and
  // confirm the validated-portfolio provider contributes NOTHING to it, before or after a commit.
  {
    const seedWithNpc = JSON.parse(JSON.stringify(FIRST_SACRIFICE_SEED));
    seedWithNpc.cast[1].cPlusFacets = [
      { facet_id: 'li_guarded_knowledge', category: 'history', canonical_truth: 'Julian already knows something about her lineage and has chosen not to say it.' },
    ];
    const win = freshSandbox({ starter_first_sacrifice: seedWithNpc });
    const s = baseState({ playerName: "Lirael" });
    const idxBefore = win._facetIndex(s, { sceneNumber: 2 });
    win._commitValidatedPcFoundation(s, fullyCoveredGreenBible());
    const idxAfter = win._facetIndex(s, { sceneNumber: 2 });
    const npcBefore = JSON.stringify((idxBefore['named:julian'] || {}).facets || []);
    const npcAfter = JSON.stringify((idxAfter['named:julian'] || {}).facets || []);
    ok('10c: Julian (NPC) has his own facet before any PC commit', !!(idxBefore['named:julian'] && idxBefore['named:julian'].facets.length));
    ok('10c: Julian (NPC) facets are BYTE-IDENTICAL after a validated PC commit — never touched', npcBefore === npcAfter, npcBefore + ' vs ' + npcAfter);
    ok('10c: the validated-portfolio provider never produced a "named:julian" or any non-"pc:" key',
      Object.keys(idxAfter).every(k => k === 'named:julian' || k.indexOf('pc:') === 0));
  }

  // 10d — STALE/FOREIGN REFUSAL: four independent ways a portfolio must contribute NOTHING.
  {
    const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });

    // (i) built (via _ensurePcPortfolio) but never validated-merged — today's exact pre-feature shape.
    const s1 = baseState({ playerName: "Lirael" });
    win._ensurePcPortfolio(s1);
    ok('10d(i): a bare, never-validated portfolio contributes no facets to the provider',
      Object.keys(win._pcValidatedFacetIndex(s1, {})).length === 0);

    // (ii) validated-merged for a DIFFERENT story (foreign story identity).
    const s2 = baseState({ playerName: "Lirael" });
    win._commitValidatedPcFoundation(s2, fullyCoveredGreenBible());
    const foreign = JSON.parse(JSON.stringify(s2));
    foreign.storyId = 'a-totally-different-story';
    ok('10d(ii): a portfolio committed under a different storyId contributes nothing to THIS story',
      Object.keys(win._pcValidatedFacetIndex(foreign, {})).length === 0);

    // (iii) validated-merged, correct story, but the fingerprint has been tampered with / gone stale.
    const s3 = baseState({ playerName: "Lirael" });
    win._commitValidatedPcFoundation(s3, fullyCoveredGreenBible());
    s3._pcPortfolio.provenance.fingerprint = 'pf:tampered-or-stale';
    ok('10d(iii): a portfolio whose fingerprint no longer matches the current seed contributes nothing',
      Object.keys(win._pcValidatedFacetIndex(s3, {})).length === 0);

    // (iv) same story, but the seed underneath it has genuinely changed (a facet_id added/removed) —
    // the fingerprint recomputes differently, so this is refused exactly like (iii), not silently trusted.
    const s4 = baseState({ playerName: "Lirael" });
    win._commitValidatedPcFoundation(s4, fullyCoveredGreenBible());
    const mutatedSeed = JSON.parse(JSON.stringify(FIRST_SACRIFICE_SEED));
    mutatedSeed.cast[0].cPlusFacets.push({ facet_id: 'pc_new_seed_facet', category: 'value', canonical_truth: 'Something the seed added later.' });
    const winMutated = freshSandbox({ starter_first_sacrifice: mutatedSeed });
    ok('10d(iv): the SAME committed record, read against a seed that has since changed, contributes nothing (fingerprint no longer matches)',
      Object.keys(winMutated._pcValidatedFacetIndex(s4, {})).length === 0);
  }

  // 10e — SEED-OWNED FACET_ID IS NEVER CONTENDED FOR: even if a portfolio somehow carried a
  // validated-merge facet reusing one of the seed's own facet_ids, the provider must skip it
  // rather than let it compete with (and risk tombstoning) the seed's authored fact.
  {
    const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
    const s = baseState({ playerName: "Lirael" });
    win._ensurePcPortfolio(s);
    s._pcPortfolio.facets.push({ facet_id: 'pc_untested_brilliance', category: 'competence',
      canonical_truth: 'A DIFFERENT, model-authored version of the same facet_id.', origin: 'pc_body_bible_validated' });
    s._pcPortfolio.provenance.validatedMerge = { at: Date.now(), bibleProvenance: null, mergedFacetIds: ['pc_untested_brilliance'] };
    s._pcPortfolio.provenance.fingerprint = win._pcPortfolioFingerprint(['fixed_starter', s._starterId,
      FIRST_SACRIFICE_SEED.cast[0].cPlusFacets.map(f => f.facet_id).join(',')]);
    const out = win._pcValidatedFacetIndex(s, {});
    ok('10e: a validated-merge facet colliding with a seed facet_id is skipped, not emitted',
      Object.keys(out).length === 0 || !(out['pc:lirael'] && out['pc:lirael'].facets.some(f => f.facet_id === 'pc_untested_brilliance')),
      JSON.stringify(out));
    const idx = win._facetIndex(s, { sceneNumber: 2 });
    const truth = (idx['pc:lirael'].facets.find(f => f.facet_id === 'pc_untested_brilliance') || {}).canonical_truth;
    ok('10e: the SEED\'s own canonical_truth for that facet_id survives in the merged index, not the colliding one',
      truth === FIRST_SACRIFICE_SEED.cast[0].cPlusFacets[0].canonical_truth, truth);
  }

  // 10f — CORRIDOR / NO FIXED-STARTER PC: the provider must structurally contribute nothing.
  {
    const win = freshSandbox({});
    const s = { storyId: 'corridor-story-1' }; // no _starterId at all
    ok('10f: no active seed at all (corridor) yields no validated-portfolio contribution',
      Object.keys(win._pcValidatedFacetIndex(s, {})).length === 0);
  }

  // 10g — RETAINED BAD SAMPLE, THROUGH THE SAME PATH: the rejected response must never reach the
  // facet index either (this is the same replay CONTROL 1 runs, checked here for index-reachability).
  {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '_audit_out/pc_foundation_samples/2026-09-15_live_sample_01_FAILED.json'), 'utf8'));
    const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });
    const s = baseState({ playerName: "Lirael" });
    win._commitValidatedPcFoundation(s, raw.parsedBible);
    const idx = win._facetIndex(s, { sceneNumber: 2 });
    const ids = (idx['pc:lirael'].facets || []).map(f => f.facet_id).sort();
    ok('10g: after replaying the retained REJECTED sample through the real merge boundary, the facet index still holds only the seed\'s own two facets',
      JSON.stringify(ids) === JSON.stringify(['pc_fears_public_failure', 'pc_untested_brilliance']), JSON.stringify(ids));
  }
}

// ══════════════════════════════════════════════════════════════════════════════════
section('CONTROL 11 (THREE-KIND REDESIGN, Roman corrective #12, 2026-09-15) — generated_foundation can be accepted; false-sourcing and hard red lines still reject; retained samples replay unmodified');
{
  const win = freshSandbox({ starter_first_sacrifice: FIRST_SACRIFICE_SEED });

  // 11a/11b — REPLAY THE ACTUAL RETAINED LIVE SAMPLES, UNMODIFIED. Not rewritten to pass — the
  // whole point is to prove they are STILL rejected under the new schema, for the reason the new
  // schema actually names: neither ever declared a "kind" at all (they predate this redesign),
  // so every durable claim they make is rejected as missing_or_invalid_claim_kind — plus,
  // independently, the hard-red-line content checks still catch the SAME dangerous content
  // (an invented family-tragedy claim) exactly as before, since a claim with no resolvable kind
  // is conservatively treated as neither locked nor inferred nor generated.
  ['2026-09-15T21-40-55-755Z_live_sample.json', '2026-09-15T21-58-49-058Z_live_sample.json'].forEach((fname, i) => {
    const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '_audit_out/pc_foundation_samples', fname), 'utf8'));
    const bible = raw.parsedBible;
    if (!bible) { ok('11' + (i ? 'b' : 'a') + ': ' + fname + ' has a parsedBible to replay', false, 'missing parsedBible'); return; }
    const s = baseState({ playerName: 'Lirael' });
    const source = win._pcFoundationSourceFacts(s);
    const result = win._validatePcFoundationOutput(bible, source);
    ok('11' + (i ? 'b' : 'a') + ': retained sample ' + fname + ' (pre-redesign, no "kind" declared anywhere) is REJECTED, not auto-rewritten to pass',
      result.ok === false);
    ok('11' + (i ? 'b' : 'a') + ': rejected specifically for missing_or_invalid_claim_kind on at least one field (the honest reason under the new schema)',
      result.rejections.some(r => r.reason === 'missing_or_invalid_claim_kind'), JSON.stringify(result.rejections.map(r => r.reason)));
    ok('11' + (i ? 'b' : 'a') + ': the SAME dangerous content is STILL independently caught by a hard-red-line or unsupported-invention check (kind resolving to null is treated conservatively, not as a free pass)',
      result.rejections.some(r => r.reason === 'unsupported_family_death_or_disappearance' || r.reason === 'citation_does_not_support_claim' || r.reason === 'citation_not_supported' || r.reason === 'authority_misattributed_to_li'),
      JSON.stringify(result.rejections.map(r => r.reason)));
    const before = JSON.parse(JSON.stringify(s._pcPortfolio || null));
    const merge = win._commitValidatedPcFoundation(s, bible);
    ok('11' + (i ? 'b' : 'a') + ': merge refuses, zero mutation', merge.committed === false && JSON.stringify(s._pcPortfolio || null) === JSON.stringify(before));
  });

  // 11c — A CORRECTLY-TYPED "Elowen" fixture: the SAME kind of new-sister backstory the retained
  // sample invented, but honestly declared kind:'generated_foundation', basis:'generated', cites
  // empty. Must be ACCEPTED and MERGED — proving the redesign actually permits legitimate
  // invention, not just rejects everything the way the prior design effectively did.
  {
    const s = baseState({ playerName: 'Lirael' });
    const source = win._pcFoundationSourceFacts(s);
    const generatedElowen = {
      wound: {
        core: 'her estranged sister Elowen, who left the Favored ranks after a public scandal — Lirael has carried the guilt of not stopping her since she was sixteen',
        category: 'PUBLIC',
        surfacing_hint: 'a public failure that forces her to confront the same flaws Elowen was cast out for',
      },
      core_contradiction: 'She knows the procedure better than she has ever performed it, and the gap between knowing and doing is where her fear lives.',
      _provenance: {
        'wound.core': { kind: 'generated_foundation', basis: 'generated', cites: '' },
        'wound.surfacing_hint': { kind: 'generated_foundation', basis: 'generated', cites: '' },
        'core_contradiction': { kind: 'locked_canon_fact', basis: 'approved_facet:pc_untested_brilliance', cites: 'She knows the procedure better than she has ever performed it' },
      },
    };
    const result = win._validatePcFoundationOutput(generatedElowen, source);
    ok('11c: a correctly-typed generated_foundation "new sister" claim is ACCEPTED (no rejections)', result.ok === true, JSON.stringify(result.rejections));
    ok('11c: accepted[] records kind:"generated_foundation" for wound.core', result.accepted.some(a => a.field === 'wound.core' && a.kind === 'generated_foundation'), JSON.stringify(result.accepted));

    const merge = win._commitValidatedPcFoundation(s, generatedElowen);
    ok('11c: the merge COMMITS the generated content', merge.committed === true, JSON.stringify(merge));
    ok('11c: the merged facet is tagged origin:pc_body_bible_generated_canon (distinguishable from locked/inferred merges)',
      (s._pcPortfolio.facets || []).some(f => f.facet_id === 'pc_generated_wound_core' && f.origin === 'pc_body_bible_generated_canon'),
      JSON.stringify((s._pcPortfolio.facets || []).map(f => ({ id: f.facet_id, origin: f.origin }))));
    ok('11c: the seed\'s own 2 facets are untouched alongside the new generated ones', (s._pcPortfolio.facets || []).some(f => f.facet_id === 'pc_untested_brilliance') && (s._pcPortfolio.facets || []).some(f => f.facet_id === 'pc_fears_public_failure'));

    const idx = win._facetIndex(s, { sceneNumber: 2 });
    const ids = (idx['pc:lirael'].facets || []).map(f => f.facet_id).sort();
    ok('11c: the generated facet reaches _facetIndex (the SAME chain literary/CG delivery consumes)', ids.indexOf('pc_generated_wound_core') !== -1, JSON.stringify(ids));
  }

  // 11d — THE SAME "Elowen" content, but FALSELY declared kind:'locked_canon_fact' as if it were
  // already-established canon, citing a real-but-irrelevant bio snippet — exactly Roman's
  // diagnosis of the retained samples' actual defect. Must be REJECTED.
  {
    const s = baseState({ playerName: 'Lirael' });
    const source = win._pcFoundationSourceFacts(s);
    const falselyLockedElowen = {
      wound: { core: 'her estranged sister Elowen, who left the Favored ranks after a public scandal — Lirael has carried the guilt of not stopping her since she was sixteen' },
      _provenance: {
        'wound.core': { kind: 'locked_canon_fact', basis: 'approved_bio', cites: 'A young First Favored apprentice. Today is her first time SUPERVISING another person’s First Sacrifice' },
      },
    };
    const result = win._validatePcFoundationOutput(falselyLockedElowen, source);
    ok('11d: the SAME generated content, falsely presented as kind:"locked_canon_fact", is REJECTED', result.ok === false, JSON.stringify(result.rejections));
    ok('11d: rejected for citation not actually supporting the claim (false-sourcing), and/or the unsupported-invention hard line — either is a correct catch of "falsely presented as canon"',
      result.rejections.some(r => r.field === 'wound.core' && (r.reason === 'citation_does_not_support_claim' || r.reason === 'citation_not_supported' || r.reason === 'unsupported_family_death_or_disappearance')),
      JSON.stringify(result.rejections));
    const merge = win._commitValidatedPcFoundation(s, falselyLockedElowen);
    ok('11d: merge refuses, zero mutation', merge.committed === false && !s._pcPortfolio);
  }

  // 11e — HARD RED LINE: Julian ruling on her guilt. Must reject regardless of declared kind —
  // tested under BOTH locked_canon_fact (fabricated citation) AND generated_foundation (honestly
  // declared as new material) to prove this is a KIND-INDEPENDENT red line, not merely another
  // citation failure that a well-formed generated_foundation claim could slip past.
  {
    const s = baseState({ playerName: 'Lirael' });
    const source = win._pcFoundationSourceFacts(s);
    ['locked_canon_fact', 'generated_foundation'].forEach((k) => {
      const julianRulesGuilt = {
        current_crisis: { refusal: 'To accept that Julian has already decided she is guilty of shaping the wish, before the Dohkar has ruled.' },
        _provenance: {
          'current_crisis.refusal': k === 'locked_canon_fact'
            ? { kind: 'locked_canon_fact', basis: 'approved_scene1', cites: 'The presiding Dohkar has charged Lirael with shaping the wish and with interfering; he has not yet ruled' }
            : { kind: 'generated_foundation', basis: 'generated', cites: '' },
        },
      };
      const result = win._validatePcFoundationOutput(julianRulesGuilt, source);
      ok('11e (' + k + '): Julian-rules-on-guilt is REJECTED regardless of declared kind', result.ok === false, JSON.stringify(result.rejections));
      ok('11e (' + k + '): rejected specifically for authority_misattributed_to_li (the hard red line, not a citation technicality)',
        result.rejections.some(r => r.reason === 'authority_misattributed_to_li'), JSON.stringify(result.rejections));
    });
  }

  // 11f — a generated field that FORCES the reader's live agency (a present-moment confession/
  // decision, not an established trait). Must reject even though honestly declared generated.
  {
    const s = baseState({ playerName: 'Lirael' });
    const source = win._pcFoundationSourceFacts(s);
    const forcedConfession = {
      current_crisis: { refusal: 'She confesses to Julian right now that she has always loved him, before the inquiry even begins.' },
      _provenance: { 'current_crisis.refusal': { kind: 'generated_foundation', basis: 'generated', cites: '' } },
    };
    const result = win._validatePcFoundationOutput(forcedConfession, source);
    ok('11f: a generated field forcing the reader\'s live confession is REJECTED', result.ok === false, JSON.stringify(result.rejections));
    ok('11f: rejected specifically for forces_reader_agency', result.rejections.some(r => r.reason === 'forces_reader_agency'), JSON.stringify(result.rejections));
  }

  // 11g — a generated field that leaks Julian's SEALED interference (honestly declared generated,
  // still must reject — new creative material may not contradict what the seed has sealed).
  {
    const s = baseState({ playerName: 'Lirael' });
    const source = win._pcFoundationSourceFacts(s);
    const leakedInterference = {
      current_crisis: { immediate_fear: 'That the assembly will discover Julian actually interfered with the wish before she can explain it.' },
      _provenance: { 'current_crisis.immediate_fear': { kind: 'generated_foundation', basis: 'generated', cites: '' } },
    };
    const result = win._validatePcFoundationOutput(leakedInterference, source);
    ok('11g: a generated field leaking Julian\'s sealed interference is REJECTED', result.ok === false, JSON.stringify(result.rejections));
    ok('11g: rejected specifically for julian_sealed_interference_leaked', result.rejections.some(r => r.reason === 'julian_sealed_interference_leaked'), JSON.stringify(result.rejections));
  }

  // 11h — a grounded_inference that smuggles in a brand-new named person (not permitted for this
  // kind — only generated_foundation may introduce new people).
  {
    const s = baseState({ playerName: 'Lirael' });
    const source = win._pcFoundationSourceFacts(s);
    const smuggledName = {
      private_hope: 'That Master Hallowyn, who trained her as a child, would finally admit she was ready.',
      _provenance: { 'private_hope': { kind: 'grounded_inference', basis: 'inferred', cites: '' } },
    };
    const result = win._validatePcFoundationOutput(smuggledName, source);
    ok('11h: a grounded_inference smuggling in a brand-new named person ("Master Hallowyn") is REJECTED', result.ok === false, JSON.stringify(result.rejections));
    ok('11h: rejected specifically for grounded_inference_names_new_person_or_event', result.rejections.some(r => r.reason === 'grounded_inference_names_new_person_or_event'), JSON.stringify(result.rejections));
  }
}

console.log('\n' + '='.repeat(70));
console.log(`PC FOUNDATION OUTPUT VALIDATOR + MERGE CONTROL: ${pass} passed, ${fail} failed`);
if (fail) { console.log('\nFAILURES:'); fails.forEach(function (f) { console.log('  - ' + f); }); process.exit(1); }
process.exit(0);
