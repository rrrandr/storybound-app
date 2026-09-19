#!/usr/bin/env node
// FIRST SACRIFICE — Attempt 8, NAMING/DATA CORRECTION (Roman, 2026-09-20).
//
// The PDF read-through exposed a real reader-visible bug: scene1Candidate.beats[4]/[14].speaker
// literally contains "the_presiding_Dohkar" — the packet's OLD internal cast_roles key — instead of
// a real display name. Root cause traced and fixed in the packet (_first_sacrifice_source_packet.json:
// locked_world_facts.cast_roles is now keyed "Dhokar Raes", not "the_presiding_Dohkar") and in the
// validator (_first_sacrifice_packet_validator.mjs: new speaker_reader_visible_internal_key /
// speaker_unresolved_cast_reference rules).
//
// This script does NOT run any provider call and does NOT hand-edit any prose. It is a MECHANICAL,
// deterministic field rename on a deep clone of the real, current candidate
// (13_final_field_correction.json) — the two literal speaker values are renamed to the canonized
// real display name "Dhokar Raes", nothing else changes — then re-validated under the corrected
// validator. 13_final_field_correction.json (and every earlier artifact) is left untouched; this
// writes a NEW, separate, untracked file only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package');
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));

const SOURCE_PATH = path.join(OUT_DIR, '13_final_field_correction.json');
if (!fs.existsSync(SOURCE_PATH)) throw new Error('13_final_field_correction.json not found — this script only corrects FROM that real, current candidate.');
const sourceArtifact = JSON.parse(fs.readFileSync(SOURCE_PATH, 'utf8'));

const OUT_PATH = path.join(OUT_DIR, '16_naming_corrected_candidate.json');
if (fs.existsSync(OUT_PATH)) throw new Error('Refusing to overwrite an existing artifact: ' + OUT_PATH + ' — every generated artifact is preserved untouched.');

const draft = JSON.parse(JSON.stringify(sourceArtifact.draft)); // deep clone — never mutate the source
const beat5 = draft.scene1Candidate.beats[4];
const beat15 = draft.scene1Candidate.beats[14];
const before = { beat5Speaker: beat5.speaker, beat15Speaker: beat15.speaker };
if (beat5.speaker !== 'the_presiding_Dohkar' || beat15.speaker !== 'the_presiding_Dohkar') {
  console.warn('WARNING: expected both beats[4]/[14].speaker to be "the_presiding_Dohkar" before correction — found: ' + JSON.stringify(before) + '. Renaming whichever fields actually carry it; nothing else is touched.');
}
if (beat5.speaker === 'the_presiding_Dohkar') beat5.speaker = 'Dhokar Raes';
if (beat15.speaker === 'the_presiding_Dohkar') beat15.speaker = 'Dhokar Raes';

const validatorSrc = fs.readFileSync(path.join(__dirname, '_first_sacrifice_packet_validator.mjs'), 'utf8');
const fnMatch = validatorSrc.match(/function validateDraft[\s\S]*?\n}\n/);
const patternsMatch = validatorSrc.match(/const SEALED_PATTERNS[\s\S]*?(?=\nfunction validateDraft)/);
const sandbox = new Function('module', patternsMatch[0] + fnMatch[0] + '\nmodule.exports = validateDraft;');
const modObj = { exports: null };
sandbox(modObj);
const validateDraft = modObj.exports;

let validation;
try { validation = validateDraft(draft, PACKET); }
catch (e) { validation = { ok: false, violations: [{ rule: 'validator_threw', detail: String(e.message || e) }] }; }

console.log('Naming correction derived from the real 13_final_field_correction.json candidate (no provider call, no manual prose edits — a mechanical field rename only).');
console.log('Before: ' + JSON.stringify(before));
console.log('After:  ' + JSON.stringify({ beat5Speaker: beat5.speaker, beat15Speaker: beat15.speaker }));
console.log('\nValidation under the corrected (naming-aware) validator:');
console.log('ok: ' + validation.ok);
console.log('violations: ' + JSON.stringify(validation.violations, null, 2));

const correctedArtifact = {
  packet_id: PACKET.packet_id,
  packet_version: PACKET.version,
  draft_version: 'draft-v7-full-package-naming-corrected',
  derived_from: '13_final_field_correction.json + mechanical naming correction (beats[4]/[14].speaker: "the_presiding_Dohkar" -> "Dhokar Raes") — NOT a provider call, a deterministic field rename only',
  corrected_fields: ['scene1Candidate.beats[4].speaker', 'scene1Candidate.beats[14].speaker'],
  generated_at: new Date().toISOString(),
  validation,
  draft,
};
fs.writeFileSync(OUT_PATH, JSON.stringify(correctedArtifact, null, 2));
console.log('\nWritten to: ' + OUT_PATH);
console.log('NOT written to starter-scenes.js or shipped anywhere.');
