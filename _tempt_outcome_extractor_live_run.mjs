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
  makeLedger, evaluateFindings, DECLARED_TIERS, ALLOWED_ENDPOINTS, CEILING_USD, tierCost
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
const AUTH_PHRASE = PIN_PRIMARY
  ? 'replay the extractor once against the retained prose, pinned to ministral-8b-2512, one provider request only, $0.002 reservation'
  : 'run the extractor-only live test once under $0.02';

const argv = process.argv.slice(2);
const authIdx = argv.indexOf('--authorize');
const given = authIdx !== -1 ? String(argv[authIdx + 1] || '') : null;

if (given !== AUTH_PHRASE) {
  console.log('EXTRACTOR-ONLY LIVE RUN — NOT AUTHORIZED, NOTHING DISPATCHED.\n');
  console.log('  fixture      : _tempt_fate_fixtures/run_2026-09-24_02-11-02_scene_a (already paid for)');
  console.log('  role         : temptOutcomeExtractor, and only that role');
  console.log('  endpoints    : ' + (PIN_PRIMARY ? PIN_ENDPOINT + '  (the other two tiers are blocked too)'
    : ALLOWED_ENDPOINTS.join(', ') + '  (everything else blocked)'));
  console.log('  tiers        : ' + DECLARED_TIERS.map((t) => t.tier + '=' + t.model).join('  '));
  if (PIN_PRIMARY) {
    console.log('  PINNED REPLAY: ' + PIN_MODEL + ' on ' + PIN_ENDPOINT + ' only, ONE request max');
    console.log('  single call  : $' + tierCost(PIN_MODEL).toFixed(6) + '   (no cascade — pinned)');
  } else {
    console.log('  worst case   : $' + DECLARED_TIERS.reduce((n, t) => n + tierCost(t.model), 0).toFixed(6)
      + '   expected: $' + tierCost(DECLARED_TIERS[0].model).toFixed(6));
  }
  console.log('  ceiling      : $' + (PIN_PRIMARY ? REPLAY_CEILING_USD : CEILING_USD).toFixed(6)
    + '  (its own — NOT the $0.40 Scene A budget)');
  console.log('  retry policy : ' + (PIN_PRIMARY
    ? 'NONE. No cascade, no retry — ONE request. Transport failure = NO DATA; malformed or uncited = FAILED SAMPLE.'
    : 'tier cascade only, on transport/unusable replies. NO validation retry.'));
  console.log('  mutation     : none — no commit, no pending resolution, no story write.');
  console.log('\n  To run, pass exactly:  --authorize "' + AUTH_PHRASE + '"');
  process.exit(3);
}

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const OUT_DIR = path.join(__dirname, '_tempt_fate_fixtures', 'extractor_only_' + RUN_ID);
if (fs.existsSync(OUT_DIR)) { console.error('REFUSING TO RUN — output directory already exists: ' + OUT_DIR); process.exit(4); }
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  console.log('=== EXTRACTOR-ONLY LIVE RUN — AUTHORIZED ===');
  console.log('    ceiling $' + CEILING_USD.toFixed(6) + ' · output ' + OUT_DIR);

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
  const ledger = makeLedger(PIN_PRIMARY ? REPLAY_CEILING_USD : CEILING_USD);
  const routeLog = [];
  await installReservationRoute(page, PIN_PRIMARY
    ? { ledger, log: routeLog, pinModel: PIN_MODEL, pinEndpoint: PIN_ENDPOINT, maxRequests: 1 }
    : { ledger, log: routeLog });

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
  // waitForSettlement(roleTag, opts) — the FIRST argument is the roleTag. Passing an options
  // object here made it wait on a roleTag that never existed, and the 2026-09-24 authorized run
  // hung after its (successful, single) dispatch until it was killed. The response had already
  // settled and was preserved in gate.jsonl, so nothing was lost and nothing was re-dispatched —
  // but the report had to be rebuilt from the log afterwards.
  await gate.waitForSettlement('extractor-only', { quietMs: 8000 }).catch(() => {});

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
    priorPaidRunCommitted: fx.priorCommitted
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
  console.log('\n  NO semantic verdict is rendered here. Whether the reading is RIGHT is a human call.');
  console.log('  Evidence: ' + OUT_DIR);

  await browser.close();
  process.exitCode = 0;
})().catch((e) => { console.error('RUN ERROR:', e && e.stack || e); process.exit(2); });
