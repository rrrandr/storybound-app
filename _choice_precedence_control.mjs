// DOES THE READER'S RECORDED ACTION OUTRANK THE SCHEDULED EVENT? Provider-free, $0.
//
// MEASURED FAILURE. The reader chose "run in shame"; the prose has her standing still. The planner
// obeyed its instruction, which gave the choice ONE field — lane_posture_modulation, "who pushes,
// what tone, what she risks" — and said in terms that posture "does NOT change WHICH event happens".
// A chosen ACTION was contractually demoted to a mood, then the mood prevented the action.
//
// The repair is a THIRD MODE on the EXISTING _buildEventFramePrecedence, which already knew how to
// yield to a Tempt Fate rupture. Compatibility is DECLARED by the seed, never guessed from keywords.
import { chromium } from 'playwright-core';
import { findFSDef, launchFS, unlockFS, finalizePreview, advanceExpectingGate, chooseBranch }
  from './_fs_story_setup.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
console.log('=== CHOICE PRECEDENCE (provider-free, $0) ===\n');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._buildEventFramePrecedence === 'function'
  && typeof window._recordedChoiceDisplacesFrame === 'function', { timeout: 30000 });

const FRAME = { laneId: 'dohkar_preliminary_review',
  eventFrame: 'The presiding Dohkar calls for a preliminary review before the assembly.' };

console.log('1. the three modes exist on ONE function, and are distinct');
{
  const modes = await page.evaluate((f) => ({
    required: window._buildEventFramePrecedence(f, ['a'], false, null).mode,
    rupture: window._buildEventFramePrecedence(f, ['a'], true, null).mode,
    displaced: window._buildEventFramePrecedence(f, ['a'], false, { displaces: true, choice: 'run', label: 'run in shame' }).mode,
    none: window._buildEventFramePrecedence(null, ['a'], false, null).mode
  }), FRAME);
  t('an ordinary scene is still "required" — unchanged default', modes.required === 'required', modes.required);
  t('a Tempt Fate rupture is still "superseded" — untouched', modes.rupture === 'superseded', modes.rupture);
  t('a displacing choice yields the NEW "displaced" mode', modes.displaced === 'displaced', modes.displaced);
  t('no resolved frame is still "none"', modes.none === 'none', modes.none);
}

console.log('\n2. the displaced directive forbids the exact failure that was measured');
{
  const d = await page.evaluate((f) => window._buildEventFramePrecedence(f, ['a'], false,
    { displaces: true, choice: 'run', label: 'run in shame' }), FRAME);
  t('the action must be the CENTRAL EVENT', /CENTRAL EVENT/.test(d.directive));
  t('it must be attempted and visibly occur or be physically prevented on the page',
    /ATTEMPTED/.test(d.directive) && /physically prevented/.test(d.directive));
  t('it may NOT be reinterpreted as a feeling, impulse or posture',
    /may not\s+be reinterpreted as a feeling, an impulse, a temptation, or a posture/i.test(d.directive));
  t('"she wanted to and did not" is named as the failure to prevent',
    /wanted to and did not/i.test(d.directive));
  t('the schedule may defer, accommodate or be replaced — and must say which',
    /DEFERRED/.test(d.directive) && /ACCOMMODATED/.test(d.directive) && /REPLACED/.test(d.directive));
  t('pursuit or proceeding in her absence is allowed as a CONSEQUENCE',
    /pursue her, summon her back, or proceed in her absence/.test(d.directive));
  t('keeping her in place to run the schedule is explicitly not allowed',
    /silently keeping her in place/.test(d.directive));
  t('the lane is no longer forced', /NOT forced to/.test(d.jsonRequirement));
  t('state_change must be what she did, not the scheduled event with a mood attached',
    /not the scheduled event with her mood attached/.test(d.jsonRequirement));
}

console.log('\n3. the REQUIRED mode is untouched for a compatible choice');
{
  const r = await page.evaluate((f) => window._buildEventFramePrecedence(f, ['a'], false,
    { displaces: false, choice: 'remain' }), FRAME);
  t('a non-displacing choice still gets the hard frame', r.mode === 'required');
  t('and it still says posture does not change WHICH event happens',
    /does NOT change WHICH event happens/.test(r.directive));
}

console.log('\n4. COMPATIBILITY IS DECLARED, NOT GUESSED');
{
  const def = await findFSDef(page);
  await launchFS(page, def); await unlockFS(page, 'precedence-control'); await finalizePreview(page);
  const declared = await page.evaluate(() => {
    const em = window.state._bakedEmitted || {};
    return (em.axes && em.axes.displacingChoices) || null;
  });
  t('the seed declares its displacing choices', Array.isArray(declared) && declared.includes('run'),
    JSON.stringify(declared));
  const before = await page.evaluate((f) => window._recordedChoiceDisplacesFrame(window.state, f), FRAME);
  t('with NO choice recorded, nothing is displaced', before.displaces === false, JSON.stringify(before));

  await advanceExpectingGate(page, '', '');
  await chooseBranch(page, 'A');                                   // button A = run
  const after = await page.evaluate((f) => window._recordedChoiceDisplacesFrame(window.state, f), FRAME);
  t('after recording "run", the frame IS displaced', after.displaces === true, JSON.stringify(after));
  t('and the reason is the seed declaration, not a keyword match',
    /declared situation-changing by the seed/.test(after.why || ''), after.why);

  // AN UNDECLARED SEED IS NEVER DISPLACED — the heuristic-free guarantee.
  const noDecl = await page.evaluate((f) => {
    const keep = window.state._bakedEmitted.axes.displacingChoices;
    delete window.state._bakedEmitted.axes.displacingChoices;
    const r = window._recordedChoiceDisplacesFrame(window.state, f);
    window.state._bakedEmitted.axes.displacingChoices = keep;
    return r;
  }, FRAME);
  t('a Book declaring nothing is NEVER displaced, even saying "run"',
    noDecl.displaces === false && /declares no displacing choices/.test(noDecl.why), JSON.stringify(noDecl));

  // A FRAME MAY DECLARE IT ABSORBS THE CHOICE.
  const absorbed = await page.evaluate((f) => window._recordedChoiceDisplacesFrame(window.state,
    Object.assign({}, f, { absorbs: ['run'] })), FRAME);
  t('a frame that declares it absorbs the choice is NOT displaced',
    absorbed.displaces === false && /absorbs this choice/.test(absorbed.why), JSON.stringify(absorbed));
}

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
