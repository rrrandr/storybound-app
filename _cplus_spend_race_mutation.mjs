// ══════════════════════════════════════════════════════════════════════════════════════════
//  X13b MUTATION CONTROL — ON THE SERVED SOURCE, IN ISOLATION
//
//  _generateSubplots calls the CLOSURE `_awaitChainCommit`, not `window._awaitChainCommit`.
//  Stubbing the window property mutates nothing production reads, so a control built that way
//  passes or fails for reasons unrelated to the code under test. The only honest mutation is to
//  remove the line from the source that is actually served.
//
//  TWO ISOLATED ARMS, each in its own browser context, each reporting the SHA of the app.js it
//  was served and whether the target line was present in it. Same fixture, one difference.
//
//  What each arm demonstrates is NOT the same thing, and saying so matters:
//    ARM A  the pass PARKS (observed: waiters >= 1), the run is then committed and abandoned,
//           and nothing is spent.
//    ARM B  with the wait removed the pass never parks at all — it dispatches BEFORE the run is
//           committed or abandoned. That is the original pre-decision spend race, reproduced.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import crypto from 'crypto';
import { configBody, installSession, isAuthOrigin } from './_test_session_env.mjs';

let pass = 0, fail = 0;
const ok = (n, c, d) => { const l = c ? `  ✓ ${n}` : `  ✗ ${n}${d ? '\n      ' + String(d).slice(0, 400) : ''}`;
  if (c) pass++; else fail++; console.log(l); };

const TARGET = 'var _committed = await _awaitChainCommit(ticket, window.state);';
const REPLACEMENT = 'var _committed = true; /* PRODUCTION WAIT REMOVED BY MUTATION CONTROL */';
const APLOT = { premise: 'a rite goes wrong', throughline: 'who paid for it', tier: 'fling',
                timelineLength: 20, milestones: [{ atScene: 1, event: 'the wish bends' }] };
const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

async function arm(mutate) {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await installSession(page);
  const census = [];
  let served = { sha: null, targetPresent: null, replacementPresent: null, bytes: 0 };

  await page.route('**/*', async route => {
    const url = route.request().url(); const path = url.replace(/^https?:\/\/[^/]+/, '');
    if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (/\/app\.js/.test(path)) {
      const res = await route.fetch();
      let body = await res.text();
      if (mutate) {
        if (body.indexOf(TARGET) === -1) throw new Error('MUTATION TARGET ABSENT FROM SOURCE');
        body = body.replace(TARGET, REPLACEMENT);
      }
      // Recorded from the EXACT bytes handed to the browser, not from what we intended to send.
      served = { sha: sha(body), targetPresent: body.indexOf(TARGET) !== -1,
                 replacementPresent: body.indexOf(REPLACEMENT) !== -1, bytes: body.length };
      return route.fulfill({ status: 200, body, headers: { 'content-type': 'application/javascript; charset=utf-8' } });
    }
    if (!/\/api\//.test(path)) return route.continue();
    if (/\/api\/config\b/.test(path)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
    if (/\/api\/(proxy|chatgpt-proxy|mistral-proxy)\b/.test(path)) census.push({ role: b && b.role, model: b && b.model });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: '{}' }) });
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window._generateSubplots && window._beginInvocation, { timeout: 60000 });

  // Proof read out of the LIVE function, not out of our intention.
  const live = await page.evaluate((t) => ({
    hasWait: String(window._generateSubplots).indexOf('_awaitChainCommit') !== -1,
    hasReplacement: String(window._generateSubplots).indexOf('PRODUCTION WAIT REMOVED') !== -1,
  }), TARGET);

  // ── SETUP AND START, WITHOUT AWAITING ──
  // The pass is launched and left running so its state can be OBSERVED from here. A
  // setTimeout(0) yield only proves the event loop turned; it says nothing about whether the
  // real pass reached the gate, which is the thing under test.
  const started = await page.evaluate(async (aplot) => {
    const s = window.state;
    s.storyId = 'mutation-arm'; s._invocationFatal = null; s.subplots = [];
    s.aPlot = aplot; s.tierMode = 'fling'; s.cgScaffold = { spine: 'test spine' };
    s.name = 'Lirael'; s.playerName = 'Lirael'; s.loveInterestName = 'Julian'; s.partnerName = 'Julian';
    const ticket = window._beginInvocation(s);
    window.__ticket = ticket;
    window.__run = window._generateSubplots(aplot, ticket).catch(e => 'threw:' + (e && e.message));
    return { seq: ticket.seq };
  }, APLOT);

  // ── OBSERVE, DO NOT ASSUME ──
  let parked = null, dispatchedEarly = false;
  for (let i = 0; i < 200; i++) {                       // bounded: 200 × 50ms = 10s
    const st = await page.evaluate(() => window._chainCommitState(window.__ticket));
    if (st && st.waiters >= 1) { parked = st; break; }  // it really is waiting on the gate
    if (census.length > 0) { dispatchedEarly = true; break; }  // it got past without waiting
    await new Promise(r => setTimeout(r, 50));
  }

  const result = await page.evaluate(async () => {
    const s = window.state;
    // The run is committed and then abandoned. In the UNMUTATED arm the pass is parked and
    // learns both; in the MUTATED arm it never waited, so it is already gone.
    window._settleChainCommit(true, null, s, window.__ticket.seq);
    window._markInvocationFatal('scene_skeleton invalid', s);
    const outcome = await window.__run;
    return { outcome: outcome === undefined ? 'ok' : String(outcome).slice(0, 90) };
  });

  await ctx.close().catch(() => {}); await browser.close().catch(() => {});
  return { served, live, result, parked, dispatchedEarly, dispatches: census.length, census };
}

console.log(`\n${'═'.repeat(84)}\nX13b MUTATION CONTROL — SERVED-SOURCE, ISOLATED ARMS\n${'═'.repeat(84)}`);
const fs = (await import('fs')).promises;
// Captured BEFORE either arm. Hashing the file twice afterwards compares it with itself, which
// is an assertion that cannot fail — it was one, and it said nothing.
const DISK_BEFORE = sha(await fs.readFile('public/app.js', 'utf8'));
console.log(` disk app.js sha : ${DISK_BEFORE}  (captured BEFORE any arm)`);
console.log(` target line     : ${TARGET}`);

const CLEAN = await arm(false);
console.log(`\n ARM A — UNMUTATED`);
console.log(`   served sha=${CLEAN.served.sha} bytes=${CLEAN.served.bytes} targetPresent=${CLEAN.served.targetPresent}`);
console.log(`   live function contains the wait: ${CLEAN.live.hasWait}`);
console.log(`   dispatches=${CLEAN.dispatches} outcome=${JSON.stringify(CLEAN.result.outcome)}`);
ok('ARM A: the target line IS present in the served source', CLEAN.served.targetPresent === true, JSON.stringify(CLEAN.served));
ok('ARM A: the live _generateSubplots contains the wait', CLEAN.live.hasWait === true, JSON.stringify(CLEAN.live));
ok('★ ARM A: the pass is OBSERVED parked on the gate (waiters ≥ 1), not merely given a yield',
   CLEAN.parked && CLEAN.parked.waiters >= 1, JSON.stringify(CLEAN.parked));
ok('★ ARM A: parked until the run is decided, then abandoned — it spends NOTHING',
   CLEAN.dispatches === 0 && CLEAN.dispatchedEarly === false, JSON.stringify(CLEAN.census));

const MUT = await arm(true);
console.log(`\n ARM B — WAIT REMOVED FROM THE SERVED SOURCE`);
console.log(`   served sha=${MUT.served.sha} bytes=${MUT.served.bytes} targetPresent=${MUT.served.targetPresent} replacementPresent=${MUT.served.replacementPresent}`);
console.log(`   live function contains the replacement: ${MUT.live.hasReplacement}`);
console.log(`   dispatches=${MUT.dispatches} outcome=${JSON.stringify(MUT.result.outcome)}`);
ok('ARM B: the target line is ABSENT from the served source', MUT.served.targetPresent === false, JSON.stringify(MUT.served));
ok('ARM B: the live _generateSubplots carries the replacement — the mutation reached the running code',
   MUT.live.hasReplacement === true, JSON.stringify(MUT.live));
// ACCURATE NAMING: with the wait gone the pass never parks. It dispatches BEFORE the run is
// either committed or abandoned — which is precisely the original pre-decision spend race,
// reproduced. It is not "committed then abandoned"; nothing had been decided yet.
ok('★ ARM B: with the production wait removed the pass NEVER PARKS — it dispatches before the '
   + 'run is decided, which is the original spend race reproduced',
   MUT.dispatches === 1 && MUT.dispatchedEarly === true && MUT.parked === null,
   `dispatches=${MUT.dispatches} dispatchedEarly=${MUT.dispatchedEarly} parked=${JSON.stringify(MUT.parked)}`);

ok('★ the two arms differ ONLY in the served source, and the difference is the spend',
   CLEAN.served.sha !== MUT.served.sha && CLEAN.dispatches === 0 && MUT.dispatches === 1,
   `A=${CLEAN.served.sha}/${CLEAN.dispatches}  B=${MUT.served.sha}/${MUT.dispatches}`);

const DISK_AFTER = sha(await fs.readFile('public/app.js', 'utf8'));
ok('the file on disk is untouched — compared against the PRE-RUN hash, not against itself',
   DISK_AFTER === DISK_BEFORE, `before=${DISK_BEFORE} after=${DISK_AFTER}`);
console.log(`\n disk app.js sha after : ${DISK_AFTER}`);
console.log(`${'─'.repeat(84)}\n ${pass} passed · ${fail} failed\n`);
process.exit(fail ? 1 : 0);
