// ═══ REINTERPRET SAFETY — SCOPE FIX CONTROL (Roman/Claude 2026-09-13, §72) ═══
// Proves the getMainPairIntimacyGateScene() relocation (app.js ~74839, "RELOCATED 2026-09-13") with
// REAL reader wording through the REAL #actionInput/#dialogueInput/#submitBtn — no avoidance of
// kiss/touch language. Every /api/** request is answered locally (see _test_session_env.mjs's
// honest entitled-profile stub — no state.subscribed/access/fortunes writes after boot, no
// #payModal hiding, no runtime watcher).
//
// RED (pure Node, no browser): a minimal reproduction of the ORIGINAL scoping bug — an outer-scope
// function referencing an identifier declared only inside a DIFFERENT sibling function's body —
// mirroring reinterpretSafetyAction (app.js 102648, unchanged, outer scope) calling
// getMainPairIntimacyGateScene() while that function was nested inside the #submitBtn click
// handler (original location, per the relocation comment at app.js ~74828-74838: "was nested
// inside the #submitBtn click handler (~298651), invisible to reinterpretSafetyAction() ... every
// call ... threw an unhandled ReferenceError"). This does not touch public/app.js or serve any
// modified copy of it — chosen over a scratch-copy/route-override rig because a pure scoping
// reproduction is deterministic, needs no server, and cannot itself introduce browser flakiness
// into the RED evidence.
//
// GREEN A / GREEN B: two fresh browser pages, unseeded literary stories mounted the same way
// _literary_cascade_interruption.mjs does (production pagination API, no planner/author for Scene
// 1) — real Say/Do typed into real inputs, real Submit clicked.

import { chromium } from 'playwright-core';
import fs from 'fs';
import { installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody } from './_test_session_env.mjs';

const rows = [];
const ok = (n, p, d) => { rows.push([n, !!p]); console.log((p ? 'PASS ' : 'FAIL ') + n + (p ? '' : '  — ' + String(d || '').slice(0, 500))); };

// ─────────────────────────────────────────────────────────────────────────────────────────────
// RED — pure Node reproduction of the original scoping bug (no browser, no app.js touched)
// ─────────────────────────────────────────────────────────────────────────────────────────────
function redRepro() {
  // Mirrors reinterpretSafetyAction (app.js 102648) — outer scope, UNCHANGED by the fix, calling
  // getMainPairIntimacyGateScene() by name.
  function outerScope_reinterpretSafetyAction() {
    return getMainPairIntimacyGateScene(); // eslint-disable-line no-undef
  }
  // Mirrors the #submitBtn click handler's closure BEFORE the 2026-09-13 relocation (app.js
  // ~298651, per the relocation comment now at ~74828): getMainPairIntimacyGateScene() was
  // declared HERE, ~2000 lines into a SIBLING closure — a real function, correct body, just
  // invisible outside this scope.
  function siblingScope_submitBtnHandler() {
    function getMainPairIntimacyGateScene() { return 4; } // identical body to app.js's real one for this repro's purposes
    return getMainPairIntimacyGateScene(); // fine — same closure
  }

  let siblingOk = false, siblingErr = null;
  try { siblingOk = siblingScope_submitBtnHandler() === 4; } catch (e) { siblingErr = e; }

  let threw = null;
  try { outerScope_reinterpretSafetyAction(); } catch (e) { threw = e; }

  return { siblingOk, siblingErr, threw };
}
const red = redRepro();
console.log('=== RED repro === siblingScope (unchanged body, called from its OWN closure) = ' +
  JSON.stringify({ ok: red.siblingOk }) + '; outerScope (mirrors reinterpretSafetyAction calling a name only declared in the sibling) threw = ' +
  JSON.stringify({ name: red.threw && red.threw.name, message: red.threw && red.threw.message }));
ok('RED the ORIGINAL bug reproduces exactly: a function declared inside the #submitBtn handler\'s closure works fine when called from within that SAME closure (siblingOk), but an outer-scope function that calls it by name (mirroring reinterpretSafetyAction, which is declared at outer scope, ~102648, and is UNCHANGED by the fix) throws ReferenceError — this is the exact fault the 2026-09-13 relocation (moving the declaration to outer scope, body unchanged) fixes',
  red.siblingOk === true && red.threw instanceof ReferenceError && /getMainPairIntimacyGateScene is not defined/.test(red.threw.message),
  JSON.stringify(red));

// Confirm the fix is actually in place before spending browser time proving it.
const APP_JS = fs.readFileSync('public/app.js', 'utf8');
const relocated = /RELOCATED 2026-09-13/.test(APP_JS);
const defMatches = (APP_JS.match(/function getMainPairIntimacyGateScene\(\)/g) || []).length;
const outerDef = /\n  function getMainPairIntimacyGateScene\(\) \{/.test(APP_JS); // 2-space indent = outer IIFE scope
ok('PRE the relocation fix is present in public/app.js exactly once, at outer scope (2-space indent), before running the browser controls', relocated && defMatches === 1 && outerDef, JSON.stringify({ relocated, defMatches, outerDef }));
if (!(relocated && defMatches === 1 && outerDef)) { console.log('  [STOP] relocation fix not found as expected — not proceeding to GREEN controls against a build that may still have the bug.'); process.exit(2); }

// ─────────────────────────────────────────────────────────────────────────────────────────────
// SHARED BROWSER RIG (mirrors _literary_cascade_interruption.mjs's honest stub set, plus the new
// honest profiles/verify-subscription route stub — no state.subscribed/access/fortunes writes
// after boot, no #payModal hiding, no runtime watcher).
// ─────────────────────────────────────────────────────────────────────────────────────────────
const PASSTHROUGH = /\/api\/(geo|csp-report|beta-events)\b/;
const LOCAL = { '/api/consume-fortune': { success: true, fortunesRemaining: 9999 } };
const MODEL = /\/api\/(proxy|chatgpt-proxy|mistral-proxy|deepseek-proxy|gemini-proxy)\b/;
const PLAIN_PROSE = 'The room held its breath along with them, the quiet stretching thin and deliberate, the kind of silence that means something is about to be decided.';

function envelope(content, model) {
  return JSON.stringify({
    id: 'mock', object: 'chat.completion', model: model || 'mock',
    usage: { prompt_tokens: 0, completion_tokens: 0 }, ok: true, content,
    _orchestration: { model: model || 'mock' },
    choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }]
  });
}

async function newRig(label) {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  const logs = [];
  const calls = []; // { kind, url, role, model, sys, usr }
  const toasts = [];
  const pageErrors = [];
  const stubHits = [];

  page.on('console', m => {
    const t = m.text();
    logs.push(m.type() + ': ' + t.slice(0, 300));
  });
  page.on('pageerror', e => { pageErrors.push(String(e && e.message)); console.log('  [PAGEERROR:' + label + '] ' + String(e && e.message).slice(0, 300)); });
  page.on('dialog', async d => { logs.push('DIALOG: ' + d.message().slice(0, 200)); await d.dismiss(); });

  await installSession(page);
  await page.route('**/sb-test.localhost/**', r => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' })); // generic catch-all (existing pattern)
  await installEntitledProfileStub(page, { log: (m) => { stubHits.push(m); console.log('  [STUB:' + label + '] ' + m); } }); // honest, targeted profiles GET (registered after → wins)

  await page.route('**/api/**', async route => {
    const req = route.request();
    const url = req.url();
    const path = new URL(url).pathname;
    if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
    if (isAuthOrigin(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    if (PASSTHROUGH.test(url)) return route.continue();
    if (/\/api\/consume-fortune\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, fortunesRemaining: 9999 }) });
    if (/\/api\/verify-subscription\b/.test(url)) {
      let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
      stubHits.push('verify-subscription answered honestly (nothing to reconcile)');
      console.log('  [STUB:' + label + '] /api/verify-subscription → honest no-drift reply');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody(b.userId)) });
    }
    const lk = Object.keys(LOCAL).find(k => path.startsWith(k));
    if (lk) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(LOCAL[lk]) });
    if (!MODEL.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });

    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
    const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n');
    const usr = (b.messages || []).filter(m => m.role === 'user').map(flat).join('\n');
    const role = b.role || null;
    const maxTok = b.max_tokens || 0;

    let kind = null;
    if (role === 'SCENE_RENDERER') kind = 'renderer';
    else if (role === 'SD_AUTHOR') kind = 'sd';
    else if (/uninhibited romance fiction author/.test(sys) && /TEMPTATION \|\|\|/.test(usr)) kind = 'previewsBatch';
    else if (role === 'STRUCTURE_GENERATOR' || /SCENE-SPINE planner/.test(sys) || /"hardBeats"/.test(sys)) kind = 'sceneSpine';
    else if (/^You are a structural story planner\. Output valid JSON only\.$/.test(sys.trim())) kind = 'outline';
    else if (/^You are a literary calibrator\. Output a structured calibration block\.$/.test(sys.trim())) kind = 'calibration';
    else if (role === 'PRIMARY_AUTHOR' && maxTok === 700) kind = 'authorControl';
    else if (role === 'NARRATIVE_AUTHOR' || role === 'FALLBACK_AUTHOR' || (role === 'PRIMARY_AUTHOR' && maxTok === 1500) || /ARCHITECTURE LAWS/.test(sys)) kind = 'author';
    else if (/^Action: /.test(usr) && /Dialogue: "/.test(usr)) kind = 'author';
    else if (role === 'PRIMARY_AUTHOR') kind = 'authorMisc';
    else if (/CHARACTER MEMORY EXTRACTOR/.test(sys)) kind = 'memoryExtractor';

    const row = { kind: kind || 'unclassified', url: path, role, model: b.model || b.preferredModel || null, sys, usr };
    calls.push(row);
    if (!kind) console.log('  [UNCLASSIFIED:' + label + '] url=' + path + ' role=' + (role || '-') + ' model=' + (row.model || '-') + '\n     sys: ' + sys.replace(/\s+/g, ' ').slice(0, 200) + '\n     usr: ' + usr.replace(/\s+/g, ' ').slice(0, 200));

    if (kind === 'renderer') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(PLAIN_PROSE, b.model) });
    if (kind === 'sd') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope('[SD]\nemotionalCore: quiet tension\nphysicalBounds: none yet\nsceneSetup: ' + PLAIN_PROSE + '\ncompletionAllowed: false\n[/SD]', b.model) });
    if (kind === 'previewsBatch') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope('TEMPTATION ||| amplify ||| I hold my ground ||| Say it plainly.\nSILENCE ||| redirect ||| I say nothing ||| (no words)\nREVERSAL ||| amplify ||| I step back ||| You first.\nBOUNDARY ||| amplify ||| I set my shoulders ||| Not like this.\nCONFESSION ||| amplify ||| CONF-OPT-ACTION: I look away ||| CONF-OPT-LINE: I never said.', b.model) });
    if (kind === 'sceneSpine') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope('{}', b.model) });
    if (kind === 'authorControl') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope('[CONSTRAINTS]\nintimacyOccurs: false\ncompletionAllowed: false\nemotionalCore: quiet tension\nsceneSetup: ' + PLAIN_PROSE + '\n[/CONSTRAINTS]', b.model) });
    if (kind === 'author') return route.fulfill({ status: 200, contentType: 'application/json', body: envelope(PLAIN_PROSE, b.model) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: envelope('{}', b.model) });
  });

  return { browser, page, logs, calls, pageErrors, stubHits };
}

async function bootAndSeed(rig, { turnCount, intimacyTurnsInWindow, storyId }) {
  const { page } = rig;
  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 120000 && !up) {
    try {
      await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
      await page.waitForFunction(() => window.state && window.StoryPagination && window.showScreen, { timeout: 60000 });
      up = true;
    } catch (_) { await new Promise(r => setTimeout(r, 3000)); }
  }
  if (!up) throw new Error('server never answered');

  // Let the app's own boot settle (matches _literary_cascade_interruption.mjs's timing) before this
  // harness mounts its own state — the profiles stub means boot's own hydrateProfile() call already
  // resolves to an entitled reader, so no race/drift is expected here.
  await page.waitForTimeout(6000);
  await page.evaluate(() => { const a = document.getElementById('app'); if (a) a.classList.remove('hidden'); document.body.classList.remove('booting'); try { window.showScreen('game'); } catch (_) {} });
  // The app's own boot sequence auto-fires a resume/begin-story attempt a couple of seconds after
  // load, unrelated to this harness. With the honest entitled-profile stub in place it now clears
  // the paywall check (subscribed=true from boot) and proceeds far enough to hit corridor
  // validation against the DEFAULT (empty) picks, leaving a "Missing Selections" modal in the DOM.
  // Dismiss it the same way a real reader would — its own Close button — before seeding our own
  // story; this is debris from an unrelated automatic flow, not a gate on the turn under test
  // (which sets state._skipCorridorValidation, the same one-time arrange every harness here uses).
  const closeBtn = page.locator('.missing-selections-close-btn');
  if (await closeBtn.count()) { await closeBtn.first().click().catch(() => {}); await page.waitForTimeout(300); }

  const SCENE1_TEXT = 'The hall had been quiet for an hour before either of them said anything, and when Mara finally spoke it was not about the letter still sitting unopened on the table between them.';

  // Observation-only: record showToast calls and toast DOM text, never suppress or answer them.
  await page.evaluate(() => {
    window.__toastLog = [];
    const orig = window.showToast;
    if (typeof orig === 'function') {
      window.showToast = function (msg) { window.__toastLog.push(String(msg)); return orig.apply(this, arguments); };
    }
  });

  const seeded = await page.evaluate((args) => {
    const { sceneText, turnCount, intimacyTurnsInWindow, storyId } = args;
    const s = window.state;
    window.__disableSpeculativePreload = true;
    Object.assign(s.picks || (s.picks = {}), { world: 'Modern', worldSubtype: 'small_town', tone: 'Earnest', flavor: 'SecondChance', dynamic: 'Friends', pov: 'first_person', length: 'fling', intensity: 'low', archetype: { primary: 'BEAUTIFUL_RUIN' }, playerMask: 'OPEN_VEIN', loveInterest: 'Male', identity: { playerName: 'Mara', partnerName: 'Theo' } });
    Object.assign(s, {
      world: 'Modern', worldSubtype: 'small_town', flavor: 'SecondChance', dynamic: 'Friends',
      archetype: { primary: 'BEAUTIFUL_RUIN', modifier: null }, name: 'Mara', playerName: 'Mara',
      loveInterestName: 'Theo', partnerName: 'Theo', loveInterest: 'Male', liGender: 'male',
      playerMask: 'OPEN_VEIN', storyLength: 'fling', tier: 'fling',
      intensity: 'low', pov: 'first_person', identity: { playerName: 'Mara', partnerName: 'Theo' },
      renderMode: 'literary', currentEngine: 'literary', storyModality: 'literary',
      storyId, myUid: 'probe', _skipCorridorValidation: true
    });
    s.picks.identity = s.identity;

    // Scene 1 mounted through the PRODUCTION pagination API — no planner, no author (same
    // legitimate one-time-arrange pattern _literary_cascade_interruption.mjs uses).
    s.scenes = [{ title: '', synopsis: '', text: sceneText, fateCard: null }];
    window.StoryPagination.addPage((typeof window.formatStory === 'function') ? window.formatStory(sceneText) : ('<p>' + sceneText + '</p>'), true);
    try { window.showScreen('game'); } catch (_) {}
    const bc = document.getElementById('bookCoverPage'); if (bc) bc.classList.add('hidden');
    const ic = document.getElementById('bookInsideCover'); if (ic) ic.classList.add('hidden');
    const scEl = document.getElementById('storyContent'); if (scEl) scEl.classList.remove('hidden');

    // Honest one-time arrange: which branch of the gate this scenario tests (ST3, real gate
    // predicate — the same seeding pattern every harness in this repo uses to control which branch
    // it's testing).
    s.storyturn = 'ST3';
    s.turnCount = turnCount;
    s.intimacyTurnsInWindow = intimacyTurnsInWindow;
    s.contentMode = 'full';

    const gateScene = (typeof window.getMainPairIntimacyGateScene === 'function') ? null : null; // not exposed on window — read via console evidence instead
    return {
      storyturn: s.storyturn, turnCount: s.turnCount, intimacyTurnsInWindow: s.intimacyTurnsInWindow,
      subscribed: s.subscribed, access: s.access, fortunes: s.fortunes
    };
  }, { sceneText: SCENE1_TEXT, turnCount, intimacyTurnsInWindow, storyId });

  return { SCENE1_TEXT, seeded };
}

async function fillAndSubmit(page, action, dialogue) {
  await page.fill('#actionInput', action || '');
  await page.fill('#dialogueInput', dialogue || '');
  await page.click('#submitBtn');
}
async function waitForTurnSettled(page, timeoutMs = 45000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const done = await page.evaluate(() => {
      const sb = document.getElementById('submitBtn');
      return !!(sb && !sb.disabled && !sb.classList.contains('submitting'));
    });
    if (done) { await page.waitForTimeout(400); return true; }
    await page.waitForTimeout(500);
  }
  return false;
}

const GENERIC_FAIL_RX = /Fate stumbled|Story generation failed|Please try again/;
// reinterpretSafetyAction() itself logs this line (app.js ~102824) the instant it decides
// rewritten=true — the ONLY place this string is emitted. window.__disableSpeculativePreload is
// set true at seed time (below), which early-returns tryStartSpeculativePreload() (app.js ~307661)
// before it ever reaches the SPECULATIVE call to reinterpretSafetyAction (~307721) — so during
// this harness's turns the only call site that can produce this log is the real, non-speculative
// one inside the actual #submitBtn handler (~296278). This is ground truth straight from the
// function under test, not an inference from prompt text (which turned out to carry MULTIPLE
// 'author'-classified requests per turn — integration/control passes — and matching on prompt text
// alone was unreliable at telling the real render pass from an unrelated one).
const SAFETY_LOG_RX = /\[SAFETY_REWRITE\] (scandal_implication|embarrassment_metaphor|theatrical_mischief|social_chaos) \(deterministic\)\. Flavor: "([^"]*)"\. Input: "([^"]*)/;

async function runTurn(rig, page, label, action, dialogue) {
  const before = { subscribed: await page.evaluate(() => window.state.subscribed), turnCount: await page.evaluate(() => window.state.turnCount), pages: await page.evaluate(() => window.StoryPagination.getPageCount()) };
  const callsBefore = rig.calls.length;
  const logsBefore = rig.logs.length;
  await fillAndSubmit(page, action, dialogue);
  const settled = await waitForTurnSettled(page);
  await page.waitForTimeout(500);
  const after = { turnCount: await page.evaluate(() => window.state.turnCount), pages: await page.evaluate(() => window.StoryPagination.getPageCount()), storyturn: await page.evaluate(() => window.state.storyturn) };
  const turnCalls = rig.calls.slice(callsBefore);
  const allTextThisTurn = turnCalls.map(c => (c.sys || '') + '\n' + (c.usr || '')).join('\n---\n');
  const turnLogs = rig.logs.slice(logsBefore);
  const expectedInputPrefix = ((action || '') + ' ' + (dialogue || '')).slice(0, 40);
  const safetyLogLine = turnLogs.find(l => SAFETY_LOG_RX.test(l) && l.indexOf(expectedInputPrefix) !== -1);
  const marker = safetyLogLine ? safetyLogLine.match(SAFETY_LOG_RX) : null;
  const bodyText = await page.evaluate(() => document.body.textContent || '');
  const toastLog = await page.evaluate(() => window.__toastLog || []);
  const result = {
    label, settled, before, after,
    turnCountIncremented: after.turnCount === before.turnCount + 1,
    pageIncremented: after.pages === before.pages + 1,
    genericFailToast: toastLog.some(t => GENERIC_FAIL_RX.test(t)) || GENERIC_FAIL_RX.test(bodyText),
    pageErrorsThisTurn: rig.pageErrors.slice(),
    safetyRewrite: { rewritten: !!marker, category: marker ? marker[1] : null, directiveNonEmpty: !!marker, flavor: marker ? marker[2] : null },
    callKinds: turnCalls.map(c => c.kind),
    toastLog: toastLog.slice(),
    safetyLogLine: safetyLogLine || null,
    allSafetyLogsThisTurn: turnLogs.filter(l => /\[SAFETY_REWRITE\]/.test(l)),
    requestTextSample: allTextThisTurn.slice(0, 400),
    fullRequestText: allTextThisTurn
  };
  console.log('  [TURN:' + label + '] ' + JSON.stringify({ before, after, safetyRewrite: result.safetyRewrite, genericFailToast: result.genericFailToast, pageErrors: result.pageErrorsThisTurn.length, callKinds: result.callKinds }));
  return result;
}

// Both required real wordings, verbatim, in ONE submission (one Say/Do pair, one Submit click).
// FINDING (see final report): a "first kiss near-miss interrupt" milestone system (app.js
// buildIntimacyInterruptionDirective/latchIntimacyMilestone, ~103066-103107, entirely separate
// from reinterpretSafetyAction) latches state.intimacyInterrupted.first_kiss=true after ANY kiss
// attempt, and getMainPairIntimacyGateScene()'s milestone modifier then clamps
// gateScene = Math.min(origGate, turnCount) — which is ALWAYS >= the current turnCount the moment
// it's evaluated, so intimacyWindowOpen becomes true starting with the very NEXT submission after
// any kiss, regardless of how far below the original gate turnCount still is. Testing "kiss" then
// "touch" as two SEPARATE below-gate submissions is therefore not a two-branch test of the CLOSED
// window at all — the second submission always lands in the now-open window. Putting both required
// wordings into ONE real submission (one Say/Do pair, one Submit) avoids that confound while still
// typing both exact phrases from the spec, unavoided, through the real inputs.
const KISS_LINE = 'I lean in and kiss him.';
const TOUCH_LINE = 'I reach out and touch his arm, pulling him closer.';
const COMBINED_ACTION = KISS_LINE + ' ' + TOUCH_LINE;

// ─────────────────────────────────────────────────────────────────────────────────────────────
// GREEN A — window CLOSED (below the gate): storyLength 'fling' → gate=6 (app.js baseGates.fling,
// confirmed by reading the source — NOT 4, which was this control's own first mistake, corrected
// after the ground-truth console signal surfaced the discrepancy; see final report). turnCount
// seeded at 2, safely below 6, storyturn ST3 (isIntimacyAllowedAtCurrentStoryturn() true).
// ─────────────────────────────────────────────────────────────────────────────────────────────
{
  const rig = await newRig('A');
  await bootAndSeed(rig, { turnCount: 2, intimacyTurnsInWindow: 0, storyId: 'safetyfix-A-' + Math.random().toString(36).slice(2, 8) });
  const pre = await rig.page.evaluate(() => ({ text: (document.getElementById('storyContent') || {}).innerText || '', submitDisabled: !!(document.getElementById('submitBtn') || {}).disabled }));
  ok('A-PRE Scene 1 mounted, #submitBtn enabled, storyturn=ST3, turnCount=2 (below fling\'s gate of 6)', pre.text.indexOf('The hall had been quiet') !== -1 && !pre.submitDisabled, JSON.stringify(pre));

  const a1 = await runTurn(rig, rig.page, 'A1-kiss+touch', COMBINED_ACTION, '');
  ok('A1 KISS+TOUCH below the gate (both required real wordings, one real submission): no uncaught exception, no generic failure toast, safetyRewrite fired (rewritten=true, category one of the four named categories, directive non-empty), scene rendered (turnCount+1, page+1)',
    a1.settled && a1.pageErrorsThisTurn.length === 0 && !a1.genericFailToast && a1.safetyRewrite.rewritten && /^(scandal_implication|embarrassment_metaphor|theatrical_mischief|social_chaos)$/.test(a1.safetyRewrite.category) && a1.safetyRewrite.directiveNonEmpty && a1.turnCountIncremented && a1.pageIncremented,
    JSON.stringify(a1));

  fs.writeFileSync('_validate_out/reinterpret_safety_scope_fix.greenA.log', rig.logs.join('\n'));
  console.log('=== GREEN A console tail === ' + JSON.stringify(rig.logs.filter(l => /reinterpret|SAFETY|ReferenceError/i.test(l)).slice(-10)));
  console.log('=== GREEN A network evidence (turn A1 request text sample) === ' + a1.requestTextSample);
  await rig.browser.close();
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// GREEN B — window OPEN (at/above the gate, main-pair authorized): storyLength 'fling' → gate=6.
// turnCount seeded at 6 (>= gate). mainPairAuthorized needs intimacyWindowOpen && (playerInitiated
// || intimacyTurnsInWindow>=2) — the real kiss/touch wording itself sets playerInitiated=true via
// detectPlayerInitiation, so no turnsInWindow pre-seeding is needed to satisfy it; starting
// intimacyTurnsInWindow at 0 (honest, not gamed) and letting the real wording carry it.
// ─────────────────────────────────────────────────────────────────────────────────────────────
{
  const rig = await newRig('B');
  await bootAndSeed(rig, { turnCount: 6, intimacyTurnsInWindow: 0, storyId: 'safetyfix-B-' + Math.random().toString(36).slice(2, 8) });
  const pre = await rig.page.evaluate(() => ({ text: (document.getElementById('storyContent') || {}).innerText || '', submitDisabled: !!(document.getElementById('submitBtn') || {}).disabled }));
  ok('B-PRE Scene 1 mounted, #submitBtn enabled, storyturn=ST3, turnCount=6 (at fling\'s gate of 6)', pre.text.indexOf('The hall had been quiet') !== -1 && !pre.submitDisabled, JSON.stringify(pre));

  const b1 = await runTurn(rig, rig.page, 'B1-kiss+touch', COMBINED_ACTION, '');
  ok('B1 KISS+TOUCH at/after the gate (both required real wordings, one real submission): no uncaught exception, no generic failure toast, safetyRewrite is PASS-THROUGH (rewritten=false — mainPairAuthorized via the real wording\'s own playerInitiated), scene rendered normally',
    b1.settled && b1.pageErrorsThisTurn.length === 0 && !b1.genericFailToast && !b1.safetyRewrite.rewritten && b1.turnCountIncremented && b1.pageIncremented,
    JSON.stringify(b1));

  // Corroborate mainPairAuthorized specifically fired (not just intimacyWindowOpen) via the
  // INTIMACY AUTHORIZED prompt line that only appears when mainPairAuthorized is true (app.js
  // ~296420-296421).
  const authorizedLineSeen = /INTIMACY AUTHORIZED: The player has initiated physical escalation/.test(b1.fullRequestText || '');
  ok('B2 mainPairAuthorized (not just intimacyWindowOpen) actually fired: the "INTIMACY AUTHORIZED" prompt line is present in the outbound request text', authorizedLineSeen, 'seen in b1 request text: ' + authorizedLineSeen);

  fs.writeFileSync('_validate_out/reinterpret_safety_scope_fix.greenB.log', rig.logs.join('\n'));
  console.log('=== GREEN B console tail === ' + JSON.stringify(rig.logs.filter(l => /reinterpret|SAFETY|ReferenceError|INTIMACY/i.test(l)).slice(-10)));
  console.log('=== GREEN B network evidence (turn B1 request text sample) === ' + b1.requestTextSample);
  await rig.browser.close();
}

const fails = rows.filter(r => !r[1]).map(r => r[0]);
console.log(`\nREINTERPRET SAFETY SCOPE FIX: ${rows.length} rows · ${rows.length - fails.length} passed · ${fails.length} failed` + (fails.length ? ' → ' + fails.join(' | ') : ''));
process.exit(fails.length ? 1 : 0);
