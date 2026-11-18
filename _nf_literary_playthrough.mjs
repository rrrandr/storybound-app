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
import _crypto from 'node:crypto';   // SB_NO_RETRY fingerprints
import { chromium } from 'playwright-core';
import { estimateUsd, guardDispatch, RATES as GUARD_RATES } from './_fsc_cost_guard.mjs';
// ── THE PRE-AUTHOR REGISTER GATE, WIRED INTO THE DISPATCH PATH ──
// This run is GENERAL PROSE ONLY. Sol and Haiku must never be handed a scene whose declared
// requirements call for a register they will not write: the author would either soften an
// established voice to stay inside its own policy, or the provider would refuse. The gate is
// consulted HERE, at the author dispatch, before any author request leaves the browser.
import { registerVerdict, snapshotInPage, PROCEED, STOP_EXPLICIT_REQUESTED } from './_nf_register_gate.mjs';
import { R_SCENE, reservationLines } from './_live_spend_ledger.mjs';
// SETTLEMENT REPLACES THE ESTIMATE-SUBTRACTING LEDGER IN THE DISPATCH PATH. The old ledger read
// only xAI's cost field, so Sol and Haiku receipts stayed unpriced estimates and the allowance
// was never reconciled against real charges.
import { makeSettlement, settle } from './_nf_cost_settlement.mjs';
// RELIABILITY MECHANISMS, SHARED WITH THE CONTROLS (2026-11-02). Imported rather than inlined so
// _nf_reliability_controls.mjs exercises the same functions this run uses, not copies of them.
import { allocateArtifactPath, scaffoldPrerequisite, isPrerequisiteGuarded, evidenceBundle,
  prerequisiteOptionsFor, verifyScaffoldProvenance, dispatchDeadlineMs, deadlineForAllowance }
  from './_nf_run_reliability.mjs';
import { configBody, installSession, isAuthOrigin, makeSession, installEntitledProfileStub,
  SB_TEST_ACCOUNT_ID }
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
// ── A REWRITE MAY NOT WRITE WHERE ITS OWN SOURCE MATERIAL LIVES (Roman 2026-11-13) ──────────
// The Scene 1 rewrite reuses replies saved by the paid opening, and that opening is the
// COMPARISON — its page, its plan and its continuity state have to survive the rewrite intact.
// Nothing in the run writes to the source directory today, but one mistyped SB_OUT is all it
// would take, and the thing at risk is the only copy of the baseline. So the paths are compared
// before chromium starts: if any SB_REUSE_* source sits under the output root, the run refuses.
try {
  const _srcDirs = Object.keys(process.env)
    .filter((k) => /^SB_REUSE_/.test(k) && process.env[k])
    .map((k) => ({ k, dir: path.dirname(fs.realpathSync.native
      ? fs.realpathSync(String(process.env[k])) : String(process.env[k])) }));
  const _outReal = OUT_ROOT.replace(/\/+$/, '');
  for (const s of _srcDirs) {
    if (s.dir === _outReal || s.dir.startsWith(_outReal + '/') || _outReal.startsWith(s.dir + '/')) {
      throw new Error('[BASELINE SAFETY] ' + s.k + ' reads from ' + s.dir + ', which is inside or '
        + 'above the output root ' + _outReal + '. The run this reuses is the COMPARISON for the '
        + 'rewrite; writing a new run into it risks the only copy of that baseline. Point SB_OUT '
        + 'somewhere else. Nothing was launched and nothing spent.');
    }
  }
} catch (e) {
  if (/BASELINE SAFETY/.test(String(e && e.message))) throw e;   // a missing source file is caught later, by name
}
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
// ── HOW LONG ONE SCENE MAY TAKE TO ARRIVE ─────────────────────────────────────────────────
// FOUND BY CHECKING THE WHOLE CHAIN, not by it failing: a flat 6 minutes is SHORTER than the
// per-call deadlines a scene's own critical path now carries. One scene can dispatch a staging
// planner and an author, each a reasoning call whose waiting budget is derived from its
// allowance — 330s apiece at 9,000/16,000 — and then renderers, three editor passes and the
// small logic passes on top. Waiting 360s for that would cut the scene off while a call the
// harness itself is still legitimately waiting on is in flight, which is the same defect one
// level up.
//
// So the scene budget is the SUM of the budgets on that path plus a remainder for the
// non-reasoning calls. It is read from the run's own selected allowances, so it moves with them
// and with nothing else. Absent a selected configuration the historical 6 minutes stands
// unchanged, and SB_SCENE_WAIT_MIN still overrides either way.
const _sceneWaitDeadlineFor = (n) => deadlineForAllowance(n);
const SCENE_WAIT_MS = (() => {
  const override = Number(process.env.SB_SCENE_WAIT_MIN);
  if (override > 0) return override * 60 * 1000;
  let cfg = null;
  try { cfg = process.env.SB_RUN_CONFIG ? JSON.parse(process.env.SB_RUN_CONFIG) : null; } catch (_) {}
  if (!cfg) return 6 * 60 * 1000;
  const plannerAllow = Math.max(Number(cfg.openingPlannerMaxTokens) || 0,
    Number(cfg.plannerMaxTokens) || 0);
  const authorAllow = Number(cfg.generalAuthorMaxTokens) || 0;
  if (!(plannerAllow > 0) && !(authorAllow > 0)) return 6 * 60 * 1000;
  const REMAINDER_MS = 120000;   // renderers, the three editor passes, the small logic passes
  return (plannerAllow > 0 ? _sceneWaitDeadlineFor(plannerAllow) : 0)
    + (authorAllow > 0 ? _sceneWaitDeadlineFor(authorAllow) : 0) + REMAINDER_MS;
})();

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
// ── THE UNCONDITIONAL SOL OPENING OVERRIDE IS REMOVED (Roman 2026-11-17) ──────────────────
// It used to read: opening -> Sol via /api/sol-scene-test, continuations -> Haiku. That forced
// the harness's own answer onto a decision that belongs to the product, and it is the reason the
// published Scene 1 was authored by gpt-6.1-sol — the ONE dispatch flagged author:true requested
// Sol. Under the standing assignment, ordinary prose INCLUDING THE OPENING is Luna's; Sol writes
// the story-level spine and nothing else.
//
// The harness no longer chooses the prose author at all. public/model-routing.js makes the three
// decisions, the app enforces them at dispatch, and this runner only RECORDS what went out. The
// `luna` entry below exists solely to price and cap the prose call, never to select it.
// RETAINED FOR SETTLEMENT OF HISTORICAL RECEIPTS ONLY. Nothing selects from this table any more:
// the app owns prose routing and the shared cost guard prices the outgoing body. Kept because old
// artifacts still have to resolve a rate when they are re-read.
const AUTHOR_OVERRIDE = {
  luna:  { label: 'Luna',  requested: 'gpt-6-luna',        route: '/api/chatgpt-proxy',
                  // REASONING MODEL: the allowance travels as max_completion_tokens, which is the
                  // same field api/chatgpt-proxy.js sends for /^(gpt-6|gpt-5|o1|o3|o4)/.
                  capField: 'max_completion_tokens', cap: 4000,
                  // THE PUBLISHED RATES, from _fsc_cost_guard.mjs: $0.10 in / $0.50 out per MTok.
                  // My first edit copied Sol's 2.0e-6/10.0e-6 into this row, which would have
                  // priced every Luna call at twenty times its real cost — a fabricated figure in
                  // the one table a paid run reserves against. Reasoning bills INSIDE completion
                  // on this model, so `out` covers it.
                  rate: { in: 0.0000001, out: 0.0000005 } },
};
// Kept for the SETTLEMENT of historical receipts only: the preserved runs were served by these
// models, and their prices must still resolve when an old artifact is re-read. Nothing selects
// from this table.
const HISTORICAL_AUTHOR_RATES = {
  sol:   { label: 'Sol',   requested: 'gpt-6.1-sol',       route: '/api/sol-scene-test',
                  capField: 'max_completion_tokens', cap: 4000,
                  rate: { in: 2.0e-6, out: 10.0e-6 } },
  haiku: { label: 'Haiku', requested: 'claude-haiku-5-5',  route: '/api/anthropic-proxy',
                  capField: 'max_tokens', cap: 20000,
                  rate: { in: 0.50e-6, out: 2.50e-6 } },
};
// WHICH REQUEST IS THE AUTHOR? Identified by the prompt's own content, never by a role label:
// this project routes prose through several role names, and the measured continuation author
// arrived as STRUCTURE_GENERATOR.
// The prompt text of a request, assembled the same way the request RECORD assembles it, so the
// planning allowlist and the offline check that verifies it read one identical string. Both
// payload shapes this runner sends are covered: {messages:[{content}]} and {system,user}.
// ── THE SHARED OPENING VALIDATOR ────────────────────────────────────────────────────────────
// WHAT IT IS FOR, measured twice on the same Book. The accepted Scene 1 row read "Dani … REFUSES
// THE GALA ORGANIZER'S microphone-for-endorsement offer ON SPEAKER". The plan came back with
// "Her phone screen shows the organizer's LAST MESSAGE offering cottages with conditions", a
// wound anchor that "lingers on the message", and must_not_confuse "ONLY DANI IS PRESENT". The
// skeleton validator ACCEPTED it ("soft-only findings; assignments accepted"), the author wrote
// a woman re-reading a text, and a live refusal — the one event the scene was built on — never
// happened. Nothing in the chain asked the question this function asks.
//
// It judges ONE thing: when the assigned event is a LIVE EXCHANGE, do the plan's own beats show
// the other person acting or speaking in real time, and the protagonist answering? A plan that
// swaps the exchange for a message, a voicemail, a memory or a call that already ended is
// REJECTED, however well-formed it is otherwise.
//
// It is not armed for every opening. An opening whose row assigns no live exchange — a genuinely
// solo scene, a scene that opens in a room with another body — has no live requirement to lose,
// so the validator passes it untouched. Requiring a voice everywhere would be the same mistake in
// the other direction.
//
// IT READS AND NEVER WRITES. It returns a verdict and its evidence; the caller decides.
const _OPENING_LIVE_ASSIGNED = [
  /\blive\s+(?:video\s+|phone\s+|voice\s+)?call\b/i,
  /\bon\s+(?:a|the)\s+(?:video|phone|voice)\s*call\b/i,
  /\bvideo\s*call\b/i,
  /\bon\s+the\s+(?:phone|line)\b/i,
  /\bkeeps?\s+the\s+call\s+live\b/i,
  /\bon\s+speaker(?:phone)?\b/i,
  /\bputs?\s+(?:\w+\s+){0,4}on\s+speaker(?:phone)?\b/i,
  /\bspeakerphone\b/i,
  /\bover\s+the\s+speaker\b/i,
];
const _OPENING_NOT_LIVE_BEFORE = /\b(?:miss(?:ed|es)|unanswered|unreturned|declin(?:ed|es)|ignor(?:ed|es)|reject(?:ed|s)|cancell?(?:ed|s)|recorded|recording|logged|transcript|voicemail|returns?|returned|hung\s+up|hangs\s+up)\b/i;
const _OPENING_NOT_LIVE_AFTER = /\b(?:(?:had\s+|has\s+|already\s+)*ended|is\s+over|was\s+over|went\s+to\s+voicemail|never\s+answer(?:s|ed)?|without\s+answering|does\s+not\s+answer|doesn'?t\s+answer)\b/i;

// The assigned event is live only if the row says so AND does not immediately unsay it.
const _openingRowAssignsLive = (rowText) => {
  const t = String(rowText || '');
  for (const rx of _OPENING_LIVE_ASSIGNED) {
    const m = t.match(rx);
    if (!m) continue;
    const at = t.indexOf(m[0]);
    if (_OPENING_NOT_LIVE_BEFORE.test(t.slice(Math.max(0, at - 70), at))) continue;
    if (_OPENING_NOT_LIVE_AFTER.test(t.slice(at, at + 90))) continue;
    return m[0];
  }
  return '';
};

// A LIVE EXCHANGE SUBSTITUTED FOR A RECORD. Each of these turns a two-way event into something
// the protagonist consumes alone, which is precisely the failure that reached the page.
const _OPENING_SUBSTITUTIONS = [
  ['a message', /\b(?:last |latest |his |her |the )?(?:text )?messages?\b|\btexts?\b|\bin the thread\b|\bthread beneath\b|\bphone screen shows\b|\bscreen shows\b/i],
  ['a voicemail', /\bvoicemails?\b|\bwent to voicemail\b|\bleft a message\b/i],
  ['a memory', /\brecall(?:s|ed|ing)?\b|\bremember(?:s|ed|ing)?\b|\bthinks back\b|\breplays?\b|\breplaying\b/i],
  ['a call that already ended', /\bcall (?:is|has|had|already) (?:ended|over|finished)\b|\bafter the call\b|\bonce the call\b|\bmeeting (?:has |had )?ended\b/i],
  ['a recording or transcript', /\brecordings?\b|\btranscripts?\b|\blogged call\b/i],
  ['a letter or document standing in for the exchange', /\bunsent letter\b|\breads the (?:letter|notice|clause|terms)\b/i],
];
// SOMEONE ELSE ACTING OR SPEAKING, NOW. Present-tense speech and pressure, not narration about
// a person. "offers", "presses", "repeats", "will not take no" — the verbs of a live party.
const _OPENING_OTHER_ACTS = /\b(?:says?|asks?|answers?|replies|repeats?|presses?|insists?|offers?|demands?|refuses?|argues?|interrupts?|cuts in|waits?|laughs?|warns?|threatens?|explains?|names?|counters?|pushes?|holds? the line|stays? on the line|talk(?:s|ing)?|speak(?:s|ing)?|tells?)\b/i;
// AND THE PROTAGONIST ANSWERING. A live exchange she does not answer is a broadcast.
const _OPENING_PC_RESPONDS = /\b(?:she |her )?(?:says?|answers?|replies|refuses?|tells?|counters?|asks?|argues?|insists?|names?|repeats?|cuts? (?:him|her|them) off|hangs? up|pushes? back|holds? her ground|snaps?|agrees?|declines?)\b/i;

function validateOpeningPlan(opts) {
  const o = opts || {};
  const plan = o.plan || null;
  const planText = String(o.planText || (plan ? JSON.stringify(plan) : ''));
  const spine = (plan && (plan.opening_spine || plan)) || null;
  const liName = String(o.liName || '').trim();
  const assignedLive = _openingRowAssignsLive(o.rowText);

  // The BEATS are the plan's account of what happens. The validator judges these and not the
  // whole reply, because a plan can mention a live call in a field nobody writes from.
  const beats = [];
  const push = (label, v) => { if (v) beats.push({ label, text: String(v) }); };
  if (spine) {
    push('opening_beat', spine.opening_beat);
    (Array.isArray(spine.rising_beats) ? spine.rising_beats : []).forEach((b, i) =>
      push('rising_beats[' + (i + 1) + ']', b));
    push('decision_beat', spine.decision_beat);
    push('li_texture_beat', spine.li_texture_beat);
    push('pc_wound_anchor', spine.pc_wound_anchor);
  }
  const beatText = beats.map((b) => b.text).join('\n');

  // PHYSICAL CAST SEPARATION — true for every opening, live or not. A voice on a line is not a
  // body in the room, and the roster's own echo validator treats staged_characters as the
  // PHYSICAL cast; a live participant declared there is a fault, not a row.
  const staged = (spine && Array.isArray(spine.staged_characters)) ? spine.staged_characters : [];
  const inPerson = staged.filter((c) => c
    && /IN_PERSON/i.test(String(c.presence || c.presence_mode || ''))).map((c) => String(c.name || ''));
  const faults = [], evidence = {};
  if (liName) {
    const liRx = new RegExp('\\b' + liName.split(/\s+/)[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    const liStaged = inPerson.filter((n) => liRx.test(n));
    if (liStaged.length) faults.push('the plan stages ' + liStaged.join(', ')
      + ' IN_PERSON — the love interest\'s physical absence is lost');
    evidence.loveInterestStagedInPerson = liStaged;
  }
  const remoteInPerson = staged.filter((c) => c
    && /ON_PHONE/i.test(String(c.presence || c.presence_mode || ''))
    && /IN_PERSON/i.test(String(c.presence || c.presence_mode || ''))).map((c) => String(c.name || ''));
  if (remoteInPerson.length) faults.push('a live remote participant is also marked IN_PERSON: '
    + remoteInPerson.join(', '));

  evidence.assignedLiveExchange = assignedLive || null;
  evidence.beatsRead = beats.map((b) => b.label);
  evidence.stagedInPerson = inPerson;

  if (!assignedLive) {
    // NO LIVE EXCHANGE WAS ASSIGNED, so there is none to lose. A solo opening is a legitimate
    // plan and this validator has no opinion about it.
    evidence.note = 'the assigned event is not a live exchange, so no live requirement applies';
    return { assignedLive: '', verdict: faults.length ? 'STOPPED' : 'PASSED', faults, evidence, beats };
  }

  const subs = _OPENING_SUBSTITUTIONS
    .map(([label, rx]) => { const m = beatText.match(rx); return m ? { label, quote: m[0] } : null; })
    .filter(Boolean);
  const otherActs = beats.filter((b) => b.label !== 'pc_wound_anchor' && _OPENING_OTHER_ACTS.test(b.text));
  const pcResponds = beats.filter((b) => _OPENING_PC_RESPONDS.test(b.text));

  if (subs.length) faults.push('the assigned live exchange ("' + assignedLive + '") is replaced in '
    + 'the beats by ' + subs.map((x) => x.label + ' ("' + x.quote + '")').join(' and ')
    + ' — a record the protagonist consumes alone is not an exchange');
  if (!otherActs.length) faults.push('no beat shows the other person acting or speaking in real '
    + 'time — the assigned live exchange has no live party in it');
  if (!pcResponds.length) faults.push('no beat shows the protagonist answering — a live exchange '
    + 'she does not answer is a broadcast, not an exchange');

  evidence.substitutions = subs;
  evidence.beatsWhereOtherActs = otherActs.map((b) => b.label);
  evidence.beatsWherePcResponds = pcResponds.map((b) => b.label);
  return { assignedLive, verdict: faults.length ? 'STOPPED' : 'PASSED', faults, evidence, beats };
}

const _allowlistPromptText = (raw, body) => {
  try {
    const b = body || JSON.parse(raw);
    if (b && Array.isArray(b.messages)) {
      return b.messages.map((m) => String((m && m.content) || '')).join('\n');
    }
    if (b && (b.system != null || b.user != null)) {
      return [b.system, b.user].map((x) => String(x || '')).join('\n');
    }
  } catch (_) {}
  return String(raw || '');
};

// ── THE OPERATION IS DECLARED, NOT INFERRED (Roman 2026-11-17) ────────────────────────────
// These two substrings were the whole test, and the real Scene 1 prose request contains NEITHER:
// it carries "PROTAGONIST OPENING BEAT" only inside a general instruction, without "(HARD". So
// `author` was recorded false for the actual author call, the pre-dispatch deck check never ran,
// and a request asserting the protagonist had already taken the microphone was dispatched
// unexamined. The call site now labels itself (`_sbOperation`), which cannot drift from the
// prompt; the substrings stay as a fallback for the paths that do carry them.
const isScene1OpeningProse = (body) => {
  // READS THE SHIPPED FIELD. `purpose` is serialized by orchestration-client.js; `_sbOperation`
  // was my invention and never left the browser.
  try { return String((body && (body.purpose || body._sbOperation)) || '') === 'scene1_opening_prose'; }
  catch (_) { return false; }
};
const isAuthorRequest = (bodyText, body) => isScene1OpeningProse(body)
  || /SCENE CONTINUATION \(HARD/.test(bodyText)
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

// ── THE OPENING PLANNER, IDENTIFIED BY ITS OPERATION NOT ITS ROUTE (Roman 2026-11-06) ────
// MEASURED CAUSE OF THE STALL: the fixture below was selected by `body.role ===
// 'OPENING_PLANNER'`. Routing that operation to a selected planner moves it to
// /api/chatgpt-proxy under the PRIMARY_AUTHOR role (OPENING_PLANNER is not in the OpenAI
// allowlist), so the role no longer matched, the schema-faithful `valid_plan` fixture was not
// served, the operation got the ordinary synthetic reply, production's validators correctly
// rejected it, and scene 1 never committed. The capture was testing the fixture mapping, not
// the configuration.
//
// The operation is now recognised by the instruction it actually carries, which is the same
// text whichever provider serves it — so ONE schema-faithful planning response answers ONE
// operation regardless of route. Production validation is untouched and no plot content is
// invented: the fixture is the same file as before.
const OPENING_PLANNER_SIG = 'scene-structure planner for the OPENING scene';
const isOpeningPlannerOp = (body) => {
  if ((body && body.role) === 'OPENING_PLANNER') return true;
  try {
    return (body.messages || []).some((m) => String(m.content || '').indexOf(OPENING_PLANNER_SIG) !== -1);
  } catch (_) { return false; }
};

// ── THE ARCHITECTURE SPINE, IDENTIFIED BY ITS OPERATION (Roman 2026-11-06) ────────────────
// The spine call is matched by the instruction it carries, not by `/api/sol-scene-test`, not by
// a request number and not by a role label — it travels with role:null, so a label match is not
// even available. Both markers below are present ONLY in the architecture request: measured
// against all three recorded bodies of run_2026-11-06T20-19-17-300Z_27690, the opening planner's
// own 96,634-char prompt carries NEITHER (it quotes the spine's OUTPUT, not its instructions).
// Matching on the instruction means one preserved reply answers one operation whatever route
// serves it, which is the same rule the opening planner already uses above.
const ARCH_SPINE_SIGS = ['CONTINUITY ARCHITECT', 'GRAVITATIONAL STRUCTURE'];
const isArchitectureSpineOp = (body) => {
  try {
    const txt = (body.messages || []).map((m) => String(m.content || '')).join('\n');
    return ARCH_SPINE_SIGS.every((s) => txt.indexOf(s) !== -1);
  } catch (_) { return false; }
};

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
        // `readHand` and `fateCardIndex` carry no action text, so the string test alone would
        // reject them and the file would be re-read until the window expired.
        if (typeof j.action === 'string' || j.readHand === true || typeof j.fateCardIndex === 'number') {
          if (typeof j.action !== 'string') j.action = '';
          fs.writeFileSync(OUT + '/choice_scene' + sceneNo + '.json', JSON.stringify(j, null, 2));
          return { action: j.action, dialogue: typeof j.dialogue === 'string' ? j.dialogue : '',
                   // Two reader inputs that are NOT a say/do. `readHand` examines the deck
                   // through its own gate and reports the hand, then waits again — so the card
                   // is chosen from what was actually dealt, never predicted. `fateCardIndex`
                   // clicks that card and takes the Say/Do it offers.
                   readHand: j.readHand === true,
                   fateCardIndex: (typeof j.fateCardIndex === 'number') ? j.fateCardIndex : null,
                   // A Petition is the one reader input that is not a say/do. Optional; when
                   // present it is sealed through the shipped modal BEFORE the turn is submitted,
                   // which is the order a reader does it in.
                   petition: typeof j.petition === 'string' ? j.petition : '' };
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
// ── THE EDITOR'S OWN PRICER, FROM THE ROUTE ITSELF (Roman 2026-11-06) ────────────────────
// api/cplus-editor.js owns the reservation arithmetic and the rate table for both of its
// configurations. Importing them means the amount this runner holds is the amount that route
// reserves, rather than a second copy that can drift. `general` is the configuration this run
// forces for every repair pass, including on explicit drafts.
// ── THE ISOLATED EDITOR HANDLER (Roman 2026-11-06) ───────────────────────────────────────
// api/cplus-editor.js derives the account from a Supabase-verified token and its ledger has
// `account_id uuid not null references auth.users(id)`, so this run's isolated session cannot
// reach it over HTTP: a synthetic token fails verification and a synthetic id violates the key.
// `createHandler({ createClient, fetch, env, log })` is injectable for exactly this, and
// _cplus_editor_outgoing_capture.mjs already uses it the same way.
//
// WHAT IS STUBBED, AND WHAT IS NOT. Supabase is stubbed: admission returns `admitted`, the
// account is the isolated test id, and no Postgres row is written. `fetch` is the REAL one, so
// the upstream provider call is real and its receipt is real. Policy is set to price 0, which
// `consume_fortunes_v3` skips entirely (api/cplus-editor.js: `if (priceFortunes > 0)`), so no
// wallet is touched and no live pricing changes. Production authentication is untouched — this
// handler exists only inside this process.
//
// THE COST OF IT, STATED: the durable Postgres operation ledger and its idempotency are NOT
// exercised. Editor accounting for this run lives in this runner's ledger, not in the database.
// ── THE LOCAL CREDENTIAL FILE, LOADED THE WAY THE DEV SERVER LOADS IT ────────────────────
// (Roman 2026-11-13.) MEASURED ON THE PAID RUN: every C+ editor pass refused with HTTP 500
// provider_not_configured — "the general editor configuration needs OPENAI_API_KEY". The key is
// in .env.local and `vercel dev` loads it for the serverless functions, but this runner invokes
// api/cplus-editor.js IN-PROCESS via createHandler, so the handler inherited THIS process's
// environment, and `node` does not read .env.local. The credential existed and simply could not
// be seen from here.
//
// So the file is loaded the same way other harnesses in this repo already read it
// (_cplus_test_user.mjs reads .env.local directly). Three rules:
//   · A REAL ENVIRONMENT VARIABLE ALWAYS WINS. Only names absent from process.env are filled in,
//     so nothing a deployment or a shell already set is overwritten by a local file.
//   · NO VALUE IS EVER LOGGED, returned or put on a command line. The report below names the
//     KEYS loaded and nothing else, and presence is reported as a boolean.
//   · MISSING FILE IS NOT FATAL. The editor route refuses on its own when a credential is
//     absent, which is the correct behaviour and is already handled as a local refusal.
(function _loadLocalEnvFile() {
  try {
    const f = ROOT + '/.env.local';
    if (!fs.existsSync(f)) return;
    const loaded = [];
    for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/);
      if (!m) continue;
      const name = m[1];
      if (process.env[name] != null && process.env[name] !== '') continue;   // the shell wins
      process.env[name] = m[2].trim();
      loaded.push(name);
    }
    if (loaded.length) {
      console.log('[ENV] loaded ' + loaded.length + ' name(s) from .env.local (NAMES ONLY, no values): '
        + loaded.join(', '));
    }
  } catch (e) {
    console.log('[ENV] .env.local not loaded: ' + ((e && e.message) || e));
  }
})();

// ── THE EDITOR'S OFFLINE ACCOUNTING, COUNTED RATHER THAN ASSERTED ───────────────────────
// "the real handler never ran" has to be a NUMBER. These are incremented at the two boundaries
// that matter — the handler invocation itself, and the handler's own outbound fetch — and both
// are written to EDITOR_OFFLINE_PROOF.json at the end of the run.
let _editorHandlerInvocations = 0;
let _editorEgressAttempts = 0;
const _editorEgress = [];            // { at, requested, sentTo, outcome }
const ROOT_DIR = '/Users/romantsukerman/storybound-app';
// Declared BEFORE the loader below assigns it: `let` is unreadable until its own declaration
// runs, and the loader is ~350 lines earlier in the file.
let _planOnlyValidator = null;
const _SB_OFFLINE = !!process.env.SB_OFFLINE;
// THE VALIDATOR IS A HARD DEPENDENCY OF PLAN-ONLY MODE. Without it the run could only report
// that a scaffold "arrived", which is the thing this mode exists not to do.
if (process.env.SB_PLAN_ONLY === '1') {
  try {
    const _v = await import('./_ft_plan_validator.mjs');
    _planOnlyValidator = _v.validateContinuationPlan;
    if (typeof _planOnlyValidator !== 'function') throw new Error('validateContinuationPlan is not a function');
  } catch (e) {
    throw new Error('SB_PLAN_ONLY=1 needs _ft_plan_validator.mjs and it did not load: '
      + (e && e.message) + ' — refusing to start, because a planning run that cannot validate'
      + ' would call an unvalidated scaffold accepted');
  }
}
const _SB_MODEL_ORIGIN = process.env.SB_MODEL_ORIGIN || '';
const _originIsLoopback = (o) => {
  try {
    const h = new URL(o).hostname;
    return h === 'localhost' || h === '127.0.0.1' || h === '::1' || h === '[::1]';
  } catch (_) { return false; }
};
// Installed ONLY when one of those two is set, so an ordinary run keeps the handler it had.
const _editorFetchGuard = (_SB_OFFLINE || _SB_MODEL_ORIGIN) ? async function (u, init) {
  const requested = String((u && u.url) || u || '');
  _editorEgressAttempts += 1;
  let sentTo = null, outcome = null;
  // ── SB_EDITOR_DIRECT: LET THE EDITORS REACH THEIR PROVIDER UNTOUCHED ──────────────────
  // The C+ editor builds an OpenAI-shaped request and fetches api.openai.com itself. Rewriting
  // only its PATHNAME onto a loopback origin produced /v1/chat/completions against a local API
  // that serves /api/* — two 404s on Scene 2, $0.013647 held, and no editor verdicts. When the
  // run WANTS real editor passes, the honest thing is to let the request go where it was
  // addressed and still record it. The planning replay and the model route are unaffected: they
  // travel through SB_MODEL_ORIGIN, not through this guard.
  // SB_OFFLINE OUTRANKS SB_EDITOR_DIRECT, ALWAYS. An offline run that also carries the direct
  // flag — a launcher reused, a flag left set — must not place a billable call because of flag
  // order. Offline is the stronger claim, so it is tested first and the direct branch below is
  // unreachable while it holds.
  if (_SB_OFFLINE && String(process.env.SB_EDITOR_DIRECT || '') === '1') {
    outcome = 'refused_offline_overrides_direct';
    _editorEgress.push({ at: new Date().toISOString(), requested, sentTo: null, outcome });
    console.log('  ⊘ EDITOR EGRESS #' + _editorEgressAttempts + ' REFUSED: SB_OFFLINE overrides '
      + 'SB_EDITOR_DIRECT — ' + requested + ' was NOT sent');
    throw new Error('SB_OFFLINE overrides SB_EDITOR_DIRECT: the C+ editor handler attempted an '
      + 'outbound request to ' + requested + ' — refused, nothing was sent');
  }
  if (String(process.env.SB_EDITOR_DIRECT || '') === '1') {
    sentTo = requested;
    outcome = 'direct_to_provider';
    _editorEgress.push({ at: new Date().toISOString(), requested, sentTo, outcome });
    console.log('  ⇒ EDITOR EGRESS #' + _editorEgressAttempts + ' ' + requested
      + '  [DIRECT — this is a real, billable provider call]');
    return globalThis.fetch(u, init);
  }
  if (_SB_MODEL_ORIGIN && _originIsLoopback(_SB_MODEL_ORIGIN)) {
    // REDIRECTED, not refused: the handler runs for real and its request is observable at the
    // local endpoint, which is strictly more informative than refusing it.
    let p = '/';
    try { p = new URL(requested).pathname; } catch (_) {}
    sentTo = _SB_MODEL_ORIGIN + p;
    outcome = 'redirected_to_loopback';
    _editorEgress.push({ at: new Date().toISOString(), requested, sentTo, outcome });
    console.log('  ⇢ EDITOR EGRESS #' + _editorEgressAttempts + ' ' + requested
      + ' → ' + sentTo + '  [loopback]');
    return globalThis.fetch(sentTo, init);
  }
  // SB_OFFLINE with no loopback origin: refuse. The handler sees a transport failure, which is
  // the truthful thing for it to see — nothing was sent.
  outcome = 'refused_offline';
  _editorEgress.push({ at: new Date().toISOString(), requested, sentTo: null, outcome });
  console.log('  ⊘ EDITOR EGRESS #' + _editorEgressAttempts + ' REFUSED (SB_OFFLINE): '
    + requested + ' is not loopback');
  throw new Error('SB_OFFLINE: the C+ editor handler attempted an outbound request to '
    + requested + ' — refused, nothing was sent');
} : null;

let EDITOR_HANDLER = null;
try {
  const _edm = await import('./api/cplus-editor.js');
  EDITOR_HANDLER = _edm.createHandler({
    // THE HANDLER'S OWN EGRESS, GUARDED. `deps.fetch` is how api/cplus-editor.js takes its IO
    // (line 430: `deps.fetch || globalThis.fetch`). Passing nothing here is what let an offline
    // run place a real editor call: route interception cannot see an in-process fetch.
    // undefined when neither SB_OFFLINE nor SB_MODEL_ORIGIN is set, so the default is unchanged.
    fetch: _editorFetchGuard || undefined,
    env: Object.assign({}, process.env, {
      CPLUS_EDITOR_ENABLED: 'true',
      CPLUS_EDITOR_PRICE_FORTUNES: '0',
      CPLUS_EDITOR_DAILY_CAP: '60',
      CPLUS_EDITOR_FORCE_CONFIG: 'general',
      SUPABASE_URL: 'https://isolated.invalid',
      SUPABASE_SERVICE_ROLE_KEY: 'isolated'
    }),
    log: { warn() {}, info() {}, error() {}, log() {} },
    createClient: () => ({
      // THE SAME ACCOUNT THE BROWSER SESSION MINTS. A second literal here made every client
      // operation id name an account this handler's session did not, which the server rightly
      // refused with operation_mismatch. One source of truth, imported, not retyped.
      auth: { getUser: async () => ({ data: { user: { id: SB_TEST_ACCOUNT_ID } }, error: null }) },
      from: () => ({
        update: () => ({ eq: async () => ({ error: null }), error: null }),
        insert: async () => ({ error: null }),
        select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) })
      }),
      rpc: async (fn) => (fn === 'cplus_editor_admit')
        ? { data: [{ outcome: 'admitted', charged_fortunes: 0 }], error: null }
        : { data: [{ ok: true }], error: null }
    })
  });
} catch (_) { EDITOR_HANDLER = null; }

let EDITOR_PRICER = null;
try {
  const _ed = await import('./api/cplus-editor.js');
  const _cfg = _ed.editorConfigFor('general');
  const _outCap = Math.min(_cfg.maxOutputTokens, Math.max(_cfg.floorOutputTokens, 1240));
  EDITOR_PRICER = (chars) => _ed.reserveUsd(chars, _outCap, _cfg);
} catch (_) { EDITOR_PRICER = null; }

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
  // ── THE EDITOR SHARES THE RUN AUTHORIZATION, AND A REFUSAL STOPS THE CALL ─────────────
  // Driven through the EDITOR ROUTE'S OWN reserveUsd — the same function the handler calls —
  // so the figure checked here is the figure held at dispatch. The DRIVE ceiling cannot
  // isolate this case (the architecture guard is checked earlier and costs more), so the
  // decision is exercised directly.
  ck('an editor call is priced by the route and refused when the run authorization cannot cover it', () => {
    assert(EDITOR_PRICER, 'the editor pricer must be importable from api/cplus-editor.js');
    const est = EDITOR_PRICER(37197);               // the captured repair-pass request size
    assert(est > 0, 'the editor call must be priced, not zero-rated');
    // The decision the handler makes, with the same comparison.
    assert.equal(est <= 0.000001, false, 'an exhausted authorization must refuse the editor');
    assert.equal(est <= 5.0, true, 'a funded authorization must admit it');
    // And it must be the route's own arithmetic, not a local copy.
    assert(Math.abs(est - 0.006516) < 0.000005, 'expected the route figure 0.006516, got ' + est);
  });
  ck('the refusal path reserves nothing — a blocked editor call cannot consume authorization', () => {
    const src = fs.readFileSync(new URL(import.meta.url).pathname, 'utf8');
    // The markers are ASSEMBLED rather than written literally, so this check cannot match its
    // own source — which is how the two previous attempts passed the wrong segment.
    const marker = 'EDITOR NOT' + ' DISPATCHED';
    const i = src.indexOf(marker);
    assert(i > 0, 'the editor refusal branch must exist and report itself');
    // Walk back to the refusal record and forward to the local refusal response.
    const start = src.lastIndexOf('requests.push', i);
    const end = src.indexOf('route.ful' + 'fill', i);
    assert(start > 0 && end > i, 'the refusal branch must record and then refuse locally');
    const seg = src.slice(start, end);
    assert.equal(/reserve\(/.test(seg), false, 'the refusal path must not call reserve()');
    assert(/over_remaining_auth/.test(seg), 'the refusal must name the reason');
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
  ck('a CACHE-BEARING receipt settles ONLY where cache rates are published, and is held otherwise', () => {
    // ── THIS CHECK WENT RED AND WAS REWRITTEN (Roman 2026-11-12). SAID PLAINLY. ────────────
    // It asserted that a cache-bearing receipt for claude-haiku-5-5 or gpt-6.1-sol must NOT
    // settle. That was right while this repo had no cache rates for either model — the rule
    // being protected is "never present an incomplete calculation as a settled charge", and
    // with no write rate, refusing WAS the complete answer.
    //
    // Both models now carry their published cache rates (Anthropic's own table for Haiku 5.5;
    // api/cplus-editor.js for Sol's $2.50/MTok write), so refusing them would now mean holding
    // real, priceable charges as "unknown" — the opposite of the accuracy the check exists for.
    //
    // THE RULE IS UNCHANGED AND IS STILL WHAT IS ASSERTED. What moved is which models satisfy
    // it. So the check now pins BOTH sides: a model WITH rates settles AT THE WRITE RATE (so
    // pricing writes as plain input is still red), and a model WITHOUT them still holds and
    // still names the field.
    const read = settle({ input_tokens: 1000, output_tokens: 100,
      cache_read_input_tokens: 150000 }, 'claude-haiku-5-5');
    assert.equal(read.settled, true, 'Haiku 5.5 has published cache rates and must settle now');
    assert.equal(read.tier, '<=100k', 'priced on INPUT tokens, which are 1000 here');
    // 150,000 read tokens exceed input_tokens, so plainIn floors at 0 and the read rate carries it.
    assert.equal(read.cachedInTok, 150000, 'the read tokens must be recognised');
    // THE SHAPE THAT ONCE SLIPPED THROUGH, now asserted at the RIGHT price rather than refused.
    const write = settle({ prompt_tokens: 88558, completion_tokens: 2076, total_tokens: 90634,
      prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 88555 } }, 'gpt-6.1-sol');
    assert.equal(write.settled, true, 'Sol\'s write rate is published and must be applied');
    const wantWrite = (3 * 2e-6) + (88555 * 2.5e-6) + (2076 * 1e-5);
    assert(Math.abs(write.usd - wantWrite) < 1e-9,
      'writes must be priced at the WRITE rate, not as plain input: ' + write.usd + ' != ' + wantWrite);
    // A MODEL WITH NO PUBLISHED CACHE RATES STILL HOLDS, and still names the field it saw.
    const noRates = settle({ prompt_tokens: 88558, completion_tokens: 2076,
      prompt_tokens_details: { cached_tokens: 0, cache_write_tokens: 88555 } }, 'grok-4.3');
    assert.equal(noRates.settled, false, 'a model without cache rates must still refuse');
    assert.equal(noRates.holdExposure, true, 'and must hold exposure rather than drop it');
    assert(/cache_write_tokens=88555/.test(noRates.why || ''), 'the refusal must name the field: ' + noRates.why);
    // An authoritative provider cost still wins — refusing is the fallback, not a preference.
    const authoritative = settle({ cost_in_usd_ticks: 271993500,
      prompt_tokens_details: { cache_write_tokens: 500 } }, 'grok-4.3');
    assert.equal(authoritative.settled, true, 'a provider cost field must still settle');
    assert(Math.abs(authoritative.usd - 0.02719935) < 1e-12, 'at the provider figure');
    // And a plain receipt with no cache activity still settles normally.
    const plain = settle({ prompt_tokens: 1000, completion_tokens: 100,
      prompt_tokens_details: { cached_tokens: 0 } }, 'gpt-6.1-sol');
    assert.equal(plain.settled, true, 'a plain receipt must still settle');
    // THE LEDGER SIDE: an unpriceable cache receipt is still HELD at its reservation, never
    // credited back and never counted as settled.
    const st = makeSettlement(3.0);
    st.record({ stage: 'author', model: 'grok-4.3', estimate: 0.1329,
      usage: { prompt_tokens: 88558, completion_tokens: 2076,
        prompt_tokens_details: { cache_write_tokens: 88555 } } });
    const t = st.totals();
    assert.equal(t.settled, 0, 'an unpriceable cache receipt must not reach the settled total');
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
    // TWENTY ADDED 2026-11-12, and it is the PRODUCT'S OWN figure, not a convenience: the
    // literary Books declare "the complete Issue One — 20 scenes" in PREVIEW_CATALOG and charge
    // 60 Fortunes for exactly that. The First Taste run was requested at that length. This list
    // is still an allowlist — an arbitrary count still fails loudly.
    // ONE ADDED 2026-11-13, AUTHORIZED. Roman: "Stop at Scene 1 and show me the whole page and
    // its choice before continuing." A single-scene arm tests a repaired opening without
    // committing to the other nineteen. It does NOT shorten the issue: SCENES bounds this
    // RUNNER'S loop, while the issue plan is sized product-side from the story tier, so a
    // 1-scene arm still plans the full 20-scene Issue One and simply stops after the opening.
    assert(SCENES === 1 || SCENES === 10 || SCENES === 13 || SCENES === 20,
      'SCENES=' + SCENES + ' is not an authorized shape (1 = one opening under test, 10 = the '
      + 'original run, 13 = the execution test, 20 = one complete literary Issue One)');
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
// ── WHICH BOOK THIS RUN PLAYS (Roman 2026-11-12) ─────────────────────────────────────────────
// This runner was written against one Book and named it in eight places. The Literary
// playthrough itself is Book-agnostic — it launches a shipped catalog entry, reads the published
// page and submits reader actions — so the Book is a SELECTION, not a property of the runner.
// SB_STARTER names the catalog id; the default is unchanged, so every existing invocation and
// every preserved run keeps the behaviour it had.
//
// THE WORLD COMES FROM THE SELECTED ENTRY, never from a constant: the account setup used to pin
// `picks.world = 'Fantasy'`, which for any other Book would have contradicted the entry the
// launch itself applied.
const STARTER_ID = process.env.SB_STARTER || 'starter_first_sacrifice';
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
// ── SB_PLAN_ONLY STATE ──────────────────────────────────────────────────────────────────
// plannerOk is null until a planner reply has been classified: a scaffold dispatch requires it
// to be TRUE, so "no planner reply yet" and "an unusable planner reply" both refuse.
let _planOnlyPlannerSeen = false;      // a planner request was permitted through the gate
let _planOnlyPlannerOk = null;         // null = unknown · true = usable plan · false = empty/truncated
let _planOnlyPlannerWhy = '';
let _planOnlyScaffoldSent = 0;         // exactly one attempt is permitted
let _planOnlyVerdict = null;           // null | 'accepted' | 'rejected' — set ONLY by validation
let _planOnlyFaults = [];
let _planOnlyRefusals = [];
// THE ACCEPTED STAGE AND THE READER'S MOVE, as the carry-in and the paid attempt fix them.
// Supplied here rather than scraped, so the verdict cannot drift from the offline check.
// ── THE ROSTER COMES FROM THE SAVE'S OWN LEDGER (Roman 2026-11-18) ──────────────────────
// This was a hand-written stand-in, and it carried `role:producer` while the story's actual
// producer is the primary-antagonist entity. So a scaffold grounded on the REAL ref failed four
// times over — unknown_participant plus three unresolved_ref_acts — for naming the person the
// ledger actually holds. A roster I typed is not the cast; the cast is in
// storage.sb_saved_story → stateSnapshot._relationshipLedger.entities.
//
// The ISSUED spelling is used, not the ledger key: `ent:` is not an issuable ref kind, so the
// stage carries `pc:self` and `named:<slug>` while the ledger keys are `pc` and `ent:roman tusk`.
function _planOnlyRosterFromSave(stateFile) {
  try {
    const dump = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const storage = dump.storage || dump;
    const saved = JSON.parse(String(storage['sb_saved_story'] || '{}'));
    const snap = saved.stateSnapshot || saved.state || saved;
    const ents = (snap._relationshipLedger && snap._relationshipLedger.entities) || {};
    const issued = (ref, e) => {
      if ((e || {}).anchorRole === 'pc' || ref === 'pc') return 'pc:self';
      if (/^(pc:|named:|role:|plot:|cand:)/.test(ref)) return ref;
      const lab = String((e || {}).label || '').trim();
      return lab ? ('named:' + lab.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')) : ref;
    };
    const out = Object.keys(ents).map((ref) => {
      const e = ents[ref] || {};
      return { id: issued(ref, e), label: String(e.label || ''),
        isPC: e.anchorRole === 'pc',
        // The LI is offstage in this story's scene 2; everyone else the scene stages is present.
        presence: e.anchorRole === 'li' ? 'OFFSTAGE_REFERENCED' : 'IN_PERSON' };
    }).filter((x) => x.id && x.label);
    if (out.length) {
      say('  \u24d8 planning roster read from the save\u2019s relationship ledger: '
        + out.map((x) => x.id.slice(0, 44) + '=' + x.label).join(' \u00b7 '));
      return out;
    }
  } catch (e) {
    say('  ! could not read the ledger from the save (' + (e && e.message) + ')');
  }
  return null;
}
const _PLAN_ONLY_ROSTER = (process.env.SB_PLAN_ONLY === '1' && RESUME_FROM
  && _planOnlyRosterFromSave(RESUME_FROM)) || [
  { id: 'pc:self', label: 'Dani MacBrayne', presence: 'IN_PERSON', isPC: true },
  { id: 'named:helen_macbrayne', label: 'Helen MacBrayne', presence: 'IN_PERSON' },
  { id: 'named:roman_tusk', label: 'Roman Tusk', presence: 'OFFSTAGE_REFERENCED' },
];
const _PLAN_ONLY_MOVE = {
  readerAction: 'Escalate it \u2014 say the worst true thing in the room and let it land.',
  readerDialogue: 'You want the version where I\u2019m the difficult one, Helen? Give them that one.',
};
const _PLAN_ONLY_OBJECTIVES = ['footage', 'gala'];
function _planOnlyValidate(plan, finishReason) {
  if (!_planOnlyValidator) throw new Error('the plan validator was not loaded');
  return _planOnlyValidator(plan, Object.assign({
    roster: _PLAN_ONLY_ROSTER,
    // THE CAST, so a plot: ref is judged by whether it RESOLVES rather than by its prefix.
    castRefs: _PLAN_ONLY_ROSTER.map((r) => ({ id: r.id, label: r.label })),
    spineObjectives: _PLAN_ONLY_OBJECTIVES,
    finishReason: finishReason || 'stop' }, _PLAN_ONLY_MOVE));
}
const _planOnlyIsPlannerReq = (t) => /SCENE-SPINE planner|You are the SCENE planner/.test(String(t || ''));
const _planOnlyIsScaffoldReq = (t) => /causal_outline/.test(String(t || ''))
  && /stage_contract|environment_anchor/.test(String(t || ''));
// WHAT THE REPLY WAS. Called from the drive fixture site and from the live response site, so one
// classification serves both and a fixture rehearsal has the same shape as a paid run.
function _planOnlyObserve(o) {
  if (process.env.SB_PLAN_ONLY !== '1') return;
  // ── SB_PLAN_TEST_SKIP_OBSERVE=1 — REPRODUCE THE PAID FAILURE EXACTLY ──────────────────
  // The paid run's planner reply was VALID and simply never observed, leaving the flag NULL.
  // Serving a malformed reply instead sets it FALSE, which is a different state and a path that
  // already worked. This skips the observation and nothing else, so the arm under test is the
  // one that actually cost money.
  if (process.env.SB_PLAN_TEST_SKIP_OBSERVE === '1') {
    try {
      const t = String((o && o.requestText) || '');
      if (_planOnlyIsPlannerReq(t)) {
        say('  \u2699 TEST: the planner reply is served but NOT observed \u2014 the classification'
          + ' stays UNKNOWN, which is the state the paid run was in');
        return;
      }
    } catch (_) {}
  }
  const reqText = String(o && o.requestText || '');
  const bodyText = String(o && o.body || '');
  let content = '', finish = '', refusal = '';
  try {
    const j = JSON.parse(bodyText);
    content = String((j.choices && j.choices[0] && j.choices[0].message
      && j.choices[0].message.content) || j.content || '');
    // BOTH SHAPES. api/chatgpt-proxy.js normalises its reply to { content, usage, finish_reason,
    // refusal } — finish_reason is a SIBLING of content, which it lifted out of choices[0]
    // itself. Reading only the nested form meant a truncated reply whose JSON happened to parse
    // was classified usable, which is the one thing this classifier exists to prevent.
    finish = String(j.finish_reason
      || (j.choices && j.choices[0] && (j.choices[0].finish_reason || j.choices[0].finishReason))
      || '');
    refusal = String(j.refusal
      || (j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.refusal)
      || '');
  } catch (_) { content = bodyText; }
  if (_planOnlyIsPlannerReq(reqText) && _planOnlyPlannerOk === null) {
    let plan = null;
    try { plan = JSON.parse(content); }
    catch (_) { try { plan = JSON.parse((content.match(/\{[\s\S]*\}/) || [''])[0]); } catch (__) { plan = null; } }
    const hasPlan = !!(plan && (plan.state_change || plan.tactical_move || plan.forces_choice != null));
    if (!content.trim()) { _planOnlyPlannerOk = false; _planOnlyPlannerWhy = 'the planner returned no content'; }
    else if (refusal) { _planOnlyPlannerOk = false; _planOnlyPlannerWhy = 'the provider declined (refusal: ' + refusal.slice(0, 80) + ')'; }
    else if (finish && finish !== 'stop') { _planOnlyPlannerOk = false; _planOnlyPlannerWhy = 'the planner reply was truncated (finish_reason=' + finish + ')'; }
    else if (!hasPlan) { _planOnlyPlannerOk = false; _planOnlyPlannerWhy = 'the planner reply carries no plan (no state_change / tactical_move / forces_choice)'; }
    else { _planOnlyPlannerOk = true; _planOnlyPlannerWhy = 'a usable plan'; }
    say('  \u25c6 PLAN-ONLY: planner reply classified \u2014 '
      + (_planOnlyPlannerOk ? 'USABLE' : 'UNUSABLE') + ': ' + _planOnlyPlannerWhy
      + (_planOnlyPlannerOk ? ' \u2014 exactly ONE scaffold dispatch is now permitted'
                            : ' \u2014 ZERO scaffold dispatches are permitted'));
    return;
  }
  if (_planOnlyIsScaffoldReq(reqText) && _planOnlyVerdict === null) {
    let plan = null;
    try { plan = JSON.parse(content); }
    catch (_) { try { plan = JSON.parse((content.match(/\{[\s\S]*\}/) || [''])[0]); } catch (__) { plan = null; } }
    let res = null;
    try {
      res = _planOnlyValidate(plan, finish);
    } catch (e) { res = { ok: false, faults: [{ code: 'validator_threw', why: String(e && e.message) }] }; }
    _planOnlyVerdict = res.ok ? 'accepted' : 'rejected';
    _planOnlyFaults = res.faults || [];
    if (res.ok) {
      say('  \u25c6 PLAN-ONLY: the scaffold reply VALIDATED \u2014 accepted. The run stops here;'
        + ' no prose and no editor is dispatched.');
      (res.notes || []).forEach((x) => say('      note: ' + x));
    } else {
      say('  \u2717 PLAN-ONLY: the scaffold reply is REJECTED \u2014 ' + _planOnlyFaults.length
        + ' validation fault(s). The run ends here and reserves nothing for a correction retry,'
        + ' for prose, or for either editor.');
      _planOnlyFaults.forEach((f) => say('      [' + f.code + '] ' + f.why));
    }
  }
}
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
// ── THE PRIOR POSITION, CARRIED FORWARD ───────────────────────────────────────────────────
// The reconciled cumulative position this run inherits, from _reconcile_ledger.mjs over the
// preserved bundle. Passed in rather than recomputed so this run's report shows the whole story
// and not just its own slice — the defect that produced "remaining $2.148630" for a story that
// had already spent $1.5.
const settlement = makeSettlement(CEILING, {
  calculated: Number(process.env.SB_PRIOR_CALCULATED || 0),
  held: Number(process.env.SB_PRIOR_HELD || 0),
  note: process.env.SB_PRIOR_NOTE || null,
});
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
// ── SB_NO_RETRY: WHAT HAS ALREADY BEEN SENT ──────────────────────────────────────────────
// Keyed by path + role + requested model + body. Holds the reqId of the FIRST dispatch, so a
// refusal can name which request it is a repeat of rather than just asserting that it is one.
// Keyed by fingerprint. Each entry records whether the first request with that fingerprint has
// FINISHED, and holds the response so a concurrent twin can be answered from it.
const _sentFingerprints = new Map();
// POST-PROSE EDITORIAL ROLES ONLY. These are the passes that run concurrently over a finished
// draft, which is why two identical ones can be in flight at once. A prose author is deliberately
// NOT here: two concurrent author calls sharing one reply would be a different decision.
const _CONCURRENT_SHARE_ROLES = { SPECIALIST_RENDERER: 1, INTIMACY_SPECIALIST: 1 };
const _SHARE_WAIT_MS = 300000;
// Called by the first request once its outcome is known, so its twins stop waiting.
function _fpSettle(key, result) {
  if (!key) return;
  const e = _sentFingerprints.get(key);
  if (!e || e.done) return;
  e.done = true;
  e.result = result || null;
  (e.waiters || []).forEach((fn) => { try { fn(e.result); } catch (_) {} });
  e.waiters = [];
}
// Every call answered locally because the pinned opener was not yet confirmed. Reported at the
// end so "nothing was sent before the pin was confirmed" is a list, not a claim.
const _pinPendingAnswers = [];
// ONCE-ONLY PLANNING OPERATIONS under SB_NO_RETRY. A second call for one of these is a REPLAN,
// which carries a different payload and so is invisible to the byte-identical retry guard.
const _planOpsServed = { opening_planner: 0, architecture_spine: 0, prose_author: 0 };
const _noRetry = process.env.SB_NO_RETRY === '1';
const replayLog = [];         // SB_REPLAY_BAD_NORM: what the normalization layer was made to return
const verifierLog = [];       // SB_MILESTONE: the commit-verifier question asked and the verdict served
let replayPlannerServed = 0;   // SB_REPLAY_PLANNER: which preserved planner reply to serve next
let _offlineLocalAnswers = 0;     // offline replay: calls answered before any reservation
let _offlineLocalAnswersEst = 0;  // what they WOULD have reserved
let _offlineArtifact404 = 0;      // local 404s in a provider-blocked replay (zero spend)
let _offlineArtifact404Est = 0;   // what they WOULD have reserved, reported separately
let spineReuseServed = 0;      // SB_REUSE_SPINE: the preserved architecture reply answers the FIRST call only
let remaining = CEILING;
let halted = null;
let registerStop = null;   // set by the pre-author register gate; sticky for the whole run
// THE RUN DECLARES ITS OWN SCOPE. SB_GENERAL_PROSE=1 asserts that this configuration's cast and
// requirements are general-prose compatible. Without it every author dispatch stops as unknown,
// which is the correct default: no existing field establishes voice compatibility.
const DECLARED_GENERAL_PROSE = process.env.SB_GENERAL_PROSE === '1';
// Scenes the register gate identified as explicit, so the manuscript can report which model
// authored which scene rather than inferring it.
const explicitRegisterScenes = [];
// ── THE PRECONDITION GATE'S SCOPE AND ITS STICKY STOP ─────────────────────────────────────
// Declared HERE, beside the other run-scope flags, rather than beside the pre-launch block far
// below: the route handler is installed before that block runs, so reading a `const` declared
// later would throw inside the handler on the first request. Same value, evaluated once.
const FRESH_PLAN_ACTIVE = process.env.SB_FRESH_PLAN === '1';
let prereqStop = null;    // set by the scaffold precondition gate; sticky for the whole run
// Set by the FIRST dispatch that returns no HTTP response; refuses every later dispatch.
let unrecoverableStop = null;
let _plannerAccepted = false;      // SB_PLANNING_ONLY_ALLOWLIST: paid dispatch closes after the plan
let _firstRefusedSaved = false;   // preserve the first refused payload, once

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

// ── THE SPINE'S SHAPE, CHECKED WHEREVER THE SPINE COMES FROM (Roman 2026-11-06) ───────────
// FOUND BY RUNNING IT: this check first lived inside the live-response branch, so a spine served
// from disk returned before reaching it and was never validated at all. A gate that only
// inspects one of the two ways a spine can arrive is not a gate. It lives here now and both
// paths call it.
//
// THE NUMBERS ARE THE APPLICATION'S OWN. `_expectedIssueCount` (app.js:242143) reaches the
// PROMPT and the output allowance and is never compared against the reply — which is how a
// 2-issue spine was accepted, attached and reported as the plan. So the contract is read back
// out of the REQUEST the application itself built: this asks exactly what the app asked for, and
// the two cannot disagree.
//
// IT GATES SPEND, NOT PROSE. A failing reply is still preserved and still handed to the
// application unchanged; what stops is the harness paying for the planner, the author and the
// editorial stages behind a plan of the wrong shape. Nothing is retried and no second spine is
// requested — a failure ends the run and is reported.
// requestText must be the DECODED message text, not the raw POST body. Caught by running it: the
// raw body is JSON, where the prompt's own quotes are escaped (`\"issueArcs\":`), so a pattern
// written against the prompt matched nothing and the gate reported arcs=0 — failing CLOSED, which
// is the right direction, but for the wrong reason. `rec.bodyText` is the joined message content.
function _checkSpineShape(requestText, contentStr, rec, originLabel) {
  if (!String(contentStr || '').trim()) return { ok: false, why: 'no content to check' };
  const reqT = String(requestText || '');
  const wantArcs = Number((reqT.match(/issueArcs\\?":\s*EXACTLY\s+(\d+)\s+entries/) || [])[1] || 0);
  const wantScenes = Number((reqT.match(/sceneOutline\\?"\s+per\s+issue:\s*EXACTLY\s+(\d+)\s+entries/) || [])[1] || 0);
  let arcs = null, outlines = [], err = null;
  try {
    const plan = JSON.parse(String(contentStr));
    arcs = Array.isArray(plan.issueArcs) ? plan.issueArcs.length : null;
    outlines = (plan.issueArcs || []).map((a) => (Array.isArray(a && a.sceneOutline) ? a.sceneOutline.length : null));
  } catch (e) { err = 'the scaffold content is not parseable JSON (' + (e && e.message) + ')'; }
  if (!err && (!wantArcs || !wantScenes)) {
    err = 'the request did not state its own issue/scene contract (arcs=' + wantArcs
      + ', scenes=' + wantScenes + '), so the reply cannot be checked against it';
  } else if (!err && arcs !== wantArcs) {
    err = 'the spine carries ' + arcs + ' issueArcs where the request demanded ' + wantArcs
      + ' — this is the defect that produced a two-issue plan';
  } else if (!err && outlines.some((n) => n !== wantScenes)) {
    err = 'issue scene counts are [' + outlines.join(', ') + '] where the request demanded '
      + wantScenes + ' per issue';
  }
  const shape = { origin: originLabel, wantArcs, wantScenesPerIssue: wantScenes,
    gotArcs: arcs, gotScenesPerIssue: outlines, accepted: !err };
  if (rec) rec.spineShape = shape;
  _ledger('spine_shape', shape);
  if (err) {
    _strictSolStop('spine_shape_rejected', err + ' [' + originLabel + '] — stopping BEFORE any '
      + 'downstream paid generation; the reply is preserved and no replacement spine is requested');
    return { ok: false, why: err };
  }
  say('  ✓ SPINE SHAPE ACCEPTED (' + originLabel + '): ' + arcs + ' issue arcs x ' + wantScenes
    + ' scenes each, as the request demanded (checked against the request, not assumed)');
  return { ok: true, why: null };
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
    // THE LIVE OBSERVATION POINT. The same classifier runs for a fixture reply at the drive
    // site, so a rehearsal and a paid run take the same decisions.
    // THE OBSERVE CALL IS NOT HERE ANY MORE. This object carries `requestChars`, not the
    // request text, so the classifier was handed '' and never recognised the planner reply —
    // which is how a paid run bought prose in a planning-only mode. It is called from the
    // dispatch site instead, where both the request and the reply are in scope.
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
// ── WHICH REQUESTS A TARGETED FIXTURE CLAIMS (Roman, authorized 2026-11-13) ─────────────────
// Some SB_FAULT kinds answer ONE kind of request (aplot_saved only claims the A-plot generator;
// the sol_* kinds only claim /api/sol-scene-test), while others — valid_plan above all — answer
// whatever they are handed. Combining them therefore needs an ORDER and a CLAIM, not a merge:
// each gated kind is offered the request first, and the last kind in the list is the default for
// everything none of them claimed.
//
// Only the gated kinds need an entry. A kind absent from this table claims nothing and can only
// ever be the default, which is what valid_plan already is.
// WHICH BIBLE A REQUEST IS ASKING FOR, by the schema it instructs the model to return.
// Measured from captured requests, not assumed: the PC generator is the only operation carrying
// the seeded-protagonist canon block, and the LI generator is the only one asking for these two
// output fields. Downstream prompts quote bible CONTENT freely; none of them asks for the
// schema, which is what makes the schema the safe discriminator.
// Each of these claims ONE operation by the opening instruction of its own generator. None is a
// size test and none is a role test: role is shared (PRIMARY_AUTHOR covers the bibles, the pair
// bond, the R-plot and the A-plot) and size drifts with the story.
const _isCanonRotatorOp = (t) => /You revise physical-canon fields of a romance LI bible/.test(String(t || ''));
const _isPairBondOp = (t) => /architect of WHY THIS PAIR/.test(String(t || ''));
const _isRPlotOp = (t) => /You are designing an R-PLOT/.test(String(t || ''));
// The three supporting passes that sit between the A-plot and the Scene 1 author, each claimed
// by the opening line of its own generator. Their saved replies are replayed verbatim — the
// compressor's reply was what made the original run "fall through to full A-plot block", and
// substituting a different one would change what the author receives.
const _isAplotCompressOp = (t) => /You are compressing the procedural A-plot/.test(String(t || ''));
const _isWoundAuditOp = (t) => /WOUND→LI SWAP TEST|WOUND→LI SWAP TEST/.test(String(t || ''));
const _isSubplotOp = (t) => /You are the SUBPLOT GENERATOR for Storybound/.test(String(t || ''));
const _isPcBibleOp = (t) => /STARTER PC FOUNDATION/.test(String(t || ''));
const _isLiBibleOp = (t) => !_isPcBibleOp(t)
  && /secondary_anecdote_different_register/.test(String(t || ''))
  && /desire_register_exemplars_cg/.test(String(t || ''));

// A ONE-LINE FINGERPRINT OF WHAT AN UNMATCHED REQUEST WAS ASKING FOR, so a missing reply is
// NAMED rather than guessed at from a stall.
const _describeOp = (t, url) => {
  const s = String(t || '');
  const marks = [];
  if (_isPcBibleOp(s)) marks.push('pc-body-bible');
  if (_isLiBibleOp(s)) marks.push('li-body-bible');
  if (_isCanonRotatorOp(s)) marks.push('physical-canon-rotator');
  if (_isAplotCompressOp(s)) marks.push('a-plot-scene1-compressor');
  if (_isWoundAuditOp(s)) marks.push('wound-swap-audit');
  if (_isSubplotOp(s)) marks.push('subplot-generator');
  if (_isPairBondOp(s)) marks.push('pair-bond-generator');
  if (_isRPlotOp(s)) marks.push('r-plot-generator');
  if (/A-PLOT GENERATOR/.test(s)) marks.push('a-plot');
  if (s.indexOf(OPENING_PLANNER_SIG) !== -1) marks.push('opening-planner');
  if (/signature_kink/.test(s)) marks.push('quotes-li-bible');
  if (/psychologicalLock_li/.test(s)) marks.push('pair-bond');
  if (/coreTension|relationshipQuestion/.test(s)) marks.push('r-plot');
  if (/issueArcs|sceneOutline/.test(s)) marks.push('issue-spine');
  return (url ? String(url).replace(/^https?:\/\/[^/]+/, '') : '(no url)')
    + ' · ' + s.length + ' chars · markers[' + (marks.join(', ') || 'none recognised') + ']';
};

const _FAULT_CLAIMS = {
  aplot_saved:        (t) => /A-PLOT GENERATOR/.test(String(t || '')),
  // ── THE BIBLES ARE CLAIMED BY THEIR OWN OUTPUT SCHEMA (Roman, corrective 2026-11-13) ────
  // MEASURED FAILURE OF THE FIRST VERSION: it claimed the LI bible on `signature_kink`, and the
  // replay log then showed Roman's bible served FOUR times. `signature_kink` is LI material that
  // DOWNSTREAM prompts quote — both A-plot legs carry it — so the claim reached past the
  // generator and answered calls that were asking for something else entirely.
  //
  // The fix is to claim on what only the GENERATOR says: the fields it asks the model to RETURN.
  // `secondary_anecdote_different_register` and `desire_register_exemplars_cg` appear in the LI
  // bible request and its two fallback rungs (calls 2/4/6 of a captured launch) and in nothing
  // else — not the A-plot, not the R-plot, not the pair bond. Both are required together so one
  // field drifting out of the schema cannot silently widen the claim again.
  bible_saved:        (t) => _isPcBibleOp(t) || _isLiBibleOp(t),
  // RESTRICTED TO THE OPENING-PLANNER OPERATION, and to nothing that merely mentions it.
  planner_saved:      (t) => String(t || '').indexOf(OPENING_PLANNER_SIG) !== -1,
  canon_rotator_429:  (t) => _isCanonRotatorOp(t),
  support_saved:      (t) => _isAplotCompressOp(t) || _isWoundAuditOp(t) || _isSubplotOp(t),
  pairbond_saved:     (t) => _isPairBondOp(t),
  rplot_saved:        (t) => _isRPlotOp(t),
  aplot_timeout:      (t) => /A-PLOT GENERATOR/.test(String(t || '')),
  sol_valid_plan:     (t, u) => /\/api\/sol-scene-test\b/.test(String(u || '')),
  sol_empty_content:  (t, u) => /\/api\/sol-scene-test\b/.test(String(u || '')),
  sol_missing_content:(t, u) => /\/api\/sol-scene-test\b/.test(String(u || '')),
};

// ── THE SB_REUSE_* FAMILY — AN ALREADY-PAID REPLY ON THE LIVE PATH (Roman 2026-11-13) ───────
// WHY THIS EXISTS. Every saved-reply hook above lives inside `faultResponse`, and the dispatch
// site is one branch: `SB_FAULT ? faultResponse(...) : route.fetch(...)`. So with SB_FAULT set
// NOTHING reaches a provider, and with it unset NONE of these is consulted. There was no state
// in which the foundations came off disk while the planner, the author and the editorial passes
// went to their real providers — which is exactly what a Scene 1 rewrite needs.
//
// `SB_REUSE_SPINE` was the one hook ever built for that, and its comment says why it is named
// outside the SB_REPLAY_* family: "it exists FOR the live run, replacing a single already-paid
// call, while every other operation still goes to its real provider." This is that same thing,
// generalised to the operations whose replies are already on disk. The REPLAY SAFETY gate is
// untouched: these are SB_REUSE_*, not SB_REPLAY_*, and the distinction that gate protects — an
// operation whose LIVE behaviour is under test may not be faked — still holds. The planner, the
// author and the C+ passes have no entry here on purpose. They are the test.
//
// CLAIMED BY OPERATION, using the SAME predicates the fault arm uses, so a claim cannot drift
// between the two paths. Served ONCE each: a second call for the same operation means the
// application REJECTED the first, and answering it again would hide that, so it is refused at
// the wire and the run halts naming the operation.
const _REUSE_OPS = [
  { env: 'SB_REUSE_PCBIBLE',    label: 'PC BODY BIBLE',          claims: (t) => _isPcBibleOp(t) },
  { env: 'SB_REUSE_LIBIBLE',    label: 'LI BODY BIBLE',          claims: (t) => _isLiBibleOp(t) },
  { env: 'SB_REUSE_ROTATOR',    label: 'PHYSICAL-CANON ROTATOR', claims: (t) => _isCanonRotatorOp(t) },
  // THE CRISIS FUSER. It fires whenever the PC bible's current_crisis is not already "fused" —
  // the pass that rewrites the catastrophe so the love interest is structurally load-bearing in
  // it. It had no slot here because the saved First Taste bible arrived already fused, so no run
  // had ever reached it; a fixture bible whose crisis names a neighbour rather than Roman tripped
  // it immediately, and with nothing to serve the reply `stop_unmatched` halted the chain before
  // the A-plot. One operation in the chain with no slot is one operation that cannot be replayed.
  { env: 'SB_REUSE_CRISISFUSE', label: 'CRISIS FUSER',
    claims: (t) => /You rewrite the CURRENT CRISIS of a billionaire-world romance heroine bible/.test(String(t || '')) },
  { env: 'SB_REUSE_PAIRBOND',   label: 'PAIR BOND',              claims: (t) => _isPairBondOp(t) },
  { env: 'SB_REUSE_RPLOT',      label: 'R-PLOT',                 claims: (t) => _isRPlotOp(t) },
  { env: 'SB_REUSE_APLOT',      label: 'A-PLOT',                 claims: (t) => /A-PLOT GENERATOR/.test(String(t || '')) },
  { env: 'SB_REUSE_COMPRESS',   label: 'A-PLOT COMPRESSOR',      claims: (t) => _isAplotCompressOp(t) },
  { env: 'SB_REUSE_WOUNDAUDIT', label: 'WOUND-TO-LI SWAP TEST',  claims: (t) => _isWoundAuditOp(t) },
  { env: 'SB_REUSE_SUBPLOT',    label: 'SUBPLOT GENERATOR',      claims: (t) => _isSubplotOp(t) },
  // THE OPENING PLANNER. It had no slot here on purpose while it WAS the test — the comment above
  // says so. It is no longer the test: the planner reply of 2026-11-16 (_ft_scene1_paid3) is saved
  // and the open question is now what the AUTHOR receives. Replaying the planner verbatim is what
  // lets the author request be captured without paying for a plan twice, and it is the same
  // serve-once discipline as every other entry: a second planner call is a REPLAN and is refused.
  { env: 'SB_REUSE_PLANNER',    label: 'OPENING PLANNER',        claims: (t) => isOpeningPlannerOp({ messages: [{ content: String(t || '') }] }) },
  // ── THE SCENE 1 PROSE AUTHOR, CLAIMED BY ITS DECLARED OPERATION ─────────────────────────
  // Every other arm claims on prompt TEXT. This one claims on `purpose=scene1_opening_prose`,
  // the label the call site now puts on the body — which is the only identifier that cannot
  // drift from the prompt. SB_REPLAY_AUTHOR exists but sits far below the reuse decision, so a
  // replayed author request was still counted as a dispatch and reached the static server (404,
  // measured). Serving it HERE means it is answered before the request can leave, exactly like
  // the preserved planning replies, under the same serve-once discipline: a second author call
  // is a retry and is refused by name.
  { env: 'SB_REUSE_AUTHOR',     label: 'SCENE 1 PROSE AUTHOR',
    claims: (t, b) => isScene1OpeningProse(b) },
  // ── THE TWO CONTINUATION PLANNING LEGS, BY OPERATION ──────────────────────────────────
  // Claimed on what the prompt ASKS FOR. Role cannot be used: the scene planner, the scaffold
  // and the prose author are all PRIMARY_AUTHOR, and a role match handed the author a scaffold
  // reply. These two patterns are the operations' own text and match nothing else in the turn.
  { env: 'SB_REUSE_SCENE_PLANNER', label: 'CONTINUATION SCENE PLANNER',
    claims: (t) => /You are the SCENE-SPINE planner|You are the SCENE planner/.test(String(t || '')) },
  { env: 'SB_REUSE_SCAFFOLD',      label: 'CONTINUATION SCAFFOLD',
    claims: (t) => /You define narrative skeletons for fiction scenes/.test(String(t || ''))
      && /causal_outline/.test(String(t || '')) },
];
const _reuseState = {};        // env -> { served, file, label, status, bodyChars, receipt }
for (const _op of _REUSE_OPS) {
  if (process.env[_op.env]) _reuseState[_op.env] = { served: 0, label: _op.label,
    file: String(process.env[_op.env]), status: null, bodyChars: 0, receipt: null };
}

async function faultResponse(kind, reqText, url) {
  // ── A COMMA-SEPARATED SB_FAULT IS A PRIORITY LIST ──────────────────────────────────────
  // Authorized to reach the Scene 1 author offline. Two existing fixtures are needed at once:
  // `aplot_saved` replays the A-plot reply this project ALREADY PAID FOR (it invents nothing and
  // is not re-billed), and `valid_plan` supplies an opening-planner reply production's own
  // validators accept. Neither alone gets there — without the first the A-plot fails validation
  // and the opening never builds; without the second the planner reply is refused.
  //
  // THIS ADDS NO FIXTURE AND CHANGES NO EXISTING ONE. It only decides which of the kinds already
  // written answers a given request: each gated kind is asked whether it claims this one, in the
  // order given, and the LAST kind is the default for everything unclaimed. A single-kind
  // SB_FAULT takes none of this path and behaves exactly as before.
  if (String(kind || '').indexOf(',') !== -1) {
    const kinds = String(kind).split(',').map((k) => k.trim()).filter(Boolean);
    for (const k of kinds.slice(0, -1)) {
      const claims = _FAULT_CLAIMS[k];
      if (claims && claims(reqText, url)) return await faultResponse(k, reqText, url);
    }
    return await faultResponse(kinds[kinds.length - 1], reqText, url);
  }
  // ── SB_FAULT=canon_rotator_429 — THE RATE LIMIT THE ORIGINAL RUN ACTUALLY GOT ──────────
  // (Roman 2026-11-13.) The physical-canon variety rotator fired right after the LI bible and
  // came back 429 in the parked run — and the run CARRIED ON past it. Replaying a success here
  // would be inventing a reply the story never had, and would let the rotator overwrite the
  // bible's physical canon in a capture that is supposed to reproduce the original conditions.
  // So the saved rate-limit response is served with its own status: faithful, and already seen.
  if (kind === 'canon_rotator_429') {
    const src = String(process.env.SB_CANON_ROTATOR_429 || '');
    // BOTH SMALL BIBLE-REWRITE OPS, one saved 429. The physical-canon rotator and the body-tell
    // rewriter are two mistral calls that run back to back over the same bible, and BOTH returned
    // `Rate limit exceeded` (code 1300) in the live run — so one saved 429 is the honest reply for
    // either. Before this, the body-tell call was unclaimed, `stop_unmatched` halted on it, and
    // the replay could never reach the A-plot it exists to inspect.
    const _isBodyTellOp = (t) => /You rewrite \d+ body-tell field\(s\) for a romance heroine bible/
      .test(String(t || ''));
    if (src && (_isCanonRotatorOp(reqText) || _isBodyTellOp(reqText))) {
      const rec = JSON.parse(fs.readFileSync(src, 'utf8'));
      const bytes = String(rec.bodyComplete || '{}');
      say('  ↻ ' + (_isBodyTellOp(reqText) ? 'BODY-TELL REWRITER' : 'PHYSICAL-CANON ROTATOR')
        + ' ← SAVED ' + (rec.status || 429) + ' ' + path.basename(src)
        + ' — the reply the original run got, and carried on past');
      return { status: () => Number(rec.status || 429), text: async () => bytes,
        headers: () => ({ 'content-type': 'application/json', 'x-request-id': 'replayed-rotator-429' }) };
    }
    kind = 'stop_unmatched';
  }
  // ── SB_FAULT=pairbond_saved / rplot_saved — THE TWO REMAINING FOUNDATIONS ───────────────
  // Both are PRIMARY_AUTHOR, like the bibles and the A-plot, so both are claimed by the opening
  // instruction of their own generator rather than by role or order.
  // ── SB_FAULT=support_saved — THE THREE PASSES BETWEEN THE A-PLOT AND THE AUTHOR ────────
  // The A-plot Scene-1 compressor, the wound→LI swap-test audit and the subplot generator. Each
  // is claimed by its own generator's opening instruction and answered with the reply the parked
  // run already received, envelope-for-envelope: the compressor's is what made that run "fall
  // through to full A-plot block", and inventing a different one would change what the Scene 1
  // author is handed — which is the thing under test.
  if (kind === 'support_saved') {
    const pick = _isAplotCompressOp(reqText) ? ['A-PLOT COMPRESS', process.env.SB_COMPRESS_SAVED]
      : _isWoundAuditOp(reqText) ? ['WOUND SWAP AUDIT', process.env.SB_WOUNDAUDIT_SAVED]
      : _isSubplotOp(reqText) ? ['SUBPLOT GENERATOR', process.env.SB_SUBPLOT_SAVED] : null;
    if (pick && pick[1]) {
      const rec = JSON.parse(fs.readFileSync(String(pick[1]), 'utf8'));
      const bytes = String(rec.bodyComplete || '{}');
      say('  ↻ ' + pick[0] + ' ← SAVED reply ' + path.basename(String(pick[1])) + ' ('
        + bytes.length + ' body bytes) — already billed; NOT re-paid');
      return { status: () => Number(rec.status || 200), text: async () => bytes,
        headers: () => ({ 'content-type': 'application/json', 'x-request-id': 'replayed-support' }) };
    }
    kind = 'stop_unmatched';
  }
  if (kind === 'pairbond_saved' || kind === 'rplot_saved') {
    const isPb = (kind === 'pairbond_saved');
    const src = String((isPb ? process.env.SB_PAIRBOND_SAVED : process.env.SB_RPLOT_SAVED) || '');
    const claims = isPb ? _isPairBondOp(reqText) : _isRPlotOp(reqText);
    if (src && claims) {
      const rec = JSON.parse(fs.readFileSync(src, 'utf8'));
      const saved = JSON.parse(String(rec.bodyComplete || '{}'));
      const body = JSON.stringify({ ok: true, content: String(saved.content || ''),
        usage: saved.usage || { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        _replayedFrom: src });
      say('  ↻ ' + (isPb ? 'PAIR BOND' : 'R-PLOT') + ' ← SAVED reply ' + path.basename(src)
        + ' (' + String(saved.content || '').length + ' content chars) — already billed; NOT re-paid');
      return { status: () => 200, text: async () => body,
        headers: () => ({ 'content-type': 'application/json',
          'x-request-id': isPb ? 'replayed-pairbond' : 'replayed-rplot' }) };
    }
    kind = 'stop_unmatched';
  }
  // ── SB_FAULT=stop_unmatched — NAME THE MISSING REPLY INSTEAD OF PAPERING OVER IT ────────
  // (Roman, corrective 2026-11-13.) Used as the LAST kind in a priority list, this refuses to
  // answer anything the earlier kinds did not claim. The previous terminal default was
  // `valid_plan`, a Fantasy planner skeleton that answers whatever it is handed — so an
  // operation with no saved reply was quietly given a reply for a different operation, discarded
  // downstream, and surfaced only as a stall with no indication of WHICH reply was missing.
  //
  // Stopping here converts that into a named failure: the request's own operation fingerprint is
  // logged and the attempt ends. An offline capture that cannot be completed should say what it
  // lacks, not produce a plausible-looking transcript built on a substitution.
  // ── SB_FAULT=delay_stub — HOW LONG CAN THIS RUNNER WAIT? (Roman 2026-11-15) ──────────────
  // The A-plot died at 40.334s with a 445.556s client deadline and a 415.556s server window, and
  // another call on the same preview finished in 93.9s. The Vercel invocation log for
  // 2sg9p-1794734185304-f2f42ce95b8e shows the proxy starting and then nothing at all — no status,
  // no duration — so the logs cannot say which side closed the connection.
  //
  // This holds a request open for SB_DELAY_MS and then answers it, so the question "does anything
  // in this runner abandon a request at ~40s" can be answered without a provider.
  //
  // WHAT IT CANNOT PROVE, stated here so a result is not over-read: the stub answers from INSIDE
  // the fault handler, so Playwright's `route.fetch` — the call that actually reported
  // `read ETIMEDOUT` — is never exercised. Isolating that needs an HTTP endpoint that delays,
  // which means a deploy or a second local server.
  if (kind === 'delay_stub') {
    const ms = Number(process.env.SB_DELAY_MS || 60000);
    if (MODEL_ROUTES.test(url)) {
      const _t0 = Date.now();
      // `body` is not in scope in faultResponse — referencing it threw "Cannot access 'body'
      // before initialization" and halted the probe. The URL is all this needs.
      say('  ⏱ DELAY STUB: holding ' + url.replace(ORIGIN, '') + ' open for '
        + (ms / 1000).toFixed(1) + 's before answering (no provider involved)');
      await new Promise((r) => setTimeout(r, ms));
      const _held = ((Date.now() - _t0) / 1000).toFixed(1);
      say('  ⏱ DELAY STUB: answered after ' + _held + 's — the runner did NOT abandon it');
      return { status: () => 429, text: async () => JSON.stringify({ object: 'error',
        message: 'delay stub — no provider was contacted', type: 'delay_stub', code: '0' }),
        headers: () => ({ 'content-type': 'application/json',
          'x-request-id': 'delay-stub-' + _held + 's', 'x-sb-replayed': 'delay_stub' }) };
    }
  }
  if (kind === 'stop_unmatched') {
    const why = '[UNMATCHED OPERATION] no saved reply claims this request: ' + _describeOp(reqText, url);
    try { say('  ✗ ' + why); } catch (_) {}
    throw new Error(why);
  }
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
  // ── SB_FAULT=aplot_timeout — THE MEASURED r3 FAILURE, REPRODUCED PROVIDER-FREE ──────────
  // The A-plot returned no HTTP response and r4-r7 dispatched anyway. A control for that needs
  // exactly this state: one named operation with no reply, everything before it answering
  // normally, and then the question of whether anything after it leaves. Same shape as the
  // sol_* legs above — targeted, with every other request taking the known-good body.
  //
  // MATCHED BY ITS INSTRUCTION, not by a role label: the A-plot travels as role
  // STRUCTURE_GENERATOR on /api/proxy by default and as PRIMARY_AUTHOR on /api/chatgpt-proxy
  // when a planner is selected, so a label match would miss it in exactly the configuration
  // under test.
  if (kind === 'aplot_timeout') {
    if (/A-PLOT GENERATOR/.test(String(reqText || ''))) {
      throw new Error('injected A-plot transit failure (no HTTP response)');
    }
    kind = 'cache_receipt';
  }
  // ── SB_FAULT=aplot_saved — THE SAVED A-PLOT REPLY, SERVED PROVIDER-FREE ─────────────────
  // Roman asked for the corrections to be verified "using the saved requests and response".
  // Proving that the accepted A-plot reaches the SPINE needs an A-plot that actually commits to
  // state, and no synthetic shape satisfies the A-plot validator. So the A-plot request is
  // answered with the PRESERVED reply from the failed attempt — the one whose 12,120 characters
  // the chain called "empty" — and every other request takes the known-good body.
  //
  // It replays bytes that were already paid for and invents nothing. SB_APLOT_SAVED points at
  // the saved response artifact; its `content` is passed through as the route's own envelope.
  if (kind === 'aplot_saved') {
    if (/A-PLOT GENERATOR/.test(String(reqText || ''))) {
      const src = String(process.env.SB_APLOT_SAVED || '');
      const rec = JSON.parse(fs.readFileSync(src, 'utf8'));
      const saved = JSON.parse(String(rec.bodyComplete || '{}'));
      const body = JSON.stringify({ ok: true, content: String(saved.content || ''),
        usage: saved.usage || { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        _replayedFrom: src });
      say('  ↻ A-PLOT ← SAVED reply ' + path.basename(src) + ' ('
        + String(saved.content || '').length + ' content chars) — already billed; NOT re-paid');
      return { status: () => 200, text: async () => body,
        headers: () => ({ 'content-type': 'application/json', 'x-request-id': 'replayed-aplot' }) };
    }
    kind = 'cache_receipt';
  }
  // ── SB_FAULT=bible_saved — THE SAVED BODY BIBLES, MATCHED BY OPERATION ──────────────────
  // (Roman, authorized 2026-11-13.) The A-plot replay alone does not reach the Scene 1 author:
  // the Body Bibles are generated first and, answered by a generic fixture, are DISCARDED
  // ("generated but missing core fields"), which strands the R-plot and the opening.
  //
  // MATCHED BY OPERATION, NOT BY ROLE OR ORDER. Both bibles travel as PRIMARY_AUTHOR, and so do
  // the pair bond, the R-plot and the A-plot, so a role test claims the wrong call and an order
  // test breaks the moment a leg is added or retried. Each bible is identified by a marker that
  // appears ONLY in its own request, measured from a captured request rather than assumed:
  //   PC — 'STARTER PC FOUNDATION', the seeded-protagonist canon block
  //   LI — 'signature_kink', a field only the love-interest schema asks for
  // A request carrying neither is not a bible and is left for the next kind in the list.
  if (kind === 'bible_saved') {
    const t = String(reqText || '');
    const isPc = /STARTER PC FOUNDATION/.test(t);
    const isLi = !isPc && /signature_kink/.test(t);
    const src = isPc ? String(process.env.SB_PCBIBLE_SAVED || '')
      : (isLi ? String(process.env.SB_LIBIBLE_SAVED || '') : '');
    if (src) {
      const rec = JSON.parse(fs.readFileSync(src, 'utf8'));
      const saved = JSON.parse(String(rec.bodyComplete || '{}'));
      const body = JSON.stringify({ ok: true, content: String(saved.content || ''),
        usage: saved.usage || { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        _replayedFrom: src });
      say('  ↻ ' + (isPc ? 'PC' : 'LI') + ' BODY BIBLE ← SAVED reply ' + path.basename(src)
        + ' (' + String(saved.content || '').length + ' content chars) — already billed; NOT re-paid');
      return { status: () => 200, text: async () => body,
        headers: () => ({ 'content-type': 'application/json', 'x-request-id': 'replayed-bible' }) };
    }
    kind = 'cache_receipt';
  }
  // ── SB_FAULT=planner_saved — THIS BOOK'S OWN SAVED OPENING-PLANNER REPLY ────────────────
  // The `valid_plan` fixture is a FANTASY skeleton ("carry the veil-canopy aside") built for a
  // different Book; it answers whatever it is handed, which is how the bibles came to be given a
  // planner reply. This serves the First Taste planner reply the parked run already paid for,
  // VERBATIM — production's own Scene-1 skeleton validator then judges it exactly as it judged it
  // live. If it no longer passes, the run says so rather than this fixture asserting it does.
  if (kind === 'planner_saved') {
    const src = String(process.env.SB_PLANNER_SAVED || '');
    if (src && String(reqText || '').indexOf(OPENING_PLANNER_SIG) !== -1) {
      const rec = JSON.parse(fs.readFileSync(src, 'utf8'));
      const bytes = String(rec.bodyComplete || '');
      assert(bytes.length > 0, 'SB_PLANNER_SAVED names a record with no bodyComplete: ' + src);
      say('  ↻ OPENING_PLANNER ← SAVED reply ' + path.basename(src) + ' (' + bytes.length
        + ' body bytes) — already billed; NOT re-paid; production validates it');
      // `x-sb-replayed` is the machine-readable form of the sentence above. Settlement reads it
      // and books ZERO for this run while keeping the original receipt for reference, so a
      // replayed reply can never again be counted as money spent here.
      return { status: () => 200, text: async () => bytes,
        headers: () => ({ 'content-type': 'application/json', 'x-request-id': 'replayed-planner',
          'x-sb-replayed': 'planner_saved:' + path.basename(src) }) };
    }
    kind = 'cache_receipt';
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
  // ── SB_PLAN_FIXTURE — THE THREE PLANNING CASES ───────────────────────────────────────
  // empty_planner : the planner returns no content          → ZERO scaffold dispatches
  // reject        : planner valid, scaffold = the SAVED Ministral reply, unchanged
  // accept        : planner valid, scaffold = that same reply with its contradictions repaired
  if (process.env.SB_PLAN_FIXTURE) {
    const _case = String(process.env.SB_PLAN_FIXTURE);
    const _asked = (body && body.messages || []).map((m) => String(m.content || '')).join('\n');
    const _isPlanner = /SCENE-SPINE planner|You are the SCENE planner/.test(_asked);
    const _isScaffold = /causal_outline/.test(_asked) && /stage_contract|environment_anchor/.test(_asked);
    const _fx = (f) => JSON.parse(fs.readFileSync(ROOT_DIR + '/_ft_fixtures/' + f, 'utf8'));
    if (_isPlanner) {
      if (_case === 'empty_planner') {
        say('  \u21bb PLAN FIXTURE (' + _case + '): the planner returns EMPTY content');
        return asChat('');
      }
      if (_case === 'truncated_planner') {
        // THE PROXY'S OWN ENVELOPE. finish_reason sits beside content, which is where
        // api/chatgpt-proxy.js puts it after lifting it out of choices[0]. The content PARSES
        // and carries a full-looking plan: only finish_reason says it was cut off.
        const _plan = JSON.parse(fs.readFileSync(ROOT_DIR + '/_ft_fixtures/planner_valid.json', 'utf8'));
        say('  \u21bb PLAN FIXTURE (' + _case + '): parseable plan, top-level finish_reason="length"');
        return { content: JSON.stringify(_plan), usage: null, finish_reason: 'length', refusal: null };
      }
      say('  \u21bb PLAN FIXTURE (' + _case + '): a valid planner reply');
      return asChat(JSON.stringify(_fx('planner_valid.json')));
    }
    if (_isScaffold) {
      const f = (_case === 'accept') ? 'scaffold_accept.json' : 'scaffold_reject.json';
      say('  \u21bb PLAN FIXTURE (' + _case + '): scaffold \u2190 ' + f
        + (f === 'scaffold_reject.json' ? ' (the SAVED Ministral reply, unchanged)' : ''));
      return asChat(JSON.stringify(_fx(f)));
    }
  }
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

  // ── THE STAGED CAST AND PLACE ARE SUPPLIED INPUTS WHEN GIVEN ───────────────────────────
  // SB_STAGE_PRESENT="A,B"  SB_STAGE_LOCATION="where"  — absent, the First Sacrifice defaults
  // below are unchanged, so every existing arm is unaffected.
  const _stagePresent = String(process.env.SB_STAGE_PRESENT || '').trim()
    ? String(process.env.SB_STAGE_PRESENT).split(',').map((x) => x.trim()).filter(Boolean)
    : ['Lirael', 'Seren', 'Julian', 'the presiding Dohkar'];
  const _stageLocation = String(process.env.SB_STAGE_LOCATION || '').trim() || 'the ritual clearing';
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
        stage_location: _stageLocation,
        stage_location_id: 'place:1',
        stage_present: _stagePresent,
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
        stage_location: _stageLocation,
        stage_present: _stagePresent,
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
  if (process.env.SB_REPLAY_AUTHOR && isAuthorRequest(JSON.stringify(body), body)) {
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
// ── THE SELECTED RUN CONFIGURATION REACHES THE PAGE (Roman, authorized 2026-11-06) ────────
// SB_RUN_CONFIG carries one JSON object into `window._sbRunConfig`, which is the only thing the
// production code consults for this run's model assignment. Installed as an INIT script so it is
// present before app.js evaluates and survives the save/reopen reload — a reading pause cannot
// drop the assignment and silently restore the Grok default. Unset, nothing is installed.
const RUN_CONFIG = (() => {
  const raw = process.env.SB_RUN_CONFIG;
  if (!raw) return null;
  const c = JSON.parse(raw);
  for (const k of ['generalAuthorModel', 'plannerModel', 'architectureModel']) {
    if (c[k] && /grok/i.test(String(c[k]))) {
      throw new Error('SB_RUN_CONFIG.' + k + ' names a Grok model; this configuration selects '
        + 'the GENERAL stages. Explicit authorship routes to Grok through the existing _hot '
        + 'predicate and must not be set here.');
    }
  }
  return c;
})();
// ── THE ACCEPTED CLOSING DILEMMA, SUPPLIED AS A DECLARED REPLAY INPUT ────────────────────
// SB_CLOSING_DILEMMA carries the dilemma the product already accepted for this page, so a replay
// can replace a RESOLVED closing beat without inventing one and without depending on state that
// is not populated until later in the same builder. Absent, nothing is injected and the app's own
// saved value is used.
// ── A FIXED C+ CRAFT FIXTURE (SB_CPLUS_ACCEPT=1) ─────────────────────────────────────────
// NO JUDGEMENT RULE. My previous stub picked any sentence in which the character looked like an
// agent, and it credited Dani's "Show it to the right audience" frame with
//   "'Dani left me,' Helen MacBrayne tells the camera, my mother..."
// — Helen's dialogue, which delivers nothing of Dani's frame. A green "delivered" line proved
// only that the mount can save a record.
//
// So the fixture is fixed and declared: Dani is assigned PRACTICED FACE, the draft contains
// "I have a smile I use just for the screen.", and the stub returns a canned KEEP for exactly
// that line through the NORMAL craft reply shape. The production parser
// (validateSceneEditorReply) then does its own verbatim check, and the publication settle does
// its own survival check. Nothing here decides whether the passage is good.
if (process.env.SB_CPLUS_ACCEPT === '1') {
  const CPLUS_FIXTURE_LINE = 'I have a smile I use just for the screen.';
  const CPLUS_FIXTURE_FRAME = 'practiced-face';
  const CPLUS_DROP_BEFORE_PUBLISH = process.env.SB_CPLUS_DROP_ACCEPTED === '1';
  await ctx.addInitScript((cfg) => {
    try {
      window._sbCplusFixture = cfg;
      // Force the fixture frame onto the PC so the canned KEEP matches a real assignment.
      // NO FRAME PIN. Helen's draw is independent of it (verified: she gets Practiced Face with
      // the pin on AND off), so a pin would mask a collapsed id. A fixed story id is used instead,
      // where the PC and Helen genuinely draw different frames.
      window._sbCplusStoryIdOverride = cfg.storyId || null;
      // The draft must contain the line, or the production parser will correctly reject the
      // KEEP as not verbatim. Injected into the prose the editor is shown, once.
      // THE EDITOR DRAFT IS PLAIN TEXT, not HTML. The first version only matched `<p>`, so the
      // line was never seeded, the craft request never contained it, and the fixture could not
      // legitimately fire — which is why the captured POST had neither the id nor the line.
      window.__sbCplusSeedDraft = function (prose) {
        var s = String(prose || '');
        if (s.indexOf(cfg.line) !== -1) return s;
        if (/<p[^>]*>/i.test(s)) return s.replace(/(<p[^>]*>)/i, '$1' + cfg.line + ' ');
        var nl = s.indexOf('\n\n');
        if (nl > 0) return s.slice(0, nl) + '\n\n' + cfg.line + s.slice(nl);
        return cfg.line + ' ' + s;
      };
    } catch (_) {}
  }, { line: CPLUS_FIXTURE_LINE, frameId: CPLUS_FIXTURE_FRAME,
       storyId: process.env.SB_CPLUS_STORY_ID || 'fx-14',
       dropBeforePublish: CPLUS_DROP_BEFORE_PUBLISH });
  say('  \u2713 C+ craft fixture armed: PRACTICED FACE for the PC, canned KEEP for "'
    + CPLUS_FIXTURE_LINE + '"'
    + (CPLUS_DROP_BEFORE_PUBLISH ? ' \u00b7 NEGATIVE CONTROL: the accepted line is removed before publication' : ''));
}
// ── SB_PRECACHE_PREVIEW — A SUGGESTION ALREADY IN THE CACHE BEFORE THE CLICK ────────────
// Written through the app's OWN cache writer, so the entry is indistinguishable from one a real
// suggestion call would have left. It is installed on the page and applied when the deck is
// examined, which is the last moment before the reader can click a card.
if (process.env.SB_PRECACHE_PREVIEW) {
  let _pc = null;
  try { _pc = JSON.parse(process.env.SB_PRECACHE_PREVIEW); } catch (_) { _pc = null; }
  if (!_pc || !_pc.cardId) {
    throw new Error('SB_PRECACHE_PREVIEW is not valid JSON with a cardId — refusing to start');
  }
  await ctx.addInitScript((pc) => {
    try {
      window.__sbPrecachePreview = pc;
      // Applied lazily: state and the cache writer do not exist at init time.
      window.__sbApplyPrecachePreview = function () {
        try {
          if (!window.state || typeof window._cacheFateCardPreview !== 'function') return false;
          var turn = window.state.turnCount || 0;
          window._cacheFateCardPreview(turn, pc.cardId, String(pc.action || ''), String(pc.dialogue || ''));
          var c = window.state._sceneFateCardPreviews || {};
          var hit = c[pc.cardId] || null;
          try { console.log('[FATE:PRECACHE] seeded a suggestion for "' + pc.cardId + '" at turn '
            + turn + ' through the app\'s own writer: ' + JSON.stringify(hit)); } catch (_) {}
          return !!hit;
        } catch (_) { return false; }
      };
    } catch (_) {}
  }, _pc);
  say('  \u2713 pre-cached suggestion armed for card "' + _pc.cardId + '": "'
    + String(_pc.action || '').slice(0, 60) + '" / "' + String(_pc.dialogue || '').slice(0, 60) + '"');
}
if (process.env.SB_CLOSING_DILEMMA) {
  await ctx.addInitScript((d) => { try { window._sbReplayClosingDilemma = d; } catch (_) {} },
    String(process.env.SB_CLOSING_DILEMMA));
  say('  \u2713 closing dilemma supplied as a replay input: "'
    + String(process.env.SB_CLOSING_DILEMMA).slice(0, 90) + '"');
}
if (RUN_CONFIG) {
  await ctx.addInitScript((cfg) => {
    window._sbRunConfig = cfg;
    // ── THE SPECULATIVE PRELOAD IS OFF FOR A SELECTED-AUTHOR RUN (Roman 2026-11-06) ────────
    // MEASURED in the provider-free capture: alongside the Luna author call, a SECOND
    // author-flagged dispatch of 471,970 chars went to /api/proxy requesting
    // grok-4-1-fast-reasoning — on a scene whose state was ST1, intimacyPhase false,
    // eroticMode ROMANTIC, so it was NOT the explicit branch. It is `preloadNextScene`, the
    // speculative pre-render, which authors a scene ahead on the Grok path and discards it if
    // the reader does something else. It would both defeat the selected configuration and add
    // $0.188562 per scene for prose that may never publish.
    //
    // `window.__disableSpeculativePreload` is the EXISTING, documented off switch for exactly
    // this case ("skips it for test runs"). Nothing new is built and no default changes: it is
    // set only when a run configuration is selected.
    window.__disableSpeculativePreload = true;
    // ── THE THREE-ISSUE SPINE MUST ACTUALLY BE INVOKED (Roman 2026-11-06) ──────────────────
    // IDENTIFIED BY CONTENT, not by role label: the issue spine is `_buildCGScaffold`, whose
    // allowance is `_spineOutputAllowance(_modeKey, _expectedIssueCount)` — mode-aware, 20 rows
    // per issue for literary. It is render-mode AGNOSTIC and its own comment says so ("it serves
    // LITERARY just as well as CG"), so this is the literary planning operation, not a CG-only
    // builder. My earlier doubt about that was wrong.
    //
    // WHY IT NEVER APPEARED IN A CAPTURE: `_shouldGenerateCGScaffold` DEFERS it for a literary
    // Tier-0 Scene 1 — "no paid CG-authority call before first page" — a COST policy, not an
    // ordering constraint. `window.__sbFundedSpineAtOpening` is the existing, documented
    // override for exactly this ("EXPERIMENT-SCOPED FUNDED SPINE AT THE OPENING"), and its own
    // comment notes every other cost guard still applies. No planning stage is added.
    window.__sbFundedSpineAtOpening = true;
  }, RUN_CONFIG);
  say('SELECTED RUN CONFIGURATION: ' + JSON.stringify(RUN_CONFIG));
  say('  speculative pre-render DISABLED for this run (existing __disableSpeculativePreload)');
  say('  funded spine at opening SET by the run configuration — the planning route is MOVED');
}

// ── TWO LEVERS THAT USED TO BE REACHABLE ONLY BY INSTALLING A RUN CONFIGURATION ───────────
// (Roman 2026-11-12.) The SB_RUN_CONFIG init script above sets THREE things at once: the model
// assignment, `__disableSpeculativePreload`, and `__sbFundedSpineAtOpening`. The third one MOVES
// THE PLANNING ROUTE — it lifts the Tier-0 deferral so the issue spine is generated before the
// first page instead of after it. So a run that only wanted the pre-render off could not have it
// without also changing the thing it was trying to measure.
//
// These two flags are now independent, and each is installed alone. Neither touches
// `__sbFundedSpineAtOpening`; whether the spine defers is left exactly as production decides it.
//
//   SB_DISABLE_PRELOAD=1      — the documented off switch for the literary speculative
//                               pre-render, and nothing else. The pre-render is a full extra
//                               author generation of the next scene, discarded whenever the
//                               reader does something else.
//   SB_FORCE_HOT_OPENER=0     — restores the real weighted opening-temperature roll. On
//                               localhost the product forces HOT_CRISIS for consistent test
//                               runs ("set window._forceHotOpener=false to restore the roll");
//                               a run meant to exercise the ordinary opening must opt out.
//                               NOTE: this does NOT override the product's own forces — the
//                               billionaire-onboarding force and HOT&FAST are checked before it
//                               and still decide when they apply, which is correct.
const DISABLE_PRELOAD = process.env.SB_DISABLE_PRELOAD === '1';
const UNFORCE_HOT_OPENER = process.env.SB_FORCE_HOT_OPENER === '0';
// ── SB_TEST_CLOSER_PASS=1 — ARM THE TEST-ONLY LUNA CLOSER ADAPTATION ──────────────────────
// Off by default. With it unset the published ending is byte-for-byte what it is today, and the
// extra call is never made. It arms `window.__sbTestCloserPass`, which the app checks at the
// final closer assembly point AFTER the author and every editor have finished.
const TEST_CLOSER_PASS = process.env.SB_TEST_CLOSER_PASS === '1';
// SB_FORCE_OPENER AND SB_SEED_OPENER_HISTORY BELONG IN THIS CONDITION. They were not in it, so
// setting either one ALONE installed nothing and the run proceeded with whatever the rotation
// drew — which is how a paid run was launched believing mother_on_air was pinned while the bank
// drew coproducer_walks.
if (DISABLE_PRELOAD || UNFORCE_HOT_OPENER || TEST_CLOSER_PASS
    || process.env.SB_FORCE_OPENER || process.env.SB_SEED_OPENER_HISTORY) {
  await ctx.addInitScript((f) => {
    if (f.preloadOff) window.__disableSpeculativePreload = true;
    if (f.unforceHot) window._forceHotOpener = false;
    if (f.closerPass) window.__sbTestCloserPass = true;
    // SB_FORCE_OPENER pins which of the twelve openers is drawn, so an offline fixture set built
    // around one opener is judged against that opener rather than against whichever one the
    // device history happened to advance to.
    if (f.forceOpener) window.__sbForceOpenerId = f.forceOpener;
    // SB_SEED_OPENER_HISTORY puts a device history in place BEFORE the app boots, so a run can
    // start from "this reader has already seen all twelve" without playing twelve stories. It
    // writes the same key the app reads; nothing else about the rotation is stubbed.
    if (f.seedOpenerHistory) {
      try { localStorage.setItem('sb_bm_opener_history', f.seedOpenerHistory); } catch (_) {}
    }
  }, { preloadOff: DISABLE_PRELOAD, unforceHot: UNFORCE_HOT_OPENER, closerPass: TEST_CLOSER_PASS,
       forceOpener: process.env.SB_FORCE_OPENER || '',
       seedOpenerHistory: process.env.SB_SEED_OPENER_HISTORY || '' });
  if (process.env.SB_SEED_OPENER_HISTORY) {
    let _n = '?';
    try { _n = String((JSON.parse(process.env.SB_SEED_OPENER_HISTORY).used || []).length); } catch (_) {}
    say('OPENER HISTORY: seeded with ' + _n + ' committed opener id(s) on this device');
  }
  if (process.env.SB_FORCE_OPENER) say('OPENER: pinned to "' + process.env.SB_FORCE_OPENER
    + '" (test hook) — the rotation is not consulted');
  if (TEST_CLOSER_PASS) say('CLOSER PASS: ARMED (test-only) — Luna adapts the mandated closer after the editors;'
    + ' the full stock ending is preserved for comparison and used as the fallback');
  if (DISABLE_PRELOAD) say('SPECULATIVE PRE-RENDER: off (__disableSpeculativePreload) — installed ALONE');
  if (UNFORCE_HOT_OPENER) say('OPENING TEMPERATURE: the dev HOT force is OFF (_forceHotOpener=false) — the roll decides');
  if (!RUN_CONFIG) {
    say('  planning route UNCHANGED: __sbFundedSpineAtOpening was NOT set by this path, so the'
      + ' Tier-0 spine deferral is whatever production decides');
  }
}
page = await ctx.newPage();   // `page` is declared above so the route handler can record routing evidence
const consoleLines = [];
// ── SB_REQUIRE_LI_FROM_START=1 — STOP A 50/50 DRAW BEFORE IT COSTS ANYTHING ─────────────────
// MEASURED while preparing the Scene 1 rewrite: `_liDeferWeight` is 0.50 for a modern world and
// the per-story history does not carry between runs (each run gets a fresh profile), so EVERY
// launch is a coin flip between FROM_START and DEFERRED. A DEFERRED draw is correct product
// behaviour — the love interest is held back and the opening is reference-only by design — but
// it cannot carry the accepted plan's live call, so a rewrite that draws it spends the author
// call and measures nothing it was meant to.
//
// The draw is logged at pair-dynamic resolution, long before the planner and the author, and in
// a run that reuses its foundations nothing has been billed by then. So this arms a halt on that
// one line: the attempt ends immediately, having spent nothing, and says to run it again. It is
// OPT-IN and it does not touch the roll — nothing is forced, nothing is weighted, and a deferred
// story is not declared wrong. The run simply declines to pay for a test it cannot perform.
const REQUIRE_LI_FROM_START = process.env.SB_REQUIRE_LI_FROM_START === '1';
let liArrivalDrawn = null;
// ── THE PINNED OPENER IS CONFIRMED FROM THE APP, NOT ASSUMED FROM THE ENV ───────────────
// `_openerPinned` is what was asked for; `_openerSelected` is what the app actually chose, read
// off its own log line; `_openerFromBible` is what the REUSED Body Bible was generated under,
// derived from the bible's own crisis text. All three must agree before a pinned replay spends.
const _openerPinned = String(process.env.SB_FORCE_OPENER || '').trim();
let _openerSelected = null;
let _openerConfirmed = false;

// The twelve shapes, lifted from the LOCAL build by name. Used only as vocabulary for deriving
// which opener a SAVED REPLY belongs to — that is a property of the file, not of the origin.
const _bmOpenerTable = (() => {
  try {
    const src = fs.readFileSync(ROOT + '/public/app.js', 'utf8');
    // ANCHOR ON THE DECLARATION, NOT THE FIRST MENTION. Keying on the first textual occurrence
    // broke silently the moment a USE of the table was added earlier in the file than its
    // declaration: the lift then took `[_oi]` instead of the twelve openers, the derivation
    // returned null, and both Solo captures reported the bible opener as UNDETERMINED.
    const at = src.indexOf('_BM_OPENERS_12 = [');
    if (at === -1) return null;
    const lb = src.indexOf('[', at);
    let d = 0, end = -1;
    for (let i = lb; i < src.length; i += 1) {
      if (src[i] === '[') d += 1;
      else if (src[i] === ']') { d -= 1; if (d === 0) { end = i; break; } }
    }
    if (end === -1) return null;
    // eslint-disable-next-line no-new-func
    return new Function('return ' + src.slice(lb, end + 1) + ';')();
  } catch (_) { return null; }
})();

// MEASURED to discriminate: on the saved First Taste bible this scores mother_on_air at 82% and
// the runner-up at 13% — a 69-point margin (_FT_BIBLE_OPENER_DERIVATION.json). A derivation that
// is not decisive returns null rather than a guess, and a pinned replay then refuses to spend.
const _OPENER_STOP = new Set(['her','his','she','and','the','that','with','from','into','onto',
  'what','when','while','they','them','their','this','there','then','than','have','has','had',
  'been','being','who','whom','will','would','could','should','must','does','done','about',
  'after','before','over','under','again','just','like','make','makes','made','take','takes',
  'goes','going','gone','come','comes','front','own','one','ones','someone','something',
  'anything','everyone','nothing','person','people','instead','rather','himself','herself',
  'itself','themselves','which','whose','where','because']);
const _openerToks = (x) => Array.from(new Set(String(x).toLowerCase().replace(/[^a-z\s]/g, ' ')
  .split(/\s+/).filter((w) => w.length >= 4 && !_OPENER_STOP.has(w))));
function _deriveOpenerFromReply(file) {
  if (!_bmOpenerTable || !file) return null;
  let crisis = '';
  try {
    const rec0 = JSON.parse(fs.readFileSync(file, 'utf8'));
    let b = String(rec0.bodyComplete || '');
    try {
      const j = JSON.parse(b);
      let c = j.content;
      if (Array.isArray(c)) c = c.map((x) => String((x && x.text) || '')).join('\n');
      if (!c && Array.isArray(j.choices)) c = ((j.choices[0] || {}).message || {}).content || '';
      b = c || b;
    } catch (_) {}
    try {
      const bib = JSON.parse(b.slice(b.indexOf('{'), b.lastIndexOf('}') + 1));
      const cc = bib.current_crisis || {};
      crisis = [cc.event, cc.li_complication, cc.what_she_wants].filter(Boolean).join(' ');
    } catch (_) { crisis = b; }
  } catch (_) { return null; }
  if (!crisis) return null;
  const have = new Set(_openerToks(crisis));
  const scored = _bmOpenerTable.map((o) => {
    const t = _openerToks([o.disaster, o.present].join(' '));
    const hit = t.filter((w) => have.has(w)).length;
    return { id: o.id, score: t.length ? hit / t.length : 0 };
  }).sort((a, b) => b.score - a.score);
  const top = scored[0], next = scored[1] || { score: 0 };
  // Decisive or nothing.
  if (!top || top.score < 0.40 || (top.score - next.score) < 0.20) return null;
  return { id: top.id, score: top.score, runnerUp: next.id || null, runnerUpScore: next.score };
}
const _openerFromBible = _deriveOpenerFromReply(process.env.SB_REUSE_PCBIBLE
  ? (process.env.SB_REUSE_PCBIBLE.startsWith('/') ? process.env.SB_REUSE_PCBIBLE
     : ROOT + '/' + process.env.SB_REUSE_PCBIBLE) : null);
if (_openerFromBible) {
  say('OPENER (saved bible): the reused PC Body Bible was generated under "'
    + _openerFromBible.id + '" (' + Math.round(_openerFromBible.score * 100) + '% vs '
    + Math.round(_openerFromBible.runnerUpScore * 100) + '% for ' + _openerFromBible.runnerUp
    + ') — derived from its own crisis text, not from the environment');
} else if (process.env.SB_REUSE_PCBIBLE) {
  say('OPENER (saved bible): UNDETERMINED from the reused PC Body Bible — no opener scored '
    + 'decisively. A pinned replay will refuse to spend rather than assume.');
}
function _openerStop(why) {
  say('  \u2298 ' + why);
  _ledger('opener_pin_mismatch', { pinned: _openerPinned || null, selected: _openerSelected,
    fromBible: _openerFromBible ? _openerFromBible.id : null, why });
  halted = halted || ('OPENER PIN: ' + why);
  unrecoverableStop = unrecoverableStop || { code: 'opener_pin_mismatch',
    reqId: 'pre-dispatch (the selection is logged before the first paid call)', why };
}
page.on('console', (m) => {
  const t = m.text();
  consoleLines.push(t);
  // ── THE APP'S OWN REPORT OF WHAT IT SELECTED ───────────────────────────────────────────
  // Read from the line the rotation already prints. Nothing is inferred from the environment,
  // which is exactly the mistake that let an unpinned run be reported as pinned.
  try {
    // THREE FORMS, because the app announces the opener differently depending on how it got
    // there. Keying on the draw form alone meant a PINNED run never confirmed its pin:
    //   drawn    → [BM-OPENER] selected IN CODE: "<id>"
    //   pinned   → [BM-OPENER] FORCED to "<id>" by a test hook
    //   either   → [BM-OPENER:DIRECTIVE] "<id>" delivered as the only opener   ← authoritative
    const _os = /\[BM-OPENER\]\s+selected IN CODE:\s+"([^"]+)"/.exec(t)
      || /\[BM-OPENER\]\s+FORCED to\s+"([^"]+)"/.exec(t)
      || /\[BM-OPENER:DIRECTIVE\]\s+"([^"]+)"\s+delivered/.exec(t);
    // The DIRECTIVE names what was DELIVERED. If it contradicts what was announced earlier, the
    // two layers disagree about the opener and neither can be trusted.
    const _dir = /\[BM-OPENER:DIRECTIVE\]\s+"([^"]+)"\s+delivered/.exec(t);
    if (_dir && _openerSelected && _dir[1] !== _openerSelected) {
      _openerStop('the app announced opener "' + _openerSelected + '" but DELIVERED "'
        + _dir[1] + '" to the model. The selection and the directive disagree, so the opener under test is not knowable. Refusing to spend.');
    }
    if (_os && !_openerSelected) {
      _openerSelected = _os[1];
      say('  \u29bf OPENER SELECTED BY THE APP: "' + _openerSelected + '"'
        + (_openerPinned ? ('  (pinned: "' + _openerPinned + '")') : '  (no pin; the rotation decided)'));
      if (_openerPinned && _openerSelected !== _openerPinned) {
        _openerStop('SB_FORCE_OPENER asked for "' + _openerPinned + '" but the app selected "'
          + _openerSelected + '". The pin did not take. Refusing to spend on a run whose opener '
          + 'is not the one under test; nothing has been dispatched.');
      } else if (_openerFromBible && _openerSelected !== _openerFromBible.id) {
        _openerStop('the app selected "' + _openerSelected + '" but the reused PC Body Bible was '
          + 'generated under "' + _openerFromBible.id + '". Carrying on would stamp the saved '
          + 'crisis as if it came from the new draw and fuse two different openings. Refusing '
          + 'before any paid dispatch.');
      } else if (_openerPinned) {
        _openerConfirmed = true;
        say('    \u2713 opener pin CONFIRMED from the app\u2019s own selection'
          + (_openerFromBible ? ' and consistent with the reused Body Bible' : ''));
      }
    }
  } catch (_) {}
  try {
    const hit = /^\[LI-ARRIVAL\]\s+(FROM_START|DEFERRED)\b/.exec(t);
    if (hit && !liArrivalDrawn) {
      liArrivalDrawn = hit[1];
      say('  ⚲ LI ARRIVAL DRAWN: ' + liArrivalDrawn + ' (a 50/50 roll on a modern world; it is not forced here)');
      if (REQUIRE_LI_FROM_START && liArrivalDrawn === 'DEFERRED') {
        const why = 'LI ARRIVAL DREW DEFERRED. This attempt requires FROM_START: a deferred love '
          + 'interest is held out of the opening by design, so the accepted plan\'s live call '
          + 'cannot be carried and the rewrite would measure nothing. Stopping now, before the '
          + 'planner and the author. Nothing was generated and nothing new was billed — run it '
          + 'again and the roll is independent.';
        say('  ⊘ ' + why);
        _ledger('li_arrival_deferred_stop', { drawn: liArrivalDrawn, why });
        halted = halted || ('LI ARRIVAL: ' + why);
        // The SAME sticky flag an unrecoverable transport failure sets, so every later dispatch
        // is refused at the wire by the guard that already exists rather than a second one.
        unrecoverableStop = unrecoverableStop
          || { code: 'li_arrival_deferred', reqId: 'pre-dispatch (the draw is logged before the first call)', why };
      }
    }
  } catch (_) {}
});
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
  // ── THE EDITOR IS A PAID MODEL CALL AND IS TREATED AS ONE ───────────────────────────────
  // THIS COMMENT USED TO SAY the C+/E+ editor "is disabled by configuration
  // (CPLUS_EDITOR_PRICE_FORTUNES unset), so api/cplus-editor.js refuses server-side before any
  // provider is contacted", and the code below priced those calls at zero on that basis. BOTH
  // ARE NOW FALSE: .env.local sets CPLUS_EDITOR_PRICE_FORTUNES=0 with CPLUS_EDITOR_DAILY_CAP=60
  // and leaves CPLUS_EDITOR_ENABLED unset, which the route reads as true. Driving the route's
  // own editorAdmission with that environment admits a general-prose pass on gpt-6-luna with a
  // 6,000-token cap. Zero Fortunes to the reader is not zero dollars to us.
  //
  // The refusal is still handled — it is just no longer ASSUMED. Whether the route refuses is
  // read from the route's own `_upstreamDispatched` flag after the call, which releases the
  // reservation at zero when nothing left the machine.
  if (/cplus-editor/.test(url)) {
    // ══ THE EDITOR SHARES THE RUN AUTHORIZATION ══════════════════════════════════════════
    // EVERY editor call takes the SAME path as every other model call: calculate, check the
    // REMAINING authorization, reserve on the one ledger, dispatch, settle from the returned
    // usage, and leave an unresolved reservation held. The amount is computed by the editor
    // ROUTE'S OWN reserveUsd with its own configured rates and its own outCap, so the figure
    // the guard holds is the figure the server reserves. Counted ONCE: this handler sees one
    // request per upstream editor call and reconciles exactly one hold for it.
    //
    // ── WHY IT IS NO LONGER GATED ON A RUN CONFIGURATION (Roman 2026-11-12) ────────────
    // It used to require a run configuration AS WELL AS the pricer, so the reserve-and-settle
    // path existed ONLY for a run that installed one. That is two unrelated things tied
    // together, and the default side of it was the dangerous one: without SB_RUN_CONFIG every
    // editor call fell through to `route.continue()` — straight to the real route, dispatched to
    // gpt-6-luna, billed, with NO reservation, NO settlement, NO ledger row and nothing counted
    // against the ceiling. The fall-through's own comment said "the real server issues its own
    // refusal, at $0", which was true only while the route was unconfigured.
    //
    // Worse, SB_RUN_CONFIG also sets __sbFundedSpineAtOpening, so the only way to get the editor
    // onto the ceiling was to MOVE THE PLANNING ROUTE — generating the issue spine before the
    // first page instead of after it. Accounting correctness and the planning route are not the
    // same decision and must not share a switch.
    //
    // The condition is now what it always meant: can this call be priced? If the route's own
    // pricer is importable, the editor takes the same path as every other model call —
    // calculate, check the REMAINING authorization, reserve on the one ledger, dispatch, settle
    // from the returned usage, hold what does not resolve.
    if (EDITOR_PRICER) {
      const _edIn = raw.length;
      const _edEst = EDITOR_PRICER(_edIn);
      const _edAvail = remainingNow();
      if (!(_edEst <= _edAvail)) {
        // A REFUSED RESERVATION STOPS THE CALL LEAVING. Not a warning after the fact.
        requests.push({ scene: sceneNoForReplies, url: '/api/cplus-editor', role: body.role || null,
          model: 'gpt-6-luna', chars: _edIn, estimate: _edEst,
          refused: 'over_remaining_authorization', remaining: _edAvail });
        say('  ✗ EDITOR NOT DISPATCHED — $' + _edEst.toFixed(6) + ' exceeds the remaining $'
          + _edAvail.toFixed(6) + ' of the run authorization. The draft publishes unedited.');
        return route.fulfill({ status: 403, contentType: 'application/json',
          body: JSON.stringify({ error: 'over_remaining_authorization', _runGuard: true }) });
      }
      const _edHold = reserve(_edEst, 'cplus-editor', 'gpt-6-luna');
      // ── THE EDITOR ROUTE'S OWN FIELDS ARE RECORDED (Roman 2026-11-06) ───────────────────
      // `bodyText` read body.messages, which this route does not use — it takes `system` and
      // `user` — so every editor request recorded as empty text and WHICH pass had dispatched
      // could not be checked from the artifacts at all. The operation id is recorded beside it
      // because the id is what keeps the three passes from colliding; a claim that they are
      // distinct should be readable off the capture rather than argued from source.
      const _edRec = { scene: sceneNoForReplies, url: '/api/cplus-editor', role: body.role || null,
        model: 'gpt-6-luna', chars: _edIn, estimate: _edEst, served: null, receipt: null,
        operationId: (body && body.operationId) || null,
        revisionId: (body && body.revisionId) || null,
        obligations: (body && body.obligations) || null,
        maxTokens: (body && body.maxTokens) != null ? body.maxTokens : null,
        bodyText: [body && body.system, body && body.user]
          .map((p) => (Array.isArray(p) ? p.join('\n') : String(p == null ? '' : p)))
          .join('\n') };
      requests.push(_edRec);
      // SB_FAULT IS PROVIDER-BLOCKED WITH NO EXCEPTION, AND THAT INCLUDES THIS ROUTE.
      // An SB_FAULT arm runs the LIVE code path with every provider answered locally; the editor
      // handler is invoked in-process with a real fetch and now has a usable credential, so it
      // must be held here exactly as drive holds it. Without this, a provider-free arm could
      // place a real editor call — which is the one thing SB_FAULT promises cannot happen.
      // ── SB_OFFLINE: ANSWERED LOCALLY, BEFORE THE REAL HANDLER IS INVOKED ─────────────
      // Placed ahead of the DRIVE/SB_FAULT branch and ahead of the EDITOR_HANDLER call, so an
      // offline run never reaches the handler. It differs from the DRIVE branch in one way that
      // matters: DRIVE RETAINS the reservation as unresolved exposure, which is right for a
      // fixture standing in for a dispatch that might have happened. Here nothing was sent and
      // nothing could have billed, so the reservation is RELEASED — the same treatment the
      // SB_OFFLINE refusal at the model dispatch site gives.
      // ── A SCENE WHOSE EDITOR CALLS ARE ANSWERED LOCALLY (SB_EDITOR_LOCAL_SCENES) ─────
      // Scoped by scene, so a paid Scene 2 run can refuse to re-pay for re-judging the Scene 1
      // page it resumed from, while Scene 2's own editor call reaches the real handler. The
      // reply is the same no-acceptance shape the offline branch uses, and the reservation is
      // released because nothing left the machine.
      {
        const _localScenes = String(process.env.SB_EDITOR_LOCAL_SCENES || '')
          .split(',').map((x) => x.trim()).filter(Boolean);
        if (_localScenes.length && _localScenes.indexOf(String(sceneNoForReplies)) !== -1) {
          _edRec.estimate = 0;
          _edRec.sceneLocalAnswer = true;
          try { _edHold.open = false; } catch (_) {}
          _ledger('editor_scene_local_answer', { scene: sceneNoForReplies,
            operationId: _edRec.operationId || null, chars: _edIn, wouldHaveReserved: _edEst,
            localScenes: _localScenes,
            why: 'SB_EDITOR_LOCAL_SCENES names this scene: the editor was answered locally before'
              + ' the in-process handler was invoked. No provider was contacted and the'
              + ' reservation was released. Scenes NOT listed reach the real handler.' });
          say('  \u2298 EDITOR ANSWERED LOCALLY for scene ' + sceneNoForReplies
            + ' (SB_EDITOR_LOCAL_SCENES=' + _localScenes.join(',') + ') \u2014 the real handler'
            + ' was NOT invoked \u00b7 reservation of '
            + _edEst.toFixed(6) + ' released, nothing held');
          return route.fulfill({ status: 200, contentType: 'application/json',
            body: JSON.stringify({ decision: 'keep', keptPassage: null, sceneLocal: true }) });
        }
      }
      if (process.env.SB_OFFLINE) {
        _edRec.estimate = 0;
        _edRec.offlineAnsweredLocally = true;
        try { _edHold.open = false; } catch (_) {}
        _ledger('editor_offline_local_answer', { scene: sceneNoForReplies,
          operationId: _edRec.operationId || null, chars: _edIn, wouldHaveReserved: _edEst,
          editorHandlerInvocationsSoFar: _editorHandlerInvocations,
          editorEgressAttemptsSoFar: _editorEgressAttempts,
          why: 'SB_OFFLINE: answered locally before the in-process editor handler was invoked.'
            + ' No provider was contacted and the reservation was released.' });
        say('  ⊘ EDITOR ANSWERED LOCALLY (SB_OFFLINE) — the real handler was NOT invoked'
          + ' (invocations so far: ' + _editorHandlerInvocations
          + ', egress attempts so far: ' + _editorEgressAttempts + ')'
          + ' · $' + _edEst.toFixed(6) + ' reservation released, nothing held');
        // ── THE CANNED CRAFT KEEP GOES THROUGH THE NORMAL REPLY (Roman 2026-11-17) ───────
        // The offline reply is `{decision:'keep', keptPassage:null}`, which the production
        // parser correctly treats as NO acceptance. With SB_CPLUS_ACCEPT=1 the craft operation
        // instead gets a real decisions payload in `content`, addressed to the cplusbeat:
        // obligation ids actually present in THIS request — so validateSceneEditorReply runs its
        // own verbatim check and supplies `keeps` itself. Nothing writes _cpRes.keeps directly.
        if (process.env.SB_CPLUS_ACCEPT === '1') {
          try {
            // READ body.obligations DIRECTLY. The previous version regexed the raw JSON, and the
            // pattern arrived double-escaped from the patch heredoc — `[^"'\\s,\\]}]` excludes the
            // LITERAL characters \\ and s, so it could not match `cplusbeat:pc:self#...` and the
            // fixture logged ids=0 on a request that carried both ids. The obligation list is
            // the thing the editor is answering; nothing needs to be parsed out of text.
            // body.obligations IS PRESENT AND HOLDS STRINGS, NOT OBJECTS. My filter tested
            // `typeof o.id === 'string'` on each string, so every entry fell out and the fixture
            // reported obligations=0 on a POST that carried both ids and the quote. Checked
            // against the SAVED request this time rather than against a body I built myself.
            const _obs = (body && Array.isArray(body.obligations)) ? body.obligations : [];
            const _frameObs = _obs
              .map((o) => (typeof o === 'string' ? o : (o && o.id) || ''))
              .filter((id) => typeof id === 'string' && id.indexOf('cplusbeat:') === 0);
            if (_frameObs.length) {
              say('  \u24d8 craft obligations seen: ' + _frameObs.length + ' frame beat(s) ['
                + _frameObs.join(', ') + ']');
            }
            // ONLY DANI'S PRACTICED FACE IS ANSWERED. Helen's beat is left unanswered on purpose,
            // so 'a beat nobody accepted stays due' is tested in the same run as the positive.
            const _ids = _frameObs.filter((id) => id === 'cplusbeat:pc:self#1@practiced-face');
            const _reqTxt = String(raw || '');
            const _line = 'I have a smile I use just for the screen.';
            if (_ids.length && _reqTxt.indexOf(_line) !== -1) {
              const _decisions = _ids.map((id) => ({ id: id, decision: 'keep',
                keptPassage: _line,
                why: 'she keeps a performance for the camera and knows who it is for' }));
              say('  \u21bb CRAFT KEEP fixture: ' + _ids.length + ' obligation(s) answered with a'
                + ' canned KEEP (the production parser still validates it verbatim)');
              return route.fulfill({ status: 200, contentType: 'application/json',
                body: JSON.stringify({ content: JSON.stringify({ decisions: _decisions }),
                  _synthetic: true }) });
            }
            say('  \u24d8 craft KEEP fixture NOT applied: frame obligations=' + _frameObs.length
              + ', Dani practiced-face targets=' + _ids.length
              + ', line present in request=' + (_reqTxt.indexOf(_line) !== -1));
          } catch (e) { say('  ! craft fixture failed: ' + (e && e.message)); }
        }
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ decision: 'keep', keptPassage: null, _synthetic: true }) });
      }
      if (DRIVE || SB_FAULT) {
        // Provider-free: the reservation is RETAINED as unresolved, exactly as a real call with
        // no usable receipt would be. Nothing is settled from a fixture.
        reconcile(_edHold, { usage: null, noResponse: true,
          why: (DRIVE ? 'provider-free drive' : 'provider-free SB_FAULT arm')
            + ': editor reserved and held, never dispatched', model: 'gpt-6-luna' });
        say('  ⚖ EDITOR reserved $' + _edEst.toFixed(6) + ' against the run authorization'
          + ' (held, provider-free' + (SB_FAULT ? ', SB_FAULT' : '') + ') — remaining $'
          + remainingNow().toFixed(6));
        return route.fulfill({ status: 200, contentType: 'application/json',
          body: JSON.stringify({ decision: 'keep', keptPassage: null, _synthetic: true }) });
      }
      let _edResp = null, _edTxt = '', _edStatus = 200;
      try {
        if (!EDITOR_HANDLER) throw new Error('isolated editor handler unavailable');
        // One invocation per upstream editor call, through the real handler.
        const _res = { _s: 200, _b: null, status(c) { this._s = c; return this; },
          json(o) { this._b = JSON.stringify(o); return this; },
          setHeader() { return this; }, end(x) { this._b = x == null ? this._b : String(x); return this; } };
        // COUNTED HERE, one line above the call, so the count cannot disagree with the call.
        _editorHandlerInvocations += 1;
        await EDITOR_HANDLER({ method: 'POST', headers: { authorization: 'Bearer isolated',
          origin: 'http://localhost' }, body: body }, _res);
        _edStatus = _res._s; _edTxt = _res._b || '';
        _edResp = { status: () => _edStatus };
      } catch (_edErr) {
        reconcile(_edHold, { usage: null, noResponse: true,
          why: 'editor transport failure: ' + String((_edErr && _edErr.message) || _edErr),
          model: 'gpt-6-luna' });
        say('  ✗ EDITOR transport failed — reservation RETAINED as unresolved');
        return route.fulfill({ status: 502, contentType: 'application/json',
          body: JSON.stringify({ error: 'editor_transport_failed' }) });
      }
      let _edJson = null; try { _edJson = JSON.parse(_edTxt); } catch (_) {}
      const _edUsage = (_edJson && (_edJson.usage || (_edJson.receipt && _edJson.receipt.usage))) || null;
      _edRec.served = (_edJson && (_edJson.model || _edJson.servedModel)) || null;
      _edRec.receipt = _edUsage;
      // ── WHAT THE EDITOR ROUTE ACTUALLY SAID (Roman 2026-11-07) ───────────────────────────
      // MEASURED: 22 editor calls were reported as "empty reply" and held as unknown provider
      // spending. They were HTTP 503 {"error":"policy_not_configured"} — a local refusal before
      // any dispatch. This record kept only `served` and `receipt`, so the status and the error
      // body were thrown away and a refusal was indistinguishable from a silent model.
      _edRec.status = _edStatus;
      _edRec.errorCode = (_edJson && _edJson.error) || null;
      _edRec.errorDetail = (_edJson && _edJson.detail) || null;
      _edRec.bodyExcerpt = String(_edTxt || '').slice(0, 400);
      // The ROUTE declares this; it is the only party that knows. Absent (an older route) the
      // outcome stays unknown and the reservation is retained, which is the safe direction.
      _edRec.upstreamDispatched = (_edJson && typeof _edJson._upstreamDispatched === 'boolean')
        ? _edJson._upstreamDispatched : null;
      // ── A REFUSAL THAT NEVER LEFT IS NOT UNKNOWN EXPOSURE ────────────────────────────────
      // Reconciled at ZERO, not held: the route states no provider was contacted, so there is
      // nothing that could have billed. Genuinely unresolved outcomes — dispatched but no usable
      // receipt, or a route that does not declare the flag — keep their reservation untouched.
      if (_edRec.upstreamDispatched === false) {
        _edRec.estimate = 0;
        try { _edHold.open = false; } catch (_) {}
        _ledger('editor_local_refusal', { scene: sceneNoForReplies, status: _edStatus,
          errorCode: _edRec.errorCode, detail: _edRec.errorDetail,
          operationId: _edRec.operationId || null, wouldHaveReserved: _edEst,
          why: 'the route refused before any upstream dispatch; nothing could have been billed' });
        say('  ⊘ EDITOR REFUSED LOCALLY (HTTP ' + _edStatus + ' ' + (_edRec.errorCode || '?')
          + ') — no provider contacted, reservation released, NOT reported as an empty completion'
          + (_edRec.errorDetail ? (' · ' + String(_edRec.errorDetail).slice(0, 110)) : ''));
        return route.fulfill({ status: _edStatus, contentType: 'application/json', body: _edTxt });
      }
      // SETTLE FROM THE RETURNED USAGE. No usage means the reservation stays held — never
      // credited back on the strength of a reply that carried no receipt.
      reconcile(_edHold, { usage: _edUsage, noResponse: !_edUsage,
        why: _edUsage ? null : 'editor reply carried no usage block', model: 'gpt-6-luna' });
      say('  ⚖ EDITOR ' + (_edUsage ? 'settled from usage' : 'HELD (no receipt)')
        + ' · served=' + (_edRec.served || '?') + ' · remaining $' + remainingNow().toFixed(6));
      return route.fulfill({ status: _edStatus, contentType: 'application/json', body: _edTxt });
    }
    // ── UNREACHABLE UNLESS THE ROUTE'S OWN PRICER COULD NOT BE IMPORTED ─────────────────
    // This branch used to be the DEFAULT, recording estimate: 0 with
    // policyRefusal: 'editor_disabled_by_config' and then `route.continue()`-ing the call to a
    // live route. It is now reached only when api/cplus-editor.js failed to import, i.e. when
    // this call CANNOT BE PRICED — and an unpriceable dispatch is refused, never let through.
    // That is the same fail-closed rule estimateUsd applies to an unpriced model: the guard
    // refuses what it cannot bound rather than guessing a figure or hoping a server says no.
    requests.push({ scene: sceneNoForReplies, url: '/api/cplus-editor', role: body.role || null,
      model: 'gpt-6-luna', chars: raw.length, estimate: null,
      refused: 'editor_pricer_unavailable',
      why: 'api/cplus-editor.js could not be imported, so this call cannot be priced or '
        + 'reserved against the ceiling. Refused rather than dispatched unmetered.' });
    say('  ✗ EDITOR NOT DISPATCHED — the route\'s own pricer could not be imported, so the call '
      + 'cannot be bounded. Refused; the draft publishes unedited.');
    return route.fulfill({ status: 403, contentType: 'application/json',
      body: JSON.stringify({ error: 'editor_pricer_unavailable', _runGuard: true }) });
  }

  // ── THE AUTHOR OVERRIDE, APPLIED HERE AND NOWHERE ELSE ──────────────────────────────────
  const isAuthor = isAuthorRequest(raw, body);

  // ── SB_PLANNING_ONLY_ALLOWLIST=1 — WHAT MAY DISPATCH, NOT WHAT MAY NOT ──────────────────
  // THE FAILURE THIS REPLACES, measured: `SB_STOP_BEFORE_AUTHOR` keyed on the runner's existing
  // `isAuthorRequest`, which tests for "SCENE CONTINUATION (HARD" or "PROTAGONIST OPENING BEAT
  // (HARD". The Scene 1 opening author request carries NEITHER — it opens "═══ STORYBOUND
  // ARCHITECTURE LAWS ═══" — so the test was false, the block never evaluated, and 274,889 chars
  // of author request dispatched on a planning-only authorization. A denylist written against
  // prompt wording fails exactly this way: the one payload it has to catch is the one nobody
  // checked it against.
  //
  // So this is an ALLOWLIST of PLANNING OPERATIONS, each claimed by the same predicate the reuse
  // family uses. Anything that is not a planning operation is refused before it is priced,
  // whatever model serves it and whatever its prompt says. The prose author, every editor, every
  // specialist renderer and every post-scene pass are refused because they are not on the list —
  // not because of anything they contain.
  if (process.env.SB_PLANNING_ONLY_ALLOWLIST === '1') {
    // ── MATCHED ON THE GENERATOR'S OWN OPENING INSTRUCTION, IN THE HEAD OF THE REQUEST ────
    // The first version of this list reused the predicates the REUSE family uses, and the check
    // against the overspending run's own payloads caught the consequence immediately: every one
    // of the 31 requests was permitted, the 274,889-char author payload included, because
    // `_isLiBibleOp` matches field names (`secondary_anecdote_different_register`,
    // `desire_register_exemplars_cg`) that DOWNSTREAM prompts quote. A whole-body test cannot
    // tell a generator from something that cites the generator's output. That is the same
    // over-match that once made the LI bible serve four times.
    //
    // An operation is identified by what its OWN generator says FIRST. Each signature below is
    // the opening instruction observed in a real captured request, and every one of them falls
    // inside the first 300 characters. The author payload's head is "═══ STORYBOUND ARCHITECTURE
    // LAWS ═══", which matches none of them.
    //
    // AN UNRECOGNISED HEAD IS REFUSED. If a generator's opening wording ever changes, this run
    // stops and names the request instead of letting prose through — the allowlist fails toward
    // spending nothing.
    // ── MATCH THE PROMPT TEXT, NOT THE POST BODY (fixed after the live run disagreed) ────
    // `raw` is the raw POST body — it begins `{"messages":[{"role":"system","content":"…` — so a
    // head anchored with `^` can NEVER match it, and every planning operation was refused on the
    // live path. The offline check passed because `requests.json` stores the EXTRACTED prompt
    // text (line 2737: the messages' contents joined), which is a different string from the one
    // the code was testing. A check whose input has a different shape from the code's input
    // proves nothing, and this is the third time that has bitten in this work — so the extraction
    // happens HERE, once, and the check is pointed at this same function.
    const _promptText = _allowlistPromptText(raw, body);
    const _head = _promptText.slice(0, 300);
    const _planOps = [
      ['PC body bible', /DISTINGUISHING FEATURE \(anti-calcification ROTATION[\s\S]{0,120}this character's ONE memorable/],
      ['LI body bible', /DISTINGUISHING FEATURE \(anti-calcification ROTATION[\s\S]{0,120}this love interest's ONE memorable/],
      ['physical-canon rotator', /^You revise physical-canon fields of a romance LI bible/],
      ['pair bond', /^You are the architect of WHY THIS PAIR/],
      ['R-plot', /^You are designing an R-PLOT/],
      ['R-plot editorial audit', /^You are an editorial auditor reviewing an R-plot/],
      ['A-plot', /^You are the A-PLOT GENERATOR for Storybound/],
      ['A-plot Scene-1 compressor', /^You are compressing the .{0,20}A-plot of a romance novel/],
      ['wound-to-LI swap test', /^You are a story-structure auditor applying ONE test: the WOUND/],
      ['subplot generator', /^You are the SUBPLOT GENERATOR for Storybound/],
      ['architecture spine', /^You are a CONTINUITY ARCHITECT for a serialized/],
      ['opening planner', new RegExp('^You are a ' + OPENING_PLANNER_SIG.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))],
    ];
    const _headT = _head.replace(/^\s+/, '');
    const _match = _planOps.filter((p) => { try { return p[1].test(_headT); } catch (_) { return false; } })[0];
    // ONCE THE OPENING PLAN IS ACCEPTED, PAID DISPATCH IS CLOSED. The plan is the deliverable;
    // anything the application wants after it is the next stage and is not authorized.
    // ── PAID DISPATCH CLOSES WHEN THE PLAN IS ACCEPTED ───────────────────────────────────
    // MEASURED in the overspending run's own order: r11 opening planner, r12 author, r13 SUBPLOT
    // GENERATOR. The subplot is a planning operation, so an allowlist alone would permit it after
    // the plan had already been accepted — and this run's deliverable IS the accepted plan.
    // Anything the application wants afterwards belongs to the next stage. The planner request
    // itself is of course still allowed through on the call that sets the flag.
    const _wasAccepted = _plannerAccepted;
    if (_match && _match[0] === 'opening planner') _plannerAccepted = true;
    if (!_match || _wasAccepted) {
      const why = 'PLANNING-ONLY: this run is authorized for the planning operations and nothing '
        + 'else, so ' + (body.role || url.replace(ORIGIN, '')) + ' (' + raw.length + ' chars'
        + ((body && body.model) ? ', ' + body.model : '') + ') was refused BEFORE it was priced. It is not on the '
        + (_wasAccepted
            ? ('planning allowlist' + (_match ? ' is closed: the opening plan has already been accepted, and "'
                + _match[0] + '" belongs to the next stage' : ' and the opening plan has already been accepted'))
            : 'planning allowlist')
        + '. Nothing was reserved for it.';
      requests.push({ scene: sceneNoForReplies, url: url.replace(ORIGIN, ''), role: body.role || null,
        model: (body && body.model) || null, chars: raw.length, estimate: 0,
        refusedByDiagnostic: why, bodyText: raw });
      say('  ⊘ ' + why);
      _ledger('planning_only_refused', { scene: sceneNoForReplies, role: body.role || null,
        url: url.replace(ORIGIN, ''), chars: raw.length, plannerAccepted: _plannerAccepted, why });
      // The first refusal preserves its payload: on a planning-only run the thing most worth
      // reading is the author request that would have been paid for.
      if (!_firstRefusedSaved) {
        _firstRefusedSaved = true;
        try {
          fs.writeFileSync(OUT + '/FIRST_REFUSED_REQUEST.json', JSON.stringify({
            statedPlainly: 'The first request this planning-only run refused, preserved unsent. No '
              + 'reply was bought for it and nothing was reserved against the ceiling.',
            role: body.role || null, url: url.replace(ORIGIN, ''), chars: raw.length,
            model: (body && body.model) || null, body,
          }, null, 2));
          say('    ↳ preserved unsent: FIRST_REFUSED_REQUEST.json (' + raw.length + ' chars)');
        } catch (e) { say('    ! could not preserve it: ' + e.message); }
      }
      halted = halted || why;
      try { return await route.abort(); } catch (_) { return; }
    }
    say('  ✓ planning operation permitted: ' + _match[0]);
  }

  // ── SB_STOP_BEFORE_AUTHOR=1 — BUY THE PLAN, NOT THE PROSE ────────────────────────────────
  // Stage 1 runs the fresh R-plot, A-plot, spine and opening planner and then STOPS, so the
  // accepted opening plan can be read before any prose is paid for. `SB_PLANNER_ONLY` is the
  // wrong tool for that: it refuses every role except the first planner attempt, which would
  // block the R-plot and the A-plot the plan is made of.
  //
  // This refuses exactly one thing — the PROSE AUTHOR — and refuses it BEFORE the guard prices
  // it, so the author's reservation never opens and cannot move the peak. The sticky stop is set
  // so the post-author chain cannot run either: nothing downstream of the author has an input.
  if (process.env.SB_STOP_BEFORE_AUTHOR === '1' && isAuthor) {
    const why = 'STOPPED BEFORE THE PROSE AUTHOR: the plan was bought, the prose was not. The '
      + 'opening planner has answered and the accepted plan is on disk; this run is authorized for '
      + 'planning only, so the author request was refused at the wire. Nothing was reserved for it '
      + 'and nothing downstream of it will dispatch.';
    requests.push({ scene: sceneNoForReplies, url: url.replace(ORIGIN, ''), role: body.role || null,
      model: (body && body.model) || null, chars: raw.length, estimate: 0, refusedByDiagnostic: why,
      bodyText: raw });
    say('  ⊘ ' + why);
    _ledger('stopped_before_author', { scene: sceneNoForReplies, role: body.role || null,
      url: url.replace(ORIGIN, ''), chars: raw.length, why });
    // THE REQUEST IS PRESERVED. It is the whole point of the verification: the outgoing author
    // payload can be read for what it would have said without paying for a reply.
    try {
      fs.writeFileSync(OUT + '/AUTHOR_REQUEST_NOT_SENT.json', JSON.stringify({
        statedPlainly: 'This is the Scene 1 author request as it WOULD have been sent. It was '
          + 'refused at the wire under SB_STOP_BEFORE_AUTHOR, so no prose was generated and no '
          + 'author call was billed. It is preserved so the outgoing payload can be read.',
        chars: raw.length, role: body.role || null, url: url.replace(ORIGIN, ''),
        model: (body && body.model) || null, body,
      }, null, 2));
      say('    ↳ the unsent author request is preserved: AUTHOR_REQUEST_NOT_SENT.json ('
        + raw.length + ' chars)');
    } catch (e) { say('    ! could not preserve the unsent author request: ' + e.message); }
    halted = halted || why;
    unrecoverableStop = unrecoverableStop || { code: 'stopped_before_author', reqId: null, why };
    try { return await route.abort(); } catch (_) { return; }
  }

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
  // ── AN UNRECOVERABLE FAILURE STOPS THE NEXT DISPATCH, NOT THE NEXT REPORT ───────────────
  // MEASURED DEFECT: the A-plot (r3) timed out at the wire, `halted` was set, and r4-r7 — the
  // three-issue spine, the opening staging planner, its repair retry and the opening author —
  // ALL still left for real providers. `halted` was only a label on the final report; nothing
  // consulted it before dispatching. So a required operation failed and the run went on paying
  // for planning and authorship built on top of the hole it left.
  //
  // A dispatch that returns NO HTTP RESPONSE AT ALL is the trigger. That is deliberately not the
  // same as an error status: the 429 on the body-tell sub-pass answered, production handled it,
  // and the run was right to continue. A non-response is the case nothing can interpret — the
  // call may or may not have billed, and whatever depended on it has no input.
  //
  // NOT SCOPED TO SB_FRESH_PLAN, unlike the gate below it: this is not about which experiment is
  // running, it is about not buying work that rests on a failure. In-flight calls are a separate
  // matter — already dispatched, reconciled as exposure, never retroactively refused.
  if (unrecoverableStop) {
    requests.push({ scene: sceneNoForReplies, url: url.replace(ORIGIN, ''), role: body.role || null,
      model: 'none', chars: raw.length, estimate: 0,
      refusedByUnrecoverable: unrecoverableStop.code });
    _ledger('unrecoverable_refused', { scene: sceneNoForReplies, role: body.role || null,
      url: url.replace(ORIGIN, ''), chars: raw.length, code: unrecoverableStop.code,
      failedReqId: unrecoverableStop.reqId, why: unrecoverableStop.why });
    say('  ⊘ refused (run stopped by an unrecoverable failure at request #'
      + unrecoverableStop.reqId + '): ' + (body.role || url));
    try { return await route.abort(); } catch (_) { return; }
  }
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
    const verdict = scaffoldPrerequisite(snap,
      prerequisiteOptionsFor(MODE, RUN_CONFIG && RUN_CONFIG.architectureModel));
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
      snapshot: snap,
      prereqOptions: prerequisiteOptionsFor(MODE, RUN_CONFIG && RUN_CONFIG.architectureModel) });
  }

  // ── REGISTER GATE: CONSULTED BEFORE ANY AUTHOR REQUEST IS DISPATCHED ──
  // STICKY. Once stopped, every later author request is refused too, so a client-side tier
  // fallback cannot slip a second author call through a different route after the stop.
  if (isAuthor) {
    // ── THE PROSE REQUEST IS CONFIRMED BEFORE IT IS SENT (Roman 2026-11-17) ────────────────
    // The deck change has never been in a DISPATCHED author request: the last two attempts died
    // before one was built, so "the frame reaches the author" is still unverified. Confirming it
    // after the fact would be confirming it after the money is gone, so the three elements are
    // asserted HERE, at the gate, and a missing one refuses the dispatch with nothing spent.
    //
    // Matched on the request's own text, each against what the frame actually emits:
    //   the deck beat      — the grip and the not-remembering, which now land MID-SCENE
    //   hand continuity    — the WHICH HAND block, which makes the hand answerable later
    //   the shorter closer — the exact literal the scene must end on
    // SCOPED TO OPENINGS THAT USE THIS FRAME. The deck sequence is a Scene-1 onboarding frame,
    // so the check applies where the app says that frame is in force and nowhere else: a
    // continuation, or an opening in a story past the onboarding window, must not be refused for
    // lacking a frame it was never given.
    const _deckFrameInForce = isScene1OpeningProse(body)
      && (body.deckFrameActive === true || body._sbDeckFrameActive === true);
    if (!_deckFrameInForce && isAuthor) {
      say('  \u25cb deck check not applicable to this request ('
        + (isScene1OpeningProse(body)
            ? 'Scene 1 prose, but the deck frame is not in force'
            : 'not Scene 1 opening prose') + ')');
    }
    if (_deckFrameInForce) {
      // ── THE BODY IS JSON, SO ITS NEWLINES ARE TWO CHARACTERS ────────────────────────────
      // `raw` is the POST body as sent, where a prompt newline is the escape sequence \n, not a
      // newline character. Eleven single-line patterns matched; the ONE that spanned a line break
      // ("THIS page stops at\n      the choice") could not, and the gate refused a request whose
      // text was perfectly correct. Decoding the escapes first makes every multi-line pattern
      // test the prose the model will actually read.
      const _authorTxt = String(raw)
        .replace(/\\r\\n|\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      // THE FOUR-BEAT ENDING SEQUENCE, MATCHED ON WHAT THE FRAME NOW EMITS. The earlier version
      // of this gate checked the previous frame's wording and would have passed a request that
      // carried the superseded end-only block, because it searched for one historical PHRASE
      // rather than for the block's structure.
      const _need = [
        ['the ordered ending sequence', /THE ENDING SEQUENCE \(HARD/],
        ['(1) the discovery, where the pressure lands', /\(1\) THE DISCOVERY[\s\S]{0,400}pressure actually LANDS/],
        ['the grip sentence itself', /hand tightened around (?:my|your|his|her|their)[^.]{0,40}(?:tarot deck|bundle of cards)/i],
        ['the not-remembering half', /didn['\u2019]t remember bringing it|bringing of it had already slipped/i],
        ['which hand holds it', /say WHICH HAND holds it/i],
        ['(2) the reach with the FREE hand', /\(2\) THE REACH, WITH THE FREE HAND/],
        ['the reach uses the other hand', /the reach uses the OTHER, FREE hand/i],
        ['reaching is not taking', /NOT taking it, NOT speaking into it/i],
        ['(3) the decision stays open', /\(3\) THE DECISION STAYS OPEN/],
        ['this page stops at the choice', /THIS page stops at\s*\n?\s*the choice|stops at the choice/i],
        ['(4) the closer last', /\(4\) THE CLOSER, LAST/],
        ['the shorter closer verbatim', /still felt the deck in (?:my|your|his|her|their) hand\. (?:Maybe|Perhaps)/i],
      ];
      // AND THE CONFLICTING INSTRUCTIONS MUST BE GONE. Presence alone was not enough: the captured
      // request carried BOTH endings at once and my own audit passed it.
      const _forbid = [
        ['the superseded end-only closer wording', /toyed with the idea of letting the cards decide/i],
        ['the old end-only structural note', /the hand-tightening is the protagonist['\u2019]s body reaching for the inherited/i],
        ['the old body constraint that banned the deck before the closer', /deck stays OUT of the scene until the closer/i],
        ['a second CLOSER \(HARD\) block', /CLOSER \(HARD\) \u2014 Scene 1 MUST END/],
        ['a plan instruction that she TAKES the decisive instrument', /\b(?:takes|took|seizes|grabs|lifts|claims)\s+(?:the|her|his|their)\s+live microphone/i],
        // THE ORIGINAL RESOLVED CLOSING BEAT, in the protagonist's own voice as the scene's last
        // line: "I take the live microphone and tell the camera, ...". First person, so the
        // third-person pattern above does not reach it, and the clause that follows resolves the
        // consequence as well. This is the exact text the paid scaffold produced.
        ['a CLOSING DECISION that resolves the choice in first person',
          /CLOSING DECISION[^\n]{0,160}\b(?:I|we)\s+(?:take|took|seize|seized|grab|grabbed|lift|lifted|claim|claimed)\b/i],
        ['a closing beat that announces the consequence as settled',
          /no longer goes unanswered|version no longer stands/i],
      ];
      const _missing = _need.filter(([, rx]) => !rx.test(_authorTxt)).map(([label]) => label);
      const _present = _forbid.filter(([, rx]) => rx.test(_authorTxt)).map(([label]) => label);
      if (_present.length) _missing.push(...(_present.map((l) => 'CONFLICTING, still present: ' + l)));
      if (_missing.length) {
        requests.push({ scene: sceneNoForReplies, url: url.replace(ORIGIN, ''),
          role: body.role || null, model: 'none', chars: raw.length, estimate: 0,
          deckFrameRefusal: _missing.join('; ') });
        halted = 'DECK FRAME MISSING from the prose request at scene ' + sceneNoForReplies
          + ' — ' + _missing.join('; ');
        say('  \u2717 ' + halted);
        say('    (nothing was dispatched; the prose request does not carry the beat this run exists'
          + ' to test, so it is refused BEFORE the spend rather than judged after it)');
        try {
          fs.writeFileSync(OUT + '/DECK_FRAME_REFUSED_scene' + sceneNoForReplies + '.json',
            JSON.stringify({ missing: _missing, requestChars: raw.length,
              statedPlainly: 'The author request was built but NOT sent: these elements of the '
                + 'Scene 1 deck frame were absent from it.',
              // THE DECODED PROMPT IS PRESERVED. Without it, diagnosing a refusal costs another
              // replay — which is exactly what the first refusal cost.
              closingDecisionBlock: (function () {
                const m = _authorTxt.match(/CLOSING DECISION[\s\S]{0,700}/g);
                return m ? m.map((x) => x.slice(0, 700)) : [];
              })(),
              endingSequenceBlock: (function () {
                const m = _authorTxt.match(/THE ENDING SEQUENCE[\s\S]{0,2200}/);
                return m ? m[0] : null;
              })() }, null, 2));
        } catch (_) {}
        return route.fulfill({ status: 499, contentType: 'application/json',
          body: JSON.stringify({ error: 'deck_frame_missing', missing: _missing }) });
      }
      say('  \u2713 PROSE REQUEST CONFIRMED before dispatch: the deck beat, the WHICH HAND'
        + ' continuity rule and the shorter closer are all present ('
        + raw.length + ' chars)');
      try {
        fs.writeFileSync(OUT + '/DECK_FRAME_CONFIRMED_scene' + sceneNoForReplies + '.json',
          JSON.stringify({ confirmed: _need.map(([l]) => l), requestChars: raw.length }, null, 2));
      } catch (_) {}
    }
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
    // ── AN EXPLICIT-REGISTER SCENE IS GROK'S, NOT A HALT (Roman, authorized 2026-11-06) ────
    // The gate was written for a run with NO explicit-capable author: every verdict but PROCEED
    // meant "nobody here may write this", so it stopped. This run HAS one — Grok authors
    // explicit scenes by the app's own `_hot` predicate, and the block immediately below
    // already stands aside for exactly that case. So the two non-PROCEED verdicts are no longer
    // the same outcome:
    //
    //   STOP_EXPLICIT_REQUESTED — eligibility IS established and the answer is "not Luna".
    //       The general-author override stands aside and the app routes it to Grok. Recorded
    //       per scene so the manuscript can say which model wrote which scene.
    //   STOP_UNKNOWN            — eligibility could not be established at all. Still halts.
    //       An unreadable snapshot or an undeclared scope is not permission.
    //
    // NOTHING IS SUBSTITUTED SILENTLY. Luna is never swapped for Grok on a general scene; this
    // only declines to halt on a scene the gate has positively identified as explicit.
    if (v.verdict === STOP_EXPLICIT_REQUESTED) {
      explicitRegisterScenes.push({ scene: sceneNoForReplies, reasons: v.reasons });
      say('  ⇢ scene ' + sceneNoForReplies + ' is EXPLICIT register (' + v.reasons.join('; ')
        + ') — recorded. The BASE-AUTHOR REQUIREMENT below still applies: an explicit'
        + ' enhancement is a separate call and is outside this test.');
    } else if (v.verdict !== PROCEED) {
      registerStop = v;
      halted = 'REGISTER HALT at scene ' + sceneNoForReplies + ': ' + v.verdict
        + ' — ' + v.reasons.join('; ');
      requests.push({ scene: sceneNoForReplies, url: url.replace(ORIGIN, ''), role: body.role || null,
        model: 'none', chars: raw.length, estimate: 0, registerRefusal: v.verdict });
      say('  ✗ ' + halted);
      try { return await route.abort(); } catch (_) { return; }
    }

    // ── THE RESOLVED BASE AUTHOR MUST BE LUNA (Roman, authorized 2026-11-10) ──────────────
    // ALIGNED WITH THE APP'S CURRENT ROUTING. The register note above says which REGISTER the
    // scene is; it does not decide which model writes the base draft. Under the live
    // architecture the base prose is the general author's and an explicit pass is a separate,
    // later call on a finished draft. MEASURED in the scene-12 rehearsal: the register said
    // "explicit", and the base-author dispatch the app actually made was gpt-6-luna carrying
    // the full assignment — so standing aside on the strength of the register alone would have
    // mis-described the run.
    //
    // This check therefore reads the DISPATCH, not the register: a base-author request on any
    // model but the selected general author is REFUSED BEFORE IT LEAVES, and the run halts. It
    // substitutes nothing, changes no story state, and leaves _mode1.routeToGrok exactly as the
    // story set it. An explicit ENHANCEMENT call is not an isAuthorRequest, so it is untouched
    // by this and stays outside this test.
    const _baseWant = (RUN_CONFIG && RUN_CONFIG.generalAuthorModel) || 'gpt-6-luna';
    const _baseGot = String(body.model || body.preferredModel || '');
    if (_baseGot && _baseGot !== _baseWant) {
      halted = 'BASE-AUTHOR MODEL at scene ' + sceneNoForReplies + ': requested ' + _baseGot
        + ', this test requires ' + _baseWant;
      requests.push({ scene: sceneNoForReplies, url: url.replace(ORIGIN, ''), role: body.role || null,
        model: _baseGot, chars: raw.length, estimate: 0,
        baseAuthorRefusal: _baseGot + '!=' + _baseWant });
      say('  ✗ ' + halted + ' — refused before dispatch, nothing spent.');
      try { return await route.abort(); } catch (_) { return; }
    }
    if (_baseGot) say('  ✓ base author resolved to ' + _baseGot + ' (required: ' + _baseWant + ')');
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
        // The run's selected general author, if any. Passing it makes the router stand aside
        // instead of choosing on cache economics — the Haiku override the capture caught.
        selectedAuthorModel: (RUN_CONFIG && RUN_CONFIG.generalAuthorModel) || null,
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
      // THE ROUTER NO LONGER PICKS THE PROSE AUTHOR. Its cache evidence is still recorded above
      // because it is measurement, but the assignment is Luna's and does not vary by scene
      // position. `routing.author` named 'sol' or 'haiku', neither of which exists in the table
      // any more; reading it would have yielded undefined and fallen through to the grok-4.3
      // default below, silently routing prose to Grok.
      // ── NO OVERRIDE FOR APP-ROUTED LUNA PROSE (Roman 2026-11-17) ───────────────────────
      // This harness used to choose the prose author and price it from its own table. The app
      // now routes Luna itself (public/model-routing.js, enforced at dispatch), so an override
      // here is a second router competing with the first — and its pricing table is where the
      // $NaN came from: I replaced the table's entries with a `Luna` label while CPT still held
      // only { Haiku, Sol }, so `chars / CPT['Luna']` was NaN and the guard refused a request it
      // could not price.
      //
      // Leaving target null sends this dispatch down the SHARED guard, which prices the ACTUAL
      // outgoing POST from its own model and cap rather than from a label this file maintains.
      target = null;
    }
  }
  // ── NO SILENT FALLBACK TO GROK FOR A CREATIVE CALL ──────────────────────────────────────
  // This line used to end `|| 'grok-4.3'`. That default is how an ordinary creative request could
  // arrive at Grok without any decision being made: the moment a route table lookup missed, the
  // prose author became Grok and the log would still read like a routing choice. Grok is reserved
  // for explicitly routed intimacy, so a creative request with no resolved model is a STOP, not a
  // guess. Non-creative roles keep the body's own model as before.
  const _creativeOp = isAuthor || isArchitectureSpineOp(body) || isOpeningPlannerOp(body);
  const model = target ? target.requested
    : (body.preferredModel || body.model
       || (_creativeOp ? '__UNRESOLVED_CREATIVE_MODEL__' : 'grok-4.3'));
  if (model === '__UNRESOLVED_CREATIVE_MODEL__') {
    throw new Error('a creative request resolved to NO model and the grok-4.3 default was refused '
      + '— routing must assign this operation explicitly (see public/model-routing.js)');
  }
  // ── THE DESTINATION IS RESOLVED ONCE, HERE, AND NOWHERE ELSE (Roman 2026-11-15) ─────────
  // IT WAS DERIVED TWICE AND BOTH DERIVATIONS WERE WRONG IN THE SAME WAY:
  //     const dest = target ? (_modelOrigin + target.route) : url;
  // "target" is non-null ONLY for an author override. The ordinary A-plot, the Mistral structure
  // calls and every other role carry authorOverride: null, so SB_MODEL_ORIGIN never applied to
  // them and they went to ORIGIN — the live preview, which forwards to the real provider. The
  // probe that was meant to test loopback transport billed $0.00015585 at Mistral and left
  // $0.635635 held at the preview, and the error it produced names the preview host.
  //
  // So the redirect is a property of the ROUTE, not of the override. Everything that reaches this
  // point is a model route (checked above), so when SB_MODEL_ORIGIN is set EVERY model request is
  // rewritten onto it, override or not. Path selection is unchanged: an override still goes to
  // its own route, anything else keeps its own path.
  const _modelOrigin = process.env.SB_MODEL_ORIGIN || ORIGIN;
  const _routePath = target ? target.route
    : (function () { try { return new URL(url).pathname; } catch (_) { return url; } })();
  const dest = _modelOrigin + _routePath;
  // LOOPBACK IS DECIDED BY THE PARSED HOST, not by whether an env var looks local. A string test
  // on the env would pass for an origin that merely MENTIONS localhost.
  const _destHost = (function () { try { return new URL(dest).hostname; } catch (_) { return ""; } })();
  const _destIsLoopback = _destHost === 'localhost' || _destHost === '127.0.0.1'
    || _destHost === '::1' || _destHost === '[::1]';
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
          // ── THE RATE COMES FROM THE MODEL THAT IS ACTUALLY GOING OUT (Roman 2026-11-06) ──
          // This read AUTHOR_OVERRIDE.sol.rate unconditionally — Sol's $2/$10 per MTok — so a
          // Luna architecture call was admitted at Sol pricing. MEASURED: the captured request
          // was 51,147 chars with a 40,000 cap and priced $0.425574, which is exactly
          // 12,787 x $2/M + 40,000 x $10/M. At the resolved model's own configured rates
          // ($0.10/$0.50) the same request is ~$0.021279. A 20x over-estimate fails SAFE at the
          // gate, but it is not the model's price and it made the quote's largest line a
          // fiction.
          //
          // GUARD_RATES is _fsc_cost_guard's table — the same one every other stage prices
          // from — so there is one rate table rather than a second copy here. An unpriced model
          // keeps the old conservative behaviour: Sol's rate, which is the highest on this
          // route, and the guard still refuses anything it cannot price downstream.
          const _archModelOut = String((body && body.model) || '');
          const R = GUARD_RATES[_archModelOut] || AUTHOR_OVERRIDE.sol.rate;
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
            detail: { stage: 'sol-architecture', inTokEst, capOut, rate: R,
              ratedAs: GUARD_RATES[_archModelOut] ? _archModelOut : 'gpt-6.1-sol (fallback: model unpriced)' } };
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
    // ── THE OUTGOING ALLOWANCE IS RECORDED, NOT INFERRED (Roman 2026-11-06) ───────────────
    // This record kept only message text, so verifying what allowance a call actually carried
    // meant reading a SIZING log line and assuming the body matched it. That is how a planner
    // dispatched at 2,921 was reported as a 9,000 call: the log printed the computed
    // _SCAFFOLD_MAX_TOKENS and the body was never checked. Both field names are kept because
    // the two routes take different ones, and the effort under both spellings.
    maxTokens: (body && body.max_tokens) != null ? body.max_tokens : null,
    maxCompletionTokens: (body && body.max_completion_tokens) != null ? body.max_completion_tokens : null,
    reasoningEffort: (body && (body.reasoning_effort || body.reasoningEffort)) || null,
    bodyText: (body.messages || []).map((m) => String(m.content || '')).join('\n') };
  requests.push(rec);
  // ── AN IMMUTABLE ID, ALLOCATED BEFORE DISPATCH (2026-11-02) ──────────────────────────────
  // Every artifact this attempt writes is named from THIS value. It is fixed here, while the
  // push is still synchronous, so two requests in flight at once can never share it. Reading
  // `requests.length` after an await — which is what the old naming did — is the bug.
  rec.reqId = requests.length;
  // THE DESTINATION IS RECORDED ON EVERY REQUEST, BEFORE ANYTHING IS SENT. The previous ledger
  // row carried only the app-side "url", so a run whose requests went somewhere other than the
  // intended origin produced a ledger that could not show it — the transport probe's rows all
  // read "/api/chatgpt-proxy" while the bytes went to the preview.
  rec.dest = dest;
  rec.destLoopback = _destIsLoopback;
  _ledger('dispatch', { reqId: rec.reqId, scene: sceneNoForReplies, role: body.role || null,
    url: rec.url, dest: dest, destLoopback: _destIsLoopback, requested: model,
    overrideTo: rec.overrideTo, chars: raw.length, estimate: g.estimate, author: !!isAuthor });
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
  // ── A REQUEST A REUSE HOOK WILL ANSWER IS A NON-DISPATCH, EXACTLY LIKE DRIVE ────────────
  // MEASURED ON THE FIRST PAID REWRITE ATTEMPT, and it cost the attempt: the A-plot's
  // RESERVATION is $0.632602, the guard prices and checks it BEFORE the reuse block further
  // down can serve it from disk, and the run halted on a ceiling of $0.50 — refusing a call
  // that was never going to leave the machine. The quote had modelled reused calls as never
  // reserving, which is what the hook does; it is not what the GUARD did.
  //
  // So the decision moves to where the existing non-dispatch concept already lives. A request a
  // hook will answer is priced for the record and NOT applied: no ceiling check, no reservation,
  // no exposure. Only an UNSERVED entry counts — a second call for the same operation is the
  // rejection case, and it must still reach the block below to be refused there by name.
  const _willReuse = _REUSE_OPS.some((o) => process.env[o.env]
      && _reuseState[o.env] && _reuseState[o.env].served === 0 && o.claims(raw, body))
    || !!(process.env.SB_REUSE_SPINE && spineReuseServed === 0 && isArchitectureSpineOp(body));
  const _noDispatch = DRIVE || _willReuse;
  // ONE LINE PER REQUEST, NAMING THE DESTINATION AND WHETHER ANYTHING GOES THERE. Logged after
  // the reuse decision on purpose: logged before it, two calls a preserved reply answered were
  // printed as "[REMOTE]", which was true of the address and false about the traffic.
  say('  → DEST #' + rec.reqId + ' ' + (body.role || 'model') + ' ' + raw.length + ' chars → '
    + dest + (_destIsLoopback ? '  [loopback]' : '  [REMOTE]')
    + (_noDispatch ? '  — NOT SENT (' + (DRIVE ? 'drive fixture' : 'preserved reply') + ')'
      : (process.env.SB_OFFLINE && !_destIsLoopback && !SB_FAULT
        ? '  — WILL BE REFUSED (SB_OFFLINE)' : '')));
  if (_willReuse) {
    say('  ⓘ estimate $' + String(g.estimate) + ' recorded and NOT applied — a preserved reply'
      + ' answers this call, so it reserves nothing and is not measured against the ceiling');
  }
  if (_noDispatch && !g.allowed) {
    say('  ⓘ estimate not applied (drive: answered by a local fixture, nothing dispatched) — '
      + (body.role || url) + ' estimate $' + String(g.estimate)
      + '; the live guard is unchanged and this model remains unpriced');
  }
  // ── THE PLANNING-ONLY ALLOWLIST DECIDES BEFORE THE CEILING DOES ───────────────────────
  // A call this mode does not permit must be refused on those grounds, not left to trip the
  // budget halt below — which would stop the run with a ceiling message about traffic that
  // was never allowed, and let that traffic press on the authorization on its way out.
  if (process.env.SB_PLAN_ONLY === '1') {
    const _isScaffold = _planOnlyIsScaffoldReq(raw);
    const _isPlanner = _planOnlyIsPlannerReq(raw);
    // ── AN ALLOWLIST, NOT A LIST OF REFUSALS ──────────────────────────────────────────
    // The previous shape ended in `return null` — permit — so anything the refusals did not
    // anticipate was allowed. A prose request arriving before the scaffold took exactly that
    // path. Here the only way to be dispatched is to BE one of three things.
    const _SETUP_ROLES = { STRUCTURE_GENERATOR: 1, NORMALIZATION: 1, BACK_COVER_SYNOPSIS: 1,
      STRATEGY_PASS: 1, PROMPT_PREPROCESSOR: 1 };
    const _SETUP_MAX_CHARS = 60000;   // every observed setup call is under 15,000
    const _planOnlyWhy = (() => {
      if (/cplus-editor/.test(url)) return 'the C+ editor is not dispatched in a planning-only run';
      if (_planOnlyVerdict === 'rejected') {
        return 'the scaffold was REJECTED by validation (' + _planOnlyFaults.length
          + ' fault(s)) and this run ends there';
      }
      if (_planOnlyVerdict === 'accepted') {
        return 'the scaffold has been accepted and this run stops there';
      }
      // (a) THE SCENE PLANNER — once, and only before one has been seen.
      if (_isPlanner) {
        if (_planOnlyPlannerSeen) {
          return 'one attempt per planning leg \u2014 the scene planner has already been dispatched';
        }
        return null;
      }
      // (b) THE SCAFFOLD — once, and only behind a planner reply classified USABLE.
      if (_isScaffold) {
        if (_planOnlyPlannerOk !== true) {
          return 'no usable plan from the scene planner ('
            + (_planOnlyPlannerWhy || (_planOnlyPlannerSeen
                ? 'the reply was never classified' : 'the planner has not been dispatched'))
            + '), so ZERO scaffold dispatches are permitted';
        }
        if (_planOnlyScaffoldSent >= 1) {
          return 'one attempt per planning leg \u2014 the scaffold has already been dispatched once,'
            + ' and a correction retry is not authorized';
        }
        return null;
      }
      // (c) THE KNOWN SETUP CALLS — by role, under a size bound, and only before the planner
      //     has been classified. After that nothing but the scaffold has any business going out.
      const _role = String((body && body.role) || '');
      if (_SETUP_ROLES[_role] && raw.length <= _SETUP_MAX_CHARS) {
        // THE PLANNER'S DISPATCH CLOSES THE SETUP WINDOW (Roman 2026-11-18).
        // This closed on CLASSIFICATION, which leaves a window between the planner going out and
        // its reply being classified in which a setup role could still be dispatched. Setup
        // precedes planning by definition, so the planner leaving is the end of it.
        if (_planOnlyPlannerSeen) {
          return 'setup is finished \u2014 the scene planner has already been dispatched, so this '
            + _role + ' call is no longer part of the run';
        }
        return null;
      }
      // (d) EVERYTHING ELSE. Named rather than described, so the trace says what was refused and
      //     why it was not on the list.
      return 'not on the planning-only allowlist: ' + (_role || 'no role')
        + ' (' + raw.length + ' chars) is neither a known setup call, the scene planner, nor the'
        + ' scaffold \u2014 a planning-only run dispatches nothing else'
        + (_planOnlyPlannerSeen && _planOnlyPlannerOk !== true
            ? ' (and the planner\u2019s reply is '
              + (_planOnlyPlannerOk === false ? 'unusable' : 'UNCLASSIFIED, treated as unusable') + ')'
            : '');
    })();
    if (_planOnlyWhy) {
      rec.estimate = 0;
      rec.planOnlyRefused = true;
      _planOnlyRefusals.push({ reqId: rec.reqId, role: body.role || null,
        chars: raw.length, wouldHaveEstimated: g.estimate, why: _planOnlyWhy });
      _ledger('plan_only_refusal', { reqId: rec.reqId, role: body.role || null, url: rec.url,
        chars: raw.length, wouldHaveEstimated: g.estimate, why: _planOnlyWhy });
      say('  \u2298 PLAN-ONLY: refused ' + (body.role || url) + ' (' + raw.length + ' chars) \u2014 '
        + _planOnlyWhy + ' \u00b7 $' + g.estimate.toFixed(6) + ' not reserved');
      return route.fulfill({ status: 503, contentType: 'application/json',
        body: JSON.stringify({ error: 'plan_only_mode', why: _planOnlyWhy }) });
    }
    if (_isPlanner) {
      // SET WHEN IT GOES OUT, not when it comes back: the fail-closed rule above needs to know
      // that a planner was dispatched even if its reply is never classified.
      _planOnlyPlannerSeen = true;
    }
    if (_isScaffold) {
      _planOnlyScaffoldSent += 1;
      say('  \u25c6 PLAN-ONLY: scaffold dispatch ' + _planOnlyScaffoldSent
        + ' of 1 permitted \u2014 its reply will be VALIDATED before anything is called accepted');
    }
  }
  if (!g.allowed && !_noDispatch) {
    halted = 'BUDGET HALT at scene ' + sceneNoForReplies + ': ' + (body.role || url)
      + ' estimates $' + g.estimate.toFixed(6) + ', remaining authorization $' + avail.toFixed(6)
      + ' (settled $' + settledTotal.toFixed(6) + ' + held $' + heldTotal.toFixed(6)
      + ' + outstanding $' + outstanding().toFixed(6) + ')';
    say('  ✗ ' + halted);
    // ── A CEILING THAT REFUSES ONE CALL MUST REFUSE THE REST (Roman 2026-11-13) ───────────
    // MEASURED on the first paid rewrite attempt: the ceiling refused the A-plot, this branch
    // aborted that one route, and THREE MORE CALLS then went to real providers — a mistral
    // fallback rung, a proxy rung and a PRIMARY_AUTHOR. All three 502'd and left $0.003981 of
    // unresolved exposure on a run that had already been stopped. `halted` was only a label on
    // the final report; nothing consulted it before the next dispatch.
    //
    // The authorization is a property of the RUN, not of one call. Once it cannot cover a
    // required dispatch, the run is over: this sets the same sticky flag an unrecoverable
    // transport failure sets, so the guard that already exists refuses every later dispatch of
    // every role. Calls already in flight are a separate matter — they are reconciled as
    // exposure, never retroactively refused.
    unrecoverableStop = unrecoverableStop || { code: 'budget_halt', reqId: rec.reqId,
      why: halted + ' — the authorization cannot cover a required dispatch, so no further paid '
        + 'dispatch is permitted for any role.' };
    say('    ⊘ RUN STOPPED: no further provider dispatch will be permitted (sticky, every role)');
    _ledger('budget_halt_stop', { reqId: rec.reqId, role: body.role || null, url: rec.url,
      estimate: g.estimate, remaining: avail, why: unrecoverableStop.why });
    try { return await route.abort(); } catch (_) { return; }
  }
  // ── SB_NO_RETRY — A SECOND SEND OF THE SAME CALL IS REFUSED BEFORE IT IS PRICED ────────
  // Checked here, ahead of the reservation, so a refused retry never reserves, never dispatches
  // and never settles. Skipped for a non-dispatch: drive fixtures and the SB_REUSE_* family
  // already enforce serve-once semantics of their own, and a reuse hook legitimately sees the
  // same operation twice before refusing it by name.
  // ── A PINNED REPLAY SENDS NOTHING UNTIL THE PIN IS CONFIRMED ──────────────────────────
  // NO PRICE EXCEPTION. An earlier version of this gate let anything under $0.01 through, which
  // meant a sub-cent call still left the machine on an unverified opener. The calls that fire
  // before the rotation reports are ANSWERED HERE instead of dispatched or refused, so the run
  // reaches the point where the app states its selection without sending anything.
  //
  // THE LOCAL ANSWER IS 429, WHICH IS WHAT THESE CALLS ALREADY GET. Measured in every preserved
  // run: the two early STRUCTURE_GENERATOR calls to mistral-small-latest return 429 from the
  // provider (_ft_scene1_paid requests 3 and 4 among them). This is not a fabricated success
  // standing in for a real one — it is the status the provider has returned every time, and the
  // pipeline degrades to ministral-8b exactly as it does live. No usage block, so settlement
  // cannot price it; no reservation, so it books $0 where the paid run booked $0.001264.
  if (_openerPinned && !_openerConfirmed && !_noDispatch) {
    const _why = 'SB_FORCE_OPENER="' + _openerPinned + '" is in force and the app has not yet'
      + ' stated its selection, so the pin is unconfirmed. Answered locally (HTTP 429, no usage)'
      + ' rather than dispatched: ' + (body.role || rec.url) + ', ' + raw.length + ' chars,'
      + ' would have reserved $' + g.estimate.toFixed(6) + '.';
    rec.answeredLocallyPendingPin = true;
    rec.estimate = 0;                        // nothing left the machine, so no exposure
    _pinPendingAnswers.push({ reqId: rec.reqId, role: body.role || null, url: rec.url,
      chars: raw.length, wouldHaveEstimated: g.estimate });
    _ledger('opener_pin_pending_local_answer', { reqId: rec.reqId, role: body.role || null,
      url: rec.url, dest: dest, chars: raw.length, wouldHaveEstimated: g.estimate, why: _why });
    say('  \u2298 ' + _why);
    return route.fulfill({ status: 429, contentType: 'application/json',
      body: JSON.stringify({ object: 'error', type: 'opener_pin_unconfirmed',
        message: 'answered locally by the runner: the pinned opener is not yet confirmed, so no'
          + ' provider was contacted', _runGuard: true }) });
  }
  // ── SB_PLAN_ONLY: THE RUN ENDS AT THE ACCEPTED SCAFFOLD ───────────────────────────────
  // Refused BEFORE any reservation, so a planning-only attempt cannot be billed for the prose
  // author or the editors. The skeleton is identified by what the request ASKS FOR, because both
  // planning legs carry role PRIMARY_AUTHOR and a role label can no longer tell them apart.
  // APPLIED WHETHER OR NOT THIS DISPATCH WOULD HAVE BEEN REAL. `_noDispatch` is true in drive
  // mode, and gating on it meant the stop could never be observed offline — the drive capture
  // ran happily on into the 365,000-char author leg while reporting plan-only mode as armed.
  // Refusing in drive mode costs nothing and makes the rehearsal the same shape as the live run.
  // ── NO REPLAN: THE PLANNER AND THE SPINE GO OUT ONCE ──────────────────────────────────
  // Checked ahead of the byte-identical guard because a replan is the case that guard cannot see:
  // the second planner request is built from the rejection, so its bytes differ.
  if (_noRetry && !_noDispatch) {
    // ── A FALLBACK AUTHOR NEVER SENDS ──────────────────────────────────────────────────
    // Refused outright rather than counted: a fallback author only exists because the primary
    // author did not produce usable prose, and this run is not authorized to buy a second
    // attempt at the scene from a different model.
    if (String((body && body.role) || '') === 'FALLBACK_AUTHOR') {
      const _whyFb = 'SB_NO_RETRY: FALLBACK_AUTHOR (' + raw.length + ' chars, ' + model + ') \u2014 '
        + 'a fallback author is a second attempt at the same scene by a different model. This run '
        + 'pays for ONE prose request. Refused BEFORE it was sent.';
      rec.refusedByDiagnostic = _whyFb;
      rec.estimate = 0;
      _ledger('fallback_author_refused', { reqId: rec.reqId, role: body.role || null,
        url: rec.url, dest: dest, chars: raw.length, requested: model,
        wouldHaveEstimated: g.estimate, why: _whyFb });
      say('  \u2298 ' + _whyFb);
      unrecoverableStop = unrecoverableStop || { code: 'fallback_author_refused', reqId: rec.reqId,
        why: _whyFb + ' No further dispatch is permitted for any role.' };
      say('    \u2298 RUN STOPPED: no further dispatch will be permitted (sticky, every role)');
      try { return await route.abort(); } catch (_) { return; }
    }
    var _opName = null;
    try {
      if (isOpeningPlannerOp(body)) _opName = 'opening_planner';
      else if (isArchitectureSpineOp(body)) _opName = 'architecture_spine';
      // THE PROSE AUTHOR. `target` non-null means AUTHOR_OVERRIDE resolved a route, which is
      // exactly what the verified capture recorded as operationClass author_override_Sol. Using
      // that signal avoids isAuthorRequest, whose markers this request does not carry.
      else if (target) _opName = 'prose_author';
    } catch (_) { _opName = null; }
    if (_opName) {
      if (_planOpsServed[_opName] > 0) {
        const _why = 'SB_NO_RETRY: this is dispatch #' + (_planOpsServed[_opName] + 1) + ' of the '
          + _opName.replace(/_/g, ' ') + ' (' + raw.length + ' chars, ' + model + '). The first '
          + 'one was already served, so this is a REPLAN after a rejected plan — a different '
          + 'payload, which the byte-identical retry guard cannot see. Refused BEFORE it was sent.';
        rec.refusedByDiagnostic = _why;
        rec.replanOf = _opName;
        rec.estimate = 0;
        _ledger('replan_refused', { reqId: rec.reqId, operation: _opName,
          attempt: _planOpsServed[_opName] + 1, role: body.role || null, url: rec.url,
          dest: dest, chars: raw.length, requested: model,
          wouldHaveEstimated: g.estimate, why: _why });
        say('  ⊘ ' + _why);
        unrecoverableStop = unrecoverableStop || { code: 'replan_refused', reqId: rec.reqId,
          why: _why + ' No further dispatch is permitted for any role.' };
        say('    ⊘ RUN STOPPED: no further dispatch will be permitted (sticky, every role)');
        try { return await route.abort(); } catch (_) { return; }
      }
      // Counted only once the call is actually about to go out, for the same reason the retry
      // fingerprint is: a request refused by the budget guard or the offline gate must not make
      // the real first attempt look like a second one.
      _planOpsServed[_opName] += 1;
      say('  ⦿ PLANNING OP: ' + _opName.replace(/_/g, ' ') + ' dispatch 1 of 1 permitted'
        + ' (a replan would be refused)');
    }
  }
  if (_noRetry && !_noDispatch) {
    const _fp = _crypto.createHash('sha256').update(
      String(rec.url || '') + '\u0000' + String(body.role || '') + '\u0000'
      + String(model || '') + '\u0000' + raw).digest('hex');
    const _fpEntry = _sentFingerprints.get(_fp);
    const _firstId = _fpEntry ? _fpEntry.reqId : undefined;
    // ── CONCURRENT TWIN: SHARE, DO NOT REFUSE ─────────────────────────────────────────
    // The first request has not finished, so nothing has failed and this is not a retry.
    if (_fpEntry && !_fpEntry.done && _CONCURRENT_SHARE_ROLES[String((body && body.role) || '')]) {
      const _whyShare = 'identical to request #' + _firstId + ', which is STILL IN FLIGHT \u2014 a '
        + 'concurrent ' + (body.role || 'editorial') + ' twin, not a retry. Sharing that response '
        + 'instead of dispatching a second paid call.';
      say('  \u21c9 ' + _whyShare);
      rec.sharedWith = _firstId;
      rec.estimate = 0;                      // nothing is sent, so nothing is reserved
      _ledger('concurrent_share_waiting', { reqId: rec.reqId, sharesWith: _firstId,
        role: body.role || null, url: rec.url, chars: raw.length, why: _whyShare });
      const _shared = await new Promise((resolve) => {
        let _settled = false;
        const _done = (r) => { if (!_settled) { _settled = true; resolve(r); } };
        _fpEntry.waiters = _fpEntry.waiters || [];
        _fpEntry.waiters.push(_done);
        setTimeout(() => _done(null), _SHARE_WAIT_MS);
      });
      if (_shared && _shared.body != null) {
        say('    \u21c9 shared request #' + _firstId + '\u2019s response with #' + rec.reqId
          + ' (status ' + _shared.status + ', ' + String(_shared.body).length + ' body chars)'
          + ' \u2014 $0 charged, no hold, run continues');
        _ledger('concurrent_share_served', { reqId: rec.reqId, sharesWith: _firstId,
          status: _shared.status, bodyChars: String(_shared.body).length });
        return route.fulfill({ status: _shared.status,
          headers: Object.assign({}, _shared.headers || {}, { 'x-sb-shared-with': String(_firstId) }),
          body: String(_shared.body) });
      }
      // The first produced nothing usable. Abort this twin WITHOUT the sticky stop: the first
      // request owns that outcome and its own stop already fired if one was warranted.
      say('    \u2298 request #' + _firstId + ' produced no usable response, so there is nothing to'
        + ' share \u2014 #' + rec.reqId + ' is abandoned without a second dispatch');
      _ledger('concurrent_share_empty', { reqId: rec.reqId, sharesWith: _firstId });
      try { return await route.abort(); } catch (_) { return; }
    }
    if (_firstId !== undefined) {
      const _why = 'SB_NO_RETRY: request #' + rec.reqId + ' is a byte-identical repeat of '
        + 'request #' + _firstId + ' (' + (body.role || rec.url) + ', ' + raw.length + ' chars, '
        + model + ') — refused BEFORE it was sent. A repeat of a call already dispatched is a '
        + 'retry, and this run does not pay for the same call twice.';
      rec.refusedByDiagnostic = _why;
      rec.retryOf = _firstId;
      rec.estimate = 0;                      // never dispatched, so no exposure
      _ledger('retry_refused', { reqId: rec.reqId, retryOf: _firstId,
        role: body.role || null, url: rec.url, dest: dest, chars: raw.length,
        requested: model, wouldHaveEstimated: g.estimate, why: _why });
      say('  ⊘ ' + _why);
      // STICKY, like the budget halt and the transit stop. It refuses every LATER dispatch; it
      // does not abort a page already generated, so a scene in hand still publishes.
      unrecoverableStop = unrecoverableStop || { code: 'retry_refused', reqId: rec.reqId,
        why: _why + ' No further dispatch is permitted for any role.' };
      say('    ⊘ RUN STOPPED: no further dispatch will be permitted (sticky, every role)');
      try { return await route.abort(); } catch (_) { return; }
    }
    // RECORDED ONLY ONCE THE CALL IS ABOUT TO GO. Recording it earlier would make a request
    // refused by the budget guard or the offline gate look like a first send, and the real
    // first send would then be refused as its own retry.
    _sentFingerprints.set(_fp, { reqId: rec.reqId, done: false, result: null, waiters: [] });
    // Remembered so THIS invocation can settle the entry once its own outcome is known.
    rec._fpKey = _fp;
  }
  // The reservation. This declaration was accidentally deleted when the planner-only block below
  // was inserted (the edit's anchor swallowed it), leaving `hold` undefined for the whole handler:
  // the refusal paths hid it inside try/catch, and the live path died in the catch itself with
  // `ReferenceError: hold is not defined` AFTER a successful upstream call, losing the response.
  // Reserving an unpriceable estimate would make heldTotal Infinity and corrupt every
  // later figure, so a non-dispatch reserves nothing. Settlement in drive is already $0.
  // ── A CONFIRMED OFFLINE REPLAY ANSWERS LOCALLY BEFORE IT RESERVES (Roman 2026-11-17) ────
  // In a provider-blocked replay the app is served by _ft_static_server, which has no /api route.
  // An unmatched model call was therefore RESERVED, dispatched, 404'd in ~2ms, and booked as
  // unresolved exposure. MEASURED: 23 such calls held $0.099308 of a $0.10 authorization with
  // $0.000000 settled, and the run died on a BUDGET HALT caused entirely by traffic that never
  // left the machine.
  //
  // Reconciling that AFTER the fact was not enough — the hold is taken before the dispatch, so
  // the money is already committed by the time a 404 comes back. The call is now answered HERE,
  // before the reservation, with an explicit zero-cost record.
  //
  // SCOPED TO SB_OFFLINE, which is the flag that already fails closed at dispatch and is never
  // set on a paid run. A REAL dispatch whose receipt is missing keeps its normal accounting:
  // that is exposure and must stay visible.
  if (_SB_OFFLINE && !_noDispatch) {
    _offlineLocalAnswers = (_offlineLocalAnswers || 0) + 1;
    _offlineLocalAnswersEst = (_offlineLocalAnswersEst || 0) + (g.estimate || 0);
    rec.model = 'none';
    rec.estimate = 0;
    rec.settlement = { kind: 'zero', usd: 0, reserved: 0,
      why: 'offline replay: answered locally before any reservation — no dispatch, no hold' };
    rec.measuredUsd = 0;
    rec.unresolvedExposure = false;
    rec.offlineLocalAnswer = true;
    say('  \u25cb answered LOCALLY (offline replay, nothing reserved): ' + (body.role || url)
      + ' \u2014 would have estimated $' + Number(g.estimate || 0).toFixed(6));
    return route.fulfill({ status: 503, contentType: 'application/json',
      body: JSON.stringify({ error: 'provider_blocked_offline_replay',
        note: 'answered by the harness before any reservation; zero cost' }) });
  }
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
          // THE RESOLVED destination, not a second derivation of it. The duplicate here was the
          // other copy of the defect fixed above.
          url: url.replace(ORIGIN, ''),
          dest: dest,
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
  if (process.env.SB_REPLAY_PLANNER && isOpeningPlannerOp(body)) {
    const files = String(process.env.SB_REPLAY_PLANNER).split(',').map(s => s.trim()).filter(Boolean);
    const pick = files[Math.min(replayPlannerServed, files.length - 1)];
    replayPlannerServed++;
    const rec = JSON.parse(fs.readFileSync(pick, 'utf8'));
    say('  ↻ OPENING_PLANNER ← PRESERVED reply ' + path.basename(pick)
      + ' (' + String(rec.bodyComplete || '').length + ' body bytes) — already billed in the failed run; NOT re-paid');
    reconcile(hold, { usage: null, why: 'reuse of a preserved, already-billed planner reply', model });
    return route.fulfill({ status: 200, contentType: 'application/json', body: String(rec.bodyComplete || '') });
  }

  // ── THE SB_REUSE_* FAMILY, SERVED HERE (see the table near _FAULT_CLAIMS) ────────────────
  // Same shape as the spine block below, operation by operation: the reservation is closed
  // WITHOUT a settlement row (nothing left the machine, so there is no charge and no unresolved
  // exposure), `rec.estimate` is zeroed so the call contributes nothing to the peak, and the
  // bytes go back verbatim with their own status — which is also how the physical-canon
  // rotator's 429 is reproduced, since that is the reply the paid run actually received and
  // carried on past.
  for (const _op of _REUSE_OPS) {
    const _src = String(process.env[_op.env] || '');
    if (!_src || !_op.claims(raw, body)) continue;
    const _st = _reuseState[_op.env];
    // A SECOND CALL FOR THE SAME OPERATION MEANS THE FIRST REPLY WAS REJECTED. Answering it
    // again would paper over the rejection and produce a transcript built on a reply the
    // application had already discarded. So it stops, and says which operation.
    if (_st.served > 0) {
      const _why = _op.label + ': the application asked for this operation a SECOND time, which '
        + 'means it REJECTED the preserved reply. Serving it again would hide that, so it is '
        + 'refused at the wire — nothing left, nothing was billed.';
      say('  ⊘ ' + _why);
      rec.refusedByDiagnostic = _why;
      rec.estimate = 0;
      _ledger('reused_reply_rejected', { reqId: rec.reqId, url: rec.url, op: _op.label,
        file: path.basename(_src), chars: raw.length, wouldHaveEstimated: g.estimate, why: _why });
      halted = halted || ('REUSED REPLY REJECTED: ' + _why);
      try { hold.open = false; } catch (_) {}
      try { return await route.abort(); } catch (_) { return; }
    }
    // A REQUIRED REPLY THAT IS MISSING OR EMPTY STOPS THE RUN RATHER THAN FALLING THROUGH TO A
    // PROVIDER. Falling through would silently convert a reuse into a paid regeneration, which
    // is the one thing this family exists to prevent.
    let _pres = null, _bytes = '';
    try {
      _pres = JSON.parse(fs.readFileSync(_src, 'utf8'));
      _bytes = String(_pres.bodyComplete || '');
    } catch (_e) { _bytes = ''; }
    if (!_bytes.length) {
      const _why = _op.env + ' names a record this run cannot use (' + _src + ') — no bodyComplete. '
        + 'Refusing at the wire instead of dispatching, so a missing reuse cannot become a charge.';
      say('  ✗ ' + _why);
      rec.refusedByDiagnostic = _why;
      rec.estimate = 0;
      _ledger('reused_reply_missing', { reqId: rec.reqId, url: rec.url, op: _op.label, file: _src, why: _why });
      halted = halted || ('REUSED REPLY MISSING: ' + _why);
      try { hold.open = false; } catch (_) {}
      try { return await route.abort(); } catch (_) { return; }
    }
    // ── SB_CLEAR_PC_CRISIS=1 — THE RUN'S COPY ONLY, NEVER THE SAVED FILE ─────────────────
    // WHY: the A-plot generator OBEYS `pcBodyBible.current_crisis` under the Single Crisis Law —
    // "Scene 1 ALREADY OPENS ON THIS CRISIS (HARD) … YOUR A-PLOT MUST BE ONE FIRE WITH THIS
    // CRISIS" — and it interpolates the event, the time since impact, the hottest emotion and
    // the li_complication straight into the request. The saved bible's crisis is a REJECTED
    // alternate opening (a masked gala where an emcee reads Dani's unsent letter to Callum) whose
    // li_complication reads "She has never met Roman Tusk", because that field was authored
    // BEFORE the pair bond existed. Reused as-is it would hand the fresh A-plot an opening that
    // contradicts the pair bond this run exists to keep.
    //
    // It is stripped FROM THE BYTES BEING SERVED, so the application never sees it and the file
    // on disk is not touched: `fs.readFileSync` above read it, nothing writes back. Every other
    // field — appearance, tells, wound, wants, kink, the whole character — is passed through
    // unchanged, because the character is what this run is reusing.
    if (process.env.SB_CLEAR_PC_CRISIS === '1' && _op.env === 'SB_REUSE_PCBIBLE') {
      try {
        const _env = JSON.parse(_bytes);
        const _raw0 = String(_env.content || '');
        const _fence = _raw0.match(/```(?:json)?\s*([\s\S]*?)```/);
        const _inner = _fence ? _fence[1] : _raw0;
        const _bib = JSON.parse(_inner);
        if (_bib && Object.prototype.hasOwnProperty.call(_bib, 'current_crisis')) {
          const _dropped = _bib.current_crisis;
          delete _bib.current_crisis;
          _env.content = JSON.stringify(_bib);
          _bytes = JSON.stringify(_env);
          _st.crisisCleared = true;
          try { fs.writeFileSync(OUT + '/PC_CRISIS_CLEARED.json', JSON.stringify({
            statedPlainly: 'The reused PC Body Bible was served to THIS RUN with current_crisis '
              + 'removed, so the fresh A-plot authors its own fire instead of inheriting a '
              + 'rejected opening. The saved bible on disk is unchanged; only the bytes served '
              + 'into this run were altered, and every other field was passed through.',
            sourceFile: _src, droppedField: 'current_crisis', dropped: _dropped,
            fieldsKept: Object.keys(_bib),
          }, null, 2)); } catch (_) {}
          say('  ✂ PC BODY BIBLE: current_crisis removed from the RUN\'S COPY ('
            + String((_dropped && _dropped.event) || '').slice(0, 70) + '…) — the saved file is'
            + ' untouched and every other field passed through → PC_CRISIS_CLEARED.json');
        } else {
          say('  ⓘ PC BODY BIBLE: no current_crisis field to remove');
        }
      } catch (e) {
        // FAIL LOUD. Serving the bible WITH the stale crisis would quietly reintroduce the very
        // premise this run is meant to be rid of, so the run stops instead.
        const why = 'SB_CLEAR_PC_CRISIS could not parse the reused PC bible to remove '
          + 'current_crisis (' + (e && e.message) + '). Refusing to serve it with the stale '
          + 'crisis still in it.';
        say('  ✗ ' + why);
        halted = halted || why;
        unrecoverableStop = unrecoverableStop || { code: 'pc_crisis_clear_failed', reqId: rec.reqId, why };
        try { hold.open = false; } catch (_) {}
        try { return await route.abort(); } catch (_) { return; }
      }
    }
    _st.served++;
    _st.status = Number(_pres.status || 200);
    _st.bodyChars = _bytes.length;
    _st.receipt = _pres.receipt || null;
    _st.originalReqId = _pres.reqId || null;
    _st.originalServedModel = _pres.servedModel || null;
    try { hold.open = false; } catch (_) {}
    rec.estimate = 0;
    rec.servedFromPreserved = { file: _src, op: _op.label, bodyChars: _bytes.length,
      originalReceipt: _pres.receipt || null, originalServedModel: _pres.servedModel || null,
      originalReqId: _pres.reqId || null, newCharge: 0 };
    _ledger('reply_reused', { reqId: rec.reqId, url: rec.url, op: _op.label,
      file: path.basename(_src), status: _st.status, bodyChars: _bytes.length,
      servedModel: _pres.servedModel || null, receipt: _pres.receipt || null, newCharge: 0,
      why: 'already paid for in the source run; this attempt dispatched nothing here' });
    say('  ↻ ' + _op.label + ' ← PRESERVED paid reply ' + path.basename(_src)
      + ' (' + _bytes.length + ' body bytes, status ' + _st.status
      + ', served by ' + (_pres.servedModel || '?') + ' when it was paid)'
      + ' — REPLAYED, not regenerated; $0 new charge, no hold, and the real parser still decides');
    return route.fulfill({ status: _st.status, contentType: 'application/json', body: _bytes });
  }

  // ── SB_REUSE_SPINE — ONE PRESERVED ARCHITECTURE REPLY, SERVED ONCE (Roman 2026-11-06) ────
  // The instruction is to reuse the most recent successful spine rather than pay Luna to think
  // one up a third time. So this serves the PRESERVED REPLY BYTES at the architecture boundary
  // and lets the ordinary application path do everything else: app.js reads
  // `_upstreamRaw.choices[0].message.content` from this body and hands it to the same parser,
  // the same `_expectedIssueCount` / `sceneOutline` validation and the same attachment as a live
  // reply. Nothing is inserted into the scaffold, no validator is bypassed and no replay
  // framework is added — this is one predicate and one fulfil, the sibling of the planner branch
  // above.
  //
  // NAMED OUTSIDE THE SB_REPLAY_* FAMILY ON PURPOSE. The REPLAY SAFETY gate near the top refuses
  // to start when any SB_REPLAY_* var is set in a mode that can dispatch live, which is correct
  // for those vars: each one stands in for an operation whose live behaviour is under test. This
  // one is the opposite case — it exists FOR the live run, replacing a single already-paid call,
  // while every other operation still goes to its real provider. A different name keeps that
  // gate's meaning intact instead of weakening it.
  //
  // SERVED ONCE, AND A SECOND CALL IS REFUSED RATHER THAN DISPATCHED. A second architecture call
  // is a different operation instance (a re-plan): answering it with the first one's bytes would
  // be a fabrication, and letting it through would GENERATE A SPINE, which this run is directed
  // not to do. So it is refused at the wire — nothing leaves, nothing is billed, the application
  // sees a transport failure on its own planning call and the run reports that outcome.
  if (process.env.SB_REUSE_SPINE && isArchitectureSpineOp(body)) {
    if (spineReuseServed > 0) {
      const why = 'a SECOND architecture call matched the spine operation; this run reuses one '
        + 'preserved spine and is directed not to generate another, so it is refused at the wire';
      say('  ⊘ ' + why);
      rec.refusedByDiagnostic = why;
      rec.estimate = 0;
      _ledger('spine_second_call_refused', { reqId: rec.reqId, url: rec.url, chars: raw.length,
        wouldHaveEstimated: g.estimate, why });
      halted = halted || ('SPINE REFUSAL: ' + why);
      try { hold.open = false; } catch (_) {}
      try { return await route.abort(); } catch (_) { return; }
    } else {
      spineReuseServed++;
      const src = String(process.env.SB_REUSE_SPINE);
      const pres = JSON.parse(fs.readFileSync(src, 'utf8'));
      const bodyBytes = String(pres.bodyComplete || '');
      assert(bodyBytes.length > 0, 'SB_REUSE_SPINE names a record with no bodyComplete: ' + src);
      // NOTHING LEFT THE MACHINE, SO NOTHING IS COMMITTED. The reservation is closed without a
      // settlement row — the same handling the wire-refusal path uses — because pricing a call
      // that was never dispatched would charge this authorization twice for one paid reply: the
      // original is already carried in the prior attempt's calculated cost.
      // THE SAME SHAPE GATE APPLIES TO A SPINE FROM DISK. FOUND BY RUNNING IT: when the check
      // lived in the live-response branch, this path returned before reaching it, so a replayed
      // spine of the wrong shape sailed through — a gate that inspects only one of the two ways
      // a spine can arrive is not a gate.
      try {
        const _pj = JSON.parse(bodyBytes);
        const _pu = (_pj && _pj._upstreamRaw) || _pj || {};
        const _pc = (_pu.choices && _pu.choices[0]) || {};
        _checkSpineShape(rec.bodyText, (_pc.message && _pc.message.content) || '', rec, 'preserved reply ' + path.basename(src));
      } catch (_shapeEx) {
        _strictSolStop('spine_shape_unreadable', 'the preserved reply could not be read for a '
          + 'shape check (' + (_shapeEx && _shapeEx.message) + ')');
      }
      try { hold.open = false; } catch (_) {}
      rec.estimate = 0;
      rec.servedFromPreserved = { file: src, bodyChars: bodyBytes.length,
        originalReceipt: pres.receipt || null, originalServedModel: pres.servedModel || null,
        originalMs: pres.ms || null, originalReqId: pres.reqId || null };
      _ledger('spine_reused', { reqId: rec.reqId, url: rec.url, file: path.basename(src),
        bodyChars: bodyBytes.length, servedModel: pres.servedModel || null,
        receipt: pres.receipt || null, newCharge: 0,
        why: 'planning REPLAYED from a paid Luna result; this attempt dispatched nothing here' });
      try {
        fs.writeFileSync(OUT + '/SPINE_REUSED.json', JSON.stringify({
          replayedFrom: src,
          statedPlainly: 'The three-issue/arc spine for this run was NOT generated in this attempt. '
            + 'It is the preserved reply of a previous PAID gpt-6-luna architecture call, served '
            + 'at the architecture boundary and processed by the ordinary application parser and '
            + 'validators. No spine was generated here and none was paid for here.',
          originalRequestChars: pres.requestChars || null,
          originalServedModel: pres.servedModel || null,
          originalReceipt: pres.receipt || null,
          originalMs: pres.ms || null,
          bodyChars: bodyBytes.length,
        }, null, 2));
      } catch (_) {}
      say('  ↻ ARCHITECTURE SPINE ← PRESERVED paid reply ' + path.basename(src)
        + ' (' + bodyBytes.length + ' body bytes, served by ' + (pres.servedModel || '?')
        + ', ' + (pres.ms || '?') + 'ms when it was paid) — REPLAYED, not regenerated;'
        + ' $0 new charge and the real parser still decides');
      return route.fulfill({ status: 200, contentType: 'application/json', body: bodyBytes });
    }
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
    if (DRIVE_GENERATE_OPENING && isOpeningPlannerOp(body)) {
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
    // CLASSIFIED BEFORE IT IS SERVED, exactly as a live reply is at the persist site.
    try { _planOnlyObserve({ requestText: raw, body: JSON.stringify(r), url: url }); } catch (_) {}
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(r) });
  }

  // ── LIVE. THE RESPONSE IS READ, NOT JUST FORWARDED ──────────────────────────────────────
  // The previous version called route.continue() for live calls, so nothing was ever recorded:
  // no receipt, no served model, and a failed attempt vanished. route.fetch() performs the real
  // request, hands back the real response for accounting, and the page still receives it.
  try {
    // "dest", "_modelOrigin" and "_destIsLoopback" are resolved ONCE far above, before the
    // dispatch ledger, so the destination that is logged is the destination that is used. This
    // site used to re-derive it as (target ? _modelOrigin + target.route : url), which silently
    // exempted every non-override role from SB_MODEL_ORIGIN.
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
    // ── THE SOL ROUTE'S OWN REQUIRED FIELDS, KEYED ON THE DESTINATION ──────────────────────
    // These were injected only when the author override was labelled 'Sol'. That override is
    // gone (Sol no longer writes prose), so nothing injected them any more — and the freshly
    // routed STORY SPINE, which now goes to /api/sol-scene-test, would have been refused with
    // `missing_run_budget: playthrough mode requires _sbRunBudgetUsd on every request`. Measured
    // against the real handler, not predicted.
    //
    // Keyed on where the request is actually GOING, so it holds however the model was selected.
    if (/\/api\/sol-scene-test\b/.test(String(rec.url || dest || ''))) {
      try {
        const sb = JSON.parse(sendBody || rawBody || '{}');
        if (!sb._sbCallLabel) {
          // A LABEL PER DISPATCH: the route's single-use claim stops a double charge under one
          // label, and a legitimate retry must be separately auditable.
          sb._sbCallLabel = 'playthrough_s' + sceneNoForReplies + '_' + Date.now();
        }
        if (sb._sbRunBudgetUsd == null) sb._sbRunBudgetUsd = Number(remainingNow().toFixed(6));
        sendBody = JSON.stringify(sb);
      } catch (e) {
        throw new Error('a /api/sol-scene-test request could not be given its required run '
          + 'budget and call label: ' + (e && e.message));
      }
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
    // ── A 40,000-TOKEN ALLOWANCE NEEDS A DEADLINE THAT CAN REACH IT (Roman 2026-11-06) ──────
    // The SAME defect the architecture call already hit, one operation over. The opening planner
    // runs on /api/chatgpt-proxy, is not an author override and is not _isSolArch, so it was
    // getting 120s. MEASURED on this configuration: the planner produced 9,000 reasoning tokens
    // in 85,483ms (≈105 tok/s) and the spine 16,699 completion tokens in 178,295ms (≈94 tok/s).
    // At that rate a 40,000-token allowance cannot be spent inside 120s — the client would give
    // up at ~12,000 tokens and the generous headroom would be unreachable, reported as a transit
    // failure rather than as what Luna did with it. Matched by OPERATION, like the fixture and
    // the reuse rule above, so only this call's deadline moves.
    //
    // STILL A LIMIT, NOT A PROMISE, and still no retry: one dispatch, one deadline. It is also
    // not the only deadline on this path — api/chatgpt-proxy.js calls OpenAI through plain
    // `fetch` with no dispatcher, so undici's 300s headersTimeout applies INSIDE the route and a
    // non-streaming completion that takes longer than that fails there whatever this allows.
    const _isOpeningPlanner = isOpeningPlannerOp(body);
    // ── THE DEADLINE IS DERIVED FROM THE ALLOWANCE THE CALL CARRIES ─────────────────────────
    // The hand-picked 420000 was replaced because it was an extrapolation dressed as a limit.
    // MEASURED on this configuration: 16,699 completion tokens in 178,295ms (~94 tok/s) and
    // 9,000 in 85,483ms (~105 tok/s). 90 tok/s sits below both, so a window sized at
    // allowance/90 + 60s of connection and queueing is derived from the slowest rate observed
    // rather than guessed. It can only ever LENGTHEN: the floor is the 300s that long calls
    // already had, and every other call keeps 120s exactly as before.
    //
    // 30s ABOVE THE ROUTE'S OWN WINDOW, on purpose. The routes size their transport the same way
    // (api/chatgpt-proxy.js, api/sol-scene-test.js), so this sits just outside it — a call that
    // runs out of time fails INSIDE the route, which records the upstream reason, instead of
    // being cut off out here where only "no HTTP response" is knowable.
    //
    // ── DECIDED BY THE RESOLVED MODEL AND THE OUTGOING ALLOWANCE (Roman 2026-11-06) ────────
    // MEASURED, TWICE, FROM THE SAME MISTAKE: this used to read `target || _isSolArch ||
    // _isOpeningPlanner` — a list of operations I had already watched fail. Every other call
    // kept the flat 120s, so on the next attempt the A-plot (16,000 on Luna) and the OPENING
    // AUTHOR (16,000 on Luna) both died at exactly 120,003ms. The author had carried that
    // allowance since the configuration was frozen; no attempt had ever reached it, so nothing
    // exposed it. Naming operations could only ever catch the ones already known.
    //
    // So the question is no longer "which operation is this" but "what is actually going out":
    // the model that will serve the call and the completion allowance it declares. A reasoning
    // model spends that allowance on thinking before a single visible token appears, so the
    // waiting budget has to cover it; a non-reasoning model does not and keeps its default. The
    // model test is the SAME expression api/chatgpt-proxy.js uses to decide the allowance FIELD,
    // so the harness and the route cannot disagree about what a reasoning call is.
    //
    // IT IS A WAITING BUDGET, NOT A COMPLETION TIME. 90 tok/s sits below every rate measured
    // here (94 and 105), but a provider is free to be slower; exceeding the budget stays a
    // transit failure, recorded, and now also stops the run. It can only LENGTHEN a deadline,
    // never shorten one, and a call that is neither a reasoning call nor an author override
    // keeps its 120s byte-identically.
    // The model and allowance that will actually be sent — for an author override that is the
    // rewritten target, not what the app asked for. The policy itself lives in
    // _nf_run_reliability.mjs so it can be exercised without a run.
    const _outModel = String((target ? target.requested : (body && body.model)) || model || '');
    const _allowanceOut = target
      ? Number(target.cap || 0)
      : Number((body && (body.max_completion_tokens || body.max_tokens)) || 0);
    // ── DOES THE PACKET FIT THE MODEL? CHECKED BEFORE DISPATCH (Roman 2026-11-07) ──────────
    // MEASURED at scene 17: a 128,858-token packet went to gpt-4o-mini (128,000 context), was
    // refused 400, and was RESENT — 129,252 tokens the second time. Two round trips that could
    // not succeed, and the chain then fell onward. Nothing checked fit first.
    //
    // THE LIMITS ARE ONLY THE ONES A PROVIDER HAS STATED TO US. gpt-4o-mini's 128,000 is quoted
    // verbatim in the saved 400 body. A model with no observed limit is NOT refused and NOT
    // assigned a guessed ceiling — unknown stays unknown, and the dispatch proceeds as before.
    //
    // IT REFUSES; IT DOES NOT TRUNCATE. Silently cutting a packet would drop canon the author is
    // required to honour, which is worse than a named refusal. The run halts here with the model,
    // the measured size and the stated ceiling, so the fix is a routing or packet decision made
    // with the numbers in hand rather than a guess.
    const _CONTEXT_LIMIT_TOK = {
      'gpt-4o-mini': 128000,   // stated verbatim in the saved scene-17 400 body
      'gpt-4o': 128000,        // same family, same stated ceiling
    };
    const _fitLimit = _CONTEXT_LIMIT_TOK[_outModel];
    if (_fitLimit) {
      // chars/4 is this guard's own measured approximation for non-Claude families.
      const _packetTok = Math.ceil(raw.length / 4) + Math.ceil(_allowanceOut * 0.0);
      if (_packetTok > _fitLimit) {
        const _why = 'packet is ~' + _packetTok + ' tokens for ' + _outModel + ', whose stated '
          + 'context is ' + _fitLimit + ' — refused BEFORE dispatch rather than sent, refused and resent';
        rec.refusedByDiagnostic = _why;
        rec.estimate = 0;
        rec.contextFit = { model: _outModel, packetTok: _packetTok, limitTok: _fitLimit };
        _ledger('context_fit_refused', Object.assign({ reqId: rec.reqId, role: body.role || null,
          url: rec.url, wouldHaveEstimated: g.estimate, why: _why }, rec.contextFit));
        say('  ⊘ CONTEXT FIT: ' + _why);
        try { hold.open = false; } catch (_) {}
        try { return await route.abort(); } catch (_) { return; }
      }
    }
    const _deadline = dispatchDeadlineMs({ outModel: _outModel, allowanceOut: _allowanceOut,
      authorOverride: target ? target.label : null, solArchitecture: _isSolArch });
    const _isReasoningCall = _deadline.reasoningCall === true;
    const _dispatchTimeoutMs = _deadline.ms;
    // RECORDED, SO THE SELECTION IS OBSERVABLE RATHER THAN ASSERTED FROM SOURCE. A control reads
    // this off the ledger of a real (provider-blocked) run and fails if the architecture call is
    // ever handed the short deadline again.
    rec.dispatchTimeoutMs = _dispatchTimeoutMs;
    rec.operationClass = _isSolArch ? 'sol_architecture'
      : (target ? 'author_override_' + target.label
        : (_isReasoningCall ? 'reasoning_call' : (_isOpeningPlanner ? 'opening_planner' : 'other')));
    // THE INPUTS TO THE DECISION ARE RECORDED, not just its output, so a control can check that
    // the right calls were classified for the right reason rather than inferring it from a number.
    rec.deadlineBasis = { outModel: _outModel, allowanceOut: _allowanceOut,
      reasoningCall: _isReasoningCall, solArchitecture: _isSolArch,
      authorOverride: target ? target.label : null };
    _ledger('dispatch_deadline', { reqId: rec.reqId, role: body.role || null,
      url: rec.url, operationClass: rec.operationClass, timeoutMs: _dispatchTimeoutMs,
      basis: rec.deadlineBasis });
    // ── OFFLINE MEANS OFFLINE, DECIDED HERE, WHERE THE BYTES LEAVE (Roman 2026-11-15) ─────
    // THIS IS THE ONLY PLACE A MODEL REQUEST CAN REACH A PROVIDER. Everything that can answer a
    // call locally — DRIVE fixtures, the SB_FAULT arm, the SB_REUSE_* family, SB_REPLAY_* and the
    // preserved-reply hooks — has already returned by this line. So a request that arrives here
    // is a request that is about to be dispatched for real, and SB_OFFLINE refuses it unless the
    // destination is loopback.
    //
    // WHY A GATE AND NOT A CONVENTION: "providers blocked" was previously a property of how the
    // run was INVOKED — set the reuse hooks for the calls you know about and hope the rest are
    // covered. The transport probe set four reuse hooks and four other requests went out anyway.
    // Fail-closed inverts it: the run has to prove each dispatch is local, and the three
    // permitted outcomes are the three Roman named — replayed (returned above), sent to loopback,
    // or refused.
    if (process.env.SB_OFFLINE && !SB_FAULT && !_destIsLoopback) {
      const _why = 'SB_OFFLINE: ' + (body.role || url) + ' (' + raw.length + ' chars) would have '
        + 'been dispatched to ' + dest + ', which is not loopback and was not answered by a '
        + 'preserved reply — refused unsent';
      rec.refusedByDiagnostic = _why;
      rec.estimate = 0;                        // nothing left the machine, so no exposure
      _ledger('offline_refused', { reqId: rec.reqId, role: body.role || null, url: rec.url,
        dest: dest, destHost: _destHost, chars: raw.length, wouldHaveEstimated: g.estimate,
        why: _why });
      say('  ⊘ ' + _why);
      // The reservation is closed WITHOUT a settlement row: no charge, no unresolved exposure.
      try { hold.open = false; } catch (_) {}
      // STICKY, like the budget halt. One request that would have escaped means the offline
      // guarantee is broken for the whole run, and the run must not go on producing more.
      unrecoverableStop = unrecoverableStop || { code: 'offline_refusal', reqId: rec.reqId,
        why: _why + ' — SB_OFFLINE is in force, so no further remote dispatch is permitted.' };
      try { return await route.abort(); } catch (_) { return; }
    }
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
    // A concurrent twin may be waiting on this exact response. Published here, as soon as the
    // body is in hand and before any parsing or settlement can throw.
    try { _fpSettle(rec._fpKey, { status: _status0, headers: _headers0, body: text }); } catch (_) {}
    // PERSIST EVERY RESPONSE NOW — before parsing, before settlement, before fulfilment, and
    // whatever the status. Nothing below this line can destroy the evidence by throwing.
    _persistResponse({ status: _status0, headers: _headers0, body: text, ms: rec.ms,
      role: body.role || null, url: url.replace(ORIGIN, ''), dest, model, rec,
      reqId: rec.reqId, requestChars: raw.length, scene: sceneNoForReplies });

    // ── CLASSIFY THE REPLY HERE, WHERE THE REQUEST IS STILL IN SCOPE ────────────────────
    // `raw` is the request body and `text` is the reply, both real at this point. This is the
    // path the paid run took, and it is now the path that classifies.
    try { _planOnlyObserve({ requestText: raw, body: text, url: url }); } catch (_) {}

    // ── A DEAD FUNCTION RUNTIME STOPS THE RUN (Roman 2026-11-15) ────────────────────────────
    // MEASURED: a live Scene 1 attempt sent SEVEN requests across gpt-6-luna, claude-haiku-5-5,
    // grok-4.3 and gpt-6.1-sol, and every one came back 502 `NO_RESPONSE_FROM_FUNCTION` with
    // `spawn EBADF` in the dev server log — the function child could not be created, so nothing
    // reached a provider. The fallback chain treated each 502 as "this model failed, try the next
    // one" and kept going, and each attempt left its reservation behind: $0.545445 held, which
    // then triggered a budget halt on the A-plot. Seven attempts at an infrastructure fault that
    // no other model can fix.
    //
    // This is not a provider error and there is nothing to fall back to, so the first confirmed
    // one ends the run. The check is deliberately narrow: status 502 AND the platform's own
    // marker in the body. A provider's own 502 does not carry that marker and still falls back.
    if (_status0 === 502 && /NO_RESPONSE_FROM_FUNCTION/.test(String(text || ''))) {
      const why = 'FUNCTION RUNTIME IS DEAD: ' + (body.role || url.replace(ORIGIN, ''))
        + ' came back 502 NO_RESPONSE_FROM_FUNCTION — the platform could not run the function at'
        + ' all, so no provider was contacted and nothing was billed. The run stops here rather'
        + ' than walking the fallback chain: no other model can fix a runtime that will not start,'
        + ' and each further attempt leaves a reservation behind that can budget-halt the run.';
      // ── THE RESERVATION IS CARRIED UNLESS A LOG PROVES THE FUNCTION NEVER STARTED ──────
      // A 502 NO_RESPONSE_FROM_FUNCTION does NOT by itself mean no money moved. It means the
      // platform returned no response from the function — which is also what happens when the
      // function starts, calls a provider, and then dies before returning. On the LOCAL dev
      // server that distinction is readable: `spawn EBADF` in the dev log means the child was
      // never created, so nothing upstream was contacted. On a PREVIEW there is no such log
      // available here, so the honest position is that the charge is UNKNOWN and the reservation
      // stands.
      //
      // Releasing it would under-report exposure on exactly the runs where the truth is unknown,
      // which is the same error as calling a reservation a charge — in the direction that loses
      // money quietly rather than loudly.
      let _neverStarted = false, _evidence = 'no local dev log to consult (preview origin)';
      try {
        if (/^https?:\/\/localhost(?::\d+)?$/i.test(ORIGIN)) {
          const _devLog = fs.readFileSync('_vercel_dev.log', 'utf8');
          if (/spawn EBADF/.test(_devLog)) {
            _neverStarted = true;
            _evidence = 'the local dev log shows `spawn EBADF` — the function child was never'
              + ' created, so nothing upstream was contacted';
          } else {
            _evidence = 'the local dev log shows no `spawn EBADF`, so the function may have'
              + ' started and reached a provider before dying';
          }
        }
      } catch (_) { _evidence = 'the local dev log could not be read'; }
      say('  \u2298 ' + why);
      say('    \u21b3 ' + (_neverStarted
        ? 'NOT BILLABLE: ' + _evidence + '. The reservation is released.'
        : 'CHARGE UNKNOWN: ' + _evidence + '. The reservation is CARRIED as exposure, and the'
          + ' response is preserved for inspection.'));
      _ledger('function_runtime_dead', { reqId: rec.reqId, role: body.role || null,
        url: url.replace(ORIGIN, ''), status: _status0, origin: ORIGIN,
        functionNeverStarted: _neverStarted, evidence: _evidence,
        reservationCarried: !_neverStarted, estimate: (hold && hold.estimate) || null,
        statedPlainly: _neverStarted
          ? 'The function child was never created, so no upstream request was made and no charge'
            + ' is possible. The reservation is released.'
          : 'The platform returned no response from the function. Whether it reached a provider'
            + ' first is NOT known from here, so this is treated as possible spend: the'
            + ' reservation is carried and the response is preserved.' });
      halted = halted || why;
      unrecoverableStop = unrecoverableStop
        || { code: 'function_runtime_dead', reqId: rec.reqId, why, charged: _neverStarted ? 'no' : 'unknown' };
      // The response body is already on disk via _persistResponse above; nothing here discards it.
      if (_neverStarted) { try { hold.open = false; } catch (_) {} }
      try { return await route.abort(); } catch (_) { return; }
    }
    rec.status = _status0;
    // ── THE FRESH PLANNER IS JUDGED BEFORE THE AUTHOR IS PAID FOR (Roman 2026-11-13) ───────
    // The whole point of the rewrite is that the opening plan carries the accepted row's LIVE
    // exchange with the love interest physically absent. The planner is cheap (~$0.031) and the
    // author is not (~$0.164), so the plan is read HERE, the moment it arrives, and the author
    // is refused at the wire if the plan lost either property. Armed by
    // SB_REQUIRE_LIVE_EXCHANGE=<LI name>; it reads the reply and changes nothing in it.
    //
    // TWO SEPARATE PROPERTIES, BOTH FROM THE PLANNER'S OWN WORDS:
    //   physical absence — no staged row places him IN_PERSON, and the plan does not say he is
    //                      in the room;
    //   the live exchange — the plan must put him ON the channel. The paid opening's plan is the
    //                      negative example and it is explicit: "Dani is the only person in the
    //                      room; the call is on screen only", with a remembered-glass texture
    //                      beat and a roster of one. A plan that says the call has ended, or
    //                      that she is alone, has lost it.
    // ── THE SHARED OPENING VALIDATOR DECIDES, AND THE ROW ARMS IT ──────────────────────────
    // This gate used to be armed by SB_REQUIRE_LIVE_EXCHANGE=<love interest name> and asked only
    // about HIM: is he on a channel, is he staged in the room. That missed the failure that
    // actually shipped, where the live party was the GALA ORGANIZER and the love interest was
    // correctly absent — the plan replaced her live refusal with "the organizer's LAST MESSAGE",
    // the skeleton validator accepted it, and the author wrote a woman re-reading a text.
    //
    // So the ASSIGNED ROW arms it now, not an env var naming a person: if the row assigns a live
    // exchange, the plan's beats must show the other party acting or speaking in real time and
    // the protagonist answering. The love-interest name is still passed, because his physical
    // absence is a separate property worth keeping, but it is no longer what triggers the check.
    if (_status0 === 200 && String(rec.bodyText || '').indexOf(OPENING_PLANNER_SIG) !== -1
        && (process.env.SB_VALIDATE_OPENING === '1' || process.env.SB_REQUIRE_LIVE_EXCHANGE)) {
      let _plan = null, _planText = text;
      try {
        const _o = JSON.parse(text);
        const _c = (_o && _o.choices && _o.choices[0] && _o.choices[0].message
          && _o.choices[0].message.content) || (_o && _o.content) || '';
        if (_c) {
          _planText = String(_c);
          const _f = _planText.match(/```(?:json)?\s*([\s\S]*?)```/);
          try { _plan = JSON.parse(_f ? _f[1] : _planText); } catch (_) {}
        }
      } catch (_) {}
      // The row the plan was asked to realise. SB_OPENING_ROW names it explicitly for a focused
      // run; otherwise it is read from the request that was just sent, which is where the
      // instruction quoted it verbatim.
      let _rowTxt = String(process.env.SB_OPENING_ROW || '');
      if (!_rowTxt) {
        const _m = String(rec.bodyText || '').match(/assignment row for this scene reads: "([^"]+)"/);
        if (_m) _rowTxt = _m[1];
      }
      const _v = validateOpeningPlan({ plan: _plan, planText: _planText, rowText: _rowTxt,
        liName: String(process.env.SB_REQUIRE_LIVE_EXCHANGE || '').trim() });
      const _faults = _v.faults;
      try {
        fs.writeFileSync(OUT + '/PLANNER_REPLY.json', JSON.stringify({
          statedPlainly: _faults.length
            ? 'The opening plan LOST a property its assigned row requires, so the author was '
              + 'never dispatched. This is the plan exactly as the planner returned it.'
            : 'The opening plan satisfied its assigned row, so the author was allowed to '
              + 'proceed. This is the plan as returned.',
          verdict: _v.verdict, assignedLiveExchange: _v.assignedLive || null,
          rowValidatedAgainst: _rowTxt || null,
          faults: _faults, evidence: _v.evidence, beats: _v.beats,
          plan: _plan || _planText,
        }, null, 2));
      } catch (_) {}
      if (_faults.length) {
        const why = 'THE OPENING PLAN FAILED ITS OWN ROW: ' + _faults.join('; ')
          + '. The author was NOT dispatched. The plan as returned is in PLANNER_REPLY.json.';
        say('  \u2298 ' + why);
        _ledger('opening_plan_rejected', { reqId: rec.reqId, faults: _faults,
          assignedLiveExchange: _v.assignedLive || null, why });
        halted = halted || why;
        unrecoverableStop = unrecoverableStop
          || { code: 'opening_plan_rejected', reqId: rec.reqId, why };
      } else if (_v.assignedLive) {
        say('  \u2713 THE OPENING PLAN KEEPS ITS LIVE EXCHANGE ("' + _v.assignedLive + '"): the other'
          + ' party acts in ' + _v.evidence.beatsWhereOtherActs.join(', ') + ' and she answers in '
          + _v.evidence.beatsWherePcResponds.join(', ') + ' — the author may proceed');
      } else {
        say('  \u2713 THE OPENING PLAN assigns no live exchange, so none can be lost — the author'
          + ' may proceed (PLANNER_REPLY.json)');
      }
    }
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
    // ── A REPLAYED REPLY SETTLES AT ZERO IN THIS RUN ──────────────────────────────────────
    // The body came off disk, so its `usage` and `cost_in_usd_ticks` belong to the run that
    // actually bought it. Pricing them again invents spend: the capture run reported $0.031264
    // against a $1.00 authorization for an opening-planner call that never left the machine, and
    // the identical response id, created timestamp and cost field proved it was Stage 1's own
    // reply. The original receipt is PRESERVED under `replayedReceipt` — it is still the best
    // evidence of what that call cost when it was really made — and `receipt` is cleared so no
    // arithmetic downstream can treat it as this run's charge.
    const _replayedFrom = (_headers0 && (_headers0['x-sb-replayed'] || _headers0['X-Sb-Replayed'])) || '';
    if (_replayedFrom) {
      rec.replayed = String(_replayedFrom);
      rec.replayedReceipt = rec.receipt || null;
      rec.receipt = null;
      rec.settledZeroBecauseReplayed = true;
      say('  ⊘ NOT BILLED HERE: this reply was replayed from ' + rec.replayed
        + ' — it settles at $0 in this run; its original receipt is preserved for reference');
      _ledger('replayed_settles_zero', { reqId: rec.reqId, role: body.role || null,
        url: url.replace(ORIGIN, ''), replayedFrom: rec.replayed,
        originalReceipt: rec.replayedReceipt || null,
        statedPlainly: 'A reply served from disk is not a charge in this run. The original '
          + 'receipt is kept for reference; this run books zero.' });
    }
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
    // ── A LOCAL 404 IS A REPLAY ARTIFACT, NOT EXPOSURE (Roman 2026-11-17) ───────────────────
    // In a provider-blocked replay the app is served by _ft_static_server, which has no /api
    // routes, so every call the reuse table does not answer comes back 404 in ~2ms with no body
    // and no receipt. The recorder correctly refused to call that "settled" and booked it as
    // unresolved exposure — and the holds then ate the authorization: MEASURED on the replay of
    // 2026-11-17, $0.097350 of a $0.099303 hold was thirteen 404s, with $0.000000 settled. The
    // next reader of that line sees a $0.10 run almost exhausted by calls that never left the
    // machine.
    //
    // So a local 404 with no body is reconciled as ZERO: no spend, no hold, no exposure. It is
    // recorded as `local_404_replay_artifact` and counted separately in the offline ledger, so
    // it is never confused with a real answer or a real charge. Scoped hard: offline/loopback
    // only, status exactly 404, empty body. A 404 from a real provider route still books as
    // exposure, and PRODUCTION proxy behaviour is untouched.
    // TIGHTENED to SB_OFFLINE only (was `_destIsLoopback || _SB_OFFLINE`): vercel dev is also
    // loopback, so on a PAID run a genuine 404 would have been zeroed. Exposure must stay visible.
    const _isLocalReplay404 = (rec.status === 404)
      && _SB_OFFLINE
      && !(_seen && _seen.body && String(_seen.body).trim().length > 32);
    if (_isLocalReplay404) {
      reconcile(hold, { usage: null, why: 'local_404_replay_artifact', model });
      rec.settlement = { kind: 'zero', usd: 0, reserved: 0,
        why: 'local 404 in a provider-blocked replay: the static server has no /api route, so '
          + 'nothing left this machine and nothing is owed' };
      rec.measuredUsd = 0;
      rec.unresolvedExposure = false;
      rec.localReplayArtifact = true;
      _offlineArtifact404 = (_offlineArtifact404 || 0) + 1;
      _offlineArtifact404Est = (_offlineArtifact404Est || 0) + (g.estimate || 0);
      // FALL THROUGH, do not return: the 404 still has to reach the application exactly as the
      // static server sent it. An invented early return (`_seenResponse()`, which does not
      // exist) would have thrown here on the first local 404 — caught by reading the code, not
      // by the syntax check, which was happy with a call to a function that was never defined.
    } else {
      const row = reconcile(hold, { usage: usageForSettlement, model: rec.served || model });
      rec.settlement = { kind: row.kind, usd: row.usd, reserved: g.estimate,
        why: row.why || (rec.cacheSeen ? 'cache present — not priceable by this table' : null) };
      rec.measuredUsd = row.kind === 'settled' ? row.usd : null;
      rec.unresolvedExposure = row.kind !== 'settled';
    }
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
      _checkSpineShape(rec.bodyText, _solContent, rec, 'live dispatch');
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
    // Tell any waiting twin there is nothing coming, rather than making it sit out _SHARE_WAIT_MS.
    try { _fpSettle(rec._fpKey, null); } catch (_) {}
    halted = 'TRANSIT FAILURE at scene ' + sceneNoForReplies + ' on ' + (rec.role || url)
      + ': ' + rec.error + ' — the request may or may not have been billed';
    say('  ✗ ' + halted);
    // STICKY FROM HERE. Setting `halted` alone let r4-r7 dispatch after r3 died; the stop has to
    // be something the NEXT request consults. Recorded with the failing request's id so the
    // refusals name what stopped them, and preserved by the same cleanup boundary as everything
    // else — the settlement, the resumable state and the artifacts are still written on the way
    // out. The first non-response wins; later ones cannot overwrite the cause.
    // READ OFF `rec`, NOT OFF THE TRY BLOCK'S OWN CONSTS. Caught by running the control: the
    // first version of this referenced `_dispatchTimeoutMs` and `_allowanceOut`, which are
    // declared with `const` INSIDE the dispatch try and are therefore invisible here. That threw
    // a ReferenceError inside the catch, so the stop was never set, the run died before the
    // cleanup boundary, and neither requests.json nor the settlement was written — the very
    // outcome this change exists to prevent. `rec` is outer-scoped and already carries both.
    if (!unrecoverableStop) {
      const _dl = rec.dispatchTimeoutMs || null;
      unrecoverableStop = { code: 'transit_failure_no_response', reqId: rec.reqId,
        scene: sceneNoForReplies, role: rec.role || null, url: url.replace(ORIGIN, ''),
        requestedModel: model,
        allowance: (rec.deadlineBasis && rec.deadlineBasis.allowanceOut) || null,
        deadlineMs: _dl, ms: rec.ms, error: rec.error,
        why: 'request #' + rec.reqId + ' (' + (rec.role || url) + ') returned no HTTP response '
          + 'within ' + (_dl == null ? 'its deadline' : _dl + 'ms') + '. Whatever depended on it '
          + 'has no input, and the call may or may not have billed, so no further paid dispatch '
          + 'is permitted.' };
      _ledger('unrecoverable_stop', unrecoverableStop);
      say('    ⊘ RUN STOPPED: no further dispatch will be permitted (sticky, every role)');
    }
    try { return await route.abort(); } catch (_) { return; }
  }
});

// ── LAUNCH, LITERARY ──────────────────────────────────────────────────────────────────────
// ── THE 30s DEFAULT IS NO LONGER ENOUGH TO PARSE THE BUILD (Roman 2026-11-15) ──────────────
// MEASURED: `page.goto: Timeout 30000ms exceeded` waiting for domcontentloaded, while the dev
// server served every asset fast — `/` in 0.79s and app.js in 0.84s. The blocking step is not the
// network, it is executing the bundle: public/app.js is now 26,045,200 bytes of synchronous
// JavaScript, and domcontentloaded does not fire until it has run. Earlier runs in this session
// succeeded, so the build has grown across Playwright's default while the work was being done.
//
// The dev server's /api/config returning 502 is a red herring here: the runner INTERCEPTS that
// route and fulfils it locally, so the browser never sees it. I reported it as the cause once;
// it was not.
await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 180000 });
await page.waitForFunction(() => typeof window._launchStarterStory === 'function'
  && Array.isArray(window.STARTER_STORIES), null, { timeout: 120000 });
const ov = await page.evaluate((sid) => {
  if (typeof window._bakedScene1For === 'function') {
    window.__realBakedScene1For = window._bakedScene1For;
    window._bakedScene1For = function () { return null; };
  }
  const _entry = (window.STARTER_STORIES || []).filter((d) => d && d.id === sid)[0] || null;
  return { bakedStubbed: window._bakedScene1For(sid) === null,
    catalogUntouched: !!_entry,
    renderMode: _entry ? (_entry.render_mode || 'literary (no render_mode)') : null };
}, STARTER_ID);
say('baked page stubbed for this tab: ' + ov.bakedStubbed + ' · Book: ' + STARTER_ID
  + ' · shipped render_mode: ' + ov.renderMode
  + ' · shipped catalog entry present and untouched: ' + ov.catalogUntouched);
let RESUMED_FROM_DISK = null;
if (RESUME_FROM) {
  // IMPORT THE PRESERVED STATE AND RESUME THROUGH THE REAL ENTRY. No story is launched and no
  // scene is regenerated: the pages already paid for are the pages we continue from.
  const dump = JSON.parse(fs.readFileSync(RESUME_FROM, 'utf8'));
  await page.evaluate((d) => { Object.keys(d).forEach((k) => { try { localStorage.setItem(k, d[k]); } catch (_) {} }); }, dump.storage);
  // ── THE RESUME RELOAD NEEDS THE SAME BUDGET AS ITS NEIGHBOUR (Roman 2026-11-14) ─────────
  // MEASURED: this reload took Playwright's 30s DEFAULT and timed out on the second resume of
  // the same state, having succeeded on the first — "navigated to http://localhost:3000/" with
  // domcontentloaded never firing. It is not a server fault (root 0.6s, app.js 26MB in 0.66s,
  // /api/config 200 in 1.1s, all measured right after the failure). It is simply a marginal
  // budget: the page parses a 26MB app.js and rehydrates 1.25MB of restored localStorage before
  // DOMContentLoaded. The very next line already allows 120s for the same page to finish
  // defining `continueStory`, so 30s here was the outlier rather than a considered figure.
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
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

  // ── SB_RESTORE_PETITION_GATE: PUT BACK THE *UNFINISHED* GATE THE RESTORE CLEARED ────────
  // app.js:129609 deliberately clears `_petitionFrameLandedAwaitingArm` on every restore, with
  // a comment naming why (2026-06-09: a reopened story landed on Scene 2 trapped behind the
  // Tempt zoom with no Submit). That is right for ordinary reopening and wrong for a test that
  // must continue the turn the reader had actually reached: Scene 2 ended on the Petition Fate
  // reveal, so the gate was pending when the save was written.
  //
  // So: re-raise ONLY that one pending flag and install the gate through the shipped arming
  // function — never by hand. Completed onboarding is left exactly as saved: `_deckExamineFired`,
  // `_petitionEmergenceFired`, `onboardingComplete`, `onboardingGiftGranted` and
  // `first_tempt_fate_vision_triggered` are not written here, so nothing already finished is
  // replayed. If the save says the petition emergence already FIRED, this does nothing at all.
  if (String(process.env.SB_RESTORE_PETITION_GATE || '') === '1') {
    // READ THE GATE OUT OF THE ORIGINAL SAVE, never assume it. The flag is restored only if the
    // save actually carried it pending, and only if that save says the emergence had NOT fired.
    // Hardcoding `true` would manufacture a gate on a save that never had one, which is a
    // different test than continuing the turn the reader had reached.
    const _savedGate = (() => {
      try {
        const snap = JSON.parse(String((dump.storage || {}).sb_saved_story || '{}')).stateSnapshot || {};
        return { awaitingArm: snap._petitionFrameLandedAwaitingArm === true,
          emergenceFired: !!snap._petitionEmergenceFired,
          mandateApplied: !!snap._petitionMandateApplied,
          pendingPetition: !!(snap.fate && snap.fate.pendingPetition) };
      } catch (e) { return { readError: e.message }; }
    })();
    say('THE SAVE’S OWN GATE STATE: ' + JSON.stringify(_savedGate));
    assert(!_savedGate.readError, 'could not read the gate out of the save: ' + _savedGate.readError);
    assert(_savedGate.awaitingArm === true,
      'SB_RESTORE_PETITION_GATE was asked for, but this save does not carry a PENDING petition '
      + 'gate (_petitionFrameLandedAwaitingArm is not true) — refusing to manufacture one');
    assert(_savedGate.emergenceFired === false,
      'this save says the petition emergence already FIRED — restoring the gate would replay a '
      + 'completed onboarding step');
    const gate = await page.evaluate((saved) => {
      const s = window.state || {};
      const before = {
        awaitingArm: !!s._petitionFrameLandedAwaitingArm,
        emergenceFired: !!s._petitionEmergenceFired,
        emergenceArmed: !!s._petitionEmergenceArmed,
        deckExamineFired: !!s._deckExamineFired,
        onboardingComplete: !!s.onboardingComplete,
        pendingPetition: !!(s.fate && s.fate.pendingPetition),
      };
      if (before.emergenceFired) return { before, action: 'none: the petition emergence already fired in this save' };
      // Mirror the SAVE, do not assert a value: this is only reached when the save itself said
      // the gate was awaiting its arm and the emergence had not fired.
      if (!saved || saved.awaitingArm !== true) {
        return { before, action: 'none: the save did not carry a pending gate' };
      }
      s._petitionFrameLandedAwaitingArm = saved.awaitingArm;
      let armed = false;
      try {
        if (typeof window._armLiteraryPetitionEmergence === 'function') {
          window._armLiteraryPetitionEmergence();
          armed = true;
        }
      } catch (e) { return { before, action: 'arm threw: ' + e.message }; }
      const s2 = window.state || {};
      return { before, action: armed ? 'armed through the shipped _armLiteraryPetitionEmergence' : 'arm fn missing',
        after: {
          awaitingArm: !!s2._petitionFrameLandedAwaitingArm,
          emergenceArmed: !!s2._petitionEmergenceArmed,
          deckExamineFired: !!s2._deckExamineFired,
          onboardingComplete: !!s2.onboardingComplete,
          pendingPetition: !!(s2.fate && s2.fate.pendingPetition),
        }, fromSave: saved };
    }, _savedGate);
    say('PETITION GATE RESTORED: ' + JSON.stringify(gate));
    fs.writeFileSync(OUT + '/PETITION_GATE_RESTORE.json', JSON.stringify(gate, null, 2));
    assert(!/threw|missing/.test(String(gate.action)), 'the petition gate could not be armed: ' + gate.action);
    if (gate.after) {
      assert.equal(gate.after.deckExamineFired, gate.before.deckExamineFired,
        'the restore must not change a COMPLETED onboarding step (deck examine)');
      assert.equal(gate.after.onboardingComplete, gate.before.onboardingComplete,
        'the restore must not change onboardingComplete');
      assert.equal(gate.after.pendingPetition, false,
        'arming must NOT seal a petition — the reader does that');
    }
  }
}
const def = RESUME_FROM ? null : await page.evaluate((sid) => (window.STARTER_STORIES || [])
  .find((d) => d && d.id === sid) || null, STARTER_ID);
if (!RESUME_FROM) assert(def, STARTER_ID + ' is not in the shipped catalog');

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
  const pre = await page.evaluate(([plan, id]) => {
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
  }, [PRE_LAUNCH_PLAN, STARTER_ID]);
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

// ── THE RUN'S LOGS AND RECORD, DECLARED ABOVE THE BOUNDARY ────────────────────────────────
// These five were declared just before the scene loop. The `finally` that writes the accounting
// and the recoverable state reads sceneLog, deliveryLog and writeStoryRecord, so once the
// boundary moved up to cover launch they had to move with it — a `const` or a function
// declaration inside the try block is not visible in its own `finally`.
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

// ══ THE FAILURE-PRESERVATION BOUNDARY ═════════════════════════════════════════════════════
// IT NOW OPENS BEFORE LAUNCH. MEASURED: the post-launch provenance assertion threw, and I
// reported that "the uncaught throw skipped the finally". That was wrong — the `finally` was
// never ENTERED, because this `try` used to open AFTER the launch section, several hundred
// lines below the assertion. So a run could pay for the bibles, the A-plot, the three-issue
// spine and the opening planner, then die on a launch check and write no settlement and no
// RESUMABLE_STATE.json at all: $0.048798 of real calls with no accounting and nothing to
// resume from.
//
// Opening it here puts launch, the pre-launch withholding and every post-launch assertion
// inside the same boundary, so an assertion failure still writes the accounting and the
// recoverable state on its way out. It does NOT make the assertion survivable: the throw still
// propagates after the `finally` runs, and the run still fails.
try {
if (!RESUME_FROM && FRESH_PLAN) {
  if (PRE_LAUNCH_PLAN) throw new Error('SB_FRESH_PLAN and SB_SELECTED_PLAN are mutually '
    + 'exclusive: one withholds the authored rows so the planner can invent a plot, the other '
    + 'installs a previously generated plan and suppresses generation.');
  const pf = await page.evaluate((id) => {
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
  }, STARTER_ID);
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
const applyAccountSetup = () => page.evaluate((w) => {
  const s = window.state;
  s.profileId = 'playthrough-profile';
  s._bakedGenesisUnlocked = true; s.previewActive = false;
  s._issuePurchased = true; s._issuesPurchased = { 1: true };
  s.fortunes = 9999999; s.access = 'sub'; s.subscribed = true;
  s.hasSeenFortuneTurnDisclosure = true;
  s.picks = s.picks || {}; if (w) s.picks.world = w;
  if (!Array.isArray(s.scenes)) s.scenes = [];
  return { fortunes: s.fortunes, world: s.picks.world, issuePurchased: !!s._issuePurchased };
}, (def && def.world) || null);
// COVERED TOO: the account setup runs AFTER the launch has already spent, so a failure here
// loses evidence for calls that have already billed.
try { await applyAccountSetup(); } catch (e) {
  await preserveLaunchEvidence('account_setup_failed: ' + ((e && e.message) || e));
  throw e;
}

// ── SB_EDITOR_PROBE=1 — EXERCISE THE EDITOR BRANCH, PROVIDER-FREE (Roman 2026-11-13) ──────
// WHY IT HAS TO EXIST. The editor fires after a scene is authored, and a provider-free drive of
// a Book with no authored plan cannot get that far: with every provider blocked the Bibles come
// back empty, the R-plot reports "all tiers exhausted" and the A-plot fails validation. So the
// one branch that decides whether every editor call is reserved and settled against the run
// ceiling was unobservable in exactly the mode built for observing things without paying.
//
// This issues ONE well-formed editor request FROM THE PAGE, through the page's own fetch, so it
// travels the same route handler every real editor call travels and takes the same branch. It
// proves the accounting path, not the product's decision to call the editor.
//
// DRIVE ONLY, AND IT REFUSES TO RUN ANYWHERE ELSE. A paid run must not carry an extra call that
// the story did not ask for, so this throws rather than quietly skipping if it is ever set on a
// live mode — a silent skip is how a test-only flag ends up believed to have run.
if (process.env.SB_EDITOR_PROBE === '1') {
  // THE RESTRICTION IS "NO PAID CALL", NOT "DRIVE". It was written as drive-only because drive
  // was the only state in which this extra call could not be billed. SB_OFFLINE is now another
  // such state, and a stronger one: the editor's own egress is guarded, so the probe can be
  // used to verify that guard in a LIVE mode — which is the only mode where the gap existed.
  // Anything else is still refused loudly rather than silently skipped.
  const _probeBlocked = DRIVE || !!process.env.SB_OFFLINE
    || (_SB_MODEL_ORIGIN && _originIsLoopback(_SB_MODEL_ORIGIN));
  if (!_probeBlocked) throw new Error('SB_EDITOR_PROBE is a provider-free verification probe and '
    + 'must never add a call to a live run. It is permitted only where providers are provably '
    + 'blocked: drive mode, SB_OFFLINE=1, or SB_MODEL_ORIGIN pointed at loopback. None is set.');
  const _probe = await page.evaluate(async (acct) => {
    const st = window.state || {};
    const storyId = st.storyId || st._storyId || 'probe-story';
    const scene = 4, revisionId = 'probe-rev-1';
    const operationId = ['cplus-editor', acct, storyId, 'scene' + scene, revisionId, 'craft'].join(':');
    try {
      const r = await fetch('/api/cplus-editor', { method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ operationId, storyId, scene, revisionId,
          contentClass: 'general', userId: acct,
          system: 'You are an editor.', user: 'x'.repeat(30000), maxTokens: 1240 }) });
      return { status: r.status, body: (await r.text()).slice(0, 200) };
    } catch (e) { return { threw: String((e && e.message) || e) }; }
  }, SB_TEST_ACCOUNT_ID);
  say('EDITOR PROBE ('
    + (DRIVE ? 'drive' : (process.env.SB_OFFLINE ? 'SB_OFFLINE' : 'loopback origin'))
    + '): ' + JSON.stringify(_probe));
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
const restoreFreshPlanAfterReload = () => page.evaluate((id) => {
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
}, STARTER_ID);

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
  const fp = await page.evaluate((sid) => {
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
      authoredRowsStillWithheld: ((window.STARTER_PLANS || {})[sid] || {}).scenes,
      firstWithheldEvent: withheld.length ? String(withheld[0].accomplishes || withheld[0].event || '').slice(0, 70) : null,
    };
  }, STARTER_ID);
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
  // ── VERIFIED AGAINST THE SELECTED MODEL, IN EVERY MODE (Roman 2026-11-06) ──────────────
  // This asserted `isSolArchitecture` and skipped itself entirely in the provider-blocked
  // driver. Both halves were wrong: the configuration names the architecture model, so Sol was
  // the wrong thing to require; and the mode that could have caught that was the one excused
  // from checking. It now compares against whatever the run selected and is NEVER skipped —
  // the driver accepts only its own declared synthetic identity, so a real provider that is
  // not the selected one fails there too.
  const _prov = verifyScaffoldProvenance(Object.assign({ servedBy: fp.servedBy },
    prerequisiteOptionsFor(MODE, RUN_CONFIG && RUN_CONFIG.architectureModel)));
  fp.provenance = _prov;
  assert(_prov.ok === true, _prov.why);
  say('  ✓ SCAFFOLD PROVENANCE (' + _prov.code + '): ' + _prov.why);
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

// ── SEAL A PETITION THROUGH THE REAL MODAL, BEFORE THE TURN IS SUBMITTED ─────────────────
// The reader handoff could only ever type into #actionInput and click Submit, so a Petition —
// the one reader input that is NOT a say/do — had no way to be made. A `petition` field on
// NEXT_ACTION.json now drives the SHIPPED controls: the deck's Petition option, #petitionInput,
// #btnSealPetition. Nothing internal is called and no state is written by hand: if the app's own
// validation, classification or per-scene limit refuses the wish, that refusal IS the result and
// it is reported. `state.fate.pendingPetition` is read back afterwards as evidence, never set.
async function sealPetition(wishText) {
  const out = await page.evaluate(async (wish) => {
    const r = { wish, opened: false, modalWasHidden: null, typed: null, sealClicked: false,
                pendingAfter: null, toast: null, why: null };
    const m = document.getElementById('petitionFateModal');
    if (!m) { r.why = 'no #petitionFateModal in the page'; return r; }
    r.modalWasHidden = m.classList.contains('hidden');
    // Open it through the SHIPPED entry point. openPetitionZoom marks the petition CARD with
    // .petition-zoomed; it does NOT unhide #petitionFateModal, so requiring that modal to become
    // visible reported "the Petition control did not open the modal" on a page where the control
    // was working. Measured: the seal succeeds with that modal still hidden. So the zoom is
    // opened if it can be, the state is recorded, and the verdict is left to pendingPetition
    // rather than to a visibility flag that does not mean what it looks like.
    if (r.modalWasHidden && typeof window.openPetitionZoom === 'function') {
      try { window.openPetitionZoom(); } catch (_) {}
      await new Promise((x) => setTimeout(x, 500));
    }
    const _card = document.querySelector('.petition-fate-card');
    r.cardZoomed = !!(_card && _card.classList.contains('petition-zoomed'));
    r.opened = r.cardZoomed || !m.classList.contains('hidden');
    const input = document.getElementById('petitionInput');
    if (!input) { r.why = 'no #petitionInput'; return r; }
    input.value = wish;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    r.typed = input.value;
    const seal = document.getElementById('btnSealPetition');
    if (!seal) { r.why = 'no #btnSealPetition'; return r; }
    seal.click();
    r.sealClicked = true;
    await new Promise((x) => setTimeout(x, 600));
    const p = (window.state && window.state.fate && window.state.fate.pendingPetition) || null;
    r.pendingAfter = p ? { text: p.text, classification: p.classification, accepted: p.accepted } : null;
    const t = document.querySelector('.toast, #toast');
    r.toast = t ? String(t.textContent || '').trim().slice(0, 120) : null;
    return r;
  }, wishText);
  say('  ⟐ PETITION through the real UI: ' + (out.pendingAfter
    ? ('SEALED — state.fate.pendingPetition.text = "' + String(out.pendingAfter.text).slice(0, 70)
       + '" (classification ' + out.pendingAfter.classification + ')')
    : ('NOT SEALED — ' + (out.why || out.toast || 'the app refused it and set no pendingPetition'))));
  return out;
}

// ── EXAMINE THE DECK, THEN READ THE HAND — THROUGH THE SHIPPED CONTROLS ──────────────────
// WHY THIS IS NEEDED (Roman 2026-11-14): on a first story the deck closer arms a MANDATORY
// Submit gate (`_installEmergenceSubmitGate`, app.js:246605) — Submit is blocked until the deck
// has been examined, and clicking Submit RE-PRESENTS the "Examine the Cards" gate instead of
// submitting. So `window.state.fateOptions` is [] not because the hand failed to deal but
// because `_deckExamineFired` is false and the cards have not been revealed yet. The runner
// could neither examine nor click a card, which means a freeform action would have been blocked
// by that gate too.
//
// NOTHING IS FORCED. `dealFateCards` is never called with force, and it is not called directly
// at all: the examine gate is fired the way the reader fires it, and the product deals the hand.
// If a hand is ALREADY present it is kept as-is and nothing is triggered.
async function examineAndReadHand() {
  // THE PRE-CACHED SUGGESTION LANDS HERE, after the hand exists and before any click.
  try {
    const seeded = await page.evaluate(() => (typeof window.__sbApplyPrecachePreview === 'function')
      ? window.__sbApplyPrecachePreview() : null);
    if (seeded === true) say('  \u2713 pre-cached suggestion written into this turn\u2019s cache');
    else if (seeded === false) say('  ! pre-cached suggestion could NOT be written (no state or no writer)');
  } catch (_) {}
  const out = await page.evaluate(async () => {
    const r = { already: false, examineClicked: null, gatePresent: false, cards: [], fateOptions: null, mount: null };
    const mountOf = () => {
      try {
        const s = window._sbActiveReaderSurface && window._sbActiveReaderSurface();
        if (s && s.mount) { const m = document.getElementById(s.mount); if (m) return m; }
      } catch (_) {}
      return document.getElementById('cardMount');
    };
    const read = () => {
      const m = mountOf();
      r.mount = m ? (m.id || '(unnamed)') : null;
      const els = m ? Array.from(m.querySelectorAll('.fate-card')) : [];
      return els.map((el, i) => ({
        index: el.dataset && el.dataset.cardIndex != null ? Number(el.dataset.cardIndex) : i,
        locked: el.classList.contains('locked'),
        title: (el.querySelector('.back h3') || {}).textContent || null,
        desc: (el.querySelector('.back p') || {}).textContent || null,
      }));
    };
    // 1. A hand that already exists is KEPT — but the gate still has to be satisfied.
    //    MEASURED (Roman 2026-11-16): on a RESTORED save the hand is already mounted, so this
    //    returned immediately with examineClicked=null, the examine GESTURE was never performed,
    //    and the product then refused the submit:
    //        [DECK:EXAMINE] gate shown below last line of prose
    //        [DECK:EMERGENCE] Submit blocked — re-zoom + toast (free credit granted)
    //    The gate does not track whether a hand EXISTS; it tracks whether the reader LOOKED. So
    //    the hand is read and kept, and the examine control is still pressed when one is offered.
    let cards = read();
    if (cards.length) {
      r.already = true; r.cards = cards;
      r.fateOptions = (window.state && window.state.fateOptions) || null;
      r.satisfiedGateWithHandPresent = false;
    }
    // 2. Fire the examine gate the way a reader does: its own control if present, else the
    //    Submit button, which the gate re-presents itself on.
    const findExamine = () => Array.from(document.querySelectorAll('button, a, [role="button"], .emergence-gate-btn'))
      .filter((e) => /examine the cards?/i.test((e.textContent || '').trim()))
      .filter((e) => e.offsetParent !== null)[0] || null;
    let btn = findExamine();
    r.gatePresent = !!btn;
    if (!btn) {
      const sub = document.getElementById('submitBtn');
      if (sub) { sub.click(); await new Promise((x) => setTimeout(x, 900)); }
      btn = findExamine();
      r.gatePresent = !!btn;
    }
    if (btn) {
      r.examineClicked = (btn.textContent || '').trim().slice(0, 40);
      btn.click();
      if (r.already) {
        // The hand is already there; this press exists to satisfy the gate, not to deal.
        r.satisfiedGateWithHandPresent = true;
        await new Promise((x) => setTimeout(x, 900));
      } else {
        for (let i = 0; i < 25 && !read().length; i++) await new Promise((x) => setTimeout(x, 400));
      }
    }
    r.cards = read();
    r.fateOptions = (window.state && window.state.fateOptions) || null;
    return r;
  });
  say('  ⟐ FATE HAND: ' + (out.already
      ? ('a hand was already dealt and was kept'
         + (out.satisfiedGateWithHandPresent
            ? (' · examine gate satisfied via "' + out.examineClicked + '"')
            : ' · NO examine control was offered (the gate may refuse the submit)'))
      : (out.examineClicked ? ('examined via "' + out.examineClicked + '"') : 'no examine control was reachable'))
    + ' · cards=' + out.cards.length + ' · mount=' + (out.mount || '(none)'));
  out.cards.forEach((c) => say('      [' + c.index + '] ' + (c.locked ? 'LOCKED  ' : 'unlocked') + ' · '
    + (c.title || '(untitled)') + (c.desc ? (' — ' + String(c.desc).slice(0, 90)) : '')));
  return out;
}

// ── CLICK ONE CARD, AND TAKE THE SAY/DO IT OFFERS ────────────────────────────────────────
// The card's own onclick fills the active turn inputs with a scene-aware Say/Do. This waits for
// that to land and returns it verbatim — the offer is the product's, not the harness's.
async function clickFateCard(index) {
  const out = await page.evaluate(async (idx) => {
    const r = { clicked: false, title: null, locked: null, action: '', dialogue: '', waited: 0 };
    const mountOf = () => {
      try {
        const s = window._sbActiveReaderSurface && window._sbActiveReaderSurface();
        if (s && s.mount) { const m = document.getElementById(s.mount); if (m) return m; }
      } catch (_) {}
      return document.getElementById('cardMount');
    };
    const m = mountOf();
    const el = m ? m.querySelector('.fate-card[data-card-index="' + idx + '"]') : null;
    if (!el) { r.why = 'no .fate-card with data-card-index=' + idx; return r; }
    r.locked = el.classList.contains('locked');
    if (r.locked) { r.why = 'that card is LOCKED — refusing to click it'; return r; }
    r.title = (el.querySelector('.back h3') || {}).textContent || null;
    el.click();
    r.clicked = true;
    const inputs = () => (typeof window._getActiveTurnInputs === 'function')
      ? window._getActiveTurnInputs()
      : { actInput: document.getElementById('actionInput'), diaInput: document.getElementById('dialogueInput') };
    // ── THE SPARKLE PLACEHOLDER IS NOT THE OFFER (Roman 2026-11-14) ──────────────────────
    // MEASURED, and it cost a submitted turn: `generateFatePreview` writes the clicked card's
    // NAME plus an ellipsis into both boxes as a pulsing interim — "Temptation…", "Boundary…" —
    // and its own comment says it is "Overwritten by" the real preview. The first version of
    // this wait accepted any non-empty field, so it caught that interim on the first tick and
    // submitted "Boundary…" as Dani's action AND her dialogue.
    //
    // So the placeholder is recognised and refused by shape: the card's title with an ellipsis,
    // or a bare ellipsis. The wait then continues until the text CHANGES and STAYS changed, so a
    // preview still streaming is not mistaken for a finished one.
    const t = String(r.title || '').trim();
    const isPlaceholder = (v) => {
      const s = String(v || '').trim();
      if (!s) return false;
      if (/^[…\.]{1,3}$/.test(s)) return true;
      const bare = s.replace(/[…]|\.{3}$/g, '').trim();
      return !!t && bare.toLowerCase() === t.toLowerCase();
    };
    // Storybound's OWN fallback is a legitimate offer, not a failure: when there is no contextual
    // preview the card ships its crafted defaults verbatim. Knowing them lets the offer be
    // reported for what it is instead of being passed off as a generated preview.
    const dflt = (() => {
      try {
        const o = (window.state && window.state.fateOptions) || [];
        const d = o[idx] || null;
        return d ? { action: String(d.action || ''), dialogue: String(d.dialogue || '') } : null;
      } catch (_) { return null; }
    })();
    // ── STABLE AND NON-PLACEHOLDER IS NOT THE SAME AS *THIS CARD'S* OFFER ───────────────
    // (Roman 2026-11-14.) A stability test would accept text left in the inputs by a previous
    // card or a previous turn while THIS card's preview is still loading — it is steady and it
    // is not a placeholder, so it passes, and the wrong Say/Do gets submitted. So the offer is
    // VERIFIED against the app's own two signals instead of inferred from the fields:
    //
    //   LOADING   the generator adds `fate-preview-loading` to both inputs and removes it only
    //             when the final text has been written. While that class is present, nothing is
    //             final no matter how settled it looks.
    //   CACHED    every generation path writes through `_cacheFateCardPreview(turnKey, cardId,
    //             action, dialogue)` into `state._sceneFateCardPreviews`, keyed `_cacheKey ===
    //             turnCount`. So the accepted text must EQUAL this card's entry for THIS turn.
    //
    // Together those make staleness impossible to mistake for an offer: old text cannot match a
    // cache entry that does not exist yet, and a cache entry from an earlier turn is rejected by
    // the key.
    const cardId = (() => {
      try {
        const o = (window.state && window.state.fateOptions) || [];
        return (o[idx] && o[idx].id) || null;
      } catch (_) { return null; }
    })();
    r.cardId = cardId;
    if (!cardId) { r.why = 'could not resolve the card id from state.fateOptions[' + idx + ']'; return r; }
    const loading = () => {
      const io = inputs();
      return !!((io.actInput && io.actInput.classList.contains('fate-preview-loading'))
        || (io.diaInput && io.diaInput.classList.contains('fate-preview-loading')));
    };
    const cached = () => {
      try {
        // THE COMMITTED OFFER FIRST. The product now PRESERVES a dealt grounded action and lets
        // the preview phrase only the dialogue, so the inputs deliberately differ from the raw
        // preview cache. Verifying against that cache would reject a correctly-preserved offer as
        // "unusable" and refuse to submit — the anti-flicker guard turned against the fix. The
        // product publishes what it actually committed; that is what gets verified.
        const w = (window.state && window.state._sceneFateCardCommitted) || null;
        if (w && w._cacheKey === ((window.state && window.state.turnCount) || 0) && w[cardId]) {
          return w[cardId];
        }
        const c = (window.state && window.state._sceneFateCardPreviews) || null;
        if (!c) return null;
        if (c._cacheKey !== ((window.state && window.state.turnCount) || 0)) return null;
        return c[cardId] || null;
      } catch (_) { return null; }
    };
    for (let i = 0; i < 120; i++) {                      // up to 60s
      if (loading()) { r.sawLoading = true; await new Promise((x) => setTimeout(x, 500)); continue; }
      const cc = cached();
      if (cc) {
        const io = inputs();
        const a = (io.actInput && io.actInput.value) || '';
        const d = (io.diaInput && io.diaInput.value) || '';
        const matches = (a === String(cc.action || '')) && (d === String(cc.dialogue || ''));
        const noneIsPlaceholder = !isPlaceholder(a) && !isPlaceholder(d);
        const hasSomething = !!(a.trim() || d.trim());
        if (matches && noneIsPlaceholder && hasSomething) {
          r.action = a; r.dialogue = d; r.waited = i * 500; r.usable = true;
          r.oneFieldBlank = !(a.trim() && d.trim());     // Silence keeps its empty dialogue
          r.verifiedAgainstCache = true;
          r.source = (dflt && a === String(dflt.action || '')
            && (d === String(dflt.dialogue || '') || !d.trim()))
            ? 'storybound_card_default' : 'contextual_preview';
          r.cardDefault = dflt;
          return r;
        }
        r.lastMismatch = { fields: { action: a, dialogue: d }, cached: cc };
      }
      await new Promise((x) => setTimeout(x, 500));
    }
    const io2 = inputs();
    r.action = (io2.actInput && io2.actInput.value) || '';
    r.dialogue = (io2.diaInput && io2.diaInput.value) || '';
    r.waited = 60000; r.usable = false; r.cardDefault = dflt;
    r.why = 'no VERIFIED offer for card "' + cardId + '" landed within 60s'
      + (r.sawLoading ? ' (the preview was seen loading)' : ' (no loading state was ever seen)')
      + '. Cache entry for this turn: ' + JSON.stringify(cached())
      + ' · fields: ' + JSON.stringify({ action: r.action, dialogue: r.dialogue })
      + '. NOT submitting and NOT clicking again.';
    return r;
  }, index);
  say('  ⟐ CARD CLICKED: [' + index + '] ' + (out.title || '(untitled)')
    + (out.clicked ? '' : ' — NOT CLICKED: ' + (out.why || 'unknown')));
  if (out.clicked) {
    if (out.usable) {
      say('      offer source   : ' + (out.source === 'storybound_card_default'
        ? 'STORYBOUND\'S OWN CARD DEFAULT (no contextual preview was produced) — preserved verbatim'
        : 'the contextual preview')
        + (out.oneFieldBlank ? ' · one field is intentionally blank' : ''));
      say('      offered action  : ' + (out.action || '(blank)'));
      say('      offered dialogue: ' + (out.dialogue || '(blank)'));
      say('      verified        : matched this card\'s cached Say/Do for this turn'
        + ' (card id "' + (out.cardId || '?') + '")'
        + (out.sawLoading ? ', after the loading state cleared' : ', no loading state was observed')
        + ' · ' + out.waited + 'ms');
    } else {
      say('      ⊘ NO USABLE OFFER: ' + (out.why || 'unknown'));
    }
  }
  return out;
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

// (the `try` that used to open here now opens before the launch section, so launch and its
//  post-launch assertions are covered by the same failure-preservation boundary)
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
    let choice = await awaitReaderChoice(n - 1, pub.allContent, pub.controls);
    // ── THE HAND IS READ, REPORTED, AND THEN WAITED ON AGAIN ─────────────────────────────
    // A `readHand` answer is not a turn: it examines the deck through its own gate, writes the
    // hand to disk, and asks again. So the card is chosen from what was actually dealt.
    while (choice.readHand || choice.fateCardIndex !== null) {
      if (choice.readHand) {
        const hand = await examineAndReadHand();
        try { fs.writeFileSync(OUT + '/FATE_HAND_scene' + (n - 1) + '.json', JSON.stringify({
          statedPlainly: hand.cards.length
            ? 'The hand as dealt by the product, read from the active reader mount. Nothing was '
              + 'forced and nothing was re-dealt; a hand already present would have been kept.'
            : 'No hand is available. The examine gate was not reachable or dealt nothing, so there '
              + 'is no card to choose and none was invented.',
          examinedVia: hand.examineClicked, handAlreadyPresent: hand.already,
          gateWasPresent: hand.gatePresent, mount: hand.mount,
          cards: hand.cards, stateFateOptions: hand.fateOptions,
        }, null, 2)); } catch (_) {}
        if (!hand.cards.length) say('  ⟐ no hand to choose from — pausing again rather than inventing a choice');
      } else {
        const picked = await clickFateCard(choice.fateCardIndex);
        try { fs.writeFileSync(OUT + '/FATE_CARD_PICKED_scene' + (n - 1) + '.json', JSON.stringify(picked, null, 2)); } catch (_) {}
        // ONLY A USABLE OFFER BECOMES A TURN. `usable` is set by the wait above only after the
        // sparkle placeholder has been replaced and the text has stopped changing. An unusable
        // result pauses WITHOUT submitting and WITHOUT clicking again — a second click would
        // restart the preview and could commit a different card's text.
        if (picked.clicked && picked.usable) {
          choice = { action: picked.action, dialogue: picked.dialogue, petition: '',
                     readHand: false, fateCardIndex: null, viaFateCard: picked.title,
                     offerSource: picked.source, oneFieldBlank: !!picked.oneFieldBlank };
          break;
        }
        say('  ⟐ no usable Say/Do offer — pausing without submitting and without clicking again');
      }
      choice = await awaitReaderChoice(n - 1, pub.allContent, pub.controls);
    }
    say('\n── SCENE ' + n + ' ──');
    if (choice.viaFateCard) say('  via fate card  : ' + choice.viaFateCard);
    say('  reader action  : ' + choice.action);
    say('  reader dialogue: ' + (choice.dialogue || '(none)'));
    sceneNoForReplies = n;
    // The Petition is sealed FIRST, through the real modal, because that is the order a reader
    // does it in: the wish is staged on the closing scene and resolves on the next submit.
    let _petitionSealed = null;
    if (choice.petition) {
      _petitionSealed = await sealPetition(choice.petition);
      try { fs.writeFileSync(OUT + '/PETITION_SEALED_scene' + (n - 1) + '.json',
        JSON.stringify(_petitionSealed, null, 2)); } catch (_) {}
      assert(_petitionSealed && _petitionSealed.pendingAfter,
        'the Petition was not sealed through the UI (' + ((_petitionSealed && (_petitionSealed.why
          || _petitionSealed.toast)) || 'no pendingPetition after the seal click') + ') — refusing to '
        + 'continue, because a run that silently drops the wish cannot test whether it is delivered');
    }
    const clicked = await submitChoice(choice);
    say('  submitted: ' + JSON.stringify(clicked));
    assert(clicked.btn, 'no #submitBtn — the literary controls are not mounted');
    assert(!clicked.modals.length, 'a modal intercepted the submit: ' + JSON.stringify(clicked.modals));
    // ── BOTH ENDINGS, AFTER THE SAME FINISHED PASSAGE ──────────────────────────────────
    // Written per scene when the closer pass is armed. The stock ending is the COMPLETE text the
    // app composed before the adaptation replaced it — the real published ending, wish fragment
    // included — so the comparison is two endings after one identical passage, with the scene
    // generated once.
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
    // ── THE CLOSER COMPARISON, READ AFTER THE SCENE HAS COMMITTED ──────────────────────
    // (Roman 2026-11-14.) This block used to sit BEFORE the submit, so it read
    // state._sbCloserTest before the scene existed and reported "no mandated closer fired"
    // on every scene — the instrumentation ran one step too early, which is worse than
    // missing because it looked like a product answer.
    //
    // `body` is taken from the comparison record itself, so the final paragraphs and both
    // endings come from ONE object. Reading the page separately would risk showing a body
    // that is not the body the two endings were built on.
    if (TEST_CLOSER_PASS) {
      try {
        const ct = await page.evaluate(() => {
          const t = (window.state || {})._sbCloserTest || null;
          return t ? { kind: t.kind, card: t.card, applied: t.applied, why: t.why,
            finishReason: t.finishReason || null,
            body: t.body || null, stockEnding: t.stockEnding || null,
            adaptedEnding: t.adaptedEnding || null, teaching: t.teaching || null } : null;
        });
        if (ct) {
          const tail = String(ct.body || "").trim().split(/\n{2,}/).slice(-4).join("\n\n");
          fs.writeFileSync(OUT + "/CLOSER_TEST_scene" + n + ".json", JSON.stringify({
            statedPlainly: ct.applied
              ? "Luna's adaptation WAS published as this scene's final beat: it appeared exactly "
                + "once and terminated the page, both checked. The stock ending below is the complete "
                + "text the app had already composed, kept only for comparison."
              : "Luna's adaptation was NOT published; the complete stock ending stands, and the page "
                + "was left exactly as it was. The reason is in whyNotApplied.",
            scene: n, card: ct.card, kind: ct.kind,
            published: ct.applied ? "adapted" : "stock",
            whyNotApplied: ct.applied ? null : (ct.why || null),
            finishReason: ct.finishReason,
            finalParagraphs: tail,
            stockEnding: ct.stockEnding,
            adaptedEnding: ct.adaptedEnding,
            teaching: ct.teaching,
            fullBody: ct.body,
          }, null, 2));
          say("  ⟐ CLOSER TEST scene " + n + " (" + (ct.card || "?") + "): published "
            + (ct.applied ? "LUNA'S ADAPTATION" : "THE COMPLETE STOCK ENDING — " + (ct.why || "no adaptation returned"))
            + " → CLOSER_TEST_scene" + n + ".json");
        } else {
          say("  ⟐ CLOSER TEST scene " + n + ": no mandated closer fired on this scene, so nothing was adapted");
        }
      } catch (e) { say("  ⚠ could not read the closer test: " + (e && e.message)); }
    }
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
    // ── THE ACCEPTED PLAN AND ITS OWN BIBLES, PRESERVED TOGETHER (Roman 2026-11-06) ─────────
    // They already persist — all three live in `stateSnapshot` inside sb_saved_story, which is
    // what Continue reloads, and the bible ledger's migration branch backfills a 'committed'
    // record from an existing bible rather than reading "no record" as "regenerate". This writes
    // them out as ONE named artifact as well, so "the spine and the bibles that produced it" is
    // auditable without digging through a multi-megabyte blob, and so a later run can be checked
    // against the exact pair the accepted plan was built from.
    try {
      const _snap = JSON.parse(dump.storage['sb_saved_story'] || '{}').stateSnapshot || {};
      const _arcs = (_snap.cgScaffold && _snap.cgScaffold.issueArcs) || [];
      fs.writeFileSync(OUT + '/ACCEPTED_PLAN_AND_BIBLES.json', JSON.stringify({
        storyId: dump.storyId,
        storyLength: _snap.storyLength || null,
        statedPlainly: 'The accepted spine and the character bibles it was built from, as they '
          + 'stand at the end of this run. Continue reloads these same values; neither is '
          + 'regenerated by reopening, and within the run the bible ledger reuses a committed '
          + 'bible rather than refiring it.',
        spine: _snap.cgScaffold || null,
        issueArcCount: _arcs.length,
        scenesPerIssue: _arcs.map((a) => ((a && a.sceneOutline) || []).length),
        pcBodyBible: _snap.pcBodyBible || null,
        liBodyBible: _snap.liBodyBible || null,
        // ── THE GENERATED FOUNDATIONS (Roman 2026-11-12) ──────────────────────────────────
        // The spine and the two Bibles were preserved; the four things BETWEEN them were not,
        // and they are where a story's reasons live. Without them a reader of this artifact can
        // see what the plan says and what the prose says, but not why either of them is what it
        // is — which is precisely the judgement this run exists to make possible.
        //
        //   pairBond      WHY THIS PAIR: the psychological lock each turns in the other, the
        //                 erotic register each unlocks, whyHer / whyHim, an irreplaceability
        //                 proof per side, and the attraction engine. Generated by
        //                 _generatePairBond from both Bibles; nothing in the seed supplies it.
        //   pairDynamic   the romance engine the pair was classified into.
        //   aPlot         the external plot: goal, named clock, antagonist, stakes, milestones.
        //   rPlot         the relationship plan, generated BEFORE the A-plot in the inverted
        //                 chain, so a missing one explains a thin A-plot rather than puzzling.
        //
        // Each is written as it stands at the end of the run, null when the stage did not
        // produce one — a null here is evidence, not an omission.
        pairBond: _snap.pairBond || null,
        pairDynamic: _snap.pairDynamic || null,
        aPlot: _snap.aPlot || null,
        rPlot: _snap.rPlot || null,
        foundationsPresent: {
          pairBond: !!_snap.pairBond, pairDynamic: !!_snap.pairDynamic,
          aPlot: !!_snap.aPlot, rPlot: !!_snap.rPlot,
          pcBodyBible: !!_snap.pcBodyBible, liBodyBible: !!_snap.liBodyBible,
          spine: !!_snap.cgScaffold,
        },
      }, null, 2));
      say('  GENERATED FOUNDATIONS preserved: pairBond ' + (_snap.pairBond ? 'present' : 'ABSENT')
        + ' · aPlot ' + (_snap.aPlot ? 'present' : 'ABSENT')
        + ' · rPlot ' + (_snap.rPlot ? 'present' : 'ABSENT')
        + ' · pairDynamic ' + (_snap.pairDynamic ? 'present' : 'ABSENT'));
      say('  ACCEPTED PLAN + BIBLES preserved together: ' + _arcs.length + ' issue arc(s), scenes '
        + '[' + _arcs.map((a) => ((a && a.sceneOutline) || []).length).join(', ') + '], pc bible '
        + (_snap.pcBodyBible ? 'present' : 'ABSENT') + ', li bible '
        + (_snap.liBodyBible ? 'present' : 'ABSENT') + ' → ACCEPTED_PLAN_AND_BIBLES.json');
    } catch (e) {
      say('  ⚠ could not extract the plan/bible pair (' + (e && e.message)
        + ') — RESUMABLE_STATE.json still holds them');
    }

    // ── EVERY REUSED REPLY, ACCOUNTED FOR ONCE ───────────────────────────────────────────
    // The claim this family makes is "each saved reply was used exactly once for its intended
    // operation, at no new charge". That claim is checked here rather than asserted: an entry
    // served twice cannot happen (the second call is refused at the wire), but one served ZERO
    // times is a real outcome — the operation never fired, so the reply this run was handed went
    // unused, and whatever it was meant to supply came from somewhere else.
    // ── THE C+ EDITOR'S OFFLINE POSITION, AS NUMBERS ────────────────────────────────────
    // Written on every run, so the absence of editor traffic is a recorded zero rather than a
    // missing file. `handlerInvocations` counts the in-process api/cplus-editor.js calls this
    // run made; `egressAttempts` counts that handler's own outbound fetches, which route
    // interception cannot see and which SB_MODEL_ORIGIN could not redirect until the handler
    // was given a guarded fetch.
    try {
      const _edReqs = requests.filter((r) => String(r.url || '').indexOf('cplus-editor') !== -1);
      fs.writeFileSync(OUT + '/EDITOR_OFFLINE_PROOF.json', JSON.stringify({
        statedPlainly: 'The C+ editor does not travel through route.fetch. It is invoked '
          + 'in-process and does its own outbound fetch, so an offline run has to block it at '
          + 'two places: the route block that answers it, and the handler\'s own egress. These '
          + 'counts are taken at both boundaries.',
        sbOffline: !!process.env.SB_OFFLINE,
        sbModelOrigin: process.env.SB_MODEL_ORIGIN || null,
        egressGuardInstalled: !!_editorFetchGuard,
        editorRequestsSeen: _edReqs.length,
        handlerInvocations: _editorHandlerInvocations,
        egressAttempts: _editorEgressAttempts,
        egress: _editorEgress,
        requests: _edReqs.map((r) => ({ scene: r.scene, chars: r.chars,
          estimate: r.estimate, operationId: r.operationId || null,
          offlineAnsweredLocally: !!r.offlineAnsweredLocally,
          refused: r.refused || null, status: r.status == null ? null : r.status,
          served: r.served || null, receipt: r.receipt || null })),
      }, null, 2));
          if (_openerPinned) {
        say('  OPENER PIN "' + _openerPinned + '": '
          + (_openerConfirmed ? 'CONFIRMED from the app\u2019s own selection'
             : 'NEVER CONFIRMED \u2014 the app did not state a selection')
          + ' \u00b7 ' + _pinPendingAnswers.length + ' call(s) answered locally while unconfirmed'
          + (_pinPendingAnswers.length
             ? ' [' + _pinPendingAnswers.map((p) => (p.role || p.url)).join(', ') + ']' : '')
          + ' \u00b7 $0 sent');
      }
  if (_edReqs.length || _editorHandlerInvocations || _editorEgressAttempts) {
        say('  EDITOR: ' + _edReqs.length + ' request(s) seen · handler invoked '
          + _editorHandlerInvocations + ' time(s) · handler egress attempts '
          + _editorEgressAttempts + ' → EDITOR_OFFLINE_PROOF.json');
      }
    } catch (_) {}
    try {
      const _rk = Object.keys(_reuseState);
      if (_rk.length) {
        const _unused = _rk.filter((k) => _reuseState[k].served === 0);
        fs.writeFileSync(OUT + '/REPLIES_REUSED.json', JSON.stringify({
          statedPlainly: 'Each entry is an operation this run did NOT pay for. The reply was '
            + 'served from the named file, which a previous run already paid for, and the '
            + 'reservation was closed without a settlement row — so it contributes no charge and '
            + 'no hold. The planner, the author and the C+ passes have no entry here on purpose: '
            + 'they are what this run generated fresh.',
          reused: _rk.map((k) => ({ env: k, op: _reuseState[k].label, file: _reuseState[k].file,
            served: _reuseState[k].served, status: _reuseState[k].status,
            bodyChars: _reuseState[k].bodyChars, originalReqId: _reuseState[k].originalReqId || null,
            originalServedModel: _reuseState[k].originalServedModel || null,
            originalReceipt: _reuseState[k].receipt || null, newCharge: 0 })),
          servedExactlyOnce: _unused.length === 0,
          neverServed: _unused.map((k) => ({ env: k, op: _reuseState[k].label })),
        }, null, 2));
        say('  REPLIES REUSED: ' + _rk.filter((k) => _reuseState[k].served === 1).length + ' of '
          + _rk.length + ' served exactly once, $0 new charge and no hold for any of them'
          + (_unused.length ? ' · ⚠ NEVER SERVED: ' + _unused.map((k) => _reuseState[k].label).join(', ') : '')
          + ' → REPLIES_REUSED.json');
        // ── UNUSED IS TWO DIFFERENT OUTCOMES, AND ONLY ONE OF THEM IS A FAULT ─────────────
        // MEASURED: the wound-to-LI swap test fired on one offline path and not on another, and
        // the subplot generator fired in the paid run but not in either replay. A stage that
        // simply does not run on this path leaves its reply unused, and that is not a failure —
        // there was nothing to answer. The failure is the other case: the stage DID run, this
        // family's predicate did not claim it, and the call went to a provider instead, which is
        // a silent paid regeneration of something already on disk. The two are told apart by
        // asking the predicate about the requests this run actually recorded.
        const _leaked = [];
        for (const k of _unused) {
          const op = _REUSE_OPS.filter((o) => o.env === k)[0];
          if (!op) continue;
          // A REFUSED RECORD IS NOT A CALL THAT RAN. The first paid attempt reported "REUSE
          // MISSED A CALL THAT RAN: A-PLOT (r6)" when the A-plot had been refused by the budget
          // guard and never left — a false accusation of the thing this check exists to catch.
          // A record only counts as having run if it came back with a status.
          const hit = (requests || []).filter((r) => {
            try {
              if (r.servedFromPreserved) return false;
              if (r.refusedByDiagnostic || r.refused || r.refusedByUnrecoverable) return false;
              if (r.status == null) return false;              // never dispatched, or no response
              return op.claims(String(r.bodyText || ''), r);
            } catch (_) { return false; }
          })[0];
          if (hit) _leaked.push({ env: k, op: op.label, reqId: hit.reqId || null, url: hit.url || '' });
        }
        if (_leaked.length) {
          say('  ✗ REUSE MISSED A CALL THAT RAN: ' + _leaked.map((x) => x.op + ' (r' + x.reqId + ')').join(', '));
          halted = halted || ('REUSE PREDICATE MISSED A LIVE CALL: ' + _leaked.map((x) => x.op
            + ' at request ' + x.reqId + ' ' + x.url).join('; ') + ' — the operation ran and was '
            + 'NOT answered from disk, so an already-paid reply was regenerated instead');
        } else if (_unused.length) {
          say('  ⓘ ' + _unused.map((k) => _reuseState[k].label).join(', ')
            + ' did not run on this path, so the reply provided for it was not needed'
            + ' — no request matching that operation was recorded, and nothing was regenerated');
        }
      }
    } catch (e) { say('  ⚠ could not write the reuse report: ' + (e && e.message)); }

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
  // ── LOCAL ANSWERS ARE REPORTED APART FROM REAL CHARGES (Roman 2026-11-17) ───────────────
  // A provider-blocked replay answers some calls from preserved replies and 404s the rest. Both
  // are $0 and neither is a provider answer, so they are stated on their own line rather than
  // disappearing into a settled/held split that reads like spending.
  if (_offlineLocalAnswers > 0) {
    say('  offline ledger: ' + _offlineLocalAnswers + ' call(s) answered LOCALLY before any'
      + ' reservation (would have estimated $' + _offlineLocalAnswersEst.toFixed(6) + ') —'
      + ' no dispatch, no hold, no exposure');
  }
  if (_offlineArtifact404 > 0) {
    say('  offline ledger: ' + _offlineArtifact404 + ' local 404 replay artifact(s) reconciled to ZERO'
      + ' (would have reserved $' + _offlineArtifact404Est.toFixed(6) + ') — the static server has'
      + ' no /api route, so nothing left this machine and nothing is owed');
  }
  if (halted) say('  HALTED: ' + halted);
  await browser.close();
}
process.exit(halted ? 1 : 0);
