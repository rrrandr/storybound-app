// Guard (Fable CG audit — A2-F6): the issue-final ISSUE CLIFFHANGER — DETONATION override (user prompt)
// tells the model NOT to emit a penultimate dilemma / decision gate — but three system-prompt rules
// claimed to apply to ALL scenes unconditionally (penultimate-beat HARD rule, decision-tied peak,
// self-check #6), directly contradicting the override on a paid issue boundary. Fix: carve the override
// out of each. Also scope self-check #6's deck-weighing to the onboarding window (Story 1 + Story 3).
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

const start = src.indexOf('function _buildCGScreenplaySystemPrompt()');
const end = src.indexOf('window._buildCGScreenplaySystemPrompt =', start);
const cg = start >= 0 ? src.slice(start, end > start ? end : start + 80000) : '';
A(!!cg, 'CG system prompt not found');

// (1) The penultimate-beat HARD rule no longer claims unconditional "applies to ALL scenes".
A(!cg.includes('PENULTIMATE BEAT (HARD — non-negotiable, applies to ALL scenes)'), 'penultimate rule still claims to apply to ALL scenes unconditionally');
A(cg.includes('applies to every scene EXCEPT an issue-final DETONATION scene'), 'penultimate rule header does not carve out the detonation');

// (2) Explicit issue-final detonation exception bullet exists in the penultimate block.
A(cg.includes('EXCEPTION — ISSUE-FINAL DETONATION (HARD)'), 'explicit detonation exception bullet missing');
A(cg.includes('this entire penultimate-dilemma / decision-gate structure is SUSPENDED'), 'detonation exception does not suspend the dilemma structure');

// (3) The decision-tied peak acknowledges the detonation (no penultimate decision to tie to).
A(cg.includes('on an issue-final DETONATION scene there is no penultimate decision, so the peak ties to the DETONATION itself'), 'decision-tied peak not carved out for detonation');

// (4) Self-check #6 carves out the detonation AND scopes deck-weighing to the onboarding window.
A(cg.includes('Penultimate beat = the DILEMMA — UNLESS the ISSUE CLIFFHANGER — DETONATION override is active'), 'self-check #6 not carved out for detonation');
A(cg.includes('the final beat then weighs the deck ONLY in the onboarding window (Story 1 + Story 3)'), 'self-check #6 still implies deck-weighing on every scene');

// (5) The DETONATION override itself still ships (the counterpart the carve-outs defer to).
A(src.includes('ISSUE CLIFFHANGER — DETONATION (this is the FINAL scene of the issue, a PAID boundary): OVERRIDE the standard penultimate-dilemma'), 'DETONATION override directive missing');

if (fail) process.exit(1);
console.log('PASS: penultimate-dilemma HARD rule + decision-tied peak + self-check #6 all carve out the issue-final DETONATION override; deck-weighing scoped to the onboarding window; the override still ships.');
