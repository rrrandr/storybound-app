// TEMPT FATE OUTCOME — PRODUCTION INTEGRATION CONTROL (Roman, 2026-09-23; extended 2026-09-24
// after Codex's source review of the proposed live-test authorization sheet)
//
// Roman: "The summary proves that simulated reports work, but doesn't say which real generation
// call produces the report or where the real scene-acceptance path commits it. Given the earlier
// 'defined but never called' gaps, that distinction matters. Also, delivered:true must reflect the
// app's actual acceptance of the scene. A model asserting that flag cannot, by itself, establish
// that the player received the scene." No paid calls.
//
// 2026-09-24 (Codex review, addressed dry): five real production gaps found by reading source, not
// assumed — (1) the planner (_generateLiteraryPlotContract) never read Tempt Fate's durable
// consequences or the current invocation, only the ordinary-wish array; (2) prompt construction for
// BOTH the planner and the author read state.temptFateWish LIVE, after the scaffold/planner awaits
// — a second wish sealed mid-flight could leak into the wrong generation's prompt even though the
// eventual commit stayed correctly attributed; cleanup also cleared the live global unconditionally,
// which could destroy a legitimately newer invocation; (3) the outcome-commit dedup keyed on local
// sceneIdx, which resets at Issue boundaries, so a genuinely new proposal at a reused scene number
// was rejected as a duplicate; (4) the commit ran inside _runCGScreenplayGenInner, which only proves
// GENERATION acceptance, not that the scene was ever persisted/displayed. §§10-14 below prove each
// fix against the real functions; §§2/3/5-9 (unchanged from 2026-09-23) are adjusted only where the
// commit's new location (at persistence, not at generation) changes what they must call to observe
// it — their assertions and intent are otherwise unchanged.
//
// Unlike the prior control (which called _commitTemptFateOutcome directly with hand-built objects),
// THIS control exercises the REAL production functions: the real system-prompt builder
// (_buildCGScreenplaySystemPrompt), the real planner (_generateLiteraryPlotContract), the real
// dispatch (_runCGScreenplayGen -> fetch('/api/proxy')), the real JSON parse/normalize
// (_validateAndNormalizeCGPlan), the real acceptance gate (_cgAcceptDelivered), and the real
// commit-at-persistence + cleanup functions (_cgTemptFateCommitAtPersistence,
// _cgTemptFateAftermathCleanup). The network layer is STUBBED (installFailClosedNetworkGate's
// gate.stub), never called for real.
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
    && typeof window._recordTemptFateEvent === 'function'
    && typeof window._generateLiteraryPlotContract === 'function'
    && typeof window._cgTemptFateCommitAtPersistence === 'function'
    && typeof window._cgTemptFateAftermathCleanup === 'function'
    && typeof window._buildTemptFateDurableConsequenceDirective === 'function'
    && typeof window._updateTemptFateSaturationAndVolatility === 'function'
    && typeof window._detectMythicCoupleWish === 'function'
    && typeof window._activateMythicCoupleStatus === 'function', { timeout: 30000 })
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
      window.state._temptOutcomeCommittedProposals = {};
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
  let _inFlightSideEffect = null; // optional async fn run WHILE the "network request" is pending — simulates a race
  let _proxyRequestBodies = []; // every real request body this stub has seen, in order — for sections that need to inspect what was ACTUALLY sent, not just what came back (Roman/Codex review, 2026-09-24, §§11-12)
  gate.stub('/api/proxy', async (req) => {
    let _body = null; try { _body = JSON.parse(req.postData() || '{}'); } catch (_) {}
    _proxyRequestBodies.push(_body);
    if (_inFlightSideEffect) { const fn = _inFlightSideEffect; _inFlightSideEffect = null; await fn(); }
    return { content: JSON.stringify(Object.assign({ beats: VALID_BEATS, visualState: {}, is_consummate_scene: false }, _currentPlanFields)) };
  });
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
    // MIGRATED 2026-09-24 — these three used to prove the author was ASKED to self-certify the
    // outcome. It no longer is: the dedicated extractor reads the accepted page instead. The
    // assertions invert, and the contract itself is proven on the EXTRACTOR prompt in
    // _tempt_fate_outcome_contract_control.mjs §2.
    ok('the REAL CG system prompt NO LONGER asks the author to self-certify "temptFateOutcome"', sysPrompt.indexOf('"temptFateOutcome"') === -1, 'len=' + sysPrompt.length);
    ok('...nor for any of the outcome contract\'s own fields (affectedKnowers, scopeMatch)', sysPrompt.indexOf('affectedKnowers') === -1 && sysPrompt.indexOf('scopeMatch') === -1);
    // Removing the schema removed the key it closed, so the JSON schema block must still be
    // well-formed — no trailing comma left dangling before the closing brace. (This prompt is
    // built with no active rupture, so the ACTIVE INVOCATION directive is legitimately absent
    // here; the contract control covers that directive on a rupture prompt.)
    ok('...and the output schema block still closes cleanly — no dangling comma where the outcome key used to be',
      /"escalation_rhythm":[^\n]*\n\s*\}\s*\n\}/.test(sysPrompt) && sysPrompt.indexOf('},\n}') === -1,
      sysPrompt.slice(sysPrompt.indexOf('"escalation_rhythm"'), sysPrompt.indexOf('"escalation_rhythm"') + 400).slice(-120));
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
        delivered: true, requestedScope: 'the wish as written', deliveredScope: 'what the scene delivered', scopeMatch: 'full', ruptureClass: 'memory_perception', targetPopulation: { kind: 'all_present_except_invoker' }, affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of it' }], invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' }, unaccountedParties: [],
        changed: [{ subject: 'everyone present at the ceremony', whatChanged: 'no longer remembers it happening' }],
        durability: [{ aspect: 'the collective memory gap', status: 'persists', note: 'the scene never shows it fading' }],
        knowledgeStates: [{ character: 'Lirael', state: 'suspects', note: 'something is wrong even though she cannot name it' }],
        establishedEvidence: ['the ceremonial hall is still arranged for a rite no one recalls starting'],
        openPossibilities: ['someone could cross-reference the registrar\'s ledger against the hall\'s arrangement']
      }
    });

    const before = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    const returnedPlan = await page.evaluate((si) => window._runCGScreenplayGen(si, 'she walks the empty hall', ''), sceneIdx);
    const afterGenerationAlone = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    // COMMIT NOW HAPPENS AT PERSISTENCE, NOT AT GENERATION (Roman/Codex review, 2026-09-24 — see
    // §14 below for the dedicated proof). _cgTemptFateCommitAtPersistence is the real function
    // _completeStagedSceneFromScreenplay calls immediately after state.scenes.push/
    // _sceneLedgerCommit; calling it directly here simulates "persistence happened" without
    // invoking that whole async pipeline (same reasoning as _cgTemptFateAftermathCleanup's own
    // extraction, which this control already relies on).
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, returnedPlan);
    const after = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    const entry = await page.evaluate(() => window.state._temptFateDurableConsequences[0]);

    ok('the real dispatch returned a plan (not a stale-rejected/null result)', returnedPlan && !returnedPlan.__staleRejected && !returnedPlan.__plannerFunctionRejected, JSON.stringify(returnedPlan && { __staleRejected: returnedPlan.__staleRejected, __plannerFunctionRejected: returnedPlan.__plannerFunctionRejected, hasBeats: !!(returnedPlan && returnedPlan.beats) }));
    ok('the parser RETAINED temptFateOutcome on the returned plan (not stripped by normalization)', returnedPlan && returnedPlan.temptFateOutcome && returnedPlan.temptFateOutcome.delivered === true, JSON.stringify(returnedPlan && returnedPlan.temptFateOutcome));
    ok('generation ALONE commits nothing — the returned plan carries the pending outcome, not yet a durable entry', afterGenerationAlone === before, 'before=' + before + ' afterGenerationAlone=' + afterGenerationAlone);
    ok('a durable consequence was actually committed via the REAL production path once persistence is simulated (not by calling the recorder directly)', after === before + 1, 'before=' + before + ' after=' + after);
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
    const rp5 = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdx);
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rp5);
    const after = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    ok('a model-reported delivered:false produces NO commit through the real dispatch + commit-at-persistence path', after === before, 'before=' + before + ' after=' + after);
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
    const rp6 = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdx);
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rp6);
    const after = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    // MIGRATED 2026-09-24. An absent temptFateOutcome used to be a reportable failure. It is now
    // the EXPECTED shape — the author is not asked for one. What must still hold is that nothing
    // is committed until the extractor supplies and cites an outcome, and that the scene's
    // consequence is recorded as OUTSTANDING rather than quietly dropped.
    const pendingAfter = await page.evaluate(() => Object.keys(window.state._temptOutcomePending || {}).length);
    const blockedAfter = await page.evaluate(() => !!window._tfoContinuationBlocked(window.state));
    ok('no commit happens when no extracted outcome is available', after === before, 'before=' + before + ' after=' + after);
    ok('...the scene is instead recorded as an OUTSTANDING pending outcome, not silently dropped',
      pendingAfter >= 1, 'pending=' + pendingAfter);
    ok('...and the next continuation is blocked while it stays unresolved', blockedAfter === true, 'blocked=' + blockedAfter);
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
      temptFateOutcome: { delivered: true, requestedScope: 'the wish as written', deliveredScope: 'what the scene delivered', scopeMatch: 'full', ruptureClass: 'memory_perception', targetPopulation: { kind: 'all_present_except_invoker' }, affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of it' }], invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' }, unaccountedParties: [], changed: [{ subject: 'x', whatChanged: 'y' }], durability: [{ aspect: 'x', status: 'persists' }], establishedEvidence: ['z'] }
    });
    const rp7a = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdx);
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rp7a);
    const rp7b = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdx); // simulates a retry/duplicate generation for the SAME scene
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rp7b); // simulates that retry ALSO reaching persistence
    const count = await page.evaluate(() => (window.state._temptFateDurableConsequences || []).length);
    ok('exactly ONE entry exists after two real generation+persistence-commit calls for the same scene (idempotent through the real path, deduplicated by proposal identity, not just the pure function)', count === 1, 'count=' + count);
  }
  console.log('  NOTE: the exhaustive enumeration of malformed report SHAPES (6 variants) is already covered by');
  console.log('  _tempt_fate_model_driven_outcome_control.mjs §4 (calls the same real _commitTemptFateOutcome this');
  console.log('  pipeline calls) — not re-run here per "reuse existing controls where practical".');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('8. OWNERSHIP RACE — a second wish sealed WHILE the first generation is in flight must not be misattributed');
  await resetBaseline();
  {
    // Traced (design doc, this pass): the Tempt Fate zoom-card's own proceed handler has no
    // _stagedSubmitting/_isAdvancingScene check of its own, so this race is not proven impossible
    // by the real UI code path — only by (at most) a CSS dimming class of unverified coverage. This
    // section proves the FIX (stable identity captured at generation start) handles the race
    // correctly regardless of whether the UI ever actually allows it in practice.
    const sceneIdx = 1;
    const firstWish = 'the FIRST wish — this exact generation is for this one';
    const secondWish = 'a SECOND wish sealed while the first generation was still in flight';
    await page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      window._recordTemptFateEvent(w);
    }, firstWish);

    stubProxyWithPlan({
      temptFateOutcome: { delivered: true, requestedScope: 'the wish as written', deliveredScope: 'what the scene delivered', scopeMatch: 'full', ruptureClass: 'memory_perception', targetPopulation: { kind: 'all_present_except_invoker' }, affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of it' }], invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' }, unaccountedParties: [], changed: [{ subject: 'x', whatChanged: 'y' }], durability: [{ aspect: 'x', status: 'persists' }], establishedEvidence: ['from the FIRST generation'] }
    });
    // The in-flight side effect: WHILE the (stubbed) "network request" for the first generation is
    // pending, seal a second, unrelated wish — exactly the scenario a missing UI lock would allow.
    _inFlightSideEffect = () => page.evaluate((w) => {
      window._recordTemptFateEvent(w); // does NOT touch state.tempt_fate_invoked_this_turn or temptFateWish — a SEPARATE, later seal
    }, secondWish);

    const rp8 = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdx);
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rp8);
    const entry = await page.evaluate(() => window.state._temptFateDurableConsequences[0]);
    const ledgerLen = await page.evaluate(() => window.state._temptFateLedger.length);

    ok('the second wish really was sealed mid-flight (ledger now has 2 entries, proving the race actually happened, not a no-op test)', ledgerLen === 2, 'ledgerLen=' + ledgerLen);
    ok('the committed entry is attributed to the FIRST wish (the one THIS generation was actually for) — not the second, later one', entry && entry.requestedRupture === firstWish, JSON.stringify(entry));
    ok('the evidence content is the FIRST generation\'s own reported evidence, not contaminated by the second wish', entry && entry.establishedEvidence[0] === 'from the FIRST generation', JSON.stringify(entry && entry.establishedEvidence));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('9. Ordinary continuation after a Tempt invocation must not accidentally recommit the earlier wish');
  await resetBaseline();
  {
    // Turn N: a real Tempt invocation and commit (establishes a "prior wish" the ledger remembers).
    const sceneIdxA = 1;
    const wish = 'the ORIGINAL wish from an earlier turn';
    await page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      window._recordTemptFateEvent(w);
    }, wish);
    stubProxyWithPlan({ temptFateOutcome: { delivered: true, requestedScope: 'the wish as written', deliveredScope: 'what the scene delivered', scopeMatch: 'full', ruptureClass: 'memory_perception', targetPopulation: { kind: 'all_present_except_invoker' }, affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of it' }], invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' }, unaccountedParties: [], changed: [{ subject: 'x', whatChanged: 'y' }], durability: [{ aspect: 'x', status: 'persists' }], establishedEvidence: ['original'] } });
    const rp9a = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdxA);
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rp9a);
    const countAfterA = await page.evaluate(() => window.state._temptFateDurableConsequences.length);

    // Turn N+1: an ORDINARY continuation — Tempt genuinely NOT invoked this turn — but the
    // (stubbed) model drifts and echoes a temptFateOutcome anyway (the schema is unconditionally
    // documented every scene; a real model could plausibly do this by mistake).
    const sceneIdxB = 2;
    await page.evaluate(() => {
      window.state.tempt_fate_invoked_this_turn = false; // the real app.js sets this false via cleanup between turns
      window.state.temptFateWish = '';
    });
    stubProxyWithPlan({ temptFateOutcome: { delivered: true, requestedScope: 'the wish as written', deliveredScope: 'what the scene delivered', scopeMatch: 'full', ruptureClass: 'memory_perception', targetPopulation: { kind: 'all_present_except_invoker' }, affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of it' }], invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' }, unaccountedParties: [], changed: [{ subject: 'x', whatChanged: 'STRAY — should never be committed' }], durability: [{ aspect: 'x', status: 'persists' }], establishedEvidence: ['STRAY'] } });
    consoleLines.length = 0;
    const rp9b = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdxB);
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rp9b);
    const countAfterB = await page.evaluate(() => window.state._temptFateDurableConsequences.length);
    const surfacedStray = consoleLines.some((l) => /ORDINARY continuation.*Tempt not invoked/i.test(l));

    ok('the ordinary continuation (Tempt not invoked) does NOT create a second durable entry despite the model echoing a stray temptFateOutcome', countAfterB === countAfterA, 'countAfterA=' + countAfterA + ' countAfterB=' + countAfterB);
    ok('the stray report is explicitly surfaced as ignored, not silently dropped', surfacedStray, JSON.stringify(consoleLines.filter(l => l.indexOf('TEMPT-OUTCOME') !== -1)));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('10. PLANNER WIRING — the real planner request carries Tempt Fate context, Scene A (active invocation) and Scene B (durable-only)');
  await resetBaseline();
  {
    // Codex: "_generateLiteraryPlotContract does not reference temptFateWish,
    // _temptFateDurableConsequences, the new durable directive, or the shared continuity-spine
    // builder... Prove both Scene A and Scene B through captured planner requests, with the
    // planner enabled." window._plotContractKill is ON by default in resetBaseline (every other
    // section deliberately suppresses this unrelated system) — flipped OFF here, restored after.
    await page.evaluate(() => {
      window._plotContractKill = false;
      window.state.aPlot = { goal: 'stub goal' }; // no milestones/open-row structure — the plain default planner branch, matching an ordinary continuation
      window.state._sceneStateCard = {};
      window.state.rPlot = {};
    });

    // Scene A: an active invocation THIS turn — the planner's request must carry the wish itself.
    // _proxyRequestBodies is the shared /api/proxy stub's own Node-side recorder (declared above,
    // near stubProxyWithPlan) — every real request body this generation makes lands in it, in order.
    const sceneIdxA = 1;
    const wishA = 'everyone forgets the ceremony happened';
    await page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      window._recordTemptFateEvent(w);
    }, wishA);
    _proxyRequestBodies.length = 0;
    await page.evaluate((si) => window._runCGScreenplayGen(si, 'she steps back', ''), sceneIdxA);
    const joinedA = JSON.stringify(_proxyRequestBodies);
    ok('at least one real request this generation carried the planner\'s ACTIVE INVOCATION marker (Scene A)', joinedA.indexOf('ACTIVE INVOCATION THIS SCENE') !== -1, joinedA.slice(0, 400));
    ok('that request carried the actual wish text, not a placeholder (Scene A)', joinedA.indexOf(wishA) !== -1);

    // Scene B: an ORDINARY continuation — Tempt not invoked this turn — but a prior committed
    // durable consequence exists. The planner's request must carry the durable consequence, and
    // must NOT carry the active-invocation marker (nothing is being invoked this turn).
    const sceneIdxB = 2;
    await page.evaluate(() => {
      window.state.tempt_fate_invoked_this_turn = false;
      window.state.temptFateWish = '';
      window.state._temptFateDurableConsequences = [{
        id: 'tfc_probe', source: 'tempt', requestedRupture: 'everyone forgets the ceremony happened', proposalId: 'probe',
        sceneIdx: 1, changed: [{ subject: 'the assembly', whatChanged: 'no longer remembers the ceremony' }],
        durability: [{ aspect: 'the memory gap', status: 'persists' }], knowledgeStates: [], establishedEvidence: ['torn mouth-band on the ground'], openPossibilities: []
      }];
    });
    _proxyRequestBodies.length = 0;
    await page.evaluate((si) => window._runCGScreenplayGen(si, 'she looks around the clearing', ''), sceneIdxB);
    const joinedB = JSON.stringify(_proxyRequestBodies);
    ok('the ordinary continuation\'s real request carries the prior committed durable consequence (Scene B)', joinedB.indexOf('torn mouth-band on the ground') !== -1, joinedB.slice(0, 400));
    ok('the ordinary continuation\'s real request does NOT carry the active-invocation marker (Scene B — nothing is being invoked this turn)', joinedB.indexOf('ACTIVE INVOCATION THIS SCENE') === -1);

    await page.evaluate(() => { window._plotContractKill = true; }); // restore — every other section relies on this being suppressed
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('11. AUTHOR-PROMPT OWNERSHIP — a wish sealed mid-flight (during the planner\'s own await) must not leak into the author\'s actual request');
  await resetBaseline();
  {
    // Codex: "subsequent prompt construction still reads mutable state. A second wish sealed
    // during scaffold/planner work can therefore change the wish the author sees while the
    // eventual record remains attributed to the first proposal." Enable the planner so a REAL
    // await exists between generation start and the author's own _buildCGScreenplayUserPrompt
    // call (with the planner suppressed, as in every other section, there is no await in between
    // to race against — this section exists specifically to open that window).
    await page.evaluate(() => {
      window._plotContractKill = false;
      window.state.aPlot = { goal: 'stub goal' };
      window.state._sceneStateCard = {};
      window.state.rPlot = {};
    });
    const sceneIdx = 1;
    const firstWish = 'the FIRST wish — every real request this generation makes must reflect only this one';
    const secondWish = 'a SECOND wish sealed mid-flight, before the author\'s own prompt is built';
    await page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      window._recordTemptFateEvent(w);
    }, firstWish);
    // Fires on the FIRST real /api/proxy call this generation makes (whichever role reaches it
    // first — scaffold fallback, the planner, or the author; the point is it lands BEFORE the
    // author's own prompt is built, since scaffold+planner both precede it in the real call order).
    _inFlightSideEffect = () => page.evaluate((w) => { window._recordTemptFateEvent(w); }, secondWish);
    _proxyRequestBodies.length = 0;
    await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdx);
    const capturedBodies = _proxyRequestBodies.slice();
    const allBodiesJSON = JSON.stringify(capturedBodies);
    const ledgerLen = await page.evaluate(() => window.state._temptFateLedger.length);

    ok('the second wish really was sealed mid-flight (ledger now has 2 entries — the race actually happened)', ledgerLen === 2, 'ledgerLen=' + ledgerLen);
    ok('NO real request this generation made carries the second wish\'s text', allBodiesJSON.indexOf(secondWish) === -1, allBodiesJSON.slice(0, 200));
    ok('the author\'s own request (the last one this generation makes) carries the FIRST wish\'s text', (() => { const last = JSON.stringify(capturedBodies[capturedBodies.length - 1] || {}); return last.indexOf(firstWish) !== -1; })(), allBodiesJSON.slice(-400));

    await page.evaluate(() => { window._plotContractKill = true; });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('12. CLEANUP OWNERSHIP — a newer invocation sealed mid-flight must survive this generation\'s cleanup, not be destroyed by it');
  await resetBaseline();
  {
    // Codex: "Cleanup also clears the current global wish and flag unconditionally... preserve
    // that newer invocation after the first finishes." Exercises the REAL _cgTemptFateAftermathCleanup.
    const firstWish = 'the FIRST wish — this generation\'s own invocation';
    const secondWish = 'a SECOND wish sealed mid-flight — must survive cleanup for its OWN future generation';
    const owned = await page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      const entry = window._recordTemptFateEvent(w);
      return entry || window.state._temptFateLedger[window.state._temptFateLedger.length - 1];
    }, firstWish);
    // Simulate the second wish being sealed WHILE the first generation was still in flight —
    // exactly what §11 proved actually happens to the ledger under a real UI race.
    await page.evaluate((w) => { window._recordTemptFateEvent(w); window.state.temptFateWish = w; window.state.tempt_fate_invoked_this_turn = true; }, secondWish);

    consoleLines.length = 0;
    await page.evaluate((o) => window._cgTemptFateAftermathCleanup(o, true), owned);
    const liveWishAfter = await page.evaluate(() => window.state.temptFateWish);
    const liveInvokedAfter = await page.evaluate(() => window.state.tempt_fate_invoked_this_turn);
    const preservedLog = consoleLines.some((l) => /preserving live state/i.test(l));

    ok('the live wish still reads as the SECOND (newer) invocation — NOT destroyed by the first generation\'s cleanup', liveWishAfter === secondWish, 'liveWishAfter=' + liveWishAfter);
    ok('the live invoked-this-turn flag was NOT cleared — the second invocation remains live for its own future generation', liveInvokedAfter === true, 'liveInvokedAfter=' + liveInvokedAfter);
    ok('the preservation is explicitly logged, not silent', preservedLog, JSON.stringify(consoleLines.filter((l) => l.indexOf('TEMPT-CLEANUP') !== -1)));

    // Regression: the ORDINARY case (no race — cleanup owns the still-current invocation) must
    // still clear normally, exactly as before this fix.
    await resetBaseline();
    const ordinaryWish = 'an ordinary, unraced invocation';
    const ordinaryOwned = await page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      const entry = window._recordTemptFateEvent(w);
      return entry || window.state._temptFateLedger[window.state._temptFateLedger.length - 1];
    }, ordinaryWish);
    await page.evaluate((o) => window._cgTemptFateAftermathCleanup(o, true), ordinaryOwned);
    const ordinaryWishAfter = await page.evaluate(() => window.state.temptFateWish);
    const ordinaryInvokedAfter = await page.evaluate(() => window.state.tempt_fate_invoked_this_turn);
    ok('REGRESSION: the ordinary (unraced) case still clears the live wish/flag normally, exactly as before this fix', ordinaryWishAfter === '' && ordinaryInvokedAfter === false, 'wish=' + JSON.stringify(ordinaryWishAfter) + ' invoked=' + ordinaryInvokedAfter);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('13. DEDUPLICATION BY PROPOSAL IDENTITY — a distinct later wish at the SAME local scene number must NOT be rejected as a duplicate; a genuine duplicate callback must still be rejected');
  await resetBaseline();
  {
    // Codex: "_commitTemptFateOutcome still deduplicates solely by sceneIdx... The committed-scene
    // map is carried into subsequent issues, where scene numbering restarts... Cover duplicate
    // callbacks and a distinct later wish using the same local scene number." Calls the REAL
    // _commitTemptFateOutcome directly (established pattern in this file's own §7 note) — this is
    // a pure-function-level proof of the dedup KEY, independent of the full dispatch pipeline.
    const sceneIdx = 5; // Issue 1's local scene 5
    const entryIssue1 = { id: 'tfl_1001', wishText: 'Issue 1, local scene 5' };
    const report1 = { delivered: true, requestedScope: 'the wish as written', deliveredScope: 'what the scene delivered', scopeMatch: 'full', ruptureClass: 'memory_perception', targetPopulation: { kind: 'all_present_except_invoker' }, affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of it' }], invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' }, unaccountedParties: [], changed: [{ subject: 'x', whatChanged: 'Issue 1 effect' }], durability: [{ aspect: 'x', status: 'persists' }], establishedEvidence: ['Issue 1 evidence'] };
    const committed1 = await page.evaluate((args) => window._commitTemptFateOutcome(args.sceneIdx, args.entry, args.report), { sceneIdx, entry: entryIssue1, report: report1 });
    ok('the first proposal (Issue 1, local scene 5) commits successfully', !!committed1, JSON.stringify(committed1));

    // A DUPLICATE callback for the SAME proposal (same stable id) at the same sceneIdx — must be rejected.
    const committedDup = await page.evaluate((args) => window._commitTemptFateOutcome(args.sceneIdx, args.entry, args.report), { sceneIdx, entry: entryIssue1, report: report1 });
    ok('a genuine duplicate callback for the SAME proposal is rejected (returns null, no new entry)', committedDup === null, JSON.stringify(committedDup));

    // A DISTINCT proposal (different stable id — a later Issue's own new invocation) reusing the
    // SAME local sceneIdx (Issue 2's own scene numbering restarted from 0/low numbers, per the
    // save-carry mechanism this file's own header notes) — must commit successfully, NOT be
    // rejected as a duplicate of the unrelated Issue 1 proposal that happened to share a number.
    const entryIssue2 = { id: 'tfl_2001', wishText: 'Issue 2, ALSO local scene 5 — a different proposal entirely' };
    const report2 = { delivered: true, requestedScope: 'the wish as written', deliveredScope: 'what the scene delivered', scopeMatch: 'full', ruptureClass: 'memory_perception', targetPopulation: { kind: 'all_present_except_invoker' }, affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of it' }], invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' }, unaccountedParties: [], changed: [{ subject: 'y', whatChanged: 'Issue 2 effect' }], durability: [{ aspect: 'y', status: 'persists' }], establishedEvidence: ['Issue 2 evidence'] };
    const committed2 = await page.evaluate((args) => window._commitTemptFateOutcome(args.sceneIdx, args.entry, args.report), { sceneIdx, entry: entryIssue2, report: report2 });
    ok('a DISTINCT proposal at the SAME local sceneIdx (simulating an Issue-boundary reset) commits successfully — not rejected as a duplicate', !!committed2, JSON.stringify(committed2));

    const finalCount = await page.evaluate(() => window.state._temptFateDurableConsequences.length);
    ok('exactly TWO durable entries exist — one per genuine proposal, the duplicate callback added nothing', finalCount === 2, 'finalCount=' + finalCount);

    // A proposal with NO stable id at all must be refused, not silently deduplicated against the
    // wrong thing (defense-in-depth for the case a caller fails to capture a real ledger entry).
    const committedNoId = await page.evaluate((args) => window._commitTemptFateOutcome(args.sceneIdx, args.entry, args.report), { sceneIdx: 6, entry: { wishText: 'no stable id' }, report: report1 });
    ok('a proposal with no stable id is refused rather than committed unsafely', committedNoId === null, JSON.stringify(committedNoId));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('14. COMMIT-AT-PERSISTENCE — structural proof that a failure before real scene persistence leaves no durable outcome');
  {
    // §2 above already proves, dynamically, that GENERATION ALONE (before _cgTemptFateCommitAtPersistence
    // is ever called) leaves state._temptFateDurableConsequences unchanged. What remains to prove
    // is that in the REAL served source, the commit call sits textually AFTER real persistence
    // (state.scenes.push / _sceneLedgerCommit) inside the SAME try block, so an exception anywhere
    // in prose assembly/push/ledger-commit prevents the commit line from ever being reached — the
    // same structural-proof style this file's own §4 already uses for the acceptance gate.
    const appJs = await (await fetch('http://localhost:3000/app.js')).text();
    const pushIdx = appJs.indexOf("state.scenes.push({ title: '', synopsis: '', text: proseAssembled, fateCard: null });");
    const ledgerCommitIdx = appJs.indexOf("_sceneLedgerCommit(state, { kind: 'cg'");
    const commitAtPersistenceCallIdx = appJs.indexOf('_cgTemptFateCommitAtPersistence(plan);');
    const commitAtPersistenceDefIdx = appJs.indexOf('function _cgTemptFateCommitAtPersistence(plan)');
    ok('found all four source anchors in the real served app.js', pushIdx !== -1 && ledgerCommitIdx !== -1 && commitAtPersistenceCallIdx !== -1 && commitAtPersistenceDefIdx !== -1, JSON.stringify({ pushIdx, ledgerCommitIdx, commitAtPersistenceCallIdx, commitAtPersistenceDefIdx }));
    ok('real prose persistence (state.scenes.push) happens BEFORE the Tempt-outcome commit call in source order', pushIdx < commitAtPersistenceCallIdx, JSON.stringify({ pushIdx, commitAtPersistenceCallIdx }));
    ok('the scene ledger commit ALSO happens BEFORE the Tempt-outcome commit call in source order', ledgerCommitIdx < commitAtPersistenceCallIdx, JSON.stringify({ ledgerCommitIdx, commitAtPersistenceCallIdx }));
    // Both the push and the commit call sit inside the SAME try block if no unrelated `} catch` or
    // `function` boundary appears between the ledger-commit line and the commit call line other
    // than plain nested try/catch (which the source uses for defense-in-depth around each sub-step,
    // never a function/scope boundary) — approximate but meaningful check: no top-level `async
    // function` declaration appears between them (would mean they are NOT in the same function/try).
    const between = appJs.slice(ledgerCommitIdx, commitAtPersistenceCallIdx);
    ok('no function boundary sits between real persistence and the commit call (both remain in the same try scope)', between.indexOf('async function ') === -1 && between.indexOf('\n  function ') === -1, 'betweenLen=' + between.length);
    ok('_cgTemptFateCommitAtPersistence is defined as its own extracted function (mirrors _cgTemptFateAftermathCleanup extraction) — directly callable from a dry control, as sections 2/5/6/7/8/9 above already do', commitAtPersistenceDefIdx !== -1);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('15. VOLATILITY/SATURATION RACE — reproduced through the real production path (Codex\'s second-pass finding)');
  await resetBaseline();
  {
    // Codex: "_cgTemptFateAftermathCleanup calls _updateTemptFateSaturationAndVolatility() before
    // it consults the generation's captured proposal... If wish B is sealed while Scene A is being
    // generated, Scene A's cleanup can create its window, saturation increment, and aftermath under
    // wish B." Fixed by passing the OWNED invocation straight through as explicit arguments (no
    // global ever temporarily overwritten) — reproduced here through the REAL functions in the REAL
    // order (_runCGScreenplayGen -> _cgTemptFateCommitAtPersistence -> _cgTemptFateAftermathCleanup,
    // the exact sequence _completeStagedSceneFromScreenplay itself runs), not a reimplementation.
    const sceneIdxA = 1;
    const wishA = 'wish A — this scene is being generated for THIS wish';
    const wishB = 'wish B — sealed mid-flight, must survive intact and get its OWN separate activation';
    await page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      window._recordTemptFateEvent(w);
    }, wishA);
    const ownedA = await page.evaluate(() => { const led = window.state._temptFateLedger; return led[led.length - 1]; });
    stubProxyWithPlan({ temptFateOutcome: { delivered: true, requestedScope: 'the wish as written', deliveredScope: 'what the scene delivered', scopeMatch: 'full', ruptureClass: 'memory_perception', targetPopulation: { kind: 'all_present_except_invoker' }, affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of it' }], invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' }, unaccountedParties: [], changed: [{ subject: 'x', whatChanged: 'A landed' }], durability: [{ aspect: 'x', status: 'persists' }], establishedEvidence: ['A evidence'] } });
    // The full real seal (ledger record AND the live wish/flag assignment — mirrors app.js
    // ~108868/108965, not just the partial ledger-only race sections 8/11 above use to isolate a
    // narrower race) fires WHILE Scene A's stubbed request is pending.
    _inFlightSideEffect = () => page.evaluate((w) => {
      window._recordTemptFateEvent(w);
      window.state.temptFateWish = w;
      window.state.tempt_fate_invoked_this_turn = true;
    }, wishB);

    const rpA = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdxA);
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rpA);
    await page.evaluate((o) => window._cgTemptFateAftermathCleanup(o, true), ownedA);

    const windowWishTextA = await page.evaluate(() => window.state.volatility_window && window.state.volatility_window.wishText);
    const satAfterA = await page.evaluate(() => window.state.fate_saturation);
    const committedEntryA = await page.evaluate(() => window.state._temptFateDurableConsequences[0]);
    const liveWishAfterA = await page.evaluate(() => window.state.temptFateWish);
    const liveInvokedAfterA = await page.evaluate(() => window.state.tempt_fate_invoked_this_turn);
    const ledgerLenAfterA = await page.evaluate(() => window.state._temptFateLedger.length);

    ok('the race really happened (2 ledger entries — not a no-op test)', ledgerLenAfterA === 2, 'ledgerLenAfterA=' + ledgerLenAfterA);
    ok('Scene A\'s volatility window carries wish A\'s text, not wish B\'s', windowWishTextA === wishA, 'windowWishTextA=' + windowWishTextA);
    ok('saturation incremented for A\'s invocation (exactly once so far)', typeof satAfterA === 'number' && satAfterA > 0, 'satAfterA=' + satAfterA);
    ok('the committed durable outcome is attributed to wish A', committedEntryA && committedEntryA.requestedRupture === wishA, JSON.stringify(committedEntryA));
    ok('wish B survives Scene A\'s cleanup intact — NOT destroyed by it', liveWishAfterA === wishB && liveInvokedAfterA === true, 'liveWishAfterA=' + liveWishAfterA + ' liveInvokedAfterA=' + liveInvokedAfterA);

    // B now runs its OWN real generation+commit+cleanup cycle — must produce exactly ONE separate
    // activation, carrying B's own text, not still A's and not double-counted.
    const satBeforeB = satAfterA;
    const ownedB = await page.evaluate(() => { const led = window.state._temptFateLedger; return led[led.length - 1]; });
    stubProxyWithPlan({ temptFateOutcome: { delivered: true, requestedScope: 'the wish as written', deliveredScope: 'what the scene delivered', scopeMatch: 'full', ruptureClass: 'memory_perception', targetPopulation: { kind: 'all_present_except_invoker' }, affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of it' }], invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' }, unaccountedParties: [], changed: [{ subject: 'y', whatChanged: 'B landed' }], durability: [{ aspect: 'y', status: 'persists' }], establishedEvidence: ['B evidence'] } });
    const sceneIdxB = 2;
    const rpB = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdxB);
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rpB);
    await page.evaluate((o) => window._cgTemptFateAftermathCleanup(o, true), ownedB);

    const windowWishTextB = await page.evaluate(() => window.state.volatility_window && window.state.volatility_window.wishText);
    const satAfterB = await page.evaluate(() => window.state.fate_saturation);
    const committedEntryB = await page.evaluate(() => window.state._temptFateDurableConsequences[1]);

    ok('B\'s own generation creates its OWN separate volatility window carrying B\'s text (not still A\'s, not blended)', windowWishTextB === wishB, 'windowWishTextB=' + windowWishTextB);
    ok('B\'s own generation increments saturation exactly once more (a genuinely separate activation, not skipped or doubled)', typeof satAfterB === 'number' && satAfterB > satBeforeB, 'satBeforeB=' + satBeforeB + ' satAfterB=' + satAfterB);
    ok('B\'s outcome commits separately, attributed to wish B, as a second distinct durable entry', committedEntryB && committedEntryB.requestedRupture === wishB, JSON.stringify(committedEntryB));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('16. MYTHIC COUPLE — a successful "let the world know" wish creates lasting, bounded public recognition, gated on the accepted commit (not seal-time keyword detection)');
  await resetBaseline();
  {
    // Codex/Roman: "the legacy Mythic Couple path appears to activate directly from keyword
    // detection when the wish is sealed, before a scene is accepted." Fixed: activation now lives
    // inside _commitTemptFateOutcome, gated on the SAME dedup/validation/delivered:true bar every
    // other durable Tempt effect meets. Proven here against the real functions.
    await page.evaluate(() => { window.state._mythicCoupleStatus = null; });
    const sceneIdx = 1;
    const wish = 'let the world know us — what Julian and I did';
    await page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      window._recordTemptFateEvent(w);
    }, wish);

    // Detection must have matched (this is a Shape-B "let the world know us" wish) but activation
    // must NOT have happened yet — nothing has been generated, let alone accepted.
    const detectedButNotYetActive = await page.evaluate((w) => ({
      detected: window._detectMythicCoupleWish(w),
      statusBeforeGeneration: window.state._mythicCoupleStatus
    }), wish);
    ok('the wish is correctly detected as mythic-shaped by the classifier', detectedButNotYetActive.detected === true);
    ok('mythic status is NOT active before any scene has been generated or accepted (no seal-time activation)', !detectedButNotYetActive.statusBeforeGeneration || detectedButNotYetActive.statusBeforeGeneration.active !== true, JSON.stringify(detectedButNotYetActive.statusBeforeGeneration));

    stubProxyWithPlan({
      temptFateOutcome: {
        delivered: true, requestedScope: 'the wish as written', deliveredScope: 'what the scene delivered', scopeMatch: 'full', ruptureClass: 'memory_perception', targetPopulation: { kind: 'all_present_except_invoker' }, affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of it' }], invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' }, unaccountedParties: [],
        changed: [{ subject: 'the tavern crowd and every traveler who passes through', whatChanged: 'now recognizes Julian and Lirael by name and story' }],
        durability: [{ aspect: 'the couple\'s public recognition', status: 'persists', note: 'the scene shows it spreading, not fading' }],
        knowledgeStates: [{ character: 'the tavern crowd', state: 'knows', note: 'recites the story back to them unprompted' }],
        establishedEvidence: ['a stranger at the bar toasts them by name before they introduce themselves'],
        openPossibilities: ['a rival house could use the notoriety against them']
      }
    });
    const rp = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdx);
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rp);

    const statusAfter = await page.evaluate(() => window.state._mythicCoupleStatus);
    ok('mythic status activates ONLY once the scene\'s outcome actually commits — not at seal', statusAfter && statusAfter.active === true, JSON.stringify(statusAfter));
    ok('the activated status carries the real wish text', statusAfter && statusAfter.wishText === wish, JSON.stringify(statusAfter));

    const directive = await page.evaluate(() => window.buildMythicCoupleDirective());
    ok('the real mythic-couple author directive now fires for future prompts', directive.indexOf('MYTHIC COUPLE RECOGNITION') !== -1, directive.slice(0, 300));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('17. MYTHIC COUPLE — an infamous/hostile recognition outcome carries different consequences than the celebratory case');
  await resetBaseline();
  {
    await page.evaluate(() => { window.state._mythicCoupleStatus = null; });
    const sceneIdx = 1;
    const wish = 'make our names legend, even if they curse us for it';
    await page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      window._recordTemptFateEvent(w);
    }, wish);
    stubProxyWithPlan({
      temptFateOutcome: {
        delivered: true, requestedScope: 'the wish as written', deliveredScope: 'what the scene delivered', scopeMatch: 'full', ruptureClass: 'memory_perception', targetPopulation: { kind: 'all_present_except_invoker' }, affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of it' }], invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' }, unaccountedParties: [],
        changed: [{ subject: 'the assembly', whatChanged: 'now speaks their names as a warning, not a celebration' }],
        durability: [{ aspect: 'the infamy', status: 'persists' }],
        knowledgeStates: [{ character: 'the assembly', state: 'believes', note: 'treats them as a cautionary tale, not heroes' }],
        establishedEvidence: ['parents invoke their names to frighten children into obedience'],
        openPossibilities: ['someone could try to exploit the fear this infamy generates']
      }
    });
    const rp = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdx);
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rp);

    const entry = await page.evaluate(() => window.state._temptFateDurableConsequences[0]);
    const statusAfter = await page.evaluate(() => window.state._mythicCoupleStatus);
    ok('the infamous outcome still commits as a durable consequence (fame and infamy are both valid lasting Tempt outcomes)', entry && entry.requestedRupture === wish, JSON.stringify(entry));
    ok('the committed content reflects the HOSTILE register, not a celebratory one (a warning/cautionary-tale framing, distinct from section 16\'s celebratory one)', entry && entry.changed[0].whatChanged.indexOf('warning') !== -1, JSON.stringify(entry && entry.changed));
    ok('mythic status also activates for this shape (recognition is recognition — the classifier does not distinguish tone, the outcome record itself carries that)', statusAfter && statusAfter.active === true);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('18. MYTHIC COUPLE — a wish that invokes fame but the scene does not deliver it must NOT commit mythic status');
  await resetBaseline();
  {
    await page.evaluate(() => { window.state._mythicCoupleStatus = null; });
    const sceneIdx = 1;
    const wish = 'let the world know us';
    await page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      window._recordTemptFateEvent(w);
    }, wish);
    stubProxyWithPlan({ temptFateOutcome: { delivered: false } }); // the scene did not deliver
    const rp = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdx);
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rp);

    const statusAfter = await page.evaluate(() => window.state._mythicCoupleStatus);
    const durableCount = await page.evaluate(() => window.state._temptFateDurableConsequences.length);
    ok('an undelivered scene commits NO durable outcome', durableCount === 0, 'durableCount=' + durableCount);
    ok('a mythic-shaped wish that was NOT delivered does NOT activate mythic status — a failed scene cannot make anyone famous', !statusAfter || statusAfter.active !== true, JSON.stringify(statusAfter));

    // Same proof for a MALFORMED report (structurally invalid, never reaches delivered:true at all).
    await page.evaluate(() => { window.state._mythicCoupleStatus = null; window.state.tempt_fate_invoked_this_turn = true; window.state.temptFateWish = 'let the world know us, again'; window._recordTemptFateEvent('let the world know us, again'); });
    stubProxyWithPlan({ temptFateOutcome: { delivered: true } }); // delivered:true but nothing changed/established — shape error
    const rp2 = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdx + 1);
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rp2);
    const statusAfterMalformed = await page.evaluate(() => window.state._mythicCoupleStatus);
    ok('a malformed report (fails structural validation) also does NOT activate mythic status', !statusAfterMalformed || statusAfterMalformed.active !== true, JSON.stringify(statusAfterMalformed));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('19. MYTHIC COUPLE — an ordinary continuation carries the resulting social fact without reactivating or duplicating it');
  await resetBaseline();
  {
    await page.evaluate(() => { window.state._mythicCoupleStatus = null; });
    // Turn N: a real, successful mythic activation (mirrors section 16).
    const sceneIdxA = 1;
    const wish = 'let the world know us — what Julian and I did';
    await page.evaluate((w) => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = w;
      window._recordTemptFateEvent(w);
    }, wish);
    stubProxyWithPlan({ temptFateOutcome: { delivered: true, requestedScope: 'the wish as written', deliveredScope: 'what the scene delivered', scopeMatch: 'full', ruptureClass: 'memory_perception', targetPopulation: { kind: 'all_present_except_invoker' }, affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false, nowKnows: 'nothing of it' }], invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' }, unaccountedParties: [], changed: [{ subject: 'the town', whatChanged: 'recognizes them on sight' }], durability: [{ aspect: 'recognition', status: 'persists' }], establishedEvidence: ['strangers greet them by name'] } });
    const rpA = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdxA);
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rpA);
    const statusAfterA = await page.evaluate(() => window.state._mythicCoupleStatus);
    ok('setup: mythic status is active after the real commit (section 16 pattern, re-verified here as this section\'s own baseline)', statusAfterA && statusAfterA.active === true);
    const sealedAtSceneA = statusAfterA.sealedAtScene;

    // Turn N+1: an ORDINARY continuation — Tempt not invoked, no new wish, mythic status already
    // active from Turn N. The real author directive must carry the fact WITHOUT any reactivation.
    const sceneIdxB = 2;
    await page.evaluate(() => { window.state.tempt_fate_invoked_this_turn = false; window.state.temptFateWish = ''; });
    stubProxyWithPlan({}); // no temptFateOutcome at all — ordinary continuation
    const rpB = await page.evaluate((si) => window._runCGScreenplayGen(si, 'x', ''), sceneIdxB);
    await page.evaluate(async (p) => { window._cgTemptFateCommitAtPersistence(p); await window._tfoResumePending(); }, rpB);

    const statusAfterB = await page.evaluate(() => window.state._mythicCoupleStatus);
    const directiveB = await page.evaluate(() => window.buildMythicCoupleDirective());
    ok('the ordinary continuation does NOT re-seal/reactivate mythic status (same sealedAtScene, not bumped to a later scene)', statusAfterB && statusAfterB.sealedAtScene === sealedAtSceneA, 'sealedAtSceneA=' + sealedAtSceneA + ' sealedAtSceneAfterB=' + (statusAfterB && statusAfterB.sealedAtScene));
    ok('the real author directive still carries the recognition fact on the ordinary continuation (the social fact persists into future prompts without needing to be re-triggered)', directiveB.indexOf('MYTHIC COUPLE RECOGNITION') !== -1);
    const durableCountAfterB = await page.evaluate(() => window.state._temptFateDurableConsequences.length);
    ok('no duplicate durable entry was created by the ordinary continuation', durableCountAfterB === 1, 'durableCountAfterB=' + durableCountAfterB);
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('TEMPT FATE OUTCOME PRODUCTION INTEGRATION CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  try { fs.unlinkSync(path.join(__dirname, '_tempt_fate_outcome_integration_control_out.jsonl')); } catch (_) {}
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
