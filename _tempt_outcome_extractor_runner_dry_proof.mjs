// DRY PROOF FOR THE EXTRACTOR-ONLY RUNNER — fail-closed, before any live authorization.
//
// Roman, 2026-09-24: "don't authorize it until the runner exists and is dry-proven. A sheet cannot
// enforce its own boundaries."
//
// Drives the REAL runner core (_tempt_outcome_extractor_runner_core.mjs) against the REAL
// committed fixture, with the three tier endpoints stubbed to inject each scenario. ZERO real
// provider dispatches.
//
// Scenarios required:
//   A  valid primary response                      → stops at tier 1, structurally valid
//   B  invalid-but-PARSEABLE primary               → STOPS as a validation failure, NO fallthrough
//   C  transport failure on primary                → cascades to fallback, succeeds
//   D  unusable (empty) primary + fallback         → cascades to terminal, succeeds
//   E  all three tiers fail                        → clean exhaustion, cascade bounded at 3
// plus the boundary proofs: a non-declared endpoint, a non-declared model, and the ceiling.
//
// usage: node _tempt_outcome_extractor_runner_dry_proof.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import {
  readFixture, buildContextInPage, installReservationRoute, runExtractorOnly,
  makeLedger, evaluateFindings, DECLARED_TIERS, CEILING_USD, tierCost
} from './_tempt_outcome_extractor_runner_core.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_tempt_outcome_extractor_runner_dry_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 460) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

function outcomeFor(quote, opts) {
  opts = opts || {};
  return {
    delivered: true,
    changed: [{ subject: 'the assembly', whatChanged: 'no longer remembers the ceremony' }],
    durability: [{ aspect: 'the memory gap', status: 'persists' }],
    establishedEvidence: ['the clearing does not explain itself'],
    requestedScope: 'everyone forgets the ceremony happened',
    deliveredScope: 'every witness present loses the memory',
    scopeMatch: 'full', ruptureClass: 'memory_perception',
    targetPopulation: { kind: 'all_present_except_invoker' },
    affectedKnowers: (opts.knowers || ['the assembly', 'Julian', 'Seren', 'the presiding Dohkar']).map((w) => ({
      who: w, disposition: 'forgot', memoryAbsent: true, suspicionFromResidue: false,
      nowKnows: 'nothing of the ceremony',
      evidenceQuote: opts.badQuote ? 'a line that is certainly not anywhere in this scene at all' : quote
    })),
    invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor', note: 'anchor' },
    unaccountedParties: []
  };
}

(async () => {
  console.log('=== EXTRACTOR-ONLY RUNNER — DRY PROOF (zero provider dispatches) ===');
  const fx = readFixture();
  console.log('    fixture: ' + fx.proposalId + ' · wish "' + fx.wishText + '" · sceneIdx ' + fx.sceneIdx
    + ' · raw output ' + fx.rawBytes.length + ' bytes');

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctxB = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctxB.newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });

  // Scenario switch, flipped between runs.
  let scenario = { primary: null, fallback: null, terminal: null };
  const seen = [];
  const stubFor = (tierName) => async (req) => {
    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const sys = ((b.messages || []) .find((m) => m.role === 'system') || {}).content || '';
    const usr = ((b.messages || []).find((m) => m.role === 'user') || {}).content || '';
    seen.push({ tier: tierName, model: b.model || b.preferredModel, isExtractor: sys.indexOf('CONSEQUENCE EXTRACTOR') !== -1 });
    const mode = scenario[tierName];
    if (mode === 'transport') throw new Error('simulated transport failure');
    if (mode === 'empty') return { content: '' };
    if (mode === 'unparsable') return { content: 'I am afraid I cannot produce JSON today.' };
    const quote = String(usr).split('\n').map((s) => s.trim())
      .filter((s) => s.length > 14 && s.indexOf('THE ACCEPTED SCENE') === -1)[0] || '';
    if (mode === 'invalid') return { content: JSON.stringify(outcomeFor(quote, { badQuote: true })) };
    if (mode === 'valid') return { content: JSON.stringify(outcomeFor(quote)) };
    return { content: '' };
  };
  gate.stub('/api/mistral-proxy', stubFor('primary'));
  gate.stub('/api/proxy', stubFor('fallback'));
  gate.stub('/api/chatgpt-proxy', stubFor('terminal'));

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && window._tfoBuildExtractionContext && window._extractTemptOutcome
    && window._tfoBuildExtractorPrompt && window._extractCGSceneText && window._temptOutcomeSceneRosterDetailed
    && window._validateTemptFateOutcomeReport && window._tfoVerifyCitations, { timeout: 30000 });

  const built = await buildContextInPage(page, fx);
  fs.writeFileSync(path.join(OUT_DIR, 'context.json'), JSON.stringify(built, null, 2));
  console.log('    roster: ' + JSON.stringify(built.rosterDetail.map((r) => r.name)));
  console.log('    prose : ' + built.proseLen + ' chars');

  section('0. THE CONTEXT COMES FROM THE COMMITTED FIXTURE, BYTE-FOR-BYTE');
  ok('the fixture\'s own proposal id and wish are used, not re-invented',
    built.ctx.proposalId === 'tfl_1' && built.ctx.wishText === 'everyone forgets the ceremony happened',
    JSON.stringify({ id: built.ctx.proposalId, wish: built.ctx.wishText }));
  ok('the prose is built by the PRODUCTION reader-facing builder over the fixture\'s raw output',
    built.proseLen > 700 && built.ctx.prose.indexOf('The question stands') !== -1, 'len=' + built.proseLen);
  ok('the context is frozen', built.frozen === true);
  ok('the roster resolves Julian and the assembly from the fixture itself',
    built.rosterDetail.some((r) => r.name === 'Julian') && built.rosterDetail.some((r) => /assembly/i.test(r.name)),
    JSON.stringify(built.rosterDetail));

  // One run under a fresh ledger + reservation route.
  // ONE reservation route, installed once; the ledger is swapped per scenario through the holder.
  const holder = { ledger: makeLedger(CEILING_USD), log: [] };
  await installReservationRoute(page, holder);

  async function runScenario(label, sc) {
    scenario = sc; seen.length = 0;
    const ledger = makeLedger(CEILING_USD);
    const routeLog = [];
    holder.ledger = ledger; holder.log = routeLog;
    gate.setPhase('extractor-only', 3);
    const res = await runExtractorOnly(page, built.ctx);
    gate.closePhase();
    const rec = { label, scenario: sc, dispatches: seen.slice(), routeLog, ledger: ledger.entries,
      totalUsd: ledger.totalUsd, result: res, findings: evaluateFindings(res.raw, built.ctx.rosterNames) };
    fs.writeFileSync(path.join(OUT_DIR, 'scenario_' + label + '.json'), JSON.stringify(rec, null, 2));
    return rec;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('A. VALID PRIMARY RESPONSE — one dispatch, structurally valid, nothing mutated');
  const A = await runScenario('A_valid_primary', { primary: 'valid', fallback: 'valid', terminal: 'valid' });
  ok('exactly ONE dispatch — it stopped at the primary tier', A.dispatches.length === 1 && A.dispatches[0].tier === 'primary', JSON.stringify(A.dispatches));
  ok('the dispatch really was the extractor prompt (not some other role riding the same endpoint)', A.dispatches[0] && A.dispatches[0].isExtractor === true, JSON.stringify(A.dispatches[0]));
  ok('the result is structurally valid, citations included', A.result.structurallyValid === true, JSON.stringify({ v: A.result.validation, c: A.result.citations }));
  ok('NOTHING was mutated — no pending resolved, no consequence committed, no story touched', A.result.stateUnchanged === true, A.result.stateBefore + ' → ' + A.result.stateAfter);
  ok('cost reserved BEFORE the dispatch, and it is the primary tier\'s sourced price', Math.abs(A.totalUsd - tierCost('ministral-8b-2512')) < 1e-12, JSON.stringify(A.ledger));
  ok('the five sheet questions are answerable from the result', A.findings && A.findings.citationsPresent && A.findings.invokerAnchor && A.findings.scopeStated && A.findings.julianResolved, JSON.stringify(A.findings));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('B. INVALID-BUT-PARSEABLE PRIMARY — the distinction that matters');
  const B = await runScenario('B_invalid_parseable', { primary: 'invalid', fallback: 'valid', terminal: 'valid' });
  ok('exactly ONE dispatch — a semantic rejection does NOT fall through to another model',
    B.dispatches.length === 1 && B.dispatches[0].tier === 'primary', JSON.stringify(B.dispatches));
  ok('...and it is reported as a VALIDATION FAILURE, not a transport failure',
    B.result.raw !== null && B.result.error === null && B.result.structurallyValid === false,
    JSON.stringify({ hasRaw: !!B.result.raw, error: B.result.error }));
  ok('...failing specifically on citations — the quote is not in the accepted prose',
    (B.result.citations || []).length > 0 && (B.result.citations || []).some((e) => /not present verbatim/.test(e)),
    JSON.stringify(B.result.citations));
  ok('...spending only ONE tier\'s cost, not the whole cascade',
    Math.abs(B.totalUsd - tierCost('ministral-8b-2512')) < 1e-12, 'total=$' + B.totalUsd.toFixed(6));
  ok('...and still mutating nothing', B.result.stateUnchanged === true, B.result.stateBefore + ' → ' + B.result.stateAfter);
  // The structural reason this holds, asserted rather than assumed.
  const noContentValidator = await page.evaluate(() => /validateContent/.test(window._extractTemptOutcome.toString()));
  ok('STRUCTURAL REASON — the production extractor passes NO opts.validateContent, so _callTieredProvider cannot cascade on a semantic rejection',
    noContentValidator === false, 'the extractor passes a content validator — a semantic rejection could cascade');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('C. TRANSPORT FAILURE ON PRIMARY — cascades, and only then');
  const C = await runScenario('C_transport_primary', { primary: 'transport', fallback: 'valid', terminal: 'valid' });
  ok('two dispatches — primary then fallback', C.dispatches.length === 2 && C.dispatches[1].tier === 'fallback', JSON.stringify(C.dispatches));
  ok('the fallback result is structurally valid', C.result.structurallyValid === true, JSON.stringify(C.result.validation));
  ok('BOTH tiers were reserved before dispatch, in order', C.ledger.length === 2 && C.ledger.every((e) => e.ok), JSON.stringify(C.ledger));
  ok('...and the running total is the sum of the two sourced tier prices',
    Math.abs(C.totalUsd - (tierCost('ministral-8b-2512') + tierCost('grok-4-1-fast-reasoning'))) < 1e-12, 'total=$' + C.totalUsd.toFixed(6));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('D. UNUSABLE RESPONSES — empty content advances a tier; unparsable does not cascade');
  const D = await runScenario('D_empty_to_terminal', { primary: 'empty', fallback: 'empty', terminal: 'valid' });
  ok('three dispatches — empty content is "unusable" and advances the tier', D.dispatches.length === 3 && D.dispatches[2].tier === 'terminal', JSON.stringify(D.dispatches));
  ok('the terminal tier produced a structurally valid result', D.result.structurallyValid === true, JSON.stringify(D.result.validation));
  ok('the full cascade stays under the $0.02 ceiling', D.totalUsd <= CEILING_USD, 'total=$' + D.totalUsd.toFixed(6) + ' ceiling=$' + CEILING_USD.toFixed(6));

  const D2 = await runScenario('D2_unparsable_primary', { primary: 'unparsable', fallback: 'valid', terminal: 'valid' });
  ok('an UNPARSABLE primary reply stops at one dispatch — it is a parse failure in the extractor, not a tier signal',
    D2.dispatches.length === 1 && D2.result.raw === null && D2.result.error !== null,
    JSON.stringify({ n: D2.dispatches.length, err: D2.result.error }));
  ok('...and is reported as an error rather than silently retried on another model',
    /not JSON|JSON/i.test((D2.result.error || {}).message || ''), JSON.stringify(D2.result.error));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('E. ALL TIERS FAIL — clean, bounded exhaustion');
  const E = await runScenario('E_all_fail', { primary: 'transport', fallback: 'transport', terminal: 'transport' });
  ok('the cascade is bounded at exactly THREE dispatches', E.dispatches.length === 3, JSON.stringify(E.dispatches.map((d) => d.tier)));
  ok('exhaustion is reported as an error, not a silent empty success', E.result.raw === null && E.result.error !== null, JSON.stringify(E.result.error));
  ok('...carrying the tier attempt log, so which tier failed and why is preserved',
    Array.isArray(E.result.attemptLog) && E.result.attemptLog.length === 3, JSON.stringify(E.result.attemptLog && E.result.attemptLog.map((a) => a.tier + '/' + a.outcome)));
  ok('nothing was mutated even on total failure', E.result.stateUnchanged === true, E.result.stateBefore + ' → ' + E.result.stateAfter);
  ok('the worst case stays under the ceiling', E.totalUsd <= CEILING_USD, 'total=$' + E.totalUsd.toFixed(6));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('F. THE BOUNDARIES THE SHEET CLAIMS — enforced, not asserted');
  const bLedger = makeLedger(CEILING_USD);
  const bLog = [];
  holder.ledger = bLedger; holder.log = bLog;
  const probes = await page.evaluate(async () => {
    const out = {};
    const hit = async (url, body) => {
      try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { ok: r.ok, status: r.status }; }
      catch (e) { return { blocked: true, message: String(e && e.message).slice(0, 80) }; }
    };
    out.imageEndpoint = await hit('/api/bfl-kontext', { model: 'ministral-8b-2512' });
    out.otherText = await hit('/api/specialist-proxy', { model: 'ministral-8b-2512' });
    out.undeclaredModel = await hit('/api/mistral-proxy', { model: 'mistral-small-latest' });
    return out;
  });
  ok('an IMAGE endpoint is blocked before dispatch', !!probes.imageEndpoint.blocked, JSON.stringify(probes.imageEndpoint));
  ok('a non-declared TEXT endpoint is blocked before dispatch', !!probes.otherText.blocked, JSON.stringify(probes.otherText));
  ok('a declared endpoint carrying a NON-declared model is blocked', !!probes.undeclaredModel.blocked, JSON.stringify(probes.undeclaredModel));
  ok('each block is recorded with its reason', bLog.length >= 3 && bLog.every((e) => e.reason), JSON.stringify(bLog.map((e) => e.kind)));
  ok('no cost was reserved for any blocked request', bLedger.totalUsd === 0, 'total=$' + bLedger.totalUsd.toFixed(6));

  // The ceiling itself must bite.
  const tight = makeLedger(0.001);   // deliberately below one primary tier ($0.000750) + fallback
  const r1 = tight.reserve('t1', 'ministral-8b-2512');
  const r2 = tight.reserve('t2', 'grok-4-1-fast-reasoning');
  ok('the reservation ledger REFUSES a dispatch that would breach its ceiling',
    r1.ok === true && r2.ok === false && /past the ceiling/.test(r2.reason || ''), JSON.stringify([r1, r2]));
  ok('an unsourced model is refused rather than priced at zero',
    tight.reserve('t3', 'some-model-nobody-priced').ok === false, JSON.stringify(tight.entries.slice(-1)));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('G. THE CLI ITSELF FAILS CLOSED — no default that dispatches');
  const { execFileSync } = await import('node:child_process');
  let bare = { code: null, out: '' };
  try {
    bare.out = execFileSync('node', [path.join(__dirname, '_tempt_outcome_extractor_live_run.mjs')], { encoding: 'utf8' });
    bare.code = 0;
  } catch (e) { bare.code = e.status; bare.out = String(e.stdout || ''); }
  ok('invoked with no arguments the live runner REFUSES and exits non-zero', bare.code === 3, 'exit=' + bare.code);
  ok('...printing the plan it would have run, so the refusal is informative rather than silent',
    /NOT AUTHORIZED, NOTHING DISPATCHED/.test(bare.out) && /ceiling      : \$0\.020000/.test(bare.out), bare.out.slice(0, 200));
  let wrong = { code: null };
  try { execFileSync('node', [path.join(__dirname, '_tempt_outcome_extractor_live_run.mjs'), '--authorize', 'yes go ahead'], { encoding: 'utf8' }); wrong.code = 0; }
  catch (e) { wrong.code = e.status; }
  ok('...and an APPROXIMATE authorization phrase is refused too — only the exact phrase runs',
    wrong.code === 3, 'exit=' + wrong.code);

  section('CONTAINMENT');
  ok('ZERO real provider dispatches across the entire dry proof', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('EXTRACTOR RUNNER DRY PROOF: ' + passed + '/' + results.length + ' passed');
  console.log('Evidence written to ' + OUT_DIR);
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('DRY PROOF ERROR:', e && e.stack || e); process.exit(2); });
