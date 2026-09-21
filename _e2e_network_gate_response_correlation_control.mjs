// RESPONSE CORRELATION FIX — DRY CONTROL (Roman, 2026-09-21)
//
// Real incident: Scene 2 retry #15 dispatched a real author call (max_tokens: 8000) that both the
// app's own console log AND the raw persisted network-gate log prove settled with a genuine 200
// response and real content ($0.0847 billed) — yet `_scene2_repair_replay_sample.mjs`'s own
// in-memory tracking recorded it as `status: null, "no usage block returned"` and the script gave
// up believing the author call "never settled," undercounting real spend by ~$0.085 and never
// writing the captured scene to disk. Roman: "That must be fixed before more paid testing, because
// otherwise you can't trust the run summaries."
//
// Two independent fixes, both proven here:
//
//   FIX 1 (_e2e_network_gate.mjs) — the response/requestfailed handlers used to correlate a
//   settled response to its dispatch record by URL STRING alone (`r.url === url`), picking the
//   MOST RECENTLY dispatched still-unsettled record for that URL (a LIFO heuristic). When two or
//   more requests to the SAME url (e.g. the scene-spine planner and the Scene 2 author both use
//   /api/proxy) are in flight concurrently, this can misattribute a response to the wrong
//   dispatch. Fixed to match by Playwright's own REQUEST OBJECT IDENTITY
//   (`response.request() === the exact route.request() captured at dispatch time`) — unambiguous
//   regardless of dispatch/response ordering.
//
//   FIX 2 (_scene2_repair_replay_sample.mjs) — an independent, second line of defense: before ever
//   concluding "never settled," the script now re-reads its OWN persisted JSONL log (the one
//   guaranteed-complete record — every dispatch and response is appended the instant it is
//   observed) and reconciles dispatch/response pairs itself (FIFO within each url). If the
//   persisted log has a real settled record the in-memory view missed, that record — and its real
//   cost — is used instead of giving up.
//
// Proves, fully dry (no provider calls, no image calls, no story retry, no forks):
//   A — SYNTHETIC RACE: two concurrent real-lane requests to the SAME stubbed url, deliberately
//       resolved out of dispatch order (the FIRST-dispatched request's response arrives SECOND).
//       Confirms each settles with its OWN distinct content, never swapped — the general
//       correctness of FIX 1, reproduced deterministically rather than asserted.
//   B — REAL LOG RECONCILIATION: retry 15's REAL, persisted raw log (unmodified, read verbatim) is
//       fed through the same reconciliation logic FIX 2 added. Confirms it correctly identifies
//       the real author response (status 200), computes its real cost from the real usage block,
//       and that the combined total (planner + author) equals the corrected real figure
//       ($0.0955956) reported in _scene2_capability_retry15_report_2026_09_21.md — using the SAME
//       log the original incident produced, not a synthetic stand-in.
//
// usage: node _e2e_network_gate_response_correlation_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_e2e_network_gate_response_correlation_control_out');
fs.mkdirSync(OUT_DIR, { recursive: true });
const LOG_FILE = path.join(OUT_DIR, 'run.jsonl');
try { fs.unlinkSync(LOG_FILE); } catch (_) {}

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 500) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const ORIGIN = 'http://203.0.113.1'; // RFC 5737 TEST-NET-1 — reserved, guaranteed unreachable; stubbed, never actually dispatched

// ── Byte-identical copy of _scene2_repair_replay_sample.mjs's realCost/RATES/reconciliation logic
// (that script auto-executes a real, paid browser run on import — it must NEVER be imported from a
// dry control — so the pure helper logic is duplicated here, matching it exactly) ──
const RATES = {
  'grok-4-1-fast-reasoning': { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 },
  'grok-4.20-0309-non-reasoning': { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 },
  'grok-4-1-fast-non-reasoning': { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 },
  'mistral-small-latest': { in: 0.00000015, out: 0.0000006 },
  'ministral-8b-2512': { in: 0.00000015, out: 0.00000015 },
  'gpt-4o': { in: 0.0000025, out: 0.00001 },
  'gpt-4o-mini': { in: 0.00000015, out: 0.0000006 },
};
const TICK_TO_USD = 1e-10;
function realCost(model, usage) {
  if (!usage) return { cost: null, note: 'no usage block returned', source: null };
  if (typeof usage.cost_in_usd_ticks === 'number' && usage.cost_in_usd_ticks > 0) return { cost: usage.cost_in_usd_ticks * TICK_TO_USD, note: null, source: 'provider_ticks' };
  const rate = RATES[model];
  if (!rate) return { cost: null, note: 'no sourced price row for model="' + model + '"', source: null };
  const cacheRead = usage.cache_read_input_tokens || (usage.prompt_tokens_details && usage.prompt_tokens_details.cached_tokens) || 0;
  const freshIn = Math.max(0, (usage.prompt_tokens || 0) - cacheRead);
  const outTok = (usage.completion_tokens || 0) + ((usage.completion_tokens_details && usage.completion_tokens_details.reasoning_tokens) || 0);
  return { cost: freshIn * rate.in + cacheRead * (rate.cacheRead != null ? rate.cacheRead : rate.in) + outTok * rate.out, note: null, source: 'estimated' };
}
function reconcileFromPersistedLog(logFile, roleTag) {
  const events = fs.readFileSync(logFile, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const relevant = events.filter((e) => e.roleTag === roleTag && e.real === true && (e.kind === 'dispatch' || e.kind === 'response'));
  const pendingByUrl = {};
  const matched = [];
  relevant.forEach((e) => {
    if (e.kind === 'dispatch') (pendingByUrl[e.url] = pendingByUrl[e.url] || []).push({ dispatch: e, response: null });
    else if (e.kind === 'response') { const q = pendingByUrl[e.url] || []; const slot = q.find((s) => !s.response); if (slot) slot.response = e; }
  });
  Object.values(pendingByUrl).forEach((q) => q.forEach((s) => matched.push(s)));
  return matched.map(({ dispatch, response }) => {
    const body = dispatch.requestBody || {};
    const model = body.model || body.preferredModel || null;
    const usage = response && response.responseBody && response.responseBody.usage;
    const costInfo = model ? realCost(model, usage) : { cost: null, note: 'model not identified', source: null };
    return { url: dispatch.url, model, maxTokens: body.max_tokens != null ? body.max_tokens : null, isAuthorCall: body.max_tokens === 8000, status: response ? response.status : null, usage: usage || null, costUsd: costInfo.cost };
  });
}

const FIXTURE_HTML = `<!doctype html><html><body><script>
  window.__results = {};
  window.__runFetch = async function (key, url, tag) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'grok-4-1-fast-reasoning', tag: tag, messages: [{role:'system',content:'x'}] }) });
      const j = await r.json().catch(function () { return null; });
      window.__results[key] = { ok: true, status: r.status, json: j };
    } catch (e) {
      window.__results[key] = { ok: false, error: String(e && e.message) };
    }
  };
</script></body></html>`;

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext()).newPage();

  section('A — SYNTHETIC RACE: two concurrent same-URL requests, responses resolved OUT OF ORDER');

  const gate = await installFailClosedNetworkGate(page, { logFile: LOG_FILE });
  let firstStubCalls = 0, secondStubCalls = 0;
  gate.stub('/api/proxy', async (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.tag === 'first') {
      firstStubCalls++;
      // FIRST-dispatched request resolves LAST (500ms) — the exact "out-of-order" shape.
      await new Promise((r) => setTimeout(r, 500));
      return { choices: [{ message: { content: 'FIRST content' } }], usage: { prompt_tokens: 111, completion_tokens: 11, cost_in_usd_ticks: 1110000 } };
    }
    secondStubCalls++;
    // SECOND-dispatched request resolves FIRST (50ms).
    await new Promise((r) => setTimeout(r, 50));
    return { choices: [{ message: { content: 'SECOND content' } }], usage: { prompt_tokens: 222, completion_tokens: 22, cost_in_usd_ticks: 2220000 } };
  });
  await page.setContent(FIXTURE_HTML);
  gate.setPhase('race-test', 2);

  const p1 = page.evaluate(({ origin }) => window.__runFetch('first', origin + '/api/proxy', 'first'), { origin: ORIGIN });
  // Dispatch the SECOND request shortly after the first, while the first is still pending — the
  // real shape of the incident (two /api/proxy calls in flight at once).
  await new Promise((r) => setTimeout(r, 20));
  const p2 = page.evaluate(({ origin }) => window.__runFetch('second', origin + '/api/proxy', 'second'), { origin: ORIGIN });
  await Promise.all([p1, p2]);
  await gate.waitForSettlement('race-test', { watchdogMs: 5000, quietMs: 500 });

  const raceCalls = gate.trackedCalls('race-test');
  ok('both requests were dispatched and tracked', raceCalls.length === 2, JSON.stringify(raceCalls.map((c) => c.requestBody && c.requestBody.tag)));
  const firstRec = raceCalls.find((c) => c.requestBody && c.requestBody.tag === 'first');
  const secondRec = raceCalls.find((c) => c.requestBody && c.requestBody.tag === 'second');
  ok('the FIRST-dispatched request settled with ITS OWN content, despite resolving second', firstRec && firstRec.responseBody && firstRec.responseBody.choices[0].message.content === 'FIRST content', JSON.stringify(firstRec && firstRec.responseBody));
  ok('the SECOND-dispatched request settled with ITS OWN content, despite resolving first', secondRec && secondRec.responseBody && secondRec.responseBody.choices[0].message.content === 'SECOND content', JSON.stringify(secondRec && secondRec.responseBody));
  ok('neither response was swapped onto the other dispatch (distinct usage blocks)', firstRec && secondRec && firstRec.responseBody.usage.prompt_tokens === 111 && secondRec.responseBody.usage.prompt_tokens === 222, JSON.stringify([firstRec && firstRec.responseBody.usage, secondRec && secondRec.responseBody.usage]));

  await browser.close();

  section('B — REAL LOG RECONCILIATION: retry 15\'s actual persisted log, read verbatim');

  const RETRY15_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789975467864.jsonl');
  if (!fs.existsSync(RETRY15_LOG)) { console.error('HARNESS BLOCKER: retry 15\'s real log not found at ' + RETRY15_LOG); process.exit(2); }
  const reconciled = reconcileFromPersistedLog(RETRY15_LOG, 'scene2-structural-author');
  const reconciledAuthor = reconciled.find((c) => c.isAuthorCall);
  ok('the author dispatch (max_tokens: 8000) is present in the reconciled records', !!reconciledAuthor, JSON.stringify(reconciled.map((c) => ({ maxTokens: c.maxTokens, status: c.status }))));
  ok('reconciliation correctly finds it SETTLED with status 200 (the real, live incident showed status: null here)', reconciledAuthor && reconciledAuthor.status === 200, JSON.stringify(reconciledAuthor));
  ok('reconciliation recovers its real usage block (prompt_tokens: 54721, matching the app\'s own console log)', reconciledAuthor && reconciledAuthor.usage && reconciledAuthor.usage.prompt_tokens === 54721, JSON.stringify(reconciledAuthor && reconciledAuthor.usage));
  ok('reconciliation computes the real author cost as ~$0.0847 (provider ticks)', reconciledAuthor && Math.abs(reconciledAuthor.costUsd - 0.08472715) < 0.0000001, reconciledAuthor && reconciledAuthor.costUsd);

  const plannerRec = reconciled.find((c) => c.maxTokens === 1200);
  const totalCost = reconciled.reduce((s, c) => s + (c.costUsd || 0), 0);
  ok('the planner call is also correctly reconciled (status 200, real cost)', plannerRec && plannerRec.status === 200 && Math.abs(plannerRec.costUsd - 0.0108684) < 0.0000001, JSON.stringify(plannerRec));
  ok('all 4 real calls this run are reconciled (planner, author, and 2 more real post-processing calls the in-memory view also missed)', reconciled.length === 4, JSON.stringify(reconciled.map((c) => ({ maxTokens: c.maxTokens, url: c.url, status: c.status }))));
  // The FIRST correction of retry 15's report used only planner+author ($0.0955956) — this
  // reconciliation tool itself caught that TWO MORE real calls (a $0.0006 ministral call and a
  // $0.0399 gpt-4o call) were ALSO real, billed, and missed by the same in-memory gap. The true
  // total is $0.13614335 — the retry 15 report and authorization sheet were corrected a second
  // time to this figure specifically because this control exposed the gap, not asserted from it.
  ok('the combined reconciled total matches the FULLY corrected real figure ($0.13614335)', Math.abs(totalCost - 0.13614335) < 0.000001, 'totalCost=' + totalCost);

  console.log('\n' + '='.repeat(100));
  console.log('RESPONSE CORRELATION FIX CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
