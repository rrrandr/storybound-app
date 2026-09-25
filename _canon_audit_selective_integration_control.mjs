// SELECTIVE CANON AUDITOR — INTEGRATION PROOF. ZERO dispatches, $0.
//
// Proves the production policy, and nothing more:
//   · ordinary plan  -> ZERO model calls
//   · risky plan     -> EXACTLY ONE model call, to grok-4.3 and nothing else
//   · a deterministic rejection is FINAL — a model pass cannot overturn it
//   · a violation routes into the EXISTING bounded retry; no new loop
//   · Grok unavailable -> resumable, never substituted
//
// Counting real author/auditor dispatches at the network boundary is the only honest way to prove
// "zero calls": a function that returns early still proves nothing about what the wire did.
//
// usage: node _canon_audit_selective_integration_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { loadFixtures } from './_canon_audit_calibration_core.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_canon_audit_selective_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 420) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

// An ORDINARY plan: dialogue, movement, a prop. Nothing a model needs to read.
const ORDINARY = {
  tactical_move: 'press the question in the open',
  state_change_precondition: 'Julian has not yet crossed the floor.',
  state_change: 'Julian crosses the floor and sets the folded sash on the table between them',
  forces_choice: 'forces Lirael to choose between taking it and leaving it',
  branch_a: 'take it', branch_b: 'leave it',
  event_slots: { precondition: 'Julian and Lirael are present', actor: 'Julian',
    action: 'crosses the floor and sets down the sash', target: 'Lirael',
    exit_state: 'the sash lies on the table between them', mechanism_grounding: 'ordinary' }
};

(async () => {
  console.log('=== SELECTIVE CANON AUDITOR INTEGRATION PROOF (zero dispatches, $0) ===');
  const { durable } = loadFixtures();
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });

  const seen = [];
  let auditReply = { verdict: 'pass', violations: [] };
  let unreachable = false;
  let wrongModelReply = false, missingModelReply = false, retryReply = false;
  gate.stub('/api/proxy', async (req) => {
    let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    seen.push({ pathname: '/api/proxy', body: b });
    if (unreachable) return { __gateStatus: 503, error: 'upstream unavailable' };
    if (missingModelReply) return { choices: [{ message: { content: '{"verdict":"pass","violations":[]}' } }],
      usage: { prompt_tokens: 3200, completion_tokens: 90 },
      _orchestration: { model: 'grok-4.3', upstreamAttempts: 1 } };   // no resolvedModel at all
    if (retryReply) return { choices: [{ message: { content: '{"verdict":"pass","violations":[]}' } }],
      usage: { prompt_tokens: 3200, completion_tokens: 90 },
      _orchestration: { model: 'grok-4.3', resolvedModel: 'grok-4.3', upstreamAttempts: 3 } };
    if (wrongModelReply) return { choices: [{ message: { content: '{"verdict":"pass","violations":[]}' } }],
      usage: { prompt_tokens: 3200, completion_tokens: 90 },
      _orchestration: { model: 'grok-4.3', resolvedModel: 'grok-4-1-fast-non-reasoning', upstreamAttempts: 2 } };
    return { choices: [{ message: { content: JSON.stringify(auditReply) } }],
      usage: { prompt_tokens: 3200, completion_tokens: 90, cost_in_usd_ticks: 53000000 },
      _orchestration: { model: 'grok-4.3', resolvedModel: 'grok-4.3', upstreamAttempts: 1 } };
  });
  // Any OTHER provider endpoint being touched at all is itself a failure.
  ['/api/mistral-proxy', '/api/chatgpt-proxy', '/api/anthropic-proxy'].forEach((ep) => {
    gate.stub(ep, async (req) => { seen.push({ pathname: ep, body: null }); return { content: '{}' }; });
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._canonAuditRiskTrigger && window._canonAuditGate
    && window._buildCanonPacket && window._canonAuditIsEnabled, { timeout: 30000 });

  const run = (plan, opts) => page.evaluate(async (a) => {
    const s = window.state; s.storyId = 'sel-' + Date.now(); s._starterId = 'starter_first_sacrifice';
    s._temptFateDurableConsequences = a.withDurable ? [JSON.parse(JSON.stringify(a.durable))] : [];
    const packet = window._buildCanonPacket(s, { proposal: a.plan });
    const risk = window._canonAuditRiskTrigger(a.plan, packet);
    const t0 = Date.now();
    const verdict = await window._canonAuditGate(a.plan, packet, { skipAudit: !risk.risky });
    return { risk, verdict, latencyMs: Date.now() - t0, factKinds: packet.facts.map((f) => f.kind) };
  }, { plan, durable, withDurable: !!(opts && opts.withDurable) });

  section('1. THE AUDITOR IS ENABLED, AND SELECTIVE');
  ok('the semantic auditor is enabled by default',
    await page.evaluate(() => window._canonAuditIsEnabled()) === true);
  ok('an explicit false still disables it outright',
    await page.evaluate(() => { window._canonAuditEnabled = false; const r = window._canonAuditIsEnabled(); delete window._canonAuditEnabled; return r; }) === false);

  section('2. AN ORDINARY PLAN COSTS NOTHING — ZERO MODEL CALLS');
  const before = seen.length;
  const ord = await run(ORDINARY, { withDurable: false });
  console.log('    trigger reasons: ' + JSON.stringify(ord.risk.reasons));
  ok('an ordinary plan is NOT flagged risky', ord.risk.risky === false, JSON.stringify(ord.risk));
  ok('it is ALLOWED', ord.verdict.allow === true, JSON.stringify(ord.verdict));
  ok('...on the deterministic path, unpaid', ord.verdict.source === 'deterministic' && ord.verdict.paid === false);
  ok('ZERO requests reached the wire — proven at the network boundary, not by a return value',
    seen.length === before, JSON.stringify(seen.slice(before).map((x) => x.pathname)));

  section('3. A RISKY PLAN COSTS EXACTLY ONE CALL, TO grok-4.3 ONLY');
  // Supernatural content wearing an "ordinary" label — the precise gap the deterministic
  // check cannot see, because it stops the moment it reads "ordinary".
  const RISKY = JSON.parse(JSON.stringify(ORDINARY));
  RISKY.state_change = 'Julian draws the memory of the accusation out of Seren and it dissolves';
  RISKY.event_slots.action = 'draws the memory out';
  const b2 = seen.length;
  auditReply = { verdict: 'pass', violations: [] };
  const risky = await run(RISKY, { withDurable: true });
  const calls = seen.slice(b2);
  console.log('    trigger reasons: ' + JSON.stringify(risky.risk.reasons));
  ok('the risky plan IS flagged, and says why', risky.risk.risky === true && risky.risk.reasons.length > 0);
  ok('the deterministic check alone would have MISSED it — it is labelled "ordinary"',
    RISKY.event_slots.mechanism_grounding === 'ordinary'
    && (await page.evaluate((p) => window._detectUngroundedCapability(p, { canonFacts: ['x'] }).flagged, RISKY)) === false);
  ok('EXACTLY ONE request reached the wire', calls.length === 1, JSON.stringify(calls.map((c) => c.pathname)));
  ok('...to /api/proxy, and to no other provider endpoint',
    calls.length === 1 && calls[0].pathname === '/api/proxy');
  ok('...naming grok-4.3 exactly', calls.length === 1 && calls[0].body.preferredModel === 'grok-4.3',
    calls.length === 1 ? String(calls[0].body.preferredModel) : 'n/a');
  ok('...with the resolver bypass, so the proxy\'s internal chain cannot substitute a model',
    calls.length === 1 && calls[0].body._sbModelOverride === 'grok-4.3',
    calls.length === 1 ? String(calls[0].body._sbModelOverride) : 'n/a');
  ok('...with _noFallback, so the proxy runs a ONE-ENTRY chain instead of retrying upstream',
    calls.length === 1 && calls[0].body._noFallback === true,
    calls.length === 1 ? String(calls[0].body._noFallback) : 'n/a');
  ok('...at the CALIBRATED configuration — reasoning high, max_tokens 2000',
    calls.length === 1 && calls[0].body.reasoningEffort === 'high' && calls[0].body.max_tokens === 2000,
    calls.length === 1 ? JSON.stringify({ e: calls[0].body.reasoningEffort, m: calls[0].body.max_tokens }) : 'n/a');
  ok('a passing audit ALLOWS the plan', risky.verdict.allow === true && risky.verdict.source === 'audit');

  section('4. A DETERMINISTIC REJECTION IS FINAL — A MODEL PASS CANNOT OVERTURN IT');
  const UNGROUNDED = JSON.parse(JSON.stringify(ORDINARY));
  UNGROUNDED.event_slots.mechanism_grounding = 'the Veil-Sight gift that lets her read the dead';
  UNGROUNDED.state_change = 'Lirael reads the dead and names the accuser';
  const b3 = seen.length;
  auditReply = { verdict: 'pass', violations: [] };     // the model says yes; it must not matter
  const det = await run(UNGROUNDED, { withDurable: false });
  ok('it is flagged risky (a non-ordinary mechanism is an asserted capability)', det.risk.risky === true);
  ok('it is REJECTED on the deterministic path', det.verdict.allow === false && det.verdict.source === 'deterministic',
    JSON.stringify(det.verdict).slice(0, 200));
  ok('and NO model call was made at all — the gate returned before dispatch',
    seen.length === b3, JSON.stringify(seen.slice(b3).map((x) => x.pathname)));
  ok('so a model "pass" is structurally incapable of overriding a deterministic rejection',
    det.verdict.allow === false);

  section('5. A VIOLATION ROUTES INTO THE EXISTING BOUNDED RETRY — NO NEW LOOP');
  const b4 = seen.length;
  auditReply = { verdict: 'violation', violations: [{ category: 'unsupported_capability',
    claim: RISKY.state_change, citedFactIds: ['neg_4'], why: 'the rite has no machinery for extracting memories' }] };
  const viol = await run(RISKY, { withDurable: true });
  ok('the violation is returned as a rejection, with its citation preserved',
    viol.verdict.allow === false && viol.verdict.source === 'audit'
    && (viol.verdict.violations[0].citedFactIds || []).length > 0, JSON.stringify(viol.verdict).slice(0, 200));
  ok('ONE audit for ONE candidate plan — a rejection does not re-audit the same plan',
    seen.slice(b4).length === 1, JSON.stringify(seen.slice(b4).map((x) => x.pathname)));
  // The retry is the CALLER's, and it is bounded there. Prove the contract the caller relies on.
  const src = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  ok('the gate signals rejection through __plannerFunctionRejected, the existing retry contract',
    /__plannerFunctionRejected: true, __canonAuditBlocked: true/.test(src));
  ok('and the call site introduces no retry loop of its own',
    !/while\s*\([^)]*canonAudit/i.test(src) && !/for\s*\([^)]*canonAudit/i.test(src));

  section('6. GROK UNAVAILABLE ⇒ RESUMABLE, NEVER SUBSTITUTED');
  const b5 = seen.length;
  // _runCanonAudit calls the MODULE-SCOPED _callTieredProvider — a window patch cannot reach it
  // (the same trap noted in this repo's own harness rules). Simulate unavailability AT THE WIRE,
  // which is both correct and a more faithful reproduction of a provider outage.
  unreachable = true;
  const unavail = await page.evaluate(async (a) => {
    const s = window.state; s._starterId = 'starter_first_sacrifice';
    s._temptFateDurableConsequences = [JSON.parse(JSON.stringify(a.durable))];
    const packet = window._buildCanonPacket(s, { proposal: a.plan });
    return await window._canonAuditGate(a.plan, packet, {});
  }, { plan: RISKY, durable });
  unreachable = false;
  ok('an unavailable auditor FAILS CLOSED — it is not an approval',
    unavail.allow === false && unavail.source === 'audit-unavailable', JSON.stringify(unavail).slice(0, 200));
  ok('...and is preserved for review so the generation is resumable',
    unavail.preserveForReview === true);
  ok('...and NO other provider was tried as a substitute',
    !seen.slice(b5).some((x) => x.pathname !== '/api/proxy'), JSON.stringify(seen.slice(b5).map((x) => x.pathname)));

  section('7. THE TRIGGERS ROMAN SPECIFIED ALL FIRE');
  // RELEVANCE, NOT COEXISTENCE (Roman 2026-09-25). The first version fired whenever ANY durable
  // consequence existed, so one permanent Tempt Fate change made every later ordinary scene paid,
  // forever — unconditional routing wearing selective clothing. This control previously CODIFIED
  // that bug by expecting an ordinary plan plus a durable record to trigger. It now asserts the
  // opposite, which is the actual policy.
  const TOUCHES = JSON.parse(JSON.stringify(ORDINARY));
  TOUCHES.state_change = 'The registrar asks the assembly what they recall of the ceremony and the accusation';
  TOUCHES.event_slots.action = 'asks what they recall of the ceremony';
  const cases = [
    ['asserted supernatural mechanism', UNGROUNDED, false, true],
    ['supernatural content mislabelled ordinary', RISKY, false, true],
    ['a plan that TOUCHES the committed change', TOUCHES, true, true],
    ['ordinary plan while an UNTOUCHED durable consequence exists — must NOT audit', ORDINARY, true, false]
  ];
  for (const [label, plan, withDurable, expectRisky] of cases) {
    const r = await page.evaluate((a) => {
      const s = window.state; s._starterId = 'starter_first_sacrifice';
      s._temptFateDurableConsequences = a.withDurable ? [JSON.parse(JSON.stringify(a.durable))] : [];
      const packet = window._buildCanonPacket(s, { proposal: a.plan });
      return window._canonAuditRiskTrigger(a.plan, packet);
    }, { plan, durable, withDurable });
    ok((expectRisky ? 'trigger FIRES: ' : 'trigger stays SILENT: ') + label,
      r.risky === expectRisky, JSON.stringify(r));
  }
  // And the vocabulary must not fire on First Sacrifice's own ordinary language. A story whose
  // premise is a wish rite with a ceremonially SEALED Sacrificiant will say these words constantly.
  const ORDINARY_WORDS = JSON.parse(JSON.stringify(ORDINARY));
  ORDINARY_WORDS.state_change = 'Lirael remembers her own First Sacrifice and confesses she still fears the seal';
  ORDINARY_WORDS.event_slots.action = 'remembers and confesses';
  const ow = await page.evaluate((a) => {
    const s = window.state; s._starterId = 'starter_first_sacrifice'; s._temptFateDurableConsequences = [];
    return window._canonAuditRiskTrigger(a.plan, window._buildCanonPacket(s, { proposal: a.plan }));
  }, { plan: ORDINARY_WORDS });
  ok('ordinary story words (wish / fate / seal / remember / confess) do NOT trigger an audit',
    ow.risky === false, JSON.stringify(ow));
  const nullTrig = await page.evaluate(() => window._canonAuditRiskTrigger(null, null));
  const throwTrig = await page.evaluate(() => {
    // A packet whose accessors throw — the trigger must AUDIT, never silently skip.
    const hostile = { get facts() { throw new Error('boom'); }, invalidated: [] };
    return window._canonAuditRiskTrigger({ state_change: 'x', event_slots: {} }, hostile);
  });
  ok('a null proposal is simply not risky (nothing to audit)', nullTrig.risky === false, JSON.stringify(nullTrig));
  ok('but a trigger that THROWS audits rather than skipping — skipping is the costly failure',
    throwTrig.risky === true && /threw/.test((throwTrig.reasons || []).join(' ')), JSON.stringify(throwTrig));

  section('7a. A PARAPHRASED CONTRADICTION MUST STILL TRIGGER');
  // THE CASE LEXICAL OVERLAP CANNOT SEE. The durable fact says the assembly FORGOT the ceremony
  // and its accusations. This plan has the Dohkar resume questioning her about what transpired
  // before the gathered witnesses — a flat contradiction that shares NO 5+ character word with the
  // fact it contradicts. Relying on shared spelling would wave through exactly the plans the
  // auditor exists to catch.
  const PARAPHRASE = JSON.parse(JSON.stringify(ORDINARY));
  PARAPHRASE.state_change = 'The presiding Dohkar resumes questioning her about what transpired before the gathered witnesses';
  PARAPHRASE.event_slots.action = 'resumes questioning her about what transpired';
  PARAPHRASE.event_slots.target = 'the gathered witnesses';
  const paraTrig = await page.evaluate((a) => {
    const s = window.state; s._starterId = 'starter_first_sacrifice';
    s._temptFateDurableConsequences = [JSON.parse(JSON.stringify(a.durable))];
    const packet = window._buildCanonPacket(s, { proposal: a.plan });
    // Prove the lexical test alone really does fail here, so the structured signal is load-bearing.
    const factTexts = packet.facts.filter((f) => f.kind === 'dc' || f.kind === 'know' || f.kind === 'dur').map((f) => f.text);
    const planText = [a.plan.state_change, a.plan.event_slots.action, a.plan.event_slots.target].join(' ').toLowerCase();
    const lexicalHit = factTexts.some((t) => t.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((w) => w.length >= 5).some((w) => planText.indexOf(w) !== -1));
    return { trig: window._canonAuditRiskTrigger(a.plan, packet, s), lexicalHit };
  }, { plan: PARAPHRASE, durable });
  console.log('    trigger reasons: ' + JSON.stringify(paraTrig.trig.reasons));
  ok('RED PROOF — no durable fact shares a 5+ character word with this plan',
    paraTrig.lexicalHit === false, 'lexical overlap found; this fixture no longer proves the gap');
  ok('...yet the paraphrased contradiction STILL triggers, via structured signals',
    paraTrig.trig.risky === true, JSON.stringify(paraTrig.trig));
  ok('...and says which structured signal fired, not just that something did',
    /party a committed rupture affected|sensitive act while that rupture stands/.test(paraTrig.trig.reasons.join(' ')),
    JSON.stringify(paraTrig.trig.reasons));

  section('7b. THE ANSWER IS ONLY ACCEPTED FROM grok-4.3');
  // Asking for grok-4.3 is not evidence grok-4.3 answered — the grok-4.7 run proved that. The
  // auditor now checks the RESOLVED model the proxy reports and refuses anything else.
  wrongModelReply = true;
  const b6 = seen.length;
  const imposter = await run(RISKY, { withDurable: true });
  wrongModelReply = false;
  ok('a reply served by a DIFFERENT model is refused, not accepted',
    imposter.verdict.allow === false, JSON.stringify(imposter.verdict).slice(0, 220));
  ok('...and it fails closed as unavailable rather than as a canon violation',
    imposter.verdict.source === 'audit-unavailable'
    && /not the calibrated grok-4\.3/.test(imposter.verdict.reason || ''), JSON.stringify(imposter.verdict).slice(0, 220));
  ok('...having made exactly one call', seen.slice(b6).length === 1);
  // MISSING identity is not weaker than WRONG identity — an unidentified upstream must not be able
  // to supply a binding verdict either.
  missingModelReply = true;
  const anon = await run(RISKY, { withDurable: true });
  missingModelReply = false;
  ok('a reply with NO resolvedModel is refused too — absent is treated exactly like wrong',
    anon.verdict.allow === false && anon.verdict.source === 'audit-unavailable'
    && /ABSENT/.test(anon.verdict.reason || ''), JSON.stringify(anon.verdict).slice(0, 220));
  // The one-call guarantee is enforced, not merely logged.
  retryReply = true;
  const retried = await run(RISKY, { withDurable: true });
  retryReply = false;
  ok('a reply reporting MORE THAN ONE upstream attempt is refused — the _noFallback contract is enforced',
    retried.verdict.allow === false && /upstream attempts/.test(retried.verdict.reason || ''),
    JSON.stringify(retried.verdict).slice(0, 220));

  section('7c. TELEMETRY BELONGS TO ITS OWN AUDIT');
  // It used to live in ambient globals written only AFTER a success and never cleared, so a
  // failure following a success inherited the previous audit's cost and attempt count.
  const good = await run(RISKY, { withDurable: true });
  ok('a successful audit carries its own telemetry on the verdict',
    good.verdict.telemetry && typeof good.verdict.telemetry.realizedUsd === 'number'
    && good.verdict.telemetry.upstreamAttempts === 1, JSON.stringify(good.verdict.telemetry));
  ok('...sourced from the provider\'s own reported cost', good.verdict.telemetry.costSource === 'provider');
  unreachable = true;
  const afterFail = await run(RISKY, { withDurable: true });
  unreachable = false;
  ok('RED PROOF — a FAILED audit right after a successful one inherits NOTHING',
    afterFail.verdict.telemetry === null, JSON.stringify(afterFail.verdict.telemetry));
  ok('...and a skipped (ordinary) plan reports no telemetry either, not a stale receipt',
    (await run(ORDINARY, { withDurable: false })).verdict.telemetry === null);

  section('8. CONTAINMENT');
  ok('no request ever reached a real provider', gate.trackedCalls().filter((c) => c.real).length === 0);
  ok('and no endpoint other than /api/proxy was touched in the whole run',
    !seen.some((x) => x.pathname !== '/api/proxy'), JSON.stringify([...new Set(seen.map((x) => x.pathname))]));

  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({ results, wire: seen }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(86));
  console.log('  ' + passed + '/' + results.length + ' assertions passed');
  if (passed !== results.length) console.log('  FAILED: ' + results.filter((r) => !r.pass).map((r) => r.name).join(' | '));
  await browser.close();
  process.exit(passed === results.length ? 0 : 1);
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
