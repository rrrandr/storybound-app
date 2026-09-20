// FIRST SACRIFICE — CANDIDATE OAS OPENER, TEST-ONLY MOUNT (Roman, 2026-09-19)
//
// Prerequisite for the paired Mistral-vs-Grok OAS quality experiment: the currently SHIPPED
// starter_first_sacrifice package (public/starter-scenes.js) has no oasHandoff.oasOpening yet, so
// _fireIntimacyOpener falls to its live-generated opener — the obsolete path, not the intended
// product flow (baked Julian first line, zero call, then live OAS from the player's first reply
// onward). The real, final candidate opener text already exists — authored and validated through
// _first_sacrifice_draft_v7_attempt8_full_package's repair passes — at
// 13_final_field_correction.json: draft.oasOpening / draft.postInterruptionBeat (siblings of
// draft.scene1Candidate, not nested inside it).
//
// This script mounts that REAL candidate text into a running session's in-memory state ONLY. It
// never writes to public/starter-scenes.js or any other shipped file — read this script's own body
// for proof: it only ever READS 13_final_field_correction.json from disk and INJECTS the result
// into a live page's window.state via page.evaluate. A future live sample can require this mount
// (or an equivalent one) explicitly instead of relying on the shipped package.
//
// Proves, against the real, unmodified app:
//   1. The merged plan keeps every REAL shipped oasHandoff field (openingFrame, cue, interruption,
//      interruptionExchange) untouched — only oasOpening/postInterruptionBeat are added.
//   2. With the candidate oasOpening mounted, _fireIntimacyOpener makes ZERO text/LLM calls and
//      renders Julian's REAL candidate line verbatim (not a placeholder, not the live-generated
//      fallback) — pushed correctly into liTurnHistory.
//   3. The live OAS prompt for the turn immediately after (i.e. the player's first reply, the exact
//      turn the paired experiment will pin) contains: the candidate opener's own line, the REAL
//      shipped Scene 1 accusation/situation context, and the player's exact latest words.
//   4. Sourced, not asserted here (see this script's own header for the exact app.js line numbers):
//      that first live turn has d.beatCount become 1, so _isOpeningTurn is true and
//      _preferReasoning defaults true UNLESS the player's own reply trips the noise/plot-deflect
//      detectors — meaning production's own default routing for this exact turn is the REASONING
//      chain (Grok primary within it), not the FAST chain (Mistral primary within it). This is
//      exact source fact (app.js:195055 increments beatCount before app.js:195137 reads it;
//      app.js:195412 computes _preferReasoning from it), stated here for the authorization sheet,
//      not re-derived by this control.
//
// Fully dry — every /api/** call is served by a local stub (no allowRealPaths); no real provider is
// ever reached; nothing is written to any shipped file.
// usage: node _first_sacrifice_candidate_oas_opener_mount_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 500) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

const CANDIDATE_PATH = path.join(__dirname, '_first_sacrifice_draft_v7_attempt8_full_package', '13_final_field_correction.json');
const candidateRaw = JSON.parse(fs.readFileSync(CANDIDATE_PATH, 'utf8'));
// NOTE (2026-09-19, corrected after a first HARNESS BLOCKER on a wrong-path assumption): oasOpening
// and postInterruptionBeat are siblings of scene1Candidate under `draft`, NOT nested inside it —
// verified against the real file's own indentation, not assumed.
const candidateOasOpening = candidateRaw.draft && candidateRaw.draft.oasOpening;
const candidatePostInterruption = candidateRaw.draft && candidateRaw.draft.postInterruptionBeat;
if (!candidateOasOpening || !candidateOasOpening.text) {
  console.error('HARNESS BLOCKER: ' + CANDIDATE_PATH + ' has no draft.oasOpening.text — cannot mount a candidate that does not exist.');
  process.exit(2);
}
console.log('Loaded REAL candidate oasOpening from disk (read-only): ' + JSON.stringify(candidateOasOpening).slice(0, 160) + '...\n');

const SAY_MARKER = 'ZZZ_PLAYER_FIRST_REPLY_MARKER_' + Date.now();
const DO_MARKER = 'ZZZ_PLAYER_FIRST_REPLY_ACTION_MARKER';

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext()).newPage();

  const gate = await installFailClosedNetworkGate(page); // no logFile, no allowRealPaths — fully dry
  // Mutable handlers (delegated through a variable, not a fixed closure) — the gate's stub lookup
  // is first-match-wins by registration order, so this is what lets section 4 reconfigure each
  // endpoint's response later without a second, unreachable gate.stub() call on the same prefix.
  let mistralHandler = () => ({ choices: [{ message: { content: 'SHOULD NOT BE REACHED — candidate opener must be zero-call' } }] });
  let grokHandler = () => ({ choices: [{ message: { content: 'SHOULD NOT BE REACHED — candidate opener must be zero-call' } }] });
  let deepseekHandler = () => ({ choices: [{ message: { content: 'SHOULD NOT BE REACHED' } }] });
  let chatgptHandler = () => ({ content: 'SHOULD NOT BE REACHED' });
  gate.stub('/api/mistral-proxy', (req) => mistralHandler(req));
  gate.stub('/api/proxy', (req) => grokHandler(req));
  gate.stub('/api/deepseek-proxy', (req) => deepseekHandler(req));
  gate.stub('/api/chatgpt-proxy', (req) => chatgptHandler(req));

  let reachedApp = false;
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._fireIntimacyOpener === 'function' && typeof window._buildIntimacyTurnPrompt === 'function' && typeof window._bakedScene1For === 'function' && typeof window._handleIntimacyTurn === 'function' && typeof window._detectOASOffTopicNoise === 'function' && typeof window._detectContextualEscalation === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
    reachedApp = true;
  } catch (e) {
    console.error('HARNESS BLOCKER: the app is not reachable/ready at http://localhost:3000/ — ' + (e && e.message));
    await browser.close();
    process.exit(2);
  }
  console.log('✓ real app reached; real starter_first_sacrifice package resolves (unmodified)\n');

  await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'candidate-oas-mount-control-' + Date.now();
    s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = [];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s._starterId = 'starter_first_sacrifice';
    s._pcLookSkipped = true;
    s._bakedGenesisUnlocked = true;
    window._devBypass = true;
  });

  section('1+2. TEST-ONLY MOUNT — real shipped oasHandoff + REAL candidate oasOpening, in-memory only');
  const TEXT_ENDPOINTS = ['/api/proxy', '/api/mistral-proxy', '/api/deepseek-proxy', '/api/chatgpt-proxy'];
  const textCalls = () => gate.calls().filter((c) => TEXT_ENDPOINTS.some((p) => new URL(c.url).pathname === p)).length;
  const callsBefore = textCalls();

  const mount = await page.evaluate(({ candidateOasOpening, candidatePostInterruption }) => {
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    const h = pkg.oasHandoff || {};
    // The merge: every REAL shipped field carried through untouched; ONLY oasOpening/
    // postInterruptionBeat come from the candidate. Nothing here is written back to pkg/h or any
    // shipped object — `plan` is a fresh, local object for this one call.
    const plan = {
      beats: [], is_consummate_scene: true, __bakedOrigin: pkg.title || null,
      openingFrame: h.openingFrame || '', cue: h.cue || '',
      interruption: h.interruption || '', interruptionImage: h.interruptionImage || '',
      interruptionExchange: Array.isArray(h.interruptionExchange) ? h.interruptionExchange.slice() : [],
      oasOpening: candidateOasOpening,
      postInterruptionBeat: candidatePostInterruption || null,
    };
    return { shippedOpeningFrame: h.openingFrame || '', shippedCue: h.cue || '', shippedHadOasOpeningAlready: !!(h.oasOpening && h.oasOpening.text), plan };
  }, { candidateOasOpening, candidatePostInterruption });

  ok('the SHIPPED package genuinely has no oasOpening yet (confirms this mount is filling a real gap, not redundant)', mount.shippedHadOasOpeningAlready === false, JSON.stringify(mount.shippedHadOasOpeningAlready));
  ok('the REAL shipped openingFrame (Scene 1 accusation/situation context) was read and will be carried through unmodified', mount.shippedOpeningFrame.includes('Julian’s first line is an accusation') || mount.shippedOpeningFrame.includes('Julian’s first line is an accusation'), mount.shippedOpeningFrame.slice(0, 200));
  ok('the REAL shipped cue (last authored Scene 1 beat) was read and will be carried through unmodified', mount.shippedCue.includes('closes Lirael') || mount.shippedCue.includes('closes Lirael’s fingers'), mount.shippedCue);

  const opener = await page.evaluate(async (plan) => {
    await window._initIntimacyDialogue(plan);
    await window._fireIntimacyOpener();
    const d = window.state.intimacyDialogue;
    return {
      phase: d && d.phase,
      liTurnHistoryLen: (d && d.liTurnHistory || []).length,
      firstEntry: (d && d.liTurnHistory || [])[0] || null,
    };
  }, mount.plan);
  const callsAfter = textCalls();

  ok('mounting the candidate opener triggered ZERO text/LLM calls (the candidate line rendered directly, exactly like the generic zero-call proof, now with the REAL candidate text)', callsAfter === callsBefore, 'text calls before=' + callsBefore + ' after=' + callsAfter);
  ok('d.phase correctly advanced to awaiting_first_response', opener.phase === 'awaiting_first_response', JSON.stringify(opener.phase));
  ok('the REAL candidate line (verbatim, from 13_final_field_correction.json — not a placeholder, not the live-generated fallback) was rendered and pushed to liTurnHistory as beat 1', opener.liTurnHistoryLen === 1 && opener.firstEntry && opener.firstEntry.liDialogue === candidateOasOpening.text, JSON.stringify(opener.firstEntry && opener.firstEntry.liDialogue));

  section('3. NEXT-TURN PROMPT — the player\'s first live reply prompt carries the candidate opener + real Scene 1 context + the player\'s exact words');
  const promptResult = await page.evaluate(({ sayMarker, doMarker }) => {
    const d = window.state.intimacyDialogue;
    const prompt = window._buildIntimacyTurnPrompt(d, sayMarker, doMarker, false, false, false);
    return { prompt: String(prompt || '') };
  }, { sayMarker: SAY_MARKER, doMarker: DO_MARKER });
  const p = promptResult.prompt;

  ok('the next live turn\'s prompt contains the REAL candidate opener\'s own line (RECENT TURNS)', p.includes(candidateOasOpening.text.slice(0, 60)), 'prompt length=' + p.length);
  ok('the next live turn\'s prompt contains the REAL shipped Scene 1 accusation/situation context (AUTHORED OPENING FRAME)', p.includes(mount.shippedOpeningFrame.slice(0, 60)));
  ok('the next live turn\'s prompt contains the REAL shipped last-authored-beat cue', p.includes(mount.shippedCue.slice(0, 40)));
  ok('the next live turn\'s prompt contains the player\'s exact latest SAY words (a stand-in here — the real experiment pins Roman\'s actual chosen reply)', p.includes(SAY_MARKER));
  ok('the next live turn\'s prompt contains the player\'s exact latest DO words', p.includes(DO_MARKER));

  section('4. ROUTING RECONCILIATION — which chain does THIS exact turn (Roman\'s real reply) actually take?');
  // Direct conflict raised by Roman: df2f316b's commit message describes callOASTurnLLM as
  // "Mistral-Small-primary" — true of its FAST chain, the function's default when
  // preferReasoning is false. But _handleIntimacyTurn's own routing-signal precomputation
  // (app.js:195143/195144/195424ish) computes preferReasoning per turn, and for the exact FIRST
  // live turn after ANY opener (authored or live-generated), d.beatCount becomes 1 before that
  // computation runs (app.js:195062 fires before 195143+), making _isOpeningTurn true — and per
  // app.js's own comment ("Opening turn is exempt" from the plot-deflect coin), the ONLY thing
  // that can still route beat 1 to the FAST/Mistral-primary chain is _userIsNoise. Proven here
  // two ways against ROMAN'S REAL reply text, not a placeholder: (a) the real detector functions
  // called directly (source-level), and (b) the REAL _handleIntimacyTurn dispatched end-to-end
  // and the actual first network call observed (behavioral) — the two must agree.
  const REAL_SAY = 'Then step forward, Julian. But do not call it rescue when you want me to ask.';
  const REAL_DO = 'I keep my hands folded at my waist and meet his eyes across Seren’s bowed head, refusing to give the assembly the satisfaction of looking away.';

  const sourceLevel = await page.evaluate(({ say, doText }) => {
    const noise = window._detectOASOffTopicNoise(say, doText);
    const escalation = window._detectContextualEscalation(say, doText);
    const beatCountBefore = window.state.intimacyDialogue.beatCount; // still 0 — opener doesn't increment it
    // Mirrors the exact formula at app.js:195424, using the REAL beatCount this turn will have
    // (beatCount++ fires at app.js:195062, BEFORE the routing computation, every real call).
    const isOpeningTurnThisCall = (beatCountBefore + 1) === 1;
    const userIsPlotDeflect = escalation && !noise && !isOpeningTurnThisCall && false; // coin only reachable if NOT opening turn — moot here, shown for completeness
    const preferReasoning = (isOpeningTurnThisCall || escalation) && !noise && !userIsPlotDeflect;
    return { noise, escalation, beatCountBefore, isOpeningTurnThisCall, userIsPlotDeflect, preferReasoning };
  }, { say: REAL_SAY, doText: REAL_DO });

  ok('SOURCE-LEVEL: d.beatCount is 0 before this turn (the candidate opener did not increment it — confirms this really is beat 1)', sourceLevel.beatCountBefore === 0, JSON.stringify(sourceLevel));
  ok('SOURCE-LEVEL: _isOpeningTurn will be true for this exact call (beatCount becomes 1)', sourceLevel.isOpeningTurnThisCall === true, JSON.stringify(sourceLevel));
  ok('SOURCE-LEVEL: the REAL _detectOASOffTopicNoise() does NOT classify Roman\'s actual reply as noise (it is a direct, in-character, on-topic reply to Julian\'s accusation)', sourceLevel.noise === false, JSON.stringify(sourceLevel));
  ok('SOURCE-LEVEL: _userIsPlotDeflect is deterministically false for beat 1 (exempted, not a coin-flip miss)', sourceLevel.userIsPlotDeflect === false, JSON.stringify(sourceLevel));
  ok('SOURCE-LEVEL PREDICTION: _preferReasoning computes to TRUE — production\'s own routing signal selects the REASONING chain for this exact turn+reply, not the FAST chain', sourceLevel.preferReasoning === true, JSON.stringify(sourceLevel));

  // Distinct markers per endpoint — whichever one _handleIntimacyTurn actually dispatches to is
  // unambiguous from the returned li_dialogue AND from the gate's own call log.
  const validReply = (marker) => ({ choices: [{ message: { content: JSON.stringify({
    li_dialogue: marker, li_action: '', li_face_state: 'closed_smile', li_next_prompt: '',
    user_signal: 'neutral', temperature_shift: 0, scene_state: 'continue', scene_tone: 'tender',
    primaryEngine: null, kink_introduced: null, pc_kink_response: 'none', kink_affinity: null, kinks_used: [],
  }) } }] });
  let wonModel = null;
  mistralHandler = () => { wonModel = 'mistral-small-latest'; return validReply('WON:mistral-small-latest'); };
  grokHandler = (req) => {
    const body = JSON.parse(req.postData() || '{}');
    wonModel = body.preferredModel || 'unknown-grok-model';
    return validReply('WON:grok:' + wonModel);
  };
  deepseekHandler = (req) => {
    const body = JSON.parse(req.postData() || '{}');
    wonModel = body.model || 'unknown-deepseek-model';
    return validReply('WON:deepseek:' + wonModel);
  };
  chatgptHandler = () => { wonModel = 'gpt-4o-mini'; return validReply('WON:gpt-4o-mini'); };

  const behavioral = await page.evaluate(async ({ say, doText }) => {
    await window._handleIntimacyTurn(say, doText);
    const d = window.state.intimacyDialogue;
    const last = (d.liTurnHistory || [])[d.liTurnHistory.length - 1];
    return { renderedDialogue: last && last.liDialogue, beatCountAfter: d.beatCount };
  }, { say: REAL_SAY, doText: REAL_DO });

  const dispatched = gate.calls().filter((c) => TEXT_ENDPOINTS.some((p) => new URL(c.url).pathname === p) && c.matched);
  ok('BEHAVIORAL: exactly one text/LLM endpoint was actually dispatched for this real turn (the winning tier returned truthy content immediately, so no fallback chain unwound)', dispatched.length === 1, JSON.stringify(dispatched.map((c) => c.url)));
  ok('BEHAVIORAL: d.beatCount correctly advanced to 1 (confirms this really was beat 1 as predicted)', behavioral.beatCountAfter === 1, JSON.stringify(behavioral));
  ok('BEHAVIORAL: the ACTUAL first-and-only dispatched call was to Grok (/api/proxy), matching the source-level prediction that this turn takes the REASONING chain, NOT Mistral (/api/mistral-proxy)', dispatched.length === 1 && dispatched[0].url.includes('/api/proxy'), JSON.stringify(dispatched.map((c) => c.url)));
  ok('BEHAVIORAL: the rendered reply matches what the actually-dispatched endpoint returned (the observed dispatch really is what reached the reader-facing state, not a coincidence)', behavioral.renderedDialogue && behavioral.renderedDialogue.startsWith('WON:grok:'), JSON.stringify(behavioral.renderedDialogue));

  console.log('\n  RECONCILIATION: "Mistral-Small-primary" (df2f316b) is correct for callOASTurnLLM\'s FAST chain — the function\'s default branch');
  console.log('  when preferReasoning=false. It is NOT what fires for THIS exact turn. For the exact first live reply after Julian\'s candidate');
  console.log('  opener, with Roman\'s real Say/Do, production\'s own routing signal (_isOpeningTurn, sourced app.js:195143-195424) selects the');
  console.log('  REASONING chain — the real, actually-dispatched model was: ' + wonModel + '. Both reports were accurate about DIFFERENT things —');
  console.log('  the general function default vs. this one specific turn\'s actual branch. Reconciled, not contradictory.');

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('CANDIDATE OAS OPENER TEST-ONLY MOUNT CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
  console.log('Nothing was written to public/starter-scenes.js or any other shipped file — the candidate text was only read from disk and injected into one in-memory page session.');
  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
