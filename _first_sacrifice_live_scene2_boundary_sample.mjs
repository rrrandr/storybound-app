// FIRST SACRIFICE — ONE LIVE, EXPLICITLY-AUTHORIZED SCENE 2 BOUNDARY-CARD SAMPLE (Roman, 2026-09-19)
//
// Real, paid, one-shot run. Requires FRESH, separate, explicit authorization before it is ever run
// again — the prior authorization was consumed by the attempt recorded in
// _first_sacrifice_live_scene2_boundary_sample_incident_2026_09_19.md (dispatched, then a harness
// bug closed the browser before settlement was observed — result/cost unknown, not a model
// failure). This revision fixes that harness bug; it does not itself constitute new authorization.
//
// SAFETY, revised: uses the install-first, fail-closed _e2e_network_gate.mjs with its logFile
// option — every approved request is persisted to disk the instant it is released, and its
// settlement (response or terminal network error) is appended the instant it is observed. Every
// wait in this script is now on gate.waitForSettlement() (real network settlement), never a bare
// state-polling wall clock — and the browser is NEVER closed while gate.hasUnsettled() is true,
// checked explicitly right before the one and only browser.close() call. Image endpoints
// (/api/image, /api/bfl-kontext, /api/dashscope-image) are NEVER in the allowed-real list — any
// attempt is aborted before it leaves the browser, same as any other undeclared request.
//
// Nothing here writes to the shipped starter package. Output (prompts, raw response, cost report,
// and now the full persisted request/response log) is written to local files only.
//
// usage: node _first_sacrifice_live_scene2_boundary_sample.mjs   (DO NOT RUN without fresh, explicit authorization)
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_first_sacrifice_live_scene2_boundary_sample_out');
fs.mkdirSync(OUT_DIR, { recursive: true });
const LOG_FILE = path.join(OUT_DIR, 'run_' + Date.now() + '.jsonl');

// Real, sourced grok-4.3 billing rates (public/app.js TEXT_PRICING — every grok-* alias bills at
// these rates per api/proxy.js's own model resolution). Used to compute real cost from the real
// usage block this run captures — not re-derived, just applied.
const GROK_RATE = { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 };
const MINISTRAL_8B_RATE = { in: null, out: null }; // no sourced price row exists — see the Scene 2 census; cost left "unknown" if this tier ever wins
const GPT4O_RATE = { in: 0.0000025, out: 0.00001 };
function realCost(model, usage) {
  if (!usage) return { cost: null, note: 'no usage block returned' };
  const rate = /grok/i.test(model) ? GROK_RATE : /ministral/i.test(model) ? MINISTRAL_8B_RATE : /gpt-4o/i.test(model) ? GPT4O_RATE : null;
  if (!rate || rate.in == null) return { cost: null, note: 'no sourced price row for model="' + model + '" — see _first_sacrifice_scene2_call_census_2026_09_19.md' };
  const cacheRead = usage.cache_read_input_tokens || (usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens) || 0;
  const freshIn = Math.max(0, (usage.prompt_tokens || 0) - cacheRead);
  const outTok = usage.completion_tokens || 0;
  const cost = freshIn * rate.in + cacheRead * (rate.cacheRead != null ? rate.cacheRead : rate.in) + outTok * rate.out;
  return { cost, note: null };
}
function summarizeTracked(c) {
  const body = c.requestBody || {};
  const model = body.model || body.preferredModel || (c.responseBody && c.responseBody._orchestration && c.responseBody._orchestration.model) || null;
  const usage = c.responseBody && c.responseBody.usage;
  const costInfo = model ? realCost(model, usage) : { cost: null, note: 'model not identified in request body' };
  return { url: c.url, model: model, status: c.status, networkError: c.networkError, usage: usage || null, costUsd: costInfo.cost, costNote: costInfo.note, at: c.at, settledAt: c.settledAt };
}

(async () => {
  console.log('=== FIRST SACRIFICE — LIVE SCENE 2 BOUNDARY SAMPLE (real, paid, one operation) ===');
  console.log('    persisted request/response log: ' + LOG_FILE + '\n');
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const consoleLines = [];
  page.on('console', (m) => { consoleLines.push(m.text()); });

  // ── FAIL-CLOSED GATE, WITH PERSISTENT LOGGING — installed FIRST, before any navigation. ──
  const gate = await installFailClosedNetworkGate(page, { logFile: LOG_FILE });
  gate.allowRealPaths(['/api/proxy', '/api/mistral-proxy', '/api/chatgpt-proxy', '/api/deepseek-proxy']);
  // Image endpoints are deliberately NOT in allowRealPaths and have no stub registered — any
  // attempt at them (or anything else undeclared) is aborted by the gate's existing fail-closed
  // default. Nothing further needs to be done to "deny" them.

  // A single, disciplined exit point — refuses to close the browser while anything approved is
  // still unsettled, per the incident this revision fixes. Always writes whatever the gate has
  // persisted so far, so a blocker still leaves a complete evidentiary trail.
  async function safeExit(exitCode, reason) {
    if (gate.hasUnsettled()) {
      console.error('REFUSING TO CLOSE — an approved request is still unsettled (' + reason + '). Waiting on it before doing anything else.');
      await gate.waitForSettlement(
        // wait on whichever roleTag(s) are actually unsettled, one at a time
        gate.trackedCalls().find((c) => c.status == null && c.networkError == null).roleTag,
        { watchdogMs: 15000, onWatchdog: (ms) => console.error('  ...still waiting on an unsettled approved request, ' + Math.round(ms / 1000) + 's so far (browser stays open)') }
      );
    }
    fs.writeFileSync(path.join(OUT_DIR, 'partial_tracked_calls.json'), JSON.stringify(gate.trackedCalls().map(summarizeTracked), null, 2));
    fs.writeFileSync(path.join(OUT_DIR, 'console_tail.txt'), consoleLines.slice(-200).join('\n'));
    await browser.close();
    console.error('EXIT (' + reason + ') — browser closed only after confirming nothing approved was left unsettled.');
    process.exit(exitCode);
  }

  let reachedApp = false;
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
    reachedApp = true;
  } catch (e) {
    console.error('HARNESS BLOCKER: the app is not reachable at http://localhost:3000/ — ' + (e && e.message));
    await safeExit(2, 'app unreachable');
    return;
  }
  console.log('✓ real app reached, real starter_first_sacrifice package resolves (unmodified)\n');

  await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'live-fs-boundary-sample-' + Date.now();
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

  // ═══ PHASE 1 — real OAS opener (Julian's live first line) ═══
  gate.setPhase('oas-opener', 2);
  console.log('── phase 1: real OAS opener ──');
  const openerTriggerP = page.evaluate(async () => {
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    const h = pkg.oasHandoff || {};
    const plan = {
      beats: [], is_consummate_scene: true, __bakedOrigin: pkg.title || null,
      openingFrame: h.openingFrame || '', cue: h.cue || '',
      interruption: h.interruption || '', interruptionImage: h.interruptionImage || '', interruptionExchange: Array.isArray(h.interruptionExchange) ? h.interruptionExchange.slice() : [],
      oasOpening: (h.oasOpening && typeof h.oasOpening === 'object') ? h.oasOpening : null,
      postInterruptionBeat: (h.postInterruptionBeat && typeof h.postInterruptionBeat === 'object') ? h.postInterruptionBeat : null,
    };
    await window._initIntimacyDialogue(plan);
  });
  // Wait on REAL NETWORK SETTLEMENT (not just an app-state phase flag, which the app itself
  // advances fail-open regardless of whether the opener call succeeded — see the incident record).
  await gate.waitForSettlement('oas-opener', { watchdogMs: 15000, onWatchdog: (ms) => console.log('  ...opener call still pending, ' + Math.round(ms / 1000) + 's') });
  await openerTriggerP;
  const openerCalls = gate.trackedCalls('oas-opener').map(summarizeTracked);
  const bubble = await page.evaluate(() => { const b = document.querySelector('#oasHistoryLog .oas-chat-dialogue'); return b ? b.textContent : null; });
  console.log('  opener call(s) settled: ' + JSON.stringify(openerCalls.map((c) => ({ model: c.model, status: c.status, networkError: c.networkError }))));
  console.log('  Julian (real, live): "' + (bubble || '(not captured in DOM — see console log / persisted request log)') + '"\n');
  if (!openerCalls.some((c) => c.status === 200)) {
    await safeExit(2, 'no opener call settled with a 200 response');
    return;
  }

  // ═══ PHASE 2 — one real live exchange turn (Lirael's real submitted reply → Julian's real live reply) ═══
  gate.setPhase('oas-turn1-reply', 2);
  console.log('── phase 2: one real live exchange turn ──');
  const turn1Dialogue = "I didn't call to you. I don't know why you're here instead of at the inquiry you just claimed for yourself.";
  await page.fill('#gnActionInput', 'she holds his eyes without flinching');
  await page.fill('#gnDialogueInput', turn1Dialogue);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('oas-turn1-reply', { watchdogMs: 15000, onWatchdog: (ms) => console.log('  ...turn-1 reply call still pending, ' + Math.round(ms / 1000) + 's') });
  const turn1Calls = gate.trackedCalls('oas-turn1-reply').map(summarizeTracked);
  const turn1LiReply = await page.evaluate(() => {
    const d = window.state.intimacyDialogue;
    const last = (d && d.liTurnHistory && d.liTurnHistory.length) ? d.liTurnHistory[d.liTurnHistory.length - 1] : null;
    return last ? last.liDialogue : null;
  });
  console.log('  Lirael (submitted): "' + turn1Dialogue + '"');
  console.log('  turn-1 call(s) settled: ' + JSON.stringify(turn1Calls.map((c) => ({ model: c.model, status: c.status, networkError: c.networkError }))));
  console.log('  Julian (real, live reply): "' + (turn1LiReply || '(none captured)') + '"\n');
  if (!turn1Calls.some((c) => c.status === 200)) {
    await safeExit(2, 'no turn-1 reply call settled with a 200 response');
    return;
  }

  // ═══ PHASE 3 — resolve into the interruption; real fate-card-preview batch (5 real cards) ═══
  gate.setPhase('fate-card-preview-batch', 2);
  console.log('── phase 3: interruption + real fate-card batch ──');
  await page.evaluate(() => { window._resolveIntimacyScene('user_pivot_end'); });
  await gate.waitForSettlement('fate-card-preview-batch', { watchdogMs: 15000, onWatchdog: (ms) => console.log('  ...fate-card batch call still pending, ' + Math.round(ms / 1000) + 's') });
  const cardBatchCalls = gate.trackedCalls('fate-card-preview-batch').map(summarizeTracked);
  const interrState = await page.evaluate(() => {
    const r = window.state._intimateInterruption;
    const boundaryEl = document.querySelector('#gnCardMount [data-fate-card-slot="boundary"] [data-suggestion-text]');
    return { phase: r && r.phase, entryPath: r && r.entryPath, boundaryPreview: boundaryEl ? boundaryEl.textContent : null };
  });
  console.log('  fate-card-batch call(s) settled: ' + JSON.stringify(cardBatchCalls.map((c) => ({ model: c.model, status: c.status, networkError: c.networkError }))));
  console.log('  interruption phase: ' + interrState.phase + ' (entryPath=' + interrState.entryPath + ')');
  console.log('  real generated Boundary card preview: "' + (interrState.boundaryPreview || '(not yet rendered)') + '"\n');
  if (!cardBatchCalls.some((c) => c.status === 200)) {
    await safeExit(2, 'no fate-card-preview-batch call settled with a 200 response');
    return;
  }

  // ═══ PHASE 4 — select the real Boundary card, real Submit, real Scene 2 CG-screenplay author call ═══
  console.log('── phase 4: select Boundary, real Submit, real Scene 2 author call (Grok primary) ──');
  await page.click('#gnCardMount [data-fate-card-slot="boundary"]');
  const boundaryDraft = await page.evaluate(() => {
    const r = window.state._intimateInterruption;
    return { action: document.getElementById('gnActionInput').value, dialogue: document.getElementById('gnDialogueInput').value, selectedSlot: r.selectedSlot };
  });
  console.log('  Boundary card selected — action="' + boundaryDraft.action + '" dialogue="' + boundaryDraft.dialogue + '"');

  gate.setPhase('scene2-cg-screenplay-author', 3); // Grok primary + ministral fallback + gpt-4o terminal, per the shipped policy's own worst case for one continuation
  await page.click('#gnSubmitBtn');
  console.log('  Submit clicked — waiting on REAL SETTLEMENT of the Scene 2 author request (no wall-clock deadline; Grok can legitimately take 70-90s+).');
  await gate.waitForSettlement('scene2-cg-screenplay-author', {
    watchdogMs: 15000,
    onWatchdog: (ms) => console.log('  ...Scene 2 author call still pending, ' + Math.round(ms / 1000) + 's — browser stays open, nothing is aborted'),
  });
  console.log('  ✓ the Scene 2 author request has settled (response or terminal network error observed).');

  const scene2Calls = gate.trackedCalls('scene2-cg-screenplay-author').map(summarizeTracked);
  const wonWithResponse = scene2Calls.find((c) => c.status === 200);
  if (!wonWithResponse) {
    console.error('  the settled attempt(s) did not include a 200 response: ' + JSON.stringify(scene2Calls));
    await safeExit(2, 'scene2 author request settled without a successful (200) response — see persisted log for the exact terminal state');
    return;
  }

  // Give the app a brief, bounded moment to finish parsing the already-settled network response
  // into state._sceneCaptures (pure local JS after the network call already returned — not a new
  // network wait) before reading it.
  const sceneResult = await page.evaluate(async () => {
    const start = Date.now();
    while (Date.now() - start < 10000) {
      const cap = window.state._sceneCaptures && window.state._sceneCaptures[1];
      if (cap && cap.originalOutput) break;
      await new Promise((r) => setTimeout(r, 200));
    }
    const cap = window.state._sceneCaptures && window.state._sceneCaptures[1];
    return {
      captured: !!(cap && cap.originalOutput),
      sysPrompt: cap ? cap.sysPrompt : null,
      userPrompt: cap ? cap.userPrompt : null,
      rawOutput: cap ? cap.originalOutput : null,
      originalModel: cap ? cap.originalModel : null,
      lastCGAuthor: window.state._lastCGAuthor || null,
      lastCGAuthorCache: window.state._lastCGAuthorCache || null,
    };
  }).catch((e) => ({ captured: false, error: String(e && e.message) }));

  if (!sceneResult.captured) {
    console.error('  the network response settled, but app-level parsing into state._sceneCaptures did not complete within 10s of local processing — this is unusual; treating as a blocker rather than guessing.');
    await safeExit(2, 'network settled but local scene-capture parse did not complete');
    return;
  }

  console.log('  ✓ real Scene 2 response captured — stopping here, no rendering/image phase entered.\n');

  // ── Confirm nothing approved is left unsettled ANYWHERE, THEN close. The one and only close. ──
  if (gate.hasUnsettled()) {
    console.error('REFUSING TO CLOSE — something unrelated is still unsettled even though the Scene 2 call itself settled. Waiting before closing.');
    await gate.waitForSettlement(gate.trackedCalls().find((c) => c.status == null && c.networkError == null).roleTag, { watchdogMs: 15000, onWatchdog: (ms) => console.log('  ...' + Math.round(ms / 1000) + 's') });
  }
  await browser.close();

  // ── Real request/cost/usage report from the gate's own persisted, tracked calls. ──
  const allTracked = gate.trackedCalls();
  const report = {
    at: new Date().toISOString(),
    submittedPosture: 'Boundary',
    submittedText: boundaryDraft,
    winningProvider: sceneResult.lastCGAuthor,
    winningModel: sceneResult.originalModel,
    cache: sceneResult.lastCGAuthorCache,
    perPhaseTrackedCalls: {
      'oas-opener': allTracked.filter((c) => c.roleTag === 'oas-opener').map(summarizeTracked),
      'oas-turn1-reply': allTracked.filter((c) => c.roleTag === 'oas-turn1-reply').map(summarizeTracked),
      'fate-card-preview-batch': allTracked.filter((c) => c.roleTag === 'fate-card-preview-batch').map(summarizeTracked),
      'scene2-cg-screenplay-author': allTracked.filter((c) => c.roleTag === 'scene2-cg-screenplay-author').map(summarizeTracked),
    },
    anyUndeclaredOrAborted: gate.unstubbed(),
    persistedLogFile: LOG_FILE,
  };

  console.log('\n' + '='.repeat(100));
  console.log('REAL SCENE 2 AUTHOR RESULT — provider=' + sceneResult.lastCGAuthor + ' model=' + sceneResult.originalModel);
  console.log('cache: ' + JSON.stringify(sceneResult.lastCGAuthorCache));
  console.log('\nreal per-phase call/cost report:');
  console.log(JSON.stringify(report.perPhaseTrackedCalls, null, 2));
  if (report.anyUndeclaredOrAborted.length) {
    console.log('\n⚠ requests aborted as undeclared (should be image endpoints only, if any):');
    console.log(JSON.stringify(report.anyUndeclaredOrAborted, null, 2));
  } else {
    console.log('\n✓ zero undeclared/aborted requests — every request this run made was one of the 4 declared phases.');
  }

  fs.writeFileSync(path.join(OUT_DIR, 'system_prompt.txt'), sceneResult.sysPrompt || '');
  fs.writeFileSync(path.join(OUT_DIR, 'user_prompt.txt'), sceneResult.userPrompt || '');
  fs.writeFileSync(path.join(OUT_DIR, 'raw_response.txt'), sceneResult.rawOutput || '');
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  console.log('\nwritten to ' + OUT_DIR + '/: system_prompt.txt, user_prompt.txt, raw_response.txt, report.json');
  console.log('full persisted request/response log (every event, immediately as it happened): ' + LOG_FILE);
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
