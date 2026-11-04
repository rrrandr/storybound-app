#!/usr/bin/env node
// ══════════════════════════════════════════════════════════════════════════════════════════
// PROVIDER-FREE PREPARATION FOR THE RECOVERY-HANDOFF COMPARISON.
//
// WHAT THE PAID TEST WILL BE: from the post-scene-6 checkpoint, one scene-7 turn with the
// recovery handoff ENABLED and one with it DISABLED, same plan, same reader input, same author,
// then an assessment-only pass after each published scene. This harness proves the mechanics of
// that shape WITHOUT a provider, so the paid run has no setup questions left in it.
//
// THE FOUR THINGS IT HAS TO ESTABLISH:
//   P1  ONE COMMON PRE-TREATMENT ASSESSMENT. Identical saved checkpoints are not a common
//       starting state: each arm's turn would independently ask a model to assess scene 6, and
//       two different verdicts would change the outstanding work before the handoff ever acts.
//       So scene 6 is assessed ONCE, the resulting state is snapshotted, and both arms branch
//       from that snapshot. The original checkpoint is preserved and nothing forces which rows
//       end up owed.
//   P2  THE TURN DOES NOT RE-ASSESS IT. If branching from the snapshot still let the turn run its
//       own scene-6 assessment, the pre-treatment would be pointless.
//   P3  THE ARMS DIFFER IN EXACTLY ONE THING, on the CAPTURED REQUESTS — not on a flag reading.
//   P4  THE ASSESSMENT-ONLY PASS IS REAL AND BOUNDED: the existing verifier runs for the scene
//       just published, and all scene-8 planning and authoring is blocked.
//
// PROVIDER CONTACT: every request is intercepted. Page and assets served; each model door
// answered from a labelled local fixture; anything unmatched ABORTED and counted. Nothing billed.
//
// WHAT THIS IS NOT: it is not the comparison. No model judges anything here and no prose is
// evidence of anything — every reply is a stub written by this file.
//
// usage: node _nf_comparison_prep.mjs            (needs the dev server on :3000)
// ══════════════════════════════════════════════════════════════════════════════════════════
import fs from 'node:fs';
import assert from 'node:assert';
import { chromium } from 'playwright-core';
import { configBody, isAuthOrigin, installSession, makeSession, installEntitledProfileStub }
  from './_test_session_env.mjs';
// THE PROVEN AUTHORIZATION MACHINERY, not a second implementation. estimateUsd/guardDispatch and
// makeSettlement are the same modules _nf_literary_playthrough.mjs dispatches under, so the
// ceiling here is enforced by the arithmetic that has already been used for paid runs.
import { estimateUsd, guardDispatch } from './_fsc_cost_guard.mjs';
import { makeSettlement } from './_nf_cost_settlement.mjs';

// ── LIVE MODE ─────────────────────────────────────────────────────────────────────────────
// Default is provider-free: every model door answered from a fixture. SB_LIVE=1 forwards the
// model doors to real providers and REQUIRES an explicit ceiling — the ceiling is the
// authorization. The prepared configuration is otherwise untouched; only the transport changes.
const LIVE = process.env.SB_LIVE === '1';
const CEILING = Number(process.env.SB_CEILING || 0);
if (LIVE) assert(CEILING > 0, 'SB_LIVE=1 requires SB_CEILING — the ceiling is the authorization');
// ADMISSION MODE NEEDS THE SAME CEILING. Without one, remainingNow() is 0 and the guard refuses
// the first request as over-authorization — which is what happened on the first admission run and
// is a property of the ceiling being absent, not of the request.
if (process.env.SB_ADMISSION === '1') {
  assert(Number(process.env.SB_CEILING || 0) > 0,
    'SB_ADMISSION=1 requires SB_CEILING too — it exercises the same admission arithmetic, so it '
    + 'must run against the same authorization figure');
}
// BUILT FOR ADMISSION MODE TOO — it reconciles there against a stubbed receipt, so the same
// settlement arithmetic runs. Gating it on LIVE alone left it null and reconcile() threw.
const settlement = (LIVE || process.env.SB_ADMISSION === '1') ? makeSettlement(CEILING) : null;
const inflight = [];
let settledTotal = 0, heldTotal = 0, halted = null;
const outstanding = () => inflight.filter((h) => h.open).reduce((n, h) => n + h.estimate, 0);
const remainingNow = () => CEILING - settledTotal - heldTotal - outstanding();
const reserve = (estimate, stage, model) => { const h = { stage, model, estimate, open: true }; inflight.push(h); return h; };
function reconcile(h, usage, model, noResponse, why) {
  h.open = false;
  const row = settlement.record({ stage: h.stage, model: model || h.model, estimate: h.estimate,
    usage, noResponse, why });
  if (row.kind === 'settled') { settledTotal += row.usd; } else { heldTotal += h.estimate; }
  return row;
}
const spendRows = [];
const admissionRows = [];

// ── THE AGREED AUTHOR CONFIGURATION — RUN3'S OWN OVERRIDE, RESTORED ───────────────────────
// Reading `_authorRouting.handoffDone` tells you which author the ROUTER chose; it does not send
// the request anywhere. RUN3 dispatched its continuations by REWRITING the author request onto
// /api/anthropic-proxy with claude-haiku-5-5, and that rewrite is what made "Haiku authored it"
// true. Without it these requests go to the role's Grok chain, which is not the agreed
// configuration — and is what the captured admission rows showed. Copied verbatim from
// _nf_literary_playthrough.mjs's AUTHOR_OVERRIDE.haiku, including its detector and its pinned
// rates. PRODUCTION ROUTING IS NOT CHANGED: this is the harness's declared override, applied at
// the intercepted dispatch, exactly as RUN3 applied it.
const HAIKU = { label: 'Haiku', requested: 'claude-haiku-5-5', route: '/api/anthropic-proxy',
  capField: 'max_tokens', cap: 20000, rate: { in: 0.50e-6, out: 2.50e-6 }, cpt: 2.65 };
// WHICH REQUEST IS THE AUTHOR — by the prompt's own content, never a role label. RUN3's measured
// continuation author arrived as STRUCTURE_GENERATOR.
const isRun3AuthorRequest = (bodyText) => /SCENE CONTINUATION \(HARD/.test(bodyText)
  || /PROTAGONIST OPENING BEAT \(HARD/.test(bodyText);
// The shared cost guard has no rate for claude-haiku-5-5 and fail-closes on it, so the override
// prices its own model from its own pinned rates and the Anthropic chars-per-token ratio measured
// for this packet family. Thinking bills inside the cap, so the cap IS the output bound.
const estimateHaikuUsd = (chars) => (chars / HAIKU.cpt) * HAIKU.rate.in + HAIKU.cap * HAIKU.rate.out;
// The body conversion RUN3 performs: pin the model, replace the cap, and drop the two fields the
// Anthropic route rejects on Claude 5 (temperature, response_format). `effort` is pinned, not left
// to the model's adaptive default.
function haikuBody(body) {
  const b = Object.assign({}, body || {}, { model: HAIKU.requested, preferredModel: HAIKU.requested });
  delete b.max_tokens; delete b.max_completion_tokens;
  b[HAIKU.capField] = HAIKU.cap;
  delete b.temperature; delete b.response_format;
  b.effort = 'medium';
  return b;
}
const overrideRows = [];

// ── ADMISSION-ONLY MODE ───────────────────────────────────────────────────────────────────
// SB_ADMISSION=1 runs the LIVE admission code — effective-model resolution, the cost guard, the
// reservation and the reconciliation — and then serves the FIXTURE instead of dispatching. The
// earlier dry branch returned its fixture BEFORE any of that code, which is exactly why a defect
// in admission survived preparation.
const ADMISSION = process.env.SB_ADMISSION === '1';
const STUB_USAGE = { prompt_tokens: 1000, completion_tokens: 200 };

// ── THE EFFECTIVE MODEL, FROM THE PROXY'S OWN SELECTION RULES ─────────────────────────────
// WHY THIS EXISTS. The live run halted when a request arrived with NO `model` field: production
// lets the proxy resolve the model server-side for some roles, estimateUsd could not bound the
// cost, and the guard refused it — correctly. The fix is not an allowance; it is to resolve the
// model the way the proxy does, then price the real request.
//
// THE RULES ARE READ FROM api/proxy.js AT STARTUP rather than copied here, so this cannot drift
// from the proxy, and if they cannot be read every no-model request stays BLOCKED.
const PROXY_RULES = (function () {
  try {
    const src = fs.readFileSync('api/proxy.js', 'utf8');
    const nocomment = (t) => t.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    const chain = {};
    const cm = src.match(/const ROLE_MODEL_CHAIN = \{([\s\S]*?)\n\};/);
    if (cm) {
      const body = nocomment(cm[1]);
      const re = /([A-Z_]+):\s*\[([^\]]*)\]/g;
      let x;
      while ((x = re.exec(body))) {
        chain[x[1]] = x[2].split(',').map((t) => t.trim().replace(/\/\/.*$/, '').trim()
          .replace(/^['"]|['"]$/g, '')).filter(Boolean);
      }
    }
    const ov = (src.match(/const _SB_MODEL_OVERRIDES = \[([^\]]*)\]/) || [])[1];
    const overrides = ov ? ov.split(',').map((t) => t.trim().replace(/['"]/g, '')).filter(Boolean) : [];
    const mt = (src.match(/max_tokens = (\d+),/) || [])[1];
    const dr = (src.match(/role = '([A-Z_]+)',\s*\/\/ Orchestration role/) || [])[1];
    // _resolveGrokModel collapses every legacy grok-* name to grok-4.3 unless the caller's
    // _sbModelOverride is one of the pass-through names.
    const collapse = /return \{ model: 'grok-4\.3', effort \};/.test(src) ? 'grok-4.3' : null;
    const ok = Object.keys(chain).length > 0 && overrides.length > 0 && !!mt && !!dr && !!collapse;
    return { ok, chain, overrides, defaultMaxTokens: mt ? Number(mt) : null, defaultRole: dr || null,
      collapse, roles: Object.keys(chain) };
  } catch (e) { return { ok: false, why: String(e && e.message) }; }
})();

// Returns { model, maxOut, how } or { model: null, why } — and a null model stays BLOCKED.
function resolveEffectiveModel(url, body) {
  const b = body || {};
  if (b.model) {
    return { model: String(b.model), maxOut: Number(b.max_tokens) || null,
      how: 'the request names its own model' };
  }
  if (!/\/api\/proxy\b/.test(url)) {
    return { model: null, why: 'no model in the body and this route\'s selection rules are not '
      + 'mirrored here (' + url + ')' };
  }
  if (!PROXY_RULES.ok) {
    return { model: null, why: 'the proxy\'s own selection rules could not be read from '
      + 'api/proxy.js, so the effective model is unknown' };
  }
  const role = b.role || PROXY_RULES.defaultRole;
  const chain = PROXY_RULES.chain[role];
  if (!chain || !chain.length) {
    return { model: null, why: 'role "' + role + '" has no chain in ROLE_MODEL_CHAIN — the proxy '
      + 'answers 400 INVALID_ROLE without dispatching' };
  }
  let intent = chain[0];
  if (b.preferredModel && chain.indexOf(String(b.preferredModel)) !== -1) intent = String(b.preferredModel);
  if (b._noFallback) intent = String(b._sbModelOverride || b.preferredModel || chain[0]);
  const sb = b._sbModelOverride;
  const model = (sb && PROXY_RULES.overrides.indexOf(String(sb)) !== -1)
    ? String(sb) : PROXY_RULES.collapse;
  const maxOut = Number(b.max_tokens) || PROXY_RULES.defaultMaxTokens;
  return { model, maxOut, role, chainIntent: intent,
    how: 'api/proxy.js ROLE_MODEL_CHAIN[' + role + '][0]="' + intent + '" → _resolveGrokModel → '
      + model + ', output allowance ' + maxOut };
}

const ORIGIN = process.env.SB_ORIGIN || 'http://localhost:3000';
const RUN = process.env.SB_RUN_DIR
  || '/Users/romantsukerman/storybound-diag/_nf_story_test_RUN3/run_2026-11-02T19-03-47-893Z_29351';
const OUT = '_nf_comparison_prep_out';
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

let PASS = 0, FAIL = 0, INCONCLUSIVE = 0;
const FAILURES = [], INCONCLUSIVES = [];
const line = (s) => console.log(s);
// FILENAMES MUST NOT CARRY PATH SEPARATORS. A phase label of "assess/A" turned an evidence
// filename into a directory that does not exist, and the run died writing it.
const safe = (t) => String(t).replace(/[^A-Za-z0-9._-]+/g, '-');
const section = (t) => { line(''); line('='.repeat(88)); line(t); line('='.repeat(88)); };
const note = (l, v) => line('  ----  ' + l + ' :: ' + String(v).replace(/\n/g, ' ').slice(0, 420));
function check(label, ok, detail) {
  if (ok) { PASS++; line('  PASS  ' + label); }
  else { FAIL++; FAILURES.push(label); line('  FAIL  ' + label + (detail ? '  :: ' + String(detail).slice(0, 420) : '')); }
}
function inconclusive(label, why) {
  INCONCLUSIVE++; INCONCLUSIVES.push(label + ' — ' + why);
  line('  ????  ' + label + '\n        INCONCLUSIVE: ' + why);
}

const STATE6 = JSON.parse(fs.readFileSync(RUN + '/STATE_after_scene6.json', 'utf8'));
const STORAGE = STATE6.storage;
const SAVE = JSON.parse(STORAGE.sb_saved_story);
const STORY_ID = SAVE.storyId;
const STARTER = SAVE.stateSnapshot._starterId;
const SCENE6_VERDICT = JSON.parse(JSON.parse(
  fs.readFileSync(RUN + '/STATE_after_scene10.json', 'utf8')).storage.sb_saved_story)
  .stateSnapshot._committedState.deliveryLog['6'];
const ROW6_TEXT = String(SCENE6_VERDICT.milestoneText || '');

// THE READER INPUT, unchanged from the proposal and identical in both arms.
const READER_ACTION = 'I ask Julian how he knew the relic was never on the inventory';

// FIXTURE PROSE for the published scene 7 — synthetic, written for this file, never manuscript.
// It deliberately contains a line the scene-7 verifier fixture can cite verbatim.
const PROSE_A = [
  '[SYNTHETIC TEST PROSE — ARM A — NOT MANUSCRIPT]',
  'The clearing had emptied by the time I got the question out, and Julian answered it the way a man answers something he has rehearsed alone.',
  'He said my father had been his charge, and that the inquiry closed with nothing written down.',
  'Then he picked up the two halves of the cup from the stall without being asked and held them while I set the last of the gold along the seam.',
].join('\n\n');
const PROSE_B = [
  '[SYNTHETIC TEST PROSE — ARM B — NOT MANUSCRIPT]',
  'The clearing had emptied by the time I got the question out, and Julian answered it the way a man answers something he has rehearsed alone.',
  'He said my father had been his charge, and that the inquiry closed with nothing written down.',
  'I did not ask him anything else, and he did not offer.',
].join('\n\n');

// ── CALL LEDGER ─────────────────────────────────────────────────────────────────────────
let PHASE = 'boot', ARM = '-';
const calls = [];
let pageServed = 0, offOrigin = 0;
const plannerReqs = [], authorReqs = [], verifierReqs = [];
let RECOVERY_REPLY = null;          // what the stub planner answers, per arm
// EVERY PROSE DOOR ANSWERS WITH THIS ARM'S TEXT. A later prose pass (line editor, renderer)
// replaced the published page with the other arm's fixture when only the author door was
// arm-aware, and the two arms' published scenes then read identically.
const armProse = () => (ARM === 'B' ? PROSE_B : PROSE_A);
let BLOCK_PLANNING = false;         // the assessment-only pass refuses planning/authoring

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();
const consoleLines = [];
page.on('console', (m) => {
  const t = m.text();
  if (/COMMIT|VERIFIER|DELIVERY|RECOVERY|MILESTONE|SEAL|SCENE-ASSIGNMENT|PLAN-SPINE/i.test(t)) {
    consoleLines.push(PHASE + '/' + ARM + ' :: ' + t);
  }
});
page.on('pageerror', (e) => consoleLines.push(PHASE + '/' + ARM + ' :: PAGEERROR ' + e.message));

// INSTALLED ONCE, NOT ON EVERY LOAD. The first version re-installed the original checkpoint on
// every page load, which silently overwrote the pre-treatment snapshot each arm was supposed to
// branch from — so both arms resumed the unassessed checkpoint and each re-assessed scene 6.
await page.addInitScript(([storage]) => {
  try {
    if (!localStorage.getItem('sb_saved_story')) {
      Object.keys(storage).forEach((k) => { try { localStorage.setItem(k, storage[k]); } catch (_) {} });
    }
  } catch (_) {}
  try { window._forceDeckMandate = false; } catch (_) {}
}, [STORAGE]);
await installSession(page, makeSession());
await installEntitledProfileStub(page, {});

const envelope = (url, b, payload, model) => (/mistral-proxy|\/api\/proxy\b|deepseek-proxy/.test(url)
  ? { id: 'fx', object: 'chat.completion', model: model || (b && b.model), usage: {},
      _orchestration: { role: b && b.role, model: model || (b && b.model) },
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: payload } }] }
  : { ok: true, content: payload, model: model || (b && b.model),
      resolvedModel: model || (b && b.model), choices: [{ message: { content: payload } }] });

const STATIC = /\/api\/(geo|csp-report|beta-events|bug-report-awards|telemetry)\b/;
const IMAGE = /\/api\/(image|bfl-kontext|visualize-flux|grok-image|dashscope-image|img-proxy|cine-styled-manifest|mouth-approve|verify-anatomy)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 },
                '/api/refund-fortune': { success: true, fortunesRemaining: 9999 } };

await ctx.route('**/*', async (route) => {
  const req = route.request();
  const full = req.url();
  const url = full.replace(/^https?:\/\/[^/]+/, '');
  if (!/\/api\//.test(url)) {
    if (full.startsWith(ORIGIN)) { pageServed += 1; return route.continue(); }
    offOrigin += 1; return route.abort();
  }
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(full)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (STATIC.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  if (IMAGE.test(url)) {
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==' }) });
  }
  const lk = Object.keys(LOCAL).find((x) => url.startsWith(x));
  if (lk) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL[lk]) });

  let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
  const msgs = (b && b.messages) || [];
  const sys = String((msgs.find((m) => m.role === 'system') || {}).content || '');
  const usr = String((msgs.find((m) => m.role === 'user') || {}).content || '');
  const both = sys + usr;
  const role = String((b && b.role) || '?');
  const rec = { phase: PHASE, arm: ARM, role, requestedModel: (b && b.model) || null,
    servedModel: null, sys: sys.length, usr: usr.length, door: null, answered: false };
  calls.push(rec);
  const give = (payload, door, model) => {
    rec.answered = true; rec.door = door; rec.servedModel = model || (b && b.model) || null;
    return route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify(envelope(url, b, payload, rec.servedModel)) });
  };

  // ── LIVE: FORWARD TO THE REAL PROVIDER, UNDER THE CEILING ──────────────────────────────
  // The assessment-only pass still refuses the planning and authoring doors — that is the
  // prepared mechanism, and a refused route never reaches a provider, so it cannot spend.
  if (LIVE || ADMISSION) {
    const isPlanner = /You are the SCENE-SPINE planner/.test(sys);
    const isAuthorD = (b && b.author === true)
      || /YOU ARE WRITING AS S\. TORY BOUND|STORYBOUND ARCHITECTURE LAWS|THIS IS THE LAST PROSE IN THE SCENE/i.test(both);
    const isSkeleton = /narrative skeletons for fiction scenes|CAUSAL_OUTLINE/.test(both);
    if (BLOCK_PLANNING && (isPlanner || (isAuthorD && both.length > 20000) || isSkeleton)) {
      rec.door = (isPlanner ? 'PLANNER' : isAuthorD ? 'AUTHOR' : 'SKELETON') + '(BLOCKED by the assessment-only pass)';
      if (isPlanner) plannerReqs.push({ phase: PHASE, arm: ARM, blocked: true, sys, usr });
      if (isAuthorD) authorReqs.push({ phase: PHASE, arm: ARM, blocked: true, sys: sys.length, usr: usr.length });
      return route.abort();
    }
    if (halted) { rec.door = 'HALTED(' + halted + ')'; return route.abort(); }
    // (1) RESOLVE THE EFFECTIVE MODEL the way the proxy does. A request that names no model is
    // not unpriceable in principle — the proxy's role chain decides it — but if that resolution
    // fails the request stays BLOCKED. Nothing is substituted to make pricing easier.
    // THE AUTHOR OVERRIDE COMES FIRST. Its destination and model are decided by the harness's
    // declared configuration, not by the role chain, so it does not go through resolveEffectiveModel.
    const isOverrideAuthor = isRun3AuthorRequest(both);
    const eff = isOverrideAuthor
      ? { model: HAIKU.requested, maxOut: HAIKU.cap, override: true,
          dest: ORIGIN + HAIKU.route,
          how: 'RUN3 author override: rewritten onto ' + HAIKU.route + ' as ' + HAIKU.requested
            + ', cap ' + HAIKU.cap + ', effort medium, temperature/response_format dropped' }
      : resolveEffectiveModel(url, b);
    if (!eff.model) {
      halted = 'unresolved_effective_model';
      rec.door = 'REFUSED(unresolved_effective_model)';
      spendRows.push({ phase: PHASE, arm: ARM, role, refused: 'unresolved_effective_model',
        why: eff.why, requestedModel: (b && b.model) || null, chars: both.length,
        estimate: null, remaining: remainingNow() });
      fs.writeFileSync(OUT + '/REFUSED_' + String(spendRows.length).padStart(3, '0') + '_'
        + safe(PHASE) + '_' + safe(ARM) + '_' + safe(role) + '.txt',
        `=== REFUSED unresolved_effective_model\n=== ${eff.why}\n=== url=${url}\n`
        + `=== body keys: ${Object.keys(b || {}).join(',')}\n\n`
        + `=== SYSTEM (${sys.length}) ===\n${sys}\n\n=== USER (${usr.length}) ===\n${usr}\n`);
      return route.abort();
    }
    // (2) PRICE THE ACTUAL REQUEST AND ITS OUTPUT ALLOWANCE — the proxy's own max_tokens default
    // when the body omits one, not the guard's generic unknown-output figure.
    let g;
    if (eff.override) {
      // Priced from the override's own pinned rates — the shared guard fail-closes on this model.
      const est = estimateHaikuUsd(both.length);
      g = { allowed: est <= remainingNow(), estimate: est,
        reason: est <= remainingNow() ? null : 'over_remaining_authorization' };
      overrideRows.push({ phase: PHASE, arm: ARM, role, chars: both.length,
        dest: ORIGIN + HAIKU.route, model: HAIKU.requested, cap: HAIKU.cap, estimate: est,
        fromUrl: url });
    } else {
      const priced = eff.maxOut ? Object.assign({}, b, { max_tokens: eff.maxOut }) : (b || {});
      g = guardDispatch(priced, { model: eff.model, remainingAuthorization: remainingNow() });
    }
    if (!g.allowed) {
      halted = g.reason;
      rec.door = 'REFUSED(' + g.reason + ')';
      spendRows.push({ phase: PHASE, arm: ARM, role, refused: g.reason,
        effectiveModel: eff.model, how: eff.how,
        estimate: Number.isFinite(g.estimate) ? g.estimate : null, remaining: remainingNow() });
      return route.abort();
    }
    rec.effectiveModel = eff.model; rec.resolvedHow = eff.how; rec.admissionEstimate = g.estimate;
    const h = reserve(g.estimate, PHASE + '/' + ARM + '/' + role, eff.model);
    // (3) ADMISSION-ONLY: the admission code above has run for real; the reply is the fixture and
    // nothing is dispatched. Execution falls through to the fixture branches below.
    if (ADMISSION) {
      const row0 = reconcile(h, STUB_USAGE, eff.model, false, null);
      spendRows.push({ phase: PHASE, arm: ARM, role, requestedModel: (b && b.model) || null,
        effectiveModel: eff.model, how: eff.how, admitted: true, estimate: g.estimate,
        settlement: row0.kind, usd: row0.usd == null ? null : row0.usd,
        remainingAfter: remainingNow(), chars: both.length, stubbed: true });
      admissionRows.push({ phase: PHASE, arm: ARM, role, url,
        dest: eff.dest || url, override: !!eff.override,
        requestedModel: (b && b.model) || null, effectiveModel: eff.model, how: eff.how,
        estimate: g.estimate, sys: sys.length, usr: usr.length,
        bodyKeys: Object.keys(b || {}) });
    } else {
      let resp = null, text = '', usage = null, failed = null;
      try {
        resp = eff.override
          ? await route.fetch({ timeout: 300000, url: eff.dest,
              postData: JSON.stringify(haikuBody(b)) })
          : await route.fetch({ timeout: 300000 });
        text = await resp.text();
      } catch (e) { failed = String((e && e.message) || e); }
      let parsed = null;
      try { parsed = JSON.parse(text); } catch (_) {}
      usage = (parsed && (parsed.usage || (parsed.choices && parsed.choices[0] && parsed.choices[0].usage))) || null;
      const servedModel = (parsed && (parsed.resolvedModel || parsed.model)) || eff.model;
      const row = reconcile(h, usage, servedModel, !!failed, failed);
    rec.answered = !failed; rec.servedModel = servedModel;
    rec.door = 'LIVE(' + role + (failed ? ':FAILED' : ':' + (resp && resp.status()) ) + ')';
    spendRows.push({ phase: PHASE, arm: ARM, role, requestedModel: (b && b.model) || null,
      servedModel, status: resp ? resp.status() : null, estimate: g.estimate,
      settlement: row.kind, usd: row.usd == null ? null : row.usd, why: row.why || null,
      remainingAfter: remainingNow(), chars: both.length, failed });
    // EVIDENCE. Every live request and reply preserved, per phase and arm.
      const tag = String(spendRows.length).padStart(3, '0') + '_' + safe(PHASE) + '_' + safe(ARM) + '_' + safe(role);
    fs.writeFileSync(OUT + '/LIVE_' + tag + '.txt',
      `=== phase=${PHASE} arm=${ARM} role=${role} requested=${b && b.model} served=${servedModel}
`
      + `=== settlement=${row.kind} usd=${row.usd} estimate=${g.estimate} remaining=${remainingNow()}

`
      + `=== SYSTEM (${sys.length}) ===
${sys}

=== USER (${usr.length}) ===
${usr}

`
      + `=== REPLY (${text.length}) ===
${text}
`);
    if (isPlanner) plannerReqs.push({ phase: PHASE, arm: ARM, blocked: false, sys, usr, live: true,
      reply: text, file: 'LIVE_' + tag + '.txt' });
    if (isAuthorD && both.length > 20000) authorReqs.push({ phase: PHASE, arm: ARM, blocked: false,
      role, sys, usr, live: true, file: 'LIVE_' + tag + '.txt', requestedModel: (b && b.model) || null });
    if (/RUNTIME COMMIT verifier/i.test(sys)) {
      const assessedRef = ((usr.match(/PROPOSALS FOR THIS SCENE[\s\S]{0,200}?ref (prop:\d+:\d+)/) || [])[1]) || null;
      verifierReqs.push({ phase: PHASE, arm: ARM, assessedRef, live: true,
        asksRow6: assessedRef === 'prop:4:5', chars: both.length });
    }
      if (failed) return route.abort();
      return route.fulfill({ response: resp, body: text });
    }
  }

  // ── THE COMMIT VERIFIER ────────────────────────────────────────────────────────────────
  // A CONTROLLED RECONSTRUCTION, not a response replay: the provider's original reply was never
  // preserved, only the VERDICT the engine derived from it. For the scene-6 assessment this
  // rebuilds a reply whose fields reproduce that recorded verdict; for a scene-7 assessment it
  // answers MISSED with no milestone claim, asserting nothing about prose this file wrote.
  if (/RUNTIME COMMIT verifier/i.test(sys)) {
    const mentionsRow6 = usr.indexOf(ROW6_TEXT.slice(0, 120)) !== -1;
    const refs = [...usr.matchAll(/\bprop:\d+:\d+\b/g)].map((m) => m[0]);
    // WHICH SCENE IS BEING ASSESSED is the ref under "PROPOSALS FOR THIS SCENE", not whether row
    // 6's text appears anywhere — a scene-7 request carries row 6 in its still-owed block too.
    const assessedRef = ((usr.match(/PROPOSALS FOR THIS SCENE[\s\S]{0,200}?ref (prop:\d+:\d+)/) || [])[1]) || refs[0] || null;
    const asksRow6 = assessedRef === 'prop:4:5';
    const n = verifierReqs.length + 1;
    fs.writeFileSync(OUT + '/VERIFIER_REQUEST_' + n + '_' + safe(PHASE) + '_' + safe(ARM) + '.txt',
      `=== phase=${PHASE} arm=${ARM} asksRow6=${asksRow6} refs=${refs.join(',')}\n\n`
      + `=== SYSTEM ===\n${sys}\n\n=== USER ===\n${usr}\n`);
    verifierReqs.push({ phase: PHASE, arm: ARM, asksRow6, mentionsRow6, assessedRef, refs,
      chars: both.length });
    if (asksRow6) {
      return give(JSON.stringify({ delivery: SCENE6_VERDICT.aggregateDelivery,
        transition_position: -1, first_irreversible_position: 40,
        milestone_delivery: SCENE6_VERDICT.milestoneDelivery,
        milestone_evidence: SCENE6_VERDICT.milestoneEvidence,
        per_proposal: refs.slice(0, 1).map((r2) => ({ ref: r2, delivery: 'MISSED',
          evidence: '', precondition_evidence: '', reason: 'incomplete_rendering' })),
        prereq_watch: [], milestone_watch: [] }),
      'COMMIT_VERIFIER(controlled reconstruction of the recorded scene-6 verdict)', 'ministral-8b-2512');
    }
    return give(JSON.stringify({ delivery: 'MISSED', transition_position: -1,
      first_irreversible_position: 40, milestone_delivery: 'MISSED', milestone_evidence: '',
      per_proposal: refs.slice(0, 1).map((r2) => ({ ref: r2, delivery: 'MISSED',
        evidence: '', precondition_evidence: '', reason: 'incomplete_rendering' })),
      prereq_watch: [], milestone_watch: [] }),
    'COMMIT_VERIFIER(neutral — asserts nothing about this file\'s prose)', 'ministral-8b-2512');
  }

  // ── THE SCENE-SPINE PLANNER ────────────────────────────────────────────────────────────
  if (/You are the SCENE-SPINE planner/.test(sys)) {
    if (BLOCK_PLANNING) {
      rec.door = 'PLANNER(BLOCKED by the assessment-only pass)';
      plannerReqs.push({ phase: PHASE, arm: ARM, blocked: true, sys, usr });
      return route.abort();
    }
    const n = plannerReqs.length + 1;
    fs.writeFileSync(OUT + '/PLANNER_REQUEST_' + n + '_' + safe(ARM) + '.txt',
      `=== arm=${ARM} role=${role} model=${b && b.model}\n\n`
      + `=== SYSTEM (${sys.length}) ===\n${sys}\n\n=== USER (${usr.length}) ===\n${usr}\n`);
    plannerReqs.push({ phase: PHASE, arm: ARM, blocked: false, sys, usr, file: 'PLANNER_REQUEST_' + n + '_' + ARM + '.txt' });
    const row = Number((usr.match(/STILL OWED — assigned at scene (\d+)/) || [])[1]) || null;
    const reply = {
      tactical_move: 'make him answer for the inventory history in front of her',
      state_change_precondition: 'Julian has not said aloud that he was her father\'s Chayr',
      state_change: 'Julian names himself as Augar\'s Chayr while she holds the ledger page',
      forces_choice: 'forces Lirael to choose between pressing him for the closed file or shielding him',
      branch_a: 'she presses him for the closed file in front of a witness',
      branch_b: 'she shields him and takes the question to the Circle herself',
      event_slots: { precondition: 'Julian is present in the scene', actor: 'Julian',
        action: 'names himself as Augar\'s Chayr', target: 'Lirael',
        exit_state: 'Lirael now knows Julian was her father\'s Chayr',
        mechanism_grounding: 'ordinary' },
      mechanism_grounding: 'ordinary',
    };
    if (RECOVERY_REPLY && row) reply.recovery = Object.assign({ row }, RECOVERY_REPLY);
    return give(JSON.stringify(reply), 'SCENE_SPINE_PLANNER(captured+answered)', 'grok-4-fast-reasoning');
  }

  // ── THE AUTHOR ─────────────────────────────────────────────────────────────────────────
  const isAuthorShape = (b && b.author === true)
    || /YOU ARE WRITING AS S\. TORY BOUND|STORYBOUND ARCHITECTURE LAWS|THIS IS THE LAST PROSE IN THE SCENE/i.test(both);
  if (isAuthorShape && both.length > 20000) {
    if (BLOCK_PLANNING) {
      rec.door = 'AUTHOR(BLOCKED by the assessment-only pass)';
      authorReqs.push({ phase: PHASE, arm: ARM, blocked: true, sys: sys.length, usr: usr.length });
      return route.abort();
    }
    const n = authorReqs.length + 1;
    const fname = 'AUTHOR_REQUEST_' + n + '_' + safe(ARM) + '.txt';
    fs.writeFileSync(OUT + '/' + fname,
      `=== arm=${ARM} role=${role} requestedModel=${b && b.model}\n\n`
      + `=== SYSTEM (${sys.length}) ===\n${sys}\n\n=== USER (${usr.length}) ===\n${usr}\n`);
    authorReqs.push({ phase: PHASE, arm: ARM, blocked: false, role, sys, usr, file: fname,
      requestedModel: (b && b.model) || null });
    // ANSWERED, so the scene is actually PUBLISHED and the assessment-only pass has prose to read.
    return give(armProse(), 'AUTHOR(answered so the scene publishes)', (b && b.model) || null);
  }

  if (/canonicalization and normalization engine for Storybound|archetypal distillation/.test(both)) {
    return give(JSON.stringify({ canonical_instruction: usr.slice(0, 120), changed: false,
      rejection_reason: null, substitutions: [] }), 'NORMALIZATION', 'gpt-4o-mini');
  }
  if (/CHARACTER MEMORY EXTRACTOR/.test(both)) {
    return give(JSON.stringify({
      characters: [{ name: 'Julian', present: true, relationshipToPC: null, newLayer: null, vehicle: 'none', framing: null }],
      scene: { chargeTier: 'high', interpretiveDensity: 'measured', loadedSentenceRatio: 0.3 },
      sceneState: { setting: 'the emptied ceremony clearing', charactersPresent: ['Lirael', 'Julian'],
        protagonistStatus: 'still holding the ledger page', decisiveChange: 'he answered',
        activeInterlocutor: 'Julian', protagonistAlone: false },
      relations: [] }), 'MEMORY_EXTRACTOR', 'gpt-4o-mini');
  }
  if (/narrative skeletons for fiction scenes|CAUSAL_OUTLINE/.test(both)) {
    if (BLOCK_PLANNING) {
      rec.door = 'SKELETON(BLOCKED by the assessment-only pass)';
      return route.abort();
    }
    return give(JSON.stringify({
      environment_anchor: 'the emptied ceremony clearing',
      structural_pacing: 'tightening', narrative_density: 'close', dialogue_ratio: 'measured',
      beat_style: 'pressure then answer', tension_rhythm: 'rising',
      staged_characters: [{ name: 'Lirael', presence_mode: 'IN_PERSON', role: 'protagonist' },
        { name: 'Julian', presence_mode: 'IN_PERSON', role: 'love_interest' }],
      interlocutor_placement: 'he is close enough to be answered',
      causal_outline: [{ beat: 'she asks about the inventory history' },
        { beat: 'he names himself as her father\'s Chayr', link: 'therefore', from: 1 },
        { beat: 'she decides what to do with it', link: 'therefore', from: 2 }],
    }), 'SKELETON', 'gpt-4o-mini');
  }
  if (/Return ONLY JSON|Output STRICT JSON|respond with JSON|JSON ONLY/i.test(both)) {
    return give(JSON.stringify({ ok: true, notes: [], beats: [], characters: [], items: [],
      hardBeats: [], lines: [], panels: [], summary: 'fixture' }), 'GENERIC_JSON(' + role + ')', 'gpt-4o-mini');
  }
  return give(armProse(), 'GENERIC_PROSE(' + role + ')', 'gpt-4o-mini');
});

// ── HELPERS RUN IN THE PAGE ─────────────────────────────────────────────────────────────
const entitle = () => page.evaluate(() => {
  const S = window.state;
  S.subscribed = true; S.tier = 'novella'; S.access = 'sub'; S.fortunes = 9999999;
  S.storypassEligible = true; S.storyLength = 'novella';
  window._forceDeckMandate = false;
});

// THE ASSESSMENT-ONLY PASS — a TURN whose PLANNING AND AUTHORING DOORS ARE BLOCKED.
// TRACED, not assumed: there is no separate production entry for "assess the previous scene".
// The commit pass runs INSIDE a turn, before the planner, so an assessment-only pass is an
// ordinary turn with everything after the commit refused. Driving _commitScene by hand instead
// was refused by production itself — [COMMIT-SCENE:REFUSED] "no unit owns this prose
// (scene_ledger:scene 6)" — because page ownership is resolved from the scene ledger and a
// hand-built identity does not satisfy it. So this uses the real path and blocks the rest.
const assessOnlyTurn = async (label) => {
  BLOCK_PLANNING = true;
  const vBefore = verifierReqs.length, pBefore = plannerReqs.length, aBefore = authorReqs.length;
  const before = await page.evaluate(() => ({
    logKeys: Object.keys(((window.state._committedState || {}).deliveryLog) || {}),
    through: (window.state._committedState || {})._committedThroughScene,
    turnCount: window.state.turnCount,
    pages: window.StoryPagination.getPageCount() }));
  await entitle();
  const clicked = await page.evaluate(async (action) => {
    const S = window.state;
    S.subscribed = true; S.tier = 'novella'; S.access = 'sub'; S.fortunes = 9999999;
    S.storypassEligible = true; window._forceDeckMandate = false;
    const a = document.getElementById('actionInput'); if (a) a.value = action;
    const d = document.getElementById('dialogueInput'); if (d) d.value = '';
    const btn = document.getElementById('submitBtn');
    if (!btn) return 'no submit control';
    btn.disabled = false; btn.click();
    await new Promise((x) => setTimeout(x, 150000));
    return 'clicked';
  }, READER_ACTION);
  const after = await page.evaluate(() => ({
    logKeys: Object.keys(((window.state._committedState || {}).deliveryLog) || {}),
    through: (window.state._committedState || {})._committedThroughScene,
    turnCount: window.state.turnCount,
    pages: window.StoryPagination.getPageCount(),
    verdicts: ((window.state._committedState || {}).deliveryLog) || {} }));
  BLOCK_PLANNING = false;
  return { label, clicked, before, after,
    verifier: verifierReqs.slice(vBefore),
    plannerBlocked: plannerReqs.slice(pBefore).filter((x) => x.blocked).length,
    authorBlocked: authorReqs.slice(aBefore).filter((x) => x.blocked).length,
    plannerServed: plannerReqs.slice(pBefore).filter((x) => !x.blocked).length,
    authorServed: authorReqs.slice(aBefore).filter((x) => !x.blocked).length,
    apiCalls: calls.filter((c) => c.phase === PHASE).length };
};

const snapshotState = () => page.evaluate(() => {
  window.__saveStorySnapshot();
  return localStorage.getItem('sb_saved_story');
});

const owedNow = (scene) => page.evaluate((n) => {
  const S = window.state;
  let owed = [];
  try { owed = window._recoveryOwedRows(S, n).map((r) => r.n + ':' + r.status); } catch (_) {}
  const h = window._recoveryHandoff(S, n);
  return { owed, handoffRow: h && h.obligation ? h.obligation.n : null,
    ranking: h && h.ranking, rankingStatus: h && h.rankingStatus,
    rowStatuses: [2, 3, 4, 5, 6, 7].map((k) => {
      try { return k + ':' + window._outlineDeliveryStatus(S, k).status; } catch (_) { return k + ':?'; }
    }) };
}, scene);

let PRE_SNAPSHOT = null;
const results = {};

try {
  // ══════════════════════════════════════════════════════════════════════════════════════
  section('P1 — ONE COMMON PRE-TREATMENT ASSESSMENT, BRANCHED FROM AFTERWARDS');
  // ══════════════════════════════════════════════════════════════════════════════════════
  PHASE = 'pretreatment'; ARM = 'pre';
  await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => typeof window.continueStory === 'function'
    && typeof window._recoveryHandoff === 'function' && typeof window._commitScene === 'function'
    && typeof window.__buildCommitSceneIdentity === 'function'
    && typeof window.__saveStorySnapshot === 'function' && !!window.StoryPagination, { timeout: 60000 });

  const installed = await page.evaluate(() => {
    const sv = JSON.parse(localStorage.getItem('sb_saved_story'));
    return { storyId: sv.storyId,
      logKeys: Object.keys(sv.stateSnapshot._committedState.deliveryLog || {}),
      turnCount: sv.stateSnapshot.turnCount };
  });
  note('the checkpoint as installed', JSON.stringify(installed));
  check('the ORIGINAL checkpoint is preserved — no verdict inserted for scene 6',
    installed.storyId === STORY_ID && installed.logKeys.join(',') === '2,3,4,5',
    installed.logKeys.join(','));

  const withheld = await page.evaluate((starter) => {
    const sp = (window.STARTER_PLANS || {})[starter];
    if (!sp || !Array.isArray(sp.scenes)) return { ok: false };
    window.__withheldRows = sp.scenes; sp.scenes = [];
    return { ok: true, withheldCount: window.__withheldRows.length,
      seedPresent: !!((window.STARTER_SEEDS || {})[starter]) };
  }, STARTER);
  check('fresh-plan withholding applied before Continue, seed untouched',
    withheld.ok && withheld.withheldCount === 20 && withheld.seedPresent === true,
    JSON.stringify(withheld));

  const resumed = await page.evaluate(async (id) => {
    try { await Promise.race([window.continueStory(id), new Promise((r) => setTimeout(r, 90000))]); }
    catch (e) { return { ok: false, threw: String(e && e.message) }; }
    const S = window.state;
    // THE AUTHOR IS PINNED BY THE CHECKPOINT ITSELF. _authorRouting.handoffDone is persisted, so
    // author-cache-router.js:305 takes the sticky branch and selects Haiku with NO cache probe —
    // which is what makes "same author model in both arms" a fact of the save rather than a hope.
    const ar = S._authorRouting || {};
    return { ok: true, turnCount: S.turnCount, pages: window.StoryPagination.getPageCount(),
      handoffDone: ar.handoffDone === true, handoffReason: ar.handoffReason || null };
  }, STORY_ID);
  await entitle();
  note('the resume', JSON.stringify(resumed));
  check('the real Continue workflow restored the story at turnCount 5',
    resumed.ok === true && resumed.turnCount === 5, JSON.stringify(resumed));
  check('THE AUTHOR IS PINNED BY THE SAVE: the sticky handoff is already recorded, so both arms'
    + ' select the same author with no cache probe',
    resumed.handoffDone === true, 'handoffDone=' + resumed.handoffDone
    + ' reason=' + resumed.handoffReason);

  const beforePre = await owedNow(7);
  note('row statuses BEFORE the pre-treatment', beforePre.rowStatuses.join('  '));
  note('owed BEFORE the pre-treatment', beforePre.owed.join('  ') || '(none)');

  const pre = await assessOnlyTurn('pre-treatment');
  note('the pre-treatment pass', JSON.stringify({ clicked: pre.clicked,
    logBefore: pre.before.logKeys.join(','), logAfter: pre.after.logKeys.join(','),
    throughBefore: pre.before.through, throughAfter: pre.after.through,
    pagesBefore: pre.before.pages, pagesAfter: pre.after.pages }));
  note('its /api calls', pre.apiCalls + ' total · verifier assessed '
    + pre.verifier.map((v) => v.assessedRef).join(',')
    + ' · planner blocked ' + pre.plannerBlocked + ' · author blocked ' + pre.authorBlocked);
  check('the pre-treatment ran the EXISTING verifier exactly once, and it was asked about the'
    + ' scene-6 obligation', pre.verifier.length === 1 && pre.verifier[0].asksRow6 === true,
    pre.verifier.length + ' verifier call(s)');
  check('…and nothing was planned or authored — those doors were refused',
    pre.plannerServed === 0 && pre.authorServed === 0 && pre.plannerBlocked >= 1,
    'planner served ' + pre.plannerServed + '/blocked ' + pre.plannerBlocked
    + ' · author served ' + pre.authorServed + '/blocked ' + pre.authorBlocked);
  check('…so NO scene was published by the pre-treatment',
    pre.after.pages === pre.before.pages, pre.before.pages + ' → ' + pre.after.pages);
  const preVerdictKey = Object.keys(pre.after.verdicts)
    .filter((k) => pre.before.logKeys.indexOf(k) === -1)[0] || null;
  note('the verdict key the pre-treatment wrote', String(preVerdictKey));
  const preVerdict = preVerdictKey ? pre.after.verdicts[preVerdictKey] : null;
  check('…it produced a verdict the checkpoint did not have',
    !!preVerdict, JSON.stringify(pre.after.logKeys));
  if (preVerdict) {
    note('the verdict it produced', 'key ' + preVerdictKey + ' · storyScene '
      + preVerdict.storyScene + ' · asked=' + preVerdict.milestoneAsked
      + ' milestone=' + preVerdict.milestoneDelivery
      + ' aggregate=' + preVerdict.aggregateDelivery);
    check('…and it is the verdict for the scene-6 obligation, keyed to story scene 6',
      Number(preVerdict.storyScene) === 6 && preVerdictKey === '6',
      'key ' + preVerdictKey + ' storyScene ' + preVerdict.storyScene);
  }

  const afterPre = await owedNow(7);
  note('row statuses AFTER the pre-treatment', afterPre.rowStatuses.join('  '));
  note('owed AFTER the pre-treatment', afterPre.owed.join('  ') || '(none)');
  note('WHAT IS AND IS NOT ASSERTED HERE', 'that ONE assessment ran and that both arms branch from '
    + 'its result. WHICH rows end up owed is reported, not required: nothing forces 3, 5 and 6 to '
    + 'be the owed set, and in the paid run this assessment is a genuine model call.');
  check('the pre-treatment changed the assessed state — there is now something to branch from',
    JSON.stringify(beforePre.rowStatuses) !== JSON.stringify(afterPre.rowStatuses),
    'before ' + beforePre.rowStatuses.join(',') + ' / after ' + afterPre.rowStatuses.join(','));

  PRE_SNAPSHOT = await snapshotState();
  fs.writeFileSync(OUT + '/PRE_TREATMENT_SNAPSHOT.json', PRE_SNAPSHOT);
  const snapCheck = JSON.parse(PRE_SNAPSHOT);
  check('the post-assessment state is snapshotted by the REAL writer, carrying that verdict',
    Object.keys(snapCheck.stateSnapshot._committedState.deliveryLog || {}).indexOf('6') !== -1,
    Object.keys(snapCheck.stateSnapshot._committedState.deliveryLog || {}).join(','));
  results.pre = { verdict: pre.verdict, owed: afterPre.owed, handoffRow: afterPre.handoffRow,
    ranking: afterPre.ranking };

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('P2/P3 — THE TWO ARMS, BRANCHED FROM THAT ONE STATE');
  // ══════════════════════════════════════════════════════════════════════════════════════
  const runArm = async (arm, disable) => {
    ARM = arm; PHASE = 'turn'; BLOCK_PLANNING = false;
    RECOVERY_REPLY = disable ? null
      : { disposition: 'incorporate',
          why: 'he is already holding the cup halves, so the repair finishes inside this confrontation' };
    const vBeforeArm = verifierReqs.length;
    const pBefore = plannerReqs.length, aBefore = authorReqs.length;
    // BRANCH FROM THE PRE-TREATMENT SNAPSHOT, through the real Continue workflow. The snapshot is
    // written AFTER the reload: an init script cannot be the thing that installs it, or the next
    // load's init script wins and the arm silently resumes the unassessed checkpoint instead.
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => typeof window.continueStory === 'function'
      && typeof window._recoveryHandoff === 'function', { timeout: 60000 });
    await page.evaluate((snap) => { localStorage.setItem('sb_saved_story', snap); }, PRE_SNAPSHOT);
    await page.evaluate(([starter, off]) => {
      const sp = (window.STARTER_PLANS || {})[starter];
      if (sp) { window.__withheldRows = sp.scenes; sp.scenes = []; }
      if (off) window._recoveryHandoffV0 = false; else { try { delete window._recoveryHandoffV0; } catch (_) {} }
    }, [STARTER, disable]);
    const r = await page.evaluate(async (id) => {
      try { await Promise.race([window.continueStory(id), new Promise((x) => setTimeout(x, 90000))]); }
      catch (e) { return { ok: false, threw: String(e && e.message) }; }
      return { ok: true, turnCount: window.state.turnCount,
        logKeys: Object.keys((window.state._committedState || {}).deliveryLog || {}),
        handoffOff: window._recoveryHandoffV0 === false };
    }, STORY_ID);
    await entitle();
    const owedAtStart = await owedNow(7);
    const submitted = await page.evaluate(async (action) => {
      const S = window.state;
      S.subscribed = true; S.tier = 'novella'; S.access = 'sub'; S.fortunes = 9999999;
      S.storypassEligible = true; window._forceDeckMandate = false;
      const a = document.getElementById('actionInput'); if (a) a.value = action;
      const d = document.getElementById('dialogueInput'); if (d) d.value = '';
      const btn = document.getElementById('submitBtn');
      if (!btn) return 'no submit control';
      btn.disabled = false; btn.click();
      await new Promise((x) => setTimeout(x, 240000));
      return 'clicked';
    }, READER_ACTION);
    const after = await page.evaluate(() => {
      const S = window.state;
      const pages = window.StoryPagination.getPages() || [];
      return { turnCount: S.turnCount, pageCount: pages.length,
        lastPage: String(pages[pages.length - 1] || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
        logKeys: Object.keys((S._committedState || {}).deliveryLog || {}),
        dispositions: S._recoveryDispositions || {},
        handoffOff: window._recoveryHandoffV0 === false };
    });
    // ── THE POST-PUBLICATION ASSESSMENT, FOR THIS ARM, AGAINST ITS OWN SCENE AND STATE ──────
    // Run here rather than once at the end: the arms branch from the same snapshot in turn, so by
    // the time the second arm has run, the first arm's published scene and state are gone. The
    // earlier version assessed only whichever arm happened to run last.
    PHASE = 'assess-' + arm;
    const assessed = await assessOnlyTurn('assessment of arm ' + arm + "'s published scene");
    const newKey = Object.keys(assessed.after.verdicts)
      .filter((k) => assessed.before.logKeys.indexOf(k) === -1)[0] || null;
    PHASE = 'turn';
    return { arm, disable, resume: r, owedAtStart, submitted, after,
      verifierInTurn: verifierReqs.slice(vBeforeArm),
      plannerInTurn: plannerReqs.slice(pBefore), authorInTurn: authorReqs.slice(aBefore),
      assessed, assessedKey: newKey,
      assessedVerdict: newKey ? assessed.after.verdicts[newKey] : null };
  };

  const A = await runArm('A', false);
  const B = await runArm('B', true);
  results.A = { owedAtStart: A.owedAtStart.owed, dispositions: A.after.dispositions,
    pageCount: A.after.pageCount, logKeys: A.after.logKeys };
  results.B = { owedAtStart: B.owedAtStart.owed, dispositions: B.after.dispositions,
    pageCount: B.after.pageCount, logKeys: B.after.logKeys };

  note('arm A owed at the start of its turn', A.owedAtStart.owed.join('  '));
  note('arm B owed at the start of its turn', B.owedAtStart.owed.join('  '));
  check('BOTH ARMS START FROM THE SAME ASSESSED STATE',
    A.owedAtStart.owed.join(',') === B.owedAtStart.owed.join(',')
    && A.resume.logKeys.join(',') === B.resume.logKeys.join(','),
    'A ' + A.owedAtStart.owed.join(',') + ' | B ' + B.owedAtStart.owed.join(','));
  check('…and that state already carries the pre-treatment verdict, so neither arm needs it',
    A.resume.logKeys.indexOf('6') !== -1 && B.resume.logKeys.indexOf('6') !== -1,
    A.resume.logKeys.join(','));

  // P2 — THE TURN MUST NOT RE-ASSESS SCENE 6.
  const reRow6A = A.verifierInTurn.filter((v) => v.asksRow6);
  const reRow6B = B.verifierInTurn.filter((v) => v.asksRow6);
  note('verifier calls inside arm A\'s turn', A.verifierInTurn.map((v) => v.assessedRef).join(',') || 'none');
  note('verifier calls inside arm B\'s turn', B.verifierInTurn.map((v) => v.assessedRef).join(',') || 'none');
  check('NEITHER ARM RE-ASSESSES SCENE 6 — the pre-treatment is the only assessment of it',
    reRow6A.length === 0 && reRow6B.length === 0,
    'A ' + reRow6A.length + ' · B ' + reRow6B.length);

  // P3 — THE DIFFERENCE, ON THE CAPTURED REQUESTS.
  const pA = A.plannerInTurn[0], pB = B.plannerInTurn[0];
  if (!pA || !pB) {
    inconclusive('the arms differ in exactly one thing, on the captured requests',
      'a planner request was not captured in both arms (A ' + A.plannerInTurn.length
      + ', B ' + B.plannerInTurn.length + ')');
  } else {
    check('ENABLED: arm A\'s planner request carries the recovery question and asks for a disposition',
      /OUTSTANDING WORK FROM AN EARLIER SCENE — DECIDE WHAT THIS SCENE DOES ABOUT IT/.test(pA.usr)
      && /"recovery"/.test(pA.sys));
    check('DISABLED: arm B\'s carries NEITHER the block NOR the schema key',
      !/OUTSTANDING WORK FROM AN EARLIER SCENE/.test(pB.usr) && !/"recovery"/.test(pB.sys));
    // EXCISE THE BLOCK, start to end, rather than truncating at it: the block is appended inside
    // a longer payload and a split would also drop everything after it.
    const bStart = pA.usr.indexOf('\nOUTSTANDING WORK FROM AN EARLIER SCENE');
    const bEnd = pA.usr.indexOf('"superseded_by": "" }', bStart);
    const stripA = (bStart >= 0 && bEnd > bStart)
      ? (pA.usr.slice(0, bStart) + pA.usr.slice(bEnd + '"superseded_by": "" }'.length)) : pA.usr;
    note('planner payload sizes', 'A ' + pA.usr.length + ' · B ' + pB.usr.length
      + ' · A with the block excised ' + stripA.length);
    check('…and the rest of the planner payload is the same work — the block is the only addition',
      Math.abs(stripA.length - pB.usr.length) < 400,
      'A minus block ' + stripA.length + ' vs B ' + pB.usr.length);
    // THE LAST *DISPATCHED* AUTHOR REQUEST, not the last entry. The per-arm assessment pass now
    // runs inside runArm and records BLOCKED author attempts whose sys/usr are lengths, not text —
    // taking the last entry tested a regex against a number and silently reported "absent".
    const dispatchedA = A.authorInTurn.filter((x) => !x.blocked);
    const dispatchedB = B.authorInTurn.filter((x) => !x.blocked);
    const aA = dispatchedA[dispatchedA.length - 1];
    const aB = dispatchedB[dispatchedB.length - 1];
    if (aA && aB) {
      check('the DECISION reaches arm A\'s author request, and nothing like it reaches arm B\'s',
        /THIS SCENE ALSO CARRIES UNFINISHED WORK FROM SCENE \d+|STILL OWED FROM SCENE \d+, AND DELIBERATELY NOT/.test(aA.sys + aA.usr)
        && !/THIS SCENE ALSO CARRIES UNFINISHED WORK FROM SCENE|DELIBERATELY NOT THIS SCENE'S WORK/.test(aB.sys + aB.usr),
        'A has it: ' + /UNFINISHED WORK FROM SCENE/.test(aA.sys + aA.usr)
        + ' · B has it: ' + /UNFINISHED WORK FROM SCENE/.test(aB.sys + aB.usr));
      check('…and arm B still receives the same earlier-row delivery reporting, so it is not'
        + ' deprived of context — only of the decision',
        /EARLIER IN THIS ISSUE/.test(aB.sys + aB.usr));
    } else {
      inconclusive('the decision reaches the author request',
        'an author request was not captured in both arms');
    }
    check('A DISPOSITION IS RECORDED IN ARM A ONLY',
      Object.keys(A.after.dispositions).length > 0
      && Object.keys(B.after.dispositions).length === 0,
      'A ' + JSON.stringify(Object.keys(A.after.dispositions))
      + ' · B ' + JSON.stringify(Object.keys(B.after.dispositions)));
  }
  check('BOTH ARMS PUBLISHED A SCENE', A.after.pageCount === 7 && B.after.pageCount === 7,
    'A ' + A.after.pageCount + ' pages · B ' + B.after.pageCount);
  note('arm A published text (first 140)', A.after.lastPage.slice(0, 140));
  note('arm B published text (first 140)', B.after.lastPage.slice(0, 140));
  // The bracketed label is stripped by production's own prose normalisation, so provenance is
  // checked on a distinctive SENTENCE that only one arm's fixture contains.
  check('the published text is the arm\'s own — provenance is retained per arm',
    /picked up the two halves of the cup/.test(A.after.lastPage)
    && /did not ask him anything else/.test(B.after.lastPage)
    && !/picked up the two halves of the cup/.test(B.after.lastPage),
    'A tail: ' + A.after.lastPage.slice(-80) + ' || B tail: ' + B.after.lastPage.slice(-80));
  check('the reader input was identical and unchanged in both arms',
    A.submitted === 'clicked' && B.submitted === 'clicked');

  // ══════════════════════════════════════════════════════════════════════════════════════
  section('P4 — THE ASSESSMENT-ONLY PASS AFTER PUBLICATION, FOR BOTH ARMS');
  // ══════════════════════════════════════════════════════════════════════════════════════
  // The ordinary scene-7 turn assesses scene 6 and publishes scene 7. It does NOT produce a
  // scene-7 verdict, so each arm needs this pass to know what its own scene actually delivered.
  [A, B].forEach(function (X) {
    const a7 = X.assessed;
    note('arm ' + X.arm + ' assessment pass', JSON.stringify({ clicked: a7.clicked,
      logBefore: a7.before.logKeys.join(','), logAfter: a7.after.logKeys.join(','),
      pagesBefore: a7.before.pages, pagesAfter: a7.after.pages }));
    note('  its /api calls', a7.apiCalls + ' total · verifier assessed '
      + a7.verifier.map((v) => v.assessedRef).join(',')
      + ' · planner blocked ' + a7.plannerBlocked + ' · author blocked ' + a7.authorBlocked);
    check('arm ' + X.arm + ': the assessment produced a verdict for the scene IT published',
      !!X.assessedVerdict && Number(X.assessedVerdict.storyScene) === 7,
      'key ' + X.assessedKey + ' storyScene ' + (X.assessedVerdict && X.assessedVerdict.storyScene));
    check('arm ' + X.arm + ': …using the EXISTING verifier, exactly once',
      a7.verifier.length === 1, a7.verifier.length + ' call(s)');
    check('arm ' + X.arm + ': …with further planning and authoring blocked',
      a7.plannerServed === 0 && a7.authorServed === 0,
      'planner served ' + a7.plannerServed + ' · author served ' + a7.authorServed);
    check('arm ' + X.arm + ':   RED CONTROL: the block bit — the planner door was reached and refused',
      a7.plannerBlocked >= 1, a7.plannerBlocked + ' refused');
    check('arm ' + X.arm + ': …and no scene was published by the pass',
      a7.after.pages === a7.before.pages, a7.before.pages + ' → ' + a7.after.pages);
    if (X.assessedVerdict) {
      note('  arm ' + X.arm + ' scene-7 verdict', 'asked=' + X.assessedVerdict.milestoneAsked
        + ' milestone=' + X.assessedVerdict.milestoneDelivery
        + ' aggregate=' + X.assessedVerdict.aggregateDelivery);
    }
  });
  check('BOTH ARMS WERE ASSESSED — not just whichever ran last',
    !!A.assessedVerdict && !!B.assessedVerdict
    && A.assessed.verifier.length === 1 && B.assessed.verifier.length === 1,
    'A ' + A.assessedKey + ' · B ' + B.assessedKey);
  results.assess = { A: { key: A.assessedKey, verdict: A.assessedVerdict, apiCalls: A.assessed.apiCalls },
    B: { key: B.assessedKey, verdict: B.assessedVerdict, apiCalls: B.assessed.apiCalls } };

} catch (err) {
  line('HARNESS ERROR: ' + (err && err.message));
  FAIL++; FAILURES.push('harness threw: ' + (err && err.message));
} finally {
  fs.writeFileSync(OUT + '/CONSOLE.log', consoleLines.join('\n'));
  fs.writeFileSync(OUT + '/CALLS.json', JSON.stringify(calls, null, 2));
  fs.writeFileSync(OUT + '/RESULTS.json', JSON.stringify(results, null, 2));
  await browser.close();
}

// ══════════════════════════════════════════════════════════════════════════════════════
section('P5 — THE ADMISSION PATH, ON THE REQUEST THAT WAS REFUSED');
// ══════════════════════════════════════════════════════════════════════════════════════
// The live attempt halted on a /api/proxy request that named no model. This section exercises the
// LIVE admission code — effective-model resolution, then the cost guard — with provider contact
// stubbed, which the earlier dry branch never did because it answered before that code ran.
note('the proxy rules read from api/proxy.js', PROXY_RULES.ok
  ? ('roles ' + PROXY_RULES.roles.join(',') + ' · collapse → ' + PROXY_RULES.collapse
     + ' · pass-through overrides ' + PROXY_RULES.overrides.join(',')
     + ' · default role ' + PROXY_RULES.defaultRole
     + ' · default output allowance ' + PROXY_RULES.defaultMaxTokens)
  : ('COULD NOT BE READ: ' + PROXY_RULES.why));
check('the proxy\'s selection rules were read from its own source, not copied here',
  PROXY_RULES.ok === true, JSON.stringify(PROXY_RULES).slice(0, 200));

// THE EXACT SHAPE THAT WAS REFUSED: /api/proxy, role SPECIALIST_RENDERER, no model, no
// max_tokens — reconstructed from the preserved CALLS row (sys 1106 / usr 741).
const refusedShape = { role: 'SPECIALIST_RENDERER',
  messages: [{ role: 'system', content: 'x'.repeat(1106) }, { role: 'user', content: 'y'.repeat(741) }] };
const effRefused = resolveEffectiveModel('/api/proxy', refusedShape);
note('resolution of the refused request', JSON.stringify(effRefused));
check('it now RESOLVES to an effective model, by the proxy\'s own role chain',
  effRefused.model === 'grok-4.3' && effRefused.role === 'SPECIALIST_RENDERER',
  JSON.stringify(effRefused));
check('…and to the proxy\'s own output allowance, not a generic unknown-output figure',
  effRefused.maxOut === PROXY_RULES.defaultMaxTokens && effRefused.maxOut === 1000,
  String(effRefused.maxOut));
const gRefused = guardDispatch(Object.assign({}, refusedShape, { max_tokens: effRefused.maxOut }),
  { model: effRefused.model, remainingAuthorization: 0.947904 });
note('its admission estimate', '$' + (Number.isFinite(gRefused.estimate)
  ? gRefused.estimate.toFixed(8) : String(gRefused.estimate))
  + ' · allowed=' + gRefused.allowed);
check('…and the guard now ADMITS it with a finite, bounded estimate',
  gRefused.allowed === true && Number.isFinite(gRefused.estimate) && gRefused.estimate > 0,
  JSON.stringify(gRefused).slice(0, 200));
check('  RED CONTROL: the OLD admission — guarding on the body\'s model — still refuses the same'
  + ' request, which is the defect this closes',
  guardDispatch(refusedShape, { model: refusedShape.model || null,
    remainingAuthorization: 0.947904 }).allowed === false);

// UNRESOLVED-MODEL CONTROLS — these must STAY refused. Nothing is substituted to make them price.
const ctlUnknownRole = resolveEffectiveModel('/api/proxy', { role: 'NO_SUCH_ROLE',
  messages: [{ role: 'user', content: 'z'.repeat(500) }] });
const ctlUnknownRoute = resolveEffectiveModel('/api/some-other-proxy',
  { messages: [{ role: 'user', content: 'z'.repeat(500) }] });
check('CONTROL: a role with no chain stays unresolved and therefore BLOCKED',
  ctlUnknownRole.model === null && /INVALID_ROLE/.test(String(ctlUnknownRole.why)),
  JSON.stringify(ctlUnknownRole));
check('CONTROL: a route whose selection rules are not mirrored stays unresolved and BLOCKED',
  ctlUnknownRoute.model === null && /not\s+mirrored here/.test(String(ctlUnknownRoute.why)),
  JSON.stringify(ctlUnknownRoute));
check('CONTROL: a request that names its own model is priced on that model, not re-resolved',
  resolveEffectiveModel('/api/proxy', { model: 'claude-haiku-4-5-20251001' }).model
    === 'claude-haiku-4-5-20251001');

if (ADMISSION) {
  // ── THE AUTHOR OVERRIDE, VERIFIED ON THE OUTGOING REQUEST ───────────────────────────────
  note('author requests rewritten by the override', overrideRows.length + ' — '
    + overrideRows.map((r) => r.phase + '/' + r.arm + ' ' + r.role + ' ' + r.chars + ' chars → '
      + r.dest + ' as ' + r.model).join(' | '));
  const mainAuthors = overrideRows.filter((r) => r.phase === 'turn');
  check('BOTH main author requests are rewritten onto the agreed destination and model',
    mainAuthors.length === 2
    && mainAuthors.every((r) => r.dest === ORIGIN + '/api/anthropic-proxy'
      && r.model === 'claude-haiku-5-5' && r.cap === 20000),
    JSON.stringify(mainAuthors.map((r) => r.arm + ':' + r.dest + ':' + r.model)));
  check('…one per arm, so neither arm authors on a different model',
    mainAuthors.filter((r) => r.arm === 'A').length === 1
    && mainAuthors.filter((r) => r.arm === 'B').length === 1,
    JSON.stringify(mainAuthors.map((r) => r.arm)));
  check('…and the destination is verified on the OUTGOING request, not read off the saved flag',
    admissionRows.filter((r) => r.override).every((r) => /anthropic-proxy/.test(String(r.dest))),
    JSON.stringify(admissionRows.filter((r) => r.override).map((r) => r.dest)));
  check('  RED CONTROL: without the override these same requests would resolve to the role chain,'
    + ' which is what the earlier capture showed',
    resolveEffectiveModel('/api/proxy', { role: 'STRUCTURE_GENERATOR' }).model === 'grok-4.3');
  const noModel = admissionRows.filter((r) => !r.requestedModel);
  note('admitted requests that named no model', noModel.length + ' — '
    + [...new Set(noModel.map((r) => r.role + '→' + r.effectiveModel))].join(', '));
  check('EVERY request in the prepared configuration passed the LIVE admission path',
    admissionRows.length > 0 && !halted,
    admissionRows.length + ' admitted · halted=' + String(halted));
  check('…including the no-model requests that stopped the live attempt',
    noModel.length > 0 && noModel.every((r) => !!r.effectiveModel),
    JSON.stringify(noModel.map((r) => r.role)));
  fs.writeFileSync(OUT + '/ADMISSION.json', JSON.stringify(admissionRows, null, 2));
  fs.writeFileSync(OUT + '/OVERRIDE.json', JSON.stringify(overrideRows, null, 2));
  // ── THE TOTAL FOR THE CORRECTED CONFIGURATION ───────────────────────────────────────────
  const total = admissionRows.reduce((n, r) => n + r.estimate, 0);
  const CARRIED = 0.002096;
  section('ADMISSION TOTAL FOR THE CORRECTED CONFIGURATION');
  note('captured admission rows', admissionRows.length);
  note('their sum', '$' + total.toFixed(6));
  note('the prior attempt\'s carried reservation, kept separate', '$' + CARRIED.toFixed(6));
  note('together', '$' + (total + CARRIED).toFixed(6) + ' of the $' + CEILING.toFixed(2)
    + ' authorization · $' + (CEILING - total - CARRIED).toFixed(6) + ' unused');
  note('per phase', Object.entries(admissionRows.reduce((m, r) => {
    const k = r.phase + '/' + r.arm; m[k] = (m[k] || 0) + r.estimate; return m; }, {}))
    .map(([k, v]) => k + ' $' + v.toFixed(6)).join(' · '));
  note('WHAT THIS FIGURE IS', 'a FIXTURE-BASED ESTIMATE of the pre-dispatch reservations this '
    + 'configuration would hold. It is NOT a billing bound and NOT an upper bound: the request '
    + 'sizes come from fixture replies, a live reply of a different length changes them, and '
    + 'several models still have no local rate so their charges would not resolve.');
  check('the corrected configuration\'s estimated admission fits inside the authorization',
    total + CARRIED < CEILING, '$' + (total + CARRIED).toFixed(6) + ' vs $' + CEILING.toFixed(2));
} else {
  inconclusive('every request in the prepared configuration passes the live admission path',
    'this run did not use SB_ADMISSION=1, so only the two reconstructed shapes above were '
    + 'put through the admission code');
}

// ══════════════════════════════════════════════════════════════════════════════════════
section('PROVENANCE AND PROVIDER-FREE ATTESTATION');
// ══════════════════════════════════════════════════════════════════════════════════════
const byPhase = {};
calls.forEach((c) => {
  const k = c.phase + '/' + c.arm;
  byPhase[k] = byPhase[k] || { total: 0, answered: 0, blocked: 0 };
  byPhase[k].total += 1;
  if (c.answered) byPhase[k].answered += 1;
  if (/BLOCKED/.test(String(c.door))) byPhase[k].blocked += 1;
});
Object.keys(byPhase).forEach((k) => note('calls in ' + k, JSON.stringify(byPhase[k])));
const served = {};
calls.forEach((c) => { if (c.servedModel) served[c.servedModel] = (served[c.servedModel] || 0) + 1; });
note('served models recorded per call', JSON.stringify(served));
note('page/asset responses served', pageServed);
note('off-origin requests aborted', offOrigin);
if (LIVE) {
  const refused = spendRows.filter((r) => r.refused);
  note('LIVE MODE — authorization', '$' + CEILING.toFixed(2) + ' ceiling · settled $'
    + settledTotal.toFixed(6) + ' · held $' + heldTotal.toFixed(6)
    + ' · remaining $' + remainingNow().toFixed(6));
  note('live dispatches', spendRows.filter((r) => !r.refused).length
    + ' · refused by the guard ' + refused.length + ' · halted ' + String(halted));
  fs.writeFileSync(OUT + '/SPEND.json', JSON.stringify({ ceiling: CEILING, settledTotal,
    heldTotal, remaining: remainingNow(), halted, rows: spendRows }, null, 2));
  try {
    fs.writeFileSync(OUT + '/SETTLEMENT.json', JSON.stringify(
      { totals: settlement.totals(), rows: settlement.rows }, null, 2));
    settlement.report(line);
  } catch (_) {}
  check('the run stayed inside its authorization', remainingNow() >= 0,
    'remaining $' + remainingNow().toFixed(6));
} else {
  check('every /api request was answered from a local fixture or deliberately blocked — zero'
    + ' provider dispatches',
    calls.every((c) => c.answered || /BLOCKED/.test(String(c.door))),
    calls.filter((c) => !c.answered && !/BLOCKED/.test(String(c.door))).length + ' unaccounted');
}
note('NOT established here', 'anything about story quality. No model judged anything, every reply '
  + 'is a stub written by this file, and the published prose is this file\'s synthetic text. What '
  + 'is established is the SHAPE of the paid run: one common assessment, two arms branched from '
  + 'it, one difference visible on the captured requests, and a bounded assessment-only pass.');

line('');
line('='.repeat(88));
line('  PASS ' + PASS + ' · FAIL ' + FAIL + ' · INCONCLUSIVE ' + INCONCLUSIVE);
for (const f of FAILURES) line('    FAILED: ' + f);
for (const i of INCONCLUSIVES) line('    INCONCLUSIVE: ' + i);
line('  These are the tested cases. They are not a statement about untested paths.');
line('='.repeat(88));
process.exit(FAIL ? 1 : 0);
