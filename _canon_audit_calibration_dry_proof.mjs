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
  PRIMARY_MODEL, PRIMARY_ENDPOINT, PER_CALL_USD, CEILING_USD
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

  section('4. THE ENABLE GATE');
  const allGood = verdictSummary(fixtures.map((f) => ({ id: f.id, expect: f.expect,
    score: scoreFixture(f, f.expect === 'violation' ? scored.violation : scored.pass, null) })));
  const oneMissed = verdictSummary(fixtures.map((f, i) => ({ id: f.id, expect: f.expect,
    score: scoreFixture(f, (f.expect === 'violation' && i === 0) ? scored.pass : (f.expect === 'violation' ? scored.violation : scored.pass), null) })));
  const oneFP = verdictSummary(fixtures.map((f) => ({ id: f.id, expect: f.expect,
    score: scoreFixture(f, f.expect === 'violation' ? scored.violation : (f.id === 'green_mundane_invention' ? scored.violation : scored.pass), null) })));
  ok('all reds caught + zero green false positives ⇒ ENABLE', allGood.enableGenerally === true, JSON.stringify(allGood));
  ok('ONE missed red ⇒ DO NOT ENABLE', oneMissed.enableGenerally === false && oneMissed.missed === 1, JSON.stringify(oneMissed));
  ok('ONE green false positive ⇒ DO NOT ENABLE', oneFP.enableGenerally === false && oneFP.falsePositives === 1, JSON.stringify(oneFP));

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
