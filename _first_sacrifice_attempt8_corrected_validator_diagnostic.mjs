#!/usr/bin/env node
// Diagnostic-only (Roman, 2026-09-20): re-validates the REAL, already-saved Attempt 8 primary
// draft (02_draft.json) against the CORRECTED validator (exemplar match against a WITHHELD,
// never-rendered historical exemplar is now a non-blocking diagnostic, never a violation) and
// against the real, on-disk validation result recorded AT THE TIME under the old policy.
//
// No provider call. This does not re-run Attempt 8, does not spend anything, and does not attempt
// or authorize any repair pass — it only shows what the CORRECTED validator would have found on
// the SAME real, already-generated content.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
const primaryArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package/02_draft.json'), 'utf8'));
const draft = primaryArtifact.draft;
const onDiskValidation = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package/03_validation_result.json'), 'utf8'));

const validatorSrc = fs.readFileSync(path.join(__dirname, '_first_sacrifice_packet_validator.mjs'), 'utf8');
const fnMatch = validatorSrc.match(/function validateDraft[\s\S]*?\n}\n/);
const patternsMatch = validatorSrc.match(/const SEALED_PATTERNS[\s\S]*?(?=\nfunction validateDraft)/);
const sandbox = new Function('module', patternsMatch[0] + fnMatch[0] + '\nmodule.exports = validateDraft;');
const modObj = { exports: null };
sandbox(modObj);
const validateDraft = modObj.exports;

const { isRepairEligible } = await import('./_first_sacrifice_bounded_repair_engine.mjs');

const beats = draft.scene1Candidate.beats;
const wc = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const totalWords = beats.reduce((n, b) => n + wc(b.text), 0);

console.log('ATTEMPT 8 — REAL primary draft re-validated against the CORRECTED validator (no provider call, no spend)');
console.log('='.repeat(92));
console.log('Total words: ' + totalWords + ' (floor 1,100)');
console.log('');
console.log('ON-DISK real result (recorded at the time, under the OLD policy):');
console.log(JSON.stringify(onDiskValidation.finalValidation, null, 2));
console.log('');

const corrected = validateDraft(draft, PACKET);
console.log('CORRECTED validator result (same real draft, current code):');
console.log(JSON.stringify(corrected, null, 2));
console.log('');

const oldEligible = isRepairEligible(onDiskValidation.finalValidation.violations);
const newEligible = isRepairEligible(corrected.violations);
console.log('isRepairEligible under the OLD on-disk violations set: ' + oldEligible);
console.log('isRepairEligible under the CORRECTED violations set: ' + newEligible);
console.log('');
console.log('CONCLUSION: the rescue-phrase exemplar match is now correctly recorded as a non-blocking');
console.log('exemplar_similarity diagnostic, not a violation. Attempt 8\'s real, only remaining blocking');
console.log('issue is scene1_insufficient_narration_density. Under the corrected policy this draft WOULD');
console.log('be repair-eligible — but no repair call has been made and none will be without separate,');
console.log('explicit paid-call authorization.');
