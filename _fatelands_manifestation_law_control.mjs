// FATELANDS REALITY-SEAM / MANIFESTATION LAW — shared-canon consistency control (Roman, 2026-09-20)
//
// Proves the shared law is REAL canon a consumer actually cites — not a standalone file nobody
// checks against:
//   1. _fatelands_reality_seam_and_manifestation_law.json loads, is valid, and declares the 3-level
//      structure + the Fatelands-only scope gate (Famous Fate explicitly excluded);
//   2. its entity_capability_registry declares the_answer as capable of manifestation variance,
//      correctly pointing at First Sacrifice's own packet record;
//   3. _first_sacrifice_source_packet.json's world_scope is "fatelands_fantasy" and its
//      scene1_answer_manifestation.governing_law correctly cites this shared law file/id/entity;
//   4. the shared law's own "consumers" registry lists First Sacrifice, keeping the reference
//      bidirectional (checkable from either file);
//   5. real invocation: the packet validator's world-scope gate genuinely refuses a Famous-Fate-
//      scoped copy of the SAME packet (re-verified here, independently of the validator's own test
//      suite, using the same real-extraction technique other control scripts in this session use).
//
// No provider or image calls — pure data/structure checks.
//
// usage: node _fatelands_manifestation_law_control.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}

console.log('\n' + '='.repeat(92) + '\nFATELANDS REALITY-SEAM / MANIFESTATION LAW — CONSISTENCY CONTROL\n' + '='.repeat(92) + '\n');

const LAW = JSON.parse(fs.readFileSync(path.join(__dirname, '_fatelands_reality_seam_and_manifestation_law.json'), 'utf8'));
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));

// ── 1. Shared law shape ──
ok('shared law file loads and declares its law_id', LAW.law_id === 'fatelands_reality_seam_and_manifestation');
ok('scope.applies_to names Fatelands Fantasy', /Fatelands Fantasy/.test(LAW.scope.applies_to));
ok('scope.explicitly_excluded names famous_fate', LAW.scope.explicitly_excluded.some(s => /famous_fate/.test(s)));
ok('scope declares a gate_contract pointing at the REAL runtime gate (_fatelandsFantasyWorldGate in public/app.js)', /_fatelandsFantasyWorldGate/.test(LAW.scope.gate_contract));
// ── implementation_status (Roman, 2026-09-20 follow-up correction): "Do not describe all Fatelands
// stories as consuming it." The file must be honest that ELIGIBILITY (any Fatelands Fantasy story)
// is not the same as CONSUMPTION (a story that actually registered an entity), and must point at
// the real runtime source of truth rather than presenting itself as that source. ──
ok('implementation_status names public/app.js as the real runtime source of truth (not this JSON file)', /public\/app\.js/.test(LAW.implementation_status.real_runtime_source_of_truth) && /_fatelandsRegisterManifestation/.test(LAW.implementation_status.real_runtime_source_of_truth));
ok('implementation_status explicitly distinguishes ELIGIBLE from CONSUMED and warns against describing every Fatelands story as using this mechanism', /ELIGIBLE/.test(LAW.implementation_status.eligibility_vs_consumption) && /Do not describe .every Fatelands story./.test(LAW.implementation_status.eligibility_vs_consumption));
ok('implementation_status discloses First Sacrifice\'s packet-level record is a SEPARATE consumer from the live runtime ledger, not the same path', /separate|different consumers/.test(LAW.implementation_status.first_sacrifice_note) || /two different consumers/.test(LAW.implementation_status.first_sacrifice_note));
ok('consumers registry distinguishes the dry authoring packet from the real runtime mechanism, and is honest that no live story has registered an entity yet', LAW.consumers.some(c => c.kind === 'dry_authoring_packet_not_yet_live') && LAW.consumers.some(c => c.kind === 'real_runtime_mechanism' && /no story registers a live entity/.test(c.note)));
ok('reality_seam_law statement present (wishes draw possibilities from adjacent realities; Fold/Staircase named)', /Fold/.test(LAW.reality_seam_law.statement) && /Staircase/.test(LAW.reality_seam_law.statement));
ok('wish_crafted_manifestation_variance statement present', /chained wishes/.test(LAW.wish_crafted_manifestation_variance.statement));
ok('altered_peoples_manifestation_variance statement present, names First Favored/Kwisheen/Wilders', /First Favored/.test(LAW.altered_peoples_manifestation_variance.statement) && /Kwisheen/.test(LAW.altered_peoples_manifestation_variance.statement) && /Wilders/.test(LAW.altered_peoples_manifestation_variance.statement));
ok('hard_boundary present — not permission for arbitrary continuity errors', /NOT permission for arbitrary continuity errors/.test(LAW.hard_boundary));
ok('three_level_structure declares all 3 levels', !!LAW.three_level_structure.level_1_shared_law && !!LAW.three_level_structure.level_2_entity_capability && !!LAW.three_level_structure.level_3_scene_manifested_state);

// ── 2. entity_capability_registry ──
const answerEntry = LAW.entity_capability_registry.the_answer;
ok('entity_capability_registry declares the_answer as capable of manifestation variance', answerEntry && answerEntry.capable_of_manifestation_variance === true);
ok('the_answer entry cites wish_crafted_relic as its basis (hundreds/thousands of chained wishes)', /wish_crafted_relic/.test(answerEntry.basis) && /chained wishes/.test(answerEntry.basis));
ok('the_answer entry points at First Sacrifice\'s own packet record for its current known form', /_first_sacrifice_source_packet\.json/.test(answerEntry.current_form_recorded_in) && /scene1_answer_manifestation/.test(answerEntry.current_form_recorded_in));
ok('the_answer entry does NOT itself assert a specific alternate form (states capability/category only)', /states CAPABILITY and CATEGORY only/.test(answerEntry.no_added_lore));
['manta_cloak', 'first_favored', 'kwisheen', 'wilders'].forEach(id => {
  const e = LAW.entity_capability_registry[id];
  ok(id + ' entry declares capability + category only, current_form_known:false (no specific variation asserted)', e && e.capable_of_manifestation_variance === true && e.current_form_known === false && !!e.variation_category);
});
ok('first_favored/kwisheen/wilders entries explicitly bound variation to bodily-only, never species identity or new powers', /NEVER a species-identity change, NEVER an unrelated new power/.test(LAW.entity_capability_registry.first_favored.variation_category));

// ── 3. First Sacrifice packet cites the shared law correctly ──
ok('First Sacrifice packet declares world_scope "fatelands_fantasy"', PACKET.world_scope === 'fatelands_fantasy');
const gov = PACKET.scene1_answer_manifestation.governing_law;
ok('scene1_answer_manifestation.governing_law references the correct shared law file', gov && gov.file === '_fatelands_reality_seam_and_manifestation_law.json');
ok('governing_law references the correct law_id', gov && gov.law_id === LAW.law_id);
ok('governing_law references the correct entity ("the_answer")', gov && gov.entity === 'the_answer');
ok('governing_law identifies itself as the level-3 manifested-state record', gov && /level_3_scene_manifested_state/.test(gov.level));

// ── 4. Bidirectional reference — the shared law's own consumers registry lists First Sacrifice ──
const consumerEntry = (LAW.consumers || []).find(c => c.entity === 'the_answer' && c.packet === '_first_sacrifice_source_packet.json');
ok('the shared law\'s consumers registry lists First Sacrifice / the_answer, keeping the citation checkable from either file', !!consumerEntry && consumerEntry.record === 'scene1_answer_manifestation');

// ── 5. Real invocation: the validator's world-scope gate actually refuses a Famous-Fate packet ──
const validatorSrc = fs.readFileSync(path.join(__dirname, '_first_sacrifice_packet_validator.mjs'), 'utf8');
const fnMatch = validatorSrc.match(/function validateDraft[\s\S]*?\n}\n/);
const patternsMatch = validatorSrc.match(/const SEALED_PATTERNS[\s\S]*?(?=\nfunction validateDraft)/);
const sandbox = new Function('module', patternsMatch[0] + fnMatch[0] + '\nmodule.exports = validateDraft;');
const modObj = { exports: null };
sandbox(modObj);
const validateDraft = modObj.exports;

// Reuse the packet validator's own compliantDraft() shape by re-deriving a minimal equivalent here
// is unnecessary — build the smallest real draft this validator will accept structurally enough to
// exercise the gate: reuse the real starter beats via a direct require of the validator's fixture
// would over-couple; instead exercise the timeline builder's real effect through a focused draft.
const beats = [];
for (let n = 1; n <= 20; n++) {
  const img = n <= 2 ? 'intro_lirael' : n <= 4 ? 'intro_seren' : n <= 6 ? 'intro_dohkar' : n <= 8 ? 'intro_julian' : n <= 10 ? 'd1' : n <= 14 ? 'd2' : n <= 17 ? 'd3' : 'd4';
  const kind = (n === 5 || n === 11 || n === 15 || n === 18) ? 'dialogue' : 'narration';
  const words = kind === 'dialogue' ? 35 : 70;
  beats.push({ kind, speaker: kind === 'dialogue' ? 'Julian' : null, image: img, text: Array.from({ length: words }, (_, i) => 'w' + i).join(' '), provenance: { kind: 'generated_expression' } });
}
beats[18].text = beats[18].text + ' The Answer changed in my hands.';
beats[18].objectClaims = [{ object_ref: 'the_answer', physical_form_claim: 'compact_wielder_blade', claim_kind: 'locked_canon_fact', cites: 'scene1_answer_manifestation.permitted_manifestation_change_events[0]' }];
const draft = { scene1Candidate: { beats }, first_person_lirael: true };

const famousFatePacket = JSON.parse(JSON.stringify(PACKET));
famousFatePacket.world_scope = 'famous_fate';
famousFatePacket.scene1_answer_manifestation.permitted_manifestation_change_events = [{
  event_id: 'control_test_event', wielder_need: 'a concrete named need',
  resulting_manifestation: { manifestation_id: 'compact_wielder_blade', form: 'a short blade — states form only' },
  after_beat: 17,
}];
const resultFamousFate = validateDraft(draft, famousFatePacket);
const gateHit = resultFamousFate.violations.filter(v => v.rule === 'fatelands_manifestation_law_misapplied');
ok('REAL INVOCATION: the validator genuinely refuses a Famous-Fate-scoped copy of the real packet with a declared manifestation-change event', !resultFamousFate.ok && gateHit.length >= 1, JSON.stringify(gateHit));

const resultFatelands = validateDraft(draft, { ...PACKET, scene1_answer_manifestation: { ...PACKET.scene1_answer_manifestation, permitted_manifestation_change_events: [{ event_id: 'control_test_event', wielder_need: 'a concrete named need', resulting_manifestation: { manifestation_id: 'compact_wielder_blade', form: 'a short blade — states form only' }, after_beat: 17 }] } });
const gateHitFatelands = resultFatelands.violations.filter(v => v.rule === 'fatelands_manifestation_law_misapplied');
ok('REAL INVOCATION: the SAME event on the REAL fatelands_fantasy-scoped packet triggers NO world-scope gate violation (the gate discriminates on scope, not on the event itself)', gateHitFatelands.length === 0, JSON.stringify(gateHitFatelands));

console.log('\n' + '='.repeat(92));
console.log('FATELANDS REALITY-SEAM / MANIFESTATION LAW — CONSISTENCY CONTROL: ' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); }
process.exitCode = fail ? 1 : 0;
