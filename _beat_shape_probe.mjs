import fs from 'node:fs';
const p = '/Users/romantsukerman/storybound-app/_tempt_fate_fixtures/run_2026-09-24_02-11-02_scene_a/scene_a_raw_output.txt';
const plan = JSON.parse(fs.readFileSync(p, 'utf8'));
console.log('top-level keys:', Object.keys(plan).join(', '));
console.log('beats:', (plan.beats || []).length);
const keys = new Set();
(plan.beats || []).forEach((b) => Object.keys(b || {}).forEach((k) => keys.add(k)));
console.log('union of beat keys:', [...keys].sort().join(', '));
console.log('\nbeats carrying a quotation mark inside .text:');
(plan.beats || []).forEach((b, i) => {
  if (b && typeof b.text === 'string' && b.text.includes('"')) {
    console.log('  [' + i + '] kind=' + JSON.stringify(b.kind) + ' speaker=' + JSON.stringify(b.speaker)
      + ' dialogue=' + JSON.stringify(b.dialogue) + '\n        text=' + JSON.stringify(b.text));
  }
});
console.log('\nfirst 3 beats verbatim:');
(plan.beats || []).slice(0, 3).forEach((b, i) => console.log('  [' + i + '] ' + JSON.stringify(b)));
