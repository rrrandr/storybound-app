// TEMPT FATE MEMORY-ERASURE — ONE LIVE, EXPLICITLY-AUTHORIZED RUN (Roman, 2026-09-24)
//
// Real, paid, one-shot run under the seventh-revision authorization sheet
// (_tempt_fate_memory_erasure_live_authorization_2026_09_23.md). Roman: "Run the seventh-revision
// memory-erasure test once, under the $0.40 combined cap. No images, no extra scenes, no retry
// beyond the declared policy; preserve both raw scenes and the outcome record, then stop."
//
// PRE-FLIGHT FINDING (this run, before any dispatch): the real Tempt-zoom Proceed click drives a
// previously-untested "wish cinesequence" subsystem (app.js ~199779-200348 + ~200350-200670+),
// never exercised by any of the six prior dry passes (those bypassed the real Proceed click via
// synthetic ledger/plan construction). Traced fully before this run:
//   - _classifyWishCG (app.js ~199719) can fire ONE real gpt-4o-mini call ("gray zone" classifier)
//     the instant Proceed is clicked, fire-and-forget, NOT awaited by the click handler. This
//     directly contradicts this sheet's own §2 claim ("Sealing a wish... is local only") — disclosed
//     here, tracked under its own gate phase below, and folded into the real cost total.
//   - _prefireWishImage (app.js ~200491) fires a REAL BFL/Kontext image call the instant Scene A's
//     turn renders (auto, not gated behind any click) — contained by never adding image endpoints to
//     allowRealPaths (fail-closed default aborts it before it leaves the browser), same guarantee the
//     dry harness already proved for image endpoints.
//   - _renderWishBeat2/_renderWishBeat3 (the "Next"-button beats) are the ONLY path to
//     _generateWishEffectNarrative (a real gpt-4o-mini call) and to actually consuming the pre-fired
//     image — reached only by clicking a "Next" affordance that mounts after Scene A renders. This
//     run NEVER clicks it; instead it resolves the sequence directly via window.WishSequence.resolve()
//     (bypasses beat 2/3 entirely — confirmed by source that _resolveWishSequence() calls neither
//     _renderWishBeat2 nor _renderWishBeat3, only the scope-branch handlers below).
//   - _applyInScopeFateChangeCG / _exitCGForStoryRupture (app.js ~200669/200703), the scope-branch
//     handlers _resolveWishSequence() calls, write state._pendingFateChangeCG / state._pendingFateRupture
//     — confirmed via grep this run to have ZERO readers anywhere in app.js (unwired "Task 6" stub
//     plumbing). Resolving the sequence is therefore side-effect-free with respect to the ALREADY
//     load-bearing, extensively-tested temptFateOutcome / _temptFateDurableConsequences mechanism —
//     the two systems are architecturally independent; this one is simply inert for CG mode.
// This is exactly what "no images, no extra scenes" in Roman's authorization already anticipates —
// this run's design routes around all three surfaces accordingly (see phases below).
//
// SAFETY: same fail-closed, persistently-logged pattern as the one real precedent in this repo
// (_first_sacrifice_live_scene2_boundary_sample.mjs) — every approved request is persisted to disk
// the instant it is released and the instant it settles; the browser is NEVER closed while anything
// approved is still unsettled; image endpoints are NEVER in the allowed-real list.
//
// usage: node _tempt_fate_memory_erasure_live_run_2026_09_24.mjs   (real, paid — already authorized)

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { sceneToText } from './_tempt_fate_scene_text.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_tempt_fate_memory_erasure_live_run_out');
fs.mkdirSync(OUT_DIR, { recursive: true });
const LOG_FILE = path.join(OUT_DIR, 'run_' + Date.now() + '.jsonl');

// ── SOURCED RATES — verbatim from public/app.js TEXT_PRICING (~4764-4811). $/token. ──
const TEXT_PRICING = {
  'gpt-4o-mini': { in: 0.00000015, out: 0.0000006 },
  'gpt-4o': { in: 0.0000025, out: 0.00001 },
  'grok-4-1-fast-reasoning': { in: 0.00000125, out: 0.0000025 },
  'grok-4-1-fast-non-reasoning': { in: 0.00000125, out: 0.0000025 },
  'mistral-small-latest': { in: 0.00000015, out: 0.0000006 },
  'ministral-8b-2512': { in: 0.00000015, out: 0.00000015 }
};
const TICK_TO_USD = 1e-10; // public/app.js TEXT_COST_TICK_TO_USD — provider-reported cost_in_usd_ticks, when present, is authoritative

function realCost(model, usage) {
  if (!usage) return { cost: null, note: 'no usage block returned' };
  if (typeof usage.cost_in_usd_ticks === 'number' && usage.cost_in_usd_ticks > 0) {
    return { cost: usage.cost_in_usd_ticks * TICK_TO_USD, note: 'provider_ticks' };
  }
  const rate = model && TEXT_PRICING[model];
  if (!rate) return { cost: null, note: 'no sourced price row for model="' + model + '"' };
  const promptTok = usage.prompt_tokens || usage.input_tokens || 0;
  const compTok = usage.completion_tokens || usage.output_tokens || 0;
  return { cost: promptTok * rate.in + compTok * rate.out, note: 'estimated_from_real_tokens' };
}
function summarizeTracked(c) {
  const body = c.requestBody || {};
  const model = body.model || body.preferredModel || (c.responseBody && c.responseBody._orchestration && c.responseBody._orchestration.model) || null;
  const usage = c.responseBody && c.responseBody.usage;
  const costInfo = model ? realCost(model, usage) : { cost: null, note: 'model not identified in request body' };
  return { url: c.url, roleTag: c.roleTag, model, status: c.status, networkError: c.networkError, usage: usage || null, costUsd: costInfo.cost, costNote: costInfo.note, at: c.at, settledAt: c.settledAt, elapsedMs: c.elapsedMs != null ? Math.round(c.elapsedMs) : null };
}
function sumCost(recs) {
  let total = 0, anyUnknown = false;
  recs.forEach((r) => { const s = summarizeTracked(r); if (s.costUsd == null) anyUnknown = true; else total += s.costUsd; });
  return { total, anyUnknown };
}
function persist(name, data) { try { fs.writeFileSync(path.join(OUT_DIR, name), JSON.stringify(data, null, 2)); } catch (e) { console.warn('[ARTIFACT] persist failed for ' + name + ':', e && e.message); } }

// sceneToText lives in its own module (_tempt_fate_scene_text.mjs) precisely because THIS file
// starts a real, paid run at import time — anything that needs the helper must be able to import it
// without launching a run.
function writeText(name, value) {
  try { fs.writeFileSync(path.join(OUT_DIR, name), typeof value === 'string' ? value : sceneToText(value)); }
  catch (e) { console.warn('[ARTIFACT] text write failed for ' + name + ':', e && e.message); }
}

// SCENE-A-ONLY RUN (Roman, 2026-09-23): "Run Scene A ... with an additional hard cap of $0.20.
// Stop unconditionally after Scene A regardless of outcome. No Scene B, images, extra retries
// beyond the declared policy, or automated semantic approval."
// This cap is PER RUN and knows nothing about prior spend — it means $0.20 additional.
const COMBINED_CEILING = 0.20;
const SCENE_A_CEILING = 0.19;   // leaves room for the classifier beneath the $0.20 run cap
const SCENE_B_CEILING = 0.18;   // retained for reference only; Scene B is not run
const SCENE_A_ONLY = true;      // no Scene B under this authorization
// ADDED eighth revision: the wish-seal classifier's own sourced worst case (700 in + 120 out tokens
// at gpt-4o-mini rates = $0.000177), rounded up to a $0.001 ceiling. Reserved BEFORE the Proceed
// click below, not merely counted after it — the incident that surfaced this role was precisely a
// dispatch that happened outside the sheet's declared, reserved set.
const WISH_CLASSIFIER_CEILING = 0.001;

// ── SCENE-1 READER DECISION — REQUIRED, and deliberately UNSET ──────────────────────────────────
// The first authorized run (2026-09-23) never generated Scene A. Not infrastructure, not cost: the
// app DELIBERATELY refused. app.js:233097 — a Scene-2+ request on a Book whose reader has not
// recorded the opening's decision mounts the decision prompt and returns WITHOUT generating, rather
// than producing an unconstrained continuation:
//   [SCENE-DECISION] scene 2 requested before the reader's choice was recorded — mounting the
//   prompt, not generating
//   [SCENE-DECISION] prompt mounted: run in shame vs remain and see where Julian was taking it
// First Sacrifice's axis comes from the baked package itself (state._bakedEmitted.axes.microDecision,
// read by _sceneDecisionAxis at app.js:201738) and is "elicited from the package's own authored
// expansions, never inferred from dialogue" — so it cannot be guessed or synthesized here.
//
// WHICH BRANCH IS A STORY DECISION, NOT AN ENGINEERING ONE. It materially shapes Scene A, which is
// the very thing this test exists to evaluate. Left null so the run FAILS CLOSED rather than
// silently proceeding on an assumed choice. Set to 'run' or 'remain' only on Roman's explicit word.
// Roman's choice, 2026-09-23: "Let Lirael remain." Verified against the live axis by
// _tempt_fate_real_ui_order_dry_proof.mjs, which reads the offered keys from the baked package
// itself — A="run in shame" (run) | B="remain and see where Julian was taking it" (remain) — and
// refuses to proceed if the declared value matches neither.
const SCENE1_DECISION = 'remain';

// Module-level (not IIFE-local) so the top-level catch at the bottom of this file can still
// attempt a safe, settlement-aware shutdown if an unexpected error escapes every in-flow try/catch
// below — never leaving an approved request's outcome unrecorded just because of an unrelated bug.
let browser = null, gate = null;

(async () => {
  console.log('=== TEMPT FATE MEMORY-ERASURE — LIVE RUN (real, paid, one operation, ninth-revision sheet) ===');
  console.log('    persisted request/response log: ' + LOG_FILE + '\n');

  // FAIL CLOSED before spending anything: without the Scene-1 decision the app will not generate
  // Scene 2 at all (proven by the first authorized run), so dispatching the wish classifier and the
  // scaffold cascade would again buy nothing.
  if (SCENE1_DECISION !== 'run' && SCENE1_DECISION !== 'remain') {
    console.error('REFUSING TO RUN — SCENE1_DECISION is unset. The app will not generate Scene 2 until the');
    console.error('opening decision is recorded (app.js:233097), and which branch to take is a story decision');
    console.error('that materially shapes Scene A. Set it to \'run\' or \'remain\' only on explicit authorization.');
    process.exit(3);
  }

  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const consoleLines = [];
  page.on('console', (m) => { const t = m.text(); consoleLines.push(t); try { fs.appendFileSync(path.join(OUT_DIR, 'console_log.jsonl'), JSON.stringify({ text: t, at: Date.now() }) + '\n'); } catch (_) {} });
  page.on('pageerror', (e) => { console.warn('[PAGE ERROR]', e && e.message); });

  // ── FAIL-CLOSED GATE — image endpoints deliberately NEVER in allowRealPaths, so any attempt
  // (the auto-fired _prefireWishImage included) is aborted before it leaves the browser, same
  // fail-closed default the dry harness already proved for image endpoints. blockImagePreparation
  // adds a second layer: even an allowed TEXT endpoint carrying an image-prep-shaped request body
  // gets aborted before dispatch.
  gate = await installFailClosedNetworkGate(page, { logFile: LOG_FILE, blockImagePreparation: true });
  gate.allowRealPaths(['/api/proxy', '/api/mistral-proxy', '/api/chatgpt-proxy']);

  async function safeExit(exitCode, reason) {
    if (gate.hasUnsettled()) {
      console.error('REFUSING TO CLOSE — an approved request is still unsettled (' + reason + '). Waiting on it before doing anything else.');
      const pending = gate.trackedCalls().find((c) => c.status == null && c.networkError == null);
      if (pending) {
        await gate.waitForSettlement(pending.roleTag, { watchdogMs: 15000, onWatchdog: (ms) => console.error('  ...still waiting, ' + Math.round(ms / 1000) + 's (browser stays open)') });
      }
    }
    persist('partial_tracked_calls.json', gate.trackedCalls().map(summarizeTracked));
    persist('console_tail.json', consoleLines.slice(-300));
    await browser.close();
    console.error('EXIT (' + reason + ') — browser closed only after confirming nothing approved was left unsettled.');
    process.exit(exitCode);
  }

  // ═══ PHASE 0 — reach the real app, real Scene 1 hydration (mirrors the dry harness exactly) ═══
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForFunction(() => window.state
      && typeof window._renderBakedScene1 === 'function'
      && typeof window._bakedScene1For === 'function'
      && typeof window._syncFateCardLockState === 'function'
      && typeof window._cgTemptFateCommitAtPersistence === 'function'
      && window.WishSequence && typeof window.WishSequence.resolve === 'function', { timeout: 30000 });
  } catch (e) {
    console.error('HARNESS BLOCKER: the app is not reachable / required functions missing — ' + (e && e.message));
    await safeExit(2, 'app unreachable');
    return;
  }
  console.log('✓ real app reached, required functions exposed\n');

  const freshStoryId = 'live-fs-tempt-erasure-' + Date.now();
  const mount = await page.evaluate((storyId) => {
    try {
      window.state.storyId = storyId;
      window.state.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
      window.state.gender = 'Female'; window.state.loveInterest = 'Male'; window.state.authorPronouns = 'She/Her';
      window.state.renderMode = 'staged_story_mode'; window.state.currentEngine = 'graphic';
      window.state.turnCount = 0; window.state.scenes = [];
      window.state.subscribed = true; window.state.fortunes = 9999999; window.state.access = 'sub';
      window.state._starterId = 'starter_first_sacrifice';
      window.state._pcLookSkipped = true; window.state._bakedGenesisUnlocked = true;
      window._devBypass = true; // Fortune-charge dev bypass ONLY — does not affect the Tempt-card lock
      window.state._intimacyDevMode = true; // disclosed, real dev-only bypass for the Tempt fate-card onboarding lock
      const pkg = window._bakedScene1For('starter_first_sacrifice');
      if (!pkg) return { ok: false, reason: 'no baked package resolved for starter_first_sacrifice' };
      window._renderBakedScene1({ id: 'starter_first_sacrifice' }, pkg);
      // Screen is "game" right after mount — the Tempt card lives HERE, not in #gnReader (confirmed
      // via two dry, zero-cost diagnostics after the first two live attempts each failed on exactly
      // one of these two elements). showScreen('gnReader') is called LATER, after the wish is
      // sealed, right before Scene A's Say/Do — see phase 2 below. Calling it here would hide the
      // Tempt card before it's ever used.
      const storyHtml = document.getElementById('storyContent');
      return { ok: true, bodyLen: storyHtml ? storyHtml.innerHTML.length : 0 };
    } catch (e) { return { ok: false, reason: e && e.message }; }
  }, freshStoryId);
  persist('scene1_mount.json', mount);
  if (!mount.ok) { console.error('HARNESS BLOCKER: Scene 1 mount failed — ' + JSON.stringify(mount)); await safeExit(2, 'scene1 mount failed'); return; }
  console.log('✓ real Scene 1 mounted (storyId=' + freshStoryId + ', bodyLen=' + mount.bodyLen + ')\n');

  // The splash overlay's own .splash-done state makes IT hidden (fade-out), so waiting for that
  // selector to be :visible (Playwright's waitForSelector default) always times out — checked via
  // a dry diagnostic after the first live attempt. Poll the class directly instead.
  await page.waitForFunction(() => { const s = document.getElementById('splashOverlay'); return !s || s.classList.contains('splash-done'); }, { timeout: 12000 }).catch(() => { console.warn('[HARNESS] splash overlay did not reach .splash-done within 12s — proceeding anyway'); });

  // ═══ PHASE 0b — record the Scene-1 reader decision, via a REAL click on the REAL prompt ═══
  // Done BEFORE the Tempt seal, which is the intended reader ordering (finish Scene 1, decide, then
  // act). Doing it here also avoids the tangle the first run hit: when the decision gate fires at
  // Submit time instead, the post-turn hook still mounts the wish-cinesequence UI and hides the
  // Say/Do row, so the resumed generation would have to be dug out from under it.
  console.log('── phase 0b: record the Scene-1 reader decision (real click, no provider dispatch) ──');
  const decisionMount = await page.evaluate(() => {
    if (typeof window._sceneDecisionNeeded !== 'function' || !window._sceneDecisionNeeded()) return { needed: false };
    window._mountSceneDecisionPrompt(null);
    const a = document.getElementById('sceneDecisionA'), b = document.getElementById('sceneDecisionB');
    return { needed: true, mounted: !!(a && b), a: a && a.getAttribute('data-choice'), b: b && b.getAttribute('data-choice'), aLabel: a && a.textContent, bLabel: b && b.textContent };
  });
  persist('scene1_decision_prompt.json', decisionMount);
  if (!decisionMount.needed) {
    console.error('HARNESS BLOCKER: _sceneDecisionNeeded() is false — the gate this step exists to satisfy is not active, so the run\'s premise no longer holds. Stopping rather than guessing.');
    await safeExit(2, 'scene decision not needed — unexpected state');
    return;
  }
  if (!decisionMount.mounted) {
    console.error('HARNESS BLOCKER: the decision prompt did not mount — ' + JSON.stringify(decisionMount));
    await safeExit(2, 'decision prompt did not mount');
    return;
  }
  const decisionBtn = decisionMount.a === SCENE1_DECISION ? '#sceneDecisionA' : decisionMount.b === SCENE1_DECISION ? '#sceneDecisionB' : null;
  if (!decisionBtn) {
    console.error('HARNESS BLOCKER: SCENE1_DECISION="' + SCENE1_DECISION + '" matches neither offered choice (' + decisionMount.a + ' / ' + decisionMount.b + ') — the baked axis may have changed. Stopping rather than picking one.');
    await safeExit(2, 'declared decision does not match the offered axis');
    return;
  }
  await page.click(decisionBtn, { timeout: 8000 });
  const decisionRecorded = await page.evaluate(() => ({ stillNeeded: window._sceneDecisionNeeded(), recorded: window.state._sceneDecisions || null }));
  persist('scene1_decision_recorded.json', decisionRecorded);
  if (decisionRecorded.stillNeeded) {
    console.error('HARNESS BLOCKER: the decision click did not clear _sceneDecisionNeeded() — ' + JSON.stringify(decisionRecorded));
    await safeExit(2, 'decision click did not record');
    return;
  }
  console.log('  ✓ recorded "' + SCENE1_DECISION + '" via a real click on ' + decisionBtn + ' — _sceneDecisionNeeded() is now false\n');

  // ═══ PHASE 1 — real Tempt card click, real wish entry, real Proceed click ═══
  console.log('── phase 1: real Tempt Fate wish, sealed via real UI ──');
  await page.evaluate(() => { if (typeof window._syncFateCardLockState === 'function') window._syncFateCardLockState(); });
  const cardState = await page.evaluate(() => {
    const c = document.querySelector('.tempt-fate-card');
    if (!c) return { found: false };
    const cs = window.getComputedStyle(c);
    return { found: true, fateLocked: c.classList.contains('fate-locked'), pointerEvents: cs.pointerEvents };
  });
  if (!cardState.found || cardState.fateLocked || cardState.pointerEvents === 'none') {
    console.error('HARNESS BLOCKER: Tempt card not clickable — ' + JSON.stringify(cardState));
    await safeExit(2, 'tempt card not clickable');
    return;
  }
  await page.click('.tempt-fate-card', { timeout: 5000 });
  await page.waitForSelector('.tempt-wish-columns', { timeout: 5000 }).catch(() => {});
  await page.click('.tempt-wish-columns', { timeout: 5000 });
  await page.waitForSelector('#temptZoomInput:not(.hidden)', { timeout: 5000 }).catch(() => {});

  const WISH_TEXT = 'everyone forgets the ceremony happened';
  await page.fill('#temptZoomInput', WISH_TEXT);
  console.log('  wish typed into the real textarea: "' + WISH_TEXT + '"');

  // Classifier is fire-and-forget (not awaited by the Proceed handler) — track it under its own
  // phase, ceiling 1 (at most one real gpt-4o-mini call per _classifyWishCG's own source).
  //
  // PRE-DISPATCH RESERVATION (eighth revision): reserve this role's worst case against the combined
  // ceiling BEFORE the click that can dispatch it — the same discipline every scene phase follows.
  // Reserving after the fact is what let this role dispatch outside the declared budget during the
  // 2026-09-23 incident.
  // Scene B is not part of this authorization, so it is not reserved — reserving for a scene that
  // will never run would consume headroom the authorized Scene A is entitled to.
  const reservedBeforeSeal = WISH_CLASSIFIER_CEILING + SCENE_A_CEILING;
  if (reservedBeforeSeal > COMBINED_CEILING) {
    console.error('  REFUSING TO SEAL — reserving the wish-classifier ($' + WISH_CLASSIFIER_CEILING.toFixed(6) + ') on top of the Scene A ceiling ($' + SCENE_A_CEILING.toFixed(2) + ') would exceed the $' + COMBINED_CEILING.toFixed(2) + ' run cap.');
    await safeExit(1, 'reservation would breach the run cap');
    return;
  }
  console.log('  reserved BEFORE the Proceed click: wish-classifier $' + WISH_CLASSIFIER_CEILING.toFixed(6) + ' + Scene A $' + SCENE_A_CEILING.toFixed(2) + ' = $' + reservedBeforeSeal.toFixed(6) + ' ≤ $' + COMBINED_CEILING.toFixed(2) + ' (Scene B not authorized, not reserved)');
  gate.setPhase('wish-classifier', 1);
  await page.click('.tempt-proceed-btn', { timeout: 5000 });
  console.log('  Proceed clicked — wish sealed (local invocation + possible fire-and-forget classifier call)');
  // Short probe first — the lexicon-vs-LLM branch decision happens near-instantly in JS, so a real
  // dispatch (if any) shows up in tracked calls within ~2s. If one did fire, wait for its REAL
  // settlement (observed ~31s once, in practice) before computing its cost — a bare bounded wait
  // does not; it can only under-count a real cost as "unknown".
  await page.waitForTimeout(2500);
  if (gate.trackedCalls('wish-classifier').length) {
    await gate.waitForSettlement('wish-classifier', { watchdogMs: 15000, onWatchdog: (ms) => console.log('  ...wish-classifier call still pending, ' + Math.round(ms / 1000) + 's') });
  }
  const classifierCalls = gate.trackedCalls('wish-classifier').map(summarizeTracked);
  gate.closePhase();
  console.log('  wish-classifier: ' + (classifierCalls.length ? JSON.stringify(classifierCalls.map((c) => ({ model: c.model, status: c.status, costUsd: c.costUsd }))) : 'did not fire (lexicon resolved locally)') + '\n');

  // ═══ PHASE 2 — neutral Say/Do, real Submit, Scene A's real generation ═══
  console.log('── phase 2: neutral Say/Do, real Submit — Scene A real generation ──');
  // The wish is sealed in the "game" screen (where the Tempt card lives); #gnActionInput/#gnSubmitBtn
  // live inside #gnReader, a separate screen (display:none until shown). Transition NOW, after the
  // seal — confirmed via a dry, zero-cost diagnostic to be the correct real order (calling this any
  // earlier hides the Tempt card before phase 1 can use it).
  await page.evaluate(() => { try { window.showScreen('gnReader'); } catch (_) {} });
  await page.waitForSelector('#gnActionInput', { state: 'visible', timeout: 8000 });
  const sceneADo = 'Lirael closes her eyes for a long moment, then opens them again.';
  await page.fill('#gnActionInput', sceneADo);
  await page.fill('#gnDialogueInput', '');
  // Combined phase covering the real cascade a Submit can trigger for a story's first generated
  // scene, plus its own bounded retry. Ceiling 28 is the §2 census worst case EXACTLY, with no
  // margin — margin is what made the earlier counts unauditable:
  //   no-retry 20 = scaffold 3 + bibles 9 + scenePlanner 3 + legacy fallback 1 + gravity 1 + author 3
  //   retry     8 = scenePlanner 3 + legacy fallback 1 + gravity 1 + author 3 (never scaffold/bibles, cached)
  gate.setPhase('scene-A', 28);
  await page.click('#gnSubmitBtn', { timeout: 5000 });
  console.log('  Submit clicked — waiting on REAL SETTLEMENT (no wall-clock deadline; the real cascade can legitimately take 60-120s+).');
  await gate.waitForSettlement('scene-A', { watchdogMs: 15000, onWatchdog: (ms) => console.log('  ...Scene A still pending, ' + Math.round(ms / 1000) + 's — browser stays open, nothing aborted') });
  console.log('  ✓ Scene A has settled (response or terminal network error observed for every tracked call).\n');

  const sceneATracked = gate.trackedCalls('scene-A').map(summarizeTracked);
  gate.closePhase();
  const sceneACostInfo = sumCost(gate.trackedCalls('scene-A'));
  persist('scene_a_tracked_calls.json', sceneATracked);
  console.log('  Scene A real tracked calls: ' + sceneATracked.length + ', real cost: $' + sceneACostInfo.total.toFixed(6) + (sceneACostInfo.anyUnknown ? ' (WARNING: at least one tracked call has unknown cost)' : ''));

  // Give the app a brief, bounded moment to finish LOCAL parsing of the already-settled network
  // response into state (pure local JS, not a new network wait) before reading it.
  const sceneAResult = await page.evaluate(async () => {
    const start = Date.now();
    while (Date.now() - start < 10000) {
      const scenesLen = (window.state.scenes || []).length;
      if (scenesLen >= 1) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    const caps = window.state._sceneCaptures || {};
    const capKeys = Object.keys(caps).map(Number).sort((a, b) => a - b);
    const lastCap = capKeys.length ? caps[capKeys[capKeys.length - 1]] : null;
    const led = window.state._temptFateLedger || [];
    const ownedA = led.length ? led[led.length - 1] : null;
    const durable = window.state._temptFateDurableConsequences || [];
    return {
      scenesLen: (window.state.scenes || []).length,
      renderedSceneText: (window.state.scenes && window.state.scenes.length) ? window.state.scenes[window.state.scenes.length - 1] : null,
      capture: lastCap ? { sysPrompt: lastCap.sysPrompt, userPrompt: lastCap.userPrompt, originalOutput: lastCap.originalOutput, originalModel: lastCap.originalModel } : null,
      ownedProposal: ownedA,
      durableConsequences: durable,
      wasInvoked: !!window.state.tempt_fate_invoked_this_turn,
      wishSequenceActive: !!(window.state._wishSequence && window.state._wishSequence.active),
      gnInputHidden: (function () { const el = document.getElementById('gnActionInput'); return el ? el.closest('.wish-seq-hidden') != null || el.classList.contains('wish-seq-hidden') : null; })()
    };
  }).catch((e) => ({ error: String(e && e.message) }));
  persist('scene_a_result.json', sceneAResult);

  if (!sceneAResult || sceneAResult.error || sceneAResult.scenesLen < 1 || !sceneAResult.capture || !sceneAResult.capture.originalOutput) {
    console.error('  Scene A did not deliver a captured, rendered response within the local-parse window — stopping before Scene B.');
    console.error('  ' + JSON.stringify(sceneAResult));
    await safeExit(2, 'scene A did not deliver');
    return;
  }
  console.log('  ✓ Scene A delivered and rendered — ' + sceneToText(sceneAResult.renderedSceneText).length + ' chars.');

  const outcomeCommitted = Array.isArray(sceneAResult.durableConsequences) && sceneAResult.durableConsequences.length === 1
    && sceneAResult.ownedProposal && sceneAResult.durableConsequences[0].proposalId === sceneAResult.ownedProposal.id;
  console.log('  outcome commit check: ' + (outcomeCommitted ? 'exactly one durable outcome, tied to the captured proposal id — committed' : 'NOT committed as expected — preserving raw scene + whatever outcome data exists, stopping before Scene B') + '\n');

  persist('outcome_record.json', { ownedProposal: sceneAResult.ownedProposal, durableConsequences: sceneAResult.durableConsequences, committed: outcomeCommitted });
  persist('scene_a_system_prompt.txt', sceneAResult.capture.sysPrompt || '');
  writeText('scene_a_system_prompt.txt', sceneAResult.capture.sysPrompt || '');
  writeText('scene_a_user_prompt.txt', sceneAResult.capture.userPrompt || '');
  writeText('scene_a_raw_output.txt', sceneAResult.capture.originalOutput || '');
  writeText('scene_a_rendered_text.txt', sceneAResult.renderedSceneText);

  // ── PRESERVE THE PLANNER AND AUTHOR REQUESTS, explicitly ──
  // The author's own prompts come from state._sceneCaptures above; the PLANNER's body exists only
  // in the gate's tracked calls. Both are required by this authorization, so write both, classified
  // by Tempt-independent schema markers (the two layers share role STRUCTURE_GENERATOR, so `role`
  // cannot separate them).
  const sceneACalls = gate.trackedCalls('scene-A');
  const classify = (rec) => {
    const s = JSON.stringify(rec.requestBody || {});
    if (s.indexOf('decisionGateBeatIdx') !== -1) return 'author';
    if (s.indexOf('local_objective') !== -1 || s.indexOf('tactical_move') !== -1) return 'planner';
    return 'other';
  };
  const byLayer = { planner: [], author: [], other: [] };
  sceneACalls.forEach((rec) => byLayer[classify(rec)].push({
    url: rec.url,
    model: (rec.requestBody && (rec.requestBody.model || rec.requestBody.preferredModel)) || null,
    hasActiveInvocation: JSON.stringify(rec.requestBody || {}).indexOf('ACTIVE INVOCATION THIS SCENE') !== -1,
    hasMemoryCallback: JSON.stringify(rec.requestBody || {}).indexOf('MEMORY CALLBACK') !== -1,
    requestBody: rec.requestBody
  }));
  persist('scene_a_planner_requests.json', byLayer.planner);
  persist('scene_a_author_requests.json', byLayer.author);
  persist('scene_a_other_requests.json', byLayer.other);
  console.log('  preserved requests — planner: ' + byLayer.planner.length + ', author: ' + byLayer.author.length + ', other: ' + byLayer.other.length);
  byLayer.planner.forEach((r) => console.log('    planner ' + r.model + ' · ACTIVE=' + r.hasActiveInvocation + ' · CALLBACK=' + r.hasMemoryCallback));
  byLayer.author.forEach((r) => console.log('    author  ' + r.model + ' · ACTIVE=' + r.hasActiveInvocation + ' · CALLBACK=' + r.hasMemoryCallback));

  const classifierCostInfo = sumCost(gate.trackedCalls('wish-classifier'));
  const spentSoFar = sceneACostInfo.total + classifierCostInfo.total;
  console.log('  spent so far (wish-classifier + Scene A): $' + spentSoFar.toFixed(6) + ' against the $' + COMBINED_CEILING.toFixed(2) + ' run cap');
  if (classifierCostInfo.total > WISH_CLASSIFIER_CEILING) console.warn('  ⚠ wish-classifier real cost exceeded its $' + WISH_CLASSIFIER_CEILING.toFixed(6) + ' reservation');
  if (sceneACostInfo.total > SCENE_A_CEILING) console.warn('  ⚠ Scene A real cost exceeded its $' + SCENE_A_CEILING.toFixed(2) + ' ceiling');

  // ── STOP. Unconditionally, regardless of outcome. ──
  // Roman: "Stop unconditionally after Scene A regardless of outcome. No Scene B, images, extra
  // retries beyond the declared policy, or automated semantic approval." Whether Scene A actually
  // enacted the memory erasure is a HUMAN judgement on the preserved prose — this script makes no
  // such determination, and deliberately reports the structural facts only.
  const sceneAReport = {
    at: new Date().toISOString(),
    authorization: 'Scene A only, remain branch, additional hard cap $0.20, stop unconditionally, no automated semantic approval',
    storyId: freshStoryId,
    wishText: WISH_TEXT,
    scene1Decision: SCENE1_DECISION,
    sceneADo,
    structural: {
      sceneDelivered: true,
      outcomeReportPopulated: Array.isArray(sceneAResult.durableConsequences) && sceneAResult.durableConsequences.length > 0,
      outcomeCommittedToOwnedProposal: outcomeCommitted,
      plannerRequests: byLayer.planner.length,
      authorRequests: byLayer.author.length,
      plannerGotActiveInvocation: byLayer.planner.some((r) => r.hasActiveInvocation),
      authorGotActiveInvocation: byLayer.author.some((r) => r.hasActiveInvocation),
      authorGotMemoryCallback: byLayer.author.some((r) => r.hasMemoryCallback)
    },
    semanticVerdict: 'NOT ASSESSED BY THIS SCRIPT — human review of scene_a_rendered_text.txt required',
    costs: {
      wishClassifierUsd: classifierCostInfo.total,
      sceneAUsd: sceneACostInfo.total,
      runTotalUsd: spentSoFar,
      runCapUsd: COMBINED_CEILING,
      withinCap: spentSoFar <= COMBINED_CEILING,
      perCall: sceneACalls.map(summarizeTracked)
    },
    imageAttempts: gate.trackedCalls().filter((c) => /\/api\/(image|bfl-kontext|dashscope-image)/.test(c.url || '')).length,
    anyUndeclaredOrAborted: gate.unstubbed().length,
    persistedLogFile: LOG_FILE
  };
  persist('report.json', sceneAReport);

  console.log('\n' + '='.repeat(100));
  console.log('SCENE A COMPLETE — STOPPING AS AUTHORIZED (no Scene B)');
  console.log('  structural: delivered=' + sceneAReport.structural.sceneDelivered
    + ' outcomePopulated=' + sceneAReport.structural.outcomeReportPopulated
    + ' committed=' + sceneAReport.structural.outcomeCommittedToOwnedProposal);
  console.log('  prompt parity: planner ACTIVE=' + sceneAReport.structural.plannerGotActiveInvocation
    + ' · author ACTIVE=' + sceneAReport.structural.authorGotActiveInvocation
    + ' · author MEMORY CALLBACK=' + sceneAReport.structural.authorGotMemoryCallback);
  console.log('  cost: $' + spentSoFar.toFixed(6) + ' of $' + COMBINED_CEILING.toFixed(2) + ' (within cap: ' + sceneAReport.costs.withinCap + ')');
  console.log('  real image dispatches: ' + sceneAReport.imageAttempts);
  console.log('  SEMANTIC VERDICT: not assessed here — read scene_a_rendered_text.txt and judge.');
  console.log('\nwritten to ' + OUT_DIR + '/');
  await safeExit(0, 'Scene A complete — stopping unconditionally as authorized');
  return;

  // ───────────────────────────────────────────────────────────────────────────────────────────
  // EVERYTHING BELOW IS UNREACHABLE under the current Scene-A-only authorization (the return
  // above). It is retained verbatim, not deleted, because Scene B is already dry-proven (18/18 in
  // _tempt_fate_framing_split_control.mjs) and will be needed the moment a two-scene run is
  // authorized again. Re-enable by removing the Scene-A stop block above and restoring the
  // COMBINED/SCENE_B ceilings.
  // ───────────────────────────────────────────────────────────────────────────────────────────

  // ═══ PHASE 3 — resolve the wish-cinesequence DIRECTLY, never clicking through its beats ═══
  // Confirmed by source before this run: _resolveWishSequence() calls neither _renderWishBeat2 nor
  // _renderWishBeat3 (those fire only from the "Next" button's advanceWishBeat(), never called
  // here) — so this cannot trigger _generateWishEffectNarrative's real LLM call. Its scope-branch
  // handlers (_applyInScopeFateChangeCG / _exitCGForStoryRupture) write state fields confirmed via
  // grep this run to have zero readers anywhere in app.js — side-effect-free w.r.t. the tested
  // temptFateOutcome mechanism.
  console.log('── phase 3: resolve the wish-cinesequence directly (no extra scenes, no beat 2/3 LLM/image calls) ──');
  const resolveResult = await page.evaluate(() => {
    const wasActive = !!(window.state._wishSequence && window.state._wishSequence.active);
    if (wasActive) window.WishSequence.resolve();
    const gnHidden = (function () { const el = document.getElementById('gnActionInput'); return el ? el.classList.contains('wish-seq-hidden') : null; })();
    return { wasActive, gnHidden };
  });
  persist('wish_sequence_resolve.json', resolveResult);
  console.log('  ' + (resolveResult.wasActive ? 'wish-cinesequence was active — resolved directly, no beats rendered' : 'wish-cinesequence never became active') + '; normal input hidden after resolve: ' + resolveResult.gnHidden + '\n');

  const imageAttempts = gate.trackedCalls().filter((c) => /\/api\/(image|bfl-kontext|dashscope-image)/.test(c.url || ''));
  console.log('  image-endpoint attempts observed so far: ' + imageAttempts.length + ' (' + (imageAttempts.length ? JSON.stringify(imageAttempts.map((c) => ({ url: c.url, real: c.real, status: c.status }))) : 'none — either never fired, or fired and was aborted as undeclared, see network_gate.jsonl') + ')\n');

  // ═══ PHASE 4 — Scene B's exact declared neutral input, real Submit, real settlement ═══
  console.log('── phase 4: Scene B — exact declared neutral input, real Submit ──');
  await page.fill('#gnActionInput', 'Lirael takes a slow breath and steps back from the center of the clearing.');
  await page.fill('#gnDialogueInput', '');
  // Scene B has no scaffold/Bibles (one-time, already cached). Ceiling 22 is the §2 census worst
  // case EXACTLY:
  //   no-retry 11 = scenePlanner 3 + legacy fallback 1 + commitVerifier 3 + gravity 1 + author 3
  //   retry    11 = the same set again (the retry re-runs the whole generation)
  // CORRECTED from 21 (count-reconciliation pass): the old figure omitted the legacy hard-beat
  // planner fallback from the RETRY, so it sat one BELOW the true worst case — a cap that low would
  // have aborted a legitimate 22nd dispatch and failed the run for a budget reason that wasn't real.
  gate.setPhase('scene-B', 22);
  await page.click('#gnSubmitBtn', { timeout: 5000 });
  console.log('  Submit clicked — waiting on REAL SETTLEMENT.');
  await gate.waitForSettlement('scene-B', { watchdogMs: 15000, onWatchdog: (ms) => console.log('  ...Scene B still pending, ' + Math.round(ms / 1000) + 's') });
  console.log('  ✓ Scene B has settled.\n');

  const sceneBTracked = gate.trackedCalls('scene-B').map(summarizeTracked);
  gate.closePhase();
  const sceneBCostInfo = sumCost(gate.trackedCalls('scene-B'));
  persist('scene_b_tracked_calls.json', sceneBTracked);
  console.log('  Scene B real tracked calls: ' + sceneBTracked.length + ', real cost: $' + sceneBCostInfo.total.toFixed(6) + (sceneBCostInfo.anyUnknown ? ' (WARNING: at least one tracked call has unknown cost)' : ''));

  const sceneBResult = await page.evaluate(async () => {
    const start = Date.now();
    const startLen = (window.state.scenes || []).length;
    while (Date.now() - start < 10000) {
      if ((window.state.scenes || []).length > startLen) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    const caps = window.state._sceneCaptures || {};
    const capKeys = Object.keys(caps).map(Number).sort((a, b) => a - b);
    const lastCap = capKeys.length ? caps[capKeys[capKeys.length - 1]] : null;
    return {
      scenesLen: (window.state.scenes || []).length,
      renderedSceneText: (window.state.scenes && window.state.scenes.length) ? window.state.scenes[window.state.scenes.length - 1] : null,
      capture: lastCap ? { sysPrompt: lastCap.sysPrompt, userPrompt: lastCap.userPrompt, originalOutput: lastCap.originalOutput, originalModel: lastCap.originalModel } : null,
      wasInvokedDuringB: !!window.state.tempt_fate_invoked_this_turn,
      durableConsequencesAfterB: window.state._temptFateDurableConsequences || []
    };
  }).catch((e) => ({ error: String(e && e.message) }));
  persist('scene_b_result.json', sceneBResult);
  writeText('scene_b_system_prompt.txt', (sceneBResult.capture && sceneBResult.capture.sysPrompt) || '');
  writeText('scene_b_user_prompt.txt', (sceneBResult.capture && sceneBResult.capture.userPrompt) || '');
  writeText('scene_b_raw_output.txt', (sceneBResult.capture && sceneBResult.capture.originalOutput) || '');
  writeText('scene_b_rendered_text.txt', sceneBResult.renderedSceneText);

  const noNewOutcome = Array.isArray(sceneBResult.durableConsequencesAfterB) && sceneBResult.durableConsequencesAfterB.length === 1;
  console.log('  Scene B delivered: ' + (sceneBResult.scenesLen >= 2) + ', no new Tempt invocation: ' + !sceneBResult.wasInvokedDuringB + ', still exactly one durable outcome (Scene A\'s): ' + noNewOutcome + '\n');

  // ── FINAL — confirm nothing approved is left unsettled ANYWHERE, then the one and only close. ──
  if (gate.hasUnsettled()) {
    console.error('REFUSING TO CLOSE — something is still unsettled even though both scenes settled. Waiting before closing.');
    const pending = gate.trackedCalls().find((c) => c.status == null && c.networkError == null);
    if (pending) await gate.waitForSettlement(pending.roleTag, { watchdogMs: 15000, onWatchdog: (ms) => console.log('  ...' + Math.round(ms / 1000) + 's') });
  }
  await browser.close();

  const totalCost = spentSoFar + sceneBCostInfo.total;
  const report = {
    at: new Date().toISOString(),
    storyId: freshStoryId,
    wishText: WISH_TEXT,
    sceneADo, sceneBDo: 'Lirael takes a slow breath and steps back from the center of the clearing.',
    costs: {
      wishClassifierUsd: classifierCostInfo.total,
      sceneAUsd: sceneACostInfo.total,
      sceneBUsd: sceneBCostInfo.total,
      totalUsd: totalCost,
      combinedCeilingUsd: COMBINED_CEILING,
      withinCeiling: totalCost <= COMBINED_CEILING
    },
    outcomeCommitted,
    sceneB: { delivered: sceneBResult.scenesLen >= 2, newInvocationDuringB: sceneBResult.wasInvokedDuringB, noDuplicateCommit: noNewOutcome },
    imageAttemptsObserved: imageAttempts.length,
    perPhaseTrackedCalls: {
      'wish-classifier': classifierCalls,
      'scene-A': sceneATracked,
      'scene-B': sceneBTracked
    },
    anyUndeclaredOrAborted: gate.unstubbed(),
    persistedLogFile: LOG_FILE
  };
  persist('report.json', report);

  console.log('\n' + '='.repeat(100));
  console.log('TEMPT FATE MEMORY-ERASURE — LIVE RUN COMPLETE');
  console.log('real total cost: $' + totalCost.toFixed(6) + ' against $' + COMBINED_CEILING.toFixed(2) + ' combined ceiling — ' + (report.costs.withinCeiling ? 'WITHIN CEILING' : '*** OVER CEILING ***'));
  console.log('outcome committed: ' + outcomeCommitted + ' | Scene B delivered: ' + report.sceneB.delivered + ' | no new invocation in B: ' + !sceneBResult.wasInvokedDuringB + ' | no duplicate commit: ' + noNewOutcome);
  console.log('image-endpoint attempts observed: ' + imageAttempts.length + ' (expected: 0 real, or aborted-as-undeclared if any)');
  if (report.anyUndeclaredOrAborted.length) {
    console.log('\n⚠ requests aborted as undeclared (should be image endpoints only, if any):');
    console.log(JSON.stringify(report.anyUndeclaredOrAborted, null, 2));
  }
  console.log('\nwritten to ' + OUT_DIR + '/: scene_a_*.txt, scene_b_*.txt, outcome_record.json, report.json, and every persisted per-phase call.');
  console.log('full persisted request/response log: ' + LOG_FILE);
})().catch(async (e) => {
  console.error('HARNESS ERROR:', e && e.stack || e);
  // Never let an unexpected error skip the settlement-aware shutdown — an approved request that
  // was still in flight must still be waited on and persisted before the browser closes.
  try {
    if (gate) {
      if (gate.hasUnsettled()) {
        console.error('REFUSING TO CLOSE — an approved request is still unsettled after an unexpected error. Waiting on it.');
        const pending = gate.trackedCalls().find((c) => c.status == null && c.networkError == null);
        if (pending) await gate.waitForSettlement(pending.roleTag, { watchdogMs: 15000, onWatchdog: (ms) => console.error('  ...still waiting, ' + Math.round(ms / 1000) + 's') });
      }
      persist('partial_tracked_calls_on_error.json', gate.trackedCalls().map(summarizeTracked));
    }
  } catch (e2) { console.error('cleanup-on-error itself failed:', e2 && e2.message); }
  try { if (browser) await browser.close(); } catch (_) {}
  process.exit(2);
});
