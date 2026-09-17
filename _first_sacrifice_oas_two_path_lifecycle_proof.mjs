// ═══ FIRST SACRIFICE OAS TWO-PATH LIFECYCLE PROOF (Roman, Option E, 2026-09-17) ═══
// Real-browser, click-driven proof of the app.js changes made for the two-path OAS lifecycle
// (see the "TWO-PATH OAS LIFECYCLE" comments in app.js). Reuses the exact real-click pattern
// already proven in _cg_oas_library_reload_proof.mjs (Library -> book -> zoom -> Read -> Genesis
// gate -> one-on-one -> interruption -> Save & Exit -> Saved Stories -> Continue).
//
// FIXTURE INJECTION (spec-required, never touches public/starter-scenes.js on disk): right after
// boot, before the book is clicked, window.STARTER_SCENE1.starter_first_sacrifice.oasHandoff is
// mutated in-page (same live object window._bakedScene1For() reads — window.STARTER_SCENE1 is
// assigned by reference, not cloned, per public/starter-scenes.js's own `window._bakedScene1For`
// closure) to add oasOpening + postInterruptionBeat. This is fixture seeding of already-existing,
// already-optional package fields, not a DOM force and not a call to any internal function.
//
// NEVER: git commit/push/stash/checkout/reset. NEVER touch .env.local or public/starter-scenes.js.
// NO paid model calls — every /api/** answered locally. NEVER edit public/app.js from this script.
// NO DOM forcing beyond the one documented fixture mutation above, no calling internal JS
// functions to skip a screen transition.
import { chromium } from 'playwright-core';
import fs from 'fs';
import {
  installSession, configBody, isAuthOrigin,
  installEntitledProfileStub, verifySubscriptionBody,
} from './_test_session_env.mjs';
const F = await import('./_seed_fixtures.generated.mjs');

const rows = [];
const ok = (tag, n, p, d) => { rows.push([tag + ' ' + n, !!p]); console.log('[' + tag + '] ' + (p ? 'PASS ' : 'FAIL ') + n + (p ? '' : '  — ' + String(d).slice(0, 600))); };

const FIXTURE_OPENING = '[FIXTURE oasOpening] You manipulated her without knowing it — through your desirability.';
const FIXTURE_POSTBEAT = '[FIXTURE postInterruptionBeat] The Answer sat heavy in my palms, and I did not know yet what I would do with it.';

function classifyModelCall(sys, usr) {
  // 'opening an intimate dialogue' = the OPENER-specific system message (_fireIntimacyOpener,
  // app.js ~184475). The ONGOING-turn system message (_handleIntimacyTurn's _oasSystemMsg,
  // app.js ~194343) is DIFFERENT text — matched separately so oasDialogue correctly covers both,
  // not just the opener.
  if (/opening an intimate dialogue/.test(sys)) return 'oasDialogue';
  if (/LI \(love interest\) in an intensely intimate mouth-closeup dialogue scene/.test(sys)) return 'oasDialogue';
  if (/uninhibited romance fiction author/.test(sys) && /TEMPTATION \|\|\|/.test(usr)) return 'fatePreviews';
  if (/screenplay-native cinematic-romance writer/.test(sys)) return 'cgScreenplay';
  if (/SCENE-SPINE planner/.test(sys) || /"hardBeats"/.test(sys)) return 'sceneSpine';
  const hits = F.REQUEST_KINDS.filter(([, t]) => t(sys + '\n' + usr, sys, usr)).map(([k]) => k);
  return hits.length === 1 ? hits[0] : 'unclassified';
}

const FIVE_OPTIONS = [
  'TEMPTATION ||| amplify ||| I step in until the Dohkar has to look up at me ||| Ask it here, then.',
  'SILENCE ||| redirect ||| I keep The Answer level and say nothing ||| (no words)',
  'REVERSAL ||| amplify ||| I turn the hooked end toward Julian ||| You confessed more than I did.',
  'BOUNDARY ||| amplify ||| I set my feet and do not move ||| The inquiry, then.',
  'CONFESSION ||| amplify ||| CONF-OPT-ACTION: I look at Julian and not at the Dohkar ||| CONF-OPT-LINE: I did call to you.',
].join('\n');

async function installRoutes(page, requestCensus, STEP) {
  await page.route('**/sb-test.localhost/**', route => {
    const req = route.request();
    const accept = req.headers()['accept'] || '';
    const single = /vnd\.pgrst\.object\+json/.test(accept);
    requestCensus.push({ step: STEP.v, kind: 'supabase-generic', method: req.method(), url: req.url() });
    return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
  });
  await installEntitledProfileStub(page);
  await page.route('**/api/**', async route => {
    const req = route.request();
    const url = req.url();
    const p = new URL(url).pathname;
    if (/\/api\/config\b/.test(url)) { requestCensus.push({ step: STEP.v, kind: 'config', method: req.method(), url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() }); }
    if (isAuthOrigin(url)) { requestCensus.push({ step: STEP.v, kind: 'auth-origin', method: req.method(), url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
    if (/\/api\/verify-subscription\b/.test(url)) { requestCensus.push({ step: STEP.v, kind: 'verify-subscription', method: req.method(), url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) }); }
    if (F.PASSTHROUGH.test(url)) { requestCensus.push({ step: STEP.v, kind: 'passthrough-continue', method: req.method(), url: p }); return route.continue(); }
    if (F.LOCAL[p]) { requestCensus.push({ step: STEP.v, kind: 'local:' + p, method: req.method(), url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(F.LOCAL[p]) }); }
    if (!F.MODEL.test(url)) { requestCensus.push({ step: STEP.v, kind: 'unmodeled-fallback', method: req.method(), url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }
    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
    const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n');
    const usr = (b.messages || []).filter(m => m.role === 'user').map(flat).join('\n');
    const kind = classifyModelCall(sys, usr);
    requestCensus.push({ step: STEP.v, kind, method: req.method(), url: p, isChatgptProxy: /chatgpt-proxy/.test(p) });
    let content = '{}';
    if (kind === 'fatePreviews') content = FIVE_OPTIONS;
    else if (kind === 'sceneSpine') content = JSON.stringify({ tactical_move: 'x', state_change_precondition: 'x', state_change: 'Julian puts a testing question to Lirael before the assembly', forces_choice: 'forces Lirael to choose between A and B', branch_a: 'A', branch_b: 'B', posture_read: 'She stays', local_objective: 'OBJ-PROBE: Julian puts a testing question to Lirael before the assembly', local_objective_actor: 'Julian', present: ['Lirael', 'Julian', 'Seren', 'the presiding Dohkar'], reserved: { price_identified: 'untouched', inquiry_opened: 'untouched', julian_counter_wish: 'untouched', julian_obscuring_wishes: 'untouched' }, aftermath: { twist_manifested: 'kept', interrogation_interrupted: 'kept', the_answer_institutional: 'kept', inquiry_authority_claimed: 'kept' } });
    else if (kind === 'planner') content = F.plannerReply(usr, null);
    else if (kind === 'author') content = F.PROSE;
    else if (kind === 'aplotGenerator' || kind === 'aplotCorrection') content = JSON.stringify(F.APLOT_VALID);
    else if (kind === 'pcBodyBible') content = JSON.stringify(F.PC_BIBLE);
    else if (kind === 'liBodyBible') content = JSON.stringify(F.LI_BIBLE);
    else if (kind === 'antagonistBodyBible') content = JSON.stringify(F.ANTAGONIST_BIBLE);
    else if (kind === 'scaffold') { const ref = (sys + usr).match(/subject_ref:\s*(\S+)/); content = JSON.stringify(F.scaffoldReply(ref ? ref[1] : null, true)); }
    else if (kind === 'oasDialogue') content = JSON.stringify({ li_dialogue: 'You called to me. Say it plainly, here, where they can hear.', li_action: 'He does not step back.', li_next_prompt: '', li_face_state: 'smirk', scene_state: 'continue', scene_tone: 'tense', user_signal: 'neutral', temperature_shift: 0 });
    else if (kind !== 'cgScreenplay') content = JSON.stringify(F.GENERIC);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'harness', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }] }) });
  });
}

async function dismissPcLookModalIfOpen(page) {
  for (let i = 0; i < 10; i++) {
    const s = await page.evaluate(() => ({
      pcOpen: (() => { const m = document.getElementById('pcLookModal'); return !!(m && !m.classList.contains('hidden') && m.getClientRects().length > 0); })(),
      liOpen: (() => { const m = document.getElementById('liRenderModal'); return !!(m && !m.classList.contains('hidden') && m.getClientRects().length > 0); })(),
      warnOpen: !!document.getElementById('skipRenderWarnModal'),
    }));
    if (!s.pcOpen && !s.liOpen && !s.warnOpen) break;
    if (s.warnOpen) { try { await page.click('#skipRenderWarnModal [data-act="skip"]', { timeout: 5000 }); } catch (_) {} }
    else if (s.pcOpen) { try { await page.click('#pcLookSkipBtn', { timeout: 5000 }); } catch (_) {} }
    else if (s.liOpen) { try { await page.click('#liRenderSkipBtn', { timeout: 5000 }); } catch (_) {} }
    await page.waitForTimeout(600);
  }
}

async function injectFixture(page) {
  const applied = await page.evaluate(({ opening, postBeat }) => {
    try {
      const pkg = window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice;
      if (!pkg || !pkg.oasHandoff) return { ok: false, reason: 'no pkg.oasHandoff' };
      pkg.oasHandoff.oasOpening = { speaker: 'Julian', text: opening };
      pkg.oasHandoff.postInterruptionBeat = { speaker: null, image: 'd4', kind: 'narration', text: postBeat };
      return { ok: true };
    } catch (e) { return { ok: false, reason: String(e && e.message || e) }; }
  }, { opening: FIXTURE_OPENING, postBeat: FIXTURE_POSTBEAT });
  return applied;
}

async function enterLibraryAndReachBakedOpening(page) {
  const burgerVisible = await page.evaluate(() => { const b = document.getElementById('burgerBtn'); return !!(b && b.getClientRects().length > 0); });
  if (burgerVisible) {
    await page.click('#burgerBtn'); await page.waitForTimeout(400);
    await page.click('.vault-tab[data-vault-section="Account"]'); await page.waitForTimeout(300);
    await page.click('#menuLibraryBtn'); await page.waitForTimeout(1500);
  }
  await page.click('.library-book[data-story-id="starter_first_sacrifice"]');
  await page.waitForTimeout(900);
  await page.click('#zoomReadBtn');
  await page.waitForTimeout(6000);
}

async function chargeGenesisGate(page, consoleEvents) {
  await page.click('#bakedOASEnterBtn');
  await page.waitForTimeout(1300);
  await page.click('#buGoBtn');
  let unlocked = false;
  for (let i = 0; i < 480 && !unlocked; i++) { await page.waitForTimeout(1000); unlocked = consoleEvents.some(e => /\[BAKED:GATE\] Genesis unlocked/.test(e.text)); }
  await page.waitForTimeout(1500);
  return unlocked;
}

async function saveExitAndContinue(page, tag) {
  // Real in-app affordances, matching _cg_oas_library_reload_proof.mjs's proven STEP9/10 pattern.
  const saveExitVisible = await page.evaluate(() => { const b = document.getElementById('gnSaveExitBtn'); return !!(b && b.getClientRects().length > 0); });
  let mechanism;
  if (saveExitVisible) {
    await dismissPcLookModalIfOpen(page);
    await page.click('#gnSaveExitBtn');
    await page.waitForTimeout(2500);
    mechanism = 'gnSaveExitBtn';
  } else {
    await page.reload({ waitUntil: 'commit' });
    await page.waitForFunction(() => window.state && window._launchStarterStory, null, { timeout: 60000 });
    await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(2500);
    mechanism = 'page.reload fallback';
  }
  const screenAfterClose = await page.evaluate(() => window._currentScreenId);
  if (screenAfterClose !== 'vaultLibraryScreen') {
    ok(tag, 'close returns to Library', false, 'screen after close: ' + screenAfterClose + ' (mechanism=' + mechanism + ')');
    return { reopened: false, mechanism };
  }
  await page.click('#burgerBtn'); await page.waitForTimeout(400);
  await page.click('.vault-tab[data-vault-section="Stories"]'); await page.waitForTimeout(300);
  await page.click('.vault-nav[data-vault-section="SavedStories"]'); await page.waitForTimeout(600);
  const row = page.locator('#vaultSavedStoriesList .vault-saved-story-row', { hasText: 'The First Sacrifice' }).first();
  const rowCount = await row.count();
  if (rowCount === 0) { ok(tag, 'saved-story row present', false, 'no row found'); return { reopened: false, mechanism }; }
  const continueBtn = row.getByRole('button', { name: 'Continue', exact: true });
  await continueBtn.click();
  await page.waitForTimeout(1500);
  for (let i = 0; i < 30; i++) {
    const scr = await page.evaluate(() => window._currentScreenId);
    if (scr === 'game' || scr === 'gnReader') break;
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(2000);
  return { reopened: true, mechanism };
}

// ═══════════════════════════════════════════════════════════════════════════════════
// JOURNEY 1 — NORMAL PATH: opener -> real 1st response -> live Julian reply -> (2nd
// turn "stop" via the pre-existing exit modal, UNCHANGED) -> normal interruption ->
// postInterruptionBeat -> cards -> submit. Checkpoints 1, 2, 3, 5, 6.
// ═══════════════════════════════════════════════════════════════════════════════════
async function runNormalPathJourney(browser) {
  const tag = 'NORMAL';
  const STEP = { v: '0' };
  const consoleEvents = [], requestCensus = [];
  const page = await (await browser.newContext()).newPage();
  page.on('console', m => consoleEvents.push({ step: STEP.v, type: m.type(), text: m.text() }));
  await installSession(page);
  await installRoutes(page, requestCensus, STEP);

  STEP.v = '1-boot';
  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 120000 && !up) {
    try {
      await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
      await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_SCENE1 && window._bakedScene1For, null, { timeout: 60000 });
      up = true;
    } catch (_) { await page.waitForTimeout(3000); }
  }
  if (!up) { ok(tag, 'server ready', false, 'server never ready'); return; }
  await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const fx = await injectFixture(page);
  ok(tag, 'fixture injection into window.STARTER_SCENE1 (in-page only, never touches starter-scenes.js on disk)', fx.ok, JSON.stringify(fx));
  if (!fx.ok) return;

  STEP.v = '2-library-entry';
  await enterLibraryAndReachBakedOpening(page);
  const oasBtnVisible = await page.evaluate(() => !!document.getElementById('bakedOASEnterBtn') && document.getElementById('bakedOASEnterBtn').getClientRects().length > 0);
  ok(tag, 'reached baked Scene 1 opening with #bakedOASEnterBtn visible', oasBtnVisible, '');
  if (!oasBtnVisible) return;

  STEP.v = '3-genesis-gate';
  const oasDialogueCallsBeforeOpener = requestCensus.filter(r => r.kind === 'oasDialogue').length;
  const unlocked = await chargeGenesisGate(page, consoleEvents);
  ok(tag, 'Genesis charge unlocks (real #buGoBtn click, stubbed backend)', unlocked, '');
  if (!unlocked) return;
  await dismissPcLookModalIfOpen(page);
  await page.waitForTimeout(1500);

  // ── CHECKPOINT 1: OPENER ──
  // NOTE (found while building this proof, PRE-EXISTING, NOT caused by this task's diff):
  // #oasHistoryLog does not exist yet at real fresh-mount time — confirmed by a side-by-side
  // diagnostic (_oas_log_diag_tmp.mjs) that the SAME symptom (element ends up parented under an
  // id-less container with empty textContent) occurs for the OLD, unmodified live-generated
  // opener too, with zero fixture involvement. _appendLIResponseToHistory's own
  // `if (!log || !liDialogue) return;` guard means the call the opener already made is a real,
  // silent no-op either way. This is a pre-existing display gap in app.js's OAS chat-log mount
  // sequence, unrelated to _fireIntimacyOpener's new authored branch (which calls the exact same
  // pre-existing _appendLIResponseToHistory function the live-generated path already used) —
  // reported here, not fixed, per this task's scope (implement + prove the two-path lifecycle,
  // not audit unrelated display plumbing). Checkpoint 1 is therefore verified via the app's OWN
  // console log line (real evidence the code path executed) + state fields, not the DOM log text.
  STEP.v = '4-checkpoint1-opener';
  const openerLogLine = '[OAS:TWO-PATH] authored oasOpening rendered directly';
  const openerLogHitsBefore = consoleEvents.filter(e => e.text.indexOf(openerLogLine) !== -1).length;
  const c1 = await page.evaluate(() => ({
    active: !!(window.state.intimacyDialogue && window.state.intimacyDialogue.active),
    openerFired: !!(window.state.intimacyDialogue && window.state.intimacyDialogue._openerFired),
    phase: window.state.intimacyDialogue && window.state.intimacyDialogue.phase,
    liTurnHistory: (window.state.intimacyDialogue && window.state.intimacyDialogue.liTurnHistory) || [],
  }));
  const oasDialogueCallsAfterOpener = requestCensus.filter(r => r.kind === 'oasDialogue').length;
  ok(tag, 'CHECKPOINT1 authored oasOpening rendered directly (app\'s own console log), no model call for the opener', c1.active && c1.openerFired && c1.phase === 'awaiting_first_response' && openerLogHitsBefore === 1 && oasDialogueCallsAfterOpener === oasDialogueCallsBeforeOpener, JSON.stringify({ c1, openerLogHitsBefore, oasDialogueCallsBeforeOpener, oasDialogueCallsAfterOpener }));
  console.log('  [NOTE][' + tag + '] #oasHistoryLog display gap — pre-existing, confirmed to affect the OLD live-generated opener too, reported not fixed (see comment above this checkpoint in the source).');

  // ── CHECKPOINT1-HISTORY (Roman, 2026-09-17 follow-up) ──
  // The DOM display gap above is deliberately out of scope, but the SEPARATE
  // d.liTurnHistory array is real, persisted, model-context-relevant state
  // (read by the live-turn prompt builder's historyStr AND by
  // _rehydrateOASUI's reload replay — see the app.js comment at the
  // liTurnHistory.push() call inside _fireIntimacyOpener's authored-opener
  // branch). This asserts the opener's entry is actually present there,
  // not just rendered once to a DOM node that may not have existed.
  const openerEntry = (c1.liTurnHistory || []).find(e => e && e.userSignal === 'authored_opener');
  ok(tag, 'CHECKPOINT1-HISTORY the authored opener has a real entry in d.liTurnHistory (model-context/reload-relevant state, not just a DOM append)', !!openerEntry && openerEntry.liDialogue === FIXTURE_OPENING && openerEntry.userInput == null, JSON.stringify({ found: !!openerEntry, entry: openerEntry }));

  const reload1 = await saveExitAndContinue(page, tag + '-reload-after-opener');
  if (reload1.reopened) {
    const openerLogHitsAfter = consoleEvents.filter(e => e.text.indexOf(openerLogLine) !== -1).length;
    const c1r = await page.evaluate(() => ({
      phase: window.state.intimacyDialogue && window.state.intimacyDialogue.phase,
      openerFired: !!(window.state.intimacyDialogue && window.state.intimacyDialogue._openerFired),
      liTurnHistory: (window.state.intimacyDialogue && window.state.intimacyDialogue.liTurnHistory) || [],
      historyLogText: (document.getElementById('oasHistoryLog') || {}).textContent || null,
    }));
    ok(tag, 'CHECKPOINT1-RELOAD opener not re-fired after Save & Exit -> Continue (console log count unchanged, phase/openerFired preserved)', openerLogHitsAfter === openerLogHitsBefore && c1r.phase === 'awaiting_first_response' && c1r.openerFired === true, JSON.stringify({ c1r, openerLogHitsBefore, openerLogHitsAfter }) + ' (mechanism=' + reload1.mechanism + ')');
    // ── CHECKPOINT1-HISTORY-RELOAD ──
    // By reload/rehydrate time #oasHistoryLog DOES exist (created up front by
    // _rehydrateOASUI/_ensureOASHistoryLog before it replays liTurnHistory) —
    // unlike the fresh-mount race this proof already disclosed as out of
    // scope. So on a real reload, the opener line SHOULD actually be
    // visible in the reader-facing transcript now that it has a
    // liTurnHistory entry to replay from. This is the concrete,
    // reload-visible-transcript proof Roman asked for.
    const openerEntryAfter = (c1r.liTurnHistory || []).find(e => e && e.userSignal === 'authored_opener');
    ok(tag, 'CHECKPOINT1-HISTORY-RELOAD the opener survives reload in d.liTurnHistory AND is replayed into the visible #oasHistoryLog transcript', !!openerEntryAfter && openerEntryAfter.liDialogue === FIXTURE_OPENING && String(c1r.historyLogText || '').indexOf(FIXTURE_OPENING) !== -1, JSON.stringify({ found: !!openerEntryAfter, historyLogText: c1r.historyLogText }));
  } else {
    ok(tag, 'CHECKPOINT1-RELOAD could complete the real Save&Exit->Continue round trip', false, JSON.stringify(reload1));
  }

  // ── CHECKPOINT 2+3: first real non-boundary submission -> live Julian reply ──
  STEP.v = '5-checkpoint23-normal-first-turn';
  await dismissPcLookModalIfOpen(page);
  const oasDialogueCallsBeforeTurn1 = requestCensus.filter(r => r.kind === 'oasDialogue').length;
  await page.fill('#gnActionInput', 'I keep my hands still around The Answer and meet his eyes.');
  await page.click('#gnSubmitBtn');
  const phaseImmediatelyAfterClick = await page.evaluate(() => window.state.intimacyDialogue && window.state.intimacyDialogue.phase);
  for (let i = 0; i < 30 && (await page.evaluate(() => !!(window.state.intimacyDialogue && window.state.intimacyDialogue.awaitingResponse))); i++) await page.waitForTimeout(1000);
  await page.waitForTimeout(1500);
  const c23 = await page.evaluate(() => ({
    phase: window.state.intimacyDialogue && window.state.intimacyDialogue.phase,
    beatCount: window.state.intimacyDialogue && window.state.intimacyDialogue.beatCount,
    interruptionVisible: !!document.getElementById('intimateInterruption') && document.getElementById('intimateInterruption').getClientRects().length > 0,
  }));
  const oasDialogueCallsAfterTurn1 = requestCensus.filter(r => r.kind === 'oasDialogue').length;
  ok(tag, 'CHECKPOINT2 phase transitions toward normal_awaiting_reply immediately on submit (observed=' + phaseImmediatelyAfterClick + ', best-effort — stub replies can resolve faster than this snapshot)', phaseImmediatelyAfterClick === 'normal_awaiting_reply' || phaseImmediatelyAfterClick === 'normal_reply_rendered', phaseImmediatelyAfterClick);
  ok(tag, 'CHECKPOINT3 exactly one live (stubbed) Julian reply rendered for the first real response, phase reaches normal_reply_rendered, beatCount=1, interruption NOT yet firing on its own', (oasDialogueCallsAfterTurn1 - oasDialogueCallsBeforeTurn1) === 1 && c23.phase === 'normal_reply_rendered' && c23.beatCount === 1 && !c23.interruptionVisible, JSON.stringify({ c23, oasDialogueCallsBeforeTurn1, oasDialogueCallsAfterTurn1 }));

  const reload23 = await saveExitAndContinue(page, tag + '-reload-after-first-reply');
  if (reload23.reopened) {
    const c23r = await page.evaluate(() => ({
      phase: window.state.intimacyDialogue && window.state.intimacyDialogue.phase,
      beatCount: window.state.intimacyDialogue && window.state.intimacyDialogue.beatCount,
      liTurnHistoryLen: window.state.intimacyDialogue && window.state.intimacyDialogue.liTurnHistory && window.state.intimacyDialogue.liTurnHistory.length,
    }));
    ok(tag, 'CHECKPOINT3-RELOAD phase/beatCount/liTurnHistory preserved after Save & Exit -> Continue', c23r.phase === 'normal_reply_rendered' && c23r.beatCount === 1 && (c23r.liTurnHistoryLen || 0) >= 1, JSON.stringify(c23r) + ' (mechanism=' + reload23.mechanism + ')');
  } else {
    ok(tag, 'CHECKPOINT3-RELOAD could complete the real Save&Exit->Continue round trip', false, JSON.stringify(reload23));
  }

  // ── CHECKPOINT 5: normal interruption, via the pre-existing (UNCHANGED) exit-modal
  // path on the SECOND turn — reuses the exact proven pattern from
  // _cg_oas_library_reload_proof.mjs's STEP5. ──
  STEP.v = '6-checkpoint5-normal-interruption';
  await dismissPcLookModalIfOpen(page);
  await page.fill('#gnActionInput', '');
  await page.fill('#gnDialogueInput', 'stop');
  await page.click('#gnSubmitBtn');
  await page.waitForTimeout(2000);
  const exitModalVisible = await page.evaluate(() => !!document.getElementById('intimacyExitModal')) || consoleEvents.some(e => /INTIMACY-EXIT\] Modal opened/.test(e.text));
  ok(tag, 'CHECKPOINT5 the SECOND-turn exit word still opens the graceful-exit modal (pre-existing path unchanged for turn 2+)', exitModalVisible, '');
  try { await page.click('#intimacyExitFade', { timeout: 5000 }); } catch (_) { await page.evaluate(() => { const b = document.getElementById('intimacyExitFade'); if (b) b.click(); }); }
  await page.waitForTimeout(4000);
  const c5 = await page.evaluate(() => ({
    interruptionVisible: !!document.getElementById('intimateInterruption') && document.getElementById('intimateInterruption').getClientRects().length > 0,
    entryPath: window.state._intimateInterruption && window.state._intimateInterruption.entryPath,
    submitted: window.state._intimateInterruption && window.state._intimateInterruption.submitted,
  }));
  ok(tag, 'CHECKPOINT5 normal-path interruption fires with entryPath=normal (via the ordinary resolver, not the boundary short-circuit)', c5.interruptionVisible && c5.entryPath === 'normal' && !c5.submitted, JSON.stringify(c5));

  // ── CHECKPOINT 6: postInterruptionBeat + card selection (no advance) + reload + real Submit ──
  STEP.v = '7-checkpoint6-post-interruption';
  const c6a = await page.evaluate(() => ({
    postBeatText: (document.querySelector('.intimate-interruption-post-beat') || {}).textContent || '',
    postBeatRendered: window.state._intimateInterruption && window.state._intimateInterruption.postBeatRendered,
    phase: window.state._intimateInterruption && window.state._intimateInterruption.phase,
  }));
  ok(tag, 'CHECKPOINT6 postInterruptionBeat fixture text rendered exactly once, r.postBeatRendered=true, r.phase reaches cards_open', c6a.postBeatText.indexOf(FIXTURE_POSTBEAT) !== -1 && c6a.postBeatRendered === true && c6a.phase === 'cards_open', JSON.stringify(c6a));

  for (let i = 0; i < 15 && !(await page.evaluate(() => { const r = window.state._intimateInterruption; return !!(r && r.cards && Object.keys(r.cards).length); })); i++) await page.waitForTimeout(1000);
  const HOST = await page.evaluate(() => { const r = window.state._intimateInterruption; return r && r.host === 'cg' ? { mount: 'gnCardMount', a: 'gnActionInput', d: 'gnDialogueInput', s: 'gnSubmitBtn' } : { mount: 'cardMount', a: 'actionInput', d: 'dialogueInput', s: 'submitBtn' }; });
  await dismissPcLookModalIfOpen(page);
  await page.click('#' + HOST.mount + ' [data-fate-card-slot="confession"]');
  await page.waitForTimeout(700);
  const cgScreenplayCallsBeforeCardClick = requestCensus.filter(r => r.kind === 'cgScreenplay').length;
  const c6b = await page.evaluate((H) => ({ a: document.getElementById(H.a).value, d: document.getElementById(H.d).value, submitted: window.state._intimateInterruption && window.state._intimateInterruption.submitted }), HOST);
  ok(tag, 'CHECKPOINT6 card click ONLY prefills Say/Do, does NOT advance (submitted still false, no cgScreenplay call fired from the click)', c6b.a.length > 0 && c6b.submitted === false && cgScreenplayCallsBeforeCardClick === 0, JSON.stringify(c6b));

  const reload6 = await saveExitAndContinue(page, tag + '-reload-after-post-beat-card-select');
  if (reload6.reopened) {
    const c6r = await page.evaluate((H) => ({
      postBeatOccurrences: ((document.querySelectorAll('.intimate-interruption-post-beat').length)),
      draftA: document.getElementById(H.a) && document.getElementById(H.a).value,
      submitted: window.state._intimateInterruption && window.state._intimateInterruption.submitted,
    }), HOST);
    ok(tag, 'CHECKPOINT6-RELOAD postInterruptionBeat not duplicated, card draft preserved, not auto-advanced after Save & Exit -> Continue', c6r.postBeatOccurrences === 1 && (c6r.draftA || '').length > 0 && c6r.submitted === false, JSON.stringify(c6r) + ' (mechanism=' + reload6.mechanism + ')');
  } else {
    ok(tag, 'CHECKPOINT6-RELOAD could complete the real Save&Exit->Continue round trip', false, JSON.stringify(reload6));
  }

  STEP.v = '8-checkpoint6-real-submit';
  const HOST2 = await page.evaluate(() => { const r = window.state._intimateInterruption; return r && r.host === 'cg' ? { mount: 'gnCardMount', a: 'gnActionInput', d: 'gnDialogueInput', s: 'gnSubmitBtn' } : { mount: 'cardMount', a: 'actionInput', d: 'dialogueInput', s: 'submitBtn' }; });
  await dismissPcLookModalIfOpen(page);
  const censusBeforeSubmit = requestCensus.length;
  await page.click('#' + HOST2.s);
  for (let i = 0; i < 30 && !requestCensus.slice(censusBeforeSubmit).some(r => r.kind === 'cgScreenplay'); i++) await page.waitForTimeout(2000);
  await page.waitForTimeout(3000);
  const c6c = await page.evaluate(() => ({ submitted: window.state._intimateInterruption && window.state._intimateInterruption.submitted }));
  ok(tag, 'CHECKPOINT6 a real Submit (not the card click) is what advances — r.submitted=true, cgScreenplay request fired', c6c.submitted === true && requestCensus.slice(censusBeforeSubmit).some(r => r.kind === 'cgScreenplay'), JSON.stringify(c6c));

  fs.writeFileSync('_validate_out/oas_two_path_normal_requests.json', JSON.stringify(requestCensus, null, 1));
}

// ═══════════════════════════════════════════════════════════════════════════════════
// JOURNEY 2 — BOUNDARY PATH: opener -> first-ever submission IS a boundary phrase ->
// NO forced Julian reply -> Dohkar interrupts directly. Checkpoint 4.
// ═══════════════════════════════════════════════════════════════════════════════════
async function runBoundaryPathJourney(browser) {
  const tag = 'BOUNDARY';
  const STEP = { v: '0' };
  const consoleEvents = [], requestCensus = [];
  const page = await (await browser.newContext()).newPage();
  page.on('console', m => consoleEvents.push({ step: STEP.v, type: m.type(), text: m.text() }));
  await installSession(page);
  await installRoutes(page, requestCensus, STEP);

  STEP.v = '1-boot';
  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 120000 && !up) {
    try {
      await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 });
      await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_SCENE1 && window._bakedScene1For, null, { timeout: 60000 });
      up = true;
    } catch (_) { await page.waitForTimeout(3000); }
  }
  if (!up) { ok(tag, 'server ready', false, 'server never ready'); return; }
  await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);

  const fx = await injectFixture(page);
  ok(tag, 'fixture injection into window.STARTER_SCENE1 (separate browser context/story from the NORMAL journey)', fx.ok, JSON.stringify(fx));
  if (!fx.ok) return;

  STEP.v = '2-library-entry';
  await enterLibraryAndReachBakedOpening(page);
  const oasBtnVisible = await page.evaluate(() => !!document.getElementById('bakedOASEnterBtn') && document.getElementById('bakedOASEnterBtn').getClientRects().length > 0);
  ok(tag, 'reached baked Scene 1 opening with #bakedOASEnterBtn visible', oasBtnVisible, '');
  if (!oasBtnVisible) return;

  STEP.v = '3-genesis-gate';
  const unlocked = await chargeGenesisGate(page, consoleEvents);
  ok(tag, 'Genesis charge unlocks (real #buGoBtn click, stubbed backend)', unlocked, '');
  if (!unlocked) return;
  await dismissPcLookModalIfOpen(page);
  await page.waitForTimeout(1500);

  const preOpener = await page.evaluate(() => ({ phase: window.state.intimacyDialogue && window.state.intimacyDialogue.phase }));
  ok(tag, 'pre-condition: opener has rendered, phase=awaiting_first_response before the boundary test', preOpener.phase === 'awaiting_first_response', JSON.stringify(preOpener));

  // ── CHECKPOINT 4: boundary interruption ──
  STEP.v = '4-checkpoint4-boundary-first-response';
  const oasDialogueCallsBefore = requestCensus.filter(r => r.kind === 'oasDialogue').length;
  await dismissPcLookModalIfOpen(page);
  await page.fill('#gnActionInput', '');
  await page.fill('#gnDialogueInput', 'stop');
  await page.click('#gnSubmitBtn');
  await page.waitForTimeout(4000);
  const oasDialogueCallsAfter = requestCensus.filter(r => r.kind === 'oasDialogue').length;
  const c4 = await page.evaluate(() => ({
    interruptionVisible: !!document.getElementById('intimateInterruption') && document.getElementById('intimateInterruption').getClientRects().length > 0,
    entryPath: window.state._intimateInterruption && window.state._intimateInterruption.entryPath,
    exitModalOpened: !!document.getElementById('intimacyExitModal') && document.getElementById('intimacyExitModal').classList.contains('active'),
    submitted: window.state._intimateInterruption && window.state._intimateInterruption.submitted,
  }));
  const exitModalConsoleFired = consoleEvents.some(e => /INTIMACY-EXIT\] Modal opened/.test(e.text));
  ok(tag, 'CHECKPOINT4 first-ever "stop" bypasses the exit MODAL entirely (no modal console log) and no live Julian reply is generated (zero new oasDialogue stub calls)', !exitModalConsoleFired && (oasDialogueCallsAfter - oasDialogueCallsBefore) === 0, JSON.stringify({ exitModalConsoleFired, oasDialogueCallsBefore, oasDialogueCallsAfter }));
  ok(tag, 'CHECKPOINT4 the Dohkar interruption fires directly with entryPath=boundary, not submitted yet', c4.interruptionVisible && c4.entryPath === 'boundary' && !c4.submitted, JSON.stringify(c4));

  const reload4 = await saveExitAndContinue(page, tag + '-reload-after-boundary-interrupt');
  if (reload4.reopened) {
    const c4r = await page.evaluate(() => ({
      interruptionOccurrences: document.querySelectorAll('#intimateInterruption').length,
      entryPath: window.state._intimateInterruption && window.state._intimateInterruption.entryPath,
      submitted: window.state._intimateInterruption && window.state._intimateInterruption.submitted,
    }));
    ok(tag, 'CHECKPOINT4-RELOAD boundary interruption does not re-fire/duplicate after Save & Exit -> Continue, entryPath preserved', c4r.interruptionOccurrences === 1 && c4r.entryPath === 'boundary' && c4r.submitted === false, JSON.stringify(c4r) + ' (mechanism=' + reload4.mechanism + ')');
  } else {
    ok(tag, 'CHECKPOINT4-RELOAD could complete the real Save&Exit->Continue round trip', false, JSON.stringify(reload4));
  }

  fs.writeFileSync('_validate_out/oas_two_path_boundary_requests.json', JSON.stringify(requestCensus, null, 1));
}

try { fs.mkdirSync('_validate_out', { recursive: true }); } catch (_) {}
const browser = await chromium.launch({ headless: true });
await Promise.all([
  runNormalPathJourney(browser).catch(e => ok('NORMAL', 'journey threw', false, e && e.stack || e)),
  runBoundaryPathJourney(browser).catch(e => ok('BOUNDARY', 'journey threw', false, e && e.stack || e)),
]);
await browser.close();

const failed = rows.filter(([, p]) => !p);
console.log('\n' + '='.repeat(70));
console.log('TOTAL: ' + rows.length + ' checks, ' + (rows.length - failed.length) + ' passed, ' + failed.length + ' failed');
if (failed.length) { console.log('FAILURES:'); failed.forEach(([n]) => console.log('  - ' + n)); }
fs.writeFileSync('_validate_out/oas_two_path_lifecycle_summary.json', JSON.stringify(rows, null, 1));
process.exitCode = failed.length ? 1 : 0;
