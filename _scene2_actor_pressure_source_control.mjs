// ACTOR / PRESSURE-SOURCE SEPARATION — DRY CONTROL (Roman, 2026-09-21)
//
// Roman, after retry 14: "It exposed a narrow schema/role problem in the family_accusation lane:
// the lane naturally uses group grammar, but _validateLocalObjective requires an allowed
// individual actor and forbids collectives as actors... The fix is not to loosen collectives into
// actors. The fix is to make the lane specify who carries the objective versus who supplies
// pressure."
//
// Retry 14's two real planner replies are the exact real gap this closes: both independently put
// a COLLECTIVE into local_objective_actor -- attempt 1 invented an undeclared one ("Seren's
// family"), attempt 2 used the row's own declared collective ("the assembly"), which
// _validateLocalObjective has always forbidden as an actor. Both were correctly rejected by that
// pre-existing, UNCHANGED validator. The fix here is entirely upstream: new per-lane
// `objectiveActor`/`pressureSource` fields (public/app.js, on each aftermathLanes entry) make the
// distinction explicit in the prompt BEFORE the model has to guess it, and two new optional/
// conditionally-required JSON keys ("pressure_source", plus optional "institutional_actor" /
// "li_pressure_actor") give the model a place to put group pressure that ISN'T
// local_objective_actor. _validateLocalObjective itself is completely unchanged -- collectives
// still can never carry the objective; this control proves that rule was never loosened.
//
// Proves, fully dry (no provider calls, no image calls, no prose rewrite, no forks):
//   RED-A    — retry 14's real attempt 1 (local_objective_actor: "Seren's family", an undeclared
//              collective) is STILL rejected by the unchanged _validateLocalObjective.
//   RED-B    — retry 14's real attempt 2 (local_objective_actor: "the assembly", the row's own
//              declared collective) is STILL rejected by the unchanged _validateLocalObjective,
//              citing the exact same real reason retry 14 hit live.
//   GREEN    — attempt 1's real content, with ONLY local_objective_actor corrected to "Lirael" and
//              a new pressure_source: "Seren's family" field added, is ACCEPTED — proving the
//              fix is additive (new fields), not a loosened core rule.
//   PROMPT   — the real, live planner dispatch (Boundary card) now carries the WHO CARRIES THE
//              OBJECTIVE vs WHO SUPPLIES PRESSURE block naming objectiveActor "Lirael" and
//              pressureSource "Seren's family", and the schema requires "pressure_source" exactly
//              that value.
//   COEXIST  — REQUIRED EVENT FRAME, the reserved/aftermath schema block, WORLD TRUTHS, RECENT OAS
//              EXCHANGE, and IMMUTABLE AFTERMATH (mouth-band) all still render.
//
// usage: node _scene2_actor_pressure_source_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── Read retry 14's REAL two planner replies verbatim from its persisted log ──
const RETRY14_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789973412781.jsonl');
const retry14Events = fs.readFileSync(RETRY14_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const retry14Responses = retry14Events.filter((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.real === true);
if (retry14Responses.length !== 2) { console.error('HARNESS BLOCKER: expected 2 real planner replies in retry 14\'s log, found ' + retry14Responses.length); process.exit(2); }
function parseReply(resp) { const raw = resp.responseBody.choices[0].message.content; const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/); return JSON.parse(fenced ? fenced[1] : raw); }
const RETRY14_ATTEMPT_1 = parseReply(retry14Responses[0]);
const RETRY14_ATTEMPT_2 = parseReply(retry14Responses[1]);
console.log('✓ loaded retry 14\'s real two planner replies verbatim from ' + RETRY14_LOG);
console.log('  attempt 1 local_objective_actor:', JSON.stringify(RETRY14_ATTEMPT_1.local_objective_actor), '| attempt 2:', JSON.stringify(RETRY14_ATTEMPT_2.local_objective_actor));

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._validateLocalObjective === 'function' && typeof window._effectiveSceneRow === 'function' && window.STARTER_PLANS && window.STARTER_PLANS.starter_first_sacrifice, { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  const setupResult = await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'actor-pressure-control-' + Date.now();
    s._starterId = 'starter_first_sacrifice';
    s.picks = { identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.scenes = [{}];
    const eff = window._effectiveSceneRow(s, 2);
    const familyLane = (eff.aftermathLanes || []).find((l) => l.id === 'family_accusation');
    return { hasEff: !!eff, familyLane };
  });
  ok('scene 2\'s effective row resolves with the family_accusation lane', !!setupResult.familyLane, JSON.stringify(setupResult.familyLane));
  ok('family_accusation declares objectiveActor "Lirael"', setupResult.familyLane && setupResult.familyLane.objectiveActor === 'Lirael', JSON.stringify(setupResult.familyLane));
  ok('family_accusation declares pressureSource "Seren\'s family"', setupResult.familyLane && setupResult.familyLane.pressureSource === "Seren's family", JSON.stringify(setupResult.familyLane));

  section('RED-A — retry 14 attempt 1\'s real reply (actor: "Seren\'s family", undeclared collective) still rejected');
  const redA = await page.evaluate((reply) => { const eff = window._effectiveSceneRow(window.state, 2); return window._validateLocalObjective(reply, eff); }, RETRY14_ATTEMPT_1);
  ok('rejected', redA.ok === false, JSON.stringify(redA));
  ok('reason cites the actor problem', redA.why.some((w) => /actor/i.test(w)), JSON.stringify(redA.why));

  section('RED-B — retry 14 attempt 2\'s real reply (actor: "the assembly", declared collective) still rejected');
  const redB = await page.evaluate((reply) => { const eff = window._effectiveSceneRow(window.state, 2); return window._validateLocalObjective(reply, eff); }, RETRY14_ATTEMPT_2);
  ok('rejected', redB.ok === false, JSON.stringify(redB));
  ok('reason matches retry 14\'s real live rejection text exactly', redB.why.some((w) => w === 'local_objective_actor is a collective presence, not an individual cast member: the assembly'), JSON.stringify(redB.why));

  section('GREEN — attempt 1\'s real content, actor corrected to Lirael + pressure_source added, accepted');
  const correctedReply = Object.assign({}, RETRY14_ATTEMPT_1, {
    local_objective_actor: 'Lirael',
    pressure_source: "Seren's family",
  });
  const green = await page.evaluate((reply) => { const eff = window._effectiveSceneRow(window.state, 2); return window._validateLocalObjective(reply, eff); }, correctedReply);
  ok('accepted', green.ok === true, JSON.stringify(green));
  ok('the accepted actor is Lirael', green.actor === 'Lirael', green.actor);
  ok('the accepted local_objective is the REAL content from attempt 1 (unchanged)', green.local_objective === RETRY14_ATTEMPT_1.local_objective, green.local_objective);

  section('PROMPT + COEXIST — the real, live planner dispatch now carries the actor/pressure-source separation');
  const ORIGINAL_LOG = path.join(__dirname, '_first_sacrifice_oas_grok_happy_path_sample_out', 'run_1789878699028.jsonl');
  const originalEvents = fs.readFileSync(ORIGINAL_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  function findResponse(roleTag) { return originalEvents.find((e) => e.kind === 'response' && e.roleTag === roleTag && e.status === 200).responseBody; }
  const REAL_OAS_TURN_REPLY_RESPONSE = findResponse('oas-turn-reply');
  const REAL_FATE_CARD_RESPONSE = findResponse('fate-card-preview-batch');
  const scaffoldEvent = originalEvents.find((e) => e.kind === 'response' && e.roleTag === 'scene2-generation' && e.status === 200 && /runThesis/.test(e.responseBody.choices[0].message.content || ''));
  const REAL_SCAFFOLD_JSON = JSON.parse(scaffoldEvent.responseBody.choices[0].message.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
  const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
  const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';
  const retry14PlannerRaw = retry14Responses[1].responseBody.choices[0].message.content;

  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_scene2_actor_pressure_source_control_out.jsonl') });
  gate.stub('/api/proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
    if (body.max_tokens === 8000) return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: '```json\n' + JSON.stringify({ title: 'stub', beats: [{ idx: 0, kind: 'narration', text: 'stub' }], sceneCharge: { stake: 'stub' } }) + '\n```' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
    const sysMsg = (body.messages && body.messages[0] && body.messages[0].content) || '';
    if (/SCENE-SPINE planner/.test(sysMsg)) return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: retry14PlannerRaw } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
    return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });
  gate.stub('/api/mistral-proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.length === 2 && /Fate.Card|fate.card/i.test(JSON.stringify(body).slice(0, 200))) return REAL_FATE_CARD_RESPONSE;
    return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });

  await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._bakedScene1For === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
  await page.evaluate(({ scaffold }) => {
    const s = window.state;
    s.storyId = 'actor-pressure-control-live-' + Date.now();
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
  gate.setPhase('scene2-structural-author-stubbed', 20);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('scene2-structural-author-stubbed', { watchdogMs: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));

  const tracked = gate.trackedCalls('scene2-structural-author-stubbed');
  const plannerDispatch = tracked.find((c) => { try { return Array.isArray(c.requestBody.messages) && c.requestBody.messages.some((m) => /READER POSTURE/.test(String(m.content || ''))); } catch (_) { return false; } });
  if (!plannerDispatch) { console.error('HARNESS BLOCKER: planner dispatch not found.'); await browser.close(); process.exit(2); }
  const sysMsg = plannerDispatch.requestBody.messages[0].content;
  const usrMsg = plannerDispatch.requestBody.messages[1].content;

  ok('the WHO CARRIES THE OBJECTIVE vs WHO SUPPLIES PRESSURE block is present', /WHO CARRIES THE OBJECTIVE vs WHO SUPPLIES PRESSURE \(HARD\)/.test(usrMsg), 'not found');
  ok('it names "Seren\'s family" as the pressure source', /"Seren.?s family" is the PRESSURE SOURCE/.test(usrMsg), 'not found');
  ok('it names Lirael as the required objective actor', /local_objective_actor" MUST instead be "Lirael"/.test(usrMsg), 'not found');
  ok('it explicitly forbids a pressure source from being local_objective_actor or present as an individual', /A pressure source is NEVER "local_objective_actor"/.test(usrMsg), 'not found');
  ok('the schema requires pressure_source exactly "Seren\'s family" for this frame', /REQUIRED for this frame: "pressure_source" \(string, exactly "Seren.?s family"/.test(sysMsg), 'not found');
  ok('the schema explicitly forbids collectives/invented groups as local_objective_actor', /NEVER a collective \(e\.g\. "the assembly"\) and NEVER a group label you invent/.test(sysMsg), 'not found');
  ok('root cause C: REQUIRED EVENT FRAME block still present (coexist)', /REQUIRED EVENT FRAME \(HARD, DETERMINISTICALLY RESOLVED/.test(usrMsg), 'not found');
  ok('reserved/aftermath schema hardening block still present (coexist)', /EMPTY object \{\} for EITHER is INVALID/.test(sysMsg), 'not found');
  ok('root cause C: WORLD TRUTHS still present (coexist)', /WORLD TRUTHS \(canon/.test(usrMsg), 'not found');
  ok('Finding 2: RECENT OAS EXCHANGE still present (coexist)', /RECENT OAS EXCHANGE/.test(usrMsg), 'not found');
  ok('Finding 1: IMMUTABLE AFTERMATH (mouth-band) still present (coexist)', usrMsg.includes('mouth-band torn away'), 'not found');

  await browser.close();
  try { fs.unlinkSync(path.join(__dirname, '_scene2_actor_pressure_source_control_out.jsonl')); } catch (_) {}

  console.log('\n' + '='.repeat(100));
  console.log('ACTOR / PRESSURE-SOURCE SEPARATION CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
