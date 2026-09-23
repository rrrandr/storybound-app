// TEMPT FATE WISH-SEAL CONTAINMENT CONTROL — dry proof that sealing a real wish cannot bypass the
// no-spend / no-image controls (Roman, 2026-09-23, post-incident).
//
// WHY THIS EXISTS. During the authorized live run, clicking the real Proceed button dispatched a
// real gpt-4o-mini classifier call (_classifyWishCG) that no revision of the authorization sheet
// had declared. The mechanism of that escape is the thing this control has to close: the classifier
// rides /api/chatgpt-proxy — the SAME endpoint Scene A/B's own terminal tier needs a real lane for.
// A role that shares an endpoint with an allowed role inherits its real lane. "I didn't declare a
// scene lane" is therefore NOT evidence that nothing could dispatch, and this control proves the
// actual containment instead of assuming it.
//
// HOW THIS SCRIPT IS ITSELF SAFE (two independent mechanisms, stated so the claim is auditable):
//   Section 1  — no real lane and no stub for any provider path: every attempt hits the gate's
//                fail-closed branch (_e2e_network_gate.mjs:222-227) and is aborted before dispatch.
//   Section 2  — an explicit STUB is registered for /api/chatgpt-proxy, so the seal path runs to
//                completion against a stubbed verdict; the stub lane never calls route.continue().
//   Section 3  — the image-preparation probe declares a real lane, but sends ONLY a body that the
//                gate blocks at _e2e_network_gate.mjs:186-194, which runs BEFORE the dispatch
//                branch; and no phase is open, so the ceiling branch (line 212) would abort it
//                anyway. Two independent guards, neither relying on the other.
// The master assertion at the end is empirical, not architectural: gate.realCalls() must be EMPTY
// for the entire run. If any of the above reasoning were wrong, that assertion fails loudly.
//
// usage: node _tempt_fate_wish_seal_containment_control.mjs   (dry; zero real provider dispatches)

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_tempt_fate_wish_seal_containment_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true }); // never read a prior run's log as this run's evidence (the pass-6 stale-log lesson)
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 400) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }
const CLASSIFIER_PATH = '/api/chatgpt-proxy';
const WISH_TEXT = 'everyone forgets the ceremony happened';

// Mounts the real shipped First Sacrifice opening and drives the REAL Tempt click sequence through
// the REAL Proceed button — the exact path that dispatched the unbudgeted call during the incident.
async function mountAndSeal(page) {
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state
    && typeof window._renderBakedScene1 === 'function'
    && typeof window._bakedScene1For === 'function'
    && window.WishSequence && typeof window.WishSequence.queue === 'function', { timeout: 30000 });
  await page.evaluate(() => {
    window.state.storyId = 'containment-' + Date.now();
    window.state.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    window.state.gender = 'Female'; window.state.loveInterest = 'Male'; window.state.authorPronouns = 'She/Her';
    window.state.renderMode = 'staged_story_mode'; window.state.currentEngine = 'graphic';
    window.state.turnCount = 0; window.state.scenes = [];
    window.state.subscribed = true; window.state.fortunes = 9999999; window.state.access = 'sub';
    window.state._starterId = 'starter_first_sacrifice';
    window.state._pcLookSkipped = true; window.state._bakedGenesisUnlocked = true;
    window._devBypass = true; window.state._intimacyDevMode = true;
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    window._renderBakedScene1({ id: 'starter_first_sacrifice' }, pkg);
  });
  await page.waitForFunction(() => { const s = document.getElementById('splashOverlay'); return !s || s.classList.contains('splash-done'); }, { timeout: 15000 }).catch(() => {});
  await page.click('.tempt-fate-card', { timeout: 8000 });
  await page.waitForSelector('.tempt-wish-columns', { timeout: 8000 });
  await page.click('.tempt-wish-columns', { timeout: 8000 });
  await page.fill('#temptZoomInput', WISH_TEXT);
  await page.click('.tempt-proceed-btn', { timeout: 8000 });
  // The classifier is fire-and-forget; give it real time to be attempted and intercepted.
  await page.waitForTimeout(4000);
}
async function sealState(page) {
  return page.evaluate(() => ({
    wish: window.state.temptFateWish || null,
    invoked: !!window.state.tempt_fate_invoked_this_turn,
    pendingWish: !!window.state._pendingWish
  }));
}

(async () => {
  console.log('=== TEMPT FATE WISH-SEAL CONTAINMENT CONTROL (dry — zero real provider dispatches) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const allRealCalls = [];

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. FAIL-CLOSED POSTURE — no real lane, no stub: the seal attempt is aborted before dispatch');
  {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
    const page = await ctx.newPage();
    const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'section1_gate.jsonl'), blockImagePreparation: true });
    // Deliberately declare NOTHING: no allowRealPaths, no stub.
    await mountAndSeal(page);

    const attempted = gate.unstubbed().filter((u) => (u.url || '').includes(CLASSIFIER_PATH));
    const realCalls = gate.realCalls();
    allRealCalls.push(...realCalls);
    const seal = await sealState(page);
    fs.writeFileSync(path.join(OUT_DIR, 'section1.json'), JSON.stringify({ attempted, realCalls: realCalls.length, seal }, null, 2));

    // THE CONTROL MUST BITE: if the classifier were never even attempted, every assertion below
    // would be vacuously true. Proving the attempt happened is what makes the containment meaningful.
    ok('the real Proceed click DID attempt the classifier dispatch — the control is exercising a real request, not a hypothetical one', attempted.length >= 1, JSON.stringify(gate.unstubbed().slice(0, 5)));
    ok('that attempt was ABORTED before leaving the browser (fail-closed: no registered stub or real-lane for this path)', attempted.length >= 1 && /no registered stub or real-lane/.test(attempted[0].reason || ''), JSON.stringify(attempted[0] || null));
    ok('ZERO real provider dispatches occurred in this section', realCalls.length === 0, 'realCalls=' + realCalls.length);
    // Containment must not work by breaking the feature — the wish still has to seal.
    ok('the wish STILL SEALED despite containment — state.temptFateWish is set and the invocation flag is true (containment does not work by breaking the mechanism)', seal.wish === WISH_TEXT && seal.invoked === true, JSON.stringify(seal));
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. SHARED-LANE POSTURE — the actual incident shape: /api/chatgpt-proxy is claimed, and the classifier is contained by an explicit stub + a phase ceiling');
  {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
    const page = await ctx.newPage();
    const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'section2_gate.jsonl'), blockImagePreparation: true });
    // The incident's real shape was: Scene A/B needed /api/chatgpt-proxy as a REAL lane, and the
    // classifier inherited it. Here the same endpoint is claimed by an explicit STUB instead — the
    // gate serves it locally and never calls route.continue(), so the full seal path runs to
    // completion against a real-shaped verdict with zero provider contact.
    let stubbedClassifierBodies = [];
    // NOTE: the gate calls stubFn(req) with ONE argument (_e2e_network_gate.mjs:247) — the raw
    // Playwright request. Parse the body here rather than expecting a second parameter.
    gate.stub(CLASSIFIER_PATH, (req) => {
      try { stubbedClassifierBodies.push(JSON.parse(req.postData() || '{}')); } catch (_) { stubbedClassifierBodies.push({ unparsed: req.postData() }); }
      // ONE real shape, never a union (feedback_shape_faithful_mocks): _classifyWishCG parses
      // choices[0].message.content as JSON with {scope, reason}.
      return { choices: [{ message: { content: JSON.stringify({ scope: 'out_of_scope', reason: 'stubbed by the containment control' }) } }] };
    });
    gate.setPhase('wish-classifier', 1); // the same ceiling the live-run script declares
    await mountAndSeal(page);
    const tracked = gate.trackedCalls('wish-classifier');
    const realCalls = gate.realCalls();
    allRealCalls.push(...realCalls);
    const seal = await sealState(page);

    ok('the classifier request was captured UNDER ITS DECLARED PHASE — attributable and countable against a ceiling, not escaping unaccounted', tracked.length === 1, 'tracked=' + tracked.length);
    ok('the captured request is genuinely the wish classifier (its real prompt names the wish and asks for the in_scope/out_of_scope verdict)', stubbedClassifierBodies.length >= 1 && JSON.stringify(stubbedClassifierBodies[0] || {}).includes('everyone forgets the ceremony happened'), JSON.stringify(stubbedClassifierBodies[0] || null).slice(0, 300));
    ok('ZERO real provider dispatches occurred in this section either — the stub lane answered it locally', realCalls.length === 0, 'realCalls=' + realCalls.length);
    ok('the wish STILL SEALED on this posture too', seal.wish === WISH_TEXT && seal.invoked === true, JSON.stringify(seal));

    // THE CAP MUST BITE: a second request under the same ceiling-1 phase has to be refused.
    const beforeSecond = gate.unstubbed().length;
    await page.evaluate((p) => fetch(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'user', content: 'deliberate second request under a ceiling-1 phase' }], model: 'gpt-4o-mini' }) }).catch(() => {}), CLASSIFIER_PATH);
    await page.waitForTimeout(1200);
    const refused = gate.unstubbed().slice(beforeSecond).filter((u) => /ceiling 1 exceeded/.test(u.reason || ''));
    ok('the declared request cap BITES — a second request under the ceiling-1 "wish-classifier" phase was refused, not served', refused.length >= 1, JSON.stringify(gate.unstubbed().slice(beforeSecond)));
    ok('still ZERO real dispatches after the deliberate over-cap probe', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);
    gate.closePhase();
    fs.writeFileSync(path.join(OUT_DIR, 'section2.json'), JSON.stringify({ tracked: tracked.length, refused, seal, realCalls: gate.realCalls().length }, null, 2));
    await ctx.close();
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. IMAGE CONTROLS — every image endpoint, plus an image-preparation body riding a real text lane');
  {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
    const page = await ctx.newPage();
    const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'section3_gate.jsonl'), blockImagePreparation: true });
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });

    const IMAGE_PATHS = ['/api/image', '/api/bfl-kontext', '/api/dashscope-image'];
    for (const p of IMAGE_PATHS) {
      await page.evaluate((pp) => fetch(pp, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'containment probe' }) }).catch(() => {}), p);
    }
    await page.waitForTimeout(1500);
    for (const p of IMAGE_PATHS) {
      const blocked = gate.unstubbed().some((u) => (u.url || '').includes(p));
      ok('image endpoint ' + p + ' was attempted and ABORTED before dispatch (never in allowRealPaths — fail-closed by default)', blocked, JSON.stringify(gate.unstubbed().map((u) => u.url)));
    }
    ok('ZERO real dispatches after all three image-endpoint probes', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);

    // The harder case: an image-PREPARATION request riding an endpoint that DOES have a real lane.
    // Blocked at _e2e_network_gate.mjs:186-194, before the dispatch branch. No phase is open, so
    // the ceiling branch would independently abort it too — two guards, neither load-bearing alone.
    gate.allowRealPaths([CLASSIFIER_PATH]);
    const beforePrep = gate.unstubbed().length;
    await page.evaluate((p) => fetch(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purpose: 'image_style_extraction', messages: [{ role: 'system', content: 'You are a visual art director for a comic book / graphic novel. STYLE-ONLY EXTRACTION (HARD)' }], model: 'gpt-4o-mini' }) }).catch(() => {}), CLASSIFIER_PATH);
    await page.waitForTimeout(1500);
    const prepEntries = gate.unstubbed().slice(beforePrep);
    ok('an image-PREPARATION body riding a REAL-allowed text lane was blocked before dispatch by blockImagePreparation', prepEntries.some((u) => /image-preparation/.test(u.reason || '')), JSON.stringify(prepEntries));
    ok('ZERO real dispatches after the image-preparation-on-a-real-lane probe', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);
    allRealCalls.push(...gate.realCalls());
    fs.writeFileSync(path.join(OUT_DIR, 'section3.json'), JSON.stringify({ unstubbed: gate.unstubbed(), realCalls: gate.realCalls().length }, null, 2));
    await ctx.close();
  }

  await browser.close();

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. MASTER ASSERTION — empirical, across every section');
  ok('ZERO real provider dispatches occurred anywhere in this entire control run (the one claim that does not depend on any architectural reasoning above being correct)', allRealCalls.length === 0, 'realCalls=' + allRealCalls.length + ' ' + JSON.stringify(allRealCalls.map((c) => c.url)));

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('WISH-SEAL CONTAINMENT CONTROL: ' + passed + '/' + results.length + ' passed');
  console.log('written to ' + OUT_DIR + '/');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
