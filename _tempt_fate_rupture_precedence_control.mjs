// TEMPT FATE — RUPTURE vs SCHEDULED-FRAME PRECEDENCE CONTROL (dry; no provider calls at all)
//
// Roman, after Scene A was classified a SEMANTIC FAILURE / PARTIAL GRANT:
//   "The active Tempt invocation says the actual wish must land. The same planner request
//    hard-requires chosen_aftermath_lane: dohkar_preliminary_review ... Those requirements cannot
//    both govern this invocation unchanged. Build a dry red fixture from this exact real planner
//    request and outcome ... fix the generic authority/precedence mechanism and prove it with this
//    fixture plus a non-Fatelands example."
//
// WHAT WENT WRONG. The real planner request carried, simultaneously and both as HARD:
//   • "TEMPT FATE — ACTIVE INVOCATION THIS SCENE ... the event/state_change MUST land this wish's
//     actual invocation/effect"
//   • 'REQUIRED EVENT FRAME (HARD ...) ... You MUST set "chosen_aftermath_lane" to EXACTLY
//     "dohkar_preliminary_review" ... the event itself must actually move into this frame'
// For the wish "everyone forgets the ceremony happened" those are irreconcilable: the scheduled
// frame is a review OF the ceremony the wish erases knowledge of. The model resolved it by
// narrowing the wish until the frame still fit, and the durable record then codified the narrowing
// as permanent canon.
//
// THE FIXTURES BELOW READ THE REAL ARTIFACTS from the 2026-09-23 run — the actual planner request
// body and the actual committed outcome — so the red case is the real failure, not a re-imagining
// of it.
//
// usage: node _tempt_fate_rupture_precedence_control.mjs

import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RUN_OUT = path.join(__dirname, '_tempt_fate_memory_erasure_live_run_out');
const OUT_DIR = path.join(__dirname, '_tempt_fate_rupture_precedence_control_out');
fs.rmSync(OUT_DIR, { recursive: true, force: true });
fs.mkdirSync(OUT_DIR, { recursive: true });

const results = [];
const ok = (name, pass, detail) => {
  results.push({ name, pass: !!pass });
  console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '\n        → ' + String(detail).slice(0, 500) : ''));
};
function section(t) { console.log('\n=== ' + t + ' ==='); }

// Tolerates BOTH forms: the builders return plain strings, while the retained request body is
// JSON-escaped (\"dohkar_preliminary_review\"). Matching only the unescaped form silently reported
// the real failure as absent.
const HARD_LANE_RX = /MUST be EXACTLY \\?"dohkar_preliminary_review\\?"/;
const HARD_FRAME_RX = /REQUIRED EVENT FRAME \(HARD/;
const SUPERSEDED_RX = /SUPERSEDED THIS SCENE BY AN ACTIVE TEMPT FATE RUPTURE/;
const ACTIVE_RX = /ACTIVE INVOCATION THIS SCENE/;

(async () => {
  console.log('=== RUPTURE vs SCHEDULED-FRAME PRECEDENCE (dry; zero provider calls) ===');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. THE REAL FAILURE — reproduced from the retained planner request, not re-imagined');
  // Reads the COMMITTED static fixture, not the transient run directory. The original raw artifacts
  // lived in _tempt_fate_memory_erasure_live_run_out/, which every run clears — a later authorized
  // run overwrote them and they were never committed, so they are gone. A fixture the next run can
  // delete was never preserved; see the fixture's own _README for exactly what is verbatim.
  const FIXTURE = JSON.parse(fs.readFileSync(path.join(__dirname, '_tempt_fate_fixtures', 'scene_a_failed_2026_09_23.json'), 'utf8'));
  const realBody = [FIXTURE.plannerAlsoCarried, FIXTURE.plannerFrameDirective, FIXTURE.plannerRequestExcerpt].join(' ');
  ok('the retained planner request carries the ACTIVE INVOCATION directive', ACTIVE_RX.test(realBody));
  ok('the SAME request also hard-requires the pre-resolved lane — the contradiction that produced the partial grant',
    HARD_LANE_RX.test(realBody) && HARD_FRAME_RX.test(realBody),
    'hardLane=' + HARD_LANE_RX.test(realBody) + ' hardFrame=' + HARD_FRAME_RX.test(realBody));
  console.log('    (this is the RED state: two HARD requirements that cannot both govern this wish)');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. THE REAL OUTCOME — the narrowing it produced can no longer enter canon silently');
  const committed = FIXTURE.committedOutcome;
  // Reconstruct the report shape the author actually returned (the committed record mirrors it).
  const asReported = {
    delivered: true,
    changed: committed.changed,
    durability: committed.durability,
    knowledgeStates: committed.knowledgeStates,
    establishedEvidence: committed.establishedEvidence,
    openPossibilities: committed.openPossibilities
  };
  console.log('    real wish     : ' + JSON.stringify(committed.requestedRupture));
  console.log('    real changed[]: ' + JSON.stringify(committed.changed.map((c) => c.subject)));

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const consoleLines = [];
  page.on('console', (m) => consoleLines.push(m.text()));
  // Fail-closed with NO real lanes and NO stubs: this control never generates anything, it only
  // calls pure builders/validators in the page. Any dispatch attempt would abort.
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(OUT_DIR, 'gate.jsonl'), blockImagePreparation: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window._validateTemptFateOutcomeReport && window._buildEventFramePrecedence, { timeout: 30000 });

  const vReal = await page.evaluate((r) => window._validateTemptFateOutcomeReport(r), asReported);
  ok('the REAL outcome report is now REJECTED — a delivered grant that never declares its scope cannot be committed',
    vReal.valid === false && vReal.errors.some((e) => /requestedScope|deliveredScope|scopeMatch/.test(e)),
    JSON.stringify(vReal));
  console.log('    rejection reasons: ' + JSON.stringify(vReal.errors));

  const vDeclared = await page.evaluate((r) => window._validateTemptFateOutcomeReport(Object.assign({}, r, {
    requestedScope: 'everyone forgets that the ceremony happened at all',
    deliveredScope: 'the assembly forgets the twisted wish and the interference; the ceremony itself and its review remain known',
    scopeMatch: 'narrower',
    scopeNote: 'the ceremony, its institutional consequences, and the scheduled review were left intact',
    // The real wish was a forgetting, so the memory class and its own evidence apply here.
    ruptureClass: 'memory_perception',
    affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', nowKnows: 'nothing of the twisted wish or the interference' }],
    invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' },
    unaccountedParties: []
  })), asReported);
  ok('the SAME outcome, honestly declared as a NARROWER grant, validates — narrowing is allowed, but only when it is visible',
    vDeclared.valid === true, JSON.stringify(vDeclared));

  const vFalseFull = await page.evaluate((r) => window._validateTemptFateOutcomeReport(Object.assign({}, r, {
    requestedScope: 'everyone forgets that the ceremony happened at all',
    deliveredScope: 'the assembly forgets the twisted wish only',
    scopeMatch: 'narrower'
  })), asReported);
  ok('a narrower grant with NO explanation is still rejected — the gap has to be accounted for, not just labelled',
    vFalseFull.valid === false && vFalseFull.errors.some((e) => /scopeNote/.test(e)), JSON.stringify(vFalseFull.errors));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. PRECEDENCE — the Fatelands frame that caused the failure');
  const fatelandsFrame = { laneId: 'dohkar_preliminary_review', eventFrame: 'the presiding Dohkar convenes the preliminary review of Lirael\'s conduct.' };
  const fl = await page.evaluate((f) => ({
    noRupture: window._buildEventFramePrecedence(f, ['dohkar_preliminary_review', 'family_accusation'], false),
    rupture: window._buildEventFramePrecedence(f, ['dohkar_preliminary_review', 'family_accusation'], true)
  }), fatelandsFrame);

  ok('WITHOUT a rupture the frame is still HARD and the lane still forced — the ordinary path is unchanged',
    fl.noRupture.mode === 'required' && HARD_FRAME_RX.test(fl.noRupture.directive) && HARD_LANE_RX.test(fl.noRupture.jsonRequirement),
    JSON.stringify(fl.noRupture).slice(0, 300));
  ok('WITH an active rupture the frame is SUPERSEDED, not required', fl.rupture.mode === 'superseded' && SUPERSEDED_RX.test(fl.rupture.directive));
  ok('the hard lane mandate is GONE under a rupture — the wish can no longer be forced through dohkar_preliminary_review',
    !HARD_LANE_RX.test(fl.rupture.jsonRequirement) && !HARD_FRAME_RX.test(fl.rupture.directive),
    fl.rupture.jsonRequirement.slice(0, 260));
  ok('the superseded directive names the exact failure mode it exists to prevent (narrowing the wish to save the frame)',
    /Do NOT narrow, reinterpret, or partially grant the wish/.test(fl.rupture.directive));
  // (The former assertion here demanded the directive state "history is unchanged; only who
  // remembers may change". That was the overfitting itself — asserted as a universal rule it would
  // forbid a history-rewrite wish from ever delivering. Section 7 now asserts the opposite property:
  // the directive must NOT carry that universal claim, and must name every rupture class instead.)
  ok('it permits the scheduled proceeding to be suspended/impossible/unexplained/redirected rather than automatically surviving',
    /SUSPENDED, IMPOSSIBLE, UNEXPLAINED, REDIRECTED/.test(fl.rupture.directive) && /must NOT survive automatically/.test(fl.rupture.directive));
  ok('the lane may be set to null when the rupture breaks it', /set it to null/.test(fl.rupture.jsonRequirement));

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. GENERICITY — a non-Fatelands frame and an unrelated wish, same mechanism');
  // Nothing about the rule may be First-Sacrifice-shaped. A modern-corporate frame and a wish that
  // attacks its premise must behave identically.
  const corporateFrame = { laneId: 'board_dismissal_vote', eventFrame: 'the board convenes to vote on her dismissal.' };
  const co = await page.evaluate((f) => ({
    noRupture: window._buildEventFramePrecedence(f, ['board_dismissal_vote', 'hr_mediation'], false),
    rupture: window._buildEventFramePrecedence(f, ['board_dismissal_vote', 'hr_mediation'], true)
  }), corporateFrame);
  ok('non-Fatelands, no rupture: the frame is HARD and its own lane is forced', co.noRupture.mode === 'required' && /MUST be EXACTLY "board_dismissal_vote"/.test(co.noRupture.jsonRequirement));
  ok('non-Fatelands, active rupture: the frame is SUPERSEDED and its lane mandate is gone',
    co.rupture.mode === 'superseded' && !/MUST be EXACTLY "board_dismissal_vote"/.test(co.rupture.jsonRequirement) && SUPERSEDED_RX.test(co.rupture.directive));
  ok('the superseded text carries THAT frame\'s own content, not any hardcoded Fatelands wording',
    co.rupture.directive.indexOf('board convenes to vote on her dismissal') !== -1
      && co.rupture.directive.indexOf('Dohkar') === -1 && co.rupture.directive.indexOf('ceremony') === -1,
    co.rupture.directive.slice(0, 260));
  ok('no frame at all → no directive and no requirement (the rule adds nothing where nothing was scheduled)',
    (await page.evaluate(() => window._buildEventFramePrecedence(null, [], true))).mode === 'none');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. SCOPE HANDLING IS DEMANDED OF THE AUTHOR, not left implicit');
  // MOVED. These assertions used to run against _buildTemptFateOutcomeReportingSchema() — a
  // window-exposed builder that NO prompt ever called. They passed while the author received a
  // completely different inline schema, which is exactly how the scope/class fields became REQUIRED
  // by the validator while never being REQUESTED of the model: a real paid run delivered a scene,
  // was rejected for omitting fields it was never asked for, and committed nothing. The dead builder
  // is deleted; the schema is now asserted against the REAL captured author request body in
  // _tempt_fate_framing_split_control.mjs, which is the only place the author's actual prompt exists.
  console.log('  Schema assertions live in _tempt_fate_framing_split_control.mjs, against the REAL');
  console.log('  captured author request body. Asserting them here against a builder no prompt used');
  console.log('  is what produced a green control over a broken pipeline.');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. THE GATE MUST AGREE WITH THE PROMPT — a waived lane cannot then be rejected');
  // Found by regression, not by design: releasing the lane in the PROMPT while the planner-function
  // gate still demanded one would reject a planner for obeying its own instructions, leaving
  // "narrow the wish until the scheduled lane fits" as the only way to pass — reinstating the exact
  // failure. Prompt and gate must be released together.
  // NOT ASSERTED SYNTHETICALLY, and the reason matters more than the gap.
  // _detectPlannerFunctionGap only reaches its lane block after several upstream preconditions
  // (continuation eligibility, posture, consequence content) are satisfied by a full state-change
  // object. Two attempts to construct one here never reached that block: BOTH the with- and
  // without-rupture calls returned rejected:false, and the waiver's own console line never fired.
  // A "passing" assertion on that input would have been green while evaluating nothing — exactly
  // the vacuous control this workstream keeps rejecting, so it is removed rather than kept.
  //
  // The bite for this change was real and observed in regression instead: with the PROMPT releasing
  // the lane but the GATE still demanding one, the dry harness dropped 30/30 → 22/30 (the planner
  // was rejected for obeying its own instructions, and the only passing strategy left was the very
  // narrowing this fix exists to stop). Aligning the gate with the prompt restored 30/30. The
  // enforcement side — lane still required when no rupture is active — stays covered end-to-end by
  // _tempt_fate_outcome_integration_control.mjs (70/70).
  console.log('  Prompt and gate are released together (app.js: _buildEventFramePrecedence and the');
  console.log('  _detectPlannerFunctionGap ruptureActive waiver). Not re-proved synthetically here —');
  console.log('  see the comment in this file for why a synthetic fixture would have passed vacuously.');

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. NO MEMORY-ERASURE OVERFITTING — four contrasting rupture classes');
  // Roman's audit: the first version of this fix baked a FORGETTING wish's metaphysics into the
  // generic rule ("history stays immutable; only who remembers may change") and demanded
  // memory fields from every wish. Tempt Fate outranks ordinary wish doctrine: what changes is
  // decided by what was actually asked for. These four cases must each validate on their own terms.
  const base = {
    delivered: true,
    durability: [{ aspect: 'the effect', status: 'persists' }],
    establishedEvidence: ['something the scene put on the page'],
    scopeMatch: 'full'
  };
  const cases = await page.evaluate((b) => {
    const v = (r) => window._validateTemptFateOutcomeReport(r);
    return {
      // 1. forgetting — occurrence preserved, memory changed
      forget: v(Object.assign({}, b, {
        requestedScope: 'everyone forgets the ceremony happened',
        deliveredScope: 'every witness present loses the memory of the ceremony',
        ruptureClass: 'memory_perception',
        changed: [{ subject: 'the assembly', whatChanged: 'no longer remembers the ceremony' }],
        affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', nowKnows: 'nothing of the ceremony' }],
        invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' },
        unaccountedParties: [],
        invalidatedPlans: ['the preliminary review nobody can now justify']
      })),
      // 1b. the same forgetting wish must NOT be forced to claim a history rewrite
      forgetWithoutHistoryFields: v(Object.assign({}, b, {
        requestedScope: 'everyone forgets the ceremony happened',
        deliveredScope: 'every witness loses the memory',
        ruptureClass: 'memory_perception',
        changed: [{ subject: 'the assembly', whatChanged: 'no longer remembers' }],
        affectedKnowers: [{ who: 'the assembly', disposition: 'forgot', nowKnows: 'nothing of it' }],
        invokerExemption: { who: 'Lirael', status: 'exempt', reason: 'invoker_anchor' },
        unaccountedParties: []
      })),
      // 2. history rewrite — ALLOWED to un-happen the event when that is the wish
      neverHappened: v(Object.assign({}, b, {
        requestedScope: 'the ceremony never happened',
        deliveredScope: 'the ceremony is undone; it did not take place',
        ruptureClass: 'history_rewrite',
        changed: [{ subject: 'the ceremony', whatChanged: 'never occurred' }],
        priorHistoryReplaced: 'the rite was held and Seren spent her wish; now no rite was ever convened',
        survivingContradictions: ['the torn mouth-band still in Lirael\'s hand']
      })),
      // 2b. a history rewrite must NOT be forced to populate memory fields
      neverHappenedNoMemoryFields: v(Object.assign({}, b, {
        requestedScope: 'the ceremony never happened',
        deliveredScope: 'undone',
        ruptureClass: 'history_rewrite',
        changed: [{ subject: 'the ceremony', whatChanged: 'never occurred' }],
        priorHistoryReplaced: 'held → never convened',
        survivingContradictions: []
      })),
      // 3. reputation — durable public recognition, no memory fields
      infamous: v(Object.assign({}, b, {
        requestedScope: 'make us infamous lovers everyone recognises',
        deliveredScope: 'the pair are recognised on sight across the region',
        ruptureClass: 'identity_reputation',
        changed: [{ subject: 'the pair', whatChanged: 'are publicly known as lovers' }],
        recognitionChanges: [{ who: 'Lirael and Julian', howRecognized: 'named on sight by strangers', recordsChanged: 'the assembly rolls now list them together' }]
      })),
      // 4. possession/material — temporary object, institutional history intact
      answerInHand: v(Object.assign({}, b, {
        requestedScope: 'put The Answer in my hand',
        deliveredScope: 'The Answer is in her hand for the duration of the window',
        ruptureClass: 'materialization_possession',
        changed: [{ subject: 'The Answer', whatChanged: 'changed hands' }],
        materialEffects: [{ what: 'The Answer', whoHolds: 'Lirael', duration: 'until the rupture window closes' }],
        durability: [{ aspect: 'possession of The Answer', status: 'expires' }, { aspect: 'that the assembly saw her holding it', status: 'persists' }],
        invalidatedPlans: []
      })),
      // NEGATIVE: declaring a class without its own evidence must still fail
      memoryClassMissingKnowers: v(Object.assign({}, b, {
        requestedScope: 'everyone forgets', deliveredScope: 'they forgot', ruptureClass: 'memory_perception',
        changed: [{ subject: 'x', whatChanged: 'y' }]
      })),
      possessionClassMissingEffects: v(Object.assign({}, b, {
        requestedScope: 'give me the blade', deliveredScope: 'she holds it', ruptureClass: 'materialization_possession',
        changed: [{ subject: 'x', whatChanged: 'y' }]
      }))
    };
  }, base);

  ok('"everyone forgets the ceremony" validates as a MEMORY rupture (occurrence preserved, memory changed)', cases.forget.valid === true, JSON.stringify(cases.forget));
  ok('…and is NOT required to claim a history rewrite it did not perform', cases.forgetWithoutHistoryFields.valid === true, JSON.stringify(cases.forgetWithoutHistoryFields));
  ok('"the ceremony never happened" is ALLOWED to rewrite history when delivered — no universal immutability rule blocks it', cases.neverHappened.valid === true, JSON.stringify(cases.neverHappened));
  ok('…and is NOT forced to populate memory fields (no whoForgot/exemption demanded of a history rewrite)', cases.neverHappenedNoMemoryFields.valid === true, JSON.stringify(cases.neverHappenedNoMemoryFields));
  ok('"make us infamous lovers everyone recognises" validates as durable public recognition, with NO memory fields required', cases.infamous.valid === true, JSON.stringify(cases.infamous));
  ok('"put The Answer in my hand" validates as possession/material with a duration, institutional history untouched, NO memory fields required', cases.answerInHand.valid === true, JSON.stringify(cases.answerInHand));
  ok('a declared memory rupture with no affectedKnowers is still REJECTED — the class carries its own burden of evidence', cases.memoryClassMissingKnowers.valid === false && cases.memoryClassMissingKnowers.errors.some((e) => /affectedKnowers/.test(e)), JSON.stringify(cases.memoryClassMissingKnowers.errors));
  ok('a declared possession rupture with no materialEffects is still REJECTED', cases.possessionClassMissingEffects.valid === false && cases.possessionClassMissingEffects.errors.some((e) => /materialEffects/.test(e)), JSON.stringify(cases.possessionClassMissingEffects.errors));

  const directiveText = fl.rupture.directive;
  ok('the precedence directive no longer asserts universal history-immutability', !/HISTORY IS UNCHANGED/.test(directiveText) && !/Tempt cannot un-happen/.test(directiveText), directiveText.slice(0, 200));
  ok('it explicitly names every rupture class the wish may fall into, and forbids imposing a memory reading',
    /history itself \(up to an event never having occurred\)/.test(directiveText)
      && /identity, reputation/.test(directiveText) && /possession and material reality/.test(directiveText)
      && /Do not impose a memory\/forgetting reading/.test(directiveText),
    directiveText.slice(0, 400));

  section('CONTAINMENT');
  ok('ZERO real provider dispatches — this control only calls pure builders and validators', gate.realCalls().length === 0, 'realCalls=' + gate.realCalls().length);

  await browser.close();
  fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'precedence_samples.json'), JSON.stringify({ fatelands: fl, nonFatelands: co }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log('\n' + '='.repeat(100));
  console.log('RUPTURE PRECEDENCE CONTROL: ' + passed + '/' + results.length + ' passed');
  console.log('written to ' + OUT_DIR + '/');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('CONTROL ERROR:', e && e.stack || e); process.exit(2); });
