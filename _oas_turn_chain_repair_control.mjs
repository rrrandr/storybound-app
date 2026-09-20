// OAS OPENER + TURN CHAIN REPAIR — REAL BROWSER, REAL APP, DRY STUBS ONLY (Roman, 2026-09-19)
//
// Audit that prompted this: the retried live Boundary sample failed at phase 1. Tracing
// _fireIntimacyOpener (app.js) and its dispatcher callOASTurnLLM (orchestration-client.js) found:
//   (a) a hardcoded 12s AbortController deadline on the Grok fallback — the exact cause of the
//       observed net::ERR_ABORTED, far tighter than the 45s this codebase's own commentary
//       (callGrokIntimateFate) documents as the real, established-safe value for a Grok call;
//   (b) no governor-refusal detection — a real provider 429 and a governor-imposed 429/507 were
//       indistinguishable;
//   (c) zero cost/cache accounting — every successful call was invisible to the ledger;
//   (d) a separate, real mismatch: First Sacrifice's shipped starter package has NO authored
//       oasOpening.text yet, so _fireIntimacyOpener's zero-call authored-opener short-circuit
//       (app.js:185420, built 2026-09-17, "absent for every package today") never fires for it —
//       the live sample exercised the live-generated opener, not the candidate flow being built.
//
// Roman's decision after reviewing the audit (2026-09-19): keep Mistral Small primary for this
// short, tightly-contextual dialogue role (unlike full-scene authoring, this prompt is small
// enough for Mistral's real TPM ceiling to legitimately admit it) — fix the actual defects instead:
// widen the Grok fallback to the established 45s deadline, distinguish governor refusal from
// provider failure, add request/cost/cache accounting matching _authorFullScenePolicy. Separately:
// the authored opener supplies ONLY Julian's first line, zero-call — every reply after the
// player's first Say/Do remains live OAS dialogue via this same repaired chain. Both must be
// proven, dry, before any future paid sample.
//
// Sections:
//   A. Authored-opener zero-call path: a package WITH oasOpening.text makes NO network call, and
//      the authored line is correctly recorded into liTurnHistory (so it's visible to the very
//      next live turn's prompt — proven in B).
//   B. Turn-reply prompt content: the live OAS prompt for the turn AFTER the authored opener
//      actually contains the authored opening's line, the Scene 1 accusation/situation context,
//      the player's exact latest SAY/DO words, and prior OAS turns (not just computed and
//      discarded).
//   C. The widened Grok fallback timeout actually works (a stub deliberately delayed to ~20s —
//      between the OLD 12s deadline and the NEW 45s one — still succeeds), and a real success
//      records cost + classifies cache observation.
//   D. Governor-refusal is distinguished from an ordinary provider failure in the attempt ledger,
//      for both the "false" (real observed shape: a genuine Mistral 429, no governor flag) and
//      "true" (governor: true) cases.
//
// Fully dry — every /api/** call is served by a local stub (no allowRealPaths at all); no real
// provider is ever reached. Requires the local dev server at http://localhost:3000 (unchanged app
// code otherwise) but makes no external network call of any kind.
// usage: node _oas_turn_chain_repair_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 500) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }
function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

const OPENER_MARKER = 'ZZZ_AUTHORED_OPENER_LINE_ZERO_CALL_MARKER';
const FRAME_MARKER = 'ZZZ_SCENE1_ACCUSATION_SITUATION_MARKER';
const CUE_MARKER = 'ZZZ_LAST_AUTHORED_BEAT_CUE_MARKER';
const SAY_MARKER = 'ZZZ_PLAYER_SAY_MARKER_' + Date.now();
const DO_MARKER = 'ZZZ_PLAYER_DO_MARKER_' + Date.now();
const TURN2_MARKER = 'ZZZ_PRIOR_TURN_2_MARKER';
const TURN3_MARKER = 'ZZZ_PRIOR_TURN_3_MARKER';

(async () => {
  let browser;
  try { browser = await chromium.launch({ headless: true, channel: 'chrome' }); }
  catch (e) { console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message)); process.exit(2); }
  const page = await (await browser.newContext()).newPage();

  // Mutable stub handlers — reconfigured between sections C/D without re-registering (first-match
  // registration order in the gate means a second gate.stub() on the same prefix would never be
  // reached; delegating through a mutable variable avoids that).
  let mistralHandler = async () => ({ __gateStatus: 429, error: 'Mistral API request failed', provider_status: 429, governor: false, details: { object: 'error', message: 'Rate limit exceeded', type: 'rate_limited', code: '1300' } });
  let grokHandler = async () => ({ choices: [{ message: { content: 'grok reply text' } }], usage: { prompt_tokens: 900, completion_tokens: 60 } });

  const gate = await installFailClosedNetworkGate(page); // no logFile, no allowRealPaths — fully dry, stub lane only
  gate.stub('/api/mistral-proxy', (req) => mistralHandler(req));
  gate.stub('/api/proxy', (req) => grokHandler(req));
  gate.stub('/api/deepseek-proxy', () => ({ choices: [{ message: { content: 'deepseek should not be reached in these sections' } }] }));
  gate.stub('/api/chatgpt-proxy', () => ({ content: 'gpt-4o-mini should not be reached in these sections' }));
  // Everything else under /api/** (config, geo, csp-report, beta-events, image endpoints, etc.) has
  // no stub and no real-lane entry — the gate's existing fail-closed default aborts it, matching
  // ordinary page-load noise seen on every prior run in this repo; not asserted on here.

  let reachedApp = false;
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && typeof window._fireIntimacyOpener === 'function' && typeof window._buildIntimacyTurnPrompt === 'function' && window.StoryboundOrchestration && typeof window.StoryboundOrchestration.callOASTurnLLM === 'function', { timeout: 20000 });
    reachedApp = true;
  } catch (e) {
    console.error('HARNESS BLOCKER: the app is not reachable/ready at http://localhost:3000/ — ' + (e && e.message));
    await browser.close();
    process.exit(2);
  }
  console.log('✓ real app reached; _initIntimacyDialogue / _fireIntimacyOpener / _buildIntimacyTurnPrompt / callOASTurnLLM all resolved as real functions\n');

  await page.evaluate(() => {
    const s = window.state;
    s.storyId = 'oas-repair-control-' + Date.now();
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

  section('A. AUTHORED-OPENER ZERO-CALL PATH — a package WITH oasOpening.text makes NO text/LLM call');
  // Scoped to the TEXT/LLM endpoints specifically — the app.js:185420 comment's actual claim
  // ("render it DIRECTLY — no model call") is about the dialogue-generation call, not the separate
  // OAS portrait/face-rendering mechanic (a real /api/image attempt was observed here on the first
  // run of this control, correctly blocked by the gate's existing fail-closed default; it fires
  // regardless of whether the opener line is authored or live-generated and is not part of this
  // repair's scope — disclosed, not silently widened away).
  const TEXT_ENDPOINTS = ['/api/proxy', '/api/mistral-proxy', '/api/deepseek-proxy', '/api/chatgpt-proxy'];
  const textCallsBefore = () => gate.calls().filter((c) => TEXT_ENDPOINTS.some((p) => new URL(c.url).pathname === p)).length;
  const callsBeforeA = textCallsBefore();
  const sectionA = await page.evaluate(async ({ openerMarker, frameMarker, cueMarker }) => {
    const plan = {
      beats: [], is_consummate_scene: true,
      openingFrame: frameMarker, cue: cueMarker,
      interruption: '', interruptionImage: '', interruptionExchange: [],
      oasOpening: { speaker: 'Julian', text: openerMarker },
      postInterruptionBeat: null,
    };
    await window._initIntimacyDialogue(plan);
    await window._fireIntimacyOpener();
    const d = window.state.intimacyDialogue;
    return {
      phase: d && d.phase,
      liTurnHistoryLen: (d && d.liTurnHistory || []).length,
      firstEntry: (d && d.liTurnHistory || [])[0] || null,
      authoredFrameOpeningText: d && d._authoredFrame && d._authoredFrame.oasOpening && d._authoredFrame.oasOpening.text,
    };
  }, { openerMarker: OPENER_MARKER, frameMarker: FRAME_MARKER, cueMarker: CUE_MARKER });
  const callsAfterA = textCallsBefore();

  ok('window._initIntimacyDialogue correctly stored the authored oasOpening.text on d._authoredFrame', sectionA.authoredFrameOpeningText === OPENER_MARKER, JSON.stringify(sectionA));
  ok('_fireIntimacyOpener made ZERO text/LLM (/api/proxy, /api/mistral-proxy, /api/deepseek-proxy, /api/chatgpt-proxy) requests when an authored oasOpening.text was present', callsAfterA === callsBeforeA, 'text calls before=' + callsBeforeA + ' after=' + callsAfterA);
  ok('the authored line was rendered directly and d.phase advanced to awaiting_first_response, same as the live-generated path\'s success state', sectionA.phase === 'awaiting_first_response', JSON.stringify(sectionA));
  ok('the authored opener was correctly pushed into d.liTurnHistory as beat 1 (liDialogue/liResponse both the authored text) — visible to the very next live turn\'s prompt', sectionA.liTurnHistoryLen === 1 && sectionA.firstEntry && sectionA.firstEntry.liDialogue === OPENER_MARKER && sectionA.firstEntry.liResponse === OPENER_MARKER, JSON.stringify(sectionA.firstEntry));

  section('B. TURN-REPLY PROMPT CONTENT — the live OAS prompt after the authored opener actually carries every required element');
  const sectionB = await page.evaluate(({ sayMarker, doMarker, turn2Marker, turn3Marker }) => {
    const d = window.state.intimacyDialogue;
    d.liTurnHistory.push({ userInput: 'prior say 2', liDialogue: turn2Marker, liAction: '', liResponse: turn2Marker, userSignal: 'neutral', tempBeforeShift: d.temperature, sceneTone: 'tender' });
    d.liTurnHistory.push({ userInput: 'prior say 3', liDialogue: turn3Marker, liAction: '', liResponse: turn3Marker, userSignal: 'neutral', tempBeforeShift: d.temperature, sceneTone: 'tender' });
    const prompt = window._buildIntimacyTurnPrompt(d, sayMarker, doMarker, false, false, false);
    return { prompt: String(prompt || '') };
  }, { sayMarker: SAY_MARKER, doMarker: DO_MARKER, turn2Marker: TURN2_MARKER, turn3Marker: TURN3_MARKER });
  const p = sectionB.prompt;

  ok('the live OAS turn-reply prompt contains the Scene 1 accusation/situation context (AUTHORED OPENING FRAME\'s openingFrame text)', p.includes(FRAME_MARKER), 'prompt length=' + p.length);
  ok('the live OAS turn-reply prompt contains the last authored beat (cue)', p.includes(CUE_MARKER));
  ok('the live OAS turn-reply prompt contains the authored opener\'s OWN spoken line text (via RECENT TURNS / historyStr, not just the paraphrased frame)', p.includes(OPENER_MARKER));
  ok('the live OAS turn-reply prompt contains the player\'s EXACT latest SAY words', p.includes(SAY_MARKER));
  ok('the live OAS turn-reply prompt contains the player\'s EXACT latest DO words', p.includes(DO_MARKER));
  ok('the live OAS turn-reply prompt contains prior OAS turns beyond just the opener (RECENT TURNS is not dead code)', p.includes(TURN2_MARKER) && p.includes(TURN3_MARKER));

  section('C. WIDENED GROK TIMEOUT + COST/CACHE ACCOUNTING — real ground truth, not just "it changed in source"');
  mistralHandler = async () => ({ __gateStatus: 429, error: 'Mistral API request failed', provider_status: 429, governor: false, details: { object: 'error', message: 'Rate limit exceeded', type: 'rate_limited', code: '1300' } });
  const GROK_STUB_DELAY_MS = 20000; // between the OLD 12s deadline (would abort) and the NEW 45s one (should succeed)
  let grokStubStartedAt = null, grokStubResolvedAt = null;
  grokHandler = async () => {
    grokStubStartedAt = Date.now();
    await sleep(GROK_STUB_DELAY_MS);
    grokStubResolvedAt = Date.now();
    return { choices: [{ message: { content: 'grok reply after the old-deadline window' } }], usage: { prompt_tokens: 1000, completion_tokens: 60, cache_read_input_tokens: 200 } };
  };
  const sectionC = await page.evaluate(async () => {
    const trueStart = Date.now();
    const text = await window.StoryboundOrchestration.callOASTurnLLM(
      [{ role: 'system', content: 'you are the LI' }, { role: 'user', content: 'turn content' }],
      { max_tokens: 400, temperature: 0.75, roleTag: 'oas-turn' }
    );
    return {
      text,
      elapsedMs: Date.now() - trueStart,
      attempts: window.state._lastOASAuthorAttempts || null,
      cache: window.state._lastOASAuthorCache || null,
      lastModelByCategory: (window.state._lastTextModelByCategory || {})['oas-turn'] || null,
    };
  });

  ok('the delayed Grok stub genuinely took ~20s (a real delay, not an immediate mock standing in for "delayed")', grokStubResolvedAt && grokStubStartedAt && (grokStubResolvedAt - grokStubStartedAt) >= GROK_STUB_DELAY_MS - 100, (grokStubResolvedAt - grokStubStartedAt) + 'ms');
  ok('callOASTurnLLM succeeded despite the ~20s delay — the widened 45s deadline actually works, not just present in source (the OLD 12s deadline would have aborted this and returned null/fallen through)', sectionC.text === 'grok reply after the old-deadline window', JSON.stringify(sectionC.text));
  ok('the attempt ledger records the Mistral failure BEFORE the Grok success, in order', Array.isArray(sectionC.attempts) && sectionC.attempts.length >= 2 && sectionC.attempts[0].provider === 'mistral' && sectionC.attempts[0].ok === false && sectionC.attempts[1].provider === 'grok' && sectionC.attempts[1].ok === true, JSON.stringify(sectionC.attempts));
  ok('a real (non-governor) Mistral 429 is correctly recorded as governorRefused:false — distinguishes an ordinary provider failure from a governor refusal', sectionC.attempts && sectionC.attempts[0].governorRefused === false, JSON.stringify(sectionC.attempts && sectionC.attempts[0]));
  ok('cost accounting fired on the real Grok success: state._lastTextModelByCategory[\'oas-turn\'] records the model that actually won', sectionC.lastModelByCategory === 'grok-4.20-0309-non-reasoning', JSON.stringify(sectionC.lastModelByCategory));
  ok('cache observation is classified from the real usage block returned (cache_read_input_tokens=200 → observed "hit")', sectionC.cache && sectionC.cache.observed === 'hit' && sectionC.cache.cachedTokens === 200, JSON.stringify(sectionC.cache));

  section('D. GOVERNOR REFUSAL vs PROVIDER FAILURE — the true (governor:true) case, distinguished correctly');
  mistralHandler = async () => ({ __gateStatus: 429, error: 'Rate limit exceeded (governor)', provider_status: 429, governor: true, details: { message: 'governor-imposed refusal' } });
  grokHandler = async () => ({ choices: [{ message: { content: 'fast grok reply, no delay this section' } }], usage: { prompt_tokens: 500, completion_tokens: 40 } }); // no delay — keep this section fast
  const sectionD = await page.evaluate(async () => {
    const text = await window.StoryboundOrchestration.callOASTurnLLM(
      [{ role: 'system', content: 'you are the LI' }, { role: 'user', content: 'turn content 2' }],
      { max_tokens: 400, temperature: 0.75, roleTag: 'oas-turn' }
    );
    return { text, attempts: window.state._lastOASAuthorAttempts || null };
  });
  ok('a real governor:true 429 is correctly recorded as governorRefused:true — the two failure shapes are no longer conflated', sectionD.attempts && sectionD.attempts[0] && sectionD.attempts[0].provider === 'mistral' && sectionD.attempts[0].governorRefused === true, JSON.stringify(sectionD.attempts && sectionD.attempts[0]));
  ok('the chain still correctly falls through to Grok afterward regardless of which failure shape Mistral returned', sectionD.text === 'fast grok reply, no delay this section', JSON.stringify(sectionD.text));

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('OAS OPENER + TURN CHAIN REPAIR CONTROL: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
