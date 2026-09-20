// FIRST SACRIFICE — GROK HAPPY-PATH END-TO-END SAMPLE (Roman, 2026-09-20)
//
// Real, paid, one continuous player-journey run. Requires FRESH, EXPLICIT authorization before it
// is ever run — nothing about preparing/dry-proving this script constitutes that authorization.
//
// Purpose: establish whether the ACTUAL player journey — candidate opener, one real live reply,
// the real interruption/Fate-Card/Submit path, one real Scene 2 CG author call — produces GOOD
// Scene 2 prose. This is the only live proof still worth buying; everything about provider
// availability/failover/admission-gating is already proven dry (see
// _oas_turn_chain_repair_control.mjs, _oas_turn_reply_long_context_reclassification_control.mjs,
// _first_sacrifice_oas_paired_quality_pinning_control.mjs) and this script deliberately does NOT
// re-test any of that (feedback_no_deliberate_fallback_breaking_on_paid_runs — do not force a
// provider to fail just to observe a fallback; that wastes money the dry controls already saved).
//
// Every text endpoint (/api/proxy, /api/mistral-proxy, /api/deepseek-proxy, /api/chatgpt-proxy) is
// allow-listed for REAL pass-through with a generous per-phase ceiling matching each role's real
// worst-case tier count — production is left to behave NATURALLY at every step, not pinned or
// blocked. If a fallback genuinely fires because something really failed, the report says so
// honestly (each phase records which provider/model actually won, via the existing
// _lastOASTurnAuthor / _lastCGAuthor state fields and the gate's own tracked-call records) — this
// script never engineers that outcome. Image endpoints are NEVER allow-listed — no images, ever,
// same as every prior live sample this session.
//
// usage: node _first_sacrifice_oas_grok_happy_path_sample.mjs   (DO NOT RUN without fresh, explicit authorization)
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_first_sacrifice_oas_grok_happy_path_sample_out');
fs.mkdirSync(OUT_DIR, { recursive: true });
const LOG_FILE = path.join(OUT_DIR, 'run_' + Date.now() + '.jsonl');

const CANDIDATE_PATH = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package', '13_final_field_correction.json');
const candidateRaw = JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));
const candidateOasOpening = candidateRaw.draft && candidateRaw.draft.oasOpening;
const candidatePostInterruption = candidateRaw.draft && candidateRaw.draft.postInterruptionBeat;
if (!candidateOasOpening || !candidateOasOpening.text) {
  console.error('HARNESS BLOCKER: ' + CANDIDATE_PATH + ' has no draft.oasOpening.text.');
  process.exit(2);
}

// Reuses Roman's already-vetted first reply ("direct, flirtatious, responsive to his specific
// accusation, and not a plot deflection" — his own words, 2026-09-19). Same reply Roman can
// substitute at authorization time if he wants a different one; nothing here depends on this exact
// text beyond routing (already proven: real _detectOASOffTopicNoise/_detectContextualEscalation
// checks on this exact text, real _handleIntimacyTurn dispatch, both agreeing on Grok reasoning).
const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';

// Real, sourced TEXT_PRICING rates + the 2026-09-20 accounting fix (authoritative ticks preferred,
// reasoning tokens included in the fallback estimate) — mirrors public/app.js's estimateTextCost.
const RATES = {
  'grok-4-1-fast-reasoning': { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 },
  'grok-4.20-0309-non-reasoning': { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 },
  'mistral-small-latest': { in: 0.00000015, out: 0.0000006 },
  'gpt-4o': { in: 0.0000025, out: 0.00001 },
  'gpt-4o-mini': { in: 0.00000015, out: 0.0000006 },
  // ministral-8b-2512 has NO sourced price row (disclosed gap, carried from the 2026-09-19 census)
  // — cost is left explicitly unknown if this tier ever wins, never silently priced at another
  // model's rate.
};
const TICK_TO_USD = 1e-10;
function realCost(model, usage) {
  if (!usage) return { cost: null, note: 'no usage block returned', source: null };
  if (typeof usage.cost_in_usd_ticks === 'number' && usage.cost_in_usd_ticks > 0) {
    return { cost: usage.cost_in_usd_ticks * TICK_TO_USD, note: null, source: 'provider_ticks' };
  }
  const rate = RATES[model];
  if (!rate) return { cost: null, note: 'no sourced price row for model="' + model + '"', source: null };
  const cacheRead = usage.cache_read_input_tokens || (usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens) || 0;
  const freshIn = Math.max(0, (usage.prompt_tokens || 0) - cacheRead);
  const outTok = (usage.completion_tokens || 0) + ((usage.completion_tokens_details && usage.completion_tokens_details.reasoning_tokens) || 0);
  const cost = freshIn * rate.in + cacheRead * (rate.cacheRead != null ? rate.cacheRead : rate.in) + outTok * rate.out;
  return { cost, note: null, source: 'estimated' };
}

// Combined hard ceiling, with a per-phase breakdown (real margin over historical/measured figures).
// Scene 2 generation is NOT one call: a real dry-integration run (2026-09-20,
// _first_sacrifice_oas_grok_happy_path_dry_integration_control.mjs) proved the real pipeline fires
// a per-scene commit-verifier (_commitScene -> _callTieredProvider, up to 3 tiers:
// ministral-8b-2512 / grok-4-1-fast-reasoning / gpt-4o-mini; observed real max_tokens up to 2000 in
// that dry run) and a scene-spine planner (_generateLiteraryPlotContract, mistral-small-latest by
// default, observed real max_tokens 640, no fallback chain, single attempt) BEFORE the actual
// _authorFullScenePolicy author call (max_tokens 8000). An earlier ceiling of 3 silently blocked
// the real author call before it ever fired — fixed here to 8 (worst case 3+1+3, plus slack).
//   opener:            $0.00  (zero-call, candidate-authored)
//   turn-reply:        $0.10  (real observed sample: $0.031952; margin covers a possible
//                               ministral-8b-2512 or gpt-4o fallback attempt)
//   fate-card-batch:   $0.05  (small prompt — scene context + 300-char recent-scene slice + a
//                               focused two-line task; no real measurement exists yet, generous margin)
//   scene2-generation: $0.55  (verifier + planner, both small/cheap when priced — but
//                               ministral-8b-2512 has NO sourced price row, so if the verifier's
//                               primary tier wins, its real cost is UNKNOWN, not zero, and will be
//                               reported as such, never invented — plus the author call itself,
//                               $0.50 as before)
const PHASE_CEILINGS_USD = { 'oas-turn-reply': 0.10, 'fate-card-preview-batch': 0.05, 'scene2-generation': 0.55 };
const COMBINED_CEILING_USD = 0.65;

function summarizeTracked(c) {
  const body = c.requestBody || {};
  const model = body.model || body.preferredModel || (c.responseBody && c.responseBody._orchestration && c.responseBody._orchestration.model) || null;
  const usage = c.responseBody && c.responseBody.usage;
  const costInfo = model ? realCost(model, usage) : { cost: null, note: 'model not identified in request body', source: null };
  // maxTokens distinguishes roles sharing one endpoint within the scene2-generation phase: the
  // commit-verifier and scene-spine planner cap well under 2000 (observed real max_tokens up to
  // 2000/640 in the 2026-09-20 dry integration run); the actual author call is the ONLY one at 8000
  // (concretely proven in _oas_turn_reply_long_context_reclassification_control.mjs section 6).
  return { url: c.url, model, maxTokens: body.max_tokens != null ? body.max_tokens : null, isAuthorCall: body.max_tokens === 8000, status: c.status, networkError: c.networkError, usage: usage || null, costUsd: costInfo.cost, costNote: costInfo.note, costSource: costInfo.source, elapsedMs: c.elapsedMs != null ? Math.round(c.elapsedMs) : null };
}

(async () => {
  console.log('=== FIRST SACRIFICE — GROK HAPPY-PATH END-TO-END SAMPLE (real, paid, one continuous operation) ===');
  console.log('    persisted request/response log: ' + LOG_FILE);
  console.log('    combined hard ceiling: $' + COMBINED_CEILING_USD.toFixed(2) + ' — ' + JSON.stringify(PHASE_CEILINGS_USD));
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const consoleLines = [];
  page.on('console', (m) => { consoleLines.push(m.text()); });

  const gate = await installFailClosedNetworkGate(page, { logFile: LOG_FILE });
  gate.allowRealPaths(['/api/proxy', '/api/mistral-proxy', '/api/deepseek-proxy', '/api/chatgpt-proxy']);
  // Image endpoints (/api/image, /api/bfl-kontext, /api/dashscope-image) are deliberately NEVER
  // allow-listed — any attempt is aborted before it leaves the browser, same as every prior sample.

  let runningCostUsd = 0;
  const phaseReports = {};

  async function safeExit(exitCode, reason) {
    if (gate.hasUnsettled()) {
      console.error('REFUSING TO CLOSE — an approved request is still unsettled (' + reason + ').');
      const pending = gate.trackedCalls().find((c) => c.status == null && c.networkError == null);
      if (pending) await gate.waitForSettlement(pending.roleTag, { watchdogMs: 15000, onWatchdog: (ms) => console.error('  ...still waiting, ' + Math.round(ms / 1000) + 's (browser stays open)') });
    }
    fs.writeFileSync(path.join(OUT_DIR, 'partial_tracked_calls.json'), JSON.stringify(gate.trackedCalls().map(summarizeTracked), null, 2));
    fs.writeFileSync(path.join(OUT_DIR, 'console_tail.txt'), consoleLines.slice(-200).join('\n'));
    fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify({ phaseReports, runningCostUsd, ceilingUsd: COMBINED_CEILING_USD, exitReason: reason }, null, 2));
    await browser.close();
    console.error('EXIT (' + reason + ') — browser closed only after confirming nothing approved was left unsettled.');
    process.exit(exitCode);
  }

  // Aborts BEFORE the next real, potentially-expensive phase if the running total already meets
  // the combined ceiling — the only "circuit breaker" this script uses; no phase is ever pre-blocked
  // or forced to fail, only the NEXT one is withheld once real spend already used the budget.
  async function checkBudgetBeforePhase(nextPhaseLabel) {
    if (runningCostUsd >= COMBINED_CEILING_USD) {
      await safeExit(0, 'BUDGET STOP before ' + nextPhaseLabel + ' — running cost $' + runningCostUsd.toFixed(6) + ' already meets the $' + COMBINED_CEILING_USD.toFixed(2) + ' combined ceiling');
    }
  }

  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._fireIntimacyOpener === 'function' && typeof window._clearPersistedOASState === 'function' && typeof window._bakedScene1For === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
  } catch (e) {
    await safeExit(2, 'app unreachable: ' + (e && e.message));
    return;
  }
  console.log('✓ real app reached, real starter_first_sacrifice package resolves (unmodified)\n');

  await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'grok-happy-path-sample-' + Date.now();
    s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = [];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s._starterId = 'starter_first_sacrifice';
    s._pcLookSkipped = true;
    s._bakedGenesisUnlocked = true;
    window._devBypass = true;
  });

  // ═══ PHASE 0 — candidate Julian opener, ZERO-CALL (proven dry, 20/20) ═══
  console.log('── phase 0: candidate opener (zero-call) ──');
  const callsBeforeOpener = gate.calls().length;
  const openerResult = await page.evaluate(async ({ candidateOasOpening, candidatePostInterruption }) => {
    window.state.intimacyDialogue = null;
    window._clearPersistedOASState();
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    const h = pkg.oasHandoff || {};
    const plan = {
      beats: [], is_consummate_scene: true, __bakedOrigin: pkg.title || null,
      openingFrame: h.openingFrame || '', cue: h.cue || '',
      interruption: h.interruption || '', interruptionImage: h.interruptionImage || '',
      interruptionExchange: Array.isArray(h.interruptionExchange) ? h.interruptionExchange.slice() : [],
      oasOpening: candidateOasOpening, postInterruptionBeat: candidatePostInterruption || null,
    };
    await window._initIntimacyDialogue(plan);
    await window._fireIntimacyOpener();
    const d = window.state.intimacyDialogue;
    return { phase: d && d.phase, openerText: d && d.liTurnHistory && d.liTurnHistory[0] && d.liTurnHistory[0].liDialogue };
  }, { candidateOasOpening, candidatePostInterruption });
  const callsAfterOpener = gate.calls().length;
  console.log('  Julian (authored, zero-call): "' + openerResult.openerText + '"');
  phaseReports.opener = { zeroCall: callsAfterOpener === callsBeforeOpener, text: openerResult.openerText, costUsd: 0 };
  if (callsAfterOpener !== callsBeforeOpener) {
    console.error('  UNEXPECTED: the candidate opener triggered a network call — this should be impossible. Continuing, but flag this.');
  }

  // ═══ PHASE 1 — one real player reply, one real Grok OAS response ═══
  console.log('\n── phase 1: real player reply → real live OAS turn ──');
  await checkBudgetBeforePhase('oas-turn-reply');
  gate.setPhase('oas-turn-reply', 3); // worst-case real tier count for _authorFullScenePolicy (Grok / ministral-8b-2512 / gpt-4o) — not pinned, just bounded
  await page.fill('#gnActionInput', REAL_DO);
  await page.fill('#gnDialogueInput', REAL_SAY);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('oas-turn-reply', { watchdogMs: 15000, onWatchdog: (ms) => console.log('  ...turn-reply call still pending, ' + Math.round(ms / 1000) + 's') });
  const turnCalls = gate.trackedCalls('oas-turn-reply').map(summarizeTracked);
  const turnCostUsd = turnCalls.reduce((s, c) => s + (c.costUsd || 0), 0);
  runningCostUsd += turnCostUsd;
  const turnState = await page.evaluate(() => {
    const d = window.state.intimacyDialogue;
    const last = (d.liTurnHistory || [])[d.liTurnHistory.length - 1];
    return { liReply: last && last.liDialogue, author: window.state._lastOASTurnAuthor, model: window.state._lastOASTurnAuthorModel, cache: window.state._lastOASTurnAuthorCache };
  });
  console.log('  Lirael (submitted): SAY="' + REAL_SAY + '" DO="' + REAL_DO + '"');
  console.log('  turn-reply call(s): ' + JSON.stringify(turnCalls.map((c) => ({ model: c.model, status: c.status, costUsd: c.costUsd }))));
  console.log('  Julian (real, live reply, author=' + turnState.author + '/' + turnState.model + '): "' + (turnState.liReply || '(none captured)') + '"');
  phaseReports.oasTurnReply = { calls: turnCalls, costUsd: turnCostUsd, author: turnState.author, model: turnState.model, cache: turnState.cache, replyText: turnState.liReply };
  if (!turnCalls.some((c) => c.status === 200)) {
    await safeExit(2, 'no oas-turn-reply call settled with a 200 response');
    return;
  }

  // ═══ PHASE 2 — resolve into the interruption; real fate-card-preview batch ═══
  console.log('\n── phase 2: interruption + real fate-card batch ──');
  await checkBudgetBeforePhase('fate-card-preview-batch');
  gate.setPhase('fate-card-preview-batch', 2); // Grok primary, Mistral fallback — this role's real, unchanged chain
  await page.evaluate(() => { window._resolveIntimacyScene('user_pivot_end'); });
  await gate.waitForSettlement('fate-card-preview-batch', { watchdogMs: 15000, onWatchdog: (ms) => console.log('  ...fate-card batch call still pending, ' + Math.round(ms / 1000) + 's') });
  const cardCalls = gate.trackedCalls('fate-card-preview-batch').map(summarizeTracked);
  const cardCostUsd = cardCalls.reduce((s, c) => s + (c.costUsd || 0), 0);
  runningCostUsd += cardCostUsd;
  const interrState = await page.evaluate(() => {
    const r = window.state._intimateInterruption;
    const boundaryEl = document.querySelector('#gnCardMount [data-fate-card-slot="boundary"] [data-suggestion-text]');
    return { phase: r && r.phase, boundaryPreview: boundaryEl ? boundaryEl.textContent : null };
  });
  console.log('  fate-card-batch call(s): ' + JSON.stringify(cardCalls.map((c) => ({ model: c.model, status: c.status, costUsd: c.costUsd }))));
  console.log('  real generated Boundary card preview: "' + (interrState.boundaryPreview || '(not yet rendered)') + '"');
  phaseReports.fateCardBatch = { calls: cardCalls, costUsd: cardCostUsd, boundaryPreview: interrState.boundaryPreview };
  if (!cardCalls.some((c) => c.status === 200)) {
    await safeExit(2, 'no fate-card-preview-batch call settled with a 200 response');
    return;
  }

  // ═══ PHASE 3 — select the real Boundary card, real Submit, real Scene 2 generation (verifier + planner + author) ═══
  console.log('\n── phase 3: select Boundary, real Submit, real Scene 2 generation (verifier + planner + author) ──');
  await checkBudgetBeforePhase('scene2-generation');
  await page.click('#gnCardMount [data-fate-card-slot="boundary"]');
  const boundaryDraft = await page.evaluate(() => ({ action: document.getElementById('gnActionInput').value, dialogue: document.getElementById('gnDialogueInput').value }));
  console.log('  Boundary card selected — action="' + boundaryDraft.action + '" dialogue="' + boundaryDraft.dialogue + '"');

  // Ceiling 8 (not the author call's own worst-case of 3): a real Scene 2 continuation also fires a
  // per-scene commit-verifier (up to 3 tiers) and a scene-spine planner (1 attempt) BEFORE the
  // author call — proven by real dispatch evidence, 2026-09-20 (see the ceiling comment above).
  gate.setPhase('scene2-generation', 8);
  await page.click('#gnSubmitBtn');
  console.log('  Submit clicked — waiting on REAL SETTLEMENT (no wall-clock deadline).');
  await gate.waitForSettlement('scene2-generation', { watchdogMs: 15000, onWatchdog: (ms) => console.log('  ...Scene 2 generation still pending, ' + Math.round(ms / 1000) + 's') });
  const sceneCalls = gate.trackedCalls('scene2-generation').map(summarizeTracked);
  const sceneCostUsd = sceneCalls.reduce((s, c) => s + (c.costUsd || 0), 0);
  runningCostUsd += sceneCostUsd;
  console.log('  scene2-generation call(s) — verifier/planner/author, in dispatch order:');
  console.log('  ' + JSON.stringify(sceneCalls.map((c) => ({ model: c.model, maxTokens: c.maxTokens, isAuthorCall: c.isAuthorCall, status: c.status, costUsd: c.costUsd, costNote: c.costNote }))));
  const authorCall = sceneCalls.find((c) => c.isAuthorCall && c.status === 200);
  if (!authorCall) {
    await safeExit(2, 'the real author call (max_tokens: 8000) never settled with a 200 response — commit-verifier/planner calls above do not count as a Scene 2 sample');
    return;
  }

  const sceneResult = await page.evaluate(async () => {
    const start = Date.now();
    while (Date.now() - start < 10000) {
      const cap = window.state._sceneCaptures && window.state._sceneCaptures[1];
      if (cap && cap.originalOutput) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    const cap = window.state._sceneCaptures && window.state._sceneCaptures[1];
    return { captured: !!(cap && cap.originalOutput), rawOutput: cap ? cap.originalOutput : null, originalModel: cap ? cap.originalModel : null, lastCGAuthor: window.state._lastCGAuthor || null, lastCGAuthorCache: window.state._lastCGAuthorCache || null };
  }).catch((e) => ({ captured: false, error: String(e && e.message) }));
  phaseReports.scene2CgAuthor = { calls: sceneCalls, costUsd: sceneCostUsd, author: sceneResult.lastCGAuthor, model: sceneResult.originalModel, cache: sceneResult.lastCGAuthorCache, captured: sceneResult.captured, rawOutput: sceneResult.rawOutput };
  if (!sceneResult.captured) {
    await safeExit(2, 'network settled but local scene-capture parse did not complete');
    return;
  }
  console.log('  ✓ real Scene 2 response captured (author=' + sceneResult.lastCGAuthor + '/' + sceneResult.originalModel + ') — stopping here, no image/rendering phase entered.\n');
  fs.writeFileSync(path.join(OUT_DIR, 'scene2_raw_response.txt'), sceneResult.rawOutput || '');

  if (gate.hasUnsettled()) {
    console.error('REFUSING TO CLOSE — something is still unsettled even though every phase settled. Waiting before closing.');
    const pending = gate.trackedCalls().find((c) => c.status == null && c.networkError == null);
    if (pending) await gate.waitForSettlement(pending.roleTag, { watchdogMs: 15000 });
  }
  await browser.close();

  const report = { at: new Date().toISOString(), say: REAL_SAY, do: REAL_DO, phaseReports, runningCostUsd, ceilingUsd: COMBINED_CEILING_USD, ceilingHeld: runningCostUsd <= COMBINED_CEILING_USD, persistedLogFile: LOG_FILE };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(100));
  console.log('GROK HAPPY-PATH SAMPLE — real cost: $' + runningCostUsd.toFixed(6) + ' / ceiling $' + COMBINED_CEILING_USD.toFixed(2) + ' — ' + (report.ceilingHeld ? 'HELD' : 'BREACHED'));
  console.log('per-phase: opener=$0 turn-reply=$' + turnCostUsd.toFixed(6) + ' fate-cards=$' + cardCostUsd.toFixed(6) + ' scene2=$' + sceneCostUsd.toFixed(6));
  console.log('written to ' + OUT_DIR + '/: report.json, scene2_raw_response.txt, console_tail.txt');
  console.log('full persisted request/response log: ' + LOG_FILE);
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
