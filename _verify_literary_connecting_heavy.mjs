// Guard: Option A — literary + Famous-Fate CONNECTING scenes build the HEAVY prompt, not LITE.
// A/B-validated (2026-07-14): Grok warm-caches the ~77k prose-stack, so cached-HEAVY connecting scenes
// cost ~0.5¢ vs LITE ~0.2¢ (~0.3¢/scene) — not worth LITE dropping the whole directive stack. This
// override flips _useLite=false for the literary engine after _promptTier routes LITE. Verifies the
// override lands at the single _useLite decision site, is engine-scoped (so CG's separate Mistral
// screenplay path is untouched), and carries a kill-switch.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// The override must sit right after the _promptTier route decision (the one place _useLite materializes).
const decisionIdx = src.indexOf("_useLite = (_genTier.route !== 'HEAVY' && _genTier.route !== 'GROK');");
A(decisionIdx >= 0, '_useLite tier-route decision site not found (gate moved?)');
const region = decisionIdx >= 0 ? src.slice(decisionIdx, decisionIdx + 1600) : '';

// (1) The override flips _useLite back to HEAVY for the literary engine.
A(region.includes('window.__forceLiteraryConnectingHeavy !== false') && region.includes('_useLite = false;'),
  'literary-connecting HEAVY override missing at the _useLite decision site');

// (2) It is engine-scoped so CG (separate Mistral screenplay path) is NOT forced heavy here.
A(region.includes('_isCGRenderMode') && region.includes('_isLiteraryEngineTier'),
  'override is not engine-scoped (must exclude CG via _isCGRenderMode)');

// (3) The override fires BEFORE the [TIER-ROUTE] log, so the log reflects the final built prompt.
const ovrPos = region.indexOf('window.__forceLiteraryConnectingHeavy');
const logPos = region.indexOf('[TIER-ROUTE] scene');
A(ovrPos >= 0 && logPos >= 0 && ovrPos < logPos, 'override must precede the [TIER-ROUTE] log so it prints the real prompt tier');

// (4) Kill-switch is the default-on idiom (=== false disables), matching __tierRouting/__forceHeavyBuild.
A(src.includes('window.__forceLiteraryConnectingHeavy !== false'), 'kill-switch not default-on (should mirror __tierRouting)');

if (fail) process.exit(1);
console.log('PASS: literary + FF connecting scenes force HEAVY at the _useLite site (engine-scoped, CG untouched, kill-switch present, logged truthfully).');
