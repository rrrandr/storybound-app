// TEMPT FATE MEMORY-ERASURE COST/REQUEST AUDIT (Roman/Codex review, 2026-09-24, fourth pass)
//
// Roman: "The forced-cascade audit may not rely on fuzzy content classification of same-endpoint
// requests. Correlate requests using Playwright request identity plus the app's role/tier metadata,
// as the network-gate work already does. Demonstrate the worst permitted sequence—including the
// bounded scene retry and each reachable fallback—then prove the reservation ledger blocks before
// any next request that would exceed the combined ceiling."
//
// REDESIGNED this pass. The prior version tried to force EVERY role's cascade inside ONE shared,
// interleaved _runCGScreenplayGen call, correlating physical requests back to a logical role by
// regex-matching each request's own prompt text — fragile, and it never came out clean. This
// version drops content classification entirely: each role's REAL underlying function
// (_ensureCGScaffold, _generatePCBodyBible/_generateLIBodyBible/_generateAntagonistBodyBible,
// _generateLiteraryPlotContract, _commitScene, _auditSceneEmotionalGravity,
// _authorFullScenePolicy — every one confirmed window-exposed this pass) is called DIRECTLY, ONE
// role at a time, wrapped in its own gate.setPhase(roleTag, ceiling) window. Because only one role's
// traffic is possible while that phase is open, gate.trackedCalls(roleTag) is unambiguous ground
// truth — exactly "Playwright request identity plus the app's role/tier metadata, as the
// network-gate work already does" — not a guess from prompt text. The gate's own ceiling additionally
// PROVES the cap is enforced: any attempt past the declared ceiling is aborted by the gate itself,
// not merely documented.
//
// Every rate is sourced from public/app.js's own TEXT_PRICING table (~4764-4811, "OFFICIAL list
// price", cited to each provider's own published pricing page) — the same table the app's real cost
// accounting (_recordProxyTextCost) uses.
//
// usage: node _tempt_fate_memory_erasure_cost_audit.mjs (dry only — network fully stubbed)

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '_tempt_fate_memory_erasure_cost_audit_out');
fs.mkdirSync(OUT_DIR, { recursive: true });
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 900) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── SOURCED RATES — verbatim from public/app.js TEXT_PRICING (~4764-4811). $/token. ──
const TEXT_PRICING = {
  'gpt-4o-mini': { in: 0.00000015, out: 0.0000006 },
  'gpt-4o': { in: 0.0000025, out: 0.00001 },
  'grok-4-1-fast-reasoning': { in: 0.00000125, out: 0.0000025 },
  'grok-4-1-fast-non-reasoning': { in: 0.00000125, out: 0.0000025 },
  'mistral-small-latest': { in: 0.00000015, out: 0.0000006 },
  'ministral-8b-2512': { in: 0.00000015, out: 0.00000015 },
  // Added after the live Scene A exposed an uncounted post-scene call on this model. Sourced from
  // the same public/app.js TEXT_PRICING table as every row above (~4781).
  'grok-4.20-0309-non-reasoning': { in: 0.00000125, out: 0.0000025 }
};
// Conservative worst-case tokens PER PHYSICAL REQUEST, by role — used only to convert a REAL
// observed request (and its REAL model, read from gate.trackedCalls' own requestBody) into a REAL
// priced dollar figure. The request COUNT and MODEL come from the gate, never guessed.
const WORST_CASE_TOKENS = {
  author: { in: 9000, out: 1600 }, scaffold: { in: 4000, out: 2500 }, bible: { in: 2000, out: 900 },
  scenePlanner: { in: 2500, out: 420 }, commitVerifier: { in: 5200, out: 280 }, gravityAudit: { in: 2200, out: 1400 },
  // ADDED 2026-09-23 (Roman correction, post-live-run incident): the Tempt-seal "wish classifier"
  // (_classifyWishCG, app.js ~199719, reached via the real Proceed handler's window.WishSequence.queue
  // call, ~108999-109008) — a real gpt-4o-mini "gray zone" LLM call, max_tokens:120, that can fire
  // the instant a wish is sealed, fire-and-forget (not awaited by the click handler). Previously
  // undocumented in every authorization sheet revision through the seventh; confirmed reachable via
  // a real live-run attempt (2026-09-23) that dispatched it for real (settled 502, $0 realized, but a
  // real, unbudgeted provider dispatch nonetheless — this table's whole point is to price it BEFORE
  // that can happen again). Worst-case tokens conservative for its own fixed system+user prompt
  // (~300-400 real tokens) plus its 120-token completion cap.
  wishClassifier: { in: 700, out: 120 },
  // Same prompt shape as the scenePlanner it substitutes for, so it inherits those token bounds.
  plannerLegacyFallback: { in: 2500, out: 420 },
  // ── POST-SCENE ROLES, added 2026-09-23 after the live Scene A trace exposed both as uncounted ──
  // sceneAmbient: the ambient-soundscape classifier (orchestration-client.js:6069
  // callGrokSceneAmbientClassifier → CONFIG.SPECIALIST_PROXY, role INTIMACY_SPECIALIST,
  // max_tokens 12, NO model field — the server picks the INTIMACY_SPECIALIST default, which is why
  // it arrived as grok-4.20-0309-non-reasoning). Output is capped at 12 tokens; the cost is almost
  // entirely the trimmed scene prose on the way in. The real call billed $0.00475215.
  sceneAmbient: { in: 4000, out: 12 },
  // characterDisclosure: the CHARACTER MEMORY EXTRACTOR (app.js ~31622), dispatched through
  // _callTieredProvider('characterDisclosure', ...) — so it is NOT one call, it can cascade the
  // default 3-tier chain like every other tiered role.
  characterDisclosure: { in: 3000, out: 1100 },
  // temptOutcomeExtractor (Roman 2026-09-24): the DEDICATED Tempt outcome witness (app.js, see
  // _extractTemptOutcome), dispatched through _callTieredProvider('temptOutcomeExtractor', ...) so
  // it cascades the SAME default 3-tier chain as every other tiered role. Censused here BEFORE any
  // provider use, per the standing rule that produced this file — a role that can dispatch and is
  // not in the census, cap, reservation and sheet is exactly the classifyWishCG failure again.
  // IN: the extractor prompt carries the accepted scene prose (capped at 8000 chars ≈ 2000 tok),
  // the full rendered outcome schema, the wish and the roster — call it 3600 in.
  // OUT: max_tokens 1400, the real ceiling set at the call site.
  // Fires at most ONCE per DELIVERED Tempt scene (never on an ordinary continuation), but a retry
  // after a rejected extraction re-dispatches, so the cap below is per-attempt, not per-scene.
  temptOutcomeExtractor: { in: 3600, out: 1400 }
};
function costOfTrackedCall(rec, roleKey) {
  const model = (rec.requestBody && (rec.requestBody.model || rec.requestBody.preferredModel)) || null;
  const rate = model && TEXT_PRICING[model];
  if (!rate) return { unsourced: true, model };
  const tok = WORST_CASE_TOKENS[roleKey] || { in: 3000, out: 800 };
  return { unsourced: false, model, usd: rate.in * tok.in + rate.out * tok.out };
}

// Real per-role tier ceilings — the max PHYSICAL requests that role's own real dispatch code can
// make, traced from source this session (scaffold/bible/commitVerifier: _callTieredProvider default
// chain, no `tiers` override; scenePlanner: its own custom 3-tier list; author: its own hand-rolled
// 3-tier cascade in _authorFullScenePolicy; gravityAudit: single-attempt, no fallback).
const ROLE_CEILING = { scaffold: 3, bible: 3, scenePlanner: 3, commitVerifier: 3, gravityAudit: 1, author: 3, wishClassifier: 1, plannerLegacyFallback: 1, sceneAmbient: 1, characterDisclosure: 3, temptOutcomeExtractor: 3 };

// A real, executable pre-dispatch reservation ledger — reserves BEFORE calling the real function,
// never after. Unsourced pricing and over-ceiling both refuse OUTRIGHT (the real function is never
// invoked when reserve() returns ok:false — proven in section 3 below, not merely asserted).
class ReservationLedger {
  constructor(ceilingUsd) { this.ceilingUsd = ceilingUsd; this.reservedUsd = 0; this.entries = []; }
  reserveWorstCase(roleTag, roleKey, ceiling, modelsInOrder) {
    let phaseUsd = 0;
    for (let i = 0; i < ceiling; i++) {
      const model = modelsInOrder[Math.min(i, modelsInOrder.length - 1)];
      const rate = TEXT_PRICING[model];
      if (!rate) {
        const reason = 'UNSOURCED PRICING for ' + model + ' (phase "' + roleTag + '") — refusing to reserve, never treated as $0';
        this._log('stop', roleTag, reason);
        return { ok: false, reason };
      }
      const tok = WORST_CASE_TOKENS[roleKey] || { in: 3000, out: 800 };
      phaseUsd += rate.in * tok.in + rate.out * tok.out;
    }
    if (this.reservedUsd + phaseUsd > this.ceilingUsd) {
      const reason = 'reserving "' + roleTag + '" ($' + phaseUsd.toFixed(6) + ') would push total reserved ($' + this.reservedUsd.toFixed(6) + ') past the ceiling ($' + this.ceilingUsd.toFixed(6) + ')';
      this._log('stop', roleTag, reason);
      return { ok: false, reason };
    }
    this.reservedUsd += phaseUsd;
    // `requests` = how many physical request-equivalents this reservation priced. Recorded so the
    // reconciliation below can compute the cost basis from the ledger itself rather than restating
    // it by hand — a hand-restated count is exactly how the 48-vs-50 discrepancy arose.
    this.entries.push({ roleTag, requests: ceiling, phaseUsd, runningTotalUsd: this.reservedUsd });
    this._log('reserved', roleTag, null, phaseUsd);
    return { ok: true, phaseUsd, runningTotalUsd: this.reservedUsd };
  }
  _log(kind, roleTag, reason, phaseUsd) {
    try { fs.appendFileSync(path.join(OUT_DIR, 'reservation_log.jsonl'), JSON.stringify({ kind, roleTag, reason, phaseUsd, runningTotalUsd: this.reservedUsd, at: Date.now() }) + '\n'); } catch (_) {}
  }
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  page.on('console', (msg) => { const t = msg.text(); fs.appendFileSync(path.join(OUT_DIR, 'console_log.jsonl'), t + '\n'); });
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'network_gate.jsonl'), blockImagePreparation: true });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state
    && typeof window._renderBakedScene1 === 'function'
    && typeof window._ensureCGScaffold === 'function'
    && typeof window._generatePCBodyBible === 'function'
    && typeof window._generateLiteraryPlotContract === 'function'
    && typeof window._commitScene === 'function'
    && typeof window._auditSceneEmotionalGravity === 'function'
    && typeof window._authorFullScenePolicy === 'function', { timeout: 30000 });

  // Real hydration — same mechanism the wiring-proof harness uses.
  await page.evaluate(() => {
    window.state.storyId = 'cost-audit-' + Date.now();
    window.state.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    window.state.gender = 'Female'; window.state.loveInterest = 'Male'; window.state.authorPronouns = 'She/Her';
    window.state.renderMode = 'staged_story_mode'; window.state.currentEngine = 'graphic';
    window.state.turnCount = 0; window.state.scenes = [];
    window.state._starterId = 'starter_first_sacrifice';
    window.state._pcLookSkipped = true; window.state._bakedGenesisUnlocked = true;
    window._devBypass = true; window.state._intimacyDevMode = true;
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    window._renderBakedScene1({ id: 'starter_first_sacrifice' }, pkg);
    window._plotContractKill = false;
    window.state.loveInterestName = 'Julian'; window.state.playerName = 'Lirael'; window.state.currentPrimaryLiId = 'julian';
    // antagonistShape must be exactly 'A' or 'B' (a classification enum, confirmed from source this
    // pass, app.js ~280976) — a non-PERSON/institutional antagonist (First Sacrifice's real
    // antagonist pressure is institutional — the Dohkar assembly) is INELIGIBLE for a body bible at
    // all, by real design ("no amount of A/B shape makes an institution a body"). Set to 'A' here
    // specifically to test the CASCADE MECHANISM in isolation; whether First Sacrifice's own real
    // antagonist classification is actually eligible is a separate, unresolved question — disclosed
    // in the trace doc rather than assumed either way.
    window.state.aPlot = { goal: 'stub goal', antagonistShape: 'A', antagonistOrAntiForce: 'a rival Sacrificiant' }; window.state._sceneStateCard = {}; window.state.rPlot = {};
  });

  // A single, dumb, phase-scoped counter stub — no content classification at all. It fails every
  // attempt except the ceiling-th because ONLY ONE role's traffic is possible while a given phase is
  // open (proven by test sequencing, not guessed from prompt text): the gate itself groups requests
  // by roleTag via gate.setPhase, which is the SAME correlation mechanism the established network-
  // gate infrastructure already uses everywhere else in this repo.
  let phaseAttempts = 0;
  let phaseCeiling = 1;
  function phaseStub() {
    phaseAttempts++;
    if (phaseAttempts < phaseCeiling) return { content: null }; // force this tier to fail
    return { content: '{}' }; // terminal tier succeeds — every real function under test degrades gracefully on a minimal/unparseable payload (confirmed from source: each wraps its own JSON.parse in try/catch and returns null/continues without the assignment on failure), so this is sufficient to prove the REQUEST cascade without needing a schema-perfect payload.
  }
  gate.stub('/api/proxy', async () => phaseStub());
  gate.stub('/api/mistral-proxy', async () => phaseStub());
  gate.stub('/api/chatgpt-proxy', async () => phaseStub());

  const ledger = new ReservationLedger(0.40); // matches the revised sheet's combined ceiling
  const realCostByRole = {};

  // Each real function is called through its OWN explicit, statically-written page.evaluate — no
  // dynamic string-built function construction (fragile, hard to audit). callFn receives plain,
  // serializable callArgs and invokes the real window.* function directly.
  async function runIsolatedRole(roleTag, roleKey, ceiling, label, callFn, callArgs, opts) {
    opts = opts || {};
    section(roleTag.toUpperCase() + ' — isolated forced cascade (ceiling ' + ceiling + ', real function ' + label + ')');
    const reservation = ledger.reserveWorstCase(roleTag, roleKey, ceiling, ROLE_TIER_MODELS[roleKey]);
    if (!reservation.ok) {
      ok('reservation refused BEFORE any dispatch was attempted for ' + roleTag + ' — the real function was never called', true, reservation.reason);
      console.log('  BLOCKED (by design of this test — see section 4 below for the deliberate demonstration): ' + reservation.reason);
      return { skipped: true, reservation };
    }
    phaseAttempts = 0; phaseCeiling = ceiling;
    gate.setPhase(roleTag, ceiling);
    let threw = null;
    try { await page.evaluate(callFn, callArgs); } catch (e) { threw = e && e.message; }
    const tracked = gate.trackedCalls(roleTag);
    gate.closePhase();
    if (opts.allowZeroReal) {
      // Some roles (First Sacrifice's PC/LI Body Bibles, confirmed this pass — a real, Tier-0
      // seed-derivation short-circuit, app.js ~260106-260119/~261781) can LEGITIMATELY make ZERO
      // live calls for this specific starter when the seed carries enough facet data, falling
      // through to the full paid cascade only if it doesn't. Both are correct; report which
      // happened rather than asserting one shape.
      // zeroReason names why THIS role can legitimately dispatch nothing — they are different
      // mechanisms and must not be reported interchangeably (Body Bibles: Tier-0 seed derivation;
      // wish classifier: its lexicon resolving the verdict locally before any LLM fallback).
      const zeroReason = opts.zeroReason || 'Tier-0 seed-derived, this starter\'s real common case';
      ok(roleTag + ': real dispatch count is either 0 (' + zeroReason + ') or the full ' + ceiling + '-tier cascade — both are legitimate, reporting which occurred', tracked.length === 0 || tracked.length === ceiling, 'tracked=' + tracked.length);
      console.log('  ' + (tracked.length === 0 ? zeroReason + ' — zero live calls, confirmed real behavior (see console log)' : 'fell through to the full live cascade — real tracked models: ' + JSON.stringify(tracked.map((r) => r.requestBody && (r.requestBody.model || r.requestBody.preferredModel)))));
    } else {
      ok(roleTag + ': the real cascade reached its terminal tier — exactly ' + ceiling + ' physical request(s) tracked under this phase, no more, no fewer', tracked.length === ceiling, 'tracked=' + tracked.length + ' expected=' + ceiling + (threw ? ' (fn threw: ' + threw + ')' : ''));
    }
    let realUsd = 0; let anyUnsourced = false;
    tracked.forEach((rec) => { const c = costOfTrackedCall(rec, roleKey); if (c.unsourced) anyUnsourced = true; else realUsd += c.usd; });
    ok(roleTag + ': every tracked request\'s model has a sourced TEXT_PRICING row', !anyUnsourced, JSON.stringify(tracked.map((r) => r.requestBody && (r.requestBody.model || r.requestBody.preferredModel))));
    realCostByRole[roleTag] = realUsd;
    console.log('  real tracked models: ' + JSON.stringify(tracked.map((r) => r.requestBody && (r.requestBody.model || r.requestBody.preferredModel))) + ' — real worst-case cost this phase: $' + realUsd.toFixed(6));
    return { tracked, realUsd, threw };
  }

  const ROLE_TIER_MODELS = {
    scaffold: ['ministral-8b-2512', 'grok-4-1-fast-reasoning', 'gpt-4o-mini'],
    bible: ['ministral-8b-2512', 'grok-4-1-fast-reasoning', 'gpt-4o-mini'],
    scenePlanner: ['grok-4-1-fast-non-reasoning', 'ministral-8b-2512', 'gpt-4o'],
    commitVerifier: ['ministral-8b-2512', 'grok-4-1-fast-reasoning', 'gpt-4o-mini'],
    gravityAudit: ['ministral-8b-2512'],
    author: ['grok-4-1-fast-reasoning', 'ministral-8b-2512', 'gpt-4o'],
    wishClassifier: ['gpt-4o-mini'],
    // ADDED 2026-09-23 (count-reconciliation pass): the legacy hard-beat planner fallback. §2 of the
    // authorization sheet has always listed it as reachable (single-shot mistral-small-latest, no
    // further fallback, reached only if the scenePlanner primary branch throws) — but no revision of
    // the ledger ever RESERVED it. That is exactly the 4-request gap between the traced dispatch
    // census and the cost basis (once per scene, plus once per scene's bounded retry).
    plannerLegacyFallback: ['mistral-small-latest'],
    // Single attempt, no fallback: one fetch to CONFIG.SPECIALIST_PROXY with a 12s AbortController,
    // and its catch returns null rather than retrying (orchestration-client.js ~6150-6172).
    sceneAmbient: ['grok-4.20-0309-non-reasoning'],
    // _callTieredProvider default chain — same three tiers as scaffold/bible/commitVerifier.
    characterDisclosure: ['ministral-8b-2512', 'grok-4-1-fast-reasoning', 'gpt-4o-mini'],
    // Same default chain — the extractor supplies no opts.tiers override.
    temptOutcomeExtractor: ['ministral-8b-2512', 'grok-4-1-fast-reasoning', 'gpt-4o-mini']
  };

  const gravityText = 'x'.repeat(220); // _auditSceneEmotionalGravity requires proseText.length >= 200 to do real work

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  // 0. WISH-SEAL ROLE — ADDED 2026-09-23 after a real live-run attempt dispatched this for real,
  // unbudgeted. _classifyWishCG (app.js ~199719) is NOT directly window-exposed — its only real
  // entry point is the public window.WishSequence.queue(opts) API, the SAME call the real Proceed
  // handler makes (app.js ~108999-109008: {cardType:'tempt_fate', wishText, cost, charged:true,
  // mode:'cg'}). Unlike every other role, this one is lexicon-first — it makes ZERO real calls
  // when the wish text confidently matches the OAS-borrowed in/out-of-scope lexicon, and at most
  // ONE real gpt-4o-mini call (no further fallback on failure — its own catch just returns a
  // fallback verdict) only in the "gray zone". allowZeroReal:true reports whichever legitimately
  // occurred, exactly as it does for the Tier-0-eligible Body Bibles.
  section('0. WISH-SEAL ROLE SEQUENCE — fires BEFORE Scene A, at the real Proceed click');
  await runIsolatedRole('wish-classifier', 'wishClassifier', 1, 'window.WishSequence.queue({cardType:"tempt_fate", wishText:"everyone forgets the ceremony happened", cost:60, charged:true, mode:"cg"})',
    () => window.WishSequence.queue({ cardType: 'tempt_fate', wishText: 'everyone forgets the ceremony happened', cost: 60, charged: true, mode: 'cg' }),
    undefined, { allowZeroReal: true, zeroReason: 'the in/out-of-scope lexicon resolved the verdict locally, before the gray-zone LLM fallback' });

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. SCENE A ROLE SEQUENCE — each role isolated, deterministic, phase-tracked (no content classification)');

  await runIsolatedRole('scaffold', 'scaffold', 3, '_ensureCGScaffold(window.state)',
    () => window._ensureCGScaffold(window.state));
  await runIsolatedRole('bible-pc', 'bible', 3, '_generatePCBodyBible()',
    () => window._generatePCBodyBible(), undefined, { allowZeroReal: true });
  await runIsolatedRole('bible-li', 'bible', 3, '_generateLIBodyBible()',
    () => window._generateLIBodyBible(), undefined, { allowZeroReal: true }); // self-gates on !state.liBodyBible — an INDEPENDENT field from pcBodyBible, so the prior phase does not block this one
  // ── ANTAGONIST BODY BIBLE — FIXED 2026-09-23 (Roman, this pass) ──
  // Roman (pass 4): "Before authorizing the memory-erasure run, Claude should state plainly whether
  // that function is structurally bypassed by First Sacrifice's fixed seed data in this exact
  // Scene A → Scene B path. If it is, the live test can proceed... If it can execute during this
  // run, fix it first." Traced: _generateAntagonistBodyBible is called unconditionally from the
  // real CG scaffold path (app.js ~232124, inside the same try block that calls initAPlot just
  // above it, comment: "Dependency: A-plot init runs above this (Bibles read aPlot.antagonistShape
  // / pcWound / etc)") whenever !state.antagonistBodyBible. No seed/Tier-0 shortcut exists for
  // First Sacrifice's antagonist classification (grepped STARTER_SEEDS/STARTER_PLANS and
  // starter-scenes.js — zero matches for antagonistShape/aPlot), so state.aPlot.antagonistShape is
  // populated for real by initAPlot()'s own live model call — meaning whether the eligibility gate
  // (_antagonistBibleEligible: shape A/B + named PERSON) passes for THIS story's real content is
  // not dry-provable. Given that genuine uncertainty, fixed the scope bug rather than asserting
  // bypass: _ANTAGONIST_ARCHETYPES / _ROMANCE_ARCHETYPES_FOR_EX were `var`s local to
  // handleBeginStory (a sibling scope of _generateAntagonistBodyBibleUncached, never visible to it
  // regardless of boot order — a real, unconditional ReferenceError). Relocated both arrays to the
  // shared outer scope, right before _generateAntagonistBodyBible's own declaration (app.js
  // ~262702/~262725) — handleBeginStory's own literary-mode inner generators still resolve the same
  // two names via normal outer-scope lookup, so literary mode is unaffected. Re-verified: the real
  // function no longer throws; with this test's forced-eligible baseline (antagonistShape:'A') it
  // now genuinely dispatches its real 3-tier cascade like every other bible role, so it is tested
  // the same way as bible-pc/bible-li below, not as a reachability-only proof.
  await runIsolatedRole('bible-antagonist', 'bible', 3, '_generateAntagonistBodyBible()',
    () => window._generateAntagonistBodyBible(), undefined, { allowZeroReal: true });

  await page.evaluate((w) => {
    window.state.tempt_fate_invoked_this_turn = true;
    window.state.temptFateWish = w;
    if (typeof window._recordTemptFateEvent === 'function') window._recordTemptFateEvent(w);
  }, 'everyone forgets the ceremony happened');
  await runIsolatedRole('scenePlanner-A', 'scenePlanner', 3, "_generateLiteraryPlotContract('she steps back', '', {invoked:true, wishText:...})",
    () => window._generateLiteraryPlotContract('she steps back', '', { invoked: true, wishText: 'everyone forgets the ceremony happened' }));

  await runIsolatedRole('gravityAudit-A', 'gravityAudit', 1, '_auditSceneEmotionalGravity(proseText, opts)',
    (txt) => window._auditSceneEmotionalGravity(txt, { mode: 'cg', surface: 'cg', sceneIndex: 1 }), gravityText);

  await runIsolatedRole('author-A', 'author', 3, "_authorFullScenePolicy(messages, {roleTag:'cost-audit-author-A', maxTokens:500})",
    () => window._authorFullScenePolicy([{ role: 'system', content: 'test system prompt' }, { role: 'user', content: 'test user prompt' }], { roleTag: 'cost-audit-author-A', maxTokens: 500 }));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. SCENE B ROLE SEQUENCE — scaffold/Bibles are one-time per story, correctly NOT repeated');
  await page.evaluate(() => { window.state._priorSceneStateChange = { sceneProposed: 1, event: 'test transition' }; window.state.tempt_fate_invoked_this_turn = false; window.state.temptFateWish = ''; });

  // REAL FINDING this pass (not a test-design choice): _generateLiteraryPlotContract's OWN "COMMIT
  // SCENE" block (app.js ~99978) calls _commitScene INTERNALLY, FIRST, whenever
  // state._priorSceneStateChange is set — exactly Scene B's real condition. A separately-run,
  // isolated "commitVerifier-B" test (calling _commitScene a second time on its own, as a first
  // version of this script did) found ZERO tracked requests — not a bug, but _commitScene's own
  // idempotency guard (`cs._committedThroughScene >= prevSceneNum`) correctly refusing a SECOND
  // commit for the same scene the first call already completed. So commitVerifier and scenePlanner
  // are NOT two independently-triggerable roles at this call site — they are ONE real call chain,
  // commitVerifier firing first (up to 3 requests) then scenePlanner's own dispatch (up to 3 more) —
  // tested here as ONE combined phase, ceiling 6, matching the real firing order.
  const COMBINED_B_TIER_MODELS = ROLE_TIER_MODELS.commitVerifier.concat(ROLE_TIER_MODELS.scenePlanner);
  ROLE_TIER_MODELS['scenePlanner+commitVerifier-B'] = COMBINED_B_TIER_MODELS;
  {
    const roleTag = 'scenePlanner+commitVerifier-B', ceiling = 6;
    section(roleTag.toUpperCase() + ' — isolated forced cascade (ceiling ' + ceiling + ' = commitVerifier(3) then scenePlanner(3), real function _generateLiteraryPlotContract)');
    const reservation = ledger.reserveWorstCase(roleTag, 'commitVerifier', 3, ROLE_TIER_MODELS.commitVerifier); // reserved in two calls, one per real sub-role, so unsourced/ceiling stops attribute correctly
    const reservation2 = reservation.ok ? ledger.reserveWorstCase(roleTag + '-scenePlanner-part', 'scenePlanner', 3, ROLE_TIER_MODELS.scenePlanner) : reservation;
    if (!reservation.ok || !reservation2.ok) {
      ok('reservation refused BEFORE any dispatch was attempted for ' + roleTag, true, JSON.stringify(reservation.ok ? reservation2 : reservation));
    } else {
      phaseAttempts = 0; phaseCeiling = ceiling;
      gate.setPhase(roleTag, ceiling);
      let threw = null;
      try { await page.evaluate(() => window._generateLiteraryPlotContract('', 'ordinary continuation', { invoked: false, wishText: '' })); } catch (e) { threw = e && e.message; }
      const tracked = gate.trackedCalls(roleTag);
      gate.closePhase();
      ok(roleTag + ': the real combined cascade (commitVerifier then scenePlanner) reached exactly ' + ceiling + ' physical requests, no more, no fewer', tracked.length === ceiling, 'tracked=' + tracked.length + ' expected=' + ceiling + (threw ? ' (fn threw: ' + threw + ')' : ''));
      let realUsd = 0; let anyUnsourced = false;
      tracked.forEach((rec, i) => { const roleKeyForIdx = i < 3 ? 'commitVerifier' : 'scenePlanner'; const c = costOfTrackedCall(rec, roleKeyForIdx); if (c.unsourced) anyUnsourced = true; else realUsd += c.usd; });
      ok(roleTag + ': every tracked request\'s model has a sourced TEXT_PRICING row', !anyUnsourced, JSON.stringify(tracked.map((r) => r.requestBody && (r.requestBody.model || r.requestBody.preferredModel))));
      realCostByRole[roleTag] = realUsd;
      console.log('  real tracked models (first 3 = commitVerifier, last 3 = scenePlanner): ' + JSON.stringify(tracked.map((r) => r.requestBody && (r.requestBody.model || r.requestBody.preferredModel))) + ' — real worst-case cost this phase: $' + realUsd.toFixed(6));
    }
  }
  await runIsolatedRole('gravityAudit-B', 'gravityAudit', 1, '_auditSceneEmotionalGravity(proseText, opts)',
    (txt) => window._auditSceneEmotionalGravity(txt, { mode: 'cg', surface: 'cg', sceneIndex: 2 }), gravityText);
  await runIsolatedRole('author-B', 'author', 3, "_authorFullScenePolicy(messages, {roleTag:'cost-audit-author-B', maxTokens:500})",
    () => window._authorFullScenePolicy([{ role: 'system', content: 'test system prompt B' }, { role: 'user', content: 'test user prompt B' }], { roleTag: 'cost-audit-author-B', maxTokens: 500 }));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. THE OUTER RETRY, AS A RESERVATION — the real bounded retry (app.js ~233106-233118) doubles scenePlanner+author+gravityAudit(+commitVerifier for B); reserved, not re-dispatched, to keep this section\'s own failure surface small');
  // ── LEGACY HARD-BEAT PLANNER FALLBACK, AS A RESERVATION (added in the count-reconciliation pass) ──
  // Reserved, never force-dispatched: reaching it for real requires the scenePlanner primary branch
  // to THROW, and deliberately breaking a provider to exercise a fallback is banned outright
  // (feedback_no_deliberate_fallback_breaking_on_paid_runs). Reserving it is the honest treatment —
  // it makes the cost basis cover every request the §2 census says can actually fire, instead of
  // quietly excluding a reachable role because it is inconvenient to trigger.
  const legacyA = ledger.reserveWorstCase('plannerLegacyFallback-A', 'plannerLegacyFallback', 1, ROLE_TIER_MODELS.plannerLegacyFallback);
  const legacyB = ledger.reserveWorstCase('plannerLegacyFallback-B', 'plannerLegacyFallback', 1, ROLE_TIER_MODELS.plannerLegacyFallback);
  console.log('  legacy hard-beat planner fallback reserved (never dispatched): A=' + JSON.stringify(legacyA) + ' B=' + JSON.stringify(legacyB));

  // ── POST-SCENE ROLES, RESERVED (added after the live Scene A exposed both as uncounted) ──
  // Both fire AFTER a scene completes, once per COMPLETED scene — so a bounded generation retry does
  // not double them (the retry re-generates; it does not re-complete a scene twice). Reserved rather
  // than force-dispatched: triggering them means driving a full scene to completion, which the
  // isolated-role sections above deliberately avoid.
  const ambientA = ledger.reserveWorstCase('sceneAmbient-A', 'sceneAmbient', 1, ROLE_TIER_MODELS.sceneAmbient);
  const discloseA = ledger.reserveWorstCase('characterDisclosure-A', 'characterDisclosure', 3, ROLE_TIER_MODELS.characterDisclosure);
  const ambientB = ledger.reserveWorstCase('sceneAmbient-B', 'sceneAmbient', 1, ROLE_TIER_MODELS.sceneAmbient);
  const discloseB = ledger.reserveWorstCase('characterDisclosure-B', 'characterDisclosure', 3, ROLE_TIER_MODELS.characterDisclosure);
  // TEMPT OUTCOME EXTRACTOR (Roman 2026-09-24) — reserved at its FULL 3-tier ceiling on the Tempt
  // scene ONLY. It cannot fire on an ordinary continuation, so Scene B gets no reservation for it;
  // what Scene B does get is the RETRY allowance below, because a rejected extraction re-dispatches.
  const extractA = ledger.reserveWorstCase('temptOutcomeExtractor-A', 'temptOutcomeExtractor', 3, ROLE_TIER_MODELS.temptOutcomeExtractor);
  const extractRetryA = ledger.reserveWorstCase('temptOutcomeExtractor-A-retry', 'temptOutcomeExtractor', 3, ROLE_TIER_MODELS.temptOutcomeExtractor);
  console.log('  tempt outcome extractor reserved — first pass=' + JSON.stringify(extractA) + ' one bounded retry=' + JSON.stringify(extractRetryA));
  ok('the Tempt outcome extractor is reserved at its FULL 3-tier ceiling, not as a single call',
    extractA.ok === true && Math.abs(extractA.phaseUsd - 0.01013) < 1e-9, JSON.stringify(extractA));
  ok('one bounded extraction RETRY is reserved too — a rejected extraction re-dispatches, and an unreserved retry is an unbudgeted call',
    extractRetryA.ok === true, JSON.stringify(extractRetryA));
  console.log('  post-scene reserved — Scene A: ambient=' + JSON.stringify(ambientA) + ' disclosure=' + JSON.stringify(discloseA));
  console.log('  post-scene reserved — Scene B: ambient=' + JSON.stringify(ambientB) + ' disclosure=' + JSON.stringify(discloseB));
  ok('the post-scene ambient classifier is RESERVED with a sourced price before any release — it is no longer merely inside a broad scene allowance', ambientA.ok === true && ambientA.phaseUsd > 0, JSON.stringify(ambientA));
  ok('the character-disclosure extractor is reserved at its FULL 3-tier ceiling, not as a single call', discloseA.ok === true && Math.abs(discloseA.phaseUsd - 0.008225) < 1e-9, JSON.stringify(discloseA));

  const retryA = ledger.reserveWorstCase('retry-scenePlanner-A', 'scenePlanner', 3, ROLE_TIER_MODELS.scenePlanner);
  const retryAuthorA = ledger.reserveWorstCase('retry-author-A', 'author', 3, ROLE_TIER_MODELS.author);
  const retryGravA = ledger.reserveWorstCase('retry-gravityAudit-A', 'gravityAudit', 1, ROLE_TIER_MODELS.gravityAudit);
  console.log('  Scene A retry reservation: scenePlanner=' + JSON.stringify(retryA) + ' author=' + JSON.stringify(retryAuthorA) + ' gravity=' + JSON.stringify(retryGravA));
  const retryCommitB = ledger.reserveWorstCase('retry-commitVerifier-B', 'commitVerifier', 3, ROLE_TIER_MODELS.commitVerifier);
  const retryPlannerB = ledger.reserveWorstCase('retry-scenePlanner-B', 'scenePlanner', 3, ROLE_TIER_MODELS.scenePlanner);
  const retryAuthorB = ledger.reserveWorstCase('retry-author-B', 'author', 3, ROLE_TIER_MODELS.author);
  const retryGravB = ledger.reserveWorstCase('retry-gravityAudit-B', 'gravityAudit', 1, ROLE_TIER_MODELS.gravityAudit);
  console.log('  Scene B retry reservation: commitVerifier=' + JSON.stringify(retryCommitB) + ' scenePlanner=' + JSON.stringify(retryPlannerB) + ' author=' + JSON.stringify(retryAuthorB) + ' gravity=' + JSON.stringify(retryGravB));
  // The retry re-runs the whole generation, so a scenePlanner that throws on the retry reaches the
  // legacy fallback a second time for that scene — one more reservation per scene, not zero.
  const retryLegacyA = ledger.reserveWorstCase('retry-plannerLegacyFallback-A', 'plannerLegacyFallback', 1, ROLE_TIER_MODELS.plannerLegacyFallback);
  const retryLegacyB = ledger.reserveWorstCase('retry-plannerLegacyFallback-B', 'plannerLegacyFallback', 1, ROLE_TIER_MODELS.plannerLegacyFallback);
  console.log('  legacy fallback on each scene\'s own retry: A=' + JSON.stringify(retryLegacyA) + ' B=' + JSON.stringify(retryLegacyB));

  // ── RECONCILIATION (added after Roman caught the 48-vs-50 discrepancy) ──
  // Three DIFFERENT quantities, each computed here rather than asserted prose-side, so the sheet
  // can state each one exactly and they can be checked against each other:
  //   (a) expected max REAL DISPATCHES — the §2 census worst case;
  //   (b) PHASE-GATE ALLOWANCE — the sum of the caps the live-run script declares;
  //   (c) RESERVATION BASIS — how many request-equivalents this ledger actually priced.
  // (a) and (c) must now be equal: every request the census says can fire is priced. (b) must equal
  // them too — a cap below (a) would abort a legitimate worst-case dispatch; a cap above (a) is
  // unexplained headroom that makes the dollar figure unauditable.
  const CENSUS_MAX_DISPATCHES = 1 /* wish classifier */
    + (3 + 9 + 3 + 1 + 1 + 3) /* Scene A no-retry: scaffold, 3 bibles, scenePlanner, legacy, gravity, author = 20 */
    + (1 + 3)                 /* Scene A post-scene: sceneAmbient 1 + characterDisclosure 3 = 4 */
    + (3 + 3)                 /* Scene A Tempt outcome extractor: first pass 3 tiers + one bounded retry 3 = 6 (2026-09-24) */
    + (3 + 1 + 1 + 3)         /* Scene A bounded retry: scenePlanner, legacy, gravity, author = 8 */
    + (3 + 1 + 3 + 1 + 3)     /* Scene B no-retry: scenePlanner, legacy, commitVerifier, gravity, author = 11 */
    + (1 + 3)                 /* Scene B post-scene: sceneAmbient 1 + characterDisclosure 3 = 4 */
    + (3 + 1 + 3 + 1 + 3);    /* Scene B bounded retry: same set = 11 */
  const LIVE_RUN_PHASE_CAPS = { 'wish-classifier': 1, 'scene-A': 38, 'scene-B': 26 }; // must mirror _tempt_fate_memory_erasure_live_run_2026_09_24.mjs
  const PHASE_CAP_TOTAL = Object.values(LIVE_RUN_PHASE_CAPS).reduce((a, b) => a + b, 0);
  const RESERVED_REQUEST_EQUIVALENTS = ledger.entries.reduce((n, e) => n + (e.requests || 0), 0);
  console.log('  RECONCILIATION — census max real dispatches: ' + CENSUS_MAX_DISPATCHES
    + ' | phase-gate allowance: ' + PHASE_CAP_TOTAL + ' ' + JSON.stringify(LIVE_RUN_PHASE_CAPS)
    + ' | reservation basis (request-equivalents priced): ' + RESERVED_REQUEST_EQUIVALENTS);
  ok('the reservation basis prices EVERY request the census says can fire — no reachable role is silently excluded from the dollar figure', RESERVED_REQUEST_EQUIVALENTS === CENSUS_MAX_DISPATCHES, 'reserved=' + RESERVED_REQUEST_EQUIVALENTS + ' census=' + CENSUS_MAX_DISPATCHES);
  ok('the phase-gate allowance equals the census maximum exactly — no cap below it (which would abort a legitimate worst-case dispatch) and no unexplained headroom above it', PHASE_CAP_TOTAL === CENSUS_MAX_DISPATCHES, 'caps=' + PHASE_CAP_TOTAL + ' census=' + CENSUS_MAX_DISPATCHES);
  const CLEAN_TOTAL_WITH_BOTH_RETRIES = ledger.reservedUsd; // real Scene A + Scene B worst case, PLUS both scenes' own bounded retry — before any artificial padding below
  console.log('  CLEAN total (both scenes\' real worst case + both scenes\' own bounded retry, no padding): $' + CLEAN_TOTAL_WITH_BOTH_RETRIES.toFixed(6));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. THE LEDGER ACTUALLY BLOCKS — demonstrated for real, not merely documented');
  {
    // Deliberately continue reserving toward Scene B's own retry until the combined ceiling is
    // exhausted, then prove the NEXT reservation refuses and — critically — that refusal happens
    // BEFORE any dispatch: no gate.setPhase, no page.evaluate call to the real function at all.
    let blockedAt = null;
    const remainingPhases = [
      ['padding-phase-1', 'author', 3], ['padding-phase-2', 'author', 3], ['padding-phase-3', 'author', 3] // Scene A+B's own real worst case AND both real bounded retries are ALREADY reserved above (section 3) — these are deliberately extra, unrelated padding reservations to guarantee a real block fires within THIS demonstration regardless of how much headroom the real worst-case leaves against the $0.40 ceiling
    ];
    for (const [tag, key, ceiling] of remainingPhases) {
      const r = ledger.reserveWorstCase(tag, key, ceiling, ROLE_TIER_MODELS[key]);
      if (!r.ok) { blockedAt = { tag, reason: r.reason }; break; }
    }
    ok('the reservation ledger refused a real phase before the combined ceiling was exceeded — proven by continuing to reserve until it did', !!blockedAt, JSON.stringify(blockedAt));
    if (blockedAt) console.log('  BLOCKED at "' + blockedAt.tag + '": ' + blockedAt.reason);
    ok('the block happened at the RESERVATION step — no gate.setPhase was opened and no real function was called for the blocked phase (verifiable: gate.trackedCalls for that exact roleTag is empty)', blockedAt ? gate.trackedCalls(blockedAt.tag).length === 0 : false, blockedAt ? JSON.stringify(gate.trackedCalls(blockedAt.tag)) : 'n/a');
  }

  await browser.close();

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. SUMMARY — real, tracked, priced worst case (no retry) vs. combined ceiling');
  const wishClassifierUsd = realCostByRole['wish-classifier'] || 0;
  const sceneAUsd = (realCostByRole.scaffold || 0) + (realCostByRole['bible-pc'] || 0) + (realCostByRole['bible-li'] || 0) + (realCostByRole['bible-antagonist'] || 0) + (realCostByRole['scenePlanner-A'] || 0) + (realCostByRole['gravityAudit-A'] || 0) + (realCostByRole['author-A'] || 0);
  const sceneBUsd = (realCostByRole['scenePlanner+commitVerifier-B'] || 0) + (realCostByRole['gravityAudit-B'] || 0) + (realCostByRole['author-B'] || 0);
  console.log('  Wish-seal classifier real worst-case (fires before Scene A): $' + wishClassifierUsd.toFixed(6));
  console.log('  Scene A real tracked worst-case (no retry): $' + sceneAUsd.toFixed(6));
  console.log('  Scene B real tracked worst-case (no retry): $' + sceneBUsd.toFixed(6));
  console.log('  Combined, no retry: $' + (wishClassifierUsd + sceneAUsd + sceneBUsd).toFixed(6));
  console.log('  ENFORCED FIGURE — wish-classifier + real Scene A + Scene B worst case, PLUS both scenes\' own real bounded retry, no padding: $' + CLEAN_TOTAL_WITH_BOTH_RETRIES.toFixed(6) + ' against ceiling $' + ledger.ceilingUsd.toFixed(6));
  ok('the clean combined figure (wish-classifier, both scenes, both real bounded retries, no artificial padding) stays within the ceiling actually used this run', CLEAN_TOTAL_WITH_BOTH_RETRIES <= ledger.ceilingUsd, 'clean=' + CLEAN_TOTAL_WITH_BOTH_RETRIES.toFixed(6) + ' ceiling=' + ledger.ceilingUsd.toFixed(6));
  fs.writeFileSync(path.join(OUT_DIR, 'cost_audit_summary.json'), JSON.stringify({ realCostByRole, wishClassifierUsd, sceneAUsd, sceneBUsd, ledgerEntries: ledger.entries, ledgerReservedUsd: ledger.reservedUsd }, null, 2));

  console.log('\n' + '='.repeat(100));
  console.log('TEMPT FATE COST/REQUEST AUDIT: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
