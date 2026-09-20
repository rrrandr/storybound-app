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
  gate.stub('/api/mistral-proxy', () => ({ choices: [{ message: { content: 'SHOULD NOT BE REACHED — candidate opener must be zero-call' } }] }));
  gate.stub('/api/proxy', () => ({ choices: [{ message: { content: 'SHOULD NOT BE REACHED — candidate opener must be zero-call' } }] }));
  gate.stub('/api/deepseek-proxy', () => ({ choices: [{ message: { content: 'SHOULD NOT BE REACHED' } }] }));
  gate.stub('/api/chatgpt-proxy', () => ({ content: 'SHOULD NOT BE REACHED' }));

  let reachedApp = false;
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._fireIntimacyOpener === 'function' && typeof window._buildIntimacyTurnPrompt === 'function' && typeof window._bakedScene1For === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
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

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('CANDIDATE OAS OPENER TEST-ONLY MOUNT CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
  console.log('Nothing was written to public/starter-scenes.js or any other shipped file — the candidate text was only read from disk and injected into one in-memory page session.');
  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
