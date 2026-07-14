// Guard (Fable CG audit — A3-F6 dead-code): the CG screenplay routing carried defined-but-never-read
// symbols — two unused provider chains (_SCREENPLAY_GPT_FIRST, _SCREENPLAY_SONNET_FIRST_ADULT) and a
// runtime-intimacy/content-risk detection block (_SCREENPLAY_RISKY, _isRuntimeIntimate,
// _isRiskyForScreenplay + their _mode1*/_isDogmaFlavor/_isComedianLI inputs) that no longer picked the
// author. Verified fully dead (every input fed only the dead flags) and removed; live routing preserved.
import fs from 'fs';
const src = fs.readFileSync(new URL('./public/app.js', import.meta.url), 'utf8');
let fail = false;
const A = (c, m) => { if (!c) { console.error('FAIL: ' + m); fail = true; } };

// (1) No live definitions of the dead symbols remain (cleanup-note mentions are fine).
for (const dead of ['var _SCREENPLAY_GPT_FIRST', 'var _SCREENPLAY_SONNET_FIRST_ADULT', 'var _SCREENPLAY_RISKY',
                    'var _isRuntimeIntimate', 'var _isRiskyForScreenplay', 'var _mode1RouteFlag',
                    'var _mode1HasFired', 'var _isDogmaFlavor', 'var _isComedianLI']) {
  A(!src.includes(dead), `dead symbol still defined: ${dead}`);
}
// The local dead _sustainedProfanityActive var is gone; the SEPARATE state field (set/read elsewhere
// via the `s` alias) is untouched.
A(!src.includes('var _sustainedProfanityActive'), 'local dead _sustainedProfanityActive var still present');
A(src.includes('s._sustainedProfanityActive = _windowSum'), 'the separate state _sustainedProfanityActive field (its setter) was wrongly removed');

// (2) Live routing preserved: the two real chains, the flavor key, and the tier-based author policy.
A(src.includes('var _SCREENPLAY_GROK_FIRST = ['), 'live _SCREENPLAY_GROK_FIRST chain missing');
A(src.includes('var _SCREENPLAY_MISTRAL_SMALL_FIRST = ['), 'live _SCREENPLAY_MISTRAL_SMALL_FIRST chain missing');
A(src.includes('var _sceneFlavorKey = (state && state.worldSubtype)'), 'live _sceneFlavorKey removed');
A(src.includes('window._isComplexAuthorMode') && src.includes('window._isPremiumAuthorScene'), 'tier-based author routing lost');

// (3) The removals are documented (so a future reader knows they were dead, not lost).
A(src.includes('(Dead-code cleanup 2026-07-13, A3-F6): the _SCREENPLAY_GPT_FIRST'), 'chain-removal note missing');
A(src.includes('(Dead-code cleanup 2026-07-13, A3-F6): _SCREENPLAY_RISKY + the runtime-intimacy'), 'risk-block-removal note missing');

if (fail) process.exit(1);
console.log('PASS: dead CG screenplay chains + runtime-risk detection removed (verified never-read); live GROK/MISTRAL chains, flavor key, and tier-based author routing preserved; separate state field untouched.');
