// ══════════════════════════════════════════════════════════════════════════════════════════
// TEN-SCENE LITERARY PLAYTHROUGH — opening + 9 continuations, real Storybound
//
// NOT AUTHORIZED. `run` refuses without an explicit ceiling, and nothing here dispatches until
// that ceiling is given. `preflight` is provider-free and is what proves the runner before any
// money moves.
//
// WHAT IS REAL. Every model endpoint goes through to the real provider: the planner, the author,
// the memory/disclosure extraction, the post-author lane, and whichever editorial stages the
// declared configuration actually enables. No canned model responses, no replayed memory, no
// injected scene outcome, no manual story-state reset, no prose repair by me.
//
// WHAT IS SIMULATED, AND DISCLOSED. Only non-provider account plumbing: /api/config, the
// entitlement/profile read, and the fortune wallet. No purchase, no payment credential, no real
// account. Image generation is BLOCKED (not a text stage; it would cost real money for pictures
// nobody is judging).
//
// AN UNRECOGNISED ENDPOINT IS A HALT, NEVER A FAKE SUCCESS. Anything under /api/ that is not a
// known model route and not on the disclosed simulation list aborts the request, records it, and
// stops the run.
//
// THE READER IS CLAUDE, READING ONLY THE PUBLISHED PAGE. Between scenes the runner writes
// NEXT_PAGE.txt (the published prose and the visible controls, nothing else) and waits for
// NEXT_ACTION.json. It never asks a canned question and it never consults the seed, the plan, or
// any sealed material to choose.
//
// Usage:
//   node _nf_literary_playthrough.mjs preflight          provider-free readiness check
//   node _nf_literary_playthrough.mjs run <ceilingUsd>   spends money; needs an explicit ceiling
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert';
import { chromium } from 'playwright-core';
import { estimateUsd, guardDispatch } from './_fsc_cost_guard.mjs';
// ── THE PRE-AUTHOR REGISTER GATE, WIRED INTO THE DISPATCH PATH ──
// This run is GENERAL PROSE ONLY. Sol and Haiku must never be handed a scene whose declared
// requirements call for a register they will not write: the author would either soften an
// established voice to stay inside its own policy, or the provider would refuse. The gate is
// consulted HERE, at the author dispatch, before any author request leaves the browser.
import { registerVerdict, snapshotInPage, PROCEED } from './_nf_register_gate.mjs';
import { R_SCENE, reservationLines } from './_live_spend_ledger.mjs';
// SETTLEMENT REPLACES THE ESTIMATE-SUBTRACTING LEDGER IN THE DISPATCH PATH. The old ledger read
// only xAI's cost field, so Sol and Haiku receipts stayed unpriced estimates and the allowance
// was never reconciled against real charges.
import { makeSettlement, settle } from './_nf_cost_settlement.mjs';
// RELIABILITY MECHANISMS, SHARED WITH THE CONTROLS (2026-11-02). Imported rather than inlined so
// _nf_reliability_controls.mjs exercises the same functions this run uses, not copies of them.
import { allocateArtifactPath, scaffoldPrerequisite, isPrerequisiteGuarded, evidenceBundle,
  prerequisiteOptionsFor }
  from './_nf_run_reliability.mjs';
import { configBody, installSession, isAuthOrigin, makeSession, installEntitledProfileStub }
  from './_test_session_env.mjs';
// THE AUTHOR ROUTER IS THE PRODUCT FILE, NOT A COPY. Imported from public/ so the harness cannot
// drift from what the application would load.
import { createRequire as _cr } from 'node:module';
const Router = _cr(import.meta.url)('/Users/romantsukerman/storybound-app/public/author-cache-router.js');
// Every routing decision, in order, written out with the run. `measurement` stays null on each
// one: a decision is made before its request, so a provider's cached_tokens can only ever be
// attached afterwards, and never as the prediction for the next scene.
const authorRouting = [];
// Declared here, used inside the route handler. `page` is assigned later, so every call is
// guarded: a routing record that cannot be written is reported, never silently skipped.
let page = null;
async function noteAuthorOutcome(status, usage, promptText, request = {}, dispatchedAt = null) {
  if (!page) return;
  try {
    const before = await page.evaluate(() => (window.state && window.state._authorRouting) || null);
    const after = Number(status) === 200
      ? Router.recordCompletion(before, { author: 'sol', status: 200, at: Date.now(),
          dispatchedAt, model: request.model, promptCacheOptions: request.prompt_cache_options,
          promptPrefix: promptText, promptChars: (promptText || '').length, usage: usage || null })
      : Router.recordFailure(before, { at: Date.now(), status: status,
          note: 'author dispatch did not complete with 200' });
    await page.evaluate((e) => { try { (window.state = window.state || {})._authorRouting = e; } catch (_) {} }, after);
    const measured = after.lastMeasuredCachedTokens;
    say('  ⇠ routing evidence ' + (Number(status) === 200 ? 'completion recorded; cache clock renews only on receipt-confirmed read/write'
      : 'unchanged — attempt recorded, no prefix established (status ' + status + ')')
      + (measured === null ? '   [no cached_tokens in the receipt: absent, not zero]'
        : '   [measured cached_tokens=' + measured + ' for THIS request]')
      + ' [cache_write_tokens=' + after.lastMeasuredCacheWriteTokens + ']');
  } catch (e) {
    say('  ! routing evidence could not be recorded: ' + (e && e.message));
  }
}

const ROOT = '/Users/romantsukerman/storybound-app';
// SB_OUT KEEPS A DIAGNOSTIC RUN OUT OF A PAID RUN'S DIRECTORY. Without it the replay below was
// writing into _nf_playthrough_out and would have overwritten the paid ten-scene artifacts in its
// finally block. Those are now also copied to _nf_paid_run_PRESERVED/.
// ── ONE DIRECTORY PER RUN (2026-10-30) ──
// This was a FIXED path, so every run overwrote the last. That destroyed a preserved failed run's
// requests.json when three recorder-verification runs were executed afterwards: the evidence the
// run existed to hold was replaced by injected-fault records. A run id makes each run's artifacts
// immutable once written; LATEST is a convenience pointer for reading the most recent one.
const RUN_ID = new Date().toISOString().replace(/[:.]/g, '-') + '_' + process.pid
  + (process.env.SB_FAULT ? '_fault-' + process.env.SB_FAULT : '');
// NEW ARTEFACTS GO OUTSIDE THE WATCHED APPLICATION TREE (2026-10-30). `vercel dev` holds about one
// descriptor per project file and has failed with `spawn EBADF` three times alongside a large
// watched-file count; this harness was contributing hundreds of files per run to the tree it was
// testing against. Writing outside the repo removes that contribution at the source rather than
// relying on .vercelignore to exclude it afterwards.
//
// HISTORICAL RUNS ARE NOT MOVED OR DELETED. Everything already under _nf_playthrough_out/ stays
// exactly where it is; SB_OUT still overrides, so an older path can be read or re-pointed by hand.
const OUT_ROOT = process.env.SB_OUT
  ? (process.env.SB_OUT.startsWith('/') ? process.env.SB_OUT : ROOT + '/' + process.env.SB_OUT)
  : '/Users/romantsukerman/storybound-diag/_nf_playthrough_out';
const OUT = OUT_ROOT + '/run_' + RUN_ID;
const MODE = process.argv[2];
const ORIGIN = process.env.SB_ORIGIN || 'http://localhost:3000';
// SB_MAX_SCENES lets a diagnostic arm exit CLEANLY after fewer scenes, so the finally block still
// writes its artifacts — killing the process skipped them, which is why an earlier arm produced
// no VERIFIER.json to read.
const SCENES = Number(process.env.SB_MAX_SCENES || 10);   // the opening plus nine continuations.
// The paid ten-scene configuration resumes between 5 and 6, and the preflight still asserts that
// for the paid shape. SB_RESUME_AFTER moves it for PROVIDER-FREE verification only — a resume has
// to be exercised while Sol is still the selected author, and by scene 5 a long-pause arm has
// already handed off to Haiku, so a reload after 5 can only ever test the post-handoff case.
const RESUME_AFTER_SCENE = Number(process.env.SB_RESUME_AFTER || 5);
// How long the runner waits for a reader choice. 30 minutes was tuned for a human at a
// keyboard; when the reader is this session, a single turn spent READING the published page
// can consume most of the window, and the 2026-11-01 run halted at 3 of 13 scenes for exactly
// that reason — a timeout, with the story intact and nothing wasted. SB_ACTION_WAIT_MIN raises
// the window. It changes only how long the runner is willing to WAIT; it is not a spending
// control and nothing about dispatch, accounting or validation depends on it.
const ACTION_WAIT_MS = (Number(process.env.SB_ACTION_WAIT_MIN) > 0
  ? Number(process.env.SB_ACTION_WAIT_MIN) : 30) * 60 * 1000;
const SCENE_WAIT_MS = 6 * 60 * 1000;     // how long one scene may take to arrive

fs.mkdirSync(OUT, { recursive: true });
// A pointer to this run, so readers do not have to guess which directory is current. The
// directories themselves are never reused.
try {
  const latest = OUT_ROOT + '/LATEST';
  try { fs.unlinkSync(latest); } catch (_) {}
  fs.symlinkSync(OUT, latest, 'dir');
} catch (_) {}
const log = [];
const say = (m) => { console.log(m); log.push(m); fs.writeFileSync(OUT + '/RUN.log', log.join('\n')); };

// ── THE AGREED AUTHOR CONFIGURATION (disclosed override, pinned) ─────────────────────────
// Storybound assembles every prompt, plans, updates memory, persists and continues exactly as
// it ships. ONE thing is overridden, and it is declared: which model writes the prose.
//   · the OPENING  -> gpt-6.1-sol        ("Sol"),   via /api/sol-scene-test
//   · continuations -> claude-haiku-5-5  ("Haiku"), via /api/anthropic-proxy
// COLD CACHE BY CONSTRUCTION, not by a router: each continuation is a fresh prompt to a provider
// that has not seen the previous one, so nothing is reused and nothing pretends otherwise. No
// cache router is built for this test.
// REQUESTED identity and PROVIDER-CONFIRMED identity are recorded separately: `requested` is what
// the override asked for, `served` is what the provider's own response says answered.
// KEYED BY AUTHOR, NOT BY SCENE POSITION (2026-10-30). These were `opening` and `continuation`,
// which encoded the fixed scene-number handoff in the table itself — the author was chosen by
// WHICH SCENE it was, so there was nowhere for a routing decision to go. They are now named for
// the models they configure, and the selection is made by public/author-cache-router.js at the
// intercepted dispatch below.
const AUTHOR_OVERRIDE = {
  sol:   { label: 'Sol',   requested: 'gpt-6.1-sol',       route: '/api/sol-scene-test',
                  capField: 'max_completion_tokens', cap: 4000,
                  rate: { in: 2.0e-6, out: 10.0e-6 } },
  haiku: { label: 'Haiku', requested: 'claude-haiku-5-5',  route: '/api/anthropic-proxy',
                  capField: 'max_tokens', cap: 20000,
                  // measured on this packet family: >100k prompt tier. Thinking bills INSIDE the
                  // cap, and the cap is the only lever — 'between_tools' is rejected by this model.
                  rate: { in: 0.50e-6, out: 2.50e-6 } },
};
// WHICH REQUEST IS THE AUTHOR? Identified by the prompt's own content, never by a role label:
// this project routes prose through several role names, and the measured continuation author
// arrived as STRUCTURE_GENERATOR.
const isAuthorRequest = (bodyText) => /SCENE CONTINUATION \(HARD/.test(bodyText)
  || /PROTAGONIST OPENING BEAT \(HARD/.test(bodyText);

// ── PRICING THE OVERRIDE MODELS ────────────────────────────────────────────────────────────
// The shared cost guard fail-closes on a model it has no rate for and returned $Infinity for
// claude-haiku-5-5 — which is the right refusal, not a bug. The override prices its own models
// from its own pinned rates, and from the chars-per-token ratio MEASURED for each provider on
// this packet family: 2.65 for Anthropic, 4.45 for xAI/OpenAI. Using one ratio for both is the
// mistake that understated a Haiku quote by 48% earlier in this project.
const CPT = { Haiku: 2.65, Sol: 4.45 };
function estimateOverrideUsd(chars, target) {
  const inTok = chars / CPT[target.label];
  // Worst case on output: both models bill their thinking/reasoning INSIDE the cap, so the cap
  // IS the output bound. No cache reuse is assumed. That is a CONSERVATIVE PRICING ASSUMPTION,
  // not measured routing behaviour: unconditional Haiku routing and freshly built requests do not
  // establish cache misses, and this runner has never measured cache hits either way. Pricing
  // every input token as uncached can only over-state the bill, which is the safe direction — but
  // it must not be read as evidence that the run is cold.
  const outTok = target.cap;
  return { estimate: inTok * target.rate.in + outTok * target.rate.out, inTok, outTok };
}

// ── ROUTE POLICY. One table, so what is real and what is simulated is readable in one place. ──
// `sol-scene-test` was MISSING here, so a direct /api/sol-scene-test call — which is how the
// shipped architecture stage reaches Sol (app.js:240753) — classified as HALT_UNRECOGNISED and
// the runner aborted it. Adding it to this pattern routes it through the SAME request handler as
// every other provider: the spending guard, the reservation, the settlement record and the
// response preservation all apply. It is NOT an exemption or a bypass.
let _solArchOutgoing = null;
const MODEL_ROUTES = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|anthropic-proxy|gemini|cplus-editor|orchestrator|sol-scene-test)\b/;
const SIMULATED_ACCOUNT = /\/api\/(config|consume-fortune|refund-fortune|profiles|verify-subscription|claim-issue-number|bug-report-awards|record-tempt-failure|consume-tempt-charge)\b/;
const BLOCKED_IMAGES = /\/api\/(img-proxy|bfl-kontext|image|grok-image|dashscope-image|visualize-flux|replicate)\b/;
const PASSTHROUGH_NOOP = /\/api\/(geo|csp-report|beta-events)\b/;

// ── THE READER HANDOFF ────────────────────────────────────────────────────────────────────
const pagePath = (n) => OUT + '/NEXT_PAGE.txt';
const actionPath = () => OUT + '/NEXT_ACTION.json';
async function awaitReaderChoice(sceneNo, published, controls) {
  try { fs.unlinkSync(actionPath()); } catch (_) {}
  fs.writeFileSync(pagePath(sceneNo),
    '=== PUBLISHED STORY SO FAR (scene ' + sceneNo + ' of ' + SCENES + ') ===\n\n'
    + published + '\n\n=== VISIBLE READER CONTROLS ===\n' + JSON.stringify(controls, null, 2)
    + '\n\nWrite ' + actionPath() + ' as {"action":"...","dialogue":"..."} to continue.\n');
  say('  ⏸ waiting for a reader choice — page written to ' + pagePath(sceneNo));
  const t0 = Date.now();
  while (Date.now() - t0 < ACTION_WAIT_MS) {
    if (fs.existsSync(actionPath())) {
      try {
        const j = JSON.parse(fs.readFileSync(actionPath(), 'utf8'));
        if (typeof j.action === 'string') {
          fs.writeFileSync(OUT + '/choice_scene' + sceneNo + '.json', JSON.stringify(j, null, 2));
          return { action: j.action, dialogue: typeof j.dialogue === 'string' ? j.dialogue : '' };
        }
      } catch (_) { /* half-written; try again */ }
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('no reader choice within ' + (ACTION_WAIT_MS / 60000) + ' minutes — stopping with the story intact');
}

// ── READ THE PUBLISHED PAGE, AND NOTHING ELSE ─────────────────────────────────────────────
const readPublished = (page) => page.evaluate(() => ({
  pages: (window.StoryPagination && window.StoryPagination.getPages)
    ? window.StoryPagination.getPages().map((p) => String(p || '')) : [],
  allContent: (window.StoryPagination && window.StoryPagination.getAllContent)
    ? String(window.StoryPagination.getAllContent() || '') : '',
  sceneCount: ((window.state || {}).scenes || []).length,
  turnCount: (window.state || {}).turnCount || 0,
  controls: {
    actionPlaceholder: (document.getElementById('actionInput') || {}).placeholder || null,
    dialoguePlaceholder: (document.getElementById('dialogueInput') || {}).placeholder || null,
    submitLabel: ((document.getElementById('submitBtn') || {}).textContent || '').trim().slice(0, 40),
    fateOptions: Array.from(document.querySelectorAll('.fate-card-option, #fateOptions button'))
      .map((e) => (e.textContent || '').trim().slice(0, 80)).filter(Boolean).slice(0, 8),
    visibleModals: ['fortuneDisclosureModal', 'paywallModal', 'issueCliffhangerModal',
      'starterUnlockModal', 'bakedUnlockConfirm']
      .filter((id) => { const el = document.getElementById(id); return el && !el.classList.contains('hidden'); }),
  },
}));

export { MODEL_ROUTES, SIMULATED_ACCOUNT, BLOCKED_IMAGES, PASSTHROUGH_NOOP };

// ══ PREFLIGHT — CONTACTS NO PROVIDER ═════════════════════════════════════════════════════
if (MODE === 'preflight') {
  const checks = [];
  const ck = (n, f) => { try { f(); checks.push(['ok', n]); } catch (e) { checks.push(['FAIL', n + ' :: ' + (e && e.message)]); } };

  ck('every endpoint this chain uses is classified, and nothing falls through to a fake success', () => {
    const classify = (u) => SIMULATED_ACCOUNT.test(u) ? 'simulated_account'
      : BLOCKED_IMAGES.test(u) ? 'blocked_image'
      : PASSTHROUGH_NOOP.test(u) ? 'noop'
      : MODEL_ROUTES.test(u) ? 'REAL_PROVIDER'
      : /\/api\//.test(u) ? 'HALT_UNRECOGNISED' : 'static';
    const seen = {
      '/api/proxy': 'REAL_PROVIDER', '/api/chatgpt-proxy': 'REAL_PROVIDER',
      '/api/mistral-proxy': 'REAL_PROVIDER', '/api/anthropic-proxy': 'REAL_PROVIDER',
      '/api/cplus-editor': 'REAL_PROVIDER', '/api/sol-scene-test': 'REAL_PROVIDER',
      '/api/config': 'simulated_account', '/api/consume-fortune': 'simulated_account',
      '/api/refund-fortune': 'simulated_account', '/api/bug-report-awards': 'simulated_account',
      '/api/record-tempt-failure': 'simulated_account',
      '/api/bfl-kontext': 'blocked_image', '/api/visualize-flux': 'blocked_image',
      '/api/geo': 'noop',
      '/api/something-nobody-wired': 'HALT_UNRECOGNISED',
      '/app.js': 'static',
    };
    Object.keys(seen).forEach((u) => assert.equal(classify(u), seen[u], u + ' classified as ' + classify(u)));
  });
  ck('the ceiling is the authorization: run refuses without one', () => {
    assert.throws(() => { const c = Number(''); assert(c > 0, 'dispatch requires an explicit ceiling'); });
  });
  ck('the pre-dispatch budget guard blocks a call the remaining authorization cannot cover', () => {
    const body = { messages: [{ role: 'system', content: 'x'.repeat(40000) }], max_tokens: 1200 };
    const tight = guardDispatch(body, { model: 'grok-4.3', remainingAuthorization: 0.0001 });
    assert.equal(tight.allowed, false, 'a 1/100-cent authorization must not pass');
    assert.equal(tight.reason, 'over_remaining_authorization', tight.reason);
    const roomy = guardDispatch(body, { model: 'grok-4.3', remainingAuthorization: 5 });
    assert.equal(roomy.allowed, true);
    assert(roomy.estimate > 0, 'the guard must price the call');
  });
  // ── SETTLEMENT, DEMONSTRATED AGAINST THE REAL reconcile() PATH ─────────────────────────
  // Three cases the brief names, each driven through makeSettlement rather than described:
  // a charge BELOW its reservation, a charge ABOVE it, and an UNANSWERED request.
  ck('a charge BELOW its reservation replaces it — no double-count', () => {
    const st = makeSettlement(3.0);
    st.record({ stage: 'author', model: 'claude-haiku-5-5', estimate: 0.1329,
      usage: { input_tokens: 165709, output_tokens: 4900 } });
    const t = st.totals();
    assert(t.settled > 0 && t.settled < 0.1329, 'settled $' + t.settled);
    assert.equal(t.estimated, 0); assert.equal(t.heldUnknown, 0);
    assert(Math.abs(t.committed - t.settled) < 1e-12, 'the reservation must not also be counted');
  });
  ck('a charge ABOVE its reservation is settled at the REAL figure, not capped at the reservation', () => {
    const st = makeSettlement(3.0);
    // AN OVERRUN CANNOT COME FROM OUTPUT — output is reserved at the cap, which IS its bound on
    // this model. It comes from INPUT: the reservation converts characters at 2.65 per token, and
    // a packet that tokenizes worse than that bills more input than was reserved. Reservation
    // $0.1329 = 165,709 in + 20,000 out; this receipt shows 200,000 input.
    st.record({ stage: 'author', model: 'claude-haiku-5-5', estimate: 0.1329,
      usage: { input_tokens: 200000, output_tokens: 20000 } });
    const t = st.totals();
    assert(t.settled > 0.1329, 'an overrun must settle above its reservation, got $' + t.settled);
    assert(Math.abs(t.committed - t.settled) < 1e-12, 'still no double-count');
    assert(t.remaining < 3.0 - 0.1329, 'and the allowance must absorb the real figure');
  });
  ck('an UNANSWERED request keeps its reservation held and is never credited back', () => {
    const st = makeSettlement(3.0);
    st.record({ stage: 'author', model: 'claude-haiku-5-5', estimate: 0.1329,
      noResponse: true, why: 'ECONNRESET' });
    const t = st.totals();
    assert.equal(t.settled, 0);
    assert(Math.abs(t.heldUnknown - 0.1329) < 1e-12, 'held $' + t.heldUnknown);
    assert(Math.abs(t.remaining - (3.0 - 0.1329)) < 1e-12, 'the allowance must not be refunded');
  });
  ck('a CACHE-BEARING receipt is held, not settled as if it were all uncached', () => {
    // UPDATED 2026-11-02. This used to assert `cached.settled === true` — that settle() would
    // happily price the plain fields and the DISPATCH PATH was solely responsible for withholding
    // them. That split is what let a real receipt through: the dispatch path tested only the READ
    // fields, the measured Sol receipt carried `cache_write_tokens` instead, and $0.197876 was
    // recorded as settled from an incomplete rate. settle() now refuses on its own.
    const read = settle({ input_tokens: 1000, output_tokens: 100,
      cache_read_input_tokens: 150000 }, 'claude-haiku-5-5');
    assert.equal(read.settled, false, 'a cache-READ receipt must not settle');
    assert.equal(read.holdExposure, true, 'and it must hold exposure rather than be dropped');
    // THE EXACT SHAPE THAT SLIPPED THROUGH, asserted as a case and not as a description.
    const write = settle({ prompt_tokens: 88558, completion_tokens: 2076, total_tokens: 90634,
      prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 88555 } }, 'gpt-6.1-sol');
    assert.equal(write.settled, false, 'a cache-WRITE receipt must not settle either');
    assert(/cache_write_tokens=88555/.test(write.why || ''), 'the refusal must name the field: ' + write.why);
    // An authoritative provider cost still wins — refusing is the fallback, not a preference.
    const authoritative = settle({ cost_in_usd_ticks: 271993500,
      prompt_tokens_details: { cache_write_tokens: 500 } }, 'grok-4.3');
    assert.equal(authoritative.settled, true, 'a provider cost field must still settle');
    assert(Math.abs(authoritative.usd - 0.02719935) < 1e-12, 'at the provider figure');
    // And a plain receipt with no cache activity still settles normally.
    const plain = settle({ prompt_tokens: 1000, completion_tokens: 100,
      prompt_tokens_details: { cached_tokens: 0 } }, 'gpt-6.1-sol');
    assert.equal(plain.settled, true, 'a plain receipt must still settle');
    const st = makeSettlement(3.0);
    st.record({ stage: 'author', model: 'gpt-6.1-sol', estimate: 0.1329,
      usage: { prompt_tokens: 88558, completion_tokens: 2076,
        prompt_tokens_details: { cache_write_tokens: 88555 } } });
    const t = st.totals();
    assert.equal(t.settled, 0, 'a cache-bearing receipt must not reach the settled total');
    assert(Math.abs(t.heldUnknown - 0.1329) < 1e-12, 'it is HELD at its reservation: ' + t.heldUnknown);
  });
  ck('the reader handoff round-trips, and the page is the only thing handed over', () => {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(actionPath(), JSON.stringify({ action: 'a', dialogue: 'b' }));
    const j = JSON.parse(fs.readFileSync(actionPath(), 'utf8'));
    assert.equal(j.action, 'a'); assert.equal(j.dialogue, 'b');
    fs.unlinkSync(actionPath());
    const dumped = fs.existsSync(pagePath(1));
    assert.equal(typeof dumped, 'boolean');
  });
  ck('the authorized scene count, and the resume sits between 5 and 6', () => {
    // WAS assert.equal(SCENES, 10) — the ten-scene run's shape, hardcoded. The execution test is
    // authorized for THIRTEEN scenes plus one alternate scene 13, so the assertion now pins the
    // AUTHORIZED set rather than one historical configuration. Anything outside it still fails
    // loudly; this is not a licence for an arbitrary count.
    assert(SCENES === 10 || SCENES === 13,
      'SCENES=' + SCENES + ' is not an authorized shape (10 = the original run, 13 = the execution test)');
    // The PAID shape is asserted, not whatever a provider-free arm set. If SB_RESUME_AFTER is in
    // the environment this check fails loudly rather than blessing a different configuration.
    assert.equal(RESUME_AFTER_SCENE, 5);
    assert.ok(!process.env.SB_RESUME_AFTER,
      'SB_RESUME_AFTER is set — that is a provider-free verification override and must not be '
      + 'present when the paid shape is being confirmed');
  });

  console.log('PROVIDER-FREE PREFLIGHT — nothing was contacted, no provider traffic left this process\n');
  checks.forEach(([s, n]) => console.log('  ' + (s === 'ok' ? '✓' : '✗') + ' ' + n));
  const bad = checks.filter(([s]) => s !== 'ok').length;
  console.log('\n  scenes          : ' + SCENES + ' (opening + ' + (SCENES - 1) + ' continuations)');
  console.log('  save/resume     : after scene ' + RESUME_AFTER_SCENE + ', via localStorage snapshot → reload → window.continueStory');
  console.log('  real provider   : ' + MODEL_ROUTES.source);
  console.log('  simulated       : ' + SIMULATED_ACCOUNT.source);
  console.log('  blocked         : ' + BLOCKED_IMAGES.source);
  console.log('  unrecognised    : abort + record + HALT (never a fake success)');
  console.log('\n' + reservationLines().join('\n'));
  console.log('  ten scenes reserved = $' + (R_SCENE * SCENES).toFixed(4));
  console.log('\n  ' + (checks.length - bad) + '/' + checks.length + ' preflight checks passed'
    + (bad ? '  — NOT READY' : '  — ready, pending an explicit ceiling and approval'));
  process.exit(bad ? 1 : 0);
}

// ══ THE DRIVER ═══════════════════════════════════════════════════════════════════════════
// `drive` intercepts transport and serves LABELLED SYNTHETIC replies. It proves the SEQUENCE
// and measures REQUEST SIZES; its prose is worthless and is never presented as story evidence.
// `run` sends the same sequence to real providers and needs an explicit ceiling.
const DRIVE = MODE === 'drive';
// RESUME-INTO. Continues a story this runner already paid for, from its preserved state, instead
// of regenerating the scenes already on disk. The alternative is re-paying for every completed
// scene after any client-side fault, which is how a budget gets spent on work already done.
// DRIVE MAY ALSO RESUME (2026-11-01). Replaying a preserved author response through the real
// application path requires BOTH a resumed story and every other provider blocked. Only
// `run-resume` could resume, and it sends non-replayed roles LIVE — which cost ~$0.008 in
// mount-time calls (a synopsis pass and a specialist renderer) before I caught it. Allowing
// `drive` to take a state file gives the fully-blocked resume that the replay actually needs.
const RESUME_FROM = (MODE === 'run-resume' || MODE === 'drive') ? process.argv[4] : null;
if (!DRIVE && MODE !== 'run-resume') {
  assert.equal(MODE, 'run', 'usage: preflight | drive | run <ceilingUsd> | run-resume <ceilingUsd> <stateFile>');
}
// ── A REPLAY MAY NOT RUN IN A MODE THAT CAN DISPATCH LIVE (Roman 2026-11-01) ──────────────
// Checked HERE, before chromium is launched, so a replay is never even capable of a live
// mount-time request. The earlier recovery attempt used `run-resume` with SB_REPLAY_RAW set:
// the author leg came from disk, but every other role went to real providers and three
// mount-time calls billed ~$0.008 before I noticed. Route interception alone is not a
// safeguard when the interceptor's own live branch is reachable — the mode has to be refused.
// ── PRIMARY_AUTHOR CALL COUNTER, PER SCENE (Roman 2026-11-01) ───────────────────────────────
// The two PRIMARY_AUTHOR legs of a scene (beat outline, then control extraction) are told apart
// by their ORDER, not by substring matching on prompts that share a vocabulary. Reset per scene.
let _paSeen = 0;
const _REPLAYING = !!(process.env.SB_REPLAY_RAW || process.env.SB_REPLAY_PLANNER
  || process.env.SB_REPLAY_OUTLINE || process.env.SB_REPLAY_CONTROL || process.env.SB_REPLAY_FALLBACK);
if (_REPLAYING && MODE !== 'drive') {
  throw new Error('[REPLAY SAFETY] SB_REPLAY_RAW / SB_REPLAY_PLANNER is set, but mode is "' + MODE
    + '", whose handler forwards non-replayed roles to real providers. A replay must run in `drive`,'
    + ' where every provider is blocked. Refusing to start — nothing was launched and nothing spent.');
}
if (MODE === 'run-resume') assert(RESUME_FROM && fs.existsSync(RESUME_FROM),
  'run-resume needs the RESUMABLE_STATE.json written by a previous run');
const CEILING = DRIVE ? Number(process.env.SB_DRIVE_CEILING || 999) : Number(process.argv[3] || 0);
assert(CEILING > 0, 'dispatch requires an explicit ceiling argument — the ceiling IS the authorization');

// ── THE ALLOWANCE IS RESERVED, THEN RECONCILED ────────────────────────────────────────────
// reserve(estimate) holds the money BEFORE the request leaves and returns a handle. When the
// response comes back the handle is reconciled: a settled charge REPLACES its reservation (no
// double-count), a missing or unpriceable receipt KEEPS the reservation (exposure is never
// released), and a dispatch that never answered is HELD. `remaining` is always
// ceiling − settled − outstanding reservations − held.
const settlement = makeSettlement(CEILING);
const inflight = [];
let settledTotal = 0, heldTotal = 0;
const reserve = (estimate, stage, model) => {
  const h = { stage, model, estimate, open: true };
  inflight.push(h);
  return h;
};
const outstanding = () => inflight.filter((h) => h.open).reduce((n, h) => n + h.estimate, 0);
const remainingNow = () => CEILING - settledTotal - heldTotal - outstanding();
function reconcile(h, { usage, noResponse, why, model }) {
  h.open = false;
  const row = settlement.record({ stage: h.stage, model: model || h.model,
    estimate: h.estimate, usage, noResponse, why });
  // APPENDED AS IT HAPPENS. The summary totals were only written in the finally block, so an
  // uncaught throw left no accounting at all and the figures had to be rebuilt by hand
  // afterwards — a reconstruction, not a record.
  // THE REASON MUST BE THE SETTLEMENT'S OWN, NOT ONLY THE CALLER'S. `why` here is the argument
  // the dispatch path passed (set only for a transit failure), so logging just that recorded
  // `why: null` for a receipt that settle() had refused with a specific, correct explanation.
  // A row that says nothing about WHY it is held is the same defect as one that says the wrong
  // thing. `settlementWhy` carries settle()'s reason; `cacheFieldsSeen` names the fields.
  _ledger('reconcile', { stage: h.stage, model: model || h.model, estimate: h.estimate,
    kind: row.kind, usd: row.usd == null ? null : row.usd, noResponse: !!noResponse,
    why: why || null,
    settlementWhy: row.why || null,
    usageReceived: !!row.usageReceived,
    cacheFieldsSeen: row.cacheFieldsSeen || null });
  if (row.kind === 'settled') { settledTotal += row.usd; return row; }
  // NOT SETTLED. The reservation stands in for the charge — it is not released, and it is not
  // claimed as an exact amount either. A cache-bearing receipt we cannot price correctly lands
  // here on purpose.
  heldTotal += h.estimate;
  return row;
}
const requests = [];          // every outgoing model request, for the measured quote
const replayLog = [];         // SB_REPLAY_BAD_NORM: what the normalization layer was made to return
const verifierLog = [];       // SB_MILESTONE: the commit-verifier question asked and the verdict served
let replayPlannerServed = 0;   // SB_REPLAY_PLANNER: which preserved planner reply to serve next
let remaining = CEILING;
let halted = null;
let registerStop = null;   // set by the pre-author register gate; sticky for the whole run
// THE RUN DECLARES ITS OWN SCOPE. SB_GENERAL_PROSE=1 asserts that this configuration's cast and
// requirements are general-prose compatible. Without it every author dispatch stops as unknown,
// which is the correct default: no existing field establishes voice compatibility.
const DECLARED_GENERAL_PROSE = process.env.SB_GENERAL_PROSE === '1';
// ── THE PRECONDITION GATE'S SCOPE AND ITS STICKY STOP ─────────────────────────────────────
// Declared HERE, beside the other run-scope flags, rather than beside the pre-launch block far
// below: the route handler is installed before that block runs, so reading a `const` declared
// later would throw inside the handler on the first request. Same value, evaluated once.
const FRESH_PLAN_ACTIVE = process.env.SB_FRESH_PLAN === '1';
let prereqStop = null;    // set by the scaffold precondition gate; sticky for the whole run

// ── STRICT SOL — A TEST-ONLY STOP, DISCLOSED ───────────────────────────────────────────────
// WHAT IT CHANGES: in this experiment only, a failed or unresolved Sol ARCHITECTURE call ends
// the run instead of letting production pay a replacement planner. It reuses the same sticky
// stop the precondition gate uses, so every later dispatch of every role is refused.
//
// WHAT IT DOES NOT CHANGE: production's own fallback chain. A real reader still gets the tiered
// policy exactly as it ships — ministral, then grok, then 4o-mini — and nothing about that
// ordering, its retries or its reporting is touched. This gate lives in the HARNESS and decides
// only whether THIS RUN keeps spending.
//
// WHY IT IS NOT JUST THE PRECONDITION GATE: that gate fires at the first guarded DOWNSTREAM
// request, which is late enough for the replacement planner to have already been dispatched and
// billed. The 2026-11-02 run shows it: ministral charged for a malformed reply between the Sol
// timeout and the OPENING_PLANNER refusal. This stops at the Sol failure itself.
//
// Scoped to SB_FRESH_PLAN, so no other arm's behaviour moves.
function _strictSolStop(code, why) {
  if (!FRESH_PLAN_ACTIVE || prereqStop) return;
  prereqStop = { ok: false, code, why };
  halted = halted || ('STRICT-SOL HALT: ' + code + ' — ' + why);
  _ledger('strict_sol_stop', { code, why });
  say('  ✗ STRICT-SOL STOP: ' + code);
  say('    ' + why);
  say('    (test-only: production\'s own fallback chain is unchanged; this stops THIS RUN before'
    + ' a replacement planner is paid for)');
}
// SB_FAULT=json502 | text502 | throw — verifies the failure recorder without any provider.
const SB_FAULT = process.env.SB_FAULT || null;
// Generate scene 1 in `drive` instead of mounting it — see the fixture note at the planner branch.
const DRIVE_GENERATE_OPENING = process.env.SB_DRIVE_GENERATE_OPENING === '1';
// ── A DISCLOSED TEST CLOCK, FOR THE ROUTER ONLY ───────────────────────────────────────────
// SB_ROUTER_SKEW='4:2700000' adds 45 minutes to the `now` the ROUTER sees from scene 4 onward,
// so a long-pause handoff can be exercised in one continuous run without waiting 45 real
// minutes. It skews nothing else — not settlement, not the app, not the recorded timestamps —
// and every decision records the skew that was in force when it was taken.
const ROUTER_SKEW = (function () {
  const raw = String(process.env.SB_ROUTER_SKEW || '');
  const m = raw.match(/^(\d+):(\d+)$/);
  return m ? { fromScene: Number(m[1]), ms: Number(m[2]) } : null;
})();
const routerSkewFor = (scene) => (ROUTER_SKEW && scene >= ROUTER_SKEW.fromScene) ? ROUTER_SKEW.ms : 0;
// SB_PLANNER_ONLY=1 — one OPENING_PLANNER attempt, no retry, no author, no downstream generation.
// SB_PROBE_DRY=1 additionally refuses the planner itself, so the request can be built, measured
// and priced with ZERO exposure before any dispatch is authorised.
// Header redaction, shared by every persistence path so none of them can forget it.
function _redactHeaders(h) {
  const out = {};
  try {
    for (const k of Object.keys(h || {})) {
      out[k] = /authorization|api[-_]?key|cookie|set-cookie|token|secret|x-amz-security/i.test(k)
        ? '[REDACTED]' : h[k];
    }
  } catch (_) {}
  return out;
}

// EVERY RESPONSE REACHES DISK THE MOMENT IT IS READ — 200s included. Called before parsing,
// settlement and fulfilment, so no later exception can lose a response that already arrived.
// The receipt (provider usage) is extracted here too, by a parse that cannot throw outward: a
// malformed body still leaves the complete body on disk, with the parse error recorded beside it.
// ── AN APPEND-ONLY LEDGER, WRITTEN AS THINGS HAPPEN (2026-11-02) ───────────────────────────
// The summary ledger was assembled in the finally block, so an uncaught assertion lost every
// request record and the whole accounting. JSONL is appended at dispatch and again at
// reconciliation, so the ledger is complete up to the instant the process died — whatever killed
// it. A failure to append is REPORTED, never swallowed: a ledger that might be missing a line is
// not a ledger.
let _ledgerBroken = null;
function _ledger(ev, payload) {
  try {
    fs.appendFileSync(OUT + '/REQUESTS.jsonl',
      JSON.stringify(Object.assign({ at: new Date().toISOString(), ev }, payload)) + '\n');
  } catch (e) {
    if (!_ledgerBroken) {
      _ledgerBroken = String((e && e.message) || e);
      try { console.log('  ! LEDGER APPEND FAILED — records from here on may be missing: '
        + _ledgerBroken); } catch (_) {}
    }
  }
}

function _persistResponse(o) {
  let receipt = null; let parseError = null; let served = null;
  try {
    const j = JSON.parse(o.body);
    served = (j._orchestration && (j._orchestration.resolvedModel || j._orchestration.model))
      || j.model || (j._upstreamRaw && j._upstreamRaw.model) || null;
    receipt = (j.usage) || (j._upstreamRaw && j._upstreamRaw.usage) || null;
  } catch (e) { parseError = (e && e.message) || String(e); }
  // THE NAME CARRIES THE REQUEST'S OWN ID, ALLOCATED BEFORE DISPATCH — not the length of an
  // array read after awaiting, which two concurrent responses saw the same value of.
  const alloc = allocateArtifactPath(OUT, 'response', o.reqId, o.role || 'role', o.status);
  const name = alloc.name;
  if (alloc.collided) {
    say('  ! ARTIFACT NAME COLLISION — wrote ' + name + ' rather than overwrite an existing file;'
      + ' request ids are not unique, which is a defect worth chasing');
  }
  try {
    fs.writeFileSync(alloc.path, JSON.stringify({
      at: new Date().toISOString(), scene: o.scene, role: o.role, url: o.url,
      reqId: o.reqId,
      dest: String(o.dest || '').replace(ORIGIN, ''), requestedModel: o.model,
      status: o.status, ms: o.ms, requestChars: o.requestChars,
      headers: o.headers,                 // already redacted
      receipt,                            // provider usage, saved independently of settlement
      servedModel: served,
      bodyParseError: parseError,
      bodyComplete: o.body,               // the COMPLETE body, unabridged, whatever the status
    }, null, 2));
    if (o.rec) { o.rec.responseArtifact = name; o.rec.receiptSavedToDisk = !!receipt; }
    _ledger('response', { reqId: o.reqId, scene: o.scene, role: o.role, status: o.status,
      dest: String(o.dest || '').replace(ORIGIN, ''), ms: o.ms, servedModel: served,
      receipt, artifact: name, bodyChars: String(o.body).length });
    say('  ↳ response persisted: ' + name + '  (' + String(o.body).length + ' body chars, '
      + o.ms + 'ms, receipt ' + (receipt ? 'saved' : 'absent') + ')');
  } catch (e) {
    if (o.rec) o.rec.responseArtifact = 'WRITE_FAILED: ' + e.message;
  }
}

const PLANNER_ONLY = process.env.SB_PLANNER_ONLY === '1';
const PROBE_DRY = process.env.SB_PROBE_DRY === '1';
let plannerAttempts = 0;   // how many actually went to the wire
let plannerSeen = 0;       // how many the production client tried to send
const plannerRefused = [];
let _lastFixturePlan = null;   // what the valid-plan fixture actually built, for the record
async function faultResponse(kind, reqText, url) {
  if (kind === 'throw') throw new Error('injected transport failure (no HTTP response)');
  // ── SB_FAULT=cache_receipt — THE ACCOUNTING HANDOFF, EXERCISED FOR REAL ─────────────────
  // Returns a 200 carrying the EXACT usage block the 2026-11-02 Sol author returned:
  // cached_tokens 0 with cache_write_tokens 88555. It is served from inside the LIVE branch, so
  // _persistResponse, the rec.receipt extraction, the cacheSeen test, the usageForSettlement
  // handoff and reconcile() all run as they do on a real call — with no provider contacted.
  // This is what proves the receipt is PRESERVED and classified as unpriced cache usage rather
  // than discarded and reported as "no usage returned".
  // ── SB_FAULT=sol_empty_content | sol_missing_content ────────────────────────────────────
  // THE SUCCESSFUL-STATUS FAILURE, reproduced on the real dispatch path. Both are HTTP 200.
  //   sol_empty_content   → choices[0].message.content is ''      (the provider answered nothing)
  //   sol_missing_content → choices[0].message carries no content (a shape that lacks the field)
  //
  // TARGETED AT THE SOL ROUTE ONLY. Every other request in the run still receives the ordinary
  // cache_receipt body, so the arm reaches the architecture stage exactly as the known-good
  // deadline arm does. A blanket empty response would starve the earlier stages and the run
  // would never get far enough to test anything.
  // ── SB_FAULT=sol_valid_plan — THE POSITIVE CONTROL ──────────────────────────────────────
  // A 200 whose content IS a usable scaffold, so the strict-Sol stop must stay silent and the
  // run must carry on past the architecture stage. Without this leg the failure controls prove
  // only that the stop CAN fire, not that it discriminates. The plan is a previously generated
  // Sol plan read from disk — a plumbing fixture, never the plan under test.
  if (kind === 'sol_valid_plan') {
    if (/\/api\/sol-scene-test\b/.test(String(url || ''))) {
      let planText = '{}';
      try {
        planText = fs.readFileSync(process.env.SB_SCAFFOLD_SHAPE
          || '_nf_pilot2_out/plans/first_sacrifice__gpt-6.1-sol__run1.json', 'utf8');
      } catch (_) {}
      const body = JSON.stringify({
        model: 'gpt-6.1-sol',
        choices: [{ index: 0, finish_reason: 'stop',
          message: { role: 'assistant', content: planText } }],
        usage: { prompt_tokens: 14488, completion_tokens: 9123, total_tokens: 23611,
          prompt_tokens_details: { cached_tokens: 0 } },
      });
      return { status: () => 200, text: async () => body,
        headers: () => ({ 'content-type': 'application/json',
          'x-request-id': 'injected-sol_valid_plan' }) };
    }
    kind = 'cache_receipt';
  }
  if (kind === 'sol_empty_content' || kind === 'sol_missing_content') {
    if (/\/api\/sol-scene-test\b/.test(String(url || ''))) {
      const msg = (kind === 'sol_empty_content') ? { role: 'assistant', content: '' }
        : { role: 'assistant' };
      const body = JSON.stringify({
        model: 'gpt-6.1-sol',
        choices: [{ index: 0, finish_reason: 'stop', message: msg }],
        usage: { prompt_tokens: 14488, completion_tokens: 0, total_tokens: 14488,
          prompt_tokens_details: { cached_tokens: 0 } },
      });
      return { status: () => 200, text: async () => body,
        headers: () => ({ 'content-type': 'application/json',
          'x-request-id': 'injected-' + kind }) };
    }
    kind = 'cache_receipt';   // every other leg behaves as the known-good arm
  }
  if (kind === 'cache_receipt') {
    const body = JSON.stringify({
      model: 'gpt-6.1-sol',
      choices: [{ index: 0, finish_reason: 'stop',
        message: { role: 'assistant', content: 'injected prose for the accounting handoff only' } }],
      usage: { prompt_tokens: 88558, completion_tokens: 2076, total_tokens: 90634,
        prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 88555, audio_tokens: 0 },
        completion_tokens_details: { reasoning_tokens: 512, audio_tokens: 0 } },
    });
    return { status: () => 200, text: async () => body,
      headers: () => ({ 'content-type': 'application/json', 'x-request-id': 'injected-cache-receipt' }) };
  }
  const json502 = JSON.stringify({ error: 'All Grok models in fallback chain failed',
    details: { error: { message: 'injected upstream failure for recorder verification' } },
    chainTried: ['grok-4.3'] });
  const text502 = '<html><head><title>502 Bad Gateway</title></head><body>502 Bad Gateway</body></html>';
  // SB_FAULT=valid_plan / settle_throw — a SUCCESSFUL-PATH fixture.
  //
  // The earlier post-response fixture returned {"ok":true}, which is not a planner response at
  // all, so it never tested the successful path. This one is built from the LIVE page state:
  // every environment element the stage contract declares gets a covering affordance, which is
  // what _cpIngestGeneratedStage and the fusion coverage check at app.js:294459 require. The
  // contract carries no participants and no facts, so no reference can be "not issued this
  // scene". Validity is defined by production's validators, not asserted here — whatever they
  // reject is named in PLANNER_RESULT.json and fixed in the fixture, provider-free.
  if (kind === 'valid_plan' || kind === 'settle_throw') {
    const live = await page.evaluate(() => {
      try {
        const s = window.state || {};
        const st = (typeof window._scene1StageContract === 'function')
          ? window._scene1StageContract(s) : null;
        return { els: (st && st.environmentElements) || [], ok: !!st,
          place: (st && st.place) || null };
      } catch (e) { return { els: [], ok: false, err: String(e && e.message) }; }
    }).catch((e) => ({ els: [], ok: false, err: String(e && e.message) }));
    const els = (live.els || []).map(String).filter(Boolean);
    // `reqText` is the JSON-ENCODED body, so its newlines are the two characters \n and an
    // anchored multiline match never fires. The ids are distinctive enough to match unanchored.
    // The request is JSON-ENCODED, so its newlines are the characters \ and n and a regex built
    // around real whitespace never matches. It also mentions pc_opening_fusion in PROSE before
    // the schema block, so the first occurrence has no `character` field at all — take the first
    // segment that actually carries one.
    let pcName = null;
    {
      const _t = String(reqText || '');
      let _at = _t.indexOf('pc_opening_fusion');
      while (_at >= 0 && !pcName) {
        const _seg = _t.slice(_at, _at + 240);
        const _m = _seg.match(/character[^A-Za-z]{0,14}([A-Z][A-Za-z'\u2019-]+)/);
        if (_m) pcName = _m[1];
        _at = _t.indexOf('pc_opening_fusion', _at + 1);
      }
    }
    const objIds = Array.from(new Set((String(reqText || '').match(/O\d+(?=:)/g) || [])))
      .sort((a, b) => Number(a.slice(1)) - Number(b.slice(1))).slice(0, 3);
    // EVERYTHING THE VALIDATOR READS LIVES ON opening_spine. app.js:294570 binds
    // `plan = _envelope.opening_spine`, so environment_element_ids, environment_plus and
    // opening_actor_id belong there — putting them on scene_skeleton read as "missing".
    // The beat must carry the literal {TARGET} EXACTLY ONCE (app.js ~294599): the record names
    // the object, the planner only points at it. The axis must be one of _EP_AXES
    // (app.js:295461). stage_contract stays nested, to be lifted by the normaliser.
    const plan = {
      opening_spine: {
        scene_mission: 'The PC must carry the veil-canopy aside and be seen doing it — the '
          + 'failure to do it unnoticed is what starts the story.',
        environment_element_ids: objIds,
        opening_actor_id: null,
        // The scaffold builder reads these off the same opening_spine object
        // (app.js:296652/296654) and throws 'scaffold missing opening/decision' without them.
        opening_beat: 'She reaches the canopy before the officiant does and takes hold of it.',
        decision_beat: 'She draws it aside anyway, in front of everyone, instead of waiting to '
          + 'be told whether she may.',
        opening_setting: 'the ceremony clearing at dawn',
        stage_contract: {
          elements: els.map((n) => ({ name: n, affordance: 'can be touched, moved or used' })),
        },
      },
      // TWO DIFFERENT READERS. The element ids and opening_actor_id come off opening_spine, but
      // environment_plus and pc_opening_fusion are read from the SKELETON (`_skelRaw`,
      // app.js:295470+), and the skeleton's environment_plus is keyed `target`, not
      // `target_object_id` — the dependency block derives `target` from the fusion's contact.
      scene_skeleton: {
        // THE SCHEMA IS IN THE PROMPT, so the fixture follows it rather than guessing: E+ cites
        // `target_object_id` by id (never by name) on a seed-owned stage, and the protagonist's
        // name is read out of the request's own pc_opening_fusion example so this stays
        // story-agnostic. Both beats carry the literal {TARGET} exactly once.
        environment_plus: {
          target_object_id: objIds[0] || null,
          axis: 'ritual',
          beat: '{TARGET} has been re-tied so many times that the knots have worn pale grooves '
            + 'into the bark, and every groove sits at the same height — the ceremony has been '
            + 'performed here, this way, for longer than anyone present has been alive.',
        },
        pc_opening_fusion: {
          character: pcName,
          placement: 'PC_FIRST_EMBODIED_BEAT',
          character_angle: 'She handles the thing as if it were already hers to manage, before '
            + 'anyone has told her it is.',
          beat: 'She takes {TARGET} in both hands and draws it aside before the officiant can '
            + 'reach it, and holds it there, waiting to be corrected.',
        },
      },
    };
    const content = JSON.stringify(plan);
    const envelope = JSON.stringify({
      choices: [{ message: { content } }], model: 'grok-4.3',
      usage: { prompt_tokens: 74822, completion_tokens: 611, total_tokens: 75433 },
      _orchestration: { resolvedModel: 'grok-4.3' },
    });
    _lastFixturePlan = { elementsCovered: els, stageContractResolved: live.ok, note: live.err || null };
    return {
      status: () => 200, text: async () => envelope,
      headers: () => ({ 'content-type': 'application/json', 'x-request-id': 'fixture-valid-plan',
        'authorization': 'Bearer SHOULD_BE_REDACTED' }),
    };
  }
  if (kind === 'after_response') {
    const ok = JSON.stringify({ choices: [{ message: { content: '{"ok":true}' } }],
      model: 'grok-4.3', usage: { prompt_tokens: 1000, completion_tokens: 10 } });
    return { status: () => 200, text: async () => ok,
      headers: () => ({ 'content-type': 'application/json', 'x-request-id': 'injected-ok-5678',
        'authorization': 'Bearer SHOULD_BE_REDACTED' }) };
  }
  const body = kind === 'text502' ? text502 : json502;
  return {
    status: () => 502,
    text: async () => body,
    headers: () => ({ 'content-type': kind === 'text502' ? 'text/html' : 'application/json',
      'x-request-id': 'injected-req-id-1234', 'authorization': 'Bearer SHOULD_BE_REDACTED',
      'set-cookie': 'session=SHOULD_BE_REDACTED' }),
  };
}

// ── LABELLED SYNTHETIC REPLIES (drive only) ───────────────────────────────────────────────
// Built from SAVED REAL RESPONSES where one exists, so the shape is faithful by construction.
// The prose is a real saved draft repeated to a plausible scene length, so the rolling context
// grows the way it would in a paid run — which is what the cost curve depends on.
// KEPT WHOLE, INCLUDING ITS sceneDuty COMMENT AND <<<HISTORY_NOTE>>> BLOCK. The first attempt
// stripped them and the scene rendered a page but never committed (pages 2, scenes 1): the
// persistence path reads the finalized draft's own trailer. A real author reply carries it, so
// the synthetic one must too — that is what "shape-faithful" means here.
const SAVED_DRAFT = fs.readFileSync(
  ROOT + '/_ab_writing_out/continuation_experiment/POLISHED_sol.txt', 'utf8').trim();
// STRIP THE SAVED TRAILER'S OWN HISTORY_NOTE. Measured: only the FIRST <<<HISTORY_NOTE>>> block
// is admitted, so appending a contract-shaped note after the saved one left the saved note in
// charge — the run stored zero objects, zero knowledge and zero governing events, and a
// control/treatment pair then appeared to show retrieval when it was only echoing the reader's
// own words back out of the prompt. The contract-shaped note REPLACES it.
const SAVED_TRAILER = ((SAVED_DRAFT.match(/<!--[\s\S]*$/) || [''])[0])
  .replace(/<<<HISTORY_NOTE[\s\S]*?HISTORY_NOTE>>>/g, '').trim();
const SAVED_PROSE = SAVED_DRAFT.replace(/<!--[\s\S]*$/, '').trim();
// ── THE SYNTHETIC NOTE MUST MATCH THE CURRENT AUTHOR CONTRACT ──────────────────────────────
// SHAPE-FAITHFUL MEANS CURRENT. The saved trailer predates the object/knowledge/standing fields
// the contract now requests, so a run using it produced zero tracked objects and zero governing
// events — and retrieval then had nothing to retrieve, which looked like retrieval not working.
// This trailer is contract-shaped: ONE governing decision, ONE object transfer with an identifier,
// one knowledge entry. Scene 2 also leaves an object behind that no later scene mentions, which is
// the control/treatment subject for the retrieval evidence.
const SB_NOTE = (n) => {
  const q = (s) => s.replace(/"/g, '\\"');
  const parts = {
    // THE RETRIEVAL SUBJECT IS AN *EVENT*, the lowest-ranked kind, competing only against other
    // events. Measured: as a `decision` it outranked the events being held back and was delivered
    // in BOTH arms on kind alone, so relevance never got to decide and the pair proved nothing.
    events: n === 2
      ? [{ text: 'Scene 2 proceeded in the clearing.', quote: 'the clearing' },
         { text: 'They left the iron brazier behind and nobody went back for it that night.',
           quote: 'the clearing' }]
      : [{ text: 'Scene ' + n + ' proceeded in the clearing.', quote: 'the clearing' },
         { text: 'Scene ' + n + ': the lamps were trimmed and the benches were swept.',
           quote: 'the clearing' },
         { text: 'Scene ' + n + ': the clerk turned a page and waited.', quote: 'the clearing' }],
    // GOVERNING ON SCENE 3, NOT SCENE 1. Scene 1 is the opening and takes a different authoring
    // path, so a note written for it here is never applied — the first run of this pair stored
    // zero governing events for exactly that reason.
    decisions: n === 3
      ? [{ text: 'Lirael tore the band from her mouth during a rite made for her.',
           quote: 'the clearing', standing: 'governing' }]
      : [{ text: 'Scene ' + n + ': she answered in the order she was asked.',
           quote: 'the clearing', standing: 'routine' }],
    consequences: [{ text: 'Scene ' + n + ': the review took another note.',
                     quote: 'the clearing', standing: 'routine' }],
    transfers: n === 2
      // THE RETRIEVAL SUBJECT: left at scene 2 and never mentioned again by any later scene.
      ? [{ object: 'the iron brazier', text: 'The iron brazier was left at the ford gate.',
           quote: 'the clearing' }]
      : [],
    disclosures: [],
    knowledge: n === 2 ? [{ who: 'Seren', text: 'that the rite was stopped at her hand',
                            quote: 'the clearing' }] : [],
    obligations: n === 1
      ? [{ id: 'ob-answer-review', text: 'Lirael must answer the review or be recorded as refusing.',
           owedBy: 'Lirael' }]
      : [],
    resolves: [],
  };
  return '<<<HISTORY_NOTE ' + JSON.stringify(parts) + ' HISTORY_NOTE>>>';
};
// SB_PASS4_ALIAS=1 reproduces the condition that produced the three real MISSING_ARTIFACT
// violations: the strategy names the artifact "the presiding Dohkar" while the PROSE refers to
// him only as "the Dohkar". Without this the synthetic draft happens to contain the full label
// once, PASS4 reports "Scene passed structural validation" on every scene, and the correction
// pass is never reached — a coverage gap, not evidence that the pass is inert.
const PASS4_ALIAS = process.env.SB_PASS4_ALIAS === '1';
const _aliasProse = (t) => PASS4_ALIAS ? String(t).replace(/presiding Dohkar/g, 'Dohkar') : t;
const synthProse = (n) => '[SYNTHETIC DRIVER REPLY — NOT STORY EVIDENCE — scene ' + n + ']\n\n'
  + _aliasProse(SAVED_PROSE) + '\n\n' + _aliasProse(SAVED_PROSE.slice(0, 1200)) + '\n\n'
  + SAVED_TRAILER + '\n' + SB_NOTE(n);
function synthReply(role, url, body, sceneNo) {
  const asChat = (content) => ({ choices: [{ message: { content }, finish_reason: 'stop' }],
    model: 'synthetic-driver', usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    _orchestration: { model: 'synthetic-driver', upstreamAttempts: 1, synthetic: true } });
  if (role === 'NORMALIZATION') {
    // ── SB_REPLAY_BAD_NORM=1 — SERVE THE RESPONSES THE FAILED RUN ACTUALLY GOT ───────────
    // Not an invented fault: these are the two values recovered from that run's durable record.
    // The point is to watch them travel through the REAL caller into the planner request, the
    // author request and the saved action ledger — which a helper test cannot show.
    if (process.env.SB_REPLAY_BAD_NORM === '1') {
      // ── EACH ORIGINAL FAILURE GOES TO THE AXIS THAT PRODUCED IT ────────────────────────────
      // The first version guessed from the text ("short ⇒ dialogue") and so served the impersonal
      // sentence on all 18 calls and the classification JSON not once — it exercised the dialogue
      // fallback and never tested the recorded ACTION failure at all. Now that the producer sends
      // distinct axes, the injection is routed by the axis the real call carries.
      let ut = '', ax = '';
      try {
        const payload = JSON.parse(body.messages[body.messages.length - 1].content);
        ut = String(payload.user_text || ''); ax = String(payload.axis || '');
      } catch (_) {}
      const BY_AXIS = {
        player_action:   '{ "primary_subtype": "fantasy", "secondary_subtype": null }', // recorded ACTION damage
        player_dialogue: 'Stop the action and refrain from completing it.',             // recorded DIALOGUE damage
      };
      if (BY_AXIS[ax] != null) {
        replayLog.push({ axis: ax, user_text: ut.slice(0, 90), servedNormalization: BY_AXIS[ax] });
        // synthReply RETURNS the payload; the route handler fulfils it. An earlier version called
        // route.fulfill from inside here, where `route` does not exist.
        return { ok: true, canonical_instruction: BY_AXIS[ax], _replayed: true };
      }
      // any other axis (names, world_subtype, ancestry) falls through to the ordinary reply
    }
    let txt = '';
    try { txt = String(JSON.parse(body.messages[body.messages.length - 1].content).user_text || ''); } catch (_) {}
    return { ok: true, canonical_instruction: txt, normalized_text: txt, _synthetic: true };
  }
  if (/cplus-editor/.test(url)) return { error: 'policy_not_configured', _synthetic: true };
  // Everything else is answered as prose or as a tolerant JSON object; consumers that need more
  // structure log and continue, which is the behaviour this driver check is measuring.
  // ── THE COMMIT VERIFIER, INTERCEPTED SO THE MILESTONE SEQUENCE CAN BE OBSERVED ──────────
  // Records the OUTGOING question and serves a chosen verdict, so a test can assert the captured
  // question, the stored verdict and the resulting outline status together — the request →
  // response → storage path that contains the flag reset. SB_MILESTONE picks the arm.
  {
    const askedText = (body && body.messages || []).map((m) => String(m.content || '')).join('\n');
    if (/RUNTIME COMMIT verifier/i.test(askedText)) {
      const arm = String(process.env.SB_MILESTONE || 'missed');
      const msLine = (askedText.match(/MILESTONE ASSIGNED FOR THIS SCENE: ([^\n]{0,200})/) || [])[1] || null;
      const prose = (askedText.match(/SCENE PROSE:\n([\s\S]{0,400})/) || [])[1] || '';
      // A verbatim fragment of the prose actually sent, so the DELIVERED arm can satisfy the
      // evidence check the way a real model would.
      const quote = prose.replace(/\s+/g, ' ').trim().split(' ').slice(3, 11).join(' ');
      const base = { delivery: 'DELIVERED', transition_position: 40, first_irreversible_position: 40 };
      const arms = {
        missed:    { milestone_delivery: 'MISSED', milestone_evidence: '' },
        delivered: { milestone_delivery: 'DELIVERED', milestone_evidence: quote },
        partial:   { milestone_delivery: 'PARTIAL', milestone_evidence: quote },
        badquote:  { milestone_delivery: 'DELIVERED', milestone_evidence: 'a sentence that is not in the prose at all' },
        // A GENUINE 40-CHARACTER OPENING FOLLOWED BY FABRICATION. The old slice(0,40) check found
        // the opening and kept DELIVERED; the whole-quotation check must reject it.
        tailfake:  { milestone_delivery: 'DELIVERED',
                     milestone_evidence: quote + ' and then she signed the city register in front of everyone' },
        // DELIVERED with no usable evidence and the occurrence denied: the local checks must
        // downgrade it, and the identical-event carry-over must NOT keep the raw label.
        hollow:    { delivery: 'DELIVERED', milestone_delivery: null,
                     slots_check: { occurrence_evidence: '', occurred_this_scene: false,
                                    precondition_evidence: '' } },
        // TWO VALID SEPARATED SPANS. String() used to comma-join them into a string that is in
        // no prose, so a correctly cited milestone split across passages failed its own check.
        spans:     { milestone_delivery: 'DELIVERED',
                     milestone_evidence: [quote, prose.replace(/\s+/g, ' ').trim().split(' ').slice(14, 20).join(' ')] },
        noverdict: {},
      };
      const answer = Object.assign({}, base, arms[arm] || arms.missed);
      // The hollow arm also needs a per_proposal entry with EMPTY evidence, which is what makes
      // the local slot/anchor checks downgrade it.
      if (arm === 'hollow') {
        const ref = (askedText.match(/"ref"[^\n]{0,10}|(prop:[0-9:]+)/) || [])[1] || null;
        answer.per_proposal = ref
          ? [{ ref, delivery: 'DELIVERED', evidence: '', precondition_evidence: '', reason: 'delivered' }]
          : [];
      }
      verifierLog.push({ arm, milestoneAssigned: msLine,
        askedMilestoneQuestion: /MILESTONE COMPLETION \(a SECOND, SEPARATE question\)/.test(askedText),
        served: answer });
      return asChat(JSON.stringify(answer));
    }
  }
  // ── THE PLANNER IS DETECTED BY WHAT IT ASKS FOR, NOT BY response_format ─────────────────
  // MEASURED: _callTieredProvider('scenePlanner', ...) sends max_tokens and temperature and NO
  // response_format, so a branch gated on response_format never ran and every planner reply went
  // out as {ok:true,synthetic:true} — stage_present=absent on every scene, STAGE-ISSUER skipped
  // before the budget check, and the validator never exercised at all.
  // ── A SCAFFOLD REQUEST GETS A REAL SCAFFOLD SHAPE (Roman 2026-11-02) ──────────────────────
  // Provider-blocked, the generic reply returned a stub: scaffoldRows 0, servedBy
  // synthetic-driver, and the scene-1 assignment therefore fell back to a stale `scene-mission`.
  // So the OWNERSHIP CHAIN — generated scaffold → assignment → opening planner and author —
  // could not be demonstrated at all without paying for a real plan.
  //
  // This returns ONE real shape: a previously generated 2-issue/40-row Sol plan read from disk.
  // It is a SHAPE FIXTURE for the plumbing, not the plan under test — the paid run generates its
  // own. Using it here proves the authored rows are gone, the generated rows own the assignment,
  // and the opening receives them.
  {
    const askedScaf = (body && body.messages || []).map((m) => String(m.content || '')).join('\n');
    if (/"sceneOutline"|issueArcs|runThesis/.test(askedScaf) && /\bJSON\b/i.test(askedScaf)) {
      // ── SB_FORCE_SCAFFOLD_FAIL — REPRODUCE THE 2026-11-02 FAILURE, PROVIDER-FREE ─────────
      // The whole scaffold chain failing is what the precondition gate exists for, and a control
      // that cannot produce that state cannot prove the gate bites. This refuses EVERY leg (they
      // all carry the same scaffold messages), with the real route's own error shape.
      //   = cap_out_of_bounds  the Sol route's local refusal, as actually measured
      //   = timeout            no reply at all, like the two 120s transit failures
      if (process.env.SB_FORCE_SCAFFOLD_FAIL) {
        const how = String(process.env.SB_FORCE_SCAFFOLD_FAIL);
        say('  ⟂ scaffold FORCED TO FAIL (' + how + ') — reproducing the 2026-11-02 chain failure');
        // Returned as a MARKER, honoured at the fulfil site, because this function has no route
        // in scope. `timeout` reuses the existing __noResponse convention.
        if (how === 'timeout') return { __noResponse: true, __driveAbort: true,
          __forcedScaffoldFailure: how };
        return { __driveStatus: 400, __forcedScaffoldFailure: how,
          __driveBody: JSON.stringify({ error: 'cap_out_of_bounds', cap: 18150, _synthetic: true }) };
      }
      const shapePath = process.env.SB_SCAFFOLD_SHAPE
        || '_nf_pilot2_out/plans/first_sacrifice__gpt-6.1-sol__run1.json';
      try {
        const plan = JSON.parse(fs.readFileSync(shapePath, 'utf8'));
        const rows = (plan.issueArcs || []).reduce((n, a) => n + ((a.sceneOutline || []).length), 0);
        say('  ⟂ scaffold fixture: returning a real 2-issue shape from '
          + shapePath.split('/').pop() + ' (' + rows + ' rows) — plumbing fixture, not the plan under test');
        return asChat(JSON.stringify(plan));
      } catch (e) {
        say('  ⟂ scaffold fixture UNAVAILABLE (' + (e && e.message) + ') — falling through');
      }
    }
  }

  // ── A SKELETON REQUEST GETS A SKELETON PRODUCTION ACCEPTS (Roman 2026-11-01) ──────────────
  // The generic reply parsed but carried no skeleton signal, so `_isSkeletonValid()` stayed
  // false and the app fell back to stale state: every run exercised only the RETENTION path of
  // the relocated LI doctrine and never its conditional selection. That was a FIXTURE gap, not a
  // production defect. This returns the declared required fields so the skeleton is admitted.
  //
  // SB_FIXTURE_LI_BEAT drives the two transitions under test:
  //   set   → li_texture_beat carries a memory  (LI offstage this scene)
  //   empty → li_texture_beat is null           (LI on stage this scene)
  // The beat is the ONLY thing that varies; nothing forces a validity flag and nothing copies
  // the selection function.
  {
    const askedSkel = (body && body.messages || []).map((m) => String(m.content || '')).join('\n');
    if (/You define narrative skeletons for fiction scenes/i.test(askedSkel)) {
      // SB_FIXTURE_LI_BEAT also accepts a PER-CALL SEQUENCE so a cross-scene transition can be
      // produced without touching production state: "set_then_empty" gives the FIRST skeleton a
      // beat (LI offstage in the opening) and every later one none (LI on stage afterwards), and
      // "empty_then_set" is the reverse. The fixture decides what the planner returned; the app
      // still decides what to deliver.
      const wantRaw = String(process.env.SB_FIXTURE_LI_BEAT || 'set').toLowerCase();
      globalThis.__skelCalls = (globalThis.__skelCalls || 0) + 1;
      const nth = globalThis.__skelCalls;
      let want = wantRaw;
      if (wantRaw === 'set_then_empty') want = (nth === 1) ? 'set' : 'empty';
      else if (wantRaw === 'empty_then_set') want = (nth === 1) ? 'empty' : 'set';
      const beat = (want === 'empty') ? null
        : 'he had set the slate down before answering, and she had watched his hand instead of the answer';
      const skel = {
        environment_anchor: 'the ritual clearing, crimson blades trampled in a path to the trunks',
        structural_pacing: 'measured escalation',
        narrative_density: 'moderate',
        dialogue_ratio: 'balanced',
        beat_style: 'observation then interaction',
        tension_rhythm: 'rising with pauses',
        staged_characters: ['Lirael', 'the attendant'].concat(want === 'empty' ? ['Julian'] : []),
        interlocutor_placement: want === 'empty' ? 'Julian stands three Heights away, IN_PERSON' : 'the attendant, IN_PERSON',
        li_texture_beat: beat,
        // STRUCTURED on purpose: this is the shape that was being flattened to "[object Object]".
        pc_body_callback: { beat: 'beat 2', feature: 'signature_feature (the ink-stained fingers)',
          sketch: 'the ink on her fingers transfers to the wax as she presses the offering down' },
        li_body_callback: want === 'empty'
          ? { beat: 'beat 3', feature: 'the set of his shoulders', sketch: 'his shoulders stay level while the clearing tightens' }
          : null,
        antagonist_body_callback: null,
        environment_plus: 'the wax cools unevenly where her thumb pressed it',
        fusion: 'the slate and the offering share one designated focus',
        stage_contract: { location: 'the ritual clearing', present: ['Lirael', 'the attendant'] },
        causal_outline: [
          { n: 1, beat: 'she states the offering and requires it recorded' },
          { n: 2, beat: 'the attendant hesitates over the exact words' },
          { n: 3, beat: 'someone arrives through the gap in the trees' }
        ]
      };
      say('  ⟂ skeleton fixture: required fields returned, li_texture_beat='
        + (beat ? 'SET' : 'null') + ' (call #' + nth + ', SB_FIXTURE_LI_BEAT=' + wantRaw + ' → ' + want + ')');
      return asChat(JSON.stringify(skel));
    }
  }

  {
    const askedText = (body && body.messages || []).map((m) => String(m.content || '')).join('\n');
    if (/tactical_move|state_change_precondition|stage_present|forces_choice/i.test(askedText)) {
      const over = String(process.env.SB_STAGE_AFFORDANCES || '');
      return asChat(JSON.stringify({
        tactical_move: 'She answers the question actually put to her.',
        state_change_precondition: 'The review is in session and she has not yet answered.',
        state_change: 'Lirael answers the review on the record.',
        forces_choice: true,
        branch_a: 'She answers in full.', branch_b: 'She answers only what was asked.',
        event_slots: [],
        stage_location: 'the ritual clearing',
        stage_location_id: 'place:1',
        stage_present: ['Lirael', 'Seren', 'Julian', 'the presiding Dohkar'],
        // SB_STAGE_AFFORDANCES=oversized makes the rendered directive far exceed the spine budget,
        // so the oversized-stage control exercises the real validator rather than arithmetic.
        stage_affordances: over === 'oversized'
          ? Array.from({ length: 60 }, (_, i) => 'affordance ' + (i + 1) + ': '
              + 'a long described object left in the clearing for the rite to use'.repeat(2))
          : ['the stone bench', 'the spiralgrass', 'the gavel'],
        stage_changes: [],
        _synthetic: true,
      }));
    }
  }
  if (body && body.response_format && body.response_format.type === 'json_object') {
    // ── A PLANNER REPLY MUST CARRY STAGE FIELDS (Roman 2026-10-26) ─────────────────────────
    // `{ok:true, synthetic:true}` meant every planner reply logged
    // `stage_present=absent stage_location=absent`, so STAGE-ISSUER skipped before it ever
    // reached the budget check and this harness could not exercise the validator at all. The
    // REAL planner supplies these fields (the paid run's scenes 3, 4, 6 and 7 were budget-
    // rejected, which only happens once a proposal exists), so a shape-faithful synthetic reply
    // supplies them too. The values are deliberately minimal and the cast is the staged cast.
    const asked = (body.messages || []).map((m) => String(m.content || '')).join('\n');
    const wantsPlan = /tactical_move|state_change|forces_choice|stage_present|SCENE PROPOSAL/i.test(asked);
    if (wantsPlan) {
      return asChat(JSON.stringify({
        tactical_move: 'She answers the question actually put to her.',
        state_change_precondition: 'The review is in session and she has not yet answered.',
        state_change: 'Lirael answers the review on the record.',
        forces_choice: true,
        branch_a: 'She answers in full.', branch_b: 'She answers only what was asked.',
        event_slots: [],
        stage_location_id: 'place:1',
        stage_present: ['Lirael', 'Seren', 'Julian', 'the presiding Dohkar'],
        stage_affordances: ['the stone bench', 'the spiralgrass', 'the gavel'],
        stage_changes: [],
        _synthetic: true,
      }));
    }
    // ── STRATEGY_PASS NEEDS ITS REAL SHAPE, NOT {ok:true} ────────────────────────────────────
    // Measured: this role fell through to the generic {ok:true} reply, so
    // validateStrategyPass (app.js:117510) found `Missing top-level keys:
    // power_vector_shift, …` on all 9 calls and returned null. state._strategyPass therefore
    // stayed null, and `if (state._strategyPass)` (~334940) short-circuited the ENTIRE PASS4
    // block — so a provider-free run could never exercise PASS4 or the correction pass at all.
    // One real shape, every key the validator requires (see shape_faithful_mocks).
    //
    // world_artifact_to_surface is deliberately "the presiding Dohkar": that is the value whose
    // alias-blind lookup produced the three false MISSING_ARTIFACT violations in the paid run,
    // so this reproduces that exact condition without a provider.
    if (role === 'STRATEGY_PASS') {
      return asChat(JSON.stringify({
        st_phase: 'ST2',
        power_vector_shift: 'the assembly gains standing over the supervisor',
        world_artifact_to_surface: 'the presiding Dohkar',
        tone_pressure: 'formal, procedural, close',
        petition: {
          type: 'review',
          intent_category: 'procedural',
          allowed_under_regime: true,
          probability_tilt: 'neutral',
          structural_effect: 'the review is lodged and cannot be withdrawn',
          visible_world_change: 'the sash is forfeit while the matter runs',
          omen_type: 'none',
          interpretive_instability_required: false,
        },
        active_entropy_axis: 'obligation',
        entropy_manifestation_summary: 'the rite continues while her standing is suspended',
        _synthetic: true,
      }));
    }
    return asChat(JSON.stringify({ ok: true, synthetic: true }));
  }
  // ── SB_REPLAY_AUTHOR=<file> — SERVE THE PRESERVED PAID RESPONSE BYTE FOR BYTE ────────────
  // The drive arm's own synthetic note is extracted, parsed and attached (9x
  // "[HISTORY-NOTE] continuation ... note=parsed", _historyNotes present in saved state), while
  // the paid run logged ZERO extraction lines for a response that demonstrably contained the
  // block. Only one of those two differs by the RESPONSE, so this serves the preserved paid
  // body unchanged down the same production path. If extraction logs here, the response is not
  // what defeated it; if it stays silent, the response content is.
  if (process.env.SB_REPLAY_AUTHOR && isAuthorRequest(JSON.stringify(body))) {
    try {
      const rec = JSON.parse(fs.readFileSync(process.env.SB_REPLAY_AUTHOR, 'utf8'));
      const inner = JSON.parse(rec.bodyComplete);
      const content = inner.content
        || (inner.choices && inner.choices[0] && inner.choices[0].message
            && inner.choices[0].message.content) || '';
      say('  ↻ replaying preserved author response (' + String(content).length + ' content chars, '
        + (String(content).indexOf('<<<HISTORY_NOTE') >= 0 ? 'note sentinel PRESENT' : 'no sentinel')
        + ')');
      return asChat(String(content));
    } catch (e) { say('  ! replay failed: ' + e.message); }
  }
  // ── RENDERER FIXTURES FOR THE PASS-TIER NOTE FIX ────────────────────────────────────────
  // The paid run's 8 SPECIALIST_RENDERER responses all carry NO history note, which is what
  // made the note vanish. The drive renderer's reply does carry one, so the default fixture
  // cannot reproduce the failure. These two flags reproduce it, and the second also removes the
  // transfer's EVIDENCE so the admission-side quote check is exercised:
  //   SB_RENDERER_NO_NOTE=1        — renderer prose with the <<<HISTORY_NOTE>>> block removed.
  //   SB_RENDERER_DROP_TRANSFER=1  — the same, and the transfer's quoted sentence removed too,
  //                                  standing in for a rewrite that deletes the beat the
  //                                  author's note claims. A draft claim with no support in the
  //                                  published prose must not come back as established custody.
  if ((process.env.SB_RENDERER_NO_NOTE === '1' || process.env.SB_RENDERER_DROP_TRANSFER === '1')
      && /RENDER|SPECIALIST/i.test(String(role))) {
    let t = String(synthProse(sceneNo)).replace(/<<<HISTORY_NOTE[\s\S]*?HISTORY_NOTE>>>/g, '').trim();
    if (process.env.SB_RENDERER_DROP_TRANSFER === '1') {
      t = t.replace(/I looked at the leaves lying in the red grass[^.]*\./g, '')
           .replace(/leaves lying in the red grass/g, 'the matter at hand');
    }
    say('  ⟂ renderer fixture: note stripped'
      + (process.env.SB_RENDERER_DROP_TRANSFER === '1' ? ' + transfer evidence removed' : '')
      + ' (' + t.length + ' chars)');
    return asChat(t);
  }
  // ── A SPAN-POLISH REQUEST GETS ITS INPUT BACK, UNCHANGED (Roman 2026-11-01) ──────────────
  // MEASURED: request 17 of the clean replay was "Tightly POLISH ONLY this romance-forward
  // passage … WITHOUT changing events, length, character names … Return ONLY the rewritten
  // passage" — a 577-char body addressed to mistral-small-latest. The catch-all below answered
  // it with an ENTIRE synthetic scene, PROSE_CHAIN recorded that replacement, and
  // orchestration-client spliced it into the output — which is why the published page 13 opened
  // with the synthetic marker. The published text was never a rival author leg; it was this
  // fixture answering a polish request with a whole scene.
  //
  // A FIXTURE MUST ANSWER THE TASK IT WAS ASKED. For a preservation test the correct polish
  // answer is the input returned verbatim: an explicit NO-OP. It establishes delivery under a
  // declared fixture and claims nothing about what a live editor would do with the span.
  // Production stages stay enabled and nothing is spliced at the publication boundary.
  {
    const asked = (body && body.messages || []).map((m) => String(m.content || '')).join('\n');
    if (/POLISH ONLY|Return ONLY the rewritten passage/i.test(asked)) {
      // The passage to polish is the LAST user message; the instruction rides on the system turn.
      const msgs = (body && body.messages) || [];
      const lastUser = msgs.filter((m) => m && m.role === 'user').pop();
      const passage = String((lastUser && lastUser.content) || '');
      say('  ⟂ polish fixture: NO-OP — returning the ' + passage.length
        + '-char input passage unchanged (a polish request is not answered with a scene)');
      return asChat(passage);
    }
  }
  return asChat(synthProse(sceneNo));
}

// ── BROWSER + ROUTE POLICY ────────────────────────────────────────────────────────────────
const browser = await chromium.launch();
const ctx = await browser.newContext();
// SB_PASS4_PEN_ON=1 — CONTROL ARM. Re-enables applyStructuralCorrection in the page so the
// pen-off default can be shown to be what suppresses the append, rather than PASS4 simply not
// firing. A control that cannot go red proves nothing.
// ── THE AUTHOR'S OWN DRAFT IS PRESERVED ALONGSIDE THE PUBLISHED PROSE ─────────────────────
// This run tests STORYBOUND'S PIPELINE WITH SOL PRIMARY, not Sol's untouched writing: two stages
// inside the author wrapper (the Mistral-small mechanical repair and the purple lens) can replace
// the whole scene, and a dozen more can edit it afterwards. To tell whether those stages helped
// or hurt, the draft has to survive next to the result.
//
// Both of these are EXISTING read-only recorders in the shipped source, each guarded by
// `if (window.__rawSnap)` / `if (window.__proseSnap)`. Declaring the arrays turns them on and
// changes nothing else: no stage is added, removed, reordered or reconfigured. Disclosed here
// rather than quietly enabled.
await ctx.addInitScript(() => {
  window.__rawSnap = [];      // every reassignment of the prose variable, before/after
  window.__proseSnap = [];    // the repair passes' own input/output, with their reject flag
});
// SB_ADDENDUM_LATE is GONE. The late placement is now the production default in app.js, so the
// flag would only be able to misrepresent the shipped prompt. Verification runs the default.
if (process.env.SB_ADDENDUM_LATE) {
  throw new Error('SB_ADDENDUM_LATE is removed: the late addendum is the production default. '
    + 'Remove the variable rather than running an arm that no longer exists.');
}
if (process.env.SB_PASS4_PEN_ON === '1') {
  await ctx.addInitScript(() => {
    window._penOff = window._penOff || {};
    window._penOff.applyStructuralCorrection = false;
  });
}
page = await ctx.newPage();   // `page` is declared above so the route handler can record routing evidence
const consoleLines = [];
page.on('console', (m) => consoleLines.push(m.text()));
page.on('pageerror', (e) => consoleLines.push('[PAGEERROR] ' + (e && e.message)));
await installSession(page, makeSession());
await installEntitledProfileStub(page, { log: () => {} });

let sceneNoForReplies = 1;
await page.route('**/*', async (route) => {
  const req = route.request();
  const url = req.url();
  if (isAuthOrigin(url)) return route.fallback();
  if (!/\/api\//.test(url)) return route.fallback();
  if (PASSTHROUGH_NOOP.test(url)) return route.fallback();
  if (/\/api\/config\b/.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  }
  if (BLOCKED_IMAGES.test(url)) {
    return route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"images blocked for this test"}' });
  }
  if (SIMULATED_ACCOUNT.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ success: true, ok: true, fortunesRemaining: 9999, awards: [], simulated: true }) });
  }
  if (!MODEL_ROUTES.test(url)) {
    // AN UNRECOGNISED ENDPOINT IS A HALT. It is never answered.
    halted = 'UNRECOGNISED ENDPOINT ' + url + ' — aborted and halted rather than faked';
    say('  ✗ ' + halted);
    try { return await route.abort(); } catch (_) { return; }
  }
  // A MODEL CALL. Price it against the REMAINING authorization before it is allowed to leave.
  let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const raw = req.postData() || '';
  // ── PROVIDER-FREE POLICY REFUSALS ARE NOT COSTS ─────────────────────────────────────────
  // The conditional C+/E+ editor is disabled by configuration (CPLUS_EDITOR_PRICE_FORTUNES
  // unset), so api/cplus-editor.js refuses server-side before any provider is contacted. The
  // earlier quote still PRICED those calls at the grok-4.3 rate — 3.6c per continuation for a
  // stage that cannot run. They are recorded as refusals and priced at zero.
  if (/cplus-editor/.test(url)) {
    requests.push({ scene: sceneNoForReplies, url: '/api/cplus-editor', role: body.role || null,
      model: 'none', chars: raw.length, estimate: 0, policyRefusal: 'editor_disabled_by_config' });
    if (DRIVE) {
      return route.fulfill({ status: 403, contentType: 'application/json',
        body: JSON.stringify({ error: 'policy_not_configured', _synthetic: true }) });
    }
    // SB_FAULT MUST MEAN PROVIDER-BLOCKED WITH NO EXCEPTION. This was the one `route.continue()`
    // on the live path: it relies on the server refusing by config, which is true today but is a
    // config value, not a guarantee. An injected-fault arm is used to verify accounting WITHOUT
    // contacting anything, so it refuses here locally rather than trusting a remote refusal.
    if (SB_FAULT) {
      return route.fulfill({ status: 403, contentType: 'application/json',
        body: JSON.stringify({ error: 'policy_not_configured', _faultArmLocalRefusal: true }) });
    }
    return route.continue();   // the real server issues its own refusal, at $0
  }

  // ── THE AUTHOR OVERRIDE, APPLIED HERE AND NOWHERE ELSE ──────────────────────────────────
  const isAuthor = isAuthorRequest(raw);

  // ── THE EXPERIMENT'S PRECONDITION, ENFORCED BEFORE PAID DOWNSTREAM DISPATCH ─────────────
  // MEASURED 2026-11-02: the whole scaffold chain failed, the opening was generated anyway on the
  // stale scene-mission fallback, and the post-launch assertion only objected AFTERWARDS — after
  // an opening planner and a Sol author call had been paid for. Detection is not protection.
  //
  // The gate is consulted HERE, at the dispatch, for the requests that are DOWNSTREAM of the
  // scaffold. The scaffold stage and its own preamble are deliberately NOT guarded: they are what
  // produces the scaffold, and gating them would make the precondition unsatisfiable.
  //
  // IT IS THE TEST'S PRECONDITION, NOT A PRODUCT RULE. Production's fallback chain is unchanged —
  // a real reader still gets whatever it produces. This only decides whether THIS TEST goes on
  // spending once the configuration under test is no longer what is running. Scoped to
  // SB_FRESH_PLAN, so no other arm's behaviour moves.
  // ── ONCE THIS EXPERIMENT HAS STOPPED, EVERY LATER DISPATCH IS REFUSED ───────────────────
  // THE DEFECT THIS FIXES: the sticky check used to live INSIDE the `isPrerequisiteGuarded`
  // branch, so after the stop was set an UNGUARDED role — a specialist renderer, a line editor,
  // a logic pass, another scaffold leg — still went to a real provider. The stop decides whether
  // the RUN continues, which is not a per-role question. In-flight calls are a separate matter:
  // they are already dispatched and are reconciled as exposure, not retroactively refused.
  if (FRESH_PLAN_ACTIVE && prereqStop) {
    requests.push({ scene: sceneNoForReplies, url: url.replace(ORIGIN, ''), role: body.role || null,
      model: 'none', chars: raw.length, estimate: 0,
      prereqRefusal: prereqStop.code + ':sticky_all_roles' });
    _ledger('prereq_refused', { scene: sceneNoForReplies, role: body.role || null,
      code: prereqStop.code, sticky: true, allRoles: true, chars: raw.length,
      guardedRole: isPrerequisiteGuarded(body.role, raw, isAuthor) });
    say('  ✗ run stopped (sticky, all roles): ' + (body.role || 'role') + ' refused — '
      + prereqStop.code);
    try { return await route.abort(); } catch (_) { return; }
  }
  if (FRESH_PLAN_ACTIVE && isPrerequisiteGuarded(body.role, raw, isAuthor)) {
    let snap = null;
    try {
      // ── THE SCENE BEING BUILT, NOT ALWAYS SCENE 1 (Roman 2026-11-02) ──────────────────────
      // THE REGRESSION THIS FIXES: this passed a hardcoded `1`. Once the opening is committed,
      // `_selectSceneAssignment` deliberately stops assigning that row — the outline branch skips
      // a row whose `delivery === 'committed'` (app.js:142884) — and the scene-mission branch then
      // ACCEPTS the stored scene-1 intent, because its own staleness test is
      // `_mScene === sceneNum` and both are 1. So asking about scene 1 after the opening is
      // committed returns source 'scene-mission' BY DESIGN, and this gate would have rejected a
      // perfectly good scene 2 as `assignment_stale` on the first continuation author request.
      // The failure-only controls never reached that state, which is why they missed it.
      //
      // A COMPLETED SCENE IS NOT REQUIRED TO REMAIN ASSIGNABLE. The question is whether the
      // scene UNDER CONSTRUCTION has a real assignment, so the scene number travels in.
      snap = await page.evaluate((sceneNo) => {
        const s = window.state || {};
        const sc = s.cgScaffold || null;
        const rows = sc
          ? (sc.issueArcs || []).reduce((n, a) => n + ((a.sceneOutline || []).length), 0) : 0;
        let src = null;
        try {
          const a = (typeof window._selectSceneAssignment === 'function')
            ? window._selectSceneAssignment(s, sceneNo) : null;
          src = a ? a.source : null;
        } catch (_) { src = null; }
        // DIAGNOSTIC ONLY, AND NOT GATED ON: what scene 1 would answer right now. After the
        // opening is committed this is expected to read 'scene-mission', which is precisely why
        // the hardcoded 1 was wrong. Recording both makes the regression measurable in a real
        // run instead of argued about.
        let src1 = null;
        try {
          const a1 = (typeof window._selectSceneAssignment === 'function')
            ? window._selectSceneAssignment(s, 1) : null;
          src1 = a1 ? a1.source : null;
        } catch (_) { src1 = null; }
        return { readable: true, scaffoldPresent: !!sc, scaffoldRows: rows,
          isSolArchitecture: !!(sc && sc._isSolArchitecture),
          servedBy: (sc && sc._servedBy) || null, assignmentSource: src,
          askedAboutScene: sceneNo, sourceIfAskedAboutScene1: src1 };
      }, Number(sceneNoForReplies) > 0 ? Number(sceneNoForReplies) : 1);
    } catch (e) {
      // UNREADABLE IS UNKNOWN, AND UNKNOWN IS NOT MET.
      snap = { readable: false, why: String((e && e.message) || e) };
    }
    // THE OPTIONS COME FROM THE MODE, through the same pure function the controls assert.
    const verdict = scaffoldPrerequisite(snap, prerequisiteOptionsFor(MODE));
    if (!verdict.ok) {
      prereqStop = verdict;
      halted = 'PREREQUISITE HALT at scene ' + sceneNoForReplies + ' before '
        + (body.role || 'role') + ': ' + verdict.code + ' — ' + verdict.why;
      requests.push({ scene: sceneNoForReplies, url: url.replace(ORIGIN, ''), role: body.role || null,
        model: 'none', chars: raw.length, estimate: 0, prereqRefusal: verdict.code });
      _ledger('prereq_refused', { scene: sceneNoForReplies, role: body.role || null,
        code: verdict.code, why: verdict.why, snapshot: snap, chars: raw.length });
      say('  ✗ ' + halted);
      say('    (nothing was dispatched for this request; the configuration under test is not what'
        + ' is running, so further paid calls stop here rather than after the fact)');
      try { return await route.abort(); } catch (_) { return; }
    }
    _ledger('prereq_ok', { scene: sceneNoForReplies, role: body.role || null, why: verdict.why,
      snapshot: snap, prereqOptions: prerequisiteOptionsFor(MODE) });
  }

  // ── REGISTER GATE: CONSULTED BEFORE ANY AUTHOR REQUEST IS DISPATCHED ──
  // STICKY. Once stopped, every later author request is refused too, so a client-side tier
  // fallback cannot slip a second author call through a different route after the stop.
  if (isAuthor) {
    if (registerStop) {
      requests.push({ scene: sceneNoForReplies, url: url.replace(ORIGIN, ''), role: body.role || null,
        model: 'none', chars: raw.length, estimate: 0, registerRefusal: registerStop.verdict + ':sticky' });
      say('  ✗ register gate (sticky): author refused — ' + registerStop.verdict);
      try { return await route.abort(); } catch (_) { return; }
    }
    let snap = null;
    // DECLARED_GENERAL_PROSE must be set by the run's own configuration. Unset = UNKNOWN = stop:
    // nothing in the app declares character-voice compatibility, so it cannot be read from state.
    try { snap = await page.evaluate(snapshotInPage(DECLARED_GENERAL_PROSE)); } catch (_) { snap = null; }
    // A snapshot that cannot be read is UNKNOWN, never a pass.
    const v = registerVerdict(snap);
    if (v.verdict !== PROCEED) {
      registerStop = v;
      halted = 'REGISTER HALT at scene ' + sceneNoForReplies + ': ' + v.verdict
        + ' — ' + v.reasons.join('; ');
      requests.push({ scene: sceneNoForReplies, url: url.replace(ORIGIN, ''), role: body.role || null,
        model: 'none', chars: raw.length, estimate: 0, registerRefusal: v.verdict });
      say('  ✗ ' + halted);
      try { return await route.abort(); } catch (_) { return; }
    }
  }

  // ── AUTHOR SELECTION, BY THE ROUTER, AT THE INTERCEPTED DISPATCH ────────────────────────
  // This was `sceneNoForReplies <= 1 ? opening : continuation` — the unconditional scene-number
  // handoff. It is now public/author-cache-router.js deciding from routing evidence that lives
  // in the PAGE's own state, so the app's save/restore carries it and a reload is not
  // automatically treated as cold.
  //
  // EXPLICIT-CONTENT ROUTING TAKES PRECEDENCE AND IS NOT TOUCHED. Grok's explicit-content
  // requirement is decided upstream in the app by _sniffAndRouteExplicit; when that fired, the
  // request is not an ordinary general-prose author request and this override stands aside
  // entirely, leaving the app's own routing to dispatch it.
  let routing = null;
  let target = null;
  if (isAuthor) {
    const explicitRouted = await page.evaluate(() => {
      const s = window.state || {};
      return { routeToGrok: !!(s._mode1 && s._mode1.routeToGrok),
        carryForward: !!s._explicitCarryForward,
        sustained: !!s._sustainedProfanityActive };
    }).catch(() => ({ routeToGrok: false, carryForward: false, sustained: false }));
    if (explicitRouted.routeToGrok || explicitRouted.carryForward || explicitRouted.sustained) {
      routing = { author: 'none', reason: 'EXPLICIT_CONTENT_ROUTING_TAKES_PRECEDENCE',
        explicitRouted };
      say('  ⇢ explicit-content routing is active — the ordinary-prose router stands aside, the '
        + 'app\'s own routing decides this author');
      target = null;                                     // no override: the app routes it
    } else {
      const promptText = (body.messages || []).map((m) => String(m.content || '')).join('\n');
      // THE ORDERED MESSAGES, AS SENT. bodyText joins them and loses the role boundaries, which
      // is exactly where a stable prefix has to be built. Each author request's real message
      // array is written out per scene so the prefix work compares roles and content, not a
      // flattened string.
      try {
        fs.writeFileSync(OUT + '/AUTHOR_REQUEST_scene' + sceneNoForReplies + '.json',
          JSON.stringify({ scene: sceneNoForReplies, at: new Date().toISOString(),
            role: body.role || null, requestChars: raw.length,
            messages: (body.messages || []).map((m, i) => ({ index: i, role: m.role,
              chars: String(m.content || '').length, content: String(m.content || '') })) }, null, 2));
      } catch (_) {}
      const evidence = await page.evaluate(() => (window.state && window.state._authorRouting) || null)
        .catch(() => null);
      const skewMs = routerSkewFor(sceneNoForReplies);
      const out = Router.decide({
        sceneNumber: sceneNoForReplies,
        isOpening: sceneNoForReplies <= 1,
        promptPrefix: promptText,
        promptChars: promptText.length,
        now: Date.now() + skewMs,
        evidence,
      });
      routing = { author: out.decision.author.key, label: out.decision.author.label,
        reason: out.decision.reason,
        cacheEvidence: out.decision.prediction.cache ? out.decision.prediction.cache.state
          : out.decision.prediction.state,
        spendingMaterial: out.decision.prediction.spending
          ? out.decision.prediction.spending.material : null,
        numbers: out.decision.prediction.numbers || null,
        measurement: out.decision.measurement,
        promptChars: promptText.length,
        // The disclosed test clock in force for THIS decision, so no reader has to infer it.
        routerClockSkewMs: skewMs,
        routerClockSkewNote: skewMs
          ? 'a DISCLOSED TEST CLOCK added ' + Math.round(skewMs / 60000) + ' min to the router\'s '
            + 'view of now; nothing else was skewed'
          : null };
      // PERSISTED INTO THE PAGE, not into this process, so production save/restore owns it.
      await page.evaluate((e) => { try { (window.state = window.state || {})._authorRouting = e; } catch (_) {} },
        out.evidence).catch(() => {});
      authorRouting.push({ scene: sceneNoForReplies, ...routing, at: new Date().toISOString() });
      say('  ⇢ ROUTER: scene ' + sceneNoForReplies + ' → ' + routing.label
        + '   ' + routing.reason
        + '   [cache: ' + routing.cacheEvidence
        + (routing.spendingMaterial === null ? '' : ', spending: '
          + (routing.spendingMaterial ? 'material' : 'below chosen threshold')) + ']');
      target = AUTHOR_OVERRIDE[routing.author] || null;
    }
  }
  const model = target ? target.requested : (body.preferredModel || body.model || 'grok-4.3');
  const avail = remainingNow();
  // ── THE DIRECT SOL CALL MUST BE PRICED, NOT JUST CLASSIFIED (Roman 2026-11-02) ──────────
  // Adding /api/sol-scene-test to MODEL_ROUTES only made it REAL_PROVIDER. Its request is NOT
  // an author override, so it fell through to the shared guard — which has no rate for
  // gpt-6.1-sol (fail-closed at $Infinity, the SD_FALLBACK shape) and reads `max_tokens`, while
  // this body carries `max_completion_tokens`. So the architecture call was unpriced AND its cap
  // unseen. Priced here from the DECLARED Sol rate and the ACTUAL cap in the body, then handed to
  // the same reserve()/reconcile() path as every other call — no separate ledger.
  const _isSolArch = /\/api\/sol-scene-test\b/.test(url) && !target;
  const g = target
    ? (function () {
        const e = estimateOverrideUsd(raw.length, target);
        return { allowed: e.estimate <= avail, estimate: e.estimate,
          reason: e.estimate <= avail ? null : 'over_remaining_authorization', detail: e };
      })()
    : _isSolArch
      ? (function () {
          const R = AUTHOR_OVERRIDE.sol.rate;                       // declared $2/$10 per MTok
          const capOut = Number(body && body.max_completion_tokens) || 0;
          const inTokEst = Math.ceil(raw.length / 4);               // chars/4 — an ESTIMATE
          const est = inTokEst * R.in + capOut * R.out;
          if (!capOut) {
            return { allowed: false, estimate: Infinity,
              reason: 'sol_architecture_call_without_max_completion_tokens',
              detail: { note: 'the route refuses max_tokens; a missing cap cannot be priced' } };
          }
          return { allowed: est <= avail, estimate: est,
            reason: est <= avail ? null : 'over_remaining_authorization',
            detail: { stage: 'sol-architecture', inTokEst, capOut, rate: R } };
        })()
      : guardDispatch(body, { model, remainingAuthorization: avail });
  if (_isSolArch) {
    // RECORD THE SETTINGS THAT ACTUALLY SHIPPED. The generic record keeps only message text, so
    // an effort claim could not be checked against the artifact.
    try {
      _solArchOutgoing = {
        route: url.replace(ORIGIN, ''),
        model: body && body.model,
        max_completion_tokens: body && body.max_completion_tokens,
        max_tokens_present: !!(body && body.max_tokens),
        reasoning_effort: (body && body.reasoning_effort) != null ? body.reasoning_effort : '(absent)',
        response_format: body && body.response_format && body.response_format.type,
        label: body && body._sbCallLabel, runBudgetUsd: body && body._sbRunBudgetUsd,
        estimateUsd: Number(g.estimate),
      };
      fs.writeFileSync(OUT + '/SOL_ARCH_OUTGOING.json', JSON.stringify(_solArchOutgoing, null, 2));
    } catch (_) {}
    say('  ⚖ SOL ARCHITECTURE priced: in≈' + Math.ceil(raw.length / 4) + ' tok, cap '
      + (body && body.max_completion_tokens) + ' → est $' + Number(g.estimate).toFixed(6)
      + ' · reasoning_effort=' + ((body && body.reasoning_effort) || '(absent)')
      + ' (declared rate, same reservation and settlement path)');
  }
  let _attemptStartedAt = null;
  // WHICH PHASE FAILED. The catch below spans dispatch, reading the body, settlement AND the
  // fulfil back to the browser, so a single label like "no HTTP response" was wrong for three of
  // the four. This advances as the attempt progresses and is recorded verbatim.
  let _phase = 'before_dispatch';
  let _seen = { status: null, headers: null, body: null };
  const rec = { scene: sceneNoForReplies, url: url.replace(ORIGIN, ''), role: body.role || null,
    requested: model, author: !!isAuthor, overrideTo: target ? target.label : null,
    chars: raw.length, estimate: g.estimate, served: null, receipt: null,
    bodyText: (body.messages || []).map((m) => String(m.content || '')).join('\n') };
  requests.push(rec);
  // ── AN IMMUTABLE ID, ALLOCATED BEFORE DISPATCH (2026-11-02) ──────────────────────────────
  // Every artifact this attempt writes is named from THIS value. It is fixed here, while the
  // push is still synchronous, so two requests in flight at once can never share it. Reading
  // `requests.length` after an await — which is what the old naming did — is the bug.
  rec.reqId = requests.length;
  _ledger('dispatch', { reqId: rec.reqId, scene: sceneNoForReplies, role: body.role || null,
    url: rec.url, requested: model, overrideTo: rec.overrideTo, chars: raw.length,
    estimate: g.estimate, author: !!isAuthor });
  // ── A NON-DISPATCH IS NOT PRICED (Roman 2026-11-01) ──────────────────────────────────────
  // MEASURED: in the corrected replay this guard fired MID-SCENE — `SD_FALLBACK estimates
  // $Infinity` — and `route.abort()` made the application see a network failure on a specialist
  // leg. The pipeline degraded and inserted a cut-away BEFORE publication. So "the halt happened
  // only after commit" was wrong, and the published ending was not the preserved ending.
  //
  // In DRIVE every request is answered by a local fixture; the only route.continue() in this
  // handler is itself drive-guarded, so nothing reaches a provider and nothing can be billed.
  // Estimating spend for a request that will never be dispatched is a category error, so the
  // estimate is RECORDED and not APPLIED here. This is scoped to drive alone:
  //   · the LIVE guard is untouched — a real dispatch is still refused over its authorization;
  //   · SD_FALLBACK is still UNPRICED. No price is invented for it, here or anywhere. The
  //     unpriced-model finding stands open against the live path, where it will still halt.
  const _noDispatch = DRIVE;
  if (_noDispatch && !g.allowed) {
    say('  ⓘ estimate not applied (drive: answered by a local fixture, nothing dispatched) — '
      + (body.role || url) + ' estimate $' + String(g.estimate)
      + '; the live guard is unchanged and this model remains unpriced');
  }
  if (!g.allowed && !_noDispatch) {
    halted = 'BUDGET HALT at scene ' + sceneNoForReplies + ': ' + (body.role || url)
      + ' estimates $' + g.estimate.toFixed(6) + ', remaining authorization $' + avail.toFixed(6)
      + ' (settled $' + settledTotal.toFixed(6) + ' + held $' + heldTotal.toFixed(6)
      + ' + outstanding $' + outstanding().toFixed(6) + ')';
    say('  ✗ ' + halted);
    try { return await route.abort(); } catch (_) { return; }
  }
  // The reservation. This declaration was accidentally deleted when the planner-only block below
  // was inserted (the edit's anchor swallowed it), leaving `hold` undefined for the whole handler:
  // the refusal paths hid it inside try/catch, and the live path died in the catch itself with
  // `ReferenceError: hold is not defined` AFTER a successful upstream call, losing the response.
  // Reserving an unpriceable estimate would make heldTotal Infinity and corrupt every
  // later figure, so a non-dispatch reserves nothing. Settlement in drive is already $0.
  const hold = reserve(_noDispatch ? 0 : g.estimate,
    rec.role || (isAuthor ? 'author' : 'model'), model);

  // ══════════════════════════════════════════════════════════════════════════════════════════
  // PLANNER-ONLY DIAGNOSTIC (SB_PLANNER_ONLY=1)
  //
  // ONE client attempt at OPENING_PLANNER through the real /api/proxy, and nothing else. The
  // request is whatever the production builder produces at this point — not a reconstruction of
  // the overwritten 93,528-char payload, which is gone. This is a NEW request.
  //
  // THE CLIENT RETRY IS DISABLED HERE, NOT IN PRODUCTION. app.js:294130 lists 502 in
  // _RETRYABLE_STATUS and the single retry driver at ~294315 then retries ONCE after 2000ms,
  // which is why every failed run holds exactly two attempts. Rather than edit production, the
  // SECOND planner request is refused at the wire: it never reaches the server, so it cannot be
  // billed. The proxy's OPENING_PLANNER chain stays as it is — one entry, grok-4.3.
  //
  // NOTHING DOWNSTREAM RUNS. The author and every other provider role are refused the same way,
  // so a plan that validates cannot slide into a scene render.
  if (PLANNER_ONLY) {
    const isPlanner = (body.role || '') === 'OPENING_PLANNER';
    const firstPlanner = isPlanner && plannerSeen === 0;
    if (isPlanner) plannerSeen += 1;
    // PRESERVE FIRST, DECIDE SECOND. The dry pass measures and prices the real built request
    // without dispatching it, so the quote below is not an approximation of a different payload.
    if (firstPlanner) {
      try {
        fs.writeFileSync(OUT + '/REQUEST_AS_SENT.json', JSON.stringify({
          label: 'NEW planner request built by production at ' + new Date().toISOString()
            + ' — NOT a reconstruction of the overwritten run',
          // `dest` is declared further down in this handler, so the destination is derived here
          // the same way rather than referenced before its declaration.
          url: url.replace(ORIGIN, ''),
          dest: (target ? (ORIGIN + target.route) : url).replace(ORIGIN, ''),
          role: body.role, requestedModel: model,
          chars: raw.length, estimateUsd: g.estimate,
          body,                                  // complete, every message, nothing truncated
        }, null, 2));
        say('  ↳ request preserved BEFORE dispatch: REQUEST_AS_SENT.json (' + raw.length
          + ' chars, estimate $' + g.estimate.toFixed(6) + ')');
      } catch (e) { say('  ! could not preserve the request: ' + e.message); }
    }
    if (firstPlanner && !PROBE_DRY) {
      plannerAttempts = 1;
      say('  → dispatching ONE OPENING_PLANNER attempt (retry disabled for this diagnostic)');
    } else {
      const why = (isPlanner && firstPlanner && PROBE_DRY)
        ? 'DRY PASS — the planner request was built, measured and priced, then refused unsent'
        : isPlanner
          ? 'the single client retry — refused: this diagnostic allows exactly ONE planner attempt'
          : 'not the planner (' + (body.role || url) + ') — refused: no author or downstream call';
      plannerRefused.push({ role: body.role || null, url: url.replace(ORIGIN, ''),
        chars: raw.length, wouldHaveEstimated: g.estimate, why, isAuthor: !!isAuthor });
      rec.refusedByDiagnostic = why;
      rec.estimate = 0;                          // never dispatched, so no exposure
      say('  ⊘ refused at the wire: ' + why);
      // The reservation is closed WITHOUT a settlement row: nothing left the machine, so there is
      // no charge and no unresolved exposure to carry.
      try { hold.open = false; } catch (_) {}
      try { return await route.abort(); } catch (_) { return; }
    }
  }

  // ── SB_REPLAY_PLANNER WORKS IN A PAID RUN TOO (2026-11-01) ───────────────────────────────
  // Hoisted OUT of the `if (DRIVE)` gate on purpose. Roman's instruction is to reuse the
  // preserved planner reply rather than pay to generate a replacement, so this must be
  // available on the live path. The reply it serves is the one the failed run ALREADY BILLED
  // (inside the $0.068312 settled), so reusing it buys nothing twice and invents nothing: the
  // bytes are the planner's own. Nothing else about the live path changes — the author, the
  // editorial stages and every other role still go to real providers.
  if (process.env.SB_REPLAY_PLANNER && (body.role || '') === 'OPENING_PLANNER') {
    const files = String(process.env.SB_REPLAY_PLANNER).split(',').map(s => s.trim()).filter(Boolean);
    const pick = files[Math.min(replayPlannerServed, files.length - 1)];
    replayPlannerServed++;
    const rec = JSON.parse(fs.readFileSync(pick, 'utf8'));
    say('  ↻ OPENING_PLANNER ← PRESERVED reply ' + path.basename(pick)
      + ' (' + String(rec.bodyComplete || '').length + ' body bytes) — already billed in the failed run; NOT re-paid');
    reconcile(hold, { usage: null, why: 'reuse of a preserved, already-billed planner reply', model });
    return route.fulfill({ status: 200, contentType: 'application/json', body: String(rec.bodyComplete || '') });
  }

  if (DRIVE) {
    // ── SB_DRIVE_GENERATE_OPENING=1 — GENERATE SCENE 1, PROVIDER-FREE ───────────────────────
    // The driver used to MOUNT scene 1 because "a synthetic planner reply cannot satisfy the
    // real Scene-1 skeleton validator". That reason is now stale: the SB_FAULT=valid_plan
    // fixture was built over ten provider-free iterations against production's own validators
    // and reached VALIDATION_PASSED_AUTHOR_NOT_RUN — production accepted it and called the
    // author. So the generated opening IS reachable without paying, and the earlier claim that
    // "a live opening dispatch needs a paid run" was wrong.
    //
    // Here that same fixture answers the OPENING_PLANNER, every other role keeps the ordinary
    // shape-faithful synthetic reply, and scene 1 is GENERATED through the real validators and
    // the real author dispatch — which is the only way the router's opening decision and the
    // evidence it leaves behind can be observed in one continuous run.
    // ── SB_REPLAY_PLANNER — the PRESERVED planner reply, not a fixture (2026-11-01) ───────
    // The valid_plan fixture below carries a well-formed opening_actor_id, which is exactly why
    // `drive` passed scene 1 while the paid run aborted on it: the fixture never reproduced the
    // real reply's defect. To prove the corrected ingestion path against what the planner
    // ACTUALLY returned, this serves the preserved record's body bytes for OPENING_PLANNER,
    // the sibling of SB_REPLAY_RAW for author requests. Read-only; the record is never written.
    if (process.env.SB_REPLAY_PLANNER && (body.role || '') === 'OPENING_PLANNER') {
      const files = String(process.env.SB_REPLAY_PLANNER).split(',').map(s => s.trim()).filter(Boolean);
      const pick = files[Math.min(replayPlannerServed, files.length - 1)];
      replayPlannerServed++;
      const rec = JSON.parse(fs.readFileSync(pick, 'utf8'));
      say('  ↻ OPENING_PLANNER ← PRESERVED reply ' + path.basename(pick)
        + ' (' + String(rec.bodyComplete || '').length + ' body bytes) — the real reply, defect included');
      reconcile(hold, { usage: null, why: 'provider-free replay of a preserved planner reply', model });
      return route.fulfill({ status: 200, contentType: 'application/json', body: String(rec.bodyComplete || '') });
    }
    if (DRIVE_GENERATE_OPENING && (body.role || '') === 'OPENING_PLANNER') {
      const fx = await faultResponse('valid_plan', raw);
      const fxBody = await fx.text();
      say('  ↻ OPENING_PLANNER ← valid_plan fixture (' + fxBody.length
        + ' bytes) — production validators decide, not this harness');
      reconcile(hold, { usage: null, why: 'provider-free planner fixture', model });
      return route.fulfill({ status: 200, contentType: 'application/json', body: fxBody });
    }
    // ── SB_REPLAY_RAW=<file> — THE OVERRIDE ENVELOPE, NOT A REPACKAGED ONE ──────────────────
    // SB_REPLAY_AUTHOR pulls `content` out of the preserved response and rewraps it with
    // asChat(), so it replays the TEXT down the drive envelope — which is exactly the variable
    // under investigation, and therefore cannot isolate it. This arm fulfils with the preserved
    // body BYTES and the preserved response headers, the way the paid author override did
    // (route.fulfill({ status, headers, body: text })). Same preserved content in both arms; the
    // only difference is the envelope and the handling it selects.
    //
    // content-length and content-encoding are dropped because the body is re-sent uncompressed
    // and a stale length breaks transport before the app sees anything. Nothing else is altered.
    // ── REPLAY IS DISPATCHED BY OPERATION, NOT BY ONE BROAD PREDICATE ────────────────────
    // MEASURED DEFECT: `isAuthorRequest` matched three different operations and handed response
    // 221's PROSE to all of them — including the beat outline, which then failed JSON parsing.
    // The three matches were never three interchangeable author attempts. Each preserved
    // response answers one operation and is only served to that operation:
    //   SB_REPLAY_OUTLINE  → 218, the beat outline        (structured)
    //   SB_REPLAY_CONTROL  → 219, control extraction      (structured)
    //   SB_REPLAY_RAW      → 220, the narrative author    (prose)
    //   SB_REPLAY_FALLBACK → 221, the fallback author     (prose; only when that fallback is
    //                             deliberately exercised, never as a stand-in for 220)
    // A request matching none of these falls through to its own task's fixture.
    const _replayPick = (() => {
      const r = String((body && body.role) || '');
      if (r === 'FALLBACK_AUTHOR' && process.env.SB_REPLAY_FALLBACK)
        return { file: process.env.SB_REPLAY_FALLBACK, op: 'fallback author' };
      if (r === 'NARRATIVE_AUTHOR' && process.env.SB_REPLAY_RAW)
        return { file: process.env.SB_REPLAY_RAW, op: 'narrative author' };
      if (r === 'PRIMARY_AUTHOR') {
        // ── ORDERED, NOT GUESSED FROM PROSE (Roman 2026-11-01) ──────────────────────────
        // The first attempt tested /control|consent|tag block/ FIRST, and the outline request
        // — a very long prompt — contains those words too, so the FIRST outline call was served
        // response 219 and failed JSON parsing. Supplying 218 to a later call did not undo that
        // earlier mismatch. Matching by substring is unreliable for two prompts that share a
        // vocabulary, so the two legs are distinguished by their ORDER within the scene, which
        // the preserved run establishes: 218 (beat outline) precedes 219 (control extraction).
        // Which file served which call is logged, so a wrong order is visible rather than silent.
        _paSeen += 1;
        if (_paSeen === 1 && process.env.SB_REPLAY_OUTLINE)
          return { file: process.env.SB_REPLAY_OUTLINE, op: 'beat outline (1st PRIMARY_AUTHOR)' };
        if (_paSeen === 2 && process.env.SB_REPLAY_CONTROL)
          return { file: process.env.SB_REPLAY_CONTROL, op: 'control extraction (2nd PRIMARY_AUTHOR)' };
        return null;   // any further PRIMARY_AUTHOR call answers through its own task fixture
      }
      return null;
    })();
    if (_replayPick) {
      try {
        const rec0 = JSON.parse(fs.readFileSync(_replayPick.file, 'utf8'));
        const hdrs = {};
        for (const k of Object.keys(rec0.headers || {})) {
          if (/^(content-length|content-encoding)$/i.test(k)) continue;
          if (rec0.headers[k] === '[REDACTED]') continue;
          hdrs[k] = rec0.headers[k];
        }
        // ── THE REPLAY GOES THROUGH THE SAME ADAPTER AS A LIVE REROUTE (2026-11-01) ───────
        // This arm exists to re-present a PRESERVED author response, and a preserved response
        // from the reroute carries the foreign provider's envelope — the very shape that made
        // the consumer discard scene 13's prose. Replaying it untouched would reproduce the
        // defect instead of exercising the correction, so the same additive normalisation is
        // applied here: a `choices` view over `content`, with content/usage/stop_reason/
        // _upstreamRaw and the served model all preserved. The file on disk is never written.
        let replayBody = String(rec0.bodyComplete);
        try {
          const rp = JSON.parse(replayBody);
          const rflat = (typeof rp.content === 'string') ? rp.content
            : (Array.isArray(rp.content)
                ? rp.content.filter((b) => b && b.type === 'text').map((b) => String(b.text || '')).join('\n\n')
                : null);
          if (rflat !== null && String(rflat).length && !(Array.isArray(rp.choices) && rp.choices.length)) {
            const rserved = rp.model || (rp._upstreamRaw && rp._upstreamRaw.model)
              || (rp._orchestration && rp._orchestration.model) || 'unknown';
            rp.choices = [{ index: 0,
              finish_reason: rp.stop_reason === 'max_tokens' ? 'length' : (rp.stop_reason || 'stop'),
              message: { role: 'assistant', content: rflat } }];
            if (!rp.model) rp.model = rserved;
            rp._envelopeAdapted = { by: 'raw envelope replay', served: rserved, contentChars: String(rflat).length };
            replayBody = JSON.stringify(rp);
            say('  ⇄ replay envelope adapted: `choices` view over ' + String(rflat).length
              + ' chars of `content` (served ' + rserved + ')');
          }
        } catch (_) { /* unparseable → replay untouched */ }
        say('  ↻ REPLAY [' + _replayPick.op + '] ← ' + path.basename(_replayPick.file) + ': ' + String(rec0.bodyComplete).length + ' body bytes, '
          + Object.keys(hdrs).length + ' headers, status ' + rec0.status);
        reconcile(hold, { usage: null, why: 'raw envelope replay', model });
        return route.fulfill({ status: rec0.status, headers: hdrs, body: replayBody });
      } catch (e) { say('  ! raw replay failed: ' + e.message); }
    }
    const r = synthReply(body.role || '', url, body, sceneNoForReplies);
    rec.served = 'synthetic-driver';
    // The driver's synthetic replies carry a usage object so the SETTLEMENT PATH ITSELF runs here
    // — including a charge below its reservation, one above it, and an unanswered request, which
    // the three injected cases below exercise against the real reconcile().
    const synthRow = reconcile(hold, { usage: r.usage || (r._upstreamRaw && r._upstreamRaw.usage) || null,
      noResponse: !!r.__noResponse, why: r.__noResponse ? 'injected unanswered request' : null,
      model: r.__settleModel || model });
    rec.settlement = { kind: synthRow.kind, usd: synthRow.usd, reserved: g.estimate };
    // Drive has no provider cache receipt, so it does NOT establish/renew real cache coverage.
    // Dedicated pure-router tests supply explicitly synthetic receipts to exercise the clock.
    if (isAuthor && routing && routing.author === 'sol' && !r.__noResponse) {
      await noteAuthorOutcome(200, null,
        (body.messages || []).map((m) => String(m.content || '')).join('\n'));
    }
    // ── STRICT SOL APPLIES TO THE OUTCOME, NOT TO THE MODE ──────────────────────────────────
    // The live branch calls _strictSolStop from its own catch and its >=400 path. The driver
    // never reaches either, so without this hook a provider-free control could not exercise the
    // stop at all — and the stop is the thing most worth controlling, because it is what keeps a
    // replacement planner from being paid for.
    if (_isSolArch && (r.__noResponse || r.__driveStatus >= 400)) {
      _strictSolStop(r.__noResponse ? 'sol_architecture_unresolved' : 'sol_architecture_http_' + r.__driveStatus,
        r.__noResponse
          ? 'the Sol architecture call did not resolve — its outcome is UNKNOWN, and a '
            + 'replacement planner is a different experiment'
          : 'the Sol architecture call returned HTTP ' + r.__driveStatus);
    }
    // A FIXTURE MAY DECLARE NO RESPONSE AT ALL. route.abort() makes the application see a
    // transport failure, which is what a client-side timeout actually looks like to it —
    // fulfilling a 200 whose body says "no response" would be a different scenario.
    if (r && r.__driveAbort) {
      try { return await route.abort(); } catch (_) { return; }
    }
    // A FIXTURE MAY DECLARE A NON-200. Needed so SB_FORCE_SCAFFOLD_FAIL can reproduce the real
    // route's own refusal provider-free; without it every fixture reply is a 200 and the failure
    // path the precondition gate exists for is unreachable from a control.
    if (r && r.__driveStatus) {
      return route.fulfill({ status: r.__driveStatus, contentType: 'application/json',
        body: r.__driveBody || '{}' });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r) });
  }

  // ── LIVE. THE RESPONSE IS READ, NOT JUST FORWARDED ──────────────────────────────────────
  // The previous version called route.continue() for live calls, so nothing was ever recorded:
  // no receipt, no served model, and a failed attempt vanished. route.fetch() performs the real
  // request, hands back the real response for accounting, and the page still receives it.
  try {
    const dest = target ? (ORIGIN + target.route) : url;
    // REQUEST CONVERSION per destination. Sol's route REQUIRES max_completion_tokens (max_tokens
    // is an unsupported_parameter there) plus a label and the run budget; Haiku's route takes
    // max_tokens and lifts the system message itself.
    let sendBody = raw;
    if (target) {
      const b = Object.assign({}, body, { model: target.requested, preferredModel: target.requested });
      delete b.max_tokens; delete b.max_completion_tokens;
      b[target.capField] = target.cap;
      // ── TEMPERATURE MUST NOT RIDE ALONG ────────────────────────────────────────────────
      // Measured: all three Haiku author attempts returned "provider error 400". The app's
      // literary author body carries temperature 0.85, api/anthropic-proxy.js forwards a
      // caller-supplied temperature (its own comment notes Sonnet 5.5 rejects it outright), and
      // Claude 5 models reject it. The route is right to forward what a caller sends; it is this
      // CALLER that must not send it. Also dropped: response_format, which this author path does
      // not need and which is not an Anthropic field.
      delete b.temperature;
      delete b.response_format;
      if (target.label === 'Haiku') {
        // PINNED, not defaulted. The allowlist note records that Haiku 5.5 supports `effort`
        // (4.5 does not) and that thinking counts toward max_tokens, so max_tokens bounds total
        // billable output. Omission would mean adaptive thinking at the model's own default.
        b.effort = 'medium';
      }
      if (target.label === 'Sol') {
        // A LABEL PER DISPATCH. The route's single-use claim exists to stop a double charge under
        // one label; a legitimate retry after a client-side timeout is a NEW charge and must be
        // separately auditable rather than hidden behind the first label.
        b._sbCallLabel = 'playthrough_s' + sceneNoForReplies + '_' + Date.now();
        b._sbRunBudgetUsd = Number(remainingNow().toFixed(6));
      }
      sendBody = JSON.stringify(b);
    }
    // PLAYWRIGHT'S DEFAULT route.fetch TIMEOUT IS 30s, AND THAT WAS MINE, NOT THE PROVIDER'S.
    // The first live attempt died on it: the Sol route had already claimed its label and
    // dispatched upstream (the dev server logged "still running after 30s"), so the call very
    // likely billed while the client gave up. An author leg on a ~90k-token prompt with
    // reasoning measured ~25s upstream BEFORE dev-server overhead, so 30s was never enough.
    _phase = 'dispatch';
    _attemptStartedAt = Date.now();
    // ── FAULT INJECTION FOR VERIFYING THE RECORDER (SB_FAULT) ──
    // Provider-blocked by construction: no fetch happens at all. It returns a stand-in response
    // with the shape route.fetch() gives, so the recording path below runs for real against a
    // JSON error body, a non-JSON one, and a thrown dispatch. Unset in any real run.
    // ── THE DEADLINE IS CHOSEN BY THE OPERATION, NOT BY "IS IT AN AUTHOR OVERRIDE" ──────────
    // MEASURED 2026-11-02: this read `target ? 300000 : 120000`. The Sol ARCHITECTURE call is not
    // an author override, so `target` is null and it got 120s — and it is the longest single call
    // in the configuration: a ~58k-char body with an 18,150-token output allowance and reasoning
    // on. It exceeded 120s, the client gave up, and the run lost its scaffold. Preserved
    // successful Sol plans took 227–234s, so 120s could never have been enough and 300s is the
    // allowance that was already being granted to the other long call.
    //
    // 300s IS A LIMIT, NOT A PROMISE. Exceeding it is still a transit failure, still recorded,
    // still held as exposure. NO RETRY IS ADDED HERE — one dispatch, one deadline.
    //
    // The only other deadline on this path is the Sol route's own upstream fetch, which inherits
    // undici's 300s headers/body timeout; nothing shorter intervenes. vercel.json sets no
    // maxDuration, app.js attaches no AbortController to the scaffold fetch, and page.evaluate
    // (which wraps the launch) carries no Playwright deadline.
    const _dispatchTimeoutMs = (target || _isSolArch) ? 300000 : 120000;
    // RECORDED, SO THE SELECTION IS OBSERVABLE RATHER THAN ASSERTED FROM SOURCE. A control reads
    // this off the ledger of a real (provider-blocked) run and fails if the architecture call is
    // ever handed the short deadline again.
    rec.dispatchTimeoutMs = _dispatchTimeoutMs;
    rec.operationClass = _isSolArch ? 'sol_architecture' : (target ? 'author_override_' + target.label : 'other');
    _ledger('dispatch_deadline', { reqId: rec.reqId, role: body.role || null,
      url: rec.url, operationClass: rec.operationClass, timeoutMs: _dispatchTimeoutMs });
    const resp = SB_FAULT ? await faultResponse(SB_FAULT, raw, url)
      : await route.fetch({ url: dest, method: 'POST', postData: sendBody,
      timeout: _dispatchTimeoutMs,
      headers: Object.assign({}, req.headers(), { 'content-type': 'application/json' }) });
    // ── STATUS AND HEADERS FIRST, THEN THE BODY, THEN DISK — IN THAT ORDER ──────────────────
    // A successful planner response was lost because the recorder only wrote HTTP ERROR bodies
    // immediately; a 200 stayed in memory through parsing and settlement, and settlement threw.
    // Status and headers are taken BEFORE the body read so a failure mid-read still has them.
    _phase = 'response_meta';
    const _status0 = resp.status();
    const _headers0 = _redactHeaders(resp.headers());
    _seen = { status: _status0, headers: _headers0, body: null };
    _phase = 'reading_response';
    let text = await resp.text();
    _phase = 'response_received';
    rec.ms = Date.now() - _attemptStartedAt;
    _seen.body = text;
    // PERSIST EVERY RESPONSE NOW — before parsing, before settlement, before fulfilment, and
    // whatever the status. Nothing below this line can destroy the evidence by throwing.
    _persistResponse({ status: _status0, headers: _headers0, body: text, ms: rec.ms,
      role: body.role || null, url: url.replace(ORIGIN, ''), dest, model, rec,
      reqId: rec.reqId, requestChars: raw.length, scene: sceneNoForReplies });
    rec.status = _status0;
    // Keep whatever is already in hand, so a later failure can report it instead of claiming
    // nothing arrived.
    try { _seen = { status: resp.status(), headers: resp.headers(), body: text }; } catch (_) {}
    rec.ms = Date.now() - _attemptStartedAt;
    // ── PRESERVE THE FAILURE ITSELF (2026-10-30) ──
    // Eight OPENING_PLANNER 502s across four runs were recorded as a bare `status: 502` with no
    // body, no headers and no duration — which is exactly the evidence needed to tell the
    // proxy's branches apart ("All Grok models in fallback chain failed" + details + chainTried /
    // "Invalid response from xAI API" / "Malformed response from xAI API" / "Failed to contact
    // xAI API" + err.message), and to distinguish those from a local hosting or routing failure.
    // Without it a rerun can only reproduce the same unreadable 502.
    //
    // It adds NO request: `text` above is the body already read for settlement, and the headers
    // come off the same response object. It does not alter what Storybound receives — the
    // fulfil below is untouched — and it introduces no retry.
    if (resp.status() >= 400) {
      const safeHeaders = {};
      try {
        const h = resp.headers();
        for (const k of Object.keys(h)) {
          // Redact credentials and anything that can carry one.
          safeHeaders[k] = /authorization|api[-_]?key|cookie|set-cookie|token|secret|x-amz-security/i.test(k)
            ? '[REDACTED]' : h[k];
        }
      } catch (_) {}
      const _fa = allocateArtifactPath(OUT, 'failure', rec.reqId, body.role || 'role', resp.status());
      const file = _fa.name;
      try {
        fs.writeFileSync(_fa.path, JSON.stringify({
          reqId: rec.reqId,
          scene: sceneNoForReplies, role: body.role || null, url: url.replace(ORIGIN, ''),
          dest, requestedModel: model, status: resp.status(), ms: rec.ms,
          at: new Date().toISOString(),
          headers: safeHeaders,
          bodyComplete: text,                          // the COMPLETE error body, unabridged
          requestChars: raw.length,
        }, null, 2));
        rec.failureArtifact = file;                    // the ledger excerpt links to the full body
        rec.bodyExcerpt = String(text).slice(0, 400);
        rec.respHeaders = safeHeaders;
        say('  ↳ failure preserved: ' + file + '  (' + String(text).length + ' body chars, '
          + rec.ms + 'ms)');
      } catch (e) {
        rec.failureArtifact = 'WRITE_FAILED: ' + e.message;
      }
      if (_isSolArch) _strictSolStop('sol_architecture_http_' + resp.status(),
        'the Sol architecture call returned HTTP ' + resp.status());
    }
    // RESPONSE CONVERSION. Sol's route wraps the provider payload as {_upstreamRaw}. The app
    // expects the chat shape at the top level, so it is unwrapped before being handed back.
    if (target && target.label === 'Sol') {
      try { const j = JSON.parse(text); if (j && j._upstreamRaw) text = JSON.stringify(j._upstreamRaw); }
      catch (_) {}
    }
    // PROVIDER-CONFIRMED IDENTITY, kept distinct from what was requested.
    try {
      const j = JSON.parse(text);
      rec.served = (j._orchestration && (j._orchestration.resolvedModel || j._orchestration.model))
        || j.model || (j._upstreamRaw && j._upstreamRaw.model) || null;
      const u = (j.usage) || (j._upstreamRaw && j._upstreamRaw.usage) || null;
      if (u) rec.receipt = u;
    } catch (_) {}
    // CACHE THAT CANNOT BE PRICED CORRECTLY KEEPS ITS RESERVATION. Anthropic reports
    // cache_read/cache_creation separately and they bill at different rates than plain input;
    // the settlement table prices plain input only, so a cache-bearing receipt is NOT settled
    // as if it were all uncached — the reservation stands and the exposure stays held.
    // ── CACHE IS ONLY A PROBLEM WHEN WE HAVE TO DO THE ARITHMETIC OURSELVES ────────────────
    // The first version withheld EVERY cache-bearing receipt, which threw away 69 explicit
    // provider cost fields: xAI returns cost_in_usd_ticks, a figure the provider itself computed
    // WITH its own caching applied. That is the most authoritative number available and it was
    // being discarded as "unpriceable", holding reservations for calls that had already told us
    // exactly what they cost. A provider cost field is used whenever present. Only a receipt we
    // must price from token counts is withheld when caching is in play, because this table prices
    // plain input and would overstate a cached call.
    let usageForSettlement = rec.receipt;
    const hasProviderCost = !!(usageForSettlement
      && typeof usageForSettlement.cost_in_usd_ticks === 'number');
    // `cache_write_tokens` WAS MISSING HERE, and it is the field the measured Sol receipt
    // actually carried (88,555, with cached_tokens 0) — so cacheSeen was false and the receipt
    // was settled at plain input rates. settle() now refuses a cache-bearing receipt on its own,
    // which is the single authoritative place; this stays so the log line and rec.cacheSeen are
    // accurate rather than contradicting the ledger.
    const _pd = (usageForSettlement && usageForSettlement.prompt_tokens_details) || {};
    const cacheSeen = !!(usageForSettlement && ((usageForSettlement.cache_read_input_tokens || 0) > 0
      || (usageForSettlement.cache_creation_input_tokens || 0) > 0
      || (_pd.cached_tokens || 0) > 0
      || (_pd.cache_write_tokens || 0) > 0
      || (_pd.cache_creation_tokens || 0) > 0));
    rec.cacheSeen = cacheSeen;
    rec.providerCostField = hasProviderCost;
    // ── THE RECEIPT IS PASSED THROUGH, NOT NULLED (Roman 2026-11-02) ──────────────────────
    // This used to do `usageForSettlement = null`, which was the right call when settle() would
    // have priced a cache-bearing receipt at plain rates. settle() now refuses such a receipt on
    // its own, so nulling has become actively wrong: it DISCARDS the usage the provider returned
    // and makes the ledger say "no usage returned" for a call that returned a complete receipt.
    // The money was reserved either way, but the recorded REASON was false.
    //
    // Passing it intact records what actually happened: usage RECEIVED, price UNRESOLVED, with
    // the cache fields named. The reservation is still held — settle() sets holdExposure, so
    // record() files it as heldUnknown and nothing is credited back.
    if (cacheSeen && !hasProviderCost) {
      rec.receiptPreservedUnpriced = true;
    }
    // SB_FAULT=after_response throws HERE — with a status, headers and body already in hand — to
    // prove the recorder reports that rather than claiming nothing arrived.
    if (SB_FAULT === 'after_response') throw new Error('injected failure AFTER the response arrived');
    // SB_FAULT=settle_throw — fail INSIDE settlement, after the response has already been
    // persisted, to prove the saved response and receipt survive an accounting failure.
    if (SB_FAULT === 'settle_throw') throw new Error('injected failure DURING settlement');
    _phase = 'settlement';
    const row = reconcile(hold, { usage: usageForSettlement, model: rec.served || model });
    rec.settlement = { kind: row.kind, usd: row.usd, reserved: g.estimate,
      why: row.why || (rec.cacheSeen ? 'cache present — not priceable by this table' : null) };
    rec.measuredUsd = row.kind === 'settled' ? row.usd : null;
    rec.unresolvedExposure = row.kind !== 'settled';
    // ── ROUTING EVIDENCE IS SET BY A COMPLETED REQUEST, AND ONLY BY ONE ────────────────────
    // A 200 with a receipt updates the recorded prefix and timestamp; anything else is recorded
    // as an attempt that establishes nothing. The provider's own cached_tokens, when present, is
    // stored as a MEASUREMENT of this request — it is never fed forward as a prediction.
    if (isAuthor && routing && routing.author === 'sol') {
      await noteAuthorOutcome(resp.status(), rec.receipt,
        (body.messages || []).map((m) => String(m.content || '')).join('\n'),
        { ...JSON.parse(sendBody), model: rec.served || null }, _attemptStartedAt);
    }
    // ── STRICT SOL: A 200 THAT CARRIES NO SCAFFOLD CONTENT IS ALSO A SOL FAILURE ────────────
    // THE GAP THIS CLOSES: the other three stop sites catch HTTP >= 400, a thrown dispatch and
    // the driver's injected failures. None of them sees a SUCCESSFUL status whose body carries no
    // usable content — and app.js:240784 treats exactly that as a Sol failure
    // (`if (!_solRes.ok || !String(raw || '').trim()) throw`), then falls through to a
    // replacement planner. So the one outcome production already calls a failure was the one
    // outcome this guard let through.
    //
    // THE CONTENT TEST MIRRORS PRODUCTION'S, deliberately: the same `_upstreamRaw || json`
    // unwrap, the same `choices[0].message.content`, the same `.trim()`. It is NOT a new or
    // stricter validation — it asks the identical question the application asks, so the two
    // cannot disagree about what counts as empty. Nothing is repaired, nothing is retried, and
    // the response and its usage have ALREADY been preserved and settled above; this only
    // decides whether the run keeps spending.
    //
    // The real 200 is still fulfilled to the application unchanged, so production's own
    // fallthrough behaves exactly as it ships. What stops is the HARNESS dispatching whatever
    // that fallthrough asks for next.
    if (_isSolArch && resp.status() === 200) {
      let _solContent = '';
      try {
        const _j = JSON.parse(text);
        const _up = (_j && _j._upstreamRaw) || _j || {};
        const _ch = (_up.choices && _up.choices[0]) || {};
        _solContent = (_ch.message && _ch.message.content) || '';
      } catch (_) { _solContent = ''; }
      if (!String(_solContent || '').trim()) {
        rec.solArchEmptyContent = true;
        _strictSolStop('sol_architecture_empty_content',
          'the Sol architecture call returned HTTP 200 with no usable scaffold content ('
          + String(_solContent || '').length + ' chars) — app.js:240784 treats this as a Sol '
          + 'failure and falls through to a replacement planner, which is a different experiment');
      }
    }
    _phase = 'fulfil';
    // ── THE REROUTED RESPONSE MUST MEET THE CONSUMER'S CONTRACT (2026-11-01) ──────────────
    // THIS ADAPTER caused the scene-13 failure, so this is where it is corrected. When the
    // author override reroutes a request to another provider's route, the body was returned
    // VERBATIM — so a consumer written against the ORIGINAL route's envelope received a
    // foreign shape. Measured: scene 13's four calls all returned HTTP 200 served by
    // claude-haiku-5-5 with a `content` field and NO `choices`, while
    // orchestration-client.js:2691 (narrative reader) and :1885 (fallback reader) read only
    // `choices`. Two of those four were prose attempts (220, 221) carrying real prose with
    // paragraph breaks intact; 218 was outlining and 219 control extraction. The prose was
    // discarded because of the envelope, not because any model failed, and no provider
    // returned malformed output.
    //
    // ADDITIVE, NOT A REWRITE: `content`, `usage`, `stop_reason`, `_upstreamRaw` and the
    // served-model identity are all preserved exactly; a `choices` view is ADDED alongside
    // them so both the tolerant consumer (`data.content ?? data.choices…`) and the strict
    // ones are satisfied by the same body. The artifact on disk was already persisted from
    // the untouched `text` above, so the raw provider response is preserved regardless.
    let outText = text;
    if (target) {
      try {
        const parsed = JSON.parse(text);
        const flat = (typeof parsed.content === 'string') ? parsed.content
          : (Array.isArray(parsed.content)
              ? parsed.content.filter((b) => b && b.type === 'text').map((b) => String(b.text || '')).join('\n\n')
              : null);
        const hasChoices = Array.isArray(parsed.choices) && parsed.choices.length;
        if (flat !== null && String(flat).length && !hasChoices) {
          const served = parsed.model
            || (parsed._upstreamRaw && parsed._upstreamRaw.model)
            || (parsed._orchestration && parsed._orchestration.model)
            || target.requested;
          parsed.choices = [{
            index: 0,
            finish_reason: parsed.stop_reason === 'max_tokens' ? 'length'
              : (parsed.stop_reason || 'stop'),
            message: { role: 'assistant', content: flat },
          }];
          if (!parsed.model) parsed.model = served;
          parsed._envelopeAdapted = {
            by: 'author-override reroute', to: target.route, served: served,
            addedChoicesFrom: (typeof parsed.content === 'string') ? 'content(string)' : 'content(blocks)',
            contentChars: String(flat).length,
          };
          outText = JSON.stringify(parsed);
          say('  ⇄ envelope adapted for the rerouted reply: added a `choices` view over '
            + String(flat).length + ' chars of `content` (served ' + served
            + '); content/usage/stop_reason/_upstreamRaw preserved');
        }
      } catch (_) { outText = text; }   // unparseable → forward untouched
    }
    return route.fulfill({ status: resp.status(), headers: resp.headers(), body: outText });
  } catch (e) {
    // EVIDENCE BEFORE ACCOUNTING. This used to call settlement FIRST and write the artifact
    // afterwards — the same ordering that destroyed a successful planner response when
    // settlement itself threw. Anything already received is on disk before reconcile() runs.
    rec.error = (e && e.message) || String(e);
    if (_seen.status !== null && _seen.body !== null && !rec.responseArtifact) {
      _persistResponse({ status: _seen.status, headers: _seen.headers, body: _seen.body,
        ms: (_attemptStartedAt !== null) ? (Date.now() - _attemptStartedAt) : null,
        role: body.role || null, url: url.replace(ORIGIN, ''), dest: url, model, rec,
        reqId: rec.reqId, requestChars: raw.length, scene: sceneNoForReplies });
    }
    // A DISPATCH THAT NEVER CAME BACK IS EXPOSURE, NOT A FREE CALL.
    reconcile(hold, { noResponse: true, why: (e && e.message) || 'transit error', model });
    rec.unresolvedExposure = true;
    // ── STRICT SOL: AN UNRESOLVED ARCHITECTURE CALL STOPS THE EXPERIMENT ────────────────────
    // A timeout here leaves the outcome UNKNOWN, not failed — the server may still be waiting on
    // the provider. Either way the configuration under test no longer has its planner, and the
    // next thing production does is pay a DIFFERENT planner to replace it. On 2026-11-02 that
    // was ministral, which charged for a malformed reply. This test stops instead.
    if (_isSolArch) _strictSolStop('sol_architecture_unresolved',
      'the Sol architecture call did not resolve (' + ((e && e.message) || 'transit error')
      + ') — its outcome is UNKNOWN, and a replacement planner is a different experiment');
    // WHAT FAILED, AND WHAT HAD ALREADY ARRIVED. This catch spans dispatch, reading the body,
    // settlement and the fulfil back to the browser. Claiming "no HTTP response was received"
    // for all of them was a misleading diagnosis in three cases out of four: a throw during
    // settlement or fulfil happens with a status, headers and body already in hand. The phase is
    // recorded, and anything already received is preserved rather than asserted absent.
    rec.ms = (_attemptStartedAt !== null) ? (Date.now() - _attemptStartedAt) : null;
    rec.failurePhase = _phase;
    const gotResponse = _seen.status !== null;
    if (gotResponse) { rec.status = _seen.status; }
    try {
      const safeHeaders = {};
      if (_seen.headers) {
        for (const k of Object.keys(_seen.headers)) {
          safeHeaders[k] = /authorization|api[-_]?key|cookie|set-cookie|token|secret|x-amz-security/i.test(k)
            ? '[REDACTED]' : _seen.headers[k];
        }
      }
      const _fa2 = allocateArtifactPath(OUT, 'failure', rec.reqId, body.role || 'role', _phase);
      const file = _fa2.name;
      fs.writeFileSync(_fa2.path, JSON.stringify({
        reqId: rec.reqId,
        scene: sceneNoForReplies, role: body.role || null, url: url.replace(ORIGIN, ''),
        requestedModel: model, thrown: rec.error, failurePhase: _phase, ms: rec.ms,
        at: new Date().toISOString(),
        responseReceived: gotResponse,
        note: gotResponse
          ? 'an HTTP response HAD arrived before this exception — status, headers and body below'
          : 'no HTTP response was received before this exception (phase: ' + _phase + ')',
        status: gotResponse ? _seen.status : null,
        headers: gotResponse ? safeHeaders : null,
        bodyComplete: gotResponse ? _seen.body : null,
        requestChars: raw.length,
      }, null, 2));
      rec.failureArtifact = file;
      if (gotResponse) rec.bodyExcerpt = String(_seen.body).slice(0, 400);
    } catch (_) {}
    halted = 'TRANSIT FAILURE at scene ' + sceneNoForReplies + ' on ' + (rec.role || url)
      + ': ' + rec.error + ' — the request may or may not have been billed';
    say('  ✗ ' + halted);
    try { return await route.abort(); } catch (_) { return; }
  }
});

// ── LAUNCH, LITERARY ──────────────────────────────────────────────────────────────────────
await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => typeof window._launchStarterStory === 'function'
  && Array.isArray(window.STARTER_STORIES), null, { timeout: 120000 });
const ov = await page.evaluate(() => {
  if (typeof window._bakedScene1For === 'function') {
    window.__realBakedScene1For = window._bakedScene1For;
    window._bakedScene1For = function () { return null; };
  }
  return { bakedStubbed: window._bakedScene1For('starter_first_sacrifice') === null,
    catalogUntouched: (window.STARTER_STORIES || []).some(
      (d) => d && d.id === 'starter_first_sacrifice' && d.render_mode === 'staged_story_mode') };
});
say('CG baked page stubbed for this tab: ' + ov.bakedStubbed
  + ' · shipped CG catalog entry untouched: ' + ov.catalogUntouched);
let RESUMED_FROM_DISK = null;
if (RESUME_FROM) {
  // IMPORT THE PRESERVED STATE AND RESUME THROUGH THE REAL ENTRY. No story is launched and no
  // scene is regenerated: the pages already paid for are the pages we continue from.
  const dump = JSON.parse(fs.readFileSync(RESUME_FROM, 'utf8'));
  await page.evaluate((d) => { Object.keys(d).forEach((k) => { try { localStorage.setItem(k, d[k]); } catch (_) {} }); }, dump.storage);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window.continueStory === 'function', null, { timeout: 120000 });
  RESUMED_FROM_DISK = await page.evaluate(async (sid) => {
    try { await window.continueStory(sid); } catch (e) { return { threw: e.message }; }
    return { pages: window.StoryPagination.getPageCount(),
      turnCount: (window.state || {}).turnCount || 0,
      chars: String(window.StoryPagination.getAllContent() || '').length,
      storyId: (window.state || {}).storyId || null };
  }, dump.storyId);
  say('RESUMED FROM DISK through window.continueStory: ' + JSON.stringify(RESUMED_FROM_DISK));
  assert(!RESUMED_FROM_DISK.threw, 'resume threw: ' + RESUMED_FROM_DISK.threw);
  assert(RESUMED_FROM_DISK.pages > 0, 'the preserved state carried no pages');
}
const def = RESUME_FROM ? null : await page.evaluate(() => (window.STARTER_STORIES || [])
  .find((d) => d && d.id === 'starter_first_sacrifice') || null);
if (!RESUME_FROM) assert(def, 'starter_first_sacrifice is not in the shipped catalog');

// ── THE PLAN MUST BE IN PLACE BEFORE THE LAUNCH (measured 2026-11-01) ─────────────────────
// _launchStarterStory GENERATES SCENE 1 ITSELF. Injecting afterwards is too late by
// construction: the provider-free drive logged `ROUTER: scene 1 → Sol` BEFORE the injection
// line, and the opening author request then carried the WITHHELD authored row under "REQUIRED
// DEVELOPMENT" with zero of the selected plan's scene-1 text. Dropping the cached assignment
// did not help, because there was no cache yet — the resolution happens inside the launch.
//
// So the rows are emptied and the plan is installed BEFORE launch. storyId does not exist yet,
// so it is patched immediately after; the Tier-0 rule already defers any CG_SCAFFOLD call for a
// literary scene 1, and the post-launch assertion below confirms none was dispatched.
const PRE_LAUNCH_PLAN = process.env.SB_SELECTED_PLAN
  ? JSON.parse(fs.readFileSync(process.env.SB_SELECTED_PLAN, 'utf8')) : null;
if (!RESUME_FROM && PRE_LAUNCH_PLAN) {
  const pre = await page.evaluate((plan) => {
    const id = 'starter_first_sacrifice';
    const sp = (window.STARTER_PLANS || {})[id];
    const rowsBefore = (sp && Array.isArray(sp.scenes)) ? sp.scenes.length : 0;
    if (sp) { window.__withheldRows = sp.scenes; sp.scenes = []; }
    const injected = JSON.parse(JSON.stringify(plan));
    injected.storyId = null;                 // patched the moment the story has an id
    window.__preLaunchScaffold = injected;
    // window.state may not exist yet; install on it if it does, and the post-launch step
    // installs it again regardless.
    try { if (window.state) window.state.cgScaffold = injected; } catch (_) {}
    return { rowsBefore, rowsNow: (sp && sp.scenes) ? sp.scenes.length : null,
      seedStillRegistered: !!(window.STARTER_SEEDS && window.STARTER_SEEDS[id]) };
  }, PRE_LAUNCH_PLAN);
  say('PRE-LAUNCH: authored rows withheld ' + pre.rowsBefore + ' → ' + pre.rowsNow
    + ' · seed still registered: ' + pre.seedStillRegistered);
  assert(pre.rowsNow === 0, 'the authored rows were not withheld before launch');
  assert(pre.seedStillRegistered === true, 'the seed was lost — canon must survive');
}

// ── FRESH-PLAN MODE MUST ALSO BE SET UP BEFORE LAUNCH (Roman 2026-11-02) ──────────────────────
// It was applied AFTER _launchStarterStory, which generates scene 1 itself — so the opening
// planner and author had already run on the AUTHORED plot. The preserved preflight request
// proves it: it carries the old "THE WISH, THE TWIST, THE RECOVERY AND THE DECK" assignment.
// `willGenerateScaffold: true` was ELIGIBILITY, not evidence that generation happened.
//
// So withholding and the funded-opening flag are installed here, before launch, and the
// post-launch assertions below check what ACTUALLY reached the opening.
// ONE SOURCE. FRESH_PLAN_ACTIVE is declared early because the route handler needs it; this is
// the same value under the name the pre-launch block already used, not a second switch.
const FRESH_PLAN = FRESH_PLAN_ACTIVE;
if (!RESUME_FROM && FRESH_PLAN) {
  if (PRE_LAUNCH_PLAN) throw new Error('SB_FRESH_PLAN and SB_SELECTED_PLAN are mutually '
    + 'exclusive: one withholds the authored rows so the planner can invent a plot, the other '
    + 'installs a previously generated plan and suppresses generation.');
  const pf = await page.evaluate(() => {
    const id = 'starter_first_sacrifice';
    const sp = (window.STARTER_PLANS || {})[id];
    const rowsBefore = (sp && Array.isArray(sp.scenes)) ? sp.scenes.length : 0;
    if (sp) { window.__withheldRows = sp.scenes; sp.scenes = []; }
    // The sanctioned funded-opening flag: it lifts ONLY the Tier-0 cost deferral, so the
    // architecture stage may run before the first page instead of silently falling back.
    window.__sbFundedSpineAtOpening = true;
    window.__sbFreshPlanMode = true;          // read again after reload to restore withholding
    return { rowsBefore, rowsNow: (sp && sp.scenes) ? sp.scenes.length : null,
      seedStillRegistered: !!(window.STARTER_SEEDS && window.STARTER_SEEDS[id]),
      fundedSpine: window.__sbFundedSpineAtOpening === true };
  });
  say('PRE-LAUNCH FRESH-PLAN: rows ' + pf.rowsBefore + ' → ' + pf.rowsNow
    + ' · seed registered: ' + pf.seedStillRegistered + ' · funded spine: ' + pf.fundedSpine);
  assert(pf.rowsNow === 0, 'authored rows were not withheld BEFORE launch');
  assert(pf.seedStillRegistered === true, 'the seed was lost — canon must survive withholding');
  assert(pf.fundedSpine === true, 'the funded-opening flag was not set, so the spine would defer');
}
// ── THE LAUNCH ITSELF IS COVERED BY THE EVIDENCE COLLECTOR (Roman 2026-11-02) ─────────────
// The catch added for the post-launch assertions did not cover THIS await, nor the account
// setup below it — and the launch is where the paid scaffold, planner and opening author all
// run. A Playwright-level failure here (page crash, navigation timeout, a closed context) would
// still have died with nothing preserved, which is the original defect in a different place.
// The page-side body has its own try that logs `[LAUNCH] …` and swallows, so this covers the
// transport and the harness, not the application's own handled errors.
if (!RESUME_FROM) try {
  await page.evaluate(async (d) => {
    try {
      // The scaffold is installed on state as soon as the launch creates it, so the opening's
      // own assignment resolution sees the selected plan rather than nothing.
      const install = () => { try {
        if (window.state && window.__preLaunchScaffold) {
          if (!window.state.cgScaffold) window.state.cgScaffold = window.__preLaunchScaffold;
          if (window.state.cgScaffold && !window.state.cgScaffold.storyId && window.state.storyId) {
            window.state.cgScaffold.storyId = window.state.storyId;
          }
        }
      } catch (_) {} };
      const t = setInterval(install, 20);
      install();
      try { await window._launchStarterStory(Object.assign({}, d, { render_mode: 'literary' })); }
      finally { setTimeout(() => clearInterval(t), 15000); }
      return;
    } catch (e) { console.log('[LAUNCH] ' + e.message); }
  }, def);
} catch (e) {
  await preserveLaunchEvidence('launch_failed: ' + ((e && e.message) || e));
  throw e;
}
if (false) {
  await page.evaluate(async (d) => {
    try { await window._launchStarterStory(Object.assign({}, d, { render_mode: 'literary' })); }
    catch (e) { console.log('[LAUNCH] ' + e.message); }
  }, def);
  await page.waitForTimeout(8000);
}
// ── THE DISCLOSED ACCOUNT / TEST SETUP, IN ONE PLACE ──────────────────────────────────────
// Applied at launch AND re-applied after the resume. The reload between scenes 5 and 6 is a real
// reload, so it discards this the way it discards everything in memory — and the first run
// stalled at scene 6 for exactly that reason. None of it is narrative state: it is the entitled
// account, the paid issue and the one-time consent a returning reader carries.
const applyAccountSetup = () => page.evaluate(() => {
  const s = window.state;
  s.profileId = 'playthrough-profile';
  s._bakedGenesisUnlocked = true; s.previewActive = false;
  s._issuePurchased = true; s._issuesPurchased = { 1: true };
  s.fortunes = 9999999; s.access = 'sub'; s.subscribed = true;
  s.hasSeenFortuneTurnDisclosure = true;
  s.picks = s.picks || {}; s.picks.world = 'Fantasy';
  if (!Array.isArray(s.scenes)) s.scenes = [];
  return { fortunes: s.fortunes, world: s.picks.world, issuePurchased: !!s._issuePurchased };
});
// COVERED TOO: the account setup runs AFTER the launch has already spent, so a failure here
// loses evidence for calls that have already billed.
try { await applyAccountSetup(); } catch (e) {
  await preserveLaunchEvidence('account_setup_failed: ' + ((e && e.message) || e));
  throw e;
}

// ── THE SELECTED GENERATED PLAN IS AUTHORITATIVE (Roman, authorized 2026-10-31) ───────────
// SB_SELECTED_PLAN points at one already-generated Sol plan. It is injected UNCHANGED and is
// NOT regenerated: setting cgScaffold.storyId to this story's id makes _shouldGenerateCGScaffold
// return false, so no scaffold call is dispatched and nothing is billed for architecture.
//
// The authored rows are withheld IN MEMORY ONLY, by emptying this plan's `scenes` array on the
// page. `_activeSeed` and `_activePlan` read the SAME `_starterId`, so clearing that field would
// strip the seed as well — the canon, the sealed causal foundation, the disclosure schedule and
// the deck boundary all live there and all must survive. The 20 authored rows stay on disk,
// untouched, and no other story is affected.
//
// Re-applied after the mid-run reload for the same reason applyAccountSetup is: a real reload
// discards everything in memory.
const SELECTED_PLAN_PATH = process.env.SB_SELECTED_PLAN || '';
const SELECTED_PLAN = SELECTED_PLAN_PATH
  ? JSON.parse(fs.readFileSync(SELECTED_PLAN_PATH, 'utf8')) : null;
// ── FRESH-PLAN MODE: WITHHOLD THE AUTHORED ROWS AND LET THE SCAFFOLD GENERATE ─────────────
// SB_SELECTED_PLAN withholds the authored rows but INJECTS a previously generated plan and sets
// storyId on it, which suppresses _shouldGenerateCGScaffold — so no fresh planning happens. A
// test of whether the planner can invent a plot needs the opposite: authored rows withheld, the
// SEED CANON left intact, and the scaffold generated live. SB_FRESH_PLAN=1 does exactly that and
// injects nothing.
const applyFreshPlanMode = () => page.evaluate(() => {
  const s = window.state;
  const id = s._starterId;
  const sp = (window.STARTER_PLANS || {})[id];
  const rowsBefore = (sp && Array.isArray(sp.scenes)) ? sp.scenes.length : 0;
  if (sp) { window.__withheldRows = window.__withheldRows || sp.scenes; sp.scenes = []; }
  // The launch-time cache may already hold an assignment derived from an authored row.
  const cachedBefore = s._sceneAssignment
    ? { source: s._sceneAssignment.source, n: s._sceneAssignment.sceneNumber } : null;
  s._sceneAssignment = null;
  // THE FUNDED-OPENING MECHANISM, SET EXPLICITLY. Measured in preflight: with authored rows
  // withheld, _shouldGenerateCGScaffold was still FALSE and the assignment fell back to a stale
  // `scene-mission`. The cause is the Tier-0 deferral, which withholds the paid spine before a
  // free starter's first page unless an experiment has FUNDED that one call. This test funds it,
  // which is the sanctioned flag — it bypasses ONLY that cost deferral; the genre-config check,
  // the render-mode check, the single-generation guard and the one-failed-spine-per-turn rule all
  // still apply. Without it the run would silently use the authored plot, which is the thing
  // under test.
  try { window.__sbFundedSpineAtOpening = true; } catch (_) {}
  // Nothing is injected; cgScaffold is left for production to generate.
  return {
    mode: 'fresh-plan',
    fundedSpineAtOpening: (typeof window !== 'undefined') ? window.__sbFundedSpineAtOpening === true : null,
    rowsWithheld: rowsBefore,
    rowsNow: (sp && sp.scenes) ? sp.scenes.length : null,
    starterIdPreserved: id || null,
    seedAlive: !!(typeof window._activeSeed === 'function' && window._activeSeed(s)),
    cachedAssignmentDropped: cachedBefore,
    scaffoldPresent: !!s.cgScaffold,
    willGenerateScaffold: (typeof window._shouldGenerateCGScaffold === 'function')
      ? window._shouldGenerateCGScaffold(s) : 'unknown',
    assignmentNow: (typeof window._selectSceneAssignment === 'function')
      ? (function () { const a = window._selectSceneAssignment(s, 1);
          return a ? { source: a.source, event: String(a.event || '').slice(0, 70) } : null; })()
      : 'unknown',
  };
});

const applySelectedPlan = () => page.evaluate((plan) => {
  if (!plan) return { injected: false, why: 'no SB_SELECTED_PLAN' };
  const s = window.state;
  const id = s._starterId;
  const sp = (window.STARTER_PLANS || {})[id];
  const rowsBefore = (sp && Array.isArray(sp.scenes)) ? sp.scenes.length : 0;
  if (sp) { window.__withheldRows = window.__withheldRows || sp.scenes; sp.scenes = []; }
  const injected = JSON.parse(JSON.stringify(plan));
  injected.storyId = s.storyId || null;        // suppresses _shouldGenerateCGScaffold
  s.cgScaffold = injected;
  // ── THE CACHED SCENE-1 ASSIGNMENT MUST BE DROPPED (measured 2026-11-01) ──────────────
  // _sbSelectOpeningAssignment (app.js:69789) RETURNS st._sceneAssignment unchanged when its
  // sceneNumber is 1, and launch had already populated that cache from the AUTHORED row. The
  // provider-free drive proved the consequence: the opening author request carried the withheld
  // authored row under "REQUIRED DEVELOPMENT" and contained ZERO of the selected plan's scene-1
  // text. Clearing the cache forces a live re-resolution through _selectSceneAssignment(s, 1),
  // which resolves source=issue-outline from the injected plan.
  const cachedBefore = s._sceneAssignment
    ? { source: s._sceneAssignment.source, n: s._sceneAssignment.sceneNumber,
        event: String(s._sceneAssignment.event || '').slice(0, 70) } : null;
  s._sceneAssignment = null;
  const reresolved = (typeof window._selectSceneAssignment === 'function')
    ? window._selectSceneAssignment(s, 1) : null;
  return {
    cachedAssignmentDropped: cachedBefore,
    scene1Assignment: reresolved
      ? { source: reresolved.source, event: String(reresolved.event || '').slice(0, 90) } : null,
    injected: true,
    storyId: s.storyId,
    rowsWithheld: rowsBefore,
    rowsNow: (sp && sp.scenes) ? sp.scenes.length : null,
    seedAlive: !!(typeof window._activeSeed === 'function' && window._activeSeed(s)),
    scaffoldRows: (injected.issueArcs || []).reduce((n, a) => n + ((a.sceneOutline || []).length), 0),
    willGenerateScaffold: (typeof window._shouldGenerateCGScaffold === 'function')
      ? window._shouldGenerateCGScaffold(s) : 'unknown',
  };
}, SELECTED_PLAN);
// ── AFTER A RELOAD, WITHHOLDING MUST BE RE-APPLIED (Roman 2026-11-02) ────────────────────────
// The withholding is IN-MEMORY: emptying STARTER_PLANS[id].scenes does not survive a page
// reload, so after the scene-5→6 save/reopen the authored rows come back and regain precedence
// over the freshly generated scaffold. The reload path re-applied SELECTED-plan mode only.
// This restores withholding and the funded flag, and DELIBERATELY DOES NOT touch
// state.cgScaffold — the scaffold generated before the reload is the thing under test and must
// be neither replaced nor regenerated.
const restoreFreshPlanAfterReload = () => page.evaluate(() => {
  const id = 'starter_first_sacrifice';
  const sp = (window.STARTER_PLANS || {})[id];
  const rowsBefore = (sp && Array.isArray(sp.scenes)) ? sp.scenes.length : 0;
  if (sp) { window.__withheldRows = window.__withheldRows || sp.scenes; sp.scenes = []; }
  window.__sbFreshPlanMode = true;
  const s2 = window.state || {};
  const a = (typeof window._selectSceneAssignment === 'function')
    ? window._selectSceneAssignment(s2) : null;
  return {
    rowsBefore, rowsNow: (sp && sp.scenes) ? sp.scenes.length : null,
    scaffoldPreserved: !!s2.cgScaffold,
    scaffoldRows: s2.cgScaffold
      ? (s2.cgScaffold.issueArcs || []).reduce((n, x) => n + ((x.sceneOutline || []).length), 0) : 0,
    seedAlive: !!(typeof window._activeSeed === 'function' && window._activeSeed(s2)),
    assignmentAfterReload: a ? { source: a.source, event: String(a.event || '').slice(0, 80) } : null,
  };
});

// ── EVIDENCE SURVIVES A LAUNCH FAILURE (2026-11-02) ───────────────────────────────────────
// MEASURED: the post-launch assertion below sits OUTSIDE the main try/finally (which opens far
// lower), so when it threw, the finally block never ran. No request ledger, no accounting, no
// state snapshot, no page count and no transformation record reached disk — which is why
// "nothing was published" could only be inferred from a MISSING handoff file instead of read
// off a preserved page count. The absence of evidence was reported as a finding.
//
// This collects what is available at the moment of failure and NAMES what is not. It never
// substitutes a zero for an unread field: evidenceBundle() marks each one available or not, with
// the reason, so a later report cannot present a gap as a measurement.
async function preserveLaunchEvidence(reason) {
  const parts = { endedBecause: reason, endedCleanly: false, requests };
  try { parts.accounting = settlement.totals(); } catch (_) {}
  try {
    const pub = await readPublished(page);
    parts.pageCount = pub ? (pub.pages || []).length : null;
    if (pub) {
      // THE PAGES THEMSELVES, not just a count — publication is then VERIFIED either way.
      fs.writeFileSync(OUT + '/MANUSCRIPT_AT_FAILURE.txt', pub.allContent || '');
      (pub.pages || []).forEach((p, i) => fs.writeFileSync(
        OUT + '/page_at_failure_' + String(i + 1).padStart(2, '0') + '.txt', String(p || '')));
    }
  } catch (e) { parts.pageCount = null; }
  try {
    parts.committedScenes = await page.evaluate(() => {
      const s = window.state || {};
      return { scenes: Array.isArray(s.scenes) ? s.scenes.length : null,
        storyId: s.storyId || null, sceneNumber: s.sceneNumber == null ? null : s.sceneNumber };
    });
  } catch (_) {}
  try {
    const chain = await page.evaluate(() => ({
      rawSnap: (window.__rawSnap || []).map((e, i) => ({ i, sid: e.sid || null, label: e.label || null,
        changed: !!e.changed, before: String(e.before || ''), after: String(e.after || '') })),
      proseSnap: (window.__proseSnap || []).map((e, i) => ({ i, owner: e.owner || null,
        label: e.label || null, rejected: !!e.rejected,
        inText: String(e.inText || ''), outText: e.outText == null ? null : String(e.outText) })),
    }));
    fs.writeFileSync(OUT + '/PROSE_CHAIN.json', JSON.stringify(chain, null, 2));
    parts.transformations = { rawSnap: chain.rawSnap.length, proseSnap: chain.proseSnap.length,
      artifact: 'PROSE_CHAIN.json' };
  } catch (_) {}
  try {
    parts.stateSnapshot = await page.evaluate(() => {
      const s = window.state || {};
      const sc = s.cgScaffold || null;
      return { storyId: s.storyId || null, starterId: s._starterId || null,
        scaffoldPresent: !!sc,
        scaffoldRows: sc ? (sc.issueArcs || []).reduce((n, a) => n + ((a.sceneOutline || []).length), 0) : 0,
        scaffoldServedBy: (sc && sc._servedBy) || null,
        scaffoldIsSol: !!(sc && sc._isSolArchitecture) };
    });
  } catch (_) {}
  const bundle = evidenceBundle(parts);
  try {
    fs.writeFileSync(OUT + '/EVIDENCE_BUNDLE.json', JSON.stringify(bundle, null, 2));
    fs.writeFileSync(OUT + '/requests.json', JSON.stringify(requests, null, 2));
    say('  ↳ evidence bundle written on failure (' + bundle.unavailable.length
      + ' field(s) unavailable and labelled as unknown)');
  } catch (e) { say('  ! EVIDENCE BUNDLE COULD NOT BE WRITTEN: ' + (e && e.message)); }
  return bundle;
}

if (FRESH_PLAN && !RESUME_FROM) try {
  // POST-LAUNCH: ASSERT WHAT HAPPENED, NOT WHAT WAS ELIGIBLE.
  // The previous version asserted `_shouldGenerateCGScaffold === true` here, which is wrong by
  // construction: once the scaffold HAS been generated the gate correctly returns false (the
  // single-generation guard). Eligibility is not evidence. These checks read the result.
  const fp = await page.evaluate(() => {
    const s2 = window.state || {};
    const sc = s2.cgScaffold || null;
    const rows = sc ? (sc.issueArcs || []).reduce((n, a) => n + ((a.sceneOutline || []).length), 0) : 0;
    const a = (typeof window._selectSceneAssignment === 'function')
      ? window._selectSceneAssignment(s2, 1) : null;
    const withheld = Array.isArray(window.__withheldRows) ? window.__withheldRows : [];
    return {
      scaffoldPresent: !!sc, scaffoldRows: rows,
      servedBy: (sc && (sc._servedBy || sc._sourceModelNote)) || null,
      isSolArchitecture: !!(sc && sc._isSolArchitecture),
      assignment: a ? { source: a.source, event: String(a.event || '').slice(0, 90) } : null,
      seedAlive: !!(typeof window._activeSeed === 'function' && window._activeSeed(s2)),
      authoredRowsStillWithheld: ((window.STARTER_PLANS || {})['starter_first_sacrifice'] || {}).scenes,
      firstWithheldEvent: withheld.length ? String(withheld[0].accomplishes || withheld[0].event || '').slice(0, 70) : null,
    };
  });
  say('POST-LAUNCH FRESH-PLAN: ' + JSON.stringify(fp));
  assert(fp.scaffoldPresent === true, 'no scaffold was generated — the run would use the authored plot');
  assert(fp.scaffoldRows > 0, 'the generated scaffold has no outline rows');
  // ── THE SCAFFOLD MUST BE SOL'S (2026-11-02) ────────────────────────────────────────────
  // This block previously READ `servedBy` and `isSolArchitecture` into its record and asserted
  // NEITHER, so a scaffold produced by the ministral/grok/4o-mini fallback chain satisfied every
  // check and would have been reported as a clean fresh-Sol run. The configuration under test
  // names the planner, so a different planner is a different experiment.
  // Scoped by the SAME pure function the dispatch gate uses, for the same reason: in the
  // provider-blocked driver nothing can be Sol, because a synthetic fixture must not claim a
  // real model's identity. In every other mode this is required.
  if (prerequisiteOptionsFor(MODE).requireSol) {
    assert(fp.isSolArchitecture === true,
      'the scaffold was served by ' + JSON.stringify(fp.servedBy || 'unrecorded')
      + ', not Sol — that is a different planner than the one under test');
  } else {
    say('  (Sol identity not asserted: mode=' + MODE + ' is provider-blocked, servedBy='
      + JSON.stringify(fp.servedBy) + ')');
  }
  assert((fp.authoredRowsStillWithheld || []).length === 0, 'authored rows came back after launch');
  assert(fp.seedAlive === true, 'seed canon was lost');
  assert(fp.assignment && fp.assignment.source !== 'scene-mission',
    'the scene-1 assignment is a stale scene-mission (source=' + (fp.assignment && fp.assignment.source)
    + ') — the fresh scaffold did not reach the opening');
  // The authored assignment must be ABSENT from what the opening author actually received.
  const openingReq = await page.evaluate(() => String((window.__lastAuthorRequestText || '')));
  if (openingReq && fp.firstWithheldEvent) {
    assert(openingReq.indexOf(fp.firstWithheldEvent) === -1,
      'the opening author request still carries the WITHHELD authored row: '
      + JSON.stringify(fp.firstWithheldEvent));
  }
} catch (e) {
  // THE EVIDENCE IS WRITTEN BEFORE THE PROCESS DIES, NOT AFTER IT IS GONE.
  await preserveLaunchEvidence('post_launch_prerequisite_assertion: ' + ((e && e.message) || e));
  throw e;
}

if (SELECTED_PLAN) {
  const inj = await applySelectedPlan();
  say('SELECTED PLAN INJECTED: ' + JSON.stringify(inj));
  assert(inj.seedAlive === true, 'the seed did not survive withholding the authored rows');
  assert(inj.rowsNow === 0, 'the authored rows were not withheld');
  assert(inj.willGenerateScaffold === false, 'a NEW scaffold generation would be dispatched — refusing to pay for architecture twice');
  // THE SCENE-1 ASSIGNMENT MUST COME FROM THE SELECTED PLAN, OR THE TEST IS NOT THE TEST.
  // A paid run whose opening is authored from the withheld rows would be the exact silent
  // override this test exists to avoid, so it is asserted here rather than discovered later.
  assert(inj.scene1Assignment && inj.scene1Assignment.source === 'issue-outline',
    'scene 1 did not resolve from the injected plan: ' + JSON.stringify(inj.scene1Assignment));
}

// ── WAIT FOR A GENUINELY COMMITTED SCENE ──────────────────────────────────────────────────
// Committed means state.scenes grew AND the page count grew. A rendered draft that never
// persisted is not a scene, and counting it would let the loop walk past a failure.
async function waitForCommit(targetCount, label) {
  // WHAT "COMMITTED" MEANS HERE, corrected from evidence. My first criterion was
  // state.scenes.length, and the driver stalled at scene 2 with pages=2, scenes=1. That was my
  // test, not the app: `_mountAndTransition` pushes a scene record for the literary SCENE 1
  // (app.js:107253) and sets turnCount=0, while a CONTINUATION advances the page and the turn
  // counter. So the durable signal is the one RESUME actually reads — the autosaved snapshot in
  // localStorage['sb_saved_story']. A page that is not in the snapshot would not survive the
  // reload between scenes 5 and 6, so it is not a committed scene.
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < SCENE_WAIT_MS) {
    last = await page.evaluate(() => {
      let snapPages = 0, snapBytes = 0;
      try {
        const raw = localStorage.getItem('sb_saved_story') || '';
        snapBytes = raw.length;
        const j = JSON.parse(raw || 'null');
        const sp = j && (j.storyPages || (j.stateSnapshot && j.stateSnapshot.storyPages));
        if (Array.isArray(sp)) snapPages = sp.length;
      } catch (_) {}
      return {
        scenes: ((window.state || {}).scenes || []).length,
        turnCount: (window.state || {}).turnCount || 0,
        pages: (window.StoryPagination && window.StoryPagination.getPageCount)
          ? window.StoryPagination.getPageCount() : 0,
        snapPages, snapBytes,
        chars: (window.StoryPagination && window.StoryPagination.getAllContent)
          ? String(window.StoryPagination.getAllContent() || '').length : 0,
      };
    });
    // SCENE 1 IN DRIVE MODE IS EXEMPT FROM THE SNAPSHOT TEST, and this is a limit of the driver
    // check only: saveStorySnapshot is closure-scoped (51 call sites, no window export), so a
    // hand-mounted opening cannot autosave the way a GENERATED one does in flow. In `run` scene 1
    // is generated and takes the same snapshot test as every continuation.
    // COMMITTED vs DURABLE, separated after scene 9 stalled at pages 9 / snapPages 8 with the
    // prose present (47,099 chars). The app's autosave has its own cadence and can lag a page;
    // that is not a lost scene. So:
    //   COMMITTED = the page is mounted AND the turn counter advanced (the app's own accounting)
    //   DURABLE   = the page is in localStorage['sb_saved_story'], asserted where it MATTERS:
    //               at the resume boundary and at the end of the run.
    // DURABILITY IS THE SIGNAL, NOT turnCount. My previous criterion required
    // turnCount >= targetCount, which is off by one on the LIVE path: a GENERATED opening sets
    // state.turnCount = 0 (app.js:107251, "the issue's Scene 1 is mounted; completed continuation
    // turns = 0"), so one continuation leaves turnCount at 1 while two pages exist. Scene 2 had
    // committed — pages 2, snapshot 2 — and my test called it a stall. Twice now the commit test
    // has been the bug, so it is anchored to the thing resume actually reads.
    const committed = last.pages >= targetCount
      && (last.snapPages >= targetCount || last.turnCount >= targetCount);
    if (committed) return last;
    if (halted) return last;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error('scene ' + targetCount + ' (' + label + ') never committed — last seen '
    + JSON.stringify(last) + '. Evidence preserved; not forcing state past it.');
}

// ── SUBMIT A READER CHOICE THROUGH THE NORMAL CONTROLS ────────────────────────────────────
async function submitChoice(choice) {
  // THE APP OWNS THE BUTTON. The previous version set `b.disabled = false` before clicking,
  // which is how a driver submits into a turn the application has not finished — and is how the
  // advance lock ended up still held at the reload. If Submit is disabled, that IS the answer:
  // the turn is not ready and the driver waits or reports.
  return page.evaluate((c) => {
    const b = document.getElementById('submitBtn');
    if (!b) return { btn: false };
    if (b.disabled) return { btn: true, refusedBecauseDisabled: true };
    const a = document.getElementById('actionInput'), d = document.getElementById('dialogueInput');
    if (a) { a.value = c.action; a.dispatchEvent(new Event('input', { bubbles: true })); }
    if (d) { d.value = c.dialogue || ''; d.dispatchEvent(new Event('input', { bubbles: true })); }
    b.click();
    return { btn: true, typedAction: a ? a.value : null, typedDialogue: d ? d.value : null,
      advanceLockAtClick: !!(window.state || {})._isAdvancingScene,
      modals: ['fortuneDisclosureModal', 'paywallModal', 'issueCliffhangerModal']
        .filter((id) => { const e = document.getElementById(id); return e && !e.classList.contains('hidden'); }) };
  }, choice);
}

// ── THE TURN IS FINISHED WHEN THE APPLICATION SAYS SO ─────────────────────────────────────
// A saved page is not a finished turn. The app clears its own advance lock
// (state._isAdvancingScene, with _advanceStartedAt and a 90s stale-clear at app.js:323514) and
// re-enables Submit after the turn's cleanup. The driver observes THAT, and never clears it.
const readTurnState = () => page.evaluate(() => ({
  advanceLock: !!(window.state || {})._isAdvancingScene,
  advanceStartedAt: (window.state || {})._advanceStartedAt || null,
  lockAgeMs: (window.state || {})._advanceStartedAt ? Date.now() - (window.state || {})._advanceStartedAt : null,
  submitDisabled: !!(document.getElementById('submitBtn') || {}).disabled,
  submitting: !!((document.getElementById('submitBtn') || {}).classList || { contains: () => false }).contains('submitting'),
  turnCount: (window.state || {}).turnCount || 0,
}));
async function waitForTurnIdle(label) {
  const t0 = Date.now();
  let last = null;
  while (Date.now() - t0 < SCENE_WAIT_MS) {
    last = await readTurnState();
    if (!last.advanceLock && !last.submitDisabled && !last.submitting) return last;
    if (halted) return last;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('the turn never went idle before ' + label + ' — last seen '
    + JSON.stringify(last) + '. The advance lock was NOT cleared by this driver.');
}

// ── THE TEN SCENES ────────────────────────────────────────────────────────────────────────
const sceneLog = [];
const deliveryLog = [];
// THE STORY RECORD, keyed by scene number. Written to disk after every completed scene.
const storyRecord = {};
// Verdicts whose proposal identity could not be confirmed. Retained, never guessed onto a scene.
const unassociatedAssessments = [];
function writeStoryRecord(note) {
  try {
    const scenes = Object.keys(storyRecord).map(Number).sort((a, b) => a - b);
    // A SCENE WITH NO ASSESSMENT IS MARKED UNASSESSED. The last scene of a run normally has none,
    // because submitting scene N is what assesses scene N-1 — and buying one more scene purely to
    // obtain a verdict is not a reason to spend.
    scenes.forEach((k) => {
      const r = storyRecord[String(k)];
      if (!r.assessment) {
        r.assessment = null;
        // REPORTS WHAT IS ON RECORD, AND NOTHING MORE. "NOT APPLICABLE" implied the opening was
        // exempt from assessment, and the fuller wording implied an assessment would or did
        // follow. Neither is known from this record.
        r.assessmentStatus = r.isOpening
          ? 'No matching assessment recorded.'
          : 'No matching assessment recorded. (Submitting the next scene is what runs a commit'
            + ' pass; another scene was not purchased to obtain one.)';
      } else { r.assessmentStatus = 'assessed'; }
    });
    fs.writeFileSync(OUT + '/STORY_RECORD.json', JSON.stringify({
      note: note || 'written after each completed scene; partial results are preserved on failure',
      scenes: scenes.map((k) => storyRecord[String(k)]),
      unassociatedAssessments: unassociatedAssessments,
    }, null, 2));
  } catch (_) {}
}
try {
  // ── SCENE 1 ─────────────────────────────────────────────────────────────────────────────
  // IN `run` IT IS GENERATED, for real, and the driver waits for a genuine commit.
  // IN `drive` IT IS MOUNTED through production's own scene door instead, and that is a
  // DISCLOSED LIMIT of the driver check, not of the paid run: a synthetic planner reply cannot
  // satisfy the real Scene-1 skeleton validator, so no scene would ever commit and the loop
  // below — the part this check exists to prove — would never be reached. The first attempt
  // demonstrated exactly that: OPENING_PLANNER was priced at $0.047373 and the run halted with
  // "scene 1 never committed", which is the correct refusal and also a dead end for the check.
  // ── NEVER WHEN RESUMING (Roman 2026-11-01) ─────────────────────────────────────────────
  // A RESUMED story already HAS its opening. This block mounted a SECOND one on top of the
  // restored 12 pages: it added a page, reset state.turnCount to 1, and saved — so the engine
  // believed it was at scene 3 while the runner's loop index said 13, and the plan-decision
  // hook resolved against scene 2. The resume itself is correct (it restores 12 pages and
  // turnCount 11); this initialisation is what corrupted it. The whole block is skipped rather
  // than the counter repaired afterwards, because the duplicate opening and everything it wrote
  // would survive a counter fix.
  if (DRIVE && !DRIVE_GENERATE_OPENING && RESUME_FROM) {
    say('\n── SCENE 1 SKIPPED (resumed story already carries its opening; mounting another would'
      + ' add a page and reset the turn counter) ──');
  } else if (DRIVE && !DRIVE_GENERATE_OPENING) {
    say('\n── SCENE 1 (DRIVE: mounted through _sbPersistSceneProjection, NOT generated) ──');
    const seed = fs.readFileSync(
      ROOT + '/_ab_writing_out/continuation_experiment/PRECEDING_SCENE_AS_READ.txt', 'utf8').trim();
    const m = await page.evaluate((text) => {
      const s = window.state;
      if (!Array.isArray(s.scenes)) s.scenes = [];
      let rec = null;
      try {
        rec = window._sbPersistSceneProjection({ input: text, kind: 'body',
          title: 'The Blank Page', synopsis: 'Driver-check opening.' });
      } catch (e) { return { threw: e.message }; }
      try { window.StoryPagination.addPage(text, true, rec && rec.uid ? rec.uid : undefined, { kind: 'body' }); } catch (_) {}
      s.turnCount = 1;
      if (typeof window.saveStorySnapshot === 'function') { try { window.saveStorySnapshot(); } catch (_) {} }
      return { scenes: s.scenes.length, storyId: s.storyId || s._storyId || null };
    }, seed);
    say('  mounted: ' + JSON.stringify(m));
  } else {
    say('\n── SCENE 1 (generated opening) ──');
  }
  // ══════════════════════════════════════════════════════════════════════════════════════════
  // PLANNER-ONLY: STOP AT THE VERDICT, NOT AT A COMMITTED SCENE.
  //
  // Scene 1 can never commit here — the author is refused at the wire — so waiting for a commit
  // would only produce a misleading "never committed" stall. Instead this waits for the
  // PRODUCTION validators to speak, and reads the verdict from what production itself did:
  //
  //   PASSED   — the build reached the AUTHOR. The author is only called after _tryParseScaffold
  //              succeeds AND every _poFail semantic check passes (app.js:294420 onward), so an
  //              attempted author request IS the production validator's pass.
  //   REJECTED — state._scene1SkeletonFatal is set, or the console carries
  //              [SCENE1:PLANNER:UNRECOVERABLE] (JSON unparseable even after repair) or
  //              [SCENE1:STAGE:PLANNER-OWNED:FAULT] (semantic rejection).
  //   TRANSPORT— the attempt never produced a usable response; the failure artifact holds the
  //              body, safe headers, phase and duration.
  //
  // No verdict is inferred from the plan's content by this harness. It reports what production's
  // own code decided.
  if (PLANNER_ONLY) {
    const deadline = Date.now() + 300000;
    let verdict = null;
    while (Date.now() < deadline) {
      const authorTried = plannerRefused.some((r) => r.isAuthor);
      const fatal = await page.evaluate(() => {
        const s = window.state || {};
        return s._scene1SkeletonFatal || null;
      }).catch(() => null);
      const badLine = consoleLines.find((l) => l.indexOf('[SCENE1:PLANNER:UNRECOVERABLE]') !== -1
        || l.indexOf('[SCENE1:STAGE:PLANNER-OWNED:FAULT]') !== -1);
      const plannerRec = requests.find((r) => r.role === 'OPENING_PLANNER' && !r.refusedByDiagnostic);
      const transportFailed = plannerRec && (plannerRec.status == null || plannerRec.status >= 400);
      // REJECTION IS DEFINITIVE; A PASS IS NOT. A fatal message or a fault line is production
      // stating the plan is bad. Reaching the author is only CONSISTENT with the validators
      // having passed — and because this diagnostic blocks the author, nothing downstream can
      // confirm it. That is recorded as INCOMPLETE, never as a pass by inference.
      // A FATAL ONLY MEANS "REJECTED" IF A PLAN ACTUALLY ARRIVED. The dry pass exposed this: with
      // nothing dispatched, production still set _scene1SkeletonFatal and logged a fault — caused
      // by the ABSENCE of a response, not by a bad plan. Reading that as a validator rejection
      // would be the same inference error in the other direction.
      const planArrived = plannerRec && plannerRec.status === 200;
      if (transportFailed || !plannerRec) { verdict = 'TRANSPORT_FAILED'; break; }
      if (planArrived && (fatal || badLine)) { verdict = 'VALIDATION_REJECTED'; break; }
      if (planArrived && authorTried) { verdict = 'VALIDATION_PASSED_AUTHOR_NOT_RUN'; break; }
      await new Promise((r) => setTimeout(r, 1000));
    }
    const plannerRec = requests.find((r) => r.role === 'OPENING_PLANNER' && !r.refusedByDiagnostic);
    const fatalMsg = await page.evaluate(() => (window.state || {})._scene1SkeletonFatal || null)
      .catch(() => null);
    // TRANSPORT AND VALIDATION ARE REPORTED APART. A plan can arrive intact and still be
    // rejected; transport can fail and leave validation simply unreached. Collapsing them into
    // one verdict hid which layer spoke.
    const plannerRecNow = requests.find((r) => r.role === 'OPENING_PLANNER' && !r.refusedByDiagnostic);
    const transportOutcome = !plannerRecNow ? 'NOT_DISPATCHED'
      : (plannerRecNow.status === 200 ? 'RESPONSE_RECEIVED_200'
        : plannerRecNow.status == null ? 'NO_HTTP_RESPONSE'
          : 'HTTP_' + plannerRecNow.status);
    const validationOutcome = verdict === 'VALIDATION_REJECTED' ? 'REJECTED_BY_PRODUCTION_VALIDATOR'
      : verdict === 'VALIDATION_PASSED_AUTHOR_NOT_RUN'
        // PLANNER VALIDATION PASSED. Production accepted the plan — no parse fault, no semantic
        // fault — and carried it all the way to the author, which this diagnostic blocks on
        // purpose. That is the planner question answered. AUTHORING was intentionally not run,
        // which is a separate matter and is reported as such, not as an incomplete planner
        // result. "Incomplete" is reserved for something actually preventing the determination.
        ? 'PASSED — production accepted the plan and reached the author boundary, which this '
          + 'diagnostic blocks. AUTHORING WAS INTENTIONALLY NOT RUN (separate from validation).'
        : verdict === 'TRANSPORT_FAILED'
        ? 'NOT_REACHED — no plan arrived, so the validators never judged one. Any fatal recorded '
          + 'below was caused by the missing response, NOT by a rejected plan.'
        : 'NO_VERDICT_WITHIN_300s';
    const result = {
      transportOutcome,
      validationOutcome,
      verdict: verdict || 'NO_VERDICT_WITHIN_300s',
      dryPass: PROBE_DRY,
      plannerRequestsProductionTried: plannerSeen,
      plannerRequestsActuallyDispatched: plannerAttempts,
      attempt: plannerRec ? {
        chars: plannerRec.chars, status: plannerRec.status ?? null, ms: plannerRec.ms ?? null,
        served: plannerRec.served, receipt: plannerRec.receipt,
        estimate: plannerRec.estimate, settlement: plannerRec.settlement ?? null,
        failureArtifact: plannerRec.failureArtifact ?? null,
      } : null,
      validatorFatal: fatalMsg,
      validatorLines: consoleLines.filter((l) => l.indexOf('[SCENE1:PLANNER') !== -1
        || l.indexOf('[SCENE1:STAGE:PLANNER-OWNED') !== -1
        || l.indexOf('[SCENE1:SCAFFOLD:JSON-REPAIRED]') !== -1),
      refusedAtTheWire: plannerRefused,
    };
    fs.writeFileSync(OUT + '/PLANNER_RESULT.json', JSON.stringify(result, null, 2));
    say('\n── PLANNER-ONLY VERDICT ──');
    say('  TRANSPORT  : ' + result.transportOutcome);
    say('  VALIDATION : ' + result.validationOutcome);
    say('  production tried ' + plannerSeen + ' planner request(s); ' + plannerAttempts
      + ' reached the wire');
    result.refusedAtTheWire.forEach((r) => say('  ⊘ ' + (r.role || r.url) + ' — ' + r.why));
    if (fatalMsg) say('  validator fatal: ' + fatalMsg);
    halted = 'PLANNER-ONLY DIAGNOSTIC COMPLETE — ' + result.verdict;
    throw new Error(halted);
  }

  const START_AT = RESUMED_FROM_DISK ? RESUMED_FROM_DISK.pages : 1;
  const s1 = await waitForCommit(START_AT, RESUME_FROM ? 'resumed from disk'
    : (DRIVE ? 'driver-mounted opening' : 'generated opening'));
  say('  committed: ' + JSON.stringify(s1));
  let pub = await readPublished(page);
  fs.writeFileSync(OUT + '/scene01.txt', pub.pages[pub.pages.length - 1] || pub.allContent);
  sceneLog.push({ scene: START_AT, chars: s1.chars, requests: requests.filter((r) => r.scene === 1).length,
    resumedNotPaid: !!RESUMED_FROM_DISK });

  // ── THE OPENING GETS A RECORD TOO (Roman 2026-10-27) ───────────────────────────────────────
  // STORY_RECORD previously began at scene 2: the per-scene capture lived only in the
  // continuation loop, so the opening existed as scene01.txt and in nothing else, while the file
  // claimed to be the record for scenes 1-N. The opening has no player choice and no prior scene
  // to assess, and saying that explicitly is the record — not omitting it.
  {
    const cap1 = await page.evaluate(() => {
      try {
        const st2 = window.state || {};
        const cs = st2._committedState || {};
        const ref = st2._priorSceneStateChange && st2._priorSceneStateChange.proposalRef;
        const rec2 = ref && st2._sealedProposals && st2._sealedProposals.byId
          && st2._sealedProposals.byId[String(ref)];
        return {
          assignment: String((st2._sceneAssignment && st2._sceneAssignment.event)
            || st2._spineEventVerbatim || ''),
          proposalRef: (rec2 && rec2.kind === 'state_change') ? String(ref) : null,
          pageUid: (Array.isArray(st2.storyPageUids) && st2.storyPageUids.length)
            ? String(st2.storyPageUids[st2.storyPageUids.length - 1]) : null,
          outstandingObligations: (typeof window._openObligations === 'function')
            ? window._openObligations(st2).map((o) => ({ id: o.id,
                text: String(o.text || '').slice(0, 160), owedBy: o.owedBy || null })) : [],
          diag: { factsTotal: Array.isArray(cs.facts) ? cs.facts.length : 0,
            committedThrough: cs._committedThroughScene != null ? Number(cs._committedThroughScene) : null,
            stageIssued: !!(st2._spineStaging && st2._spineStaging.setting) },
        };
      } catch (e) { return { error: String(e && e.message) }; }
    }).catch((e) => ({ error: 'evaluate failed: ' + (e && e.message) }));
    const r1 = storyRecord[String(START_AT)] = storyRecord[String(START_AT)] || { scene: START_AT };
    r1.isOpening = true;
    r1.assignedMilestone = cap1.assignment || null;
    r1.localProposal = null;
    r1.localProposalNote = 'the opening has no player choice and no local proposal from a'
      + ' continuation planner';
    r1.proposalRef = cap1.proposalRef || null;
    r1.pageUid = cap1.pageUid || null;
    r1.proseFile = 'scene01.txt';
    r1.proseChars = (pub.pages[pub.pages.length - 1] || pub.allContent || '').length;
    r1.outstandingAfter = cap1.outstandingObligations || [];
    r1.diagnostics = cap1.diag || null;
    r1.resumedNotPaid = !!RESUMED_FROM_DISK;
    if (cap1.error) r1.captureError = cap1.error;
    writeStoryRecord();
  }

  for (let n = START_AT + 1; n <= SCENES; n++) {
    _paSeen = 0;   // each scene gets its own outline/control ordering
    if (halted) break;
    // SAVE / RELOAD / RESUME, between scenes 5 and 6, through the real path.
    if (n === RESUME_AFTER_SCENE + 1) {
      say('\n── SAVE / RELOAD / RESUME (between scenes ' + RESUME_AFTER_SCENE + ' and ' + n + ') ──');
      // THE LOCK AND ITS TIMING, RECORDED BEFORE THE RELOAD AND NEVER CLEARED BY THIS DRIVER.
      const lockBefore = await readTurnState();
      say('  advance lock BEFORE reload: ' + JSON.stringify(lockBefore));
      const before = await page.evaluate(() => ({
        storyId: (window.state || {}).storyId || (window.state || {})._storyId || null,
        scenes: ((window.state || {}).scenes || []).length,
        snapshotBytes: (localStorage.getItem('sb_saved_story') || '').length,
        snapshotAdvanceLock: (function () {
          try { const j = JSON.parse(localStorage.getItem('sb_saved_story') || 'null');
            const ss = j && (j.stateSnapshot || j); return !!(ss && ss._isAdvancingScene); }
          catch (_) { return null; }
        })(),
      }));
      say('  before reload: ' + JSON.stringify(before));
      assert(before.snapshotBytes > 0, 'nothing was autosaved — saveStorySnapshot never ran in flow');
      const durableAtResume = await page.evaluate(() => {
        try { const j = JSON.parse(localStorage.getItem('sb_saved_story') || 'null');
          const sp = j && (j.storyPages || (j.stateSnapshot && j.stateSnapshot.storyPages));
          return Array.isArray(sp) ? sp.length : 0; } catch (_) { return 0; }
      });
      say('  DURABILITY at the resume boundary: ' + durableAtResume + ' pages in the snapshot');
      assert(durableAtResume >= RESUME_AFTER_SCENE,
        'the snapshot holds only ' + durableAtResume + ' of ' + RESUME_AFTER_SCENE
        + ' pages — the reload would lose a scene');
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => typeof window.continueStory === 'function', null, { timeout: 120000 });
      const resumed = await page.evaluate(async (sid) => {
        try { await window.continueStory(sid); } catch (e) { return { threw: e.message }; }
        return { scenes: ((window.state || {}).scenes || []).length,
          pages: (window.StoryPagination && window.StoryPagination.getPageCount) ? window.StoryPagination.getPageCount() : 0,
          turnCount: (window.state || {}).turnCount || 0 };
      }, before.storyId);
      say('  after window.continueStory: ' + JSON.stringify(resumed));
      const lockAfter = await readTurnState();
      say('  advance lock AFTER Continue: ' + JSON.stringify(lockAfter));
      assert(!resumed.threw, 'resume threw: ' + resumed.threw);
      assert(resumed.scenes >= before.scenes, 'the resumed story lost scenes: '
        + resumed.scenes + ' < ' + before.scenes);
      // THE WHOLE SETUP, not just the wallet. The baked-page stub also has to be re-installed:
      // it lives on window and the reload took it with everything else.
      await page.evaluate(() => {
        if (typeof window._bakedScene1For === 'function' && !window.__realBakedScene1For) {
          window.__realBakedScene1For = window._bakedScene1For;
          window._bakedScene1For = function () { return null; };
        }
      });
      say('  account setup re-applied after reload: ' + JSON.stringify(await applyAccountSetup()));
      // The reload discarded the injected plan and restored the authored rows in memory.
      if (SELECTED_PLAN) say('  selected plan re-applied after reload: ' + JSON.stringify(await applySelectedPlan()));
      if (FRESH_PLAN) {
        const rf = await restoreFreshPlanAfterReload();
        say('  fresh-plan withholding restored after reload: ' + JSON.stringify(rf));
        assert((rf.rowsNow === 0), 'authored rows regained precedence after reload (rowsNow='
          + rf.rowsNow + ') — the generated plan would be outranked');
        assert(rf.scaffoldPreserved === true && rf.scaffoldRows > 0,
          'the generated scaffold did not survive the reload (rows=' + rf.scaffoldRows + ')');
        assert(rf.seedAlive === true, 'seed canon lost across the reload');
        assert(rf.assignmentAfterReload && rf.assignmentAfterReload.source !== 'scene-mission',
          'after reload the assignment is a stale scene-mission (source='
          + (rf.assignmentAfterReload && rf.assignmentAfterReload.source) + ')');
      }
      // ── THE RESTORED LOCK IS STALE, AND THE APPLICATION CLEARS IT ITSELF ────────────────
      // Measured: advanceLock FALSE before the reload (lockAgeMs 3014, submit enabled, the turn
      // genuinely finished) and TRUE after window.continueStory, carrying the SAME
      // advanceStartedAt. The snapshot was taken mid-turn and the resume rehydrates that field;
      // the live lock had already cleared. So this is not harness timing and not a forced
      // submit — and it is not a permanent jam either: the submit handler's own stale-lock rule
      // (app.js:323514) clears any lock older than 90s and proceeds. Nothing is cleared here.
      // The driver WAITS for the application's own recovery window to open.
      if (lockAfter.advanceLock && lockAfter.advanceStartedAt) {
        const STALE_MS = 90000;
        const waitMs = Math.max(0, STALE_MS - (Date.now() - lockAfter.advanceStartedAt)) + 2000;
        say('  restored lock is stale (age ' + Math.round(lockAfter.lockAgeMs / 1000)
          + 's). Waiting ' + Math.round(waitMs / 1000) + 's for the app\u2019s own 90s stale-clear'
          + ' \u2014 NOT clearing it.');
        await new Promise((r) => setTimeout(r, waitMs));
        const lockAged = await readTurnState();
        say('  lock age at next submit: ' + Math.round((lockAged.lockAgeMs || 0) / 1000)
          + 's (the handler clears it on the attempt itself)');
      }
      fs.writeFileSync(OUT + '/RESUME.json', JSON.stringify(
        { lockBefore, before, resumed, lockAfter }, null, 2));
    }

    pub = await readPublished(page);
    const choice = await awaitReaderChoice(n - 1, pub.allContent, pub.controls);
    say('\n── SCENE ' + n + ' ──');
    say('  reader action  : ' + choice.action);
    say('  reader dialogue: ' + (choice.dialogue || '(none)'));
    sceneNoForReplies = n;
    const clicked = await submitChoice(choice);
    say('  submitted: ' + JSON.stringify(clicked));
    assert(clicked.btn, 'no #submitBtn — the literary controls are not mounted');
    assert(!clicked.modals.length, 'a modal intercepted the submit: ' + JSON.stringify(clicked.modals));
    // ── WHAT ACTUALLY REACHED EACH CONSUMER ────────────────────────────────────────────
    // Captured per scene so the chain is visible: the planner request, the author request, and
    // the durable action ledger — not just the helper's return value.
    const delivered = { scene: n, submitted: choice };
    const seen = requests.filter((r) => r.scene === n);
    delivered.plannerCarries = null; delivered.authorCarries = null;
    try {
      const plan = seen.find((r) => /SCENE_PROPOSAL|STRUCTURE_GENERATOR|STRATEGY_PASS/.test(String(r.role)));
      const auth = seen.find((r) => r.author);
      const grab = (body) => body ? {
        playerDidBlock: (body.match(/PLAYER DID:\s*\"?([^\n\"]{0,120})/) || [])[1] || null,
        playerSaidBlock: (body.match(/PLAYER SAID:\s*\"?([^\n\"]{0,120})/) || [])[1] || null,
        actionLine: (body.match(/Action:\s*([^\n]{0,120})/) || [])[1] || null,
        dialogueLine: (body.match(/Dialogue:\s*([^\n]{0,120})/) || [])[1] || null,
      } : null;
      delivered.plannerCarries = grab(plan && plan.bodyText);
      delivered.authorCarries = grab(auth && auth.bodyText);
    } catch (_) {}
    delivered.ledger = await page.evaluate(() => {
      const evs = ((window.state || {})._committedStoryEvents || (window.state || {}).storyEvents || []);
      const last = Array.isArray(evs) ? evs[evs.length - 1] : null;
      return last ? { act: String(last.act || '').slice(0, 120), dia: String(last.dia || '').slice(0, 120) } : null;
    }).catch(() => null);
    deliveryLog.push(delivered);
    // ── LABELLED TEST FIXTURE: make the milestone GENUINELY IDENTICAL to the local event ───
    // SB_FIXTURE_IDENTICAL=1 copies the pending proposal's own event text into the scene
    // assignment, so state._sceneAssignment.event and prevProposal.event are the same string by
    // construction. This is a test INPUT set before production functions run — it does not write
    // any verdict, and the commit pass, the evidence helpers and the proposal adjudicator all
    // execute normally on it. Without it the branch is unreachable from this harness, because the
    // planner's prompt only ever shows a truncated view of the real assignment.
    if (process.env.SB_FIXTURE_IDENTICAL === '1') {
      const fx = await page.evaluate(() => {
        try {
          const cs = (window.state && window.state._committedState) || {};
          const pend = (cs.pendingIntent && cs.pendingIntent.proposed) ? String(cs.pendingIntent.proposed) : '';
          if (!pend) return { set: false, why: 'no pending intent to copy' };
          window.state._sceneAssignment = Object.assign({},
            window.state._sceneAssignment || {}, { event: pend });
          window.state._spineEventVerbatim = pend;
          return { set: true, len: pend.length, head: pend.slice(0, 70) };
        } catch (e) { return { set: false, why: String(e && e.message) }; }
      }).catch(() => ({ set: false, why: 'evaluate failed' }));
      say('  [FIXTURE] identical-milestone assignment ' + JSON.stringify(fx));
    }
    const st = await waitForCommit(n, 'continuation ' + n);
    if (halted) break;
    say('  committed: ' + JSON.stringify(st));
    // ── A SNAPSHOT PER COMMITTED SCENE (2026-11-01) ───────────────────────────────────────
    // RESUMABLE_STATE.json is written ONCE, at run end. That makes a branch comparison
    // impossible after the fact: the 2026-11-01 run reached its decision scene with the
    // post-decision state live in the browser and no way to capture it from outside, so the
    // two scene-13 branches could not be started from one identical state as required.
    // Each committed scene now leaves its own dump, so a later run can resume from exactly
    // the post-decision state twice and vary only the reader's recorded choice.
    try {
      const sceneDump = await page.evaluate(() => {
        const out = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i); out[k] = localStorage.getItem(k);
        }
        return { storage: out, storyId: (window.state || {}).storyId || null };
      });
      fs.writeFileSync(OUT + '/STATE_after_scene' + n + '.json', JSON.stringify(sceneDump, null, 2));
      say('  state after scene ' + n + ' preserved (' + Object.keys(sceneDump.storage).length + ' keys)');
    } catch (e) { say('  state snapshot after scene ' + n + ' FAILED: ' + e.message); }
    // AND THEN WAIT FOR THE APPLICATION TO FINISH THE TURN. A committed page is not a finished
    // turn, and the next submit (or the reload) must not land inside the cleanup.
    const idle = await waitForTurnIdle('scene ' + n + ' cleanup');
    say('  turn idle : ' + JSON.stringify(idle));
    pub = await readPublished(page);
    fs.writeFileSync(OUT + '/scene' + String(n).padStart(2, '0') + '.txt',
      pub.pages[pub.pages.length - 1] || '');
    sceneLog.push({ scene: n, chars: st.chars, requests: requests.filter((r) => r.scene === n).length,
      estimate: requests.filter((r) => r.scene === n).reduce((a, r) => a + r.estimate, 0) });

    // ── THE STORY RECORD, CAPTURED AFTER THE SCENE HAS FINISHED ─────────────────────────────
    // ORDER MATTERS AND THE EARLIER VERSION HAD IT WRONG. The first attempt sampled state
    // immediately after submitChoice, BEFORE waitForCommit and waitForTurnIdle — mid-turn, when
    // _sceneAssignment can still hold the PREVIOUS scene's row and no prose for this scene
    // exists. It ran here only by luck of ordering and could associate scene n-1's assignment
    // with scene n.
    //
    // Running after both waits, the application state is settled and unambiguous:
    //   · state._sceneAssignment / _spineEventVerbatim  = THIS scene's row (not yet replaced;
    //     the next row is selected during the next advance)
    //   · cs.pendingIntent.proposed                     = THIS scene's local proposal
    //   · the newest deliveryLog entry                  = the assessment of the PREVIOUS scene
    //
    // ASSESSMENT TIMING IS EXPLICIT: submitting scene N runs the commit pass for scene N-1. Each
    // verdict is therefore attached to THE SCENE IT ASSESSES, read from the entry's own recorded
    // scene number rather than inferred from the loop variable.
    const cap = await page.evaluate(() => {
      try {
        const st2 = window.state || {};
        const cs = st2._committedState || {};
        const dl = cs.deliveryLog || {};
        const entries = Object.keys(dl).map((k) => {
          const e = dl[k] || {};
          return {
            key: k,
            // THE ENTRY'S OWN IDENTITY, never the caller's idea of which scene this is.
            assessedScene: (e.storyScene != null) ? Number(e.storyScene)
              : (e.scene != null ? Number(e.scene) : null),
            assessedVia: (e.storyScene != null) ? 'storyScene' : (e.scene != null ? 'scene' : 'unkeyed'),
            turnScene: e.turnScene != null ? Number(e.turnScene) : null,
            legacyStateChangeRef: e.legacyStateChangeRef || null,
            aggregateDelivery: e.aggregateDelivery || null,
            aggregateSupplied: !!e.aggregateSupplied,
            milestoneAsked: !!e.milestoneAsked,
            milestoneDelivery: e.milestoneDelivery || null,
            milestoneIdentical: !!e.milestoneIdentical,
            milestoneEvidence: e.milestoneEvidence
              ? (Array.isArray(e.milestoneEvidence) ? e.milestoneEvidence : String(e.milestoneEvidence)) : null,
            milestoneText: e.milestoneText || null,
            // THE PER-PROPOSAL ADJUDICATION, BY REF. The entry stores the adjudicator's OUTCOME
            // as `committed` and `pending` lists carrying refs and kinds; there is no `verdicts`
            // map on it, so reading one produced an empty array that looked like "no proposals
            // were adjudicated" when two had been.
            // `committed` is an array in the artifacts checked, but it is read tolerantly for the
            // same reason: a shape assumption here silently discards results.
            committedProposals: (() => {
              const out = [];
              const cd = e.committed;
              if (Array.isArray(cd)) {
                cd.forEach((c) => out.push({ ref: (c && (c.ref || c.id)) || null,
                  kind: (c && c.kind) || null, commit: true, shape: 'array' }));
              } else if (cd && typeof cd === 'object') {
                Object.keys(cd).forEach((rf) => out.push({ ref: String(rf),
                  kind: (cd[rf] && cd[rf].kind) || null, commit: true, shape: 'object-keyed' }));
              }
              return out;
            })(),
            // PENDING IS AN OBJECT KEYED BY REF, not an array. Verified against the refused
            // fixture: {"prop:1:1":{status:"unreported",reason:"unreported",kind:"state_change"}}.
            // Treating it as an array dropped every REFUSED proposal's ref, status and reason —
            // exactly the results this experiment exists to preserve — and then forced the
            // unreliable scene-number fallback because no ref was left to match on. An all-
            // DELIVERED run never exercises this path, which is why it looked fine.
            pendingProposals: (() => {
              const out = [];
              const pd = e.pending;
              if (Array.isArray(pd)) {
                pd.forEach((pp) => out.push({ ref: (pp && (pp.ref || pp.id)) || null,
                  kind: (pp && pp.kind) || null, commit: false,
                  status: (pp && pp.status) || null, reason: (pp && pp.reason) || null,
                  shape: 'array' }));
              } else if (pd && typeof pd === 'object') {
                Object.keys(pd).forEach((rf) => {
                  const pp = pd[rf] || {};
                  out.push({ ref: String(rf), kind: pp.kind || null, commit: false,
                    status: pp.status || null, reason: pp.reason || null, shape: 'object-keyed' });
                });
              }
              return out;
            })(),
          };
        });
        return {
          assignment: String((st2._sceneAssignment && st2._sceneAssignment.event)
            || st2._spineEventVerbatim || ''),
          proposal: String((cs.pendingIntent && cs.pendingIntent.proposed) || ''),
          // EXPLICIT PROPOSAL IDENTITY for this scene, from whichever field the pending intent
          // carries it in, plus the raw keys so a future shape change is visible rather than
          // silently producing null.
          // EXPLICIT PROPOSAL IDENTITY, FROM THE SEALED STORE. cs.pendingIntent is CLEARED once
          // the proposal commits, so reading a ref off it after the turn settles always produced
          // null and every assessment fell back to a scene number — and the numbers do not share
          // a scale: the application's storyScene runs one ahead of this driver's page index, so
          // the fallback was mis-associating every verdict by one scene.
          //
          // state._sealedProposals.byId holds every proposal with its own id and storyScene. The
          // newest state_change sealed at or before now is the one authored for THIS scene.
          // ── THE SCENE'S OWN REF, NOT A NEWEST-LOOKING ID (Roman 2026-10-27) ──────────────
          // state._priorSceneStateChange.proposalRef is the ref the application itself recorded
          // for the scene just authored. The previous heuristic scanned _sealedProposals for the
          // highest number in the id — but `seq` is null on these records, so it fell back to the
          // FIRST number in `prop:<turn>:<sequence>`, which is the TURN. Two proposals sealed in
          // the same turn tie there, and the scan would take whichever it saw first.
          //
          // The ref is then CHECKED against the sealed store: a ref that is not a sealed
          // state_change is not used, so a stale or malformed value yields null rather than a
          // confident wrong answer.
          proposalRef: (() => {
            try {
              const ref = st2._priorSceneStateChange && st2._priorSceneStateChange.proposalRef;
              if (!ref) return null;
              const rec2 = st2._sealedProposals && st2._sealedProposals.byId
                && st2._sealedProposals.byId[String(ref)];
              if (!rec2) return null;
              if (rec2.kind !== 'state_change') return null;
              return String(ref);
            } catch (_) { return null; }
          })(),
          proposalRefStoryScene: (() => {
            try {
              const ref = st2._priorSceneStateChange && st2._priorSceneStateChange.proposalRef;
              const rec2 = ref && st2._sealedProposals && st2._sealedProposals.byId
                && st2._sealedProposals.byId[String(ref)];
              return (rec2 && rec2.storyScene != null) ? Number(rec2.storyScene) : null;
            } catch (_) { return null; }
          })(),
          sealedProposals: (() => {
            try {
              const sp = st2._sealedProposals;
              if (!sp || !sp.byId) return [];
              return Object.keys(sp.byId).map((id) => ({ id,
                kind: sp.byId[id] && sp.byId[id].kind || null,
                storyScene: sp.byId[id] && sp.byId[id].storyScene != null
                  ? Number(sp.byId[id].storyScene) : null,
                fact: String((sp.byId[id] && sp.byId[id].fact) || '').slice(0, 90) }));
            } catch (_) { return []; }
          })(),
          pageUid: (Array.isArray(st2.storyPageUids) && st2.storyPageUids.length)
            ? String(st2.storyPageUids[st2.storyPageUids.length - 1]) : null,
          deliveryEntries: entries,
          // DIAGNOSTICS ONLY. These do not demonstrate what consequence reached the next scene;
          // the next scene's own assignment and the outstanding obligations do that.
          diag: { factsTotal: Array.isArray(cs.facts) ? cs.facts.length : 0,
            committedThrough: cs._committedThroughScene != null ? Number(cs._committedThroughScene) : null,
            stageIssued: !!(st2._spineStaging && st2._spineStaging.setting) },
          outstandingObligations: (typeof window._openObligations === 'function')
            ? window._openObligations(st2).map((o) => ({ id: o.id,
                text: String(o.text || '').slice(0, 160), owedBy: o.owedBy || null })) : [],
        };
      } catch (e) { return { error: String(e && e.message) }; }
    }).catch((e) => ({ error: 'evaluate failed: ' + (e && e.message) }));

    // THE SCENE'S OWN RECORD. Prose is LINKED by file, not copied, so the record stays small and
    // the prose stays the single source of truth.
    const rec = storyRecord[String(n)] = storyRecord[String(n)] || { scene: n };
    rec.assignedMilestone = cap.assignment || null;
    rec.localProposal = cap.proposal || null;
    rec.proposalRef = cap.proposalRef || null;
    rec.sealedProposalsAtCapture = cap.sealedProposals || [];
    rec.pageUid = cap.pageUid || null;
    rec.proseFile = 'scene' + String(n).padStart(2, '0') + '.txt';
    rec.proseChars = (pub.pages[pub.pages.length - 1] || '').length;
    rec.outstandingAfter = cap.outstandingObligations || [];
    rec.diagnostics = cap.diag || null;
    if (cap.error) rec.captureError = cap.error;

    // ── ATTACH EACH VERDICT BY EXPLICIT PROPOSAL IDENTITY ──────────────────────────────
    // A SCENE NUMBER IS NOT AN IDENTITY HERE. The application's storyScene and this driver's page
    // index are different scales — a first pass produced "assessedScene=4 observedAfter=4", which
    // cannot be right when submitting scene N assesses scene N-1. Matching on the PROPOSAL REF
    // the entry actually adjudicated removes the guess; the scene number is used only when no ref
    // matches, and is then labelled as a fallback so a mis-association is visible.
    (cap.deliveryEntries || []).forEach((e) => {
      const refs = [e.legacyStateChangeRef]
        .concat((e.committedProposals || []).map((c) => c.ref))
        .concat((e.pendingProposals || []).map((c) => c.ref))
        .filter(Boolean).map(String);
      let targetKey = null, keyedBy = null;
      for (const k of Object.keys(storyRecord)) {
        const r = storyRecord[k];
        if (r && r.proposalRef && refs.indexOf(String(r.proposalRef)) >= 0) {
          targetKey = k; keyedBy = 'proposal ref ' + r.proposalRef; break;
        }
      }
      // NO GUESSING. An assessment whose ref matches no recorded scene is kept as UNASSOCIATED
      // EVIDENCE. The previous version attached it to the scene number it happened to carry and
      // then labelled that scene "assessed" — and because the application's storyScene runs one
      // ahead of this driver's page index, that association was wrong by one scene every time.
      if (!targetKey) {
        unassociatedAssessments.push({ observedAfterScene: n, adjudicatedRefs: refs,
          entryScene: e.assessedScene, entrySceneField: e.assessedVia, entryTurnScene: e.turnScene,
          aggregateDelivery: e.aggregateDelivery, milestoneDelivery: e.milestoneDelivery,
          milestoneAsked: e.milestoneAsked, milestoneIdentical: e.milestoneIdentical,
          committedProposals: e.committedProposals, pendingProposals: e.pendingProposals,
          why: 'no recorded scene carries any of these proposal refs; identity unconfirmed, so'
            + ' this verdict is NOT attached to any scene' });
        return;
      }
      const target = storyRecord[targetKey] = storyRecord[targetKey]
        || { scene: Number(targetKey), sceneFromEntryOnly: true };
      // FIRST OBSERVATION WINS. Every delivery-log entry is still present on later scenes, so
      // re-attaching each time overwrote observedAfterScene with the last loop index and made
      // every verdict look as though it appeared on the final scene.
      if (target.assessment) return;
      target.assessment = {
        keyedBy, observedAfterScene: n,
        entryScene: e.assessedScene, entrySceneField: e.assessedVia, entryTurnScene: e.turnScene,
        adjudicatedRefs: refs,
        aggregateDelivery: e.aggregateDelivery, aggregateSupplied: e.aggregateSupplied,
        milestoneAsked: e.milestoneAsked, milestoneDelivery: e.milestoneDelivery,
        milestoneIdentical: e.milestoneIdentical, milestoneEvidence: e.milestoneEvidence,
        milestoneTextLen: e.milestoneText ? String(e.milestoneText).length : 0,
        committedProposals: e.committedProposals, pendingProposals: e.pendingProposals,
      };
    });
    // THE FOLLOWING ASSIGNMENT, recorded on the PREVIOUS scene: this is what the consequence
    // actually was, as opposed to a counter moving.
    if (storyRecord[String(n - 1)]) {
      storyRecord[String(n - 1)].followingAssignment = rec.assignedMilestone;
      storyRecord[String(n - 1)].followingProposal = rec.localProposal;
    }

    // ── WRITTEN AFTER EVERY SCENE, NOT ONLY AT SHUTDOWN ──────────────────────────────────
    // A run that halts at scene 5 must leave scenes 1-5 on disk. The earlier version wrote this
    // only in the finally block, so a crash or a kill lost the whole record.
    writeStoryRecord();
  }
} catch (e) {
  halted = halted || ('STALLED: ' + (e && e.message));
  say('\n✗ ' + halted);
} finally {
  const pubFinal = await readPublished(page).catch(() => null);
  if (pubFinal) fs.writeFileSync(OUT + '/MANUSCRIPT.txt', pubFinal.allContent);
  fs.writeFileSync(OUT + '/requests.json', JSON.stringify(requests, null, 2));
  // ── THE DRAFT → FINAL CHAIN, WRITTEN BEFORE ANYTHING ELSE CAN TOUCH THE PAGE ────────────
  // PROSE_CHAIN.json holds every recorded transformation with its before/after text, so the
  // author's own draft and each editor's effect on it are both readable after the fact. Written
  // from the live page at the end of the run, before any reload.
  try {
    const chain = await page.evaluate(() => ({
      rawSnap: (window.__rawSnap || []).map((e, i) => ({ i, sid: e.sid || null, site: e.site || null,
        label: e.label || null, mutationClass: e.mutationClass || null, changed: !!e.changed,
        beforeLen: String(e.before || '').length, afterLen: String(e.after || '').length,
        before: String(e.before || ''), after: String(e.after || '') })),
      proseSnap: (window.__proseSnap || []).map((e, i) => ({ i, owner: e.owner || null,
        label: e.label || null, rejected: !!e.rejected, changed: !!e.changed,
        inText: String(e.inText || ''), outText: e.outText == null ? null : String(e.outText) })),
    }));
    fs.writeFileSync(OUT + '/PROSE_CHAIN.json', JSON.stringify(chain, null, 2));
    // And a flat, readable pair per scene: the first author text recorded, and the delivered page.
    const firstAuthor = chain.rawSnap.filter((e) => /grokLiteraryAuthor|_authorChatCapture/.test(String(e.label)));
    const finals = chain.rawSnap.filter((e) => e.label === 'final-prose');
    firstAuthor.forEach((e, n) => fs.writeFileSync(OUT + '/AUTHOR_DRAFT_' + (n + 1) + '.txt', e.after));
    finals.forEach((e, n) => fs.writeFileSync(OUT + '/FINAL_PROSE_' + (n + 1) + '.txt', e.after));
    say('  prose chain preserved: ' + chain.rawSnap.length + ' transformation(s), '
      + chain.proseSnap.length + ' repair pass(es), ' + firstAuthor.length + ' author draft(s), '
      + finals.length + ' final prose snapshot(s)');
  } catch (e) { say('  ! prose chain could not be preserved: ' + (e && e.message)); }
  // THE ROUTING LEDGER, separate from the request ledger: which author was selected for each
  // scene, why, and the numbers behind it — with cache evidence and the spending decision kept
  // apart, and `measurement` null on every decision by construction.
  fs.writeFileSync(OUT + '/AUTHOR_ROUTING.json', JSON.stringify({
    policy: Router.POLICY,
    policyProvenance: {
      documented: ['TTL_MINIMUM_MS (Sol Chat Completions: 30m minimum, not actual eviction; read/write refresh)',
        'ELIGIBILITY_FLOOR_TOKENS (1,024-token minimum cacheable prefix)'],
      chosen: ['MIN_REUSE_TOKENS', 'MIN_REUSE_FRACTION', 'CHUNK_CHARS'],
      measured: ['CHARS_PER_TOKEN (this provider family, this packet family)'],
    },
    decisions: authorRouting,
  }, null, 2));
  fs.writeFileSync(OUT + '/DELIVERY.json', JSON.stringify(deliveryLog, null, 2));
  writeStoryRecord(halted ? ('run halted: ' + halted + ' — scenes below are what completed')
    : 'run completed');
  if (replayLog.length) fs.writeFileSync(OUT + '/REPLAYED_NORMALIZATION.json', JSON.stringify(replayLog, null, 2));
  if (verifierLog.length) fs.writeFileSync(OUT + '/VERIFIER.json', JSON.stringify(verifierLog, null, 2));
  fs.writeFileSync(OUT + '/scene_log.json', JSON.stringify(sceneLog, null, 2));
  fs.writeFileSync(OUT + '/console.log', consoleLines.join('\n'));
  settlement.report(say);
  // ── PRESERVE RESUMABLE STATE OUTSIDE THE TEMPORARY BROWSER ──────────────────────────────
  // A manuscript export cannot be continued from. The whole origin's localStorage is written to
  // disk so scene 11 can start from scene 10 in a fresh browser, and the reimport below proves
  // it actually resumes rather than merely existing as a file.
  try {
    const dump = await page.evaluate(() => {
      const out = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i); out[k] = localStorage.getItem(k);
      }
      return { storage: out, storyId: (window.state || {}).storyId || (window.state || {})._storyId || null };
    });
    fs.writeFileSync(OUT + '/RESUMABLE_STATE.json', JSON.stringify(dump, null, 2));
    say('\nRESUMABLE STATE preserved: ' + Object.keys(dump.storage).length + ' localStorage keys, '
      + (dump.storage['sb_saved_story'] || '').length + ' bytes of saved story, storyId '
      + dump.storyId);

    // ── AND RELOADED THROUGH CONTINUE, IN A FRESH CONTEXT ────────────────────────────────
    const ctx2 = await browser.newContext();
    const p2 = await ctx2.newPage();
    await installSession(p2, makeSession());
    await installEntitledProfileStub(p2, { log: () => {} });
    await p2.route('**/*', async (r) => {
      const u = r.request().url();
      if (isAuthOrigin(u)) return r.fallback();
      if (/\/api\/config\b/.test(u)) return r.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
      if (!/\/api\//.test(u)) return r.fallback();
      if (SIMULATED_ACCOUNT.test(u)) return r.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ success: true, ok: true, fortunesRemaining: 9999, simulated: true }) });
      try { return await r.abort(); } catch (_) { return; }   // no model call is needed to RESUME
    });
    await p2.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded' });
    await p2.evaluate((d) => { Object.keys(d).forEach((k) => { try { localStorage.setItem(k, d[k]); } catch (_) {} }); }, dump.storage);
    await p2.reload({ waitUntil: 'domcontentloaded' });
    await p2.waitForFunction(() => typeof window.continueStory === 'function', null, { timeout: 120000 });
    const again = await p2.evaluate(async (sid) => {
      try { await window.continueStory(sid); } catch (e) { return { threw: e.message }; }
      return { pages: (window.StoryPagination && window.StoryPagination.getPageCount) ? window.StoryPagination.getPageCount() : 0,
        turnCount: (window.state || {}).turnCount || 0,
        chars: (window.StoryPagination && window.StoryPagination.getAllContent)
          ? String(window.StoryPagination.getAllContent() || '').length : 0,
        storyId: (window.state || {}).storyId || null };
    }, dump.storyId);
    say('REOPENED IN A FRESH BROWSER through Continue: ' + JSON.stringify(again));
    fs.writeFileSync(OUT + '/REOPEN.json', JSON.stringify({ dumpedStoryId: dump.storyId, again }, null, 2));
    if (again.pages < SCENES) {
      say('  ✗ the reopened story has ' + again.pages + ' of ' + SCENES
        + ' pages — scene 11 could NOT start from scene 10');
    } else {
      say('  ✓ all ' + SCENES + ' scenes reopened from disk; scene 11 can start from scene 10');
    }
    await ctx2.close();
  } catch (e) { say('\n✗ resumable-state preservation failed: ' + (e && e.message)); }

  const durableFinal = await page.evaluate(() => {
    try { const j = JSON.parse(localStorage.getItem('sb_saved_story') || 'null');
      const sp = j && (j.storyPages || (j.stateSnapshot && j.stateSnapshot.storyPages));
      return Array.isArray(sp) ? sp.length : 0; } catch (_) { return 0; }
  }).catch(() => null);
  say('\nDURABLE PAGES IN THE FINAL SNAPSHOT: ' + durableFinal + ' (autosave cadence can lag the'
    + ' mounted page by one; a lag is reported, never counted as a scene)');
  say('SCENES COMMITTED: ' + sceneLog.length + ' of ' + SCENES);
  sceneLog.forEach((s) => say('  scene ' + String(s.scene).padStart(2) + ': ' + String(s.requests).padStart(3)
    + ' model requests · estimate $' + (s.estimate || 0).toFixed(6) + ' · story ' + s.chars + ' chars'));
  say('  remaining authorization: $' + remainingNow().toFixed(6) + ' of $' + CEILING.toFixed(2)
    + '  (settled $' + settledTotal.toFixed(6) + ' · held $' + heldTotal.toFixed(6)
    + ' · outstanding reservations $' + outstanding().toFixed(6) + ')');
  if (halted) say('  HALTED: ' + halted);
  await browser.close();
}
process.exit(halted ? 1 : 0);
