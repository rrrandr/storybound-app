// Guard (Fable CG audit — A1-F4): the speculative intimate fate-card cache (_grokIntimateFateCards) was
// keyed on turnCount ALONE. Within the same turn, a change to the fate card / character input / world /
// flavor / intensity / obligation between finalize (producer) and deal (consumer) served a stale card
// set. Fix: stamp + validate the CANONICAL getFateContextHash() (the same hash the literary speculative
// path uses — NOT a new weaker hash). A mismatch drops to the on-demand batch fetch.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) Producer stamps the canonical hash into the cache.
A(src.includes('s._grokIntimateFateCards = { turnCount: tc, fateContextHash:'), 'producer does not stamp fateContextHash');
A(/fateContextHash: \(typeof getFateContextHash === 'function' \? getFateContextHash\(\) : null\)/.test(src), 'producer does not use the canonical getFateContextHash');

// (2) Consumer validates the hash IN ADDITION TO turnCount.
A(src.includes('specCache.turnCount === tc && specCache.fateContextHash === _curFateHash'), 'consumer does not validate fateContextHash alongside turnCount');
A(src.includes("var _curFateHash = (typeof getFateContextHash === 'function' ? getFateContextHash() : null);"), 'consumer does not compute the current canonical hash');

// (3) It reuses the CANONICAL hash (no second, weaker hash was invented).
const hashDefs = (src.match(/function getFateContextHash\(\)/g) || []).length;
A(hashDefs === 1, `expected exactly ONE getFateContextHash definition (canonical), found ${hashDefs} — a duplicate/weaker hash may have been introduced`);

// (4) The on-demand fallback (same shipping request) still exists for the miss/mismatch path.
A(src.includes('orch.generateIntimateFatePreviewsBatch()'), 'on-demand batch fallback (shipping request) missing');

if (fail) process.exit(1);
console.log('PASS: intimate fate-card cache validates the canonical getFateContextHash (card/input/world/flavor/intensity/obligation) on top of turnCount; a mismatch falls back to the on-demand batch — no stale cards, no second weaker hash.');
