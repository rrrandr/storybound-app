// CANON AUDIT CALIBRATION — CLI. Refuses unless given the exact authorization phrase.
//
// Auditor-only: no scene generation, no author, no story mutation. It calls the REAL production
// prompt builder and validator against eight retained fixtures and scores the result.
//
//   node _canon_audit_calibration_run.mjs                  → refuses, prints the plan
//   node _canon_audit_calibration_run.mjs --authorize "<phrase>"

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import {
  loadFixtures, makeLedger, installCalibrationRoute, scoreFixture, verdictSummary,
  CEILING_USD, INFRA_STOP_AFTER, RATE_LIMIT_STOP_AFTER, candidate, DEFAULT_MODEL, CANDIDATES
} from './_canon_audit_calibration_core.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// ONE MODEL PER RUN, PINNED. --model selects the candidate; there is no chain and no fallback,
// so a result can only ever describe the model named here.
const mIdx = process.argv.indexOf('--model');
const MODEL = mIdx !== -1 ? String(process.argv[mIdx + 1] || '') : DEFAULT_MODEL;
if (!CANDIDATES[MODEL]) { console.error('REFUSING — unknown/unpriced model: ' + MODEL + '. Known: ' + Object.keys(CANDIDATES).join(', ')); process.exit(5); }
const CAND = candidate(MODEL);
const PRIMARY_MODEL = CAND.model, PRIMARY_ENDPOINT = CAND.endpoint, PER_CALL_USD = CAND.perCallUsd;
// PER-CANDIDATE CEILING AND AUTHORIZATION PHRASE. The reasoning candidate costs more per call
// (reasoning tokens bill as output and are invisible in Mistral's usage object, so they can only
// be bounded by max_tokens) and carries its own $0.02 ceiling. The phrase names the ceiling it
// authorizes, so an authorization for the $0.01 runs cannot silently release a $0.02 one.
const RUN_CEILING = CAND.ceilingUsd;
// PROMPT VERSION, PINNED PER RUN (Roman 2026-09-24). The retained runs of ministral-8b-2512 and
// gpt-4o-mini were both measured against v1. Re-running an ALREADY-REJECTED model against v2 with
// the prompt as the single changed variable is the controlled test of whether the prompt caused
// the 0/4 green scores — and it buys no new model. --prompt-version 1 reproduces the original arm.
// CANARY MODE (Roman 2026-09-24). After the provider refused all eight with HTTP 429, the question
// is no longer only "is this model suitable" but "can this account reach it at all". --canary
// dispatches EXACTLY ONE retained fixture as a probe. If it is refused again the run stops on the
// spot and the candidate is classified UNAVAILABLE UNDER THE CURRENT ACCOUNT/QUOTA — not rejected
// on merit, and not retried. If it succeeds, its result is PRESERVED as fixture 1 and the
// remaining seven continue in the same process with deliberate pacing, so the canary is never
// paid for twice. One ceiling covers the whole thing.
const CANARY = process.argv.includes('--canary');
const paceIdx = process.argv.indexOf('--pace-ms');
const PACE_MS = paceIdx !== -1 ? Math.max(0, Number(process.argv[paceIdx + 1]) || 0) : (CANARY ? 9000 : 0);
const pIdx = process.argv.indexOf('--prompt-version');
const PROMPT_V = pIdx !== -1 ? Number(process.argv[pIdx + 1]) : 2;
if (PROMPT_V !== 1 && PROMPT_V !== 2) { console.error('REFUSING — --prompt-version must be 1 or 2'); process.exit(6); }
// The phrase NAMES THE CEILING IT AUTHORIZES, so an authorization for a cheap run can never
// release an expensive one. A new candidate with a new ceiling gets a new phrase, by construction.
const AUTH_PHRASE = RUN_CEILING === 0.11
  ? 'run the haiku canon auditor calibration once under $0.11'
  : RUN_CEILING === 0.16
  ? 'run the grok-4.7 canon auditor calibration once under $0.16'
  : RUN_CEILING === 0.08
  ? 'run the grok-4.3 canon auditor calibration once under $0.08'
  : RUN_CEILING === 0.02
  ? 'run the reasoning-mistral canon auditor calibration once under $0.02'
  : 'run the canon auditor calibration once under $0.01';
const argv = process.argv.slice(2);
const i = argv.indexOf('--authorize');
const given = i !== -1 ? String(argv[i + 1] || '') : null;
const { fixtures } = loadFixtures();

if (given !== AUTH_PHRASE) {
  console.log('CANON AUDITOR CALIBRATION — NOT AUTHORIZED, NOTHING DISPATCHED.\n');
  if (CANARY) {
    console.log('  MODE         : CANARY — dispatches fixture 1 ONLY as an access probe.');
    console.log('                 refused again (429/1300) -> STOP, classify UNAVAILABLE under this');
    console.log('                 account/quota, do not retry. Succeeds -> preserve it as fixture 1');
    console.log('                 and continue the remaining seven at ' + PACE_MS + 'ms pacing, never repeating it.');
  }
  console.log('  prompt arm   : v' + PROMPT_V + (PROMPT_V === 1 ? '   (the arm both rejected models were measured against)' : '   (silence-is-permission + qualified categories + surviving-evidence facts)'));
  console.log('  measures     : ' + PRIMARY_MODEL + ' ONLY, via ' + PRIMARY_ENDPOINT
    + (CAND.reasoningEffort ? '   reasoning_effort="' + CAND.reasoningEffort + '" (explicit, enforced pre-dispatch)' : ''));
  if (CAND.thinkingBudgetTokens) console.log('  thinking     : EXTENDED, budget ' + CAND.thinkingBudgetTokens + ' tokens (explicit, enforced pre-dispatch)');
  if (CAND.sbModelOverride) console.log('  resolver     : _sbModelOverride="' + CAND.sbModelOverride + '" — without it api/proxy.js serves grok-4.3');
  console.log('  max_tokens   : ' + CAND.maxTokens
    + (CAND.reasoningEffort ? '   (thinking bills as OUTPUT and Mistral reports no reasoning_tokens; max_tokens is the only bound)' : ''));
  console.log('  fixtures     : ' + fixtures.length + ' (' + fixtures.filter((f) => f.expect === 'violation').length
    + ' red, ' + fixtures.filter((f) => f.expect === 'pass').length + ' green), all retained');
  fixtures.forEach((f) => console.log('     ' + (f.expect === 'violation' ? 'RED  ' : 'GREEN') + '  ' + f.id));
  console.log('  dispatches   : ' + fixtures.length + ', one per fixture, NO tier cascade');
  console.log('  expected     : $' + (fixtures.length * PER_CALL_USD).toFixed(6) + '   ceiling: $' + RUN_CEILING.toFixed(6));
  console.log('  mutation     : none — no scene generation, no author, no story write');
  console.log('\n  WHY PRIMARY-ONLY: a cascade would measure grok-4-1-fast-reasoning and report it as');
  console.log('  Mistral. It would also cost $0.050440 across all eight, above the ~$0.03 estimate.');
  console.log('\n  PASS GATE: 4 SUBSTANTIVELY SUPPORTED red catches (appropriate category AND a cited');
  console.log('  fact that genuinely supports it), 4 clean green passes, zero irrelevant citations,');
  console.log('  and ZERO undecided,');
  console.log('  unavailable or invalid responses — every fixture must produce a usable answer.');
  console.log('  In production a cannot_decide, an invalid reply and a transport failure all BLOCK');
  console.log('  a legitimate scene, so none of them may count as success.');
  console.log('  A VALID but incorrect "pass" on a red is the critical failure — no fallback fires.');
  console.log('\n  To run, pass exactly:  --authorize "' + AUTH_PHRASE + '"');
  process.exit(3);
}

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const OUT_DIR = path.join(__dirname, '_tempt_fate_fixtures', 'canon_calibration_' + RUN_ID);
if (fs.existsSync(OUT_DIR)) { console.error('REFUSING — output directory exists: ' + OUT_DIR); process.exit(4); }
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  console.log('=== CANON AUDITOR CALIBRATION — AUTHORIZED ===');
  const { durable } = loadFixtures();
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  gate.allowRealPaths([PRIMARY_ENDPOINT]);
  const ledger = makeLedger(RUN_CEILING, PER_CALL_USD);
  const holder = { ledger, log: [], currentFixture: null, candidate: CAND };
  await installCalibrationRoute(page, holder);
  // RATE-LIMIT HEADERS. The proxy deliberately forwards retry-after / x-ratelimit-* on a provider
  // refusal, but _tieredProviderDispatch reads only the body and the network gate records only
  // status + body — so the failed run captured NO reset or limit information at all. This listener
  // is runner-side only (no production change) and preserves them, so a repeat refusal can say
  // WHEN the window resets instead of merely that it was refused.
  const rlHeaders = [];
  page.on('response', (resp) => {
    try {
      if (resp.url().indexOf(PRIMARY_ENDPOINT) === -1) return;
      const h = resp.headers() || {};
      const keep = {};
      Object.keys(h).forEach((k) => {
        if (/^(retry-after|x-ratelimit-|ratelimit-)/i.test(k)) keep[k] = h[k];
      });
      rlHeaders.push({ fixture: holder.currentFixture, status: resp.status(),
        rateLimitHeaders: keep, sawAny: Object.keys(keep).length > 0 });
    } catch (_) {}
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && window._buildCanonPacket && window._buildCanonAuditPrompt
    && window._validateCanonAuditResponse && window._callTieredProvider, { timeout: 30000 });

  const rows = [];
  // FAIL-FAST on the local function layer. The first fixture is the provider-path health check;
  // once two consecutive requests come back 502/NO_RESPONSE_FROM_FUNCTION with no provider usage,
  // every remaining fixture would do the same. Stop and mark the run infrastructure-inconclusive.
  let consecutiveInfra = 0, consecutiveRateLimit = 0, stopped = false, stopReason = null;
  gate.setPhase('canon-calibration', fixtures.length);
  for (const fx of fixtures) {
    if (stopped) {
      const score = scoreFixture(fx, null, null, { skipped: true, stopReason: stopReason });
      rows.push({ id: fx.id, expect: fx.expect, why: fx.why, latencyMs: 0, score, skipped: true });
      console.log('  ' + (fx.expect === 'violation' ? 'RED  ' : 'GREEN') + ' ' + fx.id.padEnd(30) + ' → skipped (run stopped)');
      continue;
    }
    holder.currentFixture = fx.id;
    // DELIBERATE PACING between fixtures (never before the first). A burst is what a per-minute
    // limit punishes, and nothing here is latency-sensitive.
    if (PACE_MS > 0 && rows.length > 0) {
      await new Promise((r) => setTimeout(r, PACE_MS));
    }
    const t0 = Date.now();
    const r = await page.evaluate(async (a) => {
      const s = window.state;
      s.storyId = 'calib-' + Date.now();
      s._starterId = 'starter_first_sacrifice';
      const d = JSON.parse(JSON.stringify(a.durable));
      // A fixture may supply its OWN whole consequence rather than mutating the default one.
      s._temptFateDurableConsequences = [a.fx.durableOverride ? JSON.parse(JSON.stringify(a.fx.durableOverride)) : d];
      // Pin the prompt arm for this whole run, so a result can only describe one version.
      window._canonAuditPromptVersion = a.promptVersion;
      const packet = window._buildCanonPacket(s, { proposal: a.fx.plan });
      const prompt = window._buildCanonAuditPrompt(a.fx.plan, packet);
      let raw = null, error = null, content = null, meta = null;
      try {
        // PRIMARY TIER ONLY — an explicit single-tier list, so a transport failure cannot cascade
        // to another model and be reported as this one. reasoning_effort rides on the TIER, which
        // is where a per-model reasoning setting belongs; omitting it sends no effort key at all.
        const tier = { tier: 'primary', provider: a.provider, model: a.model };
        if (a.reasoningEffort) tier.reasoning_effort = a.reasoningEffort;
        // Pins that must survive a provider-side resolver or default.
        if (a.sbModelOverride) tier.sbModelOverride = a.sbModelOverride;
        if (a.thinkingBudgetTokens) tier.thinking_budget_tokens = a.thinkingBudgetTokens;
        const res = await window._callTieredProvider('canonAuditCalibration', [
          { role: 'system', content: prompt.sys }, { role: 'user', content: prompt.usr }
        ], { max_tokens: a.maxTokens, temperature: 0, tiers: [tier] });
        content = res && res.content;
        // PRESERVE THE PROVIDER'S OWN METADATA, not our intent: the model it says it served, the
        // reasoning effort it says it applied, the usage it reports, and the thinking trace when
        // one is returned. Our request said what we asked for; only this says what we got.
        meta = {
          servedModel: (res && res._orchestration && res._orchestration.model) || null,
          thinkingEnabled: (res && res._orchestration && res._orchestration.thinking_enabled) || false,
          thinkingBudget: (res && res._orchestration && res._orchestration.thinking_budget_tokens) || 0,
          reasoningEffortReported: (res && res.reasoningEffort) || null,
          usage: (res && res.usage) || null,
          thinking: (res && res.thinking) || null,
          thinkingChars: (res && res.thinking) ? String(res.thinking).length : 0,
          orchestration: (res && res._orchestration) || null,
          attemptLog: (res && res.attemptLog) || null
        };
        try { raw = JSON.parse(content); }
        catch (e) {
          const m = String(content || '').replace(/^\s*```(?:json)?/i, '').match(/\{[\s\S]*\}/);
          if (!m) throw new Error('reply was not JSON');
          raw = JSON.parse(m[0]);
        }
      } catch (e) { error = (e && e.message) || String(e); }
      const validated = raw ? window._validateCanonAuditResponse(raw, packet, a.fx.plan) : null;
      return { packetIds: packet.ids, packetTruncated: packet.truncated,
        promptVersionActive: window._canonAuditPromptVersionActive(), prompt, content, raw, validated, error, meta };
    }, { fx, durable, model: PRIMARY_MODEL, provider: CAND.provider, promptVersion: PROMPT_V,
         reasoningEffort: CAND.reasoningEffort, maxTokens: CAND.maxTokens,
         sbModelOverride: CAND.sbModelOverride, thinkingBudgetTokens: CAND.thinkingBudgetTokens });
    const latencyMs = Date.now() - t0;
    const score = scoreFixture(fx, r.validated || { valid: false, errors: ['no response'] }, r.error);
    // REALIZED COST FROM THE PROVIDER'S OWN USAGE, per fixture — never from the reservation. On a
    // reasoning model the completion count silently INCLUDES thinking tokens (Mistral publishes no
    // reasoning_tokens field on chat completions), so this is the only honest cost figure.
    const _u = (r.meta && r.meta.usage) || null;
    // REASONING TOKENS ARE BILLED OUTPUT AND ARE NOT ALWAYS INSIDE completion_tokens.
    // On xAI: total_tokens - prompt_tokens - completion_tokens == completion_tokens_details
    // .reasoning_tokens exactly, i.e. completion_tokens EXCLUDES thinking. Charging only
    // completion_tokens understated this run's cost by ~43% (4,041 reasoning tokens ignored).
    // And when the provider reports its OWN cost, that beats any arithmetic of mine.
    // Anthropic reports input_tokens/output_tokens; output INCLUDES thinking tokens already.
    const _inTok = (_u && (_u.prompt_tokens != null ? _u.prompt_tokens : _u.input_tokens)) || 0;
    const _rt = ((_u && _u.completion_tokens_details && _u.completion_tokens_details.reasoning_tokens) || 0);
    const _outTok = ((_u && (_u.completion_tokens != null ? _u.completion_tokens : _u.output_tokens)) || 0)
      + ((_u && _u.total_tokens && (_u.total_tokens - (_u.prompt_tokens || 0) - (_u.completion_tokens || 0)) === _rt) ? _rt : 0);
    const _thinkChars = (r.meta && r.meta.thinkingChars) || 0;
    const _providerUsd = (_u && typeof _u.cost_in_usd_ticks === 'number') ? _u.cost_in_usd_ticks * 1e-10 : null;
    const realizedUsd = _providerUsd != null ? _providerUsd
      : (_u ? (CAND.rate.in * _inTok + CAND.rate.out * _outTok) : null);
    // The EXACT outgoing body for this fixture, as captured at the route before dispatch.
    const requestBody = (holder.log.filter((e) => e.kind === 'request-body' && e.fixture === fx.id).pop() || {}).body || null;
    rows.push({ id: fx.id, expect: fx.expect, why: fx.why, latencyMs, score,
      verdict: r.validated && r.validated.verdict, citations: (r.validated && r.validated.violations || []).map((v) => v.citedFactIds),
      violations: (r.validated && r.validated.violations) || [], validationErrors: (r.validated && r.validated.errors) || [],
      error: r.error, packetTruncated: r.packetTruncated,
      servedModel: r.meta && r.meta.servedModel, reasoningEffortReported: r.meta && r.meta.reasoningEffortReported,
      usage: _u, realizedUsd, realizedFrom: _providerUsd != null ? 'provider' : 'computed',
      reasoningTokens: _rt, billedOutputTokens: _outTok,
      thinkingChars: (r.meta && r.meta.thinkingChars) || 0,
      requestModel: requestBody && requestBody.model,
      requestReasoningEffort: requestBody ? (requestBody.reasoning_effort == null ? null : String(requestBody.reasoning_effort)) : null });
    fs.writeFileSync(path.join(OUT_DIR, fx.id + '.json'),
      JSON.stringify({ fixture: fx, requestBody, result: r, score, latencyMs, realizedUsd }, null, 2));
    console.log('  ' + (fx.expect === 'violation' ? 'RED  ' : 'GREEN') + ' ' + fx.id.padEnd(30)
      + ' → ' + String(score.outcome).padEnd(16) + (r.validated && r.validated.verdict ? ('verdict=' + r.validated.verdict) : ('error=' + r.error))
      + '  ' + latencyMs + 'ms');
    if (score.infra) {
      consecutiveInfra++;
      if (consecutiveInfra >= INFRA_STOP_AFTER) {
        stopped = true;
        stopReason = INFRA_STOP_AFTER + ' consecutive LOCAL function-layer failures (502 / NO_RESPONSE_FROM_FUNCTION)';
        console.log('\n  STOPPING — ' + INFRA_STOP_AFTER + ' consecutive local function-layer failures '
          + '(502 / NO_RESPONSE_FROM_FUNCTION, no provider usage). Remaining fixtures are NOT dispatched;\n'
          + '  this run is INFRASTRUCTURE-INCONCLUSIVE and says nothing about the model.\n');
      }
    } else { consecutiveInfra = 0; }
    // PROVIDER RATE LIMIT — stop for the same reason, with a different diagnosis. The first
    // reasoning-Mistral attempt sent all eight into a 429 wall because the infra rule only
    // recognised 502. A 429 is refused BEFORE generation, so nothing is billed; the point of
    // stopping is that the remaining requests cannot possibly produce data.
    if (score.rateLimited) {
      consecutiveRateLimit++;
      if (consecutiveRateLimit >= RATE_LIMIT_STOP_AFTER) {
        stopped = true;
        stopReason = RATE_LIMIT_STOP_AFTER + ' consecutive PROVIDER rate-limit refusals (HTTP 429) — the local function layer worked and relayed them';
        console.log('\n  STOPPING — ' + RATE_LIMIT_STOP_AFTER + ' consecutive PROVIDER rate-limit refusals '
          + '(HTTP 429). Remaining fixtures are NOT dispatched.\n'
          + '  This run is PROVIDER-INCONCLUSIVE: it says nothing about the model, and nothing was\n'
          + '  billed — a 429 is refused before generation. It is time-dependent; a later run may work.\n');
      }
    } else { consecutiveRateLimit = 0; }
    // CANARY GATE — after the FIRST fixture only.
    if (CANARY && rows.length === 1) {
      if (score.rateLimited) {
        stopped = true;
        stopReason = 'the CANARY probe was refused by the PROVIDER (HTTP 429) — the local function layer worked and relayed it';
        console.log('\n  CANARY REFUSED — the single probe came back 429 rate_limited again.');
        console.log('  STOPPING IMMEDIATELY. No retry. ' + PRIMARY_MODEL + ' + reasoning_effort='
          + (CAND.reasoningEffort || 'n/a') + ' is classified');
        console.log('  UNAVAILABLE UNDER THE CURRENT MISTRAL ACCOUNT/QUOTA — an operational verdict,');
        console.log('  NOT a judgement of the model\'s canon-auditing ability, which remains untested.\n');
      } else if (score.outcome === 'unavailable') {
        stopped = true;
        stopReason = 'the CANARY probe failed for a non-rate-limit reason';
        console.log('\n  CANARY FAILED for a non-rate-limit reason — stopping rather than spending seven more.\n');
      } else {
        console.log('\n  CANARY SUCCEEDED — preserved as fixture 1, NOT re-dispatched. Continuing the');
        console.log('  remaining ' + (fixtures.length - 1) + ' fixtures at ' + PACE_MS + 'ms pacing.\n');
      }
    }
  }
  gate.closePhase();

  const summary = verdictSummary(rows, CANARY ? { rateLimitStopAfter: 1 } : {});
  const realizedTotal = rows.reduce((t, r) => t + (r.realizedUsd || 0), 0);
  const tokIn = rows.reduce((t, r) => t + ((r.usage && (r.usage.prompt_tokens != null ? r.usage.prompt_tokens : r.usage.input_tokens)) || 0), 0);
  const tokOut = rows.reduce((t, r) => t + ((r.usage && (r.usage.completion_tokens != null ? r.usage.completion_tokens : r.usage.output_tokens)) || 0), 0);
  // MODEL IDENTITY IS ASSERTED, NOT ASSUMED. If any fixture was served by something other than the
  // pinned model, or (for a reasoning candidate) the proxy reports an effort other than the one
  // requested, the run does not describe the candidate it claims to and must not be scored as it.
  // A response only counts as SERVED if the provider actually returned usage or a model name.
  // Without this, zero served responses made both filters empty and the report cheerfully claimed
  // "every served response was <model> at reasoning_effort=high" for a run in which the provider
  // refused all eight. An identity claim over an empty set is not clean; it is unverifiable.
  const served = rows.filter((r) => r.usage || r.servedModel);
  const wrongModel = rows.filter((r) => r.servedModel && r.servedModel !== PRIMARY_MODEL);
  // EFFORT CAN ONLY BE CHECKED WHERE THE PROVIDER ECHOES IT. /api/mistral-proxy returns
  // _orchestration.reasoning_effort; /api/proxy (xAI) returns role/model/timestamp and NO effort
  // field. This filter assumed a universal echo, so the grok run reported "MISMATCH ... does NOT
  // describe grok-4.3 in reasoning mode" on all eight — a false alarm about my own reporting, while
  // usage.completion_tokens_details.reasoning_tokens showed 793 per fixture and reasoning plainly
  // HAD run. A missing echo is unknown, never a mismatch.
  const effortEchoed = rows.filter((r) => r.reasoningEffortReported != null);
  const wrongEffort = CAND.reasoningEffort
    ? effortEchoed.filter((r) => String(r.reasoningEffortReported) !== String(CAND.reasoningEffort))
    : [];
  // Independent corroboration that reasoning ran, for providers that do not echo the setting.
  const reasoningObserved = rows.filter((r) => (r.reasoningTokens || 0) > 0 || (r.thinkingChars || 0) > 0);
  const report = { runId: RUN_ID, model: PRIMARY_MODEL, promptVersion: PROMPT_V,
    reasoningEffort: CAND.reasoningEffort || null,
    maxTokens: CAND.maxTokens, dispatches: gate.trackedCalls().length,
    reservedUsd: ledger.totalUsd, realizedUsd: realizedTotal, tokensIn: tokIn, tokensOut: tokOut,
    ceilingUsd: RUN_CEILING, reservations: ledger.entries, routeLog: holder.log,
    servedResponses: served.length, effortEchoedCount: effortEchoed.length,
    reasoningObservedCount: reasoningObserved.length,
    reasoningTokensTotal: rows.reduce((t, r) => t + (r.reasoningTokens || 0), 0),
    modelIdentityClean: served.length > 0 && wrongModel.length === 0 && wrongEffort.length === 0,
    modelIdentityCheckable: served.length > 0,
    wrongModelIds: wrongModel.map((r) => r.id), wrongEffortIds: wrongEffort.map((r) => r.id),
    canary: CANARY, paceMs: PACE_MS, rateLimitHeaders: rlHeaders, rows, summary };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(90));
  console.log('  reds caught        : ' + summary.caught + '/' + summary.reds + (summary.missed ? ('   MISSED: ' + summary.missedIds.join(', ')) : ''));
  console.log('  unsupported find.  : ' + summary.unsupportedFindings + (summary.unsupportedFindings ? ('   ' + summary.unsupportedIds.join(', ')) : ''));
  console.log('  greens passed      : ' + summary.correctPass + '/' + summary.greens + (summary.falsePositives ? ('   FALSE POS: ' + summary.falsePositiveIds.join(', ')) : ''));
  console.log('  undecided (blocks) : ' + summary.undecided + (summary.undecided ? ('   ' + summary.undecidedIds.join(', ')) : ''));
  console.log('  unavailable        : ' + summary.unavailable + (summary.unavailable ? ('   ' + summary.unavailableIds.join(', ')) : ''));
  console.log('  invalid responses  : ' + summary.invalid + (summary.invalid ? ('   ' + summary.invalidIds.join(', ')) : ''));
  console.log('  usable responses   : ' + summary.usableResponses + '/' + summary.totalFixtures
    + '   (dispatched ' + summary.dispatchedFixtures + ', skipped ' + summary.skipped + ')');
  console.log('  dispatches         : ' + gate.trackedCalls().length + '   reserved $' + ledger.totalUsd.toFixed(6) + ' of $' + RUN_CEILING.toFixed(6));
  const rtTotal = rows.reduce((t, r) => t + (r.reasoningTokens || 0), 0);
  const fromProvider = rows.filter((r) => r.realizedFrom === 'provider').length;
  console.log('  REALIZED cost      : $' + realizedTotal.toFixed(6)
    + (fromProvider ? '   (' + fromProvider + '/' + rows.length + ' from the PROVIDER\'s own reported cost)' : '')
    + '   ' + tokIn + ' in / ' + tokOut + ' out' + (rtTotal ? (' + ' + rtTotal + ' reasoning (billed as output)') : '')
    + (CAND.reasoningEffort ? '  (completion INCLUDES thinking — Mistral reports no separate reasoning_tokens)' : ''));
  console.log('  model identity     : ' + (!report.modelIdentityCheckable
    ? 'NOT CHECKABLE — 0 of ' + rows.length + ' fixtures were served; there is nothing to verify'
    : (report.modelIdentityClean ? 'clean — all ' + report.servedResponses + ' served response(s) were ' + PRIMARY_MODEL
        + (CAND.reasoningEffort ? (report.effortEchoedCount
            ? ' at reasoning effort=' + CAND.reasoningEffort
            : ' (effort NOT echoed by this provider; reasoning corroborated on '
              + report.reasoningObservedCount + '/' + rows.length + ' fixtures by '
              + report.reasoningTokensTotal + ' reasoning tokens)') : '')
      : 'MISMATCH — wrongModel[' + report.wrongModelIds.join(',') + '] wrongEffort[' + report.wrongEffortIds.join(',') + ']')));
  if (report.modelIdentityCheckable && !report.modelIdentityClean) {
    console.log('    This run does NOT describe ' + PRIMARY_MODEL + (CAND.reasoningEffort ? ' in reasoning mode' : '') + '. Do not score it as such.');
  }
  if (summary.providerRateLimited) {
    console.log('\n  RESULT: PROVIDER-INCONCLUSIVE — the provider refused with HTTP 429 rate_limited on '
      + summary.rateLimited + ' fixture(s).');
    console.log('  This says NOTHING about the model. A 429 is refused BEFORE generation, so nothing');
    console.log('  was billed. It is time-dependent — the same run may succeed later.');
  }
  if (summary.infrastructureInconclusive) {
    console.log('\n  RESULT: INFRASTRUCTURE-INCONCLUSIVE — the local function layer failed; this says');
    console.log('  NOTHING about the model. ' + summary.skipped + ' fixture(s) were never dispatched.');
  }
  console.log('\n  ENABLE GENERALLY: ' + (summary.enableGenerally
    ? 'YES — 4/4 reds caught, 4/4 greens passed, no undecided, unavailable or invalid'
    : 'NO'));
  summary.blockers.forEach((b) => console.log('    BLOCKER — ' + b));
  if (summary.missed) console.log('  A missed red is a VALID incorrect pass: no fallback fires, and the plan reaches the author.');
  const sawHeaders = rlHeaders.filter((h) => h.sawAny);
  console.log('  rate-limit headers : ' + (sawHeaders.length
    ? JSON.stringify(sawHeaders[0].rateLimitHeaders)
    : 'NONE returned by the provider on any response — no reset or remaining was published'));
  if (CANARY && summary.providerRateLimited) {
    console.log('\n  OPERATIONAL VERDICT: ' + PRIMARY_MODEL + ' + reasoning_effort=' + CAND.reasoningEffort);
    console.log('  is UNAVAILABLE as a Storybound fallback under the current Mistral account/quota.');
    console.log('  It may still be intellectually suitable — that remains UNTESTED and unknowable');
    console.log('  until the project\'s model access or rate limit is changed.');
  }
  console.log('\n  Evidence: ' + OUT_DIR);
  await browser.close();
})().catch((e) => { console.error('RUN ERROR:', e && e.stack || e); process.exit(2); });
