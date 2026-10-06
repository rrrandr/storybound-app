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

// NO SILENT DEFAULT. The ceiling IS the authorization, and inheriting a stale one is how a run
// spends against a number nobody approved — which is what happened on the first attempt of
// 2026-10-05, where $3.00 printed after Roman had approved $1.50.
const CEILING = Number(process.env.SB_CEILING || 0);
// FIXTURE MODE EXERCISES THIS RUNNER, not a copy of its logic. Every gate, deadline, budget
// rule and sequencing decision below is the same code the paid run uses; only the provider
// response is served locally, and NO provider traffic leaves the process.
let boundaryCheck = null;
let scene2 = {};
const sceneLedger = [];
let openingBranch = { requested: (process.env.SB_OPENING_BRANCH || 'run').toLowerCase(), control: null };
// ── WHAT WAS THIS CALL FOR? Read from the prompt's own self-identification ───────────────────
// (Codex 2026-10-05.) Role labels cannot establish function: this project also routes prose
// through STRUCTURE_GENERATOR, so "PRIMARY_AUTHOR vs everything else" does not say which calls
// wrote scenes. Each prompt names its own job in its opening line, and that is evidence.
// Anything that does not self-identify is reported as UNCLASSIFIED, never folded into a bucket.
function callFunction(sysPrompt) {
  const t = String(sysPrompt || '');
  if (/screenplay-native cinematic-romance writer|uninhibited romance fiction author/i.test(t)
      && !/Say\/Do previews|amplify\|ruin\|redirect/i.test(t)) return 'scene author';
  if (/Say\/Do previews|amplify\|ruin\|redirect|one per archetype/i.test(t)) return 'previews';
  if (/intensely intimate mouth-closeup|opening an intimate|li_face_state/i.test(t)) return 'OAS';
  if (/line editor for adult intimate dialogue/i.test(t)) return 'OAS line-edit';
  if (/SCENE-SPINE planner/i.test(t)) return 'scene planner';
  if (/CONTINUITY ARCHITECT/i.test(t)) return 'scaffold';
  if (/RUNTIME COMMIT verifier|editorial auditor|craft auditor|audit prose for BANNED/i.test(t))
    return 'verifier/audit';
  if (/CHARACTER MEMORY EXTRACTOR|canonicalization and normalization/i.test(t)) return 'memory/canon';
  if (/BODY BIBLE|A-PLOT GENERATOR|R-PLOT|SUBPLOT GENERATOR|architect of WHY THIS PAIR|Strategy Engine|WOUND/i.test(t))
    return 'setup (bibles/plots)';
  if (/ruthless line-editor/i.test(t)) return 'repair/cleanup';
  if (/"panels"|panel/i.test(t)) return 'image/panel';
  return 'UNCLASSIFIED';
}
// ── PREVIEW PROVENANCE BY EVIDENCE, NOT BY WORDING ──────────────────────────────────────────
// (Codex 2026-10-05.) The previous classifier called anything that did not look like a
// title+ellipsis fallback a "model preview" — including when previewCached was false. A populated
// input and the absence of an ellipsis prove nothing about authorship. These two record the
// PREVIEW RESPONSES THEMSELVES, keyed by card id, so a submitted suggestion can be matched
// against the reply that was actually served. What cannot be matched stays UNKNOWN.
const previewResponses = new Map();   // cardId -> [{ action, dialogue, at, callN, encounter, turn }]
// THE IDENTITY A PREVIEW REPLY WAS SERVED UNDER. Printing the CURRENT encounter/turn beside an
// OLD match is not provenance (Codex 2026-10-05): a stale record matched and was reported with the
// new identity in its evidence. The runner stamps this onto every record at the moment it serves
// the reply, and matching ENFORCES it.
let previewContext = { encounter: 'setup', turn: null };
function setPreviewContext(encounter, turn) { previewContext = { encounter, turn }; }
const norm = (t) => String(t == null ? '' : t).replace(/\s+/g, ' ').trim().toLowerCase();
// IS THIS A PREVIEW REQUEST? Needed at REQUEST time, before any reply exists.
function isPreviewPrompt(sysPrompt) {
  return /Say\/Do previews|amplify\|ruin\|redirect|one per archetype/i
    .test(String(sysPrompt || ''));
}

// THE IDENTITY A PREVIEW REQUEST WAS SENT UNDER — captured when the request is intercepted and
// passed through to the recorder, never re-read at response time. (Codex 2026-10-05: the recorder
// stamped replies with the runner's context AT RETURN, so an old reply arriving after a turn change
// was credited to the NEW turn. The 13/13 control inserted correctly-labelled records by hand and
// could not see that.)
//
// It carries the APP'S OWN generation key as well as the runner's phase, because a preview batch
// may legitimately be generated AHEAD of the selection that uses it. The app keys its preview cache
// by turnCount (_cacheFateCardPreview) and its OAS batch by turnCount (_grokIntimateFateCards), so
// that key — not the runner's loop counter — is what makes a preview "for" a selection.
async function capturePreviewIdentity(page) {
  let appKey = null;
  try {
    appKey = await page.evaluate(() => ({
      turnCount: window.state ? (window.state.turnCount || 0) : null,
      sceneFateKey: window.state ? (window.state._fateOptionsSceneKey || null) : null,
      oasBeat: (window.state && window.state.intimacyDialogue)
        ? (window.state.intimacyDialogue.beatCount ?? null) : null
    }));
  } catch (_) {}
  return { encounter: previewContext.encounter, turn: previewContext.turn, app: appKey };
}

function recordPreviewReply(sysPrompt, replyText, callN, identity) {
  try {
    const sys = String(sysPrompt || '');
    if (!isPreviewPrompt(sys)) return;
    let content = replyText;
    try { const j = JSON.parse(replyText);
      content = j?.choices?.[0]?.message?.content ?? j?.content ?? replyText; } catch (_) {}
    String(content).split(/\r?\n/).forEach((line) => {
      const parts = String(line).split('|||').map(x => x.trim());
      if (parts.length < 3) return;
      const id = parts[0].toLowerCase().replace(/[^a-z]/g, '');
      if (!id) return;
      // three fields: ARCHETYPE ||| action ||| dialogue
      // four fields:  ARCHETYPE ||| variant ||| action ||| dialogue
      const action = parts.length >= 4 ? parts[2] : parts[1];
      const dialogue = parts.length >= 4 ? parts[3] : parts[2];
      if (!previewResponses.has(id)) previewResponses.set(id, []);
      // THE REQUEST'S identity, passed in — not previewContext as it stands now.
      const ident = identity || { encounter: '(unknown: no request identity)', turn: null, app: null };
      previewResponses.get(id).push({ action, dialogue, at: Date.now(), callN,
        encounter: ident.encounter, turn: ident.turn, app: ident.app });
    });
  } catch (_) {}
}
// Classify a submitted suggestion against the recorded replies and the app's own cache.
//   matched-response : the exact text of a preview reply served for THIS card
//   matched-cache    : the app's cached preview for this card, written by some earlier reply
//   template-fallback: the card's own title (with or without an ellipsis)
//   UNKNOWN          : nothing links it to a model reply — reported as unknown, never as a preview
function classifyPreview(cardId, action, dialogue, cacheEntry, context) {
  const id = String(cardId || '').toLowerCase().replace(/[^a-z]/g, '');
  const a = norm(action), d = norm(dialogue);
  const ctx = context || {};
  const where = 'encounter=' + (ctx.encounter || '?') + ' turn=' + (ctx.turn == null ? '?' : ctx.turn)
    + ' card="' + (id || '(none)') + '"';
  if (!id) {
    return { provenance: 'UNKNOWN', evidence: 'no card id was recorded for the selection, so '
      + 'nothing can be traced to a preview record — ' + where };
  }
  if (!a && !d) return { provenance: 'EMPTY', evidence: 'no text was submitted — ' + where };

  // THE COMPLETE PAIR MUST MATCH ONE RECORD. (Codex 2026-10-05.) Matching EITHER field let a
  // repeated short line ("mm") earn "identical to the preview" while the other field differed
  // completely. Both submitted fields are now compared against the SAME record, and a legitimately
  // empty field is preserved: empty matches empty, and never matches text.
  const pairMatches = (rec) => norm(rec.action) === a && norm(rec.dialogue) === d;

  const titleish = (t) => !t || t === id || t.replace(/[….]+$/, '') === id;
  if (titleish(a) && titleish(d)) {
    return { provenance: 'template-fallback',
      evidence: 'both fields are the card id — the deck\'s own placeholder — ' + where };
  }

  const served = previewResponses.get(id) || [];
  // IDENTITY IS CHECKED, NOT DECORATED. A record only establishes provenance for the encounter and
  // turn it was actually served under.
  // IDENTITY MATCHING. A preview batch may legitimately be generated AHEAD of the selection that
  // uses it, so the runner's loop counter alone is the wrong test. The APP'S OWN generation key is
  // authoritative when both sides have one: a preview generated for turnCount N is "for" a
  // selection made at turnCount N, whatever the runner's iteration was. The phase labels are the
  // fallback when no app key was captured, and a record with NO identity never matches.
  const sameIdentity = (r) => {
    if (!r.encounter && !r.app) return false;
    const a = r.app, b = ctx.app;
    // WITHDRAWN: "one OAS batch serves every beat at the same turnCount — by design." That was
    // wrong (Codex 2026-10-05). The production turn handler CLEARS the preview generation after
    // every reply — d._fateCardPreviews = null (app.js:205729) and
    // state._grokIntimateFateCards = null (app.js:205743) — so the next selection is meant to get
    // a FRESH batch. Equal turnCount therefore does NOT establish the same preview generation,
    // and matching on it alone let a beat-1 reply vouch for a beat-5 selection.
    //
    // So the BEAT is part of the identity for OAS, and an ambiguous reuse is reported UNKNOWN
    // rather than matched. The count is not the objective: an honest UNKNOWN is the correct answer
    // when the observed replies cannot establish where a suggestion came from.
    if (a && b && a.sceneFateKey != null && b.sceneFateKey != null
        && a.oasBeat == null && b.oasBeat == null) {
      return a.sceneFateKey === b.sceneFateKey;      // scene decks are keyed by turn:page
    }
    if (a && b && a.turnCount != null && b.turnCount != null) {
      if (a.turnCount !== b.turnCount) return false;
      // Inside the OAS the generation is cleared per reply, so the beat must agree too. If either
      // side has no beat the generation cannot be established — UNKNOWN, not a match.
      if (a.oasBeat == null || b.oasBeat == null) return false;
      return a.oasBeat === b.oasBeat;
    }
    return false;   // no app-declared generation on one side: not establishable
  };
  const hit = served.find(r => pairMatches(r) && sameIdentity(r));
  if (hit) {
    return { provenance: 'matched-response',
      evidence: 'the COMPLETE action+dialogue pair is identical to the preview reply served for '
        + 'this card on call ' + hit.callN + ', requested under the SAME generation identity ('
        + (hit.app && hit.app.turnCount != null ? 'turnCount=' + hit.app.turnCount
            + (hit.app.oasBeat != null ? ' beat=' + hit.app.oasBeat : '')
            : 'encounter="' + hit.encounter + '" turn=' + hit.turn) + ') — ' + where };
  }
  // A pair that matches a record from ANOTHER encounter or turn is a stale match. It is named, with
  // the identity it really came from, and it does NOT count as this submission's provenance.
  const stale = served.find(pairMatches);
  if (stale) {
    return { provenance: 'UNKNOWN',
      evidence: 'the pair matches a preview reply REQUESTED under a DIFFERENT identity (encounter="'
        + stale.encounter + '" turn=' + stale.turn
        + (stale.app && stale.app.turnCount != null ? ' turnCount=' + stale.app.turnCount : '')
        + ', call ' + stale.callN + '), not under ' + where
        + ' — a stale record is not provenance for this submission' };
  }
  if (cacheEntry && pairMatches(cacheEntry)) {
    return { provenance: 'matched-cache',
      evidence: 'the COMPLETE pair is identical to the app\'s cached preview for this card, but no '
        + 'reply served in THIS run matches it — the writing model is not established — ' + where };
  }
  // A PARTIAL MATCH IS NOT A MATCH. It is named, so a near-miss is visible rather than silently
  // upgraded or silently dropped.
  const partial = served.find(r => (a && norm(r.action) === a) || (d && norm(r.dialogue) === d))
    || (cacheEntry && ((a && norm(cacheEntry.action) === a)
        || (d && norm(cacheEntry.dialogue) === d)) ? cacheEntry : null);
  if (partial) {
    return { provenance: 'UNKNOWN',
      evidence: 'ONE field matches a preview record and the other does not — a partial match does '
        + 'not establish authorship — ' + where };
  }
  return { provenance: 'UNKNOWN',
    evidence: 'no preview reply or cache entry for this card matches the submitted pair ('
      + served.length + ' repl' + (served.length === 1 ? 'y' : 'ies') + ' recorded) — ' + where };
}
const _unmatched = new Set();
const FIXTURES = process.env.SB_FIXTURES ? JSON.parse(fs.readFileSync(process.env.SB_FIXTURES, 'utf8')) : null;
const LIVE = !FIXTURES;
const RUN = '_fs_live_out/run_' + new Date().toISOString().replace(/[:.]/g, '-');
fs.mkdirSync(RUN, { recursive: true });
const LOG = fs.createWriteStream(RUN + '/run.log');
const say = (m) => { const s = String(m); process.stdout.write(s + '\n'); LOG.write(s + '\n'); };
const write = (f, o) => fs.writeFileSync(RUN + '/' + f, typeof o === 'string' ? o : JSON.stringify(o, null, 2));

const ledger = makeSpendLedger(say);
const calls = [];
const cardLog = [];   // every hand dealt, the slot played, and what was actually submitted
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

if (!(CEILING > 0)) {
  console.error('*** REFUSING TO RUN: no ceiling set. Pass SB_CEILING with the approved amount. ***');
  process.exit(4);
}
say('=== FS SEQUENCE — ceiling $' + CEILING.toFixed(2) + (LIVE ? ' — LIVE' : ' — FIXTURES, no provider traffic') + ' ===');
say('Authorized by Roman with an explicit go, ceiling $' + CEILING.toFixed(2) + '.');
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
  // PASS THE FIELDS RESOLUTION NEEDS, not just the two it used to. (Codex 2026-10-05: the helper
  // was repaired but this caller still rebuilt a stripped body, so an _sbModelOverride of
  // grok-4.7 was discarded here and priced as grok-4.3 — refused when the estimator was called
  // directly, allowed through the runner.) The override fields are what decide the effective
  // model on /api/proxy, so they travel with the messages.
  const quote = estimateUsd({
    messages: body.messages || [],
    max_tokens: body.max_tokens,
    model: body.model,
    _sbModelOverride: body._sbModelOverride,
    reasoningEffort: body.reasoningEffort
  }, requested, url);
  const est = quote.estimate;

  // REFUSE A DISPATCH WHOSE COST CANNOT BE BOUNDED. (Codex 2026-10-05.) An unlisted model used to
  // fall to WORST_RATE — the Grok rate — so an expensive fallback was under-reserved and sent.
  // Now the guard resolves the effective model, including each proxy's own default, and says so.
  if (!quote.bounded) {
    halted = true;
    haltReason = 'UNBOUNDED DISPATCH REFUSED — ' + quote.refuseReason
      + '  [endpoint ' + url.replace(/^https?:\/\/[^/]+/, '') + ']';
    say('\n*** REFUSED BEFORE DISPATCH — ' + haltReason + ' ***');
    return route.fulfill({ status: 503, contentType: 'application/json',
      body: JSON.stringify({ error: 'harness refused an unpriceable dispatch' }) });
  }

  // THE IDENTITY THIS REQUEST IS SENT UNDER, frozen here. The reply may arrive after the runner
  // has moved on; it must keep the identity it was ASKED under, not the one in force when it lands.
  const sys0ForIdentity = (body.messages || [])[0]?.content;
  const reqPreviewIdentity = isPreviewPrompt(sys0ForIdentity)
    ? await capturePreviewIdentity(page) : null;

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
    // SAY WHICH MATCHER SERVED WHICH CALL. Two fixtures were being answered by the wrong matcher
    // — the scene planner's contract went to "CONTINUITY ARCHITECT", which is the SCAFFOLD call —
    // and that is invisible unless the mapping is printed.
    try { const h = String((body.messages || [])[0]?.content || '').slice(0, 56).replace(/\s+/g, ' ');
      console.log('  [fixture] ' + (key ? ('"' + key.slice(0, 34) + '"') : 'DEFAULT') + '  <-  ' + h);
    } catch (_) {}
    // NAME WHAT FELL THROUGH. An unmatched prompt silently served '{}', which is how the fate
    // previews ended up as the literal "{}" in the Do field. Log it instead of guessing later.
    // SAVE THE PLANNER REQUEST VERBATIM. Its system prompt carries the roster, the reserved
    // events and the aftermath truths the reply must account for — the things a fixture has to
    // match. Reading them beats guessing at the contract one rejection at a time.
    try {
      const sys0 = String((body.messages || [])[0]?.content || '');
      // THE SCENE PLANNER, not the scaffold architect. "CONTINUITY ARCHITECT" is the SCAFFOLD
      // call; the scene planner is identified by its own JSON schema, and it is the reply that
      // owes the continuation envelope, the aftermath lane and the objective fields.
      if (/"tactical_move"/.test(sys0)) {
        write('scene_planner_request.txt', sys0 + '\n\n===== USER =====\n'
          + String((body.messages || [])[1]?.content || ''));
      }
      if (/CONTINUITY ARCHITECT/.test(sys0)) {
        write('scaffold_request.txt', sys0.slice(0, 2000));
      }
    } catch (_) {}
    if (!key) { try { const head = String((body.messages || [])[0]?.content || '').slice(0, 110).replace(/\s+/g, ' ');
      if (head && !_unmatched.has(head)) { _unmatched.add(head);
        console.log('  [fixture] NO MATCHER — serving default for: ' + head); } } catch (_) {} }
    if (f.delayMs) await new Promise(r => setTimeout(r, f.delayMs));
    if (f.fail) {
      calls.push({ n: calls.length + 1, requested, chars, ms: Date.now() - t0, estimate: est,
        fn: callFunction((body.messages || [])[0]?.content),
      pricedAs: quote.model, resolvedBy: quote.resolvedBy,
        error: 'fixture failure', measured: null });
      inFlight -= est; retained += est;
      outstanding = outstanding.filter(x => x !== resv); persistBudget();
      say('  call ' + calls.length + '  ' + requested + '  FIXTURE FAILURE');
      return route.fulfill({ status: 500, contentType: 'application/json',
        body: JSON.stringify({ error: 'fixture failure' }) });
    }
    const textF = typeof f.body === 'string' ? f.body : JSON.stringify(f.body);
    const recF = { n: calls.length + 1, requested, chars, maxTokens: body.max_tokens || null,
      fn: callFunction((body.messages || [])[0]?.content),
      pricedAs: quote.model, resolvedBy: quote.resolvedBy,
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
    recordPreviewReply(sys0ForIdentity, textF, calls.length + 1, reqPreviewIdentity);
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
    recordPreviewReply(sys0ForIdentity, text, calls.length + 1, reqPreviewIdentity);
  } catch (e) { err = String(e && e.message); }
  const ms = Date.now() - t0;

  const rec = { n: calls.length + 1, requested, chars, maxTokens: body.max_tokens || null,
      fn: callFunction((body.messages || [])[0]?.content),
      pricedAs: quote.model, resolvedBy: quote.resolvedBy,
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
  // THE READER HAS OPTED OUT OF PORTRAITS. Three overlays otherwise stand between the opening
  // and the OAS deck — pcLookModal, its "Skip anyway" confirmation, and liRenderModal — each
  // intercepting pointer events, and the look modal RE-OPENS after every dismissal. These are
  // the product's OWN opt-out flags (_pcLookSkipped is commented in app.js as 'user clicked
  // "skip"'), so this is the state a reader reaches by clicking Skip. Images are blocked anyway.
  const optOutPortraits = () => page.evaluate(() => {
    try { window.state._pcLookSkipped = true; window.state._liRenderSkipped = true; } catch (_) {}
  });
  await optOutPortraits();
  await launchFS(page, def);
  await optOutPortraits();
  // DETERMINISTIC CARD PICKING, shared by the OAS turns AND the scene loop. These were
  // declared inside the OAS block and used again in the scene loop, so scene 2 died on
  // "nextPick is not defined" the moment the OAS handoff finally succeeded — the same class
  // of defect as the deleted waitForHand(). One sequence now covers both phases.
  let pickSeed = 1013904223;
  const nextPick = (n) => { pickSeed = (1664525 * pickSeed + 1013904223) >>> 0; return pickSeed % n; };
  await unlockFS(page, 'fs-live');
  await finalizePreview(page);
  await page.waitForTimeout(4000);
  say('  setup complete · exposure $' + exposure().toFixed(6) + '\n');

  if (!halted) {
    say('── OAS (live) ──');
    await optOutPortraits();
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
    // ── THE OAS DECK IS NOT THE GENERIC DECK ──────────────────────────────────────────────
    // The previous version read state.fateOptions and clicked any .fate-card in the document,
    // via page.evaluate(el.click()). Three things were wrong with that, all of which invalidate
    // the "nine template cards" finding:
    //   · the OAS deck lives in #gnCardMount as .intimacy-dev-fate-card[data-fate-card-slot];
    //   · its handler REJECTS untrusted events outright —
    //       app.js:210592  if (ev && ev.isTrusted === false) ... return;
    //     so a page-evaluated click was never accepted at all;
    //   · an accepted click runs _handleOASFateCardClick, which populates #gnActionInput and
    //     #gnDialogueInput — the preview I should be reading.
    // Playwright's own page.click() dispatches through CDP and IS trusted, so it is used here.
    const MOUNT_NAMES = '#gnCardMount, #cardMount, #intimacyDevCardMount, document';
    const readOasDeck = () => page.evaluate(() => {
      const mount = document.getElementById('gnCardMount');
      // FIND THE DECK WHERE IT ACTUALLY IS, and say which one was used. I guessed this surface
      // three times and was wrong each time: .intimacy-dev-fate-card is the DEV half only
      // (_populateDevFateCardsInGNMount runs solely under devMode); #gnCardMount was empty; a DOM
      // probe found the five cards in #cardMount. Rather than hard-code a fourth guess, the
      // runner now scans the known mounts, takes the one with VISIBLE cards, and records it.
      const MOUNTS = ['gnCardMount', 'cardMount', 'intimacyDevCardMount'];
      let mountId = null, els = [];
      for (const id of MOUNTS) {
        const host = document.getElementById(id);
        if (!host) continue;
        const found = [...host.querySelectorAll('.fate-card')]
          .filter(e => e.offsetParent !== null && !e.classList.contains('locked'));
        if (found.length) { mountId = id; els = found; break; }
      }
      if (!els.length) {
        const loose = [...document.querySelectorAll('.fate-card')]
          .filter(e => e.offsetParent !== null && !e.classList.contains('locked'));
        if (loose.length) { mountId = '(document)'; els = loose; }
      }
      const st = window.state || {};
      const cache = st._grokIntimateFateCards;
      const cacheFresh = !!(cache && cache.turnCount === st.turnCount && cache.cards);
      return {
        mounted: !!mount, mountId: mountId,
        count: els.length,
        revealed: els.filter(e => e.getAttribute('data-revealed') === '1').length,
        cacheFresh,
        cacheIds: cacheFresh ? Object.keys(cache.cards) : [],
        slots: els.map((e, i) => ({ idx: i, slot: e.getAttribute('data-fate-card-slot'),
          revealed: e.getAttribute('data-revealed') === '1' }))
      };
    });

    // Wait for the deck to mount and flip before choosing — the cards reveal on a timer.
    const waitForOasDeck = async (maxMs = 45000) => {
      const dl = Date.now() + maxMs;
      let last = null;
      while (Date.now() < dl) {
        last = await readOasDeck();
        if (last.count > 0 && last.revealed >= last.count) return last;
        await page.waitForTimeout(1000);
      }
      return last;
    };

    let turnsTaken = 0;
    for (let i = 0; i < 9 && !halted; i++) {
      const pre = await oasState();
      if (!pre || !pre.active || pre.resolving) { say('  OAS is no longer accepting input'); break; }
      setPreviewContext('opening OAS', i + 1);
      // Draw the OAS deck, wait for it to settle, and play one with a REAL click.
      const deck = await waitForOasDeck();
      if (!deck || !deck.count) {
        halted = true;
        haltReason = 'the OAS deck never mounted at turn ' + (i + 1)
          + ' (checked ' + MOUNT_NAMES + '; none had visible cards)';
        say('  *** STOPPING — ' + haltReason + ' ***');
        break;
      }
      const slotIdx = nextPick(deck.count);
      const sel = (deck.mountId && deck.mountId !== '(document)')
        ? ('#' + deck.mountId + ' .fate-card:not(.locked)') : '.fate-card:not(.locked)';
      const slotName = (deck.slots[slotIdx] || {}).slot;
      const rejectedBefore = consoleLog.filter(l => /FATE-CLICK\] Rejected/.test(l)).length;
      // CLEAR THE PREVIEW FIRST, so a populated input can only have come from THIS click. The
      // previous version accepted any non-empty value, including last turn's stale text.
      await page.evaluate(() => {
        ['gnActionInput', 'gnDialogueInput'].forEach(id => {
          const el = document.getElementById(id);
          if (el) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
        });
      });
      // A FAILED CLICK IS A FAILURE. Swallowing the exception and carrying on is how a run
      // reports a card as played when nothing happened.
      let clickErr = null;
      await page.locator(sel).nth(slotIdx).click({ timeout: 15000 })
        .catch(e => { clickErr = (e && e.message) || 'click failed'; });
      if (clickErr) {
        halted = true;
        haltReason = 'OAS card click FAILED at turn ' + (i + 1) + ' slot ' + slotIdx
          + ': ' + clickErr;
        say('  *** STOPPING — ' + haltReason + ' ***');
        break;
      }
      // WAIT FOR THE PREVIEW TO POPULATE rather than sleeping a fixed interval.
      let preview = { action: '', dialogue: '' };
      // A USABLE SUGGESTION, NOT MERELY A POPULATED FIELD. (Codex 2026-10-06.) The old wait
      // accepted any non-empty input, so the live run submitted the card's own title —
      // SAY "Confession…" / DO "Confession…" — to the author as the player's words. Revealed
      // cards and non-empty inputs are both insufficient: the deck fills the fields with a
      // placeholder while the preview batch is still in flight.
      const usable = (t, ids) => {
        const v = String(t == null ? '' : t).trim();
        if (!v) return false;
        const bare = v.replace(/[….]+$/, '').trim().toLowerCase();
        if (!bare) return false;
        if (/[….]\s*$/.test(v) && bare.split(/\s+/).length <= 2) return false;  // "Confession…"
        return ids.indexOf(bare) === -1;                                         // a bare card title
      };
      const pvDeadline = Date.now() + 20000;
      while (Date.now() < pvDeadline) {
        preview = await page.evaluate(() => {
          const a = document.getElementById('gnActionInput');
          const d = document.getElementById('gnDialogueInput');
          // THE SELECTED CARD AND THE APP'S CACHE FOR IT, so provenance can be established
          // outside the page against the replies actually served. "An input is populated" was
          // the OAS loop's only test, and it proves nothing about who wrote the text.
          const sel = (window.state.fateOptions || [])[window.state.fateSelectedIndex];
          const cache = window.state._sceneFateCardPreviews || {};
          const grok = window.state._grokIntimateFateCards;
          const gc = (grok && grok.cards && sel) ? grok.cards[sel.id] : null;
          const cc = sel ? cache[sel.id] : null;
          const entry = gc || cc || null;
          return { action: a ? a.value : '', dialogue: d ? d.value : '',
            cardId: sel ? sel.id : null, selectedIndex: window.state.fateSelectedIndex,
            optionIds: (window.state.fateOptions || []).map(o => String(o.id || '')),
            appKey: { turnCount: window.state.turnCount || 0,
              sceneFateKey: window.state._fateOptionsSceneKey || null,
              oasBeat: window.state.intimacyDialogue
                ? (window.state.intimacyDialogue.beatCount ?? null) : null },
            cacheEntry: entry ? { action: entry.action || '', dialogue: entry.dialogue || '' } : null };
        });
        const ids = (preview.optionIds || []).map(x => String(x || '').toLowerCase());
        if (usable(preview.action, ids) || usable(preview.dialogue, ids)) break;
        await page.waitForTimeout(400);
      }
      const rejectedAfter = consoleLog.filter(l => /FATE-CLICK\] Rejected/.test(l)).length;
      if (rejectedAfter > rejectedBefore) {
        halted = true;
        haltReason = 'the OAS handler REJECTED the click at turn ' + (i + 1) + ' (untrusted input)';
        say('  *** STOPPING — ' + haltReason + ' ***');
        break;
      }
      // NEVER SUBMIT A PLACEHOLDER. If no usable suggestion arrives through the production flow,
      // the run STOPS BEFORE THE AUTHOR CALL rather than sending the card title as the reader's
      // words — that wasted a live author dispatch on turn 1 and corrupted the exchange.
      {
        const ids = (preview.optionIds || []).map(x => String(x || '').toLowerCase());
        const okA = usable(preview.action, ids), okD = usable(preview.dialogue, ids);
        if (!okA && !okD) {
          halted = true;
          haltReason = 'no USABLE suggestion arrived for OAS slot "' + slotName + '" at turn '
            + (i + 1) + ' — the fields held only a placeholder ('
            + JSON.stringify(String(preview.action || '').slice(0, 24)) + ' / '
            + JSON.stringify(String(preview.dialogue || '').slice(0, 24))
            + '). STOPPING BEFORE THE AUTHOR CALL rather than submitting the card title as the '
            + 'reader\'s words.';
          say('  *** STOPPING — ' + haltReason + ' ***');
          break;
        }
      }
      if (!((preview.action && preview.action.trim()) || (preview.dialogue && preview.dialogue.trim()))) {
        halted = true;
        haltReason = 'OAS slot "' + slotName + '" populated NO preview at turn ' + (i + 1)
          + ' — the click was accepted but produced nothing to submit';
        say('  *** STOPPING — ' + haltReason + ' ***');
        break;
      }
      const say_ = (preview.dialogue || '').trim();
      const do_ = (preview.action || '').trim();
      const oasProv = classifyPreview(preview.cardId, preview.action, preview.dialogue,
        preview.cacheEntry, { encounter: 'opening OAS', turn: i + 1, app: preview.appKey });
      cardLog.push({ turn: i + 1, deck, chosenIdx: slotIdx, slot: slotName, preview,
        provenance: oasProv, cacheFresh: deck.cacheFresh, cacheIds: deck.cacheIds });
      say('  turn ' + (i + 1) + ' plays OAS slot "' + slotName + '" from ' + deck.mountId
        + ' (trusted click ACCEPTED, '
        + 'preview populated)  grokCache=' + (deck.cacheFresh ? deck.cacheIds.length + ' ids' : 'empty'));
      say('      provenance: ' + oasProv.provenance + ' — ' + oasProv.evidence);
      say('      SAY ' + JSON.stringify(say_.slice(0, 80)));
      say('      DO  ' + JSON.stringify(do_.slice(0, 80)));

      // SUBMIT THROUGH THE READER'S OWN CONTROL. #gnSubmitBtn is what a reader presses, and
      // the log confirms it routes here ("[STAGED:SUBMIT] Routed to intimacy dialogue turn
      // handler"). Calling the internal handler skipped whatever the button does first.
      let submitErr = null;
      await page.locator('#gnSubmitBtn').click({ timeout: 15000 })
        .catch(e => { submitErr = (e && e.message) || 'submit failed'; });
      if (submitErr) {
        halted = true;
        haltReason = 'the reader submit control failed at turn ' + (i + 1) + ': ' + submitErr;
        say('  *** STOPPING — ' + haltReason + ' ***');
        break;
      }

      // ── THE SUPPORTED READER EXIT ────────────────────────────────────────────────────────
      // Production offers an EXIT RAMP at beats 6/13/17 — the log says "Exit ramp offered at
      // beat 6" — rendered as a "Drift to afterglow" control inside #intimacyStatus
      // (app.js:205906). The previous version watched only #intimacyExitModal, a DIFFERENT
      // affordance, then waited nine turns for a resolution nobody had asked for. Taking the
      // offered ramp is the supported way out, so it is taken when offered.
      const exitAffordances = async () => page.evaluate(() => {
        const status = document.getElementById('intimacyStatus');
        const drift = status ? [...status.querySelectorAll('button,a,[role=button]')]
          .find(b => /drift|afterglow/i.test(b.innerText || '')) : null;
        const modal = document.getElementById('intimacyExitModal');
        return { driftOffered: !!(drift && drift.offsetParent !== null),
          driftText: drift ? (drift.innerText || '').trim().slice(0, 40) : null,
          modalUp: !!(modal && modal.offsetParent !== null) };
      });
      // TAKING AN EXIT IS AN OBSERVED OUTCOME, NOT AN ATTEMPTED ONE. The previous version
      // logged "TAKEN" after catching the click's failure, and when an exit appeared DURING the
      // reply wait it merely broke the loop — the next iteration then played another card at a
      // dialogue that was trying to end.
      const takeExit = async (why) => {
        // NEVER DRIFT TO AFTERGLOW IN AN AUTHORED-INTERRUPTION OPENING. First Sacrifice's opening
        // is a public interrogation the story ends with the Dohkar cutting it off; afterglow
        // would end it as though it had been sex and skip the interruption the run-or-remain
        // decision depends on. Production now suppresses the offer too — this is the harness
        // following the same rule rather than relying on it.
        const authored = await page.evaluate(() =>
          (typeof window._oasEndsInAuthoredInterruption === 'function')
            ? !!window._oasEndsInAuthoredInterruption() : false);
        if (authored) return { taken: false, why: 'authored interruption — no afterglow exit' };
        const aff = await exitAffordances();
        if (!aff.driftOffered && !aff.modalUp) return { taken: false, why: 'none offered' };
        let err = null;
        if (aff.driftOffered) {
          await page.locator('#intimacyStatus button, #intimacyStatus a, #intimacyStatus [role=button]')
            .filter({ hasText: /drift|afterglow/i }).first().click({ timeout: 10000 })
            .catch(e => { err = (e && e.message) || 'click failed'; });
        } else {
          await page.locator('#intimacyExitFade').click({ timeout: 10000 })
            .catch(e => { err = (e && e.message) || 'click failed'; });
        }
        if (err) return { taken: false, why: 'click failed: ' + err };
        // VERIFY PRODUCTION STATE, not that a click was dispatched.
        const dl = Date.now() + 45000;
        while (Date.now() < dl) {
          const st = await page.evaluate(() => {
            const d = window.state.intimacyDialogue;
            return { active: !!(d && d.active), resolving: !!(d && d._resolving),
              archive: Object.keys(window.state._oasSceneSnapshots || {}).length };
          });
          if (!st.active || st.archive > 0) return { taken: true, state: st, via: why };
          await page.waitForTimeout(1500);
        }
        return { taken: false, why: 'clicked but the dialogue never left the active state' };
      };

      let exited = false;
      {
        const r = await takeExit('offered before this turn');
        if (r.taken) {
          say('  turn ' + (i + 1) + ': EXIT TAKEN and CONFIRMED — dialogue left the active state');
          exited = true;
        } else if (r.why !== 'none offered' && !/authored interruption/.test(r.why)) {
          halted = true;
          haltReason = 'an exit was offered at turn ' + (i + 1) + ' but could not be completed: ' + r.why;
          say('  *** STOPPING — ' + haltReason + ' ***');
          break;
        }
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
        const midAff = await exitAffordances();
        if (midAff.driftOffered || midAff.modalUp) {
          const r2 = await takeExit('appeared during the reply wait');
          if (r2.taken) {
            say('  turn ' + (i + 1) + ': exit appeared mid-wait, TAKEN and CONFIRMED');
            landed = true; exited = true; break;
          }
          if (/authored interruption/.test(r2.why)) { landed = true; break; }
          halted = true;
          haltReason = 'an exit appeared mid-wait at turn ' + (i + 1) + ' but could not be '
            + 'completed: ' + r2.why;
          say('  *** STOPPING — ' + haltReason + ' ***');
          landed = true; break;
        }
        await page.waitForTimeout(1500);
      }
      const post = await oasState();
      turnsTaken++;
      say('  turn ' + (i + 1) + ': replies ' + pre.replies + ' -> '
        + (post ? post.replies : 'ended') + ' (beats ' + pre.beats + ' -> '
        + (post ? post.beats : '-') + ')'
        + (landed ? '' : '  *** NO REPLY LANDED WITHIN 180s ***'));
      if (exited) { say('  OAS exited at turn ' + (i + 1) + '; no further dialogue turns.'); turnsTaken++; break; }
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
    // ── SERVICE THE RUN-OR-REMAIN PROMPT IMMEDIATELY ──────────────────────────────────────
    // (Codex 2026-10-05.) This is what triggers Scene 2. Previously the runner only OBSERVED
    // the decision and then went looking for a Fate deck — and the deck it found was the
    // LINGERING INTERRUPTION DECK, whose handler returns at once while rec.submitted is true
    // (app.js:208194), so the click filled nothing. That empty preview was the symptom; the
    // unserviced decision was the cause. No card is drawn here.
    const readDecision = () => page.evaluate(() => {
      const prompt = document.getElementById('sceneDecisionPrompt');
      const btn = (id) => { const b = document.getElementById(id); return b ? {
        label: b.textContent, key: b.getAttribute('data-choice') } : null; };
      return {
        needed: (typeof window._sceneDecisionNeeded === 'function') ? !!window._sceneDecisionNeeded() : null,
        promptMounted: !!prompt,
        a: btn('sceneDecisionA'), b: btn('sceneDecisionB'),
        recorded: ((window.state._sceneDecisions || {})['1'] || null)
      };
    });
    let decision = await readDecision();
    say('  axis decision (before servicing): ' + JSON.stringify({ needed: decision.needed,
      promptMounted: decision.promptMounted, recorded: decision.recorded && decision.recorded.choice }));

    if (decision.needed && decision.promptMounted) {
      // THE OPENING BRANCH IS A TEST PARAMETER, NOT A CONVENIENCE. An earlier run took "run";
      // this runner had started preferring "remain", which is a DIFFERENT test condition and must
      // never be presented as a directly comparable continuation. SB_OPENING_BRANCH names it
      // explicitly (default "run", the branch the earlier runs used), it is recorded in the run
      // artefacts, and a branch is NEVER chosen to suit a fixture.
      const wantKey = (process.env.SB_OPENING_BRANCH || 'run').toLowerCase();
      const matches = (b) => b && (String(b.key || '').toLowerCase() === wantKey
        || new RegExp(wantKey, 'i').test(String(b.label || '')));
      let want = matches(decision.a) ? 'sceneDecisionA'
        : matches(decision.b) ? 'sceneDecisionB' : null;
      if (!want) {
        halted = true;
        haltReason = 'the requested opening branch "' + wantKey + '" is not one the prompt offers'
          + ' (a=' + JSON.stringify(decision.a) + ' b=' + JSON.stringify(decision.b) + ')';
        say('  *** STOPPING — ' + haltReason + ' ***');
      }
      openingBranch = { requested: wantKey, control: want };
      const chosen = (want === 'sceneDecisionB') ? decision.b : decision.a;
      say('  opening branch (SB_OPENING_BRANCH=' + openingBranch.requested + '): "'
        + (chosen && chosen.label) + '" (key=' + (chosen && chosen.key) + ')');
      let decErr = want ? null : 'no matching branch control';
      if (want) {
        await page.locator('#' + want).click({ timeout: 15000 })
          .catch(e => { decErr = (e && e.message) || 'click failed'; });
      }
      if (decErr) {
        halted = true;
        haltReason = 'the run-or-remain prompt could not be serviced: ' + decErr;
        say('  *** STOPPING — ' + haltReason + ' ***');
      } else {
        const dl = Date.now() + 30000;
        while (Date.now() < dl) {
          decision = await readDecision();
          if (!decision.needed && decision.recorded) break;
          await page.waitForTimeout(1000);
        }
        const authoredKeys = [decision.a && decision.a.key, decision.b && decision.b.key]
          .filter(Boolean);
        const rec = decision.recorded || {};
        say('  recorded choice: ' + JSON.stringify({ choice: rec.choice, label: rec.label,
          source: rec.source }) + '  decisionNeeded=' + decision.needed);
        // CONFIRM IT MATCHES AN AUTHORED BRANCH and that the gate actually closed.
        if (decision.needed !== false) {
          halted = true;
          haltReason = 'the decision was recorded but decisionNeeded never became false';
          say('  *** STOPPING — ' + haltReason + ' ***');
        } else if (!rec.choice) {
          halted = true;
          haltReason = 'no choice was recorded after servicing the prompt';
          say('  *** STOPPING — ' + haltReason + ' ***');
        } else {
          say('  the choice matches an authored branch: '
            + (authoredKeys.length ? authoredKeys.indexOf(rec.choice) !== -1 : 'prompt gone (keys unavailable)'));
        }
      }
    } else if (decision.recorded && decision.needed === false) {
      say('  the decision was already recorded at interruption submit ("'
        + decision.recorded.choice + '") and the gate is closed — nothing to service');
    }

    // ── SCENE 2'S ACCEPTED IDENTITY, CAPTURED WHERE IT IS CREATED ─────────────────────────
    // (Codex 2026-10-05.) Servicing the opening branch is what GENERATES Scene 2 — not the first
    // pass of the scene loop. The loop's first snapshot therefore jumped "0 -> 2" and every label
    // after it was off by one: the pass that read Scene 2 and played its ending card created
    // Scene 3, while reporting "Scene 2 accepted". Scene 2 is recorded HERE, against the step
    // that actually produced it.
    if (!halted) {
      const dl2 = Date.now() + 240000;
      let quiet2 = 0;
      while (Date.now() < dl2) {
        scene2 = await page.evaluate(() => {
          const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
          const last = cg.length ? cg[cg.length - 1] : null;
          return { cgScenes: cg.length, uid: last && last.uid,
            hasProjection: !!(last && last.projection && last.text),
            chars: last && last.text ? String(last.text).length : 0,
            notes: Object.keys((window.state._historyNotes || {})).length };
        });
        if (scene2.cgScenes >= 1 && scene2.hasProjection) break;
        if (quiet2 > 45 && inFlight === 0) break;   // ~90s with no dispatch and no scene
        quiet2 = (inFlight === 0) ? quiet2 + 1 : 0;
        await page.waitForTimeout(2000);
      }
      sceneLedger.push({ sceneNumber: 2, createdBy: 'opening branch "' + openingBranch.requested + '"',
        uid: scene2.uid, accepted: !!(scene2.cgScenes >= 1 && scene2.hasProjection),
        chars: scene2.chars, notesAfter: scene2.notes });
      say('  SCENE 2 created by the opening branch: ' + (scene2.hasProjection ? 'ACCEPTED' : 'NOT ACCEPTED')
        + ' · uid=' + String(scene2.uid).slice(0, 18) + ' · ' + scene2.chars + ' chars'
        + ' · cgScenes=' + scene2.cgScenes + ' · notes=' + scene2.notes);
      if (!scene2.hasProjection) {
        halted = true;
        haltReason = 'the opening branch did not produce an accepted Scene 2 ('
          + JSON.stringify(scene2) + ')';
        say('  *** STOPPING — ' + haltReason + ' ***');
      }
    }

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

  // ── EACH PASS LEAVES ONE SCENE AND CREATES THE NEXT ─────────────────────────────────────
  // (Codex 2026-10-05.) `leaving` is the scene already on screen, whose beats are walked and
  // whose ending card is played; `creating` is the scene that card produces. The old loop used a
  // single counter for both, so the pass that read Scene 2 reported "Scene 2 accepted" while it
  // had actually created Scene 3 — and at the end it waited for a Scene 11 that the issue does
  // not contain. Scene 2 is already recorded above, by the step that created it, so the first
  // pass here leaves 2 and creates 3. The last pass leaves 9 and creates 10; there is no pass
  // that leaves 10, because the issue ends there.
  const LAST_SCENE = 10;
  for (let leaving = 2; leaving <= LAST_SCENE - 1 && !halted; leaving++) {
    const creating = leaving + 1;
    const scene = leaving;   // the surface being read: deck, beats and card all belong to it
    setPreviewContext('scene ' + leaving + ' end', leaving);
    say('── LEAVING SCENE ' + leaving + ' -> CREATING SCENE ' + creating + ' (live) ──');

    // CAPTURE THE PRE-GENERATION IDENTITY *BEFORE* ANYTHING IS TRIGGERED. Reading the count
    // after the advance races the thing being measured.
    const before = await page.evaluate(() => {
      const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
      return { count: cg.length, lastUid: cg.length ? cg[cg.length - 1].uid : null };
    });

    // THE SCENE'S OWN FATE CARDS — a SEPARATE surface from the OAS deck, and a separate
    // helper. The scene loop was still calling waitForHand(), which no longer exists: once the
    // OAS handoff succeeded, scene 2 would have died on a ReferenceError (Codex 2026-10-05).
    const readSceneDeck = () => page.evaluate(() => {
      // SCENE CARDS ARE ON THE ACTIVE READER, WHICH IS #gnCardMount HERE. I originally excluded
      // that mount to avoid mistaking OAS cards for scene cards — but on a staged Book the
      // staged reader IS gnReader, so its scene deck lands in the same mount the OAS used. By
      // this point the OAS has resolved and archived, so there is no ambiguity left to avoid.
      const mount = (typeof window._activeCardMount === 'function')
        ? window._activeCardMount() : document.getElementById('cardMount');
      // ONLY PLAYABLE CARDS. The deck greys out the cards past the unlock count, and clicking a
      // locked one does nothing — which is how scene 2 clicked card 3 and populated no preview.
      // A reader cannot play a locked card, so neither does the runner.
      const visible = mount
        ? [...mount.querySelectorAll('.fate-card')].filter(e => e.offsetParent !== null)
        : [];
      const els = visible.filter(e => !e.classList.contains('locked'));
      return { count: els.length, lockedOut: visible.length - els.length,
        mountId: mount && mount.id,
        inOAS: !!(window.state.intimacyDialogue && window.state.intimacyDialogue.active),
        // REPORT THE COMMIT STATE. A hand left committed from the last OAS turn ignores every
        // further click and populates nothing, which is exactly how turn 2 failed inside the OAS.
        fateCommitted: window.state.fateCommitted,
        fateSelectedIndex: window.state.fateSelectedIndex,
        sceneKey: window.state._fateOptionsSceneKey,
        // NO PREVIEW CALL FIRES AT ALL at the scene boundary, which points at a CACHE HIT
        // serving an empty entry. _cacheFateCardPreview writes (action || ''), and the cache is
        // keyed by turn — the OAS turns share that key — so an empty entry would be served
        // forever for this scene. Report the cache rather than infer it.
        // Were these dealt fresh, or are they the OAS hand still on screen?
        fromOasHand: visible.filter(e => e.getAttribute('data-oas-hand') === '1').length,
        previewCache: (function () {
          try {
            const c = window.state._sceneFateCardPreviews || {};
            const out = { _cacheKey: c._cacheKey };
            Object.keys(c).forEach(k => { if (k === '_cacheKey') return;
              out[k] = { a: (c[k].action || '').length, d: (c[k].dialogue || '').length }; });
            return out;
          } catch (_) { return null; }
        })(),
        labels: els.map(e => (e.getAttribute('data-fate-card-slot')
          || (e.innerText || '').trim().split('\n')[0] || '').slice(0, 30)) };
    });
    const waitForSceneDeck = async (maxMs = 45000) => {
      const dl = Date.now() + maxMs;
      let last = null;
      while (Date.now() < dl) {
        last = await readSceneDeck();
        if (last.count > 0) return last;
        await page.waitForTimeout(1000);
      }
      return last;
    };
    // ── THE SCENE MUST HAVE RENDERED BEFORE ANY CARD IS DRAWN ─────────────────────────────
    // (Codex 2026-10-05.) Ordinary scene-end card selection begins only after this scene has
    // rendered and its own decision gate is open. Drawing earlier meant drawing from the
    // lingering interruption deck, which ignores clicks once rec.submitted is true.
    const sceneRendered = async (maxMs = 180000) => {
      const dl = Date.now() + maxMs;
      let last = null;
      while (Date.now() < dl) {
        last = await page.evaluate((n) => {
          const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
          const intr = window.state._intimateInterruption;
          return { cgScenes: cg.length,
            // the interruption deck must be GONE or inert before its cards could be mistaken
            // for a scene deck
            interruptionLive: !!(intr && !intr.submitted),
            mounted: !!document.getElementById('stagedBeatText')
              || !!(window.state._stagedActive && window.state._stagedActive.plan),
            hasProjection: !!(cg.length && cg[cg.length - 1].projection && cg[cg.length - 1].text) };
        }, scene);
        if (last.cgScenes >= (scene - 1) && last.mounted && last.hasProjection) return last;
        await page.waitForTimeout(2000);
      }
      return last;
    };
    const rendered = await sceneRendered();
    say('  scene ' + scene + ' render state: ' + JSON.stringify(rendered));
    if (!rendered || !rendered.mounted || !rendered.hasProjection) {
      halted = true;
      haltReason = 'scene ' + scene + ' never rendered, so no scene-end deck could be offered'
        + ' (' + JSON.stringify(rendered) + ')';
      say('  *** STOPPING — ' + haltReason + ' ***');
      break;
    }
    // ── WALK THE SCENE'S BEATS TO ITS END ─────────────────────────────────────────────────
    // A staged scene is READ beat by beat; the scene-end Fate deck and its decision gate only
    // open once the reader reaches the last beat. Clicking #stagedNextBtn is what a reader does,
    // and until it is done there is no scene-end deck to offer — which is what "no scene Fate
    // cards were offered" meant, with the scene itself rendered and mounted.
    let beatSteps = 0;
    // WAIT FOR THE WALK TO BE POSSIBLE. Scene 3 rendered, then the loop broke on its first pass
    // because #stagedNextBtn had not mounted yet — "walked 0 beat(s)" and no deck. Poll briefly
    // for either the advance control or the deck before deciding there is nothing to walk.
    {
      const dl0 = Date.now() + 30000;
      while (Date.now() < dl0) {
        const r0 = await page.evaluate(() => {
          const btn = document.getElementById('stagedNextBtn');
          const m = (typeof window._activeCardMount === 'function') ? window._activeCardMount() : null;
          return { ready: !!(btn && btn.offsetParent !== null && !btn.disabled),
            cards: m ? [...m.querySelectorAll('.fate-card')].filter(e => e.offsetParent !== null).length : 0 };
        });
        if (r0.ready || r0.cards > 0) break;
        await page.waitForTimeout(1000);
      }
    }
    for (let b = 0; b < 40; b++) {
      const st = await page.evaluate(() => {
        const btn = document.getElementById('stagedNextBtn');
        const mount = (typeof window._activeCardMount === 'function') ? window._activeCardMount() : null;
        return {
          nextVisible: !!(btn && btn.offsetParent !== null && !btn.disabled),
          cards: mount ? [...mount.querySelectorAll('.fate-card')]
            .filter(e => e.offsetParent !== null).length : 0,
          beatIdx: (window.state._stagedActive && window.state._stagedActive.beatIdx) ?? null
        };
      });
      if (st.cards > 0) break;
      if (!st.nextVisible) break;
      await page.locator('#stagedNextBtn').click({ timeout: 10000 }).catch(() => {});
      beatSteps++;
      await page.waitForTimeout(900);
    }
    say('  walked ' + beatSteps + ' beat(s) to the end of scene ' + scene);
    const sDeck = await waitForSceneDeck();
    if (!sDeck || !sDeck.count) {
      halted = true;
      haltReason = 'no scene Fate cards were offered at scene ' + scene;
      say('  *** STOPPING — ' + haltReason + ' ***');
      break;
    }
    const sIdx = nextPick(sDeck.count);
    await page.evaluate(() => {
      ['gnActionInput', 'gnDialogueInput', 'actionInput', 'dialogueInput'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.value = ''; el.dispatchEvent(new Event('input', { bubbles: true })); }
      });
    });
    let sClickErr = null;
    // SCOPE THE CLICK TO THE READER THE CARDS ARE ON. A bare '.fate-card' resolved nth() across
    // the whole document and picked a card inside the HIDDEN #cardMount, so the click waited
    // 15s on an invisible element. readSceneDeck() reports which mount it counted; click there.
    const sSel = (sDeck && sDeck.mountId)
      ? ('#' + sDeck.mountId + ' .fate-card:not(.locked)') : '.fate-card:not(.locked)';
    await page.locator(sSel).nth(sIdx).click({ timeout: 15000 })
      .catch(e => { sClickErr = (e && e.message) || 'click failed'; });
    if (sClickErr) {
      halted = true;
      haltReason = 'scene ' + scene + ' card click FAILED: ' + sClickErr;
      say('  *** STOPPING — ' + haltReason + ' ***');
      break;
    }
    let sSub = { action: '', dialogue: '' };
    // PREVIEW READINESS, carried over from the interaction control. A card clicked before the
    // preview batch returns submits the template placeholder; waiting for a real preview makes
    // the evaluation measure the product rather than a race. If it never arrives the run goes on
    // and the fallback is RECORDED, not hidden.
    {
      const rDl = Date.now() + 25000;
      while (Date.now() < rDl) {
        const r = await page.evaluate(() => {
          const v = (id) => { const e = document.getElementById(id); return e ? (e.value || '') : ''; };
          const t = (v('gnActionInput') + ' ' + v('gnDialogueInput')).trim()
            || (v('actionInput') + ' ' + v('dialogueInput')).trim();
          return { filled: !!t, template: /…\s*$/.test(t) };
        });
        if (r.filled && !r.template) break;
        await page.waitForTimeout(700);
      }
    }
    const sDl = Date.now() + 20000;
    while (Date.now() < sDl) {
      sSub = await page.evaluate(() => {
        // READ BOTH READERS. "gnActionInput || actionInput" picked the gn element merely because
        // it EXISTS, so an empty gn field masked text that had been written to the literary
        // inputs — the fallback could never fire. Take whichever actually holds the suggestion,
        // and say which one it came from.
        const val = (id) => { const e = document.getElementById(id); return e ? (e.value || '') : ''; };
        const gnA = val('gnActionInput'), gnD = val('gnDialogueInput');
        const litA = val('actionInput'), litD = val('dialogueInput');
        const gnHas = !!(gnA.trim() || gnD.trim());
        const action = gnHas ? gnA : litA, dialogue = gnHas ? gnD : litD;
        // WHICH CARD, AND WHAT THE APP HAS CACHED FOR IT. Classification happens OUTSIDE the
        // page, against the preview replies the runner actually served — the page cannot know
        // what was on the wire, and wording cannot establish authorship.
        const cache = window.state._sceneFateCardPreviews || {};
        const sel = (window.state.fateOptions || [])[window.state.fateSelectedIndex];
        const cached = sel ? cache[sel.id] : null;
        return { action: action, dialogue: dialogue,
          source: gnHas ? 'gn' : ((litA.trim() || litD.trim()) ? 'literary(HIDDEN)' : 'neither'),
          cardId: sel ? sel.id : null,
          selectedIndex: window.state.fateSelectedIndex,
          appKey: { turnCount: window.state.turnCount || 0,
            sceneFateKey: window.state._fateOptionsSceneKey || null,
            oasBeat: window.state.intimacyDialogue
              ? (window.state.intimacyDialogue.beatCount ?? null) : null },
          cacheEntry: cached ? { action: cached.action || '', dialogue: cached.dialogue || '' } : null,
          gn: { a: gnA.length, d: gnD.length }, lit: { a: litA.length, d: litD.length } };
      });
      if ((sSub.action && sSub.action.trim()) || (sSub.dialogue && sSub.dialogue.trim())) break;
      await page.waitForTimeout(400);
    }
    const prov = classifyPreview(sSub.cardId, sSub.action, sSub.dialogue, sSub.cacheEntry,
      { encounter: 'scene ' + leaving + ' end', turn: leaving, app: sSub.appKey });
    sSub.origin = prov.provenance;
    sSub.evidence = prov.evidence;
    cardLog.push({ scene, deck: sDeck, chosenIdx: sIdx, submitted: sSub, provenance: prov });
    say('  scene ' + scene + ' plays card ' + sIdx + ' "' + (sDeck.labels[sIdx] || '?') + '"'
      + ' from ' + sDeck.mountId + ' [preview: ' + sSub.origin + ']' + ' (playable=' + sDeck.count
      + ' locked=' + sDeck.lockedOut + ' committed=' + sDeck.fateCommitted
      + ' sel=' + sDeck.fateSelectedIndex + ' key=' + sDeck.sceneKey + ')'
      + ' via ' + sSub.source
      + (((sSub.action || '') + (sSub.dialogue || '')).trim() ? '' : ' [NO PREVIEW POPULATED]'));
    say('      provenance: ' + sSub.origin + ' — ' + sSub.evidence);
    if (!((sSub.action || '') + (sSub.dialogue || '')).trim()) {
      say('    preview cache: ' + JSON.stringify(sDeck.previewCache));
      say('    option ids   : ' + JSON.stringify(sDeck.labels));
      say('    cards still from the OAS hand: ' + sDeck.fromOasHand + ' of ' + sDeck.count);
      // THE PAGE'S OWN ACCOUNT of the click. Four hypotheses about this failure were wrong
      // (locked card, committed hand, stale OAS elements, text written to the hidden reader), so
      // read what the app actually logged instead of forming a fifth.
      const tail = consoleLog.slice(-40).filter(l =>
        /FATE|INTIMACY|fate|card|preview|Error|error|throw/.test(l));
      say('    page console (last ' + tail.length + ' relevant lines):');
      tail.slice(-14).forEach(l => say('      | ' + String(l).slice(0, 150)));
    }

    const g = await advanceExpectingGate(page, sSub.action || '', sSub.dialogue || '');
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
    sceneLedger.push({ sceneNumber: creating, createdBy: 'the ending card of scene ' + leaving,
      cardFrom: leaving, cardIdx: sIdx, cardLabel: (sDeck.labels[sIdx] || null),
      previewSource: sSub.source, previewOrigin: sSub.origin || null,
      accepted: outcome === 'accepted', notesAfter: snap.notes.length,
      cgScenesAfter: snap.scenes });
    write('scene' + creating + '.json', { outcome, creating, leaving, before, snap,
      openingBranch,
      cards: cardLog.filter(c => c.scene === scene) });
    say('  SCENE ' + creating + ' ' + outcome.toUpperCase() + ' (card played in scene ' + leaving
      + ') · cg scenes ' + before.count + ' -> ' + snap.scenes
      + ' · notes ' + snap.notes.length + ' · exposure $' + exposure().toFixed(6));
    if (outcome !== 'accepted') {
      halted = true;
      haltReason = 'scene ' + creating + ' did not complete (' + outcome + ')';
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

  // ── THE ISSUE ENDS AT SCENE 10 — VERIFY IT, DO NOT ASK FOR AN ELEVENTH ──────────────────
  // (Codex 2026-10-05.) The old loop played a card in Scene 10 and then waited for a Scene 11
  // the issue does not contain, reporting "no-generation" for a product that had correctly
  // reached its boundary. The final error is not suppressed: Scene 10's own projection and the
  // production issue-ending state are CHECKED, and a failure of either is still a failure.
  if (!halted) {
    const endState = await page.evaluate((last) => {
      const cg = (window.state.scenes || []).filter(x => x && String(x.uid).startsWith('cg:'));
      const tenth = cg[cg.length - 1] || null;
      const st = window.state;
      return {
        cgScenes: cg.length,
        tenthUid: tenth && tenth.uid,
        tenthAccepted: !!(tenth && tenth.projection && tenth.text),
        tenthChars: tenth && tenth.text ? String(tenth.text).length : 0,
        // THE PRODUCTION ISSUE-ENDING STATE, read from the app's OWN helpers. My first attempt
        // guessed at _issueComplete / _issuePosition, which do not exist and returned
        // null/false — so I could not have claimed this was verified. The real signals are
        // _getSceneInIssue() (1..scenesPerIssue, resetting at each boundary) and the issue's
        // planned length from ISSUE_PRICING: the issue has ENDED when the position has wrapped
        // back to the start, or equals the planned length with no further scene pending.
        sceneInIssue: (typeof window._getSceneInIssue === 'function') ? window._getSceneInIssue() : null,
        // PRODUCTION'S OWN PREDICATE — the one that drives the issue-boundary Submit swap.
        isLastSceneOfIssue: (typeof window._isLastSceneOfIssue === 'function')
          ? !!window._isLastSceneOfIssue() : null,
        scenesPerIssue: (function () {
          try { return (window.ISSUE_PRICING || {})[window.state._storyMode === 'literary'
            ? 'literary' : 'cg'].scenesPerIssue; } catch (_) { return null; }
        })(),
        turnCount: st.turnCount || null,
        decisionNeeded: (typeof window._sceneDecisionNeeded === 'function')
          ? !!window._sceneDecisionNeeded() : null,
        nextGateOpen: !!(window.state._stagedActive && window.state._stagedActive.plan),
        notes: Object.keys(window.state._historyNotes || {}).length
      };
    }, LAST_SCENE);
    say('');
    say('── ISSUE BOUNDARY ──');
    say('  scene 10 accepted projection: ' + endState.tenthAccepted
      + ' · ' + endState.tenthChars + ' chars · uid=' + String(endState.tenthUid).slice(0, 18));
    say('  cg scenes: ' + endState.cgScenes + ' · history notes: ' + endState.notes);
    say('  production issue state: scene ' + endState.sceneInIssue + ' of '
      + endState.scenesPerIssue + ' (turnCount ' + endState.turnCount + ')'
      + ' · decisionNeeded=' + endState.decisionNeeded
      + ' · nextGateOpen=' + endState.nextGateOpen);
    boundaryCheck = { sceneNumber: LAST_SCENE, accepted: endState.tenthAccepted,
      chars: endState.tenthChars, uid: endState.tenthUid,
      sceneInIssue: endState.sceneInIssue, scenesPerIssue: endState.scenesPerIssue,
      turnCount: endState.turnCount };
    write('issue_boundary.json', endState);
    // ── TWO SEPARATE CLAIMS, ASSERTED SEPARATELY ─────────────────────────────────────────
    // (Codex 2026-10-05.) The previous version printed "ISSUE COMPLETE" after checking only that
    // a projection existed and that there were at least nine records. It COLLECTED the production
    // boundary values and never tested them, so a counter disagreement could not fail anything.
    //
    // CLAIM A — THE REQUESTED CORPUS: ten story scenes, the FIXED opening plus generated 2-10.
    //           This is the test scope and is entirely within the runner's knowledge.
    // CLAIM B — THE PRODUCTION ISSUE BOUNDARY: the app's own counter agrees the issue is done.
    //           This is the app's claim, and it is asserted, not merely logged.
    const corpusOk = endState.tenthAccepted && endState.cgScenes === 9;
    // The fixed opening is story scene 1 and generates nothing, so a complete ten-scene issue
    // leaves nine generated records. Production's own position must therefore read
    // scenesPerIssue - 1 if (and only if) its counter excludes the opening the same way.
    // THE PRODUCTION PREDICATE, NOT A TOLERANT RANGE. (Codex 2026-10-05.) Accepting 9 OR 10 made
    // the test tolerate the counter defect instead of demonstrating a correct boundary.
    // Production's own predicate is _isLastSceneOfIssue(): _getSceneInIssue() === scenesPerIssue.
    // Nothing else passes.
    const boundaryOk = (endState.isLastSceneOfIssue === true);
    const boundaryAgrees = boundaryOk;
    const expectedPos = endState.scenesPerIssue;

    say('  CLAIM A — requested ten-scene corpus (fixed opening + generated 2-10): '
      + (corpusOk ? 'GENERATED' : 'NOT GENERATED')
      + '  (' + endState.cgScenes + ' generated records, scene ' + LAST_SCENE
      + ' projection ' + (endState.tenthAccepted ? 'accepted' : 'MISSING') + ')');
    say('  CLAIM B — production recognizes issue completion: ' + (boundaryOk ? 'YES' : 'NO')
      + '  (_isLastSceneOfIssue()=' + endState.isLastSceneOfIssue
      + '; position ' + endState.sceneInIssue + ' of ' + endState.scenesPerIssue
      + ' — production requires exactly ' + expectedPos + ')');

    if (!corpusOk) {
      halted = true;
      haltReason = 'the requested ten-scene corpus was not generated: '
        + endState.cgScenes + ' generated records (expected 9), scene ' + LAST_SCENE
        + ' projection ' + (endState.tenthAccepted ? 'accepted' : 'MISSING');
      say('  *** FAILED — ' + haltReason + ' ***');
    } else if (!boundaryOk) {
      // A COUNTER DISAGREEMENT IS A FAILURE, not a footnote. It is reported as a counter problem
      // rather than as grounds to generate an extra scene.
      halted = true;
      haltReason = 'the ten-scene corpus is complete but PRODUCTION DOES NOT RECOGNIZE ISSUE '
        + 'COMPLETION: _isLastSceneOfIssue()=' + endState.isLastSceneOfIssue + ' at position '
        + endState.sceneInIssue + ' of ' + endState.scenesPerIssue + '. This is the counter '
        + 'defect, NOT grounds to generate an eleventh scene.';
      say('  *** FAILED — ' + haltReason + ' ***');
    }
    boundaryCheck.corpusOk = corpusOk;
    boundaryCheck.boundaryOk = boundaryOk;
    boundaryCheck.boundaryAgrees = boundaryAgrees;
    boundaryCheck.expectedPosition = expectedPos;
  }

  write('scene_ledger.json', { openingBranch, scenes: sceneLedger, boundaryCheck });
  say('');
  say('── SCENE LEDGER (each scene against the step that created it) ──');
  if (boundaryCheck) say('  (boundary check: scene ' + boundaryCheck.sceneNumber + ' projection '
    + (boundaryCheck.accepted ? 'accepted' : 'MISSING') + ', ' + boundaryCheck.chars + ' chars, '
    + 'production position ' + boundaryCheck.sceneInIssue + '/' + boundaryCheck.scenesPerIssue + ')');
  sceneLedger.forEach(r => say('  scene ' + r.sceneNumber + '  '
    + (r.accepted ? 'accepted' : 'NOT accepted') + '  <- ' + (r.createdBy || 'verified at boundary')
    + (r.previewSource ? '  [preview: ' + r.previewSource
        + (r.previewOrigin ? '/' + r.previewOrigin : '') + ']' : '')));
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
  // OUTSTANDING RESERVATIONS SURVIVE FINALIZATION. The previous version dropped them, which
  // reported $0.555713 when the run's own roll-up said $0.576715 — $0.021002 of exposure
  // forgiven by the save itself. They are carried as unresolved, not erased, and the file is
  // the SELECTED one so a fixture run cannot write the real ledger (Codex 2026-10-05).
  const stillOut = outstanding.reduce((n, x) => n + (x.estimate || 0), 0);
  const next = { receipted: (PRIOR.receipted || 0) + settled,
    unresolved: (PRIOR.unresolved || 0) + retained + stillOut,
    outstanding: [],
    runs: (PRIOR.runs || []).concat([{ run: RUN, receipted: settled,
      unresolved: retained, outstandingAtExit: stillOut }]),
    authorization: PRIOR.authorization || null, note: PRIOR.note || null };
  if (stillOut > 0) {
    say('  NOTE: $' + stillOut.toFixed(6) + ' of reservations were still outstanding at exit and');
    say('        are carried as UNRESOLVED exposure, not forgiven.');
  }
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(next, null, 2));
  say('\nBUDGET CARRIED FORWARD -> ' + BUDGET_FILE);
  say('  receipted to date  $' + next.receipted.toFixed(6));
  say('  unresolved to date $' + next.unresolved.toFixed(6));
  say('  TOTAL vs ceiling   $' + (next.receipted + next.unresolved).toFixed(6)
    + ' of $' + CEILING.toFixed(2));
} catch (_) {}
say('\noutput: ' + RUN);
await browser.close();
LOG.end();
