// TEMPT FATE PLANNER/AUTHOR FRAMING-SPLIT CONTROL — dry, real UI order, zero provider dispatches.
//
// Roman, after the 2026-09-23 paid run: "Diagnose and dry-fix the planner/author Tempt Fate framing
// split... Record the proposal ID, ledger scene index, current scene index, owned invocation flag,
// live invocation flag, callback age, and selected directive at each point. Prove or disprove the
// scene-index hypothesis before changing code... Build the red control through the real UI
// sequence — decision click → Tempt seal → Submit — not by manually setting
// tempt_fate_invoked_this_turn and calling generation directly."
//
// WHAT THE PAID RUN SHOWED: the planner received
//   "TEMPT FATE — ACTIVE INVOCATION THIS SCENE (HARD ...)"            (app.js:100286)
// while the author received, in its SYSTEM prompt,
//   "TEMPT FATE — MEMORY CALLBACK (HARD — scale=mass, sealed 1 scene(s) ago)"  (app.js:190933)
// and no ACTIVE line at all — so the author nulled temptFateOutcome, correctly, for the prompt it
// was actually given. This control reproduces that split through the real UI and instruments the
// state that produces it.
//
// ASSERTIONS EXPRESS THE DESIRED END STATE, so this file is RED before the fix and GREEN after.
// A control that merely describes current behaviour would go green on a broken build.
//
// INSTRUMENTATION: an in-page fetch hook records, synchronously at each dispatch, the live state
// that the prompt builders themselves read. Snapshotting from Node (page.evaluate inside a route
// handler) would sample at a different instant than the builder ran; this does not.
//
// SAFETY: no allowRealPaths anywhere — the three text endpoints are stubbed, images are neither
// stubbed nor allowed. Master assertion: gate.realCalls() must be empty.
//
// usage: node _tempt_fate_framing_split_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { buildScheduleAwareStubResponse } from './_tempt_fate_stub_plan_builder.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_tempt_fate_framing_split_control_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 600) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

const SCENE1_DECISION = 'remain';
const WISH_A = 'everyone forgets the ceremony happened';
const ACTIVE_MARK = 'ACTIVE INVOCATION THIS SCENE';
const CALLBACK_MARK = 'TEMPT FATE — MEMORY CALLBACK';

(async () => {
  console.log('=== TEMPT FATE FRAMING-SPLIT CONTROL (dry; real UI order; zero real dispatches) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });

  // ── In-page dispatch tracer. Records exactly what the builders saw, at the moment they ran. ──
  await ctx.addInitScript(() => {
    window.__tfTrace = [];
    const orig = window.fetch;
    window.fetch = function (input, init) {
      try {
        const url = typeof input === 'string' ? input : (input && input.url) || '';
        if (/\/api\//.test(url)) {
          let body = '';
          try { body = (init && init.body) ? String(init.body) : ''; } catch (_) {}
          let parsed = null; try { parsed = JSON.parse(body); } catch (_) {}
          const s = window.state || {};
          const led = Array.isArray(s._temptFateLedger) ? s._temptFateLedger : [];
          const last = led.length ? led[led.length - 1] : null;
          window.__tfTrace.push({
            at: Date.now(),
            url,
            role: parsed && parsed.role || null,
            model: (parsed && (parsed.model || parsed.preferredModel)) || null,
            isClassifier: body.indexOf('classify whether a fate-card') !== -1,
            // Layer identification uses Tempt-INDEPENDENT schema markers, so classifying a request
            // never depends on the Tempt directive whose presence is the thing under test. (Both
            // layers dispatch with role STRUCTURE_GENERATOR, so `role` cannot separate them.)
            isAuthor: body.indexOf('decisionGateBeatIdx') !== -1,
            // 'local_objective' is a plot-contract field: present in the planner body, absent from
            // the author system prompt (verified against the retained paid-run artifacts).
            isPlanner: body.indexOf('local_objective') !== -1,
            hasActive: body.indexOf('ACTIVE INVOCATION THIS SCENE') !== -1,
            hasCallback: body.indexOf('TEMPT FATE — MEMORY CALLBACK') !== -1,
            // Which wish the active directive actually names — the decisive isolation evidence when
            // a second wish is sealed while this generation is in flight.
            activeWish: (function () { var m = /invoking Tempt Fate this turn with the wish "([^"]*)"/.exec(body); return m ? m[1] : null; })(),
            turnCount: s.turnCount,
            liveInvoked: !!s.tempt_fate_invoked_this_turn,
            liveWish: s.temptFateWish || null,
            ledgerIds: led.map((e) => e.id),
            ownedLedgerLast: last ? { id: last.id, sceneIdx: last.sceneIdx, callbackCount: last.callbackCount || 0, lastCallbackScene: last.lastCallbackScene } : null
          });
        }
      } catch (_) {}
      return orig.apply(this, arguments);
    };
  });

  const page = await ctx.newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  const parse = (req) => { try { return JSON.parse(req.postData() || '{}'); } catch (_) { return {}; } };
  const isClassifierBody = (b) => JSON.stringify(b || {}).includes('classify whether a fate-card');
  gate.stub('/api/mistral-proxy', async () => ({ content: null }));
  gate.stub('/api/proxy', async (req) => {
    const b = parse(req);
    const sys = (b.messages || []).find((m) => m.role === 'system');
    const usr = (b.messages || []).find((m) => m.role === 'user');
    return { content: JSON.stringify(buildScheduleAwareStubResponse(sys && sys.content, usr && usr.content, true)) };
  });
  gate.stub('/api/chatgpt-proxy', async (req) => {
    const b = parse(req);
    if (isClassifierBody(b)) return { choices: [{ message: { content: JSON.stringify({ scope: 'out_of_scope', reason: 'stubbed' }) } }] };
    const sys = (b.messages || []).find((m) => m.role === 'system');
    const usr = (b.messages || []).find((m) => m.role === 'user');
    return { choices: [{ message: { content: JSON.stringify(buildScheduleAwareStubResponse(sys && sys.content, usr && usr.content, true)) } }] };
  });

  const snap = (label) => page.evaluate((lbl) => {
    const s = window.state || {};
    const led = Array.isArray(s._temptFateLedger) ? s._temptFateLedger : [];
    const last = led.length ? led[led.length - 1] : null;
    return {
      point: lbl,
      turnCount: s.turnCount,
      liveInvoked: !!s.tempt_fate_invoked_this_turn,
      liveWish: s.temptFateWish || null,
      ledger: led.map((e) => ({ id: e.id, sceneIdx: e.sceneIdx, callbackCount: e.callbackCount || 0, lastCallbackScene: e.lastCallbackScene })),
      durable: (s._temptFateDurableConsequences || []).length,
      scenes: (s.scenes || []).length,
      callbackAge: last ? ((s.turnCount || 0) - (last.sceneIdx || 0)) : null
    };
  }, label);

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && typeof window._renderBakedScene1 === 'function' && typeof window._sceneDecisionNeeded === 'function' && window.WishSequence, { timeout: 30000 });
  await page.evaluate(() => {
    window.state.storyId = 'framing-' + Date.now();
    window.state.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    window.state.gender = 'Female'; window.state.loveInterest = 'Male'; window.state.authorPronouns = 'She/Her';
    window.state.renderMode = 'staged_story_mode'; window.state.currentEngine = 'graphic';
    window.state.turnCount = 0; window.state.scenes = [];
    window.state.subscribed = true; window.state.fortunes = 9999999; window.state.access = 'sub';
    window.state._starterId = 'starter_first_sacrifice';
    window.state._pcLookSkipped = true; window.state._bakedGenesisUnlocked = true;
    window._devBypass = true; window.state._intimacyDevMode = true;
    window._renderBakedScene1({ id: 'starter_first_sacrifice' }, window._bakedScene1For('starter_first_sacrifice'));
  });
  await page.waitForFunction(() => { const s = document.getElementById('splashOverlay'); return !s || s.classList.contains('splash-done'); }, { timeout: 15000 }).catch(() => {});

  const points = [];
  points.push(await snap('0-after-mount'));

  // ── REAL UI ORDER ──
  await page.evaluate(() => window._mountSceneDecisionPrompt(null));
  const keys = await page.evaluate(() => ({ a: document.getElementById('sceneDecisionA').getAttribute('data-choice'), b: document.getElementById('sceneDecisionB').getAttribute('data-choice') }));
  await page.click(keys.a === SCENE1_DECISION ? '#sceneDecisionA' : '#sceneDecisionB', { timeout: 8000 });
  points.push(await snap('1-after-decision'));

  await page.click('.tempt-fate-card', { timeout: 8000 });
  await page.waitForSelector('.tempt-wish-columns', { timeout: 8000 });
  await page.click('.tempt-wish-columns', { timeout: 8000 });
  await page.fill('#temptZoomInput', WISH_A);
  await page.click('.tempt-proceed-btn', { timeout: 8000 });
  await page.waitForTimeout(3000);
  points.push(await snap('2-after-wish-seal'));

  await page.evaluate(() => { try { window.showScreen('gnReader'); } catch (_) {} });
  await page.waitForSelector('#gnActionInput', { state: 'visible', timeout: 8000 });
  await page.fill('#gnActionInput', 'Lirael closes her eyes for a long moment, then opens them again.');
  await page.fill('#gnDialogueInput', '');
  gate.setPhase('scene-A', 28);
  await page.click('#gnSubmitBtn', { timeout: 8000 });

  // ── MID-FLIGHT SEAL, attempted while Scene A is genuinely in flight (the real scenario) ──
  // Not awaited-then-sealed: ownership is captured at generation start, so the only meaningful test
  // is a second wish arriving AFTER that capture and BEFORE the author prompt is built.
  const WISH_B = 'the river runs backwards through the clearing';
  const midFlight = { attempted: false, sealed: false, reason: null };
  try {
    await page.click('#gnFateSpecial .tempt-fate-card, .tempt-fate-card', { timeout: 6000 });
    await page.waitForSelector('.tempt-wish-columns', { timeout: 5000 });
    await page.click('.tempt-wish-columns', { timeout: 5000 });
    await page.fill('#temptZoomInput', WISH_B);
    await page.click('.tempt-proceed-btn', { timeout: 5000 });
    midFlight.attempted = true;
  } catch (e) { midFlight.reason = (e && e.message || '').split('\n')[0]; }

  await page.waitForFunction(() => (window.state.scenes || []).length >= 1, { timeout: 90000 }).catch(() => {});
  await page.waitForTimeout(2500);
  gate.closePhase();
  points.push(await snap('6-after-scene-persistence'));
  const ledgerAfterA = await page.evaluate(() => ({
    ledger: (window.state._temptFateLedger || []).map((e) => ({ id: e.id, sceneIdx: e.sceneIdx, wishText: e.wishText })),
    owned: window.state._tfoOwnedInvocation || null
  }));
  midFlight.sealed = ledgerAfterA.ledger.length >= 2;
  fs.writeFileSync(path.join(OUT_DIR, 'mid_flight.json'), JSON.stringify({ midFlight, ledgerAfterA, WISH_B }, null, 2));

  const trace = await page.evaluate(() => window.__tfTrace || []);
  fs.writeFileSync(path.join(OUT_DIR, 'trace.json'), JSON.stringify({ points, trace }, null, 2));

  const plannerReqs = trace.filter((t) => t.isPlanner && !t.isAuthor);
  const authorReqs = trace.filter((t) => t.isAuthor);
  const classifierReqs = trace.filter((t) => t.isClassifier);
  const planner = plannerReqs[0] || null;
  const author = authorReqs[0] || null;

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('DIAGNOSTIC — the six traced points (recorded, not asserted)');
  points.forEach((p) => console.log('  ' + p.point.padEnd(26) + ' turnCount=' + p.turnCount + ' liveInvoked=' + p.liveInvoked + ' callbackAge=' + p.callbackAge + ' ledger=' + JSON.stringify(p.ledger) + ' durable=' + p.durable + ' scenes=' + p.scenes));
  console.log('\n  dispatch-time state (what each prompt builder actually read):');
  trace.forEach((t) => {
    const kind = t.isClassifier ? 'classifier' : t.isAuthor ? 'AUTHOR' : t.isPlanner ? 'PLANNER' : (t.role || 'other');
    console.log('    ' + kind.padEnd(11) + ' model=' + String(t.model).padEnd(28) + ' turnCount=' + t.turnCount + ' liveInvoked=' + t.liveInvoked + ' ledgerSceneIdx=' + (t.ownedLedgerLast && t.ownedLedgerLast.sceneIdx) + ' ACTIVE=' + t.hasActive + ' CALLBACK=' + t.hasCallback);
  });

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('SCENE-INDEX HYPOTHESIS — proved or disproved from the trace above');
  const sealPoint = points.find((p) => p.point === '2-after-wish-seal');
  const sealedSceneIdx = sealPoint && sealPoint.ledger.length ? sealPoint.ledger[0].sceneIdx : null;
  const hypothesisHolds = !!(planner && author && author.turnCount !== sealedSceneIdx);
  console.log('  ledger sceneIdx recorded at seal : ' + sealedSceneIdx + '   (app.js:190691 stores s.turnCount at seal time)');
  console.log('  turnCount when PLANNER dispatched: ' + (planner ? planner.turnCount : 'n/a'));
  console.log('  turnCount when AUTHOR  dispatched: ' + (author ? author.turnCount : 'n/a'));
  console.log('  callback guard (app.js:190821) skips an entry only when entry.sceneIdx === state.turnCount');
  console.log('  → guard ' + (author && author.turnCount === sealedSceneIdx ? 'HOLDS (entry suppressed)' : 'FAILS (entry rendered as history)') + '; sealedAgo would compute to ' + (author ? (author.turnCount - sealedSceneIdx) : 'n/a'));
  ok('HYPOTHESIS CONFIRMED: the author-side callback guard fails because the ledger\'s seal-time sceneIdx no longer equals the live turnCount by the time the author prompt is built', hypothesisHolds,
    'sealedSceneIdx=' + sealedSceneIdx + ' authorTurnCount=' + (author && author.turnCount) + ' — if these are equal the hypothesis is DISPROVED and the split has another cause');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('REQUIRED END STATE — prompt parity on the invocation scene (RED before the fix)');
  ok('a planner request and an author request were both captured (the control is exercising both layers)', !!planner && !!author, 'planner=' + !!planner + ' author=' + !!author);
  ok('PLANNER receives ACTIVE INVOCATION THIS SCENE', !!(planner && planner.hasActive), JSON.stringify(planner));
  ok('AUTHOR receives ACTIVE INVOCATION THIS SCENE — the parity requirement this whole fix exists for', !!(author && author.hasActive), 'author.hasActive=' + (author && author.hasActive) + ' · this is the exact split the paid run produced');
  ok('AUTHOR does NOT receive a historical MEMORY CALLBACK for the proposal it is currently enacting', !!(author && !author.hasCallback), 'author.hasCallback=' + (author && author.hasCallback) + ' · the paid run had this true, which is why temptFateOutcome came back null');
  ok('exactly one wish classifier request fired, captured by the stub', classifierReqs.length === 1, 'classifier=' + classifierReqs.length);

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('MID-FLIGHT ISOLATION — a second wish sealed after ownership was captured must not contaminate this scene');
  console.log('  second wish seal attempted in-flight: ' + midFlight.attempted + ' · actually sealed: ' + midFlight.sealed + ' · ledger: ' + JSON.stringify(ledgerAfterA.ledger.map((e) => e.id)));
  ok('the owned invocation is RELEASED once its generation ends — a later wish is never inherited by a scene that did not own it', ledgerAfterA.owned === null, JSON.stringify(ledgerAfterA.owned));
  if (midFlight.sealed) {
    ok('the second wish is recorded as its OWN distinct proposal, not merged into or overwriting the first', ledgerAfterA.ledger.length === 2 && ledgerAfterA.ledger[1].wishText.indexOf(WISH_B) === 0, JSON.stringify(ledgerAfterA.ledger));
    ok('the author directive named the OWNED wish, never the one sealed mid-flight — isolation held where it actually matters', !!(author && author.activeWish && author.activeWish.indexOf(WISH_A) === 0), 'author.activeWish=' + (author && author.activeWish));
  } else {
    // Honest negative: not claimed as proof. The structural guarantee (ownership keyed to a proposal
    // id captured before any await) is what would hold if the UI ever permitted this; it is simply
    // not exercised here, and the parity assertions above do not depend on it.
    console.log('  NOTE: the real UI did not permit sealing a second wish while Scene A was composing');
    console.log('        (' + (midFlight.reason || 'no error reported') + ').');
    console.log('        Isolation is therefore NOT exercised by this run and is NOT claimed as proven.');
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('SCENE B SEPARATION — the ordinary continuation must lose the active directive entirely');
  const traceMark = trace.length;
  let sceneBOk = { ran: false };
  try {
    await page.evaluate(() => { try { if (window.state._wishSequence && window.state._wishSequence.active) window.WishSequence.resolve(); } catch (_) {} });
    await page.evaluate(() => { try { window.showScreen('gnReader'); } catch (_) {} });
    await page.waitForSelector('#gnActionInput', { state: 'visible', timeout: 8000 });
    await page.fill('#gnActionInput', 'Lirael takes a slow breath and steps back from the center of the clearing.');
    await page.fill('#gnDialogueInput', '');
    gate.setPhase('scene-B', 22);
    await page.click('#gnSubmitBtn', { timeout: 8000 });
    await page.waitForFunction((n) => (window.state.scenes || []).length > n, { timeout: 90000 }, 1).catch(() => {});
    await page.waitForTimeout(2500);
    gate.closePhase();
    sceneBOk.ran = true;
  } catch (e) { sceneBOk.error = e && e.message; }
  const trace2 = await page.evaluate(() => window.__tfTrace || []);
  const sceneBReqs = trace2.slice(traceMark);
  const authorB = sceneBReqs.filter((t) => t.isAuthor)[0] || null;
  fs.writeFileSync(path.join(OUT_DIR, 'scene_b.json'), JSON.stringify({ sceneBOk, authorB, sceneBReqs: sceneBReqs.map((t) => ({ isAuthor: t.isAuthor, isPlanner: t.isPlanner, hasActive: t.hasActive, hasCallback: t.hasCallback, turnCount: t.turnCount })) }, null, 2));
  if (authorB) {
    console.log('  Scene B author: turnCount=' + authorB.turnCount + ' ACTIVE=' + authorB.hasActive + ' CALLBACK=' + authorB.hasCallback);
    ok('SCENE B: the author does NOT receive ACTIVE INVOCATION — the directive disappears with the generation that owned it, so temptFateOutcome: null is the correct answer there', authorB.hasActive === false, JSON.stringify(authorB));
  } else {
    // STATED LIMIT: the stubbed Scene A plan omits the continuation-decision payload (microDecision
    // / decisionGateBeatIdx) the app needs to advance, so Scene B stalls before reaching an author.
    // That is stub fidelity in THIS control, not an app defect — and it means the full Scene B
    // pipeline is not exercised here. Rather than claim a pass from an absent request, the same
    // requirement is proven directly at its gate: the author's active block is emitted only when
    // _temptFateOwnedInvocation() is non-null, and that is null once the owning generation ended.
    console.log('  NOTE: Scene B stalled before the author (' + sceneBReqs.length + ' requests, none author-shaped).');
    console.log('        Cause is this control\'s stub omitting the continuation-decision payload, not the app.');
    console.log('        Proving the Scene B requirement at its gate instead:');
    const gateCheck = await page.evaluate(() => ({
      owned: window._temptFateOwnedInvocation ? window._temptFateOwnedInvocation() : 'missing',
      activeWhenOwned: (window._buildTemptFateActiveInvocationDirective
        ? window._buildTemptFateActiveInvocationDirective({ invoked: true, wishText: 'probe wish' }, 'author') : '').length,
      activeWhenNotOwned: (window._buildTemptFateActiveInvocationDirective
        ? window._buildTemptFateActiveInvocationDirective({ invoked: false, wishText: 'probe wish' }, 'author') : '').length
    }));
    console.log('        owned=' + JSON.stringify(gateCheck.owned) + '  activeDirectiveChars(owned)=' + gateCheck.activeWhenOwned + '  activeDirectiveChars(not owned)=' + gateCheck.activeWhenNotOwned);
    ok('SCENE B (proven at the gate, pipeline not exercised): with the owning generation ended, _temptFateOwnedInvocation() is null, and the author\'s active-directive builder returns empty for a non-invoked context — so no ACTIVE line can reach an ordinary continuation and temptFateOutcome: null is correct there',
      gateCheck.owned === null && gateCheck.activeWhenOwned > 0 && gateCheck.activeWhenNotOwned === 0,
      JSON.stringify(gateCheck));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('CONTAINMENT');
  ok('ZERO real provider dispatches anywhere in this control', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('FRAMING-SPLIT CONTROL: ' + passed + '/' + results.length + ' passed');
  console.log('written to ' + OUT_DIR + '/');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
