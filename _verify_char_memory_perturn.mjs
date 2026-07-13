// Guard for finding ②: unfreeze turn-dependent character CONTEXT + DISCLOSURE. They were baked
// into the build-once state.sysPrompt (frozen at EARLY-STORY / empty). Now skipped from the cached
// stack and emitted per-turn from the SAME canonical builders, in the continuation HEAVY fullSys and
// BOTH foreground Scene-1 author paths. Verifies the assembled-prompt composition at every site.
// Scope note: this commit deliberately does NOT touch Literary LITE — it never received these blocks
// and remains a SEPARATE parity gap (asserted below), so no universal-Literary-parity claim is made.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
const lines = src.split('\n');
let fail = false;
const A = (cond, msg) => { if (!cond) { console.error('FAIL: ' + msg); fail = true; } };

// Cached stack SKIPS the two turn-dependent builders when the canonical build asks → no stale copy.
A(src.includes('function buildProseStackDirectives(opts)'), 'buildProseStackDirectives(opts) param missing');
A(src.includes('if (!opts || !opts.skipTurnDependentChar) {'), 'skip guard around Context/Disclosure missing');
A(src.includes('buildProseStackDirectives({ skipTurnDependentChar: true })'), 'canonical state.sysPrompt build does not skip turn-dependent char');
// Static character canon stays cached (Impression + Description are NOT inside the skip).
A(src.includes('out += buildCharacterImpressionDirective();'), 'static CharacterImpression removed from cached stack');
A(src.includes('out += buildCharacterDescriptionDirective();'), 'static CharacterDescription removed from cached stack');

// One fresh per-turn block, same two builders, emitted at exactly three sites (+1 definition).
A(src.includes('function _buildPerTurnCharMemory()'), 'per-turn char-memory helper missing');
A(src.includes("out += buildCharacterContextDirective();") && src.includes("out += buildCharacterDisclosureDirective();"), 'helper does not use both canonical builders');
const fullSysLine = lines.find(l => l.includes('const fullSys = !_buildHeavy'));
A(!!fullSysLine && fullSysLine.includes('_buildPerTurnCharMemory()'), 'continuation HEAVY fullSys does not emit the per-turn char block');
A(src.includes("_buildHotCrisisOpenerProseDirective() : '') + _buildPerTurnCharMemory()}"), 'Scene-1 HEAVY branch missing the per-turn char block');
A(src.includes("_buildHotFastDirective() : '') + _buildPerTurnCharMemory()}"), 'Scene-1 hot-fast branch missing the per-turn char block');
const callLines = lines.filter(l => /_buildPerTurnCharMemory\(\)/.test(l) && !/function _buildPerTurnCharMemory/.test(l) && !/^\s*\/\//.test(l));
A(callLines.length === 3, `expected exactly 3 _buildPerTurnCharMemory() call sites (fullSys + Scene-1 HEAVY + Scene-1 hot-fast), found ${callLines.length} — a site drifted or duplicated`);

// Builder capability: Context transitions out of EARLY-STORY after the threshold (reads live turnCount);
// Disclosure can be empty at start and later populate (gates on ledger keys).
A(src.includes('var _turn = (window.state && window.state.turnCount) || 0;'), 'Context builder no longer reads live turnCount');
A(src.includes('var _early = _turn <= 5;'), 'Context EARLY-STORY turn-threshold/transition missing');
A(src.includes("if (!keys.length) return '';"), 'Disclosure empty-at-start gate missing');

// CG generator behavior unchanged (it emits its own CG-native character context/disclosure).
A(src.includes('CHARACTER CONTEXT (CG'), 'CG-native character context directive changed');

// KNOWN LIMITATION (must remain true): Literary LITE still lacks these blocks — this commit must NOT wire them.
const liteStart = src.indexOf('function _buildLitLitePrompt');
const liteRegion = liteStart >= 0 ? src.slice(liteStart, liteStart + 24000) : '';
A(!liteRegion.includes('_buildPerTurnCharMemory'), 'LITE unexpectedly wired to the per-turn char block (this commit must not touch LITE)');

if (fail) process.exit(1);
console.log('PASS: turn-dependent char memory skipped from cached state.sysPrompt + emitted per-turn from the same builders in continuation HEAVY + both Scene-1 paths (3 sites, no stale+fresh); static canon cached; Context transitions past EARLY-STORY; Disclosure empty→populates; CG unchanged; LITE deliberately untouched (separate parity gap).');
