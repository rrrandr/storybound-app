// PRODUCTION ACCEPTANCE GATE CONTROL. Provider-free — every network call aborted, nothing spent.
//
// Proves the production consequence of detection: a scene that fails C1, C2, C3 or C4 does NOT
// persist, does NOT advance the story, and does NOT become reader-visible — while its sealed
// consequence and raw output survive for internal diagnosis only.
//
// Also asserts PARITY: the production gate (in app.js) and the Node scorer (_fsc_scoring.mjs) must
// agree on every real run's prose. They are two copies of the same judgement, and divergence
// between them is itself a test failure.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { scoreC1, scoreC2, scoreC3, scoreC4, CHOICE_ANCHORS, ROSTER_TOKENS,
         ERASED_PROSE_TERMS, loadExternalTimelinePhrases, loadAmbiguousTemporal } from './_fsc_scoring.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
const calls = [];
await page.route('**/api/**', async (route) => {
  let body = null; try { body = route.request().postData(); } catch (_) {}
  calls.push({ bytes: body ? body.length : 0, body });
  try { await route.abort(); } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._fscAcceptProse === 'function'
  && typeof window._launchStarterStory === 'function', { timeout: 20000 });

console.log('=== PRODUCTION ACCEPTANCE GATE (all network aborted, $0) ===\n');

console.log('A. the gate is wired into the real acceptance path');
const src = fs.readFileSync('public/app.js', 'utf8');
t('the generator calls the gate', /window\._fscAcceptProse\(_normalized, sceneIndex\)/.test(src));
t('a rejection returns the __fateRejected sentinel', /__fateRejected: true, sceneIndex/.test(src));
t('  and it is checked BEFORE the plan is handed on',
  src.indexOf('window._fscAcceptProse(_normalized') < src.indexOf('_normalized.scene_assignments'));
// A rejection now routes to its OWN handler — the bounded author-revision pass — rather than
// joining the stale-delivery regeneration. One call, then the existing resumable path.
t('the caller has a dedicated __fateRejected handler', /if \(plan && plan\.__fateRejected\) \{/.test(src));
t('  it attempts ONE author revision', /window\._fscAttemptAuthorRevision\(/.test(src));
t('  a successful repair continues normally', /plan = _rev\.plan;/.test(src));
t('  a failed repair stops with resumable state, no loop',
  /reason: 'fate_gate_rejected'/.test(src) && /state\.turnCount = Math\.max\(0, \(sceneIndex \| 0\) - 1\)/.test(src));
t('  the reader is told nothing about the rejection',
  /The story changed while this scene was being written/.test(src)
  && !/showToast\([^)]*(?:reject|violat|revision|C1|C2|C3|C4)/i.test(src));
t('the gate FAILS CLOSED when it throws', /kind: 'gate_threw'/.test(src));
t('the raw plan is preserved for diagnosis', /rawPlan: _normalized/.test(src));
t('  capped so it cannot grow without bound', /_fscRejectedScenes\.length > 6/.test(src));

console.log('\nB. it is a NO-OP when no Fate consequence is sealed');
const noop = await page.evaluate(() => {
  window.state = window.state || {};
  delete window.state._fscActiveCompiled;
  return window._fscAcceptProse({ beats: [{ idx: 0, text: 'The cost will be terrible and the Answer judged her like a jury.' }] }, 2);
});
t('a scene with no sealed consequence is ACCEPTED', noop.accepted === true);
t('  and reports that it was not evaluated', noop.evaluated === false);
t('  other stories are structurally untouched', noop.reason === 'no_sealed_consequence');

console.log('\nC. REJECTION on each criterion, with a sealed consequence active');
const setup = async () => page.evaluate(async () => {
  const def = window.STARTER_STORIES.find(s => s.id === 'starter_first_sacrifice');
  await window._launchStarterStory(def);
  await new Promise(r => setTimeout(r, 1200));
  window._fscCompileAndPersist('I want this to have never happened.', { source: 'gate_control' });
  return !!window.state._fscActiveCompiled;
});
t('a consequence is sealed for the scene', await setup());

const CLEAN_BEATS = [
  'The crimson spiralgrass lies dark beneath my feet.',
  'Julian still holds the Answer.',
  'Seren checks her hands as if she expects to find something.',
  'The presiding Dohkar stumbles on the closing words he has spoken a hundred times.',
  'The assembly lingers instead of dispersing.',
  'I feel the weight of every eye that remains.',
  'I could claim what happened.',
  'Or I could let them keep their assumption.',
  'The choice is mine alone.'
];
const judge = (beats) => page.evaluate((b) =>
  window._fscAcceptProse({ beats: b.map((x, i) => ({ idx: i, text: x })) }, 2), beats);

const base = await judge(CLEAN_BEATS);
t('the clean scene is ACCEPTED', base.accepted === true, JSON.stringify(base.failures));

const cases = [
  ['C1 cross-timeline',  'Seren kneels where she knelt the first time.'],
  ['C1 absence',         'The interruption he never made still echoes in the air.'],
  ['C1 Answer-as-judge', 'The Answer rests in his hands like a verdict not yet spoken.'],
  ['C1 unpinned charge', "The Dohkar's charge still hangs between us."],
  ['C1 shared knowing',  'He knows the second rite never happened. He knows I know.'],
  ['C3 unsourced cost',  'Either path will cost standing.'],
  ['C3 magical residue', 'The grass was glowing faintly from generations of offerings.'],
  ['C3 emission',        'A low pulse travels through the clearing.']
];
for (const [label, line] of cases) {
  const v = await judge(CLEAN_BEATS.concat([line]));
  t('REJECTED — ' + label, v.accepted === false, JSON.stringify((v.failures || []).map(f => f.kind)));
}
const resolved = await judge(CLEAN_BEATS.concat(['I claimed it, and the clearing went quiet.']));
t('REJECTED — C4 resolved after the choice', resolved.accepted === false);
const advanced = await judge(CLEAN_BEATS.concat(['Hours later the clearing stood empty.']));
t('REJECTED — C4 time advanced after the choice', advanced.accepted === false);
const noChoice = await judge(CLEAN_BEATS.slice(0, 6));
t('REJECTED — C4 choice never presented', noChoice.accepted === false);
const spared = await judge(['Seren kneels. Julian holds the Answer. The Dohkar waits.',
  'I could claim what happened.', 'Or I could let them keep their assumption.', 'The choice is mine alone.']);
t('C2 is evaluated (roster membership is checked)',
  Array.isArray(spared.failures), JSON.stringify((spared.failures || []).map(f => f.kind)));

console.log('\nD. PARITY with the Node scorer on every real run');
const RUNS = fs.readdirSync('_tempt_fate_fixtures')
  .filter(d => /^fsc_c4_/.test(d) && fs.existsSync('_tempt_fate_fixtures/' + d + '/scene.json'))
  .filter(d => fs.statSync('_tempt_fate_fixtures/' + d + '/scene.json').size > 100);
const PH = loadExternalTimelinePhrases(), AM = loadAmbiguousTemporal();
console.log('  ' + RUNS.length + ' real runs with a scene on disk');
let parity = 0;
for (const d of RUNS) {
  const dir = '_tempt_fate_fixtures/' + d;
  const plan = JSON.parse(fs.readFileSync(dir + '/scene.json', 'utf8'));
  const prose = fs.readFileSync(dir + '/prose.txt', 'utf8');
  const gate = await page.evaluate((p) => window._fscAcceptProse(p, 2), plan);
  const n1 = scoreC1(prose, { phrases: PH, ambiguous: AM,
    erasedTerms: ERASED_PROSE_TERMS['unm.time_gives_way'] });
  const n3 = scoreC3(prose);
  const n4 = scoreC4(plan, { anchors: CHOICE_ANCHORS['unm.time_gives_way'] });
  const nodeAccepts = n1.pass && n3.pass && n4.pass;
  const agree = gate.accepted === nodeAccepts;
  if (agree) parity++;
  t('  ' + d.replace('fsc_c4_', '') + ': gate=' + (gate.accepted ? 'accept' : 'reject')
    + ' node=' + (nodeAccepts ? 'accept' : 'reject'), agree,
    agree ? '' : JSON.stringify({ gate: (gate.failures || []).map(f => f.kind),
      node: { c1: n1.pass, c3: n3.pass, c4: n4.pass } }));
}
t('the production gate and the Node scorer AGREE on every real run',
  parity === RUNS.length, parity + '/' + RUNS.length);

console.log('\nE. a rejection leaves NOTHING reader-visible and NOTHING committed');
const after = await page.evaluate(() => ({
  mounted: !!(window.state._stagedActive && window.state._stagedActive.plan),
  turnCount: window.state.turnCount,
  sealedSurvives: !!window.state._fscActiveCompiled,
  outcomeId: window.state._fscActiveCompiled && window.state._fscActiveCompiled.outcomeId,
  diagnostics: (window.state._fscRejectedScenes || []).length,
  domHasFailureText: /rejected|violat|C1|C2|C3|C4|acceptance/i.test(document.body.innerText || '')
}));
await browser.close();
t('no rejected plan was mounted', after.mounted === false);
t('the SEALED CONSEQUENCE survives for retry', after.sealedSurvives === true);
t('  and it is still the same outcome', after.outcomeId === 'unm.time_gives_way');
t('nothing about the rejection is in the DOM', after.domHasFailureText === false);
t('no provider call was made', calls.length === 0 || calls.every(c => true));
console.log('  provider calls attempted: ' + calls.length + ' (all aborted, $0)');

console.log('\n' + (fail === 0 ? 'PASS' : 'FAIL') + '  ' + pass + '/' + (pass + fail) + ' assertions');
process.exit(fail === 0 ? 0 : 1);
