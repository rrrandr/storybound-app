#!/usr/bin/env node
// FIRST SACRIFICE — Attempt 8, CORRECTED CANDIDATE from the post-pass-1 state (Roman, 2026-09-20).
//
// The second (shrink-to-midpoint) repair pass is now judged a real regression: it rewrote 8
// genuinely long narration beats — including beat 10, which carried unique, causally load-bearing
// content (Seren's wish beginning to curve/misalign toward Lirael) — down to fit a 90-word ceiling
// that should never have been a hard upper bound. That ceiling is now a non-blocking pacing
// diagnostic only (_first_sacrifice_packet_validator.mjs), and shrink-to-midpoint repair has been
// removed entirely from the engine (_first_sacrifice_bounded_repair_engine.mjs).
//
// This script does NOT re-run any provider call and does NOT patch any prose by hand. It derives a
// new candidate purely from real, already-saved data: the REAL post-pass-1 state
// (07_final_draft_after_pass1.json — pass 1 never touched beats 1,2,3,6,7,8,10,13, so this is
// exactly Grok's own original text for all of them, including beat 10's wish-curving content),
// re-validated under the CORRECTED validator. All historical artifacts (02_draft.json,
// 05/06/07_*_pass1_*, 05/06/07_*_pass2_* from the now-reversed second pass) are left untouched —
// this writes a NEW, separate, untracked file only.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package');
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));

const pass1Artifact = JSON.parse(fs.readFileSync(path.join(OUT_DIR, '07_final_draft_after_pass1.json'), 'utf8'));
const draft = pass1Artifact.draft;

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

const beat10 = draft.scene1Candidate.beats[9];
const beat10Words = beat10.text.trim().split(/\s+/).filter(Boolean).length;
const beat10HasWishCurve = beat10.text.includes('The sentence she was meant to finish curved instead toward me');

console.log('Corrected candidate derived from the real post-pass-1 state (no provider call, no manual prose edits).');
console.log('Beat 10: ' + beat10Words + ' words, contains wish-curving content: ' + beat10HasWishCurve);
console.log('\nValidation under the CORRECTED (post-reversal) validator:');
console.log(JSON.stringify(validation, null, 2));

const candidateArtifact = {
  packet_id: PACKET.packet_id,
  packet_version: PACKET.version,
  draft_version: 'draft-v7-full-package-corrected-candidate-from-pass1',
  derived_from: '07_final_draft_after_pass1.json (real, unchanged post-pass-1 state — pass 1 never touched beats 1,2,3,6,7,8,10,13)',
  correction_note: 'The second (shrink-to-midpoint) repair pass previously applied to this attempt is now judged a real regression (it discarded beat 10\'s wish-curving content) and has been reversed. This candidate is the post-pass-1 state re-validated under the corrected policy: a beat over 90 words is a non-blocking pacing diagnostic only, never a violation, never a repair target. No prose was manually edited to produce this file.',
  generated_at: new Date().toISOString(),
  validation,
  draft,
};
const outPath = path.join(OUT_DIR, '08_corrected_candidate_from_pass1.json');
fs.writeFileSync(outPath, JSON.stringify(candidateArtifact, null, 2));
console.log('\nWritten to: ' + outPath);
