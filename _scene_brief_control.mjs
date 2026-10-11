// ── THE ASSEMBLED BRIEF FOR BOTH GENERATED SCENES, PROVIDER-FREE ($0) ───────────────────────
// Drives the SHIPPED builder under both density branches that the live run actually produced, and
// checks the assignment is coherent in each: one size-and-purpose statement, present in both, with
// nothing telling the author the opposite.
import { chromium } from 'playwright-core';

let pass = 0, fail = 0;
const t = (label, ok, detail) => {
  if (ok) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '  — ' + detail : '')); }
};

console.log('=== SCENE BRIEF COHERENCE, BOTH BRANCHES (provider-free, $0) ===\n');
const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', async (r) => {
  try { await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._buildCGScreenplayUserPrompt === 'function',
  { timeout: 30000 });

// Build the real user prompt under a given tension stage and prior-scene history, which is what
// selects the density branch.
const build = (st, scenes, sceneIndex, aftermath) => page.evaluate((v) => {
  const prevST = window.state.tensionStage;
  const prevScenes = window.state.scenes;
  const prevLen = window.state.storyLength;
  const prevPC = window.state._scenePlotContract;
  try {
    // production selects the aftermath density branch from the recorded plot contract
    window.state._scenePlotContract = v.aftermath
      ? { sceneIndex: v.sceneIndex, aftermathTruths: ['the family has been told'], reservedConstraints: [] }
      : null;
    window.state.tensionStage = v.st;
    window.state.scenes = v.scenes;
    window.state.storyLength = 'taste';
    let out = '';
    try { out = String(window._buildCGScreenplayUserPrompt(v.sceneIndex, '', '') || ''); }
    catch (e) { return { threw: String(e && e.message) }; }
    const grab = (h) => { const m = out.match(new RegExp(h + '[^\\n]{0,900}')); return m ? m[0] : ''; };
    return {
      len: out.length,
      brief: grab('SCENE BRIEF \\(what a FINISHED scene is'),
      density: grab('SCENE DENSITY'),
      ceiling: grab('LENGTH CEILING'),
      hasNoCeilingClaim: out.indexOf('No word-count ceiling applies') !== -1,
      hasObservationOverReaction: out.indexOf('more establishing/observation than reaction') !== -1,
      hasOldBudget: out.indexOf('SCENE BUDGET') !== -1
    };
  } finally {
    window.state.tensionStage = prevST; window.state.scenes = prevScenes;
    window.state.storyLength = prevLen; window.state._scenePlotContract = prevPC;
  }
}, { st, scenes, sceneIndex, aftermath: !!aftermath });

// Branch A: the ST1 setup-pace scene — what Scene 3 (024) received.
const a = await build('ST1', [{ text: 'opening prose' }], 2, false);
console.log('  [ST1 setup pace — Scene 3 in the live run]');
console.log('    density: ' + a.density.slice(0, 150));
console.log('    brief  : ' + a.brief.slice(0, 150));
t('the SCENE BRIEF is present', !!a.brief, JSON.stringify(a).slice(0, 180));
t('the 700-1000 target is in it', /700-1000 words/.test(a.brief), a.brief.slice(0, 120));
t('the density line no longer asks for observation OVER reaction',
  !a.hasObservationOverReaction, 'still present');
t('the density line defers length to the brief',
  /SCENE BRIEF/.test(a.density), a.density.slice(0, 160));

// Branch B: the continuation aftermath scene — what Scene 2 (017) received.
// Selected by state._scenePlotContract carrying aftermath truths with sceneIndex > 0, exactly as
// production does it.
const b = await build('ST1', [{ text: 'opening prose' }, { text: 'scene two prose' }], 3, true);
console.log('\n  [continuation — Scene 2 in the live run]');
console.log('    density: ' + b.density.slice(0, 150));
console.log('    brief  : ' + b.brief.slice(0, 150));
t('the SCENE BRIEF is present here too — it is no longer gated by the ceiling condition',
  !!b.brief, JSON.stringify(b).slice(0, 180));
t('the 700-1000 target is in it', /700-1000 words/.test(b.brief), b.brief.slice(0, 120));
t('nothing claims that no word-count applies', !b.hasNoCeilingClaim, 'claim still present');

// Neither branch may carry the superseded paragraph.
t('the old SCENE BUDGET paragraph is gone from both',
  !a.hasOldBudget && !b.hasOldBudget, 'a=' + a.hasOldBudget + ' b=' + b.hasOldBudget);

// And the brief must say what the words are FOR, in both.
for (const [name, r] of [['ST1', a], ['continuation', b]]) {
  t(name + ': the brief names consequential interaction and refuses stillness-filler',
    /CONSEQUENTIAL INTERACTION/.test(r.brief) && /held breath|stillness/.test(r.brief),
    r.brief.slice(0, 140));
}

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
