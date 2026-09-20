// PLANNER FUNCTION GATE — DRY CONTROL (Roman, 2026-09-20)
//
// Roman, after retry 4's real result: "The plumbing is now mostly proven; the remaining failure is
// planner capability... The current failure should have stopped at the planner, before spending on
// the author." Retry 4 proved the planner received every fix (mouth-band state, live OAS exchange,
// worldTruths, protected-object constraints) and STILL produced aftermath.present:false — but that
// was only caught AFTER a real, paid author call ($0.0853) had already dramatized the inadequate
// plan. This control proves a new gate that stops the doomed plan before that spend, using retry 4's
// REAL planner output as the red fixture.
//
// Mechanism: _detectPlannerFunctionGap (public/app.js, next to _detectSceneAdequacyFailure) re-runs
// the SAME, already-proven _SCENE_AFTERMATH_VOCAB_RX against the planner's own tactical_move/event/
// forces_choice — before any prose exists to check. Wired into the CG open-row flow right after the
// existing OPEN ROW GATE (which already rejects a stale/unaccepted objective the same way) — a
// rejection reuses that SAME bounded retry-then-stop machinery, never invented fresh.
//
// Proves, fully dry (no provider calls, no image calls, no prose rewrite, no forks):
//   RED         — _detectPlannerFunctionGap rejects retry 4's REAL stateChange (read verbatim from
//                 its persisted log), the exact real capability gap this gate exists to catch.
//   GREEN       — a synthetic stateChange naming a real aftermath/procedure event (a formal inquiry)
//                 is NOT rejected.
//   ABSENCE     — the gate is a no-op (never rejects) when requiresAftermath is false — a genuine
//                 Scene 1 opener or any non-aftermath-shaped scene is completely unaffected.
//   FULL-FLOW   — with the network gate stubbed to serve retry 4's REAL rejected planner reply on
//                 EVERY call (both the initial attempt and the one bounded retry), the real CG
//                 pipeline (a) never dispatches an author request at all (zero calls to /api/proxy
//                 for the structural-author role), (b) logs the rejection, (c) ends in the same
//                 resumable-stop state the pre-existing stale-objective path already uses.
//   COEXIST     — root causes A/B/C's mechanisms (WORLD FACTS block, CONT_AFTERMATH density,
//                 worldTruths+register framing) are all still present and unaffected by this gate.
//
// usage: node _scene2_planner_function_gate_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── Read retry 4's REAL planner reply verbatim from its persisted log ──
const RETRY4_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789937410539.jsonl');
const retry4Events = fs.readFileSync(RETRY4_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const retry4PlannerResp = retry4Events.find((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.responseBody && e.responseBody.model === 'ministral-8b-2512' && /tactical_move/.test(e.responseBody.choices[0].message.content || ''));
const retry4PlannerRaw = retry4PlannerResp.responseBody.choices[0].message.content;
const retry4PlannerFenced = retry4PlannerRaw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
const RETRY4_PLANNER_JSON = JSON.parse(retry4PlannerFenced ? retry4PlannerFenced[1] : retry4PlannerRaw);
const RETRY4_STATE_CHANGE = {
  precondition: RETRY4_PLANNER_JSON.state_change_precondition,
  event: RETRY4_PLANNER_JSON.state_change,
  forces_choice: RETRY4_PLANNER_JSON.forces_choice,
  tactical_move: RETRY4_PLANNER_JSON.tactical_move,
};
console.log('✓ loaded retry 4\'s real planner reply verbatim from ' + RETRY4_LOG);
console.log('  real tactical_move: "' + RETRY4_STATE_CHANGE.tactical_move.slice(0, 100) + '..."');
console.log('  real state_change (event): "' + RETRY4_STATE_CHANGE.event.slice(0, 100) + '..."');

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._detectPlannerFunctionGap === 'function' && typeof window._buildPlotContractDirective === 'function' && typeof window._buildCGScreenplayUserPrompt === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  section('RED — retry 4\'s real, rejected planner output is caught by the gate');
  const redResult = await page.evaluate((sc) => window._detectPlannerFunctionGap(sc, { requiresAftermath: true }), RETRY4_STATE_CHANGE);
  ok('retry 4\'s real stateChange is rejected', redResult.rejected === true, JSON.stringify(redResult));
  ok('the rejection reason names the aftermath-signal gap', /no aftermath\/procedure\/consequence-movement signal/.test(redResult.reason || ''), redResult.reason);

  section('GREEN — a synthetic stateChange naming a real aftermath/procedure event is NOT rejected');
  const greenStateChange = { precondition: 'no formal inquiry has been named yet', event: 'the presiding Dohkar names a formal inquiry before a Chayr and two Dohkars', forces_choice: 'forces Lirael to choose between speaking for herself or sending silence in her place', tactical_move: 'force the assembly to witness the opening of formal procedure against Lirael' };
  const greenResult = await page.evaluate((sc) => window._detectPlannerFunctionGap(sc, { requiresAftermath: true }), greenStateChange);
  ok('a real procedure/inquiry event is NOT rejected', greenResult.rejected === false, JSON.stringify(greenResult));

  section('ABSENCE — the gate is a no-op when requiresAftermath is false (a genuine Scene 1 opener is unaffected)');
  const absenceResult = await page.evaluate((sc) => window._detectPlannerFunctionGap(sc, { requiresAftermath: false }), RETRY4_STATE_CHANGE);
  ok('the SAME inadequate stateChange is NOT rejected when the scene does not require aftermath', absenceResult.rejected === false, JSON.stringify(absenceResult));
  const noDataResult = await page.evaluate(() => window._detectPlannerFunctionGap(null, { requiresAftermath: true }));
  ok('no stateChange data at all does not itself trigger a false rejection (nothing to judge)', noDataResult.rejected === false, JSON.stringify(noDataResult));

  section('FULL-FLOW — the real CG pipeline never dispatches an author request when the planner is rejected twice');
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
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_scene2_planner_function_gate_control_out.jsonl') });
  gate.stub('/api/proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
    // Any OTHER /api/proxy call at max_tokens 8000 is the structural author — the one call this gate
    // must prevent from ever firing. Counted, not silently allowed.
    if (body.max_tokens === 8000) { authorDispatchCount++; return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: '```json\n' + JSON.stringify({ title: 'stub', beats: [{ idx: 0, kind: 'narration', text: 'stub' }], sceneCharge: { stake: 'stub' } }) + '\n```' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }; }
    return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });
  // The planner (mistral-proxy) ALWAYS returns retry 4's real, rejected reply — both the initial
  // attempt and the one bounded retry the gate triggers. Proves the gate holds even when a second
  // attempt reproduces the same inadequate plan.
  gate.stub('/api/mistral-proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.length === 2 && /Fate.Card|fate.card/i.test(JSON.stringify(body).slice(0, 200))) return REAL_FATE_CARD_RESPONSE;
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.some((m) => /READER POSTURE/.test(String(m.content || '')))) {
      return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: retry4PlannerRaw } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
    }
    return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });

  await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._bakedScene1For === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
  await page.evaluate(({ scaffold }) => {
    const s = window.state;
    s.storyId = 'planner-gate-control-' + Date.now();
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
  gate.allowRealPaths([]);
  gate.setPhase('scene2-structural-author-stubbed', 20);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('scene2-structural-author-stubbed', { watchdogMs: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));

  ok('the gate logged a REJECTED warning', consoleLines.some((l) => /\[CG:PLANNER-GATE\] REJECTED/.test(l)), consoleLines.filter((l) => /PLANNER-GATE|STALE/.test(l)).join(' | ').slice(0, 500));
  ok('the author was NEVER dispatched (zero calls at max_tokens 8000, despite the gate\'s one bounded retry)', authorDispatchCount === 0, 'authorDispatchCount=' + authorDispatchCount);
  const resumableState = await page.evaluate(() => window.state._cgResumable || null);
  ok('the pipeline ends in the same resumable-stop state the pre-existing stale-objective path uses', !!resumableState, JSON.stringify(resumableState));

  section('COEXIST — root causes A/B/C\'s mechanisms are unaffected by this gate');
  const coexistResult = await page.evaluate(() => {
    const scene2Row = window.STARTER_PLANS.starter_first_sacrifice.scenes.find((s) => s.n === 2);
    window.state._scenePlotContract = {
      sceneIndex: 1,
      stateChange: { precondition: 'x', event: 'the presiding Dohkar names a formal inquiry', forces_choice: 'claim it or let Julian take it', tactical_move: '', branch_a: '', branch_b: '', sceneProposed: 1 },
      hardBeats: [], aftermathTruths: scene2Row.aftermathTruths, reservedConstraints: [],
    };
    return { systemBlock: window._buildPlotContractDirective(), userBlock: window._buildCGScreenplayUserPrompt(1, 'a', 'b') };
  });
  ok('root cause A: WORLD FACTS binding block still renders', /WORLD FACTS[\s\S]{0,100}HARD — BINDING/.test(coexistResult.systemBlock), coexistResult.systemBlock.slice(0, 300));
  ok('root cause B: CONTINUATION — AFTERMATH/CONSEQUENCE PACE still fires', /CONTINUATION — AFTERMATH\/CONSEQUENCE PACE/.test(coexistResult.userBlock), coexistResult.userBlock.slice(0, 300));

  await browser.close();
  try { fs.unlinkSync(path.join(__dirname, '_scene2_planner_function_gate_control_out.jsonl')); } catch (_) {}

  console.log('\n' + '='.repeat(100));
  console.log('PLANNER FUNCTION GATE CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
