// Full-issue generation harness for the intra-story repetition/progression audit.
// Drives the LIVE app at localhost:3000 through ONE complete issue (CG=10, Literary=20),
// captures every scene's FINAL prose via the _auditSceneEmotionalGravity hook (fires once
// per scene), advances via synthetic Say/Do. Images BLOCKED in both paths (route-abort).
//
//   MODE=literary node _issue_gen.js   -> /tmp/issue_literary.json (20 scenes)
//   MODE=cg       node _issue_gen.js   -> /tmp/issue_cg.json       (10 scenes)
//   TARGET=2 MODE=... node _issue_gen.js   (smoke a short run)
//
// Same world/flavor/archetype both modes; only renderMode differs.

const { chromium } = require('playwright-core');
const fs = require('fs');

const MODE = (process.env.MODE || 'literary').toLowerCase();
const IS_CG = MODE === 'cg';
const TARGET = parseInt(process.env.TARGET, 10) || (IS_CG ? 10 : 20);
const HOTFAST = process.env.HOTFAST === '1';   // HOTFAST=1 → literary Hot&Fast (short hot S1 + deferred-setup packet)
const FORCEDEBT = process.env.FORCEDEBT === '1'; // FORCEDEBT=1 → force the PC-embodiment debt to exercise the Scene-2 payment path
const PLOTCONTRACT = process.env.PLOTCONTRACT === '1'; // PLOTCONTRACT=1 → enable the gated literary plot-contract obligation ledger
// CONTINUATION-WINDOW EXPERIMENT (Roman 2026-07-19) — all additive, all default-off.
// ARM sets window._SB_CONT_WINDOW.literary before generation. ARM=600 reproduces the
// PRE-change behaviour exactly: maxScenes:0 makes the ring loop exit immediately, so the
// builder falls through to the legacy `all.slice(-600)` char slice + sentence trim.
const ARMS = {
  '600':   { floorChars:   600, ceilChars: 11000, maxScenes: 0 },  // legacy char-slice
  '5500':  { floorChars:  5500, ceilChars: 11000, maxScenes: 2 },
  '11000': { floorChars: 11000, ceilChars: 12000, maxScenes: 3 }
};
const ARM = process.env.ARM || null;                 // null → leave app defaults untouched
const OUT = process.env.OUT || `/tmp/issue_${MODE}.json`;
const CONSOLE_OUT = process.env.CONSOLE_OUT || null; // full [TAG] console capture for _observatoryReport
const RUN_LABEL = process.env.RUN_LABEL || '';
const PER_SCENE_TIMEOUT = 340000; // ms
if (ARM && !ARMS[ARM]) { console.error(`DRIVER-ERR unknown ARM=${ARM} (want ${Object.keys(ARMS).join('|')})`); process.exit(1); }

// Synthetic player inputs: generic-but-escalating relational/agency beats that do
// NOT script a specific A-plot — the engine owns plot specifics (what we audit).
// Index i drives scene i+2 (scene 1 = begin). Same sequence both modes.
const INPUTS = [
  { a: "I stand my ground instead of backing down.",                 d: "I'm not going to pretend this doesn't matter." },
  { a: "I push for the truth about what he's really doing here.",     d: "Tell me what you actually want from me." },
  { a: "I follow the thread I'm not supposed to notice.",             d: "" },
  { a: "I confront him with what I found.",                           d: "I know what you've been hiding. Don't lie to me." },
  { a: "I let my guard down for a moment, then catch myself.",        d: "This can't happen. You know that." },
  { a: "I make a choice that costs me something.",                    d: "If this is the price, I'll pay it." },
  { a: "I refuse the easy way out he offers.",                        d: "I don't want your help. I want the truth." },
  { a: "I close the distance between us.",                            d: "Stop talking." },
  { a: "I pull back, suddenly afraid of how much I want this.",       d: "I shouldn't be here." },
  { a: "I decide to fight back on my own terms.",                     d: "They picked the wrong person to corner." },
  { a: "I expose the secret I've been protecting.",                   d: "You should know the truth about me before this goes further." },
  { a: "I test whether I can trust him with everything.",             d: "Prove it. Right now." },
  { a: "I walk into the danger instead of away from it.",             d: "I'm done waiting for it to come to me." },
  { a: "I let him see how much it hurt.",                             d: "You don't get to disappear and come back like nothing happened." },
  { a: "I make the move I've been afraid to make.",                   d: "I'm tired of pretending I don't feel this." },
  { a: "I face the consequence I've been dreading.",                  d: "Whatever happens next, I did this with my eyes open." },
  { a: "I refuse to be anyone's secret.",                             d: "If you want me, you want all of it. In the open." },
  { a: "I force the confrontation to a head.",                        d: "Choose. Now." },
  { a: "I stand at the threshold of the decision that changes everything.", d: "Tell me this was real." },
];

function log(...a){ console.error(...a); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  // Block image gen with a definitive HTTP failure (NOT abort). abort looks like
  // a network error, which the literary cover/image path retries-with-backoff —
  // wedging the _proseGenerationInFlight lock forever. A 500 settles each image
  // await immediately and the app handles it gracefully.
  for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked-by-audit-harness"}' }));
  // Full [TAG] line capture for window._observatoryReport(lines) — the aggregators are
  // pure functions over console lines, and the batch driver they were written for was
  // never built. Kept separate from the human-readable filter below.
  const allTagLines = [];
  if (CONSOLE_OUT) page.on('console', m => { const t = m.text(); if (/^\s*\[[A-Z0-9:_-]+\]/.test(t)) allTagLines.push(t); });
  page.on('console', m => { const t=m.text(); if(/\[STAGED|\[CG:SCAFFOLD|GEN-FAIL|DRIVER|BEGIN-ERR|Request blocked|Submit blocked|DECK:EMERGENCE|PETITION:EMERGENCE|Story generation failed|already in flight|\[GROK-LIT\]|\[REPAIR\]|CG:SCREENPLAY|SCENE1-MICRO|OPENING:TEMP|LI-TEXTURE:PRESELECT|SCENE1:DESIRE|SCENE1:GRAVITY|LIT:REPAIR|TENSION GATE|SCENE-FRAME|PHRASE-LEDGER:LEAK|WOUND.SOURCE|HOOK:|CRISIS:|SCENE1:CAST|author =|anti-calcification|POV-fixed|POV-normalized|EDITORIAL:TIER|MODEL-ROUTE|PHYSICAL-CANON:ROTATE|BEHAV-CANON:ROTATE|BODY-TELL:REROLL|SCENE1-AXIS|AXIS:SHIPPED|AXIS:GENERIC|AXIS:BESPOKE|VERB-GUARD|SCENE-COST] by|SCENE-BUDGET|CALCIFIED-MOVE|SCENE-COST\] LLM|provenance|DELETE-BLOCKED|HOTFAST|DEFERRED-SETUP|SCENE2:PC-EMBODIMENT|SCENE-CONT|DISPATCH:PROBE|PLOT-CONTRACT|OBLIGATION:|SPEC-PREFETCH/i.test(t)) log('  pg>', t.slice(0,300)); });
  // Track in-flight network requests so a wedge can be diagnosed (which URL hangs).
  const pending = new Map();
  page.on('request', r => pending.set(r, { url:r.url(), t:Date.now() }));
  const _done = r => pending.delete(r);
  page.on('requestfinished', _done); page.on('requestfailed', _done);
  function longPending(ms){ const now=Date.now(); return [...pending.values()].filter(x=>now-x.t>ms).map(x=>`${Math.round((now-x.t)/1000)}s ${x.url.replace(/^https?:\/\/[^/]+/,'')}`); }

  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(
    () => window.state && Object.keys(window.state).length > 100 &&
          typeof window.handleBeginStory === 'function' &&
          typeof window._completeStagedSceneFromScreenplay === 'function',
    { timeout: 40000 });
  await page.waitForTimeout(800);

  // Install the per-scene capture hook + clear cross-story ledgers + set up state.
  await page.evaluate((cfg) => {
    ['sb_physcanon_ledger','sb_behavcanon_ledger','sb_behavphrase_ledger','sb_deeptrio_ledger'].forEach(k=>localStorage.removeItem(k));
    window.__scenes = [];
    // (validation-only _smallAuthorEnabled / _smallAuthorForceAll flags stripped — the harness must NOT force the Small author on every scene)
    // Capture-only wrapper: record the scene text, then SKIP the real gravity
    // LLM work. The gravity audit (and siblings) internally call callChat, which
    // acquires the module-scoped _proseGenerationInFlight lock; under _forceAudits
    // those post-scene LLM audits wedge the lock and block the next submit. We
    // only need the text argument, so return a resolved promise instead.
    window._auditSceneEmotionalGravity = function(pr, meta){
      try { if (typeof pr === 'string' && pr.length > 120)
        window.__scenes.push({ text: pr, meta: meta || null, turnCount: window.state.turnCount || 0, t: Date.now() }); } catch(_){}
      return Promise.resolve(null);
    };
    // Stub the other _forceAudits-enabled LLM telemetry audits (each does a
    // callChat → lock contention). Telemetry-only; safe to no-op for the audit.
    ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation',
     '_classifyLITexture','_auditLITextureSources','_auditSceneAgainstRPlot',
     '_auditUnavailabilityManifestation'].forEach(function(fn){ try{ window[fn] = function(){ return Promise.resolve(null); }; }catch(_){} });
    const s = window.state;
    window._devBypass = true; window._forceAudits = true;
    window._forceDeckMandate = false;  // CLEAN PLANNER TEST (Roman 2026-07-26): disable the deck-onboarding
    // mandate so its scripted Scene-1/2/3 closers don't confound the cross-scene repetition measurement.
    if (cfg.deliveryMandate) window._deliveryMandate = cfg.deliveryMandate;  // AUTHOR-DELIVERY A/B (Roman 2026-07-27): 'A'=stage-the-transition · 'B'=scene-fails-unless-transition-irrevocably-true
    if (cfg.ablateContinuation) window.__ablateContinuationWindow = true;    // ABLATION (Roman 2026-07-27): remove the continuation-window objective to test instruction-economics vs transition delivery
    if (cfg.ablateIntentTransmutation) window.__ablateIntentTransmutation = true;  // ABLATION: remove the ~23k intent-transmutation family (biggest objective block)
    if (cfg.transitionWindow) window.__transitionWindowV1 = true;  // PLACEMENT A/B (Roman 2026-07-27): event by ~mid-scene + consequences/aftermath, vs end-slot default
    window._msTransitionDensityTest = false;  // OFF for the CommittedState transaction test (natural pace; ON confounds delivery by outrunning the story). TEST HARNESS (Roman 2026-07-27): compress the milestone SCHEDULE
    // (atScene only; content + order untouched) so a 6-scene run crosses ~5 milestone boundaries — gives the
    // state_change SPECIFICITY invariant multiple transitions to prove itself. Measurement instrument, NOT a planner change.
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    // FATELANDS config (Roman 2026-07-25): 'the_inhuman' flavor is adult-classified + Grok-routed
    // (validated in _fatelands_probe.js — avoids the GPT-misroute→Sonnet-fallback trap). fantasyRegion
    // pins the Fatelands gate (_fatelandsFlavor tests fantasyRegion, app.js ~58092) + grounds the region.
    s.picks.world='Fantasy'; s.picks.flavor='the_inhuman'; s.picks.dynamic='enemies_to_lovers';
    s.picks.worldSubtype='the_inhuman'; s.picks.playermask='BEAUTIFUL_RUIN'; s.picks.fantasyRegion='the_thornwild';
    s.world='Fantasy'; s.worldSubtype='the_inhuman'; s.flavor='the_inhuman'; s.dynamic='enemies_to_lovers';
    s.fantasyRegion='the_thornwild';
    s.loveInterest='Male'; s.loveInterestName='Kael'; s.liGender='male';
    s.archetype={primary:'DARK_VICE',modifier:null,bound:false,canonicalLIId:null,boundAtScene:null};
    s.playerMask='BEAUTIFUL_RUIN'; s.playermask='BEAUTIFUL_RUIN';
    s.storyLength='fling'; s.tier='fling'; s.intensity='Steamy';
    s.name='Sekka'; s.pov='first_person'; s.turnCount=0;
    // NAME WIRING (Roman 2026-06-26): set names the way the CORRIDOR does, not just s.name —
    // the author reads $('playerNameInput')/$('partnerNameInput') and state.picks.identity, NOT
    // s.name. Setting only s.name made the author treat names as BLANK → invent (Lila/Marcus),
    // which looked like a name-propagation bug but was a harness artifact. Populate the real fields.
    s.playerName='Sekka'; s.partnerName='Kael';
    s.identity = { playerName:'Sekka', partnerName:'Kael', displayPlayerName:'Sekka', displayPartnerName:'Kael' };
    s.picks.identity = { playerName:'Sekka', partnerName:'Kael', displayPlayerName:'Sekka', displayPartnerName:'Kael' };
    try { var _pIn=document.getElementById('playerNameInput'); if(_pIn) _pIn.value='Sekka'; var _lIn=document.getElementById('partnerNameInput'); if(_lIn) _lIn.value='Kael'; } catch(_){}
    // Pre-skip the PC Look modal — CG scene1 (_completeStagedSceneFromScreenplay)
    // opens it and awaits a user decision, which hangs forever headless.
    s._pcLookSkipped = true; s.pcLookLocked = true;
    if (cfg.cg) { s.renderMode='staged_story_mode'; s.storyModality='cinematic'; s.currentEngine='graphic'; s._cgScreenplayMode = true; }
    else        { s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary'; if (cfg.hotFast) { window.__hotFast=true; s._hotFastMode=true; s.storyModeVariant='literary_hot_fast'; if (cfg.forceDebt) window.__hotFastForceDebt=true; } }
    if (cfg.plotContract) window._enableLiteraryPlotContract = true;
    // EXPERIMENT ARM — set the literary continuation window before any generation.
    if (cfg.arm && window._SB_CONT_WINDOW) {
      // Apply to ALL regimes, not just literary. Measured 2026-07-19: the pinned config
      // (Steamy / enemies-to-lovers) enters intimacyPhase at scene 3 and STAYS, so
      // _sbContinuationRegime() returns 'explicit' for 12 of 13 scenes. Patching only
      // .literary left those scenes on the untouched explicit table — every arm would have
      // delivered the SAME window and the run would have produced a guaranteed null result
      // that looked like "window size doesn't matter". Run #1 asks whether WINDOW SIZE
      // matters; the per-regime table differences are run #2's question, not this one.
      ['literary', 'explicit', 'oas'].forEach(function (rg) {
        window._SB_CONT_WINDOW[rg] = Object.assign({}, window._SB_CONT_WINDOW[rg], cfg.arm);
      });
      console.log('[ARM] ALL regimes set to = ' + JSON.stringify(cfg.arm));
    } else if (cfg.arm) {
      console.log('[ARM] FAILED — window._SB_CONT_WINDOW is undefined (stale app.js cache?)');
    }
  }, { cg: IS_CG, hotFast: HOTFAST, forceDebt: FORCEDEBT, plotContract: PLOTCONTRACT,
       arm: ARM ? ARMS[ARM] : null, deliveryMandate: process.env.DELIVERY_MANDATE || null, ablateContinuation: process.env.ABLATE_CONTINUATION === '1', ablateIntentTransmutation: process.env.ABLATE_INTENT === '1', transitionWindow: process.env.TRANSITION_WINDOW === '1' });
  if (ARM) {
    const armOk = await page.evaluate(() => !!(window._SB_CONT_WINDOW));
    if (!armOk) { log('DRIVER-ERR arm requested but window._SB_CONT_WINDOW missing — aborting rather than silently running the default window'); await browser.close(); process.exit(1); }
  }

  log(`[${MODE}] begin scene 1 …`);
  // NOTE: CG fire-and-forget. _completeStagedSceneFromScreenplay awaits
  // _renderStagedPhaseImages, which never resolves under image route-abort.
  // The prose persist + capture hook both fire BEFORE that image await, so we
  // capture prose and never block on the (intentionally-killed) image render.
  await page.evaluate(async (cfg) => {
    try { if (cfg.cg) window._completeStagedSceneFromScreenplay(0, null, null).catch(()=>{});
          else window.handleBeginStory(); }
    catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); }
  }, { cg: IS_CG });

  async function snap(){
    return await page.evaluate(()=>{
      const s=window.state; const arr=window.__scenes||[]; const last=arr[arr.length-1]||{};
      return { n:arr.length, busy:!!(s._isAdvancingScene||s._stagedSubmitting||s._stagedAwaitingProse),
        lastLen: (last.text||'').length, head: String(last.text||'').slice(0,80),
        tc: s.turnCount||0,
        intimacy: !!(s.intimacyDialogue && s.intimacyDialogue.active) };
    });
  }
  async function clickAdvance(inp, intimacy, forceClear, resetTc){
    const r = await page.evaluate(async (args)=>{
      const s=window.state;
      if (args.forceClear){ s._isAdvancingScene=false; s._stagedSubmitting=false; s._stagedAwaitingProse=false; }
      if (args.cg){ if (args.resetTc!=null){ s.turnCount=args.resetTc; s.issueIndexInRun=1; } if (s._stagedActive) s._stagedActive.gateShown = true; s._stagedSubmitting=false; window._advanceStagedScene(args.a, args.d).catch(()=>{}); return {cg:true}; }
      // PETITION-EMERGENCE BYPASS (Roman 2026-06-24 harness fix): the one-shot Scene-2
      // petition gate intercepts the Submit click + locks the UI + re-zooms a fate card
      // ("[PETITION:EMERGENCE] Submit blocked"), wedging the literary advance. It is a UX
      // animation, not story content — suppress it + tear down any installed intercept/
      // gate + dismiss any open petition overlay so the normal submit goes through.
      s._petitionEmergenceFired = true; s._petitionEmergenceArmed = false; s._isAdvancingScene = false; // clear the advance guard each click (diagnostic showed this is what lets scene 4+ submit go through)
      try { if (typeof s._petitionEmergenceSubmitGateCleanup==='function'){ s._petitionEmergenceSubmitGateCleanup(); s._petitionEmergenceSubmitGateCleanup=null; } } catch(_){}
      // DECK-EXAMINE BYPASS (Roman 2026-07-19 harness fix): sibling of the petition gate
      // above, and NEWER than this harness — the Scene-1 deck-examine onboarding installs a
      // MANDATORY Submit gate (app.js ~190603) that swallows every click with
      // "[DECK:EMERGENCE] Submit blocked — re-zoom + toast". Symptom is brutal to read from
      // outside: the button is present + enabled + clicked, busy=false, and NO network
      // request is ever issued, so it looks like generation silently failing. _deckExamineFired
      // = "gate satisfied" per the app's own comment at app.js:190582.
      s._deckExamineFired = true; s._deckExamineArmed = false;
      try { if (typeof s._deckExamineSubmitGateCleanup==='function'){ s._deckExamineSubmitGateCleanup(); s._deckExamineSubmitGateCleanup=null; } } catch(_){}
      try { if (typeof s._petitionEmergenceScrollCleanup==='function'){ s._petitionEmergenceScrollCleanup(); s._petitionEmergenceScrollCleanup=null; } } catch(_){}
      try { if (typeof window.closeZoomedCard==='function') window.closeZoomedCard(); } catch(_){}
      try { document.querySelectorAll('.petition-fate-card.petition-zoomed,.petition-zoomed').forEach(e=>{ e.classList.remove('petition-zoomed'); }); } catch(_){}
      const ai=document.getElementById('actionInput'); const di=document.getElementById('dialogueInput'); const b=document.getElementById('submitBtn');
      if (args.intimacy){ if(di) di.value=(args.d||'Yes.'); if(ai) ai.value=(args.a||''); }
      else { if(ai) ai.value=args.a; if(di) di.value=args.d; }
      const info = { btn: !!b, disabled: b? !!b.disabled : null, adv: !!s._isAdvancingScene };
      if (b){ b.disabled=false; b.click(); }
      return info;
    }, { cg:IS_CG, a:inp.a, d:inp.d, intimacy, forceClear, resetTc: (resetTc==null?null:resetTc) });
    if (!IS_CG) log(`    [click] btn=${r.btn} disabled=${r.disabled} adv=${r.adv} intim=${intimacy} fc=${forceClear}`);
  }
  // Wait for the FIRST scene: a hook fired + busy clear + text settled.
  async function waitFirst(){
    const t0=Date.now(); let lastLen=-1, stable=0;
    while (Date.now()-t0 < PER_SCENE_TIMEOUT){
      await page.waitForTimeout(3000); const st=await snap();
      if (st.n>=1 && !st.busy && st.lastLen>120){
        if (st.lastLen===lastLen){ stable+=3000; if (stable>=6000) return st.head; } else { lastLen=st.lastLen; stable=0; }
      }
    }
    return null;
  }
  // Advance to a NEW scene whose opening differs from prevHead. Robust to the
  // hook firing ~2x/scene (count is unreliable; text identity is not). Re-clicks
  // every ~22s when idle; on stuck-busy >75s, force-clears guards. Reload-as-last-
  // resort is avoided; the fulfill(500) image block prevents the lock wedging.
  async function advanceOne(inp, prevHead, pinTc){
    const t0=Date.now(); let lastClick=0, lastLen=-1, stable=0, busySince=0, lastLog=0;
    while (Date.now()-t0 < PER_SCENE_TIMEOUT){
      const st=await snap();
      const now=Date.now();
      const isNew = st.lastLen>120 && st.head && st.head !== prevHead;
      if (isNew){
        if (!st.busy){ if (st.lastLen===lastLen){ stable+=2500; if (stable>=6000) return st.head; } else { lastLen=st.lastLen; stable=0; } }
        await page.waitForTimeout(2500); continue;
      }
      if (st.busy){ if(!busySince) busySince=now; } else { busySince=0; }
      const stuckBusy = busySince && (now-busySince > 75000);
      if ((!st.busy || stuckBusy) && (now-lastClick > 45000)){
        lastClick=now;
        // pinTc: FINAL CG scene only — force turnCount before each advance so the
        // scene lands ON the issue boundary (sceneIndex+1)%scenesPerIssue===0 → the
        // detonation directive fires. Non-final scenes use the proven re-click loop
        // (turnCount inflation across scenes is harmless; only the boundary matters).
        try{ await clickAdvance(inp, st.intimacy, stuckBusy, pinTc); }catch(e){ log('  click-ERR '+(e.message||'').slice(0,60)); }
        if (stuckBusy) busySince=0;
      }
      if (!IS_CG && now-lastLog > 30000){ lastLog=now; const lp=longPending(25000); log(`    [wait] n=${st.n} busy=${st.busy} intim=${st.intimacy} stuck=${!!stuckBusy} t+${Math.round((now-t0)/1000)}s pending=${lp.length?lp.slice(0,4).join(' | '):'none'}`); }
      await page.waitForTimeout(3000);
    }
    return null;
  }

  let prevProbeSig = '';
  async function waitProbe(){
    for (let i=0;i<12;i++){
      const sig = await page.evaluate(()=>{ try { return JSON.stringify(window.state._continuityProbe||{}); } catch(_){ return ''; } });
      if (sig && sig !== '{}' && sig !== prevProbeSig){ prevProbeSig = sig; return true; }
      await page.waitForTimeout(2500);
    }
    return false;
  }

  const scenes = [];
  let prevHead = await waitFirst();
  if (!prevHead){ log(`[${MODE}] scene 1 FAILED to land`); }
  // Pre-suppress the one-shot petition emergence before any advance (it can also fire
  // on a scroll trigger during scene-1 dwell, locking the UI). Harness-only.
  try { await page.evaluate(()=>{ const s=window.state;
    s._petitionEmergenceFired=true; s._petitionEmergenceArmed=false;
    s._deckExamineFired=true; s._deckExamineArmed=false;
    try { if (typeof s._deckExamineSubmitGateCleanup==='function'){ s._deckExamineSubmitGateCleanup(); s._deckExamineSubmitGateCleanup=null; } } catch(_){}
  }); } catch(_){}

  for (let target=1; target<=TARGET; target++){
    if (target > 1){
      const inp = INPUTS[target-2] || INPUTS[INPUTS.length-1];
      // HOT&FAST: before advancing to Scene 2, WAIT for the Scene-1 deferred-setup packet to be
      // stashed (prod naturally finalizes S1 before the player can submit; the harness auto-advances
      // faster, racing the packet stash → directive sees no packet). Poll up to 30s.
      if (HOTFAST && target === 2){
        for (let w=0; w<30; w++){ const has = await page.evaluate(()=>!!(window.state && window.state._hotFastDeferredPacket)); if (has){ log('[HOTFAST] S1 deferred-setup packet ready before S2 advance'); break; } await page.waitForTimeout(1000); }
      }
      log(`[${MODE}] -> advancing to scene ${target}  act="${inp.a.slice(0,42)}"`);
      // FINAL CG scene: pin turnCount to (TARGET-2) so the advance lands on the
      // issue boundary (sceneIndex = TARGET-1) and the detonation directive fires.
      const pinTc = (IS_CG && target === TARGET) ? (TARGET - 1) : null;
      const got = await advanceOne(inp, prevHead, pinTc);
      if (!got){ log(`[${MODE}] scene ${target} FAILED — stopping`); break; }
      prevHead = got;
    }
    // The continuity probe is written by _extractStoryMemory, which is FIRE-AND-FORGET
    // (app.js ~273740) — it lands seconds AFTER the prose. Poll for it to change so
    // scene N's probe is actually scene N's and not a stale scene N-1 read.
    const probeFresh = await waitProbe();
    if (!probeFresh) log(`    [probe] scene ${target}: probe did not refresh in 30s — entity metric will be stale for this scene`);
    const rec = await page.evaluate((args)=>{
      const arr=window.__scenes||[]; const sc=arr[arr.length-1]||{};
      const clone=(o)=>{ try{ return JSON.parse(JSON.stringify(o)); }catch(_){ return null; } };
      return { idx: args.target, hookCalls: arr.length, turnCount: sc.turnCount||0, meta: sc.meta||null,
        sceneInIssue: (typeof window._getSceneInIssue==='function'? window._getSceneInIssue():null),
        isLastSceneOfIssue: (typeof window._isLastSceneOfIssue==='function'? window._isLastSceneOfIssue():null),
        text: String(sc.text||''), action: args.a, dialogue: args.d,
        // ENTITY / LOCATION CONTINUITY (engine state, not an LLM's opinion):
        //   staged = the PLANNER's intent for this scene (sceneSkeleton.staged_characters)
        //   probe  = what the extractor SAW in the rendered prose (_continuityProbe)
        // Joining intent→result across scenes is the entity-continuity metric.
        staged: clone((window.state.sceneSkeleton||{}).staged_characters||[]) || [],
        probe: clone(window.state._continuityProbe||{}) || {},
        probeFresh: args.probeFresh,
        descLedger: clone(window.state.descLedger||{}) || {} };
    }, { target, a: target===1?'(begin)':(INPUTS[target-2]||{}).a||'', d: target===1?'':(INPUTS[target-2]||{}).d||'', probeFresh });
    scenes.push(rec);
    log(`[${MODE}] scene ${target} captured  len=${rec.text.length} tc=${rec.turnCount} inIssue=${rec.sceneInIssue}`);
  }

  const meta = await page.evaluate(()=>{
    const s=window.state; const slim=(o)=>{ try{ return JSON.parse(JSON.stringify(o)); }catch(_){ return {}; } };
    return { renderMode:s.renderMode, currentEngine:s.currentEngine, storyLength:s.storyLength,
      world:s.world, worldSubtype:s.worldSubtype, dynamic:s.dynamic, archetype:s.archetype,
      loveInterestName:s.loveInterestName, name:s.name, intensity:s.intensity, pov:s.pov,
      runThesis: s.runThesis || (s.cgScaffold && s.cgScaffold.runThesis) || '',
      aPlot: slim(s.aPlot||{}), rPlot: slim(s.rPlot||{}),
      liBodyBible: slim(s.liBodyBible||{}), pcBodyBible: slim(s.pcBodyBible||{}), antagonistBodyBible: slim(s.antagonistBodyBible||{}) };
  });

  const contWindow = await page.evaluate(()=>{
    try { return { dist: JSON.parse(JSON.stringify(window.state._contWindowDist||{})),
                   samples: JSON.parse(JSON.stringify(window.state._contWindowSamples||[])),
                   arm:  JSON.parse(JSON.stringify((window._SB_CONT_WINDOW||{}).literary||{})) }; }
    catch(_){ return null; }
  });

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify({ mode:MODE, target:TARGET, capturedScenes:scenes.length,
    arm: ARM, runLabel: RUN_LABEL, contWindow, meta, scenes }, null, 1));
  if (CONSOLE_OUT) { fs.writeFileSync(CONSOLE_OUT, allTagLines.join('\n')); log(`[${MODE}] WROTE ${CONSOLE_OUT}  tagLines=${allTagLines.length}`); }
  log(`\n[${MODE}] WROTE ${OUT}  scenes=${scenes.length}/${TARGET}${ARM?`  arm=${ARM}`:''}${RUN_LABEL?`  run=${RUN_LABEL}`:''}`);
})().catch(e=>{ console.error('DRIVER-ERR', e.message); process.exit(1); });
