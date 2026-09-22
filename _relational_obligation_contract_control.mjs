// RELATIONAL OBLIGATION CONTRACT — DRY CONTROL (Roman, 2026-09-22)
//
// Roman, after the paid Temptation attempt 5 sample: "the planner treated Temptation as 'Lirael
// conceals institutional evidence' and let that objective replace the romantic interaction. That
// is not good enough for a Fate-card continuation. The card choice has to shape both the aftermath
// lane and the LI/romance pressure... Dry-fix the planner contract first." And, on scope: "Make
// this generic across Storybound starters, not First-Sacrifice-only... Do not hard-code 'Julian
// must respond' as a global rule... For another starter, the target, relationship type, and valid
// response grammar should come from that starter's own plan/scene frame/cast metadata."
//
// Implemented, all in public/app.js:
//   1. _relationalObligationForPosture(s, act, dia) — GENERIC detector. A scene follows a
//      relationship-bearing submission when act/dia is byte-identical to the scene ledger's most
//      recent oas_interrupt commit (fires for a selected Fate-card OR fully custom Say/Do,
//      identically — the mechanism only exists inside an intimate encounter). Target resolved via
//      the ALWAYS-POPULATED anchorRole==='li' roster anchor (_relEnsureAnchors, generic to any
//      starter — label sourced from state.loveInterestName/partnerName), falling back to the
//      archived OAS snapshot's own liName. Never a hardcoded name anywhere.
//   2. _validateLocalObjective(reply, eff, relObligation) — extended, additive third param.
//      Reject-only, mechanical (non-empty + minimum length, never semantic judgment): when
//      relObligation is set AND its target is among the reply's own declared `present` cast,
//      li_pressure_actor must be present and substantive.
//   3. The open-row planner prompt gains a dedicated, HARD schema-request block for
//      li_pressure_actor whenever _relObligation is set — decoupled from the aftermath-lane menu
//      system entirely (fires for any starter, whether or not it uses that system). The prior
//      unconditional-optional mention of the same field is suppressed when this new block already
//      covers it, avoiding contradictory instructions in one prompt.
//   4. _buildLiveHandoffDirective gains section 4, surfacing the accepted plan's own
//      (now-validated) li_pressure_actor to the author as a HARD commitment — previously this field
//      existed only as unread telemetry.
//   5. _sanitizeCommittedInterruptionText(text) — new, applied inside _commitIntimateInterruption —
//      strips a balanced **bold** or *italic* wrapper around a WHOLE field (the batch-preview
//      format's own markup, which the authoritative parser never unwraps), fixing exactly
//      Temptation attempt 5's real "action":"**" / "dialogue":"*\"...\"*" artifacts at the single
//      authoritative commit point every source (card click, edited card, custom text) passes
//      through.
//
// Proves, fully dry (no provider calls; RED fixtures are Temptation attempt 5's OWN real,
// already-paid planner/report records, read from disk, not re-typed or re-paraphrased):
//   A. SANITIZER — the real "**" and "*\"...\"*" artifacts clean correctly; ordinary text and
//      legitimate mid-sentence asterisks are not mangled.
//   B. DETECTOR — matches only the exact act/dia of the ledger's own most recent oas_interrupt;
//      resolves the target via the roster's li anchor; returns null with no ledger entry or a
//      non-matching act/dia.
//   C. VALIDATOR BITES RED — Temptation attempt 5's REAL planner reply (chosen_aftermath_lane:
//      "lirael_defensive_path", li_pressure_actor absent, Julian genuinely in `present`) is
//      REJECTED by the extended validator, with a relational-obligation reason.
//   D. VALIDATOR GREEN — the SAME real reply, with a substantive li_pressure_actor added, PASSES.
//   E. NOT ENFORCED WHEN TARGET ABSENT — the relational check does not fire when the target isn't
//      in the reply's own declared `present`.
//   F. GENERICITY — a synthetic non-First-Sacrifice fixture (different LI name, different lane)
//      exercises the identical RED/GREEN behavior; source-traced to confirm zero hardcoded names
//      anywhere in the new code.
//   G. HANDOFF SECTION 4 — appears only when stateChange.liPressureActor is set; absent otherwise;
//      other sections unaffected.
//   H. COMMIT-POINT SANITIZATION — _commitIntimateInterruption, fed the REAL raw markdown-wrapped
//      card text, produces clean r.action/r.dialogue and a clean ledger entry.
//
// usage: node _relational_obligation_contract_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 900) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── Temptation attempt 5's REAL planner reply — read from its own persisted, already-paid log ──
const ATTEMPT5_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1790056249109.jsonl');
const attempt5Events = fs.readFileSync(ATTEMPT5_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const plannerResp = attempt5Events.find((e) => e.kind === 'response' && e.responseBody && e.responseBody.usage && e.responseBody.usage.total_tokens === 7829);
const REAL_PLANNER_REPLY = JSON.parse(plannerResp.responseBody.choices[0].message.content);
console.log('✓ loaded Temptation attempt 5\'s REAL planner reply verbatim from ' + ATTEMPT5_LOG);
console.log('  real chosen_aftermath_lane: "' + REAL_PLANNER_REPLY.chosen_aftermath_lane + '" | li_pressure_actor present: ' + ('li_pressure_actor' in REAL_PLANNER_REPLY));
const REAL_EFF = {
  roster: [{ label: 'Lirael', ref: 'pc' }, { label: 'Seren', ref: 'ent:seren' }, { label: 'Julian', ref: 'li' }, { label: 'the presiding Dohkar', ref: 'ent:dohkar' }],
  collectives: [{ label: 'the assembly' }],
  reserved: [], aftermathTruths: []
};
// The real Say/Do submitted to this scene (Temptation attempt 5) — matches the ledger's own
// oas_interrupt commit exactly, which is what makes the detector fire in section C below.
const REAL_ACT = '**';
const REAL_DIA = '*"Let the wind of your breath unravel me, as I\u2019ve unraveled yours by oath."*';
// The RAW, pre-commit card text (before ANY sanitization) — the batch-preview format's own
// markdown, read from the real, already-paid 2026-09-19 log (same source Temptation attempt 5's
// card batch replayed from).
const RAW_CARD_ACTION = '**Unlace my corset with fingers that tremble like leaves**';
const RAW_CARD_DIALOGUE = '*"Let the wind of your breath unravel me, as I\u2019ve unraveled yours by oath."*';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_relational_obligation_contract_control_out.jsonl') });
  // No stubs registered deliberately — this control never drives a real turn/submit; any /api/**
  // call at all would be a genuine harness bug (fail-closed abort surfaces it immediately).

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state
    && typeof window._validateLocalObjective === 'function'
    && typeof window._relationalObligationForPosture === 'function'
    && typeof window._sanitizeCommittedInterruptionText === 'function'
    && typeof window._buildLiveHandoffDirective === 'function'
    && typeof window._commitIntimateInterruption === 'function'
    && typeof window._sceneLedgerCommit === 'function'
    && typeof window._sceneLedgerGet === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or new functions not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached, all new functions exposed on window\n');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('A. SANITIZER — the real markdown artifacts clean correctly, ordinary text is untouched');
  {
    const r = await page.evaluate(({ rawAction, rawDialogue }) => ({
      action: window._sanitizeCommittedInterruptionText(rawAction),
      dialogue: window._sanitizeCommittedInterruptionText(rawDialogue),
      brokenDouble: window._sanitizeCommittedInterruptionText('**'),
      brokenSingle: window._sanitizeCommittedInterruptionText('*'),
      plain: window._sanitizeCommittedInterruptionText('I keep my hands folded at my waist.'),
      midSentenceAsterisk: window._sanitizeCommittedInterruptionText('He whispered *quietly* before leaving.'),
      empty: window._sanitizeCommittedInterruptionText(''),
      nullish: window._sanitizeCommittedInterruptionText(null),
    }), { rawAction: RAW_CARD_ACTION, rawDialogue: RAW_CARD_DIALOGUE });
    ok('real raw "**Unlace my corset...leaves**" action sanitizes to the clean sentence', r.action === 'Unlace my corset with fingers that tremble like leaves', r.action);
    ok('real raw "*\\"Let the wind...oath.\\"*" dialogue sanitizes to the clean quoted line (quotes kept)', r.dialogue === '"Let the wind of your breath unravel me, as I\u2019ve unraveled yours by oath."', r.dialogue);
    ok('a bare "**" (Temptation attempt 5\'s own real committed artifact) sanitizes to empty', r.brokenDouble === '', JSON.stringify(r.brokenDouble));
    // A single, unpaired asterisk is not a wrapper at all (a wrapper needs a matching open AND
    // close) — correctly left untouched, not stripped. Confirms the sanitizer only ever acts on a
    // genuinely BALANCED whole-field wrapper, never single stray characters.
    ok('a single unpaired "*" (not a balanced wrapper) is correctly left untouched', r.brokenSingle === '*', JSON.stringify(r.brokenSingle));
    ok('ordinary text with no markdown wrapper is completely untouched', r.plain === 'I keep my hands folded at my waist.', r.plain);
    ok('a mid-sentence *aside* (not a whole-field wrapper) is left alone — this sanitizer only strips a wrapper around the ENTIRE field', r.midSentenceAsterisk === 'He whispered *quietly* before leaving.', r.midSentenceAsterisk);
    ok('empty input sanitizes to empty, no throw', r.empty === '', JSON.stringify(r.empty));
    ok('null input sanitizes to empty, no throw', r.nullish === '', JSON.stringify(r.nullish));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('B. DETECTOR — matches only the exact act/dia of the ledger\'s own most recent oas_interrupt, resolves target via the LI anchor');
  {
    // PRIMARY target-resolution path: the roster's anchorRole==='li' entity, via _relLedger — which
    // (like the existing ROSTER display line at app.js ~100033) reads window.state internally, not
    // a passed-in parameter. Every REAL caller passes s===window.state (the scene-spine planner's
    // own `s`), so this is exercised against the real global state, saved/restored around the test.
    const savedState = await page.evaluate(() => { const keys = ['storyId', 'loveInterestName', 'partnerName', '_relationshipLedger', '_sceneLedger']; const saved = {}; keys.forEach((k) => { saved[k] = window.state[k]; }); return saved; });
    const r1 = await page.evaluate(({ act, dia }) => {
      window.state.storyId = 'relobl-B1-' + Date.now();
      window.state.loveInterestName = 'Julian';
      delete window.state._relationshipLedger;
      window.state._sceneLedger = null;
      // window._relLedger is exposed READ-ONLY (always create:false) — _relEntityForName calls the
      // INTERNAL _relLedger(true) as its own first line, so a throwaway lookup is the exposed way
      // to force the ledger (and _relEnsureAnchors' anchorRole:'li' entity) into existence.
      window._relEntityForName('Julian', {});
      const L = window._sceneLedgerGet(window.state, true);
      L.entries.push({ kind: 'oas_interrupt', sceneNumber: 1, act: act, dia: dia, posture: 'temptation' });
      const matched = window._relationalObligationForPosture(window.state, act, dia);
      const noMatch = window._relationalObligationForPosture(window.state, 'completely different action', 'completely different dialogue');
      return { matched, noMatch };
    }, { act: REAL_ACT, dia: REAL_DIA });
    await page.evaluate((saved) => { Object.keys(saved).forEach((k) => { window.state[k] = saved[k]; }); }, savedState);
    ok('PRIMARY path (roster LI anchor via window.state, matching every real caller) — matching act/dia resolves an obligation', !!(r1.matched && r1.matched.targetLabel), JSON.stringify(r1.matched));
    ok('PRIMARY path — resolved target is "Julian", sourced from state.loveInterestName via the generic LI anchor, never hardcoded', r1.matched && r1.matched.targetLabel === 'Julian', JSON.stringify(r1.matched));
    ok('PRIMARY path — resolved postureLabel is the human label "Temptation" (from _INTR_SLOTS, not the raw key)', r1.matched && r1.matched.postureLabel === 'Temptation', JSON.stringify(r1.matched));
    ok('PRIMARY path — non-matching act/dia (this planning pass is NOT reasoning over that commit) returns null', r1.noMatch === null, JSON.stringify(r1.noMatch));

    // FALLBACK target-resolution path: the archived OAS snapshot's own liName — fully
    // self-contained on a passed-in `s`, proven here with a deliberately isolated local object
    // that has NO relationship ledger at all, so only the fallback can possibly resolve it.
    const r2 = await page.evaluate(({ act, dia }) => {
      const s = { storyId: 'relobl-B2-' + Date.now(), _oasSceneSnapshots: { '1': { liName: 'Julian', beats: [] } } };
      const L = window._sceneLedgerGet(s, true);
      L.entries.push({ kind: 'oas_interrupt', sceneNumber: 1, act: act, dia: dia, posture: 'temptation' });
      return window._relationalObligationForPosture(s, act, dia);
    }, { act: REAL_ACT, dia: REAL_DIA });
    ok('FALLBACK path (_oasSceneSnapshots.liName, no relationship ledger available) also resolves the target correctly', r2 && r2.targetLabel === 'Julian', JSON.stringify(r2));

    const r3 = await page.evaluate(({ act, dia }) => {
      const s = { storyId: 'relobl-B3-' + Date.now() };   // no ledger entries at all
      return window._relationalObligationForPosture(s, act, dia);
    }, { act: REAL_ACT, dia: REAL_DIA });
    ok('no oas_interrupt entry at all in the ledger returns null', r3 === null, JSON.stringify(r3));

    // COSMETIC LABEL FIX (Roman 2026-09-22) — real finding: attempt 9's real dispatched planner
    // request read "the love interest" instead of "Julian", because _relEnsureAnchors only checked
    // TOP-LEVEL state.loveInterestName/partnerName — the real First Sacrifice harness (and the
    // established convention at dozens of other call sites — app.js ~8213, ~40795, ~60578, etc.)
    // populates the LI's name at the NESTED state.picks.identity.partnerName instead. This section
    // uses ONLY that nested field (no top-level loveInterestName/partnerName at all) — the exact
    // shape the earlier PRIMARY-path test above did NOT cover (it set loveInterestName directly,
    // which already worked before this fix and would not have caught this gap).
    const savedState4 = await page.evaluate(() => { const keys = ['storyId', 'loveInterestName', 'partnerName', 'picks', '_relationshipLedger', '_sceneLedger']; const saved = {}; keys.forEach((k) => { saved[k] = window.state[k]; }); return saved; });
    const r4 = await page.evaluate(({ act, dia }) => {
      window.state.storyId = 'relobl-B4-' + Date.now();
      delete window.state.loveInterestName;
      delete window.state.partnerName;
      window.state.picks = Object.assign({}, window.state.picks, { identity: Object.assign({}, window.state.picks && window.state.picks.identity, { partnerName: 'Julian' }) });
      delete window.state._relationshipLedger;
      window.state._sceneLedger = null;
      window._relEntityForName('Julian', {});
      const L = window._sceneLedgerGet(window.state, true);
      L.entries.push({ kind: 'oas_interrupt', sceneNumber: 1, act: act, dia: dia, posture: 'temptation' });
      return window._relationalObligationForPosture(window.state, act, dia);
    }, { act: REAL_ACT, dia: REAL_DIA });
    await page.evaluate((saved) => { Object.keys(saved).forEach((k) => { window.state[k] = saved[k]; }); }, savedState4);
    ok('NESTED-FIELD path — with ONLY state.picks.identity.partnerName set (matching the real harness/app), the target resolves to "Julian", not the generic fallback', r4 && r4.targetLabel === 'Julian', JSON.stringify(r4));

    // NATURAL EARLY-RUN STATE (Roman 2026-09-22) — real finding, attempt 10: the PRIMARY path
    // (_relLedger) genuinely returns null this early in a real run (no relationship ledger has been
    // created yet by anything) — confirmed here directly, WITHOUT the _relEntityForName forcing call
    // every other section in this file uses — so the FALLBACK path (_oasSceneSnapshots.liName) is
    // what a real dispatch actually depends on. That field is populated by a SEPARATE function (the
    // OAS-archive builder, ~app.js:200205) this control cannot trivially re-trigger in isolation
    // (it requires a full live OAS turn + interruption commit) — so this proves the fix at the
    // SOURCE level (the exact fixed expression is present, unmodified from what was written) AND by
    // replicating that exact expression against the natural state shape, rather than re-deriving
    // the whole OAS archive flow. A full live-flow re-confirmation remains open if ever warranted.
    const primaryPathReallyEmpty = await page.evaluate(() => {
      const sid = 'relobl-B5-' + Date.now();
      window.state.storyId = sid;
      delete window.state._relationshipLedger;
      return window._relLedger() === null;   // exposed wrapper is always create:false
    });
    ok('CONFIRMED: with no prior ledger-creating call, _relLedger() genuinely returns null this early — the fallback path is not a hypothetical, it is what a real run actually hits', primaryPathReallyEmpty === true, primaryPathReallyEmpty);

    const appJsSrc = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
    const liNameSourceFixed = appJsSrc.indexOf("var _liName = (state.storybeau && state.storybeau.name) || state.loveInterestName || (state.picks && state.picks.identity && state.picks.identity.partnerName) || 'the love interest';") !== -1;
    ok('SOURCE-TRACED: the OAS-archive builder\'s _liName line (the fallback the real dispatch actually depends on) now includes the nested state.picks.identity.partnerName check, exact text present in app.js', liNameSourceFixed === true, liNameSourceFixed);

    // Replicates the EXACT fixed expression (copy-pasted, not reimplemented) against the natural
    // early-run shape: only the nested field set, no storybeau, no top-level loveInterestName —
    // proving the FORMULA itself resolves to "Julian" under the real conditions attempt 10 hit.
    const naturalShapeResolvesToJulian = await page.evaluate(() => {
      const state = { picks: { identity: { partnerName: 'Julian' } } };
      var _liName = (state.storybeau && state.storybeau.name) || state.loveInterestName || (state.picks && state.picks.identity && state.picks.identity.partnerName) || 'the love interest';
      return _liName;
    });
    ok('the exact fixed expression, given ONLY the nested field (no storybeau, no top-level loveInterestName — the natural early-run shape), resolves to "Julian", not "the love interest"', naturalShapeResolvesToJulian === 'Julian', naturalShapeResolvesToJulian);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('C. VALIDATOR BITES RED — Temptation attempt 5\'s REAL planner reply, unmodified, is REJECTED');
  {
    const r = await page.evaluate(({ reply, eff, relObligation }) => window._validateLocalObjective(reply, eff, relObligation), { reply: REAL_PLANNER_REPLY, eff: REAL_EFF, relObligation: { targetLabel: 'Julian', postureLabel: 'Temptation', sourceKind: 'card' } });
    ok('the real, unmodified attempt-5 reply is REJECTED', r.ok === false, JSON.stringify(r));
    ok('the rejection reason names the relational obligation and Julian specifically', r.why.some((w) => /relational obligation/.test(w) && /Julian/.test(w)), JSON.stringify(r.why));
    ok('every PRE-EXISTING check still passes on this real reply (local_objective/posture_read/present/actor/reserved/aftermath) — only the NEW check fires', r.why.every((w) => /relational obligation/.test(w)), JSON.stringify(r.why));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('D. VALIDATOR GREEN — the SAME real reply, with a substantive li_pressure_actor added, PASSES');
  {
    const withResponse = Object.assign({}, REAL_PLANNER_REPLY, { li_pressure_actor: 'Julian\'s jaw tightens at the challenge in her voice; he holds his ground but does not look away, the restraint itself an answer to what she offered.' });
    const r = await page.evaluate(({ reply, eff, relObligation }) => window._validateLocalObjective(reply, eff, relObligation), { reply: withResponse, eff: REAL_EFF, relObligation: { targetLabel: 'Julian', postureLabel: 'Temptation', sourceKind: 'card' } });
    ok('the same reply, with a real li_pressure_actor added, is ACCEPTED', r.ok === true, JSON.stringify(r));
    ok('the accepted result carries the li_pressure_actor text back to the caller', r.liPressureActor && r.liPressureActor.indexOf('Julian') !== -1, JSON.stringify(r.liPressureActor));
  }
  {
    // A trivially thin placeholder must still be rejected — mechanical length floor, not a rubber stamp.
    const thin = Object.assign({}, REAL_PLANNER_REPLY, { li_pressure_actor: 'He watches.' });
    const r = await page.evaluate(({ reply, eff, relObligation }) => window._validateLocalObjective(reply, eff, relObligation), { reply: thin, eff: REAL_EFF, relObligation: { targetLabel: 'Julian', postureLabel: 'Temptation', sourceKind: 'card' } });
    ok('a trivially thin li_pressure_actor ("He watches.") is still REJECTED — non-empty alone is not enough', r.ok === false && r.why.some((w) => /too thin/.test(w)), JSON.stringify(r));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('E. NOT ENFORCED WHEN TARGET ABSENT — the check does not fire if the reply itself never declares the target present');
  {
    const withoutJulianPresent = Object.assign({}, REAL_PLANNER_REPLY, { present: ['Lirael', 'Seren', 'the presiding Dohkar', 'the assembly'] });
    const r = await page.evaluate(({ reply, eff, relObligation }) => window._validateLocalObjective(reply, eff, relObligation), { reply: withoutJulianPresent, eff: REAL_EFF, relObligation: { targetLabel: 'Julian', postureLabel: 'Temptation', sourceKind: 'card' } });
    ok('no relational-obligation rejection when the target (Julian) is not among the reply\'s own declared present cast', !r.why.some((w) => /relational obligation/.test(w)), JSON.stringify(r.why));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('F. GENERICITY — a synthetic NON-First-Sacrifice fixture exercises the identical RED/GREEN behavior; source has zero hardcoded names');
  {
    const OTHER_EFF = { roster: [{ label: 'Mira', ref: 'pc' }, { label: 'Corvin', ref: 'li' }, { label: 'the Steward', ref: 'ent:steward' }], collectives: [], reserved: [], aftermathTruths: [] };
    const OTHER_RED = { local_objective: 'Mira hides the forged seal from the Steward before the audit closes', posture_read: 'Mira answers Corvin\'s dare with defiant composure', local_objective_actor: 'Mira', present: ['Mira', 'Corvin', 'the Steward'], reserved: {}, aftermath: {}, chosen_aftermath_lane: 'mira_concealment_path' };
    const rRed = await page.evaluate(({ reply, eff, relObligation }) => window._validateLocalObjective(reply, eff, relObligation), { reply: OTHER_RED, eff: OTHER_EFF, relObligation: { targetLabel: 'Corvin', postureLabel: 'Reversal', sourceKind: 'card' } });
    ok('synthetic non-First-Sacrifice RED fixture (LI="Corvin", no li_pressure_actor) is REJECTED', rRed.ok === false && rRed.why.some((w) => /relational obligation/.test(w) && /Corvin/.test(w)), JSON.stringify(rRed.why));
    const OTHER_GREEN = Object.assign({}, OTHER_RED, { li_pressure_actor: 'Corvin studies her hands on the seal, then steps between her and the doorway without a word, choosing her side before he chooses the Steward\'s.' });
    const rGreen = await page.evaluate(({ reply, eff, relObligation }) => window._validateLocalObjective(reply, eff, relObligation), { reply: OTHER_GREEN, eff: OTHER_EFF, relObligation: { targetLabel: 'Corvin', postureLabel: 'Reversal', sourceKind: 'card' } });
    ok('the same synthetic fixture, with Corvin\'s own response added, PASSES', rGreen.ok === true, JSON.stringify(rGreen));

    const src = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
    const newFnStart = src.indexOf('function _relationalObligationForPosture');
    const newFnEnd = src.indexOf('window._relationalObligationForPosture = _relationalObligationForPosture;');
    const relFnSrc = (newFnStart >= 0 && newFnEnd > newFnStart) ? src.slice(newFnStart, newFnEnd) : '';
    ok('_relationalObligationForPosture source contains no hardcoded "Julian" (fully generic)', relFnSrc.length > 0 && !/Julian/.test(relFnSrc), 'fn length=' + relFnSrc.length);
    const schemaBlockStart = src.indexOf('RELATIONAL OBLIGATION — prompt side');
    const schemaBlockEnd = schemaBlockStart >= 0 ? src.indexOf("\n            }", schemaBlockStart) : -1;
    const schemaBlockSrc = (schemaBlockStart >= 0 && schemaBlockEnd > schemaBlockStart) ? src.slice(schemaBlockStart, schemaBlockEnd) : '';
    ok('the new planner schema-request block was found in source', schemaBlockSrc.length > 0, 'not found');
    ok('the new planner schema-request block interpolates _relObligation.targetLabel (a variable)', schemaBlockSrc.indexOf('_relObligation.targetLabel') !== -1, schemaBlockSrc.slice(0, 300));
    ok('the new planner schema-request block contains no hardcoded "Julian" — the target name is ALWAYS the variable', !/Julian/.test(schemaBlockSrc), schemaBlockSrc.slice(0, 300));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('G. HANDOFF SECTION 4 — appears only when stateChange.liPressureActor is set, absent otherwise, other sections unaffected');
  {
    const r = await page.evaluate(() => {
      const base = {
        storyId: 'relobl-G-' + Date.now(),
        _oasSceneSnapshots: { '1': { liName: 'Julian', beats: [{ pcSayRaw: 'Then step forward, Julian.', pcDoRaw: 'I keep my hands folded.', liDialogue: 'The hunger in your gaze called louder than the rite itself.' }] } },
        _sceneLedger: { storyId: '', entries: [{ kind: 'oas_interrupt', sceneNumber: 1, act: 'a', dia: 'b', posture: 'temptation' }] },
      };
      base._sceneLedger.storyId = base.storyId;
      const withLpa = Object.assign({}, base, { _sceneObjectives: { '2': { posture_read: 'she meets his gaze', stateChange: { liPressureActor: 'Julian answers her challenge with a held stare, refusing to look away.' } } } });
      const withoutLpa = Object.assign({}, base, { _sceneObjectives: { '2': { posture_read: 'she meets his gaze', stateChange: {} } } });
      return { with: window._buildLiveHandoffDirective(withLpa), without: window._buildLiveHandoffDirective(withoutLpa) };
    });
    ok('section 4 header appears when liPressureActor is set', /4\. REQUIRED — HOW THE LOVE INTEREST RESPONDS THIS SCENE/.test(r.with), r.with);
    ok('section 4 carries the actual liPressureActor text', r.with.indexOf('Julian answers her challenge with a held stare') !== -1, r.with);
    ok('section 4 is ABSENT when liPressureActor is not set', !/4\. REQUIRED — HOW THE LOVE INTEREST RESPONDS THIS SCENE/.test(r.without), r.without);
    ok('sections 1-3 are unaffected by whether section 4 fires (section 1 still present in both)', /1\. EARLIER IN THIS LIVE EXCHANGE/.test(r.with) && /1\. EARLIER IN THIS LIVE EXCHANGE/.test(r.without), JSON.stringify({ withLen: r.with.length, withoutLen: r.without.length }));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('H. COMMIT-POINT SANITIZATION — _commitIntimateInterruption, fed the REAL raw card markdown, commits clean text to the ledger');
  {
    const r = await page.evaluate(({ rawAction, rawDialogue }) => {
      const sid = 'relobl-H-' + Date.now();
      window.state.storyId = sid;
      window.state._sceneLedger = null;
      window.state._intimateInterruption = { storyId: sid, sceneNum: 1, submitted: false, frame: { interruption: 'test interruption', interruptionExchange: [] }, selectedSlot: 'temptation' };
      window._commitIntimateInterruption(rawAction, rawDialogue);
      const r2 = window.state._intimateInterruption;
      const L = window._sceneLedgerGet(window.state, false);
      const entry = L && L.entries && L.entries[L.entries.length - 1];
      return { recAction: r2.action, recDialogue: r2.dialogue, ledgerAct: entry && entry.act, ledgerDia: entry && entry.dia };
    }, { rawAction: RAW_CARD_ACTION, rawDialogue: RAW_CARD_DIALOGUE });
    ok('the committed record\'s action is clean (no markdown wrapper survives)', r.recAction === 'Unlace my corset with fingers that tremble like leaves', r.recAction);
    ok('the committed record\'s dialogue is clean (no markdown wrapper survives, quotes kept)', r.recDialogue === '"Let the wind of your breath unravel me, as I\u2019ve unraveled yours by oath."', r.recDialogue);
    ok('the ledger entry itself (what the planner and _extractRecentOASExchangeLines both read) carries the SAME clean action', r.ledgerAct === r.recAction, JSON.stringify(r));
    ok('the ledger entry itself carries the SAME clean dialogue', r.ledgerDia === r.recDialogue, JSON.stringify(r));
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('RELATIONAL OBLIGATION CONTRACT CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  try { fs.unlinkSync(path.join(__dirname, '_relational_obligation_contract_control_out.jsonl')); } catch (_) {}
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
