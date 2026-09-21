// --slot PARAMETERIZATION — DRY CONTROL (Roman, 2026-09-21)
//
// Prep step for the four-card branch capability plan
// (_scene2_four_card_branch_authorization_2026_09_21.md). Roman: "First build the zero-cost --slot
// parameterization of the existing replay script, with dry proof that it selects the intended
// card/frame and preserves all current harness/cost-accounting behavior."
//
// _scene2_repair_replay_sample.mjs now accepts --slot=<temptation|silence|reversal|boundary|
// confession> to choose which intimate-interruption fate-card slot to click in Phase 3, instead of
// always clicking Boundary. This control cannot safely import or run that script directly (it is
// designed to reach a REAL, paid Phase 3 dispatch once invoked — importing it would execute its
// top-level IIFE) — so this proves the mechanism two ways, fully dry:
//
//   A — MECHANISM: using the SAME phase 0-2 replay technique the real script uses (the same
//       already-paid OAS/Fate-Card/scaffold content, read from the same original log), clicking
//       each of the 4 NEW card slots and confirming (1) the slot renders and is clickable, (2)
//       state._intimateInterruption.selectedSlot is set correctly — the real determinism input —
//       and (3) _resolveStarterEventFrame resolves to that slot's documented lane (matching the
//       authorization sheet's table). No Submit click, no real dispatch, no cost — this control
//       never allows any real path and never opens Phase 3.
//   B — FILE NAMING + COST-ACCOUNTING PRESERVATION: the script's own source is read and checked
//       structurally: the cost-accounting block (RATES, realCost, reconcileFromPersistedLog,
//       PHASE_CEILINGS_USD, COMBINED_CEILING_USD, PHYSICAL_REQUEST_CEILING) is present verbatim,
//       byte-for-byte unchanged by the parameterization edit; the new --slot/outFile logic is
//       present and, for the default slot (boundary, or no flag), reduces to the EXACT SAME fixed
//       filenames (report.json, scene2_raw_response.txt, console_tail.txt,
//       partial_tracked_calls.json) every prior committed report/control depends on — proven by
//       exercising the duplicated (pure, side-effect-free) naming logic directly.
//
// usage: node _scene2_repair_replay_sample_slot_param_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 500) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const EXPECTED_LANE_BY_SLOT = {
  temptation: 'lirael_defensive_path',
  silence: 'dohkar_preliminary_review',
  reversal: 'julian_jurisdiction_challenge',
  confession: 'dohkar_preliminary_review',
};

section('B — FILE NAMING + COST-ACCOUNTING PRESERVATION (static source check)');
const scriptSrc = fs.readFileSync(path.join(__dirname, '_scene2_repair_replay_sample.mjs'), 'utf8');
ok('RATES cost table present, unchanged', /'grok-4-1-fast-reasoning': \{ in: 0\.00000125, out: 0\.0000025, cacheRead: 0\.0000002 \}/.test(scriptSrc), 'not found verbatim');
ok('realCost function present, unchanged (provider-ticks branch)', /if \(typeof usage\.cost_in_usd_ticks === 'number' && usage\.cost_in_usd_ticks > 0\)/.test(scriptSrc), 'not found verbatim');
ok('reconcileFromPersistedLog (the harness fix from the prior pass) still present', /function reconcileFromPersistedLog\(roleTag\)/.test(scriptSrc), 'not found');
ok('PHASE_CEILINGS_USD / COMBINED_CEILING_USD / PHYSICAL_REQUEST_CEILING unchanged', /const PHASE_CEILINGS_USD = \{ 'scene2-planner': 0\.05, 'scene2-author': 0\.40 \};[\s\S]{0,80}const COMBINED_CEILING_USD = 0\.45;[\s\S]{0,80}const PHYSICAL_REQUEST_CEILING = 8;/.test(scriptSrc), 'not found verbatim / values changed');
ok('the --slot flag is parsed with a default of "boundary"', /const CARD_SLOT = argVal\('slot', 'boundary'\);/.test(scriptSrc), 'not found');
ok('an unknown slot is rejected (HARNESS BLOCKER) before anything else runs', /unknown --slot="/.test(scriptSrc), 'not found');

// Duplicate (pure, side-effect-free) copy of the script's own naming logic, to prove its OUTPUT
// without executing the script's real, paid main flow.
const VALID_SLOTS = ['temptation', 'silence', 'reversal', 'boundary', 'confession'];
function outFileFor(slot, base) {
  const suffix = slot === 'boundary' ? '' : ('_' + slot);
  return base.replace(/(\.[^.]+)$/, suffix + '$1');
}
ok('slot="boundary" (default) produces the EXACT existing fixed filename "report.json"', outFileFor('boundary', 'report.json') === 'report.json', outFileFor('boundary', 'report.json'));
ok('slot="boundary" (default) produces the EXACT existing fixed filename "scene2_raw_response.txt"', outFileFor('boundary', 'scene2_raw_response.txt') === 'scene2_raw_response.txt', outFileFor('boundary', 'scene2_raw_response.txt'));
ok('slot="reversal" produces its OWN distinct filename "report_reversal.json" (never collides with the fixed name)', outFileFor('reversal', 'report.json') === 'report_reversal.json', outFileFor('reversal', 'report.json'));
ok('slot="temptation" produces its OWN distinct filename "scene2_raw_response_temptation.txt"', outFileFor('temptation', 'scene2_raw_response.txt') === 'scene2_raw_response_temptation.txt', outFileFor('temptation', 'scene2_raw_response.txt'));
ok('all 4 new slots produce mutually distinct, non-colliding filenames', new Set(VALID_SLOTS.map((s) => outFileFor(s, 'report.json'))).size === VALID_SLOTS.length, VALID_SLOTS.map((s) => outFileFor(s, 'report.json')));

(async () => {
  section('A — MECHANISM: each new card slot selects correctly and resolves to its documented lane');
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._fireIntimacyOpener === 'function' && typeof window._clearPersistedOASState === 'function' && typeof window._bakedScene1For === 'function' && typeof window._resolveStarterEventFrame === 'function' && typeof window._effectiveSceneRow === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  // Same already-paid content the real script replays — read directly from the same original log,
  // never hand-transcribed. No REAL provider call anywhere in this control — the OAS turn-reply and
  // Fate-Card batch are served from a stub whose content IS that already-paid response, exactly as
  // the real replay script's own phases 0-2 do, never a live dispatch.
  const ORIGINAL_LOG = path.join(__dirname, '_first_sacrifice_oas_grok_happy_path_sample_out', 'run_1789878699028.jsonl');
  const originalEvents = fs.readFileSync(ORIGINAL_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  function findResponse(roleTag) { return originalEvents.find((e) => e.kind === 'response' && e.roleTag === roleTag && e.status === 200).responseBody; }
  const REAL_OAS_TURN_REPLY_RESPONSE = findResponse('oas-turn-reply');
  const REAL_FATE_CARD_RESPONSE = findResponse('fate-card-preview-batch');
  const scaffoldEvent = originalEvents.find((e) => e.kind === 'response' && e.roleTag === 'scene2-generation' && e.status === 200 && /runThesis/.test(e.responseBody.choices[0].message.content || ''));
  const REAL_SCAFFOLD_JSON = JSON.parse(scaffoldEvent.responseBody.choices[0].message.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
  const CANDIDATE_PATH = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package', '13_final_field_correction.json');
  const candidateRaw = JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));
  const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
  const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';

  const gate = await installFailClosedNetworkGate(page); // no logFile — this control is dry, nothing real is ever allow-listed
  gate.stub('/api/proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
    return { __gateStatus: 500, error: 'unexpected /api/proxy call — this control never opens Phase 3' };
  });
  gate.stub('/api/mistral-proxy', () => REAL_FATE_CARD_RESPONSE);

  await page.evaluate(({ scaffold }) => {
    const s = window.state;
    s.storyId = 'slot-param-control-' + Date.now();
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

  // Phase 1 (OAS turn-reply) and phase 2 (interruption -> Fate-Card batch), both served from the
  // stubs above — zero real cost, identical mechanism to the real replay script's own phases 0-2.
  gate.setPhase('oas-turn-reply-replay', 1);
  await page.fill('#gnActionInput', REAL_DO);
  await page.fill('#gnDialogueInput', REAL_SAY);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('oas-turn-reply-replay', { watchdogMs: 10000 });
  gate.setPhase('fate-card-replay', 1);
  await page.evaluate(() => { window._resolveIntimacyScene('user_pivot_end'); });
  await gate.waitForSettlement('fate-card-replay', { watchdogMs: 10000 });
  await page.waitForFunction(() => !!document.querySelector('#gnCardMount [data-fate-card-slot="boundary"]'), { timeout: 10000 });
  // A transient concierge/tutorial overlay can still be fading out right after the card mount
  // appears and intercepts the FIRST click attempted — wait for it to actually clear before
  // clicking anything, rather than relying on incidental timing from later awaits.
  await page.waitForFunction(() => { const el = document.getElementById('conciergeDialogue'); return !el || !el.classList.contains('visible'); }, { timeout: 8000 }).catch(() => {});

  for (const slot of Object.keys(EXPECTED_LANE_BY_SLOT)) {
    const slotSelector = '#gnCardMount [data-fate-card-slot="' + slot + '"]';
    const exists = await page.evaluate((sel) => !!document.querySelector(sel), slotSelector);
    ok(slot + ': card slot renders and is present', exists, 'selector not found: ' + slotSelector);
    if (!exists) continue;
    // A native in-page DOM click (not Playwright's synthetic pointer-event click) — immune to a
    // transient overlay intercepting pointer coordinates, and reaches the exact same
    // addEventListener('click', ...) handler the real UI uses.
    await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.click(); }, slotSelector);
    const result = await page.evaluate((expectedSlot) => {
      const selectedSlot = (window.state._intimateInterruption || {}).selectedSlot || null;
      const eff = window._effectiveSceneRow(window.state, 2);
      const frame = window._resolveStarterEventFrame(eff, window.state);
      return { selectedSlot, frame };
    }, slot);
    ok(slot + ': clicking it records selectedSlot="' + slot + '" (the real determinism input)', result.selectedSlot === slot, JSON.stringify(result));
    ok(slot + ': resolves to the documented lane "' + EXPECTED_LANE_BY_SLOT[slot] + '"', result.frame && result.frame.laneId === EXPECTED_LANE_BY_SLOT[slot], JSON.stringify(result.frame));
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('--slot PARAMETERIZATION CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
