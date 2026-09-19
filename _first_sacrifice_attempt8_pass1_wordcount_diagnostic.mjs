#!/usr/bin/env node
// Diagnostic-only: per-beat word counts for the Attempt 8 pass-1-merged draft, to confirm whether
// the remaining scene1_insufficient_narration_density failure is caused by beats EXCEEDING the
// 90-word ceiling (which measureBeatDeficiencies cannot detect — it only flags beats BELOW their
// own floor) rather than beats still being too short. No provider call.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PACKET = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_source_packet.json'), 'utf8'));
const bnt = PACKET.scene1_beat_number_template;
const draft = JSON.parse(fs.readFileSync(path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package/07_final_draft_after_pass1.json'), 'utf8')).draft;
const wc = (t) => t.trim().split(/\s+/).filter(Boolean).length;

let qualifying = 0, narrationCount = 0;
draft.scene1Candidate.beats.forEach((b, i) => {
  const slot = bnt.slots[i];
  const n = wc(b.text);
  const isNarration = b.kind === 'narration' || b.kind === 'exposition';
  if (isNarration) narrationCount++;
  const qualifies = isNarration && n >= 60 && n <= 90;
  if (qualifies) qualifying++;
  const belowOwnFloor = n < slot.wordRange[0];
  const aboveCeiling = n > 90;
  console.log('slot ' + slot.n + '\t' + b.kind + '\t' + n + 'w\t ownFloor=' + slot.wordRange[0] + ' ownCeil=' + slot.wordRange[1] +
    (qualifies ? '\tQUALIFIES(60-90)' : (isNarration ? '\tNO' : '')) +
    (belowOwnFloor ? '  [BELOW OWN FLOOR]' : '') +
    (isNarration && aboveCeiling ? '  [OVER 90 — density-disqualifying, NOT detected by measureBeatDeficiencies]' : ''));
});
console.log('\nnarration-eligible beats: ' + narrationCount + ' | qualifying (60-90): ' + qualifying + ' | need 12');

// Roman, 2026-09-20: the engine now also detects over-ceiling narration beats (dry check against
// the same real fixture, confirming the live measureBeatDeficiencies output before any repair call).
const { measureBeatDeficiencies } = await import('./_first_sacrifice_bounded_repair_engine.mjs');
const def = measureBeatDeficiencies(draft.scene1Candidate, PACKET);
console.log('\nmeasureBeatDeficiencies (extended engine) on this real fixture:');
console.log('structurallyRepairable: ' + def.structurallyRepairable);
console.log('deficiencies: ' + JSON.stringify(def.deficiencies.map(d => ({ n: d.n, direction: d.direction, actualWords: d.actualWords, targetWords: d.targetWords })), null, 2));
