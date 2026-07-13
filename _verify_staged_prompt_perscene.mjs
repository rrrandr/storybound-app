// Guard (Fable CG audit — A1-F3): _STAGED_SYSTEM_PROMPT (the literary-fallback analyzer's system prompt)
// was a module-load `var` that embedded window._rotatingExemplars(...) seeded subsets +
// buildSceneEndingDilemmaDirective() — evaluated ONCE for the whole session, so the "fresh seeded subset
// shows each scene" promise was false. Fix: build it per call via _buildStagedSystemPrompt().
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) The frozen module-load var is gone.
A(!/var _STAGED_SYSTEM_PROMPT\s*=/.test(src), 'module-load `var _STAGED_SYSTEM_PROMPT =` still present (still frozen)');

// (2) A per-call builder exists and returns the prompt.
const start = src.indexOf('function _buildStagedSystemPrompt()');
A(start >= 0, '_buildStagedSystemPrompt() builder missing');
const end = src.indexOf('function _buildStagedAnalysisPrompt(', start);
const fn = start >= 0 ? src.slice(start, end > start ? end : start + 200000) : '';
A(fn.includes("return 'You are a cinematic visual-novel director"), 'builder does not return the staged system prompt');

// (3) The dynamic (per-scene-varying) calls live INSIDE the builder, so they re-evaluate every call.
A(fn.includes("window._rotatingExemplars('decision_beat'"), 'decision_beat rotating exemplars not inside the builder');
A(fn.includes("window._rotatingExemplars('physical_reveal'"), 'physical_reveal rotating exemplars not inside the builder');
A(fn.includes('buildSceneEndingDilemmaDirective()'), 'scene-ending dilemma directive not inside the builder');

// (4) The live consumer calls the builder (not a frozen constant).
A(src.includes("{ role: 'system', content: _buildStagedSystemPrompt() },"), 'consumer does not call _buildStagedSystemPrompt()');
A(!/content: _STAGED_SYSTEM_PROMPT\b/.test(src), 'a live consumer still reads the frozen constant');

if (fail) process.exit(1);
console.log('PASS: staged analyzer system prompt is built per call (_buildStagedSystemPrompt) — rotating exemplars + ending-dilemma directive re-evaluate each scene; no module-load freeze; single consumer updated.');
