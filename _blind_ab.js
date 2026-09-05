// _blind_ab.js — BLIND A/B: machine-generated event spine vs the hand-authored STARTER_PLANS spine.
// Fork of _issue_gen.js (proven live-app driver). EVERYTHING downstream is held constant — same seed
// (starter_first_sacrifice), same canon, same cast (PC=Lirael / LI=Julian), same author + prose settings,
// same 20 scenes, same synthetic player inputs. The ONLY difference between arms is the per-scene GOAL
// the planner reads, via window._usePlanSpine (app.js:93027) + window.STARTER_PLANS (app.js:121217).
//
//   SPINE=gen  node _blind_ab.js     -> generated arm  (_worldsim_out2 committed events)
//   SPINE=hand node _blind_ab.js     -> control arm    (hand-authored STARTER_PLANS spine)
//   TARGET=3 SPINE=gen node _blind_ab.js    (smoke — verify [PLAN-SPINE] alignment before spending)
//
// Output carries NO provenance label — _blind_pack.js assigns A/B and holds the key.

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

// ── SPINE SELECTION — the one experimental variable ──────────────────────────────────
//   gen  = machine spine: world simulator → entity-affordance IR → CONCRETE enumerator
//          (constraint verified byte-identical on the wire, _enum_plumbing_check.mjs)
//          → selector under the windowed [floor,ceil] schedule.  Source: _worldsim_out2.
//   hand = control: the app's own hand-authored STARTER_PLANS spine (app.js:121191).
const SPINE = (process.env.SPINE || 'gen').toLowerCase();
if (!['gen','hand'].includes(SPINE)) { console.error('DRIVER-ERR SPINE must be gen|hand'); process.exit(1); }
let SPINE_PLAN = null;   // null → arm uses the app's own hand-authored plan, untouched
if (SPINE === 'gen') {
  const rep = JSON.parse(fs.readFileSync(process.env.GENSPINE || '_worldsim_out2/serial20_windowed_report.json','utf8'));
  if (!Array.isArray(rep.committed) || rep.committed.length < 20) {
    console.error(`DRIVER-ERR generated spine has ${(rep.committed||[]).length} events, need 20`); process.exit(1);
  }
  // committed[i] is the event the selector committed for scene i+1 → the planner's per-scene goal.
  SPINE_PLAN = { issue: 1, scenes: rep.committed.slice(0,20).map((e,i)=>({ n:i+1, goal:String(e) })) };
}
const OUT = process.env.OUT || `/tmp/blind_${SPINE}.json`;

// ── FREE SLOW-GENERATION SMOKE (Roman 2026-08-12) ────────────────────────────────────
// Proves the driver tracks progress correctly WITHOUT spending a cent: real app, real gates,
// real _isAdvancingScene, a genuinely pending /api/ request for latency — but the LLM prose call
// is replaced by a stub. Seeds state.scenes so the run starts just below the boundary that killed
// both arms last session, then walks 8 → 9 → 10 under deliberately slow "generation".
// Asserts: no double-click while advancing, no stacked advances, no false failure, gate crossed.
//   SMOKE=1 SMOKE_SLOW_MS=75000 SMOKE_SEED=7 node _blind_ab.js
const SMOKE = process.env.SMOKE === '1';
const SMOKE_SLOW_MS = parseInt(process.env.SMOKE_SLOW_MS, 10) || 75000;  // > the old 45s re-click patience
const _seedEnv = parseInt(process.env.SMOKE_SEED, 10);                   // 0 is meaningful (scene-1 pathology) — `|| 7` would eat it
const SMOKE_SEED = Number.isFinite(_seedEnv) ? _seedEnv : 7;             // start at scene 8 = the old death point
const CONSOLE_OUT = process.env.CONSOLE_OUT || null; // full [TAG] console capture for _observatoryReport
const RUN_LABEL = process.env.RUN_LABEL || '';
const PER_SCENE_TIMEOUT = parseInt(process.env.PER_SCENE_TIMEOUT,10) || 480000; // ms. Raised from 340s: the driver
// no longer re-clicks on a timer, so extra patience costs nothing and prevents a slow scene reading as a stall.
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
  page.on('console', m => { const t=m.text(); if(/PLAN-SPINE|\[BLIND\]|\[STAGED|\[CG:SCAFFOLD|GEN-FAIL|DRIVER|BEGIN-ERR|Request blocked|Submit blocked|DECK:EMERGENCE|PETITION:EMERGENCE|Story generation failed|already in flight|\[GROK-LIT\]|\[REPAIR\]|CG:SCREENPLAY|SCENE1-MICRO|OPENING:TEMP|LI-TEXTURE:PRESELECT|SCENE1:DESIRE|SCENE1:GRAVITY|LIT:REPAIR|TENSION GATE|SCENE-FRAME|PHRASE-LEDGER:LEAK|WOUND.SOURCE|HOOK:|CRISIS:|SCENE1:CAST|author =|anti-calcification|POV-fixed|POV-normalized|EDITORIAL:TIER|MODEL-ROUTE|PHYSICAL-CANON:ROTATE|BEHAV-CANON:ROTATE|BODY-TELL:REROLL|SCENE1-AXIS|AXIS:SHIPPED|AXIS:GENERIC|AXIS:BESPOKE|VERB-GUARD|SCENE-COST] by|SCENE-BUDGET|CALCIFIED-MOVE|SCENE-COST\] LLM|provenance|DELETE-BLOCKED|HOTFAST|DEFERRED-SETUP|SCENE2:PC-EMBODIMENT|SCENE-CONT|DISPATCH:PROBE|PLOT-CONTRACT|OBLIGATION:|SPEC-PREFETCH/i.test(t)) log('  pg>', t.slice(0,300)); });
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
    // CAPTURE THRESHOLD 120 → 1200 (Roman 2026-08-11): on the SEEDED starter path the hook also fires with
    // the generated back-cover SYNOPSIS (~400 chars). At >120 that got recorded as "scene 2", which made the
    // driver's is-there-a-new-scene test (head !== prevHead) true without any real turn — so it never clicked,
    // never ran the turn planner, and the spine hook never fired. Real scenes are 3000+ chars.
    window._auditSceneEmotionalGravity = function(pr, meta){
      try { if (typeof pr === 'string' && pr.length > 1200)
        window.__scenes.push({ text: pr, meta: meta || null, turnCount: window.state.turnCount || 0, t: Date.now() });
        else if (typeof pr === 'string' && pr.length > 120) console.log('[BLIND] ignored short hook fire ('+pr.length+' chars) — not a scene');
      } catch(_){}
      return Promise.resolve(null);
    };
    // Stub the other _forceAudits-enabled LLM telemetry audits (each does a
    // callChat → lock contention). Telemetry-only; safe to no-op for the audit.
    ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation',
     '_classifyLITexture','_auditLITextureSources','_auditSceneAgainstRPlot',
     '_auditUnavailabilityManifestation'].forEach(function(fn){ try{ window[fn] = function(){ return Promise.resolve(null); }; }catch(_){} });
    const s = window.state;
    window._devBypass = true; window._forceAudits = true;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
    s.picks = s.picks || {};
    // ── SEED PINS (read from the app's OWN starter def so nothing is hand-copied). We replicate the picks
    // _launchStarterStory sets (app.js:121655-121675) rather than CALLING it, because that function runs
    // resetForNewStory + _chargePreviewSlice (a real wallet charge / preview path) — irrelevant to the
    // experiment and a failure surface. Identical for BOTH arms.
    const def = (window.STARTER_STORIES||[]).find(d=>d && d.id==='starter_first_sacrifice');
    if (!def) { console.log('DRIVER-ERR starter_first_sacrifice def not found'); }
    s.picks.world=def.world; s.picks.worldSubtype=def.worldSubtype; s.picks.pressure=def.pressure;
    s.picks.flavor=def.flavor; s.picks.tone=def.tone; s.picks.pov=def.pov; s.picks.length=def.length;
    s.picks.dynamic=def.dynamic; s.picks.pcSpecies=def.pcSpecies; s.picks.liSpecies=def.liSpecies;
    s.world=def.world; s.worldSubtype=def.worldSubtype; s.flavor=def.flavor; s.dynamic=def.dynamic;
    s._starterId=def.id;                      // ← what _activePlan(s) keys on (app.js:121224)
    s.is_starter_story=true; s._starterStoryFreeInput=true;
    s.immutableTitle=def.title; s.storyTitle=def.title;
    s.archetype={primary:def.archetype,modifier:null,bound:false,canonicalLIId:null,boundAtScene:null};
    s.loveInterest='Male'; s.loveInterestName='Julian'; s.liGender='male';
    s.playerMask='OPEN_VEIN'; s.playermask='OPEN_VEIN'; s.picks.playermask='OPEN_VEIN';
    // TIER: deliberately NOT the starter def's taste/free. A 'taste'+'free' story is the PREVIEW slice —
    // the submit handler silently returns at the paywall/cliffhanger gates (app.js:272964 and siblings:
    // no console output, no network), which is exactly the dead-click we hit. Use the ungated tier the
    // proven 20-scene harness uses. Held IDENTICAL across arms, so it cannot bias the A/B.
    s.storyLength='fling'; s.tier='fling'; s.access='sub'; s.subscribed=true;
    s.previewActive=false; s.previewProductId=null; s._cliffhangerContinueAuthorized=true;
    s.intensity='Steamy';
    s.name='Lirael'; s.pov='first_person'; s.turnCount=0;

    // ── THE ONLY DIFFERENCE BETWEEN ARMS ──────────────────────────────────────────────
    // window.STARTER_PLANS is the SAME object reference the module-scoped const holds
    // (app.js:121217), so mutating it here is what _activePlan() will read. No app patching.
    window._usePlanSpine = true;
    if (cfg.spine && cfg.spine.scenes) {
      window.STARTER_PLANS['starter_first_sacrifice'] = cfg.spine;
      console.log('[BLIND] spine injected: '+cfg.spine.scenes.length+' scenes, n1="'+String(cfg.spine.scenes[0].goal).slice(0,60)+'"');
    } else {
      console.log('[BLIND] using the app\'s OWN hand-authored STARTER_PLANS spine (control arm)');
    }
    // NAME WIRING (Roman 2026-06-26): set names the way the CORRIDOR does, not just s.name —
    // the author reads $('playerNameInput')/$('partnerNameInput') and state.picks.identity, NOT
    // s.name. Setting only s.name made the author treat names as BLANK → invent (Lila/Marcus),
    // which looked like a name-propagation bug but was a harness artifact. Populate the real fields.
    // Cast held IDENTICAL across arms: PC=Lirael (seed PC is player-named, nameLock:false),
    // LI=Julian (seed nameLock:true). The generated spine already uses these two names.
    s.playerName='Lirael'; s.partnerName='Julian';
    s.identity = { playerName:'Lirael', partnerName:'Julian', displayPlayerName:'Lirael', displayPartnerName:'Julian' };
    s.picks.identity = { playerName:'Lirael', partnerName:'Julian', displayPlayerName:'Lirael', displayPartnerName:'Julian' };
    try { var _pIn=document.getElementById('playerNameInput'); if(_pIn) _pIn.value='Lirael'; var _lIn=document.getElementById('partnerNameInput'); if(_lIn) _lIn.value='Julian'; } catch(_){}
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
       arm: ARM ? ARMS[ARM] : null, spine: SPINE_PLAN });
  // Fail loudly rather than silently running the WRONG spine — the whole experiment is this one variable.
  const spineOk = await page.evaluate(() => !!(window._usePlanSpine === true &&
    window.STARTER_PLANS && window.STARTER_PLANS['starter_first_sacrifice'] &&
    Array.isArray(window.STARTER_PLANS['starter_first_sacrifice'].scenes)));
  if (!spineOk) { log('DRIVER-ERR spine not installed — aborting'); await browser.close(); process.exit(1); }
  const spineHead = await page.evaluate(() => window.STARTER_PLANS['starter_first_sacrifice'].scenes.slice(0,3).map(x=>x.n+': '+String(x.goal).slice(0,70)));
  log(`[BLIND] SPINE=${SPINE} installed. First 3 goals the planner will read:`);
  spineHead.forEach(h => log('        '+h));
  if (ARM) {
    const armOk = await page.evaluate(() => !!(window._SB_CONT_WINDOW));
    if (!armOk) { log('DRIVER-ERR arm requested but window._SB_CONT_WINDOW missing — aborting rather than silently running the default window'); await browser.close(); process.exit(1); }
  }

  // ── SMOKE: stub generation, keep every gate real ───────────────────────────────────
  if (SMOKE) {
    // A real, genuinely-pending /api/ request models LLM latency (incl. 429→fallback hops),
    // so apiPending() is exercised on the same code path as production.
    await page.route('**/api/__smoke_delay*', async r => {
      await new Promise(res => setTimeout(res, SMOKE_SLOW_MS));
      await r.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' });
    });
    await page.evaluate((cfg) => {
      const s = window.state;
      // Commit through the SAME store the real app uses (StoryPagination.addPage, app.js:251327) so the
      // detector under test is the real one. Deliberately leave state.scenes EMPTY for the seeded scenes —
      // that is exactly the real scene-1 situation that killed two paid attempts.
      const SP = window.StoryPagination;
      try { SP.clear(); } catch(_){}
      s.scenes = [];
      window.__smokeAddPage = function(label){ SP.addPage('<p>SMOKE '+label+' '+'x'.repeat(1600)+'</p>', true); };
      for (let i=1;i<=cfg.seed;i++) window.__smokeAddPage('seeded scene '+i);
      // A short interstitial/title page must NOT be mistaken for a scene.
      try { SP.addPage('<h1>Title Page</h1>', false); console.log('[SMOKE] injected a SHORT title page — must not count as a scene'); } catch(_){}
      s.turnCount = cfg.seed;
      // SEED=0 → reproduce the scene-1 failure exactly: commit LATE and leave _isAdvancingScene STUCK TRUE.
      // waitFirst must still detect it (commitment is the fact; busy is only a hint).
      if (cfg.seed === 0) {
        s._isAdvancingScene = true; s._advanceStartedAt = Date.now();
        console.log('[SMOKE] scene-1 pathology armed: will commit in '+cfg.slow+'ms with _isAdvancingScene STUCK TRUE');
        setTimeout(function(){
          window.__smokeAddPage('late scene 1');   // via StoryPagination, state.scenes stays EMPTY (the real case)
          window.__smokeCommits++;
          console.log('[SMOKE] committed scene 1 via addPage (state.scenes still 0, advance flag LEFT true)');
        }, cfg.slow);
      }
      window.__smokeDoubleClicks = 0; window.__smokeGateBlocks = 0; window.__smokeCommits = 0;
      const btn = document.getElementById('submitBtn');
      btn.addEventListener('click', function (e) {
        e.stopImmediatePropagation(); e.preventDefault();   // real handler never runs → zero spend
        // REAL paywall predicate + REAL one-shot flag — this is the fix under test.
        if (typeof window._isAtIssueCliffhanger === 'function' && window._isAtIssueCliffhanger() && !s._cliffhangerContinueAuthorized) {
          window.__smokeGateBlocks++; console.log('[SMOKE] GATE BLOCKED at scenes=' + s.scenes.length + ' (authorized=false)'); return;
        }
        if (s._isAdvancingScene) {   // ← the failure we are hunting
          window.__smokeDoubleClicks++; console.log('[SMOKE] ✗ DOUBLE-CLICK while advancing (scenes=' + s.scenes.length + ') — DRIVER BUG'); return;
        }
        s._isAdvancingScene = true; s._advanceStartedAt = Date.now();
        s._cliffhangerContinueAuthorized = false;   // mimic app.js:123890 one-shot consumption
        console.log('[SMOKE] advance start → scene ' + (s.scenes.length + 1));
        fetch('/api/__smoke_delay').then(function () {
          window.__smokeAddPage('generated scene');
          s.turnCount = (s.turnCount || 0) + 1;
          s._isAdvancingScene = false; window.__smokeCommits++;
          console.log('[SMOKE] committed a scene via addPage (pages=' + window.StoryPagination.getPageCount() + ')');
        });
      }, true);
      console.log('[SMOKE] installed — seeded '+cfg.seed+' scenes, slow='+cfg.slow+'ms, real gates active');
    }, { seed: SMOKE_SEED, slow: SMOKE_SLOW_MS });
    log(`[SMOKE] seeded ${SMOKE_SEED} scenes; each advance takes ${Math.round(SMOKE_SLOW_MS/1000)}s (old re-click patience was 45s). No LLM calls.`);
  }

  log(`[${MODE}] begin scene 1 …`);
  // NOTE: CG fire-and-forget. _completeStagedSceneFromScreenplay awaits
  // _renderStagedPhaseImages, which never resolves under image route-abort.
  // The prose persist + capture hook both fire BEFORE that image await, so we
  // capture prose and never block on the (intentionally-killed) image render.
  await page.evaluate(async (cfg) => {
    if (cfg.smoke) { console.log('[SMOKE] skipping handleBeginStory — scenes are pre-seeded, no LLM spend'); return; }
    try { if (cfg.cg) window._completeStagedSceneFromScreenplay(0, null, null).catch(()=>{});
          else window.handleBeginStory(); }
    catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); }
  }, { cg: IS_CG, smoke: SMOKE });

  // ═══ AUTHORITATIVE PROGRESS (Roman 2026-08-12, [[feedback_harness_ground_truth]]) ═══
  // Progress comes from state.scenes — the array the app itself pushes a committed scene onto
  // (app.js:208329 turn path / 93972 / 237512). NOT from _auditSceneEmotionalGravity: that hook is
  // fire-and-forget and skippable under load, and last session it stopped firing while the app kept
  // generating — the driver declared "scene 8 FAILED" while the app was on scene 10 (gen) / 13 (hand).
  // state.scenes also carries the prose, so it is the single source for BOTH progress and capture.
  // WHY StoryPagination.getPages() AND NOT state.scenes (Roman 2026-08-12, learned the expensive way):
  // the LIVE foreground scene 1 mounts at app.js:251327 via StoryPagination.addPage() and does NOT push to
  // state.scenes and does NOT set turnCount (that only happens on the interstitial path, app.js:93970/237510).
  // So state.scenes sat at 0 through a fully generated+mounted scene 1 and the driver called it dead — twice.
  // getPages() is the store the app commits EVERY scene to and the reader actually sees: one entry per
  // addPage, scene 1 and turns alike. Short pages (title/map/interstitial) are filtered by length, so they
  // cannot fake an advance. state.scenes is still read, but ONLY for comparison logging.
  const PAGE_MIN = 1200;
  async function snap(){
    return await page.evaluate((MIN)=>{
      const s=window.state||{};
      const SP=window.StoryPagination;
      const raw=(SP && typeof SP.getPages==='function') ? (SP.getPages()||[]) : [];
      const strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim();
      const scenePages=raw.map(strip).filter(t=>t.length>MIN);
      const last=scenePages[scenePages.length-1]||'';
      return { n:scenePages.length, rawPages:raw.length,
        busy:!!(s._isAdvancingScene||s._stagedSubmitting||s._stagedAwaitingProse),
        advAge: s._advanceStartedAt ? (Date.now()-s._advanceStartedAt) : null,
        lastLen:last.length, head:last.slice(0,80),
        tc:s.turnCount||0,
        stateScenes:(Array.isArray(s.scenes)?s.scenes.length:0),  // comparison only
        hookN:(window.__scenes||[]).length,                        // comparison only
        intimacy: !!(s.intimacyDialogue && s.intimacyDialogue.active) };
    }, PAGE_MIN);
  }
  // Read the k-th committed scene page (1-indexed) as plain text.
  async function readScene(k){
    return await page.evaluate(({k,MIN})=>{
      const SP=window.StoryPagination;
      const raw=(SP && typeof SP.getPages==='function') ? (SP.getPages()||[]) : [];
      const strip=h=>String(h||'').replace(/<[^>]+>/g,'\n').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&')
        .replace(/&#39;|&rsquo;/g,"'").replace(/&quot;|&ldquo;|&rdquo;/g,'"').replace(/&mdash;/g,'—')
        .replace(/\n{3,}/g,'\n\n').replace(/[ \t]+/g,' ').trim();
      const pages=raw.map(strip).filter(t=>t.replace(/\s+/g,' ').length>MIN);
      return pages[k-1]||'';
    }, {k, MIN:PAGE_MIN});
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
      // NOTE: the inherited harness cleared s._isAdvancingScene on EVERY click. That destroys the only
      // authoritative "generation in flight" signal (_proseGenerationInFlight is module-scoped, not on
      // window) and is what let clicks stack during slow generation. The app has its OWN stale-lock guard
      // (90s, app.js:272975), so leave the flag alone; only forceClear (a genuinely stale lock) clears it.
      s._petitionEmergenceFired = true; s._petitionEmergenceArmed = false;
      // ISSUE-CLIFFHANGER PAYWALL (Roman 2026-08-11): at the issue-finale boundary the submit handler
      // silently returns (app.js:272964 — no console, no network) unless this flag is set. It is ONE-SHOT:
      // app.js:123890 resets it to false in a finally, so setting it once at setup is consumed immediately.
      // Both arms died here at inIssue=8. Re-arm before EVERY click. Harness-only; the paywall is not
      // under test and is bypassed identically for both arms.
      s._cliffhangerContinueAuthorized = true;
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
  // Live LLM traffic = positive evidence generation is in flight. Image routes are stubbed to 500,
  // so anything still open to /api/ is real work. This is what makes "idle" POSITIVE rather than
  // "a timer expired" — the exact confusion that stacked clicks last session.
  function apiPending(){
    return [...pending.values()].filter(x=>/\/api\//.test(x.url) && !/\/api\/(image|bfl-kontext|get-parent-images|replicate|fal)/.test(x.url));
  }
  // Wait for the FIRST committed scene.
  // THREE FIXES (Roman 2026-08-12), all the same class of bug as the false red:
  //  1. Do NOT gate on !busy. Scene 1 mounts via app.js:237500-237512 (push + turnCount=1) but the
  //     advance flag can still be set; since the harness no longer stomps _isAdvancingScene, gating on
  //     it meant a committed scene could never be seen. Commitment is the fact; busy is a hint.
  //  2. Scene 1 is the SETUP-HEAVY scene (~35 LLM calls: bibles, scaffold, A-plot) — 340s is too tight.
  //  3. On timeout, RE-CHECK authoritative state before declaring death (the [recover] rule that was in
  //     advanceOne but missing here). Last run mounted scene 1 and was then told it had failed.
  const FIRST_SCENE_TIMEOUT = parseInt(process.env.FIRST_SCENE_TIMEOUT,10) || 600000;
  async function waitFirst(){
    const t0=Date.now(); let lastLen=-1, stable=0, lastLog=0;
    while (Date.now()-t0 < FIRST_SCENE_TIMEOUT){
      await page.waitForTimeout(3000); const st=await snap(); const now=Date.now();
      if (st.n>=1 && st.lastLen>1200){
        if (st.lastLen===lastLen){ stable+=3000; if (stable>=6000) return st.n; } else { lastLen=st.lastLen; stable=0; }
      }
      if (now-lastLog > 45000){ lastLog=now; log(`    [wait-first] scenes=${st.n} len=${st.lastLen} busy=${st.busy} api=${apiPending().length} t+${Math.round((now-t0)/1000)}s`); }
    }
    const fin=await snap();
    if (fin.n>=1 && fin.lastLen>1200){ log(`    [recover] scene-1 timeout fired but state.scenes=${fin.n} len=${fin.lastLen} — instrument lag, NOT a product failure`); return fin.n; }
    log(`    [stall] scene 1 never committed (scenes=${fin.n} len=${fin.lastLen} busy=${fin.busy} api=${apiPending().length})`);
    return null;
  }
  // Advance until state.scenes.length EXCEEDS baseN. Returns the new count (may jump by >1 if the app
  // ran ahead — that is captured, never treated as failure).
  //
  // RE-CLICK POLICY (Roman 2026-08-12): a click is issued ONLY on positively-established idleness —
  // not busy AND zero in-flight /api/ requests continuously for IDLE_MS AND scenes.length unchanged
  // since the last click. A bare elapsed timer NEVER triggers a re-click. Slow generation (429s →
  // fallback hops) now reads as "still working", not "stalled".
  const IDLE_MS = 25000;      // continuous idleness required before re-clicking
  const CLICK_GAP_MS = 20000; // floor between clicks even when idle
  async function advanceOne(inp, baseN, pinTc){
    const t0=Date.now(); let lastClick=0, idleSince=0, lastLog=0, clicks=0;
    while (Date.now()-t0 < PER_SCENE_TIMEOUT){
      const st=await snap(); const now=Date.now(); const inflight=apiPending();
      if (st.n > baseN){
        if (!st.busy && inflight.length===0){
          await page.waitForTimeout(2500);
          const s2=await snap();
          if (s2.n===st.n && s2.lastLen===st.lastLen) return s2.n;   // settled
        }
        await page.waitForTimeout(2500); continue;
      }
      const idle = !st.busy && inflight.length===0;
      if (idle){ if(!idleSince) idleSince=now; } else { idleSince=0; }
      const idleLongEnough = idleSince && (now-idleSince >= IDLE_MS);
      // A truly stale advance lock (app's own threshold is 90s) with no traffic — safe to force-clear.
      const staleLock = st.busy && st.advAge!=null && st.advAge>120000 && inflight.length===0;
      if ((idleLongEnough || staleLock) && (now-lastClick > CLICK_GAP_MS)){
        lastClick=now; idleSince=0; clicks++;
        try{ await clickAdvance(inp, st.intimacy, staleLock, pinTc); }catch(e){ log('  click-ERR '+(e.message||'').slice(0,60)); }
      }
      if (!IS_CG && now-lastLog > 30000){
        lastLog=now;
        log(`    [wait] scenes=${st.n}/${baseN} busy=${st.busy} advAge=${st.advAge==null?'-':Math.round(st.advAge/1000)+'s'} api=${inflight.length} idle=${idleSince?Math.round((now-idleSince)/1000)+'s':'no'} clicks=${clicks} t+${Math.round((now-t0)/1000)}s hook=${st.hookN}`);
      }
      await page.waitForTimeout(3000);
    }
    // Timeout. Before calling it dead, re-check authoritative state — presume INSTRUMENT failure first.
    const fin=await snap();
    if (fin.n > baseN){ log(`    [recover] timeout fired but state.scenes advanced ${baseN}→${fin.n} — instrument lag, NOT a product failure`); return fin.n; }
    log(`    [stall] no committed scene in ${Math.round(PER_SCENE_TIMEOUT/1000)}s (scenes=${fin.n} busy=${fin.busy} api=${apiPending().length})`);
    return null;
  }

  let prevProbeSig = '';
  async function waitProbe(){
    if (SMOKE) return true;   // no real extractor runs in smoke; don't burn 30s/scene waiting
    for (let i=0;i<12;i++){
      const sig = await page.evaluate(()=>{ try { return JSON.stringify(window.state._continuityProbe||{}); } catch(_){ return ''; } });
      if (sig && sig !== '{}' && sig !== prevProbeSig){ prevProbeSig = sig; return true; }
      await page.waitForTimeout(2500);
    }
    return false;
  }

  const scenes = [];
  let committedN = await waitFirst();
  if (!committedN){ log(`[${MODE}] scene 1 FAILED to land`); }
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
      const got = await advanceOne(inp, committedN, pinTc);
      if (!got){ log(`[${MODE}] scene ${target} FAILED — no committed scene; stopping`); break; }
      if (got > committedN + 1) log(`    [ahead] app committed ${got - committedN} scenes during this advance — capturing all of them`);
      committedN = got;
    }
    // The continuity probe is written by _extractStoryMemory, which is FIRE-AND-FORGET
    // (app.js ~273740) — it lands seconds AFTER the prose. Poll for it to change so
    // scene N's probe is actually scene N's and not a stale scene N-1 read.
    const probeFresh = await waitProbe();
    if (!probeFresh) log(`    [probe] scene ${target}: probe did not refresh in 30s — entity metric will be stale for this scene`);
    const sceneText = await readScene(committedN);
    const rec = await page.evaluate((args)=>{
      // PROSE FROM THE COMMITTED PAGE STORE — passed in from readScene(), not the telemetry hook.
      const s=window.state;
      const clone=(o)=>{ try{ return JSON.parse(JSON.stringify(o)); }catch(_){ return null; } };
      return { idx: args.target, committedIndex: args.sceneN, committedTotal: args.totalPages,
        hookCalls: (window.__scenes||[]).length,   // comparison only
        stateScenes: (Array.isArray(s.scenes)?s.scenes.length:0),
        turnCount: s.turnCount||0,
        sceneInIssue: (typeof window._getSceneInIssue==='function'? window._getSceneInIssue():null),
        isLastSceneOfIssue: (typeof window._isLastSceneOfIssue==='function'? window._isLastSceneOfIssue():null),
        text: String(args.sceneText||''), action: args.a, dialogue: args.d,
        // ENTITY / LOCATION CONTINUITY (engine state, not an LLM's opinion):
        //   staged = the PLANNER's intent for this scene (sceneSkeleton.staged_characters)
        //   probe  = what the extractor SAW in the rendered prose (_continuityProbe)
        // Joining intent→result across scenes is the entity-continuity metric.
        staged: clone((window.state.sceneSkeleton||{}).staged_characters||[]) || [],
        probe: clone(window.state._continuityProbe||{}) || {},
        probeFresh: args.probeFresh,
        descLedger: clone(window.state.descLedger||{}) || {} };
    }, { target, sceneN: committedN, sceneText, totalPages: (await snap()).n,
         a: target===1?'(begin)':(INPUTS[target-2]||{}).a||'', d: target===1?'':(INPUTS[target-2]||{}).d||'', probeFresh });
    scenes.push(rec);
    log(`[${MODE}] scene ${target} captured  len=${rec.text.length} page=${rec.committedIndex}/${rec.committedTotal} tc=${rec.turnCount} stateScenes=${rec.stateScenes} hook=${rec.hookCalls}`);
    // INCREMENTAL PERSIST (Roman 2026-08-12): write after EVERY scene. Arm 1 reached 16/20 and was killed
    // by the task runner; because the JSON was only written at the end, 16 scenes of paid prose died with
    // the process. A long paid run must never hold its only copy in memory.
    try { fs.writeFileSync(OUT + '.partial', JSON.stringify({ mode:MODE, spine:SPINE, target:TARGET,
      capturedScenes:scenes.length, partial:true, scenes }, null, 2)); } catch(e){ log('  persist-ERR '+e.message); }
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

  // Read smoke counters BEFORE the browser closes (the verdict prints after the write below).
  // Count committed SCENE pages (same rule the detector uses) — NOT state.scenes, which the smoke
  // deliberately leaves empty to reproduce the real scene-1 situation.
  const smokeStats = SMOKE ? await page.evaluate((MIN)=>{
    const SP=window.StoryPagination;
    const raw=(SP && typeof SP.getPages==='function') ? (SP.getPages()||[]) : [];
    const strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
    return { dbl:window.__smokeDoubleClicks||0, gate:window.__smokeGateBlocks||0,
      commits:window.__smokeCommits||0,
      scenes:raw.map(strip).filter(t=>t.length>MIN).length,
      rawPages:raw.length };
  }, PAGE_MIN) : null;

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify({ mode:MODE, target:TARGET, capturedScenes:scenes.length,
    arm: ARM, runLabel: RUN_LABEL, contWindow, meta, scenes }, null, 1));
  if (CONSOLE_OUT) { fs.writeFileSync(CONSOLE_OUT, allTagLines.join('\n')); log(`[${MODE}] WROTE ${CONSOLE_OUT}  tagLines=${allTagLines.length}`); }
  log(`\n[${MODE}] WROTE ${OUT}  scenes=${scenes.length}/${TARGET}${ARM?`  arm=${ARM}`:''}${RUN_LABEL?`  run=${RUN_LABEL}`:''}`);

  if (SMOKE) {
    const sm = smokeStats || { dbl:0, gate:0, commits:0, scenes:0 };
    const observed = scenes.map(s=>s.committedIndex).join(',');
    // Two variants, judged on their own terms:
    //   SEED=0  → scene-1 pathology: late commit with _isAdvancingScene stuck true must still be detected.
    //   SEED>0  → boundary walk: must cross the scene-8/9/10 point that killed both arms last session.
    const s1Variant = SMOKE_SEED === 0;
    const crossed  = s1Variant ? (sm.scenes >= 1) : (sm.scenes > SMOKE_SEED + 1);
    const pass = sm.dbl===0 && scenes.length===TARGET && crossed && sm.gate===0;
    log('\n══════ SMOKE VERDICT ══════');
    log(`  committed scene pages : ${SMOKE_SEED} → ${sm.scenes}   (raw pages incl. short/title: ${sm.rawPages})   observed: ${observed}`);
    log(`  short pages correctly ignored : ${sm.rawPages - sm.scenes}`);
    log(`  driver captured       : ${scenes.length}/${TARGET}`);
    log(`  double-clicks while advancing : ${sm.dbl}   ${sm.dbl===0?'✅ none — no stacked advances':'❌ DRIVER BUG'}`);
    log(`  gate blocks (unauthorized)    : ${sm.gate}   ${sm.gate===0?'✅ one-shot re-arm held through the boundary':'❌ paywall re-arm FAILED'}`);
    log(`  ${s1Variant?'scene-1 detected despite stuck advance flag':'crossed the old death point         '} : ${crossed?'✅ yes':'❌ no'}`);
    log(`  slow generation tolerated     : ${Math.round(SMOKE_SLOW_MS/1000)}s/scene vs old 45s patience`);
    log(`\n  ${pass?'✅ SMOKE CLEAN — safe to spend on the sequential A/B':'❌ SMOKE FAILED — fix the harness, do NOT spend'}`);
    process.exitCode = pass ? 0 : 2;
  }
})().catch(e=>{ console.error('DRIVER-ERR', e.message); process.exit(1); });
