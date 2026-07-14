// Guard (Fable CG audit — A2-F9): the CG prompt co-shipped a stale "DECK RESTRAINT — the deck is a
// CARRIED OBJECT only, stays in pocket ... the CLOSER reintroduces it" rule against the current DECK-AT-END
// mandated frame ("THE DECK MUST NOT APPEAR ... not in a pocket ... until the FINAL beat"). Roman's
// reconciliation (by scope + purpose): deck = carried object almost never foregrounded (default), MAY
// foreground as a deliberate plot point (arrest/confiscation/theft), and DECK-AT-END governs onboarding
// Scene 1 (Stories 1 & 3) where it surfaces at the end to onboard the cards UI.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

const start = src.indexOf('function _buildCGScreenplaySystemPrompt()');
const end = src.indexOf('window._buildCGScreenplaySystemPrompt =', start);
const cg = start >= 0 ? src.slice(start, end > start ? end : start + 80000) : '';
A(!!cg, 'CG system prompt not found');

// (1) The stale "carried object only / stays in pocket / closer reintroduces it" framing is gone.
A(!cg.includes('CARRIED OBJECT only'), 'stale "CARRIED OBJECT only" framing still present');
A(!cg.includes('The CLOSER reintroduces it'), 'stale "closer reintroduces it" framing still present');
A(!cg.includes('applies to all body beats between the Scene 1 mandated opener and closer'), 'stale mandated-frame pocket scoping still present');

// (2) New DECK PRESENCE rule: carried-object default, rarely foregrounded.
A(cg.includes('deck is a CARRIED OBJECT that is almost never foregrounded'), 'carried-object default rule missing');

// (3) Plot-point EXCEPTION (arrest/confiscation/theft/leverage).
A(cg.includes('the deck MAY come to the FOREGROUND when it is a deliberate PLOT POINT') && cg.includes('confiscated when she is arrested'), 'deliberate plot-point exception missing');

// (4) ONBOARDING OVERRIDE defers to DECK-AT-END (stricter; absent until final beat, onboards the UI).
A(cg.includes('ONBOARDING OVERRIDE') && cg.includes('SCENE 1 MANDATED FRAME (DECK-AT-END, onboarding Stories 1 & 3) is active'), 'onboarding DECK-AT-END override missing');
A(cg.includes('the deck must NOT appear at all — not even in a pocket — until the mandated closing beat'), 'override does not defer to deck-at-end (absent until final beat)');
A(cg.includes('onboard the reader to the cards UI below'), 'onboarding purpose (cards UI) not stated');

// (5) The DECK-AT-END mandated frame itself still ships unchanged (the stricter block deferred to).
A(src.includes('THE DECK MUST NOT APPEAR in any beat before the FINAL beat — not in hand, not in a pocket'), 'DECK-AT-END mandated frame missing/changed');

if (fail) process.exit(1);
console.log('PASS: deck reconciled by scope — carried-object default (rarely foregrounded) + deliberate plot-point exception + onboarding DECK-AT-END override; stale pocket-during-mandate framing removed; DECK-AT-END frame unchanged.');
