// LIVE HANDOFF DIRECTIVE — DRY CONTROL (Roman, 2026-09-22)
//
// Roman: "This is a concrete handoff bug worth fixing now... Give the continuation author an
// ordered account of the completed OAS exchange and the final submitted Say/Do, including its
// selected posture. Use the existing persisted OAS snapshots and committed submission records.
// Preserve exact player wording and distinguish earlier actions from the latest submission; a card
// preview or click must not replace interaction history or become a committed action before
// Submit. Carry the accepted planner's relevant posture interpretation into author context as
// interpretation, subordinate to the actual player input and canon... Apply this through shared
// continuation context for literary and CG wherever applicable. Trace both real paths rather than
// adding another isolated First Sacrifice directive."
//
// Implemented: public/app.js gains _buildLiveHandoffDirective(s), called from
// _buildContinuitySpineBlock — the ONE builder every real author path already calls (traced: CG
// ~line 223287, literary continuation ~line 309512 and ~line 314284). Three sources, all
// already-existing and durable: state._oasSceneSnapshots (the completed OAS exchange),
// the scene ledger's most recent `oas_interrupt` entry (the final committed submission +
// posture — written ONLY by _commitIntimateInterruption, which fires ONLY on Submit), and
// state._sceneObjectives[<latest>].posture_read / .stateChange.lanePostureModulation (the
// accepted planner's own interpretation, carried last and explicitly subordinate).
//
// Proves, fully dry (no provider calls beyond REAL, already-paid content replayed from a
// persisted log — the SAME technique every control this session uses; no NEW paid calls; no
// candidate prose edits):
//   A. RETAINED REAL INPUT, IN ORDER — Temptation's actual gaze/hands-folded OAS exchange,
//      Julian's real response to it, and the final (unedited) card submission with its posture
//      all reach _buildContinuitySpineBlock's output, in the correct chronological order.
//   B. EDITED CARD TEXT — editing a card's pre-filled text before Submit produces the EDITED
//      words in the handoff block, never the card's original suggested text.
//   C. CUSTOM SAY/DO (no card selected) — a plain typed submission with no fate-card chosen still
//      produces a correct handoff block; posture is omitted gracefully, never fabricated.
//   D. SAVE/RELOAD PRESERVATION — serializing state to JSON (the app's own save shape) and
//      reloading it into a fresh state object still produces the correct handoff block.
//   E. INTERPRETATION IS SUBORDINATE — the planner's posture reading is labeled as
//      interpretation, positioned LAST, and never mistaken for the player's own words.
//   F. NO PREMATURE COMMIT — a card CLICK alone (before Submit) does not appear as the final
//      submission; the in-progress draft never leaks into the handoff block ahead of a real Submit.
//   G. SHARED PATH, NOT ISOLATED — the SAME window._buildContinuitySpineBlock is the function
//      both the CG and literary author prompt-builders call (traced directly in source, not
//      reimplemented per engine).
//
// usage: node _scene2_live_handoff_directive_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 900) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── Real, already-paid fixtures reused throughout this session's dry controls ──
const ORIGINAL_LOG = path.join(__dirname, '_first_sacrifice_oas_grok_happy_path_sample_out', 'run_1789878699028.jsonl');
const originalEvents = fs.readFileSync(ORIGINAL_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
function findResponse(roleTag) { return originalEvents.find((e) => e.kind === 'response' && e.roleTag === roleTag && e.status === 200).responseBody; }
const REAL_OAS_TURN_REPLY_RESPONSE = findResponse('oas-turn-reply');
const REAL_FATE_CARD_RESPONSE = findResponse('fate-card-preview-batch');
const scaffoldEvent = originalEvents.find((e) => e.kind === 'response' && e.roleTag === 'scene2-generation' && e.status === 200 && /runThesis/.test(e.responseBody.choices[0].message.content || ''));
const REAL_SCAFFOLD_JSON = JSON.parse(scaffoldEvent.responseBody.choices[0].message.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';
console.log('✓ loaded real, already-paid OAS turn-reply/Fate-Card batch/scaffold from ' + ORIGINAL_LOG);

// Temptation attempt 4's REAL planner JSON (posture_read/lane_posture_modulation both reference
// the gaze) — reused as a STUBBED planner response so this control can exercise the real planner
// processing pipeline (which populates state._sceneObjectives) without any new paid call.
const TEMPT4_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1790040773323.jsonl');
const tempt4Events = fs.readFileSync(TEMPT4_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const tempt4PlannerResp = tempt4Events.find((e) => e.kind === 'response' && e.real === true && e.responseBody && e.responseBody.usage && e.responseBody.usage.total_tokens === 7754);
const tempt4PlannerRaw = tempt4PlannerResp.responseBody.choices[0].message.content;
const tempt4PlannerFenced = tempt4PlannerRaw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
const TEMPT4_PLANNER_JSON = JSON.parse(tempt4PlannerFenced ? tempt4PlannerFenced[1] : tempt4PlannerRaw);
console.log('✓ loaded Temptation attempt 4\'s REAL planner JSON verbatim from ' + TEMPT4_LOG);
console.log('  real posture_read: "' + TEMPT4_PLANNER_JSON.posture_read + '"');

async function setupSession(label) {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_scene2_live_handoff_directive_control_out.jsonl') });
  // CAPTURE THE ACTUAL DISPATCHED REQUEST BODIES (Roman 2026-09-22): "Source wiring and
  // helper-output checks alone don't establish that the full requests contain the material."
  // Every planner (max_tokens 1200) and author (max_tokens 8000) request this session makes is
  // pushed here, verbatim, BEFORE the stub returns a canned reply — so later sections can assert
  // on the REAL serialized prompt text the real dispatch code built, not just on what
  // _buildContinuitySpineBlock/_buildLiveHandoffDirective return when called directly.
  const capturedRequests = { planner: [], author: [] };
  gate.stub('/api/proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
    if (body.max_tokens === 1200) { capturedRequests.planner.push(body); return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(TEMPT4_PLANNER_JSON) } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }; }
    // The author call (max_tokens 8000) is now CAPTURED (not just passed through) so its full
    // request body can be asserted on directly. Never reached with a REAL dispatch (gate stays
    // stub-only throughout — allowRealPaths is never called with a real path in this control).
    if (body.max_tokens === 8000) { capturedRequests.author.push(body); return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: JSON.stringify({ visualState: {}, phases: [], panels: [], beats: [] }) } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }; }
    // TRUE catch-all — matches the proven harness's own philosophy (_scene2_repair_replay_sample.mjs:
    // "unexpected /api/proxy call during the stubbed replay phase") — deliberately a FAILURE, not a
    // fake success. Real finding this fixes: the fate-card-batch generation tries Grok (this
    // endpoint) as its FIRST tier; a fake 200 success here (an earlier draft of this control) let
    // that attempt "succeed" with unrelated content, which never parses into 5 cards, and — because
    // it looked successful — never triggers the tiered system's fallback to ministral, where the
    // REAL fate-card content actually lives (stubbed below). Failing this closed forces the SAME
    // fallback path a real run takes when Grok is unavailable/misconfigured for this call.
    return { __gateStatus: 500, error: 'unexpected /api/proxy call during the stubbed replay phase in this control' };
  });
  gate.stub('/api/mistral-proxy', () => {
    // The proven harness (_scene2_repair_replay_sample.mjs) stubs this endpoint UNCONDITIONALLY
    // with the real fate-card batch — confirmed reliable across all four real Temptation attempts.
    // Real finding while building this control: an earlier draft tried to exclude one OTHER real
    // call this flow makes on the same endpoint (an OAS-continuation dialogue call) by sniffing its
    // system prompt — but that call's own prompt ALSO happened to match the sniffed phrase,
    // wrongly diverting the REAL fate-card request too. Matching the proven harness exactly
    // (unconditional) is both simpler and correct: nothing this control asserts on depends on that
    // other call's actual output, so it receiving fate-card-shaped content instead is harmless.
    return REAL_FATE_CARD_RESPONSE;
  });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._bakedScene1For === 'function' && typeof window._buildContinuitySpineBlock === 'function' && typeof window._buildLiveHandoffDirective === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER (' + label + '): app not ready or new functions not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });

  await page.evaluate(({ scaffold, storyId }) => {
    const s = window.state;
    s.storyId = storyId;
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
  }, { scaffold: REAL_SCAFFOLD_JSON, storyId: 'live-handoff-control-' + label + '-' + Date.now() });

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

  return { browser, page, gate, capturedRequests };
}

// Format a request body's messages the way the various providers accept them (array of
// {role, content} or a single string prompt) into ONE searchable string, so assertions can check
// substring containment without caring which shape a given call used.
function _flattenRequestText(body) {
  if (!body) return '';
  const parts = [];
  if (Array.isArray(body.messages)) body.messages.forEach((m) => { if (m && typeof m.content === 'string') parts.push(m.content); });
  if (typeof body.prompt === 'string') parts.push(body.prompt);
  if (typeof body.system === 'string') parts.push(body.system);
  return parts.join('\n');
}

// Real finding while extending this control (2026-09-22): once the REAL author call resolves,
// the app immediately fires its own panel-image-generation pipeline (/api/image, /api/bfl-kontext
// — neither stubbed nor needed by this control's own assertions), which retries aggressively
// against this control's fail-closed gate and can run for a long time inside the page, consuming
// memory well past the point this control has everything it needs. Fix: poll the ALREADY-CAPTURED
// request (populated synchronously inside the /api/proxy stub, the instant the real fetch lands —
// no gate phase-settlement wait required) and close the browser the moment it's present, rather
// than waiting out a quiet-period settle that only covers text calls while the image storm keeps
// the page alive underneath it regardless.
async function waitForCapturedAuthorRequest(capturedRequests, timeoutMs) {
  const t0 = Date.now();
  while (capturedRequests.author.length === 0 && Date.now() - t0 < timeoutMs) {
    await new Promise((r) => setTimeout(r, 250));
  }
  return capturedRequests.author.length > 0;
}

async function driveOASTurnAndInterruption(page, gate, { say, doText }) {
  gate.setPhase('oas-turn-reply-replay', 5);
  await page.fill('#gnActionInput', doText);
  await page.fill('#gnDialogueInput', say);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('oas-turn-reply-replay', { watchdogMs: 10000 });

  gate.setPhase('fate-card-replay', 5);
  await page.evaluate(() => { window._resolveIntimacyScene('user_pivot_end'); });
  await gate.waitForSettlement('fate-card-replay', { watchdogMs: 10000 });
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
section('A. RETAINED REAL INPUT, IN ORDER — Temptation\'s real gaze/hands exchange, Julian\'s real response, and the final (unedited) card submission');
{
  const { browser, page, gate, capturedRequests } = await setupSession('A');
  await driveOASTurnAndInterruption(page, gate, { say: REAL_SAY, doText: REAL_DO });

  const slotSelector = '#gnCardMount [data-fate-card-slot="temptation"]';
  const slotExists = await page.evaluate((sel) => !!document.querySelector(sel), slotSelector);
  if (!slotExists) { console.error('HARNESS BLOCKER: temptation card slot did not render.'); await browser.close(); process.exit(2); }
  await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.click(); }, slotSelector);
  await new Promise((r) => setTimeout(r, 300));

  // Submit the (unedited) card default — matching Temptation attempt 4's real behavior exactly.
  gate.setPhase('planner-replay', 5);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('planner-replay', { watchdogMs: 10000 }).catch(() => {});
  // The planner's acceptance chains directly into the CG author call (the SAME continuation
  // pipeline Submit kicks off). Poll the capture directly (see waitForCapturedAuthorRequest above)
  // rather than a gate quiet-period wait, so this section moves on the instant it has what it
  // needs instead of staying open through the unrelated post-author image-generation pipeline.
  const gotAuthor = await waitForCapturedAuthorRequest(capturedRequests, 20000);
  if (!gotAuthor) console.warn('[CONTROL] REAL author request (max_tokens 8000) never arrived within 20s — proceeding, assertions below will fail visibly.');

  const snap = await page.evaluate(() => {
    const s = window.state;
    return {
      block: window._buildContinuitySpineBlock(s),
      handoffOnly: window._buildLiveHandoffDirective(s),
      hasOasSnapshot: !!(s._oasSceneSnapshots && Object.keys(s._oasSceneSnapshots).length),
      ledgerHasInterrupt: !!(s._sceneLedger && s._sceneLedger.entries && s._sceneLedger.entries.some((e) => e.kind === 'oas_interrupt')),
      hasSceneObjective: !!(s._sceneObjectives && Object.keys(s._sceneObjectives).length),
    };
  });

  ok('state._oasSceneSnapshots was populated (the durable source _resolveIntimacyScene writes)', snap.hasOasSnapshot, JSON.stringify(snap));
  ok('the scene ledger has a committed oas_interrupt entry', snap.ledgerHasInterrupt, JSON.stringify(snap));
  ok('state._sceneObjectives was populated (the planner\'s accepted objective, via the stubbed real planner JSON)', snap.hasSceneObjective, JSON.stringify(snap));

  const block = snap.block || '';
  ok('the block contains the LIVE HANDOFF header', /LIVE HANDOFF, IN ORDER/.test(block), block.slice(0, 300));
  ok('section 1 (earlier exchange) contains the player\'s real gaze/hands wording, VERBATIM', block.includes('I keep my hands folded at my waist and meet his eyes'), block);
  ok('section 1 contains Julian\'s REAL response to it (the OAS turn-reply)', block.includes('The hunger in your gaze called louder than the rite itself'), block);
  ok('section 2 (final submission) contains the real card text', block.includes('Let the wind of your breath unravel me'), block);
  ok('section 2 names the posture label "Temptation"', /answered from a posture of Temptation/.test(block), block);
  ok('section 3 (interpretation) contains the planner\'s real posture_read, mentioning Julian\'s gaze', block.includes(TEMPT4_PLANNER_JSON.posture_read), block);

  const idx1 = block.indexOf('1. EARLIER IN THIS LIVE EXCHANGE');
  const idx2 = block.indexOf('2. THE READER\'S FINAL SUBMITTED SAY/DO');
  const idx3 = block.indexOf('3. THE PLANNER\'S POSTURE READING');
  ok('the three sections appear in the correct chronological order (earlier exchange -> final submission -> interpretation)', idx1 >= 0 && idx2 > idx1 && idx3 > idx2, JSON.stringify({ idx1, idx2, idx3 }));
  ok('section 3 is explicitly labeled as interpretation, subordinate — never presented as fact', /interpretation only/.test(block) && /subordinate to the reader.s own words/.test(block), block);

  // ── ACTUAL DISPATCHED REQUEST BODIES (Roman 2026-09-22): "Source wiring and helper-output
  // checks alone don't establish that the full requests contain the material." Everything above
  // asserts on what _buildContinuitySpineBlock/_buildLiveHandoffDirective RETURN when called
  // directly. These assertions instead inspect the REAL serialized request bodies this session's
  // REAL planner (max_tokens 1200, _callTieredProvider('scenePlanner', ...)) and REAL author
  // (max_tokens 8000, _authorFullScenePolicy) calls actually dispatched to /api/proxy — captured
  // by the stub itself, before it answers, so nothing here is reconstructed or assumed.
  ok('a REAL planner request (max_tokens 1200) was actually dispatched and captured', capturedRequests.planner.length >= 1, 'captured ' + capturedRequests.planner.length);
  ok('a REAL author request (max_tokens 8000) was actually dispatched and captured', capturedRequests.author.length >= 1, 'captured ' + capturedRequests.author.length);
  if (capturedRequests.planner.length && capturedRequests.author.length) {
    const plannerText = _flattenRequestText(capturedRequests.planner[capturedRequests.planner.length - 1]);
    const authorText = _flattenRequestText(capturedRequests.author[capturedRequests.author.length - 1]);
    // THE DISCLOSED GAP THIS CORRECTION CLOSES: the planner's own "RECENT OAS EXCHANGE" block
    // used to read pcSay/pcDo (transmuted). It must now match the author's raw wording exactly —
    // proven here by requiring the SAME raw substring in BOTH real requests, not just checking
    // each in isolation (which could pass even if the two sides diverged on different text).
    ok('the REAL planner request body contains the player\'s raw gaze/hands wording (not the transmuted re-expression)', plannerText.includes('I keep my hands folded at my waist and meet his eyes'), plannerText.slice(0, 4000));
    ok('the REAL author request body ALSO contains the SAME raw player wording, verbatim', authorText.includes('I keep my hands folded at my waist and meet his eyes'), authorText.slice(0, 4000));
    ok('the REAL author request body contains Julian\'s real OAS response', authorText.includes('The hunger in your gaze called louder than the rite itself'), authorText.slice(0, 4000));
    ok('the REAL author request body contains the final committed card submission text', authorText.includes('Let the wind of your breath unravel me'), authorText.slice(0, 4000));
    ok('the REAL author request body names the Temptation posture', /Temptation/.test(authorText), authorText.slice(0, 4000));
    // Scoped to the LIVE HANDOFF section specifically, not the whole request text. Real finding
    // while extending this control: the STORY LEDGER (a SEPARATE, earlier section of the same
    // prompt — the budget-managed history of committed past pages) legitimately restates the
    // final submission's own text too (by design, documented in this control's own trace doc:
    // "the SAME entry _buildContinuitySpineBlock's own STORY LEDGER already renders... restated
    // here unconditionally"). A plain indexOf/indexOf comparison over the FULL request text picks
    // up that EARLIER, legitimate ledger occurrence for "final submission" instead of the
    // handoff's own section 2 — a test-scoping bug, not a production one. Scoping to the handoff
    // header onward (uniquely present, appended after the ledger) fixes it without weakening what
    // the assertion actually proves.
    const handoffStart = authorText.indexOf('LIVE HANDOFF, IN ORDER');
    ok('the REAL author request body contains the LIVE HANDOFF section at all', handoffStart >= 0, authorText.slice(0, 2000));
    const handoffText = handoffStart >= 0 ? authorText.slice(handoffStart) : '';
    const aIdxExch = handoffText.indexOf('I keep my hands folded at my waist and meet his eyes');
    const aIdxFinal = handoffText.indexOf('Let the wind of your breath unravel me');
    ok('within the LIVE HANDOFF section of the REAL author request body, the earlier exchange appears BEFORE the final submission, in order', aIdxExch >= 0 && aIdxFinal > aIdxExch, JSON.stringify({ aIdxExch, aIdxFinal }) + '\n' + handoffText.slice(0, 2000));
  }

  await browser.close();
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
section('B. EDITED CARD TEXT — editing the pre-filled card text before Submit produces the EDITED words, not the card\'s default');
{
  const { browser, page, gate } = await setupSession('B');
  await driveOASTurnAndInterruption(page, gate, { say: REAL_SAY, doText: REAL_DO });

  const slotSelector = '#gnCardMount [data-fate-card-slot="temptation"]';
  await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.click(); }, slotSelector);

  const EDITED_DIALOGUE = 'No — I will not let the wind speak for me. I choose my own silence, on my own terms.';
  await page.fill('#gnDialogueInput', EDITED_DIALOGUE);

  gate.setPhase('planner-replay-b', 5);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('planner-replay-b', { watchdogMs: 10000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 500));

  const block = await page.evaluate(() => window._buildContinuitySpineBlock(window.state));
  ok('the handoff block contains the EDITED dialogue', block.includes(EDITED_DIALOGUE), block);
  ok('the handoff block does NOT contain the card\'s original, un-edited default text', !block.includes('Let the wind of your breath unravel me'), block);
  ok('the posture label is STILL correctly recorded as Temptation (editing the text does not lose which card was chosen)', /answered from a posture of Temptation/.test(block), block);

  await browser.close();
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
section('C. CUSTOM SAY/DO (no card selected) — a plain typed submission with no fate-card chosen still produces a correct handoff, posture omitted gracefully');
{
  const { browser, page, gate } = await setupSession('C');
  await driveOASTurnAndInterruption(page, gate, { say: REAL_SAY, doText: REAL_DO });

  const CUSTOM_ACTION = 'I turn away from the cards entirely and address the Dohkar directly.';
  const CUSTOM_DIALOGUE = 'This is not a game of Fate. Ask me plainly, or do not ask at all.';
  await page.fill('#gnActionInput', CUSTOM_ACTION);
  await page.fill('#gnDialogueInput', CUSTOM_DIALOGUE);

  gate.setPhase('planner-replay-c', 5);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('planner-replay-c', { watchdogMs: 10000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 500));

  const snap = await page.evaluate(() => ({ block: window._buildContinuitySpineBlock(window.state), selectedSlot: window.state._intimateInterruption ? window.state._intimateInterruption.selectedSlot : undefined }));
  ok('no card slot was ever selected (selectedSlot stays null/undefined)', !snap.selectedSlot, JSON.stringify(snap.selectedSlot));
  ok('the handoff block contains the custom action/dialogue, verbatim', snap.block.includes(CUSTOM_ACTION) && snap.block.includes(CUSTOM_DIALOGUE), snap.block);
  ok('no fabricated posture label is invented for a custom (no-card) submission', !/answered from a posture of/.test(snap.block), snap.block);
  ok('the earlier OAS exchange is STILL present (unaffected by whether the final submission used a card)', snap.block.includes('I keep my hands folded at my waist and meet his eyes'), snap.block);

  await browser.close();
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
section('D. SAVE/RELOAD PRESERVATION — serializing state to JSON and reloading it still produces the correct handoff block');
{
  const { browser, page, gate } = await setupSession('D');
  await driveOASTurnAndInterruption(page, gate, { say: REAL_SAY, doText: REAL_DO });
  const slotSelector = '#gnCardMount [data-fate-card-slot="temptation"]';
  await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.click(); }, slotSelector);
  gate.setPhase('planner-replay-d', 5);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('planner-replay-d', { watchdogMs: 10000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 500));

  const beforeBlock = await page.evaluate(() => window._buildContinuitySpineBlock(window.state));

  // Simulate save -> reload: JSON round-trip the whole state object (the app's own save shape is
  // a JSON serialization of `state`), then rebuild the handoff block from the ROUND-TRIPPED copy —
  // never from the live in-memory object — proving the data survives serialization, not just
  // in-memory continuity.
  const afterBlock = await page.evaluate(() => {
    const reloaded = JSON.parse(JSON.stringify(window.state));
    return window._buildContinuitySpineBlock(reloaded);
  });

  ok('the handoff block is IDENTICAL before and after a JSON save/reload round-trip', beforeBlock === afterBlock, JSON.stringify({ beforeLen: beforeBlock.length, afterLen: afterBlock.length, sameContent: beforeBlock === afterBlock }));
  ok('the reloaded block still contains the earlier OAS exchange', afterBlock.includes('I keep my hands folded at my waist and meet his eyes'), afterBlock);
  ok('the reloaded block still contains the final submission + posture', afterBlock.includes('Let the wind of your breath unravel me') && /answered from a posture of Temptation/.test(afterBlock), afterBlock);
  ok('the reloaded block still contains the planner\'s interpretation', afterBlock.includes(TEMPT4_PLANNER_JSON.posture_read), afterBlock);

  await browser.close();
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
section('F. NO PREMATURE COMMIT — a card CLICK alone (before Submit) must not appear as the final submission');
{
  const { browser, page, gate } = await setupSession('F');
  await driveOASTurnAndInterruption(page, gate, { say: REAL_SAY, doText: REAL_DO });
  const slotSelector = '#gnCardMount [data-fate-card-slot="temptation"]';
  await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.click(); }, slotSelector);
  // Deliberately do NOT click Submit. Inspect the handoff block right after the click alone.
  const block = await page.evaluate(() => window._buildContinuitySpineBlock(window.state));
  ok('a card CLICK alone (no Submit) produces NO section-2 final-submission text at all — the ledger only gets an entry at commit, and a click never commits', !/2\. THE READER.S FINAL SUBMITTED SAY\/DO/.test(block), block);
  ok('the card\'s pre-filled draft text does not leak into the handoff block as if it were submitted', !block.includes('Let the wind of your breath unravel me'), block);
  const stillPending = await page.evaluate(() => { const r = window.state._intimateInterruption; return !!(r && !r.submitted); });
  ok('the interruption record itself confirms it is NOT YET submitted (click != commit)', stillPending, 'was already submitted');
  await browser.close();
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
section('G. SHARED PATH, NOT ISOLATED — the SAME function both real author paths call, and the SAME extraction the planner and author both read');
{
  const cgCallSite = fs.readFileSync(path.join(__dirname, 'public', 'app.js'), 'utf8');
  const cgMatch = /_continuitySpineBlock = window\._buildContinuitySpineBlock\(window\.state\)/.test(cgCallSite);
  const literaryMatches = (cgCallSite.match(/\$\{_buildContinuitySpineBlock\(state\)\}/g) || []).length + (cgCallSite.match(/\+ _buildContinuitySpineBlock\(state\) \+/g) || []).length;
  ok('the CG author prompt-builder calls _buildContinuitySpineBlock directly (source-traced)', cgMatch, 'not found');
  ok('the literary author prompt-builder(s) also call _buildContinuitySpineBlock directly (source-traced, at least one real call site)', literaryMatches >= 1, 'literary call sites found: ' + literaryMatches);
  ok('_buildLiveHandoffDirective is called FROM WITHIN _buildContinuitySpineBlock itself (one insertion point reaches every caller, not a per-engine directive)', /out \+= handoffBlock;/.test(cgCallSite), 'not found');

  // 2026-09-22 correction — Roman: "Reuse the shared extraction logic where practical." Confirms,
  // by source, that BOTH the open-row planner's own "RECENT OAS EXCHANGE" block AND
  // _buildLiveHandoffDirective's section 1 now call the SAME _extractRecentOASExchangeLines
  // function, rather than each independently re-implementing the same read (the structural cause
  // of the disclosed wording drift this correction closes).
  const plannerCallsShared = /_liLines = _extractRecentOASExchangeLines\(window\.state, \{ limit: 3 \}\)/.test(cgCallSite);
  const authorCallsShared = /exch = _extractRecentOASExchangeLines\(s, \{ limit: 4 \}\)/.test(cgCallSite);
  const plannerNoLongerInlines = !/_oasBeats\.slice\(-3\)\.forEach/.test(cgCallSite);
  ok('the planner\'s "RECENT OAS EXCHANGE" block calls the shared _extractRecentOASExchangeLines helper (source-traced)', plannerCallsShared, 'not found');
  ok('_buildLiveHandoffDirective\'s section 1 also calls the SAME shared helper (source-traced)', authorCallsShared, 'not found');
  ok('the planner no longer has its own independent inline extraction loop (the duplicate implementation was removed, not merely supplemented)', plannerNoLongerInlines, 'the old inline loop is still present');
}

// ═══════════════════════════════════════════════════════════════════════════════════════════
section('H. SCENE SCOPING — a later scene\'s own separate OAS exchange/interruption must SUPERSEDE an earlier scene\'s, never present it as newest, never duplicate it');
{
  const { browser, page, gate } = await setupSession('H');
  await driveOASTurnAndInterruption(page, gate, { say: REAL_SAY, doText: REAL_DO });
  const slotSelector = '#gnCardMount [data-fate-card-slot="temptation"]';
  await page.evaluate((sel) => { const el = document.querySelector(sel); if (el) el.click(); }, slotSelector);
  gate.setPhase('planner-replay-h1', 5);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('planner-replay-h1', { watchdogMs: 10000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 500));

  const scene1Block = await page.evaluate(() => window._buildContinuitySpineBlock(window.state));
  ok('scene 1\'s own exchange appears in scene 1\'s own handoff block (sanity baseline before advancing)', scene1Block.includes('I keep my hands folded at my waist and meet his eyes'), scene1Block);

  // Advance into a SEPARATE, later scene with its OWN OAS exchange and its OWN committed
  // interruption. Direct state construction (not a second full live UI cycle) — what's under test
  // is the SELECTION logic over already-archived, durably-keyed data (_oasSceneSnapshots keyed by
  // scene number; the ledger's chronological oas_interrupt entries), the SAME structures a real
  // second scene produces regardless of how they got populated — matching this control's own
  // section D methodology (direct state manipulation to isolate one mechanism).
  const SCENE2_SAY = 'I will not kneel again, Julian — not even for you.';
  const SCENE2_FINAL = 'I stop at the threshold, one hand on the frame, and finally look back at him.';
  const dup = await page.evaluate(({ say2, final2 }) => {
    const s = window.state;
    const snaps = s._oasSceneSnapshots || (s._oasSceneSnapshots = {});
    const existingKeys = Object.keys(snaps).map(Number).filter((n) => !isNaN(n));
    const nextSceneNum = (existingKeys.length ? Math.max(...existingKeys) : 1) + 1;
    snaps[String(nextSceneNum)] = { liName: 'Julian', beats: [{ pcSayRaw: say2, pcDoRaw: '', pcSay: say2, pcDo: '', liDialogue: 'Then go. But know the door only opens one way tonight.' }] };
    const L = (typeof window._sceneLedgerGet === 'function') ? window._sceneLedgerGet(s, true) : null;
    if (L && Array.isArray(L.entries)) L.entries.push({ kind: 'oas_interrupt', sceneNumber: nextSceneNum, event: 'user_pivot_end', eventSource: 'interruption_submit', act: final2, dia: '', posture: 'boundary' });
    return { nextSceneNum };
  }, { say2: SCENE2_SAY, final2: SCENE2_FINAL });

  const scene2Block = await page.evaluate(() => window._buildContinuitySpineBlock(window.state));
  ok('the later scene (' + dup.nextSceneNum + ')\'s own exchange now appears', scene2Block.includes(SCENE2_SAY), scene2Block);
  ok('the later scene\'s own final submission now appears', scene2Block.includes(SCENE2_FINAL), scene2Block);
  ok('the EARLIER scene\'s exchange is superseded, not shown as the current live exchange', !scene2Block.includes('I keep my hands folded at my waist and meet his eyes'), scene2Block);

  // "NOT presented as the newest action" is a claim about the LIVE HANDOFF's own section 2
  // specifically, not the whole block. Real finding while building this section: the STORY LEDGER
  // (a SEPARATE, earlier part of the same block — the budget-managed history of committed past
  // pages, unchanged by this session's work) LEGITIMATELY still lists the earlier scene's
  // submission as PAST history — that is its job. Scoping this assertion to section 2 specifically
  // (from its own header to section 3's) proves the actual claim ("not presented as NEWEST")
  // without wrongly demanding the ledger stop doing its own, separate, correct job.
  const sec2Start = scene2Block.indexOf('2. THE READER\'S FINAL SUBMITTED SAY/DO');
  const sec3Start = scene2Block.indexOf('3. THE PLANNER\'S POSTURE READING');
  ok('the handoff\'s own section 2 header is present', sec2Start >= 0, scene2Block);
  const section2Text = (sec2Start >= 0) ? scene2Block.slice(sec2Start, sec3Start >= 0 ? sec3Start : undefined) : '';
  ok('the handoff\'s section 2 ("newest action") shows the LATER scene\'s submission', section2Text.includes(SCENE2_FINAL), section2Text);
  ok('the handoff\'s section 2 ("newest action") does NOT show the earlier scene\'s card submission — only the STORY LEDGER\'s separate history section may, and does, legitimately still list it as past history', !section2Text.includes('Let the wind of your breath unravel me'), section2Text);
  ok('the earlier scene\'s submission legitimately STILL appears elsewhere in the block, in the STORY LEDGER\'s own committed-history listing (sanity check: it was not deleted, only correctly excluded from "newest")', scene2Block.slice(0, sec2Start >= 0 ? sec2Start : undefined).includes('Let the wind of your breath unravel me'), scene2Block.slice(0, 2000));

  const firstIdx = scene2Block.indexOf(SCENE2_SAY);
  const secondIdx = scene2Block.indexOf(SCENE2_SAY, firstIdx + 1);
  ok('the later scene\'s own exchange is not duplicated within the block', firstIdx >= 0 && secondIdx === -1, JSON.stringify({ firstIdx, secondIdx }));

  await browser.close();
}

console.log('\n' + '='.repeat(100));
console.log('LIVE HANDOFF DIRECTIVE CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
try { fs.unlinkSync(path.join(__dirname, '_scene2_live_handoff_directive_control_out.jsonl')); } catch (_) {}
process.exitCode = results.every((r) => r.pass) ? 0 : 1;
