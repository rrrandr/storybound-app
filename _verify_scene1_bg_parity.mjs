// Guard for the background Scene-1 canonical-parity fix (Option A). Proves the bypass is closed:
// bg gen waits for canonical bible/crisis readiness, appends the SAME hot-crisis + picturability
// builders the foreground uses, no longer overwrites state.sysPrompt with the legacy stack, and
// the instant-Begin consumption + timeout→foreground fallback are intact.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const need = [
  ['async function _awaitOpeningStateReady', 'readiness-barrier helper defined'],
  ['var _openReady = await _awaitOpeningStateReady(', 'barrier awaited before bg Scene-1 gen (cannot fire before readiness)'],
  ["return { success: false, reason: 'opening_state_not_ready' }", 'skip (no degraded bg Scene 1) when state absent'],
  ['var _bgUserPrompt = introPrompt', 'opener-augmented bg user prompt'],
  ["_buildPicturabilityMandate() : '')", 'picturability builder appended to bg request'],
  ["_buildHotCrisisOpenerProseDirective() : '')", 'hot-crisis builder appended to bg request'],
  ['window._buildPicturabilityMandate =', 'same picturability builder as foreground'],
  ['window._buildHotCrisisOpenerProseDirective =', 'same hot-crisis builder as foreground'],
  ['const STORY_TIMEOUT_MS = 10000', '10s timeout → foreground fallback intact'],
  ['const bgPromise = window.getBackgroundStoryPromise', 'instant-Begin body consumption intact'],
];
for (const [p, l] of need) if (!src.includes(p)) { console.error(`FAIL: ${l} missing ("${p}").`); fail = true; }
// Containment: legacy background overwrite of state.sysPrompt must be gone.
if (src.includes('state.sysPrompt = sysPrompt')) { console.error('FAIL: legacy background overwrite of state.sysPrompt still present.'); fail = true; }
// The bg Scene-1 gen + retry must no longer send the bare introPrompt (opener would be missing).
if (src.includes("{ role: 'user', content: introPrompt }")) { console.error('FAIL: bg Scene-1 gen still sends bare introPrompt (openers not applied).'); fail = true; }
if (fail) process.exit(1);
console.log('PASS: bg Scene-1 gated on bible/crisis readiness; canonical hot-crisis + picturability appended (shared builders); legacy state.sysPrompt write removed; instant-Begin + timeout fallback intact.');
