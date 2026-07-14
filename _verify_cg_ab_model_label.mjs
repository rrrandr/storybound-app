// Guard (Fable CG audit — A3-F6): the A/B model-compare capture pinned originalModel to a hardcoded
// 'claude-sonnet-4-5' (_MODEL_SLUG), so every capture's "(original)" row was mislabeled Sonnet even
// though the live author is Grok/Mistral/DeepSeek — corrupting dev model-eval reads. Fix: backfill
// originalModel with the ACTUAL winning model after gen.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) The stale hardcoded slug is gone entirely.
A(!src.includes('_MODEL_SLUG'), '_MODEL_SLUG (hardcoded Sonnet label) still present');
A(!src.includes("originalModel: 'claude-sonnet-4-5'"), 'capture still hardcodes a Sonnet originalModel');

// (2) Capture is set up with a null originalModel (to be backfilled).
A(src.includes('originalModel: null,   // backfilled post-gen with the actual winning model (A3-F6)'), 'capture setup does not defer originalModel to backfill');

// (3) The winning model slug is captured from the actual winning provider at the win site.
A(src.includes('var _winningProvider = null, _winningModelSlug = null;'), '_winningModelSlug not declared');
A(src.includes('_winningModelSlug = _prov.grokModel || _prov.mistralModel || _prov.dsModel || _prov.model || _prov.name;'), 'winning model slug not captured from the winning provider');

// (4) originalModel is backfilled with the real winning model alongside originalOutput.
A(src.includes('state._sceneCaptures[sceneIndex].originalModel = _winningModelSlug;'), 'originalModel not backfilled with the actual author');

if (fail) process.exit(1);
console.log('PASS: A/B capture originalModel is backfilled with the actual winning author model (no hardcoded Sonnet mislabel) — dev model-compare reads attribute to the real author.');
