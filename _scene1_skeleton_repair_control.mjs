#!/usr/bin/env node
// _scene1_skeleton_repair_control.mjs
//
// OFFLINE dry control for the opening-skeleton holistic-repair DESIGN (Roman, 2026-09-16), built
// after a real paid Scene 1 run (First Sacrifice) aborted on one weak pc_opening_fusion.beat
// [NO_CONTACT] with zero retry. Tests the REAL, standalone repair-request/merge layer
// (_classifySkeletonFaults / _skeletonRepairEligible / _buildSkeletonRepairRequest /
// _applySkeletonRepair, public/app.js next to _validateFusionConcreteness) plus a SIMULATED
// bounded-attempt sequence (scenarios D/E) that mirrors the design's intended integration shape
// — this file does NOT claim the real _buildScene1Scaffold live abort path has been rewired;
// that integration is explicitly NOT done (see the design comment in app.js). No browser, no
// network, no provider call.
//
// Fixture in scenario A is the ACTUAL captured skeleton + ACTUAL fault string from the real paid
// run (_paid_scene1_v2/01_mistral_request_response.json + the run's printed skeleton fault).

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

let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}
function section(title) { console.log('\n=== ' + title + ' ==='); }

// Pulls in _validateFusionConcreteness (the REAL, already-shipped, standalone check that fired
// in the real paid run) plus the new repair layer, in real file order, one contiguous span.
const repairLayerSrc = sliceByAnchor('opening-skeleton-repair-layer',
  'function _morphStem(t) {',
  'try { if (typeof window !== \'undefined\') window._applySkeletonRepair = _applySkeletonRepair; } catch (_) {}');
const body = repairLayerSrc;
const factory = new Function('window', body);
function freshSandbox() { const win = {}; factory(win); return win; }

// ══════════════════════════════════════════════════════════════════════════
// REAL FIXTURE — the actual captured skeleton + actual fault from _paid_scene1_v2/, 2026-09-16.
// ══════════════════════════════════════════════════════════════════════════
const REAL_ORIGINAL_ENVELOPE = {
  character_plus: [
    { character: 'Seren', mode: 'IN_PERSON', option_id: 'OPT-4', expression_mode: 'LEAK', first_mention: true,
      visible_action: 'Seren names her offering aloud then falters and redirects it toward Lirael.',
      enacts_evidence_id: 'E4', behavior_object_ids: [], behavior_person_ids: ['pc:lirael'],
      revelation_bridge: 'The blur shows her need to be seen as good without naming the wound.',
      pc_lens_operation: 'INWARD_TRANSLATION_OF_ANOTHER_PERSONS_COST',
      pc_interpretation: 'Seren softens the truth to protect her own image more than Lirael.' },
  ],
  environment_plus: { target_object_id: 'O4', axis: 'ritual', beat: '{TARGET} sits loose across her mouth, a decorum she can break with one pull.' },
  pc_opening_fusion: { character: 'Lirael', placement: 'PC_FIRST_EMBODIED_BEAT',
    character_angle: 'Her attention moves through her body as feeling before it becomes legible.',
    beat: 'The the gossamer band tied across the Sacrificiant’s mouth muffles my first startled breath as Seren’s words land.' },
};
const REAL_FAULT = 'pc_opening_fusion.beat is neither contact nor sensory juxtaposition [NO_CONTACT] — a neutral mention or an interior diagnosis does not fuse: "The the gossamer band tied across the Sacrificiant’s mouth muffles my first startled breath as Seren’s words l"';

// ══════════════════════════════════════════════════════════════════════════
section('SCENARIO A — one bad fusion (the REAL captured fault from the real paid run)');
// ══════════════════════════════════════════════════════════════════════════
{
  const win = freshSandbox();

  // First, confirm the REAL validator agrees this beat is genuinely NO_CONTACT (not a fixture
  // artifact) — the same function that fired live.
  const liveCheck = win._validateFusionConcreteness(REAL_ORIGINAL_ENVELOPE.pc_opening_fusion.beat, 'Lirael', 'the gossamer band');
  ok('precondition — the REAL _validateFusionConcreteness genuinely rejects the real captured beat', liveCheck.ok === false && liveCheck.code === 'NO_CONTACT', JSON.stringify(liveCheck));

  const classified = win._classifySkeletonFaults([REAL_FAULT]);
  ok('the real fault classifies to pc_opening_fusion', classified.members.pc_opening_fusion === true, JSON.stringify(classified));
  ok('no other member implicated', !classified.members.fusion && !classified.members.environment_plus && !classified.members.character_plus, JSON.stringify(classified));
  ok('nothing left unmatched', classified.unmatched.length === 0, JSON.stringify(classified.unmatched));

  const eligible = win._skeletonRepairEligible(classified);
  ok('repair is eligible for this single, confidently-attributed fault', eligible === true);

  const req = win._buildSkeletonRepairRequest(REAL_ORIGINAL_ENVELOPE, [REAL_FAULT], classified);
  ok('askFor is exactly ["pc_opening_fusion"] — nothing else requested', JSON.stringify(req.askFor) === JSON.stringify(['pc_opening_fusion']), JSON.stringify(req.askFor));
  ok('the accepted-context section includes character_plus and environment_plus VERBATIM (not implicated, not to be touched)', req.user.includes('character_plus') && req.user.includes('environment_plus') && req.user.includes('ACCEPTED, UNCHANGED CONTEXT'));
  ok('the repair request names the exact real failure text', req.user.includes('NO_CONTACT'));

  // Simulate a repair response with a genuinely fixed, contact-bearing beat.
  const FIXED_BEAT = 'I press my palm flat against the gossamer band at my mouth, feeling the weave catch on my chapped lip as Seren’s words land.';
  const repairResponse = { pc_opening_fusion: { character: 'Lirael', placement: 'PC_FIRST_EMBODIED_BEAT',
    character_angle: 'Her hand moves before her mind agrees to it.', beat: FIXED_BEAT } };
  const merged = win._applySkeletonRepair(REAL_ORIGINAL_ENVELOPE, repairResponse, req.askFor, classified.characters);

  ok('merge reports zero tamper attempts (the repair response only returned what it was asked for)', merged.tamperAttempted.length === 0, JSON.stringify(merged.tamperAttempted));
  ok('character_plus is BYTE-IDENTICAL to the original (never touched)', JSON.stringify(merged.envelope.character_plus) === JSON.stringify(REAL_ORIGINAL_ENVELOPE.character_plus));
  ok('environment_plus is BYTE-IDENTICAL to the original (never touched)', JSON.stringify(merged.envelope.environment_plus) === JSON.stringify(REAL_ORIGINAL_ENVELOPE.environment_plus));
  ok('pc_opening_fusion.beat now carries the REPAIRED text', merged.envelope.pc_opening_fusion.beat === FIXED_BEAT);
  ok('the ORIGINAL envelope object itself was never mutated (still carries the old, bad beat)', REAL_ORIGINAL_ENVELOPE.pc_opening_fusion.beat.startsWith('The the gossamer'));

  const revalidated = win._validateFusionConcreteness(merged.envelope.pc_opening_fusion.beat, 'Lirael', 'the gossamer band');
  ok('re-running the REAL validator against the repaired beat now passes', revalidated.ok === true, JSON.stringify(revalidated));
}

// ══════════════════════════════════════════════════════════════════════════
section('SCENARIO B — several simultaneous C+/E+/fusion faults, one repair request bundles all of them');
// ══════════════════════════════════════════════════════════════════════════
{
  const win = freshSandbox();
  const faults = [
    REAL_FAULT,
    'environment_plus.axis is empty',
    '"Seren" is staged with anchor_beat "" — the roster ships prefilled with FROM_CHARACTER_PLUS and there was nothing to fill in; their beat is defined once, in character_plus',
    '"Julian" is given an action in the opening beat AND a different first-mention beat in character_plus — the opening says "he steps forward" and the C+ says "he watches from the edge"',
  ];
  const classified = win._classifySkeletonFaults(faults);
  ok('all three member types implicated together', classified.members.pc_opening_fusion === true && classified.members.environment_plus === true && classified.members.character_plus === true, JSON.stringify(classified));
  ok('both named characters captured', classified.characters.includes('Seren') && classified.characters.includes('Julian'), JSON.stringify(classified.characters));
  ok('still nothing unmatched (every fault attributed)', classified.unmatched.length === 0, JSON.stringify(classified.unmatched));

  const envelope = { character_plus: [{ character: 'Seren' }, { character: 'Julian' }, { character: 'the presiding Dohkar' }], environment_plus: { axis: '' }, pc_opening_fusion: REAL_ORIGINAL_ENVELOPE.pc_opening_fusion };
  const req = win._buildSkeletonRepairRequest(envelope, faults, classified);
  ok('askFor bundles pc_opening_fusion + environment_plus + character_plus in ONE request (not separate requests per fault)', req.askFor.length === 3 && req.askFor.includes('pc_opening_fusion') && req.askFor.includes('environment_plus') && req.askFor.includes('character_plus'), JSON.stringify(req.askFor));
  ok('the untouched third character (the presiding Dohkar) is NOT named as needing repair', !req.user.includes('repair ONLY these named entries') || !req.user.slice(req.user.indexOf('repair ONLY these named entries')).split('\n')[0].includes('Dohkar'));
}

// ══════════════════════════════════════════════════════════════════════════
section('SCENARIO C — an attempted repair that changes LOCKED skeleton-adjacent fields (stage/cast) is discarded, never applied');
// ══════════════════════════════════════════════════════════════════════════
{
  const win = freshSandbox();
  const classified = win._classifySkeletonFaults([REAL_FAULT]);
  const req = win._buildSkeletonRepairRequest(REAL_ORIGINAL_ENVELOPE, [REAL_FAULT], classified);

  // A repair response that (legitimately) fixes pc_opening_fusion but ALSO tries to "help" by
  // rewriting locked, non-requested fields — exactly what Roman's constraint forbids.
  const overreachingResponse = {
    pc_opening_fusion: { character: 'Lirael', placement: 'PC_FIRST_EMBODIED_BEAT', character_angle: 'fixed', beat: 'I press my palm flat against the gossamer band.' },
    opening_setting: 'a different clearing entirely',              // LOCKED — stage
    staged_characters: [{ name: 'A brand new character', presence: 'IN_PERSON' }], // LOCKED — cast
    scene_mission: 'a rewritten mission',                          // LOCKED — mission
    reader_state: { knows: 'something the model invented' },       // LOCKED — reader posture
  };
  const merged = win._applySkeletonRepair(REAL_ORIGINAL_ENVELOPE, overreachingResponse, req.askFor, classified.characters);

  ok('all 4 out-of-mandate keys are reported as tamper attempts', merged.tamperAttempted.length === 4, JSON.stringify(merged.tamperAttempted));
  ['opening_setting', 'staged_characters', 'scene_mission', 'reader_state'].forEach((k) => {
    ok('tamperAttempted names "' + k + '"', merged.tamperAttempted.includes(k));
    ok('the merged envelope does NOT carry the attempted "' + k + '" value (structurally impossible to apply, not just flagged)', !(k in merged.envelope));
  });
  ok('the legitimately-requested pc_opening_fusion fix DID still apply (tamper detection does not also block the real fix)', merged.envelope.pc_opening_fusion.beat === 'I press my palm flat against the gossamer band.');
}

// ══════════════════════════════════════════════════════════════════════════
section('SCENARIOS D/E — SIMULATED bounded sequence (mirrors the design\'s intended call shape; NOT the real production wiring)');
// ══════════════════════════════════════════════════════════════════════════
{
  // A minimal, test-only orchestrator matching the documented "intended call shape" in app.js.
  // Bounded to exactly one repair attempt; author fires only after a clean re-validation; a
  // still-faulty repair is a named failure, never a silent valve drop.
  function simulateAttempt(win, originalEnvelope, faults, repairProviderFn, counters) {
    const classified = win._classifySkeletonFaults(faults);
    if (!win._skeletonRepairEligible(classified)) return { outcome: 'ABORT_NO_REPAIR_ELIGIBLE', reason: faults.join('; ') };
    const req = win._buildSkeletonRepairRequest(originalEnvelope, faults, classified);
    counters.repairCalls++;
    if (counters.repairCalls > 1) throw new Error('BOUND VIOLATED: more than one repair attempt');
    const repairResponse = repairProviderFn(req);
    const merged = win._applySkeletonRepair(originalEnvelope, repairResponse, req.askFor, classified.characters);
    const beatCheck = win._validateFusionConcreteness(
      (merged.envelope.pc_opening_fusion && merged.envelope.pc_opening_fusion.beat) || '', 'Lirael', 'the gossamer band');
    if (beatCheck.ok) {
      counters.authorCalls++;
      return { outcome: 'ACCEPTED', envelope: merged.envelope, tamperAttempted: merged.tamperAttempted };
    }
    return { outcome: 'REPAIR_FAILED_STILL_INVALID', reason: 'repair attempted, still invalid: ' + beatCheck.reason, tamperAttempted: merged.tamperAttempted };
  }

  section('  SCENARIO D — successful repair reaches exactly one stubbed author/page call');
  {
    const win = freshSandbox();
    const counters = { repairCalls: 0, authorCalls: 0 };
    const GOOD_FIX = 'My fingers close around the edge of the gossamer band as Seren’s words land.';
    const result = simulateAttempt(win, REAL_ORIGINAL_ENVELOPE, [REAL_FAULT], () => ({ pc_opening_fusion: { character: 'Lirael', placement: 'PC_FIRST_EMBODIED_BEAT', character_angle: 'x', beat: GOOD_FIX } }), counters);
    ok('outcome is ACCEPTED', result.outcome === 'ACCEPTED', JSON.stringify(result));
    ok('exactly ONE repair call was made', counters.repairCalls === 1, 'repairCalls=' + counters.repairCalls);
    ok('exactly ONE author/page call fired', counters.authorCalls === 1, 'authorCalls=' + counters.authorCalls);
    ok('zero tamper attempts on a well-behaved repair', result.tamperAttempted.length === 0);
  }

  section('  SCENARIO E — failed repair (still invalid after one attempt) yields ZERO author calls, named failure, no second attempt, no valve');
  {
    const win = freshSandbox();
    const counters = { repairCalls: 0, authorCalls: 0 };
    const STILL_BAD = 'I think about how the band muffles my breath as Seren’s words land.'; // still an interior diagnosis, no real contact
    const preCheck = win._validateFusionConcreteness(STILL_BAD, 'Lirael', 'the gossamer band');
    ok('precondition — the "still bad" fixture genuinely fails the real validator too (not a fixture artifact)', preCheck.ok === false, JSON.stringify(preCheck));

    const result = simulateAttempt(win, REAL_ORIGINAL_ENVELOPE, [REAL_FAULT], () => ({ pc_opening_fusion: { character: 'Lirael', placement: 'PC_FIRST_EMBODIED_BEAT', character_angle: 'x', beat: STILL_BAD } }), counters);
    ok('outcome is a NAMED failure, not a silent drop', result.outcome === 'REPAIR_FAILED_STILL_INVALID', JSON.stringify(result));
    ok('the failure reason is distinct from "never attempted repair" (names that a repair WAS tried)', result.reason.startsWith('repair attempted, still invalid'), result.reason);
    ok('exactly ONE repair call was made (bound respected — no second attempt after the first fails)', counters.repairCalls === 1, 'repairCalls=' + counters.repairCalls);
    ok('ZERO author/page calls fired', counters.authorCalls === 0, 'authorCalls=' + counters.authorCalls);

    // Attempting a second call must be refused by the bound, not merely "not attempted by choice".
    let threw = false;
    try { simulateAttempt(win, REAL_ORIGINAL_ENVELOPE, [REAL_FAULT], () => ({ pc_opening_fusion: { character: 'Lirael', placement: 'PC_FIRST_EMBODIED_BEAT', character_angle: 'x', beat: STILL_BAD } }), counters); }
    catch (e) { threw = /BOUND VIOLATED/.test(e.message); }
    ok('a second repair attempt against the SAME counters is structurally refused (the one-shot bound is enforced, not just conventionally followed)', threw === true);
  }
}

console.log('\n======================================================================');
console.log('SCENE1 SKELETON REPAIR (DESIGN) CONTROL: ' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('\nFAILURES:'); fails.forEach((f) => console.log('  - ' + f)); process.exitCode = 1; }
