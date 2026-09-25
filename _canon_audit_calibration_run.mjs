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
  CEILING_USD, INFRA_STOP_AFTER, candidate, DEFAULT_MODEL, CANDIDATES
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
const pIdx = process.argv.indexOf('--prompt-version');
const PROMPT_V = pIdx !== -1 ? Number(process.argv[pIdx + 1]) : 2;
if (PROMPT_V !== 1 && PROMPT_V !== 2) { console.error('REFUSING — --prompt-version must be 1 or 2'); process.exit(6); }
const AUTH_PHRASE = RUN_CEILING === 0.02
  ? 'run the reasoning-mistral canon auditor calibration once under $0.02'
  : 'run the canon auditor calibration once under $0.01';
const argv = process.argv.slice(2);
const i = argv.indexOf('--authorize');
const given = i !== -1 ? String(argv[i + 1] || '') : null;
const { fixtures } = loadFixtures();

if (given !== AUTH_PHRASE) {
  console.log('CANON AUDITOR CALIBRATION — NOT AUTHORIZED, NOTHING DISPATCHED.\n');
  console.log('  prompt arm   : v' + PROMPT_V + (PROMPT_V === 1 ? '   (the arm both rejected models were measured against)' : '   (silence-is-permission + qualified categories + surviving-evidence facts)'));
  console.log('  measures     : ' + PRIMARY_MODEL + ' ONLY, via ' + PRIMARY_ENDPOINT
    + (CAND.reasoningEffort ? '   reasoning_effort="' + CAND.reasoningEffort + '" (explicit, enforced pre-dispatch)' : ''));
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

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && window._buildCanonPacket && window._buildCanonAuditPrompt
    && window._validateCanonAuditResponse && window._callTieredProvider, { timeout: 30000 });

  const rows = [];
  // FAIL-FAST on the local function layer. The first fixture is the provider-path health check;
  // once two consecutive requests come back 502/NO_RESPONSE_FROM_FUNCTION with no provider usage,
  // every remaining fixture would do the same. Stop and mark the run infrastructure-inconclusive.
  let consecutiveInfra = 0, stopped = false;
  gate.setPhase('canon-calibration', fixtures.length);
  for (const fx of fixtures) {
    if (stopped) {
      const score = scoreFixture(fx, null, null, { skipped: true });
      rows.push({ id: fx.id, expect: fx.expect, why: fx.why, latencyMs: 0, score, skipped: true });
      console.log('  ' + (fx.expect === 'violation' ? 'RED  ' : 'GREEN') + ' ' + fx.id.padEnd(30) + ' → skipped (run stopped)');
      continue;
    }
    holder.currentFixture = fx.id;
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
        const res = await window._callTieredProvider('canonAuditCalibration', [
          { role: 'system', content: prompt.sys }, { role: 'user', content: prompt.usr }
        ], { max_tokens: a.maxTokens, temperature: 0, tiers: [tier] });
        content = res && res.content;
        // PRESERVE THE PROVIDER'S OWN METADATA, not our intent: the model it says it served, the
        // reasoning effort it says it applied, the usage it reports, and the thinking trace when
        // one is returned. Our request said what we asked for; only this says what we got.
        meta = {
          servedModel: (res && res._orchestration && res._orchestration.model) || null,
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
         reasoningEffort: CAND.reasoningEffort, maxTokens: CAND.maxTokens });
    const latencyMs = Date.now() - t0;
    const score = scoreFixture(fx, r.validated || { valid: false, errors: ['no response'] }, r.error);
    // REALIZED COST FROM THE PROVIDER'S OWN USAGE, per fixture — never from the reservation. On a
    // reasoning model the completion count silently INCLUDES thinking tokens (Mistral publishes no
    // reasoning_tokens field on chat completions), so this is the only honest cost figure.
    const _u = (r.meta && r.meta.usage) || null;
    const realizedUsd = _u ? (CAND.rate.in * (_u.prompt_tokens || 0) + CAND.rate.out * (_u.completion_tokens || 0)) : null;
    // The EXACT outgoing body for this fixture, as captured at the route before dispatch.
    const requestBody = (holder.log.filter((e) => e.kind === 'request-body' && e.fixture === fx.id).pop() || {}).body || null;
    rows.push({ id: fx.id, expect: fx.expect, why: fx.why, latencyMs, score,
      verdict: r.validated && r.validated.verdict, citations: (r.validated && r.validated.violations || []).map((v) => v.citedFactIds),
      violations: (r.validated && r.validated.violations) || [], validationErrors: (r.validated && r.validated.errors) || [],
      error: r.error, packetTruncated: r.packetTruncated,
      servedModel: r.meta && r.meta.servedModel, reasoningEffortReported: r.meta && r.meta.reasoningEffortReported,
      usage: _u, realizedUsd, thinkingChars: (r.meta && r.meta.thinkingChars) || 0,
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
        console.log('\n  STOPPING — ' + INFRA_STOP_AFTER + ' consecutive local function-layer failures '
          + '(502 / NO_RESPONSE_FROM_FUNCTION, no provider usage). Remaining fixtures are NOT dispatched;\n'
          + '  this run is INFRASTRUCTURE-INCONCLUSIVE and says nothing about the model.\n');
      }
    } else { consecutiveInfra = 0; }
  }
  gate.closePhase();

  const summary = verdictSummary(rows);
  const realizedTotal = rows.reduce((t, r) => t + (r.realizedUsd || 0), 0);
  const tokIn = rows.reduce((t, r) => t + ((r.usage && r.usage.prompt_tokens) || 0), 0);
  const tokOut = rows.reduce((t, r) => t + ((r.usage && r.usage.completion_tokens) || 0), 0);
  // MODEL IDENTITY IS ASSERTED, NOT ASSUMED. If any fixture was served by something other than the
  // pinned model, or (for a reasoning candidate) the proxy reports an effort other than the one
  // requested, the run does not describe the candidate it claims to and must not be scored as it.
  const wrongModel = rows.filter((r) => r.servedModel && r.servedModel !== PRIMARY_MODEL);
  const wrongEffort = CAND.reasoningEffort
    ? rows.filter((r) => r.usage && String(r.reasoningEffortReported || '') !== String(CAND.reasoningEffort))
    : [];
  const report = { runId: RUN_ID, model: PRIMARY_MODEL, promptVersion: PROMPT_V,
    reasoningEffort: CAND.reasoningEffort || null,
    maxTokens: CAND.maxTokens, dispatches: gate.trackedCalls().length,
    reservedUsd: ledger.totalUsd, realizedUsd: realizedTotal, tokensIn: tokIn, tokensOut: tokOut,
    ceilingUsd: RUN_CEILING, reservations: ledger.entries, routeLog: holder.log,
    modelIdentityClean: wrongModel.length === 0 && wrongEffort.length === 0,
    wrongModelIds: wrongModel.map((r) => r.id), wrongEffortIds: wrongEffort.map((r) => r.id),
    rows, summary };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(90));
  console.log('  reds caught        : ' + summary.caught + '/' + summary.reds + (summary.missed ? ('   MISSED: ' + summary.missedIds.join(', ')) : ''));
  console.log('  unsupported find.  : ' + summary.unsupportedFindings + (summary.unsupportedFindings ? ('   ' + summary.unsupportedIds.join(', ')) : ''));
  console.log('  greens passed      : ' + summary.correctPass + '/' + summary.greens + (summary.falsePositives ? ('   FALSE POS: ' + summary.falsePositiveIds.join(', ')) : ''));
  console.log('  undecided (blocks) : ' + summary.undecided + (summary.undecided ? ('   ' + summary.undecidedIds.join(', ')) : ''));
  console.log('  unavailable        : ' + summary.unavailable + (summary.unavailable ? ('   ' + summary.unavailableIds.join(', ')) : ''));
  console.log('  invalid responses  : ' + summary.invalid + (summary.invalid ? ('   ' + summary.invalidIds.join(', ')) : ''));
  console.log('  usable responses   : ' + summary.usableResponses + '/' + summary.totalFixtures);
  console.log('  dispatches         : ' + gate.trackedCalls().length + '   reserved $' + ledger.totalUsd.toFixed(6) + ' of $' + RUN_CEILING.toFixed(6));
  console.log('  REALIZED cost      : $' + realizedTotal.toFixed(6) + '   ' + tokIn + ' in / ' + tokOut + ' out'
    + (CAND.reasoningEffort ? '  (completion INCLUDES thinking — Mistral reports no separate reasoning_tokens)' : ''));
  console.log('  model identity     : ' + (report.modelIdentityClean ? 'clean — every served response was ' + PRIMARY_MODEL
      + (CAND.reasoningEffort ? ' at reasoning_effort=' + CAND.reasoningEffort : '')
    : 'MISMATCH — wrongModel[' + report.wrongModelIds.join(',') + '] wrongEffort[' + report.wrongEffortIds.join(',') + ']'));
  if (!report.modelIdentityClean) {
    console.log('    This run does NOT describe ' + PRIMARY_MODEL + (CAND.reasoningEffort ? ' in reasoning mode' : '') + '. Do not score it as such.');
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
  console.log('\n  Evidence: ' + OUT_DIR);
  await browser.close();
})().catch((e) => { console.error('RUN ERROR:', e && e.stack || e); process.exit(2); });
