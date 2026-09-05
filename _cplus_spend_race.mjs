// ══════════════════════════════════════════════════════════════════════════════════════════
//  X13b — THE UNAUTHORIZED PAID-DISPATCH RACE
//
//  `subplots=1 want 0` was filed as a flaky test. It is not: it means an ABANDONED invocation
//  spent a paid call. _generateSubplots is fire-and-forget, launched during A-plot generation,
//  which runs BEFORE the skeleton is validated — so its ownership guard could be truthfully
//  told the run was alive, dispatch, and only then have the run abandoned underneath it.
//
//  A tighter guard cannot fix that: no check can see a decision that has not been made yet.
//  Two mechanisms are tested here — a COMMIT GATE the paid pass waits on, and an ownership
//  check placed as the last operation before the wire.
//
//  DETERMINISTIC. No sleeps, no racing: the request is HELD at the dispatch boundary, the run
//  is abandoned while it is held, and only then is it released.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0; const log = [];
// STREAMED, not buffered. A suite that prints only at the end tells you nothing while it runs,
// and this one drives code that parks by design — three separate diagnostic attempts here were
// spent staring at an empty log because the assertions were being collected instead of shown.
const ok = (n, c, d) => {
  const line = c ? `  \u2713 ${n}` : `  \u2717 ${n}${d ? '\n      ' + String(d).slice(0, 400) : ''}`;
  if (c) pass++; else fail++;
  log.push(line); console.log(line);
};

// ── A HANG MUST FAIL, NOT WAIT ──
// This suite drives real code that PARKS by design. When a gate is never settled the pass waits
// forever and the runner prints nothing at all — which happened three times here, each costing
// minutes and telling me nothing. Every await against the page is bounded, and a timeout is a
// named failure rather than silence.
const withTimeout = (p, ms, label) => Promise.race([
  p, new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT:' + label)), ms))
]);

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext(); const page = await ctx.newPage();
await installSession(page);

// EVERY model request is counted. Nothing reaches a provider.
const census = [];
await page.route('**/*', async route => {
  const url = route.request().url(); const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (!/\/api\//.test(path)) return route.continue();
  if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  let body = null; try { body = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
  if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy)\b/.test(path)) {
    census.push({ path, role: body && body.role, model: body && body.model });
  }
  return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '{}' }) });
});
// The page's own account of what it did. Without this an early return inside _generateSubplots
// is indistinguishable from a gate refusal — both look like "no dispatch", and one of them means
// the test proved nothing.
const pageLog = [];
page.on('console', m => { const t = m.text(); if (/SUBPLOT|DISPATCH-GATE|gate:/.test(t)) pageLog.push(t.slice(0, 200)); });
await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => window._generateSubplots && window._invocationAlive && window.StoryboundOrchestration, { timeout: 60000 });
console.log('  … page loaded and exports present');

const setup = () => page.evaluate(() => {
  const s = window.state;
  s.storyId = 'race'; s._invocationFatal = null;
  const ticket = window._beginInvocation(s);
  return ticket;
});

// ══ 1. THE GATE: A PAID PASS WAITS, THE RUN IS ABANDONED, NOTHING SPENDS ══
const ABANDON = await withTimeout(page.evaluate(async () => {
  const s = window.state;
  s.storyId = 'race-abandon'; s._invocationFatal = null;
  const ticket = window._beginInvocation(s);
  let dispatched = false, finished = false;
  // A paid pass shaped exactly like the subplot one: free work, then wait, then spend.
  const paid = (async () => {
    const committed = await window._awaitChainCommit(ticket, s);
    if (!committed) { finished = true; return 'abandoned'; }
    dispatched = true;
    await window.StoryboundOrchestration.callChatGPT(
      [{ role: 'system', content: 'x' }, { role: 'user', content: 'y' }],
      'PRIMARY_AUTHOR', { model: 'gpt-4o-mini', max_tokens: 10, ownershipTicket: ticket });
    finished = true; return 'dispatched';
  })();
  const beforeSettle = window._chainCommitState(ticket);
  // The run is abandoned WHILE the paid pass is parked on the gate.
  window._settleChainCommit(false, 'scene_skeleton invalid', s);
  const outcome = await paid;
  return { beforeSettle, outcome, dispatched, finished, after: window._chainCommitState(ticket) };
}), 15000, 'ABANDON').catch(e => ({ timedOut: String(e.message) }));
ok('★ the paid pass PARKS on the gate — it is waiting, not racing',
   ABANDON.beforeSettle && ABANDON.beforeSettle.settled === false && ABANDON.beforeSettle.waiters === 1,
   JSON.stringify(ABANDON.beforeSettle));
ok('★ abandoning the run releases it as abandoned, and it never dispatches',
   ABANDON.outcome === 'abandoned' && ABANDON.dispatched === false, JSON.stringify(ABANDON));
const c1 = census.length;
ok('★ zero paid requests were made by the abandoned run', c1 === 0, JSON.stringify(census));

// ══ 2. THE HEALTHY ARM: THE SAME PASS, COMMITTED, DOES DISPATCH ══
const HEALTHY = await page.evaluate(async () => {
  const s = window.state;
  s.storyId = 'race-healthy'; s._invocationFatal = null;
  const ticket = window._beginInvocation(s);
  const paid = (async () => {
    const committed = await window._awaitChainCommit(ticket, s);
    if (!committed) return 'abandoned';
    const r = await window.StoryboundOrchestration.callChatGPT(
      [{ role: 'system', content: 'x' }, { role: 'user', content: 'y' }],
      'PRIMARY_AUTHOR', { model: 'gpt-4o-mini', max_tokens: 10, ownershipTicket: ticket });
    return (r && r._ownershipRefused) ? 'refused' : 'dispatched';
  })();
  window._settleChainCommit(true, null, s);
  return await paid;
});
ok('★ CONTROL: the identical pass on a COMMITTED run does dispatch — the gate is not a blanket block',
   HEALTHY === 'dispatched' && census.length === c1 + 1, `${HEALTHY} census=${census.length - c1}`);

// ══ 3. THE WIRE GATE: HELD AT THE DISPATCH BOUNDARY, SUPERSEDED, RELEASED ══
// The commit gate cannot help here: the run committed, the pass started, and only THEN was it
// superseded. This is the check that has no statement between it and the fetch.
const HELD = await page.evaluate(async () => {
  const s = window.state;
  s.storyId = 'race-held'; s._invocationFatal = null;
  const ticket = window._beginInvocation(s);
  window._settleChainCommit(true, null, s);
  // Supersede the invocation BEFORE the call is made — the exact state a held request would be
  // released into. The ticket is now stale; the wire gate is the only thing that can see it.
  window._beginInvocation(s);
  try {
    const r = await window.StoryboundOrchestration.callChatGPT(
      [{ role: 'system', content: 'x' }, { role: 'user', content: 'y' }],
      'PRIMARY_AUTHOR', { model: 'gpt-4o-mini', max_tokens: 10, ownershipTicket: ticket });
    return { refused: false, threw: null, content: typeof r };
  } catch (e) {
    return { refused: !!(e && e._ownershipRefused), threw: e && e.name, transient: e && e._transient };
  }
});
const c3 = census.length;
ok('★ a SUPERSEDED invocation is refused at the wire, after the commit gate has already passed',
   HELD.refused === true, JSON.stringify(HELD));
ok('★ …by THROWING a named non-transient error, not returning an object through a string API',
   HELD.threw === 'OwnershipRefusedError' && HELD.transient === false, JSON.stringify(HELD));
ok('★ …and it spent nothing', c3 === c1 + 1, `census grew by ${c3 - (c1 + 1)}`);

const FATAL = await page.evaluate(async () => {
  const s = window.state;
  s.storyId = 'race-fatal'; s._invocationFatal = null;
  const ticket = window._beginInvocation(s);
  window._settleChainCommit(true, null, s);
  window._markInvocationFatal('aborted after commit', s);
  try {
    await window.StoryboundOrchestration.callChatGPT(
      [{ role: 'system', content: 'x' }, { role: 'user', content: 'y' }],
      'PRIMARY_AUTHOR', { model: 'gpt-4o-mini', max_tokens: 10, ownershipTicket: ticket });
    return { refused: false };
  } catch (e) { return { refused: !!(e && e._ownershipRefused) }; }
});
ok('★ an invocation marked FATAL after commit is also refused at the wire', FATAL.refused === true, JSON.stringify(FATAL));
ok('…and spent nothing', census.length === c3, `census grew by ${census.length - c3}`);

// ══ 4. MUTATION CONTROL — REMOVE THE WIRE GATE AND THE SAME CALL SPENDS ══
const CONTROL = await page.evaluate(async () => {
  const s = window.state;
  s.storyId = 'race-control'; s._invocationFatal = null;
  const ticket = window._beginInvocation(s);
  window._beginInvocation(s);                       // supersede it
  // Remove the ONLY thing that can refuse this: the wire gate reads window._invocationAlive.
  const real = window._invocationAlive;
  window._invocationAlive = function () { return true; };
  try {
    await window.StoryboundOrchestration.callChatGPT(
      [{ role: 'system', content: 'x' }, { role: 'user', content: 'y' }],
      'PRIMARY_AUTHOR', { model: 'gpt-4o-mini', max_tokens: 10, ownershipTicket: ticket });
  } catch (_) {}
  window._invocationAlive = real;
  return { refused: false, dispatched: true };
});
ok('★ MUTATION CONTROL: with the gate disabled the same superseded call DOES spend',
   CONTROL.refused === false, JSON.stringify(CONTROL));
ok('…proving the refusals above are the gate, not the fixture', census.length > c3, `census=${census.length}`);

// ══ 5. A CALL WITH NO TICKET IS UNAFFECTED ══
const NOTICKET = await page.evaluate(async () => {
  const s = window.state; s.storyId = 'race-noticket'; s._invocationFatal = 'irrelevant';
  try {
    await window.StoryboundOrchestration.callChatGPT(
      [{ role: 'system', content: 'x' }, { role: 'user', content: 'y' }],
      'PRIMARY_AUTHOR', { model: 'gpt-4o-mini', max_tokens: 10 });
    return { refused: false };
  } catch (e) { return { refused: !!(e && e._ownershipRefused) }; }
});
ok('a call carrying no ticket is untouched — paths not yet taught this must behave as before',
   NOTICKET.refused === false, JSON.stringify(NOTICKET));

// ── FAIL-OPEN ONLY FOR THE UNTICKETED ──
const NOGATE = await page.evaluate(async () => {
  const s = window.state; s.storyId = 'race-nogate';
  return { noTicket: await window._awaitChainCommit(null, s),
           // A ticket for an invocation with no gate is an unverifiable ownership claim.
           ticketNoGate: await window._awaitChainCommit({ seq: 999999, storyId: 'race-nogate' }, s),
           gates: window._gateCount() };
});
ok('a call carrying NO ticket resolves true — untaught paths behave exactly as before',
   NOGATE.noTicket === true, JSON.stringify(NOGATE));
ok('★ a TICKETED task whose gate does not exist FAILS CLOSED — an unverifiable claim spends nothing',
   NOGATE.ticketNoGate === false, JSON.stringify(NOGATE));

// ── THE REGISTRY IS BOUNDED ──
const GATES = await page.evaluate(() => {
  const s = window.state; s.storyId = 'race-gates';
  for (let i = 0; i < 40; i++) { const t = window._beginInvocation(s); window._settleChainCommit(true, null, s, t.seq); }
  return window._gateCount();
});
ok('★ settled gates are evicted — the registry does not grow without bound',
   GATES <= 8, `gateCount=${GATES}`);

// ── SUPERSESSION RELEASES THE OLD RUN'S WAITERS ──
const ORPHAN = await page.evaluate(async () => {
  const s = window.state; s.storyId = 'race-orphan'; s._invocationFatal = null;
  const t1 = window._beginInvocation(s);
  let settled = null;
  const parked = window._awaitChainCommit(t1, s).then(v => { settled = v; return v; });
  window._beginInvocation(s);                       // supersede while t1 is parked
  const got = await parked;
  return { got, settled, state: window._chainCommitState(t1) };
});
ok('★ superseding a run RELEASES its parked waiters as abandoned — no permanent park',
   ORPHAN.got === false && ORPHAN.state.settled === true
   && /superseded/.test(ORPHAN.state.reason || ''), JSON.stringify(ORPHAN));

// ══ 6. THE REAL PRODUCTION ENTRY POINT — _generateSubplots ══
// Everything above tests the mechanism. This drives the FUNCTION THAT SPENDS, because a
// mechanism proven on a stand-in is a mechanism proven on a stand-in.
// A shape the real pass and its helpers can actually consume. The minimal object threw
// "Cannot read properties of undefined (reading 'timelineLength')" INSIDE a helper, which
// looked exactly like a gate refusal from the outside — no dispatch, no explanation. That is
// the failure the positive control exists to catch.
const APLOT = { premise: 'a rite goes wrong', throughline: 'who paid for it', tier: 'fling',
                timelineLength: 20, milestones: [{ atScene: 1, event: 'the wish bends' }] };

const REAL_ABANDON = await page.evaluate(async (aplot) => {
  const s = window.state;
  s.storyId = 'real-abandon'; s._invocationFatal = null; s.subplots = []; s.aPlot = aplot; s.tierMode = 'fling';
  s.cgScaffold = { spine: 'test spine' };
  s.name = 'Lirael'; s.playerName = 'Lirael'; s.loveInterestName = 'Julian'; s.partnerName = 'Julian';
  const ticket = window._beginInvocation(s);
  // The real pass, launched exactly as production launches it: fire-and-forget, ticketed.
  const run = window._generateSubplots(aplot, ticket).catch(e => 'threw:' + (e && e.message));
  // It parks on its own gate. Abandon the run while it is parked.
  await new Promise(r => setTimeout(r, 0));
  const parked = window._chainCommitState(ticket);
  window._markInvocationFatal('scene_skeleton invalid', s);
  await run;
  return { parked, after: window._chainCommitState(ticket) };
}, APLOT);
const cReal = census.length;
ok('★ REAL _generateSubplots parks on the gate rather than dispatching',
   REAL_ABANDON.parked && REAL_ABANDON.parked.settled === false, JSON.stringify(REAL_ABANDON.parked));
// The baseline is the census BEFORE this case, not zero: three legitimate dispatches happened
// in the simulated sections above (healthy, mutation control, no-ticket). Comparing against
// zero made a passing production path look like a spend — my arithmetic, not its behaviour.
ok('★ REAL _generateSubplots spends NOTHING when the run is abandoned while it waits',
   census.length === cReal, `census grew by ${census.length - cReal} during the abandoned real run`);

const REAL_SUPERSEDE = await page.evaluate(async (aplot) => {
  const s = window.state;
  s.storyId = 'real-supersede'; s._invocationFatal = null; s.subplots = []; s.aPlot = aplot; s.tierMode = 'fling';
  s.cgScaffold = { spine: 'test spine' };
  const ticket = window._beginInvocation(s);
  const run = window._generateSubplots(aplot, ticket).catch(e => 'threw');
  await new Promise(r => setTimeout(r, 0));
  window._beginInvocation(s);            // superseded while parked
  await run;
  return window._chainCommitState(ticket);
}, APLOT);
const cSup = census.length;
ok('★ REAL _generateSubplots superseded while parked is released as abandoned and spends nothing',
   REAL_SUPERSEDE && REAL_SUPERSEDE.settled === true && REAL_SUPERSEDE.ok === false
   && census.length === cReal, `census grew by ${census.length - cReal}`);

const REAL_HEALTHY = await page.evaluate(async (aplot) => {
  const s = window.state;
  s.storyId = 'real-healthy'; s._invocationFatal = null; s.subplots = []; s.aPlot = aplot; s.tierMode = 'fling';
  s.cgScaffold = { spine: 'test spine' };
  const ticket = window._beginInvocation(s);
  const run = window._generateSubplots(aplot, ticket).catch(e => 'threw:' + (e && e.message));
  await new Promise(r => setTimeout(r, 0));
  window._settleChainCommit(true, null, s, ticket.seq);   // the chain commits
  const before = { ticketSeq: ticket.seq, stateSeq: s._invocationSeq,
                   ticketStory: ticket.storyId, stateStory: s.storyId,
                   fatal: s._invocationFatal, alive: window._invocationAlive(ticket, s) };
  const outcome = await run;
  return { outcome: (outcome === undefined ? 'returned-undefined' : String(outcome).slice(0, 120)),
           subplots: (s.subplots || []).length,
           gate: window._chainCommitState(ticket), before,
           after: { stateSeq: s._invocationSeq, fatal: s._invocationFatal,
                    alive: window._invocationAlive(ticket, s) } };
}, APLOT);
ok('★ POSITIVE CONTROL: the REAL pass on a COMMITTED run DOES dispatch exactly once',
   census.length === cSup + 1,
   `census grew by ${census.length - cSup}\n      diag: ${JSON.stringify(REAL_HEALTHY)}\n      page said: ${pageLog.slice(-3).join(' | ')}`);
// If the positive control fails, every "spends nothing" above is unearned: a pass that never
// reaches dispatch spends nothing for reasons that have nothing to do with the gate.
if (census.length !== cSup + 1) {
  ok('★ …and therefore the negative real-path results above are VACUOUS and must not be read as passes',
     false, 'the real pass never reached dispatch on a committed run');
}

// ── MUTATION CONTROL ON THE PRODUCTION WAIT ──
// Remove the thing the real pass waits on, and the abandoned run spends again.
const REAL_MUTATION = await page.evaluate(async (aplot) => {
  const s = window.state;
  s.storyId = 'real-mutation'; s._invocationFatal = null; s.subplots = []; s.aPlot = aplot; s.tierMode = 'fling';
  s.cgScaffold = { spine: 'test spine' };
  const ticket = window._beginInvocation(s);
  const realWait = window._awaitChainCommit;
  window._awaitChainCommit = function () { return Promise.resolve(true); };   // the gate removed
  const realAlive = window._invocationAlive;
  window._invocationAlive = function () { return true; };                     // and the guards
  const run = window._generateSubplots(aplot, ticket).catch(e => 'threw');
  await new Promise(r => setTimeout(r, 0));
  window._markInvocationFatal('scene_skeleton invalid', s);
  await run;
  window._awaitChainCommit = realWait; window._invocationAlive = realAlive;
  return true;
}, APLOT);
const cMut = census.length;
ok('★ MUTATION CONTROL: with the production wait removed, the abandoned run SPENDS — proving the '
   + 'assertions above are the gate and not the fixture',
   cMut > cSup + 1, `census grew by ${cMut - (cSup + 1)} after the mutation`);

console.log(`\n${'═'.repeat(80)}\nX13b — UNAUTHORIZED PAID-DISPATCH RACE\n${'═'.repeat(80)}`);
console.log(log.join('\n'));
// THREE dispatches are correct and each is named, so the census cannot drift unnoticed:
// the healthy committed run, the mutation control (gate disabled on purpose), and the
// no-ticket call that must behave exactly as it did before any of this existed.
const EXPECTED_DISPATCHES = 3;
console.log(`${'─'.repeat(80)}`);
console.log(` intercepted dispatches: ${census.length} — expected ${EXPECTED_DISPATCHES}` +
  ` (healthy · mutation-control · no-ticket) ${census.length === EXPECTED_DISPATCHES ? '✓' : '✗ CENSUS DRIFT'}`);
if (census.length !== EXPECTED_DISPATCHES) { fail++; }
console.log(` ${pass} passed · ${fail} failed\n`);
await ctx.close().catch(() => {}); await browser.close().catch(() => {});
process.exit(fail ? 1 : 0);
