// STARTER EVENT-FRAME RESOLVER — DRY CONTROL (Roman, 2026-09-21)
//
// Roman, after retry 12: "That's the point where I'd stop trying to prompt the planner into doing
// the job... The planner is not failing because it lacks a lane menu. It's failing because the
// event-deciding step is still too generative for a starter scene that has a known issue
// skeleton... For starter scenes with an explicit issue skeleton / aftermath lane menu, stop
// asking the model to choose the central event from scratch. Deterministically select or
// constrain the lane/event frame before the model sees the authoring task."
//
// Retry 12's real reply is the exact real gap this closes: the model declared a VALID lane
// (chosen_aftermath_lane: "lirael_defensive_path", one of the 5 menu ids) while proposing a
// state_change ("The presiding Dohkar turns to Lirael and demands she state before the assembly
// whether she shaped Seren's wish") whose actor is the DOHKAR demanding an answer — not Lirael
// taking any defensive action. The prior lane-content check already rejected this (correctly), but
// the model was still the one DECIDING which lane to attempt.
//
// Fix: _resolveStarterEventFrame (public/app.js, near _detectPlannerFunctionGap) is a pure,
// deterministic function — no model call — keyed on state._intimateInterruption.selectedSlot, the
// fate-card slot (temptation/silence/reversal/boundary/confession) the READER already clicked,
// generic across every starter's intimate-interruption UI (_INTR_SLOTS). First Sacrifice's Scene 2
// row now declares eventFrameBySlot (a mapping for all 5 slots, each reusing one of the SAME 5
// aftermathLanes ids, never inventing a 6th) + a defaultEventFrame fallback. When a frame resolves,
// the planner prompt renders a REQUIRED EVENT FRAME block (not a menu) naming the exact required
// lane and a concrete event obligation, and the Planner Function Gate now rejects ANY declared
// lane other than the resolved one — even a valid, menu-listed one — before the content-signal
// check even runs. Player agency lives in which CARD the reader already picked; the model no
// longer decides the event's shape at all, only its prose/dialogue/interiority/argument within it.
//
// Proves, fully dry (no provider calls, no image calls, no prose rewrite, no forks):
//   SETUP      — the real row resolves "boundary" -> family_accusation with the authored event
//                frame text; an unset/unknown slot falls back to defaultEventFrame
//                (dohkar_preliminary_review); a row without eventFrameBySlot/defaultEventFrame
//                returns null (generic no-op, old free-choice behavior for any other starter).
//   RED-A      — retry 12's REAL reply (chosen_aftermath_lane: "lirael_defensive_path") is
//                rejected when requiredLaneId="family_accusation" (the boundary-resolved lane) is
//                supplied — and the reason specifically names "resolved this scene to lane", not
//                just a content mismatch — proving the NEW wrong-lane check fires independently of
//                the old content-signal check.
//   RED-B      — the SAME real reply, tested WITHOUT requiredLaneId (old free-choice mode), is
//                STILL rejected — but for the OLD reason (its own declared lane's content doesn't
//                match) — proving old behavior is fully preserved when no frame is resolved.
//   GREEN      — a synthetic reply that declares chosen_aftermath_lane="family_accusation" and
//                actually instantiates it (Seren's family steps forward and publicly demands
//                remedy) is NOT rejected when requiredLaneId="family_accusation" is supplied.
//   ABSENCE    — a scene/row with no eventFrameBySlot/defaultEventFrame produces no resolved frame
//                (_resolveStarterEventFrame returns null) and the gate behaves exactly as before
//                this change (no requiredLaneId-related rejection reason ever appears).
//   PROMPT     — the real, live planner dispatch (Boundary card selected) now carries the REQUIRED
//                EVENT FRAME block naming "family_accusation" and the authored event text, the
//                schema line says chosen_aftermath_lane MUST be exactly that id, and the OLD
//                free-choice "REQUIRED AFTERMATH LANE MENU" text does NOT render (replaced, not
//                duplicated).
//   COEXIST    — REQUIRED SCENE FUNCTION, the reserved/aftermath schema block, WORLD TRUTHS,
//                RECENT OAS EXCHANGE, and IMMUTABLE AFTERMATH (mouth-band) all still render.
//   FULL-FLOW  — with the real pipeline stubbed to return retry 12's real (pre-fix) reply on every
//                attempt, the author is NEVER dispatched, the console warning names the
//                deterministically-resolved lane, and the pipeline ends resumable.
//
// usage: node _scene2_event_frame_resolver_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── Read retry 12's REAL planner reply verbatim from its persisted log ──
const RETRY12_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789968972908.jsonl');
const retry12Events = fs.readFileSync(RETRY12_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const retry12PlannerResp = retry12Events.find((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.real === true && e.responseBody && e.responseBody.model === 'grok-4.3');
if (!retry12PlannerResp) { console.error('HARNESS BLOCKER: retry 12\'s real planner response not found in the log.'); process.exit(2); }
const retry12PlannerRaw = retry12PlannerResp.responseBody.choices[0].message.content;
const retry12Fenced = retry12PlannerRaw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
const RETRY12_PLANNER_JSON = JSON.parse(retry12Fenced ? retry12Fenced[1] : retry12PlannerRaw);
const RETRY12_STATE_CHANGE = {
  precondition: RETRY12_PLANNER_JSON.state_change_precondition,
  event: RETRY12_PLANNER_JSON.state_change,
  forces_choice: RETRY12_PLANNER_JSON.forces_choice,
  tactical_move: RETRY12_PLANNER_JSON.tactical_move,
  chosenAftermathLane: RETRY12_PLANNER_JSON.chosen_aftermath_lane,
};
console.log('✓ loaded retry 12\'s real planner reply verbatim from ' + RETRY12_LOG);
console.log('  real event: "' + RETRY12_STATE_CHANGE.event + '"');
console.log('  real chosen_aftermath_lane: "' + RETRY12_STATE_CHANGE.chosenAftermathLane + '"');

const LANES_FOR_DIRECT_CALL = [
  { id: 'dohkar_preliminary_review', signalRx: /\b(preliminary review|review date|hearing date|sets? a date|scheduled?|convenes?|tribunal date|terms of (?:the )?review|date is set|date was set)\b/i },
  { id: 'family_accusation', signalRx: /\b(seren'?s family|her family|his family|publicly accuses?|formal(?:ly)? accus\w*|demands? (?:remedy|restitution|compensation|redress)|blood[- ]price)\b/i },
  { id: 'julian_jurisdiction_challenge', signalRx: /\b(jurisdiction|challenges? (?:the )?dohkar|contests? (?:his |the )?authority|reframes?|political(?:ly)?)\b/i },
  { id: 'lirael_constrained', signalRx: /\b(separated|placed under (?:guard|watch)|confined|constrained|watched|pending (?:the )?inquiry|escorted (?:away|out)|removed from)\b/i },
  { id: 'lirael_defensive_path', signalRx: /\b(submits? to procedure|gathers? proof|conceals?|flees?|flight|counter-accus\w*|procedural bind)\b/i },
];
const laneOptForCall = () => ({ lanes: LANES_FOR_DIRECT_CALL.map((l) => ({ id: l.id, rxSource: l.signalRx.source, rxFlags: l.signalRx.flags })) });

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._resolveStarterEventFrame === 'function' && typeof window._detectPlannerFunctionGap === 'function' && typeof window._effectiveSceneRow === 'function' && window.STARTER_PLANS && window.STARTER_PLANS.starter_first_sacrifice, { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  section('SETUP — the resolver deterministically maps the reader\'s real card selection to a lane + frame');
  const setupResult = await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'event-frame-control-' + Date.now();
    s._starterId = 'starter_first_sacrifice';
    s.picks = { identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.scenes = [{}];
    const eff = window._effectiveSceneRow(s, 2);
    s._intimateInterruption = { selectedSlot: 'boundary', storyId: s.storyId };
    const boundaryFrame = window._resolveStarterEventFrame(eff, s);
    s._intimateInterruption = { selectedSlot: 'nonexistent-slot-xyz', storyId: s.storyId };
    const fallbackFrame = window._resolveStarterEventFrame(eff, s);
    s._intimateInterruption = null;
    const noSlotFrame = window._resolveStarterEventFrame(eff, s);
    const noMenuRow = { aftermathLanes: null, eventFrameBySlot: null, defaultEventFrame: null };
    const absentFrame = window._resolveStarterEventFrame(noMenuRow, s);
    return { boundaryFrame, fallbackFrame, noSlotFrame, absentFrame, hasFrameMenu: Array.isArray(eff && eff.aftermathLanes) };
  });
  ok('row carries the lane menu the resolver depends on', setupResult.hasFrameMenu === true, JSON.stringify(setupResult.hasFrameMenu));
  ok('slot="boundary" resolves to lane "family_accusation"', setupResult.boundaryFrame && setupResult.boundaryFrame.laneId === 'family_accusation', JSON.stringify(setupResult.boundaryFrame));
  ok('the resolved event frame names Seren\'s family, not a menu choice', /Seren.?s family/.test((setupResult.boundaryFrame || {}).eventFrame || ''), JSON.stringify(setupResult.boundaryFrame));
  ok('an unknown slot falls back to defaultEventFrame (dohkar_preliminary_review)', setupResult.fallbackFrame && setupResult.fallbackFrame.laneId === 'dohkar_preliminary_review', JSON.stringify(setupResult.fallbackFrame));
  ok('no interruption record at all still resolves via defaultEventFrame', setupResult.noSlotFrame && setupResult.noSlotFrame.laneId === 'dohkar_preliminary_review', JSON.stringify(setupResult.noSlotFrame));
  ok('a row without eventFrameBySlot/defaultEventFrame resolves to null (generic no-op)', setupResult.absentFrame === null, JSON.stringify(setupResult.absentFrame));

  section('RED-A — retry 12\'s real reply, WITH the resolved required lane supplied: rejected as WRONG LANE');
  const redA = await page.evaluate(
    ({ sc, lanes, requiredLaneId }) => window._detectPlannerFunctionGap(sc, { requiresAftermath: true, aftermathLanes: lanes.map((l) => ({ id: l.id, signalRx: new RegExp(l.rxSource, l.rxFlags) })), requiredLaneId }),
    { sc: RETRY12_STATE_CHANGE, ...laneOptForCall(), requiredLaneId: 'family_accusation' }
  );
  ok('rejected', redA.rejected === true, JSON.stringify(redA));
  ok('reason names the deterministically-resolved lane, not just a content mismatch', /deterministically resolved this scene to lane "family_accusation"/.test(redA.reason || ''), redA.reason);

  section('RED-B — the SAME real reply, WITHOUT a required lane: old free-choice behavior preserved (rejected for content, not wrong-lane)');
  const redB = await page.evaluate(
    ({ sc, lanes }) => window._detectPlannerFunctionGap(sc, { requiresAftermath: true, aftermathLanes: lanes.map((l) => ({ id: l.id, signalRx: new RegExp(l.rxSource, l.rxFlags) })) }),
    { sc: RETRY12_STATE_CHANGE, ...laneOptForCall() }
  );
  ok('still rejected', redB.rejected === true, JSON.stringify(redB));
  ok('reason is the OLD content-mismatch reason, not a wrong-lane reason', /does not actually instantiate that lane.s content/.test(redB.reason || '') && !/deterministically resolved/.test(redB.reason || ''), redB.reason);

  section('GREEN — a reply that declares AND instantiates the resolved required lane is accepted');
  const greenStateChange = {
    precondition: 'no formal complaint has been raised yet',
    event: 'Seren\'s family steps forward from the assembly and publicly demands remedy for what the wish cost her, formally accusing Lirael of the interference before the presiding Dohkar',
    forces_choice: 'forces Lirael to choose between answering the family\'s demand directly or letting Julian speak for her',
    tactical_move: 'redirect the confrontation from Julian\'s accusation to Seren\'s family\'s formal demand for remedy',
    chosenAftermathLane: 'family_accusation',
    lanePostureModulation: 'her open, unretreating want is what draws the family forward now rather than later',
    // 2026-09-21: the structural consequence floor requires aftermath_obligations OR
    // event_slots.exit_state to be non-empty (replacing the old generic vocabulary scan).
    slots: { exitState: 'the presiding Dohkar now has a formal demand on record and must respond to it before the assembly disperses' },
  };
  const green = await page.evaluate(
    ({ sc, lanes, requiredLaneId }) => window._detectPlannerFunctionGap(sc, { requiresAftermath: true, aftermathLanes: lanes.map((l) => ({ id: l.id, signalRx: new RegExp(l.rxSource, l.rxFlags) })), requiredLaneId }),
    { sc: greenStateChange, ...laneOptForCall(), requiredLaneId: 'family_accusation' }
  );
  ok('NOT rejected', green.rejected === false, JSON.stringify(green));

  section('ABSENCE — no requiredLaneId ever appears in a rejection reason when not supplied');
  const absence = await page.evaluate((sc) => window._detectPlannerFunctionGap(sc, { requiresAftermath: true }), RETRY12_STATE_CHANGE);
  ok('no "deterministically resolved" language appears when requiredLaneId is absent', !/deterministically resolved/.test(absence.reason || ''), JSON.stringify(absence));

  section('PROMPT + COEXIST — the real, live planner dispatch (Boundary card) now carries the resolved event frame, not the free-choice menu');
  const ORIGINAL_LOG = path.join(__dirname, '_first_sacrifice_oas_grok_happy_path_sample_out', 'run_1789878699028.jsonl');
  const originalEvents = fs.readFileSync(ORIGINAL_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  function findResponse(roleTag) { return originalEvents.find((e) => e.kind === 'response' && e.roleTag === roleTag && e.status === 200).responseBody; }
  const REAL_OAS_TURN_REPLY_RESPONSE = findResponse('oas-turn-reply');
  const REAL_FATE_CARD_RESPONSE = findResponse('fate-card-preview-batch');
  const scaffoldEvent = originalEvents.find((e) => e.kind === 'response' && e.roleTag === 'scene2-generation' && e.status === 200 && /runThesis/.test(e.responseBody.choices[0].message.content || ''));
  const REAL_SCAFFOLD_JSON = JSON.parse(scaffoldEvent.responseBody.choices[0].message.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
  const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
  const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';

  let authorDispatchCount = 0;
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_scene2_event_frame_resolver_control_out.jsonl') });
  gate.stub('/api/proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
    if (body.max_tokens === 8000) { authorDispatchCount++; return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: '```json\n' + JSON.stringify({ title: 'stub', beats: [{ idx: 0, kind: 'narration', text: 'stub' }], sceneCharge: { stake: 'stub' } }) + '\n```' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }; }
    const sysMsg = (body.messages && body.messages[0] && body.messages[0].content) || '';
    if (/SCENE-SPINE planner/.test(sysMsg)) return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: retry12PlannerRaw } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
    return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });
  gate.stub('/api/mistral-proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.length === 2 && /Fate.Card|fate.card/i.test(JSON.stringify(body).slice(0, 200))) return REAL_FATE_CARD_RESPONSE;
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.some((m) => /READER POSTURE/.test(String(m.content || '')))) {
      return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: retry12PlannerRaw } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
    }
    return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });

  await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._bakedScene1For === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
  await page.evaluate(({ scaffold }) => {
    const s = window.state;
    s.storyId = 'event-frame-control-live-' + Date.now();
    s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = [];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s._starterId = 'starter_first_sacrifice';
    s._pcLookSkipped = true; s._bakedGenesisUnlocked = true;
    window._devBypass = true;
    s.cgScaffold = Object.assign({}, scaffold, { storyId: s.storyId });
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    s._bakedEmitted = (pkg && pkg.emitted) || null;
  }, { scaffold: REAL_SCAFFOLD_JSON });

  const CANDIDATE_PATH = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package', '13_final_field_correction.json');
  const candidateRaw = JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));
  await page.evaluate(async ({ candidateOasOpening, candidatePostInterruption }) => {
    window.state.intimacyDialogue = null;
    window._clearPersistedOASState();
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    const h = pkg.oasHandoff || {};
    const plan = { beats: [], is_consummate_scene: true, __bakedOrigin: pkg.title || null, openingFrame: h.openingFrame || '', cue: h.cue || '', interruption: h.interruption || '', interruptionImage: h.interruptionImage || '', interruptionExchange: Array.isArray(h.interruptionExchange) ? h.interruptionExchange.slice() : [], oasOpening: candidateOasOpening, postInterruptionBeat: candidatePostInterruption || null };
    await window._initIntimacyDialogue(plan);
    await window._fireIntimacyOpener();
  }, { candidateOasOpening: candidateRaw.draft.oasOpening, candidatePostInterruption: candidateRaw.draft.postInterruptionBeat });

  gate.setPhase('oas-turn-reply-replay', 1);
  await page.fill('#gnActionInput', REAL_DO);
  await page.fill('#gnDialogueInput', REAL_SAY);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('oas-turn-reply-replay', { watchdogMs: 10000 });

  gate.setPhase('fate-card-replay', 1);
  await page.evaluate(() => { window._resolveIntimacyScene('user_pivot_end'); });
  await gate.waitForSettlement('fate-card-replay', { watchdogMs: 10000 });
  const boundarySlotExists = await page.evaluate(() => !!document.querySelector('#gnCardMount [data-fate-card-slot="boundary"]'));
  if (!boundarySlotExists) { console.error('HARNESS BLOCKER: Boundary slot did not render.'); await browser.close(); process.exit(2); }

  const consoleLines = [];
  page.on('console', (m) => { consoleLines.push(m.text()); });

  await page.click('#gnCardMount [data-fate-card-slot="boundary"]');
  const selectedSlotAfterClick = await page.evaluate(() => (window.state._intimateInterruption || {}).selectedSlot || null);
  ok('clicking the Boundary card records selectedSlot="boundary" in state (the real determinism input)', selectedSlotAfterClick === 'boundary', String(selectedSlotAfterClick));

  gate.allowRealPaths([]);
  gate.setPhase('scene2-structural-author-stubbed', 20);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('scene2-structural-author-stubbed', { watchdogMs: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));

  const tracked = gate.trackedCalls('scene2-structural-author-stubbed');
  const plannerDispatch = tracked.find((c) => { try { return Array.isArray(c.requestBody.messages) && c.requestBody.messages.some((m) => /READER POSTURE/.test(String(m.content || ''))); } catch (_) { return false; } });
  if (!plannerDispatch) { console.error('HARNESS BLOCKER: planner dispatch not found.'); await browser.close(); process.exit(2); }
  const sysMsg = plannerDispatch.requestBody.messages[0].content;
  const usrMsg = plannerDispatch.requestBody.messages[1].content;

  ok('the REQUIRED EVENT FRAME (deterministically resolved) block is present', /REQUIRED EVENT FRAME \(HARD, DETERMINISTICALLY RESOLVED/.test(usrMsg), 'not found');
  ok('it names family_accusation as the required lane', /You MUST set "chosen_aftermath_lane" to EXACTLY "family_accusation"/.test(usrMsg), 'not found');
  ok('it carries the authored event-frame text (Seren\'s family)', /Seren.?s family/.test(usrMsg), 'not found');
  ok('the OLD free-choice "REQUIRED AFTERMATH LANE MENU" block does NOT also render (replaced, not duplicated)', !/REQUIRED AFTERMATH LANE MENU \(HARD/.test(usrMsg), 'unexpectedly found');
  ok('the schema line requires chosen_aftermath_lane to be EXACTLY family_accusation', /chosen_aftermath_lane" \(MUST be EXACTLY "family_accusation"/.test(sysMsg), 'not found');
  ok('root cause C: REQUIRED SCENE FUNCTION block still present (coexist)', /REQUIRED SCENE FUNCTION \(HARD/.test(usrMsg), 'not found');
  ok('reserved/aftermath schema hardening block still present (coexist)', /EMPTY object \{\} for EITHER is INVALID/.test(sysMsg), 'not found');
  ok('root cause C: WORLD TRUTHS still present (coexist)', /WORLD TRUTHS \(canon/.test(usrMsg), 'not found');
  ok('Finding 2: RECENT OAS EXCHANGE still present (coexist)', /RECENT OAS EXCHANGE/.test(usrMsg), 'not found');
  ok('Finding 1: IMMUTABLE AFTERMATH (mouth-band) still present (coexist)', usrMsg.includes('mouth-band torn away'), 'not found');

  ok('FULL-FLOW: the gate logged a REJECTED warning naming the resolved lane', consoleLines.some((l) => /\[CG:PLANNER-GATE\] REJECTED/.test(l) && /deterministically resolved this scene to lane "family_accusation"/.test(l)), consoleLines.filter((l) => /PLANNER-GATE|STALE/.test(l)).join(' | ').slice(0, 700));
  ok('FULL-FLOW: the author was NEVER dispatched (zero calls at max_tokens 8000)', authorDispatchCount === 0, 'authorDispatchCount=' + authorDispatchCount);
  const resumableState = await page.evaluate(() => window.state._cgResumable || null);
  ok('FULL-FLOW: the pipeline ends in the same resumable-stop state as before', !!resumableState, JSON.stringify(resumableState));

  await browser.close();
  try { fs.unlinkSync(path.join(__dirname, '_scene2_event_frame_resolver_control_out.jsonl')); } catch (_) {}

  console.log('\n' + '='.repeat(100));
  console.log('STARTER EVENT-FRAME RESOLVER CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
