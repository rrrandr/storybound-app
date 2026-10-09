// ── THE OPENING CAST CAP REACHES ONLY A TRUE OPENING (provider-free, $0) ────────────────────
// The guard decides whether an opening-only CAST CAP goes into the author prompt. On this call
// chain the opening is sceneIndex === 0: opening callers invoke _completeStagedSceneFromScreenplay(0)
// and _runCGScreenplayGen(0), that index passes unchanged into _buildCGScreenplayUserPrompt, the
// generator's Scene-1 preparation runs under sceneIndex === 0, and commit displays sceneIndex + 1.
// This is a FOCUSED BUILDER CHECK - it calls the shipped builder directly and does not pretend to be
// an end-to-end First Sacrifice opening.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
};

console.log('=== OPENING GUARD: cast cap scope (provider-free, $0) ===\n');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', async (r) => {
  try { await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._buildCGScreenplayUserPrompt === 'function',
  { timeout: 30000 });
t('the shipped window._buildCGScreenplayUserPrompt is present', true);

// Each case drives the REAL builder and reports whether CAST CAP reached the prompt.
const run = async (sceneIndex, scenes) => page.evaluate((v) => {
  const prev = window.state.scenes;
  const prevST = window.state.tensionStage;
  try {
    // The cap lives inside the ST1 branch, so ST1 must be active for the case to be meaningful.
    window.state.tensionStage = 'ST1';
    if (v.scenes === 'missing') { try { delete window.state.scenes; } catch (_) {} }
    else window.state.scenes = v.scenes;
    let out = '';
    try { out = String(window._buildCGScreenplayUserPrompt(v.sceneIndex, '', '') || ''); }
    catch (e) { return { threw: String(e && e.message) }; }
    return { castCap: out.indexOf('CAST CAP') !== -1,
             forbidden: out.indexOf('FORBIDDEN in Scene 1') !== -1,
             crisis: out.indexOf('ONE LOAD-BEARING CRISIS') !== -1,
             len: out.length };
  } finally { window.state.scenes = prev; window.state.tensionStage = prevST; }
}, { sceneIndex, scenes });

// 1. OPENING: index 0, history known-empty -> the cap APPLIES.
const open = await run(0, []);
console.log('      opening      -> ' + JSON.stringify(open));
t('OPENING (sceneIndex 0, known-empty history): the cast cap APPLIES',
  !open.threw && open.castCap === true && open.forbidden === true, JSON.stringify(open));

// 2. CONTINUATION: a later index with written history -> OFF.
const cont = await run(3, [{ text: 'scene one prose' }, { text: 'scene two prose' }]);
console.log('      continuation -> ' + JSON.stringify(cont));
t('CONTINUATION (sceneIndex 3, history written): the cast cap is OFF',
  !cont.threw && cont.castCap === false && cont.forbidden === false, JSON.stringify(cont));

// 3. UNKNOWN HISTORY at the opening index -> OFF. This is the case my ternary got wrong: it
//    returned 0 for missing state.scenes, so unavailable history counted as empty.
const unk = await run(0, 'missing');
console.log('      unknown      -> ' + JSON.stringify(unk));
t('UNKNOWN history (sceneIndex 0, state.scenes missing): the cast cap is OFF',
  !unk.threw && unk.castCap === false, JSON.stringify(unk));

// 4. The opening index with history already written is NOT an opening either.
const idx0written = await run(0, [{ text: 'already written' }]);
t('sceneIndex 0 but history ALREADY WRITTEN: the cast cap is OFF',
  !idx0written.threw && idx0written.castCap === false, JSON.stringify(idx0written));

// 5. The ST1-wide crisis constraint is NOT opening-scoped - it must survive on a continuation.
t('the ST1-wide ONE LOAD-BEARING CRISIS constraint survives on a continuation',
  cont.crisis === true, JSON.stringify(cont));

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
