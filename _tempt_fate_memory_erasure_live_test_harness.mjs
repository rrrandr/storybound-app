// TEMPT FATE MEMORY-ERASURE LIVE-TEST HARNESS (Roman/Codex review, 2026-09-24)
//
// Roman: "There is no executable memory-erasure live-test harness in the repo yet — only the
// authorization sheet. The proposed request-count and dollar reservations therefore are not yet
// enforced by code... Build the actual live-test harness dry."
//
// This IS that harness — the same script that would run the paid test, run here in fully-stubbed
// DRY mode. It defaults to dry (LIVE_MODE unset/false) and this pass never sets LIVE_MODE — running
// this file as-is makes ZERO real provider calls. Flipping to a real run requires a SEPARATE,
// explicit, later authorization; nothing in this file grants that on its own.
//
// Structure mirrors the one real precedent (_first_sacrifice_live_scene2_boundary_sample.mjs):
// installFailClosedNetworkGate + gate.setPhase/waitForSettlement for real accounting, extended here
// with (a) a genuine pre-dispatch cost RESERVATION enforced in code before each phase opens, not
// just documented, (b) continuous artifact persistence (not batched at exit), and (c) real hydration
// through the shipped starter's own mount function, not hand-built DOM state.
//
// usage (dry, the only mode this pass runs): node _tempt_fate_memory_erasure_live_test_harness.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate, isImagePreparationRequest } from './_e2e_network_gate.mjs';
import { buildScheduleAwareStubResponse } from './_tempt_fate_stub_plan_builder.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIVE_MODE = process.env.TEMPT_LIVE_MODE === '1'; // NEVER set by this pass — dry only
const OUT_DIR = path.join(__dirname, '_tempt_fate_memory_erasure_harness_out');
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 900) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── CONTINUOUS ARTIFACT PERSISTENCE (Roman: "Persist request, response, prompt, rendered-scene,
// and outcome artifacts continuously") — every write appends immediately, never buffered only in
// memory until exit, so a crash mid-run still leaves the real trail on disk.
function persistArtifact(kind, name, data) {
  try {
    const dir = path.join(OUT_DIR, kind);
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, name + '.json');
    fs.writeFileSync(file, JSON.stringify(data === undefined ? null : data, null, 2));
    return file;
  } catch (e) { console.warn('[ARTIFACT] persist failed for ' + kind + '/' + name + ':', e && e.message); return null; }
}
function appendJsonl(name, obj) {
  try { fs.appendFileSync(path.join(OUT_DIR, name + '.jsonl'), JSON.stringify({ ...obj, at: Date.now() }) + '\n'); } catch (_) {}
}

// ── SOURCED RATE TABLE (Roman: "Include all reachable tiers... Treat unknown pricing as a stop,
// not zero.") — $ per token. null = deliberately UNSOURCED; the reservation function below refuses
// to reserve $0 for an unsourced tier — it stops instead. Sourced from the one real precedent
// script's own GROK_RATE/GPT4O_RATE (public/app.js TEXT_PRICING / api/proxy.js model resolution) —
// extended here with the tiers this test's corrected census (item 5 of the prior pass) actually
// reaches. ministral-8b and mistral-small rows are UNSOURCED as of this pass — deliberately left
// null so the reservation logic below demonstrates the stop condition for real, not hypothetically.
const RATES = {
  'grok-4-1-fast-reasoning': { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 },
  'grok-4-1-fast-non-reasoning': { in: 0.00000125, out: 0.0000025, cacheRead: 0.0000002 },
  'gpt-4o': { in: 0.0000025, out: 0.00001 },
  'gpt-4o-mini': { in: null, out: null }, // UNSOURCED this pass
  'ministral-8b-2512': { in: null, out: null }, // UNSOURCED this pass
  'mistral-small-latest': { in: null, out: null } // UNSOURCED this pass
};
// Conservative worst-case tokens per request, for the RESERVATION only (not a real measurement) —
// generous upper bounds per role, used solely to compute what to hold back before dispatch.
const WORST_CASE_TOKENS = { author: { in: 9000, out: 1600 }, scaffold: { in: 4000, out: 2500 }, bible: { in: 2000, out: 900 }, scenePlanner: { in: 2500, out: 420 }, commitVerifier: { in: 5200, out: 280 }, gravityAudit: { in: 2200, out: 1400 } };

function reserveForRequest(model, roleKey) {
  const rate = RATES[model];
  const tok = WORST_CASE_TOKENS[roleKey] || { in: 3000, out: 800 };
  if (!rate || rate.in == null || rate.out == null) return { unsourced: true, model, roleKey };
  return { unsourced: false, model, roleKey, usd: rate.in * tok.in + rate.out * tok.out };
}

// A PHASE is a named group of physical requests this test will make, with the REAL tier list that
// could fire for it (primary + every fallback the actual code reaches, per the corrected census).
const PHASE_TIERS = {
  scaffold: [{ model: 'ministral-8b-2512', roleKey: 'scaffold' }, { model: 'grok-4-1-fast-non-reasoning', roleKey: 'scaffold' }, { model: 'gpt-4o', roleKey: 'scaffold' }],
  bibles: [{ model: 'ministral-8b-2512', roleKey: 'bible' }, { model: 'grok-4-1-fast-non-reasoning', roleKey: 'bible' }, { model: 'gpt-4o', roleKey: 'bible' },
            { model: 'ministral-8b-2512', roleKey: 'bible' }, { model: 'grok-4-1-fast-non-reasoning', roleKey: 'bible' }, { model: 'gpt-4o', roleKey: 'bible' },
            { model: 'ministral-8b-2512', roleKey: 'bible' }, { model: 'grok-4-1-fast-non-reasoning', roleKey: 'bible' }, { model: 'gpt-4o', roleKey: 'bible' }], // 3 Bibles x up to 3 tiers each
  scenePlanner: [{ model: 'grok-4-1-fast-non-reasoning', roleKey: 'scenePlanner' }, { model: 'ministral-8b-2512', roleKey: 'scenePlanner' }, { model: 'gpt-4o', roleKey: 'scenePlanner' }],
  plannerLegacyFallback: [{ model: 'mistral-small-latest', roleKey: 'scenePlanner' }],
  commitVerifier: [{ model: 'ministral-8b-2512', roleKey: 'commitVerifier' }, { model: 'grok-4-1-fast-non-reasoning', roleKey: 'commitVerifier' }, { model: 'gpt-4o', roleKey: 'commitVerifier' }],
  gravityAudit: [{ model: 'ministral-8b-2512', roleKey: 'gravityAudit' }],
  author: [{ model: 'grok-4-1-fast-reasoning', roleKey: 'author' }, { model: 'ministral-8b-2512', roleKey: 'author' }, { model: 'gpt-4o', roleKey: 'author' }]
};

// Reservation ledger — a real, executable stop condition, not documentation. Every reservation is
// appended to the JSONL trail immediately (persisted continuously, per Roman's requirement).
class ReservationLedger {
  constructor(ceilingUsd) { this.ceilingUsd = ceilingUsd; this.reservedUsd = 0; this.entries = []; }
  // Returns { ok:true } or { ok:false, reason } — NEVER silently proceeds on an unsourced rate.
  reserve(phaseTag) {
    const tiers = PHASE_TIERS[phaseTag];
    if (!tiers) return { ok: false, reason: 'unknown phase "' + phaseTag + '" — no declared tier list, refusing to reserve blind' };
    let phaseUsd = 0;
    for (const t of tiers) {
      const r = reserveForRequest(t.model, t.roleKey);
      if (r.unsourced) {
        const reason = 'UNSOURCED PRICING for ' + t.model + ' (role ' + t.roleKey + ') in phase "' + phaseTag + '" — treated as a STOP, not $0, per the explicit requirement';
        appendJsonl('reservation_log', { kind: 'stop', phaseTag, reason });
        return { ok: false, reason };
      }
      phaseUsd += r.usd;
    }
    if (this.reservedUsd + phaseUsd > this.ceilingUsd) {
      const reason = 'reserving phase "' + phaseTag + '" ($' + phaseUsd.toFixed(4) + ') would push total reserved ($' + this.reservedUsd.toFixed(4) + ') past the ceiling ($' + this.ceilingUsd.toFixed(4) + ')';
      appendJsonl('reservation_log', { kind: 'stop', phaseTag, reason });
      return { ok: false, reason };
    }
    this.reservedUsd += phaseUsd;
    this.entries.push({ phaseTag, phaseUsd, runningTotalUsd: this.reservedUsd });
    appendJsonl('reservation_log', { kind: 'reserved', phaseTag, phaseUsd, runningTotalUsd: this.reservedUsd });
    return { ok: true, phaseUsd, runningTotalUsd: this.reservedUsd };
  }
}

(async () => {
  console.log(LIVE_MODE ? '⚠⚠⚠ LIVE MODE — REAL PROVIDER CALLS ⚠⚠⚠' : 'DRY MODE — every request stubbed, zero real provider calls, zero real spend.');
  if (LIVE_MODE) { console.error('This pass never authorizes LIVE_MODE. Refusing to proceed.'); process.exit(3); }

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const consoleLines = [];
  page.on('console', (msg) => { const t = msg.text(); consoleLines.push(t); appendJsonl('console_log', { text: t }); });
  page.on('pageerror', (e) => { console.warn('[PAGE ERROR]', e && e.message); appendJsonl('console_log', { pageerror: e && e.message }); });

  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'network_gate.jsonl'), blockImagePreparation: true });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state
    && typeof window._renderBakedScene1 === 'function'
    && typeof window._bakedScene1For === 'function'
    && typeof window._syncFateCardLockState === 'function'
    && typeof window._runCGScreenplayGen === 'function'
    && typeof window._cgTemptFateCommitAtPersistence === 'function'
    && typeof window._cgTemptFateAftermathCleanup === 'function'
    && typeof window._recordTemptFateEvent === 'function', { timeout: 30000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached, all required functions exposed on window\n');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. REAL HYDRATION — mount the actual shipped First Sacrifice opening (not hand-built state)');
  const freshStoryId = 'live-fs-tempt-erasure-' + Date.now();
  const mount = await page.evaluate((storyId) => {
    try {
      window.state.storyId = storyId;
      window.state.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
      window.state.gender = 'Female'; window.state.loveInterest = 'Male'; window.state.authorPronouns = 'She/Her';
      window.state.renderMode = 'staged_story_mode'; window.state.currentEngine = 'graphic';
      window.state.turnCount = 0; window.state.scenes = [];
      window.state.subscribed = true; window.state.fortunes = 9999999; window.state.access = 'sub';
      window.state._starterId = 'starter_first_sacrifice';
      window.state._pcLookSkipped = true; window.state._bakedGenesisUnlocked = true;
      window._devBypass = true; // Fortune dev-bypass only (consumeFortune) — does NOT affect the Tempt-card lock below
      window.state._intimacyDevMode = true; // the REAL, disclosed dev-only bypass for the Tempt fate-card onboarding lock (app.js ~107086) — NOT ordinary player flow
      const pkg = window._bakedScene1For('starter_first_sacrifice');
      if (!pkg) return { ok: false, reason: 'no baked package resolved for starter_first_sacrifice' };
      window._renderBakedScene1({ id: 'starter_first_sacrifice' }, pkg);
      const storyHtml = document.getElementById('storyContent');
      return { ok: true, bodyLen: storyHtml ? storyHtml.innerHTML.length : 0, pkgVersion: pkg.version };
    } catch (e) { return { ok: false, reason: e && e.message, stack: (e && e.stack || '').slice(0, 600) }; }
  }, freshStoryId);
  persistArtifact('hydration', 'scene1_mount', mount);
  ok('Scene 1 mounted through the REAL _renderBakedScene1 function (not hand-built DOM/state)', mount.ok === true, JSON.stringify(mount));
  ok('the mounted page has real, non-trivial content', mount.ok && mount.bodyLen > 5000, 'bodyLen=' + mount.bodyLen);

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // The real, time-based (not Tempt-related) boot splash animation (public/app.js ~1-40) intercepts
  // pointer events over the whole page for ~6.5-7.5s on every load, unrelated to anything under
  // test here — wait for it to genuinely finish (real DOM class, not a guessed timeout) before any
  // click is attempted, exactly as an ordinary player's first real click would have to.
  await page.waitForSelector('#splashOverlay.splash-done', { timeout: 12000 }).catch(() => { console.warn('[HARNESS] splash overlay did not reach .splash-done within 12s — proceeding anyway'); });

  section('2. TEMPT CARD AVAILABILITY — the real onboarding lock, via the disclosed dev-only bypass, verified through the real DOM');
  await page.evaluate(() => { if (typeof window._syncFateCardLockState === 'function') window._syncFateCardLockState(); });
  const cardBefore = await page.evaluate(() => {
    const cards = document.querySelectorAll('.tempt-fate-card');
    if (!cards.length) return { found: false };
    const c = cards[0];
    const cs = window.getComputedStyle(c);
    return { found: true, count: cards.length, fateLocked: c.classList.contains('fate-locked'), pointerEvents: cs.pointerEvents };
  });
  persistArtifact('hydration', 'tempt_card_before_click', cardBefore);
  ok('a real .tempt-fate-card element exists in the mounted DOM', cardBefore.found === true, JSON.stringify(cardBefore));
  ok('it does NOT carry .fate-locked — the disclosed _intimacyDevMode bypass genuinely unlocks it (not assumed, checked against the real DOM class)', cardBefore.found && cardBefore.fateLocked === false, JSON.stringify(cardBefore));
  ok('its computed pointer-events is not "none" — a real click can reach it', cardBefore.found && cardBefore.pointerEvents !== 'none', JSON.stringify(cardBefore));

  let clickWorked = false;
  try {
    await page.click('.tempt-fate-card', { timeout: 5000 });
    clickWorked = true;
  } catch (e) { console.warn('[HARNESS] real click on .tempt-fate-card failed: ' + (e && e.message)); }
  const cardAfterClick = await page.evaluate(() => {
    const c = document.querySelector('.tempt-fate-card');
    return { classes: c ? Array.from(c.classList) : null, zoomOverlayPresent: !!document.querySelector('.tempt-zoomed, .fate-card-zoomed') };
  });
  persistArtifact('hydration', 'tempt_card_after_click', { clickWorked, cardAfterClick });
  ok('a REAL Playwright click on the card was accepted (did not throw as unreachable/covered/pointer-events:none)', clickWorked === true, JSON.stringify({ clickWorked }));
  ok('the click produced an observable DOM change — a zoom overlay opened', cardAfterClick.zoomOverlayPresent === true, JSON.stringify(cardAfterClick));
  // Close the zoom without sealing anything (no wish typed yet) — leaves state clean for the
  // stubbed generation sections below, which seal their own test wishes explicitly via direct
  // ledger/plan construction, NOT via a real click on .tempt-proceed-btn.
  //
  // DELIBERATE SAFETY BOUNDARY (documented 2026-09-23, post-incident): this harness never fills
  // #temptZoomInput or clicks .tempt-proceed-btn for real. That real click path drives
  // window.WishSequence.queue(...) -> _classifyWishCG (app.js ~199719), which can fire ONE real,
  // fire-and-forget gpt-4o-mini call the instant Proceed is clicked (confirmed via a real live-run
  // attempt that dispatched it — 502'd, $0 realized, but a real unbudgeted provider call
  // nonetheless; see _tempt_fate_memory_erasure_cost_audit.mjs's "wish-classifier" role, added the
  // same pass this was found, and the authorization sheet's eighth revision). Any FUTURE extension
  // of this harness that seals a real wish through the real Proceed button MUST either (a) stub
  // /api/chatgpt-proxy's classifier-shaped request body before that click, or (b) keep the network
  // gate fail-closed with no real lane declared for it, and MUST assert the resulting
  // gate.trackedCalls() shows it as stubbed/aborted, not merely assume "no scene lane" implies no
  // dispatch was attempted — a real dispatch attempt that happens to get blocked is not the same
  // as a diagnostic that never risked one.

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. IMAGE-PREPARATION BLOCKING — blockImagePreparation:true, exercised against both classified shapes');
  // Uses a DEDICATED real-allowed lane (/api/chatgpt-proxy) for this proof only — never touched by
  // any stub or generation call elsewhere in this harness. allowRealPaths is append-only/permanent
  // (no un-declare), and a path is EITHER real-allowed (subject to blockImagePreparation + phase
  // ceiling, dispatched via route.continue()) OR stubbed — never both; reusing /api/proxy here would
  // make the sections 5-6 stub on that same prefix dead code. This keeps the two concerns isolated
  // while still proving the SAME underlying isImagePreparationRequest classification the real gate
  // applies to any allowed endpoint, not a mechanism specific to one path.
  gate.allowRealPaths(['/api/chatgpt-proxy']);
  const imgPrepProbe = await page.evaluate(async () => {
    const results = [];
    // Shape 1: purpose-classified request, via an ALLOWED text endpoint.
    try {
      const r1 = await fetch('/api/chatgpt-proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ purpose: 'image_style_extraction', messages: [] }) });
      results.push({ shape: 'purpose-field', status: r1.status, ok: r1.ok });
    } catch (e) { results.push({ shape: 'purpose-field', threw: true, message: e && e.message }); }
    // Shape 2: system-prompt-text-classified request (text-only image rewriting), via an ALLOWED endpoint.
    try {
      const r2 = await fetch('/api/chatgpt-proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: 'You are a visual art director for a comic book / graphic novel panel.' }, { role: 'user', content: 'describe the panel' }] }) });
      results.push({ shape: 'system-prompt-text', status: r2.status, ok: r2.ok });
    } catch (e) { results.push({ shape: 'system-prompt-text', threw: true, message: e && e.message }); }
    return results;
  });
  persistArtifact('image_prep', 'blocking_probe', imgPrepProbe);
  ok('the purpose-field image-prep shape was blocked (request threw/failed, never reached a real dispatch)', imgPrepProbe[0] && (imgPrepProbe[0].threw === true || imgPrepProbe[0].ok === false), JSON.stringify(imgPrepProbe[0]));
  ok('the system-prompt-text image-prep shape (STYLE-ONLY EXTRACTION / visual art director) was blocked too', imgPrepProbe[1] && (imgPrepProbe[1].threw === true || imgPrepProbe[1].ok === false), JSON.stringify(imgPrepProbe[1]));
  const imagePrepAborts = gate.unstubbed().filter((u) => /image-preparation/i.test(u.reason || ''));
  ok('the gate logged BOTH as image-preparation aborts specifically (not a generic undeclared-request abort)', imagePrepAborts.length === 2, JSON.stringify(gate.unstubbed()));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. PRE-DISPATCH RESERVATION — executable stop conditions, not documentation');
  {
    // A synthetic, FULLY-SOURCED phase (grok + gpt-4o only — both rows have real, sourced rates)
    // isolates the CEILING stop from the UNSOURCED stop, so each is proven independently rather
    // than one masking the other. Registered once, reused by both sub-proofs below.
    PHASE_TIERS.authorSourcedOnlyForProof = [{ model: 'grok-4-1-fast-reasoning', roleKey: 'author' }, { model: 'gpt-4o', roleKey: 'author' }];

    const ledgerOverCeiling = new ReservationLedger(0.00001); // deliberately far below even one request's cost
    const r1 = ledgerOverCeiling.reserve('authorSourcedOnlyForProof');
    ok('reserving a fully-sourced phase against a deliberately tiny ceiling correctly refuses (over-budget stop, proven to actually fire — isolated from the unsourced-pricing stop)', r1.ok === false && /past the ceiling/.test(r1.reason || ''), JSON.stringify(r1));

    const ledgerUnsourced = new ReservationLedger(10); // huge ceiling — isolates the UNSOURCED stop specifically
    const r2 = ledgerUnsourced.reserve('scaffold'); // scaffold's real tier list includes ministral-8b-2512, deliberately UNSOURCED this pass
    ok('reserving a phase that includes an UNSOURCED tier (ministral-8b-2512) stops — never silently treated as $0', r2.ok === false && /UNSOURCED PRICING/.test(r2.reason || ''), JSON.stringify(r2));

    const ledgerFullySourced = new ReservationLedger(0.45);
    const r3 = ledgerFullySourced.reserve('authorSourcedOnlyForProof');
    ok('a phase whose entire tier list IS sourced, against a real ceiling, reserves successfully and tracks a running total', r3.ok === true && typeof r3.runningTotalUsd === 'number' && r3.runningTotalUsd > 0, JSON.stringify(r3));

    const ledgerRealAuthor = new ReservationLedger(0.45);
    const r4 = ledgerRealAuthor.reserve('author'); // the REAL author phase, as the actual corrected census has it — includes the unsourced ministral-8b fallback tier
    ok('the REAL author phase (as the actual corrected census has it, including its unsourced ministral-8b fallback tier) ALSO stops on the SAME unsourced-pricing rule — no special-casing for the main event', r4.ok === false && /UNSOURCED PRICING/.test(r4.reason || ''), JSON.stringify(r4));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. PLANNER + AUTHOR RECEIVE SCENE A\'s ACTIVE INVOCATION — captured against the real dispatch, network fully stubbed');
  // Real hydration (section 1) mounted Scene 1 and its own real seed/ledger state, but does not by
  // itself initialize every field the generation pipeline touches (loveInterestName/playerName as
  // top-level state, the Tempt durable-consequence arrays, delivered-assignment tracking, etc.) —
  // those are normally set by a full app boot/reset this targeted hydration doesn't run. Filled in
  // here with the SAME shape _tempt_fate_outcome_integration_control.mjs's own resetBaseline()
  // already uses successfully (70/70 there) — a known-working generation-pipeline state layered on
  // top of the real mounted Scene 1, not a replacement for it.
  await page.evaluate(() => {
    window._plotContractKill = false;
    window.state.loveInterestName = 'Julian';
    window.state.playerName = 'Lirael';
    window.state.currentPrimaryLiId = 'julian';
    window.state._temptFateDurableConsequences = [];
    window.state._temptOutcomeCommittedProposals = {};
    window.state._cgDeliveredAssignments = null;
    window.state.volatility_window = { active: false, severity: 0, remaining_scenes: 0 };
    window.state.consecutive_tempt_fate_count = 0;
    window.state.aPlot = { goal: 'stub goal' };
    window.state._sceneStateCard = {};
    window.state.rPlot = {};
    window.state.cgScaffold = { _stub: true, storyId: window.state.storyId };
    window.state.pcBodyBible = { _stub: true };
    window.state.liBodyBible = { _stub: true };
    window.state.antagonistBodyBible = { _stub: true };
  });
  let capturedBodies = [];
  let _currentIsTemptScene = true; // Scene A (below) is the invocation; Scene B (section 6) flips this to false before generating
  // First Sacrifice's REAL seed carries an OPEN-ROW local-objective structure (confirmed empirically
  // this pass — a generic author-shaped stub response was silently rejected by the real
  // _validateLocalObjective gate, which this real seed's planner call genuinely requires). Rather
  // than hand-guess the seed's exact reserved/aftermath ids and roster, this stub reads them out of
  // the REAL request's own system prompt (the app already tells the model exactly what's required,
  // including a worked-example JSON) and builds a schema-valid response from THAT — self-adapting to
  // whichever seed/scene is actually in play, not a brittle hardcoded shape.
  // buildScheduleAwareStubResponse now lives in _tempt_fate_stub_plan_builder.mjs (extracted
  // 2026-09-23) so the dry UI-order proof stubs the author with the SAME shapes this harness does.
  // One authoritative definition; the two must never drift.
  gate.stub('/api/mistral-proxy', async (req) => { let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {} capturedBodies.push({ endpoint: 'mistral-proxy', body: b }); appendJsonl('request_log', { endpoint: 'mistral-proxy', body: b }); 
    // CANON AUDIT (wired to production 2026-09-24): the gate now sits between planner and author
    // and FAILS CLOSED when no auditor answers — correct behaviour, but it would stop every scene
    // in this harness for a reason unrelated to what the harness tests. Answered as a clean pass,
    // identified by the auditor's own system-prompt marker so no other mistral role is affected.
    try {
      const _sys = ((b && b.messages ? b.messages : []).find((m) => m.role === 'system') || {}).content || '';
      if (_sys.indexOf('CANON AUDITOR') !== -1) return { content: JSON.stringify({ verdict: 'pass', violations: [] }) };
    } catch (_) {}
    return { content: null }; });
  gate.stub('/api/proxy', async (req) => {
    let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    capturedBodies.push({ endpoint: 'proxy', body: b });
    appendJsonl('request_log', { endpoint: 'proxy', body: b });
    const sysMsg = (b && b.messages || []).find((m) => m.role === 'system');
    const usrMsg = (b && b.messages || []).find((m) => m.role === 'user');
    const isTemptScene = !!(_currentIsTemptScene);
    return { content: JSON.stringify(buildScheduleAwareStubResponse(sysMsg && sysMsg.content, usrMsg && usrMsg.content, isTemptScene)) };
  });

  const wishA = 'everyone forgets the ceremony happened';
  await page.evaluate((w) => {
    window.state.tempt_fate_invoked_this_turn = true;
    window.state.temptFateWish = w;
    window._recordTemptFateEvent(w);
  }, wishA);
  const sceneA = await page.evaluate((si) => window._runCGScreenplayGen(si, 'she steps back', ''), 1);
  persistArtifact('generation', 'scene_a_returned_plan', sceneA);
  persistArtifact('generation', 'scene_a_captured_requests', capturedBodies);
  const scA_all = JSON.stringify(capturedBodies);
  ok('the real planner request for Scene A carried the active-invocation marker + wish text', scA_all.indexOf('ACTIVE INVOCATION THIS SCENE') !== -1 && scA_all.indexOf(wishA) !== -1);
  ok('the real author request for Scene A carried the wish (PLAYER WISH directive)', scA_all.indexOf('PLAYER WISH') !== -1 && scA_all.indexOf(wishA) !== -1);
  ok('Scene A\'s generation returned a usable plan (not stale-rejected)', sceneA && !sceneA.__staleRejected && !sceneA.__plannerFunctionRejected);

  const ownedA = await page.evaluate(() => { const led = window.state._temptFateLedger; return led[led.length - 1]; });
  await page.evaluate(async (p) => {
    // Persistence records a pending outcome; the EXTRACTOR commits. This control stubs an AUTHOR
    // response, whose self-certified outcome is deliberately ignored post-migration, so it is
    // re-injected here as if extracted, cited into the scene's own first beat.
    window._cgTemptFateCommitAtPersistence(p);
    const ownedId = p && p.__temptOwnership && p.__temptOwnership.proposalEntry && p.__temptOwnership.proposalEntry.id;
    const quote = (p && Array.isArray(p.beats) && p.beats[0] && p.beats[0].text) || '';
    for (const rec of window._tfoUnresolvedPending(window.state).filter((r) => !ownedId || (r.ctx && r.ctx.proposalId === ownedId))) {
      let raw = (p && p.temptFateOutcome) ? JSON.parse(JSON.stringify(p.temptFateOutcome)) : null;
      if (raw && Array.isArray(raw.affectedKnowers)) raw.affectedKnowers.forEach((k) => { if (k && k.disposition !== 'absent') k.evidenceQuote = quote; });
      await window._tfoResolvePendingRecord(rec, raw ? { injectRaw: raw } : {});
    }
  }, sceneA);
  await page.evaluate((o) => window._cgTemptFateAftermathCleanup(o, true), ownedA);
  const committedA = await page.evaluate(() => window.state._temptFateDurableConsequences[0]);
  const durableCountAfterA = await page.evaluate(() => window.state._temptFateDurableConsequences.length);
  persistArtifact('outcomes', 'scene_a_committed', committedA);
  const renderedSceneAText = (sceneA && Array.isArray(sceneA.beats)) ? sceneA.beats.map((b) => b.text).join('\n\n') : '';
  persistArtifact('rendered_scenes', 'scene_a_text', { text: renderedSceneAText });
  ok('Scene A\'s outcome committed as a real durable consequence, attributed to the wish', committedA && committedA.requestedRupture === wishA, JSON.stringify(committedA));
  ok('exactly ONE outcome committed, tied to the SAME stable proposal id this generation captured at start (not a re-resolved "most recent" one)', durableCountAfterA === 1 && committedA && committedA.proposalId === ownedA.id, JSON.stringify({ durableCountAfterA, proposalId: committedA && committedA.proposalId, ownedId: ownedA.id }));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5b. NEGATIVE CONTROL — a deliberately stale delivered-assignment still rejects and cannot commit (Roman: preserve this inside the harness\'s own real, rich-seed context, not only the bare-state integration control)');
  {
    // Exercises the REAL _cgMintDeliveredAssignments / _cgAcceptDelivered pair — the exact
    // mechanism the decision-absent fix (this session's prior pass) repaired — against THIS
    // harness's real hydrated First Sacrifice state, not a synthetic minimal one. Mint once
    // (capturing that snapshot's own attemptId), mint AGAIN (simulating a second/concurrent request
        // superseding the first — exactly what happens in production when a slow first response
    // arrives after a second request has already superseded it), then confirm the FIRST (now-stale)
    // snapshot is rejected by the real, unmodified _cgAcceptDelivered.
    const staleResult = await page.evaluate(() => {
      const first = window._cgMintDeliveredAssignments(1);
      const firstAttemptId = first ? first.attemptId : null;
      const second = window._cgMintDeliveredAssignments(1); // supersedes the first in state
      const acc = window._cgAcceptDelivered(first, 1, firstAttemptId); // the FIRST (now-stale) request's own check
      return { firstAttemptId, secondAttemptId: second && second.attemptId, acc };
    });
    persistArtifact('outcomes', 'stale_assignment_negative_control', staleResult);
    ok('minting twice against the real hydrated state produces two DIFFERENT attempt ids (a real, distinguishable stale-vs-current pair, not a no-op)', staleResult.firstAttemptId && staleResult.secondAttemptId && staleResult.firstAttemptId !== staleResult.secondAttemptId, JSON.stringify(staleResult));
    ok('the real _cgAcceptDelivered — UNMODIFIED by this session\'s fix — still rejects the stale (first) request once a second request has superseded it: the negative control this fix must not weaken', staleResult.acc && staleResult.acc.ok === false && /stale attempt/i.test(staleResult.acc.reason || ''), JSON.stringify(staleResult.acc));
    // The stale rejection itself proves "cannot commit": _completeStagedSceneFromScreenplay's real
    // caller only reaches persistence/commit when _acc.ok is true (structural proof already covered
    // by _tempt_fate_outcome_integration_control.mjs section 4 against the real served source) — a
    // rejected _acc here means this exact call would never reach that point in the real pipeline.
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. PLANNER + AUTHOR RECEIVE SCENE B — Scene A\'s committed outcome, an ordinary continuation, neutral Say/Do');
  capturedBodies = [];
  _currentIsTemptScene = false; // ordinary continuation — the stub must NOT include a temptFateOutcome field at all
  await page.evaluate(() => { window.state.tempt_fate_invoked_this_turn = false; window.state.temptFateWish = ''; });
  const sceneB = await page.evaluate((si) => window._runCGScreenplayGen(si, '', 'Lirael takes a slow breath and steps back from the center of the clearing.'), 2);
  persistArtifact('generation', 'scene_b_returned_plan', sceneB);
  persistArtifact('generation', 'scene_b_captured_requests', capturedBodies);
  const scB_all = JSON.stringify(capturedBodies);
  ok('the real planner request for Scene B carried Scene A\'s committed durable consequence', scB_all.indexOf('torn mouth-band on the ground') !== -1, scB_all.slice(0, 400));
  ok('the real planner request for Scene B did NOT carry an active-invocation marker (ordinary continuation)', scB_all.indexOf('ACTIVE INVOCATION THIS SCENE') === -1);
  ok('the real author request for Scene B carried the durable-consequence directive too', scB_all.indexOf('TEMPT FATE — DURABLE CONSEQUENCES') !== -1);

  const wasInvokedDuringB = await page.evaluate(() => window.state.tempt_fate_invoked_this_turn);
  ok('no new Tempt invocation occurred during Scene B — state.tempt_fate_invoked_this_turn stayed false throughout the ordinary continuation', wasInvokedDuringB === false, 'wasInvokedDuringB=' + wasInvokedDuringB);

  const beforeCommitB = await page.evaluate(() => window.state._temptFateDurableConsequences.length);
  await page.evaluate(async (p) => {
    // Persistence records a pending outcome; the EXTRACTOR commits. This control stubs an AUTHOR
    // response, whose self-certified outcome is deliberately ignored post-migration, so it is
    // re-injected here as if extracted, cited into the scene's own first beat.
    window._cgTemptFateCommitAtPersistence(p);
    const ownedId = p && p.__temptOwnership && p.__temptOwnership.proposalEntry && p.__temptOwnership.proposalEntry.id;
    const quote = (p && Array.isArray(p.beats) && p.beats[0] && p.beats[0].text) || '';
    for (const rec of window._tfoUnresolvedPending(window.state).filter((r) => !ownedId || (r.ctx && r.ctx.proposalId === ownedId))) {
      let raw = (p && p.temptFateOutcome) ? JSON.parse(JSON.stringify(p.temptFateOutcome)) : null;
      if (raw && Array.isArray(raw.affectedKnowers)) raw.affectedKnowers.forEach((k) => { if (k && k.disposition !== 'absent') k.evidenceQuote = quote; });
      await window._tfoResolvePendingRecord(rec, raw ? { injectRaw: raw } : {});
    }
  }, sceneB);
  const afterCommitB = await page.evaluate(() => window.state._temptFateDurableConsequences.length);
  ok('Scene B (ordinary continuation) commits NO new outcome — a missing temptFateOutcome here is the EXPECTED result, not a failure', afterCommitB === beforeCommitB, 'before=' + beforeCommitB + ' after=' + afterCommitB);
  ok('no duplicate commit occurred — still exactly ONE durable outcome total (Scene A\'s), not two', afterCommitB === 1, 'afterCommitB=' + afterCommitB);
  const finalOutcomeStillA = await page.evaluate(() => window.state._temptFateDurableConsequences[0] && window.state._temptFateDurableConsequences[0].requestedRupture);
  ok('the single durable outcome remains attributed to Scene A\'s wish, unchanged by Scene B', finalOutcomeStillA === wishA, 'finalOutcomeStillA=' + finalOutcomeStillA);
  const renderedSceneBText = (sceneB && Array.isArray(sceneB.beats)) ? sceneB.beats.map((b) => b.text).join('\n\n') : '';
  persistArtifact('rendered_scenes', 'scene_b_text', { text: renderedSceneBText });

  await page.evaluate(() => { window._plotContractKill = true; });

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. ZERO IMAGE-PREPARATION DISPATCHES across the entire dry run');
  const allImagePrepAborts = gate.unstubbed().filter((u) => /image-preparation/i.test(u.reason || ''));
  const allTracked = gate.trackedCalls ? gate.trackedCalls() : [];
  persistArtifact('image_prep', 'final_audit', { imagePrepAbortsFromSection3: allImagePrepAborts, note: 'section 3 above intentionally sent 2 image-prep-shaped requests to PROVE they are blocked — this section confirms no OTHER, incidental image-prep dispatch occurred anywhere else in the run' });
  const incidentalImagePrep = allTracked.filter((t) => { try { return isImagePreparationRequest(t.requestBody); } catch (_) { return false; } });
  ok('zero image-generation endpoints (/api/image, /api/bfl-kontext, /api/dashscope-image) were ever reached as REAL requests', !gate.unstubbed().some((u) => /\/api\/(image|bfl-kontext|dashscope-image)\b/.test(u.url)));
  ok('zero image-preparation-shaped requests slipped through as a real/tracked call anywhere in Scenes A or B (only the two deliberate section-3 probes were blocked)', incidentalImagePrep.length === 0, JSON.stringify(incidentalImagePrep));

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('TEMPT FATE MEMORY-ERASURE LIVE-TEST HARNESS (DRY RUN): ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  console.log('Artifacts persisted under: ' + OUT_DIR);
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
