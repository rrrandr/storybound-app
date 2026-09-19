#!/usr/bin/env node
// FATELANDS MISALIGNMENT PERCEPTION LAW — shared-canon consistency control (Roman, 2026-09-20)
//
// Proves the sibling perception law is REAL canon actually wired into the runtime and cross-
// referenced correctly with First Sacrifice's existing (corrected) content:
//   1. _fatelands_misalignment_perception_law.json loads, is valid, declares the innate (First
//      Favored) vs. learned (human/Kwisheen) distinction, explicitly states Weave-Script is NOT
//      the mechanism, and carries the hard boundary (never certainty, never mind-reading).
//   2. public/app.js real wiring: buildFatelandsMisalignmentPerceptionDirective exists, gated on
//      the real _fatelandsFantasyWorldGate(), wired into exactly the same 3 literary + 1 CG call
//      sites as its sibling directive.
//   3. First Sacrifice's julian_strategic_logic_requirement.strategic_logic[0] — the one place in
//      the packet where a character's perception capability is already asserted — is corrected to
//      cite the innate alignment sense (not Weave-Script) and does not newly assign Julian any
//      sensitivity/training level beyond what was already established.
//   4. claim_categories.grounded_inference names the new valid named-ground values, scoped to
//      "only when already independently established" — never a blanket license.
//   5. This law declares (and this control confirms) it has NO mechanical validator check — it is
//      guidance/context only.
//
// No provider or image calls — pure data/structure/grep checks.
//
// usage: node _fatelands_misalignment_perception_law_control.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}

console.log('\n' + '='.repeat(92) + '\nFATELANDS MISALIGNMENT PERCEPTION LAW — CONSISTENCY CONTROL\n' + '='.repeat(92) + '\n');

const LAW = JSON.parse(fs.readFileSync(path.join(__dirname, '_fatelands_misalignment_perception_law.json'), 'utf8'));
const ORDINARY_LAW = JSON.parse(fs.readFileSync(path.join(__dirname, '_fatelands_ordinary_wish_misalignment_law.json'), 'utf8'));
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
const APP_JS = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');

// ── 1. Shared law shape ──
ok('shared law file loads and declares its law_id', LAW.law_id === 'fatelands_misalignment_perception');
ok('cross_reference_note ties this to pre-existing project memory canon (project_fatelands_alignment_sense), not invented fresh', /project_fatelands_alignment_sense/.test(LAW.cross_reference_note) && /already wired into STARTER_SEEDS/.test(LAW.cross_reference_note));
ok('statement.first_favored_innate_perception declares the innate capacity, explicitly NOT telepathy/certainty/universal lie detector', /innate capacity/.test(LAW.statement.first_favored_innate_perception) && /NOT telepathy/.test(LAW.statement.first_favored_innate_perception) && /can be mistaken/.test(LAW.statement.first_favored_innate_perception));
ok('statement.human_kwisheen_learned_perception declares the LEARNED path (tells, microexpressions, body language) and that its conclusion remains grounded_inference, not secret-truth access', /tells, microexpressions, body language/.test(LAW.statement.human_kwisheen_learned_perception) && /remains grounded_inference/.test(LAW.statement.human_kwisheen_learned_perception));
ok('statement.weave_script_is_not_this explicitly declares Weave-Script is a SEPARATE emotional tell, not the perception mechanism', /SEPARATE, unrelated bodily tell/.test(LAW.statement.weave_script_is_not_this) && /does NOT indicate misalignment/.test(LAW.statement.weave_script_is_not_this));
ok('hard_boundary declares this never licenses certainty or mind-reading', /Never certainty/.test(LAW.hard_boundary) && /never mind-reading/.test(LAW.hard_boundary));
ok('character_assignment_policy explicitly refuses to assign this to any specific character on its own — a story\'s own canon must already establish it', /does NOT itself assign sensitivity, training, or certainty to any specific character/.test(LAW.character_assignment_policy));
ok('provenance_integration declares the 2 distinct named-ground values (first_favored_alignment_sense, trained_misalignment_observation) and that they are never interchangeable', /first_favored_alignment_sense/.test(LAW.provenance_integration.valid_named_ground) && /trained_misalignment_observation/.test(LAW.provenance_integration.valid_named_ground) && /never interchangeable/.test(LAW.provenance_integration.distinction_preserved));
ok('scope explicitly excludes Famous Fate, same as the sibling law', LAW.scope.explicitly_excluded.some(s => /Famous Fate/i.test(s)));
ok('this law declares it has NO mechanical validator check — guidance/context only', /NO mechanical validator check/.test(LAW.implementation_status.mechanical_check_scope_boundary));

// ── 1b. Bidirectional sibling cross-reference ──
ok('the ordinary-wish-misalignment law cross-references this perception law as a sibling', ORDINARY_LAW.related_law && ORDINARY_LAW.related_law.law_id === LAW.law_id);

// ── 2. Real runtime wiring in public/app.js ──
ok('public/app.js declares buildFatelandsMisalignmentPerceptionDirective as a real function', /function buildFatelandsMisalignmentPerceptionDirective\s*\(\s*\)\s*\{/.test(APP_JS));
ok('the real function is gated on the real _fatelandsFantasyWorldGate()', /function buildFatelandsMisalignmentPerceptionDirective[\s\S]{0,80}if \(!_fatelandsFantasyWorldGate\(\)\) return ''/.test(APP_JS));
ok('the real function is exposed on window', /window\.buildFatelandsMisalignmentPerceptionDirective = buildFatelandsMisalignmentPerceptionDirective/.test(APP_JS));
const literaryCallSites = (APP_JS.match(/buildFatelandsOrdinaryWishMisalignmentDirective\(\) \+ buildFatelandsMisalignmentPerceptionDirective\(\)/g) || []).length;
ok('the real function is wired into EXACTLY the 3 real literary directive-stack call sites, immediately after its sibling directive', literaryCallSites === 3, 'found ' + literaryCallSites);
const cgCallSites = (APP_JS.match(/if \(typeof buildFatelandsMisalignmentPerceptionDirective === 'function'\) lines\.push\(buildFatelandsMisalignmentPerceptionDirective\(\)\)/g) || []).length;
ok('the real function is wired into EXACTLY 1 real CG author/screenplay call site', cgCallSites === 1, 'found ' + cgCallSites);
ok('the real rendered directive text does NOT assign this capability to any specific character (states it as a general rule)', /Do NOT assign this capability, its sensitivity, or its training level to any specific character/.test(APP_JS));

// ── 3. First Sacrifice's existing character-perception content is corrected, not newly invented ──
const jsl = PACKET.oas_sequence_v3.julian_strategic_logic_requirement;
ok('julian_strategic_logic_requirement.strategic_logic[0] no longer attributes Julian\'s perception to "the Weave-Script alignment sense" (the real, disclosed error)', !/Weave-Script alignment sense/.test(jsl.strategic_logic[0]));
ok('julian_strategic_logic_requirement.strategic_logic[0] now correctly cites his innate First Favored alignment sense, distinct from Weave-Script, and cites the new law file', /innate First Favored alignment sense/.test(jsl.strategic_logic[0]) && /NOT the Weave-Script/.test(jsl.strategic_logic[0]) && /_fatelands_misalignment_perception_law\.json/.test(jsl.strategic_logic[0]));
ok('the correction explicitly states this is a MECHANISM correction only — Julian\'s capability was already established canon, nothing new assigned to him', /Julian's capability itself was already established canon, nothing new is being assigned to him/.test(jsl.status));
ok('strategic_logic[0] still states his perception is an interpretation, not certainty — consistent with the law\'s hard_boundary', /still an interpretation, not certainty/.test(jsl.strategic_logic[0]));

// ── 4. claim_categories.grounded_inference names the new valid ground values, correctly scoped ──
const groundedInferenceDef = PACKET.claim_categories.grounded_inference;
ok('claim_categories.grounded_inference names both new named-ground values and cites the law file', /first_favored_alignment_sense/.test(groundedInferenceDef) && /trained_misalignment_observation/.test(groundedInferenceDef) && /_fatelands_misalignment_perception_law\.json/.test(groundedInferenceDef));
ok('claim_categories.grounded_inference explicitly scopes this to "ONLY for a character whose capability is already independently established" — never a blanket license', /ONLY for a character whose capability is already independently established/.test(groundedInferenceDef));

console.log('\n' + '='.repeat(92));
console.log('FATELANDS MISALIGNMENT PERCEPTION LAW — CONSISTENCY CONTROL: ' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); }
process.exitCode = fail ? 1 : 0;
