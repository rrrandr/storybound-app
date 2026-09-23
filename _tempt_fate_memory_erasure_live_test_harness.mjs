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
  // stubbed generation sections below, which seal their own test wishes explicitly.
  try { await page.evaluate(() => { if (typeof window.closeTemptZoom === 'function') window.closeTemptZoom(); }); } catch (_) {}

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
  function buildScheduleAwareStubResponse(sysText, usrText, isTemptScene) {
    const wantsLocalObjective = /"reserved" MUST be an object containing EVERY ONE of these exact keys/.test(sysText || '');
    const beats = [{ idx: 0, kind: 'narration', text: isTemptScene ? 'The clearing forgets its own reason for gathering.' : 'Lirael steps back, and the clearing does not explain itself.', speaker: null, tension_state: 'composed' }];
    const base = { beats, visualState: {}, is_consummate_scene: false, hardBeats: [] };
    if (isTemptScene) {
      base.temptFateOutcome = { delivered: true, changed: [{ subject: 'the assembly', whatChanged: 'no longer remembers the ceremony' }], durability: [{ aspect: 'the memory gap', status: 'persists' }], knowledgeStates: [{ character: 'Lirael', state: 'unaware', note: 'wisher exemption not yet established' }], establishedEvidence: ['torn mouth-band on the ground'], openPossibilities: ['someone could notice the arrangement of the clearing does not match anyone\'s memory of why they gathered'] };
    }
    if (!wantsLocalObjective) return base;
    const reservedMatch = /"reserved" MUST be an object containing EVERY ONE of these exact keys, spelled exactly as given: \[([^\]]*)\]/.exec(sysText);
    const aftermathMatch = /"aftermath" MUST be an object containing EVERY ONE of these exact keys: \[([^\]]*)\]/.exec(sysText);
    const rosterMatch = /ROSTER — who CAN be present \(name only these; choose who IS\): ([^\n]*)/.exec(sysText || usrText || '');
    const reservedIds = reservedMatch ? reservedMatch[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
    const aftermathIds = aftermathMatch ? aftermathMatch[1].split(',').map((s) => s.trim()).filter(Boolean) : [];
    const rosterNames = rosterMatch ? rosterMatch[1].split('·').map((s) => s.trim().replace(/\s*\(.*$/, '')).filter(Boolean) : ['Lirael'];
    const actor = rosterNames[0] || 'Lirael';
    const reserved = {}; reservedIds.forEach((id) => { reserved[id] = 'untouched'; });
    const aftermath = {}; aftermathIds.forEach((id) => { aftermath[id] = 'kept'; });
    const out = Object.assign({}, base, {
      tactical_move: isTemptScene ? 'Lirael watches the wish take hold.' : 'Lirael steps back from the center of the clearing.',
      state_change_precondition: 'The assembly is still gathered, confused.',
      state_change: isTemptScene ? 'The assembly\'s memory of the ceremony visibly empties.' : 'The assembly mills, unable to say why they gathered.',
      forces_choice: 'Lirael must decide whether to speak into the confusion or let it stand.',
      branch_a: 'She speaks, risking drawing attention to what only she remembers.',
      branch_b: 'She stays silent, letting the confusion pass her by unremarked.',
      local_objective: isTemptScene ? 'The wish\'s erasure visibly lands across the gathered assembly.' : 'The assembly\'s confusion continues to play out without resolution.',
      posture_read: 'The reader wants to observe the consequence land, not be told about it.',
      present: [actor],
      local_objective_actor: actor,
      reserved,
      aftermath,
      // "event_slots.exit_state" (a real, separate rejection reason seen empirically this pass,
      // from a DIFFERENT gate than _validateLocalObjective — the planner-function/aftermath-lane
      // gate) needs a non-empty nested exit_state alongside aftermath_obligations below.
      event_slots: { exit_state: 'The assembly disperses, still not agreeing on what just happened.' }
    });
    // scene_function / aftermath_obligations — required whenever the seed declares a
    // sceneFunction row (app.js ~100488).
    if (/"scene_function_instantiated"/.test(sysText)) {
      out.scene_function_instantiated = 'the institutional preliminary-review lane';
      out.aftermath_obligations = 'The presiding Dohkar opens a preliminary review of Lirael\'s conduct; Julian\'s claimed authority over the eventual inquiry is not yet exercised.';
    }
    // chosen_aftermath_lane / lane_posture_modulation — required whenever the seed declares an
    // aftermathLanes menu (app.js ~100499/100501). If a frame was already resolved, the EXACT
    // required lane id is embedded in the prompt text itself ("MUST be EXACTLY \"<id>\"") — use it
    // verbatim rather than guessing; otherwise fall back to the first id in the listed menu.
    const exactLaneMatch = /"chosen_aftermath_lane" \(MUST be EXACTLY "([^"]+)"/.exec(sysText);
    const menuLaneMatch = /"chosen_aftermath_lane" \(EXACTLY one of these ids, spelled exactly as given — nothing else: \[([^\]]*)\]/.exec(sysText);
    if (exactLaneMatch || menuLaneMatch) {
      const laneId = exactLaneMatch ? exactLaneMatch[1] : menuLaneMatch[1].split(',')[0].trim();
      out.chosen_aftermath_lane = laneId;
      out.lane_posture_modulation = 'The reader\'s watchful posture keeps the lane procedural rather than confrontational.';
      // The REAL lane definitions (app.js ~129977-130088) additionally validate that the proposed
      // event/tactical-move actually INSTANTIATES the chosen lane, via a per-lane content regex
      // (signalRx) — a declared label alone is not enough (confirmed empirically this pass: an
      // earlier stub version was rejected for exactly this). Phrases below are drawn directly from
      // each lane's own real signalRx, not guessed.
      const LANE_SATISFYING_PHRASE = {
        dohkar_preliminary_review: 'the presiding Dohkar sets a preliminary review date',
        family_accusation: 'Seren\'s family publicly accuses Lirael before the assembly',
        julian_jurisdiction_challenge: 'Julian challenges the Dohkar\'s jurisdiction over the matter',
        lirael_constrained: 'Lirael is placed under watch, constrained pending the inquiry',
        lirael_defensive_path: 'Lirael submits to procedure and demands specific terms'
      };
      const phrase = LANE_SATISFYING_PHRASE[laneId] || ('the scene instantiates the ' + laneId + ' lane');
      out.state_change = out.state_change + ' — ' + phrase + '.';
      out.tactical_move = out.tactical_move + ' — ' + phrase + '.';
      out.aftermath_obligations = phrase.charAt(0).toUpperCase() + phrase.slice(1) + ', moving the confrontation off the ritual floor and into procedure.';
    }
    return out;
  }
  gate.stub('/api/mistral-proxy', async (req) => { let b = null; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {} capturedBodies.push({ endpoint: 'mistral-proxy', body: b }); appendJsonl('request_log', { endpoint: 'mistral-proxy', body: b }); return { content: null }; });
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

  await page.evaluate((p) => window._cgTemptFateCommitAtPersistence(p), sceneA);
  const ownedA = await page.evaluate(() => { const led = window.state._temptFateLedger; return led[led.length - 1]; });
  await page.evaluate((o) => window._cgTemptFateAftermathCleanup(o, true), ownedA);
  const committedA = await page.evaluate(() => window.state._temptFateDurableConsequences[0]);
  persistArtifact('outcomes', 'scene_a_committed', committedA);
  const renderedSceneAText = (sceneA && Array.isArray(sceneA.beats)) ? sceneA.beats.map((b) => b.text).join('\n\n') : '';
  persistArtifact('rendered_scenes', 'scene_a_text', { text: renderedSceneAText });
  ok('Scene A\'s outcome committed as a real durable consequence, attributed to the wish', committedA && committedA.requestedRupture === wishA, JSON.stringify(committedA));

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

  const beforeCommitB = await page.evaluate(() => window.state._temptFateDurableConsequences.length);
  await page.evaluate((p) => window._cgTemptFateCommitAtPersistence(p), sceneB);
  const afterCommitB = await page.evaluate(() => window.state._temptFateDurableConsequences.length);
  ok('Scene B (ordinary continuation) commits NO new outcome — a missing temptFateOutcome here is the EXPECTED result, not a failure', afterCommitB === beforeCommitB, 'before=' + beforeCommitB + ' after=' + afterCommitB);
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
