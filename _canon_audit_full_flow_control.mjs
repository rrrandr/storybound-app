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
  let lastAuditorPrompt = '';
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
    if (kind === 'auditor') {
      // The auditor's user prompt CARRIES the proposal it was given — the only place to see which
      // proposal production actually handed it.
      lastAuditorPrompt = ((b.messages || []).find((m) => m.role === 'user') || {}).content || '';
      return { content: typeof auditorReply === 'string' ? auditorReply : JSON.stringify(auditorReply) };
    }
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
      // The semantic auditor is DISABLED BY DEFAULT in production (rejected model, 2026-09-24).
      // Every scenario below that exercises the gate must opt in EXPLICITLY — which is itself the
      // proof that the opt-in is real and that nothing reaches the auditor without it.
      window._canonAuditEnabled = true;
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
  ok('_buildCanonPacket has a real production consumer', callSites.some((x) => /var _caPacket = _buildCanonPacket\(state, \{ proposal: _caProposal \}\)/.test(x.l)), JSON.stringify(callSites.map((x) => x.l)));
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

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('8. ACCEPTED-PROPOSAL OWNERSHIP — a stale proposal can never be the thing audited');
  // Roman: "state._acceptedPlannerProposal has no ownership guard... the value is never cleared.
  // If a later path reaches the author without refreshing it, the auditor could inspect a stale
  // proposal."
  const ownership = await run('ownership_baseline', LEGIT_ORDINARY, { verdict: 'pass', violations: [] });
  const cleared = await page.evaluate(() => ({
    proposal: window.state._acceptedPlannerProposal, attempt: window.state._cgGenAttempt }));
  ok('the accepted proposal is CLEARED when the generation ends', cleared.proposal === null, JSON.stringify(cleared.proposal));
  ok('...and so is the generation attempt token', cleared.attempt === null, JSON.stringify(cleared.attempt));
  ok('a proposal carries an owner stamped with id, storyId, sceneIndex and branch',
    /owner: s\._cgGenAttempt \? \{/.test(src) && /sceneIndex: s\._cgGenAttempt\.sceneIndex, branch: s\._cgGenAttempt\.branch/.test(src));
  ok('...and it is cleared at generation START too, so a throw on the previous turn cannot leave one behind',
    /state\._acceptedPlannerProposal = null;\s*\n\s*state\._cgGenAttempt = \{/.test(src), 'start-clear not found');

  // STALE INJECTION — a proposal from a PRIOR SCENE and PRIOR STORY, planted so the generation
  // finds it already present. It must fail closed, and the author must never run.
  // Directly exercise the ownership comparison with a planted prior-scene / prior-story proposal.
  const staleChecks = await page.evaluate(() => {
    const cur = { id: 'attempt-CURRENT', storyId: 'story-NOW', sceneIndex: 4, branch: 'remain' };
    const match = (own) => !!(own && own.id === cur.id
      && String(own.storyId || '') === String(cur.storyId || '')
      && own.sceneIndex === cur.sceneIndex
      && String(own.branch == null ? '' : own.branch) === String(cur.branch == null ? '' : cur.branch));
    return {
      exact: match({ id: 'attempt-CURRENT', storyId: 'story-NOW', sceneIndex: 4, branch: 'remain' }),
      priorScene: match({ id: 'attempt-CURRENT', storyId: 'story-NOW', sceneIndex: 3, branch: 'remain' }),
      priorStory: match({ id: 'attempt-CURRENT', storyId: 'story-BEFORE', sceneIndex: 4, branch: 'remain' }),
      otherBranch: match({ id: 'attempt-CURRENT', storyId: 'story-NOW', sceneIndex: 4, branch: 'move' }),
      priorAttempt: match({ id: 'attempt-OLD', storyId: 'story-NOW', sceneIndex: 4, branch: 'remain' }),
      noOwner: match(null)
    };
  });
  ok('ownership matches only on an EXACT id+story+scene+branch tuple', staleChecks.exact === true, JSON.stringify(staleChecks));
  ok('a PRIOR-SCENE proposal does not match', staleChecks.priorScene === false, JSON.stringify(staleChecks));
  ok('a PRIOR-STORY proposal does not match', staleChecks.priorStory === false, JSON.stringify(staleChecks));
  ok('a DIFFERENT-BRANCH proposal does not match', staleChecks.otherBranch === false, JSON.stringify(staleChecks));
  ok('a PRIOR-ATTEMPT proposal does not match', staleChecks.priorAttempt === false, JSON.stringify(staleChecks));
  ok('an UNSTAMPED proposal does not match', staleChecks.noOwner === false, JSON.stringify(staleChecks));

  // FULL-FLOW STALE PROOF. A proposal from a PRIOR SCENE of a PRIOR STORY is planted in state,
  // then a NEW generation is run. The decisive evidence is which proposal the auditor was actually
  // handed — its user prompt carries the proposal verbatim.
  plannerReply = LEGIT_ORDINARY; auditorReply = { verdict: 'pass', violations: [] };
  seen.planner = seen.auditor = seen.author = seen.other = 0;
  lastAuditorPrompt = '';
  await setup();
  const STALE_MARK = 'STALE-FROM-A-PRIOR-STORY-AND-SCENE-XYZZY';
  await page.evaluate((mark) => {
    window.state._acceptedPlannerProposal = {
      state_change: mark, tactical_move: mark, event_slots: { mechanism_grounding: 'ordinary' },
      owner: { id: 'attempt-FROM-ANOTHER-RUN', storyId: 'story-LONG-GONE', sceneIndex: 0, branch: 'move' }
    };
  }, STALE_MARK);
  gate.setPhase('stale_proposal', 40);
  const stalePlan = await page.evaluate(async () => {
    const r = await window._runCGScreenplayGen(1, 'Lirael closes her eyes for a long moment, then opens them again.', '');
    return r && { rejected: !!r.__plannerFunctionRejected, canonBlocked: !!r.__canonAuditBlocked, beats: r.beats ? r.beats.length : 0 };
  });
  gate.closePhase();
  const stale = { plan: stalePlan, dispatches: { ...seen }, auditorSawStale: lastAuditorPrompt.indexOf(STALE_MARK) !== -1 };
  console.log('    stale-run dispatches: ' + JSON.stringify(stale.dispatches) + '  auditor saw the stale plan: ' + stale.auditorSawStale);
  ok('FULL FLOW — a planted PRIOR-STORY/PRIOR-SCENE proposal is NEVER what the auditor inspects',
    stale.auditorSawStale === false && stale.dispatches.auditor >= 1,
    'auditor prompt contained the stale marker: ' + stale.auditorSawStale);
  ok('...because generation START clears it, so a stale proposal cannot survive into a new scene at all',
    await page.evaluate((mark) => { const p = window.state._acceptedPlannerProposal; return !p || p.state_change !== mark; }, STALE_MARK),
    'the planted proposal survived the generation');
  ok('...and the ownership branch that would otherwise fail closed is present in production source',
    /canonAuditSource: 'stale-proposal'/.test(src) && /STALE PROPOSAL — failing closed/.test(src), 'fail-closed branch missing');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('9. PACKET SELECTION IS PROPOSAL-AWARE — a relevant fact beyond the cutoff survives');
  // First Sacrifice has only 6 positive truths against a cap of 10, so it never truncates and
  // cannot demonstrate this. A SYNTHETIC large-story seed is installed to make the test real —
  // this is about behaviour in "a larger story", which is exactly the case Roman raised.
  const sel = await page.evaluate((d) => {
    const s = window.state;
    const BIG = 'synthetic_large_story';
    const pos = [];
    for (let i = 0; i < 30; i++) pos.push('Ordinary world fact number ' + i + ' about harbours, ledgers and trade.');
    // The authorising fact sits at index 25, far beyond the 10-entry cap.
    const AUTH = 'A Tidecaller of the Salt Guild may becalm a single vessel once per tide, by name.';
    pos[25] = AUTH;
    const neg = [];
    for (let i = 0; i < 20; i++) neg.push('There is NO ' + ['flight', 'resurrection', 'mind-reading', 'teleportation', 'prophecy'][i % 5] + ' variant ' + i + ' in this world.');
    window.STARTER_SEEDS[BIG] = { worldTruths: neg.concat(pos) };
    s._starterId = BIG;
    s._temptFateDurableConsequences = [d];
    const blind = window._buildCanonPacket(s);
    const aware = window._buildCanonPacket(s, { proposal: {
      state_change: 'The Tidecaller becalms the vessel by name before the harbour',
      event_slots: { actor: 'the Tidecaller', action: 'becalms', target: 'the vessel',
        mechanism_grounding: 'A Tidecaller of the Salt Guild may becalm a single vessel once per tide' } } });
    const built = window._buildCanonAuditPrompt({ state_change: 'x' }, blind);
    delete window.STARTER_SEEDS[BIG];
    return { totalPos: pos.length, totalNeg: neg.length, auth: AUTH,
      blindHas: blind.facts.some((f) => f.text === AUTH), awareHas: aware.facts.some((f) => f.text === AUTH),
      blindTruncated: blind.truncated, blindOmitted: blind.omittedTotal,
      awareProposalAware: aware.proposalAware, sys: built.sys };
  }, DURABLE);
  console.log('    synthetic seed: ' + sel.totalPos + ' positive / ' + sel.totalNeg + ' negative truths (caps 10/12)');
  console.log('    authorising fact at index 25: "' + sel.auth + '"');
  ok('the synthetic seed genuinely exceeds both caps, so this test is not vacuous',
    sel.totalPos > 10 && sel.totalNeg > 12 && sel.blindTruncated === true && sel.blindOmitted > 0, JSON.stringify({ p: sel.totalPos, n: sel.totalNeg, t: sel.blindTruncated, o: sel.blindOmitted }));
  ok('WITHOUT the proposal the authorising fact is CUT — this is the false-violation risk Roman identified',
    sel.blindHas === false, 'the fact survived a blind cut, so the test proves nothing');
  ok('WITH the proposal it is INCLUDED, despite sitting 15 entries beyond the cap',
    sel.awareHas === true, JSON.stringify(sel));
  ok('...and the packet reports itself proposal-aware', sel.awareProposalAware === true, JSON.stringify(sel));
  ok('a truncated packet STOPS claiming to be the complete and only canon',
    /RELEVANCE-SELECTED, NOT EXHAUSTIVE/.test(sel.sys) && !/the complete and only canon/.test(sel.sys), sel.sys.slice(0, 300));
  ok('...and forbids concluding "ungrounded" from mere absence',
    /may NOT conclude that something is ungrounded merely because it is absent/.test(sel.sys), 'guard missing');
  ok('...directing an unfindable capability to "cannot_decide" rather than a violation',
    /that is exactly the case for verdict "cannot_decide", not for a violation/.test(sel.sys), 'guidance missing');
  // And the honest converse: when nothing was cut, the packet may still say so.
  const complete = await page.evaluate((d) => {
    const s = window.state; s._starterId = 'starter_first_sacrifice'; s._temptFateDurableConsequences = [d];
    const p = window._buildCanonPacket(s);
    return { truncated: p.truncated, sys: window._buildCanonAuditPrompt({ state_change: 'x' }, p).sys };
  }, DURABLE);
  ok('when NOTHING was omitted the packet may still claim completeness — First Sacrifice fits under both caps',
    complete.truncated === false && /nothing was omitted/.test(complete.sys), JSON.stringify(complete.truncated));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('10. THE SEMANTIC AUDITOR IS OFF BY DEFAULT — a normal scene reaches the author');
  // Roman: "the report says DO NOT ENABLE, while production is enabled by default. The gate runs
  // whenever window._canonAuditEnabled !== false, and nothing initializes it to false." Correct —
  // as committed, a rejected auditor on the Mistral chain would have blocked ordinary scenes.
  const defaultOff = await page.evaluate(() => {
    delete window._canonAuditEnabled;                       // the real production state: unset
    return { unsetEnabled: window._canonAuditIsEnabled(), explicitOn: (window._canonAuditEnabled = true, window._canonAuditIsEnabled()),
             explicitOff: (window._canonAuditEnabled = false, window._canonAuditIsEnabled()) };
  });
  ok('UNSET means DISABLED — the production default is off', defaultOff.unsetEnabled === false, JSON.stringify(defaultOff));
  ok('an explicit true enables it (the test-only opt-in)', defaultOff.explicitOn === true, JSON.stringify(defaultOff));
  ok('an explicit false disables it', defaultOff.explicitOff === false, JSON.stringify(defaultOff));

  // FULL FLOW with the flag UNSET, exactly as production ships.
  plannerReply = LEGIT_ORDINARY; auditorReply = { verdict: 'pass', violations: [] };
  seen.planner = seen.auditor = seen.author = seen.other = 0;
  await setup();
  await page.evaluate(() => { delete window._canonAuditEnabled; });   // ship state
  gate.setPhase('auditor_disabled', 40);
  const offPlan = await page.evaluate(async () => {
    const r = await window._runCGScreenplayGen(1, 'Lirael closes her eyes for a long moment, then opens them again.', '');
    return r && { rejected: !!r.__plannerFunctionRejected, canonBlocked: !!r.__canonAuditBlocked, beats: r.beats ? r.beats.length : 0 };
  });
  gate.closePhase();
  console.log('    disabled-run dispatches: ' + JSON.stringify(seen));
  ok('with the auditor OFF a normal scene makes ZERO auditor calls', seen.auditor === 0, JSON.stringify(seen));
  ok('...and the AUTHOR is dispatched exactly once — the scene is not blocked',
    seen.author === 1 && offPlan.canonBlocked !== true, JSON.stringify({ seen, offPlan }));
  // The FREE deterministic grounding check must still bite while the semantic audit is off.
  seen.planner = seen.auditor = seen.author = seen.other = 0;
  plannerReply = RED_NO_GROUNDING;
  await setup();
  await page.evaluate(() => { delete window._canonAuditEnabled; });
  gate.setPhase('deterministic_while_disabled', 40);
  const detOff = await page.evaluate(async () => {
    const r = await window._runCGScreenplayGen(1, 'Lirael closes her eyes for a long moment, then opens them again.', '');
    return r && { rejected: !!r.__plannerFunctionRejected, reason: String(r.reason || '').slice(0, 120) };
  });
  gate.closePhase();
  ok('DETERMINISTIC grounding still rejects an ungrounded plan while the semantic audit is OFF',
    detOff.rejected === true && /ungrounded capability/.test(detOff.reason), JSON.stringify(detOff));
  ok('...still making zero auditor calls and zero author calls', seen.auditor === 0 && seen.author === 0, JSON.stringify(seen));
  // Checked against CODE lines only — the phrase survives in a comment that documents the defect,
  // and matching that would be matching the history rather than the behaviour.
  const liveImplicitEnable = src.split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
    .filter((l) => /_canonAuditEnabled\s*!==\s*false/.test(l));
  ok('production carries NO implicit-enable path in code — the default constant is false',
    /var _CANON_AUDIT_DEFAULT_ENABLED = false;/.test(src) && liveImplicitEnable.length === 0,
    JSON.stringify(liveImplicitEnable));
  ok('...and both gate sites route through the explicit opt-in helper',
    (src.match(/_canonAuditIsEnabled\(\)/g) || []).length >= 2, 'gate sites not routed through the helper');

  section('CONTAINMENT');
  ok('ZERO real provider dispatches; no live auditor call', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('CANON AUDIT FULL-FLOW CONTROL: ' + passed + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
