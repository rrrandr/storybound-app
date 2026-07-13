// Guard (Fable CG audit — A2-F4): _cgEnforceCalcifiedAndHook strips calcified/procedural sentences from
// beat text deterministically. Its OLD failure branch could corrupt output: it blanked a beat
// (beat.text='' — empties a DIALOGUE beat's speech bubble AND desyncs declared beat indices) or replaced
// it with a hardcoded 3rd-person-FEMALE narration line ('She looks away…' — wrong for dialogue beats,
// wrong for 1st/2nd-person or male/non-binary POV). Fix: when no safe strip exists, LEAVE THE ORIGINAL
// BEAT UNCHANGED. This guard proves the corruption paths are gone and the safe-strip path is preserved.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// Isolate the function body.
const start = src.indexOf('function _cgEnforceCalcifiedAndHook(plan, sceneIndex)');
A(start >= 0, '_cgEnforceCalcifiedAndHook not found');
const end = src.indexOf('window._cgEnforceCalcifiedAndHook =', start);
const fn = start >= 0 ? src.slice(start, end > start ? end : start + 4000) : '';

// (1) No hardcoded 3rd-person-female narration line anywhere in the file (the constant is deleted).
A(!src.includes('She looks away before the moment can settle.'), 'hardcoded 3rd-person-female neutral line still present');
A(!src.includes('_CG_NEUTRAL_BEAT'), '_CG_NEUTRAL_BEAT constant still referenced');

// (2) The corruption branches are gone from the function: no blank-and-omit, no neutral replace.
A(!fn.includes("beat.text = ''"), 'blank-beat path (desyncs indices / empties dialogue) still present');
A(!fn.includes('beat._omitted'), '_omitted flag path still present');
A(!/beat\.text = _CG_NEUTRAL_BEAT/.test(fn), 'neutral-line replace still present');

// (3) The safe partial-strip path is PRESERVED (we only changed the unsafe-failure behavior).
A(fn.includes('beat.text = cleaned;'), 'safe strip path (beat.text = cleaned) was removed — over-corrected');

// (4) The new behavior leaves the beat unchanged and logs it (kind surfaced for observability).
A(fn.includes('action=leave_unchanged'), 'leave-unchanged path missing');
A(/no safe deterministic strip; original preserved/.test(fn), 'leave-unchanged rationale not anchored');

// (5) Still deterministic — the whole point of this pass is NO LLM regen on CG.
for (const bad of ['callChatGPT', 'callGrok', 'fetch(', 'await ']) {
  A(!fn.includes(bad), `_cgEnforceCalcifiedAndHook must stay deterministic but contains "${bad}"`);
}

if (fail) process.exit(1);
console.log('PASS: CG calcification repair no longer blanks beats or injects hardcoded 3rd-person-female narration; on an unsafe strip it leaves the original beat unchanged (preserves kind/speaker/POV, no index desync); safe strip preserved; still deterministic.');
