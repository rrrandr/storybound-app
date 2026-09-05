// _invariant_run.mjs — PAID end-to-end validation of the invariant runtime (Roman approved 2026-07-29).
// Runs THREE First Sacrifice stories (different seeds, same 5-node DAG), flag ON, Grok authoring.
// Reuses the frozen momentum harness's proven driver (bootstrap → settle → submit past preview gate).
//
// Measures Roman's FOUR metrics (reported separately; NOT "did the bug disappear"):
//   1. Serialization integrity — did any author prompt ever carry a truth NOT yet realized? target ZERO.
//   2. Delivery rate — realized / steered.
//   3. Retry behavior — partial→…→satisfied chains (for a human read: mounting pressure vs repetition).
//   4. Narrative inevitability — full prose dumped for a blind read.
// PLUS: the evaluator-decision transcript (Roman: evaluator quality is the dominant technical risk).
//
// Env: STORIES (default 3), N (scenes per story, default 6), SCENE_TIMEOUT, CONT_TIMEOUT.
import fs from 'fs';
import { chromium } from 'playwright-core';

const URL = 'http://localhost:3000/';
const STORIES = Number(process.env.STORIES || 3);
const N = Number(process.env.N || 6);
const STARTER = 'starter_first_sacrifice';
const OUT = process.env.OUT || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/invariant_out';
const SCENE_TIMEOUT = Number(process.env.SCENE_TIMEOUT || 360000);
const CONT_TIMEOUT = Number(process.env.CONT_TIMEOUT || 420000);
fs.mkdirSync(OUT, { recursive: true });

// three seeds — relationship-forward player inputs that ENGAGE but don't dictate the destiny beat,
// so the scheduler+author drive which truth lands.
const SEEDS = [
  { act: 'press him on why the binding chose the two of you', dia: 'What did you give up for this? Tell me the truth.' },
  { act: 'test the tether — pull against it and watch what it does to him', dia: 'If I walked away right now, what happens to you?' },
  { act: 'offer to share the cost you can see is crushing him', dia: 'Let me carry part of it. I am bound to you now whether either of us wanted it.' }
];

const log = (...a) => console.log(...a);

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
const page = await ctx.newPage();

// console capture: keep only invariant-relevant telemetry + a ring buffer for diagnostics
let invLines = [];
const consoleRing = [];
const consoleErrors = [];
page.on('console', m => {
  const t = m.text();
  consoleRing.push(`[${m.type()}] ${t.slice(0, 200)}`); if (consoleRing.length > 120) consoleRing.shift();
  if (m.type() === 'error') consoleErrors.push(t);
  if (/\[INVARIANT-|\[SHADOW-|\[DESTINY-/.test(t)) { invLines.push(t); if (/REALIZED|PARTIAL|BRANCH|AB\]|FORCE|OBSOLETE/.test(t)) log('    · ' + t.slice(0, 180)); }
  // diagnostic: track the pipeline stages the invariant hook depends on
  if (/\[COMMIT-SCENE|\[PLOT-CONTRACT:DIRECTIVE\]|\[STATE-CHANGE:EVENT\]|_generateLiteraryPlotContract|literarySceneMandate|\[SUBMIT\]|Blocked|cliffhanger|Cliffhanger|previewStop|preview_stop/.test(t)) { invLines.push('DIAG ' + t); log('    ⋯ ' + t.slice(0, 160)); }
});
page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + (e && e.message)));

async function bootstrapStory() {
  await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
  // account flags + image stub + capture hooks + FLAG ON + directive-capture wrap
  await page.evaluate(() => {
    const s = window.state;
    s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; window._devBypass = true;
    try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
    window.__capturedPages = [];
    try {
      const SP = window.StoryPagination;
      if (SP && typeof SP.addPage === 'function' && !SP.__wrapped) {
        const real = SP.addPage.bind(SP);
        SP.addPage = function (html, isNew) { try { window.__capturedPages.push(String(html || '')); window.__lastPageAt = Date.now(); } catch (_) {} return real(html, isNew); };
        SP.__wrapped = true;
      }
    } catch (_) {}
    // ── RETURNING-READER MODE (Roman 2026-07-29): run as if this is the user's 4th story, so the
    // Scene 1-3 onboarding (deck frame + petition/tempt emergences) never arms. _forceDeckMandate=false
    // is the supported override (_shouldMandateSceneOneDeckFrame short-circuits on it); on a localhost/QA
    // host the mandate is otherwise forced ON regardless of story count. This is a real returning-reader
    // flow, not a bypass hack — the onboarding tutorial simply doesn't apply past story 3.
    window._forceDeckMandate = false;
    // ── INVARIANT RUNTIME: flag ON + production-fidelity author (Grok/HEAVY) ──
    window._invariantRuntimeV0 = true;
    window.__forceHeavyBuild = true;   // KEEP heavy/Grok — LITE routes to gpt-4o (wrong author, lower quality)
    // COST GUARD (Roman 2026-07-30): the harness drives the next scene with a fresh submit, so the app's
    // speculative preload (a full extra Grok generation of the next scene) is pure waste (~2× Grok spend).
    // Disable it for test runs — fidelity of the REAL scene is unchanged.
    window.__disableSpeculativePreload = true;
    // capture EVERY author-directive build so we can audit serialization integrity on the REAL prompt input
    window.__directives = [];
    try {
      const IR = window.InvariantRuntimeV0;
      if (IR && !IR.__wrapped) {
        const realBuild = IR.buildDirective;
        IR.buildDirective = function (st, turn) {
          const out = realBuild.call(this, st, turn);
          try { window.__directives.push({ turn: (st && st.turnCount) || turn, out: String(out || '') }); } catch (_) {}
          return out;
        };
        IR.__wrapped = true;
      }
    } catch (_) {}
  }, {});
  // launch the starter
  let bootErr = null;
  try {
    await page.evaluate(async ({ STARTER, T }) => {
      const def = (window.STARTER_STORIES || []).find(d => d.id === STARTER);
      if (!def) throw new Error('starter def not found: ' + STARTER);
      await Promise.race([
        window._launchStarterStory(def),
        new Promise((_, r) => setTimeout(() => r(new Error('bootstrap timeout')), T))
      ]);
    }, { STARTER, T: SCENE_TIMEOUT });
  } catch (e) { bootErr = e && e.message; }
  const after = await page.evaluate(() => ({ turnCount: window.state.turnCount, pages: (window.__capturedPages || []).length, active: window.InvariantRuntimeV0 && window.InvariantRuntimeV0.isActive(window.state) }));
  log(`  [boot] err=${bootErr || 'none'} turn=${after.turnCount} pages=${after.pages} invariantActive=${after.active}`);
  // settle async tail
  try {
    await page.waitForFunction(() => {
      const quietMs = Date.now() - (window.__lastPageAt || 0);
      return (window.__capturedPages || []).length >= 1 && quietMs > 12000 && !window.state._isAdvancingScene;
    }, { timeout: 90000, polling: 2000 });
  } catch (_) { log('  [boot] settle timed out — proceeding'); }
  return { bootErr, ...after };
}

async function settle(label, timeoutMs) {
  // wait until (a) no scene advance is in flight, (b) the background SPECULATIVE preload of the
  // next turn has finished (state.isPreloadingNextScene, cleared in its finally), and (c) page-adds
  // are quiet. Clicking DURING the speculative preload was the race that stalled the run — the
  // click must land when the app is truly idle so it consumes the preload instead of racing it.
  try {
    await page.waitForFunction(() => {
      const quietMs = Date.now() - (window.__lastPageAt || 0);
      return !window.state._isAdvancingScene && !window.state.isPreloadingNextScene && quietMs > 6000;
    }, {}, { timeout: timeoutMs || 180000, polling: 2000 });
  } catch (_) { log(`  [settle:${label}] still active after wait — proceeding`); }
}

async function driveScene(seed, idx) {
  await settle('pre-submit', 200000);            // ← ensure the PRIOR scene fully finished
  const before = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, turn: window.state.turnCount || 0 }));
  // unblock the preview/onboarding submit gates (same set the momentum harness authorizes)
  await page.evaluate(() => {
    const s = window.state;
    s._cliffhangerContinueAuthorized = true; s.previewActive = false; s.previewContinued = true;
    s._isAdvancingScene = false; s._advanceStartedAt = 0;
    window._forceDeckExamineMandatory = false; s._deckExamineFired = true; s.hasSeenFortuneTurnDisclosure = true;
    // ONBOARDING TUTORIAL EMERGENCES (turns 1/2): _armPetition/TemptEmergence install a one-shot
    // capture-phase intercept on submitBtn that opens the tutorial modal and SWALLOWS the click
    // (preventDefault + stopImmediatePropagation) instead of advancing. Mark them already-fired so
    // the real scene advances. This is a UI tutorial, not the invariant runtime.
    s._petitionEmergenceFired = true; s._temptEmergenceFired = true;
    s._petitionEmergenceArmed = false; s._temptEmergenceArmed = false;
  });
  await page.evaluate(({ act, dia }) => {
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } };
    setVal('actionInput', act); setVal('dialogueInput', dia);
  }, seed);
  // CLICK-TIME diagnostic: exactly which gate would the submit handler hit?
  const preClick = await page.evaluate(() => {
    const btn = document.getElementById('submitBtn');
    const r = btn ? btn.getBoundingClientRect() : null; const st = btn ? getComputedStyle(btn) : null;
    return {
      btn: btn ? `${Math.round(r.width)}x${Math.round(r.height)} disp=${st.display} vis=${st.visibility} disabled=${btn.disabled}` : 'ABSENT',
      isAdvancing: window.state._isAdvancingScene === true,
      cliffAuthorized: window.state._cliffhangerContinueAuthorized === true,
      atCliffhanger: (typeof window._isAtIssueCliffhanger === 'function') ? !!window._isAtIssueCliffhanger() : 'n/a',
      previewActive: window.state.previewActive === true,
      preloading: window.state.isPreloadingNextScene === true,
      hasSpecScene: !!window.state.speculativeNextScene,
      turnCount: window.state.turnCount || 0
    };
  });
  log(`  [pre-click] btn=[${preClick.btn}] advancing=${preClick.isAdvancing} preloading=${preClick.preloading} hasSpec=${preClick.hasSpecScene} cliffAuth=${preClick.cliffAuthorized} atCliff=${preClick.atCliffhanger} turn=${preClick.turnCount}`);
  let err = null;
  try {
    await page.click('#submitBtn', { timeout: 5000 }).catch(async () => { await page.evaluate(() => document.getElementById('submitBtn') && document.getElementById('submitBtn').click()); });
    // STARTED: advancing flag flips true (real gen holds it). Give it 45s.
    const started = await page.waitForFunction(() => window.state._isAdvancingScene === true,
      {}, { timeout: 45000, polling: 1000 }).then(() => true).catch(() => false);
    if (!started) {
      // maybe it advanced faster than we polled — accept if a page/turn moved; else it truly bailed.
      const moved = await page.evaluate(({ n, t }) => (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: before.pages, t: before.turn });
      if (!moved) throw new Error('submit BAILED — generation never started (advancing flag never set)');
    }
    // COMPLETE: advancing cleared AND a new page OR turn AND quiescent ≥8s. This is the real end-of-scene.
    await page.waitForFunction(({ n, t }) => {
      const advancing = window.state._isAdvancingScene === true;
      const pagesNow = (window.__capturedPages || []).length;
      const turnNow = window.state.turnCount || 0;
      const quietMs = Date.now() - (window.__lastPageAt || 0);
      return !advancing && (pagesNow > n || turnNow > t) && quietMs > 8000;
    }, { n: before.pages, t: before.turn }, { timeout: CONT_TIMEOUT, polling: 2500 });
  } catch (e) {
    err = e && e.message; log(`  [scene ${idx + 1}] FAILED: ${err}`); consoleRing.slice(-16).forEach(l => log('      ' + l));
  }
  const post = await page.evaluate(() => ({
    turnCount: window.state.turnCount || 0,
    pages: (window.__capturedPages || []).length,
    hasPriorSC: !!window.state._priorSceneStateChange,
    priorSCEvent: (window.state._priorSceneStateChange && window.state._priorSceneStateChange.event || '').slice(0, 70),
    hasContract: !!window.state._scenePlotContract,
    plotActive: (typeof window._plotContractActive === 'function') ? !!window._plotContractActive() : 'n/a',
    csEnabled: !(window._committedStateV0 === false),
    renderMode: window.state.renderMode || window.state.storyMode || '?',
    invActive: window.InvariantRuntimeV0 && window.InvariantRuntimeV0.isActive(window.state)
  }));
  log(`  [scene ${idx + 1} post] turn=${post.turnCount} pages=${post.pages} priorSC=${post.hasPriorSC} contract=${post.hasContract} plotActive=${post.plotActive} csEnabled=${post.csEnabled} render=${post.renderMode} invActive=${post.invActive}` + (post.priorSCEvent ? ` priorEvent="${post.priorSCEvent}"` : ''));
  // ── AXIS ENGAGEMENT + CAPTURE (Roman 2026-07-29): the reader-preference axes (demand/hint,
  // objective↔relationship) only "land" when a microDecision fork is resolved. Free-text say/do
  // never engages them, so detect any inline SME choice this scene and resolve it, then capture
  // the axis state (scene1DirectnessSignal / _stagedPreferenceAxis / storyGravity).
  const axis = await page.evaluate(() => {
    let smeButtons = 0, clicked = null;
    try {
      const btns = Array.from(document.querySelectorAll('button.sme-btn[data-sme-choice]'))
        .filter(b => { const r = b.getBoundingClientRect(); return b.offsetParent !== null || (r.width + r.height) > 0; });
      smeButtons = btns.length;
      if (btns.length) { clicked = btns[0].getAttribute('data-sme-label') || btns[0].getAttribute('data-sme-choice'); btns[0].click(); }
    } catch (_) {}
    const ax = window.state._stagedPreferenceAxis || null;
    return {
      smeButtons, clicked,
      scene1Directness: window.state.scene1DirectnessSignal || null,
      obj: ax ? (ax.objective || 0) : 0, rel: ax ? (ax.relationship || 0) : 0,
      storyGravity: window.state.storyGravity || null,
      demandHintReAsk: (typeof window._isDemandHintReAskScene === 'function') ? !!window._isDemandHintReAskScene(window.state.turnCount || 0) : null
    };
  }).catch(() => ({ smeButtons: 0 }));
  log(`  [axis s${idx + 1}] smeChoices=${axis.smeButtons}${axis.clicked ? ` clicked="${axis.clicked}"` : ''} directness=${axis.scene1Directness} obj/rel=${axis.obj}/${axis.rel} gravity=${axis.storyGravity}`);
  return { err, beforeTurn: before.turn, post, axis };
}

const stories = [];
for (let si = 0; si < STORIES; si++) {
  const seed = SEEDS[si % SEEDS.length];
  invLines = [];
  log(`\n═══════════════════ STORY ${si + 1}/${STORIES} — seed: "${seed.act.slice(0, 40)}…" ═══════════════════`);
  const boot = await bootstrapStory();
  const sceneResults = [];
  let consecFail = 0;
  for (let i = 0; i < N; i++) {
    log(`\n[story ${si + 1} · scene ${i + 1}/${N}] …`);
    const r = await driveScene(seed, i);
    sceneResults.push(r);
    if (r.err) {
      // HARDENED (Roman 2026-07-29): a single scene hang/timeout must NOT kill the run.
      // Clear any stranded advance-lock and continue; only give up after 3 in a row.
      consecFail++;
      log(`  [recover] scene ${i + 1} failed (${consecFail} consecutive) — clearing lock, continuing`);
      await page.evaluate(() => { try { window.state._isAdvancingScene = false; window.state._advanceStartedAt = 0; } catch (_) {} }).catch(() => {});
      if (consecFail >= 3) { log('  [abort] 3 consecutive scene failures — ending this story early'); break; }
    } else { consecFail = 0; }
  }
  // harvest invariant runtime state + prose + directives
  const harvest = await page.evaluate(() => {
    const IR = window.InvariantRuntimeV0;
    const report = IR ? IR.lifecycleReport(window.state) : { text: '', data: null };
    const cs = (typeof window._ensureCommittedState === 'function') ? window._ensureCommittedState() : { facts: [] };
    const pages = (window.__capturedPages || []).map(h => String(h).replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim());
    return {
      lifecycleText: report.text, lifecycleData: report.data,
      facts: (cs.facts || []),
      directives: window.__directives || [],
      prose: pages,
      turnCount: window.state.turnCount || 0,
      axisFinal: {
        scene1Directness: window.state.scene1DirectnessSignal || null,
        obj: (window.state._stagedPreferenceAxis && window.state._stagedPreferenceAxis.objective) || 0,
        rel: (window.state._stagedPreferenceAxis && window.state._stagedPreferenceAxis.relationship) || 0,
        storyGravity: window.state.storyGravity || null
      }
    };
  });
  stories.push({ story: si + 1, seed, boot, sceneResults, harvest, invLines: invLines.slice(), consoleTail: consoleRing.slice(-140) });
  fs.writeFileSync(`${OUT}/story_${si + 1}.json`, JSON.stringify(stories[stories.length - 1], null, 2));
  log(`\n[story ${si + 1}] harvested — turnCount=${harvest.turnCount} facts=${harvest.facts.length} directives=${harvest.directives.length} proseScenes=${harvest.prose.length}`);
}

fs.writeFileSync(`${OUT}/all_stories.json`, JSON.stringify(stories, null, 2));
log(`\n\n=== RAW HARVEST COMPLETE — ${stories.length} stories written to ${OUT} ===`);
log(`consoleErrors(total)=${consoleErrors.length}`);
await browser.close();
process.exit(0);
