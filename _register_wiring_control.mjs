// DOES THE REGISTER EXEMPLAR REACH THE REAL OUTGOING AUTHOR REQUEST? Provider-free, $0.
//
// "Wired" means the VALUE reaches the PAYLOAD. This control therefore asserts ONLY against a
// request intercepted on its way out of the app. It calls no prompt builder directly and reads no
// source file. IF NO AUTHOR REQUEST IS CAPTURED, EVERY CHECK IS UNPROVEN AND THE CONTROL FAILS —
// an uncaptured request is never reported green.
import { chromium } from 'playwright-core';
import { findFSDef, launchFS, unlockFS, finalizePreview } from './_fs_story_setup.mjs';
import { stageOf, isProviderEndpoint, plannerFor, MEMORY, verifierVerdict } from './_replay_fixtures.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

const browser = await chromium.launch();
const page = await browser.newPage();
const captured = [];
let sceneN = 1;
await page.route('**/api/**', async (route) => {
  const req = route.request();
  if (!isProviderEndpoint(req.url())) { try { await route.abort(); } catch (_) {} return; }
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let msgs = []; try { msgs = (JSON.parse(raw || '{}').messages) || []; } catch (_) {}
  const sys = String((msgs[0] || {}).content || '');
  const stage = stageOf(sys);
  if (stage === 'author') {
    // CAPTURE THE REAL OUTGOING REQUEST — every message, exactly as it goes on the wire.
    captured.push({ sys, whole: msgs.map(m => String(m.content || '')).join('\n'), url: req.url() });
    try { await route.abort(); } catch (_) {}
    return;
  }
  // Upstream stages are served from fixtures so the author is actually REACHED. No provider call
  // is made at any point; nothing here is paid and no prose is generated.
  let body = '{}';
  if (stage === 'planner') body = plannerFor(sceneN++);
  else if (stage === 'memory') body = MEMORY;
  else if (stage === 'verifier') body = verifierVerdict([]);
  else if (stage === 'bible') body = JSON.stringify({ ok: true });
  try {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: body }) });
  } catch (_) {}
});
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function', { timeout: 30000 })
  .catch(() => {});
const def = await findFSDef(page);
await launchFS(page, def);
await unlockFS(page, 'register-wiring');
await finalizePreview(page);
const dispatcher = await page.evaluate(() => typeof window._runCGScreenplayGen);
console.log('production dispatcher _runCGScreenplayGen: ' + dispatcher);
for (let i = 0; i < 6 && !captured.length; i++) {
  try {
    await page.evaluate(() => {
      try { window._runCGScreenplayGen && window._runCGScreenplayGen(0, '', ''); } catch (_) {}
    });
  } catch (_) {}
  await page.waitForTimeout(3000);
}

console.log('author requests intercepted: ' + captured.length);
if (!captured.length) {
  console.log('\n  UNPROVEN — no outgoing screenplay-author request was captured.');
  console.log('  Nothing below can be asserted. This is a FAILURE, not a pass.');
  await browser.close();
  process.exit(1);
}
const req = captured[0];
console.log('  captured from: ' + req.url + '  (' + req.whole.length + ' chars)');
const W = req.whole;

console.log('\n=== THE PERMISSION AND ITS PAIRED EXEMPLAR, IN THE PAYLOAD ===');
t('the permission reached the request', /LENGTH FOLLOWS THE MOMENT/.test(W));
t('"commonly two to four sentences" reached it', /commonly two to four sentences/.test(W));
t('a ONE-LINE beat is shown as correct', /A MOMENT THAT NEEDS ONE LINE/.test(W));
t('a DEVELOPED beat is shown beside it', /A MOMENT THAT EARNS DEVELOPMENT/.test(W));
t('neither is framed as the target', /The second is not better than the first/.test(W));
t('the examples are labelled as illustrations of pacing only',
  /These are ILLUSTRATIONS/.test(W) && /no names, places or objects from them belong in your scene/.test(W));

console.log('\n=== THE SHARED PROMPT CARRIES NO FIRST SACRIFICE MATERIAL IN ITS EXAMPLE ===');
const exStart = W.indexOf('A MOMENT THAT NEEDS ONE LINE');
const exBlock = exStart >= 0 ? W.slice(exStart, exStart + 700) : '';
for (const name of ['Julian', 'Dohkar', 'Lirael', 'Seren', 'The Answer'])
  t('the example does not name ' + name, !new RegExp('\\b' + name + '\\b').test(exBlock));

console.log('\n=== NO BLANKET LENGTH REQUIREMENT WAS INTRODUCED ===');
t('no minimum sentence count is imposed',
  !/minimum of (two|2)\s+sentences/i.test(W) && !/every beat must be (two|2)/i.test(W));
t('deliberate one-line beats remain permitted', /ONE sharp sentence when that is all it needs/.test(W));
t('the final beat is still exactly one sentence', /The FINAL beat of the scene is EXACTLY ONE SENTENCE/.test(W));
t('attribution still keeps speech out of narration beats',
  /A dialogue beat's "text" is JUST the spoken line/.test(W));

console.log('\n=== THE EXEMPLAR IS NOT GLUED TO THE RULE THAT FOLLOWS IT ===');
t('a line break separates it from the next rule',
  /moment held more\.\s*\n\s*-\s*ACROSS THE SCENE/.test(W),
  JSON.stringify(W.slice(W.indexOf('moment held more'), W.indexOf('moment held more') + 70)));

await browser.close();
console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
process.exit(fail ? 1 : 0);
