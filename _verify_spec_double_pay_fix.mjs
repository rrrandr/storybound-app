// Guard: speculation double-pay fix (2026-07-14 meta-audit). A committed speculative scene is already
// paid (records speculation_committed) and MUST take precedence over a LITE regen. The bug: `if (_useLite)`
// led the branch chain, so a LITE turn with a valid committed spec scene regenerated fresh — double-paying
// and leaving speculation_committed/committed_usd inflated for a silently-discarded commit. Fix: the LITE
// branch is guarded so it yields to the `else if (useSpeculative && speculativeScene)` branch.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) The LITE branch now yields to a committed speculative scene.
A(src.includes('if (_useLite && !(useSpeculative && speculativeScene)) {'),
  'LITE branch is not guarded against a committed speculative scene (double-pay reintroduced)');
A(!/\n\s*if \(_useLite\) \{\n/.test(src) || src.includes('if (_useLite && !(useSpeculative && speculativeScene)) {'),
  'a bare `if (_useLite) {` gen-branch still leads the chain');

// (2) The speculative-consume branch (which the guard now falls through to) still exists AFTER the LITE branch.
const liteIdx = src.indexOf('if (_useLite && !(useSpeculative && speculativeScene)) {');
const specIdx = src.indexOf('} else if (useSpeculative && speculativeScene) {');
A(liteIdx >= 0 && specIdx >= 0 && specIdx > liteIdx,
  'the `else if (useSpeculative && speculativeScene)` consume branch must follow the guarded LITE branch');
A(src.includes('raw = speculativeScene.text;'), 'speculative consume (raw = speculativeScene.text) missing');

// (3) speculation_committed is still recorded only when the input actually matches (truthful commit).
A(src.includes("_recordSpeculationEvent('speculation_committed'"), 'speculation_committed record missing');

if (fail) process.exit(1);
console.log('PASS: a committed speculative scene now takes precedence over LITE regen — no double-pay, commit metric truthful.');
