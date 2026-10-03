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
const proseByScene = {};
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
    // The verifier adjudicates the PREVIOUS scene, so a request seen while advancing into scene N
    // is judging scene N-1.
    verifierRequests.push({ scene: sceneNo, judged: sceneNo - 1,
      prose: m ? m[1].trim() : null, userLen: usr.length });
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
proseByScene[2] = scene2Prose;
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
// Scene 4 as well, so consecutive adjudications are covered rather than one lucky one.
const scene3Prose = await page.evaluate(() => {
  try { return String(window._sbLatestProseText(window.state) || ''); } catch (_) { return ''; }
});
proseByScene[3] = scene3Prose;
await readToGate();
sceneNo = 4;
await page.evaluate(() => {
  const el = document.querySelector('[data-card-index="0"]'); if (el) el.click();
  try { window._advanceStagedScene('', ''); } catch (_) {}
});
const dl3 = Date.now() + 180000;
while (Date.now() < dl3 && verifierRequests.length < 2) await new Promise(r => setTimeout(r, 1000));
await new Promise(r => setTimeout(r, 3000));
const pagination = await page.evaluate(() => {
  try {
    return (typeof StoryPagination !== 'undefined' && StoryPagination.getAllContent)
      ? String(StoryPagination.getAllContent()).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
  } catch (_) { return ''; }
});
await page.close();
const browser2 = browser;

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

// ── CASE 2: A POPULATED, STALE PAGINATION BUFFER ────────────────────────────
// This is the live condition, not a hypothetical: the baked opening really is in pagination, and
// it really is thousands of characters long. The assertion is that its presence no longer decides
// what the verifier reads.
console.log('\nCASE 2 — pagination holds the baked opening; it must not be what is judged');
// WHY A PLAIN SUBSTRING TEST FAILED HERE. Pagination is a DIFFERENT RENDERING of the same prose:
// it prefixes speaker tags ("[Lirael] ") and spaces punctuation ("Veilwood ,"), so it is 7,677
// chars against the projection's 7,605 and no exact span matches. Comparing on letters and digits
// alone identifies the content without pretending the two renderings are byte-identical.
const alnum = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')
  .replace(/\s+/g, ' ').trim();
// TOKEN OVERLAP, NOT A SPAN. Pagination interleaves speaker tags INSIDE the prose, so any fixed
// window that crosses a tag differs no matter how it is normalised — which is why two attempts at
// a windowed probe failed on content that is plainly the same text. Overlap of distinctive words
// identifies the content without requiring the two renderings to agree character by character.
const toks = (x) => new Set(alnum(x).split(' ').filter(w => w.length >= 5));
const tPag = toks(pagination), tBaked = toks(bakedProse);
let shared = 0;
tBaked.forEach(w => { if (tPag.has(w)) shared++; });
const overlap = tBaked.size ? shared / tBaked.size : 0;
t('pagination was in fact populated with the baked opening (a different rendering of it)',
  pagination.length >= 1000 && overlap >= 0.9,
  'paginationLen=' + pagination.length + ' bakedLen=' + bakedProse.length
  + ' tokenOverlap=' + (overlap * 100).toFixed(1) + '%');
t('and the verifier was given the projection anyway, not pagination',
  inScene2 === true, 'the stale buffer still won');

// ── CASE 3: CONSECUTIVE SCENES ──────────────────────────────────────────────
// One correct adjudication could be luck. Each scene must be judged against ITS OWN prose.
console.log('\nCASE 3 — consecutive scenes each judged against their own prose');
console.log('   captured ' + verifierRequests.length + ' verifier request(s)');
verifierRequests.forEach((v, i) => {
  const g = norm(v.prose || '');
  const own = norm(proseByScene[v.judged] || '');
  const isBaked = nBaked.includes(g.slice(0, 120));
  console.log('     request ' + (i + 1) + ' (judging scene ' + v.judged + '): '
    + (own && own.includes(g.slice(0, 120)) ? 'its own prose'
      : (isBaked ? 'THE BAKED OPENING' : 'unmatched')));
});
t('every captured request was judged against its own scene, never the opening',
  verifierRequests.length > 0 && verifierRequests.every((v) => {
    const g = norm(v.prose || '');
    const own = norm(proseByScene[v.judged] || '');
    return g.length > 0 && own.length > 0 && own.includes(g.slice(0, 120));
  }),
  JSON.stringify(verifierRequests.map(v => ({ judged: v.judged, len: (v.prose || '').length }))));

// ── CASE 4: A MISSING PROJECTION MUST STOP ADJUDICATION ─────────────────────
// The old code fell back to an older scene. The repair must refuse instead, and say so.
console.log('\nCASE 4 — with no projection for the scene, adjudication must STOP, not fall back');
{
  const page2 = await browser2.newPage();
  const aborts = [];
  page2.on('console', (m) => {
    const x = m.text();
    if (/\[COMMIT-SCENE:(ABORT|SKIP|PROSE)\]/.test(x)) aborts.push(x);
  });
  await page2.route('**/api/**', r => r.abort());
  await page2.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page2.waitForFunction(() => typeof window._launchStarterStory === 'function', { timeout: 30000 });
  const d2 = await findFSDef(page2);
  await launchFS(page2, d2);
  const u2 = await unlockFS(page2, 'missing-projection-case');
  await finalizePreview(page2);
  // The baked opening is committed and is the ONLY projection. A pending transition is set so the
  // commit path runs, then the advance is attempted: the newest projection IS the opening, which is
  // exactly the state the guard must refuse.
  // THE DECISION GATE COMES FIRST. _advanceStagedScene refuses and mounts the prompt until the
  // reader's choice is recorded, returning BEFORE the commit block — so without this the run logs
  // nothing and the empty diagnostic array looks like a missing guard.
  await advanceExpectingGate(page2, '', '');
  await chooseBranch(page2, 'A');
  await new Promise(r => setTimeout(r, 2000));
  const res = await page2.evaluate(async () => {
    window.state._priorSceneStateChange = { event: 'the presiding Dohkar calls for a preliminary review',
      sceneProposed: 2, slots: { precondition: 'x', actor: 'the presiding Dohkar',
        action: 'calls for a preliminary review', target: 'Lirael', exitState: 'her conduct is in question' } };
    const before = (window.state.scenes || []).length;
    try { await window._advanceStagedScene('', ''); } catch (_) {}
    return { scenes: before, onlyProjectionIsBaked: before === 1 };
  });
  await new Promise(r => setTimeout(r, 4000));
  t('the only projection present was the baked opening', res.onlyProjectionIsBaked === true,
    'scenes=' + res.scenes);
  const abortLine = aborts.filter(x => /ABORT/.test(x))[0] || null;
  t('adjudication was REFUSED with a diagnostic naming the baked opening',
    !!abortLine && /BAKED OPENING/.test(abortLine),
    JSON.stringify(aborts.slice(0, 3)));
  if (abortLine) console.log('     ' + abortLine.slice(0, 180));
  t('and it did NOT silently judge an older scene',
    !aborts.some(x => /\[COMMIT-SCENE:PROSE\]/.test(x)),
    JSON.stringify(aborts.filter(x => /PROSE/.test(x))));
  await page2.close();
}
await browser2.close();

console.log('\n' + pass + '/' + (pass + fail) + ' checks passed');
console.log('\nSMALLEST REPAIR (app.js ~101764): on the staged/CG path prefer the per-scene');
console.log('projection over StoryPagination, instead of treating pagination as authoritative');
console.log('whenever it is merely non-empty. Pagination is correct for the literary path; on the');
console.log('CG path it holds only the baked opening, forever.');
process.exit(fail ? 1 : 0);
