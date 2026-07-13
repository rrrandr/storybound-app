// Guard (Fable CG audit — A1-F7): the continuity-bridge guard (_SMALL_BRIDGE_GUARD) that smooths the
// strong→light author seam on a connecting scene right after a Grok tentpole was appended ONLY inside the
// Mistral provider branch. So if Mistral failed and Grok/DeepSeek/GPT-4o authored the connecting scene,
// the bridge was silently dropped. Fix: apply it at the SHARED author-request layer so every provider
// gets it; the Mistral branch layers only its own restraint guard on top.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// Isolate the screenplay provider-call region.
const start = src.indexOf('var _cgBridge = !_cgAuthorPremium');
A(start >= 0, 'screenplay chain region not found');
const region = start >= 0 ? src.slice(start, start + 8000) : '';

// (1) Bridge guard is computed ONCE, at the shared level (before the per-provider helper).
A(region.includes("var _cgBridgeGuard = (_cgBridge && typeof window._SMALL_BRIDGE_GUARD === 'string') ? window._SMALL_BRIDGE_GUARD : '';"), 'shared _cgBridgeGuard computation missing');

// (2) The shared system message carries it, and is used by the default msgs (Grok / DeepSeek / GPT-4o).
A(region.includes('var _sharedSys = sysPrompt + _cgBridgeGuard;'), 'shared system message does not include the bridge guard');
A(/\{ role: 'system', content: _sharedSys \},/.test(region), 'default provider msgs do not use the shared (bridge-carrying) system message');

// (3) Mistral layers ONLY its restraint guard on top of the shared system message.
A(region.includes("{ role: 'system', content: _sharedSys + _cgRestraint },"), 'Mistral branch does not build on the shared system message');

// (4) The OLD per-Mistral bridge append is gone (no double-apply, no Mistral-only application).
A(!region.includes('_cgRestraint += window._SMALL_BRIDGE_GUARD'), 'Mistral branch still appends the bridge guard itself (should be shared-only)');
// The only textual use of _SMALL_BRIDGE_GUARD in this region is the shared computation.
const uses = (region.match(/_SMALL_BRIDGE_GUARD/g) || []).length;
A(uses === 2, `expected _SMALL_BRIDGE_GUARD referenced exactly twice (typeof check + value) in the shared computation, found ${uses}`);

if (fail) process.exit(1);
console.log('PASS: CG continuity-bridge guard applied at the shared author-request layer — reaches Grok/DeepSeek/GPT-4o on a Mistral fallback; Mistral adds only its restraint guard; no per-provider bridge append remains.');
