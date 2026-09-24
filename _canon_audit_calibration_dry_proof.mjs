// DRY PROOF FOR THE CANON AUDITOR CALIBRATION — before any live auditor call.
//
// Proves the runner is fail-closed and that the scoring names the right failure, by driving the
// REAL core against stubbed auditor replies. Zero provider dispatches.
//
// usage: node _canon_audit_calibration_dry_proof.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import {
  loadFixtures, makeLedger, installCalibrationRoute, scoreFixture, verdictSummary,
  PRIMARY_MODEL, PRIMARY_ENDPOINT, PER_CALL_USD, CEILING_USD, isInfraFailure, INFRA_STOP_AFTER,
  candidate, CANDIDATES
} from './_canon_audit_calibration_core.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_canon_audit_calibration_dry_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 420) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

(async () => {
  console.log('=== CANON AUDITOR CALIBRATION — DRY PROOF (zero dispatches) ===');
  const { fixtures, durable } = loadFixtures();

  section('1. THE FIXTURE SET IS REAL AND BALANCED');
  const reds = fixtures.filter((f) => f.expect === 'violation');
  const greens = fixtures.filter((f) => f.expect === 'pass');
  console.log('    ' + fixtures.length + ' fixtures: ' + reds.length + ' red, ' + greens.length + ' green');
  fixtures.forEach((f) => console.log('      ' + (f.expect === 'violation' ? 'RED  ' : 'GREEN') + '  ' + f.id));
  ok('four reds and four greens, as specified', reds.length === 4 && greens.length === 4, fixtures.length + ' total');
  ok('the memory-extraction red is the RETAINED failed Scene B proposal, relabelled ordinary',
    /draws the memory of the accusation from Seren/.test(reds[0].plan.state_change)
    && reds[0].plan.event_slots.mechanism_grounding === 'ordinary', JSON.stringify(reds[0].plan.state_change));
  ok('the glow red is a REAL retained corpus plan, not written for this test',
    /\bglow\w*|visible burn/i.test(reds[1].plan.state_change), reds[1].plan.state_change);
  ok('every plan declares a mechanism_grounding, so none is short-circuited deterministically before the model sees it',
    fixtures.every((f) => (f.plan.event_slots && f.plan.event_slots.mechanism_grounding) || f.plan.mechanism_grounding), 'a fixture lacks grounding');

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  let reply = null;
  gate.stub(PRIMARY_ENDPOINT, async () => ({ content: typeof reply === 'string' ? reply : JSON.stringify(reply) }));
  const holder = { ledger: makeLedger(CEILING_USD), log: [], currentFixture: null };
  await installCalibrationRoute(page, holder);
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._buildCanonPacket && window._buildCanonAuditPrompt
    && window._validateCanonAuditResponse, { timeout: 30000 });

  section('2. THE REAL PRODUCTION PROMPT IS WHAT GETS SENT');
  const built = await page.evaluate((a) => {
    const s = window.state; s.storyId = 'dry-' + Date.now(); s._starterId = 'starter_first_sacrifice';
    s._temptFateDurableConsequences = [a.durable];
    const packet = window._buildCanonPacket(s, { proposal: a.plan });
    const p = window._buildCanonAuditPrompt(a.plan, packet);
    return { sys: p.sys, usr: p.usr, ids: packet.ids, truncated: packet.truncated };
  }, { durable, plan: reds[0].plan });
  fs.writeFileSync(path.join(OUT_DIR, 'sample_prompt.txt'), built.sys + '\n\n' + built.usr);
  ok('the prompt is the production CANON AUDITOR prompt, not a calibration-only copy',
    /You are a CANON AUDITOR/.test(built.sys) && /may NOT rewrite the plan/.test(built.sys));
  ok('the packet carries ID-addressed facts the reply can cite', built.ids.length > 5, JSON.stringify(built.ids.slice(0, 6)));

  section('3. SCORING — a VALID but incorrect pass is the critical failure');
  const packetIds = built.ids;
  const validViolation = { verdict: 'violation', violations: [{ category: 'unsupported_capability',
    claim: reds[0].plan.state_change, citedFactIds: [packetIds[0]], why: 'x' }] };
  const scored = await page.evaluate((a) => {
    const s = window.state; s._starterId = 'starter_first_sacrifice'; s._temptFateDurableConsequences = [a.durable];
    const packet = window._buildCanonPacket(s, { proposal: a.plan });
    return {
      pass: window._validateCanonAuditResponse({ verdict: 'pass', violations: [] }, packet, a.plan),
      violation: window._validateCanonAuditResponse(a.validViolation, packet, a.plan),
      undecided: window._validateCanonAuditResponse({ verdict: 'cannot_decide', uncertainty: 'unsure' }, packet, a.plan),
      bogus: window._validateCanonAuditResponse({ verdict: 'violation', violations: [{ category: 'other', claim: 'not in plan', citedFactIds: ['zz_9'], why: 'x' }] }, packet, a.plan)
    };
  }, { durable, plan: reds[0].plan, validViolation });
  const sRedPass = scoreFixture(reds[0], scored.pass, null);
  const sRedCaught = scoreFixture(reds[0], scored.violation, null);
  const sRedUndec = scoreFixture(reds[0], scored.undecided, null);
  const sGreenFP = scoreFixture(greens[0], scored.violation, null);
  const sGreenOk = scoreFixture(greens[0], scored.pass, null);
  ok('a VALID pass on a RED is scored MISSED and flagged CRITICAL',
    sRedPass.outcome === 'MISSED' && sRedPass.critical === true, JSON.stringify(sRedPass));
  ok('...and the note says why it is the worst case: no tier fallback fires',
    /triggers no tier fallback/.test(sRedPass.note || ''), sRedPass.note);
  ok('a valid violation on a RED is scored caught', sRedCaught.outcome === 'caught', JSON.stringify(sRedCaught));
  ok('cannot_decide on a RED is scored undecided, NOT caught — failing closed is not detection',
    sRedUndec.outcome === 'undecided' && sRedUndec.critical === false, JSON.stringify(sRedUndec));
  ok('a violation on a GREEN is scored FALSE_POSITIVE and flagged CRITICAL',
    sGreenFP.outcome === 'FALSE_POSITIVE' && sGreenFP.critical === true, JSON.stringify(sGreenFP));
  ok('a pass on a GREEN is scored correct', sGreenOk.outcome === 'correct_pass', JSON.stringify(sGreenOk));
  ok('an invalid reply is scored invalid_response, never silently counted as a pass',
    scoreFixture(greens[0], scored.bogus, null).outcome === 'invalid_response', JSON.stringify(scored.bogus.errors));
  ok('a transport error is scored unavailable, never a pass',
    scoreFixture(reds[0], { valid: false, errors: [] }, 'boom').outcome === 'unavailable');

  section('3b. THE HISTORY-REWRITE GREEN IS GENUINELY SUPPORTED BY THE PACKET');
  // Roman: the earlier fixture mutated ruptureClass and bolted on priorHistoryReplaced, while
  // _buildCanonPacket emitted no class detail at all — so the authorising fact never reached the
  // auditor, and Mistral would have been condemned for a packet defect.
  const histFx = fixtures.find((f) => f.id === 'green_tempt_history_rewrite');
  const hist = await page.evaluate((a) => {
    const s = window.state; s.storyId = 'hist-' + Date.now(); s._starterId = 'starter_first_sacrifice';
    s._temptFateDurableConsequences = [JSON.parse(JSON.stringify(a.fx.durableOverride))];
    const packet = window._buildCanonPacket(s, { proposal: a.fx.plan });
    const prompt = window._buildCanonAuditPrompt(a.fx.plan, packet);
    return { facts: packet.facts, sys: prompt.sys, usr: prompt.usr };
  }, { fx: histFx });
  fs.writeFileSync(path.join(OUT_DIR, 'history_rewrite_request.txt'), hist.sys + '\n\n' + hist.usr);
  const AUTH_FACT = histFx.durableOverride.classDetail.priorHistoryReplaced;
  ok('the fixture supplies a WHOLE internally consistent history_rewrite consequence, not a mutated memory one',
    histFx.durableOverride.ruptureClass === 'history_rewrite'
    && /never have stood for the rite/.test(histFx.durableOverride.requestedRupture)
    && /never stood for the rite/.test(histFx.durableOverride.deliveredScope),
    JSON.stringify({ c: histFx.durableOverride.ruptureClass, r: histFx.durableOverride.requestedRupture }));
  ok('the AUTHORISING FACT appears VERBATIM in the real audit request',
    hist.sys.indexOf(AUTH_FACT) !== -1, 'not found: ' + AUTH_FACT);
  ok('...labelled as what now actually happened, not as a wish that was made',
    /HISTORY REWRITTEN BY THAT RUPTURE \(this is now what happened\)/.test(hist.sys), 'label missing');
  ok('...and the surviving contradiction the rewrite left is carried too',
    hist.sys.indexOf('the ceremonial sash cut to her measure is still folded in the vestry') !== -1, 'contradiction missing');
  ok('the packet no longer describes this rupture as a forgetting', !/every witness present loses the memory/.test(hist.sys), 'stale memory scope leaked in');

  // Class detail must reach the packet for EVERY class, not only history.
  const classDetail = await page.evaluate(() => {
    const s = window.state; s._starterId = 'starter_first_sacrifice';
    const base = { id: 'x', source: 'tempt', proposalId: 'p', requestedRupture: 'w', deliveredScope: 'd',
      scopeMatch: 'full', invalidatedPlans: [], changed: [], durability: [], knowledgeStates: [] };
    const mk = (cls, detail) => { s._temptFateDurableConsequences = [Object.assign({}, base, { ruptureClass: cls, classDetail: detail })];
      return window._buildCanonPacket(s).facts.map((f) => f.text).join('\n'); };
    return {
      identity: mk('identity_reputation', { recognitionChanges: ['strangers greet her by name in the market'] }),
      possession: mk('materialization_possession', { materialEffects: [{ what: 'The Answer', whoHolds: 'Lirael', duration: 'until the window closes' }] }),
      relationship: mk('relationship_social', { affectedParties: ['the two houses are now formally allied'] }),
      memory: mk('memory_perception', { affectedKnowers: [{ who: 'Julian', disposition: 'suspects', nowKnows: 'nothing, but senses a gap' }],
        invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' }, targetPopulation: { kind: 'all_present_except_invoker' } })
    };
  });
  ok('identity/reputation detail reaches the packet', /strangers greet her by name in the market/.test(classDetail.identity), classDetail.identity.slice(-200));
  ok('possession detail reaches the packet', /The Answer now held by Lirael/.test(classDetail.possession), classDetail.possession.slice(-200));
  ok('relationship/social detail reaches the packet', /the two houses are now formally allied/.test(classDetail.relationship), classDetail.relationship.slice(-200));
  ok('memory detail reaches the packet — knower dispositions and the invoker anchor',
    /Julian — suspects/.test(classDetail.memory) && /Lirael \(the invoker\) is exempt/.test(classDetail.memory), classDetail.memory.slice(-260));

  // A properly-supported violation FOR THIS FIXTURE: the generic stub cites neg_0 with
  // unsupported_capability, which legitimately fails the rubric for reds expecting a different
  // category/kind. Each red needs a reply that actually satisfies its own rule.
  const supportedFor = (f) => ({ valid: true, verdict: 'violation', violations: [{
    category: (f.expectCategories || ['other'])[0],
    citedFactIds: [(f.supportingFactKinds || ['neg'])[0] + '_0'],
    claim: f.plan.state_change }] });
  const replyFor = (f) => f.expect === 'violation' ? supportedFor(f) : scored.pass;

  section('4. THE ENABLE GATE — a blocked green is a failure too');
  const mkRows = (f) => fixtures.map(f);
  const allGood = verdictSummary(mkRows((f) => ({ id: f.id, expect: f.expect,
    score: scoreFixture(f, replyFor(f), null) })));
  const oneMissed = verdictSummary(fixtures.map((f, i) => ({ id: f.id, expect: f.expect,
    score: scoreFixture(f, (f.expect === 'violation' && i === 0) ? scored.pass : replyFor(f), null) })));
  const oneFP = verdictSummary(mkRows((f) => ({ id: f.id, expect: f.expect,
    score: scoreFixture(f, f.id === 'green_mundane_invention' ? scored.violation : replyFor(f), null) })));
  // THE THREE CASES THE OLD GATE LET THROUGH — each blocks a legitimate scene in production.
  const greenUndecided = verdictSummary(mkRows((f) => ({ id: f.id, expect: f.expect,
    score: scoreFixture(f, f.id === 'green_confusion_records' ? scored.undecided : replyFor(f), null) })));
  const greenUnavailable = verdictSummary(mkRows((f) => ({ id: f.id, expect: f.expect,
    score: f.id === 'green_alignment_sense' ? scoreFixture(f, { valid: false, errors: [] }, 'transport failed')
      : scoreFixture(f, replyFor(f), null) })));
  const greenInvalid = verdictSummary(mkRows((f) => ({ id: f.id, expect: f.expect,
    score: scoreFixture(f, f.id === 'green_mundane_invention' ? scored.bogus : replyFor(f), null) })));
  ok('4 caught reds + 4 passing greens + no undecided/unavailable/invalid ⇒ ENABLE',
    allGood.enableGenerally === true && allGood.caught === 4 && allGood.correctPass === 4, JSON.stringify(allGood).slice(0, 220));
  ok('ONE missed red ⇒ DO NOT ENABLE', oneMissed.enableGenerally === false && oneMissed.missed === 1, JSON.stringify(oneMissed.blockers));
  ok('ONE green false positive ⇒ DO NOT ENABLE', oneFP.enableGenerally === false && oneFP.falsePositives === 1, JSON.stringify(oneFP.blockers));
  ok('a green returning CANNOT_DECIDE ⇒ DO NOT ENABLE (it blocks a legitimate scene)',
    greenUndecided.enableGenerally === false && greenUndecided.undecided === 1, JSON.stringify(greenUndecided.blockers));
  ok('a green that is UNAVAILABLE ⇒ DO NOT ENABLE (no usable response)',
    greenUnavailable.enableGenerally === false && greenUnavailable.unavailable === 1, JSON.stringify(greenUnavailable.blockers));
  ok('a green with an INVALID response ⇒ DO NOT ENABLE (it blocks a legitimate scene)',
    greenInvalid.enableGenerally === false && greenInvalid.invalid === 1, JSON.stringify(greenInvalid.blockers));
  ok('the summary reports usable responses out of total, so a partially-answered run cannot read as success',
    allGood.usableResponses === 8 && greenUnavailable.usableResponses === 7, JSON.stringify({ a: allGood.usableResponses, u: greenUnavailable.usableResponses }));

  section('4b. INFRASTRUCTURE FAIL-FAST — two dead calls stop the run');
  // Roman, after the first attempt burned all eight requests against a dead function layer:
  // "Add a calibration-level stop after two consecutive 502 NO_RESPONSE_FROM_FUNCTION responses
  // with no provider usage." The first fixture IS the provider-path health check.
  const INFRA_ERR = '[TIERED:canonAuditCalibration] all tiers exhausted — last error: mistral HTTP 502 An error occurred with this application.\n\nNO_RESPONSE_FROM_FUNCTION';
  ok('the signature is recognised: 502 + NO_RESPONSE_FROM_FUNCTION + no provider usage',
    isInfraFailure(INFRA_ERR, false) === true);
  ok('...and is NOT tripped when the provider actually answered', isInfraFailure(INFRA_ERR, true) === false);
  ok('...nor by an ordinary upstream error', isInfraFailure('mistral HTTP 429 rate limited', false) === false);
  ok('...nor by a bare 502 without the function-layer marker', isInfraFailure('mistral HTTP 502 upstream', false) === false);

  // Simulate the loop exactly as the runner runs it.
  let consecutive = 0, stopped = false, dispatched = 0;
  const simRows = fixtures.map((f) => {
    if (stopped) return { id: f.id, expect: f.expect, score: scoreFixture(f, null, null, { skipped: true }) };
    dispatched++;
    const score = scoreFixture(f, null, INFRA_ERR);
    if (score.infra) { consecutive++; if (consecutive >= INFRA_STOP_AFTER) stopped = true; } else consecutive = 0;
    return { id: f.id, expect: f.expect, score };
  });
  const simSummary = verdictSummary(simRows);
  const simLedger = makeLedger(CEILING_USD);
  for (let i = 0; i < dispatched; i++) simLedger.reserve('sim-' + i);
  console.log('    dispatched ' + dispatched + ', skipped ' + simSummary.skipped + ', reserved $' + simLedger.totalUsd.toFixed(6));
  ok('TWO consecutive dead calls produce EXACTLY TWO requests', dispatched === 2, 'dispatched=' + dispatched);
  ok('...and SIX fixtures are never dispatched', simSummary.skipped === 6, JSON.stringify(simSummary.skippedIds));
  ok('...realized provider cost is ZERO — the requests never reached the provider',
    simRows.slice(0, 2).every((r) => r.score.infra === true), 'infra flag missing');
  ok('...the run is marked INFRASTRUCTURE-INCONCLUSIVE, not a model result',
    simSummary.infrastructureInconclusive === true, JSON.stringify(simSummary.infrastructureInconclusive));
  ok('...and the verdict is DO NOT ENABLE', simSummary.enableGenerally === false, JSON.stringify(simSummary.blockers));
  ok('...with the undispatched fixtures named as a blocker, so a short run cannot read as success',
    simSummary.blockers.some((b) => /NOT DISPATCHED/.test(b)), JSON.stringify(simSummary.blockers));
  // A single dead call followed by a good one must NOT stop the run.
  let c2 = 0, s2 = false, d2 = 0;
  fixtures.forEach((f, i) => {
    if (s2) return;
    d2++;
    const score = i === 0 ? scoreFixture(f, null, INFRA_ERR) : scoreFixture(f, replyFor(f), null);
    if (score.infra) { c2++; if (c2 >= INFRA_STOP_AFTER) s2 = true; } else c2 = 0;
  });
  ok('a SINGLE dead call followed by a live one does NOT stop the run — the stop needs two consecutive',
    d2 === fixtures.length && s2 === false, 'dispatched=' + d2 + ' stopped=' + s2);

  section('4c. A CATCH REQUIRES SUBSTANTIVE SUPPORT, NOT JUST A "violation" VERDICT');
  // Roman: "A violation citing an irrelevant real ID must score as an unsupported finding, not a
  // catch." Mistral produced exactly that in the real run — invalidated_objective citing neg_0.
  const invRed = fixtures.find((f) => f.id === 'red_invalidated_objective');
  const supported = { valid: true, verdict: 'violation', violations: [{ category: 'invalidated_objective',
    claim: invRed.plan.state_change, citedFactIds: ['inv_0'] }] };
  const irrelevant = { valid: true, verdict: 'violation', violations: [{ category: 'invalidated_objective',
    claim: invRed.plan.state_change, citedFactIds: ['neg_0'] }] };
  const wrongCat = { valid: true, verdict: 'violation', violations: [{ category: 'rewritten_history',
    claim: invRed.plan.state_change, citedFactIds: ['inv_0'] }] };
  const bracketed = { valid: true, verdict: 'violation', violations: [{ category: 'invalidated_objective',
    claim: invRed.plan.state_change, citedFactIds: ['[inv_0]'] }] };
  ok('an APPROPRIATE category citing a SUPPORTING fact scores caught',
    scoreFixture(invRed, supported, null).outcome === 'caught', JSON.stringify(scoreFixture(invRed, supported, null)));
  ok('the same category citing an IRRELEVANT real fact scores unsupported_finding, NOT caught',
    scoreFixture(invRed, irrelevant, null).outcome === 'unsupported_finding', JSON.stringify(scoreFixture(invRed, irrelevant, null)));
  ok('...and is flagged critical, with the reason named',
    scoreFixture(invRed, irrelevant, null).critical === true
    && /not detection/.test(scoreFixture(invRed, irrelevant, null).note || ''), 'note missing');
  ok('a WRONG category citing a supporting fact also scores unsupported_finding',
    scoreFixture(invRed, wrongCat, null).outcome === 'unsupported_finding', JSON.stringify(scoreFixture(invRed, wrongCat, null)));
  ok('a bracketed-but-real id still counts as support — display brackets are normalised',
    scoreFixture(invRed, bracketed, null).outcome === 'caught', JSON.stringify(scoreFixture(invRed, bracketed, null)));
  const unsupSummary = verdictSummary(fixtures.map((f) => ({ id: f.id, expect: f.expect,
    score: f.id === 'red_invalidated_objective' ? scoreFixture(f, irrelevant, null) : scoreFixture(f, replyFor(f), null) })));
  ok('ONE unsupported finding ⇒ DO NOT ENABLE', unsupSummary.enableGenerally === false
    && unsupSummary.unsupportedFindings === 1, JSON.stringify(unsupSummary.blockers));

  section('4d. THE CANDIDATE MODEL IS PINNED AND PRICED');
  ok('gpt-4o-mini is priced from the real table at $0.000810 per call',
    Math.abs(candidate('gpt-4o-mini').perCallUsd - 0.00081) < 1e-9, JSON.stringify(candidate('gpt-4o-mini')));
  ok('...so eight fixtures are $0.006480, inside the $0.01 ceiling',
    Math.abs(8 * candidate('gpt-4o-mini').perCallUsd - 0.00648) < 1e-9 && 8 * candidate('gpt-4o-mini').perCallUsd < CEILING_USD);
  ok('gpt-4o-mini routes to its OWN endpoint, not Mistral\'s',
    candidate('gpt-4o-mini').endpoint === '/api/chatgpt-proxy' && candidate('gpt-4o-mini').provider === 'openai');
  let unpriced = false;
  try { candidate('grok-4-1-fast-reasoning'); } catch (_) { unpriced = true; }
  ok('an UNLISTED model is refused rather than silently run', unpriced === true);

  section('5. PRIMARY-ONLY AND THE CEILING ARE ENFORCED BEFORE DISPATCH');
  const probes = await page.evaluate(async () => {
    const hit = async (url, body) => { try { const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { ok: r.ok }; } catch (e) { return { blocked: true }; } };
    return {
      otherEndpoint: await hit('/api/proxy', { model: 'ministral-8b-2512' }),
      otherModel: await hit('/api/mistral-proxy', { model: 'grok-4-1-fast-reasoning' }),
      imageEndpoint: await hit('/api/bfl-kontext', { model: 'ministral-8b-2512' })
    };
  });
  ok('a DIFFERENT endpoint is blocked before dispatch', !!probes.otherEndpoint.blocked, JSON.stringify(probes.otherEndpoint));
  ok('a DIFFERENT model on the allowed endpoint is blocked — a cascade cannot masquerade as Mistral',
    !!probes.otherModel.blocked, JSON.stringify(probes.otherModel));
  ok('an image endpoint is blocked', !!probes.imageEndpoint.blocked, JSON.stringify(probes.imageEndpoint));
  const tight = makeLedger(PER_CALL_USD * 2 + 1e-9);
  const r1 = tight.reserve('a'), r2 = tight.reserve('b'), r3 = tight.reserve('c');
  ok('the ledger refuses the call that would pass the ceiling', r1.ok && r2.ok && !r3.ok && /pass the ceiling/.test(r3.reason), JSON.stringify([r1.ok, r2.ok, r3.ok]));
  ok('eight primary calls fit the $0.01 ceiling with headroom',
    8 * PER_CALL_USD < CEILING_USD, '$' + (8 * PER_CALL_USD).toFixed(6) + ' vs $' + CEILING_USD.toFixed(6));

  section('6. THE CLI FAILS CLOSED');
  const { execFileSync } = await import('node:child_process');
  let bare = { code: null, out: '' };
  try { bare.out = execFileSync('node', [path.join(__dirname, '_canon_audit_calibration_run.mjs')], { encoding: 'utf8' }); bare.code = 0; }
  catch (e) { bare.code = e.status; bare.out = String(e.stdout || ''); }
  ok('bare invocation refuses and exits non-zero', bare.code === 3, 'exit=' + bare.code);
  ok('...and prints the plan, the pass gate and the primary-only rationale',
    /NOT AUTHORIZED, NOTHING DISPATCHED/.test(bare.out) && /PASS GATE/.test(bare.out) && /WHY PRIMARY-ONLY/.test(bare.out), bare.out.slice(0, 200));
  let wrong = { code: null };
  try { execFileSync('node', [path.join(__dirname, '_canon_audit_calibration_run.mjs'), '--authorize', 'go ahead'], { encoding: 'utf8' }); wrong.code = 0; }
  catch (e) { wrong.code = e.status; }
  ok('an approximate phrase is refused', wrong.code === 3, 'exit=' + wrong.code);

  section('CONTAINMENT');
  ok('ZERO real provider dispatches', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('CALIBRATION DRY PROOF: ' + passed + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('DRY PROOF ERROR:', e && e.stack || e); process.exit(2); });
