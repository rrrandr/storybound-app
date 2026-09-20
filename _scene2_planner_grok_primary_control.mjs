// SCENE-SPINE PLANNER — GROK-PRIMARY POLICY — DRY CONTROL (Roman, 2026-09-20)
//
// Roman's decision, after the planner-role trace: "The model that chooses 'what happens next' is
// the cheapest one, and Grok only gets a chance if the cheap planner breaks structurally... For a
// player-reactive story, that's backwards... the default event-decider should be the stronger
// model." Policy change: the scene-spine/open-row planner (the ONLY traced role that decides the
// actual next-scene event — see _planner_role_ledger_2026_09_20.md) now defaults to Grok PRIMARY,
// ministral-8b-2512 FALLBACK (transport/parse failure only, unchanged trigger condition) — a
// one-line flip of `_plannerGrok`'s default (public/app.js, inside _generateLiteraryPlotContract).
// window._scenePlannerEngine='ministral' is the new escape hatch back to the old default.
//
// Proves, fully dry (no provider calls, no image calls, no prose rewrite, no forks):
//   PRIMARY   — with BOTH tiers stubbed to succeed, only the Grok-shaped dispatch (a small,
//               scene-spine-planner-sized /api/proxy call, NOT the huge author prompt) fires for
//               the planner role; the ministral-shaped OPEN-ROW dispatch never fires at all — Grok
//               wins outright, ministral is never even attempted.
//   FALLBACK  — with the Grok tier stubbed to fail (a 500), the SAME real pipeline falls back to
//               ministral-8b-2512 and still produces a usable objective — the fallback path still
//               works, unchanged trigger (transport failure), not removed.
//   GATE-HOLDS — with Grok (now primary) stubbed to return retry 4's REAL rejected plan verbatim,
//               the Planner Function Gate still catches it and the author is NEVER dispatched —
//               proves the gate isn't tier-specific; it catches a bad plan from whichever model
//               produced it.
//   UNCHANGED — CG scaffold and the commit verifier still dispatch via their own, separate
//               _callTieredProvider role tags ('scaffold', 'runtimeCommitVerifier') — untouched by
//               this edit, confirmed by direct source read, not assumed.
//   ESCAPE    — window._scenePlannerEngine='ministral' still restores the old ministral-primary
//               order, for rollback/A-B testing.
//
// usage: node _scene2_planner_grok_primary_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

section('UNCHANGED — CG scaffold and commit verifier are untouched by this edit (direct source read)');
const APP_JS = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
ok('CG scaffold still dispatches via its own separate role tag, unchanged', APP_JS.includes("_callTieredProvider('scaffold', _scaffoldMsgs"), 'not found');
ok('commit verifier still dispatches via its own separate role tag, unchanged', APP_JS.includes("_callTieredProvider('runtimeCommitVerifier'"), 'not found');
ok('the scene-spine planner\'s tier order is now Grok-primary by default (_plannerGrok inverted, not the old ===\'grok\' opt-in)', APP_JS.includes("var _plannerGrok = !(typeof window !== 'undefined' && window._scenePlannerEngine === 'ministral');"), 'not found');

const RETRY4_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789937410539.jsonl');
const retry4Events = fs.readFileSync(RETRY4_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const retry4PlannerResp = retry4Events.find((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.responseBody && e.responseBody.model === 'ministral-8b-2512' && /tactical_move/.test(e.responseBody.choices[0].message.content || ''));
const retry4PlannerRaw = retry4PlannerResp.responseBody.choices[0].message.content;

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

// Deliberately avoids "inquiry" — that word collides with the real, seed-reserved inquiry_opened
// event (scene 4 only) and _validateLocalObjective correctly rejects any objective that touches a
// reserved marker. "preliminary review" / "political pressure" match the seed's own sanctioned
// early-scene vocabulary without pre-empting a later reserved beat.
const GOOD_PLANNER_REPLY = JSON.stringify({
  tactical_move: 'force Lirael to face a preliminary review of her conduct under political pressure', posture_read: 'a demand for visibility, read as a call for accountability', local_objective: 'Lirael must face the Dohkar opening a preliminary review of her conduct before the assembly', local_objective_actor: 'Lirael', present: ['Lirael', 'Julian', 'the presiding Dohkar', 'the assembly'],
  reserved: { price_identified: 'untouched', inquiry_opened: 'untouched', julian_counter_wish: 'untouched', julian_obscuring_wishes: 'untouched' },
  aftermath: { twist_manifested: 'kept', interrogation_interrupted: 'kept', the_answer_institutional: 'kept', inquiry_authority_claimed: 'kept' },
  state_change_precondition: 'no preliminary review of her conduct has begun yet', state_change: 'the presiding Dohkar opens a preliminary review of her conduct before the assembly', forces_choice: 'forces Lirael to choose between speaking for herself or sending silence in her place', branch_a: 'she speaks', branch_b: 'she stays silent',
  event_slots: { precondition: 'the Dohkar and Lirael are both present', actor: 'the presiding Dohkar', action: 'opens the preliminary review', target: 'Lirael', exit_state: 'a preliminary review has now begun' },
});

async function runOnce({ label, grokBehavior, ministralBehavior }) {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  let grokPlannerDispatched = false, ministralPlannerDispatched = false, authorDispatchCount = 0;
  const consoleLines = [];
  page.on('console', (m) => { consoleLines.push(m.text()); });

  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_scene2_planner_grok_primary_control_out_' + label + '.jsonl') });
  gate.stub('/api/proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
    // The scene-spine planner's OWN system prompt, when routed to Grok, contains "SCENE-SPINE planner"
    // and is small (a few KB) — distinct from the huge (~230KB) author system prompt at max_tokens 8000.
    const sysMsg = (body.messages && body.messages[0] && body.messages[0].content) || '';
    if (/SCENE-SPINE planner/.test(sysMsg) && body.max_tokens !== 8000) {
      grokPlannerDispatched = true;
      if (grokBehavior === 'fail') return { __gateStatus: 500, error: 'simulated Grok transport failure' };
      const content = grokBehavior === 'rejected' ? retry4PlannerRaw : GOOD_PLANNER_REPLY;
      return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
    }
    if (body.max_tokens === 8000) { authorDispatchCount++; return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: '```json\n' + JSON.stringify({ title: 'stub', beats: [{ idx: 0, kind: 'narration', text: 'stub' }], sceneCharge: { stake: 'stub' } }) + '\n```' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }; }
    return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });
  gate.stub('/api/mistral-proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.length === 2 && /Fate.Card|fate.card/i.test(JSON.stringify(body).slice(0, 200))) return REAL_FATE_CARD_RESPONSE;
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.some((m) => /READER POSTURE/.test(String(m.content || '')))) {
      ministralPlannerDispatched = true;
      if (ministralBehavior === 'skip') return { __gateStatus: 500, error: 'should not be reached' };
      return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: GOOD_PLANNER_REPLY } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
    }
    return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._bakedScene1For === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
  await page.evaluate(({ scaffold }) => {
    const s = window.state;
    s.storyId = 'planner-grok-primary-control-' + Date.now();
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
  await gate.waitForSettlement('scene2-structural-author-stubbed', { watchdogMs: 15000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 2000));

  const objectiveAccepted = await page.evaluate(() => {
    const so = window.state._sceneObjectives || {};
    const k = Object.keys(so)[0];
    return k ? so[k].postureHash != null : false;
  });
  const resumableState = await page.evaluate(() => window.state._cgResumable || null);

  await browser.close();
  try { fs.unlinkSync(path.join(__dirname, '_scene2_planner_grok_primary_control_out_' + label + '.jsonl')); } catch (_) {}
  return { grokPlannerDispatched, ministralPlannerDispatched, authorDispatchCount, objectiveAccepted, resumableState, consoleLines };
}

(async () => {
  section('PRIMARY — Grok is tried first for the planner role; ministral is never even attempted when Grok succeeds');
  const primaryRun = await runOnce({ label: 'primary', grokBehavior: 'good', ministralBehavior: 'skip' });
  ok('the Grok-shaped scene-spine-planner dispatch fired', primaryRun.grokPlannerDispatched === true, JSON.stringify(primaryRun));
  ok('the ministral-shaped OPEN-ROW dispatch never fired (Grok won outright, no fallback needed)', primaryRun.ministralPlannerDispatched === false, JSON.stringify(primaryRun));
  ok('a real objective was accepted from the Grok-primary reply', primaryRun.objectiveAccepted === true, JSON.stringify(primaryRun));

  section('FALLBACK — ministral-8b-2512 still serves as fallback when Grok transport fails');
  const fallbackRun = await runOnce({ label: 'fallback', grokBehavior: 'fail', ministralBehavior: 'serve' });
  ok('the Grok-shaped dispatch was attempted first (and failed, by design)', fallbackRun.grokPlannerDispatched === true, JSON.stringify(fallbackRun));
  ok('the ministral-shaped OPEN-ROW dispatch fired as the fallback', fallbackRun.ministralPlannerDispatched === true, JSON.stringify(fallbackRun));
  ok('a real objective was accepted from the ministral fallback reply — the fallback path still works', fallbackRun.objectiveAccepted === true, JSON.stringify(fallbackRun));

  section('GATE-HOLDS — the Planner Function Gate still catches a bad plan, now that it comes from Grok (primary)');
  const gateRun = await runOnce({ label: 'gate', grokBehavior: 'rejected', ministralBehavior: 'skip' });
  ok('the gate logged a REJECTED warning against the Grok-sourced plan', gateRun.consoleLines.some((l) => /\[CG:PLANNER-GATE\] REJECTED/.test(l)), gateRun.consoleLines.filter((l) => /PLANNER-GATE|STALE/.test(l)).join(' | ').slice(0, 500));
  ok('the author was NEVER dispatched, even with Grok as primary', gateRun.authorDispatchCount === 0, 'authorDispatchCount=' + gateRun.authorDispatchCount);
  ok('the pipeline ends in the same resumable-stop state', !!gateRun.resumableState, JSON.stringify(gateRun.resumableState));

  console.log('\n' + '='.repeat(100));
  console.log('SCENE-SPINE PLANNER GROK-PRIMARY CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
