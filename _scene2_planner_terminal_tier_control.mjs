// SCENE-SPINE PLANNER — GPT-4o TERMINAL TIER — DRY CONTROL (Roman, 2026-09-21)
//
// Roman, after two real, consecutive NO_RESPONSE_FROM_FUNCTION 502s from the Grok-primary planner
// tier: "Given the role's importance, adding [a GPT-4o terminal] now makes sense... it should
// probably use the same robust shape as the other important text paths: Grok -> ministral-8b ->
// GPT-4o terminal. Still with the planner-function gate after every successful plan, so GPT-4o
// doesn't get to pass weak plans either."
//
// Confirmed by direct source read before this change: the scene-spine/open-row planner
// (_generateLiteraryPlotContract, public/app.js) previously had exactly two tiers -- Grok primary,
// ministral-8b-2512 fallback -- with no terminal, unlike the shared default _callTieredProvider
// chain (mistral -> grok -> OpenAI terminal) and _authorFullScenePolicy (grok -> ministral -> gpt-4o
// terminal), both of which already carry one. Fix: a gpt-4o terminal tier is now appended
// unconditionally after the existing two-tier construction, in BOTH branches (Grok-primary default
// and the window._scenePlannerEngine='ministral' escape hatch).
//
// Proves, fully dry (no provider calls, no image calls, no prose rewrite, no forks):
//   PRIMARY   — Grok succeeding stops the chain; neither ministral nor openai/gpt-4o is attempted.
//   FALLBACK  — Grok transport failure (502) falls to ministral; ministral succeeding stops the
//               chain before openai/gpt-4o is ever attempted.
//   TERMINAL  — Grok AND ministral both failing (502/transport) falls through to the gpt-4o
//               terminal tier, which succeeds.
//   GATE-ON-TERMINAL — a weak-but-valid plan sourced from the gpt-4o terminal tier specifically
//               (retry 4's real inadequate ministral plan, replayed as if gpt-4o produced it) is
//               still rejected by the Planner Function Gate before author dispatch — the gate gives
//               no special treatment to any one tier.
//   UNCHANGED — CG scaffold and the commit verifier still dispatch via their own, separate,
//               untouched _callTieredProvider role tags (confirmed by direct source read).
//
// usage: node _scene2_planner_terminal_tier_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

section('SOURCE — the terminal tier is present, unconditional, in both branches (direct read, not assumed)');
const APP_JS = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
ok('a terminal openai/gpt-4o tier push exists', APP_JS.includes("_scTiers.push({ tier: 'terminal', provider: 'openai', model: 'gpt-4o' });"), 'not found');
ok('CG scaffold still dispatches via its own separate role tag, unchanged', APP_JS.includes("_callTieredProvider('scaffold', _scaffoldMsgs"), 'not found');
ok('commit verifier still dispatches via its own separate role tag, unchanged', APP_JS.includes("_callTieredProvider('runtimeCommitVerifier'"), 'not found');

const RETRY4_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789937410539.jsonl');
const retry4Events = fs.readFileSync(RETRY4_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const retry4PlannerResp = retry4Events.find((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.responseBody && e.responseBody.model === 'ministral-8b-2512' && /tactical_move/.test(e.responseBody.choices[0].message.content || ''));
const WEAK_PLANNER_RAW = retry4PlannerResp.responseBody.choices[0].message.content;

const GOOD_PLANNER_REPLY = JSON.stringify({
  tactical_move: 'force Lirael to face a preliminary review of her conduct under political pressure', posture_read: 'a demand for visibility, read as a call for accountability', local_objective: 'Lirael must face the Dohkar opening a preliminary review of her conduct before the assembly', local_objective_actor: 'Lirael', present: ['Lirael', 'Julian', 'the presiding Dohkar', 'the assembly'],
  reserved: { price_identified: 'untouched', inquiry_opened: 'untouched', julian_counter_wish: 'untouched', julian_obscuring_wishes: 'untouched' },
  aftermath: { twist_manifested: 'kept', interrogation_interrupted: 'kept', the_answer_institutional: 'kept', inquiry_authority_claimed: 'kept' },
  state_change_precondition: 'no formal procedure against her conduct has begun yet', state_change: 'the presiding Dohkar opens a formal procedure of preliminary review against her conduct before the assembly', forces_choice: 'forces Lirael to choose between speaking for herself or sending silence in her place', branch_a: 'she speaks', branch_b: 'she stays silent',
  event_slots: { precondition: 'the Dohkar and Lirael are both present', actor: 'the presiding Dohkar', action: 'opens the preliminary review', target: 'Lirael', exit_state: 'a preliminary review has now begun' },
});

const ORIGINAL_LOG = path.join(__dirname, '_first_sacrifice_oas_grok_happy_path_sample_out', 'run_1789878699028.jsonl');
const originalEvents = fs.readFileSync(ORIGINAL_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
function findResponse(roleTag) { return originalEvents.find((e) => e.kind === 'response' && e.roleTag === roleTag && e.status === 200).responseBody; }
const REAL_OAS_TURN_REPLY_RESPONSE = findResponse('oas-turn-reply');
const REAL_FATE_CARD_RESPONSE = findResponse('fate-card-preview-batch');
const scaffoldEvent = originalEvents.find((e) => e.kind === 'response' && e.roleTag === 'scene2-generation' && e.status === 200 && /runThesis/.test(e.responseBody.choices[0].message.content || ''));
const REAL_SCAFFOLD_JSON = JSON.parse(scaffoldEvent.responseBody.choices[0].message.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';
const CANDIDATE_PATH = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package', '13_final_field_correction.json');
const candidateRaw = JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));

async function runOnce({ label, grokBehavior, ministralBehavior, openaiBehavior }) {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  let grokPlannerDispatched = false, ministralPlannerDispatched = false, openaiPlannerDispatched = false, authorDispatchCount = 0;
  const consoleLines = [];
  page.on('console', (m) => { consoleLines.push(m.text()); });

  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_scene2_planner_terminal_tier_control_out_' + label + '.jsonl') });
  gate.stub('/api/proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
    const sysMsg = (body.messages && body.messages[0] && body.messages[0].content) || '';
    if (/SCENE-SPINE planner/.test(sysMsg) && body.max_tokens !== 8000) {
      grokPlannerDispatched = true;
      if (grokBehavior === 'fail') return { __gateStatus: 502, error: 'simulated Grok transport failure' };
      return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: GOOD_PLANNER_REPLY } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
    }
    if (body.max_tokens === 8000) { authorDispatchCount++; return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: '```json\n' + JSON.stringify({ title: 'stub', beats: [{ idx: 0, kind: 'narration', text: 'stub' }], sceneCharge: { stake: 'stub' } }) + '\n```' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }; }
    return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });
  gate.stub('/api/mistral-proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.length === 2 && /Fate.Card|fate.card/i.test(JSON.stringify(body).slice(0, 200))) return REAL_FATE_CARD_RESPONSE;
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.some((m) => /READER POSTURE/.test(String(m.content || '')))) {
      ministralPlannerDispatched = true;
      if (ministralBehavior === 'fail') return { __gateStatus: 502, error: 'simulated ministral transport failure' };
      return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: GOOD_PLANNER_REPLY } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
    }
    return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });
  gate.stub('/api/chatgpt-proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    const sysMsg = (body.messages && body.messages[0] && body.messages[0].content) || '';
    if (body.role === 'PRIMARY_AUTHOR' && /SCENE-SPINE planner/.test(sysMsg)) {
      openaiPlannerDispatched = true;
      const content = openaiBehavior === 'weak' ? WEAK_PLANNER_RAW : GOOD_PLANNER_REPLY;
      return { content, usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
    }
    return { content: 'stub', usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._bakedScene1For === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
  await page.evaluate(({ scaffold }) => {
    const s = window.state;
    s.storyId = 'planner-terminal-tier-control-' + Date.now();
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
  if (!boundarySlotExists) { console.error('HARNESS BLOCKER (' + label + '): Boundary slot did not render.'); await browser.close(); process.exit(2); }

  await page.click('#gnCardMount [data-fate-card-slot="boundary"]');
  gate.allowRealPaths([]);
  gate.setPhase('scene2-structural-author-stubbed', 20);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('scene2-structural-author-stubbed', { watchdogMs: 15000, quietMs: 4000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));

  const objectiveAccepted = await page.evaluate(() => {
    const so = window.state._sceneObjectives || {};
    const k = Object.keys(so)[0];
    return k ? so[k].postureHash != null : false;
  });
  const resumableState = await page.evaluate(() => window.state._cgResumable || null);
  const tierLog = await page.evaluate(() => (window._providerTierLog || []).filter((r) => r.role === 'scenePlanner'));

  await browser.close();
  try { fs.unlinkSync(path.join(__dirname, '_scene2_planner_terminal_tier_control_out_' + label + '.jsonl')); } catch (_) {}
  return { grokPlannerDispatched, ministralPlannerDispatched, openaiPlannerDispatched, authorDispatchCount, objectiveAccepted, resumableState, consoleLines, tierLog };
}

(async () => {
  section('PRIMARY — Grok succeeding stops the chain before ministral or openai/gpt-4o is ever attempted');
  const primaryRun = await runOnce({ label: 'primary', grokBehavior: 'good' });
  ok('Grok planner dispatch fired', primaryRun.grokPlannerDispatched === true, JSON.stringify(primaryRun.tierLog));
  ok('ministral planner dispatch never fired', primaryRun.ministralPlannerDispatched === false, 'ministralPlannerDispatched=' + primaryRun.ministralPlannerDispatched);
  ok('openai/gpt-4o planner dispatch never fired', primaryRun.openaiPlannerDispatched === false, 'openaiPlannerDispatched=' + primaryRun.openaiPlannerDispatched);
  ok('a real objective was accepted from the Grok-primary reply', primaryRun.objectiveAccepted === true, JSON.stringify(primaryRun.resumableState));

  section('FALLBACK — Grok transport failure falls to ministral, which succeeds and stops the chain before openai/gpt-4o');
  const fallbackRun = await runOnce({ label: 'fallback', grokBehavior: 'fail', ministralBehavior: 'succeed' });
  ok('Grok planner dispatch was attempted (and failed, by design)', fallbackRun.grokPlannerDispatched === true, 'grokPlannerDispatched=' + fallbackRun.grokPlannerDispatched);
  ok('ministral planner dispatch fired as the fallback', fallbackRun.ministralPlannerDispatched === true, 'ministralPlannerDispatched=' + fallbackRun.ministralPlannerDispatched);
  ok('openai/gpt-4o planner dispatch never fired (ministral succeeded first)', fallbackRun.openaiPlannerDispatched === false, 'openaiPlannerDispatched=' + fallbackRun.openaiPlannerDispatched);
  ok('a real objective was accepted from the ministral fallback reply', fallbackRun.objectiveAccepted === true, JSON.stringify(fallbackRun.resumableState));

  section('TERMINAL — Grok AND ministral both fail, falling through to the gpt-4o terminal tier, which succeeds');
  const terminalRun = await runOnce({ label: 'terminal', grokBehavior: 'fail', ministralBehavior: 'fail', openaiBehavior: 'good' });
  ok('Grok planner dispatch was attempted (and failed)', terminalRun.grokPlannerDispatched === true, 'grokPlannerDispatched=' + terminalRun.grokPlannerDispatched);
  ok('ministral planner dispatch was attempted (and failed)', terminalRun.ministralPlannerDispatched === true, 'ministralPlannerDispatched=' + terminalRun.ministralPlannerDispatched);
  ok('openai/gpt-4o terminal dispatch fired', terminalRun.openaiPlannerDispatched === true, 'openaiPlannerDispatched=' + terminalRun.openaiPlannerDispatched);
  ok('a real objective was accepted from the gpt-4o terminal reply', terminalRun.objectiveAccepted === true, JSON.stringify(terminalRun.resumableState));
  ok('the app\'s own tier log shows all 3 attempts, in order primary/fallback/terminal', terminalRun.tierLog.length === 3 && terminalRun.tierLog[0].tier === 'primary' && terminalRun.tierLog[1].tier === 'fallback' && terminalRun.tierLog[2].tier === 'terminal', JSON.stringify(terminalRun.tierLog));

  section('GATE-ON-TERMINAL — a weak-but-valid plan sourced from the gpt-4o terminal tier is still rejected before author');
  const gateTerminalRun = await runOnce({ label: 'gate-terminal', grokBehavior: 'fail', ministralBehavior: 'fail', openaiBehavior: 'weak' });
  ok('the gate logged a REJECTED warning against the gpt-4o-sourced plan', gateTerminalRun.consoleLines.some((l) => /\[CG:PLANNER-GATE\] REJECTED/.test(l)), gateTerminalRun.consoleLines.filter((l) => /PLANNER-GATE|STALE/.test(l)).join(' | ').slice(0, 500));
  ok('the author was NEVER dispatched, even though the terminal tier produced a reply', gateTerminalRun.authorDispatchCount === 0, 'authorDispatchCount=' + gateTerminalRun.authorDispatchCount);
  ok('the pipeline ends in the same resumable-stop state', !!gateTerminalRun.resumableState, JSON.stringify(gateTerminalRun.resumableState));

  console.log('\n' + '='.repeat(100));
  console.log('SCENE-SPINE PLANNER TERMINAL TIER CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
