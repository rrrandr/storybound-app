// FIRST SACRIFICE — PAIRED OAS QUALITY SAMPLE: GROK (production-default) vs MISTRAL (test-only
// pinned) (Roman, 2026-09-19)
//
// Real, paid, two-operation run. Requires FRESH, EXPLICIT authorization before it is ever run —
// nothing about preparing/dry-proving this script constitutes that authorization.
//
// Each run is pinned to EXACTLY ONE physical provider request, HARNESS-ONLY (no window flag, no
// change to callOASTurnLLM/app.js) — proven dry, 21/21, in
// _first_sacrifice_oas_paired_quality_pinning_control.mjs. Mechanism: gate.allowRealPaths() with
// ONLY the one endpoint under test, plus gate.setPhase(label, 1). Everything else (every other
// text endpoint, every image endpoint, anything undeclared) is aborted by the gate's existing
// fail-closed default before it leaves the browser — zero cost, not a soft skip.
//   Run A — Grok:    allowRealPaths(['/api/proxy'])          — production's own natural first tier
//                     for this exact turn (proven: app.js:195143-195424, beat 1, not noise).
//   Run B — Mistral: allowRealPaths(['/api/mistral-proxy'])  — a test-only pinned alternate;
//                     production's own unmodified chain still tries Grok/DeepSeek first and they
//                     get blocked (zero cost) until it reaches Mistral.
// If the pinned tier itself fails (non-200 or network error), that run is marked INCONCLUSIVE —
// never silently reported as if a different, unpinned model had authored it.
//
// Both runs use the IDENTICAL starting state: the real candidate Julian opener (from
// 13_final_field_correction.json, read-only, never written to any shipped file), the real shipped
// Scene 1 accusation/situation context, and Roman's exact chosen Say/Do. Each run launches its own
// fresh browser (not just an in-page reset) for maximum isolation on a real, costly comparison —
// the in-page reset path (_clearPersistedOASState + nulling state.intimacyDialogue) was proven
// sufficient in the dry control, but a real paid comparison gets the stronger guarantee.
//
// Combined hard ceiling: $0.06 across both runs. Run A's real cost (from its real usage block) is
// checked against the ceiling BEFORE Run B is ever dispatched — if Run A alone already meets or
// exceeds it, Run B does not run.
//
// usage: node _first_sacrifice_oas_paired_quality_sample.mjs   (DO NOT RUN without fresh, explicit authorization)
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_first_sacrifice_oas_paired_quality_sample_out');
fs.mkdirSync(OUT_DIR, { recursive: true });

const CANDIDATE_PATH = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package', '13_final_field_correction.json');
const candidateRaw = JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));
const candidateOasOpening = candidateRaw.draft && candidateRaw.draft.oasOpening;
const candidatePostInterruption = candidateRaw.draft && candidateRaw.draft.postInterruptionBeat;
if (!candidateOasOpening || !candidateOasOpening.text) {
  console.error('HARNESS BLOCKER: ' + CANDIDATE_PATH + ' has no draft.oasOpening.text.');
  process.exit(2);
}

const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';

const RATES = {
  'grok-4-1-fast-reasoning': { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 },
  'mistral-small-latest': { in: 0.00000015, out: 0.0000006 },
};
// Corrected 2026-09-20 (Roman): this helper's first use (the paired sample's own Run A) undercounted
// real Grok cost by ~7.5% — it only priced usage.completion_tokens, omitting reasoning tokens, which
// Grok bills as output at the same rate. Fixed two ways, matching public/app.js's own
// estimateTextCost fix: (1) prefer the provider's own authoritative usage.cost_in_usd_ticks when
// present (1 tick = 1e-10 USD, OBSERVED from that same real response, not a published xAI doc — see
// app.js's TEXT_COST_TICK_TO_USD comment for the derivation); (2) otherwise include
// completion_tokens_details.reasoning_tokens in the output-token estimate.
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
const COMBINED_CEILING_USD = 0.06;

async function runPinned({ label, allowedPath, expectedModel }) {
  const logFile = path.join(OUT_DIR, label + '_run_' + Date.now() + '.jsonl');
  console.log('\n' + '='.repeat(100));
  console.log('RUN ' + label.toUpperCase() + ' — pinned to ' + allowedPath + ' only, ceiling 1, expecting ' + expectedModel);
  console.log('persisted request/response log: ' + logFile);

  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { return { label, verdict: 'HARNESS_BLOCKER', reason: 'could not launch browser: ' + (e && e.message) }; }
  const page = await (await browser.newContext()).newPage();

  const gate = await installFailClosedNetworkGate(page, { logFile });
  gate.allowRealPaths([allowedPath]);
  // Every other text endpoint AND every image endpoint is deliberately left unregistered — the
  // gate's existing fail-closed default aborts any attempt at them before it leaves the browser.

  async function safeExit(exitCode, reason, result) {
    if (gate.hasUnsettled()) {
      console.error('  REFUSING TO CLOSE (' + label + ') — an approved request is still unsettled (' + reason + ').');
      const pending = gate.trackedCalls().find((c) => c.status == null && c.networkError == null);
      if (pending) await gate.waitForSettlement(pending.roleTag, { watchdogMs: 15000, onWatchdog: (ms) => console.log('  ...' + label + ' still waiting, ' + Math.round(ms / 1000) + 's') });
    }
    fs.writeFileSync(path.join(OUT_DIR, label + '_tracked_calls.json'), JSON.stringify(gate.trackedCalls().map((c) => ({ url: c.url, status: c.status, networkError: c.networkError, usage: c.responseBody && c.responseBody.usage, elapsedMs: c.elapsedMs != null ? Math.round(c.elapsedMs) : null })), null, 2));
    await browser.close();
    return { label, verdict: exitCode === 0 ? (result && result.verdict) || 'SUCCESS' : 'HARNESS_BLOCKER', reason, ...(result || {}) };
  }

  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._fireIntimacyOpener === 'function' && typeof window._handleIntimacyTurn === 'function' && typeof window._bakedScene1For === 'function' && typeof window._clearPersistedOASState === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
  } catch (e) {
    return await safeExit(2, 'app unreachable: ' + (e && e.message));
  }
  console.log('  ✓ real app reached');

  await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'oas-paired-quality-sample-' + Date.now();
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

  await page.evaluate(async ({ candidateOasOpening, candidatePostInterruption }) => {
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
    await window._fireIntimacyOpener(); // zero-call — the candidate opener, proven dry
  }, { candidateOasOpening, candidatePostInterruption });
  console.log('  ✓ candidate opener mounted (zero-call, real text from ' + path.basename(CANDIDATE_PATH) + ')');

  gate.setPhase(label, 1);
  console.log('  Submitting Roman\'s real reply — waiting on REAL SETTLEMENT (no wall-clock deadline)...');
  const turnPromise = page.evaluate(({ say, doText }) => window._handleIntimacyTurn(say, doText), { say: REAL_SAY, doText: REAL_DO });
  await gate.waitForSettlement(label, { watchdogMs: 15000, onWatchdog: (ms) => console.log('  ...' + label + ' still pending, ' + Math.round(ms / 1000) + 's — browser stays open, nothing is aborted') });
  await turnPromise;

  const tracked = gate.trackedCalls(label);
  let result;
  if (tracked.length !== 1) {
    result = { verdict: 'INCONCLUSIVE', reason: tracked.length === 0 ? 'pinned tier never dispatched' : 'more than one physical request occurred (unexpected — ceiling should prevent this)', trackedCount: tracked.length };
  } else {
    const c = tracked[0];
    const model = (c.requestBody && (c.requestBody.preferredModel || c.requestBody.model)) || expectedModel;
    if (c.status === 200 && c.responseBody) {
      const text = (c.responseBody.choices && c.responseBody.choices[0] && c.responseBody.choices[0].message && c.responseBody.choices[0].message.content) || c.responseBody.content || null;
      const costInfo = realCost(model, c.responseBody.usage);
      result = { verdict: 'SUCCESS', model, rawResponseText: text, usage: c.responseBody.usage || null, costUsd: costInfo.cost, costNote: costInfo.note, costSource: costInfo.source, elapsedMs: c.elapsedMs != null ? Math.round(c.elapsedMs) : null };
      fs.writeFileSync(path.join(OUT_DIR, label + '_raw_response.txt'), text || '');
    } else {
      result = { verdict: 'INCONCLUSIVE', reason: 'pinned tier settled without a 200 response', status: c.status, networkError: c.networkError, model };
    }
  }

  console.log('  RESULT: ' + result.verdict + (result.costUsd != null ? ' — cost $' + result.costUsd.toFixed(6) : '') + (result.reason ? ' — ' + result.reason : ''));
  return await safeExit(result.verdict === 'HARNESS_BLOCKER' ? 2 : 0, null, result);
}

(async () => {
  console.log('=== FIRST SACRIFICE — PAIRED OAS QUALITY SAMPLE (real, paid, two pinned operations) ===');
  console.log('Say: "' + REAL_SAY + '"');
  console.log('Do:  "' + REAL_DO + '"');
  console.log('Combined hard ceiling: $' + COMBINED_CEILING_USD.toFixed(2));

  const runA = await runPinned({ label: 'run-a-grok', allowedPath: '/api/proxy', expectedModel: 'grok-4-1-fast-reasoning' });
  const costA = runA.costUsd || 0;

  let runB = { verdict: 'SKIPPED', reason: 'not reached' };
  if (costA >= COMBINED_CEILING_USD) {
    console.log('\nBUDGET STOP — Run A alone ($' + costA.toFixed(6) + ') already meets/exceeds the $' + COMBINED_CEILING_USD.toFixed(2) + ' combined ceiling. Run B will NOT be dispatched.');
  } else {
    runB = await runPinned({ label: 'run-b-mistral', allowedPath: '/api/mistral-proxy', expectedModel: 'mistral-small-latest' });
  }
  const costB = runB.costUsd || 0;
  const combined = costA + costB;

  const report = { at: new Date().toISOString(), say: REAL_SAY, do: REAL_DO, runA, runB, combinedCostUsd: combined, ceilingUsd: COMBINED_CEILING_USD, ceilingHeld: combined <= COMBINED_CEILING_USD };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(100));
  console.log('RUN A (Grok, grok-4-1-fast-reasoning): ' + runA.verdict + (runA.costUsd != null ? ' — $' + runA.costUsd.toFixed(6) : ''));
  console.log('RUN B (Mistral, mistral-small-latest): ' + runB.verdict + (runB.costUsd != null ? ' — $' + runB.costUsd.toFixed(6) : ''));
  console.log('Combined real cost: $' + combined.toFixed(6) + ' / ceiling $' + COMBINED_CEILING_USD.toFixed(2) + ' — ' + (report.ceilingHeld ? 'HELD' : 'BREACHED'));
  console.log('written to ' + OUT_DIR + '/: report.json, run-a-grok_raw_response.txt (if SUCCESS), run-b-mistral_raw_response.txt (if SUCCESS), *_tracked_calls.json');
  process.exit(0);
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
