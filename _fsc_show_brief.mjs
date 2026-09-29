// Print the two artifacts side by side. No network, no cost.
import { preflight } from './_fsc_preflight_control.mjs';
const pre = await preflight({ wish: 'I want this to have never happened.',
  expect: 'unm.time_gives_way', expectChoicePending: true, expectInsideReplacementPOV: true });
console.log('=== ARTIFACT 2 — AUTHOR BRIEF (the only Fate material the writer sees) ===\n');
console.log(pre.brief);
console.log('\n=== ARTIFACT 1 — MACHINE SPEC (never sent; ' + pre.spec.length + ' chars) ===\n');
console.log(pre.spec.split('\n').slice(0, 14).join('\n') + '\n    … (' 
  + (pre.spec.split('\n').length - 14) + ' more lines, retained for scoring)');
console.log('\nbrief ' + pre.brief.length + ' chars · spec ' + pre.spec.length + ' chars');
process.exit(pre.ok ? 0 : 1);
