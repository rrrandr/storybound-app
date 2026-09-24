// CANON AUDIT — FULL-FLOW PRODUCTION WIRING CONTROL
//
// Roman, 2026-09-24: "The semantic canon auditor is currently dead production code... the new
// control directly calls the isolated gate itself. It does not prove that a real planner response
// passes through it."
//
// He was right. _canonAuditGate and _buildCanonPacket were defined, exported, censused and green
// in isolation, with NO production call site. This control exists so that can never be claimed
// again: it drives the REAL _runCGScreenplayGen path, stubs the PLANNER and AUDITOR at the
// network layer, and counts REAL AUTHOR DISPATCHES. Nothing here calls the gate directly.
//
// Layer identification is by request body shape, never by endpoint:
//   planner  — asks for "state_change" / "tactical_move"
//   auditor  — system prompt contains "CANON AUDITOR"
//   author   — asks for "decisionGateBeatIdx"
//
// Zero provider dispatches. No live auditor call.
//
// usage: node _canon_audit_full_flow_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import { buildScheduleAwareStubResponse } from './_tempt_fate_stub_plan_builder.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_canon_audit_full_flow_out');
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

// THE RETAINED SUPERNATURAL CLAIM, carried verbatim, relabelled "ordinary" — the exact bypass
// Roman identified. Carried INTO a base that already satisfies the earlier gates, so the only
// thing under test is whether the canon audit sits between the planner and the author.
const RED_CLAIM = RED.state_change;   // "The presiding Dohkar draws the memory of the accusation from Seren's mind, ..."
const RED_ORDINARY = (base) => Object.assign({}, base, {
  state_change: String(base.state_change || '') + ' — ' + RED_CLAIM,
  event_slots: Object.assign({}, base.event_slots, RED.event_slots, { mechanism_grounding: 'ordinary' })
});
// An ordinary plan that needs no special capability: the base stub, honestly labelled.
const LEGIT_ORDINARY = (base) => Object.assign({}, base, {
  event_slots: Object.assign({}, base.event_slots, { mechanism_grounding: 'ordinary' })
});
// The retained proposal with NO grounding at all — the deterministic short-circuit case.
const RED_NO_GROUNDING = (base) => Object.assign({}, base, {
  state_change: String(base.state_change || '') + ' — ' + RED_CLAIM,
  event_slots: Object.assign({}, base.event_slots, RED.event_slots, { mechanism_grounding: undefined })
});

(async () => {
  console.log('=== CANON AUDIT FULL-FLOW CONTROL (dry; zero provider dispatches) ===');
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  const page = await ctx.newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });

  // Scenario switches, flipped per run.
  let plannerReply = null, auditorReply = null;
  const seen = { planner: 0, auditor: 0, author: 0, other: 0 };
  const classify = (b) => {
    const sys = ((b.messages || []).find((m) => m.role === 'system') || {}).content || '';
    const all = JSON.stringify(b);
    if (sys.indexOf('CANON AUDITOR') !== -1) return 'auditor';
    if (all.indexOf('decisionGateBeatIdx') !== -1) return 'author';
    if (all.indexOf('state_change') !== -1 || all.indexOf('tactical_move') !== -1) return 'planner';
    return 'other';
  };
  const respond = async (req) => {
    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const kind = classify(b);
    seen[kind]++;
    if (kind === 'auditor') return { content: typeof auditorReply === 'string' ? auditorReply : JSON.stringify(auditorReply) };
    if (kind === 'planner') {
      // The open row's own validator (_validateLocalObjective) demands local_objective,
      // posture_read, present cast, actor and reserved-event statuses. The shared schedule-aware
      // builder satisfies those from the REAL prompt; the scenario's canon-relevant fields are
      // overlaid on top, so what varies between runs is only what this control is testing.
      const sys = ((b.messages || []).find((m) => m.role === 'system') || {}).content || '';
      const usr = ((b.messages || []).find((m) => m.role === 'user') || {}).content || '';
      const base = buildScheduleAwareStubResponse(sys, usr, false);
      // plannerReply is a FUNCTION of the base here, not a replacement for it. The pre-existing
      // gates (local-objective validation, the aftermath-lane check) run BEFORE the canon audit,
      // so a proposal that fails them never reaches the audit at all — replacing the base wholesale
      // would test those gates instead of this one.
      return { content: JSON.stringify(plannerReply(base)) };
    }
    if (kind === 'author') return { content: JSON.stringify({ beats: [{ idx: 0, kind: 'narration', text: 'x', speaker: null }], visualState: {}, decisionGateBeatIdx: 0, hardBeats: [] }) };
    return { content: null };
  };
  gate.stub('/api/mistral-proxy', respond);
  gate.stub('/api/proxy', respond);
  gate.stub('/api/chatgpt-proxy', async (req) => ({ choices: [{ message: { content: (await respond(req)).content } }] }));

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state && window._runCGScreenplayGen && window._renderBakedScene1
    && window._buildCanonPacket && window._canonAuditGate, { timeout: 30000 });

  async function setup() {
    await page.evaluate((d) => {
      const s = window.state;
      s.storyId = 'flow-' + Date.now();
      s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
      s.gender = 'Female'; s.loveInterest = 'Male'; s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
      s.turnCount = 1; s.scenes = [{ title: 'A', synopsis: 'a', text: 'The clearing holds its silence.', fateCard: null }];
      s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
      s._starterId = 'starter_first_sacrifice'; s._pcLookSkipped = true; s._bakedGenesisUnlocked = true;
      window._devBypass = true; s._intimacyDevMode = true;
      s._temptFateDurableConsequences = [d];
      s._temptOutcomeCommittedProposals = { tfl_1: true };
      s.tempt_fate_invoked_this_turn = false;
      delete s._acceptedPlannerProposal; delete s._canonAuditBlocked; delete s._lastCanonAudit;
    }, DURABLE);
  }

  async function run(label, planner, auditor) {
    plannerReply = planner; auditorReply = auditor;
    seen.planner = seen.auditor = seen.author = seen.other = 0;
    await setup();
    gate.setPhase(label, 40);
    const plan = await page.evaluate(async () => {
      try { return await window._runCGScreenplayGen(1, 'Lirael closes her eyes for a long moment, then opens them again.', ''); }
      catch (e) { return { __threw: String(e && e.message) }; }
    });
    gate.closePhase();
    const st = await page.evaluate(() => ({
      blocked: window.state._canonAuditBlocked || null,
      lastAudit: window.state._lastCanonAudit || null,
      accepted: !!window.state._acceptedPlannerProposal
    }));
    const rec = { label, dispatches: { ...seen }, plan: plan && { rejected: !!plan.__plannerFunctionRejected, canonBlocked: !!plan.__canonAuditBlocked, source: plan.canonAuditSource, reason: plan.reason, beats: plan.beats ? plan.beats.length : 0 }, st };
    fs.writeFileSync(path.join(OUT_DIR, label + '.json'), JSON.stringify(rec, null, 2));
    return rec;
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. THE PRODUCTION CALL SITE EXISTS (the claim that was false before)');
  const src = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  const callSites = src.split('\n').map((l, i) => ({ l: l.trim(), n: i + 1 }))
    .filter((x) => /_canonAuditGate|_buildCanonPacket/.test(x.l) && !/^window\._/.test(x.l) && !/^(async )?function _/.test(x.l) && !x.l.startsWith('//'));
  console.log('    non-definition references: ' + JSON.stringify(callSites.map((x) => 'app.js:' + x.n)));
  ok('_buildCanonPacket has a real production consumer', callSites.some((x) => /var _caPacket = _buildCanonPacket\(state\)/.test(x.l)), JSON.stringify(callSites.map((x) => x.l)));
  ok('_canonAuditGate is AWAITED on the production path', callSites.some((x) => /await _canonAuditGate\(/.test(x.l)), JSON.stringify(callSites.map((x) => x.l)));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. RED FULL-FLOW — supernatural proposal labelled "ordinary", auditor finds a violation (req 8)');
  const packetIds = await page.evaluate((d) => {
    window.state._starterId = 'starter_first_sacrifice'; window.state._temptFateDurableConsequences = [d];
    const p = window._buildCanonPacket(window.state); return { ids: p.ids, negs: p.negatives.map((f) => f.id) };
  }, DURABLE);
  const VIOLATION = { verdict: 'violation', violations: [{
    category: 'unsupported_capability',
    claim: "The presiding Dohkar draws the memory of the accusation from Seren's mind",
    citedFactIds: [packetIds.negs[0]],
    why: 'the cited truth forecloses a visible or extractive operation on a mind' }] };
  const red = await run('red_ordinary_violation', RED_ORDINARY, VIOLATION);
  console.log('    dispatches: ' + JSON.stringify(red.dispatches));
  ok('the planner ran', red.dispatches.planner >= 1, JSON.stringify(red.dispatches));
  ok('an ORDINARY declaration DID reach the semantic auditor — it did not go straight to the author (req 4)',
    red.dispatches.auditor >= 1, JSON.stringify(red.dispatches));
  ok('THE AUTHOR WAS NEVER DISPATCHED — zero author requests (req 8)', red.dispatches.author === 0, JSON.stringify(red.dispatches));
  ok('the generation returned a canon-audit block', red.plan.canonBlocked === true && red.plan.source === 'audit', JSON.stringify(red.plan));
  ok('the proposal and audit result were PRESERVED for review (req 6)',
    !!red.st.blocked && !!red.st.blocked.proposal && !!red.st.blocked.verdict, JSON.stringify(red.st.blocked && Object.keys(red.st.blocked)));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. GREEN FULL-FLOW — legitimate ordinary plan, auditor passes, author dispatches ONCE (req 9)');
  const green = await run('green_ordinary_pass', LEGIT_ORDINARY, { verdict: 'pass', violations: [] });
  console.log('    dispatches: ' + JSON.stringify(green.dispatches));
  ok('the auditor ran on the ordinary plan', green.dispatches.auditor >= 1, JSON.stringify(green.dispatches));
  ok('THE AUTHOR DISPATCHED EXACTLY ONCE (req 9)', green.dispatches.author === 1, JSON.stringify(green.dispatches));
  ok('...and the generation was not blocked', green.plan.canonBlocked !== true, JSON.stringify(green.plan));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. DETERMINISTIC SHORT-CIRCUIT — invalid grounding costs NOTHING (req 3, 10)');
  const bad = await run('deterministic_shortcircuit', RED_NO_GROUNDING, { verdict: 'pass', violations: [] });
  console.log('    dispatches: ' + JSON.stringify(bad.dispatches));
  ok('the AUDITOR was never dispatched — the local check already decided (req 10)', bad.dispatches.auditor === 0, JSON.stringify(bad.dispatches));
  ok('the AUTHOR was never dispatched', bad.dispatches.author === 0, JSON.stringify(bad.dispatches));
  ok('...and the block is attributed to the deterministic layer, unpaid',
    bad.st.lastAudit === null || bad.st.lastAudit.paid === false || bad.plan.rejected === true, JSON.stringify({ last: bad.st.lastAudit, plan: bad.plan }));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. FAIL-CLOSED FULL-FLOW — every undecided path stops before the author (req 6)');
  const undec = await run('cannot_decide', LEGIT_ORDINARY, { verdict: 'cannot_decide', uncertainty: 'canon does not say' });
  ok('cannot_decide → zero author dispatches', undec.dispatches.author === 0 && undec.plan.canonBlocked === true, JSON.stringify(undec.dispatches));
  const invalid = await run('invalid_reply', LEGIT_ORDINARY, { verdict: 'violation', violations: [{ category: 'other', claim: 'not in the plan at all', citedFactIds: ['wt_999'], why: 'x' }] });
  ok('an INVALID audit reply (fabricated id + fabricated claim) → zero author dispatches',
    invalid.dispatches.author === 0 && invalid.plan.canonBlocked === true && invalid.plan.source === 'audit-invalid', JSON.stringify(invalid.plan));
  const rewrote = await run('auditor_rewrote', LEGIT_ORDINARY, { verdict: 'pass', violations: [], rewritten_plan: { state_change: 'something else entirely' } });
  ok('an auditor that tries to REWRITE the plan → zero author dispatches', rewrote.dispatches.author === 0 && rewrote.plan.canonBlocked === true, JSON.stringify(rewrote.plan));
  const garbage = await run('unparsable_reply', LEGIT_ORDINARY, 'not json at all');
  ok('an unparsable audit reply → zero author dispatches', garbage.dispatches.author === 0, JSON.stringify(garbage.dispatches));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. THE RETRY IS THE EXISTING ONE, AND IT IS BOUNDED AT ONE (req 7)');
  ok('an audit violation returns __plannerFunctionRejected — the signal the EXISTING bounded retry consumes',
    /__plannerFunctionRejected: true, __canonAuditBlocked: true/.test(src), 'signal not returned');
  ok('no independent retry loop was introduced inside the audit gate',
    !/for\s*\(|while\s*\(/.test(src.slice(src.indexOf('CANON AUDIT — THE PRODUCTION CALL SITE'), src.indexOf('CANON AUDIT — THE PRODUCTION CALL SITE') + 3200)),
    'a loop exists inside the audit call site');
  const retrySrc = src.slice(src.indexOf('if (plan && (plan.__staleRejected || plan.__plannerFunctionRejected))'), src.indexOf('if (plan && (plan.__staleRejected || plan.__plannerFunctionRejected))') + 1800);
  ok('the existing retry calls the generator exactly ONCE', (retrySrc.match(/await _runCGScreenplayGen\(/g) || []).length === 1, 'retry call count wrong');
  ok('...and a SECOND rejection stops with resumable state rather than retrying again',
    /_retryOk/.test(retrySrc) && /_cgResumable/.test(retrySrc) && /CG:STALE-STOP/.test(retrySrc), 'second-failure stop not found');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. THE PRODUCTION PACKET CARRIES THE REAL CANON (req 11)');
  const prodPacket = consoleLines.filter((l) => /\[CANON-AUDIT\] gating scene/.test(l)).pop() || '';
  console.log('    ' + prodPacket);
  ok('the production gate logged a packet built at dispatch time', /facts \(/.test(prodPacket), prodPacket);
  const packetDetail = await page.evaluate((d) => {
    window.state._starterId = 'starter_first_sacrifice'; window.state._temptFateDurableConsequences = [d];
    const p = window._buildCanonPacket(window.state);
    return { noVisible: p.facts.some((f) => /NO visible magical effect/i.test(f.text)),
             noMindRead: p.facts.some((f) => /do NOT read thoughts|NOT a psychic mind-read/i.test(f.text)),
             durable: p.facts.some((f) => f.kind === 'dc' && /memory_perception/.test(f.text)),
             invalidated: p.invalidated.length };
  }, DURABLE);
  ok('the PRODUCTION packet contains "a wish produces NO visible magical effect"', packetDetail.noVisible, JSON.stringify(packetDetail));
  ok('...and the alignment-sense truth foreclosing mind-reading', packetDetail.noMindRead, JSON.stringify(packetDetail));
  ok('...and the committed durable consequence with its invalidatedPlans', packetDetail.durable && packetDetail.invalidated > 0, JSON.stringify(packetDetail));

  section('CONTAINMENT');
  ok('ZERO real provider dispatches; no live auditor call', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('CANON AUDIT FULL-FLOW CONTROL: ' + passed + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
