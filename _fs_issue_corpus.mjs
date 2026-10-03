// ONE FULL FIRST SACRIFICE ISSUE — 10 SCENES, FATE-CARD DRIVEN, SEEDED.
//
// WHAT THIS REPLACES. The earlier design was three 6-scene arms compared against each other. That
// comparison is not available: the product's scene-1 decision is a TWO-button axis, so a third arm
// could only share a button and differ in typed text, and three single runs cannot support a
// branch comparison anyway. This is ONE EXPLORATORY TRAJECTORY through a whole issue, pre-registered
// as such.
//
// THE SHAPE
//   scene 1        the FIXED baked opening. Zero provider calls, zero reservation.
//   scene 2        the authored two-button axis, recorded through the prompt's own handler.
//   scenes 2..10   at every gate the five authored Fate cards are exposed; one is chosen by a
//                  SEEDED draw and played through the production click handler.
//   9 generated scenes total.
//
// NO ARBITRARY SAY/DO. The reader's input is the Fate card, not text I invent. A card selected
// through setSelectedState is what the scene generator reads
// (`state.fateOptions[state.fateSelectedIndex]`), so the submission carries the card's own authored
// intent. Say/do is submitted EMPTY on purpose, and that is recorded per scene.
//
// WHY A SEED AND NOT A MODEL. The brief says "select one card randomly"; a seeded PRNG does exactly
// that and is REPRODUCIBLE — the seed is recorded, so the same trajectory can be re-run or audited.
// Asking a model to pick would add a paid call and a judgment this study is not measuring.
//
// Usage:
//   node _fs_issue_corpus.mjs --estimate-only
//   node _fs_issue_corpus.mjs --dry-replay --planner-fixture <file>
//   node _fs_issue_corpus.mjs --authorize 1.45 --seed 20261002
import fs from 'fs';
import crypto from 'node:crypto';
import { chromium } from 'playwright-core';
import { estimateUsd } from './_fsc_cost_guard.mjs';
import { R_SCENE, R_PLANNER, R_AUTHOR, R_VERIFIER, makeSpendLedger, reservationLines }
  from './_live_spend_ledger.mjs';
import { stageOf, isProviderEndpoint, AUTHOR as REPLAY_AUTHOR, MEMORY, verifierVerdict,
  refsFromVerifierRequest } from './_replay_fixtures.mjs';
import { classifyAttempt } from './_attempt_policy.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview, readAxis, advanceExpectingGate,
  chooseBranch } from './_fs_story_setup.mjs';

const ARG = process.argv.slice(2);
const numArg = (f, d) => { const i = ARG.indexOf(f); return i >= 0 ? Number(ARG[i + 1]) : d; };
const strArg = (f, d) => { const i = ARG.indexOf(f); return i >= 0 ? String(ARG[i + 1]) : d; };

const SCENES = numArg('--scenes', 10);          // a CG issue is 10 (ISSUE_PRICING.cg)
const SEED = numArg('--seed', 20261002);
const ARM = strArg('--arm', 'A');
const ESTIMATE_ONLY = ARG.includes('--estimate-only');
const DRY = ARG.includes('--dry-replay');
const AUTHORIZED = numArg('--authorize', null);
const PLANNER_FIXTURE = strArg('--planner-fixture', null);
// A TRANSPORT FAILURE IS NOT A USED ATTEMPT (Roman 2026-10-02). The live run dispatched the author,
// the fetch threw, and the one-attempt rule then refused the app's two legitimate retries — turning
// a transient failure into a stopped run. A retry after a COMPLETED response is a second charge for
// one question and stays blocked; a retry after the request never came back is the app recovering.
// Bounded, because "retry until it works" is how a capped run stops being capped.
const MAX_TRANSPORT_RETRIES = numArg('--max-transport-retries', 1);
// EXPLICIT TIMEOUTS. playwright's route.fetch() defaults to 30s. This was the FIRST live author
// call in the project — ~8000 max_tokens on Grok — and 30s is not a plausible budget for it. Every
// earlier author was replayed, so the default had never been tested against a real one.
const AUTHOR_TIMEOUT_MS = numArg('--author-timeout-ms', 300000);
const OTHER_TIMEOUT_MS = numArg('--stage-timeout-ms', 120000);
// DRY-ONLY FAULT INJECTION, so the transport path is provable at $0: --simulate-transit-fail
// author:2 makes the first two author requests behave as if the fetch threw. Refused outside dry
// mode — injecting a fault into a paid run would be deliberately breaking a provider to prove a
// fallback, which is exactly what must never happen on a paid run.
const SIM_FAIL = strArg('--simulate-transit-fail', null);
const simFail = {};
if (SIM_FAIL) {
  SIM_FAIL.split(',').forEach((pair) => {
    const [st, n] = String(pair).split(':');
    if (st) simFail[st.trim()] = Number(n || 1);
  });
}

if (!(SCENES >= 2 && SCENES <= 10)) {
  console.error('REFUSED: --scenes must be 2..10; a CG issue is 10.');
  process.exit(2);
}
if (!DRY && !ESTIMATE_ONLY && !(AUTHORIZED > 0)) {
  console.error('REFUSED: this run dispatches real provider calls.');
  console.error('  --estimate-only | --dry-replay --planner-fixture <file> | --authorize <usd>');
  process.exit(2);
}
if (DRY && !PLANNER_FIXTURE) {
  console.error('REFUSED: --dry-replay needs --planner-fixture <recorded response file>.');
  process.exit(2);
}
if (SIM_FAIL && !DRY) {
  console.error('REFUSED: --simulate-transit-fail is dry-run only. Breaking a provider call on a '
    + 'paid run to prove the retry path is never acceptable.');
  process.exit(2);
}
if (!(MAX_TRANSPORT_RETRIES >= 0 && MAX_TRANSPORT_RETRIES <= 2)) {
  console.error('REFUSED: --max-transport-retries must be 0..2.');
  process.exit(2);
}
const LIVE = !DRY && !ESTIMATE_ONLY;

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const RUN = '_fs_issue_corpus_out/run_' + stamp;
fs.mkdirSync(RUN + '/scenes', { recursive: true });
const say = (s) => { console.log(s); fs.appendFileSync(RUN + '/log.txt', s + '\n'); };
const write = (n, s) => fs.writeFileSync(RUN + '/' + n,
  typeof s === 'string' ? s : JSON.stringify(s, null, 2));

let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; say('  ok   ' + n); }
  else { fail++; say('  FAIL ' + n + (d ? '  — ' + d : '')); } };

// A SEEDED PRNG. mulberry32: tiny, deterministic, and the seed is in the manifest, so the
// trajectory is reproducible rather than merely "random".
let _s = SEED >>> 0;
const rnd = () => { _s |= 0; _s = _s + 0x6D2B79F5 | 0;
  let tt = Math.imul(_s ^ _s >>> 15, 1 | _s);
  tt = tt + Math.imul(tt ^ tt >>> 7, 61 | tt) ^ tt;
  return ((tt ^ tt >>> 14) >>> 0) / 4294967296; };

say('=== ONE FULL FS ISSUE — ' + SCENES + ' SCENES, FATE-CARD DRIVEN ===');
say('  mode    : ' + (ESTIMATE_ONLY ? 'ESTIMATE ONLY'
  : (DRY ? 'DRY REPLAY of ' + PLANNER_FIXTURE : 'LIVE, authorized $' + AUTHORIZED.toFixed(2))));
say('  seed    : ' + SEED + '   arm: ' + ARM + '   output: ' + RUN);

// ── RESERVATION: NINE GENERATED SCENES ──────────────────────────────────────
const LIVE_SCENES = SCENES - 1;       // scene 1 is the baked opening
// THE RETRY IS RESERVED, NOT HOPED AWAY. With a transport retry allowed, any stage may be
// dispatched up to (1 + MAX_TRANSPORT_RETRIES) times in a scene, and a request that never comes
// back may still have billed. A reservation the real run can exceed is not a reservation, so the
// worst case is reserved in full rather than assuming retries stay rare.
const ATTEMPTS_PER_STAGE = 1 + MAX_TRANSPORT_RETRIES;
const reserved = R_SCENE * LIVE_SCENES * ATTEMPTS_PER_STAGE;
say('\nRESERVATION (from the shared estimator, _live_spend_ledger.mjs)');
reservationLines().forEach(say);
say('  scene 1 is FS\'s BAKED opening — fixed, authored, ZERO provider calls, not reserved');
say('  transport retries allowed: ' + MAX_TRANSPORT_RETRIES + ' per stage per scene, so every'
  + ' stage is reserved ' + ATTEMPTS_PER_STAGE + 'x — a dispatched call that never returns may'
  + ' still have billed');
say('  ' + LIVE_SCENES + ' generated scene(s) × $' + R_SCENE.toFixed(6) + ' × '
  + ATTEMPTS_PER_STAGE + ' = $' + reserved.toFixed(6));
if (LIVE && reserved > AUTHORIZED) {
  say('\nREFUSED BEFORE DISPATCH: reserved $' + reserved.toFixed(6)
    + ' exceeds the authorized $' + AUTHORIZED.toFixed(2));
  write('refusal.json', { reserved, authorized: AUTHORIZED, scenes: SCENES, dispatched: 0 });
  process.exit(3);
}
if (LIVE) say('  within authorization — $' + (AUTHORIZED - reserved).toFixed(6) + ' headroom');
if (ESTIMATE_ONLY) {
  say('\nESTIMATE ONLY — no browser launched, nothing dispatched. $0 spent.');
  write('estimate.json', { scenes: SCENES, liveScenes: LIVE_SCENES, perScene: R_SCENE, reserved,
    maxTransportRetries: MAX_TRANSPORT_RETRIES, attemptsPerStage: ATTEMPTS_PER_STAGE,
    perSceneWorstCase: R_SCENE * ATTEMPTS_PER_STAGE,
    stages: { planner: R_PLANNER, author: R_AUTHOR, verifier: R_VERIFIER } });
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
let spentEstimate = 0;
let sceneNo = 1;
const calls = [];
const blocked = [];
const refusals = [];
const verifierSeen = [];

const browser = await chromium.launch();
const page = await browser.newPage();
page.on('console', (m) => {
  const x = m.text();
  if (/\[STAGED|\[CG|\[OBJECTIVE:REJECTED\]|\[CONTINUATION|\[SCENE-DECISION\]|\[ROLLBACK\]|\[PREVIEW|\[BAKED|\[FATE|\[TIERED|Blocked|reject|stale|refus/i
    .test(x)) refusals.push({ scene: sceneNo, txt: x });
});

await page.route('**/api/**', async (route) => {
  const req = route.request();
  const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  if (!isProviderEndpoint(url)) { try { await route.abort(); } catch (_) {} return; }
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let sys = '', usr = '', body = null;
  try { body = JSON.parse(raw || '{}');
    sys = String((body.messages || [])[0]?.content || '');
    usr = String((body.messages || [])[1]?.content || ''); } catch (_) {}
  const stage = stageOf(sys);
  const give = (c) => route.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ content: c }) });

  if (stage === 'memory') { calls.push({ scene: sceneNo, stage, outcome: 'replayed' }); return give(MEMORY); }
  if (stage === 'bible' || stage === 'other') {
    calls.push({ scene: sceneNo, stage, outcome: 'aborted' });
    try { await route.abort(); } catch (_) {} return;
  }
  // TWO DIFFERENT RETRIES, TWO DIFFERENT ANSWERS.
  //   a COMPLETED response for this stage already exists -> a retry is a second charge for one
  //     question. BLOCKED, as before.
  //   the previous attempt never came back -> the app is recovering from a transport failure, and
  //     refusing it guarantees the scene cannot render. ALLOWED, up to MAX_TRANSPORT_RETRIES.
  // The live run conflated these and stopped the issue at scene 2 on a transient failure.
  // THE DECISION LIVES IN _attempt_policy.mjs so it is one definition and testable without a
  // provider — the app does not re-request a stage after a completed response in this flow, so
  // that branch cannot be exercised end to end here and is proven at the policy level instead.
  const mine = calls.filter(c => c.scene === sceneNo && c.stage === stage);
  const verdictA = classifyAttempt({
    completed: mine.some(c => /^(dispatched|replayed)$/.test(c.outcome)),
    transportFails: mine.filter(c => c.outcome === 'transit_error').length,
    maxTransportRetries: MAX_TRANSPORT_RETRIES });
  if (!verdictA.allow) {
    blocked.push({ scene: sceneNo, stage, why: verdictA.why });
    calls.push({ scene: sceneNo, stage, outcome: verdictA.outcome });
    say('    [BLOCKED] ' + stage + ' — ' + verdictA.why);
    try { await route.abort(); } catch (_) {} return;
  }
  if (verdictA.attempt > 1) {
    say('    [RETRY] ' + stage + ' attempt ' + verdictA.attempt + ' of ' + verdictA.of
      + ' — ' + verdictA.why);
  }
  if (DRY) {
    // DRY FAULT INJECTION: behave exactly as a thrown fetch does, including the accounting, so the
    // retry and the unmeasured-exposure paths are exercised without a provider.
    if (simFail[stage] && simFail[stage] > 0) {
      simFail[stage] -= 1;
      const estSim = (stage === 'author') ? R_AUTHOR
        : (stage === 'planner' ? R_PLANNER : R_VERIFIER);
      say('    [SIMULATED TRANSIT FAILURE] ' + stage + ' scene ' + sceneNo
        + ' — accounted as dispatched-with-no-response');
      calls.push({ scene: sceneNo, stage, outcome: 'transit_error', simulated: true });
      ledger.recordDispatchedNoResponse(stage, estSim, 'simulated transit failure (dry run)');
      try { await route.abort(); } catch (_) {} return;
    }
    calls.push({ scene: sceneNo, stage, outcome: 'replayed' });
    if (stage === 'planner') { try { return give(recordedReply(PLANNER_FIXTURE)); }
      catch (e) { say('  REFUSED: ' + e.message); try { await route.abort(); } catch (_) {} return; } }
    if (stage === 'author') return give(REPLAY_AUTHOR);
    if (stage === 'verifier') {
      const refs = refsFromVerifierRequest(usr);
      verifierSeen.push({ scene: sceneNo, refs });
      return give(verifierVerdict(refs));
    }
    try { await route.abort(); } catch (_) {} return;
  }
  const est = estimateUsd(body || { messages: [], max_tokens: 0 },
    (body && body.model) || 'grok-4-1-fast-reasoning').estimate || 0;
  if (spentEstimate + est > AUTHORIZED) {
    say('    [BUDGET] blocking ' + stage + ' on scene ' + sceneNo + ' — would exceed $'
      + AUTHORIZED.toFixed(2));
    blocked.push({ scene: sceneNo, stage, why: 'would exceed authorization' });
    calls.push({ scene: sceneNo, stage, outcome: 'blocked_budget' });
    try { await route.abort(); } catch (_) {} return;
  }
  spentEstimate += est;
  const timeoutMs = (stage === 'author') ? AUTHOR_TIMEOUT_MS : OTHER_TIMEOUT_MS;
  say('    [DISPATCH] ' + stage + ' scene ' + sceneNo + ' — est $' + est.toFixed(6)
    + ' (committed $' + spentEstimate.toFixed(6) + ', timeout ' + (timeoutMs / 1000) + 's)');
  if (stage === 'verifier') verifierSeen.push({ scene: sceneNo, refs: refsFromVerifierRequest(usr) });
  let resp = null;
  try {
    resp = await route.fetch({ timeout: timeoutMs });
  } catch (e) {
    // THE REQUEST LEFT AND NOTHING CAME BACK. Both halves matter: the error text, which the live
    // run discarded and left the failure undiagnosable, and the MONEY — a dispatched request may
    // have billed, so this is unmeasured exposure, never $0.
    const msg = (e && e.message) ? String(e.message).slice(0, 300) : 'unknown';
    say('    [TRANSIT FAILURE] ' + stage + ' scene ' + sceneNo + ' — ' + msg);
    calls.push({ scene: sceneNo, stage, outcome: 'transit_error', error: msg });
    ledger.recordDispatchedNoResponse(stage, est, msg, (body && body.model) || null);
    try { await route.abort(); } catch (_) {} return;
  }
  calls.push({ scene: sceneNo, stage, outcome: 'dispatched' });
  const text = await resp.text();
  write('scenes/s' + sceneNo + '_' + stage + '.json', text);
  ledger.recordCost(stage, text, est);
  return route.fulfill({ status: resp.status(), contentType: 'application/json', body: text });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._launchStarterStory === 'function'
  && typeof window._advanceStagedScene === 'function', { timeout: 30000 });

// ── THE FS SEQUENCE ─────────────────────────────────────────────────────────
say('\nBRINGING UP FIRST SACRIFICE');
const def = await findFSDef(page);
if (!def) { say('REFUSED: starter_first_sacrifice not in STARTER_STORIES.'); process.exit(4); }
const mount = await launchFS(page, def);
t('the baked opening mounted', !!mount.mountedAt);
const unlock = await unlockFS(page, 'issue-corpus');
t('scene 1 committed as scenes[0]', unlock.returned === true && unlock.state.sceneCount === 1);
const fin = await finalizePreview(page);
t('the preview was finalized', fin.ran === true && fin.after.previewActive === false);
const axis = await readAxis(page);
t('the authored axis is readable', !!axis);
say('  axis: "' + (axis && axis.axis) + '"');

// WHICH SCENES EVEN HAVE A LANE GATE. Measured, not assumed: in the FS plan ONLY row n=2 declares
// an aftermathLanes menu, so from scene 3 on the lane check is INERT — it cannot reject, and it
// cannot "accept by signal" either. Labelling those scenes 'signal' would claim a check that never
// ran, which is exactly the kind of green that means nothing.
const laneMenuByScene = await page.evaluate(() => {
  const P = window.STARTER_PLANS && window.STARTER_PLANS.starter_first_sacrifice;
  const m = {};
  ((P && P.scenes) || []).forEach((r) => {
    m[String(r.n)] = Array.isArray(r.aftermathLanes) ? r.aftermathLanes.length : 0;
  });
  return m;
});
const scenesWithLanes = Object.keys(laneMenuByScene).filter(k => laneMenuByScene[k] > 0);
say('  lane menus declared on plan scene(s): ' + (scenesWithLanes.join(', ') || 'none')
  + ' — the lane gate is INERT everywhere else');

const readToGate = () => page.evaluate(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  const st = () => { const a = window.state._stagedActive || null;
    return a ? { beat: a.currentBeatIdx, gateShown: !!a.gateShown, microShown: !!a.microShown } : null; };
  if (!st()) return { ok: false, why: 'no staged session' };
  for (let i = 0; i < 240; i++) {
    const cur = st(); if (!cur || cur.gateShown) break;
    const prev = cur.beat;
    try { window._advanceStagedBeat(); } catch (_) {}
    await sleep(50);
    const nxt = st();
    if (nxt && nxt.beat === prev && !nxt.gateShown) {
      if (!nxt.microShown && typeof window._resolveMicroDecision === 'function') {
        try { window._resolveMicroDecision(0); } catch (_) {}
        await sleep(70);
      } else await sleep(100);
    }
  }
  return { ok: true, after: st() };
});

// THE FIVE AUTHORED CARDS, read from state rather than from the DOM's labels.
const readCards = () => page.evaluate(() => {
  const opts = Array.isArray(window.state.fateOptions) ? window.state.fateOptions : [];
  const dom = Array.from(document.querySelectorAll('[data-card-index]'))
    .map(el => ({ idx: Number(el.dataset.cardIndex),
      text: String(el.textContent || '').trim().slice(0, 160) }));
  return { count: opts.length,
    cards: opts.map((o, i) => ({ index: i,
      title: String((o && (o.title || o.label || o.name)) || '').slice(0, 120),
      text: String((o && (o.text || o.description || o.prompt || o.suggestion)) || '').slice(0, 400) })),
    domCards: dom, selectedIndex: window.state.fateSelectedIndex };
});

// PLAY A CARD THROUGH THE PRODUCTION HANDLER. The card element's own click calls
// setSelectedState, which is what records state.fateSelectedIndex. The harness never writes it.
const playCard = (idx) => page.evaluate((i) => {
  const el = document.querySelector('[data-card-index="' + i + '"]');
  if (!el) return { ok: false, why: 'no card element at index ' + i };
  try { el.click(); } catch (e) { return { ok: false, why: 'click threw: ' + e.message }; }
  return { ok: true, selectedIndex: window.state.fateSelectedIndex };
}, idx);

const snapshot = () => page.evaluate(() => {
  const cs = window._ensureCommittedState();
  const reg = window._protectedRegisterIds();
  let proj = ''; try { proj = String(window._sbLatestProseText(window.state) || ''); } catch (_) {}
  const verdicts = ((window.state._lastPerProposalAdjudication || {}).verdicts) || {};
  return { prose: proj, turnCount: window.state.turnCount,
    facts: cs.facts.map(f => ({ ref: f.proposalRef, content: f.content || null })),
    committedThrough: cs._committedThroughScene,
    pending: (window._pendingSealedForScene(window.state.turnCount) || []).map(p => p.kind),
    ctOutcome: (window.state._lastContinuationResult || {}).outcome || null,
    activatedLabels: Object.keys(reg).filter(k => reg[k].provenance === 'continuation_activated')
      .map(k => reg[k].label || k),
    // THE MODEL'S OWN VERDICT IS `status`; there is no `.delivery` on an adjudication record.
    // Reading `.delivery` is why a whole issue reported "delivery: null" and looked like the app
    // had lost the verifier's answer. It had not — my snapshot was reading a field that does not
    // exist. `status` is what the verifier said, `downgraded` is whether a guard then refused it,
    // `commit` is what actually happened, and `why` is the guard's own words. All four are kept
    // separate so a downgrade can never again be mistaken for the model's answer.
    verdicts: Object.keys(verdicts).map(k => ({ ref: k,
      status: verdicts[k].status || null,
      reason: verdicts[k].reason || null,
      downgraded: !!verdicts[k].downgraded,
      committed: !!verdicts[k].commit,
      preconditionSource: verdicts[k].preconditionSource || null,
      why: Array.isArray(verdicts[k].why) ? verdicts[k].why : (verdicts[k].why ? [String(verdicts[k].why)] : []) })) };
});

// ── THE ISSUE ───────────────────────────────────────────────────────────────
const history = [];
let stopReason = null;
for (let s = 1; s <= SCENES; s++) {
  sceneNo = s;
  say('\n── scene ' + s + '/' + SCENES);

  if (s === 1) {
    const snap0 = await snapshot();
    const prose0 = String(unlock.state.scene0 || snap0.prose || '');
    fs.writeFileSync(RUN + '/scenes/scene_01_prose.txt', prose0);
    t('scene 1: the baked opening captured (>=200 chars)', prose0.length >= 200, 'len=' + prose0.length);
    t('scene 1: no planner, no author', calls.filter(c => c.scene === 1
      && /planner|author/.test(c.stage)).length === 0);
    history.push({ scene: 1, baked: true, proseLen: prose0.length, proseText: prose0,
      cardSet: null, selectedCard: null, stages: [], facts: snap0.facts, verdicts: [],
      activatedLabels: snap0.activatedLabels, pending: snap0.pending, refusals: [] });
    say('   BAKED opening: ' + prose0.length + ' chars, no dispatch');
    continue;
  }

  // SCENE 2 IS THE AXIS. Recorded through the prompt's own handler, which also fires the resume.
  let decision = null, cardSet = null, selected = null;
  if (s === 2) {
    const gated = await advanceExpectingGate(page, '', '');
    t('scene 2: the advance refused until the choice was recorded', gated.promptMounted === true,
      JSON.stringify(gated));
    const picked = await chooseBranch(page, (ARM === 'B' || ARM === 'C') ? 'B' : 'A');
    t('scene 2: the choice was recorded by the prompt\'s handler',
      !!(picked.after.decision1 && picked.after.decision1.choice));
    decision = picked.after.decision1 || null;
    say('   axis choice: ' + JSON.stringify(decision && decision.choice));
  } else {
    // EVERY LATER GATE: expose the five cards, draw one on the seed, play it, submit EMPTY say/do.
    const gd = Date.now() + 150000;
    let open = false;
    while (Date.now() < gd) {
      open = await page.evaluate(() => !!(window.state._stagedActive || {}).gateShown);
      if (open) break;
      await readToGate();
      await new Promise(r => setTimeout(r, 500));
    }
    t('scene ' + s + ': the gate was OPEN at the moment of submission', open === true);
    if (!open) {
      stopReason = 'scene ' + s + ': the say/do gate never opened';
      say('  STOP: ' + stopReason);
      break;
    }
    cardSet = await readCards();
    t('scene ' + s + ': the authored Fate cards were exposed', cardSet.count > 0,
      'fateOptions=' + cardSet.count + ' domCards=' + cardSet.domCards.length);
    if (!cardSet.count) {
      stopReason = 'scene ' + s + ': no Fate cards were exposed at the gate, so there was nothing '
        + 'to play and this run will not invent say/do text to proceed';
      say('  STOP: ' + stopReason);
      break;
    }
    const draw = Math.floor(rnd() * cardSet.count);
    const played = await playCard(draw);
    t('scene ' + s + ': the drawn card was played through the production handler',
      played.ok === true && played.selectedIndex === draw,
      JSON.stringify(played) + ' wanted ' + draw);
    selected = { drawIndex: draw, card: cardSet.cards[draw] || null, played };
    say('   cards: ' + cardSet.count + '   drew #' + draw + ' "'
      + ((cardSet.cards[draw] || {}).title || '-') + '"');
    // EMPTY SAY/DO ON PURPOSE. The card is the reader's input; inventing text would make this a
    // study of my prose prompts rather than of the product's own affordance.
    await page.evaluate(() => { try { window._advanceStagedScene('', ''); } catch (e) {
      console.log('[STAGED] advance threw: ' + (e && e.message)); } });
  }

  // Wait for the author, then the mount, then the latch — all on real state.
  const dl = Date.now() + 240000;
  while (Date.now() < dl && !calls.some(c => c.scene === s && c.stage === 'author'
    && /dispatched|replayed/.test(c.outcome))) await new Promise(r => setTimeout(r, 1000));
  const md = Date.now() + 240000;
  let mounted = false;
  while (Date.now() < md) {
    mounted = await page.evaluate(() => { const a = window.state._stagedActive;
      return !!(a && a.plan && Array.isArray(a.plan.beats) && a.plan.beats.length > 0); });
    if (mounted) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  t('scene ' + s + ': the staged scene MOUNTED', mounted === true);
  const gate = await readToGate();
  const snap = await snapshot();
  const proseNow = String(snap.prose || '');
  fs.writeFileSync(RUN + '/scenes/scene_' + String(s).padStart(2, '0') + '_prose.txt', proseNow);
  const baked = String((history[0] && history[0].proseText) || '');
  const prev = String((history[history.length - 1] || {}).proseText || '');
  t('scene ' + s + ': prose is non-empty and NOT the baked opening',
    proseNow.length >= 40 && proseNow !== baked,
    proseNow === baked ? 'IDENTICAL to the opening — nothing generated' : 'len=' + proseNow.length);
  t('scene ' + s + ': prose differs from the previous scene',
    proseNow !== prev, 'byte-identical to scene ' + (s - 1) + ' — a fixture or a stall');
  if (proseNow === baked && !stopReason) {
    stopReason = 'scene ' + s + ': the projection was still the baked opening';
  }
  const latchDl = Date.now() + 150000;
  let latchClear = false;
  while (Date.now() < latchDl) {
    latchClear = await page.evaluate(() => window.state._stagedSubmitting !== true);
    if (latchClear) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  // WHICH ROUTE LET THIS SCENE'S PLANNER REPLY THROUGH. The structural route announces itself in
  // the app's log; a scene whose planner was accepted without that line passed by the lane's signal
  // vocabulary. Recorded per scene because the two mean different things: 'signal' is the lane's
  // wording, 'structural' is event_slots naming the lane's declared actor. Roman asked for this to
  // be reported rather than inferred afterwards.
  const sceneRefusals = refusals.filter(r => r.scene === s).map(r => r.txt);
  const plannerRejected = sceneRefusals.some(x => /\[CG:PLANNER-GATE\] REJECTED/i.test(x));
  const structuralHit = sceneRefusals.some(x => /lane satisfied STRUCTURALLY/i.test(x));
  const plannerReached = calls.some(c => c.scene === s && c.stage === 'planner'
    && /dispatched|replayed/.test(c.outcome));
  const hadLaneMenu = (laneMenuByScene[String(s)] || 0) > 0;
  const laneRoute = plannerRejected ? 'rejected'
    : (!plannerReached ? null
      : (structuralHit ? 'structural' : (hadLaneMenu ? 'signal' : 'no_lane_menu')));
  if (laneRoute) say('   lane route: ' + laneRoute.toUpperCase());

  history.push({ scene: s, baked: false, decision, cardSet, selectedCard: selected,
    laneRoute, plannerRejected, hadLaneMenu,
    seed: SEED, proseLen: proseNow.length, proseText: proseNow,
    gate: gate.after || null, latchClear,
    stages: calls.filter(c => c.scene === s).map(c => c.stage + ':' + c.outcome),
    verifierRefs: (verifierSeen.find(v => v.scene === s) || {}).refs || [],
    facts: snap.facts, activatedLabels: snap.activatedLabels, verdicts: snap.verdicts,
    pending: snap.pending, committedThrough: snap.committedThrough, ctOutcome: snap.ctOutcome,
    blocked: blocked.filter(b => b.scene === s),
    refusals: refusals.filter(r => r.scene === s).map(r => r.txt) });
  const h = history[history.length - 1];
  say('   stages: ' + JSON.stringify(h.stages.filter(x => !/^(bible|other):/.test(x))));
  say('   prose ' + h.proseLen + '   facts ' + h.facts.length + '   activated '
    + h.activatedLabels.length + '   verdicts ' + h.verdicts.length);
  if (h.refusals.length) {
    const notable = h.refusals.filter(x => /REJECT|stale|Blocked|refus|not accepted/i.test(x));
    if (notable.length) { say('   notable:'); notable.slice(0, 4).forEach(x => say('     · ' + x.slice(0, 175))); }
  }
  if (stopReason) { say('  STOP: ' + stopReason); break; }
}
await browser.close();

// ── THE RECORD ──────────────────────────────────────────────────────────────
say('\n── PER-SCENE RECORD');
say('  scene | prose | cards | drew | route      | facts | activated | verdicts | stages');
history.forEach(h => say('  ' + String(h.scene).padStart(5) + ' | '
  + String(h.proseLen).padStart(5) + ' | '
  + String(h.cardSet ? h.cardSet.count : '-').padStart(5) + ' | '
  + String(h.selectedCard ? '#' + h.selectedCard.drawIndex : '-').padStart(4) + ' | '
  + String(h.laneRoute || '-').padEnd(10) + ' | '
  + String(h.facts.length).padStart(5) + ' | '
  + String(h.activatedLabels.length).padStart(9) + ' | '
  + String(h.verdicts.length).padStart(8) + ' | '
  + h.stages.filter(x => !/^(bible|other):/.test(x)).join(',')));

const manifest = {
  design: 'ONE EXPLORATORY TRAJECTORY through one full FS issue. NOT a statistical comparison of '
    + 'branches: the scene-1 axis has exactly two buttons, one run per arm cannot support a '
    + 'comparison, and this run takes ONE arm and one seeded card sequence.',
  mode: DRY ? 'dry_replay' : 'live', plannerFixture: PLANNER_FIXTURE,
  story: 'starter_first_sacrifice', arm: ARM, seed: SEED,
  scenes: SCENES, liveScenes: LIVE_SCENES, bakedScene1: true,
  reserved, authorized: LIVE ? AUTHORIZED : 0,
  maxTransportRetries: MAX_TRANSPORT_RETRIES, attemptsPerStage: ATTEMPTS_PER_STAGE,
  timeouts: { authorMs: AUTHOR_TIMEOUT_MS, otherMs: OTHER_TIMEOUT_MS },
  simulatedFailures: SIM_FAIL || null,
  retryPolicy: 'A COMPLETED response blocks any retry of that stage in that scene. A dispatched '
    + 'request that never returned may be retried up to maxTransportRetries, and each dispatched '
    + 'attempt that produced no response is recorded as UNMEASURED exposure with its estimate.',
  axis, inputMode: 'authored Fate card, drawn on a recorded seed, played through the production '
    + 'click handler; say/do submitted EMPTY — no invented text',
  completedScenes: history.length, stoppedEarly: history.length < SCENES, stopReason,
  laneMenuByScene, scenesWithLaneMenus: scenesWithLanes,
  laneGateNote: 'Only plan scene(s) ' + (scenesWithLanes.join(', ') || 'none') + ' declare an '
    + 'aftermathLanes menu. Elsewhere the lane check is INERT: it cannot reject and cannot accept '
    + 'by signal, so those scenes are recorded as laneRoute "no_lane_menu" rather than "signal".',
  laneRoutes: history.map(h => ({ scene: h.scene, laneRoute: h.laneRoute || null,
    hadLaneMenu: !!h.hadLaneMenu, plannerRejected: !!h.plannerRejected })),
  perScene: history.map(h => ({ scene: h.scene, baked: !!h.baked, proseLen: h.proseLen,
    laneRoute: h.laneRoute || null, plannerRejected: !!h.plannerRejected,
    cardCount: h.cardSet ? h.cardSet.count : 0,
    cardSet: h.cardSet ? h.cardSet.cards : null,
    selectedCard: h.selectedCard, decision: h.decision || null,
    stages: h.stages, verifierRefs: h.verifierRefs,
    facts: h.facts, activatedLabels: h.activatedLabels, verdicts: h.verdicts,
    pending: h.pending, committedThrough: h.committedThrough, ctOutcome: h.ctOutcome,
    blocked: h.blocked, refusals: h.refusals })),
  checks: { pass, fail }
};
write('manifest.json', manifest);

// ── THE BLIND SCORING PACKET ────────────────────────────────────────────────
// Scene prose goes into SHUFFLED, UNLABELLED slots with the mapping in a separate sealed key, so a
// scoring session cannot see which scene it is reading. Dimensions are fixed here, before any
// scores exist.
if (history.length > 1) {
  const PK = RUN + '/blind_packet';
  fs.mkdirSync(PK + '/slots', { recursive: true });
  const order = history.map((h, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    const tmp = order[i]; order[i] = order[j]; order[j] = tmp;
  }
  const key = [];
  order.forEach((hIdx, slotIdx) => {
    const h = history[hIdx];
    const slot = 'slot_' + String(slotIdx + 1).padStart(2, '0');
    key.push({ slot, scene: h.scene, baked: !!h.baked,
      card: h.selectedCard ? (h.selectedCard.card || {}).title || null : null });
    fs.writeFileSync(PK + '/slots/' + slot + '.md',
      '# ' + slot + '\n\n<!-- SCENE NUMBER AND CARD DELIBERATELY ABSENT. The mapping is in\n'
      + '     KEY_SEALED.json, which must not be opened until the scoresheet is filled. -->\n\n'
      + '## prose\n\n' + (h.proseText || '(empty)') + '\n');
  });
  fs.writeFileSync(PK + '/KEY_SEALED.json', JSON.stringify({
    WARNING: 'DO NOT OPEN until the scoresheet is filled and saved.',
    seed: SEED, arm: ARM, mapping: key }, null, 2));
  const cols = ['slot', 'movement', 'obligations_preserved', 'obligations_dropped',
    'pressure_quality', 'character_continuity', 'branch_specific', 'stall', 'notes'];
  fs.writeFileSync(PK + '/SCORESHEET.csv',
    cols.join(',') + '\n' + key.map(k => k.slot + ','.repeat(cols.length - 1)).join('\n') + '\n');
  fs.writeFileSync(PK + '/00_PREREGISTRATION.md', `# One FS issue — PRE-REGISTRATION

Written before any score exists.

## What this is, and is not

**ONE EXPLORATORY TRAJECTORY** through one full First Sacrifice issue: one arm of the scene-1 axis,
one seeded sequence of Fate-card draws. It is **not** a statistical comparison of branches. The
scene-1 decision has exactly **two** buttons, so there is no third arm to compare, and one run per
arm could not support a comparison even if there were.

Seed \`${SEED}\`, arm \`${ARM}\`. The seed is recorded so this trajectory is reproducible.

## The reader's input

No invented say/do text. At every gate after the axis, the five authored Fate cards are exposed, one
is drawn on the recorded seed, and it is played through the product's own click handler. Say/do is
submitted empty: the card is the input.

## Dimensions, scored blind per slot

| dimension | how to score |
|---|---|
| \`movement\` | \`yes\`/\`no\` — name in one clause something true at the end that was not true before |
| \`obligations_preserved\` | obligation ids from the issue ledger this scene keeps alive |
| \`obligations_dropped\` | ids that were live and are now silently absent |
| \`pressure_quality\` | \`0\` none · \`1\` generic · \`2\` coherent AND interesting. Quote it. |
| \`character_continuity\` | \`yes\`/\`no\` — do established figures behave consistently with what came before? |
| \`branch_specific\` | \`yes\`/\`no\`/\`n/a\` — could this scene have followed a different card? \`n/a\` where no card applies |
| \`stall\` | \`yes\`/\`no\` — is this scene indistinguishable in effect from the previous one? |

**First stall scene** is reported after unblinding: the lowest scene number whose \`stall\` is \`yes\`.

## Procedure

1. Read every slot in \`slots/\` in file order. The order is shuffled; consecutive files are not
   consecutive scenes.
2. Fill \`SCORESHEET.csv\`. Save it.
3. **Only then** open \`KEY_SEALED.json\`, map slots to scenes, and report the first stall scene.
4. The session that GENERATED this corpus should not be the session that scores it.
`);
  say('\n  blind packet: ' + PK + '  (' + key.length + ' shuffled slots, key sealed separately)');
}

if (stopReason) say('\nSTOPPED EARLY: ' + stopReason);
if (LIVE) ledger.spendReport(AUTHORIZED);
else say('\nSPEND: $0 — nothing was dispatched (' + (DRY ? 'dry replay' : 'estimate') + ').');
say('\n' + pass + '/' + (pass + fail) + ' checks passed');
say('artefacts: ' + RUN);
process.exit(fail ? 1 : 0);
