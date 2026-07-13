// Guard (Fable CG audit — A1-F2): the Scene-1 opening-mode block (grounded/orbit/collision — "LI must
// not appear") was frozen on state and injected into EVERY CG scene's system prompt (the block has no
// turn check despite its own doc comment), and state._scene1OpeningMode was never cleared between
// stories. So a billionaire story's LI-suppression order bled into scene 3+ AND into a later
// (possibly non-billionaire) story. Fix: gate the CG injection to Scene 1 + clear the cache on reset.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) CG system-prompt injection is Scene-1 gated (turnCount 0/undefined), but the mode is STILL
//     resolved (so the cached value reaches the Scene-1 user-prompt consumer + downstream readers).
const cgStart = src.indexOf('function _buildCGScreenplaySystemPrompt()');
const cgRegion = cgStart >= 0 ? src.slice(cgStart, cgStart + 60000) : '';
A(!!cgRegion, '_buildCGScreenplaySystemPrompt not found');
A(cgRegion.includes('window._resolveScene1OpeningMode();'), 'opening mode no longer resolved/cached');
A(cgRegion.includes('var _isScene1CG = !state.turnCount || state.turnCount === 0;'), 'Scene-1 predicate for opening-mode injection missing');
A(cgRegion.includes('if (_isScene1CG && typeof window._buildScene1OpeningModeBlock === \'function\') {'), 'opening-mode block emission not gated to Scene 1');

// (2) The cache is cleared on per-story reset (so a later story re-selects; no stale-mode inheritance).
const resetStart = src.indexOf('state._cgScreenplayPrecomputed = null;');
const resetRegion = resetStart >= 0 ? src.slice(resetStart - 200, resetStart + 800) : '';
A(resetRegion.includes('state._scene1OpeningMode = null;'), '_scene1OpeningMode not cleared in the per-story reset');

// (3) The block builder is unchanged in intent (still returns '' when no mode) — we did NOT delete it.
A(src.includes('function _buildScene1OpeningModeBlock()'), '_buildScene1OpeningModeBlock removed');

if (fail) process.exit(1);
console.log('PASS: CG opening-mode block emitted on Scene 1 only (mode still resolved+cached for the Scene-1 user prompt); _scene1OpeningMode cleared per-story so it cannot leak into scene 3+ or the next story.');
