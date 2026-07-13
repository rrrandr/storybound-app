// Regression guard for #7 (obsolete-author-architecture cleanup).
// Proves the dead __scene1GrokCandidate route, its helper, the obsolete Scene-1 length
// contract, the two dead expression vars, and the stale "ChatGPT/Sonnet is the author"
// docs are all absent — and the corrected Grok-routing docs are present.
// (Scoped to the verified #7 surfaces; the dev A/B harnesses and gravity-edit Sonnet
// calls are intentionally a SEPARATE later finding, so this does not assert on them.)
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;

const mustBeGone = [
  ['__scene1GrokCandidate', 'dead Scene-1 candidate flag'],
  ['_scene1GrokCandidateAuthor', 'dead Scene-1 candidate route function'],
  ['_buildGrokNativePrompt', 'dead route helper function'],
  ['Write a FULL Scene 1 of 1,400', 'obsolete 1,400-2,000-word Scene-1 contract'],
  ['_exprEchoBlock', 'dead variable _exprEchoBlock (all binding refs)'],
  ['_binl_expressionStyleIntimacy', 'dead variable _binl_expressionStyleIntimacy (all binding refs)'],
  ['ChatGPT is the ONLY model for story authoring', 'stale AUTHOR MODEL doc'],
  ['Story authoring ONLY uses ChatGPT', 'stale callChat HARD RULE doc'],
  ['the writer is SONNET', 'stale "writer is Sonnet" doc'],
  ['ChatGPT (PRIMARY AUTHOR — ALWAYS CALLED)', 'stale file-header author doc'],
];
for (const [p, l] of mustBeGone) if (src.includes(p)) { console.error(`FAIL: ${l} still present ("${p}").`); fail = true; }

const mustExist = [
  ['PROSE AUTHOR is tiered by scene TIER', 'corrected file-header routing doc'],
  ['AUTHOR MODEL: prose author is GROK', 'corrected AUTHOR MODEL doc'],
  ['the baseline literary author is GROK', 'corrected callChat routing doc'],
  ['The writer is GROK', 'corrected PROSE TIER doc'],
];
for (const [p, l] of mustExist) if (!src.includes(p)) { console.error(`FAIL: ${l} missing ("${p}").`); fail = true; }

if (fail) process.exit(1);
console.log('PASS: obsolete author-architecture surfaces (route/flag/mandate/dead-vars/stale-docs) removed; docs corrected to Grok/Mistral routing.');
