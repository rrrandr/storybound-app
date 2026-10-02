// DOES THE COMMIT VERIFIER READ THE SCENE THAT JUST RENDERED? Provider-free, $0.
//
// THE CONFIRMED FAILURE THIS REPLAYS. A full ten-scene FS issue generated nine scenes, sealed a
// proposal in every one, and committed NOTHING: facts 0, activated 0. Tracing every evidence quote
// the verifier produced across the whole issue showed all of them came from ONE file —
// scene_01_prose.txt, the baked opening. Not one quote came from scenes 2-10. The verifier was
// asked "was this transition delivered?" while reading the opening.
//
// THE CAUSE, at app.js ~101764:
//     _prevText = StoryPagination.getAllContent()
//     if ((!_prevText || _prevText.length < 40) && _sbLatestProseText) _prevText = _sbLatestProseText(s)
//     if (_prevText.length >= 40) await _commitScene(_prevText.slice(-5000), ...)
// The projection fallback only fires when pagination is EMPTY OR SHORT. On the CG staged path
// generated scenes never enter StoryPagination (it skips addPage by design) but the BAKED scene 1
// was committed through the normal path at unlock — so pagination holds 7,605 chars of the opening
// forever, the length test passes, and the fallback never runs. `.slice(-5000)` then hands the
// verifier the tail of scene 1 on every adjudication for the rest of the issue.
//
// WHAT THIS CONTROL ASSERTS: the text inside the verifier request's "SCENE PROSE:" block must be
// the prose of the scene being adjudicated, not the baked opening. It is RED on the current code.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { stageOf, isProviderEndpoint, fsPlannerCaptured, AUTHOR as REPLAY_AUTHOR, MEMORY,
  verifierVerdict, refsFromVerifierRequest } from './_replay_fixtures.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview, advanceExpectingGate, chooseBranch }
  from './_fs_story_setup.mjs';

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log('  ok   ' + n); }
  else { fail++; console.log('  FAIL ' + n + (d ? '  — ' + d : '')); } };

console.log('=== DOES THE VERIFIER READ THE RIGHT SCENE? (provider-free, $0) ===\n');

const browser = await chromium.launch();
const page = await browser.newPage();
const verifierRequests = [];
let sceneNo = 1;

await page.route('**/api/**', async (route) => {
  const req = route.request();
  if (!isProviderEndpoint(req.url())) { try { await route.abort(); } catch (_) {} return; }
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = '', usr = '';
  try { const j = JSON.parse(raw || '{}');
    sys = String((j.messages || [])[0]?.content || '');
    usr = String((j.messages || [])[1]?.content || ''); } catch (_) {}
  const stage = stageOf(sys);
  const give = (c) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: c }) });
  if (stage === 'planner') { try { return give(fsPlannerCaptured()); } catch (_) {} }
  if (stage === 'author') return give(REPLAY_AUTHOR);
  if (stage === 'memory') return give(MEMORY);
  if (stage === 'verifier') {
    // CAPTURE THE REQUEST. This is the whole point: what prose was the verifier actually given?
    const m = usr.match(/SCENE PROSE:\s*([\s\S]*?)\s*(?:\n\nReturn the JSON now\.|\n\nPLANNED EVENT SLOTS)/);
    verifierRequests.push({ scene: sceneNo, prose: m ? m[1].trim() : null, userLen: usr.length });
    return give(verifierVerdict(refsFromVerifierRequest(usr)));
  }
  try { await route.abort(); } catch (_) {}
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._launchStarterStory === 'function'
  && typeof window._advanceStagedScene === 'function', { timeout: 30000 });

const def = await findFSDef(page);
await launchFS(page, def);
const unlock = await unlockFS(page, 'wrong-prose-control');
await finalizePreview(page);
const bakedProse = String(unlock.state.scene0 || '');
t('the baked opening is committed and non-trivial', bakedProse.length >= 1000,
  'len=' + bakedProse.length);

const readToGate = () => page.evaluate(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const st = () => { const a = window.state._stagedActive || null;
    return a ? { beat: a.currentBeatIdx, gateShown: !!a.gateShown, microShown: !!a.microShown } : null; };
  if (!st()) return false;
  for (let i = 0; i < 240; i++) {
    const cur = st(); if (!cur || cur.gateShown) break;
    const prev = cur.beat;
    try { window._advanceStagedBeat(); } catch (_) {}
    await sleep(50);
    const nxt = st();
    if (nxt && nxt.beat === prev && !nxt.gateShown) {
      if (!nxt.microShown && typeof window._resolveMicroDecision === 'function') {
        try { window._resolveMicroDecision(0); } catch (_) {}
        await sleep(70);
      } else await sleep(100);
    }
  }
  return true;
});

// SCENE 2: the axis, then generation.
sceneNo = 2;
await advanceExpectingGate(page, '', '');
await chooseBranch(page, 'A');
const dl = Date.now() + 180000;
while (Date.now() < dl) {
  const m = await page.evaluate(() => { const a = window.state._stagedActive;
    return !!(a && a.plan && Array.isArray(a.plan.beats) && a.plan.beats.length); });
  if (m) break;
  await new Promise(r => setTimeout(r, 1000));
}
await readToGate();
const scene2Prose = await page.evaluate(() => {
  try { return String(window._sbLatestProseText(window.state) || ''); } catch (_) { return ''; }
});
t('scene 2 rendered its own prose through the projection', scene2Prose.length >= 200,
  'len=' + scene2Prose.length);
t('and it is NOT the baked opening', scene2Prose !== bakedProse);

// SCENE 3: advancing here is what makes _commitScene adjudicate scene 2.
sceneNo = 3;
await page.evaluate(() => {
  const opts = Array.isArray(window.state.fateOptions) ? window.state.fateOptions : [];
  if (opts.length) { const el = document.querySelector('[data-card-index="0"]'); if (el) el.click(); }
  try { window._advanceStagedScene('', ''); } catch (_) {}
});
const dl2 = Date.now() + 180000;
while (Date.now() < dl2 && !verifierRequests.length) await new Promise(r => setTimeout(r, 1000));
await new Promise(r => setTimeout(r, 4000));
await browser.close();

console.log('\nWHAT THE VERIFIER WAS GIVEN');
t('the verifier was dispatched at all', verifierRequests.length > 0,
  'no verifier request captured');
if (!verifierRequests.length) {
  console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
  process.exit(fail ? 1 : 0);
}
const vr = verifierRequests[0];
const given = String(vr.prose || '');
console.log('   SCENE PROSE block: ' + given.length + ' chars');
console.log('   first 110: ' + given.slice(0, 110).replace(/\s+/g, ' '));
t('the SCENE PROSE block was extracted from the request', given.length > 0,
  'could not find a SCENE PROSE block; userLen=' + vr.userLen);

// THE TWO ASSERTIONS THAT MATTER. The verifier judged scene 2, so it must have been given scene 2.
// NORMALISE BOTH SIDES BEFORE COMPARING. StoryPagination.getAllContent() strips tags and collapses
// whitespace; the projection keeps its newlines. Comparing raw made the control report "matches
// neither", which is a useless red - it has to be able to say WHICH prose was handed over.
const norm = (x) => String(x || '').replace(/\s+/g, ' ').trim();
const nGiven = norm(given), nBaked = norm(bakedProse), nScene2 = norm(scene2Prose);
const probe = nGiven.slice(0, 120);
const inBaked = nBaked.length > 0 && nBaked.includes(probe);
const inScene2 = nScene2.length > 0 && nScene2.includes(probe);
console.log('   the given text appears in the baked opening : ' + inBaked);
console.log('   the given text appears in scene 2 prose      : ' + inScene2);
t('THE VERIFIER WAS GIVEN THE SCENE IT IS JUDGING, not the baked opening',
  inScene2 === true && inBaked === false,
  inBaked ? 'it was handed the BAKED OPENING — this is the confirmed failure'
    : 'the given text matches neither; inspect the request');
t('and scene 2\'s own opening line is present in what it was given',
  nGiven.length >= 200 && nGiven.indexOf(nScene2.slice(0, 80)) >= 0,
  'scene 2\'s opening line is absent from the prose the verifier received');

console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
console.log('\nSMALLEST REPAIR (app.js ~101764): on the staged/CG path prefer the per-scene');
console.log('projection over StoryPagination, instead of treating pagination as authoritative');
console.log('whenever it is merely non-empty. Pagination is correct for the literary path; on the');
console.log('CG path it holds only the baked opening, forever.');
process.exit(fail ? 1 : 0);
