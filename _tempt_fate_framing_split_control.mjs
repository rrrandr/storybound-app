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
            // Plot-contract fields: present in planner bodies, absent from the author system prompt
            // (verified against the retained paid-run artifacts). Two markers because the
            // continuation planner's schema differs from the opening scene's — matching only
            // 'local_objective' silently missed Scene B's planner entirely.
            isPlanner: body.indexOf('local_objective') !== -1 || body.indexOf('tactical_move') !== -1,
            hasActive: body.indexOf('ACTIVE INVOCATION THIS SCENE') !== -1,
            hasCallback: body.indexOf('TEMPT FATE — MEMORY CALLBACK') !== -1,
            // Which wish the active directive actually names — the decisive isolation evidence when
            // a second wish is sealed while this generation is in flight.
            activeWish: (function () { var m = /invoking Tempt Fate this turn with the wish \\?"([^"\\]*)/.exec(body); return m ? m[1] : null; })(),
            // Does this layer carry the COMMITTED durable consequence, and does its schema DEMAND a
            // populated outcome? Both must be true on the invocation scene and false afterwards.
            // Does the author's REAL schema request the scope + rupture-class fields the validator
            // requires? Asserted here because this is the only place the author's actual prompt
            // exists — a builder that no prompt calls proved nothing (see the precedence control).
            // Bare identifiers, NOT quoted forms: the prompt is embedded in a JSON request body, so
            // every schema quote arrives escaped as \" and a quoted search silently never matches.
            schemaAsksScope: body.indexOf('requestedScope') !== -1 && body.indexOf('deliveredScope') !== -1 && body.indexOf('scopeMatch') !== -1,
            schemaAsksClass: body.indexOf('ruptureClass') !== -1 && body.indexOf('memory_perception') !== -1 && body.indexOf('history_rewrite') !== -1
              && body.indexOf('identity_reputation') !== -1 && body.indexOf('materialization_possession') !== -1 && body.indexOf('relationship_social') !== -1,
            schemaClassConditional: body.indexOf('do not populate fields of a class you did not deliver') !== -1,
            schemaAsksInvalidatedPlans: body.indexOf('invalidatedPlans') !== -1,
            hasDurable: body.indexOf('DURABLE CONSEQUENCES ALREADY IN FORCE') !== -1,
            mentionsWish: body.indexOf('everyone forgets the ceremony happened') !== -1,
            requiresOutcome: body.indexOf('null is NOT valid this scene') !== -1,
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
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push({ text: m.text(), at: Date.now() }));
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  const parse = (req) => { try { return JSON.parse(req.postData() || '{}'); } catch (_) { return {}; } };
  const isClassifierBody = (b) => JSON.stringify(b || {}).includes('classify whether a fate-card');
  // SHAPE FIDELITY (repaired for the Scene B proof): whether the stub returns a temptFateOutcome is
  // decided by whether the PROMPT actually carries the active-invocation directive — exactly the
  // judgement a well-behaved model makes. Hardcoding it true injected an outcome into ordinary
  // continuations too, which would have made the Scene B assertions meaningless.
  const planFor = (b) => {
    const sys = (b.messages || []).find((m) => m.role === 'system');
    const usr = (b.messages || []).find((m) => m.role === 'user');
    const sysText = (sys && sys.content) || '';
    const active = sysText.indexOf(ACTIVE_MARK) !== -1 || String((usr && usr.content) || '').indexOf(ACTIVE_MARK) !== -1;
    return buildScheduleAwareStubResponse(sysText, usr && usr.content, active);
  };
  gate.stub('/api/mistral-proxy', async () => ({ content: null }));
  gate.stub('/api/proxy', async (req) => ({ content: JSON.stringify(planFor(parse(req))) }));
  gate.stub('/api/chatgpt-proxy', async (req) => {
    const b = parse(req);
    if (isClassifierBody(b)) return { choices: [{ message: { content: JSON.stringify({ scope: 'out_of_scope', reason: 'stubbed' }) } }] };
    return { choices: [{ message: { content: JSON.stringify(planFor(b)) } }] };
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

  // MID-FLIGHT ISOLATION — deliberately NOT exercised here (Roman, 2026-09-23): "document that the
  // production UI makes a second seal unreachable while composition is active... do not invent an
  // artificial paid scenario solely to exercise it." Measured directly: with Scene A composing, the
  // Tempt card is not clickable (the composing surface hides it), so a second seal cannot be reached
  // through the product at all. An earlier revision of this control DID click at the card during
  // composition; it never sealed anything and it intermittently corrupted Scene A's own run, which is
  // exactly the artificial scenario the instruction rules out. Defense in depth for the race itself
  // stays where it belongs — the lower-level ownership controls in
  // _tempt_fate_outcome_integration_control.mjs (70/70) and the id-keyed capture this fix added.
  await page.waitForFunction(() => (window.state.scenes || []).length >= 1, { timeout: 90000 }).catch(() => {});
  // Wait on the app's OWN completion signal, not merely on the scene appearing. The post-scene
  // aftermath cleanup (app.js:233796) — which clears tempt_fate_invoked_this_turn for the invocation
  // that just resolved — runs at the very END of _completeStagedSceneFromScreenplay. Sampling as
  // soon as scenes[] grows reads state from the middle of that tail and sees a still-live invocation.
  let sceneACompleted = false;
  try {
    await page.waitForFunction(() => !window.state._stagedSubmitting, { timeout: 60000 });
    sceneACompleted = true;
  } catch (_) { sceneACompleted = false; }
  await page.waitForTimeout(1500);
  gate.closePhase();
  console.log('  Scene A completion signal (_stagedSubmitting cleared): ' + sceneACompleted);
  points.push(await snap('6-after-scene-persistence'));
  const ledgerAfterA = await page.evaluate(() => ({
    ledger: (window.state._temptFateLedger || []).map((e) => ({ id: e.id, sceneIdx: e.sceneIdx, wishText: e.wishText })),
    owned: window.state._tfoOwnedInvocation || null,
    durable: (window.state._temptFateDurableConsequences || []).map((d) => ({ proposalId: d.proposalId, requestedRupture: d.requestedRupture })),
    scenes: (window.state.scenes || []).length
  }));
  fs.writeFileSync(path.join(OUT_DIR, 'after_scene_a.json'), JSON.stringify(ledgerAfterA, null, 2));

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

  // THE AUTHOR'S REAL SCHEMA must request everything the validator requires. A paid run was lost to
  // this exact gap: the fields were added to a builder no prompt called, the validator demanded
  // them anyway, and the delivered outcome was rejected for omitting what it was never asked for.
  // MIGRATED 2026-09-24. These four proved the AUTHOR's schema carried the outcome contract. The
  // author no longer receives it — the dedicated extractor does — so the drift guard moves with
  // the contract rather than being dropped. The gap being defended is unchanged: fields the
  // validator demands must appear in the prompt of whoever is actually asked to produce them.
  const ex = await page.evaluate(() => {
    const p = window._tfoBuildExtractorPrompt({
      wishText: 'everyone forgets the ceremony happened', invokerName: 'Lirael',
      rosterNames: ['Lirael', 'Julian', 'the assembly'], prose: 'accepted prose'
    });
    return p.sys + '\n' + p.usr;
  });
  ok('the author is no longer asked for the outcome contract at all — no scope fields in its real request',
    !!(author && author.schemaAsksScope === false), 'schemaAsksScope=' + (author && author.schemaAsksScope));
  ok('the EXTRACTOR\'s real prompt requests the scope fields the validator requires (requestedScope / deliveredScope / scopeMatch)',
    ex.indexOf('requestedScope') !== -1 && ex.indexOf('deliveredScope') !== -1 && ex.indexOf('scopeMatch') !== -1);
  ok('the EXTRACTOR\'s real prompt requests ruptureClass, enumerating all five classes',
    ex.indexOf('ruptureClass') !== -1 && ex.indexOf('memory_perception') !== -1 && ex.indexOf('history_rewrite') !== -1
    && ex.indexOf('identity_reputation') !== -1 && ex.indexOf('materialization_possession') !== -1 && ex.indexOf('relationship_social') !== -1);
  ok('the EXTRACTOR\'s real prompt keeps class fields conditional, and requests invalidatedPlans',
    ex.indexOf('do not populate fields of a class you did not deliver') !== -1 && ex.indexOf('invalidatedPlans') !== -1);

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('SCENE A PERSISTENCE — accepted scene and durable outcome, through the production commit path');
  console.log('  scenes=' + ledgerAfterA.scenes + ' · durable=' + JSON.stringify(ledgerAfterA.durable) + ' · ledger=' + JSON.stringify(ledgerAfterA.ledger.map((e) => e.id)));
  ok('Scene A persisted as a real scene', ledgerAfterA.scenes >= 1, JSON.stringify(ledgerAfterA));
  ok('the author returned a POPULATED temptFateOutcome (the invocation-scene schema requirement is satisfied, not merely stated)', ledgerAfterA.durable.length === 1, JSON.stringify(ledgerAfterA.durable));
  ok('the durable consequence committed through the production path is attributed to the OWNED proposal', ledgerAfterA.durable.length === 1 && ledgerAfterA.durable[0].proposalId === 'tfl_1', JSON.stringify(ledgerAfterA.durable));
  ok('the owned invocation is RELEASED once its generation ends', ledgerAfterA.owned === null, JSON.stringify(ledgerAfterA.owned));

  section('MID-FLIGHT ISOLATION — documented, deliberately not manufactured');
  console.log('  The production UI makes a second seal UNREACHABLE while composition is active: the');
  console.log('  Tempt card is not clickable once Scene A is composing. Per instruction this control');
  console.log('  does not invent a scenario to force it. Defense in depth for the underlying race');
  console.log('  remains the id-keyed ownership capture plus the lower-level controls in');
  console.log('  _tempt_fate_outcome_integration_control.mjs (70/70). NOT claimed as proven here.');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('SCENE B SEPARATION — the ordinary continuation must lose the active directive entirely');
  const traceMark = trace.length;
  const consoleMarkB = consoleLines.length;
  let sceneBOk = { ran: false };
  try {
    await page.evaluate(() => { try { if (window.state._wishSequence && window.state._wishSequence.active) window.WishSequence.resolve(); } catch (_) {} });
    // ORDERING MATTERS HERE, and it took several revisions to get right:
    //   • Submit too EARLY (before Scene A's completion tail runs) and the aftermath cleanup has not
    //     yet cleared tempt_fate_invoked_this_turn, so Scene B re-captures ownership and correctly —
    //     but uselessly — emits ACTIVE. That is a measurement artifact, not a product defect.
    //   • Submit too LATE and the app has moved on to its image pipeline, which this control blocks;
    //     the reader surface never remounts and the submit is swallowed.
    // The completion signal (_stagedSubmitting false, awaited above) is the narrow window between
    // those two, so drive the continuation immediately rather than waiting for anything else.
    await page.evaluate(() => { try { window.showScreen('gnReader'); } catch (_) {} });
    // The input row is not always remounted here: this control blocks every image endpoint, so the
    // post-scene render leaves the reader surface in a state the product would never show a user.
    // When that happens, drive the continuation through the app's OWN entry point instead —
    // _advanceStagedScene is exactly what the decision-gate resume callback calls (app.js:233103).
    // NOTHING about Tempt state is touched: the flags are whatever production left after Scene A.
    // Only the click is substituted, and only because this control's own image blocking removed it.
    // OPEN THE STAGED READING GATE. _advanceStagedScene's Guard 1 refuses a continuation while
    // state._stagedActive.gateShown is false — "the user shouldn't be able to submit (they haven't
    // read the scene)". That gate opens as part of the scene's image render, which this control
    // blocks, so it never opens here and the continuation is refused with
    // "[STAGED:SUBMIT] Blocked — gate not yet open" (confirmed in this run's console).
    // Marking the scene as read is reading-progress state ONLY — it touches nothing about Tempt,
    // ownership, the ledger, or the durable outcome, all of which remain exactly as production left
    // them. Without it the continuation cannot be reached at all with images blocked.
    const gateOpened = await page.evaluate(() => {
      const a = window.state._stagedActive;
      if (!a) return 'no staged session';
      if (a.gateShown) return 'already open';
      a.gateShown = true;
      return 'opened by control (image render blocked)';
    });
    console.log('  staged reading gate: ' + gateOpened);
    sceneBOk.gate = gateOpened;
    let inputVisible = true;
    try { await page.waitForSelector('#gnActionInput', { state: 'visible', timeout: 10000 }); }
    catch (_) { inputVisible = false; }
    sceneBOk.drivenBy = inputVisible ? 'real #gnSubmitBtn click' : '_advanceStagedScene (input row unmounted by this control\'s blocked image render)';
    console.log('  Scene B driven by: ' + sceneBOk.drivenBy);
    // PRE-FLIGHT: the continuation has its own prerequisites. Record them rather than discover a
    // stall later — the Scene-1 decision gate taught this lesson once already.
    const pre = await page.evaluate(() => ({
      decisionNeeded: (typeof window._sceneDecisionNeeded === 'function') ? window._sceneDecisionNeeded() : 'missing',
      stagedSubmitting: !!window.state._stagedSubmitting,
      isAdvancing: !!window.state._isAdvancingScene,
      wishSeqActive: !!(window.state._wishSequence && window.state._wishSequence.active),
      delivered: window.state._cgDeliveredAssignments ? Object.keys(window.state._cgDeliveredAssignments) : null,
      turnCount: window.state.turnCount,
      inputHidden: (function () { const el = document.getElementById('gnActionInput'); return el ? el.classList.contains('wish-seq-hidden') : null; })()
    }));
    sceneBOk.pre = pre;
    console.log('  Scene B pre-flight: ' + JSON.stringify(pre));
    // Release the advance locks if the previous generation left them set — a stuck lock silently
    // refuses the next submit as a duplicate (the same locks the decision-gate path releases at
    // app.js:233102).
    if (pre.stagedSubmitting || pre.isAdvancing) {
      await page.evaluate(() => { window.state._stagedSubmitting = false; window.state._isAdvancingScene = false; });
      console.log('  (released stale advance locks before submitting Scene B)');
    }
    const SCENE_B_DO = 'Lirael takes a slow breath and steps back from the center of the clearing.';
    gate.setPhase('scene-B', 22);
    if (inputVisible) {
      await page.fill('#gnActionInput', SCENE_B_DO);
      await page.fill('#gnDialogueInput', '');
      await page.click('#gnSubmitBtn', { timeout: 10000 });
    } else {
      await page.evaluate((doText) => { window._advanceStagedScene(doText, ''); }, SCENE_B_DO);
    }
    await page.waitForFunction((n) => (window.state.scenes || []).length > n, { timeout: 120000 }, 1).catch(() => {});
    await page.waitForTimeout(3000);
    gate.closePhase();
    sceneBOk.ran = true;
  } catch (e) { sceneBOk.error = (e && e.message || '').split('\n')[0]; }
  const trace2 = await page.evaluate(() => window.__tfTrace || []);
  const sceneBReqs = trace2.slice(traceMark);
  const authorB = sceneBReqs.filter((t) => t.isAuthor)[0] || null;
  fs.writeFileSync(path.join(OUT_DIR, 'scene_b.json'), JSON.stringify({ sceneBOk, authorB, sceneBReqs: sceneBReqs.map((t) => ({ isAuthor: t.isAuthor, isPlanner: t.isPlanner, hasActive: t.hasActive, hasCallback: t.hasCallback, turnCount: t.turnCount })) }, null, 2));
  const plannerB = sceneBReqs.filter((t) => t.isPlanner && !t.isAuthor)[0] || null;
  const afterB = await page.evaluate(() => ({
    durable: (window.state._temptFateDurableConsequences || []).map((d) => ({ proposalId: d.proposalId })),
    invoked: !!window.state.tempt_fate_invoked_this_turn,
    scenes: (window.state.scenes || []).length
  }));
  const dupSkipped = consoleLines.some((l) => /already committed — skipping duplicate/.test(l.text));
  fs.writeFileSync(path.join(OUT_DIR, 'scene_b_state.json'), JSON.stringify({ afterB, dupSkipped, authorB, plannerB }, null, 2));
  if (authorB) {
    console.log('  Scene B author : ACTIVE=' + authorB.hasActive + ' CALLBACK=' + authorB.hasCallback + ' requiresOutcome=' + authorB.requiresOutcome + ' durable=' + authorB.hasDurable + ' mentionsWish=' + authorB.mentionsWish);
    if (plannerB) console.log('  Scene B planner: ACTIVE=' + plannerB.hasActive + ' durable=' + plannerB.hasDurable + ' mentionsWish=' + plannerB.mentionsWish);
    ok('SCENE B: the author does NOT receive ACTIVE INVOCATION — the directive disappears with the generation that owned it, so temptFateOutcome: null is the correct answer there', authorB.hasActive === false, JSON.stringify(authorB));
    ok('SCENE B: the author\'s schema no longer REQUIRES a populated outcome — the invocation-scene demand is gone, so null is valid here', authorB.requiresOutcome === false, 'requiresOutcome=' + authorB.requiresOutcome);
    ok('SCENE B: a planner request was captured for the continuation', !!plannerB, 'plannerB=' + !!plannerB);
    ok('SCENE B: the planner does NOT receive ACTIVE INVOCATION either', !!plannerB && plannerB.hasActive === false, JSON.stringify(plannerB));
    ok('SCENE B: the COMMITTED memory-erasure consequence reaches BOTH layers — planner and author each carry the wish forward as settled fact, not as a live rupture',
      !!plannerB && plannerB.mentionsWish === true && authorB.mentionsWish === true,
      'plannerMentions=' + (plannerB && plannerB.mentionsWish) + ' authorMentions=' + authorB.mentionsWish);
    // Not committed twice. The dedup LOG is informational, not required: when the author correctly
    // returns temptFateOutcome: null there is nothing to commit, so the guard is never reached. An
    // earlier revision demanded that log and failed — it was asserting the wrong thing, requiring a
    // duplicate attempt that correct behaviour avoids entirely.
    console.log('  (production dedup guard logged a refusal this run: ' + dupSkipped + ' — informational; correct null outcomes never reach it)');
    ok('SCENE B: the original proposal is NOT committed twice — still exactly one durable consequence, still attributed to the owned proposal',
      afterB.durable.length === 1 && afterB.durable[0].proposalId === 'tfl_1',
      JSON.stringify(afterB.durable));
    ok('SCENE A REGRESSION PRESERVED: the same proposal was never simultaneously an active invocation and a historical callback',
      !!author && author.hasActive === true && author.hasCallback === false && authorB.hasActive === false,
      'sceneA(active=' + (author && author.hasActive) + ',callback=' + (author && author.hasCallback) + ') sceneB(active=' + authorB.hasActive + ')');
  } else {
    // FALLBACK — not reached now that the staged reading gate is opened above. Kept so a future
    // regression degrades to a weaker-but-honest proof rather than silently passing. Both blockers
    // found while building this were environmental and are now handled: Scene A's completion tail
    // not yet having run, and _advanceStagedScene's Guard 1 refusing while
    // state._stagedActive.gateShown was false because this control blocks the image render.
    const sceneBConsole = consoleLines.slice(consoleMarkB);
    fs.writeFileSync(path.join(OUT_DIR, 'scene_b_console.json'), JSON.stringify(sceneBConsole, null, 2));
    console.log('  Scene B console (first 25 app lines, for diagnosis):');
    sceneBConsole.filter((l) => /^\[/.test(l.text)).slice(0, 25).forEach((l) => console.log('      ' + l.text.slice(0, 190)));
    console.log('  NOTE: Scene B did not reach an author (' + sceneBReqs.length + ' requests, none author-shaped).');
    console.log('        Falling back to proving the requirement at its gate:');
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
  fs.writeFileSync(path.join(OUT_DIR, 'console_full.json'), JSON.stringify(consoleLines, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('FRAMING-SPLIT CONTROL: ' + passed + '/' + results.length + ' passed');
  console.log('written to ' + OUT_DIR + '/');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
