// CANON AUDIT CONTROL — an audit, never a repair. Fully stubbed; NO live auditor call.
//
// Roman 2026-09-24. The guarantee under test is deliberately narrow and is NOT "canon safety":
// unsupported new metaphysics should be stopped before author spend, while ordinary creative
// invention stays possible.
//
// PRIMARY RED FIXTURE is the REAL failed Scene B planner proposal, byte-for-byte off disk.
//
// usage: node _canon_audit_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_canon_audit_control_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });
const RED = JSON.parse(fs.readFileSync(path.join(__dirname, '_tempt_fate_fixtures', 'scene_b_2026-09-24_08-41-30', 'scene_b_planner_response.json'), 'utf8'));
const DURABLE = JSON.parse(fs.readFileSync(path.join(__dirname, '_tempt_fate_fixtures', 'run_2026-09-24_02-11-02_scene_a', 'outcome_record.json'), 'utf8')).durableConsequences[0];

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 420) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

(async () => {
  console.log('=== CANON AUDIT CONTROL (dry; zero provider dispatches; NO live auditor call) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && window._buildCanonPacket && window._canonDeterministicCheck
    && window._buildCanonAuditPrompt && window._validateCanonAuditResponse && window._canonAuditGate, { timeout: 30000 });

  const packet = await page.evaluate((d) => {
    window.state.storyId = 'canon-' + Date.now();
    window.state._starterId = 'starter_first_sacrifice';
    window.state._temptFateDurableConsequences = [d];
    return window._buildCanonPacket(window.state);
  }, DURABLE);
  fs.writeFileSync(path.join(OUT_DIR, 'canon_packet.json'), JSON.stringify(packet, null, 2));
  console.log('    packet: ' + packet.facts.length + ' facts (' + packet.negatives.length + ' negative), invalidated plans: ' + packet.invalidated.length);

  section('1. THE PACKET IS BUILT FROM THE STORY\'S OWN CANON (req 2)');
  ok('the packet carries NEGATIVE world truths — the ones a proposal can violate', packet.negatives.length > 0, JSON.stringify(packet.negatives.slice(0, 1)));
  ok('...including the one the failed Scene B walked through: a wish produces no visible effect',
    packet.negatives.some((f) => /NO visible magical effect/i.test(f.text)), JSON.stringify(packet.negatives.map((f) => f.id)));
  ok('...and the alignment-sense truth that forecloses mind-reading',
    packet.facts.some((f) => /do NOT read thoughts|NOT a psychic mind-read/i.test(f.text)), 'not found');
  ok('the packet carries the committed consequence and its invalidatedPlans',
    packet.facts.some((f) => f.kind === 'dc') && packet.invalidated.length > 0, JSON.stringify(packet.invalidated));
  ok('every fact is ID-addressed so a finding can be resolved back to it (req 3, 5)',
    packet.facts.every((f) => typeof f.id === 'string' && f.id.length > 2) && packet.ids.length === packet.facts.length);

  section('2. DETERMINISTIC FIRST — never pay for what is locally decidable (req 8)');
  const detRed = await page.evaluate((a) => window._canonDeterministicCheck(a.RED, a.packet), { RED, packet });
  ok('the REAL Scene B proposal is rejected DETERMINISTICALLY — no auditor call needed at all',
    detRed.decided === true && detRed.violations.length > 0, JSON.stringify(detRed));
  ok('...classified as unsupported_capability, with the local reason stated',
    detRed.violations[0].category === 'unsupported_capability' && /decided locally/.test(detRed.violations[0].why), JSON.stringify(detRed.violations[0]));
  const detBogusId = await page.evaluate((a) => window._canonDeterministicCheck(
    Object.assign({}, a.RED, { mechanism_grounding: 'granted by [wt_99] and [neg_42]' }), a.packet), { RED, packet });
  ok('a grounding citing NONEXISTENT canon ids is rejected locally, free', detBogusId.decided === true && detBogusId.violations[0].citedFactIds.length === 2, JSON.stringify(detBogusId.violations[0]));
  const detOrdinary = await page.evaluate((a) => window._canonDeterministicCheck(
    { state_change: 'Julian asks Lirael what she is not saying', event_slots: { mechanism_grounding: 'ordinary' } }, a.packet), { packet });
  ok('an ORDINARY event is NOT decided locally — it passes through to the semantic layer, unpaid so far',
    detOrdinary.decided === false, JSON.stringify(detOrdinary));

  const gateRed = await page.evaluate((a) => window._canonAuditGate(a.RED, a.packet), { RED, packet });
  ok('THE GATE refuses the real Scene B proposal WITHOUT paying (paid=false)',
    gateRed.allow === false && gateRed.paid === false && gateRed.source === 'deterministic', JSON.stringify(gateRed));
  ok('THE AUTHOR IS NEVER DISPATCHED for the retained Scene B red fixture', gateRed.allow === false, JSON.stringify(gateRed.reason));

  section('3. THE AUDIT PROMPT ASKS FOR CLASSIFICATION ONLY (reqs 3, 4)');
  const prompt = await page.evaluate((a) => {
    const p = window._buildCanonAuditPrompt(a.RED, a.packet); return p.sys + '\n' + p.usr;
  }, { RED, packet });
  fs.writeFileSync(path.join(OUT_DIR, 'audit_prompt.txt'), prompt);
  ok('it forbids rewriting, proposing prose, or saying what should happen instead (req 4)',
    /may NOT rewrite the plan, propose replacement events, suggest prose/.test(prompt));
  ok('it forbids inventing canon or using outside knowledge', /may NOT invent canon/.test(prompt) && /any other story or from the real world/.test(prompt));
  ok('it requires every violation to cite a supplied fact id (req 5)', /MUST cite at least one supplied fact by its id/.test(prompt));
  ok('it enumerates exactly the defined categories (req 3)',
    ['unsupported_capability', 'new_metaphysics', 'contradicted_knowledge', 'rewritten_history', 'invalidated_objective'].every((c) => prompt.indexOf(c) !== -1));
  ok('it protects ordinary creative invention explicitly — dialogue, movement, tactics, consequence',
    /Creative invention of dialogue, movement, tactics and consequence is the planner's JOB/.test(prompt));
  // The completeness claim is now CONDITIONAL (Roman 2026-09-24): an unconditional "complete and
  // only canon" over a truncated packet manufactures false violations, because the fact that
  // AUTHORISES a capability may simply have been cut. First Sacrifice fits under both caps, so
  // here the honest claim is completeness; the truncated branch is proven in the full-flow control.
  ok('the packet declares completeness ONLY because nothing was actually omitted',
    packet.truncated === false && /the complete canon for this scene — nothing was omitted/.test(prompt),
    'truncated=' + packet.truncated);
  ok('...and the packet reports its own truncation state rather than leaving it implicit',
    typeof packet.truncated === 'boolean' && typeof packet.omittedTotal === 'number',
    JSON.stringify({ t: packet.truncated, o: packet.omittedTotal }));

  section('4. RESPONSE VALIDATION — fabricated citations and rewrite attempts (req 5, 4)');
  const good = { verdict: 'violation', violations: [{ category: 'unsupported_capability',
    claim: "The presiding Dohkar draws the memory of the accusation from Seren's mind", citedFactIds: [packet.negatives[0].id],
    why: 'the cited truth forecloses this' }] };
  const vs = await page.evaluate((a) => ({
    good: window._validateCanonAuditResponse(a.good, a.packet, a.RED),
    fabricatedId: window._validateCanonAuditResponse({ verdict: 'violation', violations: [{ category: 'unsupported_capability', claim: a.good.violations[0].claim, citedFactIds: ['wt_999'], why: 'x' }] }, a.packet, a.RED),
    noCitation: window._validateCanonAuditResponse({ verdict: 'violation', violations: [{ category: 'new_metaphysics', claim: a.good.violations[0].claim, citedFactIds: [], why: 'x' }] }, a.packet, a.RED),
    fabricatedClaim: window._validateCanonAuditResponse({ verdict: 'violation', violations: [{ category: 'new_metaphysics', claim: 'the moon splits and a choir of bells announces the verdict', citedFactIds: [a.packet.negatives[0].id], why: 'x' }] }, a.packet, a.RED),
    rewrote: window._validateCanonAuditResponse({ verdict: 'violation', violations: a.good.violations, rewritten_plan: { state_change: 'something better' } }, a.packet, a.RED),
    badCategory: window._validateCanonAuditResponse({ verdict: 'violation', violations: [{ category: 'vibes', claim: a.good.violations[0].claim, citedFactIds: [a.packet.negatives[0].id], why: 'x' }] }, a.packet, a.RED)
  }), { good, packet, RED });
  ok('a well-formed, properly cited finding VALIDATES', vs.good.valid === true, JSON.stringify(vs.good.errors));
  ok('a FABRICATED fact id fails validation (req 5)', vs.fabricatedId.valid === false && /outside the supplied packet/.test(vs.fabricatedId.errors.join()), JSON.stringify(vs.fabricatedId.errors));
  ok('a finding citing NOTHING fails validation', vs.noCitation.valid === false, JSON.stringify(vs.noCitation.errors));
  ok('a finding quoting text that is NOT in the plan fails validation', vs.fabricatedClaim.valid === false && /does not appear in the proposed plan/.test(vs.fabricatedClaim.errors.join()), JSON.stringify(vs.fabricatedClaim.errors));
  ok('an auditor that tries to REWRITE the plan fails validation (req 4)', vs.rewrote.valid === false && /never rewrite/.test(vs.rewrote.errors.join()), JSON.stringify(vs.rewrote.errors));
  ok('an undefined category fails validation', vs.badCategory.valid === false, JSON.stringify(vs.badCategory.errors));

  // HONEST LIMIT (Roman 2026-09-24, correcting an overclaim). Citation checking proves the fact
  // EXISTS and the claim APPEARS in the plan. It does NOT prove the cited fact supports the
  // finding. This asserts the limit rather than hiding it: an irrelevant-but-real citation passes.
  const irrelevant = await page.evaluate((a) => {
    const nonNeg = a.packet.facts.filter((f) => f.kind !== 'neg')[0];
    return { usedId: nonNeg && nonNeg.id, usedText: nonNeg && nonNeg.text.slice(0, 70),
      res: window._validateCanonAuditResponse({ verdict: 'violation', violations: [{
        category: 'unsupported_capability',
        claim: "The presiding Dohkar draws the memory of the accusation from Seren's mind",
        citedFactIds: [nonNeg && nonNeg.id], why: 'an assertion that does not follow from this fact' }] }, a.packet, a.RED) };
  }, { packet, RED });
  ok('KNOWN LIMIT — a REAL but logically IRRELEVANT citation still validates: the check proves the fact exists, not that it supports the finding',
    irrelevant.res.valid === true, JSON.stringify(irrelevant.res.errors));
  console.log('      (cited [' + irrelevant.usedId + '] "' + irrelevant.usedText + '…" to support a mind-extraction finding — accepted, because resolvable is not the same as grounded)');

  section('5. FAIL CLOSED — uncertainty never becomes approval (req 7)');
  const closed = await page.evaluate(async (a) => ({
    cannotDecide: await window._canonAuditGate(a.plan, a.packet, { injectRaw: { verdict: 'cannot_decide', uncertainty: 'the canon does not say whether a Dohkar may do this' } }),
    invalid: await window._canonAuditGate(a.plan, a.packet, { injectRaw: { verdict: 'violation', violations: [{ category: 'other', claim: 'nope', citedFactIds: ['wt_999'], why: 'x' }] } }),
    pass: await window._canonAuditGate(a.plan, a.packet, { injectRaw: { verdict: 'pass', violations: [] } })
  }), { plan: { state_change: 'Julian asks Lirael what she is not saying', event_slots: { mechanism_grounding: 'ordinary' } }, packet });
  ok('verdict "cannot_decide" BLOCKS and preserves the plan for review', closed.cannotDecide.allow === false && closed.cannotDecide.preserveForReview === true, JSON.stringify(closed.cannotDecide));
  ok('an INVALID audit response blocks too — a broken auditor is not an approval', closed.invalid.allow === false && closed.invalid.source === 'audit-invalid', JSON.stringify(closed.invalid));
  ok('a clean PASS allows the author', closed.pass.allow === true, JSON.stringify(closed.pass));

  section('6. GREEN — ordinary invention stays possible (the narrow guarantee)');
  const greens = await page.evaluate(async (a) => {
    const g = async (plan) => await window._canonAuditGate(plan, a.packet, { injectRaw: { verdict: 'pass', violations: [] } });
    return {
      dialogue: await g({ state_change: 'Julian names the gap aloud and asks Lirael what she is not saying', event_slots: { actor: 'Julian', action: 'asks', target: 'Lirael', mechanism_grounding: 'ordinary' } }),
      evidence: await g({ state_change: 'The torn mouth-band is found and nobody can explain it', event_slots: { actor: 'the assembly', action: 'finds', target: 'the torn band', mechanism_grounding: 'ordinary' } }),
      records: await g({ state_change: "The registrar's ledger records a rite nobody remembers attending", event_slots: { actor: 'the registrar', action: 'reads aloud', target: 'the assembly', mechanism_grounding: 'ordinary' } }),
      confusion: await g({ state_change: 'The assembly disperses, unable to say why it convened', event_slots: { actor: 'the assembly', action: 'disperses', target: 'none', mechanism_grounding: 'ordinary' } }),
      suspended: await g({ state_change: 'The presiding Dohkar suspends the proceeding, unable to state its cause', event_slots: { actor: 'the presiding Dohkar', action: 'suspends', target: 'the proceeding', mechanism_grounding: 'ordinary' } }),
      // An EXPLICITLY ESTABLISHED supernatural capability must pass: alignment-sense IS canon here.
      establishedPower: await g({ state_change: 'Lirael senses the misalignment in the Dohkar and says so', event_slots: { actor: 'Lirael', action: 'senses misalignment', target: 'the Dohkar', mechanism_grounding: 'ALIGNMENT-SENSE (the First Favored gift): they perceive ALIGNMENT' } })
    };
  }, { packet });
  ['dialogue', 'evidence', 'records', 'confusion', 'suspended'].forEach((k) => {
    ok('GREEN — ' + k + ': ordinary invention is allowed', greens[k].allow === true, JSON.stringify(greens[k]));
  });
  ok('GREEN — an EXPLICITLY ESTABLISHED supernatural capability (alignment-sense) passes',
    greens.establishedPower.allow === true, JSON.stringify(greens.establishedPower));

  section('7. CROSS-STORY LEAKAGE AND HISTORY (reqs 8, 10)');
  const leak = await page.evaluate((a) => {
    // A capability from ANOTHER story must not ground an event here: the packet is this story's.
    return window._canonDeterministicCheck(
      { state_change: 'The Chorus merges their minds across the clearing',
        event_slots: { mechanism_grounding: 'the Chorus is the collective mind of all individuals aligned with the resonance field' } }, a.packet);
  }, { packet });
  ok('a capability established in ANOTHER story does not ground an event in this one',
    leak.decided === true && /resolves to nothing in the supplied canon/.test(leak.violations[0].why), JSON.stringify(leak.violations));

  const historyCases = await page.evaluate(async (a) => {
    const mk = (cls) => { const c = JSON.parse(JSON.stringify(a.DURABLE)); c.ruptureClass = cls; return c; };
    const withClass = (cls) => { window.state._temptFateDurableConsequences = [mk(cls)]; return window._buildCanonPacket(window.state); };
    return { memoryPacket: withClass('memory_perception'), historyPacket: withClass('history_rewrite') };
  }, { DURABLE });
  ok('a committed Tempt change is carried into the packet as canon, able to override an earlier present-world fact',
    historyCases.memoryPacket.facts.some((f) => f.kind === 'dc' && /memory_perception/.test(f.text)), 'dc fact missing');
  ok('...and the packet records the declared rupture CLASS, so history is only reopened when a history_rewrite actually occurred',
    historyCases.historyPacket.facts.some((f) => f.kind === 'dc' && /history_rewrite/.test(f.text)), 'class not carried');

  section('8. SEMANTIC REJECTION DOES NOT FALL THROUGH TO A MORE PERMISSIVE MODEL');
  const noFallthrough = await page.evaluate(() => ({
    auditPassesNoValidator: /validateContent/.test(window._runCanonAudit.toString()) === false,
    gateReturnsOnViolation: /source: 'audit'/.test(window._canonAuditGate.toString())
  }));
  ok('the auditor passes NO opts.validateContent, so _callTieredProvider cannot cascade on a semantic rejection',
    noFallthrough.auditPassesNoValidator === true, JSON.stringify(noFallthrough));
  ok('a violation verdict RETURNS — it is never retried against the next tier', noFallthrough.gateReturnsOnViolation === true);

  section('9. THE ROLE IS CENSUSED BEFORE IT CAN DISPATCH (req 9)');
  const auditSrc = fs.readFileSync(path.join(__dirname, '_tempt_fate_memory_erasure_cost_audit.mjs'), 'utf8');
  ok('canonAudit is in the token census, the role ceiling, and the tier-model allowlist',
    /canonAudit: \{ in: 2600, out: 700 \}/.test(auditSrc) && /canonAudit: 3 \}/.test(auditSrc)
    && /canonAudit: \['ministral-8b-2512', 'grok-4-1-fast-reasoning', 'gpt-4o-mini'\]/.test(auditSrc));
  ok('...and reserved on both scenes', /canonAudit-A/.test(auditSrc) && /canonAudit-B/.test(auditSrc));
  ok('no broad endpoint allowance — it uses the same default tier chain, declaring no opts.tiers override',
    await page.evaluate(() => /opts\.tiers/.test(window._runCanonAudit.toString()) === false));

  section('CONTAINMENT');
  ok('ZERO provider dispatches — no live auditor call was made in this pass', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('CANON AUDIT CONTROL: ' + passed + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
