// Regression guard for SPECULATIVE PROMPT DRIFT (root cause #2, containment fix).
// The full-scene speculative generator (preloadNextScene) assembles Site C, which
// omits the FF canon-facts steer (and other protections). Committed speculative
// scenes ship without regen, so Famous Fate stories can ship canon-blind prose.
// Smallest safe containment: gate speculative preload off for Famous Fate.
// FAILS before the fix (no FF guard); PASSES after.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8').split('\n');
const idx = src.findIndex(l => /async function preloadNextScene\s*\(/.test(l));
if (idx < 0) { console.error('FAIL: preloadNextScene definition not found'); process.exit(2); }
const guardRegion = src.slice(idx, idx + 16).join('\n'); // top-of-function guard block
if (!/fateMode\s*===\s*'famous_fate'[\s\S]*?return/.test(guardRegion)) {
  console.error('FAIL #2: preloadNextScene does not gate off Famous Fate — canon-blind speculative scenes can still ship.');
  process.exit(1);
}
console.log('PASS #2: Famous Fate speculation gated off in preloadNextScene.');
