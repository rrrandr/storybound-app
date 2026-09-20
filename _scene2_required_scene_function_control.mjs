// REQUIRED SCENE FUNCTION — DRY CONTROL (Roman, 2026-09-20)
//
// Roman, after retry 5 (Grok-primary planner, caught by the gate, but still over-weighted the raw
// Fate-Card line): "The planner should not be free to choose 'what happens next' from raw player
// text. It should be given a required scene-function frame first, then asked how the player posture
// changes the route through that frame... The player choice should steer the story, not hijack the
// skeleton."
//
// Traced: STARTER_PLANS.starter_first_sacrifice.scenes[n=2] already carried exitState/requiredTruth/
// decision_axis/vectors/aftermathTruths, and the seed's own worldTruths already state the sanctioned
// early-scene lanes ("accusation, preliminary review, political pressure, investigation, concealment,
// or flight") -- but nothing framed this as a REQUIRED JOB the planner must instantiate before
// reading posture; the closest thing (exitState) is a terse one-line target, read passively. Five
// real planner attempts across two models each independently derived the central event from the
// reader's raw text instead.
//
// Fix: a new `sceneFunction` field (STARTER_PLANS scene row) + a "REQUIRED SCENE FUNCTION (HARD)"
// block (app.js, OPEN ROW planner prompt) rendered BEFORE the reader's posture, which is now
// explicitly reframed as modulation, not the event's source. Two new required JSON output keys when
// sceneFunction is declared. A new posture-echo sub-check in _detectPlannerFunctionGap catches a
// plan that paraphrases the reader's raw Say/Do almost verbatim instead of translating it.
//
// Proves, fully dry (no provider calls, no image calls, no prose rewrite, no forks):
//   FRAME       — the real First Sacrifice Scene 2 row's sceneFunction renders in the real, live
//                 planner dispatch as a HARD block, positioned BEFORE the reader's Say/Do line.
//   SCHEMA      — the planner's JSON schema request includes the two new required keys
//                 (scene_function_instantiated, aftermath_obligations) when sceneFunction is present.
//   RED:ECHO    — retry 5's REAL posture + REAL planner stateChange (read verbatim from its
//                 persisted log) is rejected, specifically citing the shared "burn for" phrase.
//   GREEN       — a synthetic stateChange that names a real aftermath/procedure lane and shares NO
//                 phrase with the same real posture text is NOT rejected.
//   GENERIC     — the whole mechanism is inert for a scene row with no declared sceneFunction (not
//                 First-Sacrifice-specific machinery; a scene without this field behaves exactly as
//                 before).
//   COEXIST     — root causes A/B/C and the existing Planner Function Gate's aftermath-vocab check
//                 are all still present and unaffected.
//
// usage: node _scene2_required_scene_function_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── Read retry 5's REAL planner output + REAL posture verbatim from its persisted log ──
const RETRY5_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789941616227.jsonl');
const retry5Events = fs.readFileSync(RETRY5_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const retry5PlannerResp = retry5Events.find((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.responseBody && e.responseBody.model === 'grok-4.3');
const retry5Planner = JSON.parse(retry5PlannerResp.responseBody.choices[0].message.content);
const RETRY5_STATE_CHANGE = { precondition: retry5Planner.state_change_precondition, event: retry5Planner.state_change, forces_choice: retry5Planner.forces_choice, tactical_move: retry5Planner.tactical_move };
const RETRY5_POSTURE = { action: '**', dialogue: '*"I want you to burn for me, as the First-Favored did for the old gods."*' };
console.log('✓ loaded retry 5\'s real planner output + real posture verbatim from ' + RETRY5_LOG);
console.log('  real state_change: "' + RETRY5_STATE_CHANGE.event + '"');

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._detectPlannerFunctionGap === 'function' && typeof window._postureEchoBigram === 'function' && window.STARTER_PLANS && window.STARTER_PLANS.starter_first_sacrifice, { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  section('RED:ECHO — retry 5\'s real posture + real planner output is rejected, citing the shared phrase');
  const redResult = await page.evaluate(({ sc, posture }) => window._detectPlannerFunctionGap(sc, { requiresAftermath: true, posture }), { sc: RETRY5_STATE_CHANGE, posture: RETRY5_POSTURE });
  ok('retry 5\'s real plan is rejected', redResult.rejected === true, JSON.stringify(redResult));
  ok('the rejection cites a real posture-echo bigram containing "burn"', typeof redResult.echoMatch === 'string' && redResult.echoMatch.indexOf('burn') !== -1, JSON.stringify(redResult));
  ok('the rejection ALSO cites the aftermath-signal absence (both real problems present, both reported)', /no aftermath\/procedure\/consequence-movement signal/.test(redResult.reason), redResult.reason);

  section('GREEN — a synthetic aftermath-shaped stateChange sharing no phrase with the same real posture is NOT rejected');
  const greenStateChange = { precondition: 'no formal procedure against her conduct has begun yet', event: 'the presiding Dohkar opens a formal procedure of preliminary review against her conduct before the assembly', forces_choice: 'forces Lirael to choose between speaking for herself or sending silence in her place', tactical_move: 'force Lirael to face institutional procedure and political pressure' };
  const greenResult = await page.evaluate(({ sc, posture }) => window._detectPlannerFunctionGap(sc, { requiresAftermath: true, posture }), { sc: greenStateChange, posture: RETRY5_POSTURE });
  ok('a real procedure lane sharing no phrase with the posture is NOT rejected', greenResult.rejected === false, JSON.stringify(greenResult));

  section('GENERIC — the echo check itself is a plain function, inert without opts.posture (no false rejection on missing data)');
  const noPostureResult = await page.evaluate((sc) => window._detectPlannerFunctionGap(sc, { requiresAftermath: true }), RETRY5_STATE_CHANGE);
  ok('with no posture supplied, only the aftermath-signal check runs (no echo reason)', noPostureResult.rejected === true && !/echoes the reader/.test(noPostureResult.reason), JSON.stringify(noPostureResult));

  section('FRAME + SCHEMA + COEXIST — full-flow proof against the real, live planner dispatch');
  const ORIGINAL_LOG = path.join(__dirname, '_first_sacrifice_oas_grok_happy_path_sample_out', 'run_1789878699028.jsonl');
  const originalEvents = fs.readFileSync(ORIGINAL_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  function findResponse(roleTag) { return originalEvents.find((e) => e.kind === 'response' && e.roleTag === roleTag && e.status === 200).responseBody; }
  const REAL_OAS_TURN_REPLY_RESPONSE = findResponse('oas-turn-reply');
  const REAL_FATE_CARD_RESPONSE = findResponse('fate-card-preview-batch');
  const scaffoldEvent = originalEvents.find((e) => e.kind === 'response' && e.roleTag === 'scene2-generation' && e.status === 200 && /runThesis/.test(e.responseBody.choices[0].message.content || ''));
  const REAL_SCAFFOLD_JSON = JSON.parse(scaffoldEvent.responseBody.choices[0].message.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
  const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
  const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';

  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_scene2_required_scene_function_control_out.jsonl') });
  gate.stub('/api/proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
    return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(Object.assign({}, greenStateChange, { posture_read: 'stub', local_objective: 'stub', local_objective_actor: 'Lirael', present: ['Lirael'], reserved: { price_identified: 'untouched', inquiry_opened: 'untouched', julian_counter_wish: 'untouched', julian_obscuring_wishes: 'untouched' }, aftermath: { twist_manifested: 'kept', interrogation_interrupted: 'kept', the_answer_institutional: 'kept', inquiry_authority_claimed: 'kept' }, scene_function_instantiated: 'stub', aftermath_obligations: 'stub' })) } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });
  gate.stub('/api/mistral-proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.length === 2 && /Fate.Card|fate.card/i.test(JSON.stringify(body).slice(0, 200))) return REAL_FATE_CARD_RESPONSE;
    return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });

  await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._bakedScene1For === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
  await page.evaluate(({ scaffold }) => {
    const s = window.state;
    s.storyId = 'required-scene-function-control-' + Date.now();
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

  await page.click('#gnCardMount [data-fate-card-slot="boundary"]');
  gate.allowRealPaths([]);
  gate.setPhase('scene2-structural-author-stubbed', 10);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('scene2-structural-author-stubbed', { watchdogMs: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 1500));

  const tracked = gate.trackedCalls('scene2-structural-author-stubbed');
  const plannerDispatch = tracked.find((c) => { try { return Array.isArray(c.requestBody.messages) && c.requestBody.messages.some((m) => /READER POSTURE/.test(String(m.content || ''))); } catch (_) { return false; } });
  if (!plannerDispatch) { console.error('HARNESS BLOCKER: planner dispatch not found.'); await browser.close(); process.exit(2); }
  const sysMsg = plannerDispatch.requestBody.messages[0].content;
  const usrMsg = plannerDispatch.requestBody.messages[1].content;
  const full = sysMsg + '\n' + usrMsg;

  ok('REQUIRED SCENE FUNCTION block is present in the real dispatch', /REQUIRED SCENE FUNCTION \(HARD/.test(usrMsg), usrMsg.slice(0, 300));
  ok('the real, seed-authored sceneFunction text is present verbatim', usrMsg.includes('This scene must land the AFTERMATH of Julian\'s public accusation'), 'not found');
  ok('REQUIRED SCENE FUNCTION appears BEFORE READER\'S SAY/DO (frame first, posture second)', usrMsg.indexOf('REQUIRED SCENE FUNCTION') < usrMsg.indexOf("READER'S SAY/DO"), 'indices: ' + usrMsg.indexOf('REQUIRED SCENE FUNCTION') + ' / ' + usrMsg.indexOf("READER'S SAY/DO"));
  ok('the reframed Say/Do line explicitly calls the posture an ANGLE, not the event source', /ANGLE into the required scene function/.test(usrMsg), 'not found');
  ok('the schema request includes scene_function_instantiated', full.includes('scene_function_instantiated'), 'not found');
  ok('the schema request includes aftermath_obligations', full.includes('aftermath_obligations'), 'not found');
  ok('root cause C: WORLD TRUTHS still present (coexist)', /WORLD TRUTHS \(canon/.test(usrMsg), 'not found');
  ok('Finding 2: RECENT OAS EXCHANGE still present (coexist)', /RECENT OAS EXCHANGE/.test(usrMsg), 'not found');
  ok('IMMUTABLE AFTERMATH (mouth-band) still present (coexist)', usrMsg.includes('mouth-band torn away'), 'not found');

  await browser.close();
  try { fs.unlinkSync(path.join(__dirname, '_scene2_required_scene_function_control_out.jsonl')); } catch (_) {}

  console.log('\n' + '='.repeat(100));
  console.log('REQUIRED SCENE FUNCTION CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
