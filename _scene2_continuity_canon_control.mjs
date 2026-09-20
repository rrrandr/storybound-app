// SCENE 2 CONTINUITY + CANON — DRY CONTROL (Roman, 2026-09-20)
//
// Roman, after the retry-3 read-through: "Retry 3 is not a prose-quality near miss. It failed on
// immediate continuity and canon ingestion." Traced and fixed dry, three findings:
//   1. Scene 1's canonical end-state (mouth-band already torn away, "it happened, not re-staged"
//      obligations) exists in starter-scenes.js and DOES reach the planner in real production
//      (_hydrateBakedStoryState, called when the baked opening displays) — but the REPLAY SCRIPT
//      used for all 3 retries never called the equivalent, so retries 1-3 tested an artificially
//      impoverished prompt. Fixed: _scene2_repair_replay_sample.mjs now hydrates state._bakedEmitted.
//   2. The live OAS exchange (what was actually said in the flirty back-and-forth) never reached the
//      Scene 2 planner in EITHER the harness or real production — confirmed by direct code trace.
//      Fixed: the OPEN ROW planner prompt now includes a RECENT OAS EXCHANGE block (mirrors the
//      Fate-card generator's own pre-existing _authoredOASBlock precedent).
//   3. The Fate-card generator (orchestration-client.js) has zero worldTruths/canon channel —
//      confirmed by direct code trace — which is how "burn for me, as the First-Favored did for the
//      old gods" reached the player as a card option in a world whose own canon has no god, only
//      Fate. Fixed: a static Fatelands cosmology ban added to both fate-preview prompt builders,
//      matching the existing Glass House lexical-guard precedent.
//
// This control proves, fully dry (no provider calls, no image calls, no prose rewrite, no forks):
//   RED:MOUTHBAND  — retry-3's REAL delivered beats (read verbatim from
//                    scene2_raw_response_retry3.txt) are flagged by _detectEstablishedStateReversion
//                    — the real, evidenced continuity break.
//   RED:COSMOLOGY  — the real Fate-card text that leaked ("burn for me, as the First-Favored did for
//                    the old gods", read verbatim from the real persisted log) is flagged by
//                    _detectFatelandsCosmologyViolation.
//   GREEN          — a synthetic scene using the SAME Boundary posture, consequences-shaped, with no
//                    illegal cosmology and no reverted object state, clears BOTH checks.
//   GENERIC        — a starterId with no registered bans/established-states is unaffected (both
//                    mechanisms are inert without real data, not First-Sacrifice-specific plumbing).
//   PROMPT:OAS     — the real open-row planner dispatch (same Boundary/Say-Do reproduction as prior
//                    controls) now includes a RECENT OAS EXCHANGE block, sourced from the real,
//                    already-existing state._oasSceneSnapshots archive (NOT intimacyDialogue itself,
//                    which _resolveIntimacyScene nulls before this planner ever runs — confirmed by
//                    trace, not assumed), never hand-typed.
//   HARNESS        — _scene2_repair_replay_sample.mjs's state setup now populates
//                    state._bakedEmitted, matching what real production's _hydrateBakedStoryState
//                    does when the baked opening displays (confirmed via source inspection, not
//                    re-run — the fix is a straight mirror of the one field that matters).
//
// usage: node _scene2_continuity_canon_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 700) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => typeof window._detectSceneAdequacyFailure === 'function' && typeof window._detectFatelandsCosmologyViolation === 'function' && typeof window._detectEstablishedStateReversion === 'function', { timeout: 20000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

  section('RED:MOUTHBAND — retry-3\'s real delivered beats are flagged for restaging the mouth-band\'s already-established removal');
  const rawRetry3 = fs.readFileSync(path.join(__dirname, '_scene2_repair_replay_sample_out', 'scene2_raw_response_retry3.txt'), 'utf8');
  const fenced3 = rawRetry3.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const retry3Screenplay = JSON.parse(fenced3 ? fenced3[1] : rawRetry3);
  const retry3Result = await page.evaluate((s) => window._detectSceneAdequacyFailure(s, { starterId: 'starter_first_sacrifice' }), retry3Screenplay);
  ok('retry-3 real beats flagged: establishedStateReversion non-empty', Array.isArray(retry3Result.checks.establishedStateReversion) && retry3Result.checks.establishedStateReversion.length > 0, JSON.stringify(retry3Result.checks.establishedStateReversion));
  ok('violation identifies the mouth-band specifically', (retry3Result.checks.establishedStateReversion || []).some((v) => v.id === 'mouth_band'), JSON.stringify(retry3Result.checks.establishedStateReversion));
  ok('overall verdict still failed (this check adds to, does not replace, existing reasons)', retry3Result.failed === true, JSON.stringify(retry3Result.reasons));

  section('RED:COSMOLOGY — the real Fate-card text that leaked is flagged by the Fatelands cosmology guard');
  const REAL_LEAKED_CARD_TEXT = 'BOUNDARY ||| amplify ||| Slide my fingers between her thighs, mark her with the sacrifice-ash ||| "I want you to burn for me, as the First-Favored did for the old gods."';
  const cosmologyResult = await page.evaluate((t) => window._detectFatelandsCosmologyViolation(t, { starterId: 'starter_first_sacrifice' }), REAL_LEAKED_CARD_TEXT);
  ok('the real leaked card text is flagged', cosmologyResult.failed === true, JSON.stringify(cosmologyResult));
  ok('the matched term is a real-world religious word ("gods")', /gods?/i.test(cosmologyResult.matched || ''), cosmologyResult.matched);

  section('GREEN — a synthetic scene on the SAME Boundary posture, consequences-shaped, no illegal cosmology, no reverted object state');
  const greenScreenplay = {
    beats: [
      { idx: 0, kind: 'narration', text: 'The assembly has not moved since the Dohkar spoke.' },
      { idx: 1, kind: 'dialogue', text: '"I interfered. I tore my own seal to reach her."' },
      { idx: 2, kind: 'narration', text: 'The Dohkar names a formal inquiry, a Chayr and two Dohkars, for the coming week.' },
      { idx: 3, kind: 'dialogue', text: '"Seren\'s family will be summoned to give account," he says.' },
      { idx: 4, kind: 'narration', text: 'Julian steps back and lets the ruling stand, watching her.' },
      { idx: 5, kind: 'dialogue', text: '"Will you speak for yourself before them, or send silence in your place?" the Dohkar asks.' },
    ],
    sceneCharge: { stake: 'whether Lirael answers the inquiry herself or lets silence answer for her' },
  };
  const greenCosmology = await page.evaluate((t) => window._detectFatelandsCosmologyViolation(t, { starterId: 'starter_first_sacrifice' }), greenScreenplay.beats.map((b) => b.text).join(' '));
  ok('no cosmology violation in the clean synthetic scene', greenCosmology.failed === false, JSON.stringify(greenCosmology));
  const greenState = await page.evaluate((s) => window._detectEstablishedStateReversion(s, { starterId: 'starter_first_sacrifice' }), greenScreenplay);
  ok('no established-state reversion in the clean synthetic scene', greenState.failed === false, JSON.stringify(greenState));
  const greenFull = await page.evaluate((s) => window._detectSceneAdequacyFailure(s, { starterId: 'starter_first_sacrifice' }), greenScreenplay);
  ok('the clean synthetic scene clears the aftermath-signal check too (real procedure vocabulary present)', greenFull.checks.aftermath.present === true, JSON.stringify(greenFull.checks.aftermath));

  section('GENERIC — a starterId with no registered bans/established-states is unaffected (not First-Sacrifice-specific plumbing)');
  const genericCosmology = await page.evaluate((t) => window._detectFatelandsCosmologyViolation(t, { starterId: 'some_other_starter_with_no_registry_entry' }), 'the gods themselves would weep at this prayer');
  ok('no starter registered → no violation, even with religious vocabulary present (mechanism is inert without real data)', genericCosmology.failed === false, JSON.stringify(genericCosmology));
  const genericState = await page.evaluate((s) => window._detectEstablishedStateReversion(s, { starterId: 'some_other_starter_with_no_registry_entry' }), retry3Screenplay);
  ok('no starter registered → no established-state violation, even on the real retry-3 fixture', genericState.failed === false, JSON.stringify(genericState));

  section('PROMPT:OAS — the real open-row planner dispatch now includes a RECENT OAS EXCHANGE block, sourced from the real _oasSceneSnapshots archive');
  const ORIGINAL_LOG = path.join(__dirname, '_first_sacrifice_oas_grok_happy_path_sample_out', 'run_1789878699028.jsonl');
  const originalEvents = fs.readFileSync(ORIGINAL_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
  function findResponse(roleTag) { return originalEvents.find((e) => e.kind === 'response' && e.roleTag === roleTag && e.status === 200).responseBody; }
  const REAL_OAS_TURN_REPLY_RESPONSE = findResponse('oas-turn-reply');
  const REAL_FATE_CARD_RESPONSE = findResponse('fate-card-preview-batch');
  const scaffoldEvent = originalEvents.find((e) => e.kind === 'response' && e.roleTag === 'scene2-generation' && e.status === 200 && /runThesis/.test(e.responseBody.choices[0].message.content || ''));
  const REAL_SCAFFOLD_JSON = JSON.parse(scaffoldEvent.responseBody.choices[0].message.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());
  const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
  const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';

  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_scene2_continuity_canon_control_out.jsonl') });
  gate.stub('/api/proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
    return { id: 'stub', model: 'grok-4.3', choices: [{ finish_reason: 'stop', message: { content: '```json\n' + JSON.stringify({ title: 'stub', beats: [{ idx: 0, kind: 'narration', text: 'stub' }], sceneCharge: { stake: 'stub' } }) + '\n```' } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });
  gate.stub('/api/mistral-proxy', (req) => {
    const body = JSON.parse(req.postData() || '{}');
    if (body.model === 'ministral-8b-2512' && Array.isArray(body.messages) && body.messages.length === 2 && /Fate.Card|fate.card/i.test(JSON.stringify(body).slice(0, 200))) return REAL_FATE_CARD_RESPONSE;
    return { id: 'stub', model: 'ministral-8b-2512', choices: [{ message: { content: JSON.stringify({ tactical_move: 'stub', posture_read: 'stub', local_objective: 'stub', local_objective_actor: 'Lirael', present: ['Lirael'], reserved: { price_identified: 'untouched', inquiry_opened: 'untouched', julian_counter_wish: 'untouched', julian_obscuring_wishes: 'untouched' }, aftermath: { twist_manifested: 'kept', interrogation_interrupted: 'kept', the_answer_institutional: 'kept', inquiry_authority_claimed: 'kept' }, state_change_precondition: 'stub', state_change: 'stub event', forces_choice: 'stub A or B', branch_a: 'A', branch_b: 'B' }) } }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } };
  });

  await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._bakedScene1For === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
  await page.evaluate(({ scaffold }) => {
    const s = window.state;
    s.storyId = 'continuity-canon-control-' + Date.now();
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
  const usrMsg = plannerDispatch.requestBody.messages[1].content;
  ok('planner prompt now contains RECENT OAS EXCHANGE', /RECENT OAS EXCHANGE/.test(usrMsg), usrMsg.slice(0, 400));
  ok('the live LI turn text is present verbatim (sourced from the real _oasSceneSnapshots archive, not hand-typed)', /hunger in your gaze called louder than the rite itself/.test(usrMsg), 'not found');
  ok('the block appears before READER\'S SAY/DO (grounds posture in what actually preceded it)', usrMsg.indexOf('RECENT OAS EXCHANGE') < usrMsg.indexOf("READER'S SAY/DO"), 'indices: ' + usrMsg.indexOf('RECENT OAS EXCHANGE') + ' / ' + usrMsg.indexOf("READER'S SAY/DO"));
  ok('IMMUTABLE AFTERMATH (mouth-band torn away, obligations) also now present — the harness fix + planner fix coexist', usrMsg.includes('mouth-band torn away') && /IMMUTABLE AFTERMATH/.test(usrMsg), usrMsg.slice(0, 300));

  section('HARNESS — _scene2_repair_replay_sample.mjs now hydrates state._bakedEmitted before Submit');
  const replaySrc = fs.readFileSync(path.join(__dirname, '_scene2_repair_replay_sample.mjs'), 'utf8');
  ok('the replay script sets state._bakedEmitted from the real baked package (mirrors _hydrateBakedStoryState\'s one load-bearing field)', /s\._bakedEmitted\s*=\s*\(_pkgForEmitted/.test(replaySrc), 'not found');

  await browser.close();
  try { fs.unlinkSync(path.join(__dirname, '_scene2_continuity_canon_control_out.jsonl')); } catch (_) {}

  console.log('\n' + '='.repeat(100));
  console.log('SCENE 2 CONTINUITY + CANON CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
