// ── THE ACCEPTANCE CHECK NOW REFUSES A REPEATED SCENE (provider-free, $0) ───────────────────
// A live Scene 9 reproduced Scene 8's 24 beat texts line for line, changing one speaker, and was
// ACCEPTED: _canonDeterministicCheck tested reserved content and grounding but never asked whether
// the scene was new. This exercises the SHIPPED _canonDeterministicCheck against the REAL beats
// from that run - Scene 8 as the prior scene, Scene 9 as the proposal - plus a genuinely new scene
// as the control. No provider, no model, no story replay.
import fs from 'fs';
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
};

const RUN = '_fs_live_out/run_2026-10-09T06-31-11-009Z';
const d = JSON.parse(fs.readFileSync(RUN + '/final.json', 'utf8'));
const texts = ((d.snap || d).texts || []).map((x) => (typeof x === 'string' ? x : x.text || ''));
// texts[0] is Scene 2, so Scene 8 is index 6 and Scene 9 index 7.
const scene8 = texts[6], scene9 = texts[7], scene10 = texts[8];

console.log('=== REDUX ACCEPTANCE (provider-free, $0) ===\n');
t('the real Scene 8 and Scene 9 texts were loaded from the run',
  !!scene8 && !!scene9 && scene8.length > 500 && scene9.length > 500,
  'scene8=' + (scene8 || '').length + ' scene9=' + (scene9 || '').length);

const beatsOf = (txt) => txt.split('\n').map((x) => x.trim()).filter((x) => x.length > 12)
  .filter((x) => !/tarot deck|Petition Fate|Tempt Fate/.test(x))
  .map((x) => ({ text: x, kind: /^[A-Z][A-Z '’-]+:/.test(x) ? 'dialogue' : 'narration' }));

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', async (r) => {
  try { await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._canonDeterministicCheck === 'function',
  { timeout: 30000 });
t('the shipped window._canonDeterministicCheck is present', true);

const run = async (proposalBeats, priorText) => page.evaluate((v) => {
  // Production calls the INNER _sbLatestProseText, so stubbing window.* does nothing. The prior
  // scene is supplied through the REAL state that accessor reads - a scene record with the text -
  // so the shipped code path resolves it exactly as it does in a run.
  const prevScenes = window.state.scenes;
  window.state.scenes = v.prior
    ? [{ text: v.prior, sceneNumber: 8, accepted: true }]
    : [];
  try {
    const out = window._canonDeterministicCheck({ beats: v.beats, event_slots: {},
      state_change: 'the review continues' }, {});
    return { decided: !!(out && out.decided),
             violations: ((out && out.violations) || []).map((x) => ({
               category: x.category, claim: x.claim, why: String(x.why || '').slice(0, 170) })) };
  } finally { window.state.scenes = prevScenes; }
}, { beats: proposalBeats, prior: priorText });

// 1. THE ACTUAL FAILURE: Scene 9 proposed after Scene 8.
const r1 = await run(beatsOf(scene9), scene8);
const redux = r1.violations.find((x) => /REDUX/.test(x.why));
t('the real Scene 9 proposal is now REFUSED after Scene 8', !!redux && r1.decided,
  JSON.stringify(r1).slice(0, 220));
if (redux) console.log('      ' + redux.why);

// 2. CONTROL: a genuinely different scene must still pass this check.
const r2 = await run(beatsOf(scene10), scene8);
const redux2 = r2.violations.find((x) => /REDUX/.test(x.why));
t('a genuinely new scene (Scene 10 after Scene 8) is NOT flagged as redux', !redux2,
  redux2 ? redux2.why : '');

// 3. The first scene of a story has no predecessor and must not be flagged.
const r3 = await run(beatsOf(scene9), '');
const redux3 = r3.violations.find((x) => /REDUX/.test(x.why));
t('with no prior scene, nothing is flagged as redux', !redux3, redux3 ? redux3.why : '');

// 4. A short scene must not trip the check on a handful of shared lines.
const r4 = await run(beatsOf(scene8).slice(0, 3), scene8);
const redux4 = r4.violations.find((x) => /REDUX/.test(x.why));
t('a proposal under the 4-beat floor is not judged', !redux4, redux4 ? redux4.why : '');

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
