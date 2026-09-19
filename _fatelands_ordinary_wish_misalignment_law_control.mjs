#!/usr/bin/env node
// FATELANDS ORDINARY WISH MISALIGNMENT LAW — shared-canon consistency control (Roman, 2026-09-20)
//
// Proves the shared law is REAL canon actually wired into the runtime and the First Sacrifice
// packet — not a standalone file nobody checks against:
//   1. _fatelands_ordinary_wish_misalignment_law.json loads, is valid, declares the effect
//      classification (valid/invalid shapes), and is explicitly distinct from The Fold/The
//      Staircase (major world-scale phenomena, never governed by this law).
//   2. public/app.js real wiring: buildFatelandsOrdinaryWishMisalignmentDirective exists, is gated
//      on the real _fatelandsFantasyWorldGate(), and is wired into exactly the same 3 literary
//      directive-stack call sites + 1 CG call site as buildFatelandsManifestationLawDirective (no
//      more, no fewer — a real grep count, not an assumption).
//   3. _first_sacrifice_source_packet.json's wish_twist_and_arrest_requirement.governing_law cites
//      this law correctly, and the shared law's own consumers registry lists it back
//      (bidirectional, checkable from either file).
//   4. Real invocation: the packet validator's new wish_twist_wrong_visual_grammar rule actually
//      fires on attack-grammar text and stays silent on the quiet-misalignment shape — reusing the
//      same real-extraction technique other law-consistency controls in this session use.
//
// No provider or image calls — pure data/structure/grep checks.
//
// usage: node _fatelands_ordinary_wish_misalignment_law_control.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let pass = 0, fail = 0; const fails = [];
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ✓ ' + label); }
  else { fail++; fails.push(label + (detail ? ' — ' + detail : '')); console.log('  ✗ ' + label + (detail ? ' — ' + detail : '')); }
}

console.log('\n' + '='.repeat(92) + '\nFATELANDS ORDINARY WISH MISALIGNMENT LAW — CONSISTENCY CONTROL\n' + '='.repeat(92) + '\n');

const LAW = JSON.parse(fs.readFileSync(path.join(__dirname, '_fatelands_ordinary_wish_misalignment_law.json'), 'utf8'));
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
const APP_JS = fs.readFileSync(path.join(__dirname, 'public/app.js'), 'utf8');

// ── 1. Shared law shape ──
ok('shared law file loads and declares its law_id', LAW.law_id === 'fatelands_ordinary_wish_misalignment');
ok('scope.applies_to names ORDINARY wish misalignment in Fatelands Fantasy', /Fatelands Fantasy/.test(LAW.scope.applies_to) && /ORDINARY/.test(LAW.scope.applies_to));
ok('scope explicitly distinguishes this law from The Fold/The Staircase (major world-scale phenomena)', /The Fold/.test(LAW.scope.explicitly_distinct_from) && /The Staircase/.test(LAW.scope.explicitly_distinct_from));
ok('scope declares a gate_contract pointing at the REAL runtime gate (_fatelandsFantasyWorldGate)', /_fatelandsFantasyWorldGate/.test(LAW.scope.gate_contract));
ok('scope explicitly excludes Famous Fate', LAW.scope.explicitly_excluded.some(s => /famous_fate|Famous Fate/i.test(s)));
ok('statement declares the core rule: subjective experience, not a visible external attack', /does not manifest as a visible external attack/.test(LAW.statement) && /SUBJECTIVE experience/.test(LAW.statement));

// ── 2. Structured effect classification ──
const validIds = LAW.effect_classification.valid_for_ordinary_wish_misalignment.map(e => e.id);
const invalidIds = LAW.effect_classification.invalid_for_ordinary_wish_misalignment.map(e => e.id);
ok('effect_classification declares exactly the 4 valid shapes Roman specified', JSON.stringify(validIds.sort()) === JSON.stringify(['ambiguous_displacement', 'quiet_pull', 'unexplained_arrest', 'unsettling_recognition'].sort()));
ok('effect_classification declares exactly the 4 invalid shapes Roman specified', JSON.stringify(invalidIds.sort()) === JSON.stringify(['damage_residue', 'explosive_manifestation', 'projectile_attack', 'visible_rift'].sort()));
ok('effect_classification.boundary_note reiterates this governs ORDINARY misalignment only, never The Fold/The Staircase', /ORDINARY wish misalignment only/.test(LAW.effect_classification.boundary_note));
ok('implementation_status names public/app.js buildFatelandsOrdinaryWishMisalignmentDirective as the real runtime source of truth', /buildFatelandsOrdinaryWishMisalignmentDirective/.test(LAW.implementation_status.real_runtime_source_of_truth));
ok('implementation_status discloses this law needs no per-story state, unlike the manifestation ledger (renders unconditionally under the world gate)', /needs no per-story registered state/.test(LAW.implementation_status.eligibility_vs_consumption));
ok('consumers registry lists both the dry authoring packet and the real runtime mechanism', LAW.consumers.some(c => c.kind === 'dry_authoring_packet') && LAW.consumers.some(c => c.kind === 'real_runtime_mechanism'));

// ── 2b. Real runtime wiring in public/app.js — real grep counts, not assumption ──
ok('public/app.js declares buildFatelandsOrdinaryWishMisalignmentDirective as a real function', /function buildFatelandsOrdinaryWishMisalignmentDirective\s*\(\s*\)\s*\{/.test(APP_JS));
ok('the real function is gated on the real _fatelandsFantasyWorldGate() (same gate every other Fatelands-conditional directive uses)', /function buildFatelandsOrdinaryWishMisalignmentDirective[\s\S]{0,80}if \(!_fatelandsFantasyWorldGate\(\)\) return ''/.test(APP_JS));
ok('the real function is exposed on window (same convention as every other build*Directive in this file)', /window\.buildFatelandsOrdinaryWishMisalignmentDirective = buildFatelandsOrdinaryWishMisalignmentDirective/.test(APP_JS));
const literaryCallSites = (APP_JS.match(/buildFatelandsManifestationLawDirective\(\) \+ buildFatelandsOrdinaryWishMisalignmentDirective\(\)/g) || []).length;
ok('the real function is wired into EXACTLY the 3 real literary _fatelandsCognitiveMemoryBlock directive-stack call sites (same count as buildFatelandsManifestationLawDirective, no more no fewer)', literaryCallSites === 3, 'found ' + literaryCallSites);
const cgCallSites = (APP_JS.match(/if \(typeof buildFatelandsOrdinaryWishMisalignmentDirective === 'function'\) lines\.push\(buildFatelandsOrdinaryWishMisalignmentDirective\(\)\)/g) || []).length;
ok('the real function is wired into EXACTLY 1 real CG author/screenplay call site', cgCallSites === 1, 'found ' + cgCallSites);

// ── 3. First Sacrifice packet cites the shared law correctly ──
const gov = PACKET.wish_twist_and_arrest_requirement.governing_law;
ok('wish_twist_and_arrest_requirement.governing_law references the correct shared law file', gov && gov.file === '_fatelands_ordinary_wish_misalignment_law.json');
ok('governing_law references the correct law_id', gov && gov.law_id === LAW.law_id);
ok('governing_law states the world_scope_check', gov && /never applies outside Fatelands Fantasy/.test(gov.world_scope_check));
ok('the packet declares world_scope "fatelands_fantasy" (this law never applies outside it)', PACKET.world_scope === 'fatelands_fantasy');

// ── 4. Bidirectional reference — the shared law's own consumers registry cites the packet back ──
const consumerEntry = LAW.consumers.find(c => c.packet === '_first_sacrifice_source_packet.json');
ok('the shared law\'s consumers registry lists First Sacrifice, keeping the citation checkable from either file', !!consumerEntry && consumerEntry.record === 'wish_twist_and_arrest_requirement.governing_law');

// ── 5. Real invocation: the packet validator's new rule actually fires / stays silent correctly ──
const validatorSrc = fs.readFileSync(path.join(__dirname, '_first_sacrifice_packet_validator.mjs'), 'utf8');
const fnMatch = validatorSrc.match(/function validateDraft[\s\S]*?\n}\n/);
const patternsMatch = validatorSrc.match(/const SEALED_PATTERNS[\s\S]*?(?=\nfunction validateDraft)/);
const sandbox = new Function('module', patternsMatch[0] + fnMatch[0] + '\nmodule.exports = validateDraft;');
const modObj = { exports: null };
sandbox(modObj);
const validateDraft = modObj.exports;

const beats = [];
for (let n = 1; n <= 20; n++) {
  const img = n <= 2 ? 'intro_lirael' : n <= 4 ? 'intro_seren' : n <= 6 ? 'intro_dohkar' : n <= 8 ? 'intro_julian' : n <= 10 ? 'd1' : n <= 14 ? 'd2' : n <= 17 ? 'd3' : 'd4';
  const kind = (n === 5 || n === 11 || n === 15 || n === 18) ? 'dialogue' : 'narration';
  const words = kind === 'dialogue' ? 35 : 70;
  beats.push({ kind, speaker: kind === 'dialogue' ? 'Julian' : null, image: img, text: Array.from({ length: words }, (_, i) => 'plainword' + i).join(' '), provenance: { kind: 'generated_expression' } });
}
const coverage = { wish_visibly_twists: [12], twist_unnaturally_arrested: [13], public_charge: [14] };

const attackDraft = { scene1Candidate: { beats: beats.map((b, i) => i === 12 ? { ...b, text: 'A dark seam tore open and a projectile of light struck straight toward her chest.' } : b) }, scene1Coverage: coverage, first_person_lirael: true };
const resultAttack = validateDraft(attackDraft, PACKET);
const hitAttack = resultAttack.violations.filter(v => v.rule === 'wish_twist_wrong_visual_grammar');
ok('REAL INVOCATION: the validator genuinely rejects a wish_visibly_twists beat with attack-grammar vocabulary', hitAttack.length >= 1, JSON.stringify(hitAttack));

const quietDraft = { scene1Candidate: { beats: beats.map((b, i) => i === 12 ? { ...b, text: 'A quiet, terrible pull began somewhere beneath my ribs, drawing toward a fulfillment I could not name and did not want.' } : b) }, scene1Coverage: coverage, first_person_lirael: true };
const resultQuiet = validateDraft(quietDraft, PACKET);
const hitQuiet = resultQuiet.violations.filter(v => v.rule === 'wish_twist_wrong_visual_grammar');
ok('REAL INVOCATION: the validator does NOT flag the quiet-misalignment shape (subjective pull, no attack vocabulary)', hitQuiet.length === 0, JSON.stringify(hitQuiet));

console.log('\n' + '='.repeat(92));
console.log('FATELANDS ORDINARY WISH MISALIGNMENT LAW — CONSISTENCY CONTROL: ' + pass + ' passed, ' + fail + ' failed');
if (fail) { console.log('\nFAILURES:'); fails.forEach(f => console.log('  - ' + f)); }
process.exitCode = fail ? 1 : 0;
