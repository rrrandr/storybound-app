// Regression guard for finding #4 (three conflicting "she felt" regimes in one HEAVY prompt).
// After reconciliation, buildLiteraryCraftDirective() is the SOLE authority on direct
// emotional declaration: "she felt" is legal but a default to question. The assembled HEAVY
// prompt must no longer carry the competing absolute ban or the numeric quota. These three
// phrases are unique to the removed rules, so their absence from source == absence from prompt.
// FAILS before the fix (all three present); PASSES after.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
const banned = [
  ['never declare internal states directly', 'absolute SHOW_NOT_TELL internal-state ban'],
  ['Max 1 abstract emotional sentence per scene', 'numeric abstract-emotion quota'],
  ['Avoid opening sentences with: "she felt"', '"she felt" forbidden-construction rule'],
];
let fail = false;
for (const [phrase, label] of banned) {
  if (src.includes(phrase)) { console.error(`FAIL: ${label} still present ("${phrase}").`); fail = true; }
}
if (!src.includes('defaults to question')) {
  console.error('FAIL: the literary-craft "she felt" calibration ("defaults to question") is missing — no operative policy remains.');
  fail = true;
}
if (fail) process.exit(1);
console.log('PASS: no absolute internal-state ban, no abstract-emotion quota, no "she felt" prohibition; calibration is the single authority.');
