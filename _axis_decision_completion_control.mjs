// A RECORDED DECISION MUST ANSWER THE AXIS. Provider-free, $0.
//
// MEASURED: submitting at the authored Dohkar interruption records
//   { choice: 'posture', label: '<the reader's own words>', source: 'interruption_submit' }
// and that satisfied _sceneDecisionNeeded(), SUPPRESSING the run-or-remain prompt. The reader was
// never asked the authored question; the stored "choice" was a placeholder, not an answer; and the
// scheduled frame could not be displaced because 'posture' is not a declared displacing choice.
//
// The interruption collects say/do, not run-or-remain. No handler is changed here and no second
// prompt is added — the existing prompt is simply no longer skipped.
import { chromium } from 'playwright-core';
import { findFSDef, launchFS, unlockFS, finalizePreview } from './_fs_story_setup.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };
console.log('=== AXIS DECISION COMPLETION (provider-free, $0) ===\n');

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', r => r.abort());
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._launchStarterStory === 'function', { timeout: 30000 });
const def = await findFSDef(page);
await launchFS(page, def); await unlockFS(page, 'axis-completion'); await finalizePreview(page);

const axis = await page.evaluate(() => {
  const a = window._sceneDecisionAxis();
  return a ? { axis: a.axis, a: a.a.key, b: a.b.key } : null;
});
console.log('     axis: ' + JSON.stringify(axis));
t('the Book declares a two-branch axis', !!axis && !!axis.a && !!axis.b);

const setChoice = (choice, source) => page.evaluate(({ c, src }) => {
  window.state._sceneDecisions = {};
  window.state._sceneDecisionPlaceholderLogged = false;
  if (c !== null) window._recordSceneDecision(1, c, 'label for ' + c, src || 'test');
  return { needed: window._sceneDecisionNeeded(),
    stored: (window.state._sceneDecisions || {})['1'] || null };
}, { c: choice, src: source });

console.log('\n1. nothing recorded — the decision is open');
t('no record means the decision is needed', (await setChoice(null)).needed === true);

console.log('\n2. a GENERIC record does not answer the axis');
for (const [c, src] of [['posture', 'interruption_submit'], ['submitted', 'oas_exit'],
  ['yes', 'resume'], ['', 'test']]) {
  const r = await setChoice(c || null, src);
  t('"' + (c || '(empty)') + '" (source=' + src + ') leaves the decision OPEN',
    r.needed === true, JSON.stringify(r.stored));
}

console.log('\n3. an AXIS BRANCH answers it');
for (const k of [axis.a, axis.b]) {
  const r = await setChoice(k, 'oas_exit');
  t('"' + k + '" closes the decision', r.needed === false, JSON.stringify(r.stored));
  const upper = await setChoice(k.toUpperCase(), 'oas_exit');
  t('"' + k.toUpperCase() + '" closes it too — case is not the discriminator',
    upper.needed === false);
}

console.log('\n4. the interruption\'s own record is the measured case');
{
  const r = await page.evaluate(() => {
    window.state._sceneDecisions = {};
    window._recordSceneDecision(1, 'posture', 'I turn away from the clearing and walk.',
      'interruption_submit');
    return { needed: window._sceneDecisionNeeded(),
      stored: (window.state._sceneDecisions || {})['1'] };
  });
  t('the exact interruption_submit record no longer suppresses the prompt', r.needed === true,
    JSON.stringify(r.stored));
  t('and the reader\'s words are still preserved on the record',
    /turn away from the clearing/.test((r.stored || {}).label || ''), JSON.stringify(r.stored));
}

console.log('\n5. a Book with no axis is unaffected');
{
  const r = await page.evaluate(() => {
    const keep = window.state._bakedEmitted;
    window.state._bakedEmitted = {};
    const needed = window._sceneDecisionNeeded();
    window.state._bakedEmitted = keep;
    return needed;
  });
  t('no declared axis means no decision is required', r === false);
}

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
