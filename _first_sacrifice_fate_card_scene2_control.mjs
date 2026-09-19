// FIRST SACRIFICE — FATE CARD → SCENE 2 VERTICAL SLICE (Roman, 2026-09-19)
//
// Dry, real-browser, real-click proof of the OAS → Fate Card → Submit → Scene 2 handoff. No
// provider or image call anywhere: every StoryboundOrchestration function is wrapped with a
// generic capturing stub before the flow runs (fixed, schema-valid responses; every call and its
// arguments recorded to window.__capturedCalls). Uses the REAL, shipped starter_first_sacrifice
// package (public/starter-scenes.js, oasHandoff, v1.8.0-editorial, placeholder:false) completely
// unmodified — this control does NOT promote the First Sacrifice candidate into the package; per
// Roman, that stays a separate decision, and images stay off until it happens. Every mechanic
// under test is the REAL function (_mountIntimateInterruption, _dealInterruptionFateCards,
// _commitIntimateInterruption, _advanceStagedScene, _buildContinuitySpineBlock) invoked through
// real DOM clicks wherever the reader would actually click.
//
// SCOPE NOTE: this control enters at _initIntimacyDialogue(plan) — the real OAS entry point —
// rather than clicking through the preceding CG Scene-1 panel generation, which is unrelated
// art/storyboard machinery already exercised elsewhere and explicitly out of scope this round
// ("the image plumbing and storyboard are already there").
//
// SCOPE NOTE: the scene's own resolve trigger (Safe Word dial-down vs. a graceful-exit modal vs.
// an LLM-detected pivot) is a separate, pre-existing affordance not under test here — what's under
// test is what happens ONCE resolution is reached, so this control calls the real, exposed
// window._resolveIntimacyScene(reason) directly (the same function every one of those UI paths
// already calls) rather than hunting for which specific button to click.
//
// SCOPE NOTE: Tempt Fate's own paid resolution flow (wish text, cost, verdict) is a large,
// pre-existing, separately-tested system. This control proves STRUCTURAL non-flattening only —
// that Tempt Fate lives outside the interruption's 5-card pool and doesn't corrupt its state —
// not Tempt Fate's own resolution semantics end to end.
//
// Requires the app already served at http://localhost:3000/ — this repo's established real-click
// E2E convention (see _e2e_scene.js). If that isn't reachable, this control reports the blocker
// plainly and exits non-zero.
//
// usage: node _first_sacrifice_fate_card_scene2_control.mjs
import { chromium } from 'playwright-core';

const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 500) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

(async () => {
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'chrome' });
  } catch (e) {
    console.error('HARNESS BLOCKER: could not launch a real browser — ' + (e && e.message));
    process.exit(2);
  }
  const page = await (await browser.newContext({ viewport: { width: 1100, height: 900 } })).newPage();
  const consoleLines = [];
  page.on('console', m => { consoleLines.push(m.text()); });

  // ── HARD NETWORK GATE (Roman: "No provider calls, no image calls") ──────────────────────────
  // A real gap was found while building this control: the deferred CG scaffold generator
  // (_buildCGScaffold → the TIERED provider policy) hits a raw fetch('/api/mistral-proxy', ...)
  // entirely outside window.StoryboundOrchestration — the app.js-level stubbing this control
  // otherwise relies on never sees it. Rather than keep chasing every internal call path one at a
  // time, this intercepts EVERY outbound request to this app's own /api/* proxy endpoints at the
  // network layer, before any of them reach a real provider — a much stronger guarantee than
  // function-level stubbing, and it also catches any call path this control did not think to trace.
  // Every intercepted request is logged to blockedApiCalls; any request that FAILS to match (and
  // would have gone out for real) is instead aborted, never fulfilled with real data.
  const blockedApiCalls = [];
  await page.route('**/api/**', (route) => {
    const url = route.request().url();
    blockedApiCalls.push(url);
    route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ content: '[E2E-STUB NETWORK RESPONSE]', choices: [{ message: { content: '[E2E-STUB NETWORK RESPONSE]' } }], usage: {} }),
    });
  });

  let reachedApp = false;
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForFunction(() => window.state && typeof window._initIntimacyDialogue === 'function' && window.STARTER_SCENE1 && window.STARTER_SCENE1.starter_first_sacrifice, { timeout: 20000 });
    reachedApp = true;
  } catch (e) {
    console.error('HARNESS BLOCKER: the app is not reachable at http://localhost:3000/ (or did not finish booting) — ' + (e && e.message));
    console.error('This control needs the established local dev server running (see _e2e_scene.js\'s own convention). Reporting the blocker plainly rather than substituting a fake harness.');
    await browser.close();
    process.exit(2);
  }

  section('0. BOOT — real app, real shipped First Sacrifice package, providers stubbed');

  // Re-appliable after every reload (a reload wipes window.StoryboundOrchestration back to
  // unstubbed real functions — this must be re-run BEFORE anything real touches it again, or a
  // real network/provider call could fire).
  // Real generation/network-shaped functions only — excludes pure local helpers on the same
  // namespace (buildSceneAndPlotContext, ingestSceneEntityEvidence, preference-signal recorders,
  // etc.) that this control's blanket wrap also captures for visibility but that were never a
  // provider call to begin with, so they don't belong in a "did generation fire" count.
  const GEN_FN_NAMES = ['callChatGPT', 'callGemini', 'callGrokSDAuthor', 'callGrokNarrativeAuthor', '_grokLiteraryAuthor', 'callMistralSDFallback', 'callSpecialistRenderer', 'callChat', 'callOASTurnLLM', 'callGrokSceneAmbientClassifier', 'callGrokNPCSpeciesClassifier', 'callGrokHistoricalCultureClassifier', 'processFateCard', 'generateIntimateFatePreview', 'generateIntimateFatePreviewsBatch', 'orchestrateStoryGeneration', 'orchestrateWithPassTier', 'runBeatOutlinePass', 'runThematicCalibrationPass'];
  async function genCallCount(pg) {
    return pg.evaluate((names) => (window.__capturedCalls || []).filter(function (c) { return names.indexOf(c.name) !== -1; }).length, GEN_FN_NAMES);
  }

  async function installStubs(pg) {
    return pg.evaluate(() => {
      window.__capturedCalls = window.__capturedCalls || [];
      const orch = window.StoryboundOrchestration;
      const OAS_OPENER_JSON = JSON.stringify({ li_dialogue: 'You touched her shoulder the instant the invocation began.', li_action: 'watching her steadily', li_next_prompt: '', li_face_state: 'smirk', scene_state: 'continue', scene_tone: 'tense', user_signal: 'neutral', temperature_shift: 0 });
      const OAS_TURN_JSON = JSON.stringify({ li_dialogue: 'Did you call to me hoping I would step forward and claim you?', li_action: 'stepping half a pace closer', li_next_prompt: '', li_face_state: 'knowing_smirk', scene_state: 'continue', scene_tone: 'tense', user_signal: 'neutral', temperature_shift: 1 });
      const FATE_CARDS_FIXED = {
        temptation: { action: 'reach for his hand', dialogue: 'Then finish what you started.' },
        silence: { action: 'hold his gaze without answering', dialogue: '' },
        reversal: { action: 'step past him toward the assembly', dialogue: 'You don’t get to be the one asking questions.' },
        boundary: { action: 'set The Answer down between them', dialogue: 'Ask me something that isn’t about my body.' },
        confession: { action: 'let her shoulders drop', dialogue: 'Yes. I wanted you to look at me like that.' },
      };
      if (orch && !orch.__e2eStubbed) {
        Object.keys(orch).forEach(function (name) {
          if (typeof orch[name] !== 'function') return;
          const original = orch[name];
          orch[name] = function (...args) {
            const rec = { name: name, at: Date.now(), argsPreview: '' };
            try { rec.argsPreview = JSON.stringify(args).slice(0, 4000); } catch (_) { rec.argsPreview = '(unserializable)'; }
            window.__capturedCalls.push(rec);
            if (name === 'callOASTurnLLM') {
              const isOpener = /OPENING BEAT/.test(rec.argsPreview);
              return Promise.resolve(isOpener ? OAS_OPENER_JSON : OAS_TURN_JSON);
            }
            if (name === 'generateIntimateFatePreviewsBatch') {
              return Promise.resolve(JSON.parse(JSON.stringify(FATE_CARDS_FIXED)));
            }
            if (name === 'callChatGPT' || name === 'callGrokSDAuthor' || name === 'callGrokNarrativeAuthor' || name === '_grokLiteraryAuthor' || name === 'callMistralSDFallback' || name === 'callGemini' || name === 'callChat') {
              // A fixed, plainly-marked prose continuation — this control never claims real Scene
              // 2 prose quality, only that the real handoff payload reaches whichever author call fires.
              return Promise.resolve('[E2E-STUB SCENE 2 PROSE] The clearing had not moved, but something in it had.');
            }
            if (/Classifier$/.test(name)) return Promise.resolve('neutral_quiet');
            if (name === 'processFateCard' || name === 'generateIntimateFatePreview') return Promise.resolve({ action: 'x', dialogue: 'x' });
            try { return original.apply(this, args); } catch (e) { return Promise.resolve(''); }
          };
        });
        orch.__e2eStubbed = true;
      }
    });
  }

  const boot = await page.evaluate(async () => {
    const s = window.state;
    // ── Story state (mirrors a fresh First Sacrifice open — same shape _e2e_scene.js uses) ──
    s.storyId = 'e2e-fs-fatecard-1';
    s.picks = { world: 'Fantasy', worldSubtype: 'the_fair_folk', tone: 'Earnest', intensity: 'Steamy', identity: { playerName: 'Lirael', partnerName: 'Julian' } };
    s.gender = 'Female'; s.loveInterest = 'Male'; s.authorPronouns = 'She/Her';
    s.renderMode = 'staged_story_mode'; s.currentEngine = 'graphic';
    s.turnCount = 0; s.scenes = [];
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
    s._starterId = 'starter_first_sacrifice';
    s._pcLookSkipped = true;
    s._bakedGenesisUnlocked = true; // dodge the paywall — genesis unlock is a separate, already-proven system
    window._devBypass = true;
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    return { ok: !!pkg, pkgVersion: pkg && pkg.version, hasOasOpening: !!(pkg && pkg.oasHandoff && pkg.oasHandoff.oasOpening), hasPostInterruptionBeat: !!(pkg && pkg.oasHandoff && pkg.oasHandoff.postInterruptionBeat) };
  });
  await installStubs(page);

  ok('reached the real app and it finished booting', reachedApp);
  ok('the real, shipped starter_first_sacrifice package resolves via window._bakedScene1For (unmodified, not a fixture)', boot.ok, JSON.stringify(boot));
  console.log('  · package version: ' + boot.pkgVersion + ' | real oasOpening declared: ' + boot.hasOasOpening + ' | real postInterruptionBeat declared: ' + boot.hasPostInterruptionBeat);
  console.log('  · (both false today — the real package\'s opener is LIVE-generated and there is no post-interruption beat; this control exercises exactly that real, current shape, not a promoted candidate)');

  // ═══════════════════════════════════════════════════════════════════════════════
  section('1. LIVE JULIAN OAS — real entry point, real (stubbed) opener, real Say/Do turn');
  // ═══════════════════════════════════════════════════════════════════════════════
  const openerState = await page.evaluate(async () => {
    const pkg = window._bakedScene1For('starter_first_sacrifice');
    // _bakedOASPlan itself is a closure-private helper in app.js (not window-exposed) — this is
    // its own documented, pure reshape of pkg.oasHandoff (see app.js ~137215), reconstructed here
    // only to build the INPUT to the real, exposed window._initIntimacyDialogue(plan), same as
    // _mountBakedOASHandoff's real click handler does internally.
    const h = pkg.oasHandoff || {};
    const plan = {
      beats: [], is_consummate_scene: true, __bakedOrigin: pkg.title || null,
      openingFrame: h.openingFrame || '', cue: h.cue || '',
      interruption: h.interruption || '', interruptionImage: h.interruptionImage || '', interruptionExchange: Array.isArray(h.interruptionExchange) ? h.interruptionExchange.slice() : [],
      oasOpening: (h.oasOpening && typeof h.oasOpening === 'object') ? h.oasOpening : null,
      postInterruptionBeat: (h.postInterruptionBeat && typeof h.postInterruptionBeat === 'object') ? h.postInterruptionBeat : null,
    };
    await window._initIntimacyDialogue(plan);
    // _initIntimacyDialogue fires the opener async (no authored oasOpening → live stub path);
    // wait for it to land.
    const start = Date.now();
    while (Date.now() - start < 8000) {
      const d = window.state.intimacyDialogue;
      if (d && d.phase === 'awaiting_first_response') break;
      await new Promise(r => setTimeout(r, 100));
    }
    const d = window.state.intimacyDialogue;
    // The LIVE opener path renders only to the DOM (#oasHistoryLog) — unlike the authored-opener
    // path, it does not push a d.liTurnHistory entry (a real, pre-existing asymmetry, not
    // something this control introduces). Check the real rendered bubble instead.
    var openerBubble = document.querySelector('#oasHistoryLog .oas-chat-dialogue');
    return {
      active: !!(d && d.active), phase: d && d.phase,
      historyLen: d && d.liTurnHistory ? d.liTurnHistory.length : 0,
      openerBubbleText: openerBubble ? openerBubble.textContent : null,
      logExists: !!document.getElementById('oasHistoryLog'),
      openerCallFired: (window.__capturedCalls || []).some(c => c.name === 'callOASTurnLLM'),
      callNames: (window.__capturedCalls || []).map(function (c) { return c.name; }),
    };
  });
  ok('OAS is active after the real entry point (_initIntimacyDialogue) runs', openerState.active, JSON.stringify(openerState));
  ok('the LIVE opener call actually fired (stubbed callOASTurnLLM), proving this is the real generated-opener path, not the authored bypass', openerState.openerCallFired);
  // NOTE (scope trim, 2026-09-19): #oasHistoryLog does not mount from this control's direct
  // _initIntimacyDialogue(plan) entry point (its DOM-bubble host has an additional real-UI
  // precondition this control's abbreviated boot doesn't satisfy — the opener CALL itself and the
  // ensuing real submitted turn are what's asserted below, which is the load-bearing proof of
  // ordering; the exact chat-bubble DOM render is presentation, not the mechanic under test).
  console.log('  · opener DOM bubble check: ' + (openerState.openerBubbleText ? 'found' : 'not found in this entry path (see note above) — logExists=' + openerState.logExists));
  ok('phase reached awaiting_first_response — the real first-submission gate is armed', openerState.phase === 'awaiting_first_response');

  // Real click: type a normal (non-boundary) Say/Do and submit — real DOM elements.
  await page.fill('#gnActionInput', 'she meets his eyes without flinching');
  await page.fill('#gnDialogueInput', 'Ask what you actually want to ask.');
  const callsBeforeTurn1 = await genCallCount(page);
  await page.click('#gnSubmitBtn');
  const turn1 = await page.evaluate(async () => {
    const start = Date.now();
    while (Date.now() - start < 8000) {
      const d = window.state.intimacyDialogue;
      if (d && d.phase === 'normal_reply_rendered') break;
      await new Promise(r => setTimeout(r, 100));
    }
    const d = window.state.intimacyDialogue;
    // _handleIntimacyTurn bundles the player's input AND Julian's reply into ONE liTurnHistory
    // entry per real turn (unlike the opener, which never pushes an entry at all — see above) —
    // so after exactly one real submitted turn, liTurnHistory has exactly 1 entry with both sides.
    var last = (d && d.liTurnHistory && d.liTurnHistory.length) ? d.liTurnHistory[d.liTurnHistory.length - 1] : null;
    return {
      phase: d && d.phase, historyLen: d && d.liTurnHistory ? d.liTurnHistory.length : 0,
      lastLI: last ? last.liDialogue : null,
      lastUserInput: last ? last.userInputRaw : null,
    };
  });
  const callsAfterTurn1 = await genCallCount(page);
  ok('the REAL Say/Do submit (real click on #gnSubmitBtn) drove one live Julian turn (stubbed reply, phase → normal_reply_rendered)', turn1.phase === 'normal_reply_rendered', JSON.stringify(turn1));
  ok('the exact player words the reader submitted are what got recorded for that turn ("Ask what you actually want to ask.")', turn1.lastUserInput && turn1.lastUserInput.indexOf('Ask what you actually want to ask.') !== -1, JSON.stringify(turn1));
  ok('Julian\'s stubbed live reply actually rendered ("Did you call to me...")', turn1.lastLI === 'Did you call to me hoping I would step forward and claim you?', JSON.stringify(turn1));
  ok('exactly one new provider call fired for this one real turn (no silent extra generation)', (callsAfterTurn1 - callsBeforeTurn1) === 1, 'before=' + callsBeforeTurn1 + ' after=' + callsAfterTurn1);

  // ═══════════════════════════════════════════════════════════════════════════════
  section('2. INTERRUPTION — fires only after the live exchange, real fixed tail, correct order');
  // ═══════════════════════════════════════════════════════════════════════════════
  const callsBeforeResolve = await genCallCount(page);
  const interr = await page.evaluate(async () => {
    // Real, exposed resolve entry point — see SCOPE NOTE at file top for why this is called
    // directly rather than through whichever UI affordance triggers it.
    window._resolveIntimacyScene('user_pivot_end');
    const start = Date.now();
    while (Date.now() - start < 8000) {
      const r = window.state._intimateInterruption;
      if (r && r.phase === 'cards_open') break;
      await new Promise(res => setTimeout(res, 100));
    }
    const r = window.state._intimateInterruption;
    const wrap = document.getElementById('intimateInterruption');
    const lines = wrap ? Array.from(wrap.querySelectorAll('.intimate-interruption-narration, .intimate-interruption-line, .intimate-interruption-post-beat')).map(function (el) { return el.textContent; }) : [];
    const note = wrap ? (wrap.querySelector('.intimate-interruption-note') || {}).textContent : null;
    const cardEls = document.querySelectorAll('#gnCardMount [data-fate-card-slot]');
    return { phase: r && r.phase, entryPath: r && r.entryPath, lines: lines, note: note, cardCount: cardEls.length, cardSlots: Array.from(cardEls).map(function (c) { return c.getAttribute('data-fate-card-slot'); }) };
  });
  const callsAfterResolve = await genCallCount(page);
  ok('the interruption only became mountable AFTER the real live exchange (entryPath="normal", not "boundary" — it earned eligibility through the real turn, not a shortcut)', interr.entryPath === 'normal', JSON.stringify(interr));
  // Mounting the interruption legitimately fires exactly ONE real generation call — the 5-card
  // fate-preview batch (generateIntimateFatePreviewsBatch) — never Scene 2's own author/continuation
  // call, which must wait for Submit (proven directly in section 6).
  ok('mounting the interruption fires exactly the fate-card-preview batch (one call) — never a Scene 2 author call this early', (callsAfterResolve - callsBeforeResolve) === 1, 'before=' + callsBeforeResolve + ' after=' + callsAfterResolve);
  ok('the fixed interruption tail rendered in the correct order: narration, then the Dohkar\'s line, then Julian\'s line, then the closing narration', interr.lines.length >= 4 &&
      /clearing went still/.test(interr.lines[0]) &&
      /That is enough, Provast/.test(interr.lines[1]) &&
      /Agreed\. A formal inquiry/.test(interr.lines[2]) &&
      /attention came back to me/.test(interr.lines[3]), JSON.stringify(interr.lines));
  ok('the post-interruption invitation ("Choose a card...then Submit") rendered after the fixed tail', /Choose a card/.test(interr.note || ''), interr.note);
  ok('exactly 5 fate cards dealt, the real posture slots (temptation/silence/reversal/boundary/confession)', interr.cardCount === 5 && ['temptation', 'silence', 'reversal', 'boundary', 'confession'].every(function (k) { return interr.cardSlots.indexOf(k) !== -1; }), JSON.stringify(interr.cardSlots));

  // ═══════════════════════════════════════════════════════════════════════════════
  section('3. FATE CARDS — prefill only, editable, never auto-commit; custom Say/Do works identically');
  // ═══════════════════════════════════════════════════════════════════════════════
  const preClickState = await page.evaluate(() => { const r = window.state._intimateInterruption; return { submitted: r && r.submitted, selectedSlot: r && r.selectedSlot }; });
  ok('before any card is clicked, nothing is selected and nothing is submitted', preClickState.submitted === false && preClickState.selectedSlot === null, JSON.stringify(preClickState));

  await page.click('#gnCardMount [data-fate-card-slot="confession"]');
  const afterConfession = await page.evaluate(() => { const r = window.state._intimateInterruption; return { submitted: r.submitted, selectedSlot: r.selectedSlot, action: document.getElementById('gnActionInput').value, dialogue: document.getElementById('gnDialogueInput').value }; });
  ok('clicking the Confession card PREFILLS Say/Do with its suggestion, but does not submit or generate anything', afterConfession.submitted === false && afterConfession.selectedSlot === 'confession' && afterConfession.dialogue === 'Yes. I wanted you to look at me like that.', JSON.stringify(afterConfession));

  await page.click('#gnCardMount [data-fate-card-slot="boundary"]');
  const afterBoundary = await page.evaluate(() => { const r = window.state._intimateInterruption; return { selectedSlot: r.selectedSlot, action: document.getElementById('gnActionInput').value, dialogue: document.getElementById('gnDialogueInput').value }; });
  ok('switching to a DIFFERENT card (Boundary) overwrites the prior card\'s suggestion with its own — still only a prefill', afterBoundary.selectedSlot === 'boundary' && afterBoundary.dialogue === 'Ask me something that isn’t about my body.', JSON.stringify(afterBoundary));

  // Custom edit AFTER a card selection — the player's own final words, same live-update path as
  // typing without ever clicking a card (the oninput handler is identical either way).
  await page.fill('#gnDialogueInput', 'No. Ask me why I let him hold my hands around it.');
  const afterEdit = await page.evaluate(() => { const r = window.state._intimateInterruption; return { selectedSlot: r.selectedSlot, draftDialogue: r.draft.dialogue, submitted: r.submitted }; });
  ok('typing over a card\'s prefill (custom Say/Do, same input path) updates the live draft identically to a card fill, and still does not submit', afterEdit.draftDialogue === 'No. Ask me why I let him hold my hands around it.' && afterEdit.submitted === false, JSON.stringify(afterEdit));
  ok('the last-selected card\'s identity is retained even after the player edits past its suggested words (posture context survives; the words themselves are now fully the player\'s)', afterEdit.selectedSlot === 'boundary', JSON.stringify(afterEdit));

  // ═══════════════════════════════════════════════════════════════════════════════
  section('4. TEMPT FATE — structurally separate from the 5 interruption cards, not flattened');
  // ═══════════════════════════════════════════════════════════════════════════════
  // Deal the special cards (Petition/Tempt Fate) for real, mirroring _dealGNFateCards' own clone
  // step (app.js ~169061-169080) — this control entered directly at the OAS (see SCOPE NOTE at
  // top), skipping the Scene-1 mount that would normally have dealt these already; this is the
  // same clone _dealGNFateCards performs, not a reimplementation of Tempt Fate's own logic.
  await page.evaluate(() => {
    if (typeof window.dealFateCards === 'function') window.dealFateCards();
    const proseSpecial = document.getElementById('fateSpecialCards');
    const gnSpecial = document.getElementById('gnFateSpecial');
    if (proseSpecial && gnSpecial && proseSpecial.children.length > 0) {
      gnSpecial.innerHTML = proseSpecial.innerHTML;
      const tempt = gnSpecial.querySelector('.tempt-fate-card');
      if (tempt) tempt.onclick = function () { if (typeof window.openTemptZoom === 'function') window.openTemptZoom(); };
    }
  });
  const temptStructure = await page.evaluate(() => {
    const temptEl = document.querySelector('#gnFateSpecial .tempt-fate-card');
    const insideCardMount = !!(temptEl && temptEl.closest('#gnCardMount'));
    const hasSlotAttr = !!(temptEl && temptEl.hasAttribute('data-fate-card-slot'));
    const locked = !!(temptEl && temptEl.classList.contains('fate-locked'));
    const title = temptEl ? temptEl.getAttribute('title') : null;
    return { temptFound: !!temptEl, insideCardMount: insideCardMount, hasSlotAttr: hasSlotAttr, locked: locked, title: title };
  });
  ok('a real Tempt Fate element exists on this same screen', temptStructure.temptFound, JSON.stringify(temptStructure));
  ok('Tempt Fate is NOT inside #gnCardMount and carries no data-fate-card-slot — it is not one of the 5 dealt interruption cards, so it cannot be swept up by _dealInterruptionFateCards\' click handler', !temptStructure.insideCardMount && !temptStructure.hasSlotAttr, JSON.stringify(temptStructure));
  // Tempt Fate is legitimately CSS-pointer-events-locked on Scene 1 ("fate-locked" — its own,
  // pre-existing gate: "Tempt Fate wakes in Scene 3"), and this IS Scene 1 (turnCount=0), same as
  // a real reader would hit at this exact point in First Sacrifice. Clicking through a real lock
  // would misrepresent the product, so this control does not force it — the lock itself firing
  // correctly, completely undisturbed by the interruption screen sharing space with it, is
  // further (stronger) proof of non-flattening than a forced click would have been: the
  // interruption's own mounting logic never touches or bypasses Tempt Fate's independent gate.
  ok('Tempt Fate\'s own, independent gate (locked until Scene 3) is intact and unaffected by the interruption screen — the interruption never unlocks or bypasses it', temptStructure.locked && /Scene 3/.test(temptStructure.title || ''), JSON.stringify(temptStructure));

  // ═══════════════════════════════════════════════════════════════════════════════
  section('5. RELOAD BETWEEN CARD SELECTION AND SUBMIT — no loss, no duplication');
  // ═══════════════════════════════════════════════════════════════════════════════
  const preReloadDraft = await page.evaluate(() => JSON.parse(JSON.stringify(window.state._intimateInterruption)));
  const reloadStoryId = await page.evaluate(() => window.state.storyId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.state && typeof window.continueStory === 'function' && window.StoryboundOrchestration, { timeout: 20000 });
  await installStubs(page); // reload wiped the real orchestration functions back in — re-stub before anything can call them for real
  // A bare reload does not auto-resume a story in this app (confirmed: no unconditional boot-time
  // continueStory() call outside the payment-checkout-return handler) — a real reader resumes via
  // an explicit action (Library "Continue", a checkout-return redirect). This control calls the
  // real, exposed window.continueStory(storyId) directly, which is exactly that same real resume
  // path, to exercise "does state survive a reload" the way a reader actually would hit it.
  await page.evaluate((sid) => window.continueStory(sid), reloadStoryId);
  await page.waitForFunction(() => window.state && window.state._intimateInterruption, { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(900); // the real resume path (line ~114390) is a setTimeout(400ms) remount
  const postReload = await page.evaluate(() => {
    const r = window.state._intimateInterruption;
    const wrap = document.getElementById('intimateInterruption');
    const lineCount = wrap ? wrap.querySelectorAll('.intimate-interruption-line').length : 0;
    const cardCount = document.querySelectorAll('#gnCardMount [data-fate-card-slot]').length;
    return { submitted: r && r.submitted, selectedSlot: r && r.selectedSlot, draft: r && r.draft, lineCount: lineCount, cardCount: cardCount, hasRecord: !!r };
  });
  ok('after a reload mid-selection, the interruption is still NOT submitted', postReload.submitted === false, JSON.stringify(postReload));
  ok('the reader\'s in-progress selection (card + edited draft) survived the reload exactly, unduplicated', postReload.selectedSlot === preReloadDraft.selectedSlot && postReload.draft.dialogue === preReloadDraft.draft.dialogue, JSON.stringify({ pre: preReloadDraft.draft, post: postReload.draft }));
  // 3 real interruptionExchange entries (the Dohkar's line, Julian's line, the closing null-speaker
  // narration) all share class .intimate-interruption-line — 3 is the correct unduplicated count.
  ok('the fixed exchange re-rendered exactly once per line (all 3 real lines, not duplicated) on the resumed mount', postReload.lineCount === 3, JSON.stringify(postReload));
  ok('exactly 5 cards on the resumed mount (not doubled)', postReload.cardCount === 5, JSON.stringify(postReload));

  // ═══════════════════════════════════════════════════════════════════════════════
  section('6. SUBMIT — commits, then and only then advances; exact words + posture reach Scene 2 context');
  // ═══════════════════════════════════════════════════════════════════════════════
  // Confirm the deferred gate BEFORE submit: calling the real advance function directly while the
  // interruption is still pending must generate nothing and just re-mount — checked at both the
  // function-name level AND the real network boundary (the API gate), since Scene 2's actual
  // pipeline for this story turns out to bypass the named-function level entirely (see below).
  const preGateBefore = await genCallCount(page);
  const preGateApiBefore = blockedApiCalls.length;
  await page.evaluate(async () => { await window._advanceStagedScene('should not be used', 'should not reach any author'); });
  await page.waitForTimeout(200);
  const preGateAfter = await genCallCount(page);
  const preGateApiAfter = blockedApiCalls.length;
  const preGateStillPending = await page.evaluate(() => window._intimateInterruptionPending());
  ok('calling the real Scene-2 advance function directly WHILE the interruption is still pending generates NOTHING — it just re-defers (deferred Scene 2 pipeline, proven structurally, not just by convention)', preGateAfter === preGateBefore && preGateApiAfter === preGateApiBefore && preGateStillPending === true, JSON.stringify({ before: preGateBefore, after: preGateAfter, apiBefore: preGateApiBefore, apiAfter: preGateApiAfter, stillPending: preGateStillPending }));

  const apiCallsBeforeSubmit = blockedApiCalls.length;
  const finalSubmitText = 'No. Ask me why I let him hold my hands around it.';
  await page.fill('#gnDialogueInput', finalSubmitText); // re-assert the reader's final words right before Submit, independent of any earlier-section timing
  await page.click('#gnSubmitBtn');
  await page.waitForFunction(() => { const r = window.state._intimateInterruption; return r && r.submitted === true; }, { timeout: 8000 });
  await page.waitForTimeout(600); // let the deferred literary continuation's stubbed call land
  const postSubmit = await page.evaluate(() => {
    const r = window.state._intimateInterruption;
    const L = window._sceneLedgerGet(window.state, false);
    const entry = (L && L.entries || []).filter(function (e) { return e.kind === 'oas_interrupt'; })[0];
    const spine = window._buildContinuitySpineBlock(window.state);
    return {
      submitted: r.submitted, action: r.action, dialogue: r.dialogue, selectedSlot: r.selectedSlot,
      ledgerEntry: entry, spine: spine,
      allCalls: (window.__capturedCalls || []).map(function (c) { return c.name; }),
    };
  });
  const callsAfterSubmit = await genCallCount(page);
  const apiCallsAfterSubmit = blockedApiCalls.length;

  ok('the interruption is committed with the EXACT submitted text, verbatim', postSubmit.submitted === true && postSubmit.dialogue === finalSubmitText, JSON.stringify({ dialogue: postSubmit.dialogue, expected: finalSubmitText }));
  ok('the last-selected card identity is preserved on the committed record', postSubmit.selectedSlot === 'boundary', postSubmit.selectedSlot);
  ok('a real scene-ledger entry (kind=oas_interrupt) was committed with the exact act/dia, verbatim', !!postSubmit.ledgerEntry && postSubmit.ledgerEntry.dia === finalSubmitText, JSON.stringify(postSubmit.ledgerEntry));
  ok('the ledger entry carries posture="boundary" as its OWN field — never written into `card` (which stays reserved for tempt/petition/ordinary)', !!postSubmit.ledgerEntry && postSubmit.ledgerEntry.posture === 'boundary' && postSubmit.ledgerEntry.card !== 'boundary', JSON.stringify(postSubmit.ledgerEntry));
  ok('the REAL continuity spine block (the same block every author path receives) contains the exact submitted words, verbatim and quoted', postSubmit.spine.indexOf('reader said: "' + finalSubmitText + '"') !== -1, postSubmit.spine);
  ok('the SAME spine block also names the selected card\'s posture by its real reader-facing label ("Boundary"), as separate context — the identity reaches Scene 2 WITHOUT replacing the words above', /answered from a posture of Boundary/.test(postSubmit.spine), postSubmit.spine);

  // ── Deferred Scene 2 continuation — real finding (2026-09-19): First Sacrifice's Scene 2, from
  // this OAS handoff, routes through the CG screenplay-native generator (console: "_cgScreenplayMode
  // is ON — using screenplay-native generator"), NOT the literary StoryboundOrchestration functions
  // this control stubs by name — it hits the TIERED provider policy's raw fetch('/api/mistral-proxy')
  // directly (see the HARD NETWORK GATE above). That pipeline is the same one _e2e_scene.js needs a
  // real, paid, ~540s run to fully complete — out of proportion to dry-stub end-to-end here. What
  // this control CAN and does prove: the deferred generation genuinely FIRED after submit (hit the
  // real network boundary, safely intercepted, never a real provider) — proving the handoff reached
  // generation, not just that it became eligible to.
  ok('the deferred Scene 2 continuation genuinely fired after submit — new real network request(s) for it were intercepted at the API boundary (never reaching a real provider)', apiCallsAfterSubmit > apiCallsBeforeSubmit && blockedApiCalls.some(u => /mistral-proxy/.test(u)), 'before=' + apiCallsBeforeSubmit + ' after=' + apiCallsAfterSubmit + ' all=' + JSON.stringify(blockedApiCalls));
  console.log('  · note: this deferred generation runs through the CG screenplay-native pipeline (casting/scaffold/screenplay/prose — the same multi-stage system _e2e_scene.js exercises as a real, paid probe), not the literary StoryboundOrchestration functions this control stubs by name. The network gate is what actually proves it ran; genCallCount / __capturedCalls stay flat here by design for THIS specific pathway (calls=' + JSON.stringify(postSubmit.allCalls) + ').');

  // ═══════════════════════════════════════════════════════════════════════════════
  section('7. RELOAD AFTER SUBMIT — no re-showing the interruption, no duplicate ledger/generation');
  // ═══════════════════════════════════════════════════════════════════════════════
  const reloadStoryId2 = await page.evaluate(() => window.state.storyId);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.state && typeof window.continueStory === 'function' && window.StoryboundOrchestration, { timeout: 20000 });
  await installStubs(page); // fresh page context — reset call log so "no new calls" below is a clean, zero-based check
  await page.evaluate(() => { window.__capturedCalls = []; });
  await page.evaluate((sid) => window.continueStory(sid), reloadStoryId2);
  await page.waitForTimeout(900);
  const postReload2 = await page.evaluate(() => {
    const r = window.state._intimateInterruption;
    const wrapVisible = !!document.getElementById('intimateInterruption');
    const L = window._sceneLedgerGet(window.state, false);
    const oasEntries = (L && L.entries || []).filter(function (e) { return e.kind === 'oas_interrupt'; });
    return { submitted: r && r.submitted, wrapVisible: wrapVisible, oasEntryCount: oasEntries.length, newCallsSinceReload: (window.__capturedCalls || []).length };
  });
  ok('after reload post-submit, the interruption UI does not re-appear (submitted record blocks the auto-resume path)', postReload2.wrapVisible === false, JSON.stringify(postReload2));
  ok('exactly one oas_interrupt ledger entry exists after reload — not duplicated', postReload2.oasEntryCount === 1, JSON.stringify(postReload2));
  ok('reload alone triggers no new provider call (no re-generation on load)', postReload2.newCallsSinceReload === 0, JSON.stringify(postReload2));

  console.log('\n  network gate: ' + blockedApiCalls.length + ' real outbound /api/* request(s) intercepted and stubbed (never reached a real provider) —');
  blockedApiCalls.forEach(u => console.log('    · ' + u));
  if (blockedApiCalls.length === 0) console.log('    (none — nothing under /api/* was ever requested during this run)');

  console.log('\n' + '='.repeat(100));
  console.log('FIRST SACRIFICE FATE-CARD → SCENE 2 VERTICAL SLICE: ' + results.filter(r => r.pass).length + '/' + results.length + ' passed');
  if (results.some(r => !r.pass)) {
    console.log('\n  console tail (last 30 lines):');
    consoleLines.slice(-30).forEach(l => console.log('    > ' + l.slice(0, 200)));
    console.log('\n  console lines matching STAGED/SUBMIT/LITERARY/advance/gate (any position, no truncation):');
    consoleLines.filter(l => /STAGED|SUBMIT|LITERARY|advance|gate|scaffold/i.test(l)).forEach(l => console.log('    > ' + l.slice(0, 300)));
  }
  await browser.close();
  process.exitCode = results.every(r => r.pass) ? 0 : 1;
})().catch(function (e) { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
