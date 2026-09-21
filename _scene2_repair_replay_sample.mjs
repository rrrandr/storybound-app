// SCENE 2 REPAIR REPLAY — REUSE PAID OUTPUTS, PAY ONLY FOR THE REMAINING STRUCTURAL/AUTHOR CALLS
// (Roman, 2026-09-20)
//
// Real, paid, test-only replay. Requires FRESH, EXPLICIT authorization before it is ever run.
//
// Roman: "You already paid for — and captured — the successful Grok OAS reply and Fate Card state.
// Reuse those exact persisted outputs in a test-only replay state, then exercise the real Submit ->
// verifier/planner -> Grok Scene 2 author path. That isolates the repaired blocker and avoids
// repaying for OAS and card generation."
//
// Mechanism: loads the real app, then feeds the OAS turn-reply and Fate-Card-batch endpoints STUBS
// whose content is the EXACT, byte-identical raw response bodies already captured (and already
// paid for) in the 2026-09-19 happy-path run's persisted log
// (_first_sacrifice_oas_grok_happy_path_sample_out/run_1789878699028.jsonl) — read directly from
// that file at runtime, never hand-transcribed. The real app's own real parsing/state-building code
// runs on this replayed content, so the resulting state.intimacyDialogue / state._intimateInterruption
// shapes are exactly what real network calls would have produced — at zero cost, since nothing is
// actually dispatched for those two roles.
//
// A SEPARATE, real finding from tracing the original incident: the "2000 max_tokens" call in that
// run's scene2-generation phase was NOT the scene-spine planner — its content (runThesis/issueArcs/
// motifBank/voiceAnchors/characterIcebergs) is the CG SCAFFOLD, a once-per-story setup generator
// (_shouldGenerateCGScaffold, app.js ~219277), gated OFF only when
// state.cgScaffold.storyId === state.storyId.
//
// CORRECTION (Roman, 2026-09-20): the first real Scene 2 transition does NOT already have a
// scaffold — scaffold generation is intentionally DEFERRED until that first Submit, so a genuine
// cold first-transition legitimately generates one there. This replay does NOT reproduce that —
// it deliberately REUSES the already-paid-for real scaffold content from the original 2026-09-19
// run (read from its persisted log, never re-typed) specifically to avoid paying for scaffold
// generation a second time and to ISOLATE the repaired planner -> author path from it. This replay
// is therefore a valid, narrower proof of the repaired blocker — it is NOT a cold-start end-to-end
// proof of the first real Scene 2 transition (which would legitimately include scaffold
// generation as one of its real costs, not accounted for in this replay's ceiling).
//
// Only Phase 3 (Submit -> verifier/planner/author) is allow-listed for REAL network calls. Phases 0-2
// are fully stubbed with the real, already-paid content — genuinely zero additional spend for them.
// No images, ever. Ceiling 8 physical requests (unchanged safety margin) / $0.45 combined — the
// isolated cost of ONLY the remaining structural + author calls (see the ceiling breakdown below).
//
// usage: node _scene2_repair_replay_sample.mjs   (DO NOT RUN without fresh, explicit authorization)
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_scene2_repair_replay_sample_out');
fs.mkdirSync(OUT_DIR, { recursive: true });
const LOG_FILE = path.join(OUT_DIR, 'run_' + Date.now() + '.jsonl');

// ── Read the ALREADY-PAID-FOR real responses directly from the original run's persisted log ──
const ORIGINAL_LOG = path.join(__dirname, '_first_sacrifice_oas_grok_happy_path_sample_out', 'run_1789878699028.jsonl');
if (!fs.existsSync(ORIGINAL_LOG)) {
  console.error('HARNESS BLOCKER: original persisted log not found at ' + ORIGINAL_LOG);
  process.exit(2);
}
const originalEvents = fs.readFileSync(ORIGINAL_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
function findResponse(roleTag) {
  const ev = originalEvents.find((e) => e.kind === 'response' && e.roleTag === roleTag && e.status === 200);
  if (!ev) { console.error('HARNESS BLOCKER: no successful "' + roleTag + '" response found in the original log.'); process.exit(2); }
  return ev.responseBody;
}
const REAL_OAS_TURN_REPLY_RESPONSE = findResponse('oas-turn-reply');
const REAL_FATE_CARD_RESPONSE = findResponse('fate-card-preview-batch');
// The scaffold response is tracked under roleTag 'scene2-generation' in the original log (it wasn't
// yet distinguished as its own role at the time) — identify it specifically by its distinctive
// content shape (runThesis is unique to the scaffold among everything in that phase).
const scaffoldEvent = originalEvents.find((e) => e.kind === 'response' && e.roleTag === 'scene2-generation' && e.status === 200 && e.responseBody && e.responseBody.choices && e.responseBody.choices[0] && e.responseBody.choices[0].message && /runThesis/.test(e.responseBody.choices[0].message.content || ''));
if (!scaffoldEvent) { console.error('HARNESS BLOCKER: could not locate the real scaffold response in the original log.'); process.exit(2); }
const REAL_SCAFFOLD_CONTENT_RAW = scaffoldEvent.responseBody.choices[0].message.content;
const REAL_SCAFFOLD_JSON = (() => {
  // The real content is fenced in ```json ... ``` — strip the fence before parsing, matching what
  // the real app's own parser does (it strips code fences before JSON.parse).
  const stripped = REAL_SCAFFOLD_CONTENT_RAW.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();
  return JSON.parse(stripped);
})();
console.log('✓ loaded real, already-paid-for OAS turn-reply, Fate-Card batch, and CG scaffold responses from ' + ORIGINAL_LOG);

const CANDIDATE_PATH = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package', '13_final_field_correction.json');
const candidateRaw = JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));
const candidateOasOpening = candidateRaw.draft && candidateRaw.draft.oasOpening;
const candidatePostInterruption = candidateRaw.draft && candidateRaw.draft.postInterruptionBeat;

const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';

const RATES = {
  'grok-4-1-fast-reasoning': { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 },
  'grok-4.20-0309-non-reasoning': { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 },
  'grok-4-1-fast-non-reasoning': { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 },
  'mistral-small-latest': { in: 0.00000015, out: 0.0000006 },
  'ministral-8b-2512': { in: 0.00000015, out: 0.00000015 }, // sourced 2026-09-20, mistral.ai/pricing/api ("Ministral 3 (8B)")
  'gpt-4o': { in: 0.0000025, out: 0.00001 },
  'gpt-4o-mini': { in: 0.00000015, out: 0.0000006 },
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

// Ceiling breakdown — ONLY the remaining structural/author calls, isolated from OAS/Fate-Card
// (already paid, now replayed at zero cost) and from the scaffold (suppressed via seeding):
//   scene-spine planner (repaired): ministral-8b-2512 primary (small: real observed shape was
//     ~640 max_tokens; at $0.15/M flat, a few-KB prompt is well under a cent) -> grok fallback if
//     that 429s again (small max_tokens, grok rate — still under a few cents). Budget: $0.05.
//   Scene 2 author (Grok, max_tokens 8000): historical measured continuation cost ≈ $0.12
//     (project_scene_cost_breakdown.md); real margin to $0.40 covers a slower/heavier real
//     generation or a ministral-8b-2512/gpt-4o fallback if Grok itself fails.
// Contingency, NOT included in the primary ceiling: if state.cgScaffold seeding somehow fails to
// suppress regeneration, the gate's own physical-request ceiling (8) still bounds total exposure —
// the real scaffold call, if it recurs, is cheap on ministral-8b-2512 (observed real tokens
// 5703in/1608out ≈ $0.0011) but could be materially more if it falls to a Grok tier instead. This
// is disclosed, not pre-paid for.
const PHASE_CEILINGS_USD = { 'scene2-planner': 0.05, 'scene2-author': 0.40 };
const COMBINED_CEILING_USD = 0.45;
const PHYSICAL_REQUEST_CEILING = 8;

// LOG RECONCILIATION SAFETY NET (Roman 2026-09-21, fourth harness repair) — real incident: retry
// #15 dispatched a real author call that settled with a genuine 200 and real content (confirmed
// via the app's own console log AND the raw persisted log), yet this script's own in-memory
// tracking (gate.trackedCalls()) reported it as `status: null` and this script gave up believing
// the author "never settled" — undercounting real spend by ~$0.085 and never writing
// scene2_raw_response.txt. Root cause traced to the network gate's response-correlation logic
// (fixed separately in _e2e_network_gate.mjs — see its own comment). This function is an
// INDEPENDENT second line of defense, specific to this script: LOG_FILE (this run's own persisted
// JSONL) is the one guaranteed-complete record — every dispatch and every response is appended the
// INSTANT it is observed, regardless of in-memory correlation. Before this script ever concludes
// "never settled," it re-reads that file and reconciles dispatch/response pairs itself (FIFO within
// each url — the order responses are actually observed to arrive in), independent of whatever the
// live in-memory gate view showed. If the persisted log has a real, settled record the in-memory
// view missed, THAT record — and its real cost — is used instead of giving up. Proven,
// _e2e_network_gate_response_correlation_control.mjs.
function reconcileFromPersistedLog(roleTag) {
  let events;
  try { events = fs.readFileSync(LOG_FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)); }
  catch (_) { return []; }
  const relevant = events.filter((e) => e.roleTag === roleTag && e.real === true && (e.kind === 'dispatch' || e.kind === 'response'));
  const pendingByUrl = {};
  const matched = [];
  relevant.forEach((e) => {
    if (e.kind === 'dispatch') {
      (pendingByUrl[e.url] = pendingByUrl[e.url] || []).push({ dispatch: e, response: null });
    } else if (e.kind === 'response') {
      const q = pendingByUrl[e.url] || [];
      const slot = q.find((s) => !s.response); // FIFO: the oldest still-unclaimed dispatch for this url
      if (slot) slot.response = e;
    }
  });
  Object.values(pendingByUrl).forEach((q) => q.forEach((s) => matched.push(s)));
  return matched.map(({ dispatch, response }) => {
    const body = dispatch.requestBody || {};
    const model = body.model || body.preferredModel || null;
    const usage = response && response.responseBody && response.responseBody.usage;
    const costInfo = model ? realCost(model, usage) : { cost: null, note: 'model not identified in request body', source: null };
    return { url: dispatch.url, model, maxTokens: body.max_tokens != null ? body.max_tokens : null, isAuthorCall: body.max_tokens === 8000, isSuspectedScaffold: body.max_tokens === 2000, status: response ? response.status : null, networkError: null, usage: usage || null, costUsd: costInfo.cost, costNote: costInfo.note, costSource: costInfo.source, elapsedMs: response && response.elapsedMs != null ? Math.round(response.elapsedMs) : null };
  });
}

function summarizeTracked(c) {
  const body = c.requestBody || {};
  const model = body.model || body.preferredModel || (c.responseBody && c.responseBody._orchestration && c.responseBody._orchestration.model) || null;
  const usage = c.responseBody && c.responseBody.usage;
  const costInfo = model ? realCost(model, usage) : { cost: null, note: 'model not identified in request body', source: null };
  return { url: c.url, model, maxTokens: body.max_tokens != null ? body.max_tokens : null, isAuthorCall: body.max_tokens === 8000, isSuspectedScaffold: body.max_tokens === 2000, status: c.status, networkError: c.networkError, usage: usage || null, costUsd: costInfo.cost, costNote: costInfo.note, costSource: costInfo.source, elapsedMs: c.elapsedMs != null ? Math.round(c.elapsedMs) : null };
}

(async () => {
  console.log('=== SCENE 2 REPAIR REPLAY (real, paid, isolated to the structural/author path) ===');
  console.log('    persisted request/response log: ' + LOG_FILE);
  console.log('    combined hard ceiling: $' + COMBINED_CEILING_USD.toFixed(2) + ' — ' + JSON.stringify(PHASE_CEILINGS_USD) + ' | physical request ceiling: ' + PHYSICAL_REQUEST_CEILING);
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const consoleLines = [];
  page.on('console', (m) => { consoleLines.push(m.text()); });

  const gate = await installFailClosedNetworkGate(page, { logFile: LOG_FILE });
  // Phases 0-2 are served from the real, already-paid-for content — STUBBED, not real. Only the
  // structural/author phase (below) switches this same gate to allowRealPaths.
  gate.stub('/api/proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    // roleTag STRUCTURE_GENERATOR (not INTIMACY_SPECIALIST) — the OAS turn-reply dispatches via
    // _authorFullScenePolicy since the 2026-09-20 reclassification; INTIMACY_SPECIALIST is only the
    // OPENER's (unchanged) live-generated path, which never fires here (the candidate opener is
    // zero-call). Caught by the mechanics dry proof before this script was ever run for real.
    if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
    return { __gateStatus: 500, error: 'unexpected /api/proxy call during the stubbed replay phase — only the real OAS turn-reply shape is served here' };
  });
  gate.stub('/api/mistral-proxy', () => REAL_FATE_CARD_RESPONSE);

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

  await page.evaluate(({ scaffold }) => {
    const s = window.state;
    s.storyId = 'scene2-repair-replay-' + Date.now();
    s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = [];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s._starterId = 'starter_first_sacrifice';
    s._pcLookSkipped = true;
    s._bakedGenesisUnlocked = true;
    window._devBypass = true;
    // Suppresses the once-per-story CG scaffold regeneration (_shouldGenerateCGScaffold,
    // app.js ~219277-219309: skipped only when s.cgScaffold.storyId === s.storyId) — seeded with
    // the REAL, already-paid-for scaffold content from the original run, isolating this replay to
    // the structural/author path Roman actually asked to re-exercise.
    s.cgScaffold = Object.assign({}, scaffold, { storyId: s.storyId });
    // HARNESS FIX (Roman 2026-09-20, found via retries 1-3 all missing "mouth-band torn away"):
    // real production calls _hydrateBakedStoryState(pkg) when the baked Scene 1 is displayed —
    // well before any player interaction — which sets state._bakedEmitted = pkg.emitted. That
    // function is not exposed on window and this replay never reproduced its one load-bearing
    // effect, so state._bakedEmitted stayed null across three real retries, silently starving the
    // Scene 2 planner of real, already-authored continuity data (mouth-band state, "it happened;
    // it is not re-staged" obligations) that real production would have supplied. Confirmed via
    // _baked_emitted_probe.mjs that setting this one field closes the gap. Mirrors ONLY this field
    // — not a reimplementation of _hydrateBakedStoryState's other (unconsumed, per its own
    // disclosed comment) side effects.
    var _pkgForEmitted = window._bakedScene1For('starter_first_sacrifice');
    s._bakedEmitted = (_pkgForEmitted && _pkgForEmitted.emitted) || null;
  }, { scaffold: REAL_SCAFFOLD_JSON });

  console.log('── phase 0: candidate opener (zero-call) ──');
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
  console.log('  Julian (authored, zero-call): "' + openerResult.openerText + '"');
  phaseReports.opener = { text: openerResult.openerText, costUsd: 0 };

  console.log('\n── phase 1 (REPLAYED, zero real cost): real player reply -> real, already-paid Grok OAS response ──');
  gate.setPhase('oas-turn-reply-replay', 1);
  await page.fill('#gnActionInput', REAL_DO);
  await page.fill('#gnDialogueInput', REAL_SAY);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('oas-turn-reply-replay', { watchdogMs: 10000 });
  const turnState = await page.evaluate(() => {
    const d = window.state.intimacyDialogue;
    const last = (d.liTurnHistory || [])[d.liTurnHistory.length - 1];
    return { liReply: last && last.liDialogue };
  });
  console.log('  Julian (replayed real reply): "' + (turnState.liReply || '(none captured — replay failed)') + '"');
  phaseReports.oasTurnReplyReplayed = { costUsd: 0, replyText: turnState.liReply };
  if (!turnState.liReply) { await safeExit(2, 'the replayed OAS turn-reply did not populate liTurnHistory — replay state reconstruction failed'); return; }

  console.log('\n── phase 2 (REPLAYED, zero real cost): interruption -> real, already-paid Fate-Card batch ──');
  gate.setPhase('fate-card-replay', 1);
  await page.evaluate(() => { window._resolveIntimacyScene('user_pivot_end'); });
  await gate.waitForSettlement('fate-card-replay', { watchdogMs: 10000 });
  const boundarySlotExists = await page.evaluate(() => !!document.querySelector('#gnCardMount [data-fate-card-slot="boundary"]'));
  console.log('  Boundary card slot rendered: ' + boundarySlotExists);
  phaseReports.fateCardReplayed = { costUsd: 0, boundarySlotExists };
  if (!boundarySlotExists) { await safeExit(2, 'the replayed Fate-Card batch did not render the Boundary slot — replay state reconstruction failed'); return; }

  console.log('\n── phase 3 (REAL, PAID): select Boundary, real Submit, real verifier/planner/author path ──');
  await checkBudgetBeforePhase('scene2-structural-author');
  await page.click('#gnCardMount [data-fate-card-slot="boundary"]');
  const boundaryDraft = await page.evaluate(() => ({ action: document.getElementById('gnActionInput').value, dialogue: document.getElementById('gnDialogueInput').value }));
  console.log('  Boundary card selected — action="' + boundaryDraft.action + '" dialogue="' + boundaryDraft.dialogue + '"');

  // NOW switch the gate to real pass-through for the structural/author phase only.
  gate.allowRealPaths(['/api/proxy', '/api/mistral-proxy', '/api/deepseek-proxy', '/api/chatgpt-proxy']);
  gate.setPhase('scene2-structural-author', PHYSICAL_REQUEST_CEILING);
  await page.click('#gnSubmitBtn');
  console.log('  Submit clicked — waiting on REAL SETTLEMENT (no wall-clock deadline).');
  // expectedTierLogRole: 'scenePlanner' (Roman 2026-09-21, third harness repair) — cross-checks the
  // app's own window._providerTierLog against network-tracked calls, so this wait can no longer
  // return early while the app has DECLARED a fallback/terminal-tier attempt (e.g. after a Grok 502)
  // that hasn't been network-tracked yet — exactly the gap real retries 6 and 7 hit. Proven,
  // _harness_tier_log_cross_check_control.mjs.
  await gate.waitForSettlement('scene2-structural-author', { watchdogMs: 15000, expectedTierLogRole: 'scenePlanner', onWatchdog: (ms) => console.log('  ...still pending, ' + Math.round(ms / 1000) + 's — browser stays open, nothing aborted') });

  let structuralAuthorCalls = gate.trackedCalls('scene2-structural-author').map(summarizeTracked);
  let structuralAuthorCostUsd = structuralAuthorCalls.reduce((s, c) => s + (c.costUsd || 0), 0);
  runningCostUsd += structuralAuthorCostUsd;
  console.log('  scene2-structural-author call(s), in dispatch order:');
  console.log('  ' + JSON.stringify(structuralAuthorCalls.map((c) => ({ model: c.model, maxTokens: c.maxTokens, isAuthorCall: c.isAuthorCall, isSuspectedScaffold: c.isSuspectedScaffold, status: c.status, costUsd: c.costUsd, costNote: c.costNote }))));
  if (structuralAuthorCalls.some((c) => c.isSuspectedScaffold)) {
    console.warn('  ⚠ a scaffold-shaped call (max_tokens: 2000) fired despite seeding state.cgScaffold — the suppression did not work as designed. Disclosed, not silently absorbed.');
  }
  let authorCall = structuralAuthorCalls.find((c) => c.isAuthorCall && c.status === 200);
  let reconciledFromLog = false;
  if (!authorCall) {
    console.warn('  ⚠ in-memory tracking shows no settled author call — cross-checking the persisted log (' + LOG_FILE + ') before giving up...');
    const reconciled = reconcileFromPersistedLog('scene2-structural-author');
    const reconciledAuthor = reconciled.find((c) => c.isAuthorCall && c.status === 200);
    if (reconciledAuthor) {
      console.warn('  ✓ RECOVERED from the persisted log: the author call DID settle (model=' + reconciledAuthor.model + ', status=' + reconciledAuthor.status + ', cost=$' + (reconciledAuthor.costUsd != null ? reconciledAuthor.costUsd.toFixed(6) : '?') + ') — in-memory tracking missed it.');
      structuralAuthorCalls = reconciled;
      structuralAuthorCostUsd = reconciled.reduce((s, c) => s + (c.costUsd || 0), 0);
      runningCostUsd = structuralAuthorCostUsd; // this phase is the only contributor to runningCostUsd so far
      authorCall = reconciledAuthor;
      reconciledFromLog = true;
    }
  }
  phaseReports.scene2StructuralAuthor = { calls: structuralAuthorCalls, costUsd: structuralAuthorCostUsd, reconciledFromLog };
  if (!authorCall) {
    await safeExit(2, 'the real Scene 2 author call (max_tokens: 8000) never settled with a 200 response (checked both in-memory tracking and the persisted log)');
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
  phaseReports.scene2CgAuthor = { author: sceneResult.lastCGAuthor, model: sceneResult.originalModel, cache: sceneResult.lastCGAuthorCache, captured: sceneResult.captured, rawOutput: sceneResult.rawOutput };
  if (!sceneResult.captured) {
    await safeExit(2, 'network settled but local scene-capture parse did not complete');
    return;
  }
  console.log('  ✓ real Scene 2 response captured (author=' + sceneResult.lastCGAuthor + '/' + sceneResult.originalModel + ')\n');
  fs.writeFileSync(path.join(OUT_DIR, 'scene2_raw_response.txt'), sceneResult.rawOutput || '');

  if (gate.hasUnsettled()) {
    const pending = gate.trackedCalls().find((c) => c.status == null && c.networkError == null);
    if (pending) await gate.waitForSettlement(pending.roleTag, { watchdogMs: 15000 });
  }
  await browser.close();

  const report = { at: new Date().toISOString(), say: REAL_SAY, do: REAL_DO, phaseReports, runningCostUsd, ceilingUsd: COMBINED_CEILING_USD, ceilingHeld: runningCostUsd <= COMBINED_CEILING_USD, persistedLogFile: LOG_FILE };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(100));
  console.log('SCENE 2 REPAIR REPLAY — real cost (structural + author only): $' + runningCostUsd.toFixed(6) + ' / ceiling $' + COMBINED_CEILING_USD.toFixed(2));
  console.log('written to ' + OUT_DIR + '/: report.json, scene2_raw_response.txt, console_tail.txt');
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
