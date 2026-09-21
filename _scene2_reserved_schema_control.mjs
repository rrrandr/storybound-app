// RESERVED/AFTERMATH SCHEMA HARDENING — DRY CONTROL (Roman, 2026-09-21)
//
// Roman, after retry 9: "The important part: the planner chose the right kind of scene... The
// blocker now is not story intelligence. It's schema compliance: the planner left reserved: {}
// empty, and the older validator killed the plan before the author could run... This should be a
// prompt/schema-compliance fix, not a standards downgrade."
//
// Traced: _validateLocalObjective (public/app.js) requires, for EVERY id in eff.reserved, that
// reply.reserved[id] === 'untouched' exactly -- a missing key or any other value is rejected with
// "no status declared." Retry 9's real planner prompt asked for this in one terse clause buried
// inside a five-key run-on sentence ("reserved" (object: every RESERVED id -> "untouched" or
// "touched")), never said an empty object was invalid, and gave no worked example -- both real
// replies returned "reserved": {} instead of the four required ids.
//
// Fix: reserved/aftermath now get their OWN prompt block -- an explicit "empty object is INVALID"
// statement, the exact real ids restated, and a worked JSON example built from the SAME real ids
// (dynamic, not hardcoded). _validateLocalObjective's reject-only check itself is UNCHANGED -- this
// is a prompt fix, not a standards downgrade; an empty object is still rejected exactly as before.
//
// Proves, fully dry (no provider calls, no image calls, no prose rewrite, no forks):
//   RED x2   — retry 9's REAL two planner replies (read verbatim from its persisted log), both with
//              "reserved": {}, are both still rejected by the UNCHANGED _validateLocalObjective,
//              specifically citing all 4 real reserved ids as "no status declared" -- proves the
//              validator was not loosened.
//   GREEN    — retry 9 attempt 1's otherwise-good plan (real institutional-pressure event, real
//              scene_function_instantiated/aftermath_obligations), with ONLY the reserved/aftermath
//              keys corrected to the real required shape, is ACCEPTED by the same unchanged
//              validator -- proves the content itself was always fine; only the schema omission
//              blocked it.
//   PROMPT   — the real, live planner dispatch (same Boundary/Say-Do reproduction as every prior
//              control) now carries the new reserved/aftermath block: the "EMPTY object {} for
//              EITHER is INVALID" statement, the real ids restated, and a worked example containing
//              the real ids with "untouched"/"kept" values.
//   COEXIST  — the REQUIRED SCENE FUNCTION block, WORLD TRUTHS, RECENT OAS EXCHANGE, and IMMUTABLE
//              AFTERMATH (mouth-band) all still render correctly alongside the new block.
//
// usage: node _scene2_reserved_schema_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── Read retry 9's REAL two planner replies verbatim from its persisted log ──
const RETRY9_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789965359643.jsonl');
const retry9Events = fs.readFileSync(RETRY9_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const retry9PlannerResponses = retry9Events.filter((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.status === 200 && e.responseBody && e.responseBody.model === 'grok-4.3');
if (retry9PlannerResponses.length !== 2) { console.error('HARNESS BLOCKER: expected 2 real planner replies in retry 9\'s log, found ' + retry9PlannerResponses.length); process.exit(2); }
const RETRY9_REPLY_1 = JSON.parse(retry9PlannerResponses[0].responseBody.choices[0].message.content);
const RETRY9_REPLY_2 = JSON.parse(retry9PlannerResponses[1].responseBody.choices[0].message.content);
console.log('✓ loaded retry 9\'s real two planner replies verbatim from ' + RETRY9_LOG);
console.log('  attempt 1 reserved:', JSON.stringify(RETRY9_REPLY_1.reserved), '| attempt 2 reserved:', JSON.stringify(RETRY9_REPLY_2.reserved));

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._validateLocalObjective === 'function' && typeof window._effectiveSceneRow === 'function' && window.STARTER_PLANS && window.STARTER_PLANS.starter_first_sacrifice, { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  // Real eff object for First Sacrifice scene 2 — the SAME function production uses, not a
  // hand-built stand-in. Needs a minimal story state for _effectiveSceneRow to resolve against.
  const setupResult = await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'reserved-schema-control-' + Date.now();
    s._starterId = 'starter_first_sacrifice';
    s.picks = { identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.scenes = [{}]; // one committed scene (the fixed opening) so row 2 resolves as the next scene
    const eff = window._effectiveSceneRow(s, 2);
    return { hasEff: !!eff, reservedIds: (eff && eff.reserved || []).map((r) => r.id), aftermathIds: (eff && eff.aftermathTruths || []).map((t) => t.id) };
  });
  ok('a real eff object for First Sacrifice scene 2 resolved', setupResult.hasEff === true, JSON.stringify(setupResult));
  ok('it carries the real 4 reserved ids', setupResult.reservedIds.length === 4, JSON.stringify(setupResult.reservedIds));
  ok('it carries the real 4 aftermath truth ids', setupResult.aftermathIds.length === 4, JSON.stringify(setupResult.aftermathIds));

  section('RED — retry 9\'s real two replies (reserved: {}) are both still rejected, validator UNCHANGED');
  const red1 = await page.evaluate((reply) => {
    const eff = window._effectiveSceneRow(window.state, 2);
    return window._validateLocalObjective(reply, eff);
  }, RETRY9_REPLY_1);
  ok('attempt 1 rejected', red1.ok === false, JSON.stringify(red1));
  ok('attempt 1 cites all 4 reserved ids as the reason', ['price_identified', 'inquiry_opened', 'julian_counter_wish', 'julian_obscuring_wishes'].every((id) => red1.why.some((w) => w.indexOf(id) !== -1)), JSON.stringify(red1.why));

  const red2 = await page.evaluate((reply) => {
    const eff = window._effectiveSceneRow(window.state, 2);
    return window._validateLocalObjective(reply, eff);
  }, RETRY9_REPLY_2);
  ok('attempt 2 rejected', red2.ok === false, JSON.stringify(red2));
  ok('attempt 2 cites all 4 reserved ids as the reason', ['price_identified', 'inquiry_opened', 'julian_counter_wish', 'julian_obscuring_wishes'].every((id) => red2.why.some((w) => w.indexOf(id) !== -1)), JSON.stringify(red2.why));

  section('GREEN — attempt 1\'s real plan, with ONLY reserved/aftermath corrected, is ACCEPTED');
  const correctedReply = Object.assign({}, RETRY9_REPLY_1, {
    reserved: { price_identified: 'untouched', inquiry_opened: 'untouched', julian_counter_wish: 'untouched', julian_obscuring_wishes: 'untouched' },
  });
  const green = await page.evaluate((reply) => {
    const eff = window._effectiveSceneRow(window.state, 2);
    return window._validateLocalObjective(reply, eff);
  }, correctedReply);
  ok('the corrected plan is accepted', green.ok === true, JSON.stringify(green));
  ok('the accepted local_objective is the REAL, real-content one from attempt 1 (content unchanged, not replaced)', green.local_objective === RETRY9_REPLY_1.local_objective, green.local_objective);

  section('PROMPT + COEXIST — the real, live planner dispatch now carries the hardened reserved/aftermath block');
  const ORIGINAL_LOG = path.join(__dirname, '_first_sacrifice_oas_grok_happy_path_sample_out', 'run_1789878699028.jsonl');
  const originalEvents = fs.readFileSync(ORIGINAL_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  function findResponse(roleTag) { return originalEvents.find((e) => e.kind === 'response' && e.roleTag === roleTag && e.status === 200).responseBody; }
  const REAL_OAS_TURN_REPLY_RESPONSE = findResponse('oas-turn-reply');
  const REAL_FATE_CARD_RESPONSE = findResponse('fate-card-preview-batch');
  const scaffoldEvent = originalEvents.find((e) => e.kind === 'response' && e.roleTag === 'scene2-generation' && e.status === 200 && /runThesis/.test(e.responseBody.choices[0].message.content || ''));
  const REAL_SCAFFOLD_JSON = JSON.parse(scaffoldEvent.responseBody.choices[0].message.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
  const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
  const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';

  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_scene2_reserved_schema_control_out.jsonl') });
  gate.stub('/api/proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
    return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: '```json\n' + JSON.stringify({ title: 'stub', beats: [{ idx: 0, kind: 'narration', text: 'stub' }], sceneCharge: { stake: 'stub' } }) + '\n```' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });
  gate.stub('/api/mistral-proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.length === 2 && /Fate.Card|fate.card/i.test(JSON.stringify(body).slice(0, 200))) return REAL_FATE_CARD_RESPONSE;
    return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: 'stub' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });

  await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._bakedScene1For === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
  await page.evaluate(({ scaffold }) => {
    const s = window.state;
    s.storyId = 'reserved-schema-control-live-' + Date.now();
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

  ok('the "EMPTY object {} for EITHER is INVALID" statement is present', /EMPTY object \{\} for EITHER is INVALID/.test(sysMsg), 'not found');
  ok('the real reserved ids are restated in the schema block', ['price_identified', 'inquiry_opened', 'julian_counter_wish', 'julian_obscuring_wishes'].every((id) => sysMsg.indexOf(id) !== -1), 'not all found');
  ok('a worked JSON example containing the real ids is present', sysMsg.indexOf('"price_identified":"untouched"') !== -1 || sysMsg.indexOf('"price_identified": "untouched"') !== -1, sysMsg.slice(sysMsg.indexOf('Worked example'), sysMsg.indexOf('Worked example') + 300));
  ok('root cause C: REQUIRED SCENE FUNCTION block still present (coexist)', /REQUIRED SCENE FUNCTION \(HARD/.test(usrMsg), 'not found');
  ok('root cause C: WORLD TRUTHS still present (coexist)', /WORLD TRUTHS \(canon/.test(usrMsg), 'not found');
  ok('Finding 2: RECENT OAS EXCHANGE still present (coexist)', /RECENT OAS EXCHANGE/.test(usrMsg), 'not found');
  ok('Finding 1: IMMUTABLE AFTERMATH (mouth-band) still present (coexist)', usrMsg.includes('mouth-band torn away'), 'not found');

  await browser.close();
  try { fs.unlinkSync(path.join(__dirname, '_scene2_reserved_schema_control_out.jsonl')); } catch (_) {}

  console.log('\n' + '='.repeat(100));
  console.log('RESERVED/AFTERMATH SCHEMA HARDENING CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
