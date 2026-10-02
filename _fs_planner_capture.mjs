// CAPTURE ONE REAL FS CG PLANNER RESPONSE. One call. One attempt. No second draw.
//
// WHY THIS EXISTS. The FS scene 1 → 2 seam is green up to the planner dispatch and then the app
// REJECTS the reply I replay at it:
//     [CG:STALE-REJECTED] local objective not accepted: no local_objective; no posture_read;
//                         no present cast
// The fixture is run 13's CONTINUATION ENVELOPE, recorded from a synthetic story. FS's CG scene-2
// planner wants a different shape, and I will not hand-author one: a mock that returns a shape I
// invented proves only that the harness agrees with itself. So the shape gets RECORDED from one
// real call.
//
// THE SPEND BOUND IS STRUCTURAL, NOT A PROMISE.
//   · exactly ONE planner request may reach the network, ever — a module-level latch, checked and
//     set before the fetch, so even concurrent routes cannot both pass
//   · the app's OWN retry is what makes this necessary: a rejected reply makes it "retry once with
//     the current branch/attempt", which would be a second charge for the same question. The second
//     request is BLOCKED and recorded. A blocked retry is a result, not a failure to work around.
//   · author, verifier, memory, bible and every unrelated stage are ABORTED, never served live
//   · the reservation is R_PLANNER and nothing else, so it cannot exceed $0.017550
//
// IF THE ONE REPLY IS REJECTED, THAT IS STILL THE ANSWER. The request, the reply and the app's
// verbatim rejection are all written out: that is the shape evidence the fixture needs, whether the
// app accepted it or not.
//
// Usage:
//   node _fs_planner_capture.mjs --dry-replay          provider-free, $0 — exercises the blocker
//   node _fs_planner_capture.mjs --estimate-only       prints the reservation, launches nothing
//   node _fs_planner_capture.mjs --authorize 0.02      ONE live planner call
import fs from 'fs';
import { chromium } from 'playwright-core';
import { estimateUsd } from './_fsc_cost_guard.mjs';
import { R_PLANNER, makeSpendLedger } from './_live_spend_ledger.mjs';
import { stageOf, isProviderEndpoint, plannerFor, AUTHOR } from './_replay_fixtures.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview, readAxis, advanceExpectingGate,
  chooseBranch } from './_fs_story_setup.mjs';

const ARG = process.argv.slice(2);
const numArg = (f, d) => { const i = ARG.indexOf(f); return i >= 0 ? Number(ARG[i + 1]) : d; };
const DRY = ARG.includes('--dry-replay');
const ESTIMATE_ONLY = ARG.includes('--estimate-only');
const AUTHORIZED = numArg('--authorize', null);
const BRANCH = (ARG.indexOf('--branch') >= 0) ? String(ARG[ARG.indexOf('--branch') + 1]) : 'A';

if (!DRY && !ESTIMATE_ONLY && !(AUTHORIZED > 0)) {
  console.error('REFUSED: this run would dispatch a real provider call.');
  console.error('  node _fs_planner_capture.mjs --dry-replay');
  console.error('  node _fs_planner_capture.mjs --estimate-only');
  console.error('  node _fs_planner_capture.mjs --authorize <usd>');
  process.exit(2);
}
const LIVE = !DRY && !ESTIMATE_ONLY;

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const RUN = '_fs_planner_capture_out/run_' + stamp;
fs.mkdirSync(RUN, { recursive: true });
const say = (s) => { console.log(s); fs.appendFileSync(RUN + '/log.txt', s + '\n'); };
const write = (n, s) => fs.writeFileSync(RUN + '/' + n,
  typeof s === 'string' ? s : JSON.stringify(s, null, 2));

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; say('  ok   ' + n); }
  else { fail++; say('  FAIL ' + n + (d ? '  — ' + d : '')); } };

say('=== FS CG PLANNER CAPTURE — ONE CALL, ONE ATTEMPT ===');
say('  mode    : ' + (ESTIMATE_ONLY ? 'ESTIMATE ONLY' : (DRY ? 'DRY REPLAY (provider-free, $0)'
  : 'LIVE, authorized $' + AUTHORIZED.toFixed(2))));
say('  branch  : ' + BRANCH);
say('  output  : ' + RUN);

// ── THE RESERVATION: ONE PLANNER CALL, NOTHING ELSE ─────────────────────────
const reserved = R_PLANNER;
say('\nRESERVATION');
say('  one planner call : $' + R_PLANNER.toFixed(6));
say('  author, verifier, memory, scaffold: ABORTED — not reserved, cannot be billed');
say('  TOTAL            : $' + reserved.toFixed(6));
if (LIVE && reserved > AUTHORIZED) {
  say('\nREFUSED BEFORE DISPATCH: reserved $' + reserved.toFixed(6)
    + ' exceeds the authorized $' + AUTHORIZED.toFixed(2));
  write('refusal.json', { reserved, authorized: AUTHORIZED, dispatched: 0 });
  process.exit(3);
}
if (LIVE) say('  within authorization — $' + (AUTHORIZED - reserved).toFixed(6) + ' headroom');
if (ESTIMATE_ONLY) {
  say('\nESTIMATE ONLY — no browser launched, nothing dispatched. $0 spent.');
  write('estimate.json', { reserved, perPlannerCall: R_PLANNER });
  process.exit(0);
}

const ledger = makeSpendLedger(say);
// THE LATCH. One live planner request for the lifetime of this process.
let plannerLiveUsed = false;
const calls = [];      // { stage, outcome, bytes }
const consoleLines = [];

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => {
  const x = m.text();
  if (/\[BAKED|\[STARTER\]|\[STAGED|\[SCENE-DECISION\]|\[INTIMATE|\[CG|\[PREVIEW|\[TIERED|Blocked|stale|reject/i
    .test(x)) consoleLines.push(x);
});

await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  if (!isProviderEndpoint(url)) {
    calls.push({ stage: 'infrastructure', url, outcome: 'aborted' });
    try { await route.abort(); } catch (_) {} return;
  }
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = '', usr = '', body = null;
  try { body = JSON.parse(raw || '{}');
    sys = String((body.messages || [])[0]?.content || '');
    usr = String((body.messages || [])[1]?.content || ''); } catch (_) {}
  const stage = stageOf(sys);

  // EVERYTHING THAT IS NOT THE PLANNER IS ABORTED. The author is 83% of a scene's cost and is not
  // part of this question; the scaffold, verifier and memory extractor are not either.
  if (stage !== 'planner') {
    calls.push({ stage, url, outcome: 'aborted' });
    try { await route.abort(); } catch (_) {} return;
  }

  // THE SECOND PLANNER REQUEST IS THE APP'S OWN RETRY. Blocked, recorded, never paid for.
  if (plannerLiveUsed) {
    say('    [BLOCKED] a SECOND planner request — the app\'s retry after its first reply was');
    say('              rejected. One attempt per draw: this is refused, not paid for.');
    calls.push({ stage: 'planner', url, outcome: 'blocked_second_attempt' });
    write('blocked_second_request.json', { system: sys, user: usr });
    try { await route.abort(); } catch (_) {} return;
  }
  plannerLiveUsed = true;
  write('planner_request.json', { system: sys, user: usr, model: body && body.model,
    max_tokens: body && body.max_tokens });

  if (DRY) {
    // The dry run serves the KNOWN-WRONG fixture on purpose: that is what triggers the app's
    // stale rejection and therefore its retry, which is exactly what the blocker above must catch.
    let fixture = null;
    try { fixture = plannerFor(2); } catch (_) {}
    calls.push({ stage: 'planner', url, outcome: 'replayed_known_wrong_fixture',
      bytes: (fixture || '').length });
    if (fixture === null) { try { await route.abort(); } catch (_) {} return; }
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: fixture }) });
  }

  const est = estimateUsd(body || { messages: [], max_tokens: 0 },
    (body && body.model) || 'grok-4-1-fast-reasoning').estimate || R_PLANNER;
  if (est > AUTHORIZED) {
    say('    [BUDGET] the planner request alone estimates $' + est.toFixed(6)
      + ', over the authorized $' + AUTHORIZED.toFixed(2) + ' — ABORTED');
    calls.push({ stage: 'planner', url, outcome: 'blocked_budget', est });
    try { await route.abort(); } catch (_) {} return;
  }
  say('    [DISPATCH] the one planner call — estimated $' + est.toFixed(6));
  let resp = null;
  try { resp = await route.fetch(); } catch (e) {
    say('    [DISPATCH] failed in transit — ' + (e && e.message));
    calls.push({ stage: 'planner', url, outcome: 'transit_error' });
    try { await route.abort(); } catch (_) {} return;
  }
  const text = await resp.text();
  write('planner_response.json', text);
  ledger.recordCost('planner', text, est);
  calls.push({ stage: 'planner', url, outcome: 'dispatched_live', bytes: text.length });
  return route.fulfill({ status: resp.status(), contentType: 'application/json', body: text });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => typeof window._launchStarterStory === 'function'
  && typeof window._sceneDecisionAxis === 'function', { timeout: 20000 });

// ── THE FS SEQUENCE, from the shared module ─────────────────────────────────
const def = await findFSDef(page);
t('the FS launch definition is reachable', !!def);
const mounted = await launchFS(page, def);
t('the baked scene 1 mounted', !!mounted.mountedAt);
t('it mounted with no provider call',
  calls.filter(c => c.stage !== 'infrastructure').length === 0,
  JSON.stringify(calls.filter(c => c.stage !== 'infrastructure')));
const unlock = await unlockFS(page, 'planner-capture');
t('the production unlock committed scene 1', unlock.returned === true && unlock.state.sceneCount === 1,
  JSON.stringify(unlock.returned) + ' scenes=' + unlock.state.sceneCount);
const fin = await finalizePreview(page);
t('the preview was finalized', fin.ran === true && fin.after.previewActive === false,
  JSON.stringify(fin));
const axis = await readAxis(page);
t('the authored axis is readable', !!axis, JSON.stringify(axis));
say('  axis: "' + (axis && axis.axis) + '"');

const gated = await advanceExpectingGate(page, 'placeholder — the gate must refuse this', 'placeholder');
t('the first advance REFUSED and mounted the decision prompt',
  gated.promptMounted === true, JSON.stringify(gated));
t('and it dispatched NOTHING while the choice was unrecorded',
  calls.filter(c => c.stage !== 'infrastructure').length === 0,
  JSON.stringify(calls.filter(c => c.stage !== 'infrastructure')));

const chosen = await chooseBranch(page, BRANCH);
t('the choice was recorded by the prompt\'s own handler',
  !!(chosen.after.decision1 && chosen.after.decision1.choice), JSON.stringify(chosen.after));
say('  recorded: ' + JSON.stringify(chosen.after.decision1) + '  [click via ' + chosen.route + ']');

// ── WAIT FOR THE ONE CALL, AND FOR THE APP TO SETTLE ────────────────────────
const deadline = Date.now() + 180000;
while (Date.now() < deadline && !calls.some(c => c.stage === 'planner')) {
  await new Promise(r => setTimeout(r, 1000));
}
// Give the app time to judge the reply and attempt its retry, so the blocker is exercised.
await new Promise(r => setTimeout(r, 20000));

const plannerCalls = calls.filter(c => c.stage === 'planner');
const servedLive = plannerCalls.filter(c => c.outcome === 'dispatched_live');
const blockedRetry = plannerCalls.filter(c => c.outcome === 'blocked_second_attempt');
t('the planner was reached', plannerCalls.length >= 1, JSON.stringify(plannerCalls));
t('AT MOST ONE planner request was ever answered',
  plannerCalls.filter(c => /dispatched_live|replayed_known_wrong_fixture/.test(c.outcome)).length === 1,
  JSON.stringify(plannerCalls.map(c => c.outcome)));
t('no live planner call beyond the first', servedLive.length <= 1,
  servedLive.length + ' live dispatches');
t('nothing but the planner was ever answered',
  calls.filter(c => c.stage !== 'planner' && c.stage !== 'infrastructure'
    && c.outcome !== 'aborted').length === 0,
  JSON.stringify(calls.filter(c => c.outcome !== 'aborted' && c.stage !== 'planner')));
if (blockedRetry.length) {
  t('the app\'s retry was BLOCKED, not paid for', true);
  say('  the app attempted ' + blockedRetry.length + ' retry/retries; each was refused');
}

// ── PRESERVE THE EVIDENCE, ACCEPTED OR NOT ──────────────────────────────────
const stale = consoleLines.filter(x => /stale|reject|not accepted/i.test(x));
write('console.json', consoleLines);
write('stale_reason.txt', stale.join('\n'));
const outcome = await page.evaluate(() => {
  let proj = ''; try { proj = String(window._sbLatestProseText(window.state) || ''); } catch (_) {}
  return { projLen: proj.length, sceneCount: (window.state.scenes || []).length,
    turnCount: window.state.turnCount,
    staged: !!((window.state._stagedActive || {}).plan || {}).beats };
});
write('manifest.json', { mode: DRY ? 'dry_replay' : 'live', branch: BRANCH,
  authorized: LIVE ? AUTHORIZED : 0, reserved,
  axis, decision: chosen.after.decision1, clickRoute: chosen.route,
  calls, plannerAnswered: plannerCalls.length, blockedRetries: blockedRetry.length,
  staleReasons: stale, outcome, checks: { pass, fail } });

t('the planner REQUEST was preserved', fs.existsSync(RUN + '/planner_request.json'));
if (DRY) {
  t('the stale-rejection reason was captured verbatim', stale.length > 0,
    'no stale/reject line seen — the fixture may have been accepted');
  say('\n  the app\'s own words:');
  stale.slice(0, 4).forEach(x => say('    · ' + x.slice(0, 170)));
} else {
  t('the planner RESPONSE was preserved', fs.existsSync(RUN + '/planner_response.json'));
  if (stale.length) {
    say('\n  THE REPLY WAS REJECTED. That is still the shape evidence this run was for:');
    stale.slice(0, 4).forEach(x => say('    · ' + x.slice(0, 170)));
  }
}

await browser.close();
if (LIVE) ledger.spendReport(AUTHORIZED);
else say('\nSPEND: $0 — nothing was dispatched (' + (DRY ? 'dry replay' : 'estimate') + ').');
say('\n' + pass + '/' + (pass + fail) + ' checks passed');
say('artefacts: ' + RUN);
process.exit(fail ? 1 : 0);
