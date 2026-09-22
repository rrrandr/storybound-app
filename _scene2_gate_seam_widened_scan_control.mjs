// GATE SEAM FIX — WIDENED GENERIC AFTERMATH SCAN — DRY CONTROL (Roman, 2026-09-21)
//
// Roman, after the Reversal sample: "This sounds like a stale generic check is now fighting the
// more precise lane system. If the Reversal plan chose the right lane, had Julian as actor,
// instantiated jurisdiction, and put the consequence language in valid adjacent fields, then the
// old aftermath-vocabulary scan should either look at the full planner contract or defer to the
// lane-specific check... I would not remove the old check entirely, because it still catches
// 'procedural-sounding label, empty content' failures. But it needs to be aware of the richer
// schema."
//
// Real finding this closes: the Reversal sample correctly chose lane
// julian_jurisdiction_challenge, correctly named Julian as local_objective_actor, and its
// tactical_move genuinely contained "jurisdiction" (satisfying the lane-specific signalRx check).
// It was rejected anyway by the OLDER, generic _SCENE_AFTERMATH_VOCAB_RX scan inside
// _detectPlannerFunctionGap, which only read tactical_move/state_change/forces_choice — the one
// word that would have satisfied it ("ruling") landed in state_change_precondition and
// event_slots.exit_state, two fields that scan never read.
//
// Fix: the generic scan (ONLY that check — the lane-content check and posture-echo check are
// UNCHANGED, still reading the same narrow fields) now also reads state_change_precondition,
// event_slots.action/exit_state, and aftermath_obligations — real, load-bearing parts of the SAME
// accepted planner contract, not padding. Deliberately EXCLUDES chosen_aftermath_lane (just an
// id) and scene_function_instantiated — retry 11's own real finding was that field specifically
// carrying aftermath vocabulary while the underlying event stayed inert; including it would
// reopen exactly the gap the lane system exists to close.
//
// EXTENDED 2026-09-21 (consequence-requirement pass): Temptation attempt 3 proved the vocabulary
// scan above STILL false-rejects real, substantive content — "Seren's family visibly withdraws
// support" and "the assembly now believes the wish was only an alignment test" both describe real
// consequences without using any of the check's curated words. Roman: "missing 'tribunal' or
// 'procedure' vocabulary doesn't establish that a scene failed to advance... Keep uncertain
// lexical signals diagnostic unless a stronger, independently supported contract violation
// warrants rejection." The generic vocabulary scan is now DIAGNOSTIC ONLY — exposed on the
// result as `aftermathVocabPresent`, never gating by itself. In its place, a STRUCTURAL floor: a
// plan is rejected only if BOTH `aftermath_obligations` AND `event_slots.exit_state` are
// completely empty — a genuine, wording-independent schema-compliance fact, not a vocabulary
// judgment. RED-B/RED-C/COEXIST below are updated to reflect this: several fixtures that used to
// be rejected BY THE GENERIC CHECK are still rejected overall, but now via the (unchanged)
// LANE-content check instead, since non-empty-but-vocabulary-free fields no longer trip anything
// by themselves. Two new sections (STRUCTURAL-FLOOR-RED, VOCAB-FREE-GREEN) test the new
// mechanism directly, in isolation from the lane check.
//
// Proves, fully dry (no provider calls, no image calls, no branch retry, no forks):
//   GREEN             — the REAL Reversal sample's stateChange (reconstructed verbatim from its
//                       persisted log) is NOT rejected by the gate.
//   RED-A             — retry 11's REAL stateChange (predates the lane/actor/precondition-carrying
//                       system entirely) is STILL rejected — a clean no-regression proof using real
//                       historical data.
//   RED-B             — a synthetic "label only" plan: a valid chosen_aftermath_lane declared, but
//                       tactical_move/event/forces_choice/precondition/aftermath_obligations/
//                       event_slots are ALL vocabulary-free AND describe no real lane-specific
//                       content — still rejected, now via the LANE-content check (the fields are
//                       technically non-empty, so the new structural floor alone would not catch
//                       this one; the lane check does).
//   RED-C             — a synthetic plan where the aftermath content lives ONLY in a deliberately-
//                       excluded field (scene_function_instantiated) is STILL rejected — via the
//                       structural floor this time (aftermath_obligations/exit_state genuinely
//                       empty), proving the exclusion is still real under the new mechanism too.
//   STRUCTURAL-FLOOR-RED — a plan whose LANE check passes (real lane-satisfying content) but whose
//                       aftermath_obligations AND event_slots.exit_state are BOTH literally empty
//                       is still rejected — isolating the new structural floor from the lane check.
//   VOCAB-FREE-GREEN  — a plan whose lane check passes AND whose exit_state describes a real,
//                       concrete consequence using ZERO words from the generic vocabulary list is
//                       NOT rejected — proving vocabulary is no longer required to qualify.
//   COEXIST           — a plan with a populated aftermath_obligations (passing the new structural
//                       floor) but whose declared lane's own signalRx does NOT match the narrow
//                       tactical_move/event/forces_choice/event_slots text is STILL rejected by the
//                       LANE-CONTENT check — proving the two checks remain independent.
//
// usage: node _scene2_gate_seam_widened_scan_control.mjs
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

function parseReply(logPath, matcher) {
  const events = fs.readFileSync(logPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const resp = events.find(matcher);
  if (!resp) { console.error('HARNESS BLOCKER: no matching real response found in ' + logPath); process.exit(2); }
  const raw = resp.responseBody.choices[0].message.content;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  return JSON.parse(fenced ? fenced[1] : raw);
}

// ── Retry 11's real reply (predates the lane/actor/precondition-carrying system) ──
const RETRY11_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789967346060.jsonl');
const RETRY11_JSON = parseReply(RETRY11_LOG, (e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.real === true);
const RETRY11_STATE_CHANGE = {
  precondition: RETRY11_JSON.state_change_precondition,
  event: RETRY11_JSON.state_change,
  forces_choice: RETRY11_JSON.forces_choice,
  tactical_move: RETRY11_JSON.tactical_move,
  aftermathObligations: RETRY11_JSON.aftermath_obligations, // undefined on this old sample — expected
};
console.log('✓ loaded retry 11\'s real reply verbatim from ' + RETRY11_LOG);

// ── The real Reversal reply, reconstructed the SAME way _generateLiteraryPlotContract does ──
const REVERSAL_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789980064246.jsonl');
const REVERSAL_JSON = parseReply(REVERSAL_LOG, (e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.real === true);
const REVERSAL_STATE_CHANGE = {
  precondition: REVERSAL_JSON.state_change_precondition,
  event: REVERSAL_JSON.state_change,
  forces_choice: REVERSAL_JSON.forces_choice,
  tactical_move: REVERSAL_JSON.tactical_move,
  chosenAftermathLane: REVERSAL_JSON.chosen_aftermath_lane,
  aftermathObligations: REVERSAL_JSON.aftermath_obligations,
  slots: REVERSAL_JSON.event_slots ? { action: REVERSAL_JSON.event_slots.action, exitState: REVERSAL_JSON.event_slots.exit_state } : undefined,
};
console.log('✓ loaded the real Reversal reply verbatim from ' + REVERSAL_LOG);
console.log('  precondition: "' + REVERSAL_STATE_CHANGE.precondition + '"');

const LANES_FOR_DIRECT_CALL = [
  { id: 'dohkar_preliminary_review', signalRx: /\b(preliminary review|review date|hearing date|sets? a date|scheduled?|convenes?|tribunal date|terms of (?:the )?review|date is set|date was set)\b/i },
  { id: 'family_accusation', signalRx: /\b(seren'?s family|her family|his family|publicly accuses?|formal(?:ly)? accus\w*|demands? (?:remedy|restitution|compensation|redress)|blood[- ]price)\b/i },
  { id: 'julian_jurisdiction_challenge', signalRx: /\b(jurisdiction|challenges? (?:the )?dohkar|contests? (?:his |the )?authority|reframes?|political(?:ly)?)\b/i },
  { id: 'lirael_constrained', signalRx: /\b(separated|placed under (?:guard|watch)|confined|constrained|watched|pending (?:the )?inquiry|escorted (?:away|out)|removed from)\b/i },
  { id: 'lirael_defensive_path', signalRx: /\b(submits? to procedure|gathers? proof|conceals?|flees?|flight|counter-accus\w*|procedural bind)\b/i },
];
const laneOpt = () => ({ lanes: LANES_FOR_DIRECT_CALL.map((l) => ({ id: l.id, rxSource: l.signalRx.source, rxFlags: l.signalRx.flags })) });

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._detectPlannerFunctionGap === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  const callGate = (sc, requiredLaneId) => page.evaluate(
    ({ sc, lanes, requiredLaneId }) => window._detectPlannerFunctionGap(sc, { requiresAftermath: true, aftermathLanes: lanes.map((l) => ({ id: l.id, signalRx: new RegExp(l.rxSource, l.rxFlags) })), requiredLaneId }),
    { sc, ...laneOpt(), requiredLaneId }
  );

  section('GREEN — the real Reversal sample is NO LONGER rejected');
  const green = await callGate(REVERSAL_STATE_CHANGE, 'julian_jurisdiction_challenge');
  ok('NOT rejected', green.rejected === false, JSON.stringify(green));

  section('RED-A — retry 11\'s real (pre-lane-system) sample is STILL rejected — no regression');
  const redA = await callGate(RETRY11_STATE_CHANGE, null);
  ok('rejected', redA.rejected === true, JSON.stringify(redA));

  section('RED-B — a synthetic "label only" plan: real, non-empty narrow fields, but genuinely no vocabulary anywhere');
  // NOT empty strings — an empty tactical_move/event/forces_choice trips the gate's own
  // pre-existing "nothing to judge" early-return (combined === '' → rejected: false, BEFORE either
  // check ever runs) — that guard is unrelated to this fix and is not what "label only" means in
  // Roman's own framing. A real "label only" plan still writes PLAUSIBLE-SOUNDING prose in these
  // fields; it just never uses the specific vocabulary either check looks for.
  const labelOnly = {
    // NOTE (Roman 2026-09-21, updated alongside the lirael_defensive_path field-widening fix):
    // this precondition previously read "Nothing procedural has happened..." — that word is now a
    // real generic-check match (the same fix stemmed "procedure" to "procedur\w*" to also catch
    // "procedural" for a genuine real-sample finding on Temptation attempt 2). Reworded with
    // genuinely vocabulary-free filler so this fixture still isolates "no signal anywhere," not an
    // accidental true positive.
    precondition: 'Nothing has happened yet in this moment worth mentioning.',
    event: 'The scene continues as it was, unresolved.',
    forces_choice: 'forces Lirael to consider what happens next',
    tactical_move: 'The moment simply proceeds without incident.',
    chosenAftermathLane: 'julian_jurisdiction_challenge',
    aftermathObligations: 'Something will eventually follow from this moment.',
    slots: { action: 'waits', exitState: 'the moment continues, unresolved' },
  };
  const redB = await callGate(labelOnly, null);
  ok('rejected', redB.rejected === true, JSON.stringify(redB));
  ok('reason is now the LANE-content reason (its fields are non-empty, so the structural floor alone would not catch this — the lane check does, since none of its vocabulary describes real jurisdiction-challenge content)', /does not actually instantiate that lane.s content/.test(redB.reason || ''), redB.reason);
  ok('aftermathVocabPresent is exposed as false (diagnostic only, not gating)', redB.aftermathVocabPresent === false, JSON.stringify(redB));

  section('RED-C — consequence content living ONLY in a deliberately-excluded field is STILL rejected (via the structural floor)');
  const excludedFieldOnly = Object.assign({}, labelOnly, {
    // Simulates scene_function_instantiated-style self-report text landing somewhere this gate
    // was never told to read (proves the exclusion is structural, not an accident of missing data).
    // aftermathObligations/slots.exitState overridden back to EMPTY here (labelOnly's own
    // "waits"/"the moment continues, unresolved" filler would otherwise satisfy the structural
    // floor on its own and mask what this fixture is isolating) — the structural floor, not
    // vocabulary location, is what must catch this.
    aftermathObligations: '', slots: { action: '', exitState: '' },
    sceneFunctionInstantiatedDeliberatelyNotRead: 'institutional pressure via ruling tribunal procedure',
  });
  const redC = await callGate(excludedFieldOnly, null);
  ok('rejected (consequence content in an unread field does not count)', redC.rejected === true, JSON.stringify(redC));
  ok('rejected via the structural floor specifically (both real consequence fields are empty)', /left both "aftermath_obligations" and "event_slots.exit_state" empty/.test(redC.reason || ''), redC.reason);

  section('STRUCTURAL-FLOOR-RED — lane check passes, but aftermath_obligations AND event_slots.exit_state are BOTH genuinely empty — still rejected');
  const floorRed = {
    precondition: 'No ruling has yet addressed Julian\'s standing.',
    event: 'Julian challenges the presiding Dohkar\'s jurisdiction before the assembly.',
    forces_choice: 'forces Lirael to choose between backing Julian\'s challenge or staying silent',
    tactical_move: 'Julian contests the Dohkar\'s authority to rule at all.',
    chosenAftermathLane: 'julian_jurisdiction_challenge',
    aftermathObligations: '',
    slots: { action: '', exitState: '' },
  };
  const floorRedResult = await callGate(floorRed, null);
  ok('still rejected — the lane check passes (real jurisdiction content) but nothing describes any consequence at all', floorRedResult.rejected === true, JSON.stringify(floorRedResult));
  ok('rejected via the structural floor specifically, not the lane check', /left both "aftermath_obligations" and "event_slots.exit_state" empty/.test(floorRedResult.reason || '') && !/does not actually instantiate/.test(floorRedResult.reason || ''), floorRedResult.reason);

  section('VOCAB-FREE-GREEN — a real consequence described with ZERO generic-check vocabulary is NOT rejected');
  const vocabFreeGreen = {
    precondition: 'Julian has not yet been challenged on his standing before the assembly.',
    event: 'Julian challenges the presiding Dohkar\'s jurisdiction before the assembly.',
    forces_choice: 'forces Lirael to choose between backing Julian\'s challenge or staying silent',
    tactical_move: 'Julian contests the Dohkar\'s authority to rule at all.',
    chosenAftermathLane: 'julian_jurisdiction_challenge',
    // Deliberately avoids every word in _SCENE_AFTERMATH_VOCAB_RX (tribunal/inquiry/hearing/
    // summons/convene/procedure/ruling/verdict/sentence/investigation/aftermath/consequences/
    // recriminations/accusations formally/date set/schedule for) while still describing a real,
    // concrete downstream effect: two named parties react, and Lirael's footing visibly shifts.
    aftermathObligations: 'Seren\'s cousin quietly steps back from Lirael at the edge of the circle, and word of Julian\'s open challenge begins moving through the gathered faces.',
    slots: { action: '', exitState: 'the assembly now watches Lirael differently, uncertain whose side the Dohkar will take' },
  };
  const vocabFreeGreenResult = await callGate(vocabFreeGreen, null);
  ok('NOT rejected — a described reaction is enough, no special vocabulary required', vocabFreeGreenResult.rejected === false, JSON.stringify(vocabFreeGreenResult));
  ok('aftermathVocabPresent is exposed as false (confirms this genuinely used no curated vocabulary)', vocabFreeGreenResult.aftermathVocabPresent === false, JSON.stringify(vocabFreeGreenResult));

  section('COEXIST — a plan with a populated aftermath_obligations (passing the structural floor) still fails the UNCHANGED lane-content check');
  const passesFloorFailsLane = {
    precondition: '', event: 'Julian stands quietly at the edge of the ritual.', forces_choice: 'forces Lirael to decide whether to speak',
    tactical_move: 'Julian watches without acting.',
    chosenAftermathLane: 'julian_jurisdiction_challenge',
    aftermathObligations: 'A formal ruling and tribunal procedure will eventually follow.', // real content HERE, but no lane-specific signal anywhere
    slots: { action: '', exitState: '' },
  };
  const coexist = await callGate(passesFloorFailsLane, null);
  ok('still rejected — by the lane-content check, since "jurisdiction/challenge/contest/reframe/political" never appears in the narrow tactical_move/event/forces_choice/event_slots text', coexist.rejected === true, JSON.stringify(coexist));
  ok('reason is the LANE-content reason, not the structural-floor one (proving the floor alone was satisfied by aftermath_obligations, as intended)', /does not actually instantiate that lane.s content/.test(coexist.reason || '') && !/left both "aftermath_obligations"/.test(coexist.reason || ''), coexist.reason);

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('GATE SEAM WIDENED-SCAN CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
