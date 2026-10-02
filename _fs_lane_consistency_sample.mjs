// FS LANE CONSISTENCY — N PLANNER DRAWS, ONE CALL EACH, NOTHING DOWNSTREAM.
//
// THE QUESTION. The one live FS planner reply we have was refused by the app's own gate:
//     [CG:PLANNER-GATE] REJECTED before author dispatch, scene=1 — the planner declared
//     chosen_aftermath_lane="dohkar_preliminary_review" but its own proposed
//     event/tactical-move/forces-choice/event-slots does not actually instantiate that lane's
//     content — a declared lane label alone is not enough
// A ten-scene issue needs NINE consecutive replies that each pass that gate. One failing sample is
// not a rate. This measures the rate before anything funds nine scenes.
//
// WHAT IT COSTS, AND WHY IT IS THE CHEAP EXPERIMENT. Only the planner is bought: R_PLANNER per
// draw. The author is 83% of a scene's cost and is never dispatched here — which is also the
// ACCEPTANCE SIGNAL, because the gate sits immediately before author dispatch:
//     an author request was ATTEMPTED  -> the gate ACCEPTED the reply (we abort the request)
//     [CG:PLANNER-GATE] REJECTED       -> the reply was self-inconsistent
// Nothing weakens or bypasses the gate. The gate runs in the app, unmodified; this only watches it.
//
// ONE ATTEMPT PER DRAW. On a rejection the app retries once. A retry is a second charge for the
// same question, so the second planner request of a sample is BLOCKED and recorded.
//
// Usage:
//   node _fs_lane_consistency_sample.mjs --samples 4 --estimate-only
//   node _fs_lane_consistency_sample.mjs --samples 2 --dry-replay --planner-fixture <file>
//   node _fs_lane_consistency_sample.mjs --samples 4 --authorize 0.10
import fs from 'fs';
import { chromium } from 'playwright-core';
import { estimateUsd } from './_fsc_cost_guard.mjs';
import { R_PLANNER, makeSpendLedger } from './_live_spend_ledger.mjs';
import { stageOf, isProviderEndpoint } from './_replay_fixtures.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview, readAxis, advanceExpectingGate,
  chooseBranch } from './_fs_story_setup.mjs';

const ARG = process.argv.slice(2);
const numArg = (f, d) => { const i = ARG.indexOf(f); return i >= 0 ? Number(ARG[i + 1]) : d; };
const strArg = (f, d) => { const i = ARG.indexOf(f); return i >= 0 ? String(ARG[i + 1]) : d; };

const SAMPLES = numArg('--samples', 4);
const ESTIMATE_ONLY = ARG.includes('--estimate-only');
const DRY = ARG.includes('--dry-replay');
const AUTHORIZED = numArg('--authorize', null);
const ARM = strArg('--arm', 'A');
const PLANNER_FIXTURE = strArg('--planner-fixture', null);

if (!(SAMPLES >= 1 && SAMPLES <= 12)) {
  console.error('REFUSED: --samples must be 1..12.');
  process.exit(2);
}
if (!DRY && !ESTIMATE_ONLY && !(AUTHORIZED > 0)) {
  console.error('REFUSED: this run dispatches real provider calls.');
  console.error('  --estimate-only | --dry-replay --planner-fixture <file> | --authorize <usd>');
  process.exit(2);
}
if (DRY && !PLANNER_FIXTURE) {
  console.error('REFUSED: --dry-replay needs --planner-fixture <recorded response file>.');
  console.error('  A dry sample with no recorded reply would measure nothing.');
  process.exit(2);
}
const LIVE = !DRY && !ESTIMATE_ONLY;

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const RUN = '_fs_lane_sample_out/run_' + stamp;
fs.mkdirSync(RUN, { recursive: true });
const say = (s) => { console.log(s); fs.appendFileSync(RUN + '/log.txt', s + '\n'); };
const write = (n, s) => fs.writeFileSync(RUN + '/' + n,
  typeof s === 'string' ? s : JSON.stringify(s, null, 2));

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; say('  ok   ' + n); }
  else { fail++; say('  FAIL ' + n + (d ? '  — ' + d : '')); } };

say('=== FS LANE CONSISTENCY — ' + SAMPLES + ' PLANNER DRAW(S) ===');
say('  mode    : ' + (ESTIMATE_ONLY ? 'ESTIMATE ONLY'
  : (DRY ? 'DRY REPLAY of ' + PLANNER_FIXTURE : 'LIVE, authorized $' + AUTHORIZED.toFixed(2))));
say('  arm     : ' + ARM + '   output: ' + RUN);

const reserved = R_PLANNER * SAMPLES;
say('\nRESERVATION');
say('  one planner draw : $' + R_PLANNER.toFixed(6));
say('  × ' + SAMPLES + ' = $' + reserved.toFixed(6));
say('  author, verifier, memory, scaffold: ABORTED — never reserved, cannot be billed');
if (LIVE && reserved > AUTHORIZED) {
  say('\nREFUSED BEFORE DISPATCH: reserved $' + reserved.toFixed(6)
    + ' exceeds the authorized $' + AUTHORIZED.toFixed(2));
  write('refusal.json', { reserved, authorized: AUTHORIZED, samples: SAMPLES, dispatched: 0 });
  process.exit(3);
}
if (LIVE) say('  within authorization — $' + (AUTHORIZED - reserved).toFixed(6) + ' headroom');
if (ESTIMATE_ONLY) {
  say('\nESTIMATE ONLY — no browser launched, nothing dispatched. $0 spent.');
  write('estimate.json', { samples: SAMPLES, perDraw: R_PLANNER, reserved });
  process.exit(0);
}

const recordedReply = (path) => {
  const j = JSON.parse(fs.readFileSync(path, 'utf8'));
  const c = j.content
    || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || '';
  if (!c || c.indexOf('{') < 0) throw new Error('no planner content in ' + path);
  return c;
};

const ledger = makeSpendLedger(say);
const browser = await chromium.launch();
const results = [];

for (let i = 1; i <= SAMPLES; i++) {
  say('\n── draw ' + i + '/' + SAMPLES);
  const page = await browser.newPage();
  const lines = [];
  const calls = [];
  let plannerUsed = false;          // ONE live planner request per draw
  let authorAttempted = false;      // the acceptance signal
  let replyText = null;

  page.on('console', (m) => {
    const x = m.text();
    if (/\[CG|\[OBJECTIVE:REJECTED\]|\[CONTINUATION|\[STAGED|\[SCENE-DECISION\]|\[ROLLBACK\]|\[TIERED|reject|stale/i
      .test(x)) lines.push(x);
  });

  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = req.url().replace(/^https?:\/\/[^/]+/, '');
    if (!isProviderEndpoint(url)) { try { await route.abort(); } catch (_) {} return; }
    let raw = null; try { raw = req.postData(); } catch (_) {}
    let sys = '', body = null;
    try { body = JSON.parse(raw || '{}');
      sys = String((body.messages || [])[0]?.content || ''); } catch (_) {}
    const stage = stageOf(sys);

    // THE AUTHOR BEING ASKED IS THE ACCEPTANCE SIGNAL. The gate sits immediately before author
    // dispatch, so an attempted author request means the reply passed it. The request is aborted:
    // the signal is free.
    if (stage === 'author') {
      authorAttempted = true;
      calls.push({ stage, outcome: 'aborted_after_acceptance_signal' });
      try { await route.abort(); } catch (_) {} return;
    }
    if (stage !== 'planner') {
      calls.push({ stage, outcome: 'aborted' });
      try { await route.abort(); } catch (_) {} return;
    }
    if (plannerUsed) {
      // The app's retry after a rejection. Blocked: it is a second charge for one question.
      calls.push({ stage, outcome: 'blocked_second_attempt' });
      say('    [BLOCKED] the app\'s retry planner request — one attempt per draw');
      try { await route.abort(); } catch (_) {} return;
    }
    plannerUsed = true;
    write('draw' + i + '_request.json', { system: sys,
      user: String((body.messages || [])[1]?.content || ''), max_tokens: body && body.max_tokens });

    if (DRY) {
      replyText = recordedReply(PLANNER_FIXTURE);
      calls.push({ stage, outcome: 'replayed' });
      return route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ content: replyText }) });
    }
    const est = estimateUsd(body || { messages: [], max_tokens: 0 },
      (body && body.model) || 'grok-4-1-fast-reasoning').estimate || R_PLANNER;
    if (est > AUTHORIZED) {
      say('    [BUDGET] one draw estimates $' + est.toFixed(6) + ' — over the ceiling. ABORTED.');
      calls.push({ stage, outcome: 'blocked_budget', est });
      try { await route.abort(); } catch (_) {} return;
    }
    say('    [DISPATCH] planner draw ' + i + ' — estimated $' + est.toFixed(6));
    let resp = null;
    try { resp = await route.fetch(); } catch (e) {
      calls.push({ stage, outcome: 'transit_error' });
      try { await route.abort(); } catch (_) {} return;
    }
    const text = await resp.text();
    write('draw' + i + '_response.json', text);
    ledger.recordCost('planner', text, est);
    calls.push({ stage, outcome: 'dispatched_live' });
    replyText = text;
    return route.fulfill({ status: resp.status(), contentType: 'application/json', body: text });
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window._launchStarterStory === 'function'
    && typeof window._sceneDecisionAxis === 'function', { timeout: 30000 });

  // THE FS SEQUENCE, production functions only, from the shared module.
  const def = await findFSDef(page);
  await launchFS(page, def);
  await unlockFS(page, 'lane-sample');
  await finalizePreview(page);
  const axis = await readAxis(page);
  await advanceExpectingGate(page, 'placeholder — the gate must refuse this', 'placeholder');
  const picked = await chooseBranch(page, ARM === 'B' || ARM === 'C' ? 'B' : 'A');

  // Wait for the draw to resolve: the planner answers, then the gate either passes it to the
  // author or refuses it. Both outcomes announce themselves.
  const deadline = Date.now() + 180000;
  while (Date.now() < deadline) {
    if (authorAttempted) break;
    if (lines.some(x => /\[CG:PLANNER-GATE\] REJECTED|\[CG:STALE-STOP\]/i.test(x))) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  await new Promise(r => setTimeout(r, 6000));   // let the retry fire so the blocker is exercised

  const gateLines = lines.filter(x => /\[CG:PLANNER-GATE\]/i.test(x));
  const rejected = gateLines.some(x => /REJECTED/i.test(x));
  const laneInconsistent = gateLines.some(x => /chosen_aftermath_lane/i.test(x));
  const otherReject = lines.some(x => /\[OBJECTIVE:REJECTED\]|\[CONTINUATION:REJECT\]/i.test(x));
  let verdict = 'undetermined';
  if (authorAttempted && !rejected) verdict = 'accepted';
  else if (laneInconsistent) verdict = 'lane_inconsistent';
  else if (rejected) verdict = 'gate_rejected_other';
  else if (otherReject) verdict = 'rejected_before_lane_gate';

  let parsed = null;
  try {
    const s = replyText.indexOf('{'), e = replyText.lastIndexOf('}');
    const inner = JSON.parse(replyText.slice(s, e + 1));
    parsed = inner.content ? JSON.parse(String(inner.content).slice(
      String(inner.content).indexOf('{'), String(inner.content).lastIndexOf('}') + 1)) : inner;
  } catch (_) {}
  const reply = parsed && parsed.chosen_aftermath_lane ? parsed : (() => {
    try {
      const j = JSON.parse(replyText);
      const c = j.content || (j.choices && j.choices[0] && j.choices[0].message.content) || '';
      return JSON.parse(c.slice(c.indexOf('{'), c.lastIndexOf('}') + 1));
    } catch (_) { return null; }
  })();

  const row = { draw: i, verdict, authorAttempted, rejected, laneInconsistent,
    declaredLane: reply ? (reply.chosen_aftermath_lane || null) : null,
    stateChange: reply ? (reply.state_change || null) : null,
    tacticalMove: reply ? (reply.tactical_move || null) : null,
    pressureScope: reply ? (reply.pressure_scope || null) : null,
    canonChange: reply ? (reply.canon_change || null) : null,
    introduces: reply ? (reply.introduces || null) : null,
    axis: axis ? axis.axis : null, decision: picked.after.decision1 || null,
    gateLines, calls,
    blockedRetries: calls.filter(c => c.outcome === 'blocked_second_attempt').length };
  results.push(row);
  write('draw' + i + '_verdict.json', { ...row, consoleLines: lines });
  say('    verdict: ' + verdict.toUpperCase()
    + (row.declaredLane ? '   lane="' + row.declaredLane + '"' : '')
    + (row.blockedRetries ? '   (' + row.blockedRetries + ' retry blocked)' : ''));
  if (gateLines.length) say('    gate: ' + gateLines[0].slice(0, 165));
  await page.close();
}

await browser.close();

// ── THE RATE ────────────────────────────────────────────────────────────────
const n = results.length;
const count = (v) => results.filter(r => r.verdict === v).length;
say('\n── LANE CONSISTENCY');
say('  draws                : ' + n);
say('  ACCEPTED by the gate : ' + count('accepted'));
say('  lane-inconsistent    : ' + count('lane_inconsistent'));
say('  rejected (other)     : ' + (count('gate_rejected_other') + count('rejected_before_lane_gate')));
say('  undetermined         : ' + count('undetermined'));
say('\n  draw | verdict            | declared lane');
results.forEach(r => say('  ' + String(r.draw).padStart(4) + ' | '
  + r.verdict.padEnd(18) + ' | ' + (r.declaredLane || '-')));

// NINE CONSECUTIVE PASSES ARE WHAT A TEN-SCENE ISSUE NEEDS. Stated as arithmetic on this sample,
// not as a prediction: one run of nine is not nine independent draws, but if the per-draw pass rate
// is p, the chance all nine pass is p^9, and that is the number worth seeing before funding it.
if (n > 0) {
  const p = count('accepted') / n;
  say('\n  per-draw acceptance on this sample: ' + (p * 100).toFixed(0) + '% (' + count('accepted')
    + '/' + n + ')');
  say('  nine consecutive passes at that rate: ' + (Math.pow(p, 9) * 100).toFixed(1) + '%');
  say('  (arithmetic on a small sample, not a prediction — and a 10-scene run needs all nine)');
}

write('summary.json', { samples: n, arm: ARM, mode: DRY ? 'dry_replay' : 'live',
  plannerFixture: PLANNER_FIXTURE, reserved, authorized: LIVE ? AUTHORIZED : 0,
  counts: { accepted: count('accepted'), lane_inconsistent: count('lane_inconsistent'),
    gate_rejected_other: count('gate_rejected_other'),
    rejected_before_lane_gate: count('rejected_before_lane_gate'),
    undetermined: count('undetermined') },
  results, checks: { pass, fail } });

if (LIVE) ledger.spendReport(AUTHORIZED);
else say('\nSPEND: $0 — nothing was dispatched (' + (DRY ? 'dry replay' : 'estimate') + ').');
say('\nartefacts: ' + RUN);
process.exit(0);
