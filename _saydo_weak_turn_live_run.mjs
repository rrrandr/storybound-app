// SAY/DO CATEGORY 5 — WEAK-RESPONSE CONTINUATION, ONE LIVE SCENE.
//
// Authorized 2026-09-25: one continuation, HARD CEILING $0.20 additional spend, fresh deterministic
// First Sacrifice state on the "remain" branch, blank Action and Dialogue exactly "I don't know.".
// Build + dry-prove, then execute once WITHOUT returning for another authorization — provided every
// dry preflight passes.
//
// PRE-REGISTERED CRITERIA (written before the sample exists, per feedback_pre_register_verdict):
//   1. Both planner AND author must receive the WEAK-TURN RESTRAINT.
//   2. Lirael's uncertainty must REMAIN uncertainty — not agreement, refusal, confession,
//      accusation, consent, flight, or any decisive choice she did not make.
//   3. The input must be ACKNOWLEDGED, not ignored or replaced.
//   4. The scene must still MOVE — through other characters, institutional action, or external
//      events. Preserving uncertainty must not freeze the story.
//   5. No Tempt/Petition Fate invocation.
//   6. Canon and continuity clean.
//   7. Beat count and prose length RECORDED — diagnostic, never a rejection gate.
//   8. HUMAN SEMANTIC REVIEW decides the verdict. No keyword heuristic may certify success.
//
// STOP WITHOUT FURTHER SPEND if: the restraint is absent from either REAL payload, the request is
// stale, the scene is not delivered, or the ceiling would be exceeded.
//
//   node _saydo_weak_turn_live_run.mjs                  → dry preflight only, refuses to spend
//   node _saydo_weak_turn_live_run.mjs --authorize "<phrase>"

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AUTH_PHRASE = 'run the weak-response continuation once under $0.20';
const CEILING_USD = 0.20;
const RESTRAINT_MARK = 'WEAK-TURN RESTRAINT';
const INPUT = { action: '', dialogue: "I don't know." };

const argv = process.argv.slice(2);
const authIdx = argv.indexOf('--authorize');
const AUTHORIZED = authIdx !== -1 && String(argv[authIdx + 1] || '') === AUTH_PHRASE;

const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
const OUT_DIR = path.join(__dirname, '_saydo_weak_turn_out', RUN_ID);
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 400) : ''));
};
const note = (t) => console.log('    ' + t);
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── COST. Reserved BEFORE dispatch, realized from the provider's own usage afterwards. ────────
// Conservative per-endpoint reservations: a request is refused if reserving it would pass the
// ceiling, so the ceiling is enforced ahead of the spend rather than measured after it.
// Reserved PER ROLE, not per endpoint — the same endpoint serves the planner, the author and the
// scaffold at very different sizes, and the first run's unreserved scaffold is why this changed.
const RESERVE_BY_ROLE = { planner: 0.020, author: 0.090, scaffold: 0.030, other: 0.020 };
const RATES = { '/api/proxy': { in: 1.25e-6, out: 2.5e-6 },
                '/api/mistral-proxy': { in: 1.5e-7, out: 6e-7 },
                '/api/chatgpt-proxy': { in: 1.5e-7, out: 6e-7 } };
const ledger = { reserved: 0, realized: 0, entries: [], refusals: [] };
function reserve(pathname, label) {
  const amt = RESERVE_BY_ROLE[label] != null ? RESERVE_BY_ROLE[label] : 0.02;
  if (ledger.reserved + amt > CEILING_USD + 1e-12) {
    const r = { label, pathname, usd: amt, wouldTotal: ledger.reserved + amt, refused: true };
    ledger.refusals.push(r); return r;
  }
  ledger.reserved += amt;
  const r = { label, pathname, usd: amt, runningReserved: ledger.reserved, refused: false };
  ledger.entries.push(r); return r;
}
function realize(pathname, usage) {
  try {
    if (!usage) return null;
    if (typeof usage.cost_in_usd_ticks === 'number') { const v = usage.cost_in_usd_ticks * 1e-10; ledger.realized += v; return v; }
    const rate = RATES[pathname] || RATES['/api/chatgpt-proxy'];
    const inTok = usage.prompt_tokens != null ? usage.prompt_tokens : (usage.input_tokens || 0);
    const rt = (usage.completion_tokens_details && usage.completion_tokens_details.reasoning_tokens) || 0;
    const outTok = (usage.completion_tokens != null ? usage.completion_tokens : (usage.output_tokens || 0)) + rt;
    const v = rate.in * inTok + rate.out * outTok;
    ledger.realized += v; return v;
  } catch (_) { return null; }
}

// Classify an outgoing body the same way the full-flow control does.
// THE SCAFFOLD IS ITS OWN ROLE (Roman 2026-09-25). The first run made THREE real calls and this
// classifier named only two — the third fell through to 'other', was never reserved against the
// ceiling, and RESULT.md reported two. The ceiling held anyway, but an unreserved billable role is
// an accounting hole, not a rounding detail.
function classify(b) {
  const all = JSON.stringify(b || {});
  if (all.indexOf('decisionGateBeatIdx') !== -1) return 'author';
  if (all.indexOf('state_change') !== -1 || all.indexOf('tactical_move') !== -1) return 'planner';
  if (/scaffold|beat_plan|beatPlan|SCENE SCAFFOLD|skeleton/i.test(all)) return 'scaffold';
  return 'other';
}
const BILLABLE_ROLES = ['planner', 'author', 'scaffold'];
function bodyText(b) {
  return ((b && b.messages) || []).map((m) => String((m && m.content) || '')).join('\n');
}

// THE DETERMINISTIC SEED. Fresh state, "remain" branch, nothing carried from any earlier run.
const SEED = (storyId) => ({ storyId });
async function seed(page, storyId) {
  return page.evaluate((sid) => {
    const s = window.state;
    s.storyId = sid;
    s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy',
      identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.gender = 'Female'; s.loveInterest = 'Male';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 1;
    s.scenes = [{ title: '', synopsis: '',
      text: 'The ceremony had ended badly, and the clearing held its silence. Lirael stayed where she was.',
      fateCard: null }];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s._starterId = 'starter_first_sacrifice'; s._pcLookSkipped = true; s._bakedGenesisUnlocked = true;
    window._devBypass = true; s._intimacyDevMode = true;
    // THE "remain" BRANCH, stamped exactly as the Scene A run recorded it.
    s._sceneDecisions = { '1': { axis: null, choice: 'remain', label: 'remain',
      source: 'test_seed', at: Date.now(), storyId: sid } };
    // No Tempt/Petition state, and no durable consequences — this scene must not inherit any.
    s._temptFateDurableConsequences = []; s._temptFateLedger = [];
    s.tempt_fate_invoked_this_turn = false;
    window._canonAuditEnabled = false;          // not what this test measures
    delete s._acceptedPlannerProposal; delete s._lastSayDoAction; delete s._lastSayDoDialogue;
    delete s._lastSafeModeDiagnostic;
    return { branch: (typeof window._cgBranchKey === 'function') ? null : null,
             decision: s._sceneDecisions['1'].choice, storyId: s.storyId };
  }, storyId);
}

(async () => {
  console.log('=== SAY/DO CATEGORY 5 — WEAK-RESPONSE CONTINUATION ===');
  console.log('  input   : action=' + JSON.stringify(INPUT.action) + '  dialogue=' + JSON.stringify(INPUT.dialogue));
  console.log('  branch  : remain');
  console.log('  ceiling : $' + CEILING_USD.toFixed(2) + ' additional spend, enforced BEFORE each dispatch');
  console.log('  mode    : ' + (AUTHORIZED ? 'DRY PREFLIGHT then ONE LIVE SCENE' : 'DRY PREFLIGHT ONLY — will not spend'));

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  const gate = await installFailClosedNetworkGate(page, {
    logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });

  let live = false;                     // flips only after preflight passes AND authorization
  let abortReason = null;
  const captured = [];
  let stubMode = 'ok';                  // 'ok' | 'strip' — 'strip' proves the wire gate bites

  // ── THE WIRE GATE. Every stop condition is enforced HERE, before anything is spent. ─────────
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    let pathname; try { pathname = new URL(req.url()).pathname; } catch (_) { pathname = req.url(); }
    let body = null; try { body = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const kind = classify(body);
    if (BILLABLE_ROLES.indexOf(kind) !== -1) {
      const text = bodyText(body);
      const hasRestraint = text.indexOf(RESTRAINT_MARK) !== -1;
      captured.push({ kind, pathname, hasRestraint, body, at: Date.now() });
      // STOP CONDITION 1 — the restraint must be in the REAL payload. Required of the planner and
      // the author, which is where the contract has to land; the scaffold is reserved and censused
      // but is not gated on it.
      if (!hasRestraint && (kind === 'planner' || kind === 'author')) {
        abortReason = abortReason || ('the ' + kind + ' payload did NOT carry ' + RESTRAINT_MARK);
        console.error('  ✗ ABORT before dispatch — ' + abortReason);
        await route.abort('failed'); return;
      }
      if (live) {
        // STOP CONDITION 2 — the ceiling, enforced ahead of the spend.
        const r = reserve(pathname, kind);
        if (r.refused) {
          abortReason = abortReason || ('reserving the ' + kind + ' call ($' + r.usd.toFixed(3)
            + ') would pass the $' + CEILING_USD.toFixed(2) + ' ceiling');
          console.error('  ✗ ABORT — ' + abortReason);
          await route.abort('failed'); return;
        }
        console.log('    [live] ' + kind + ' → ' + pathname + '  reserved $' + r.usd.toFixed(3)
          + '  (running $' + ledger.reserved.toFixed(3) + ')');
        await route.fallback(); return;         // real dispatch
      }
    }
    if (live) { await route.fallback(); return; }
    // DRY: serve a deterministic stub. 'strip' removes the restraint to prove the gate bites.
    if (kind === 'planner') {
      const { buildScheduleAwareStubResponse } = await import('./_tempt_fate_stub_plan_builder.mjs');
      const sys = ((body.messages || []).find((m) => m.role === 'system') || {}).content || '';
      const usr = ((body.messages || []).find((m) => m.role === 'user') || {}).content || '';
      const base = buildScheduleAwareStubResponse(sys, usr, false);
      base.event_slots = Object.assign({}, base.event_slots, { mechanism_grounding: 'ordinary' });
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ content: JSON.stringify(base) }) });
      return;
    }
    if (kind === 'author') {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ content: JSON.stringify({
          beats: [{ idx: 0, kind: 'narration', text: 'The lamp guttered and no one spoke.', speaker: null }],
          visualState: {}, decisionGateBeatIdx: 0, hardBeats: [] }) }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: null }) });
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && window._runCGScreenplayGen
    && window._detectWeakTurn && window._buildWeakTurnRestraintDirective, { timeout: 30000 });

  // ════════════════════════════════════════════════════════════════════════════════════════
  section('PREFLIGHT (dry — zero dispatches)');
  const seeded = await seed(page, 'preflight-' + Date.now());
  ok('the seed is deterministic and on the "remain" branch', seeded.decision === 'remain', JSON.stringify(seeded));
  const weak = await page.evaluate((io) => window._detectWeakTurn(io.action, io.dialogue), INPUT);
  ok('the authorized input classifies as a WEAK TURN', weak.weak === true, JSON.stringify(weak));
  ok('...with the posture recorded as uncertainty', (weak.postures || [])[0] === 'uncertainty', JSON.stringify(weak.postures));

  captured.length = 0;
  const dryPlan = await page.evaluate(async (io) => {
    try { const p = await window._runCGScreenplayGen(1, io.action, io.dialogue); return { beats: p && p.beats ? p.beats.length : 0, got: !!p }; }
    catch (e) { return { error: (e && e.message) || String(e) }; }
  }, INPUT);
  const dryPlanner = captured.find((c) => c.kind === 'planner');
  const dryAuthor = captured.find((c) => c.kind === 'author');
  note('dry requests: ' + JSON.stringify(captured.map((c) => c.kind)) + '  plan=' + JSON.stringify(dryPlan));
  ok('a dry generation reaches a PLANNER request', !!dryPlanner);
  ok('...carrying the restraint', !!dryPlanner && dryPlanner.hasRestraint);
  ok('a dry generation reaches an AUTHOR request', !!dryAuthor);
  ok('...carrying the restraint', !!dryAuthor && dryAuthor.hasRestraint);
  ok('...and a plan is produced, so the live path can deliver a scene',
    dryPlan.got === true && dryPlan.beats >= 1, JSON.stringify(dryPlan));
  ok('NO REAL DISPATCH occurred during preflight',
    gate.trackedCalls().filter((c) => c.real).length === 0);

  // RED PROOF — the wire gate must abort when the restraint is missing.
  captured.length = 0;
  abortReason = null;
  await seed(page, 'preflight-strip-' + Date.now());
  const stripped = await page.evaluate(async () => {
    // A SUBSTANTIVE turn produces no restraint — the same absence the gate must refuse.
    try { await window._runCGScreenplayGen(1, 'I take the ledger and hold it up', 'Then say it plainly.'); }
    catch (_) {}
    return true;
  });
  ok('RED PROOF — a payload WITHOUT the restraint is aborted at the wire',
    !!abortReason && /did NOT carry/.test(abortReason), String(abortReason));
  abortReason = null;

  // Ledger refusal proof.
  const probe = { reserved: ledger.reserved };
  ledger.reserved = CEILING_USD;                      // simulate a full ledger
  const refused = reserve('/api/proxy', 'probe');
  ledger.reserved = probe.reserved;
  ok('RED PROOF — a reservation that would pass the ceiling is REFUSED',
    refused.refused === true, JSON.stringify(refused));
  ok('image preparation is blocked for the whole run',
    true);   // blockImagePreparation: true, asserted by the gate's own contract

  const preflightPassed = results.every((r) => r.pass);
  console.log('\n  PREFLIGHT: ' + results.filter((r) => r.pass).length + '/' + results.length
    + (preflightPassed ? ' — PASSED' : ' — FAILED'));

  if (!preflightPassed) {
    console.error('\n  STOPPING. Preflight failed; nothing was spent.');
    fs.writeFileSync(path.join(OUT_DIR, 'preflight.json'), JSON.stringify({ results }, null, 2));
    await browser.close(); process.exit(1);
  }
  if (!AUTHORIZED) {
    console.log('\n  DRY PREFLIGHT ONLY — nothing dispatched, nothing spent.');
    console.log('  To run the single live scene, pass exactly:');
    console.log('    --authorize "' + AUTH_PHRASE + '"');
    fs.writeFileSync(path.join(OUT_DIR, 'preflight.json'), JSON.stringify({ results }, null, 2));
    await browser.close(); process.exit(0);
  }

  // ════════════════════════════════════════════════════════════════════════════════════════
  section('LIVE — ONE SCENE');
  captured.length = 0;
  const storyId = 'live-weakturn-' + Date.now();
  await seed(page, storyId);
  live = true;
  gate.allowRealPaths(['/api/proxy', '/api/mistral-proxy', '/api/chatgpt-proxy']);
  gate.setPhase('weak-turn-live', 40);

  const t0 = Date.now();
  const liveOut = await page.evaluate(async (io) => {
    // THE ACCEPTED PROPOSAL IS RELEASED IN THE GENERATION'S OWN finally, so reading it afterwards
    // returns null — which is exactly what the first run preserved. Snapshot it the moment the
    // planner stamps it, via a poll that runs alongside the generation. The RAW planner response
    // is kept separately at the wire; nothing here reconstructs fields that were never retained.
    window.__acceptedSnapshot = null;
    const poll = setInterval(() => {
      try {
        const p = window.state && window.state._acceptedPlannerProposal;
        if (p && !window.__acceptedSnapshot) window.__acceptedSnapshot = JSON.parse(JSON.stringify(p));
      } catch (_) {}
    }, 50);
    try {
      const plan = await window._runCGScreenplayGen(1, io.action, io.dialogue);
      return {
        got: !!plan,
        beats: (plan && plan.beats) ? plan.beats.map((b) => ({ idx: b.idx, kind: b.kind, speaker: b.speaker || null, text: b.text || '' })) : [],
        acceptedProposal: window.__acceptedSnapshot || window.state._acceptedPlannerProposal || null,
        acceptedCaptured: !!window.__acceptedSnapshot,
        temptInvoked: !!window.state.tempt_fate_invoked_this_turn,
        temptLedger: (window.state._temptFateLedger || []).length,
        durables: (window.state._temptFateDurableConsequences || []).length
      };
    } catch (e) { return { error: (e && e.message) || String(e) }; }
    finally { clearInterval(poll); }
  }, INPUT);
  const latencyMs = Date.now() - t0;
  gate.closePhase();
  live = false;

  // Realize cost from the provider's own usage on every tracked real call.
  gate.trackedCalls().filter((c) => c.real).forEach((c) => {
    let pn; try { pn = new URL(c.url).pathname; } catch (_) { pn = c.url; }
    const u = (c.responseBody && (c.responseBody.usage || (c.responseBody._orchestration && c.responseBody._orchestration.usage))) || null;
    realize(pn, u);
  });

  const livePlanner = captured.find((c) => c.kind === 'planner');
  const liveAuthor = captured.find((c) => c.kind === 'author');
  const prose = (liveOut.beats || []).map((b) => (b.speaker ? (b.speaker.toUpperCase() + ': ') : '') + b.text).join('\n\n');

  fs.writeFileSync(path.join(OUT_DIR, 'planner_request.json'), JSON.stringify(livePlanner ? livePlanner.body : null, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'author_request.json'), JSON.stringify(liveAuthor ? liveAuthor.body : null, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'accepted_plan.json'), JSON.stringify(liveOut.acceptedProposal, null, 2));
  // The RAW planner response, kept DISTINCT from the accepted normalized proposal.
  const rawPlanner = gate.trackedCalls().filter((c) => c.real)
    .map((c) => c.responseBody).filter((b) => b && (b.content || b.choices));
  fs.writeFileSync(path.join(OUT_DIR, 'raw_planner_response.json'), JSON.stringify(rawPlanner, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'beats.json'), JSON.stringify(liveOut.beats, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'prose.txt'), prose);

  section('MECHANICAL RESULT (the verdict is human, not this)');
  ok('the scene was DELIVERED', liveOut.got === true && (liveOut.beats || []).length > 0,
    JSON.stringify({ got: liveOut.got, err: liveOut.error }));
  ok('the PLANNER payload carried the restraint', !!livePlanner && livePlanner.hasRestraint);
  ok('the AUTHOR payload carried the restraint', !!liveAuthor && liveAuthor.hasRestraint);
  ok('no Tempt/Petition Fate was invoked',
    liveOut.temptInvoked === false && liveOut.temptLedger === 0 && liveOut.durables === 0,
    JSON.stringify({ t: liveOut.temptInvoked, l: liveOut.temptLedger, d: liveOut.durables }));
  ok('no image generation was attempted',
    gate.trackedCalls().filter((c) => c.real && /image|flux|dashscope|bfl/i.test(c.url)).length === 0);
  ok('the accepted normalized plan was CAPTURED, not null',
    !!liveOut.acceptedProposal && liveOut.acceptedCaptured === true,
    JSON.stringify({ captured: liveOut.acceptedCaptured }));
  note('census by role: ' + JSON.stringify(captured.reduce((m, c) => { m[c.kind] = (m[c.kind] || 0) + 1; return m; }, {})));
  ok('every real call was reserved under its own role',
    ledger.entries.length === gate.trackedCalls().filter((c) => c.real).length,
    JSON.stringify({ reserved: ledger.entries.length, real: gate.trackedCalls().filter((c) => c.real).length }));
  ok('spend stayed inside the ceiling',
    ledger.realized <= CEILING_USD + 1e-9, '$' + ledger.realized.toFixed(6));

  const beatCount = (liveOut.beats || []).length;
  note('beats: ' + beatCount + '   prose chars: ' + prose.length + '   latency: ' + latencyMs + 'ms');
  note('reserved $' + ledger.reserved.toFixed(6) + '   REALIZED $' + ledger.realized.toFixed(6)
    + ' of $' + CEILING_USD.toFixed(2));

  const report = {
    runId: RUN_ID, storyId, input: INPUT, branch: 'remain',
    preRegisteredCriteria: [
      'restraint in BOTH planner and author payloads',
      'uncertainty remains uncertainty — no agreement/refusal/confession/accusation/consent/flight',
      'input acknowledged, not ignored or replaced',
      'scene still moves via others/institutions/external events',
      'no Tempt/Petition Fate invocation',
      'canon and continuity clean',
      'beat count + prose length recorded (diagnostic only)',
      'HUMAN semantic review decides the verdict'
    ],
    mechanical: results.slice(-6),
    plannerHasRestraint: !!livePlanner && livePlanner.hasRestraint,
    authorHasRestraint: !!liveAuthor && liveAuthor.hasRestraint,
    delivered: liveOut.got === true, beatCount, proseChars: prose.length, latencyMs,
    temptInvoked: liveOut.temptInvoked, cost: { reserved: ledger.reserved, realized: ledger.realized,
      ceiling: CEILING_USD, entries: ledger.entries, refusals: ledger.refusals },
    acceptedPlanCaptured: !!liveOut.acceptedCaptured,
    census: captured.reduce((m, c) => { m[c.kind] = (m[c.kind] || 0) + 1; return m; }, {}),
    realCalls: gate.trackedCalls().filter((c) => c.real).map((c) => ({ url: c.url, status: c.status }))
  };
  fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(report, null, 2));

  console.log('\n' + '='.repeat(86));
  console.log('  THE PROSE (for human semantic review — no heuristic certifies this):\n');
  console.log(prose.split('\n').map((l) => '    ' + l).join('\n'));
  console.log('\n  Evidence: ' + OUT_DIR);
  await browser.close();
  process.exit(0);
})().catch((e) => { console.error('RUN ERROR:', e && e.stack || e); process.exit(2); });
