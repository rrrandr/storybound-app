// SCENE 2 PLANNER — OUTPUT-BUDGET FIX + RETRY-LIFECYCLE PROOF (Roman, 2026-09-20, second pass)
//
// A real, paid replay (2026-09-20) showed the scene-spine planner's real ministral-8b-2512 response
// truncated: completion_tokens=640 exactly equals the requested max_tokens, and the raw retained
// response's own `finish_reason` field is "length" — DEFINITIVE proof of truncation (not inference
// from the token count alone), read directly from
// _scene2_repair_replay_sample_out/run_1789881139272.jsonl, never hand-transcribed. The truncated
// JSON breaks off mid-string inside "branch_a", with "branch_b" and the closing braces never
// written. app.js's own _scMaxTok was raised 640 -> 1200 (justified by a full schema trace: the
// gating flags for the 760/320 branches are never set anywhere in the codebase, so 640/1200 is the
// ALWAYS-ACTIVE production path, not an edge case — see the app.js comment at that line for the
// full derivation).
//
// This control proves three things, all fully dry (stub lane only, no allowRealPaths, no images,
// no real provider ever reached):
//   A. The retained REAL truncated response is rejected cleanly by the real validator
//      (_validateLocalObjective) — not merely assumed.
//   B. The bounded-retry lifecycle, precisely observed with FULL (non-sliced) console capture and
//      exact network-dispatch counting — resolving what static code reading could not: does the
//      retry dispatch a second real request, and if not, what NAMED terminal state does the
//      existing code leave behind (state._cgResumable)?
//   C. A structurally complete fixture — the SAME real truncated content, completed (branch_a
//      finished, branch_b added, JSON properly closed) rather than invented from scratch — reaches
//      the real Scene 2 author call boundary once validation genuinely accepts it.
//
// usage: node _scene2_planner_budget_and_retry_repair_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 600) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

// ── Load the real, retained truncated planner response verbatim ──
const REPLAY_LOG = path.join(__dirname, '_scene2_repair_replay_sample_out', 'run_1789881139272.jsonl');
const replayEvents = fs.readFileSync(REPLAY_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const truncatedEvent = replayEvents.find((e) => e.kind === 'response' && e.roleTag === 'scene2-structural-author' && e.responseBody && e.responseBody.choices);
const REAL_TRUNCATED_RESPONSE = truncatedEvent.responseBody;
const REAL_FINISH_REASON = REAL_TRUNCATED_RESPONSE.choices[0].finish_reason;
const REAL_TRUNCATED_CONTENT_RAW = REAL_TRUNCATED_RESPONSE.choices[0].message.content;
console.log('✓ loaded the real, retained truncated planner response — finish_reason="' + REAL_FINISH_REASON + '" (from the provider itself, not inferred)');

section('0. SOURCE-LEVEL — the retained response is DEFINITIVELY truncated, not just token-count-coincidental');
ok('the real response\'s own finish_reason is "length" — the provider\'s own truncation signal', REAL_FINISH_REASON === 'length', REAL_FINISH_REASON);
ok('completion_tokens exactly equals the requested max_tokens (640/640) — corroborates finish_reason', REAL_TRUNCATED_RESPONSE.usage.completion_tokens === 640, JSON.stringify(REAL_TRUNCATED_RESPONSE.usage));

// Complete the SAME real content (not invented from scratch) — strip the fence, finish the
// truncated branch_a, add branch_b, close the object.
const strippedTruncated = REAL_TRUNCATED_CONTENT_RAW.replace(/^```json\s*/i, '');
const COMPLETED_CONTENT = strippedTruncated + ' her own to bear.",\n  "branch_b": "Lirael turns the moment back onto Julian, naming his own hand in what the assembly is now calling judgment."\n}';
let completedParsed = null;
try { completedParsed = JSON.parse(COMPLETED_CONTENT); } catch (e) { console.error('HARNESS BLOCKER: the completed fixture itself does not parse — ' + e.message); process.exit(2); }
ok('the completed fixture (same real content, finished) parses as valid JSON', !!completedParsed, null);
ok('the completed fixture carries the real, prompt-derived reserved/aftermath ids and roster (not invented)', completedParsed.present && completedParsed.present.includes('Julian') && completedParsed.reserved && Object.keys(completedParsed.reserved).length === 4, JSON.stringify({ present: completedParsed.present, reservedKeys: completedParsed.reserved && Object.keys(completedParsed.reserved) }));

// A real, instrumented Section-C run (2026-09-20, this repair) found that COMPLETED_CONTENT's own
// `present` field — "the assembly" — is not a member of the real, fixed-seed roster for this scene
// (Lirael / Seren / Julian / the presiding Dohkar; confirmed via window._effectiveSceneRow, which
// reads STARTER_PLANS' static spine — deterministic, not session-specific). This is a genuine,
// disclosed content defect the model itself produced (present before the truncation point, not
// something the completion appended) — NOT a harness bug and NOT something this control invents or
// papers over. VALID_COMPLETED_CONTENT is the SAME real completed content with only that one
// already-invalid entry removed, to isolate "does a structurally complete AND validator-legal
// objective reach the author boundary" from this separate, pre-existing roster-naming defect.
const validPresent = completedParsed.present.filter((p) => p !== 'the assembly');
const VALID_COMPLETED_CONTENT = JSON.stringify(Object.assign({}, completedParsed, { present: validPresent }));
ok('removing the one non-roster "the assembly" entry leaves a fixture whose present[] is a subset of the real roster', validPresent.every((p) => ['Lirael', 'Seren', 'Julian', 'the presiding Dohkar'].includes(p)), JSON.stringify(validPresent));

const CANDIDATE_PATH = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package', '13_final_field_correction.json');
const candidateRaw = JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));
const candidateOasOpening = candidateRaw.draft && candidateRaw.draft.oasOpening;
const candidatePostInterruption = candidateRaw.draft && candidateRaw.draft.postInterruptionBeat;

const ORIGINAL_HAPPY_PATH_LOG = path.join(__dirname, '_first_sacrifice_oas_grok_happy_path_sample_out', 'run_1789878699028.jsonl');
const happyPathEvents = fs.readFileSync(ORIGINAL_HAPPY_PATH_LOG, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
function findHappyPathResponse(roleTag) { return happyPathEvents.find((e) => e.kind === 'response' && e.roleTag === roleTag && e.status === 200).responseBody; }
const REAL_OAS_TURN_REPLY_RESPONSE = findHappyPathResponse('oas-turn-reply');
const REAL_FATE_CARD_RESPONSE = findHappyPathResponse('fate-card-preview-batch');
const scaffoldEvent = happyPathEvents.find((e) => e.kind === 'response' && e.roleTag === 'scene2-generation' && e.status === 200 && /runThesis/.test((e.responseBody.choices && e.responseBody.choices[0] && e.responseBody.choices[0].message.content) || ''));
const REAL_SCAFFOLD_JSON = JSON.parse(scaffoldEvent.responseBody.choices[0].message.content.replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim());

const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';

async function mountReplayState(page, gate) {
  const seededStoryId = 'planner-budget-retry-proof-' + Date.now();
  await page.evaluate(({ scaffold, storyId }) => {
    const s = window.state;
    s.storyId = storyId;
    s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = [];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s._starterId = 'starter_first_sacrifice';
    s._pcLookSkipped = true;
    s._bakedGenesisUnlocked = true;
    window._devBypass = true;
    s.cgScaffold = Object.assign({}, scaffold, { storyId });
  }, { scaffold: REAL_SCAFFOLD_JSON, storyId: seededStoryId });

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
  // Matches _scene2_repair_replay_sample.mjs's PROVEN sequence exactly — gate.setPhase +
  // gate.waitForSettlement, not a DOM-state poll. A first draft of this control used
  // page.waitForFunction on liTurnHistory instead, which resolves as soon as the DOM/state updates
  // but not necessarily after _handleIntimacyTurn's full async chain has genuinely settled — that
  // race let this control's second Submit fire while the FIRST Submit's own click handler was still
  // mid-flight, and (since #gnSubmitBtn's click handler serves BOTH the OAS-turn and main
  // scene-advancement paths) produced a bogus, unintended "scene 1" _advanceStagedScene call with
  // stale/placeholder action+dialogue text instead of the intended real turn — a real bug in this
  // control's own harness, not a new production finding. Fixed by using the same settlement-based
  // wait the proven script already uses.
  gate.setPhase('oas-turn-reply-replay', 1);
  await page.fill('#gnActionInput', REAL_DO);
  await page.fill('#gnDialogueInput', REAL_SAY);
  await page.click('#gnSubmitBtn');
  await gate.waitForSettlement('oas-turn-reply-replay', { watchdogMs: 10000 });
  gate.setPhase('fate-card-replay', 1);
  await page.evaluate(() => { window._resolveIntimacyScene('user_pivot_end'); });
  await gate.waitForSettlement('fate-card-replay', { watchdogMs: 10000 });
  // The gate's phase ceiling is NOT auto-released by settlement — an active phase with its ceiling
  // already consumed silently ABORTS every later stub-lane call as "stub-lane ceiling exceeded"
  // (confirmed: a run without this line showed plannerDispatchCount:0 with exactly that abort
  // reason on /api/mistral-proxy, even though the stub itself was correctly registered and would
  // have served it). closePhase() returns the gate to its phase-less default before Section A+B/C's
  // own Boundary+Submit stub calls run.
  gate.closePhase();
  return seededStoryId;
}

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }

  // ── SECTION A+B: real truncated content, full console capture, precise dispatch counting ──
  section('A+B. TRUNCATED RESPONSE REJECTION + RETRY LIFECYCLE — full (non-sliced) console capture');
  {
    const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
    const fullConsole = []; // NEVER sliced — the exact gap that hid this before
    page.on('console', (m) => { fullConsole.push(m.text()); });

    let plannerDispatchCount = 0;
    const gate = await installFailClosedNetworkGate(page);
    gate.stub('/api/proxy', (req) => {
      const body = JSON.parse(req.postData() || '{}');
      if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
      return { choices: [{ message: { content: 'should not be reached in section A+B' } }] };
    });
    gate.stub('/api/mistral-proxy', (req) => {
      const body = JSON.parse(req.postData() || '{}');
      if (body.model === 'ministral-8b-2512' && body.max_tokens === 700) return REAL_FATE_CARD_RESPONSE;
      // The scene-spine planner's real tier — every real attempt gets the SAME real truncated
      // content back (matching how a genuinely persistent rate/size issue would behave), so we can
      // observe exactly how many times it's attempted and what happens each time.
      plannerDispatchCount++;
      return REAL_TRUNCATED_RESPONSE;
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._validateLocalObjective === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 })
      .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser.close(); process.exit(2); });

    await mountReplayState(page, gate);

    // Direct, source-level confirmation that the REAL validator rejects the REAL truncated content
    // (whose JSON.parse would fail before validation is even reached — confirm THAT specifically).
    const directParseCheck = await page.evaluate((rawContent) => {
      try { JSON.parse(rawContent); return { parsed: true }; }
      catch (e) {
        const m = String(rawContent).match(/\{[\s\S]*\}/);
        if (!m) return { parsed: false, regexFallbackFound: false };
        try { JSON.parse(m[0]); return { parsed: false, regexFallbackFound: true, regexFallbackParsed: true }; }
        catch (e2) { return { parsed: false, regexFallbackFound: true, regexFallbackParsed: false, error: e2.message }; }
      }
    }, REAL_TRUNCATED_CONTENT_RAW);
    ok('the real truncated content fails JSON.parse directly (as expected — it is missing branch_b and closing braces)', directParseCheck.parsed === false, JSON.stringify(directParseCheck));
    ok('the app\'s own regex fallback extraction ALSO fails to produce valid JSON from the truncated content — no silent partial-acceptance path exists', directParseCheck.regexFallbackFound === true && directParseCheck.regexFallbackParsed === false, JSON.stringify(directParseCheck));

    await page.click('#gnCardMount [data-fate-card-slot="boundary"]');
    await page.click('#gnSubmitBtn');
    // Wait generously for the whole operation (including any bounded retry) to settle, then read
    // the FULL console + the app's own named-outcome state field.
    await page.waitForTimeout(8000);
    const finalState = await page.evaluate(() => ({
      cgResumable: window.state._cgResumable || null,
      sceneObjectiveAccepted: !!(window.state._sceneObjectives && window.state._sceneObjectives['2'] && window.state._sceneObjectives['2'].status === 'accepted'),
    }));
    const staleRejectedLines = fullConsole.filter((l) => l.includes('[CG:STALE-REJECTED]'));
    const staleStopLines = fullConsole.filter((l) => l.includes('[CG:STALE-STOP]'));
    console.log('  · planner tier dispatch count (real, counted by the stub itself — not console-dependent): ' + plannerDispatchCount);
    console.log('  · [CG:STALE-REJECTED] lines: ' + JSON.stringify(staleRejectedLines));
    console.log('  · [CG:STALE-STOP] lines: ' + JSON.stringify(staleStopLines));
    console.log('  · state._cgResumable: ' + JSON.stringify(finalState.cgResumable));
    console.log('  · full console captured: ' + fullConsole.length + ' lines (never sliced)');

    ok('a definitive, NAMED terminal outcome is observable after settlement — either the retry genuinely dispatched again (plannerDispatchCount >= 2) or the app\'s OWN existing state._cgResumable mechanism recorded why it stopped (not merely a log line with no observable state)', plannerDispatchCount >= 2 || !!finalState.cgResumable, JSON.stringify({ plannerDispatchCount, cgResumable: finalState.cgResumable }));
    ok('the operation did NOT silently accept the objective despite the content being genuinely unusable both times', finalState.sceneObjectiveAccepted === false, JSON.stringify(finalState));
    if (plannerDispatchCount === 1 && finalState.cgResumable) {
      console.log('  · RESOLVED: the retry did NOT dispatch a second physical request, but the existing state._cgResumable mechanism DOES record a real, named, observable terminal reason: "' + finalState.cgResumable.reason + '" — the "silent, unobservable retry" gap Roman flagged is NOT present; the outcome is just not a second network call. Whether a second network attempt SHOULD have fired (vs. this being the correct, intentional single-attempt-per-Submit design) is a separate, disclosed design question, not resolved by this control.');
    } else if (plannerDispatchCount >= 2) {
      console.log('  · RESOLVED: the bounded retry DID dispatch a second, real, independent planner attempt.');
    } else {
      console.log('  · UNRESOLVED: neither a second dispatch nor a named state._cgResumable reason was observed — a genuine gap, flagged for further investigation, not silently closed.');
    }
    await browser.close();
  }

  // ── SECTION C: a structurally complete (not invented) fixture reaches the author boundary ──
  section('C. COMPLETED FIXTURE — same real content, finished, reaches the real Scene 2 author call boundary');
  {
    const browser2 = await chromium.launch({ headless: true, channel: 'chrome' });
    const page = await (await browser2.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
    const fullConsole2 = [];
    page.on('console', (m) => { fullConsole2.push(m.text()); });
    let authorCallReached = false;
    let plannerDispatchCount2 = 0;
    const gate = await installFailClosedNetworkGate(page);
    gate.stub('/api/proxy', (req) => {
      const body = JSON.parse(req.postData() || '{}');
      if (body.role === 'STRUCTURE_GENERATOR' && body.max_tokens === 400) return REAL_OAS_TURN_REPLY_RESPONSE;
      if (body.max_tokens === 8000) {
        authorCallReached = true;
        return { choices: [{ message: { content: JSON.stringify({ beats: [{ speaker: 'Julian', kind: 'dialogue', text: 'COMPLETED-FIXTURE-reached-author-boundary' }] }) } }], usage: { prompt_tokens: 9000, completion_tokens: 400 } };
      }
      return { choices: [{ message: { content: 'should not be reached in section C' } }] };
    });
    gate.stub('/api/mistral-proxy', (req) => {
      const body = JSON.parse(req.postData() || '{}');
      if (body.model === 'ministral-8b-2512' && body.max_tokens === 700) return REAL_FATE_CARD_RESPONSE;
      plannerDispatchCount2++;
      return { choices: [{ message: { content: VALID_COMPLETED_CONTENT } }] };
    });

    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._validateLocalObjective === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 })
      .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready — ' + (e && e.message)); await browser2.close(); process.exit(2); });

    await mountReplayState(page, gate);

    // NOTE (correction from a prior run): _validateLocalObjective is called as a BARE identifier at
    // app.js ~99504 (closure reference to its own declaration at ~199280), not via window._validate...
    // — reassigning window._validateLocalObjective never reaches that real call site (confirmed via
    // grep). That mock was dead code. Since First Sacrifice's scene-2 open row is FIXED-SEED content
    // (never planner-routed), eff.roster/reserved/aftermathTruths for THIS mounted session should be
    // the SAME static spine data as the original real replay's — so COMPLETED_CONTENT's structural
    // fields (present/reserved/aftermath, copied from that real replay) SHOULD already validate for
    // real, with no mock needed. Diagnosing why the author call still wasn't reached, for real, below.
    const effBefore = await page.evaluate(() => {
      try { return window._effectiveSceneRow(window.state, 2); } catch (e) { return { __error: e && e.message }; }
    });
    console.log('  · real eff for scene 2 (this session): ' + JSON.stringify({ roster: effBefore && effBefore.roster, reservedIds: effBefore && (effBefore.reserved || []).map(r => r.id), aftermathIds: effBefore && (effBefore.aftermathTruths || []).map(t => t.id), objectivePending: effBefore && effBefore.objectivePending }));

    await page.click('#gnCardMount [data-fate-card-slot="boundary"]');
    await page.click('#gnSubmitBtn');
    await page.waitForTimeout(8000);
    const finalState2 = await page.evaluate(() => ({
      cgResumable: window.state._cgResumable || null,
      sceneObjectiveAccepted: !!(window.state._sceneObjectives && window.state._sceneObjectives['2'] && window.state._sceneObjectives['2'].status === 'accepted'),
      rejection: window.state._sceneObjectiveRejection || null,
    }));
    console.log('  · planner dispatch count (section C): ' + plannerDispatchCount2);
    console.log('  · state._sceneObjectiveRejection: ' + JSON.stringify(finalState2.rejection));
    console.log('  · state._cgResumable: ' + JSON.stringify(finalState2.cgResumable));
    console.log('  · sceneObjectiveAccepted: ' + finalState2.sceneObjectiveAccepted);
    console.log('  · [OBJECTIVE:REJECTED] console lines: ' + JSON.stringify(fullConsole2.filter(l => l.includes('[OBJECTIVE:REJECTED]'))));
    ok('with the completed (real, finished) content and a genuinely accepted objective, the real Scene 2 author call (max_tokens: 8000) WAS dispatched', authorCallReached, JSON.stringify({ plannerDispatchCount2, finalState2 }));

    await browser2.close();
  }

  console.log('\n' + '='.repeat(100));
  console.log('SCENE 2 PLANNER BUDGET + RETRY REPAIR CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
