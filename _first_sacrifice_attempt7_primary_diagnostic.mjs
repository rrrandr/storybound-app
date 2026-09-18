#!/usr/bin/env node
// Diagnostic-only: what did the REAL Attempt 7 primary draft (pre-repair) look like on its own,
// before the bounded repair pass merged in? Re-runs the REAL validator against 02_draft.json
// (the primary-only artifact) so Roman can see the before/after split. No provider call.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
const primaryArtifact = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_draft_v7_attempt7_full_package/02_draft.json'), 'utf8'));
const draft = primaryArtifact.draft;

const validatorSrc = fs.readFileSync(path.join(__dirname, '_first_sacrifice_packet_validator.mjs'), 'utf8');
const fnMatch = validatorSrc.match(/function validateDraft[\s\S]*?\n}\n/);
const patternsMatch = validatorSrc.match(/const SEALED_PATTERNS[\s\S]*?(?=\nfunction validateDraft)/);
const sandbox = new Function('module', patternsMatch[0] + fnMatch[0] + '\nmodule.exports = validateDraft;');
const modObj = { exports: null };
sandbox(modObj);
const validateDraft = modObj.exports;

const beats = draft.scene1Candidate.beats;
const wc = (t) => t.trim().split(/\s+/).filter(Boolean).length;
const totalWords = beats.reduce((n, b) => n + wc(b.text), 0);
console.log('PRIMARY-ONLY (pre-repair) total words: ' + totalWords + ' (floor 1,100)');

const primaryValidation = validateDraft(draft, PACKET);
console.log('PRIMARY-ONLY (pre-repair) validation:');
console.log(JSON.stringify(primaryValidation, null, 2));
