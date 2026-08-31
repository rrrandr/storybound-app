// ══════════════════════════════════════════════════════════════════════════════════════════
//  X13b — THE SUBPLOT RACE
//
//  An "aborts before the author" census intermittently saw one subplot call. Subplot generation
//  is fire-and-forget: launched the instant the A-plot lands, it then waits up to sixty seconds
//  for the spine before dispatching. Scene-1 skeleton validation happens INSIDE that window, so
//  an abort could land while the task was parked — and the dispatch went out having re-read
//  nothing. Not a miscount: production really could buy subplots for a scene nobody would read.
//
//  A single green rerun cannot distinguish "fixed" from "the race did not fire this time", so
//  this drives the seam directly, many times, with no sleeps: the wait is released only after
//  the fatal state exists, which is the losing interleaving every time rather than occasionally.
// ══════════════════════════════════════════════════════════════════════════════════════════
import { chromium } from 'playwright-core';
import fs from 'fs';

const SRC = fs.readFileSync('public/app.js', 'utf8');
const ITER = Number(process.env.RACE_ITER || 20);
let pass = 0, fail = 0;
const t = (n, c, d) => { if (c) { pass++; console.log(`  ✓ ${n}`); } else { fail++; console.log(`  ✗ ${n}${d ? `\n      ${d}` : ''}`); } };

// MUTATION CONTROL: remove the final pre-dispatch check and the forbidden dispatch must appear.
const KILL = { from: 'if (!_invocationAlive(ticket, window.state)) {', to: 'if (false) {' };

async function run(browser, { mutate, healthy, clearFatal }) {
  const body = mutate ? SRC.replace(KILL.from, KILL.to) : SRC;
  if (mutate && body === SRC) throw new Error('MUTATION CONTROL IS VACUOUS — the guard was not found');
  const ctx = await browser.newContext();
  try {
    const page = await ctx.newPage();
    const dispatched = [];
    await page.route('**/app.js*', r => r.fulfill({ status:200, contentType:'application/javascript; charset=utf-8', body }));
    await page.route('**/api/**', async route => {
      const u = route.request().url();
      let b = null; try { b = JSON.parse(route.request().postData() || '{}'); } catch (_) {}
      const sys = String(((b && b.messages || []).find(m => m.role === 'system') || {}).content || '');
      if (/SUBPLOT GENERATOR/.test(sys)) dispatched.push(sys.slice(0, 40));
      return route.fulfill({ status:200, contentType:'application/json', body: JSON.stringify({ choices:[{ message:{ content:'{"subplots":[]}' } }] }) });
    });
    await page.goto('http://localhost:3000/', { waitUntil:'commit', timeout:60000 });
    await page.waitForFunction(() => window._generateSubplots && window._beginInvocation, { timeout:60000 });

    const r = await page.evaluate(async ({ ITER, healthy, clearFatal }) => {
      const trace = [];
      window.__invTrace = (e) => trace.push(e.event + (e.detail && e.detail.seq != null ? '#' + e.detail.seq : ''));
      const out = { runs: [], traces: [] };
      const s = window.state;
      for (let i = 0; i < ITER; i++) {
        trace.length = 0;
        // In the healthy arm storyId is EMPTY when the work is scheduled and assigned after —
        // exactly what a real run does, and what a naive equality check mistakes for a switch.
        s.storyId = healthy ? '' : 'race-' + i;
        s.subplots = [];
        window._beginInvocation(s);
        const ticket = window._invocationTicket(s);

        // The spine gate the subplot task parks on. Nothing is released until the interleaving
        // under test has happened, so there are no sleeps and no timing luck.
        let release;
        s._cgScaffoldPromise = new Promise(res => { release = res; });

        const mode = healthy ? -1 : i % 4;
        // Production reads state.aPlot while assembling the prompt, so the fixture must be the
        // shape it expects — a race test that dies during prompt assembly proves nothing about
        // the dispatch it never reached.
        s.aPlot = { id: 'aplot-' + i, antagonistOrAntiForce: 'X', timelineLength: 12,
                    coreConflict: 'a conflict', stakes: 'stakes', antagonistShape: 'A' };
        const task = window._generateSubplots(s.aPlot, ticket);

        // Four ways an invocation can stop owning its background work — each exercised, each of
        // which must stop the dispatch.
        if (mode === 0) window._markInvocationFatal('skeleton unusable', s);       // this run aborted
        if (mode === 1) window._beginInvocation(s);                                // superseded by a newer run
        if (mode === 2) s.storyId = 'switched-' + i;                               // story changed underneath
        if (mode === 3) { window._beginInvocation(s); window._markInvocationFatal('later run aborted', s); }

        if (healthy) s.storyId = 'assigned-' + i;   // the ordinary late assignment
        // Production clears the paired skeleton marker by assigning null; the invocation token
        // must read that as a clear, never as an abort.
        if (clearFatal) window._markInvocationFatal(null, s);
        release();                     // the spine lands only AFTER the loss of ownership
        await task;
        out.runs.push({ i, mode, seq: ticket.seq, alive: window._invocationAlive(ticket, s) });
        out.traces.push(trace.slice(0, 8).join(' → '));
      }
      return out;
    }, { ITER, healthy, clearFatal });
    return { dispatched, ...r };
  } finally { await ctx.close().catch(() => {}); }
}

const browser = await chromium.launch({ headless: true });
console.log(`\n${'═'.repeat(84)}\nX13b — SUBPLOT RACE · ${ITER} iterations, one browser, no sleeps\n${'═'.repeat(84)}\n`);
try {
  const G = await run(browser, { mutate: false });
  console.log(' 1 · THE GUARDED ARM');
  console.log('   trace of iteration 0: ' + G.traces[0]);
  console.log('   modes exercised: fatal · superseded · story-switch · superseded+fatal');
  t(`1a: ZERO subplot dispatches across all ${ITER} iterations — every losing interleaving, ` +
    'not a lucky run',
    G.dispatched.length === 0 && G.runs.length === ITER,
    `dispatched=${G.dispatched.length} iterations=${G.runs.length}`);
  t('1b: every iteration genuinely lost ownership — the arm is not passing because the race ' +
    'never happened',
    G.runs.every(x => x.alive === false) && new Set(G.runs.map(x => x.mode)).size === 4,
    JSON.stringify(G.runs.slice(0, 4)));
  t('1c: the trace shows the sequence — scheduled, then cancelled at the pre-dispatch check, ' +
    'and never dispatched',
    G.traces.every(x => /subplot:scheduled/.test(x) && /subplot:cancelled/.test(x)
      && !/subplot:dispatch\b/.test(x)),
    G.traces[0]);

  console.log('\n 2 · THE HEALTHY ARM MUST STILL DISPATCH');
  const H = await run(browser, { mutate: false, healthy: true });
  console.log('   trace of iteration 0: ' + H.traces[0]);
  t('1d: a run that KEEPS ownership dispatches every time — the guard cancels abandoned work, ' +
    'not the story that is actually being told',
    H.dispatched.length === ITER,
    `dispatched=${H.dispatched.length} of ${ITER}`);
  t('1e: …including when storyId is still empty at schedule time and assigned afterwards, which ' +
    'is the ordinary case and must never read as a story switch',
    H.runs.every(x => x.alive === true), JSON.stringify(H.runs.slice(0, 3)));

  console.log('\n 2b · A CLEARED FATAL IS NOT A FATAL');
  const C = await run(browser, { mutate: false, healthy: true, clearFatal: true });
  t('1f: marking fatal with a FALSY reason CLEARS it, and the dispatch proceeds — production ' +
    'sets the paired skeleton marker to null to clear it, and reading that as an abort cancelled ' +
    'every healthy story\'s subplots',
    C.dispatched.length === ITER, `dispatched=${C.dispatched.length} of ${ITER}`);

  console.log('\n 3 · MUTATION CONTROL');
  const M = await run(browser, { mutate: true });
  console.log('   trace of iteration 0: ' + M.traces[0]);
  t('2a: with the final pre-dispatch check REMOVED, the forbidden dispatch appears — so the ' +
    'green arm above is evidence, not an inert assertion',
    M.dispatched.length >= 1,
    `dispatched=${M.dispatched.length} (expected at least 1)`);
  t('2b: …and the mutant traces reach dispatch, naming exactly what the guard prevents',
    M.traces.some(x => /subplot:dispatch/.test(x)),
    M.traces[0]);
} finally { await browser.close(); }

console.log(`\n${'─'.repeat(84)}\n  ${pass} passed · ${fail} failed  ($0.00 — every request intercepted)\n`);
process.exit(fail ? 1 : 0);
