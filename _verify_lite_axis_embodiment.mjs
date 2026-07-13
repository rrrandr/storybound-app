// Guard for finding ①: the axis→prose obligation now reaches LITE (the majority continuation
// path), which previously carried only a 3-line tally. Proves LITE delivery + HEAVY non-regression.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
// LITE DELIVERY: _llAxisState now carries the compact embodiment obligation, still wired into LITE.
if (!src.includes('① LITE AXIS EMBODIMENT')) { console.error('FAIL: LITE axis embodiment block missing.'); fail = true; }
if (!src.includes('WHAT SHE NOTICES FIRST, WHAT SNAGS HER ATTENTION')) { console.error('FAIL: LITE axis embodiment obligation text missing.'); fail = true; }
if (!src.includes("add('axis_state', _llAxisState())")) { console.error('FAIL: LITE no longer emits axis_state.'); fail = true; }
// HEAVY NON-REGRESSION: the richer HEAVY axis-gravity directive + its absLead gate are unchanged.
if (!src.includes('let it color WHAT THE PROTAGONIST NOTICES FIRST in this scene')) { console.error('FAIL: HEAVY axis-gravity embodiment changed.'); fail = true; }
if (!src.includes("if (absLead < 2) return '';")) { console.error('FAIL: HEAVY absLead<2 gate changed.'); fail = true; }
if (fail) process.exit(1);
console.log('PASS: LITE carries a compact axis embodiment obligation (delivered on any lean); HEAVY axis-gravity + absLead gate unchanged.');
