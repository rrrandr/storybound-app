// ═══ PC BASELINE PORTFOLIO + PC-C+ — LIVE, PROVIDER-STUBBED, REAL-CLICK CG PROOF (Roman 2026-09-14) ═══
//
// Proves that Lirael's PC-C+ (self-embodiment) plus an NPC's Character+/Environment+/fusion reach
// the REAL CG (Comic Generator) author payload — the actual outgoing prompt for the
// `cgScreenplay`-classified completion call — for First Sacrifice's real Scene 2 continuation,
// driven by REAL clicks through the REAL Library -> book -> Genesis unlock -> one-on-one ->
// interruption -> Fate-card -> Submit chain this repo's own _cg_oas_library_reload_proof.mjs
// already proved fires a real Scene-2 cgScreenplay request (its STEP1-STEP6). This file reuses
// that same proven chain; it does not reinvent it.
//
// TWO SCENARIOS, ONE PROOF FILE (each drives the full real chain on its own fresh page):
//   GREEN — a fresh NPC ("Marcus", NOT in First Sacrifice's own seed cast — see the
//     NPC-MINTING NOTE below for why a real seed.cast member like Julian could not be used here)
//     is granted real, structurally-shaped facet material ({text,evidence_requires} pressures) —
//     the same technique _cplus_eplus_fusion_live_proof.mjs already uses and has 52/52 proven —
//     so a real accepted-stage fact naming him, worded to satisfy his own evidence_requires,
//     grounds his C+ for real. For the PC: First Sacrifice's REAL shipped Lirael facets
//     (pc_untested_brilliance/pc_fears_public_failure) have PLAIN-STRING possible_pressures
//     (evidence_requires normalizes to '' -> _cpBuildGroundedOptions's `if (!req) return;` means
//     they can NEVER ground, as actually authored — a real, disclosed, pre-existing content gap,
//     not something this task may patch in public/starter-scenes.js). To demonstrate the
//     MECHANISM affirmatively, this scenario applies a CONTROLLED, IN-PAGE-MEMORY-ONLY correction
//     (never touching the repo file) to ONE of her two facets' pressure SHAPE — same
//     facet_id/category/canonical_truth/pressure text, only evidence_requires added, matched
//     against the REAL baked openState.pcCondition text (CG's own submit flow never records
//     _scenePosture at all — see the PC-EVIDENCE NOTE below — so pcCondition, not posture, is
//     what actually supplies the matching evidence here).
//   RED — identical NPC setup (Marcus's C+/E+/fusion still fire), but the PC facet is left in its
//     REAL, UNMODIFIED shipped shape. Honest finding: PC-C+ is correctly ABSENT for real First
//     Sacrifice content today, because her own authored pressures are structurally ungroundable —
//     not a proof defect, a disclosed content gap (see _audit_out/pc_baseline_portfolio_design.md).
//
// TWO FURTHER GAPS DISCOVERED WHILE BUILDING THIS PROOF (disclosed, neither patched — both
// pre-existing and out of this task's scope):
//   NPC-MINTING NOTE — Julian (First Sacrifice's real seed LI) could not be named via his real
//     ledger anchor (_relLiId()): _cPlusEligibleCandidates' own roster-building unconditionally
//     adds every named seed.cast member as an "absent-but-in-scope" candidate under a
//     'named:'+slug(label) id, with NO awareness that the SAME person may already be staged under
//     a DIFFERENT id (the ledger's 'ent:'+name scheme) by the new accepted-stage substrate. The
//     two ids share the alias "Julian" and both get declined by the (correctly working)
//     alias-ambiguity fail-closed guard — a real reconciliation gap between the seed-roster id
//     scheme and the accepted-stage substrate's ledger ids for NAMED SEED cast members, not a
//     PC-portfolio defect. Sidestepped here by using an NPC outside seed.cast (Marcus).
//   PC-EVIDENCE NOTE — _recordScenePosture (which _pcEvidenceFacts' posture-based evidence source
//     depends on) is called ONLY from the literary skeleton path (public/app.js ~98287). CG's own
//     submit flow (_runCGScreenplayGenInner/_advanceStagedScene) never calls it, so
//     state._scenePosture is never populated for a CG-engine scene — PC-C+ grounded on THIS
//     scene's own reader Say/Do is unreachable for CG as things stand today, even though the
//     mechanism is correct. This proof's GREEN scenario instead grounds through the baked
//     openState.pcCondition evidence source (legitimate for scene 2 specifically), which is
//     unaffected by this gap.
//
// CORRECTIVE FOLLOW-UP (Roman, 2026-09-15, on top of 6533f02): CG's own submit flow never called
// _recordScenePosture at all — PC-C+ could ground on the baked scene-2 opening but never on THIS
// scene's own reader Say/Do under CG. Fixed (app.js's _completeStagedSceneFromScreenplay now
// records posture on every real submit, same sceneNum convention as _cgMintDeliveredAssignments).
// FIVE new scenarios below (CUSTOM, SAYDO, DOUBLESUBMIT, plus two new assertions folded into
// GREEN) prove: card-filled AND custom-typed Say/Do both persist verbatim; a real Save+reload
// cycle retains the recorded posture; the next scene's PC-C+ grounds through THIS scene's own
// posture specifically (not only the scene-2 baked fallback); a contrary Say/Do drops the PC's
// self-embodiment claim while an NPC's C+ is unaffected; and the app's own existing double-submit
// latch (not a harness invention) blocks a genuine double real-click from producing two competing
// records.
//
// FIXTURE-LEVEL CAPABILITY vs REAL SHIPPED DATA (read this before citing any GREEN/CUSTOM/SAYDO
// pass as evidence about First Sacrifice's actual current quality): every scenario that
// demonstrates PC-C+ firing (GREEN, CUSTOM, and the pre-guard half of SAYDO) does so with an
// in-page-memory-only controlled PC facet (via state.pcBodyBible, the corridor path), NEVER the
// real, shipped STARTER_SEEDS.starter_first_sacrifice PC facets — those remain exactly as
// ungroundable as RED proves, unaffected by anything in this pass (the legacy-marking change is
// pure labeling, see LEGACY DISPLAY-STRING NORMALIZATION in app.js). What this file proves is
// that the MECHANISM is real and reachable end-to-end through the actual CG pipeline; it makes NO
// claim that a reader playing real, unmodified First Sacrifice today gets PC-C+ from her own
// authored facets — she does not, until the foundation-issuance gap documented in
// _audit_out/pc_facet_foundation_source_audit.md is decided and built.
//
// NEVER: git commit/push/stash/checkout/reset. NEVER touch .env.local. NO paid model calls — every
// /api/** answered locally. NEVER edit public/app.js, public/orchestration-client.js,
// public/starter-scenes.js, or the two reference proof files this reuses patterns from. NO DOM
// forcing, no calling _runCGScreenplayGen/_advanceStagedScene/_completeStagedSceneFromScreenplay/
// _recordScenePosture directly — the CG generation flow itself is driven only by real clicks
// (book, zoom, Read, the real Genesis #buGoBtn, the real Fate-card or real typed input + Submit,
// the real Save & Exit + reload + Continue cycle). Setup preconditions (accepted stage,
// granted/patched facet material) are established the same way this repo's own proven proofs
// already do it: direct page.evaluate state injection BEFORE the real submit that exercises the
// mechanism under test.
//
// usage: node _pc_cplus_cg_live_proof.mjs   (dev server on :3000; every /api/** POST answered locally)

import { chromium } from 'playwright-core';
import {
  installSession, configBody, isAuthOrigin, installEntitledProfileStub, verifySubscriptionBody,
} from './_test_session_env.mjs';
const F = await import('./_seed_fixtures.generated.mjs');

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? 'PASS ' : 'FAIL ') + name + (detail ? '  — ' + String(detail).slice(0, 400) : '')); };
const note = (s) => console.log('  [NOTE] ' + s);

function classifyModelCall(sys, usr) {
  if (/opening an intimate dialogue/.test(sys)) return 'oasDialogue';
  if (/uninhibited romance fiction author/.test(sys) && /TEMPTATION \|\|\|/.test(usr)) return 'fatePreviews';
  if (/screenplay-native cinematic-romance writer/.test(sys)) return 'cgScreenplay';
  if (/SCENE-SPINE planner/.test(sys) || /"hardBeats"/.test(sys)) return 'sceneSpine';
  const hits = F.REQUEST_KINDS.filter(([, t]) => t(sys + '\n' + usr, sys, usr)).map(([k]) => k);
  return hits.length === 1 ? hits[0] : 'unclassified';
}

// The CONFESSION card's own text is OUR test's content (the fatePreviews stub reply, standing in
// for a real model's suggestion) — crafted so it naturally satisfies BOTH Julian's REAL, shipped
// evidence_requires regexes AND the PC facet's (real-or-patched) evidence_requires, without either
// one being invented to fit the other artificially: the sentence is one coherent scene beat.
// Kept under 120 chars — the real fate-card pipeline clips a card's action text at that length
// (measured directly: a 143-char draft came back clipped to exactly 120 chars in a first run of
// this proof), and the truncated tail must still carry the words this scenario's evidence_requires
// depends on (perform/procedure/rehears for the PC; Julian/Dohkar/assembly for Julian's real facets).
const CONFESSION_ACTION = 'I perform the rehearsed procedure at last, in front of the assembly, and look to Julian instead of the Dohkar.';
const CONFESSION_DIALOGUE = 'I did call to you for an explanation of what went wrong.';
const FIVE_OPTIONS = [
  'TEMPTATION ||| amplify ||| I step in until the Dohkar has to look up at me ||| Ask it here, then.',
  'SILENCE ||| redirect ||| I keep The Answer level and say nothing ||| (no words)',
  'REVERSAL ||| amplify ||| I turn the hooked end toward Julian ||| You confessed more than I did.',
  'BOUNDARY ||| amplify ||| I set my feet and do not move ||| The inquiry, then.',
  'CONFESSION ||| amplify ||| ' + CONFESSION_ACTION + ' ||| ' + CONFESSION_DIALOGUE,
].join('\n');

async function newStubbedPage(browser, ctx) {
  const page = await (await browser.newContext()).newPage();
  const consoleEvents = [], requestCensus = [];
  ctx.consoleEvents = consoleEvents; ctx.requestCensus = requestCensus; ctx.cgRequests = [];
  page.on('console', m => consoleEvents.push({ type: m.type(), text: m.text() }));

  await installSession(page);
  await page.route('**/sb-test.localhost/**', route => {
    const accept = route.request().headers()['accept'] || '';
    const single = /vnd\.pgrst\.object\+json/.test(accept);
    return route.fulfill({ status: 200, contentType: 'application/json', body: single ? 'null' : '[]' });
  });
  await installEntitledProfileStub(page, { log: (m) => consoleEvents.push({ type: 'harness', text: '[STUB] ' + m }) });

  await page.route('**/api/**', async route => {
    const req = route.request(); const url = req.url(); const p = new URL(url).pathname;
    if (/\/api\/config\b/.test(url)) { requestCensus.push({ kind: 'config', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() }); }
    if (isAuthOrigin(url)) { requestCensus.push({ kind: 'auth-origin', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }); }
    if (/\/api\/verify-subscription\b/.test(url)) { requestCensus.push({ kind: 'verify-subscription', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(verifySubscriptionBody()) }); }
    if (F.PASSTHROUGH.test(url)) { requestCensus.push({ kind: 'passthrough', url: p }); return route.continue(); }
    if (F.LOCAL[p]) { requestCensus.push({ kind: 'local:' + p, url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(F.LOCAL[p]) }); }
    if (!F.MODEL.test(url)) { requestCensus.push({ kind: 'unmodeled-fallback', url: p }); return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); }

    let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch (_) {}
    const flat = m => typeof m.content === 'string' ? m.content : (Array.isArray(m.content) ? m.content.map(x => x && x.text || '').join('\n') : '');
    const sys = (b.messages || []).filter(m => m.role === 'system').map(flat).join('\n');
    const usr = (b.messages || []).filter(m => m.role === 'user').map(flat).join('\n');
    const kind = classifyModelCall(sys, usr);
    requestCensus.push({ kind, url: p, role: b.role || null, model: b.model || null });
    if (kind === 'cgScreenplay') ctx.cgRequests.push({ sys, usr, at: Date.now() });

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
    else if (kind === 'oasDialogue') content = JSON.stringify({ li_dialogue: 'You called to me. Say it plainly, here, where they can hear.', li_action: 'He does not step back.', face_state: 'intent', scene_state: 'building', release_state: 'none' });
    else if (kind === 'cgScreenplay') content = '{}'; // categorically ignored downstream — see [CG:ASSIGN:MODEL-IGNORED]; we assert on the OUTGOING prompt, not this reply
    else content = JSON.stringify(F.GENERIC);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'harness', choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content } }] }) });
  });
  return page;
}

async function dismissPcLookModalIfOpen(page) {
  for (let i = 0; i < 10; i++) {
    const st = await page.evaluate(() => ({
      pcOpen: (() => { const m = document.getElementById('pcLookModal'); return !!(m && !m.classList.contains('hidden') && m.getClientRects().length > 0); })(),
      liOpen: (() => { const m = document.getElementById('liRenderModal'); return !!(m && !m.classList.contains('hidden') && m.getClientRects().length > 0); })(),
      warnOpen: !!document.getElementById('skipRenderWarnModal'),
    }));
    if (!st.pcOpen && !st.liOpen && !st.warnOpen) return;
    if (st.warnOpen) { try { await page.click('#skipRenderWarnModal [data-act="skip"]', { timeout: 5000 }); } catch (_) {} }
    else if (st.pcOpen) { try { await page.click('#pcLookSkipBtn', { timeout: 5000 }); } catch (_) {} }
    else if (st.liOpen) { try { await page.click('#liRenderSkipBtn', { timeout: 5000 }); } catch (_) {} }
    await page.waitForTimeout(600);
  }
}

// ── PROPERTY 2 — REAL SAVE + RELOAD + CONTINUE (Roman, corrective follow-up to 6533f02, 2026-09-15)
// Reuses the exact real-click technique _stage_state_persistence_proof.mjs already proves
// generically for state._stageState (Save & Exit -> real page.reload() [clears ALL runtime
// state] -> real Library navigation -> the row's own real "Continue" button -> read state back).
// #gnSaveExitBtn is the CG/gnReader screen's own Save & Exit affordance — the SAME
// window.saveAndExitStory() handler #storySaveExitBtn (literary) is wired to.
async function realClickSaveReloadContinue(page, label) {
  const saveBtnId = await page.evaluate(() => {
    const gn = document.getElementById('gnSaveExitBtn');
    if (gn && gn.getClientRects().length > 0) return 'gnSaveExitBtn';
    const lit = document.getElementById('storySaveExitBtn');
    if (lit && lit.getClientRects().length > 0) return 'storySaveExitBtn';
    return null;
  });
  ok(label + ' a real Save & Exit affordance is visible', !!saveBtnId, saveBtnId);
  if (!saveBtnId) return null;
  await page.click('#' + saveBtnId);
  await page.waitForTimeout(2000);
  ok(label + ' close returns to the Library screen', (await page.evaluate(() => window._currentScreenId)) === 'vaultLibraryScreen');

  await page.reload({ waitUntil: 'commit' });
  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 60000 && !up) {
    try { await page.waitForFunction(() => window.state && window._launchStarterStory, null, { timeout: 10000 }); up = true; }
    catch (_) { await page.waitForTimeout(1000); }
  }
  ok(label + ' page reload completes (runtime state genuinely cleared)', up);
  if (!up) return null;
  await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2000);

  await page.click('#burgerBtn'); await page.waitForTimeout(400);
  await page.click('.vault-tab[data-vault-section="Stories"]'); await page.waitForTimeout(300);
  await page.click('.vault-nav[data-vault-section="SavedStories"]'); await page.waitForTimeout(600);
  const rowLocator = page.locator('#vaultSavedStoriesList .vault-saved-story-row').first();
  const rowCount = await rowLocator.count();
  ok(label + ' a saved-story row exists in the real Library UI', rowCount > 0);
  if (!rowCount) return null;
  const continueBtn = rowLocator.getByRole('button', { name: 'Continue', exact: true });
  await continueBtn.click();
  await page.waitForTimeout(1500);
  for (let i = 0; i < 20; i++) {
    const scr = await page.evaluate(() => window._currentScreenId);
    if (scr === 'game' || scr === 'gnReader') break;
    await page.waitForTimeout(1000);
  }
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => ({ screen: window._currentScreenId, scenePosture2: window.state._scenePosture && window.state._scenePosture['2'] }));
  ok(label + ' the real Continue click (not a direct function call) restored the story', after.screen === 'game' || after.screen === 'gnReader', JSON.stringify(after));
  return after;
}

// ── SHARED REAL-CLICK CHAIN (STEP1-6, reused pattern from _cg_oas_library_reload_proof.mjs) ──
// fixtureFn(page) runs AFTER Genesis unlock, BEFORE the interruption card click — the one place
// this proof diverges from the reference file: it injects the accepted stage / facet fixtures
// there, via page.evaluate, exactly like _cplus_eplus_fusion_live_proof.mjs's own setup step.
async function driveToCgScreenplayRequest(label, page, ctx, fixtureFn, opts) {
  opts = opts || {};
  const t0 = Date.now(); let up = false;
  while (Date.now() - t0 < 120000 && !up) {
    try { await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 20000 }); await page.waitForFunction(() => window.state && window._launchStarterStory && window.STARTER_STORIES && window._bakedScene1For, null, { timeout: 60000 }); up = true; }
    catch (_) { await page.waitForTimeout(3000); }
  }
  if (!up) { ok(label + ' server reachable', false, 'server never answered'); return false; }
  await page.waitForFunction(() => !document.body.classList.contains('booting'), null, { timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);

  const burgerVisible = await page.evaluate(() => { const b = document.getElementById('burgerBtn'); return !!(b && b.getClientRects().length > 0); });
  if (burgerVisible) {
    await page.click('#burgerBtn'); await page.waitForTimeout(400);
    await page.click('.vault-tab[data-vault-section="Account"]'); await page.waitForTimeout(300);
    await page.click('#menuLibraryBtn'); await page.waitForTimeout(1500);
  }
  const screenNow = await page.evaluate(() => window._currentScreenId);
  ok(label + ' real Library entry reaches vaultLibraryScreen', screenNow === 'vaultLibraryScreen', screenNow);
  if (screenNow !== 'vaultLibraryScreen') return false;

  const bookInfo = await page.evaluate(() => {
    const el = document.querySelector('.library-book[data-story-id="starter_first_sacrifice"]');
    return el ? { found: true, rectN: el.getClientRects().length } : { found: false };
  });
  ok(label + ' real First-Sacrifice shelf book visible', bookInfo.found && bookInfo.rectN > 0, JSON.stringify(bookInfo));
  if (!bookInfo.found) return false;

  await page.click('.library-book[data-story-id="starter_first_sacrifice"]');
  await page.waitForTimeout(900);
  await page.click('#zoomReadBtn');
  await page.waitForTimeout(6000);
  const afterRead = await page.evaluate(() => ({ screen: window._currentScreenId, starterId: window.state._starterId,
    oasBtnVisible: !!document.getElementById('bakedOASEnterBtn') && document.getElementById('bakedOASEnterBtn').getClientRects().length > 0 }));
  ok(label + ' real click reaches baked Scene 1 (game screen, real starterId)', afterRead.screen === 'game' && afterRead.starterId === 'starter_first_sacrifice' && afterRead.oasBtnVisible, JSON.stringify(afterRead));
  if (!afterRead.oasBtnVisible) return false;

  await page.click('#bakedOASEnterBtn');
  await page.waitForTimeout(1300);
  const goBtnVisible = await page.evaluate(() => { const el = document.getElementById('buGoBtn'); return !!(el && el.getClientRects().length > 0); });
  ok(label + ' real Genesis unlock modal + #buGoBtn visible', goBtnVisible, '');
  if (!goBtnVisible) return false;
  note(label + ': clicking the REAL #buGoBtn — real 15F charge through the stubbed /api/consume-fortune and the full deferred handleBeginStory() pipeline; can take real minutes even with instant stubs.');
  await page.click('#buGoBtn');
  let unlocked = false;
  for (let i = 0; i < 480 && !unlocked; i++) { await page.waitForTimeout(1000); unlocked = ctx.consoleEvents.some(e => /\[BAKED:GATE\] Genesis unlocked/.test(e.text)); }
  ok(label + ' real Genesis charge completes and unlocks', unlocked, unlocked ? '' : 'timed out after 8 min');
  if (!unlocked) return false;
  await page.waitForTimeout(1500);
  await dismissPcLookModalIfOpen(page);

  const s4 = await page.evaluate(() => ({ screen: window._currentScreenId, oasActive: !!(window.state.intimacyDialogue && window.state.intimacyDialogue.active) }));
  ok(label + ' one-on-one live (gnReader, OAS active)', s4.screen === 'gnReader' && s4.oasActive, JSON.stringify(s4));
  if (!s4.oasActive) return false;

  // ── FIXTURE INJECTION POINT — state only, no click; the mechanism under test is exercised
  // entirely by the real card-click + Submit below. ──
  const fixtureResult = await fixtureFn(page);
  note(label + ' fixture injected: ' + JSON.stringify(fixtureResult));

  await dismissPcLookModalIfOpen(page);
  await page.fill('#gnActionInput', 'I keep my hands still around The Answer and look at the assembly.');
  await page.click('#gnSubmitBtn');
  await page.waitForTimeout(3000);
  for (let i = 0; i < 30 && (await page.evaluate(() => !!(window.state.intimacyDialogue && window.state.intimacyDialogue.awaitingResponse))); i++) await page.waitForTimeout(1000);

  await dismissPcLookModalIfOpen(page);
  await page.fill('#gnActionInput', '');
  await page.fill('#gnDialogueInput', 'stop');
  await page.click('#gnSubmitBtn');
  await page.waitForTimeout(2000);
  try { await page.click('#intimacyExitFade', { timeout: 5000 }); } catch (_) { await page.evaluate(() => { const b = document.getElementById('intimacyExitFade'); if (b) b.click(); }); }
  await page.waitForTimeout(4000);
  const s5 = await page.evaluate(() => !!(document.getElementById('intimateInterruption') && document.getElementById('intimateInterruption').getClientRects().length > 0));
  ok(label + ' interruption mounts after the real exit click', s5, '');
  if (!s5) return false;

  for (let i = 0; i < 15 && !(await page.evaluate(() => { const r = window.state._intimateInterruption; return !!(r && r.cards && Object.keys(r.cards).length); })); i++) await page.waitForTimeout(1000);
  const HOST = await page.evaluate(() => { const r = window.state._intimateInterruption; return r && r.host === 'cg' ? { mount: 'gnCardMount', a: 'gnActionInput', d: 'gnDialogueInput', s: 'gnSubmitBtn' } : { mount: 'cardMount', a: 'actionInput', d: 'dialogueInput', s: 'submitBtn' }; });
  await dismissPcLookModalIfOpen(page);

  // ── CARD-FILLED vs CUSTOM-TYPED SUBMIT (Roman, corrective follow-up to 6533f02, 2026-09-15) ──
  // _commitIntimateInterruption(action, dialogue) (app.js ~197310) takes whatever text the real
  // #gnActionInput/#gnDialogueInput boxes hold at Submit — a Fate-card click is ONE real way to
  // populate them (selectedSlot set); a reader typing directly is equally real (selectedSlot
  // stays null/'-', logged as such by the app's own [INTIMATE-INTERRUPT] line). opts.customSubmit
  // = {action, dialogue} exercises the SECOND real path with no card involved.
  if (opts.customSubmit) {
    await page.fill('#' + HOST.a, opts.customSubmit.action || '');
    await page.fill('#' + HOST.d, opts.customSubmit.dialogue || '');
    await page.waitForTimeout(300);
    const filled = await page.evaluate((H) => ({ a: document.getElementById(H.a).value, d: document.getElementById(H.d).value }), HOST);
    ok(label + ' real custom-typed Say/Do fills the real inputs verbatim (no card)', filled.a === opts.customSubmit.action && filled.d === opts.customSubmit.dialogue, JSON.stringify(filled));
  } else {
    await page.click('#' + HOST.mount + ' [data-fate-card-slot="confession"]');
    await page.waitForTimeout(700);
    const filled = await page.evaluate((H) => ({ a: document.getElementById(H.a).value, d: document.getElementById(H.d).value }), HOST);
    ok(label + ' real CONFESSION card click fills real Say/Do inputs verbatim', filled.a === CONFESSION_ACTION && filled.d === CONFESSION_DIALOGUE, JSON.stringify(filled));
  }

  const before = ctx.cgRequests.length;
  await dismissPcLookModalIfOpen(page);
  await page.click('#' + HOST.s);
  let secondClickThrew = false;
  if (opts.doubleClickSubmit) {
    // PROPERTY 5 — a SECOND real click, as fast as Playwright can fire it, on the SAME button,
    // for the SAME turn. Proves the app's OWN existing double-submit protection (either the JS
    // Guard 2 latch, state._stagedSubmitting, "Guard 2 — double-submit" in app.js; OR the DOM
    // itself already having disabled/removed the button by the time the second click lands —
    // BOTH are real, existing app behavior, not a harness fixture) blocks a genuine double
    // real-click from producing a second competing generation attempt.
    try { await page.click('#' + HOST.s, { timeout: 3000 }); } catch (_) { secondClickThrew = true; }
  }
  for (let i = 0; i < 60 && ctx.cgRequests.length <= before; i++) await page.waitForTimeout(2000);
  ok(label + ' real Submit fires a real cgScreenplay request', ctx.cgRequests.length > before, 'cgRequests=' + ctx.cgRequests.length);
  if (opts.doubleClickSubmit) {
    // Give any (correctly blocked) second attempt time to have shown up if the guard had failed.
    await page.waitForTimeout(4000);
    ok(label + ' exactly ONE cgScreenplay request fired despite two real clicks (double-submit protection held)', ctx.cgRequests.length - before === 1, 'delta=' + (ctx.cgRequests.length - before));
    // DISCLOSED, NOT A PASS/FAIL CLAIM: which specific mechanism absorbed the second click is
    // genuinely unresolved by this harness across two real runs — sometimes the JS Guard 2 latch
    // logged the block, sometimes the click threw (button unclickable), and once (this run)
    // NEITHER was observed even though the outer property (exactly one request, one posture
    // record) held both times. The second click may be getting silently re-routed as an ordinary
    // (non-interruption) turn submit once _intimateInterruptionPending() goes false right after
    // the first commit, rather than hitting Guard 2 at all — plausible but not confirmed here.
    // Reported as an open diagnostic question, not asserted either way, to avoid a dishonest
    // pass/fail on a mechanism this proof did not actually pin down.
    const blockedLog = ctx.consoleEvents.some(e => /\[STAGED:SUBMIT\] Blocked — already in flight/.test(e.text));
    note(label + ' second-click disposition (diagnostic only, not asserted): ' + (blockedLog ? 'JS Guard 2 latch logged the block' : (secondClickThrew ? 'click could not dispatch — button already disabled/unavailable' : 'click dispatched, no guard log observed — likely re-routed as an ordinary turn submit once the interruption was no longer pending; unconfirmed')));
  }
  const diag = await page.evaluate(() => ({
    turnCount: window.state.turnCount,
    scenePosture2: window.state._scenePosture && window.state._scenePosture['2'],
    cgDelivered: window.state._cgDeliveredAssignments,
    activeStage: (typeof window._activeStageRecord === 'function') ? window._activeStageRecord(window.state) : 'n/a',
    pcPortfolio: window.state._pcPortfolio,
  }));
  note(label + ' DIAG turnCount=' + diag.turnCount + ' scenePosture2=' + JSON.stringify(diag.scenePosture2));
  note(label + ' DIAG cgDeliveredAssignments=' + JSON.stringify(diag.cgDelivered));
  note(label + ' DIAG activeStage=' + JSON.stringify(diag.activeStage).slice(0, 600));
  note(label + ' DIAG pcPortfolio=' + JSON.stringify(diag.pcPortfolio));
  const relevantLogs = ctx.consoleEvents.filter(e => /CPLUS|CG:ASSIGN|STAGE-CONTRACT|PC-PORTFOLIO|HARNESS-DEBUG|SKELETON:CPLUS|CG:SCREENPLAY/.test(e.text));
  note(label + ' DIAG relevant console lines (' + relevantLogs.length + '):\n    ' + relevantLogs.map(e => e.text).join('\n    ').slice(0, 3000));
  const pcDiag = await page.evaluate(() => {
    try {
      const s = window.state;
      const evidence = window._pcEvidenceFacts(s, 2);
      const stageRec = { id: 'pc', label: 'Lirael', aliases: ['Lirael'] };
      const idx = window._facetIndex(s, { sceneNumber: 2 });
      const facets = window._resolveFacetIndexEntry(stageRec, idx, 2);
      const ledgerPc = window._relLedger(false).entities.pc;
      const resolvedPcIdentity = window._resolvePcIdentity(s);
      const rawNameFields = { name: s.name, playerName: s.playerName, identityPlayerName: s.identity && s.identity.playerName, picksIdentityPlayerName: s.picks && s.picks.identity && s.picks.identity.playerName };
      const seed = window._activeSeed(s);
      const pcCast = seed && seed.cast && seed.cast.filter(c => c && c.role === 'PC')[0];
      const seedIdx = window._seedFacetIndex(s, { sceneNumber: 2 });
      return { evidence, idxKeys: Object.keys(idx), facetsForPc: facets, ledgerPcLabel: ledgerPc && ledgerPc.label, ledgerPcAliases: ledgerPc && ledgerPc.aliases,
        resolvedPcIdentity, pcCastPresent: !!pcCast, pcCastFacetCount: pcCast && pcCast.cPlusFacets && pcCast.cPlusFacets.length,
        pcCastFirstPressure: pcCast && pcCast.cPlusFacets && pcCast.cPlusFacets[0] && pcCast.cPlusFacets[0].possible_pressures,
        seedIdxKeys: Object.keys(seedIdx), pcPortfolioState: s._pcPortfolio, rawNameFields };
    } catch (e) { return { err: String(e && e.message) }; }
  });
  note(label + ' PC-DIAG rawNameFields: ' + JSON.stringify(pcDiag.rawNameFields));
  note(label + ' PC-DIAG resolvedPcIdentity: ' + JSON.stringify(pcDiag.resolvedPcIdentity));
  note(label + ' PC-DIAG: ' + JSON.stringify(pcDiag).slice(0, 2500));
  return ctx.cgRequests.length > before;
}

const browser = await chromium.launch({ headless: true });

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO GREEN — real Julian seed facet (unmodified) + one PC facet with an in-page-memory-
// only pressure-SHAPE correction (disclosed above) + a real accepted stage naming both, worded to
// satisfy their OWN authored evidence_requires.
// ══════════════════════════════════════════════════════════════════════════
{
  const ctx = {};
  const page = await newStubbedPage(browser, ctx);
  const gotRequest = await driveToCgScreenplayRequest('GREEN', page, ctx, async (page) => {
    return page.evaluate(() => {
      const s = window.state;
      // TEST AMENDMENT (disclosed, in-page memory only — public/starter-scenes.js is NEVER
      // touched) — SWITCHED TO THE CORRIDOR PATH, and here is why: this task's OWN fixed-starter
      // design (_ensurePcPortfolio) deliberately does NOT re-materialize seed PC facets onto the
      // ledger — it relies on _seedFacetIndex's own existing alias-resolution (id 'pc:'+slug(name)
      // resolving via a shared "Lirael" alias against the ledger's bare 'pc' anchor). Diagnosing
      // this scenario found a THIRD, separate, real pre-existing gap: by scene 2 of the REAL
      // First-Sacrifice flow, state.playerName has been reset to the literal placeholder string
      // "The Protagonist" (state.name/identity.playerName/picks.identity.playerName are all unset)
      // — so _resolvePcIdentity(state) returns null, _seedFacetIndex's PC branch's
      // `if (!label) return;` guard fires, and NO 'pc:*' entry is ever produced, even though the
      // ledger's own PC anchor still correctly carries "Lirael" (cached once, at anchor-creation
      // time, before playerName was reset). This is a real, disclosed, SEPARATE defect in PC-name
      // resolution's interaction with fixed-starter continuations — not a PC-portfolio bug, not
      // fixed here (a name-resolution fix is its own decision, per this session's own standing
      // "adjacent defect is a separate decision" rule).
      // To demonstrate the PC-C+ MECHANISM affirmatively despite that gap, this scenario clears
      // the seed's OWN cPlusFacets for the PC (in-page memory only) so _ensurePcPortfolio takes
      // its CORRIDOR branch instead — which materializes facets directly onto the ledger's bare
      // 'pc' id and does NOT depend on _resolvePcIdentity/_seedFacetIndex's alias resolution at
      // all. state.pcBodyBible's core_contradiction/current_crisis.immediate_fear are real-shaped
      // content (same fields _generatePCBodyBible actually asks for), worded so the mechanically-
      // derived evidence_requires (from current_crisis.event's own content words) matches the
      // REAL baked openState.pcCondition text below.
      const seed = window.STARTER_SEEDS && window.STARTER_SEEDS.starter_first_sacrifice;
      const pcCast = seed && seed.cast && seed.cast.filter(c => c && c.role === 'PC')[0];
      if (pcCast) pcCast.cPlusFacets = [];
      s.pcBodyBible = {
        core_contradiction: 'she rehearses control because an unrehearsed moment once cost her everything',
        current_crisis: {
          event: 'the interrogation was cut off before anyone named the interferer',
          immediate_fear: 'that the accusation will outlive any answer she gives',
        },
      };
      window._ensureStoryEntityAnchors();
      // NPC MINTING NOTE (found while diagnosing this scenario, a real pre-existing gap disclosed
      // here, not fixed — out of this task's scope): Julian (First Sacrifice's real seed LI) is
      // ALSO present, unconditionally, in _cPlusEligibleCandidates' own roster-building (every
      // named seed.cast member is added as an "absent-but-in-scope" candidate under a
      // 'named:'+slug(label) id, regardless of whether that same person is already staged under a
      // DIFFERENT id by the accepted-stage substrate). Naming him via his real ledger anchor
      // (_relLiId(), 'ent:julian') therefore collides with the seed-roster's own 'named:julian'
      // record for the SAME alias "julian" — both get declined by the (correct, working-as-
      // designed) alias-ambiguity fail-closed guard. That is a genuine, separate defect in how the
      // new accepted-stage substrate's ledger ids reconcile with the seed-roster's id scheme for
      // NAMED SEED cast members specifically — not a PC-portfolio bug, and not something this
      // proof patches. Sidestepped here (as the repo's OWN already-proven live proof does) by
      // using a FRESH NPC who is not in seed.cast at all, granted real, structurally-shaped facet
      // material directly — the exact same technique _cplus_eplus_fusion_live_proof.mjs already
      // uses and has 52/52 proven.
      const marcus = window._proposeNewEntity({ label: 'Marcus', kind: 'named' });
      const marcusId = marcus.entity.id;
      const L = window._relLedger(true);
      L.entities[marcusId].authorProfile = { status: 'ready', guardrails: [],
        cPlusFacets: [{ facet_id: 'test:' + marcusId + ':f1', category: 'value',
          canonical_truth: "Marcus believes the Institution's order matters more than any one person's comfort.",
          possible_pressures: [{ text: 'Marcus defends the Institution', evidence_requires: 'defends the Institution' }] }] };
      try { console.log('[HARNESS-DEBUG] turnCount at fixture-injection = ' + s.turnCount + ' marcusId=' + marcusId); } catch (_) {}
      const accepted = window._acceptStageProposal('2', {
        present: ['pc', marcusId], location: { label: 'the assembly hall, before the gathered First Favored' },
        issued_facts: [
          { text: 'Marcus defends the Institution\'s authority without hesitation, cutting off the objection before it forms.', participants: [{ ref: marcusId, role: 'subject' }] },
        ],
        issued_objects: [{ label: 'the sealed ledger', owner_or_caretaker_ref: marcusId, addressable_by: [marcusId] }],
        exclusions: { locations: [], objects: [] }, affordances: [], source: 'pc-cg-live-proof-green',
      });
      return { marcusId, acceptedOk: accepted.ok, acceptedWhy: accepted.why };
    });
  });
  let greenPostureBefore = null, greenReload = null;
  if (gotRequest) {
    const diag = await page.evaluate(() => ({
      turnCount: window.state.turnCount,
      cgDelivered: window.state._cgDeliveredAssignments,
      cpCont: window.state._cpContinuationContract,
      stageState: window.state._stageState,
    }));
    note('GREEN DIAG: ' + JSON.stringify(diag).slice(0, 1500));
    note('GREEN DIAG consoleEvents (last 30 relevant): ' + JSON.stringify(
      ctx.consoleEvents.filter(e => /CG:ASSIGN|STAGE-CONTRACT|SKELETON:CPLUS|HARNESS-DEBUG|CPLUS|PC-PORTFOLIO|PC-EVIDENCE/.test(e.text)).slice(-30).map(e => e.text)));
    // PROPERTY 1a — the CONFESSION card's real fill produced a real, verbatim state._scenePosture
    // record (proves the CG posture-parity fix actually recorded it, not just that the card filled
    // the DOM inputs).
    greenPostureBefore = await page.evaluate(() => window.state._scenePosture && window.state._scenePosture['2']);
    // PROPERTY 2 — real Save & Exit -> real reload -> real Continue click retains it.
    greenReload = await realClickSaveReloadContinue(page, 'GREEN-RELOAD');
  }
  await page.context().close();
  if (gotRequest) {
    const usr = ctx.cgRequests[ctx.cgRequests.length - 1].usr;
    ok('GREEN PC self-embodiment marker present for Lirael', /SELF \(PC-C\+; embodiment, not outsider observation\)/.test(usr));
    ok('GREEN CHARACTER+ header appears exactly once', (usr.match(/CHARACTER\+ ASSIGNED THIS SCENE/g) || []).length === 1, (usr.match(/CHARACTER\+ ASSIGNED THIS SCENE/g) || []).length);
    ok('GREEN Marcus\'s NPC outsider-observation C+ content reached the payload', /DO NOT STATE: Marcus believes the Institution/.test(usr), '(see full usr for context)');
    ok('GREEN no raw scene_assignments JSON leaked (delivered, not requested)', !/"environment_plus"\s*:\s*\{"target"/.test(usr));
    note('GREEN prompt excerpt around CHARACTER+:\n' + (usr.split('CHARACTER+ ASSIGNED THIS SCENE')[1] || '(not found)').slice(0, 900));
    ok('GREEN (property 1a) real card-filled posture recorded verbatim', !!greenPostureBefore && greenPostureBefore.action === CONFESSION_ACTION && greenPostureBefore.dialogue === CONFESSION_DIALOGUE, JSON.stringify(greenPostureBefore));
    ok('GREEN (property 2) a real reload retains the identical recorded posture', !!(greenReload && greenReload.scenePosture2 && greenPostureBefore
        && greenReload.scenePosture2.action === greenPostureBefore.action && greenReload.scenePosture2.dialogue === greenPostureBefore.dialogue && greenReload.scenePosture2.hash === greenPostureBefore.hash),
      JSON.stringify({ before: greenPostureBefore, after: greenReload && greenReload.scenePosture2 }));
  } else {
    ok('GREEN scenario reached a real cgScreenplay request', false, 'blocked earlier in the real click chain — see FAIL lines above');
  }
  console.log('GREEN done. cgRequests=' + (ctx.cgRequests ? ctx.cgRequests.length : 0));
}

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO RED — Marcus (a fresh, real-facet-granted NPC, identical setup to GREEN) still
// grounds normally, but the PC's real, shipped facets are left COMPLETELY UNTOUCHED (plain-string
// possible_pressures, AND no pcBodyBible, so _ensurePcPortfolio takes the fixed_starter branch on
// her real, ungroundable seed content). Honest finding, not a proof defect: PC-C+ must be
// correctly ABSENT — for TWO independently-sufficient real reasons, both disclosed above: her
// plain-string pressures can never ground (_cpBuildGroundedOptions's `if (!req) return;`), and
// separately, state.playerName has reset to the placeholder "The Protagonist" by scene 2, so even
// a groundable fixed-starter facet would currently be unreachable via _seedFacetIndex's alias path.
// ══════════════════════════════════════════════════════════════════════════
{
  const ctx = {};
  const page = await newStubbedPage(browser, ctx);
  const gotRequest = await driveToCgScreenplayRequest('RED', page, ctx, async (page) => {
    return page.evaluate(() => {
      const s = window.state;
      // NO amendment here — the real, shipped STARTER_SEEDS.starter_first_sacrifice PC facets
      // are left exactly as production ships them, and no pcBodyBible is set either.
      window._ensureStoryEntityAnchors();
      // Same fresh NPC (Marcus) as GREEN, for the same reason — see the NPC-MINTING NOTE above
      // and GREEN's own comment: naming a real seed.cast member (like Julian) here collides with
      // that member's own seed-roster entry under a different id scheme.
      const marcus = window._proposeNewEntity({ label: 'Marcus', kind: 'named' });
      const marcusId = marcus.entity.id;
      const L = window._relLedger(true);
      L.entities[marcusId].authorProfile = { status: 'ready', guardrails: [],
        cPlusFacets: [{ facet_id: 'test:' + marcusId + ':f1', category: 'value',
          canonical_truth: "Marcus believes the Institution's order matters more than any one person's comfort.",
          possible_pressures: [{ text: 'Marcus defends the Institution', evidence_requires: 'defends the Institution' }] }] };
      try { console.log('[HARNESS-DEBUG] turnCount at fixture-injection = ' + s.turnCount + ' marcusId=' + marcusId); } catch (_) {}
      const accepted = window._acceptStageProposal('2', {
        present: ['pc', marcusId], location: { label: 'the assembly hall, before the gathered First Favored' },
        issued_facts: [
          { text: 'Marcus defends the Institution\'s authority without hesitation, cutting off the objection before it forms.', participants: [{ ref: marcusId, role: 'subject' }] },
        ],
        issued_objects: [{ label: 'the sealed ledger', owner_or_caretaker_ref: marcusId, addressable_by: [marcusId] }],
        exclusions: { locations: [], objects: [] }, affordances: [], source: 'pc-cg-live-proof-red',
      });
      return { marcusId, acceptedOk: accepted.ok, acceptedWhy: accepted.why };
    });
  });
  await page.context().close();
  if (gotRequest) {
    const usr = ctx.cgRequests[ctx.cgRequests.length - 1].usr;
    ok('RED PC self-embodiment marker is ABSENT (real, unmodified seed pressures cannot ground — disclosed content gap, not a proof defect)', !/SELF \(PC-C\+; embodiment, not outsider observation\)/.test(usr));
    ok('RED Marcus\'s NPC C+ still fires normally (attribution + real facet material, unaffected by the PC content gap)', /DO NOT STATE: Marcus believes the Institution/.test(usr));
    note('RED prompt excerpt around CHARACTER+:\n' + (usr.split('CHARACTER+ ASSIGNED THIS SCENE')[1] || '(not found)').slice(0, 900));
  } else {
    ok('RED scenario reached a real cgScreenplay request', false, 'blocked earlier in the real click chain — see FAIL lines above');
  }
  console.log('RED done. cgRequests=' + (ctx.cgRequests ? ctx.cgRequests.length : 0));
}

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO POSTURE-CUSTOM — corrective follow-up to 6533f02 (properties 1b + 3). A real
// CUSTOM-TYPED (no card) interruption submit. The PC facet's evidence_requires is worded to
// match ONLY this scenario's posture text — deliberately sharing NO words with the baked
// openState.pcCondition text (checked by hand against the real baked string) — so if her
// self-embodiment marker reaches the real cgScreenplay prompt, it can only be because
// _pcEvidenceFacts' posture-based source (this pass's fix) actually grounded it, not the
// scene-2-only baked fallback GREEN already used.
// ══════════════════════════════════════════════════════════════════════════
const CUSTOM_ACTION = 'I press both palms flat against the cold stone floor and refuse to step back.';
const CUSTOM_DIALOGUE = 'This is mine to answer, not his.';
{
  const ctx = {};
  const page = await newStubbedPage(browser, ctx);
  const gotRequest = await driveToCgScreenplayRequest('CUSTOM', page, ctx, async (page) => {
    return page.evaluate(() => {
      const s = window.state;
      const seed = window.STARTER_SEEDS && window.STARTER_SEEDS.starter_first_sacrifice;
      const pcCast = seed && seed.cast && seed.cast.filter(c => c && c.role === 'PC')[0];
      if (pcCast) pcCast.cPlusFacets = [];   // corridor branch, same disclosed reason as GREEN
      s.pcBodyBible = {
        core_contradiction: 'she refuses to be moved even when staying costs her something real',
        current_crisis: {
          // Words deliberately absent from the real baked openState.pcCondition text
          // ("mouth-band torn away, ceremonial sash still on, publicly accused, holding The
          // Answer (the Institution's, in Julian's keeping — hers only for the questioning),
          // the interrogation just cut off by the Dohkar") — so a match can only come from THIS
          // scenario's own posture text below.
          event: 'she pressed both palms flat against unyielding stone and would not step back',
          immediate_fear: 'that refusing to move will be read as defiance instead of resolve',
        },
      };
      window._ensureStoryEntityAnchors();
      const marcus = window._proposeNewEntity({ label: 'Marcus', kind: 'named' });
      const marcusId = marcus.entity.id;
      const L = window._relLedger(true);
      L.entities[marcusId].authorProfile = { status: 'ready', guardrails: [],
        cPlusFacets: [{ facet_id: 'test:' + marcusId + ':f1', category: 'value',
          canonical_truth: "Marcus believes the Institution's order matters more than any one person's comfort.",
          possible_pressures: [{ text: 'Marcus defends the Institution', evidence_requires: 'defends the Institution' }] }] };
      const accepted = window._acceptStageProposal('2', {
        present: ['pc', marcusId], location: { label: 'the assembly hall, before the gathered First Favored' },
        issued_facts: [
          { text: 'Marcus defends the Institution\'s authority without hesitation, cutting off the objection before it forms.', participants: [{ ref: marcusId, role: 'subject' }] },
        ],
        issued_objects: [{ label: 'the sealed ledger', owner_or_caretaker_ref: marcusId, addressable_by: [marcusId] }],
        exclusions: { locations: [], objects: [] }, affordances: [], source: 'pc-cg-live-proof-custom',
      });
      return { marcusId, acceptedOk: accepted.ok, acceptedWhy: accepted.why };
    });
  }, { customSubmit: { action: CUSTOM_ACTION, dialogue: CUSTOM_DIALOGUE } });
  let customPosture = null;
  if (gotRequest) {
    customPosture = await page.evaluate(() => window.state._scenePosture && window.state._scenePosture['2']);
    note('CUSTOM DIAG scenePosture2=' + JSON.stringify(customPosture));
  }
  await page.context().close();
  if (gotRequest) {
    const usr = ctx.cgRequests[ctx.cgRequests.length - 1].usr;
    ok('CUSTOM (property 1b) custom-typed posture recorded verbatim (no card involved)', !!customPosture && customPosture.action === CUSTOM_ACTION && customPosture.dialogue === CUSTOM_DIALOGUE, JSON.stringify(customPosture));
    ok('CUSTOM (property 3) PC self-embodiment marker reaches the payload, grounded by THIS scene\'s own posture (not the baked opening)', /SELF \(PC-C\+; embodiment, not outsider observation\)/.test(usr));
    ok('CUSTOM Marcus\'s NPC C+ still fires alongside her', /DO NOT STATE: Marcus believes the Institution/.test(usr));
    note('CUSTOM prompt excerpt around CHARACTER+:\n' + (usr.split('CHARACTER+ ASSIGNED THIS SCENE')[1] || '(not found)').slice(0, 900));
  } else {
    ok('CUSTOM scenario reached a real cgScreenplay request', false, 'blocked earlier in the real click chain — see FAIL lines above');
  }
  console.log('CUSTOM done. cgRequests=' + (ctx.cgRequests ? ctx.cgRequests.length : 0));
}

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO SAYDO — corrective follow-up to 6533f02 (property 4). A real submit whose text BOTH
// grounds the PC facet's pressure (so without the guard she WOULD be scheduled) AND explicitly
// negates that same facet's canonical_truth, per _applyPcSayDoGuard's own mechanical rule
// (a word from _PC_SAYDO_NEGATIONS within 5 tokens of a >3-char word shared with canonical_truth).
// ══════════════════════════════════════════════════════════════════════════
const SAYDO_ACTION = 'I gripped that control until my knuckles went white, then told myself I am not in control of anything anymore.';
const SAYDO_DIALOGUE = '';
{
  const ctx = {};
  const page = await newStubbedPage(browser, ctx);
  const gotRequest = await driveToCgScreenplayRequest('SAYDO', page, ctx, async (page) => {
    return page.evaluate(() => {
      const s = window.state;
      const seed = window.STARTER_SEEDS && window.STARTER_SEEDS.starter_first_sacrifice;
      const pcCast = seed && seed.cast && seed.cast.filter(c => c && c.role === 'PC')[0];
      if (pcCast) pcCast.cPlusFacets = [];
      s.pcBodyBible = {
        // canonical_truth carries "control" — the word SAYDO_ACTION both grounds (via "gripped",
        // from current_crisis.event below) and negates (via "not ... in control").
        core_contradiction: 'she believes tight control keeps everyone around her safe',
        current_crisis: {
          event: 'the ritual demanded steadiness and she gripped that control harder than ever',
          immediate_fear: 'that letting go, even once, proves the control was never real',
        },
      };
      window._ensureStoryEntityAnchors();
      const marcus = window._proposeNewEntity({ label: 'Marcus', kind: 'named' });
      const marcusId = marcus.entity.id;
      const L = window._relLedger(true);
      L.entities[marcusId].authorProfile = { status: 'ready', guardrails: [],
        cPlusFacets: [{ facet_id: 'test:' + marcusId + ':f1', category: 'value',
          canonical_truth: "Marcus believes the Institution's order matters more than any one person's comfort.",
          possible_pressures: [{ text: 'Marcus defends the Institution', evidence_requires: 'defends the Institution' }] }] };
      const accepted = window._acceptStageProposal('2', {
        present: ['pc', marcusId], location: { label: 'the assembly hall, before the gathered First Favored' },
        issued_facts: [
          { text: 'Marcus defends the Institution\'s authority without hesitation, cutting off the objection before it forms.', participants: [{ ref: marcusId, role: 'subject' }] },
        ],
        issued_objects: [{ label: 'the sealed ledger', owner_or_caretaker_ref: marcusId, addressable_by: [marcusId] }],
        exclusions: { locations: [], objects: [] }, affordances: [], source: 'pc-cg-live-proof-saydo',
      });
      return { marcusId, acceptedOk: accepted.ok, acceptedWhy: accepted.why };
    });
  }, { customSubmit: { action: SAYDO_ACTION, dialogue: SAYDO_DIALOGUE } });
  let saydoPosture = null;
  if (gotRequest) {
    saydoPosture = await page.evaluate(() => window.state._scenePosture && window.state._scenePosture['2']);
    note('SAYDO DIAG scenePosture2=' + JSON.stringify(saydoPosture));
    note('SAYDO DIAG guard log lines: ' + JSON.stringify(ctx.consoleEvents.filter(e => /PC-SAYDO-GUARD/.test(e.text)).map(e => e.text)));
  }
  await page.context().close();
  if (gotRequest) {
    const usr = ctx.cgRequests[ctx.cgRequests.length - 1].usr;
    ok('SAYDO custom posture recorded verbatim', !!saydoPosture && saydoPosture.action === SAYDO_ACTION, JSON.stringify(saydoPosture));
    ok('SAYDO (property 4) PC self-embodiment marker is ABSENT — the reader\'s own submitted Say/Do contradicts the facet\'s claim', !/SELF \(PC-C\+; embodiment, not outsider observation\)/.test(usr));
    ok('SAYDO Marcus\'s NPC C+ STILL fires normally (the guard is targeted at the PC, not a blanket suppression)', /DO NOT STATE: Marcus believes the Institution/.test(usr));
    ok('SAYDO the app\'s own guard actually logged the drop (not a coincidental absence)', ctx.consoleEvents.some(e => /PC-SAYDO-GUARD/.test(e.text)));
  } else {
    ok('SAYDO scenario reached a real cgScreenplay request', false, 'blocked earlier in the real click chain — see FAIL lines above');
  }
  console.log('SAYDO done. cgRequests=' + (ctx.cgRequests ? ctx.cgRequests.length : 0));
}

// ══════════════════════════════════════════════════════════════════════════
// SCENARIO DOUBLESUBMIT — corrective follow-up to 6533f02 (property 5). Two real, rapid clicks
// on the SAME #gnSubmitBtn for the SAME turn. _recordScenePosture's own single-keyed-overwrite
// semantics (verified by reading its source: state._scenePosture[sceneNum] = rec, never an
// array push) make a "duplicate ARRAY entry" structurally impossible regardless — what this
// proves is the REAL user-facing risk: that the app's own existing double-submit latch
// (state._stagedSubmitting, "Guard 2 — double-submit") actually blocks a second real click from
// firing a second generation attempt at all.
// ══════════════════════════════════════════════════════════════════════════
{
  const ctx = {};
  const page = await newStubbedPage(browser, ctx);
  const gotRequest = await driveToCgScreenplayRequest('DOUBLESUBMIT', page, ctx, async (page) => {
    return page.evaluate(() => {
      window._ensureStoryEntityAnchors();
      const marcus = window._proposeNewEntity({ label: 'Marcus', kind: 'named' });
      const marcusId = marcus.entity.id;
      const L = window._relLedger(true);
      L.entities[marcusId].authorProfile = { status: 'ready', guardrails: [],
        cPlusFacets: [{ facet_id: 'test:' + marcusId + ':f1', category: 'value',
          canonical_truth: "Marcus believes the Institution's order matters more than any one person's comfort.",
          possible_pressures: [{ text: 'Marcus defends the Institution', evidence_requires: 'defends the Institution' }] }] };
      const accepted = window._acceptStageProposal('2', {
        present: ['pc', marcusId], location: { label: 'the assembly hall, before the gathered First Favored' },
        issued_facts: [
          { text: 'Marcus defends the Institution\'s authority without hesitation, cutting off the objection before it forms.', participants: [{ ref: marcusId, role: 'subject' }] },
        ],
        issued_objects: [], exclusions: { locations: [], objects: [] }, affordances: [], source: 'pc-cg-live-proof-doublesubmit',
      });
      return { marcusId, acceptedOk: accepted.ok, acceptedWhy: accepted.why };
    });
  }, { customSubmit: { action: 'I hold my ground and say nothing.', dialogue: '' }, doubleClickSubmit: true });
  let doublePosture = null;
  if (gotRequest) {
    doublePosture = await page.evaluate(() => window.state._scenePosture && window.state._scenePosture['2']);
    note('DOUBLESUBMIT DIAG scenePosture2=' + JSON.stringify(doublePosture));
  }
  await page.context().close();
  if (gotRequest) {
    ok('DOUBLESUBMIT (property 5) the recorded posture is a single object, not an array, reflecting exactly one real submission', !!doublePosture && !Array.isArray(doublePosture) && doublePosture.action === 'I hold my ground and say nothing.', JSON.stringify(doublePosture));
  } else {
    ok('DOUBLESUBMIT scenario reached a real cgScreenplay request', false, 'blocked earlier in the real click chain — see FAIL lines above');
  }
  console.log('DOUBLESUBMIT done. cgRequests=' + (ctx.cgRequests ? ctx.cgRequests.length : 0));
}

await browser.close();
const p = results.filter(r => r.pass).length, f = results.length - p;
console.log('\n' + '='.repeat(60));
console.log('TOTAL: ' + p + ' passed, ' + f + ' failed');
if (f) process.exit(1);
process.exit(0);
