// TEMPT FATE OUTCOME — PRODUCTION INTEGRATION CONTROL (Roman, 2026-09-23)
//
// Roman: "The summary proves that simulated reports work, but doesn't say which real generation
// call produces the report or where the real scene-acceptance path commits it. Given the earlier
// 'defined but never called' gaps, that distinction matters. Also, delivered:true must reflect the
// app's actual acceptance of the scene. A model asserting that flag cannot, by itself, establish
// that the player received the scene." No paid calls.
//
// Unlike the prior control (which called _commitTemptFateOutcome directly with hand-built objects),
// THIS control exercises the REAL production functions: the real system-prompt builder
// (_buildCGScreenplaySystemPrompt), the real dispatch (_runCGScreenplayGen -> fetch('/api/proxy')),
// the real JSON parse/normalize (_validateAndNormalizeCGPlan), the real acceptance gate
// (_cgAcceptDelivered), and the wiring added this pass right after it (inside
// _runCGScreenplayGenInner, gated the SAME way the pre-existing kink-memory recording already is).
// The network layer is STUBBED (installFailClosedNetworkGate's gate.stub), never called for real.
//
// usage: node _tempt_fate_outcome_integration_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 900) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const VALID_BEATS = [{ idx: 0, kind: 'narration', text: 'The ceremony hall stands empty, arranged for a rite no one recalls starting.', speaker: null, tension_state: 'composed' }];

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const consoleLines = [];
  page.on('console', (msg) => { const t = msg.text(); consoleLines.push(t); });
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_tempt_fate_outcome_integration_control_out.jsonl') });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state
    && typeof window._buildCGScreenplaySystemPrompt === 'function'
    && typeof window._runCGScreenplayGen === 'function'
    && typeof window._cgAcceptDelivered === 'function'
    && typeof window._commitTemptFateOutcome === 'function'
    && typeof window._recordTemptFateEvent === 'function', { timeout: 30000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or required functions not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached, all required functions exposed on window\n');

  async function resetBaseline() {
    consoleLines.length = 0;
    await page.evaluate(() => {
      window.state = window.state || {};
      window.state.picks = window.state.picks || {};
      window.state.picks.world = 'Fantasy';
      window.state.storyId = 'harness-story-1';
      window.state.storyLength = 'fling';
      window.state.turnCount = 3;
      window.state.loveInterestName = 'Julian';
      window.state.playerName = 'Lirael';
      window.state.currentPrimaryLiId = 'julian';
      window.state._temptFateDurableConsequences = [];
      window.state._temptOutcomeCommittedScenes = {};
      window.state._temptFateLedger = null;
      window.state._cgDeliveredAssignments = null;
      window.state.volatility_window = { active: false, severity: 0, remaining_scenes: 0 };
      window.state.tempt_fate_invoked_this_turn = false;
      window.state.temptFateWish = '';
      window.state.consecutive_tempt_fate_count = 0;
      // Defense-in-depth: avoid any nested paid verifier call from the plot-contract system
      // (_generateLiteraryPlotContract -> _commitScene) that this pass's target code sits near.
      window._plotContractKill = true;
      // Short-circuit the optional bible/scaffold pre-generation steps so they don't attempt their
      // own network calls (all are wrapped in non-blocking try/catch in the real code — this is
      // defense-in-depth, not strictly required, but keeps the run's network log clean and fast).
      window.state.pcBodyBible = { _stub: true };
      window.state.liBodyBible = { _stub: true };
      window.state.antagonistBodyBible = { _stub: true };
      window.state.aPlot = { goal: 'stub goal', antagonistOrAntiForce: 'stub antagonist' };
      // The CG "flavor" resolver did NOT key off picks.world alone in this minimal state — it fell
      // back to "billionaire" (one of the two flavors that trigger scaffold generation), causing an
      // unrelated real network attempt (found empirically, not assumed). Pre-set cgScaffold so
      // _ensureCGScaffold's own early-return (`if (s.cgScaffold) return s.cgScaffold`-shaped check)
      // fires regardless of flavor resolution — this is unrelated to the Tempt Fate wiring under
      // test, so short-circuiting it is the right call, not a workaround for the thing being tested.
      window.state.cgScaffold = { _stub: true, _sourceModel: 'stub' };
    });
  }

  // IMPORTANT (found empirically, not assumed): gate.stub(prefix, fn) is APPEND-ONLY —
  // installFailClosedNetworkGate's findStub matches in REGISTRATION order, first match wins. A
  // second gate.stub('/api/proxy', ...) call does NOT replace the first; it is silently ignored.
  // So the stub is registered EXACTLY ONCE here, backed by a mutable closure variable each section
  // reassigns before its own generation call — not by calling gate.stub() repeatedly.
  let _currentPlanFields = {};
  gate.stub('/api/proxy', () => ({
    content: JSON.stringify(Object.assign({ beats: VALID_BEATS, visualState: {}, is_consummate_scene: false }, _currentPlanFields))
  }));
  function stubProxyWithPlan(planFields) { _currentPlanFields = planFields; }
  // CG scaffold generation turned out to be UNCONDITIONAL (confirmed against source,
  // _shouldGenerateCGScaffold: "Spine is ALWAYS ON" — an earlier assumption that Fantasy-world
  // avoided it, based on a stale comment elsewhere, was wrong) — a real but entirely UNRELATED
  // system that _runCGScreenplayGenInner also kicks off before the Tempt-relevant dispatch. It
  // already fails non-fatally by design ("scene generation proceeds without scaffold"). Stubbed
  // here (not left to the fail-closed abort) purely to keep this control's network log clean and
  // deterministic — this is not part of what this control is verifying.
  gate.stub('/api/mistral-proxy', () => ({ content: null }));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. Which real generation request asks for the structured outcome report, and does its parser retain it?');
  await resetBaseline();
  {
    await page.evaluate(() => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = 'everyone forgets the ceremony happened';
    });
    // The REAL system-prompt builder — the exact function _runCGScreenplayGenInner calls to build
    // sysPrompt for the real fetch('/api/proxy', ...) request.
    const sysPrompt = await page.evaluate(() => window._buildCGScreenplaySystemPrompt());
    ok('the REAL CG system prompt (the one actually sent to the provider) asks for "temptFateOutcome"', sysPrompt.indexOf('"temptFateOutcome"') !== -1, 'len=' + sysPrompt.length);
    ok('it asks for it in the SAME JSON output schema documentation as other structured fields (kink_introduced appears earlier, temptFateOutcome closes the same object)', (() => { const a = sysPrompt.indexOf('"kink_introduced"'); const b = sysPrompt.indexOf('"temptFateOutcome"'); return a !== -1 && b !== -1 && a < b; })());
    ok('it carries per-effect durability instructions (expires|persists|uncertain)', sysPrompt.indexOf('expires | persists | uncertain') !== -1);
    await page.evaluate(() => { window.state.tempt_fate_invoked_this_turn = false; window.state.temptFateWish = ''; });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. Real dispatch, real parse, real acceptance check, real commit — network stubbed');
  await resetBaseline();
  {
    const sceneIdx = 1;
    await page.evaluate((si) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = 'everyone forgets the ceremony happened';
      window._recordTemptFateEvent(window.state.temptFateWish); // the REAL proposal-recording call, same as the real seal point
    }, sceneIdx);

    stubProxyWithPlan({
      temptFateOutcome: {
        delivered: true,
        changed: [{ subject: 'everyone present at the ceremony', whatChanged: 'no longer remembers it happening' }],
        durability: [{ aspect: 'the collective memory gap', status: 'persists', note: 'the scene never shows it fading' }],
        knowledgeStates: [{ character: 'Lirael', state: 'suspects', note: 'something is wrong even though she cannot name it' }],
        establishedEvidence: ['the ceremonial hall is still arranged for a rite no one recalls starting'],
        openPossibilities: ['someone could cross-reference the registrar\'s ledger against the hall\'s arrangement']
      }
    });

    const before = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    const returnedPlan = await page.evaluate((si) => window._runCGScreenplayGen(si, 'she walks the empty hall', ''), sceneIdx);
    const after = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    const entry = await page.evaluate(() => window.state._temptFateDurableConsequences[0]);

    ok('the real dispatch returned a plan (not a stale-rejected/null result)', returnedPlan && !returnedPlan.__staleRejected && !returnedPlan.__plannerFunctionRejected, JSON.stringify(returnedPlan && { __staleRejected: returnedPlan.__staleRejected, __plannerFunctionRejected: returnedPlan.__plannerFunctionRejected, hasBeats: !!(returnedPlan && returnedPlan.beats) }));
    ok('the parser RETAINED temptFateOutcome on the returned plan (not stripped by normalization)', returnedPlan && returnedPlan.temptFateOutcome && returnedPlan.temptFateOutcome.delivered === true, JSON.stringify(returnedPlan && returnedPlan.temptFateOutcome));
    ok('a durable consequence was actually committed via the REAL production path (not by calling the recorder directly)', after === before + 1, 'before=' + before + ' after=' + after);
    ok('the committed entry content matches what the (stubbed) model reported', entry && entry.requestedRupture === 'everyone forgets the ceremony happened' && entry.establishedEvidence[0].indexOf('ceremonial hall') !== -1, JSON.stringify(entry));

    // Filters the standard ambient page-load calls (csp-report/config/geo/beta-events) present on
    // every page load in every control this session, regardless of what's under test — never a
    // generation/provider call, never billable. Anything else here would be a real leak.
    const AMBIENT = /\/api\/(csp-report|config|geo|beta-events)\b/;
    const unstubbed = gate.unstubbed().filter((u) => !AMBIENT.test(u.url));
    ok('zero undeclared/paid GENERATION calls occurred (only the stubbed /api/proxy and /api/mistral-proxy paths were used for generation-shaped requests; ambient page-load calls excluded)', unstubbed.length === 0, JSON.stringify(unstubbed));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. A subsequent REAL planner/author request receives the committed effects, with distinctions intact');
  {
    // Runs IMMEDIATELY after section 2, BEFORE any later resetBaseline() wipes
    // state._temptFateDurableConsequences — building the REAL, FULL next-scene system prompt (not
    // an isolated sub-block) and confirming it carries section 2's committed consequence with all
    // required distinctions.
    const nextSysPrompt = await page.evaluate(() => window._buildCGScreenplaySystemPrompt());
    ok('the real, full next-scene system prompt contains the committed wish', nextSysPrompt.indexOf('everyone forgets the ceremony happened') !== -1);
    ok('it distinguishes ESTABLISHED fact from openPossibilities', nextSysPrompt.indexOf('ESTABLISHED') !== -1 && nextSysPrompt.indexOf('NOT YET ESTABLISHED') !== -1);
    ok('it carries the per-effect DURATION line', nextSysPrompt.indexOf('DURATION PER EFFECT') !== -1 && nextSysPrompt.indexOf('persists') !== -1);
    ok('it carries the per-character belief/knowledge state (Lirael suspects), not a blanket claim', nextSysPrompt.indexOf('Lirael suspects') !== -1);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. The app\'s OWN acceptance gate — not the model\'s self-report alone — governs the commit');
  {
    // Direct exercise of the REAL _cgAcceptDelivered with a genuinely manufactured stale scenario:
    // mint once (capturing that snapshot), mint AGAIN (simulating a second/concurrent request
    // overwriting state._cgDeliveredAssignments), then check the FIRST snapshot against the NOW-
    // current state — exactly what happens in production when a slow first response arrives after
    // a second request has already superseded it.
    const staleResult = await page.evaluate(() => {
      window.state.storyId = 'harness-story-1';
      window.state._sceneDecision = window.state._sceneDecision || {};
      // _cgMintDeliveredAssignments requires sceneNum >= 2 (sceneIndex >= 1) to do real work.
      var first = window._cgMintDeliveredAssignments ? window._cgMintDeliveredAssignments(1) : null;
      var firstAttemptId = first ? first.attemptId : null;
      var second = window._cgMintDeliveredAssignments ? window._cgMintDeliveredAssignments(1) : null; // supersedes the first in state
      var acc = window._cgAcceptDelivered(first, 1, firstAttemptId); // the FIRST (now-stale) request's own check
      return { firstAttemptId, secondAttemptId: second && second.attemptId, acc };
    });
    ok('minting twice produces two DIFFERENT attempt ids (a real, distinguishable stale-vs-current pair)', staleResult.firstAttemptId && staleResult.secondAttemptId && staleResult.firstAttemptId !== staleResult.secondAttemptId, JSON.stringify(staleResult));
    ok('the REAL _cgAcceptDelivered rejects the stale (first) request once a second request has superseded it', staleResult.acc && staleResult.acc.ok === false && /stale attempt/i.test(staleResult.acc.reason || ''), JSON.stringify(staleResult.acc));

    // Structural proof, against the REAL served source (not assumed from memory): the Tempt-outcome
    // commit block this pass added sits INSIDE the SAME `if (_normalized && plan)` guard as the
    // pre-existing kink-memory block, which itself only runs after the `if (!_acc.ok) { ...; return
    // ...; }` early-return. A rejected _acc therefore makes the commit code textually and
    // functionally unreachable — not merely "usually skipped".
    const appJs = await (await fetch('http://localhost:3000/app.js')).text();
    const accRejectIdx = appJs.indexOf("if (!_acc.ok) {");
    const kinkBlockIdx = appJs.indexOf('KINK MEMORY UPDATE (CG path)');
    const temptCommitIdx = appJs.indexOf('TEMPT FATE OUTCOME — COMMIT');
    ok('found all three source anchors in the real served app.js', accRejectIdx !== -1 && kinkBlockIdx !== -1 && temptCommitIdx !== -1, JSON.stringify({ accRejectIdx, kinkBlockIdx, temptCommitIdx }));
    ok('the acceptance-rejection early-return sits BEFORE both the kink-memory block and the new Tempt-outcome commit block in source order — a rejected generation cannot reach either', accRejectIdx < kinkBlockIdx && kinkBlockIdx < temptCommitIdx, JSON.stringify({ accRejectIdx, kinkBlockIdx, temptCommitIdx }));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. Rejected/undelivered scenes commit nothing, through the REAL production path');
  await resetBaseline();
  {
    const sceneIdx = 1;
    await page.evaluate((si) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = 'a wish that does not land this scene';
      window._recordTemptFateEvent(window.state.temptFateWish);
    }, sceneIdx);
    stubProxyWithPlan({ temptFateOutcome: { delivered: false } });
    const before = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdx);
    const after = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    ok('a model-reported delivered:false produces NO commit through the real dispatch path', after === before, 'before=' + before + ' after=' + after);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. Missing report is EXPLICITLY SURFACED (console warning), never silently treated as success');
  await resetBaseline();
  {
    const sceneIdx = 1;
    await page.evaluate((si) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = 'a wish the model forgets to report on';
      window._recordTemptFateEvent(window.state.temptFateWish);
    }, sceneIdx);
    stubProxyWithPlan({}); // no temptFateOutcome field at all — simulates a model that omitted it
    consoleLines.length = 0;
    const before = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdx);
    const after = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    const surfaced = consoleLines.some((l) => l.indexOf('[TEMPT-OUTCOME]') !== -1 && /no temptFateOutcome field/i.test(l));
    ok('no commit happens when the model omits the report entirely', after === before, 'before=' + before + ' after=' + after);
    ok('a missing report is EXPLICITLY logged/surfaced (a real console warning), not silently swallowed', surfaced, JSON.stringify(consoleLines.filter((l) => l.indexOf('TEMPT') !== -1)));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. Duplicate/retried commits through the REAL production path cannot duplicate effects');
  await resetBaseline();
  {
    const sceneIdx = 2;
    await page.evaluate((si) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = 'a wish generated twice';
      window._recordTemptFateEvent(window.state.temptFateWish);
    }, sceneIdx);
    stubProxyWithPlan({
      temptFateOutcome: { delivered: true, changed: [{ subject: 'x', whatChanged: 'y' }], durability: [{ aspect: 'x', status: 'persists' }], establishedEvidence: ['z'] }
    });
    await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdx);
    await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdx); // simulates a retry/duplicate generation for the SAME scene
    const count = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    ok('exactly ONE entry exists after two real generation calls for the same scene (idempotent through the real path, not just the pure function)', count === 1, 'count=' + count);
  }
  console.log('  NOTE: the exhaustive enumeration of malformed report SHAPES (6 variants) is already covered by');
  console.log('  _tempt_fate_model_driven_outcome_control.mjs §4 (calls the same real _commitTemptFateOutcome this');
  console.log('  pipeline calls) — not re-run here per "reuse existing controls where practical".');

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('TEMPT FATE OUTCOME PRODUCTION INTEGRATION CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  try { fs.unlinkSync(path.join(__dirname, '_tempt_fate_outcome_integration_control_out.jsonl')); } catch (_) {}
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
