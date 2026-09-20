// SCENE 2 REPAIR REPLAY — MECHANICS DRY PROOF (Roman, 2026-09-20)
//
// Before trusting _scene2_repair_replay_sample.mjs with real money, this proves the REPLAY
// mechanism itself works: the real, already-paid-for OAS turn-reply and Fate-Card batch responses
// (read directly from the original run's persisted log, never hand-transcribed) correctly
// reconstruct state through the REAL app parsing/state-building code, the Boundary card genuinely
// becomes selectable, and — critically — the seeded state.cgScaffold correctly suppresses the
// once-per-story CG scaffold regeneration that would otherwise silently fire and spend money
// outside the intended structural/author scope.
//
// Fully dry: EVERY endpoint, including the structural/author phase, is stubbed here (never
// allowRealPaths) — this control validates the replay's STATE RECONSTRUCTION and SCAFFOLD
// SUPPRESSION, not the repaired planner/author dispatch itself (already proven separately in
// _scene2_planner_tiered_fallback_repair_control.mjs).
//
// usage: node _scene2_repair_replay_mechanics_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 500) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const ORIGINAL_LOG = path.join(__dirname, '_first_sacrifice_oas_grok_happy_path_sample_out', 'run_1789878699028.jsonl');
const originalEvents = fs.readFileSync(ORIGINAL_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
function findResponse(roleTag) {
  const ev = originalEvents.find((e) => e.kind === 'response' && e.roleTag === roleTag && e.status === 200);
  if (!ev) { console.error('HARNESS BLOCKER: no successful "' + roleTag + '" response found.'); process.exit(2); }
  return ev.responseBody;
}
const REAL_OAS_TURN_REPLY_RESPONSE = findResponse('oas-turn-reply');
const REAL_FATE_CARD_RESPONSE = findResponse('fate-card-preview-batch');
const scaffoldEvent = originalEvents.find((e) => e.kind === 'response' && e.roleTag === 'scene2-generation' && e.status === 200 && e.responseBody && e.responseBody.choices && e.responseBody.choices[0] && e.responseBody.choices[0].message && /runThesis/.test(e.responseBody.choices[0].message.content || ''));
const REAL_SCAFFOLD_JSON = JSON.parse(scaffoldEvent.responseBody.choices[0].message.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
const REAL_LI_DIALOGUE_FROM_LOG = JSON.parse(REAL_OAS_TURN_REPLY_RESPONSE.choices[0].message.content).li_dialogue;
console.log('✓ loaded real persisted responses — expecting the exact reply: "' + REAL_LI_DIALOGUE_FROM_LOG + '"');

const CANDIDATE_PATH = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package', '13_final_field_correction.json');
const candidateRaw = JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));
const candidateOasOpening = candidateRaw.draft && candidateRaw.draft.oasOpening;
const candidatePostInterruption = candidateRaw.draft && candidateRaw.draft.postInterruptionBeat;

const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();

  const structuralCalls = []; // every call the (fully stubbed) structural/author phase receives
  const gate = await installFailClosedNetworkGate(page);
  gate.stub('/api/proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    // roleTag STRUCTURE_GENERATOR (not INTIMACY_SPECIALIST) — the OAS turn-reply dispatches via
    // _authorFullScenePolicy since the 2026-09-20 reclassification; INTIMACY_SPECIALIST is only the
    // OPENER's (unchanged) live-generated path, which never fires here (the candidate opener is
    // zero-call). Matching the wrong role tag was a real bug this control caught: the stub fell
    // through to the generic branch, producing an unparseable response and the app's own soft-
    // deflect fallback line instead of the real replayed reply.
    if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
    structuralCalls.push({ url: '/api/proxy', maxTokens: body.max_tokens, role: body.role });
    return { choices: [{ message: { content: JSON.stringify({ local_objective: 'stub', state_change: {} }) } }] };
  });
  gate.stub('/api/mistral-proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (structuralCalls.length === 0 && !structuralPhaseStarted) return REAL_FATE_CARD_RESPONSE;
    structuralCalls.push({ url: '/api/mistral-proxy', maxTokens: body.max_tokens, model: body.model });
    return { choices: [{ message: { content: JSON.stringify({ local_objective: 'stub', state_change: {} }) } }] };
  });
  let structuralPhaseStarted = false;

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._fireIntimacyOpener === 'function' && typeof window._clearPersistedOASState === 'function' && typeof window._bakedScene1For === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached\n');

  const seededStoryId = await page.evaluate(({ scaffold }) => {
    const s = window.state;
    s.storyId = 'scene2-repair-replay-mechanics-proof-' + Date.now();
    s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = [];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s._starterId = 'starter_first_sacrifice';
    s._pcLookSkipped = true;
    s._bakedGenesisUnlocked = true;
    window._devBypass = true;
    s.cgScaffold = Object.assign({}, scaffold, { storyId: s.storyId });
    return s.storyId;
  }, { scaffold: REAL_SCAFFOLD_JSON });

  section('1. SCAFFOLD SUPPRESSION SEEDING — verified directly against the real gate function');
  const gateCheck = await page.evaluate(() => ({
    hasFn: typeof window._shouldGenerateCGScaffold === 'function',
    result: typeof window._shouldGenerateCGScaffold === 'function' ? window._shouldGenerateCGScaffold(window.state) : null,
    scaffoldStoryId: window.state.cgScaffold && window.state.cgScaffold.storyId,
    stateStoryId: window.state.storyId,
  }));
  ok('window._shouldGenerateCGScaffold is reachable', gateCheck.hasFn, JSON.stringify(gateCheck));
  ok('seeded state.cgScaffold.storyId matches state.storyId', gateCheck.scaffoldStoryId === gateCheck.stateStoryId, JSON.stringify(gateCheck));
  ok('the REAL gate function itself reports "do not regenerate" (false) for this seeded state', gateCheck.result === false, JSON.stringify(gateCheck));

  section('2. CANDIDATE OPENER + REPLAYED OAS TURN REPLY — real state reconstruction from the real persisted response');
  await page.evaluate(async ({ candidateOasOpening, candidatePostInterruption }) => {
    window.state.intimacyDialogue = null;
    window._clearPersistedOASState();
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    const h = pkg.oasHandoff || {};
    const plan = {
      beats: [], is_consummate_scene: true, __bakedOrigin: pkg.title || null,
      openingFrame: h.openingFrame || '', cue: h.cue || '',
      interruption: h.interruption || '', interruptionImage: h.interruptionImage || '',
      interruptionExchange: Array.isArray(h.interruptionExchange) ? h.interruptionExchange.slice() : [],
      oasOpening: candidateOasOpening, postInterruptionBeat: candidatePostInterruption || null,
    };
    await window._initIntimacyDialogue(plan);
    await window._fireIntimacyOpener();
  }, { candidateOasOpening, candidatePostInterruption });
  await page.fill('#gnActionInput', REAL_DO);
  await page.fill('#gnDialogueInput', REAL_SAY);
  await page.click('#gnSubmitBtn');
  await page.waitForFunction((expected) => {
    const d = window.state.intimacyDialogue;
    const last = d && d.liTurnHistory && d.liTurnHistory[d.liTurnHistory.length - 1];
    return last && last.liDialogue === expected;
  }, REAL_LI_DIALOGUE_FROM_LOG, { timeout: 10000 }).catch(() => {});
  const turnState = await page.evaluate(() => {
    const d = window.state.intimacyDialogue;
    const last = (d.liTurnHistory || [])[d.liTurnHistory.length - 1];
    return { liReply: last && last.liDialogue };
  });
  ok('the replayed real reply EXACTLY matches the original persisted response (byte-for-byte, no re-generation)', turnState.liReply === REAL_LI_DIALOGUE_FROM_LOG, JSON.stringify(turnState));

  section('3. REPLAYED FATE-CARD BATCH — real Boundary card genuinely selectable');
  await page.evaluate(() => { window._resolveIntimacyScene('user_pivot_end'); });
  await page.waitForFunction(() => !!document.querySelector('#gnCardMount [data-fate-card-slot="boundary"]'), { timeout: 10000 }).catch(() => {});
  const boundarySlotExists = await page.evaluate(() => !!document.querySelector('#gnCardMount [data-fate-card-slot="boundary"]'));
  ok('the Boundary card slot rendered from the replayed real Fate-Card response', boundarySlotExists);

  section('4. SUBMIT — scaffold suppression holds under the REAL app code path (not just the isolated function check above)');
  if (boundarySlotExists) {
    await page.click('#gnCardMount [data-fate-card-slot="boundary"]');
    structuralPhaseStarted = true;
    await page.click('#gnSubmitBtn');
    await page.waitForTimeout(3000); // let the structural phase's stubbed calls settle
    const scaffoldShapedCall = structuralCalls.find((c) => c.maxTokens === 2000);
    ok('NO scaffold-shaped call (max_tokens: 2000) fired during the real Submit flow — the seeded state.cgScaffold genuinely suppressed regeneration end-to-end', !scaffoldShapedCall, JSON.stringify(structuralCalls));
    console.log('  · structural calls observed after Submit: ' + JSON.stringify(structuralCalls));
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('SCENE 2 REPAIR REPLAY MECHANICS CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
