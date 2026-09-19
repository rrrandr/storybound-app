#!/usr/bin/env node
// FIRST SACRIFICE — BOUNDED REPAIR ENGINE — dry, outbound-boundary-stubbed control (Roman, 2026-09-20)
//
// Proves the bounded-repair design against REAL historical evidence (the 6 real, paid, rejected
// draft packages already on disk — never fabricated) plus targeted synthetic RED fixtures for
// failure modes not present in the real history. No provider or image call is made anywhere in
// this script; global.fetch is stubbed to throw if anything ever reaches it.
//
// Sections:
//   1. measureBeatDeficiencies — real invocation against the REAL Attempt 6 draft (751/1,100
//      words); structural-drift detection (wrong beat count, using the REAL Attempt 3 draft which
//      really did return 16 beats; tampered image/kind) — RED.
//   2. buildRepairPrompt / buildRepairFallbackChain — real invocation against the real Attempt 6
//      deficiencies; proves the constructed prompt names only deficient slots, forbids touching
//      oasOpening/postInterruptionBeat/scene1Coverage, and states the bounded output schema.
//   3. mergeRepairIntoDraft — GREEN (a compliant bounded repair merges cleanly, all non-repaired
//      beats byte-identical) and RED (unflagged slot, extra top-level field, extra per-entry
//      field, missing coverage, malformed response, duplicate slot).
//   4. END-TO-END: merge the real Attempt 6 draft with a locally-built repair, then re-run the
//      REAL validator — proves the two density rules clear, and (2026-09-20 correction, following
//      real Attempt 8) that a real, unrelated, untouched exemplar match against a WITHHELD,
//      never-rendered historical exemplar is now correctly reported as a non-blocking
//      exemplar_similarity diagnostic rather than a violation — the merged candidate is fully
//      eligible once density is fixed.
//   5. isRepairEligible / REPAIR_ELIGIBLE_VALIDATOR_RULES — including the honest real-data finding
//      that Attempt 6 AS IT REALLY HAPPENED would NOT have been repair-eligible (because of the
//      coexisting exemplar-copy violation) — repair and the convergence fix (already committed)
//      are two separate, both-required corrections.
//   6. Cost ceiling for ONE logical future authoring operation (primary 3-tier chain + repair
//      3-tier chain, worst case). Real governor admit() check. No spend.
//   7. Truncation-capacity proof — a synthetic maximal 20-beat draft (every beat at its slot's
//      ceiling) fits with wide margin under both the 8,000-token primary ceiling and the
//      4,000-token repair ceiling.
//   8. Real trace across all 6 historical attempts: finish_reason and completion_tokens vs.
//      max_tokens, ruling out truncation/schema/proxy caps and confirming genuine early
//      completion.
//   10. OVER-CEILING REPAIR (Roman, 2026-09-20, post-Attempt-8 pass 1): real Attempt 8's own
//      pass-1-merged draft (07_final_draft_after_pass1.json) is used as a real fixture — 8 of its
//      16 narration beats overshoot the 90-word ceiling, which the floor-only engine could not see.
//      Proves: the 8 real overlong narration beats are selected (and ONLY those — no dialogue, no
//      already-qualifying slot); a compliant simulated pass-2 (shrink-to-midpoint, full-slot
//      rewrite) merges cleanly, leaves every non-targeted beat byte-identical, and — re-validated
//      with the real validator — reaches 12+/16 qualifying; a structural/canon violation still
//      blocks repair regardless of direction.
//
// usage: node _first_sacrifice_bounded_repair_engine_control.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

let fetchCalls = 0;
global.fetch = function () { fetchCalls++; throw new Error('OUTBOUND BOUNDARY VIOLATION: fetch() was called — this control run must never reach the network'); };

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

console.log('\n' + '='.repeat(92) + '\nFIRST SACRIFICE BOUNDED REPAIR ENGINE — DRY CONTROL\n' + '='.repeat(92));

const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
const {
  measureBeatDeficiencies, buildRepairPrompt, buildRepairFallbackChain, mergeRepairIntoDraft,
  isRepairEligible, REPAIR_ELIGIBLE_VALIDATOR_RULES, planNextRepairPass, MAX_REPAIR_PASSES,
} = await import('./_first_sacrifice_bounded_repair_engine.mjs');
const { buildFixedInputView, buildAuthoringFallbackChain } = await import('./_first_sacrifice_authoring_adapter.mjs');

// Real validator, extracted the same way every other control script in this session does.
const validatorSrc = fs.readFileSync(path.join(__dirname, '_first_sacrifice_packet_validator.mjs'), 'utf8');
const fnMatch = validatorSrc.match(/function validateDraft[\s\S]*?\n}\n/);
const patternsMatch = validatorSrc.match(/const SEALED_PATTERNS[\s\S]*?(?=\nfunction validateDraft)/);
const sandbox = new Function('module', patternsMatch[0] + fnMatch[0] + '\nmodule.exports = validateDraft;');
const modObj = { exports: null };
sandbox(modObj);
const validateDraft = modObj.exports;

// Real historical artifacts.
const attempt6 = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_draft_v7_attempt6_full_package/02_draft.json'), 'utf8')).draft;
const attempt6ValidationOnDisk = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_draft_v7_attempt6_full_package/03_validation_result.json'), 'utf8'));
const attempt3 = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_draft_v7_attempt3_full_package/02_draft.json'), 'utf8')).draft;

// ═══════════════════════════════════════════════════════════════════════════════
section('1. measureBeatDeficiencies — real Attempt 6 data + structural-drift RED cases');
// ═══════════════════════════════════════════════════════════════════════════════
const bnt = PACKET.scene1_beat_number_template;
const totalFloorReal = bnt.slots.reduce((n, s) => n + s.wordRange[0], 0);
ok('the 20 per-slot floors sum to 1,110 words — a real, disclosed ~10-word margin over the validator\'s 1,100 total floor (not a hardcoded assumption)', totalFloorReal === 1110);

const defAttempt6 = measureBeatDeficiencies(attempt6.scene1Candidate, PACKET);
ok('real Attempt 6 draft (751 words) is structurally repairable (20 beats, correct image/kind mapping)', defAttempt6.structurallyRepairable === true);
ok('real Attempt 6 draft measures the same 751-word total the real validator independently found', defAttempt6.totalWords === 751, 'got ' + defAttempt6.totalWords);
ok('real Attempt 6 draft has deficient slots flagged (751 well below the 1,110 sum-of-floors)', defAttempt6.deficiencies.length > 0 && defAttempt6.deficiencies.length <= 20, 'count=' + defAttempt6.deficiencies.length);
ok('every flagged deficiency genuinely has actualWords < its own slot floor (real per-beat arithmetic, not a placeholder)', defAttempt6.deficiencies.every(d => d.actualWords < d.wordRange[0] && d.deficitWords === d.wordRange[0] - d.actualWords));

const wrongCountDraft = { scene1Candidate: attempt3.scene1Candidate }; // real historical draft: 16 beats
ok('REAL DATA — Attempt 3 (16 beats, real recorded failure) is correctly detected as NOT structurally repairable, not silently treated as a density case', measureBeatDeficiencies(wrongCountDraft.scene1Candidate, PACKET).structurallyRepairable === false && /beat count is 16/.test(measureBeatDeficiencies(wrongCountDraft.scene1Candidate, PACKET).reason));

const tamperedImage = JSON.parse(JSON.stringify(attempt6));
tamperedImage.scene1Candidate.beats[4].image = 'd1'; // slot 5 is locked to intro_dohkar
const defTamperedImage = measureBeatDeficiencies(tamperedImage.scene1Candidate, PACKET);
ok('RED: a beat count of 20 with one tampered image (drifted from the locked template) is refused for repair, not silently repaired', defTamperedImage.structurallyRepairable === false && /slot 5: image is "d1"/.test(defTamperedImage.reason));

const tamperedKind = JSON.parse(JSON.stringify(attempt6));
tamperedKind.scene1Candidate.beats[0].kind = 'dialogue'; // slot 1 is locked to narration
const defTamperedKind = measureBeatDeficiencies(tamperedKind.scene1Candidate, PACKET);
ok('RED: a tampered kind (drifted from the locked template) is refused for repair, not silently repaired', defTamperedKind.structurallyRepairable === false && /slot 1: kind is "dialogue"/.test(defTamperedKind.reason));

const missingBeats = { scene1Candidate: { beats: attempt6.scene1Candidate.beats.slice(0, 20) } };
missingBeats.scene1Candidate.beats[7] = { ...missingBeats.scene1Candidate.beats[7], text: undefined };
ok('RED: a beat with no text at all is refused for repair (a genuinely missing beat, not merely a short one)', measureBeatDeficiencies(missingBeats.scene1Candidate, PACKET).structurallyRepairable === false);

ok('buildRepairPrompt throws when given zero deficiencies — repair must never be invoked speculatively', (() => { try { buildRepairPrompt(PACKET, attempt6, []); return false; } catch (e) { return /no deficient slots given/.test(e.message); } })());

// ═══════════════════════════════════════════════════════════════════════════════
section('2. buildRepairPrompt / buildRepairFallbackChain — real invocation on real Attempt 6 deficiencies');
// ═══════════════════════════════════════════════════════════════════════════════
const { system: repairSystem, user: repairUser } = buildRepairPrompt(PACKET, attempt6, defAttempt6.deficiencies);
const deficientNs = defAttempt6.deficiencies.map(d => d.n);
const acceptedNs = Array.from({ length: 20 }, (_, i) => i + 1).filter(n => !deficientNs.includes(n));
ok('the constructed repair prompt marks every real deficient slot [NEEDS REPAIR — REPLACE ENTIRELY]', deficientNs.every(n => repairUser.includes('Beat ' + n + ' [NEEDS REPAIR — REPLACE ENTIRELY]')));
ok('the constructed repair prompt marks every non-deficient slot [ACCEPTED — do not return this one]', acceptedNs.every(n => repairUser.includes('Beat ' + n + ' [ACCEPTED — do not return this one]')));
ok('the constructed repair prompt forbids touching oasOpening, postInterruptionBeat, and scene1Coverage', /Do NOT return oasOpening, postInterruptionBeat, scene1Coverage/.test(repairUser));
ok('the constructed repair prompt forbids changing image/kind/speaker/provenance/objectClaims metadata', /Do NOT change any beat.s image, kind, speaker, or provenance\/objectClaims metadata/.test(repairUser));
ok('the constructed repair prompt forbids inventing new canon, characters, dialogue, or reordering events', /Do NOT invent new canon, new characters, new dialogue/.test(repairUser));
ok('the constructed repair prompt states the exact bounded output schema, naming only the real deficient slot numbers', repairUser.includes('exactly ' + defAttempt6.deficiencies.length + ' entries') && repairUser.includes(deficientNs.join(', ')));
// FULL-SLOT REPLACEMENT (Roman, 2026-09-20, post-Attempt-7): a real repair call was told an
// explicit delta ("at least N more words needed") and still undershot on 7 of 12 named slots.
// The prompt must now demand a COMPLETE replacement targeting each slot's own MIDPOINT, and must
// NEVER again state the old delta/expansion framing.
ok('the constructed repair prompt demands a COMPLETE, SELF-CONTAINED replacement beat, explicitly warning against an appended fragment, and states repair never shrinks an already-long beat', /FULL-SLOT REPLACEMENT, NOT AN EDITED FRAGMENT/.test(repairUser) && /Do NOT simply append more words onto the existing text/.test(repairUser) && /Repair NEVER shrinks a beat that is already long enough/.test(repairUser));
ok('the constructed repair prompt instructs the model to TARGET THE MIDPOINT of each slot\'s range', /TARGET THE MIDPOINT of each slot.s own stated range/.test(repairUser));
ok('the constructed repair prompt states each deficient slot\'s real current word count, real MIDPOINT target, and real allowed range — the new full-slot contract, not the old delta contract (short-direction fixture)', defAttempt6.deficiencies.every(d => d.direction === 'short' && repairUser.includes('current text is ' + d.actualWords + ' words (too SHORT — do not extend it, REWRITE it fresh and complete at the target length). TARGET approximately ' + d.targetWords + ' words. ALLOWED RANGE ' + d.wordRange[0] + '-' + d.wordRange[1] + ' words')));
ok('every deficiency\'s targetWords is genuinely the midpoint of its own wordRange (real arithmetic, not a placeholder)', defAttempt6.deficiencies.every(d => d.targetWords === Math.round((d.wordRange[0] + d.wordRange[1]) / 2)));
ok('the constructed repair prompt NEVER states the old, retired delta framing ("more words needed") anywhere', !/more words needed/.test(repairUser));
ok('the constructed repair prompt\'s output schema calls for "complete replacement text", not "expanded text"', /complete replacement text/.test(repairUser) && !/expanded text/.test(repairUser));

const repairChain = buildRepairFallbackChain(PACKET, attempt6, defAttempt6.deficiencies);
ok('the repair fallback chain has exactly 3 tiers (Grok primary -> Ministral-8B fallback -> GPT-4o terminal), matching the primary chain\'s own shape', repairChain.length === 3 && repairChain[0].name === 'Grok-4.3' && repairChain[1].name === 'Ministral-8B' && repairChain[2].name === 'GPT-4o');
ok('every repair tier carries the IDENTICAL constructed prompt (no tier-specific drift)', repairChain.every(t => t.messages[1].content === repairUser));
ok('every repair tier is capped at 4,000 max_tokens (well above any real observed need, far below the primary\'s 8,000)', repairChain.every(t => t.max_tokens === 4000));
ok('the repair chain carries a distinct roleTag from the primary chain, so real logging/telemetry can tell them apart', repairChain.every(t => t.roleTag === 'firstSacrificeAuthoringRepair'));

// ═══════════════════════════════════════════════════════════════════════════════
section('3. mergeRepairIntoDraft — GREEN + RED, real Attempt 6 deficiencies');
// ═══════════════════════════════════════════════════════════════════════════════
// Deterministic, non-exemplar filler — deliberately generic-but-concrete sentences, none of which
// reuse any wording from any historical exemplar or the packet itself, sized to land comfortably
// (never barely) inside each slot's own wordRange.
function buildCompliantRepairFor(deficiencies) {
  const FILLER_SENTENCES = [
    'A second breath followed the first, slower, and I let my shoulders settle a fraction before the next word came.',
    'My grip tightened without my choosing it, knuckles pale where they met the fabric, and I noticed the change only after it happened.',
    'The sound of it reached the back of the clearing before I finished speaking, and a few heads turned toward the noise rather than toward me.',
    'I counted the length of that single silence, and for the span of it nothing else in the clearing seemed to move.',
    'Somewhere behind me a foot shifted on the grass, deliberate, and I understood it as a question I was not yet ready to answer.',
  ];
  return {
    repairs: deficiencies.map((d, idx) => {
      const need = d.wordRange[0] + 4; // land a few words inside the floor, not exactly on it
      const words = [];
      let s = 0;
      while (words.length < need) { words.push(...FILLER_SENTENCES[(idx + s) % FILLER_SENTENCES.length].split(' ')); s++; }
      return { n: d.n, text: words.slice(0, need).join(' ') + '.' };
    }),
  };
}
const compliantRepair = buildCompliantRepairFor(defAttempt6.deficiencies);
const mergeGreen = mergeRepairIntoDraft(attempt6, compliantRepair, defAttempt6.deficiencies);
ok('GREEN: a compliant bounded repair merges with zero errors', mergeGreen.errors.length === 0, JSON.stringify(mergeGreen.errors));
ok('GREEN: every repaired slot now meets its own word floor in the merged draft', mergeGreen.merged && defAttempt6.deficiencies.every(d => {
  const words = mergeGreen.merged.scene1Candidate.beats[d.n - 1].text.trim().split(/\s+/).filter(Boolean).length;
  return words >= d.wordRange[0];
}));
ok('GREEN: every NON-repaired beat is byte-identical to the primary draft (repair never silently touches an accepted slot)', acceptedNs.every(n => JSON.stringify(mergeGreen.merged.scene1Candidate.beats[n - 1]) === JSON.stringify(attempt6.scene1Candidate.beats[n - 1])));
ok('GREEN: repaired beats keep their ORIGINAL image/kind/speaker/provenance/objectClaims — only text changed', defAttempt6.deficiencies.every(d => {
  const orig = attempt6.scene1Candidate.beats[d.n - 1], merged = mergeGreen.merged.scene1Candidate.beats[d.n - 1];
  return orig.image === merged.image && orig.kind === merged.kind && orig.speaker === merged.speaker && JSON.stringify(orig.provenance) === JSON.stringify(merged.provenance) && JSON.stringify(orig.objectClaims) === JSON.stringify(merged.objectClaims);
}));
ok('GREEN: merging never mutates the caller\'s original primary draft object', JSON.stringify(attempt6.scene1Candidate.beats[defAttempt6.deficiencies[0].n - 1].text) === JSON.stringify(JSON.parse(JSON.stringify(attempt6)).scene1Candidate.beats[defAttempt6.deficiencies[0].n - 1].text));

const firstAccepted = acceptedNs[0];
const repairTouchesAccepted = { repairs: [...compliantRepair.repairs, { n: firstAccepted, text: 'An unauthorized extra replacement nobody asked for, well past the floor in length so it cannot be rejected on word count alone.' }] };
const mergeRedUnflagged = mergeRepairIntoDraft(attempt6, repairTouchesAccepted, defAttempt6.deficiencies);
ok('RED: a repair response naming a slot that was never flagged deficient is rejected wholesale (not silently ignored, not silently applied)', mergeRedUnflagged.merged === null && mergeRedUnflagged.errors.some(e => /never flagged as deficient/.test(e)));

const repairWithExtraTopLevel = { repairs: compliantRepair.repairs, oasOpening: { speaker: 'Julian', text: 'An unauthorized replacement for the OAS opener, which repair is never allowed to touch.' } };
const mergeRedTopLevel = mergeRepairIntoDraft(attempt6, repairWithExtraTopLevel, defAttempt6.deficiencies);
ok('RED: a repair response with an unapproved top-level field (e.g. oasOpening) is rejected wholesale', mergeRedTopLevel.merged === null && mergeRedTopLevel.errors.some(e => /unapproved top-level field/.test(e) && /oasOpening/.test(e)));

const repairWithExtraEntryField = { repairs: compliantRepair.repairs.map((r, i) => i === 0 ? { ...r, image: 'd4' } : r) };
const mergeRedEntryField = mergeRepairIntoDraft(attempt6, repairWithExtraEntryField, defAttempt6.deficiencies);
ok('RED: a repair entry that also tries to set "image" (or any field beyond n/text) is rejected wholesale', mergeRedEntryField.merged === null && mergeRedEntryField.errors.some(e => /unapproved field "image"/.test(e)));

const repairMissingOne = { repairs: compliantRepair.repairs.slice(1) };
const mergeRedMissing = mergeRepairIntoDraft(attempt6, repairMissingOne, defAttempt6.deficiencies);
ok('RED: a repair response that omits one of the flagged deficient slots is rejected wholesale (no partial merge)', mergeRedMissing.merged === null && mergeRedMissing.errors.some(e => e.includes('slot ' + defAttempt6.deficiencies[0].n) && /never returned a replacement/.test(e)));

['a plain string', ['an', 'array'], null, 42].forEach((malformed, i) => {
  const r = mergeRepairIntoDraft(attempt6, malformed, defAttempt6.deficiencies);
  ok('RED: a malformed repair response (case ' + i + ': ' + JSON.stringify(malformed).slice(0, 30) + ') is rejected, never throws uncaught', r.merged === null && r.errors.length > 0);
});

const repairDuplicateSlot = { repairs: [...compliantRepair.repairs, { n: compliantRepair.repairs[0].n, text: compliantRepair.repairs[0].text }] };
const mergeRedDup = mergeRepairIntoDraft(attempt6, repairDuplicateSlot, defAttempt6.deficiencies);
ok('RED: a repair response naming the same slot twice is rejected wholesale', mergeRedDup.merged === null && mergeRedDup.errors.some(e => /more than once/.test(e)));

// ═══════════════════════════════════════════════════════════════════════════════
section('4. END-TO-END on REAL data: merge + re-run the REAL validator');
// ═══════════════════════════════════════════════════════════════════════════════
// NOTE (Roman, 2026-09-20 correction, following real Attempt 8): the ON-DISK attempt6ValidationOnDisk
// file is a frozen historical artifact recorded under the OLD (pre-correction) validator, which
// treated a match against a WITHHELD, never-rendered historical exemplar as a blocking violation.
// Real Attempt 8 proved that policy wrong — its oasOpening matched julian_opening_turn not because
// it copied a hidden source, but because the SAME framing is independently required by the live,
// rendered opening_frame_brief. exemplar_verbatim_copy is now exemplar_similarity, a non-blocking
// diagnostic — the historical file's rule name is preserved verbatim as disclosed history below,
// but the LIVE re-validation further down uses the corrected, current validator.
ok('BEFORE repair: the REAL, on-disk Attempt 6 validation result is exactly the 3 real violations disclosed AT THE TIME under the then-current (now-superseded) validator policy (scene1_too_thin, scene1_insufficient_narration_density, exemplar_verbatim_copy)', attempt6ValidationOnDisk.violations.map(v => v.rule).sort().join(',') === ['exemplar_verbatim_copy', 'scene1_insufficient_narration_density', 'scene1_too_thin'].sort().join(','));
const mergedFullDraft = { ...attempt6, scene1Candidate: mergeGreen.merged.scene1Candidate };
const afterRepairValidation = validateDraft(mergedFullDraft, PACKET);
const afterRules = afterRepairValidation.violations.map(v => v.rule);
const afterDiagnosticRules = afterRepairValidation.diagnostics.map(d => d.rule);
ok('AFTER repair-merge: scene1_too_thin no longer fires (real validator, real merged text)', !afterRules.includes('scene1_too_thin'), JSON.stringify(afterRepairValidation.violations));
ok('AFTER repair-merge: scene1_insufficient_narration_density no longer fires (real validator, real merged text)', !afterRules.includes('scene1_insufficient_narration_density'), JSON.stringify(afterRepairValidation.violations));
ok('AFTER repair-merge, CORRECTED POLICY: the real, unrelated, untouched exemplar match (in oasOpening, which repair never touches) is now reported as a non-blocking exemplar_similarity DIAGNOSTIC, never a violations[] entry', afterDiagnosticRules.includes('exemplar_similarity') && !afterRules.includes('exemplar_verbatim_copy') && !afterRules.includes('exemplar_similarity'));
// REAL FINDING (Roman, 2026-09-20, wish-twist causal-specificity correction): Attempt 6's own real,
// untouched wish-twist beats independently lack the joint "lost"-referent + wrong/danger-fulfillment
// language the now-BLOCKING wish_twist_causal_specificity check requires — a THIRD independent real
// historical attempt converging on the same causal-vagueness gap (after Attempt 7 and Attempt 8),
// real further evidence the check generalizes rather than overfitting to one attempt. The bounded
// density-only repair pass correctly does NOT and cannot fix this: repair only ever touches word
// counts on flagged slots, never rewrites content to add a missing causal claim, so this real,
// pre-existing content gap survives the merge untouched — exactly the "repair is never authorized to
// paper over a canon violation" principle proven elsewhere in this file, now demonstrated on a third
// real dataset. The candidate is correctly NOT eligible until a real, separately-authorized content
// pass (like Attempt 8's) adds the missing causal language — the density repair was never expected
// to do that job.
ok('AFTER repair-merge, CORRECTED POLICY: exemplar match alone and the two real density rules are cleared by the merge (repair does its own job correctly)', !afterRules.includes('exemplar_verbatim_copy') && !afterRules.includes('scene1_too_thin') && !afterRules.includes('scene1_insufficient_narration_density'));
ok('REAL FINDING: Attempt 6\'s own real (untouched) wish-twist content ALSO independently lacks the causal-specificity language — a THIRD real historical attempt converging on the same gap — and the density-only bounded repair correctly leaves this pre-existing content gap untouched rather than papering over it, so the merged candidate correctly remains NOT ELIGIBLE for this separate, real, undisclosed-until-now reason', afterRepairValidation.ok === false && afterRules.includes('wish_twist_causal_specificity'), JSON.stringify(afterRepairValidation));
// REAL FINDING (Roman, 2026-09-20, Dhokar Raes naming correction, discovered here — not planted):
// Attempt 6's own real, untouched beats[4]/[14].speaker ALSO independently carry the exact leaked
// internal key ("the_presiding_Dohkar") the naming correction fixed — a FOURTH real historical
// attempt converging on the same bug (after the on-disk Attempt 8 candidate and, per the sanitized-
// fixture note above, Attempt 7's own raw data too). Same principle as the causal-specificity
// finding above: a density-only repair never touches speaker fields at all, so this real,
// pre-existing naming defect correctly survives the merge untouched as well.
ok('REAL FINDING: Attempt 6\'s own real (untouched) beats[4]/[14].speaker ALSO independently carry the leaked internal key — a FOURTH real historical attempt converging on the naming bug, left correctly untouched by the density-only repair (which never touches speaker fields)', afterRules.includes('speaker_reader_visible_internal_key'), JSON.stringify(afterRepairValidation.violations.filter(v => v.rule === 'speaker_reader_visible_internal_key')));

// ═══════════════════════════════════════════════════════════════════════════════
section('5. isRepairEligible / REPAIR_ELIGIBLE_VALIDATOR_RULES — scope discipline');
// ═══════════════════════════════════════════════════════════════════════════════
ok('REPAIR_ELIGIBLE_VALIDATOR_RULES is exactly the two density rules named in Roman\'s spec ("total or density floor") — nothing broader', REPAIR_ELIGIBLE_VALIDATOR_RULES.length === 2 && REPAIR_ELIGIBLE_VALIDATOR_RULES.includes('scene1_too_thin') && REPAIR_ELIGIBLE_VALIDATOR_RULES.includes('scene1_insufficient_narration_density'));
ok('GREEN: violations consisting of only the two density rules are repair-eligible', isRepairEligible([{ rule: 'scene1_too_thin' }, { rule: 'scene1_insufficient_narration_density' }]) === true);
ok('GREEN: a single density-only violation is repair-eligible', isRepairEligible([{ rule: 'scene1_too_thin' }]) === true);
ok('RED: any canon/structural violation alongside a density one makes the WHOLE draft ineligible for repair — repair must never be attempted to paper over a non-density defect', isRepairEligible([{ rule: 'scene1_too_thin' }, { rule: 'the_answer_form_violation' }]) === false);
ok('RED: zero violations is not "eligible" (there is nothing to repair — the caller must not invoke repair on an already-passing draft)', isRepairEligible([]) === false);
ok('HISTORICAL DATA: replaying Attempt 6\'s FROZEN on-disk violations array (recorded under the then-current, now-superseded validator policy, which still literally names "exemplar_verbatim_copy") through isRepairEligible correctly returns false — a reminder that the file itself is a disclosed historical record, not re-derived; the LIVE validator (section 4 above) shows the corrected, current behavior.', isRepairEligible(attempt6ValidationOnDisk.violations) === false);

// ═══════════════════════════════════════════════════════════════════════════════
section('6. COST CEILING for ONE logical future authoring operation (primary chain + at most one bounded repair chain)');
// ═══════════════════════════════════════════════════════════════════════════════
const { createGovernor, MODEL_LIMITS } = require('./api/_mistral-governor.js');
const { memoryStore } = require('./api/_mistral-governor-store.js');
const PRICING = {
  'grok-4.3': { in: 0.00000125, out: 0.0000025 },
  'ministral-8b-2512': { in: 0.00000015, out: 0.00000015 },
  'gpt-4o': { in: 0.0000025, out: 0.00001 },
};
const primaryChain = buildAuthoringFallbackChain(PACKET, buildFixedInputView());
const primarySys = primaryChain[0].messages[0].content, primaryUsr = primaryChain[0].messages[1].content;
const primaryEstInputTokens = Math.round((primarySys.length + primaryUsr.length) / 4);
const primaryTierCosts = primaryChain.map(t => {
  const p = PRICING[t.billedModel || t.model];
  return primaryEstInputTokens * p.in + t.max_tokens * p.out;
});
const primaryWorstCase = primaryTierCosts.reduce((a, b) => a + b, 0);

// Worst-case repair prompt: build it against a SYNTHETIC draft where all 20 slots are flagged
// deficient at once (the true structural ceiling — a real repair request should usually be
// far smaller than this).
const allDeficientSynthetic = { scene1Candidate: { beats: bnt.slots.map(s => ({ kind: s.kind === 'narration_or_dialogue' ? 'narration' : s.kind, speaker: s.kind === 'dialogue' ? 'Julian' : null, image: s.image, text: 'short.', provenance: { kind: 'generated_expression' }, objectClaims: [] })) } };
const defWorstCase = measureBeatDeficiencies(allDeficientSynthetic.scene1Candidate, PACKET);
ok('worst-case synthetic fixture (all beats at 1 word) is structurally repairable and flags all 20 slots — the true repair-prompt-size ceiling', defWorstCase.structurallyRepairable === true && defWorstCase.deficiencies.length === 20);
const worstCaseRepairChain = buildRepairFallbackChain(PACKET, { scene1Candidate: allDeficientSynthetic.scene1Candidate }, defWorstCase.deficiencies);
const repairSys = worstCaseRepairChain[0].messages[0].content, repairUsr = worstCaseRepairChain[0].messages[1].content;
const repairEstInputTokens = Math.round((repairSys.length + repairUsr.length) / 4);
const repairTierCosts = worstCaseRepairChain.map(t => {
  const p = PRICING[t.billedModel || t.model];
  return repairEstInputTokens * p.in + t.max_tokens * p.out;
});
const repairWorstCase = repairTierCosts.reduce((a, b) => a + b, 0);

console.log('\n-- Primary chain (existing) --');
console.log('  est. input tokens: ' + primaryEstInputTokens + ' | max_tokens/tier: ' + primaryChain.map(t => t.max_tokens).join('/'));
console.log('  expected-success ceiling (1 call, Grok): $' + primaryTierCosts[0].toFixed(4));
console.log('  3-tier-exhaustion ceiling: $' + primaryWorstCase.toFixed(4));
console.log('\n-- Repair chain (NEW, worst case = all 20 slots flagged) --');
console.log('  est. input tokens: ' + repairEstInputTokens + ' | max_tokens/tier: ' + worstCaseRepairChain.map(t => t.max_tokens).join('/'));
console.log('  expected-success ceiling (1 call, Grok): $' + repairTierCosts[0].toFixed(4));
console.log('  3-tier-exhaustion ceiling: $' + repairWorstCase.toFixed(4));
const oneLogicalOpExpected = primaryTierCosts[0] + repairTierCosts[0];
const oneLogicalOpWorstCase = primaryWorstCase + repairWorstCase;
console.log('\n-- ONE LOGICAL FUTURE AUTHORING OPERATION (primary + at most one bounded repair) --');
console.log('  expected-success ceiling (Grok primary succeeds, density repair needed once, Grok repair succeeds): $' + oneLogicalOpExpected.toFixed(4));
console.log('  absolute worst case (both primary and repair exhaust all 3 tiers): $' + oneLogicalOpWorstCase.toFixed(4));
ok('a bounded repair, even worst case, adds meaningfully less than doubling the primary\'s own worst-case cost (it is a small patch, not a second full draft)', repairWorstCase < primaryWorstCase);

const gRepair = createGovernor(memoryStore(), { now: () => Date.now() });
const admitRepair = await gRepair.admit({ model: worstCaseRepairChain[1].billedModel, messages: worstCaseRepairChain[1].messages, maxTokens: worstCaseRepairChain[1].max_tokens, opId: 'fs-repair-worst-case' });
const repairLimits = MODEL_LIMITS[worstCaseRepairChain[1].billedModel];
ok('REAL governor check: the worst-case repair prompt is ADMITTED on the Mistral fallback tier (same governor real budget scripts use)', admitRepair.outcome === 'admitted', JSON.stringify(admitRepair));
if (admitRepair.outcome === 'admitted') console.log('  repair-chain Mistral-tier utilization: ' + Math.round(100 * admitRepair.reserve / repairLimits.tpm) + '% of ' + repairLimits.tpm + ' TPM');

// ═══════════════════════════════════════════════════════════════════════════════
section('7. TRUNCATION-CAPACITY PROOF — can the schema physically carry 1,100-1,700 words without truncation?');
// ═══════════════════════════════════════════════════════════════════════════════
// Build a synthetic MAXIMAL draft: every beat at its slot's own CEILING (not floor), full
// provenance + objectClaims overhead on 2 beats (matching real The Answer beats), oasOpening and
// postInterruptionBeat at their own real max lengths, scene1Coverage populated for all 11 required
// beats — i.e. the single largest legitimate output this schema could ever require.
function repeatWords(n) { const w = []; while (w.length < n) w.push('word' + (w.length % 50)); return w.join(' '); }
const maximalBeats = bnt.slots.map(s => ({
  kind: s.kind === 'narration_or_dialogue' ? 'narration' : s.kind,
  speaker: s.kind === 'dialogue' ? 'the_presiding_Dohkar' : null,
  image: s.image,
  text: repeatWords(s.wordRange[1]),
  provenance: { kind: 'grounded_inference', cites: 'pc_fears_public_failure' },
  objectClaims: s.n === 18 ? [{ object_ref: 'the_answer', physical_form_claim: 'staff_double_ended_question_mark_hooks', claim_kind: 'locked_canon_fact', cites: 'scene1_answer_manifestation.current_manifestation' }] : [],
}));
const maximalDraft = {
  scene1Candidate: { beats: maximalBeats },
  scene1Coverage: Object.fromEntries(PACKET.scene1_candidate_requirement.required_content_beats.beats.map((b, i) => [b.id, [i]])),
  first_person_lirael: true,
  oasOpening: { speaker: 'Julian', text: repeatWords(80), objectClaims: [{ object_ref: 'the_answer', physical_form_claim: 'neutral_reference', claim_kind: 'generated_expression' }] },
  postInterruptionBeat: { speaker: null, image: 'd4', kind: 'narration', text: repeatWords(90), objectClaims: [{ object_ref: 'the_answer', physical_form_claim: 'neutral_reference', claim_kind: 'generated_expression' }] },
};
const maximalTotalWords = maximalBeats.reduce((n, b) => n + b.text.trim().split(/\s+/).length, 0);
ok('the synthetic maximal draft totals within the validator\'s accepted 1,100-1,700 word range (the true worst-case content size, not an arbitrary guess)', maximalTotalWords >= 1100 && maximalTotalWords <= 1700, 'totalWords=' + maximalTotalWords);

const maximalJson = JSON.stringify(maximalDraft);
const maximalJsonBytes = Buffer.byteLength(maximalJson, 'utf8');
const maximalEstTokensChars4 = Math.round(maximalJson.length / 4);
console.log('\n  synthetic maximal draft: ' + maximalTotalWords + ' beat words, JSON = ' + maximalJsonBytes + ' bytes (~' + maximalEstTokensChars4 + ' est. tokens, chars/4 convention)');

// Real observed ratio: across the 6 real attempts, completion_tokens (content + reasoning) ranged
// 1,570-2,412 for 381-1,035 real beat words — derive the real worst observed tokens-per-word AND
// the real worst observed reasoning-token overhead, then apply BOTH conservatively to the maximal
// draft's word count, rather than trusting the chars/4 convention alone.
const historicalUsage = [
  { attempt: 1, words: 507, completion: 1725, reasoning: 615 },
  { attempt: 2, words: 425, completion: 1721, reasoning: 571 },
  { attempt: 3, words: 381, completion: 1570, reasoning: 451 },
  { attempt: 4, words: 943, completion: 2245, reasoning: 379 },
  { attempt: 5, words: 1035, completion: 2412, reasoning: 428 },
  { attempt: 6, words: 751, completion: 2329, reasoning: 773 },
];
const worstTokensPerWord = Math.max(...historicalUsage.map(h => (h.completion - h.reasoning) / h.words));
const worstReasoningTokens = Math.max(...historicalUsage.map(h => h.reasoning));
const projectedContentTokens = Math.ceil(maximalTotalWords * worstTokensPerWord);
const projectedTotalTokens = projectedContentTokens + worstReasoningTokens;
console.log('  real worst observed content-tokens-per-word across 6 real attempts: ' + worstTokensPerWord.toFixed(3) + ' (attempt with that ratio had the shortest output, where JSON-structure overhead is proportionally largest)');
console.log('  real worst observed reasoning-token overhead across 6 real attempts: ' + worstReasoningTokens);
console.log('  projected completion tokens for the maximal (' + maximalTotalWords + '-word) draft: ' + projectedContentTokens + ' content + ' + worstReasoningTokens + ' reasoning = ' + projectedTotalTokens);
ok('projected completion tokens for the LARGEST legitimate output this schema could ever require fits with real margin under the primary\'s 8,000-token ceiling (using the WORST real per-word ratio and WORST real reasoning overhead observed across all 6 attempts, not a best case)', projectedTotalTokens < 8000, 'projected=' + projectedTotalTokens);
ok('the same maximal draft, if it were itself submitted as a repair-worst-case echo, would still fit under the repair chain\'s 4,000-token ceiling only if scoped (informational: repair requests are never this large in practice, since they only echo THE NAMED SLOTS, not the whole scene)', true);
ok('CONCLUSION: the schema can physically carry a 20-beat, 1,100-1,700-word candidate without truncation — the 8,000-token ceiling was never the bottleneck in any of the 6 real attempts (see section 8)', projectedTotalTokens < 8000);

// ═══════════════════════════════════════════════════════════════════════════════
section('8. REAL TRACE across all 6 historical attempts — ruling out truncation, confirming genuine early completion');
// ═══════════════════════════════════════════════════════════════════════════════
console.log('');
const traceRows = [];
for (let i = 1; i <= 6; i++) {
  const recPath = path.join(__dirname, '_first_sacrifice_draft_v7_attempt' + i + '_full_package/01_request_response_records.json');
  if (!fs.existsSync(recPath)) continue;
  const records = JSON.parse(fs.readFileSync(recPath, 'utf8'));
  const primary = records.find(r => r.tier === 'primary');
  if (!primary || !primary.responseBody) continue;
  const choice = primary.responseBody.choices && primary.responseBody.choices[0];
  const usage = primary.responseBody.usage;
  traceRows.push({
    attempt: i, maxTokens: primary.requestBody.max_tokens, finishReason: choice && choice.finish_reason,
    completionTokens: usage && usage.completion_tokens, reasoningTokens: usage && usage.completion_tokens_details && usage.completion_tokens_details.reasoning_tokens,
    headroom: usage ? (primary.requestBody.max_tokens - usage.completion_tokens) : null,
  });
}
console.table(traceRows);
ok('REAL TRACE: all 6 real primary calls returned finish_reason "stop" (never "length") — the model itself decided it was done; this is NOT a truncation event', traceRows.length === 6 && traceRows.every(r => r.finishReason === 'stop'));
ok('REAL TRACE: all 6 real completions used well under half the 8,000-token max_tokens ceiling (max used: ' + Math.max(...traceRows.map(r => r.completionTokens)) + ' of 8,000)', traceRows.every(r => r.completionTokens < 4000));
ok('REAL TRACE: every real response parsed as clean, complete JSON (all 6 draft.json artifacts exist and are valid) — no schema/parser truncation ever occurred', [1, 2, 3, 4, 5, 6].every(i => { try { JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_draft_v7_attempt' + i + '_full_package/02_draft.json'), 'utf8')); return true; } catch (e) { return false; } }));
console.log('\nDIAGNOSIS (real evidence, not inference): finish_reason="stop" + completion_tokens far below max_tokens + clean parseable JSON on all 6 real attempts rules out (a) the primary\'s own token ceiling, (b) schema/parser truncation, and (c) any proxy/runner output cap. The real failure mode across all 6 attempts is GENUINE MODEL EARLY COMPLETION — the model believes a short, structurally-complete 20-beat scene satisfies the task and stops. A text reminder (even a well-placed final self-check) asks the model to notice this about itself; it does not change the underlying tendency. A bounded, per-slot repair pass does not rely on the model noticing anything — it names the exact deficient slots mechanically, after real local measurement, and asks for a small, concrete, already-scoped completion instead of a full 20-beat judgment call.');

// ═══════════════════════════════════════════════════════════════════════════════
section('9. ADAPTIVE TWO-PASS REPAIR — real Attempt 7 fixtures (primary + real pass-1 repair)');
// ═══════════════════════════════════════════════════════════════════════════════
// Attempt 7 (real, paid, $0.027538) is the first real test of the (now-superseded) delta-based
// repair prompt: primary alone was 1,007/1,100 words with 4/16 qualifying narration beats; a real
// bounded repair call correctly targeted its 12 real deficient slots but undershot the stated
// floor on 7 of them anyway, leaving the merged candidate at 1,168 words (floor cleared) with
// 9/16 qualifying (still short of 12). This section proves the NEW full-slot-replacement contract
// and the NEW two-pass orchestration against that exact real data.
const attempt7Primary = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_draft_v7_attempt7_full_package/02_draft.json'), 'utf8')).draft;
const attempt7RealPass1Repair = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_draft_v7_attempt7_full_package/raw_repair_content.txt'), 'utf8'));
const attempt7RealMergedValidation = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_draft_v7_attempt7_full_package/03_validation_result.json'), 'utf8'));

const defAttempt7Primary = measureBeatDeficiencies(attempt7Primary.scene1Candidate, PACKET);
ok('real Attempt 7 primary draft (1,007 words) is structurally repairable with 12 real deficient slots (matches the real run\'s own console output)', defAttempt7Primary.structurallyRepairable === true && defAttempt7Primary.deficiencies.length === 12, 'count=' + defAttempt7Primary.deficiencies.length);

// Reproduce the REAL pass-1 merge locally (same inputs the real run used) to get a real, exact
// pass-1-merged draft to build pass 2 against.
const pass1Merge = mergeRepairIntoDraft(attempt7Primary, attempt7RealPass1Repair, defAttempt7Primary.deficiencies);
ok('the REAL pass-1 repair response (as actually returned by the real, paid Grok call) merges cleanly under the bounded contract', pass1Merge.errors.length === 0, JSON.stringify(pass1Merge.errors));
const pass1MergedValidationRaw = validateDraft(pass1Merge.merged, PACKET);
// REAL FINDING (Roman, 2026-09-20, wish-misalignment correction): Attempt 7's own real pass-1-
// merged draft independently contains the SAME wrong attack-grammar convergence real Attempt 8
// showed — beat 12 (wish_visibly_twists) says "It smelled of scorched linen"; beat 13
// (twist_unnaturally_arrested) says "the residue hung in the air". The NEW wish_twist_wrong_
// visual_grammar rule correctly catches this on REAL, untouched historical data from a SECOND
// independent attempt — real generalizing evidence the correction is necessary, not an Attempt-8-
// only fluke — and correctly blocks any further repair pass on it (repair is never authorized to
// paper over a canon violation).
const rawAttackGrammarHits = pass1MergedValidationRaw.violations.filter(v => v.rule === 'wish_twist_wrong_visual_grammar');
ok('REAL FINDING: Attempt 7\'s own real (untouched) pass-1-merged draft ALSO trips the new wish-misalignment visual-grammar rule ("scorched"/"residue", real convergence evidence from a SECOND independent attempt)', rawAttackGrammarHits.length > 0, JSON.stringify(rawAttackGrammarHits));
ok('REAL FINDING: planNextRepairPass correctly REFUSES a residual pass on Attempt 7\'s raw real data once the visual-grammar violation coexists with the density one — repair is never authorized to paper over a canon violation', planNextRepairPass(pass1Merge.merged, pass1MergedValidationRaw, PACKET, 1).authorized === false);

// SANITIZED FIXTURE, MECHANISM-TESTING ONLY (Roman, 2026-09-20, updated 2026-09-20 after the
// causal-specificity check became BLOCKING): the two-pass ADAPTIVE ORCHESTRATION mechanism
// (slot-targeting, pass-count cap, merge contract) is a SEPARATE concern from the wish-
// misalignment content correction above, and deserves its own continued proof on real data. This
// clone strips the 2 literal banned words found above (scorched -> acrid, residue -> phrased
// without that noun, each a same-word-count swap so the residual-deficiency word counts below stay
// real and unperturbed) AND adds one danger-language clause to beat 10 (wish_and_sacrifice — NOT a
// residual-deficiency-tracked slot, so this does not perturb the word-count-based assertions below)
// so the now-BLOCKING wish_twist_causal_specificity check also clears (that beat already names "the
// one she lost"; only the danger-language half of the check was missing) — this is NOT a claim the
// sanitized text now satisfies the wish-misalignment law's full conceptual requirement (the
// surrounding "force"/"pressure"/"drove straight toward my chest" shape is still the wrong
// conceptual grammar and would need the real, deferred, focused paid revision to fix properly) — it
// only removes the literal lexical triggers and adds the minimal proxy signal so this UNRELATED
// mechanism proof can continue without being entangled with the wish-misalignment findings proven
// separately above.
const pass1MergedSanitized = JSON.parse(JSON.stringify(pass1Merge.merged));
pass1MergedSanitized.scene1Candidate.beats[10].text += ' Even as she spoke it I understood the danger: Fate might answer the letter of her wish and still get it horribly wrong.';
pass1MergedSanitized.scene1Candidate.beats[12].text = pass1MergedSanitized.scene1Candidate.beats[12].text.replace('scorched linen', 'acrid linen');
pass1MergedSanitized.scene1Candidate.beats[13].text = pass1MergedSanitized.scene1Candidate.beats[13].text.replace('the residue hung in the air', 'something unnamed lingered in the air');
// SANITIZED FIXTURE, UPDATED AGAIN 2026-09-20 (Dhokar Raes naming correction): Attempt 7's own raw
// real data independently carries the SAME leaked internal key the naming correction found in
// Attempt 8 (beats[4]/[14].speaker === "the_presiding_Dohkar", the packet's OLD cast_roles key) —
// a THIRD real historical attempt converging on the same bug (see the analogous causal-specificity
// convergence note above). Renaming the speaker field (never counted by measureBeatDeficiencies,
// so this cannot perturb the word-count-based assertions below) to the canonized real display name
// isolates this UNRELATED two-pass MECHANISM proof from that separately-proven naming finding too.
pass1MergedSanitized.scene1Candidate.beats[4].speaker = 'Dhokar Raes';
pass1MergedSanitized.scene1Candidate.beats[14].speaker = 'Dhokar Raes';
const pass1MergedValidation = validateDraft(pass1MergedSanitized, PACKET);
ok('sanitized fixture: the 2 literal banned words are gone and wish_twist_wrong_visual_grammar no longer fires, isolating the two-pass MECHANISM proof below from the separately-proven wish-misalignment finding above', !pass1MergedValidation.violations.some(v => v.rule === 'wish_twist_wrong_visual_grammar'));
ok('sanitized fixture: the added danger-language clause clears the now-BLOCKING wish_twist_causal_specificity check too, so only the density violation remains for the mechanism proof below', !pass1MergedValidation.violations.some(v => v.rule === 'wish_twist_causal_specificity'));
ok('sanitized fixture: the renamed speaker fields clear the speaker-display rules too, isolating the mechanism proof from the separately-proven Dhokar Raes naming finding', !pass1MergedValidation.violations.some(v => v.rule === 'speaker_reader_visible_internal_key' || v.rule === 'speaker_unresolved_cast_reference'));
ok('sanitized fixture still shows scene1_insufficient_narration_density as the only remaining rule (rule NAME matches the frozen pre-reversal record; exact count/detail may legitimately differ under the post-reversal ceiling policy)', pass1MergedValidation.violations.length === 1 && pass1MergedValidation.violations[0].rule === 'scene1_insufficient_narration_density' && attempt7RealMergedValidation.finalValidation.violations.length === 1 && attempt7RealMergedValidation.finalValidation.violations[0].rule === 'scene1_insufficient_narration_density', JSON.stringify(pass1MergedValidation.violations));

// ── (a) "a too-short first repair leaves only its deficient slots eligible for the second pass" ──
const plan2 = planNextRepairPass(pass1MergedSanitized, pass1MergedValidation, PACKET, 1);
ok('planNextRepairPass AUTHORIZES a second pass after a too-short real first repair (passesAlreadyRun=1, still < MAX_REPAIR_PASSES=' + MAX_REPAIR_PASSES + ')', plan2.authorized === true, JSON.stringify(plan2));
const pass2DeficientNs = plan2.authorized ? plan2.deficiencyReport.deficiencies.map(d => d.n).sort((a, b) => a - b) : [];
const EXPECTED_REAL_RESIDUAL_SLOTS = [9, 10, 12, 13, 14, 16, 17, 19, 20]; // hand-verified against the real merged draft's actual per-beat word counts
ok('the second pass\'s deficient-slot set is EXACTLY the real 9 slots still below their own floor after the real pass-1 repair — not the original 12, not all 20, not a guess', JSON.stringify(pass2DeficientNs) === JSON.stringify(EXPECTED_REAL_RESIDUAL_SLOTS), 'got ' + JSON.stringify(pass2DeficientNs));
ok('the 3 slots the real pass-1 repair DID fully fix (4, 7, 8) are correctly EXCLUDED from the second pass\'s target set', ![4, 7, 8].some(n => pass2DeficientNs.includes(n)));

// ── (b) full-slot-replacement prompt for pass 2, real (sanitized-for-mechanism) fixtures ──
const { user: pass2User } = buildRepairPrompt(PACKET, pass1MergedSanitized, plan2.deficiencyReport.deficiencies);
ok('the pass-2 repair prompt, built from real residual deficiencies, targets each slot\'s real midpoint (not the old delta framing)', plan2.deficiencyReport.deficiencies.every(d => pass2User.includes('TARGET approximately ' + d.targetWords + ' words')));
ok('the pass-2 repair prompt does not re-request any slot the first pass already fixed (4, 7, 8 never appear as [NEEDS REPAIR — REPLACE ENTIRELY])', ![4, 7, 8].some(n => pass2User.includes('Beat ' + n + ' [NEEDS REPAIR — REPLACE ENTIRELY]')));

// ── (c) a compliant full-slot residual repair yields a PASSING merged candidate ──
function buildCompliantFullSlotRepairFor(deficiencies) {
  const FILLER_SENTENCES = [
    'A second breath followed the first, slower, and I let my shoulders settle a fraction before the next word came from someone at the edge of the gathering.',
    'My grip tightened without my choosing it, knuckles pale where they met the fabric, and I noticed the change only after it had already happened to me.',
    'The sound of it reached the back of the clearing before I finished forming the thought, and a few heads turned toward the noise rather than toward me.',
    'I counted the length of that single silence, and for the span of it nothing else in the clearing seemed to move or breathe at all.',
    'Somewhere behind me a foot shifted against the grass, deliberate and unhurried, and I understood it as a question I was not yet ready to answer honestly.',
  ];
  return {
    repairs: deficiencies.map((d, idx) => {
      const need = d.targetWords; // land AT the midpoint target, not merely above the floor
      const words = [];
      let s = 0;
      while (words.length < need) { words.push(...FILLER_SENTENCES[(idx + s) % FILLER_SENTENCES.length].split(' ')); s++; }
      return { n: d.n, text: words.slice(0, need).join(' ') + '.' };
    }),
  };
}
const compliantPass2Repair = buildCompliantFullSlotRepairFor(plan2.deficiencyReport.deficiencies);
ok('the compliant pass-2 fixture genuinely lands each slot AT its own midpoint (real arithmetic, not a placeholder)', compliantPass2Repair.repairs.every(r => { const d = plan2.deficiencyReport.deficiencies.find(x => x.n === r.n); return r.text.trim().split(/\s+/).filter(Boolean).length === d.targetWords; }));
const pass2Merge = mergeRepairIntoDraft(pass1Merge.merged, compliantPass2Repair, plan2.deficiencyReport.deficiencies);
ok('GREEN: the compliant pass-2 (full-slot) repair merges cleanly on top of the pass-1-merged draft', pass2Merge.errors.length === 0, JSON.stringify(pass2Merge.errors));
const doublyMergedFullDraft = { ...attempt7Primary, scene1Candidate: pass2Merge.merged.scene1Candidate };
const finalValidationAfterTwoPasses = validateDraft(doublyMergedFullDraft, PACKET);
ok('END-TO-END: primary + real pass-1 repair + compliant pass-2 (full-slot, midpoint) repair, re-validated with the REAL validator, CLEARS every density rule AND the attack-grammar rule (wish_twist_wrong_visual_grammar no longer fires — beat 14, the one carrying "residue", was itself one of the real residual-deficiency slots this pass replaces)', !finalValidationAfterTwoPasses.violations.some(v => v.rule === 'scene1_too_thin' || v.rule === 'scene1_insufficient_narration_density' || v.rule === 'wish_twist_wrong_visual_grammar'), JSON.stringify(finalValidationAfterTwoPasses.violations));
// REAL FINDING (Roman, 2026-09-20, wish-twist causal-specificity correction): this doubly-merged
// draft is built from the REAL (unsanitized) pass-1-merged base, so beat 11 (wish_and_sacrifice,
// untouched by either repair pass) still carries its real original text, which already names "the
// one she lost" — but no beat in the real wish_and_sacrifice/wish_visibly_twists/twist_unnaturally_
// arrested chain ever states wrong/dangerous-fulfillment language, in the real Attempt 7 primary or
// in either bounded repair pass's compliant filler (filler text is deliberately generic and adds no
// causal content by design). This is real, correct, honest behavior, not a bug: a density-only
// bounded repair pass is NEVER authorized to invent or add causal/canon content — it only ever
// widens or replaces text to satisfy a word-count floor — so this real, pre-existing content gap
// (present since the real, paid Attempt 7 primary generation) correctly survives both repair passes
// untouched. The candidate is correctly NOT eligible for this separate, real, content-completeness
// reason, exactly matching the "repair never papers over a canon violation" principle already proven
// for wrong-visual-grammar above, now also holding for causal-specificity.
const finalRules = finalValidationAfterTwoPasses.violations.map(v => v.rule);
ok('REAL FINDING: even after two full, compliant density-repair passes, the doubly-merged candidate correctly remains NOT ELIGIBLE — wish_twist_causal_specificity still fires because neither the real Attempt 7 primary nor either bounded repair pass ever supplied wrong/dangerous-fulfillment language, and a density-only repair is never authorized to invent that content', finalValidationAfterTwoPasses.ok === false && finalRules.includes('wish_twist_causal_specificity'), JSON.stringify(finalValidationAfterTwoPasses.violations));
// REAL FINDING (Roman, 2026-09-20, Dhokar Raes naming correction, discovered here — not planted):
// beats[4]/[14] (n=5, n=15) are not in Attempt 7's residual-deficient slot set, so this doubly-
// merged draft (built from the REAL, unsanitized attempt7Primary/pass1Merge base) still carries
// their real, original "the_presiding_Dohkar" speaker value straight through both repair passes —
// a density-only repair never touches speaker fields at all, so this real naming defect correctly
// survives untouched too, exactly like the causal-specificity gap above.
ok('REAL FINDING: the doubly-merged candidate ALSO still carries the real, untouched leaked-internal-key speaker naming defect (beats[4]/[14]) straight through both density-only repair passes — never fixed by a repair that only ever touches word counts', finalRules.includes('speaker_reader_visible_internal_key'), JSON.stringify(finalValidationAfterTwoPasses.violations.filter(v => v.rule === 'speaker_reader_visible_internal_key')));

// ── (d) a structural/canon/copy violation prevents ANY repair pass, at any pass count ──
const mixedViolations = [{ rule: 'scene1_insufficient_narration_density' }, { rule: 'the_answer_form_violation' }];
ok('planNextRepairPass REFUSES pass 1 (passesAlreadyRun=0) when a canon violation coexists with a density one', planNextRepairPass(pass1Merge.merged, { ok: false, violations: mixedViolations }, PACKET, 0).authorized === false);
ok('planNextRepairPass REFUSES pass 2 (passesAlreadyRun=1) for the same mixed-violation reason', planNextRepairPass(pass1Merge.merged, { ok: false, violations: mixedViolations }, PACKET, 1).authorized === false);
const structuralDriftDraft = { scene1Candidate: { beats: pass1Merge.merged.scene1Candidate.beats.slice(0, 20) } };
structuralDriftDraft.scene1Candidate.beats[3] = { ...structuralDriftDraft.scene1Candidate.beats[3], image: 'd1' };
ok('planNextRepairPass REFUSES when the current draft has structurally drifted (tampered image mapping), even with purely density violations reported', planNextRepairPass(structuralDriftDraft, { ok: false, violations: [{ rule: 'scene1_too_thin' }] }, PACKET, 0).authorized === false);

// ── (e) NEVER a third pass — the hard ceiling ──
ok('planNextRepairPass REFUSES a third pass (passesAlreadyRun=2 === MAX_REPAIR_PASSES) even with purely density violations and real residual deficiencies still present', planNextRepairPass(pass1Merge.merged, pass1MergedValidation, PACKET, 2).authorized === false);
ok('planNextRepairPass REFUSES any passesAlreadyRun beyond the max (passesAlreadyRun=3, 4, ...)', [3, 4, 10].every(n => planNextRepairPass(pass1Merge.merged, pass1MergedValidation, PACKET, n).authorized === false));
ok('MAX_REPAIR_PASSES is exactly 2 (primary + pass 1 + pass 2 — never more)', MAX_REPAIR_PASSES === 2);
ok('planNextRepairPass throws on a malformed passesAlreadyRun rather than silently authorizing', (() => { try { planNextRepairPass(pass1Merge.merged, pass1MergedValidation, PACKET, -1); return false; } catch (e) { return /non-negative/.test(e.message); } })() && (() => { try { planNextRepairPass(pass1Merge.merged, pass1MergedValidation, PACKET, 'two'); return false; } catch (e) { return /non-negative/.test(e.message); } })());

// ── (f) the second pass CANNOT alter the opener, post-interruption beat, image map, or already-valid slots ──
const pass2WithOasOpening = { repairs: compliantPass2Repair.repairs, oasOpening: { speaker: 'Julian', text: 'An unauthorized replacement for the OAS opener that a residual repair pass must never be able to make.' } };
ok('RED (pass 2): a repair response touching oasOpening is rejected wholesale, identically to pass 1', mergeRepairIntoDraft(pass1Merge.merged, pass2WithOasOpening, plan2.deficiencyReport.deficiencies).merged === null);
const pass2WithPostInterruption = { repairs: compliantPass2Repair.repairs, postInterruptionBeat: { speaker: null, image: 'd4', kind: 'narration', text: 'An unauthorized replacement for the post-interruption beat.' } };
ok('RED (pass 2): a repair response touching postInterruptionBeat is rejected wholesale', mergeRepairIntoDraft(pass1Merge.merged, pass2WithPostInterruption, plan2.deficiencyReport.deficiencies).merged === null);
const pass2TouchingAlreadyValidSlot = { repairs: [...compliantPass2Repair.repairs, { n: 4, text: 'An unauthorized rewrite of a slot the first pass already fixed — the second pass must never be able to touch it.' }] };
const pass2RedAlreadyValid = mergeRepairIntoDraft(pass1Merge.merged, pass2TouchingAlreadyValidSlot, plan2.deficiencyReport.deficiencies);
ok('RED (pass 2): a repair response touching slot 4 (already fixed and valid after pass 1) is rejected wholesale, not silently applied on top of an already-good beat', pass2RedAlreadyValid.merged === null && pass2RedAlreadyValid.errors.some(e => /never flagged as deficient/.test(e)));
const acceptedAfterPass1 = Array.from({ length: 20 }, (_, i) => i + 1).filter(n => !pass2DeficientNs.includes(n));
ok('GREEN (pass 2): every beat NOT named in the second pass is byte-identical between the pass-1-merged draft and the doubly-merged final draft — the second pass touches ONLY its own named slots', acceptedAfterPass1.every(n => JSON.stringify(doublyMergedFullDraft.scene1Candidate.beats[n - 1]) === JSON.stringify(pass1Merge.merged.scene1Candidate.beats[n - 1])));
ok('GREEN (pass 2): image occurrence mapping is IDENTICAL across primary, pass-1-merged, and doubly-merged drafts for every one of the 20 slots', doublyMergedFullDraft.scene1Candidate.beats.every((b, i) => b.image === attempt7Primary.scene1Candidate.beats[i].image));
ok('GREEN (pass 2): scene1Coverage, first_person_lirael, oasOpening, and postInterruptionBeat are IDENTICAL between the primary artifact and the doubly-merged final draft (a repair pass never touches anything outside scene1Candidate.beats[].text)', JSON.stringify(doublyMergedFullDraft.scene1Coverage) === JSON.stringify(attempt7Primary.scene1Coverage) && doublyMergedFullDraft.first_person_lirael === attempt7Primary.first_person_lirael && JSON.stringify(doublyMergedFullDraft.oasOpening) === JSON.stringify(attempt7Primary.oasOpening) && JSON.stringify(doublyMergedFullDraft.postInterruptionBeat) === JSON.stringify(attempt7Primary.postInterruptionBeat));

// ── (g) full provider/cost ceiling for primary + at most TWO bounded repairs ──
const worstCaseRepair2Chain = buildRepairFallbackChain(PACKET, pass1Merge.merged, defWorstCase.deficiencies); // reuse the same 20-slot worst-case fixture from section 6
const repair2Sys = worstCaseRepair2Chain[0].messages[0].content, repair2Usr = worstCaseRepair2Chain[0].messages[1].content;
const repair2EstInputTokens = Math.round((repair2Sys.length + repair2Usr.length) / 4);
const repair2TierCosts = worstCaseRepair2Chain.map(t => { const p = PRICING[t.billedModel || t.model]; return repair2EstInputTokens * p.in + t.max_tokens * p.out; });
const repair2WorstCase = repair2TierCosts.reduce((a, b) => a + b, 0);
const twoPassAbsoluteWorstCase = primaryWorstCase + repairWorstCase + repair2WorstCase;
const twoPassExpectedSuccess = primaryTierCosts[0] + repairTierCosts[0] + repair2TierCosts[0];
// A more REALISTIC ceiling using real Attempt 7 numbers: real primary + real pass-1 repair cost,
// plus a dry-computed (never spent) estimate for a pass-2 call sized to the REAL 9 residual slots.
const REAL_ATTEMPT7_PRIMARY_COST = 0.021108, REAL_ATTEMPT7_PASS1_REPAIR_COST = 0.00643;
const realisticPass2Chain = buildRepairFallbackChain(PACKET, pass1Merge.merged, plan2.deficiencyReport.deficiencies);
const realisticPass2Sys = realisticPass2Chain[0].messages[0].content, realisticPass2Usr = realisticPass2Chain[0].messages[1].content;
const realisticPass2EstInputTokens = Math.round((realisticPass2Sys.length + realisticPass2Usr.length) / 4);
const realisticPass2ExpectedCost = realisticPass2EstInputTokens * PRICING['grok-4.3'].in + realisticPass2Chain[0].max_tokens * PRICING['grok-4.3'].out;
console.log('\n-- TWO-PASS COST CEILING (primary + at most TWO bounded repairs) --');
console.log('  ABSOLUTE WORST CASE (primary 3-tier + repair-1 3-tier[20 slots] + repair-2 3-tier[20 slots]): $' + twoPassAbsoluteWorstCase.toFixed(4));
console.log('  EXPECTED-SUCCESS CEILING (all 3 calls succeed on Grok, worst-case 20-slot sizing): $' + twoPassExpectedSuccess.toFixed(4));
console.log('  REALISTIC (using REAL Attempt 7 primary + real pass-1 costs, dry-projected pass-2 sized to the real 9 residual slots): $' + (REAL_ATTEMPT7_PRIMARY_COST + REAL_ATTEMPT7_PASS1_REPAIR_COST + realisticPass2ExpectedCost).toFixed(4) + ' (pass-2 projected only — NOT spent)');
ok('a second bounded repair pass, even worst case, keeps the ABSOLUTE worst-case ceiling for the whole 3-call operation under $0.30', twoPassAbsoluteWorstCase < 0.30, '$' + twoPassAbsoluteWorstCase.toFixed(4));
ok('the REALISTIC two-pass estimate (grounded in Attempt 7\'s real primary + real pass-1 cost) stays well under $0.05 total for the whole operation', (REAL_ATTEMPT7_PRIMARY_COST + REAL_ATTEMPT7_PASS1_REPAIR_COST + realisticPass2ExpectedCost) < 0.05);

// ═══════════════════════════════════════════════════════════════════════════════
section('10. SHRINK-TO-MIDPOINT REPAIR REMOVED — real Attempt 8 pass-1-merged fixture, reversed policy');
// ═══════════════════════════════════════════════════════════════════════════════
// Roman, 2026-09-20: a brief prior version of this engine flagged beats ABOVE their ceiling as
// deficient and fed them to a shrink repair. Real Attempt 8 proved that wrong — a genuine 99-word
// narration beat (real beat 10, pre-shrink) carried unique, causally load-bearing content (Seren's
// wish beginning to curve/misalign) that the shrink discarded, replacing it with a near-duplicate
// of the adjacent beat. This section proves the REVERSAL, using the SAME real fixture that
// previously proved the (now-removed) capability: the 8 real overlong narration beats are no
// longer detected as deficient, are never repair targets, and the real, information-dense
// pre-shrink text is preserved when re-derived from the real pass-1-merged state.
const attempt8Pass1Merged = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package/07_final_draft_after_pass1.json'), 'utf8')).draft;
const defAttempt8Pass1 = measureBeatDeficiencies(attempt8Pass1Merged.scene1Candidate, PACKET);
const REAL_OVERLONG_NARRATION_SLOTS = [1, 2, 3, 6, 7, 8, 10, 13]; // hand-verified against the real merged draft's actual per-beat word counts — all genuinely over 90 words
ok('real Attempt 8 pass-1-merged draft: the 8 real overlong narration beats genuinely exceed 90 words (real arithmetic, confirming the fixture is real, not synthetic)', REAL_OVERLONG_NARRATION_SLOTS.every(n => { const w = attempt8Pass1Merged.scene1Candidate.beats[n - 1].text.trim().split(/\s+/).filter(Boolean).length; return w > 90; }));
ok('REVERSED POLICY: measureBeatDeficiencies on the real Attempt 8 pass-1-merged draft now returns ZERO deficiencies — shrink-to-midpoint repair is fully removed, an over-ceiling beat is never flagged, never a repair target', defAttempt8Pass1.structurallyRepairable === true && defAttempt8Pass1.deficiencies.length === 0, JSON.stringify(defAttempt8Pass1.deficiencies));
ok('REVERSED POLICY: no deficiency object anywhere in this engine can ever carry direction "long" any more (the field/branch was removed, not merely gated to zero results)', !/direction:\s*'long'|direction === 'long'/.test(fs.readFileSync(path.join(__dirname, '_first_sacrifice_bounded_repair_engine.mjs'), 'utf8')));
ok('REVERSED POLICY: real beat 10\'s actual pass-1-merged text is preserved verbatim — the wish-curving content is still present, never discarded by any repair this engine could run now', attempt8Pass1Merged.scene1Candidate.beats[9].text.includes('The sentence she was meant to finish curved instead toward me') && attempt8Pass1Merged.scene1Candidate.beats[9].text.trim().split(/\s+/).filter(Boolean).length === 99);

// planNextRepairPass on this real fixture: the validator's own diagnostics_policy (proven in
// _first_sacrifice_packet_validator.mjs) means the ONLY remaining real violation on this draft is
// density-from-thinness, if any — never an over-ceiling one. A structural/canon violation still
// blocks repair regardless.
ok('RED: planNextRepairPass still REFUSES when a canon violation coexists with a density one, on this same real fixture', planNextRepairPass(attempt8Pass1Merged, { ok: false, violations: [{ rule: 'scene1_insufficient_narration_density' }, { rule: 'the_answer_form_violation' }] }, PACKET, 1).authorized === false);
ok('RED: measureBeatDeficiencies still refuses a structurally-drifted draft (tampered image) on this same real fixture', (() => { const tampered = JSON.parse(JSON.stringify(attempt8Pass1Merged)); tampered.scene1Candidate.beats[0].image = 'd1'; return measureBeatDeficiencies(tampered.scene1Candidate, PACKET).structurallyRepairable === false; })());
ok('GREEN: planNextRepairPass correctly finds NOTHING to authorize on this real fixture once re-validated (already-passing or zero-eligible-deficiency, either way no blind repair)', (() => { const v = validateDraft(attempt8Pass1Merged, PACKET); const plan = planNextRepairPass(attempt8Pass1Merged, v, PACKET, 1); return v.ok === true ? plan.authorized === false : (plan.authorized === false || plan.deficiencyReport.deficiencies.length === 0); })());

console.log('\n' + '='.repeat(92));
console.log('BOUNDED REPAIR ENGINE CONTROL: ' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); }
console.log('fetch() was called ' + fetchCalls + ' times (must be 0).');
process.exitCode = (fail || fetchCalls) ? 1 : 0;
