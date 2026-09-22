// AFTERMATH LANE MENU — DRY CONTROL (Roman, 2026-09-21)
//
// Roman, after retry 11 (clean environment, reserved-schema fix confirmed live, planner still
// staged the same ritual moment): "The planner is now: getting the scene function; filling the
// schema correctly; being checked by the right gates; failing cheaply before author spend... The
// planner model is the thing still not doing the creative jump: it can label 'procedural
// pressure,' but it keeps staging the same ritual moment... Change the Scene 2 planner contract
// from 'invent an aftermath event' to 'choose and instantiate an aftermath lane.'"
//
// Retry 11's real reply is the exact real gap this closes: chosen_aftermath_lane did not exist
// yet, and the model's scene_function_instantiated self-report ("institutional pressure via the
// Dohkar's public assertion of authority") and tactical_move ("...visible procedural pressure...")
// borrowed aftermath vocabulary while the actual proposed event ("Julian crosses the circle and
// stands before Lirael, naming himself the one she lost.") stayed inside the same in-ritual
// confrontation the AFTERMATH TRUTHS already establish.
//
// Fix: STARTER_PLANS.starter_first_sacrifice.scenes[2] now declares `aftermathLanes` — five
// concrete, seed-grounded lanes (each with an id, a label, and a signalRx used to verify the
// planner's own proposed content actually reflects it). The planner prompt renders a REQUIRED
// AFTERMATH LANE MENU block that REPLACES "invent an aftermath event" with "choose and instantiate
// ONE of these lanes," and requires two new JSON keys: "chosen_aftermath_lane" and
// "lane_posture_modulation". _detectPlannerFunctionGap (the pre-existing Planner Function Gate)
// now ALSO rejects a plan with no chosen lane (or one outside the menu), and — independently —
// rejects a plan whose declared lane's signalRx does not match its own proposed event/tactical_
// move/forces_choice, i.e. a declared label that isn't backed by real content. Generic: both new
// checks are inert when opts.aftermathLanes is absent — any scene/starter without a declared lane
// menu behaves exactly as before this change. _validateLocalObjective is untouched; this is a
// Planner Function Gate change, not a structural-validator change.
//
// Proves, fully dry (no provider calls, no image calls, no prose rewrite, no forks):
//   RED-A    — retry 11's REAL stateChange (no chosen_aftermath_lane at all — it predates this
//              fix) is rejected: no chosen lane declared.
//   RED-B    — the SAME real retry-11 content, with a synthetic chosen_aftermath_lane added (a
//              model that complies with the new field but still produces the same old ritual-
//              moment content), is STILL rejected: the declared lane's signal is not backed by
//              the actual proposed event — proves the check reads content, not the label.
//   GREEN    — a synthetic stateChange that both declares an allowed lane AND actually
//              instantiates it (the same Boundary posture, moved into
//              dohkar_preliminary_review) is NOT rejected.
//   ABSENCE  — a scene with no declared lane menu is completely unaffected by either new check.
//   PROMPT   — the real, live planner dispatch now carries the REQUIRED AFTERMATH LANE MENU
//              block, all 5 lane ids, and the two new required JSON keys.
//   COEXIST  — REQUIRED SCENE FUNCTION, the reserved/aftermath schema block, WORLD TRUTHS,
//              RECENT OAS EXCHANGE, and IMMUTABLE AFTERMATH (mouth-band) all still render.
//   FULL-FLOW — with the real pipeline stubbed to return retry 11's real (pre-fix) reply on every
//              attempt, the author is NEVER dispatched and the pipeline ends resumable — the SAME
//              real capability gap, now caught generically through the full CG flow, not just a
//              direct function call.
//
// usage: node _scene2_aftermath_lane_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── Read retry 11's REAL planner reply verbatim from its persisted log ──
const RETRY11_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789967346060.jsonl');
const retry11Events = fs.readFileSync(RETRY11_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const retry11PlannerResp = retry11Events.find((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.real === true && e.responseBody && e.responseBody.model === 'grok-4.3');
if (!retry11PlannerResp) { console.error('HARNESS BLOCKER: retry 11\'s real planner response not found in the log.'); process.exit(2); }
const retry11PlannerRaw = retry11PlannerResp.responseBody.choices[0].message.content;
const retry11Fenced = retry11PlannerRaw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
const RETRY11_PLANNER_JSON = JSON.parse(retry11Fenced ? retry11Fenced[1] : retry11PlannerRaw);
const RETRY11_STATE_CHANGE = {
  precondition: RETRY11_PLANNER_JSON.state_change_precondition,
  event: RETRY11_PLANNER_JSON.state_change,
  forces_choice: RETRY11_PLANNER_JSON.forces_choice,
  tactical_move: RETRY11_PLANNER_JSON.tactical_move,
};
console.log('✓ loaded retry 11\'s real planner reply verbatim from ' + RETRY11_LOG);
console.log('  real event: "' + RETRY11_STATE_CHANGE.event + '"');
console.log('  real tactical_move: "' + RETRY11_STATE_CHANGE.tactical_move.slice(0, 100) + '..."');
console.log('  chosen_aftermath_lane in the real reply:', JSON.stringify(RETRY11_PLANNER_JSON.chosen_aftermath_lane), '(field did not exist yet — expected undefined)');

// RELATIONAL-OBLIGATION PARITY (Roman 2026-09-22) — this FULL-FLOW section drives a REAL Boundary
// card submission through the real pipeline. Boundary is a genuinely relationship-bearing card
// (2026-09-22 policy decision, _INTR_OBLIGATION_TYPE) under the 'register' standard — restrained
// recognition, a controlled refusal, silence-as-pressure, or a procedural deflection; NOT
// Temptation's active-engagement bar. Retry 11's real reply predates that gate entirely (it has no
// li_pressure_actor field at all) and its own event is ALREADY Julian actively crossing the circle
// and naming himself before her — richer than 'register' strictly requires, so a 'register'-shaped
// line describing THAT same real action is added, honestly reflecting what the reply's own event
// already depicts, not inventing new content. This is added so the fixture correctly satisfies the
// real obligation now in force — NOT to suppress or bypass the check.
const RETRY11_PLANNER_JSON_WITH_LI = Object.assign({}, RETRY11_PLANNER_JSON, {
  li_pressure_actor: 'Julian’s crossing the circle and naming himself is itself the answer to her challenge — he does not look away, and the assembly sees exactly what she provoked.'
});
const retry11PlannerRaw_withLi = JSON.stringify(RETRY11_PLANNER_JSON_WITH_LI);

const LANE_IDS = ['dohkar_preliminary_review', 'family_accusation', 'julian_jurisdiction_challenge', 'lirael_constrained', 'lirael_defensive_path'];

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._detectPlannerFunctionGap === 'function' && typeof window._effectiveSceneRow === 'function' && window.STARTER_PLANS && window.STARTER_PLANS.starter_first_sacrifice, { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  section('SETUP — the real First Sacrifice scene 2 row carries the declared lane menu');
  const setupResult = await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'aftermath-lane-control-' + Date.now();
    s._starterId = 'starter_first_sacrifice';
    s.picks = { identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.scenes = [{}];
    const eff = window._effectiveSceneRow(s, 2);
    return { hasLanes: Array.isArray(eff && eff.aftermathLanes), laneIds: (eff && eff.aftermathLanes || []).map((l) => l.id) };
  });
  ok('scene 2\'s effective row carries aftermathLanes', setupResult.hasLanes === true, JSON.stringify(setupResult));
  ok('it carries all 5 declared lane ids', LANE_IDS.every((id) => setupResult.laneIds.includes(id)) && setupResult.laneIds.length === 5, JSON.stringify(setupResult.laneIds));

  // The gate reads opts.aftermathLanes directly (plain {id, label, signalRx} objects) — signalRx is a
  // RegExp, which cannot cross the page.evaluate() serialization boundary, so this control rebuilds
  // the SAME lane objects (verified against the real ids above) for the direct-call sections below,
  // and separately proves via FULL-FLOW that the real, in-page row (with its real RegExp intact)
  // produces the identical behavior end-to-end.
  const LANES_FOR_DIRECT_CALL = [
    { id: 'dohkar_preliminary_review', signalRx: /\b(preliminary review|review date|hearing date|sets? a date|scheduled?|convenes?|tribunal date|terms of (?:the )?review|date is set|date was set)\b/i },
    { id: 'family_accusation', signalRx: /\b(seren'?s family|her family|his family|publicly accuses?|formal(?:ly)? accus\w*|demands? (?:remedy|restitution|compensation|redress)|blood[- ]price)\b/i },
    { id: 'julian_jurisdiction_challenge', signalRx: /\b(jurisdiction|challenges? (?:the )?dohkar|contests? (?:his |the )?authority|reframes?|political(?:ly)?)\b/i },
    { id: 'lirael_constrained', signalRx: /\b(separated|placed under (?:guard|watch)|confined|constrained|watched|pending (?:the )?inquiry|escorted (?:away|out)|removed from)\b/i },
    { id: 'lirael_defensive_path', signalRx: /\b(submits? to procedure|gathers? proof|conceals?|flees?|flight|counter-accus\w*|procedural bind)\b/i },
  ];

  section('RED-A — retry 11\'s real stateChange, NO chosen lane at all (the field did not exist yet)');
  const redA = await page.evaluate(
    ({ sc, lanes }) => window._detectPlannerFunctionGap(sc, { requiresAftermath: true, aftermathLanes: lanes.map((l) => ({ id: l.id, signalRx: new RegExp(l.rxSource, l.rxFlags) })) }),
    { sc: RETRY11_STATE_CHANGE, lanes: LANES_FOR_DIRECT_CALL.map((l) => ({ id: l.id, rxSource: l.signalRx.source, rxFlags: l.signalRx.flags })) }
  );
  ok('rejected', redA.rejected === true, JSON.stringify(redA));
  ok('reason names "no chosen_aftermath_lane"', /no chosen_aftermath_lane/.test(redA.reason || ''), redA.reason);

  section('RED-B — the SAME real content, but with a synthetic chosen_aftermath_lane added (label without content)');
  const redBStateChange = Object.assign({}, RETRY11_STATE_CHANGE, { chosenAftermathLane: 'dohkar_preliminary_review' });
  const redB = await page.evaluate(
    ({ sc, lanes }) => window._detectPlannerFunctionGap(sc, { requiresAftermath: true, aftermathLanes: lanes.map((l) => ({ id: l.id, signalRx: new RegExp(l.rxSource, l.rxFlags) })) }),
    { sc: redBStateChange, lanes: LANES_FOR_DIRECT_CALL.map((l) => ({ id: l.id, rxSource: l.signalRx.source, rxFlags: l.signalRx.flags })) }
  );
  ok('rejected even though a valid lane id was declared', redB.rejected === true, JSON.stringify(redB));
  ok('reason names the declared lane and says content does not instantiate it', /declared chosen_aftermath_lane="dohkar_preliminary_review"/.test(redB.reason || '') && /does not actually instantiate/.test(redB.reason || ''), redB.reason);

  section('GREEN — a plan that declares an allowed lane AND actually instantiates it is NOT rejected');
  const greenStateChange = {
    precondition: 'no review has yet been set for Lirael\'s conduct',
    event: 'The presiding Dohkar convenes a preliminary review of Lirael\'s conduct before the assembly disperses, naming a hearing date three days hence.',
    forces_choice: 'forces Lirael to choose whether to request time to prepare her account or accept the date as set, in front of everyone still watching',
    tactical_move: 'convert Julian\'s public claim into a scheduled preliminary review, moving the confrontation off the ritual floor and into procedure',
    chosenAftermathLane: 'dohkar_preliminary_review',
    lanePostureModulation: 'her defiant, unretreating posture is what forces the Dohkar to act now rather than let the assembly\'s assumption stand unchallenged',
    // 2026-09-21: the structural consequence floor requires aftermath_obligations OR
    // event_slots.exit_state to be non-empty (replacing the old generic vocabulary scan) — this
    // fixture's own event text already names a real consequence (a scheduled review), so exitState
    // just needs to carry it structurally too.
    slots: { exitState: 'the assembly now has a set date to watch for, and Lirael\'s three-day window has begun' },
  };
  const green = await page.evaluate(
    ({ sc, lanes }) => window._detectPlannerFunctionGap(sc, { requiresAftermath: true, aftermathLanes: lanes.map((l) => ({ id: l.id, signalRx: new RegExp(l.rxSource, l.rxFlags) })) }),
    { sc: greenStateChange, lanes: LANES_FOR_DIRECT_CALL.map((l) => ({ id: l.id, rxSource: l.signalRx.source, rxFlags: l.signalRx.flags })) }
  );
  ok('NOT rejected', green.rejected === false, JSON.stringify(green));
  ok('reports the chosen lane back', green.chosenAftermathLane === 'dohkar_preliminary_review', JSON.stringify(green));

  section('ABSENCE — a scene with no declared lane menu is unaffected by either new check');
  const absence = await page.evaluate((sc) => window._detectPlannerFunctionGap(sc, { requiresAftermath: true }), RETRY11_STATE_CHANGE);
  // retry 11's real content still fails the PRE-EXISTING generic aftermath-vocab check on its own merits
  // (unrelated to lanes) — what this proves is narrower: no lane-specific reason appears when no lane
  // menu is supplied.
  ok('no lane-related rejection reason appears when aftermathLanes is absent', !/chosen_aftermath_lane/.test(absence.reason || ''), JSON.stringify(absence));

  section('PROMPT + COEXIST — the real, live planner dispatch now carries the lane menu');
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
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_scene2_aftermath_lane_control_out.jsonl') });
  gate.stub('/api/proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
    if (body.max_tokens === 8000) { authorDispatchCount++; return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: '```json\n' + JSON.stringify({ title: 'stub', beats: [{ idx: 0, kind: 'narration', text: 'stub' }], sceneCharge: { stake: 'stub' } }) + '\n```' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }; }
    const sysMsg = (body.messages && body.messages[0] && body.messages[0].content) || '';
    if (/SCENE-SPINE planner/.test(sysMsg)) return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: retry11PlannerRaw_withLi } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
    return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });
  gate.stub('/api/mistral-proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.length === 2 && /Fate.Card|fate.card/i.test(JSON.stringify(body).slice(0, 200))) return REAL_FATE_CARD_RESPONSE;
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.some((m) => /READER POSTURE/.test(String(m.content || '')))) {
      return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: retry11PlannerRaw_withLi } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
    }
    return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });

  await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._bakedScene1For === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
  await page.evaluate(({ scaffold }) => {
    const s = window.state;
    s.storyId = 'aftermath-lane-control-live-' + Date.now();
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

  // EVENT-FRAME RESOLVER COEXISTENCE (Roman 2026-09-21, added after that later fix): First
  // Sacrifice's real scene 2 row now ALSO declares eventFrameBySlot/defaultEventFrame, so the SAME
  // real Boundary card this control clicks below now resolves deterministically and renders the
  // REQUIRED EVENT FRAME block instead of this free-choice menu — proving THAT mechanism is
  // _scene2_event_frame_resolver_control.mjs's job, not this control's. This control's job is
  // narrower and still real: prove the free-choice AFTERMATH LANE MENU mechanism itself still
  // works, for any row that declares aftermathLanes WITHOUT a resolver. Neutralizing only the
  // resolver fields on the real in-page row (not a synthetic stand-in) isolates exactly that.
  await page.evaluate(() => {
    const row = window.STARTER_PLANS.starter_first_sacrifice.scenes.find((sc) => sc.n === 2);
    if (row) { row.eventFrameBySlot = null; row.defaultEventFrame = null; }
  });

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

  ok('the REQUIRED AFTERMATH LANE MENU block is present', /REQUIRED AFTERMATH LANE MENU \(HARD/.test(usrMsg), 'not found');
  ok('all 5 lane ids are listed in the menu', LANE_IDS.every((id) => usrMsg.indexOf('[' + id + ']') !== -1), 'not all found');
  ok('the menu states it REPLACES inventing an aftermath event', /REPLACES "invent any aftermath event"/.test(usrMsg), 'not found');
  ok('"chosen_aftermath_lane" is a required JSON key', /"chosen_aftermath_lane"/.test(sysMsg), 'not found');
  ok('"lane_posture_modulation" is a required JSON key', /"lane_posture_modulation"/.test(sysMsg), 'not found');
  ok('root cause C: REQUIRED SCENE FUNCTION block still present (coexist)', /REQUIRED SCENE FUNCTION \(HARD/.test(usrMsg), 'not found');
  ok('reserved/aftermath schema hardening block still present (coexist)', /EMPTY object \{\} for EITHER is INVALID/.test(sysMsg), 'not found');
  ok('root cause C: WORLD TRUTHS still present (coexist)', /WORLD TRUTHS \(canon/.test(usrMsg), 'not found');
  ok('Finding 2: RECENT OAS EXCHANGE still present (coexist)', /RECENT OAS EXCHANGE/.test(usrMsg), 'not found');
  ok('Finding 1: IMMUTABLE AFTERMATH (mouth-band) still present (coexist)', usrMsg.includes('mouth-band torn away'), 'not found');

  ok('FULL-FLOW: the gate logged a REJECTED warning citing no chosen lane', consoleLines.some((l) => /\[CG:PLANNER-GATE\] REJECTED/.test(l) && /no chosen_aftermath_lane/.test(l)), consoleLines.filter((l) => /PLANNER-GATE|STALE/.test(l)).join(' | ').slice(0, 600));
  ok('FULL-FLOW: the author was NEVER dispatched (zero calls at max_tokens 8000)', authorDispatchCount === 0, 'authorDispatchCount=' + authorDispatchCount);
  const resumableState = await page.evaluate(() => window.state._cgResumable || null);
  ok('FULL-FLOW: the pipeline ends in the same resumable-stop state as before', !!resumableState, JSON.stringify(resumableState));

  await browser.close();
  try { fs.unlinkSync(path.join(__dirname, '_scene2_aftermath_lane_control_out.jsonl')); } catch (_) {}

  console.log('\n' + '='.repeat(100));
  console.log('AFTERMATH LANE MENU CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
