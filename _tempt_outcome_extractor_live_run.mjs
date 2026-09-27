// EXTRACTOR-ONLY LIVE RUN — the narrow $0.02 test.
//
// REFUSES TO RUN unless given the exact authorization phrase. There is no default that dispatches:
// invoked bare, it prints what it would do and exits non-zero. A sheet cannot enforce its own
// boundaries, so the boundaries live here, in code, dry-proven by
// _tempt_outcome_extractor_runner_dry_proof.mjs (38/38) before this was ever pointed at a network.
//
// Scope, enforced by _tempt_outcome_extractor_runner_core.mjs and not merely documented:
//   - reads the committed 09-24 fixture byte-for-byte
//   - invokes ONLY the production extractor prompt/call path
//   - allows ONLY the extractor's three declared tier endpoints AND its three declared models
//   - blocks every other text and image request, before dispatch
//   - reserves cost before each dispatch, under a $0.02 ceiling, refusing past it
//   - validates, but never resolves pending state, commits a consequence, or mutates a story
//   - stops on a structurally valid result, or on validation failure, or at the end of the
//     declared cascade — NO validation retry
//
// usage:
//   node _tempt_outcome_extractor_live_run.mjs                 → refuses, prints the plan
//   node _tempt_outcome_extractor_live_run.mjs --authorize "<phrase>"

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import {
  readFixture, buildContextInPage, installReservationRoute, runExtractorOnly,
  makeLedger, evaluateFindings, DECLARED_TIERS, ALLOWED_ENDPOINTS, CEILING_USD, tierCost,
  awaitUpstreamSettled
} from './_tempt_outcome_extractor_runner_core.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// ── PINNED REPLAY MODE (--pin-primary), Roman 2026-09-26 ────────────────────────────────────
// The original phrase authorized a THREE-TIER extractor test under $0.02 and is spent. The replay asks
// a narrower question — does the raised output limit help ministral-8b-2512 on the SAME prose it
// truncated on — so a cascade would answer a different question. In this mode nothing but
// ministral-8b-2512 on /api/mistral-proxy may proceed, exactly ONE provider request may leave (which
// also contains the per-tier retry, not just the walk), and the reservation is ONE tier at the sourced
// price. A transport failure is NO DATA; a malformed or uncited reply is a FAILED SAMPLE.
const PIN_PRIMARY = process.argv.indexOf('--pin-primary') !== -1;
const PIN_MODEL = 'ministral-8b-2512';
const PIN_ENDPOINT = '/api/mistral-proxy';
const REPLAY_CEILING_USD = 0.002;    // one tier at 3600 in + 3200 out, $0.15/M both ways = $0.00102
// LEDGER: the first pinned phrase ('replay the extractor once against the retained prose, pinned to
// ministral-8b-2512, one provider request only, $0.002 reservation') is CONSUMED — it released the
// 2026-09-26_23-42-18 replay, which dispatched and cost $0.001020 measured. This is Roman's wording for
// the corrected-schema replay.
//   6. 'Replay the extractor once more against the retained prose with the corrected schema, pinned to
//       ministral-8b-2512, one provider request only, $0.002 reservation'
//      CONSUMED 2026-09-27_01-35-36 — parsing PASS, citations PASS, schema PASS, SEMANTIC GROUNDING
//      FAIL; $0.001020 measured. Third pinned replay needs its own phrase.
//      CONSUMED 2026-09-27_02-52-51 — parsing PASS, citations PASS (one refusal), schema PASS,
//      SEMANTIC GROUNDING FAIL: the SAME gaze quote that supported Julian "retained" in replay 2
//      supported "forgot" here. Roman: "This fails the pre-registered standard. I'd stop tuning
//      Ministral for this role." MINISTRAL PROMPT TUNING FOR THIS ROLE IS CLOSED; both responses
//      are retained as _tempt_fate_fixtures/extractor_regression/03 and /04.
//
// ── PROVIDER COMPARISON MODE (--pin-grok), Roman 2026-09-27 ─────────────────────────────────
// The question is no longer "can this prompt be tuned" — it is "does a stronger model obey the
// SAME prompt." So the prompt does not move: messages, temperature 0.1 and max_tokens 3200 are
// byte-identical to replay 3, the prose is the retained 09-24 fixture, and the semantic criteria
// are the ones pre-registered before replay 3.
//
// EXACTLY FOUR provider-required settings differ, each forced by the provider and none by choice:
//   1. ENDPOINT  /api/mistral-proxy -> /api/proxy. grok is not served by the mistral proxy. Done as
//      a HARNESS REDIRECT at the route boundary (route.fetch -> route.fulfill), NOT by editing
//      production routing: _extractTemptOutcome keeps its Mistral-primary chain untouched.
//   2. MODEL PIN  model:'ministral-8b-2512' -> _sbModelOverride:'grok-4.3'. /api/proxy's
//      _resolveGrokModel rewrites chain names, so `preferredModel` would be served as whatever it
//      resolves to; _sbModelOverride is the allowlisted pin that names the RESOLVED model, and
//      _orchestration.resolvedModel echoes back what actually answered.
//   3. _noFallback: true  ADDED. Without it the server walks STRUCTURE_GENERATOR's three-entry
//      chain inside this one client request — three billable upstream attempts, invisible to any
//      client-side pin. With it the chain is reduced to one entry. The mistral path needed no such
//      field, so this is an addition rather than a translation.
//   4. ROLE stays 'STRUCTURE_GENERATOR' — already what the mistral body sent, and already the
//      chain that carries grok-4.3. NOT a change; recorded so the list is complete.
// Nothing else is sent. reasoningEffort is deliberately NOT specified, so the proxy's own default
// for this model applies ('high'); specifying it would be a fifth change and a weaker comparison.
//
// REASONING CHARGES ARE NOT BOUNDED BY max_tokens AT THIS PROVIDER. The reservation below is
// therefore HEADROOM, not a limit — see GROK_CEILING_USD.
// ── --dry-upstream=<url> : DRIVE THIS EXACT RUNNER WITH NO PROVIDER (Roman 2026-09-27) ──────
// The paid grok run was "proven" by a dry test that short-circuited the route BEFORE route.fetch,
// so the capture / persist / settle / exit half of the path had never executed even once. This flag
// points the redirect adapter's upstream at a LOCAL stub server, so the real runner performs the
// real route.fetch -> capture -> persist -> route.fulfill -> evaluate -> exit sequence at zero cost.
// It is NOT a way to reach the provider cheaply, and the guard below is what makes that true rather
// than merely intended: the URL must be loopback AND must not be the app's own port, so
// --dry-upstream can never address /api/proxy on :3000. No authorization phrase is required in this
// lane precisely because no provider is reachable from it.
const DRY_UPSTREAM = (() => {
  const a = process.argv.find((x) => x.indexOf('--dry-upstream=') === 0);
  if (!a) return null;
  const raw = a.slice('--dry-upstream='.length);
  let u; try { u = new URL(raw); } catch (_) {
    console.error('REFUSING: --dry-upstream is not a URL: ' + raw); process.exit(6);
  }
  const loopback = (u.hostname === '127.0.0.1' || u.hostname === 'localhost' || u.hostname === '[::1]');
  if (!loopback || u.port === '3000' || u.port === '') {
    console.error('REFUSING: --dry-upstream must be loopback on a port other than 3000 (got '
      + u.hostname + ':' + u.port + ') — this lane may never address the real proxy.');
    process.exit(6);
  }
  return raw;
})();
// PHRASE LEDGER FOR THIS MODE. Consumed on EXECUTION, not on spend.
//   7. 'run the grok 4.3 extractor comparison once on the unchanged prompt and retained prose,
//       pinned to grok-4.3, one upstream attempt, $0.05 reservation'
//      CONSUMED 2026-09-27_03-51-34. The provider answered (grok-4.3, effort high, one upstream
//      attempt, status 200, 9979ms) and the HARNESS LOST THE RESPONSE to a settlement deadlock:
//      every artifact was written after a wait that could never end. ALL FOUR CRITERIA NO DATA,
//      cost unmeasured. Fixed runner-side (persist-before-wait, adapter-owned bounded settlement),
//      proven end to end by _tempt_outcome_extractor_grok_redirect_path_proof.mjs (42/42).
//   8. Roman's wording for the replay over the fixed path — the phrase below.
const PIN_GROK = process.argv.indexOf('--pin-grok') !== -1;
const GROK_MODEL = 'grok-4.3';
// One upstream attempt, bounded portion: 3600 prompt tokens @ $1.25/M = $0.004500,
// 3200 completion tokens @ $2.50/M = $0.008000  =>  $0.012500 bounded.
// UNBOUNDED PORTION: xAI bills reasoning tokens as output and does NOT count them against
// max_tokens, so no enforceable total-cost limit exists at this provider. $0.050000 leaves
// $0.037500 of headroom = about 15,000 reasoning tokens at $2.50/M before the ceiling would be
// reached — and the ceiling can only refuse a request BEFORE it is sent, never truncate one in
// flight. If grok reasons past that, the overrun is real and will appear on the receipt.
const GROK_CEILING_USD = 0.050;

const AUTH_PHRASE = PIN_GROK
  ? 'Replay the Grok 4.3 extractor comparison once on the unchanged prompt and retained prose, pinned to Grok 4.3, one upstream attempt, $0.05 reservation'
  : PIN_PRIMARY
  ? 'replay the extractor once against the retained prose with the grounding rules and undetermined scope, pinned to ministral-8b-2512, one provider request only, $0.002 reservation'
  : 'run the extractor-only live test once under $0.02';

const argv = process.argv.slice(2);
const authIdx = argv.indexOf('--authorize');
const given = authIdx !== -1 ? String(argv[authIdx + 1] || '') : null;

if (DRY_UPSTREAM && !PIN_GROK) {
  console.error('REFUSING: --dry-upstream only applies to --pin-grok, the lane that has a redirect adapter.');
  process.exit(6);
}
if (given !== AUTH_PHRASE && !DRY_UPSTREAM) {
  console.log('EXTRACTOR-ONLY LIVE RUN — NOT AUTHORIZED, NOTHING DISPATCHED.\n');
  console.log('  fixture      : _tempt_fate_fixtures/run_2026-09-24_02-11-02_scene_a (already paid for)');
  console.log('  role         : temptOutcomeExtractor, and only that role');
  console.log('  endpoints    : ' + (PIN_GROK ? '/api/mistral-proxy REDIRECTED to /api/proxy at the route boundary'
    : PIN_PRIMARY ? PIN_ENDPOINT + '  (the other two tiers are blocked too)'
    : ALLOWED_ENDPOINTS.join(', ') + '  (everything else blocked)'));
  console.log('  tiers        : ' + DECLARED_TIERS.map((t) => t.tier + '=' + t.model).join('  '));
  if (PIN_GROK) {
    console.log('  PROVIDER CMP : ' + GROK_MODEL + ' via _sbModelOverride on /api/proxy, ONE upstream attempt');
    console.log('  bounded cost : $' + tierCost(GROK_MODEL).toFixed(6) + '   (3600 in + 3200 out at $1.25/$2.50 per M)');
    console.log('  UNBOUNDED    : reasoning tokens are billed output and are NOT capped by max_tokens');
    console.log('  prompt       : UNCHANGED — same messages, temperature 0.1, max_tokens 3200');
  } else if (PIN_PRIMARY) {
    console.log('  PINNED REPLAY: ' + PIN_MODEL + ' on ' + PIN_ENDPOINT + ' only, ONE request max');
    console.log('  single call  : $' + tierCost(PIN_MODEL).toFixed(6) + '   (no cascade — pinned)');
  } else {
    console.log('  worst case   : $' + DECLARED_TIERS.reduce((n, t) => n + tierCost(t.model), 0).toFixed(6)
      + '   expected: $' + tierCost(DECLARED_TIERS[0].model).toFixed(6));
  }
  console.log('  ceiling      : $' + (PIN_GROK ? GROK_CEILING_USD : PIN_PRIMARY ? REPLAY_CEILING_USD : CEILING_USD).toFixed(6)
    + '  (its own — NOT the $0.40 Scene A budget)');
  console.log('  retry policy : ' + (PIN_GROK
    ? 'NONE. _noFallback reduces the server chain to ONE entry and the route permits ONE request. Transport failure = NO DATA.'
    : PIN_PRIMARY
    ? 'NONE. No cascade, no retry — ONE request. Transport failure = NO DATA; malformed or uncited = FAILED SAMPLE.'
    : 'tier cascade only, on transport/unusable replies. NO validation retry.'));
  console.log('  mutation     : none — no commit, no pending resolution, no story write.');
  console.log('\n  To run, pass exactly:  --authorize "' + AUTH_PHRASE + '"');
  process.exit(3);
}

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const OUT_DIR = path.join(__dirname, '_tempt_fate_fixtures',
  (DRY_UPSTREAM ? 'extractor_DRY_UPSTREAM_' : 'extractor_only_') + RUN_ID);
if (fs.existsSync(OUT_DIR)) { console.error('REFUSING TO RUN — output directory already exists: ' + OUT_DIR); process.exit(4); }
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  console.log(DRY_UPSTREAM
    ? '=== EXTRACTOR-ONLY RUN — DRY UPSTREAM, NO PROVIDER REACHABLE (' + DRY_UPSTREAM + ') ==='
    : '=== EXTRACTOR-ONLY LIVE RUN — AUTHORIZED ===');
  console.log('    ceiling $' + (PIN_GROK ? GROK_CEILING_USD : PIN_PRIMARY ? REPLAY_CEILING_USD : CEILING_USD).toFixed(6)
    + ' · output ' + OUT_DIR + (PIN_GROK ? '\n    PROVIDER COMPARISON: ' + GROK_MODEL + ', unchanged prompt' : ''));

  const fx = readFixture();
  fs.writeFileSync(path.join(OUT_DIR, 'fixture_source.json'), JSON.stringify({
    dir: 'run_2026-09-24_02-11-02_scene_a', rawBytes: fx.rawBytes.length,
    proposalId: fx.proposalId, wishText: fx.wishText, sceneIdx: fx.sceneIdx,
    priorCommitted: fx.priorCommitted
  }, null, 2));

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctxB = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctxB.newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));

  const gate = await installFailClosedNetworkGate(page, {
    logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true
  });
  // THE ONLY REAL LANE. Three endpoints; the reservation route additionally restricts them to the
  // three declared models and to the $0.02 ceiling, before anything is released.
  gate.allowRealPaths(ALLOWED_ENDPOINTS);

  // The pinned replay carries its OWN ceiling: one tier, not a cascade sum.
  const ledger = makeLedger(PIN_GROK ? GROK_CEILING_USD : PIN_PRIMARY ? REPLAY_CEILING_USD : CEILING_USD);
  const routeLog = [];
  const holder = PIN_GROK
    // artifactDir makes the adapter persist the receipt the instant it comes off the wire, BEFORE
    // anything downstream can wait; maxTokensAsked lets it compute the reasoning overrun itself.
    ? { ledger, log: routeLog, translateToGrok: true, maxRequests: 1, artifactDir: OUT_DIR,
        maxTokensAsked: 3200, upstreamUrl: DRY_UPSTREAM || undefined }
    : PIN_PRIMARY
    ? { ledger, log: routeLog, pinModel: PIN_MODEL, pinEndpoint: PIN_ENDPOINT, maxRequests: 1 }
    : { ledger, log: routeLog };
  await installReservationRoute(page, holder);

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && window._tfoBuildExtractionContext && window._extractTemptOutcome
    && window._tfoBuildExtractorPrompt && window._extractCGSceneText && window._temptOutcomeSceneRosterDetailed
    && window._validateTemptFateOutcomeReport && window._tfoVerifyCitations, { timeout: 30000 });

  const built = await buildContextInPage(page, fx);
  fs.writeFileSync(path.join(OUT_DIR, 'extraction_context.json'), JSON.stringify(built, null, 2));
  console.log('    roster: ' + JSON.stringify(built.rosterDetail.map((r) => r.name)));
  console.log('    prose : ' + built.proseLen + ' chars');

  gate.setPhase('extractor-only', DECLARED_TIERS.length);
  const res = await runExtractorOnly(page, built.ctx);
  gate.closePhase();
  // ── SETTLEMENT BELONGS TO WHOEVER PERFORMED THE REQUEST (Roman 2026-09-27) ──────────────────
  // In grok-comparison mode the redirect adapter terminates the intercepted route itself, so the
  // gate tracks ZERO calls under this phase — and gate.waitForSettlement requires
  // `relevant.length > 0` and never times out by design. Waiting on it there is an unconditional
  // deadlock, and it consumed a real, successful, billed grok-4.3 response on 2026-09-27. This lane
  // waits on the ADAPTER's own observable instead, bounded, with a timeout that is itself a
  // recorded outcome rather than silence.
  let upstream = null;
  if (PIN_GROK) {
    upstream = await awaitUpstreamSettled(holder, { timeoutMs: 20000 });
    console.log('    upstream settled: ' + (upstream.ok ? 'captured, ' + (holder.artifactsWritten || []).join(' + ')
      : 'NOT CAPTURED (' + upstream.reason + ') — incomplete_result.json written'));
  } else {
  // waitForSettlement(roleTag, opts) — the FIRST argument is the roleTag. Passing an options
  // object here made it wait on a roleTag that never existed, and the 2026-09-24 authorized run
  // hung after its (successful, single) dispatch until it was killed. The response had already
  // settled and was preserved in gate.jsonl, so nothing was lost and nothing was re-dispatched —
  // but the report had to be rebuilt from the log afterwards.
    await gate.waitForSettlement('extractor-only', { quietMs: 8000 }).catch(() => {});
  }

  const findings = evaluateFindings(res.raw, built.ctx.rosterNames);
  const tracked = gate.trackedCalls ? gate.trackedCalls() : [];
  const report = {
    runId: RUN_ID, ceilingUsd: CEILING_USD,
    reservedUsd: ledger.totalUsd, reservations: ledger.entries, routeLog,
    dispatches: tracked.length,
    trackedCalls: tracked.map((t) => ({ url: t.url, model: (t.requestBody || {}).model || (t.requestBody || {}).preferredModel, status: t.status, elapsedMs: t.elapsedMs })),
    prompt: res.prompt, raw: res.raw, error: res.error, attemptLog: res.attemptLog,
    validation: res.validation, citations: res.citations,
    structurallyValid: res.structurallyValid,
    stateUnchanged: res.stateUnchanged, stateBefore: res.stateBefore, stateAfter: res.stateAfter,
    findings,
    priorPaidRunCommitted: fx.priorCommitted,
    upstreamOutcome: holder.upstreamOutcome || null,
    // A run whose response was never captured reports NO DATA on every criterion. It does NOT
    // report "parsing failed": an uncaptured response is unexamined, not examined and found wanting.
    noDataReason: (PIN_GROK && upstream && !upstream.ok) ? upstream.reason : null,
    // PROVIDER COMPARISON PROVENANCE + the measured (not estimated) cost, including the reasoning
    // tokens the reservation could not bound.
    providerComparison: PIN_GROK ? (() => {
      let up = null; try { up = JSON.parse(holder.upstreamRaw || 'null'); } catch (_) {}
      const u = (up && up.usage) || {};
      const reasoning = (u.completion_tokens_details && u.completion_tokens_details.reasoning_tokens) || 0;
      const measuredUsd = (Number(u.prompt_tokens || 0) * 0.00000125) + (Number(u.completion_tokens || 0) * 0.0000025);
      return {
        translation: holder.translation || null,
        translatedBody: holder.translatedBody
          ? Object.assign({}, holder.translatedBody, { messages: '<' + holder.translatedBody.messages.length + ' messages, byte-identical — see extractor_*_prompt.txt>' })
          : null,
        upstreamStatus: holder.upstreamStatus || null,
        resolvedModel: (up && up._orchestration && up._orchestration.resolvedModel) || null,
        chainEntry: (up && up._orchestration && up._orchestration.chainEntry) || null,
        // The number of upstream calls the SERVER made inside this one client request. _noFallback
        // is supposed to hold it at 1; this is the field that proves it rather than assuming it.
        upstreamAttempts: (up && up._orchestration && typeof up._orchestration.upstreamAttempts === 'number')
          ? up._orchestration.upstreamAttempts : null,
        reasoningEffort: (up && up._orchestration && up._orchestration.reasoningEffort) || null,
        usage: u,
        reasoningTokens: reasoning,
        // completion_tokens ALREADY INCLUDES reasoning tokens at xAI, so measuredUsd is the whole
        // charge; reasoningTokens is reported separately to show how much of it max_tokens did not
        // bound. If reasoning pushed completion above 3200, that is the overrun made visible.
        completionOverMaxTokens: Math.max(0, Number(u.completion_tokens || 0) - 3200),
        measuredUsd: Number(measuredUsd.toFixed(6)),
        reservedUsd: ledger.totalUsd
      };
    })() : null
  };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'extractor_system_prompt.txt'), res.prompt ? res.prompt.sys : '');
  fs.writeFileSync(path.join(OUT_DIR, 'extractor_user_prompt.txt'), res.prompt ? res.prompt.usr : '');
  fs.writeFileSync(path.join(OUT_DIR, 'extractor_raw_response.json'), JSON.stringify(res.raw, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'console_log.jsonl'), consoleLines.map((l) => JSON.stringify({ t: l })).join('\n'));

  console.log('\n' + '='.repeat(90));
  console.log('  dispatches      : ' + tracked.length + ' of ' + DECLARED_TIERS.length + ' permitted');
  console.log('  reserved        : $' + ledger.totalUsd.toFixed(6) + ' of $' + CEILING_USD.toFixed(6));
  console.log('  structurally OK : ' + res.structurallyValid);
  console.log('  state unchanged : ' + res.stateUnchanged);
  if (res.error) console.log('  error           : ' + res.error.message);
  if (res.validation && !res.validation.valid) console.log('  validation      : ' + JSON.stringify(res.validation.errors));
  if (res.citations && res.citations.length) console.log('  citations       : ' + JSON.stringify(res.citations));
  if (findings) {
    console.log('\n  THE FIVE QUESTIONS:');
    console.log('    1 citations present     : ' + findings.citationsPresent);
    console.log('    2 roster covered        : ' + findings.rosterCovered);
    console.log('    3 invoker anchor default: ' + findings.invokerAnchor);
    console.log('    4 scope stated          : ' + findings.scopeStated);
    console.log('    5 Julian resolved       : ' + findings.julianResolved + '  disposition=' + findings.julianDisposition);
    if (findings.julianQuote) console.log('      cited: "' + String(findings.julianQuote).slice(0, 100) + '"');
  }
  if (report.providerComparison) {
    const pc = report.providerComparison;
    console.log('\n  PROVIDER COMPARISON:');
    console.log('    served by       : ' + pc.resolvedModel + '   (chain entry ' + pc.chainEntry + ', effort ' + pc.reasoningEffort + ')');
    console.log('    upstream attempts: ' + pc.upstreamAttempts + '   (must be 1 — _noFallback)');
    console.log('    usage           : ' + JSON.stringify(pc.usage));
    console.log('    reasoning tokens: ' + pc.reasoningTokens + '  (billed as output, NOT bounded by max_tokens)');
    console.log('    over max_tokens : ' + pc.completionOverMaxTokens + ' completion tokens beyond the 3200 asked for');
    console.log('    measured        : $' + pc.measuredUsd.toFixed(6) + '  against $' + pc.reservedUsd.toFixed(6) + ' reserved');
  }
  if (PIN_GROK && upstream && !upstream.ok) {
    console.log('\n  ALL FOUR CRITERIA: NO DATA — the response was never captured (' + upstream.reason + ').');
    console.log('  Parsing is UNVERIFIED too: an uncaptured response is unexamined, not examined and failed.');
  }
  console.log('\n  NO semantic verdict is rendered here. Whether the reading is RIGHT is a human call.');
  console.log('  Evidence: ' + OUT_DIR);

  await browser.close();
  // EXIT EXPLICITLY. process.exitCode alone leaves a lingering handle able to hold the process open
  // after all work is done — the same failure shape as the settlement deadlock, one layer down.
  process.exit((PIN_GROK && upstream && !upstream.ok) ? 5 : 0);
})().catch((e) => { console.error('RUN ERROR:', e && e.stack || e); process.exit(2); });
