// Guard (Fable CG audit — A3-F7): the dev A/B model-compare panel + spine bake-off offered Anthropic
// rows (Opus 4.7 / Sonnet 4.5) that the central cost-guard silently downgrades to Haiku — rendering
// Haiku output under an Opus/Sonnet label + price (a meaningless comparison). Per Roman: option (c) —
// remove them (production routing no longer evaluates Anthropic authors). Plus: the scaffold genre-map
// comments were stale (claimed gpt-4o / opus; both genres are actually gpt-4o-mini).
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) The dev compare panel no longer lists Anthropic author rows; the live-relevant ones remain.
const cmStart = src.indexOf('var _COMPARE_MODELS = [');
const cm = cmStart >= 0 ? src.slice(cmStart, cmStart + 500) : '';
A(!!cm, '_COMPARE_MODELS not found');
A(!cm.includes("slug: 'claude-opus-4-7'"), 'Opus row still in the compare panel');
A(!cm.includes("slug: 'claude-sonnet-4-5'"), 'Sonnet row still in the compare panel');
A(cm.includes("slug: 'gpt-4o'") && cm.includes("slug: 'gpt-4o-mini'"), 'live gpt-4o / gpt-4o-mini rows were lost');
A(src.includes('the Anthropic comparison rows (Claude Opus 4.7 / Sonnet 4.5) were') && src.includes('Restore ONLY if Anthropic returns as a supported author route'), 'the "why removed / how to restore" note is missing');

// (2) The spine bake-off default no longer includes the guard-downgraded Opus arm.
A(src.includes("var MODELS = opts.models || ['gpt-4o-mini', 'gpt-4o'];"), 'bake-off default still includes claude-opus-4-7 (or was changed unexpectedly)');
A(!src.includes("_spineModelBakeoff({models:['gpt-4o','claude-opus-4-7']})"), 'bake-off doc example still suggests the Opus arm');

// (3) The stale scaffold genre-map comments are corrected to the actual gpt-4o-mini values.
A(!src.includes('Opus 4.7 for glass_house'), 'stale "Opus 4.7 for glass_house" comment still present');
A(!src.includes('billionaire_modern → gpt-4o, glass_house'), 'stale "billionaire_modern → gpt-4o" comment still present');
// Ground truth the comments now describe: both hand-authored genres route to gpt-4o-mini.
const genre = src.slice(src.indexOf('var CG_SCAFFOLD_GENRE = {'), src.indexOf('var CG_SCAFFOLD_GENRE = {') + 4000);
A((genre.match(/model: 'gpt-4o-mini'/g) || []).length >= 2, 'CG_SCAFFOLD_GENRE genres are not both gpt-4o-mini (comment correction would be wrong)');

if (fail) process.exit(1);
console.log('PASS: Anthropic Opus/Sonnet rows removed from the dev compare panel + bake-off (with a why-removed/how-to-restore note); live gpt-4o/mini kept; stale genre-map comments corrected to the real gpt-4o-mini routing.');
