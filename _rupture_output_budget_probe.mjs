// RUPTURE OUTPUT BUDGET PROBE — offline, no browser, no network, no provider call.
//
// The prompt-side diagnostic (_tempt_fate_rupture_prompt_density_diagnostic.mjs) establishes that
// the rupture path DISCARDS NOTHING from the author prompt. This probe asks the other half of the
// question: given a full prompt, where did the model's OUTPUT budget actually go, and is the terse
// result a property of the rupture path or run-to-run variance?
//
// Reads only retained paid-run artifacts. Nothing here is reconstructed or simulated.
//
// usage: node _rupture_output_budget_probe.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(__dirname, '_tempt_fate_fixtures');
const raw = fs.readFileSync(path.join(FIX, 'run_2026-09-24_02-11-02_scene_a', 'scene_a_raw_output.txt'), 'utf8');
const obj = JSON.parse(raw);

console.log('WHERE THE 2026-09-24 RESPONSE BUDGET WENT');
console.log('total raw output: ' + raw.length + ' chars\n');
Object.keys(obj)
  .map((k) => ({ key: k, chars: JSON.stringify(obj[k]).length }))
  .sort((a, b) => b.chars - a.chars)
  .forEach((r) => console.log('  ' + String(r.chars).padStart(6) + ' ch  ' + (100 * r.chars / raw.length).toFixed(1).padStart(5) + '%  ' + r.key));

const beats = Array.isArray(obj.beats) ? obj.beats : [];
const proseChars = beats.reduce((n, b) => n + String((b && b.text) || '').length, 0);
console.log('\nbeats: ' + beats.length);
console.log('  prose (beat.text only):      ' + proseChars + ' chars  (' + (100 * proseChars / raw.length).toFixed(1) + '% of the response)');
console.log('  beat metadata (non-text):    ' + (JSON.stringify(beats).length - proseChars) + ' chars');
console.log('  mean prose per beat:         ' + Math.round(proseChars / Math.max(beats.length, 1)) + ' chars');
const tfo = obj.temptFateOutcome ? JSON.stringify(obj.temptFateOutcome).length : 0;
console.log('\ntemptFateOutcome (analysis the ordinary continuation never writes): ' + tfo + ' chars');
console.log('  ratio, analysis : prose  =  ' + (tfo / Math.max(proseChars, 1)).toFixed(2) + ' : 1');
console.log('  → the outcome report is NOT the dominant consumer; per-beat metadata is.');

// ── CROSS-RUN: is 44 chars/beat a RUPTURE property, or run-to-run variance? ───────────────────
console.log('\n' + '='.repeat(74));
console.log('CROSS-RUN — every retained paid run. Both are RUPTURE runs of the same scene/wish.');
console.log('The 2026-09-23 run PREDATES the event-frame precedence fix; 2026-09-24 follows it.');
const runs = [
  { label: '2026-09-23 (pre-fix)', file: path.join(FIX, 'run_2026_09_23_scene_a_no_commit', 'scene_a_raw_output.txt') },
  { label: '2026-09-24 (post-fix)', file: path.join(FIX, 'run_2026-09-24_02-11-02_scene_a', 'scene_a_raw_output.txt') }
];
runs.forEach((r) => {
  let o;
  try { o = JSON.parse(fs.readFileSync(r.file, 'utf8')); }
  catch (e) { console.log('  ' + r.label + ': unreadable (' + e.message.slice(0, 60) + ')'); return; }
  const bts = Array.isArray(o.beats) ? o.beats : [];
  const pc = bts.reduce((n, b) => n + String((b && b.text) || '').length, 0);
  console.log('  ' + r.label.padEnd(24) + ' rupture=' + (o.temptFateOutcome ? 'yes' : 'no ')
    + '  beats=' + String(bts.length).padStart(3)
    + '  prose=' + String(pc).padStart(5) + ' ch'
    + '  mean=' + String(Math.round(pc / Math.max(bts.length, 1))).padStart(4) + ' ch/beat');
});
console.log('\n  The prompt asked for 30-38 beats in BOTH runs. Pre-fix delivered 38; post-fix 18.');
console.log('  n=1 per side — this is a lead, not a proven cause.');
