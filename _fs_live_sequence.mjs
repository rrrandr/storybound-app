// ══════════════════════════════════════════════════════════════════════════════════════════════
// LIVE: First Sacrifice — Scene 1 (fixed) · OAS · Scenes 2-4
// AUTHORIZED by Roman 2026-10-04, ceiling $3.00, explicit go.
// ══════════════════════════════════════════════════════════════════════════════════════════════
// PROVIDER CALLS GO THROUGH FOR REAL. Only these are intercepted locally, none of which cost
// anything at a provider: /api/config, the entitlement/payment responses (SIMULATED — no
// purchase, no real account, no payment credential), and IMAGE generation, which is BLOCKED.
//
// Per-call this records: requested model, model actually served, input/output/CACHED tokens,
// the receipt if one comes back, and retries. Estimated exposure is NEVER counted as measured
// spend, and no cache reuse is assumed across the mid-sequence model change.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { estimateUsd } from './_fsc_cost_guard.mjs';
import { makeSpendLedger } from './_live_spend_ledger.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview, enterOAS, advanceExpectingGate, chooseBranch }
  from './_fs_story_setup.mjs';

const CEILING = Number(process.env.SB_CEILING || 3.00);
// FIXTURE MODE EXERCISES THIS RUNNER, not a copy of its logic. Every gate, deadline, budget
// rule and sequencing decision below is the same code the paid run uses; only the provider
// response is served locally, and NO provider traffic leaves the process.
const FIXTURES = process.env.SB_FIXTURES ? JSON.parse(fs.readFileSync(process.env.SB_FIXTURES, 'utf8')) : null;
const LIVE = !FIXTURES;
const RUN = '_fs_live_out/run_' + new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(RUN, { recursive: true });
const LOG = fs.createWriteStream(RUN + '/run.log');
const say = (m) => { const s = String(m); process.stdout.write(s + '\n'); LOG.write(s + '\n'); };
const write = (f, o) => fs.writeFileSync(RUN + '/' + f, typeof o === 'string' ? o : JSON.stringify(o, null, 2));

const ledger = makeSpendLedger(say);
const calls = [];
let halted = false, haltReason = '';

// ── ATOMIC IN-FLIGHT RESERVATION (Roman/Codex 2026-10-05) ───────────────────────────────────
// The previous check read `calls`, which a request only enters AFTER it returns, so two
// concurrent dispatches could each pass the budget check without seeing the other.
// `reservedTotal` was incremented but never consulted. Exposure is now RESERVED BEFORE the
// request leaves and SETTLED when it comes back: a receipt replaces its reservation, and a call
// with no receipt KEEPS it, because no receipt is not no cost.
let inFlight = 0;          // reserved for requests currently out
let settled = 0;           // receipted spend
let retained = 0;          // reservations kept for calls that returned no receipt
// FIXTURE RUNS USE THEIR OWN LEDGER. Exercising the runner must never touch the ledger that
// records real authorization spend (Codex 2026-10-05).
const BUDGET_FILE = FIXTURES ? '_fs_live_out/BUDGET.fixture.json' : '_fs_live_out/BUDGET.json';
const LOCK_FILE = FIXTURES ? '_fs_live_out/BUDGET.fixture.lock' : '_fs_live_out/BUDGET.lock';

// ── THE BUDGET FAILS CLOSED ─────────────────────────────────────────────────────────────────
// A missing or malformed ledger must REFUSE a continuation run, not silently restart exposure
// at zero — that is how an authorization gets spent twice. Reservations are persisted BEFORE
// dispatch and settled after, so a crash leaves them on disk as unresolved exposure rather than
// evaporating. A lock stops two runner processes spending the same remaining authorization.
const PRIOR = (() => {
  if (!fs.existsSync(BUDGET_FILE)) {
    say('*** REFUSING TO RUN: ' + BUDGET_FILE + ' is missing. A continuation run cannot assume');
    say('    zero prior exposure. Seed it deliberately, or state that this is a fresh');
    say('    authorization and create it with zeros on purpose.');
    process.exit(2);
  }
  try {
    const j = JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
    if (typeof j.receipted !== 'number' || typeof j.unresolved !== 'number') throw new Error('shape');
    return j;
  } catch (e) {
    say('*** REFUSING TO RUN: ' + BUDGET_FILE + ' is malformed (' + (e && e.message) + ').');
    say('    Exposure is unknown, so no dispatch is safe. Repair the ledger by hand.');
    process.exit(2);
  }
})();
// Outstanding reservations from a previous crash are STILL EXPOSURE.
const orphaned = Array.isArray(PRIOR.outstanding) ? PRIOR.outstanding : [];
if (orphaned.length) {
  const o = orphaned.reduce((n, x) => n + (x.estimate || 0), 0);
  say('*** ' + orphaned.length + ' reservation(s) from an earlier run never settled — $'
    + o.toFixed(6) + ' carried as unresolved exposure ***');
}
// EXCLUSIVE ACQUISITION. existsSync-then-write is check-then-act: two runners can both pass the
// check before either writes. 'wx' fails if the file exists, atomically, so only one wins.
try {
  fs.writeFileSync(LOCK_FILE, JSON.stringify({ pid: process.pid, run: RUN, at: Date.now() }),
    { flag: 'wx' });
} catch (e) {
  if (e && e.code === 'EEXIST') {
    let age = 0; try { age = Date.now() - fs.statSync(LOCK_FILE).mtimeMs; } catch (_) {}
    say('*** REFUSING TO RUN: ' + LOCK_FILE + ' is held (' + Math.round(age / 1000)
      + 's old). Another runner may be spending the same authorization.');
    say('    Remove it only after confirming no other run is live.');
    process.exit(3);
  }
  say('*** REFUSING TO RUN: could not acquire ' + LOCK_FILE + ': ' + (e && e.message));
  process.exit(3);
}
// BOTH OF THESE WERE REFERENCED AND NEVER DEFINED after the budget block was rewritten — the
// runner threw "exposure is not defined" the first time it was actually executed. Reading the
// file did not reveal it; running it did, which is the point of exercising the real runner.
const priorExposure = (PRIOR.receipted || 0) + (PRIOR.unresolved || 0)
  + orphaned.reduce((n, x) => n + (x.estimate || 0), 0);
const exposure = () => priorExposure + settled + retained + inFlight;

const releaseLock = () => { try { fs.unlinkSync(LOCK_FILE); } catch (_) {} };
process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(130); });

// Persisted reservation ledger — written before each dispatch, settled after.
let outstanding = orphaned.slice();
// PERSISTENCE IS MANDATORY BEFORE DISPATCH. Swallowing a failed write and continuing is the
// opposite of failing closed: the reservation would exist only in memory, and a crash would
// erase it. A write that fails halts the run.
const persistBudget = () => {
  try {
    fs.writeFileSync(BUDGET_FILE, JSON.stringify({
      receipted: (PRIOR.receipted || 0) + settled,
      unresolved: (PRIOR.unresolved || 0) + retained,
      outstanding,
      runs: (PRIOR.runs || []).concat([{ run: RUN, receipted: settled, unresolved: retained }]),
      note: PRIOR.note || null
    }, null, 2));
  } catch (e) {
    halted = true;
    haltReason = 'budget could not be persisted (' + (e && e.message) + ')';
    say('\n*** HALTING — ' + haltReason + '. A reservation that exists only in memory is not a');
    say('    reservation; refusing to dispatch further. ***');
    throw e;
  }
};

const REQUEST_TIMEOUT_MS = 180000;   // restored; a bare fetch previously hung author generation

say('=== FS SEQUENCE — ceiling $' + CEILING.toFixed(2) + (LIVE ? ' — LIVE' : ' — FIXTURES, no provider traffic') + ' ===');
say('Authorized by Roman 2026-10-04 with an explicit go.');
say('ENTITLEMENT/PAYMENT RESPONSES SIMULATED — no purchase, no real account. IMAGES BLOCKED.');
say('Scene 1 is the FIXED hand-authored opening and generates nothing.\n');

const browser = await chromium.launch();
const page = await browser.newPage();
const consoleLog = [];
page.on('console', m => consoleLog.push(m.text()));
page.on('pageerror', e => consoleLog.push('PAGEERROR: ' + (e && e.message)));

await page.addInitScript(() => {
  const session = { access_token: 'harness-session-token', user: { id: 'harness-reader' } };
  window.supabase = { createClient: () => ({
    auth: { getSession: async () => ({ data: { session }, error: null }),
      getUser: async () => ({ data: { user: session.user }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInAnonymously: async () => ({ data: { session, user: session.user }, error: null }) },
    from: () => ({ select() { return this; }, eq() { return this; }, order() { return this; },
      limit() { return this; }, single: async () => ({ data: null, error: null }),
      insert: async () => ({ data: null, error: null }), upsert: async () => ({ data: null, error: null }),
      update: async () => ({ data: null, error: null }), then: (r) => r({ data: [], error: null }) }),
    channel: () => ({ on() { return this; }, subscribe() { return this; } }), removeChannel: () => {} }) };
});

await page.route('**/api/**', async (route) => {
  const req = route.request(); const url = req.url();

  if (/\/api\/config/.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ supabaseUrl: 'http://localhost:3000/_h', supabaseAnonKey: 'h' }) });
  }
  // SIMULATED ENTITLEMENT — supplies the payment prerequisite only. No purchase occurs.
  if (/consume-fortune|fortune|charge|pricing|entitle|storypass|subscription/i.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ ok: true, success: true, charged: true, fortunesRemaining: 9999,
        balance: 9999, fortunes: 9999, entitled: true, eligible: true, storypassEligible: true }) });
  }
  // IMAGES BLOCKED — standing rule, and they are not what this run measures.
  if (/image|bfl|flux|dalle|kontext|visualize/i.test(url)) {
    return route.fulfill({ status: 503, contentType: 'application/json',
      body: JSON.stringify({ error: 'images blocked by the harness' }) });
  }
  // Anything that is not a model call: answer locally so nothing fails closed.
  if (!/\/api\/(proxy|chatgpt-proxy|mistral|grok|anthropic)/.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
  }

  // ── A REAL MODEL CALL ──────────────────────────────────────────────────────────────────────
  let raw = null; try { raw = req.postData(); } catch (_) {}
  let body = {}; try { body = JSON.parse(raw || '{}'); } catch (_) {}
  const requested = body.preferredModel || body.model || body.grokModel || '(unspecified)';
  const chars = (body.messages || []).reduce((n, m) => n + String(m.content || '').length, 0);
  const est = estimateUsd({ messages: body.messages || [], max_tokens: body.max_tokens },
    requested).estimate;

  // RESERVE ATOMICALLY, BEFORE THE REQUEST LEAVES.
  if (halted || exposure() + est > CEILING) {
    if (!halted) { halted = true;
      haltReason = 'ceiling: exposure $' + exposure().toFixed(6) + ' + next $' + est.toFixed(6)
        + ' would exceed $' + CEILING.toFixed(2)
        + ' (prior runs $' + priorExposure.toFixed(6) + ')';
      say('\n*** HALTED BEFORE DISPATCH — ' + haltReason + ' ***'); }
    return route.fulfill({ status: 503, contentType: 'application/json',
      body: JSON.stringify({ error: 'harness ceiling reached' }) });
  }
  inFlight += est;                       // held until this call settles
  const resv = { n: calls.length + 1, estimate: est, model: requested, at: Date.now() };
  outstanding.push(resv);
  try { persistBudget(); }                   // ON DISK BEFORE THE REQUEST LEAVES
  catch (_) {
    return route.fulfill({ status: 503, contentType: 'application/json',
      body: JSON.stringify({ error: 'harness: budget not persisted; dispatch refused' }) });
  }

  const t0 = Date.now();
  let resp = null, text = '', err = null;
  if (FIXTURES) {
    // Serve from the fixture table, honouring any scripted delay so slow-response behaviour is
    // exercised rather than described.
    const key = Object.keys(FIXTURES.byMatch || {}).find(k => new RegExp(k, 'i').test(
      (body.messages || []).map(m => m.content).join(' ').slice(0, 20000)));
    const f = (key && FIXTURES.byMatch[key]) || FIXTURES.default || { body: '{}' };
    if (f.delayMs) await new Promise(r => setTimeout(r, f.delayMs));
    if (f.fail) {
      calls.push({ n: calls.length + 1, requested, chars, ms: Date.now() - t0, estimate: est,
        error: 'fixture failure', measured: null });
      inFlight -= est; retained += est;
      outstanding = outstanding.filter(x => x !== resv); persistBudget();
      say('  call ' + calls.length + '  ' + requested + '  FIXTURE FAILURE');
      return route.fulfill({ status: 500, contentType: 'application/json',
        body: JSON.stringify({ error: 'fixture failure' }) });
    }
    const textF = typeof f.body === 'string' ? f.body : JSON.stringify(f.body);
    const recF = { n: calls.length + 1, requested, chars, maxTokens: body.max_tokens || null,
      convId: body.convId || null, role: body.role || null, ms: Date.now() - t0, estimate: est };
    try { const j = JSON.parse(textF); const u = j.usage || {};
      recF.served = j.model || null; recF.inTok = u.prompt_tokens ?? null;
      recF.outTok = u.completion_tokens ?? null;
      recF.cachedTok = (u.prompt_tokens_details || {}).cached_tokens ?? null;
      recF.ticks = u.cost_in_usd_ticks ?? null;
      recF.measured = (typeof recF.ticks === 'number') ? recF.ticks * 1e-10 : null;
    } catch (_) { recF.measured = null; }
    inFlight -= est;
    if (recF.measured != null) settled += recF.measured; else retained += est;
    outstanding = outstanding.filter(x => x !== resv); persistBudget();
    recF.exposureAfter = exposure();
    calls.push(recF);
    say('  call ' + String(recF.n).padStart(2) + '  [fixture] ' + String(requested).padEnd(28)
      + (recF.measured != null ? ' $' + recF.measured.toFixed(6) : ' no receipt')
      + '  ' + recF.ms + 'ms');
    return route.fulfill({ status: 200, contentType: 'application/json', body: textF });
  }
  try {
    // EXPLICIT TIMEOUT RESTORED. A bare route.fetch() has no deadline, and an author generation
    // that hangs takes the whole run with it.
    // THE TIMEOUT GOES ON route.fetch ITSELF. Racing a bare fetch against a timer leaves
    // Playwright's own 30s default in place, which is the deadline that actually fires and is
    // what killed author generation before. The outer race remains only as a backstop.
    resp = await Promise.race([
      route.fetch({ timeout: REQUEST_TIMEOUT_MS }),
      new Promise((_, rej) => setTimeout(() => rej(new Error('harness backstop after '
        + (REQUEST_TIMEOUT_MS + 15000) + 'ms')), REQUEST_TIMEOUT_MS + 15000))
    ]);
    text = await resp.text();
  } catch (e) { err = String(e && e.message); }
  const ms = Date.now() - t0;

  const rec = { n: calls.length + 1, requested, chars, maxTokens: body.max_tokens || null,
    convId: body.convId || null, role: body.role || null, ms, estimate: est };
  if (err || !resp) {
    rec.error = err || 'no response';
    rec.measured = null;
    inFlight -= est; retained += est;    // UNRESOLVED: the reservation is kept, not released
    outstanding = outstanding.filter(x => x !== resv); persistBudget();
    ledger.recordDispatchedNoResponse
      ? ledger.recordDispatchedNoResponse('call#' + rec.n, est, requested, rec.error)
      : null;
    say('  call ' + rec.n + '  ' + requested + '  ' + chars + 'c  DISPATCHED, NO RESPONSE: ' + rec.error);
    calls.push(rec);
    return route.fulfill({ status: 502, contentType: 'application/json',
      body: JSON.stringify({ error: rec.error }) });
  }
  try {
    const j = JSON.parse(text);
    rec.served = j.model || null;
    const u = j.usage || {};
    rec.inTok = u.prompt_tokens ?? null;
    rec.outTok = u.completion_tokens ?? null;
    rec.cachedTok = (u.prompt_tokens_details && u.prompt_tokens_details.cached_tokens) ?? null;
    rec.reasoningTok = (u.completion_tokens_details && u.completion_tokens_details.reasoning_tokens) ?? null;
    rec.ticks = u.cost_in_usd_ticks ?? null;
    rec.measured = (typeof rec.ticks === 'number') ? rec.ticks * 1e-10 : null;
  } catch (_) { rec.parseError = true; rec.measured = null; }
  // SETTLE: a receipt replaces the reservation; no receipt retains it.
  inFlight -= est;
  if (rec.measured != null) settled += rec.measured; else retained += est;
  outstanding = outstanding.filter(x => x !== resv); persistBudget();
  rec.exposureAfter = exposure();
  calls.push(rec);
  // FULL request and response preserved — truncated console lines are not evidence.
  try {
    fs.mkdirSync(RUN + '/wire', { recursive: true });
    fs.writeFileSync(RUN + '/wire/' + String(rec.n).padStart(3, '0') + '_req.json', raw || '');
    fs.writeFileSync(RUN + '/wire/' + String(rec.n).padStart(3, '0') + '_res.json', text || '');
  } catch (_) {}
  say('  call ' + String(rec.n).padStart(2) + '  ' + String(requested).padEnd(30)
    + ' served=' + String(rec.served || '?').padEnd(30)
    + ' in=' + String(rec.inTok ?? '?').padStart(6)
    + ' cached=' + String(rec.cachedTok ?? '?').padStart(5)
    + ' out=' + String(rec.outTok ?? '?').padStart(5)
    + (rec.measured != null ? '  $' + rec.measured.toFixed(6) : '  NO RECEIPT (est $' + est.toFixed(6) + ')')
    + '  ' + ms + 'ms');
  write('calls.json', calls);
  return route.fulfill({ status: resp.status(), headers: resp.headers(), body: text });
});

await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._advanceStagedScene === 'function', { timeout: 30000 });
say('app loaded\n');
write('PLAN.md', '# FS live sequence\n\nCeiling $3.00, authorized 2026-10-04.\n'
  + 'Scene 1 fixed · live OAS · Scenes 2-4 generated.\n');

const snapshot = async (label) => page.evaluate((l) => {
  const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
  return { label: l, scenes: cg.length,
    texts: cg.map(x => ({ uid: x.uid, text: x.text })),
    notes: (window.state._historyNotes || []).map(n => ({ ref: n.ref,
      quoted: (n.quoted || []).map(q => q.quote),
      summary: (n.summary || []).map(x => x.text),
      obligations: (n.obligations || []).map(o => o.id) })),
    oas: ((window.state._oasSceneSnapshots || {})['0'] || {}).beats || null };
}, label);

async function pageToGate(maxClicks = 14) {
  for (let i = 0; i < maxClicks; i++) {
    const st = await page.evaluate(() => {
      const a = window.state._stagedActive || null;
      return a ? { gateShown: !!a.gateShown, beat: a.currentBeatIdx,
        beats: a.plan && a.plan.beats ? a.plan.beats.length : null } : null;
    });
    if (st && st.gateShown) return { ...st, clicks: i };
    const ok = await page.evaluate(() => {
      const b = document.getElementById('gnNextPageBtn');
      if (b && !b.disabled) { b.click(); return true; }
      if (typeof window._advanceStagedBeat === 'function') { window._advanceStagedBeat(); return true; }
      return false;
    });
    if (!ok) break;
    await page.waitForTimeout(1200);
  }
  return await page.evaluate(() => {
    const a = window.state._stagedActive || null;
    return a ? { gateShown: !!a.gateShown, beat: a.currentBeatIdx } : { gateShown: false };
  });
}

try {
  say('── SETUP (live: bibles, plots, scaffold — the unpriced stage) ──');
  await page.evaluate(() => { window.state.profileId = 'harness-reader'; window.state.fortunes = 9999;
    window.state.storypassEligible = true; window.state.subscribed = true; });
  const def = await findFSDef(page);
  await launchFS(page, def);
  await unlockFS(page, 'fs-live');
  await finalizePreview(page);
  await page.waitForTimeout(4000);
  say('  setup complete · exposure $' + exposure().toFixed(6) + '\n');

  if (!halted) {
    say('── OAS (live) ──');
    await enterOAS(page, { settleMs: 9000 });

    // EACH INPUT IS ACCEPTED AND ITS RESPONSE COMPLETED BEFORE THE NEXT ONE. The previous
    // version fired inputs nine seconds apart while calls were taking fifteen, never checked
    // that an input was consumed, and printed "OAS complete" regardless. Beat count is the
    // production signal that a turn landed.
    // beatCount IS INCREMENTED AT THE START of _handleIntimacyTurn (app.js:204238), BEFORE the
    // model is called, so waiting on it waits for a REQUEST, not a REPLY. The signal that a
    // reply actually landed is liTurnHistory gaining an entry whose liDialogue is populated —
    // that push happens after the response is parsed (app.js:205514).
    const oasState = () => page.evaluate(() => {
      const d = window.state.intimacyDialogue;
      if (!d) return null;
      const h = Array.isArray(d.liTurnHistory) ? d.liTurnHistory : [];
      const last = h[h.length - 1] || null;
      return { active: !!d.active, resolving: !!d._resolving,
        beats: d.beatCount || 0,
        replies: h.length,
        lastHasDialogue: !!(last && last.liDialogue),
        acceptingInput: !!d.active && !d._resolving };
    });
    // ── THE READER PLAYS A FATE CARD, NOT A LINE I MADE UP ──────────────────────────────────
    // My scripted inputs were the contamination in the last run: nine deflections fed to a
    // character briefed to press one question until it is answered. He kept asking because
    // nobody ever answered — which is correct behaviour, not repetition.
    //
    // The five OAS cards are authored by Grok FOR THIS MOMENT (generateIntimateFatePreviewsBatch)
    // and carry {dialogue, action} — exactly the SAY and DO a reader submits. They know the
    // situation and are primed for the OAS register, so they are a far better probe than
    // anything I can invent, and they make the test reproducible instead of reflecting my
    // guesses about how a reader talks.
    //
    // The pick is SEEDED so a rerun plays the same hand; "random" here means reproducible
    // selection, not a model judgement.
    let pickSeed = 1013904223;
    const nextPick = (n) => { pickSeed = (1664525 * pickSeed + 1013904223) >>> 0; return pickSeed % n; };

    // ── PLAY A CARD THE WAY A READER PLAYS ONE ─────────────────────────────────────────────
    // Copying a card's text into the dialogue handler is not playing it: it skips the click that
    // records the selected slot, skips sanitization, and skips whatever the commit path enables.
    // This clicks the real .fate-card element and then submits, and records what was actually
    // sent rather than what was intended.
    //
    // PROVENANCE IS READ FROM THE GROK CACHE, NOT FROM _intimate. fatecards.js sets
    // _intimate: true on the TEMPLATE path too (line 1241), so that flag proves nothing about
    // authorship. The only authoritative test is whether this card id is in
    // state._grokIntimateFateCards.cards for THIS turn.
    const readHand = () => page.evaluate(() => {
      const st = window.state || {};
      const opts = st.fateOptions || [];
      const tc = st.turnCount;
      const cache = st._grokIntimateFateCards;
      const cacheFresh = !!(cache && cache.turnCount === tc && cache.cards);
      const els = [...document.querySelectorAll('.fate-card')];
      return {
        count: opts.length,
        domCards: els.length,
        loading: !!st._grokIntimateFateCardsInFlight,
        cards: opts.map((c, i) => ({
          slot: i, id: c && c.id, label: c && (c.label || c.title),
          dialogue: c && c.dialogue, action: c && c.action,
          intimateFlag: !!(c && c._intimate),
          // AUTHORITATIVE: present in the Grok cache for this turn?
          grokAuthored: !!(cacheFresh && c && c.id && cache.cards[c.id]),
          variant: (c && c._variant) || null
        }))
      };
    });

    // Wait for the current options to finish loading before choosing.
    const waitForHand = async (maxMs = 45000) => {
      const dl = Date.now() + maxMs;
      while (Date.now() < dl) {
        const h = await readHand();
        if (!h.loading && h.count > 0 && h.domCards > 0) return h;
        await page.waitForTimeout(1000);
      }
      return await readHand();
    };

    let turnsTaken = 0;
    for (let i = 0; i < 9 && !halted; i++) {
      const pre = await oasState();
      if (!pre || !pre.active || pre.resolving) { say('  OAS is no longer accepting input'); break; }
      // Draw the hand this turn actually offers, wait for it to settle, and PLAY one.
      const hand = await waitForHand();
      const usable = hand.cards.filter(c => c && (c.dialogue || c.action));
      if (!usable.length) {
        halted = true;
        haltReason = 'no usable Fate cards were offered at OAS turn ' + (i + 1)
          + ' (options=' + hand.count + ', dom=' + hand.domCards + ', loading=' + hand.loading + ')';
        say('  *** STOPPING — ' + haltReason + '. There is no scripted answer to fall back on: a');
        say('      harness-written reply is what contaminated the last run. ***');
        break;
      }
      const chosen = usable[nextPick(usable.length)];
      // CLICK THE REAL CARD so the selection is recorded by production.
      const played = await page.evaluate((slot) => {
        const els = [...document.querySelectorAll('.fate-card')];
        const el = els[slot] || els[0];
        if (!el) return { clicked: false };
        el.click();
        return { clicked: true,
          selectedIndex: (window.state && window.state.fateSelectedIndex),
          committed: !!(window.state && window.state.fateCommitted) };
      }, chosen.slot);
      await page.waitForTimeout(1200);
      // What production actually put in the inputs after the click.
      const submitted = await page.evaluate(() => {
        const a = document.getElementById('actionInput') || document.getElementById('gnActionInput');
        const d = document.getElementById('dialogueInput') || document.getElementById('gnDialogueInput');
        return { action: a ? a.value : null, dialogue: d ? d.value : null };
      });
      const say_ = (submitted.dialogue && submitted.dialogue.trim()) || chosen.dialogue || '';
      const do_  = (submitted.action && submitted.action.trim()) || chosen.action || '';
      cardLog.push({ turn: i + 1, hand: hand.cards, chosenSlot: chosen.slot, chosenId: chosen.id,
        played, submitted: { say: say_, do: do_ },
        grokAuthored: chosen.grokAuthored, intimateFlag: chosen.intimateFlag });
      say('  turn ' + (i + 1) + ' plays slot ' + chosen.slot + ' "' + (chosen.label || chosen.id) + '"'
        + (chosen.grokAuthored ? ' [GROK-AUTHORED for this turn]'
                               : ' [TEMPLATE — _intimate=' + chosen.intimateFlag + ', not in the Grok cache]')
        + '  clicked=' + played.clicked + ' idx=' + played.selectedIndex);
      say('      SAY ' + JSON.stringify(String(say_).slice(0, 80)));
      say('      DO  ' + JSON.stringify(String(do_).slice(0, 80)));

      // THE HANDLER'S RETURN VALUE IS USED, not discarded — a refused input is a refused input.
      const accepted = await page.evaluate(({ a, b }) => {
        try { const r = window._intimacyDialogueConsumeInput(a, b);
          return { ok: r !== false, returned: (r === undefined ? 'undefined' : String(r)) }; }
        catch (e) { return { ok: false, returned: 'threw: ' + (e && e.message) }; }
      }, { a: say_, b: do_ });
      if (!accepted.ok) {
        halted = true; haltReason = 'OAS input ' + (i + 1) + ' REFUSED (' + accepted.returned + ')';
        say('  *** STOPPING — ' + haltReason + ' ***'); break;
      }
      // THE EXIT MODAL IS A REAL OUTCOME, NOT A FAILURE. An input like "Enough." opens
      // #intimacyExitModal and returns true WITHOUT requesting another reply, so waiting for
      // dialogue that this interaction deliberately never generates would time out and be
      // reported as a stall. Detect it and take the exit that ends THIS ENCOUNTER —
      // #intimacyExitFade — never #intimacyExitMetaphorical, which changes future intimacy
      // preferences for the whole story and is not ours to set.
      const modalUp = async () => page.evaluate(() => {
        const m = document.getElementById('intimacyExitModal');
        return !!(m && m.offsetParent !== null);
      });
      let exited = false;
      for (let w = 0; w < 8; w++) {
        if (await modalUp()) {
          const which = await page.evaluate(() => {
            const b = document.getElementById('intimacyExitFade');
            if (b && b.offsetParent !== null) { b.click(); return 'intimacyExitFade'; }
            return null;
          });
          say('  turn ' + (i + 1) + ': EXIT MODAL opened — took "' + which + '" (ends this '
            + 'encounter; future-preference options left untouched)');
          exited = !!which;
          break;
        }
        await page.waitForTimeout(500);
      }

      // WAIT FOR A RENDERED REPLY: one more liTurnHistory entry, carrying dialogue, and the
      // dialogue ready to take another input. Skipped when the exit path was taken, which
      // produces no reply by design.
      let landed = exited;
      const deadline = Date.now() + REQUEST_TIMEOUT_MS + 20000;   // tied to the request timeout
      while (!exited && Date.now() < deadline) {
        const now = await oasState();
        if (!now || !now.active) { landed = true; break; }
        if (now.replies > pre.replies && now.lastHasDialogue && !now.resolving) { landed = true; break; }
        if (await modalUp()) {
          const which = await page.evaluate(() => {
            const b = document.getElementById('intimacyExitFade');
            if (b && b.offsetParent !== null) { b.click(); return 'intimacyExitFade'; }
            return null;
          });
          say('  turn ' + (i + 1) + ': exit modal appeared mid-wait — took "' + which + '"');
          landed = true; exited = true; break;
        }
        await page.waitForTimeout(1500);
      }
      const post = await oasState();
      turnsTaken++;
      say('  turn ' + (i + 1) + ': replies ' + pre.replies + ' -> '
        + (post ? post.replies : 'ended') + ' (beats ' + pre.beats + ' -> '
        + (post ? post.beats : '-') + ')'
        + (landed ? '' : '  *** NO REPLY LANDED WITHIN 180s ***'));
      if (!landed) {
        halted = true; haltReason = 'OAS turn ' + (i + 1) + ' produced no rendered reply';
        say('  *** STOPPING — ' + haltReason + ' ***');
        break;
      }
    }

    // RESOLUTION IS REQUIRED, NOT ASSUMED.
    let resolved = false;
    const dl = Date.now() + 120000;
    while (Date.now() < dl) {
      const st = await oasState();
      if (!st || (!st.active && !st.resolving)) { resolved = true; break; }
      await page.waitForTimeout(2000);
    }
    // ── THE AUTHORED INTERRUPTION IS ACTUALLY SUBMITTED ───────────────────────────────────
    // Production records submission on state._intimateInterruption.submitted, set by
    // _commitIntimateInterruption (app.js:208246). The previous gate read a field that does not
    // exist (_intimateInterruptionSubmitted) and never performed the interaction at all, so it
    // could never have been satisfied. The reader submits through the staged inputs
    // (#gnActionInput / #gnDialogueInput) and #gnSubmitBtn — app.js:173790 ff.
    const interruptionState = () => page.evaluate(() => {
      const r = window.state._intimateInterruption || null;
      return { present: !!r, submitted: !!(r && r.submitted),
        pending: (typeof window._intimateInterruptionPending === 'function')
          ? !!window._intimateInterruptionPending() : null };
    });
    let intr = await interruptionState();
    say('  interruption: ' + JSON.stringify(intr));
    if (intr.present && !intr.submitted) {
      for (let i = 0; i < 20 && !intr.submitted; i++) {
        const did = await page.evaluate(() => {
          const a = document.getElementById('gnActionInput');
          const d = document.getElementById('gnDialogueInput');
          const b = document.getElementById('gnSubmitBtn');
          if (!b) return 'no #gnSubmitBtn';
          if (a && !a.value) { a.value = 'I step back from him.';
            a.dispatchEvent(new Event('input', { bubbles: true })); }
          if (d && !d.value) { d.value = 'Ask me in front of them, then.';
            d.dispatchEvent(new Event('input', { bubbles: true })); }
          if (b.disabled) return 'submit disabled';
          b.click();
          return 'clicked';
        });
        await page.waitForTimeout(3000);
        intr = await interruptionState();
        if (i === 0 || intr.submitted) say('    submit attempt: ' + did
          + ' -> submitted=' + intr.submitted);
        if (did === 'no #gnSubmitBtn') break;
      }
    }
    const decision = await page.evaluate(() => ({
      needed: (typeof window._sceneDecisionNeeded === 'function') ? !!window._sceneDecisionNeeded() : null,
      promptMounted: !!document.getElementById('sceneDecisionPrompt'),
      recorded: ((window.state._sceneDecisions || {})['1'] || null)
    }));
    say('  axis decision: ' + JSON.stringify(decision));

    const oasFinal = await page.evaluate(() => ({
      dialogue: !!(window.state.intimacyDialogue && window.state.intimacyDialogue.active),
      archive: Object.keys(window.state._oasSceneSnapshots || {}).length,
      interruptionPresent: !!window.state._intimateInterruption,
      interruptionSubmitted: !!(window.state._intimateInterruption
        && window.state._intimateInterruption.submitted)
    }));
    write('after_oas.json', { turnsTaken, resolved, oasFinal, interruption: intr, decision,
      snap: await snapshot('after_oas') });
    say('  turns ' + turnsTaken + ' · resolved=' + resolved + ' · archive=' + oasFinal.archive
      + ' · interruptionSubmitted=' + oasFinal.interruptionSubmitted);

    // THE FULL HANDOFF IS THE GATE: resolution, the archive, AND the interruption submitted.
    if (!resolved || !oasFinal.archive
        || (oasFinal.interruptionPresent && !oasFinal.interruptionSubmitted)) {
      halted = true;
      haltReason = 'OAS handoff incomplete (resolved=' + resolved + ', archive=' + oasFinal.archive
        + ', interruptionPresent=' + oasFinal.interruptionPresent
        + ', interruptionSubmitted=' + oasFinal.interruptionSubmitted + ')';
      say('\n*** STOPPING BEFORE SCENE GENERATION — ' + haltReason + ' ***');
      say('    No further call will be labelled "scene 2".');
    }
    say('  exposure $' + exposure().toFixed(6) + '\n');
  }

  for (let scene = 2; scene <= 10 && !halted; scene++) {
    say('── SCENE ' + scene + ' (live) ──');

    // CAPTURE THE PRE-GENERATION IDENTITY *BEFORE* ANYTHING IS TRIGGERED. Reading the count
    // after the advance races the thing being measured.
    const before = await page.evaluate(() => {
      const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
      return { count: cg.length, lastUid: cg.length ? cg[cg.length - 1].uid : null };
    });

    // THE SCENE'S OWN FATE CARDS, PLAYED. Not scripted inputs.
    const sHand = await waitForHand();
    const sUsable = sHand.cards.filter(c => c && (c.dialogue || c.action));
    if (!sUsable.length) {
      halted = true;
      haltReason = 'no usable Fate cards offered at scene ' + scene;
      say('  *** STOPPING — ' + haltReason + ' ***');
      break;
    }
    const sc = sUsable[nextPick(sUsable.length)];
    const sPlayed = await page.evaluate((slot) => {
      const els = [...document.querySelectorAll('.fate-card')];
      const el = els[slot] || els[0];
      if (!el) return { clicked: false };
      el.click();
      return { clicked: true, selectedIndex: (window.state && window.state.fateSelectedIndex) };
    }, sc.slot);
    await page.waitForTimeout(1200);
    const sSub = await page.evaluate(() => {
      const a = document.getElementById('gnActionInput') || document.getElementById('actionInput');
      const d = document.getElementById('gnDialogueInput') || document.getElementById('dialogueInput');
      return { action: a ? a.value : null, dialogue: d ? d.value : null };
    });
    cardLog.push({ scene, hand: sHand.cards, chosenSlot: sc.slot, chosenId: sc.id,
      played: sPlayed, submitted: sSub, grokAuthored: sc.grokAuthored });
    say('  plays slot ' + sc.slot + ' "' + (sc.label || sc.id) + '"'
      + (sc.grokAuthored ? ' [GROK-AUTHORED]' : ' [TEMPLATE]') + ' clicked=' + sPlayed.clicked);

    const g = await advanceExpectingGate(page, sSub.action || sc.action || '',
      sSub.dialogue || sc.dialogue || '');
    if (g.promptMounted) await chooseBranch(page, 'A');

    // OBSERVED COMPLETION. A GAP BETWEEN PROVIDER CALLS IS NOT A REJECTION — the app may be
    // between stages or parsing a response. Only a sustained quiet period with no new scene,
    // or the overall deadline, ends the wait.
    const sceneDeadline = Date.now() + REQUEST_TIMEOUT_MS + 180000;
    let outcome = 'timeout', quietSince = null;
    while (Date.now() < sceneDeadline) {
      const st = await page.evaluate((prev) => {
        const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
        const last = cg[cg.length - 1] || null;
        return { count: cg.length, grew: cg.length > prev.count,
          newUid: last && last.uid !== prev.lastUid,
          hasProjection: !!(last && last.projection && last.text),
          mounted: !!document.getElementById('stagedBeatText')
            || !!(window.state._stagedActive && window.state._stagedActive.plan) };
      }, before);
      if (st.grew && st.newUid && st.hasProjection && st.mounted) { outcome = 'accepted'; break; }
      if (inFlight > 0) { quietSince = null; }
      else if (quietSince == null) { quietSince = Date.now(); }
      else if (Date.now() - quietSince > 90000) { outcome = 'no-generation'; break; }
      await page.waitForTimeout(2000);
    }
    const snap = await snapshot('scene' + scene);
    write('scene' + scene + '.json', { outcome, before, snap,
      cards: cardLog.filter(c => c.scene === scene) });
    say('  outcome: ' + outcome + ' · scenes ' + before.count + ' -> ' + snap.scenes
      + ' · notes ' + snap.notes.length + ' · exposure $' + exposure().toFixed(6));
    if (outcome !== 'accepted') {
      halted = true;
      haltReason = 'scene ' + scene + ' did not complete (' + outcome + ')';
      say('  *** STOPPING — ' + haltReason + '. Not restarting; reporting as found. ***');
      break;
    }
    // Page to the next gate.
    for (let k = 0; k < 25; k++) {
      if (await page.evaluate(() => !!window.state._stagedActive)) break;
      await page.waitForTimeout(1500);
    }
    say('  paged to gate: ' + JSON.stringify(await pageToGate()));
    say('');
  }

  write('final.json', await snapshot('final'));
} catch (e) {
  say('\n*** RUN ERROR: ' + (e && e.message) + ' ***');
  write('error.txt', String(e && e.stack || e));
}

write('console.log', consoleLog.join('\n'));
write('cards.json', cardLog);
write('calls.json', calls);
say('\n' + '='.repeat(78));
ledger.spendReport(CEILING);
const measured = calls.reduce((n, c) => n + (c.measured || 0), 0);
const noReceipt = calls.filter(c => c.measured == null);
say('\nPER-CALL ROLL-UP');
say('  model calls dispatched : ' + calls.length);
say('  MEASURED (receipts)    : $' + measured.toFixed(6));
say('  no receipt             : ' + noReceipt.length + ' call(s), estimated $'
  + noReceipt.reduce((n, c) => n + c.estimate, 0).toFixed(6) + ' — NOT counted as measured');
say('  retained (no receipt)  : $' + retained.toFixed(6) + ' — kept as exposure, NOT forgiven');
say('  prior runs             : $' + priorExposure.toFixed(6));
say('  TOTAL EXPOSURE         : $' + exposure().toFixed(6));
say('  ceiling                : $' + CEILING.toFixed(2) + (halted ? '  [HALTED: ' + haltReason + ']' : ''));
const cached = calls.filter(c => c.cachedTok != null);
if (cached.length) {
  const tc = cached.reduce((n, c) => n + c.cachedTok, 0), ti = cached.reduce((n, c) => n + (c.inTok || 0), 0);
  say('  CACHED TOKENS          : ' + tc + ' of ' + ti + ' input (' + (ti ? (tc / ti * 100).toFixed(1) : '0') + '%)');
}
write('SUMMARY.json', { calls: calls.length, receipted: settled, retainedUnresolved: retained,
  priorExposure, totalExposure: exposure(), ceiling: CEILING, halted, haltReason });
// CARRY THE BUDGET FORWARD. The next run under the same authorization starts from here, with
// unresolved exposure still counted — it is not forgiven by a new process.
try {
  const next = { receipted: (PRIOR.receipted || 0) + settled,
    unresolved: (PRIOR.unresolved || 0) + retained,
    runs: (PRIOR.runs || []).concat([{ run: RUN, receipted: settled, unresolved: retained }]) };
  fs.writeFileSync('_fs_live_out/BUDGET.json', JSON.stringify(next, null, 2));
  say('\nBUDGET CARRIED FORWARD -> _fs_live_out/BUDGET.json');
  say('  receipted to date  $' + next.receipted.toFixed(6));
  say('  unresolved to date $' + next.unresolved.toFixed(6));
  say('  TOTAL vs ceiling   $' + (next.receipted + next.unresolved).toFixed(6)
    + ' of $' + CEILING.toFixed(2));
} catch (_) {}
say('\noutput: ' + RUN);
await browser.close();
LOG.end();
