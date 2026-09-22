// TEMPTATION CONSEQUENCE-REQUIREMENT VERIFICATION — DRY CONTROL (Roman, 2026-09-21)
//
// Roman, after Temptation retry 3 (and the deception/posture-echo-length fixes that followed it):
// "This fixes two specific false positives, but another paid retry would still face the unresolved
// question: what actually changes because Lirael makes her defensive move? Also, a four-letter word
// doesn't make a shared two-word phrase meaningful evidence of copying. And missing 'tribunal' or
// 'procedure' vocabulary doesn't establish that a scene failed to advance. These checks still risk
// confusing wording with storytelling."
//
// Instruction: "Before another paid Temptation retry, inspect the complete rendered planner prompt
// and the three retained Temptation plans together. Determine whether the defensive-path frame
// actually requires a consequence... If that obligation is missing or contradicted elsewhere in the
// prompt, fix the generic planning instruction using the existing scene function and exit state...
// Review the gates against that same distinction... Use the retained attempts and contrasting
// examples to verify the behavior: a concrete action without consequential movement should remain
// inadequate; a concrete action with consequential movement should not require special vocabulary
// to qualify."
//
// What was found, inspecting the rendered prompt directly: FOUR of the five eventFrameBySlot
// entries already imply a reaction (silence -> "the Dohkar sets a review"; reversal -> "Julian
// challenges... reframing"; boundary -> "family... publicly demand remedy"; confession -> "the
// Dohkar REACTS to that shift"). Only temptation's frame stopped at "she does something that
// changes her tactical position" -- no downstream reaction required. This is the missing
// obligation. Fixed generically (public/app.js, near the REQUIRED SCENE FUNCTION render): a new
// REQUIRED CONSEQUENCE block, rendered for ANY starter/lane using this mechanism, ties to the
// SAME row's own sceneFunction + exitState (existing fields, not new canon) rather than inventing
// a First-Sacrifice-specific outcome or a tribunal requirement.
//
// The gates were also reviewed against the same wording-vs-storytelling distinction (see
// _scene2_gate_seam_widened_scan_control.mjs and _scene2_required_scene_function_control.mjs for
// the mechanism-level proofs): the generic aftermath-vocabulary scan is now diagnostic only,
// replaced by a structural floor (aftermath_obligations/event_slots.exit_state non-empty); the
// posture-echo check now only rejects on a 3+-word shared span, not a single bigram.
//
// THIS control's job specifically: run the three RETAINED real Temptation plans (attempts 1, 2, 3)
// together through the exact production-shape gate call (full aftermathLanes menu +
// requiredLaneId='lirael_defensive_path', matching what the live app actually passes), and two
// contrasting synthetic examples, to verify the behavior Roman asked for directly:
//   ATTEMPT-1  — hesitation, no landed action: REMAINS rejected (inadequate, correctly).
//   ATTEMPT-2  — the mouth-band fold, a landed action with a real (if terse) consequence:
//                NOT rejected (already true from the prior pass, re-verified here).
//   ATTEMPT-3  — the false public account, a landed action with an EXPLICIT, rich, multi-party
//                consequence described in plain prose, zero curated vocabulary: NOT rejected (the
//                headline result of this pass -- this exact real draw would now reach the author).
//   CONTRAST-RED   — a concrete, lane-satisfying action with NO consequential movement described
//                anywhere (both aftermath_obligations and exit_state empty) remains inadequate,
//                regardless of vocabulary present elsewhere in the contract.
//   CONTRAST-GREEN — a concrete, lane-satisfying action WITH a real, described consequence, using
//                zero words from the generic vocabulary list, is NOT rejected.
//
// Fully dry: no provider calls, no image calls, no branch retry, no forks.
//
// usage: node _scene2_temptation_consequence_verification_control.mjs
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
const realMatcher = (e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.real === true;
function toStateChange(json) {
  return {
    precondition: json.state_change_precondition, event: json.state_change,
    forces_choice: json.forces_choice, tactical_move: json.tactical_move,
    chosenAftermathLane: json.chosen_aftermath_lane, aftermathObligations: json.aftermath_obligations,
    slots: json.event_slots ? { action: json.event_slots.action, exitState: json.event_slots.exit_state, target: json.event_slots.target } : undefined,
  };
}

const ATTEMPT1_JSON = parseReply(path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789981747565.jsonl'), realMatcher);
const ATTEMPT2_JSON = parseReply(path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1790035049042.jsonl'), realMatcher);
const ATTEMPT3_JSON = parseReply(path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1790037379926.jsonl'), realMatcher);
const ATTEMPT1_SC = toStateChange(ATTEMPT1_JSON);
const ATTEMPT2_SC = toStateChange(ATTEMPT2_JSON);
const ATTEMPT3_SC = toStateChange(ATTEMPT3_JSON);
console.log('✓ loaded all three retained real Temptation attempts verbatim from their persisted logs');
console.log('  attempt 1: "' + ATTEMPT1_SC.event + '"');
console.log('  attempt 2: "' + ATTEMPT2_SC.event + '"');
console.log('  attempt 3: "' + ATTEMPT3_SC.event + '"');

// Full production-shape lane menu — matches public/app.js's STARTER_PLANS.starter_first_sacrifice
// scenes[2].aftermathLanes exactly, including the lirael_defensive_path fixes from this session.
const LANES_FOR_DIRECT_CALL = [
  { id: 'dohkar_preliminary_review', signalRx: /\b(preliminary review|review date|hearing date|sets? a date|scheduled?|convenes?|tribunal date|terms of (?:the )?review|date is set|date was set)\b/i },
  { id: 'family_accusation', signalRx: /\b(seren'?s family|her family|his family|publicly accuses?|formal(?:ly)? accus\w*|demands? (?:remedy|restitution|compensation|redress)|blood[- ]price)\b/i },
  { id: 'julian_jurisdiction_challenge', signalRx: /\b(jurisdiction|challenges? (?:the )?dohkar|contests? (?:his |the )?authority|reframes?|political(?:ly)?)\b/i },
  { id: 'lirael_constrained', signalRx: /\b(separated|placed under (?:guard|watch)|confined|constrained|watched|pending (?:the )?inquiry|escorted (?:away|out)|removed from)\b/i },
  { id: 'lirael_defensive_path', signalRx: /\b(submits? to procedure|demands? (?:specific )?terms|gathers? proof|conceals?\b|concealed\b|concealing\b|(?:commits?|chooses?|turns?|moves?) (?:to|toward)? ?concealment|concealment of\b|flees?|flight|counter-accus\w*|procedural bind|names? a protected constraint)\b/i, executesRx: /\bexecutes? (?:a |an )?(?:concrete )?(?:defensive )?concealment\b/i, withholdActionRx: /\bwithout (?:naming|revealing|explaining|saying|disclosing) what\b/i, deceptionRx: /\b(gives? (?:a )?false (?:public )?account|tells? [\s\S]{0,50}(?:only|falsely)|falsely (?:claims?|states?|tells?|informs?|declares?)|feeds? [\s\S]{0,30}a false|offers? a false (?:account|story|explanation)|deceives?|misleads?|lies? to)\b/i, publicTargetRx: /\b(the assembly|the dohkar|the tribunal|the court|the family|the crowd|the audience|the witnesses|everyone present|the room|the gathered|the seated|publicly)\b/i, hesitationRx: /\b(opens? (?:her|his|their)? ?mouth[\s\S]{0,30}closes?|catches? (?:her|him|them)self weighing|weighs? whether|weighing of|almost (?:speaks|says|names|spoke|said)|hesitates?|stays? silent|remains? silent|says? nothing|holds? (?:her|his|their) tongue|keeps? (?:her|his|their) silence|decides? to (?:lie|deceive|give a false|tell a false|mislead)|resolves? to (?:lie|deceive|mislead)|plans? to (?:lie|deceive|mislead)|intends? to (?:lie|deceive|mislead)|considers? (?:lying|deceiving)|would (?:lie|deceive|mislead))\b/i },
];
const rxPair = (rx) => rx ? { source: rx.source, flags: rx.flags } : null;
const laneOpt = () => ({ lanes: LANES_FOR_DIRECT_CALL.map((l) => ({
  id: l.id, rxSource: l.signalRx.source, rxFlags: l.signalRx.flags,
  hRxSource: l.hesitationRx ? l.hesitationRx.source : null, hRxFlags: l.hesitationRx ? l.hesitationRx.flags : null,
  eRx: rxPair(l.executesRx), wRx: rxPair(l.withholdActionRx), dRx: rxPair(l.deceptionRx), pRx: rxPair(l.publicTargetRx),
})) });

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._detectPlannerFunctionGap === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  const callGate = (sc) => page.evaluate(
    ({ sc, lanes }) => window._detectPlannerFunctionGap(sc, {
      requiresAftermath: true,
      aftermathLanes: lanes.map((l) => ({
        id: l.id, signalRx: new RegExp(l.rxSource, l.rxFlags),
        hesitationRx: l.hRxSource ? new RegExp(l.hRxSource, l.hRxFlags) : null,
        executesRx: l.eRx ? new RegExp(l.eRx.source, l.eRx.flags) : null,
        withholdActionRx: l.wRx ? new RegExp(l.wRx.source, l.wRx.flags) : null,
        deceptionRx: l.dRx ? new RegExp(l.dRx.source, l.dRx.flags) : null,
        publicTargetRx: l.pRx ? new RegExp(l.pRx.source, l.pRx.flags) : null,
      })),
      requiredLaneId: 'lirael_defensive_path',
    }),
    { sc, ...laneOpt() }
  );

  section('ATTEMPT-1 — hesitation ("opens her mouth then closes it") — REMAINS inadequate');
  const a1 = await callGate(ATTEMPT1_SC);
  ok('still rejected — no landed action, so no consequence question is even reached', a1.rejected === true, JSON.stringify(a1));

  section('ATTEMPT-2 — the mouth-band fold — a landed action with a real (terse) consequence — NOT rejected');
  const a2 = await callGate(ATTEMPT2_SC);
  ok('NOT rejected', a2.rejected === false, JSON.stringify(a2));

  section('ATTEMPT-3 — the false public account — a landed action with an EXPLICIT multi-party consequence, zero curated vocabulary — NOT rejected');
  const a3 = await callGate(ATTEMPT3_SC);
  ok('NOT rejected — this exact real draw would now reach the author', a3.rejected === false, JSON.stringify(a3));
  ok('aftermathVocabPresent is false (confirms zero curated vocabulary was used) yet the plan still passes', a3.aftermathVocabPresent === false, JSON.stringify(a3));
  console.log('  attempt 3 aftermath_obligations: "' + ATTEMPT3_JSON.aftermath_obligations + '"');
  console.log('  attempt 3 event_slots.exit_state: "' + ATTEMPT3_JSON.event_slots.exit_state + '"');

  section('CONTRAST-RED — a concrete, lane-satisfying action with NO consequential movement anywhere remains inadequate');
  const contrastRed = {
    precondition: 'No procedure has yet addressed what Lirael actually knows.', // generic vocab present, deliberately, to prove it does not save this plan
    event: 'Lirael conceals the torn oath-thread in her sleeve as the Dohkar turns to address the assembly.',
    forces_choice: 'forces Lirael to choose between surrendering the thread or keeping it hidden',
    tactical_move: 'advance lirael_defensive_path by having Lirael actively conceal a specific object from the Dohkar',
    chosenAftermathLane: 'lirael_defensive_path',
    aftermathObligations: '', // deliberately empty — nothing describes what happens BECAUSE of the concealment
    slots: { action: 'conceals the oath-thread in her sleeve', exitState: '', target: '' },
  };
  const contrastRedResult = await callGate(contrastRed);
  ok('still rejected — a real, landed, lane-satisfying action with no described consequence is still inadequate', contrastRedResult.rejected === true, JSON.stringify(contrastRedResult));
  ok('rejected via the structural floor specifically (not the lane check — the action itself is genuinely landed)', /left both "aftermath_obligations" and "event_slots.exit_state" empty/.test(contrastRedResult.reason || ''), contrastRedResult.reason);

  section('CONTRAST-GREEN — a concrete, lane-satisfying action WITH a real described consequence, ZERO special vocabulary, is NOT rejected');
  const contrastGreen = {
    precondition: 'Lirael has not yet been seen with the oath-thread by anyone in the assembly.',
    event: 'Lirael conceals the torn oath-thread in her sleeve as the Dohkar turns to address the assembly.',
    forces_choice: 'forces Lirael to choose between surrendering the thread or keeping it hidden',
    tactical_move: 'advance lirael_defensive_path by having Lirael actively conceal a specific object from the Dohkar',
    chosenAftermathLane: 'lirael_defensive_path',
    // Deliberately avoids every word in _SCENE_AFTERMATH_VOCAB_RX while describing a real,
    // concrete, multi-party downstream effect — mirroring the shape of Temptation attempt 3's own
    // real aftermath_obligations.
    aftermathObligations: 'Seren\'s cousin notices Lirael\'s stiff sleeve and leans to whisper to the Dohkar; Julian\'s eyes narrow but he says nothing yet.',
    slots: { action: 'conceals the oath-thread in her sleeve', exitState: 'the Dohkar has been alerted to something amiss but has not yet named it aloud', target: '' },
  };
  const contrastGreenResult = await callGate(contrastGreen);
  ok('NOT rejected — a described reaction is enough, no special vocabulary required', contrastGreenResult.rejected === false, JSON.stringify(contrastGreenResult));
  ok('aftermathVocabPresent is exposed as false (confirms this genuinely used no curated vocabulary)', contrastGreenResult.aftermathVocabPresent === false, JSON.stringify(contrastGreenResult));

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('TEMPTATION CONSEQUENCE-REQUIREMENT VERIFICATION: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  console.log('\nSummary: under the corrected gate, attempt 1 (hesitation) remains correctly inadequate;');
  console.log('attempts 2 and 3 (both real, landed, consequential moves) would both now reach the author.');
  console.log('A concrete action with NO described consequence remains inadequate regardless of vocabulary;');
  console.log('a concrete action WITH a described consequence passes regardless of vocabulary.');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
