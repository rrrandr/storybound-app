// SCENE 2 — LI PRESENCE REPAIR — REAL, PAID RUN (Roman, 2026-09-20)
//
// Real, paid, test-only operation. Authorized ("go") after: the detector proven 9/9 dry
// (_li_presence_dominance_repair_control.mjs), the repair function's mechanics proven 7/7 dry
// (request shape, index-safety, accept-on-valid-repair, reject-only-on-still-flagged), against
// the authorization sheet (_scene2_li_presence_repair_authorization_2026_09_20.md): $0.05 ceiling,
// <=2 physical requests, touches ONLY the 4 flagged beat indices (7, 11, 16, 22) in the real,
// preserved Scene 2 sample, preserves everything else (planner objective, the assembly collective
// constraint, the forced-choice ending) by construction — the repair function can structurally
// only ever touch the flagged indices.
//
// Reads _scene2_repair_replay_sample_out/scene2_raw_response.txt VERBATIM as the source — this
// file is NEVER modified. Output (accepted or rejected, cost, and — if accepted — the repaired
// screenplay) is written to a NEW directory, never overwriting the baseline.
//
// usage: node _scene2_li_presence_repair_run.mjs   (DO NOT RUN without fresh, explicit authorization)
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_scene2_li_presence_repair_out');
fs.mkdirSync(OUT_DIR, { recursive: true });
const LOG_FILE = path.join(OUT_DIR, 'run_' + Date.now() + '.jsonl');

const BASELINE_PATH = path.join(__dirname, '_scene2_repair_replay_sample_out', 'scene2_raw_response.txt');
const REAL_SCENE2 = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
console.log('✓ loaded the real, preserved Scene 2 sample verbatim from ' + BASELINE_PATH + ' — NOT modifying this file');

const RATES = {
  'grok-4-1-fast-reasoning': { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 },
  'grok-4.3': { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 },
  'ministral-8b-2512': { in: 0.00000015, out: 0.00000015 },
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

const COMBINED_CEILING_USD = 0.05;
const PHYSICAL_REQUEST_CEILING = 2;

(async () => {
  console.log('=== SCENE 2 LI-PRESENCE REPAIR (real, paid, bounded to 4 flagged beats) ===');
  console.log('    persisted request/response log: ' + LOG_FILE);
  console.log('    hard ceiling: $' + COMBINED_CEILING_USD.toFixed(2) + ' / ' + PHYSICAL_REQUEST_CEILING + ' physical requests');
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const consoleLines = [];
  page.on('console', (m) => { consoleLines.push(m.text()); });

  const gate = await installFailClosedNetworkGate(page, { logFile: LOG_FILE });

  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForFunction(() => typeof window._repairLIPresenceBeats === 'function' && typeof window._detectLIPresenceDominance === 'function', { timeout: 20000 });
  } catch (e) {
    console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message));
    await browser.close();
    process.exit(2);
  }
  console.log('✓ real app reached, _repairLIPresenceBeats and _detectLIPresenceDominance are live\n');

  const detectorResult = await page.evaluate((s) => window._detectLIPresenceDominance(s, { liName: 'Julian' }), REAL_SCENE2);
  console.log('pre-repair detector state: ' + JSON.stringify(detectorResult));
  if (!detectorResult.flagged) {
    console.error('HARNESS BLOCKER: the baseline sample no longer flags — nothing to repair, refusing to spend.');
    await browser.close();
    process.exit(2);
  }

  gate.allowRealPaths(['/api/proxy', '/api/mistral-proxy', '/api/deepseek-proxy', '/api/chatgpt-proxy']);
  gate.setPhase('li-presence-repair', PHYSICAL_REQUEST_CEILING);
  console.log('Dispatching the real repair call — waiting on REAL SETTLEMENT (no wall-clock deadline).');
  const repairPromise = page.evaluate(({ s, d }) => window._repairLIPresenceBeats(s, d, { liName: 'Julian' }), { s: REAL_SCENE2, d: detectorResult });
  await gate.waitForSettlement('li-presence-repair', { watchdogMs: 20000, onWatchdog: (ms) => console.log('  ...still pending, ' + Math.round(ms / 1000) + 's — browser stays open, nothing aborted') });
  const repairResult = await repairPromise;

  const calls = gate.trackedCalls('li-presence-repair').map((c) => {
    const body = c.requestBody || {};
    const model = body.model || body.preferredModel || (c.responseBody && c.responseBody._orchestration && c.responseBody._orchestration.model) || null;
    const usage = c.responseBody && c.responseBody.usage;
    const costInfo = model ? realCost(model, usage) : { cost: null, note: 'model not identified', source: null };
    return { url: c.url, model, status: c.status, networkError: c.networkError, usage: usage || null, costUsd: costInfo.cost, costNote: costInfo.note, costSource: costInfo.source, elapsedMs: c.elapsedMs != null ? Math.round(c.elapsedMs) : null };
  });
  const totalCostUsd = calls.reduce((s, c) => s + (c.costUsd || 0), 0);

  console.log('\nphysical requests dispatched: ' + calls.length + ' / ' + PHYSICAL_REQUEST_CEILING);
  console.log(JSON.stringify(calls.map((c) => ({ model: c.model, status: c.status, costUsd: c.costUsd })), null, 2));
  console.log('\nREAL COST: $' + totalCostUsd.toFixed(6) + ' / ceiling $' + COMBINED_CEILING_USD.toFixed(2) + (totalCostUsd > COMBINED_CEILING_USD ? '  *** CEILING EXCEEDED — disclosed, not hidden ***' : ''));

  console.log('\nREPAIR OUTCOME: ' + (repairResult ? (repairResult.rejected ? 'REJECTED (still flagged or unusable — not shipped)' : 'ACCEPTED') : 'NULL (harness/tier failure)'));
  if (repairResult) {
    console.log('  provider/model: ' + repairResult.provider + '/' + repairResult.model);
    console.log('  appliedCount: ' + repairResult.appliedCount + '  droppedOffTarget: ' + JSON.stringify(repairResult.droppedOffTarget || []));
    if (repairResult.validation) console.log('  post-repair validation: ' + JSON.stringify(repairResult.validation));
  }

  const report = {
    at: new Date().toISOString(),
    baselineFile: BASELINE_PATH,
    preRepairDetector: detectorResult,
    calls,
    totalCostUsd,
    ceilingUsd: COMBINED_CEILING_USD,
    ceilingHeld: totalCostUsd <= COMBINED_CEILING_USD,
    outcome: repairResult ? (repairResult.rejected ? 'rejected' : 'accepted') : 'null',
    repairResult: repairResult ? { rejected: repairResult.rejected, provider: repairResult.provider, model: repairResult.model, appliedCount: repairResult.appliedCount, droppedOffTarget: repairResult.droppedOffTarget, validation: repairResult.validation, usage: repairResult.usage } : null,
    persistedLogFile: LOG_FILE,
  };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'console_tail.txt'), consoleLines.slice(-300).join('\n'));
  if (repairResult && !repairResult.rejected && repairResult.repaired) {
    fs.writeFileSync(path.join(OUT_DIR, 'scene2_repaired.json'), JSON.stringify(repairResult.repaired, null, 2));
    console.log('\n✓ repaired screenplay written to ' + path.join(OUT_DIR, 'scene2_repaired.json') + ' (baseline scene2_raw_response.txt left untouched)');
  }

  if (gate.hasUnsettled()) {
    const pending = gate.trackedCalls().find((c) => c.status == null && c.networkError == null);
    if (pending) await gate.waitForSettlement(pending.roleTag, { watchdogMs: 15000 });
  }
  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('SCENE 2 LI-PRESENCE REPAIR — done. Outcome: ' + report.outcome + '. Cost: $' + totalCostUsd.toFixed(6));
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
