// _momentum_harness.mjs — the momentum measurement harness (Baseline vs SCENE-SPINE).
//
// Drives the REAL literary continuation path headlessly:
//   Playwright → handleBeginStory (Scene-1 bootstrap) → set say/do → click #submitBtn
//   → generateOrchestatedTurn/author → SCENE-SPINE directive → StoryPagination.addPage (capture)
//   → _verifyDelivery (verifier box) → shared-schema record → _momentumEval.
//
// MODE (env):
//   MODE=dry (default) — intercept /api/chatgpt-proxy: can the SCENE-SPINE plot-contract call with a
//     real-shaped stub, PASS THE VERIFIER THROUGH (real), stub everything else with canned prose that
//     deliberately MISSES the transition. $0-ish (only the verifier's gpt-4o-mini call). Validates every
//     structural box (drivability, capture, verify, schema, eval) without paying for real generation.
//   MODE=real — no interception; real Scene-1 + real continuation(s). PAID.
//
// ARM (env): baseline → window._stateChangeSpineV0=false ; spine (default) → SCENE-SPINE on.
// N (env): number of continuations to drive (default 1 — the validation run).
import fs from 'fs';
import { chromium } from 'playwright-core';

const URL  = 'http://localhost:3000/';
const MODE = process.env.MODE || 'dry';
const ARM  = process.env.ARM  || 'spine';
const STARTER = process.env.STARTER || 'starter_the_first_taste'; // literary: starter_the_first_taste | starter_first_sacrifice
const N    = Number(process.env.N || 1);
const OUT  = process.env.OUT  || '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/momentum_out';
const SCENE_TIMEOUT = Number(process.env.SCENE_TIMEOUT || 360000);
const CONT_TIMEOUT  = Number(process.env.CONT_TIMEOUT || 420000);   // a real continuation ≈ 180-300s
fs.mkdirSync(OUT, { recursive: true });

// canned contract (real-shaped) for dry mode — gives _scenePlotContract.stateChange.event a real value
const CANNED_CONTRACT = JSON.stringify({
  tactical_move: 'force the drowned bell into the open between them',
  state_change_precondition: 'the bond between them has never been externally witnessed',
  state_change: 'the submerged bell tolls once beneath the black water',
  forces_choice: 'forces her to choose between surfacing to answer it or holding him under to silence it',
  branch_a: 'surface and answer the toll', branch_b: 'hold him under to silence it'
});
// canned continuation prose that DELIBERATELY MISSES the bell event (all atmosphere) → verifier should say MISSED
const CANNED_MISS_PROSE = 'The water was the colour of old iron, and it held the two of them the way a held breath holds a room. '
  + 'Vael did not move. I did not move. Around us the drowned coral leaned in its slow blue ruin, and somewhere far below the current turned '
  + 'over stones that had not seen light in a hundred years. I thought about the shape of his shoulders and the way the cold had made him '
  + 'careful. I thought about everything except the thing I had come here to do. The bell was down there. I knew it was down there. But the '
  + 'moment stretched, and neither of us reached for it, and the dark went on being dark, patient as a thing that has already won.';

const log = (...a) => console.log(...a);
const box = {};   // per-box PASS/FAIL for the pipeline verification
const mark = (name, ok, detail) => { box[name] = { ok, detail: detail || '' }; log(`  [${ok ? '✓' : '✗'}] ${name}${detail ? ' — ' + detail : ''}`); };

const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 800 } });
const page = await ctx.newPage();
const consoleErrors = [];
const consoleRing = [];            // full console ring buffer (last 80)
const spineDirectiveFired = [];   // captures [PLOT-CONTRACT:DIRECTIVE] logs
// GROUND-TRUTH TARGET capture: the `[STATE-CHANGE:EVENT] scene=N :: <event>` line is the exact transition
// GENERATED for that scene (what the author was given). Reading state._scenePlotContract post-render is WRONG
// — the next-scene prewarm (_prewarmLiteraryAPlotAndSpine) overwrites it. So the target MUST come from here.
const stateChangeEvents = [];      // { scene, event, seq }
const authorLines = [];            // author-model / fallback telemetry (validity check)
let _scSeq = 0;
page.on('console', m => {
  const t = m.text();
  consoleRing.push(`[${m.type()}] ${t.slice(0, 220)}`); if (consoleRing.length > 80) consoleRing.shift();
  if (m.type() === 'error') consoleErrors.push(t);
  if (t.includes('[PLOT-CONTRACT:DIRECTIVE]')) spineDirectiveFired.push(t);
  const sc = t.match(/\[STATE-CHANGE:EVENT\]\s*scene=(-?\d+)\s*::\s*(.+)$/);
  if (sc) stateChangeEvents.push({ scene: Number(sc[1]), event: sc[2].trim(), seq: _scSeq++ });
  // AUTHOR-MODEL / fallback capture (validity check: is production Grok authoring, or gpt-4o fallback?)
  if (/PROMPT-PROFILE|PRIMARY_AUTHOR|grok|x\.?ai|mistral|fell back|fallback|author.*model|_promptTier|\[AUTHOR-MODEL\]/i.test(t)) authorLines.push(`[${m.type()}] ${t.slice(0, 200)}`);
  if (t.includes('[STATE-CHANGE:EVENT]') || t.includes('[TRANSITION-POS]') || t.includes('[AUTHOR-PRIORITY]')) log('    · ' + t.slice(0, 160));
});
page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + (e && e.message)));

// ── dry-mode proxy interception ────────────────────────────────────────────
if (MODE === 'dry') {
  await page.route('**/api/chatgpt-proxy', async route => {
    let body = ''; try { body = route.request().postData() || ''; } catch (_) {}
    const isPlanner  = body.includes('SCENE-SPINE planner');
    const isVerifier = body.includes('RUNTIME COMMIT verifier');
    if (isVerifier) return route.continue();                       // real verifier — validate the box
    if (isPlanner)   return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ content: CANNED_CONTRACT }) });
    // everything else (Bibles, aPlot, Scene-1, continuation author): canned. JSON-mode callers get a
    // permissive object; prose callers get the miss-prose. We include both so parsers usually survive.
    const generic = { content: CANNED_MISS_PROSE, text: CANNED_MISS_PROSE, event: '', beats: [], milestones: [], scene: CANNED_MISS_PROSE };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(generic) });
  });
}

log(`\n=== MOMENTUM HARNESS — MODE=${MODE} ARM=${ARM} N=${N} ===`);
await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.waitForFunction(() => window.state && typeof window.handleBeginStory === 'function', { timeout: 30000 });
await page.waitForFunction(() => typeof window._verifyDelivery === 'function', { timeout: 15000 }).catch(() => {});
mark('app+entrypoints loaded', true, `handleBeginStory + _verifyDelivery present`);

// ── account flags (survive resetForNewStory) + image stub + capture hook ─────
await page.evaluate(() => {
  const s = window.state;
  s.subscribed = true; s.fortunes = 9999999; s.access = 'sub';
  window._devBypass = true;
  // defensive: stub image gen so no image cost / hangs on the literary path
  try { window.generateImageWithFallback = async () => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; } catch (_) {}
  // capture hook on StoryPagination.addPage
  window.__capturedPages = [];
  try {
    const SP = window.StoryPagination;
    if (SP && typeof SP.addPage === 'function' && !SP.__wrapped) {
      const real = SP.addPage.bind(SP);
      SP.addPage = function (html, isNew) { try { window.__capturedPages.push(String(html || '')); window.__lastPageAt = Date.now(); } catch (_) {} return real(html, isNew); };
      SP.__wrapped = true;
    }
  } catch (_) {}
}, {});
mark('account+image-stub+capture set', true, '');

// ── bootstrap a full literary story via the programmatic launcher ────────────
log(`\n[bootstrap] _launchStarterStory(${STARTER}) …`);
let bootErr = null;
try {
  await page.evaluate(async ({ STARTER, T }) => {
    const def = (window.STARTER_STORIES || []).find(d => d.id === STARTER) || null;
    if (!def) throw new Error('starter def not found: ' + STARTER + ' (STARTER_STORIES ' + (window.STARTER_STORIES ? window.STARTER_STORIES.length : 'undefined') + ')');
    if (typeof window._launchStarterStory !== 'function') {
      // _launchStarterStory may be inner-scoped; fall back to hand-set picks + handleBeginStory
      const s = window.state;
      s.picks = s.picks || {};
      Object.assign(s.picks, { world: def.world, worldSubtype: def.worldSubtype, flavor: def.flavor, tone: def.tone, pov: def.pov, length: def.length, dynamic: def.dynamic, authorship: 'fate' });
      s.storyLength = 'taste'; s.is_starter_story = true; s.archetype = { primary: def.archetype, modifier: null };
      s.renderMode = 'literary'; s.storyMode = 'literary';
      if (typeof window._generateHumanAnchor === 'function') window._generateHumanAnchor();
      await window.handleBeginStory();
      return;
    }
    await Promise.race([
      window._launchStarterStory(def),
      new Promise((_, r) => setTimeout(() => r(new Error('bootstrap timeout')), T))
    ]);
  }, { STARTER, T: SCENE_TIMEOUT });
} catch (e) { bootErr = e && e.message; }
const afterBoot = await page.evaluate(() => ({
  turnCount: window.state.turnCount,
  pages: (window.__capturedPages || []).length,
  hasContract: !!(window.state._scenePlotContract),
  contractEvent: (window.state._scenePlotContract && window.state._scenePlotContract.stateChange && window.state._scenePlotContract.stateChange.event) || null
}));
mark('Scene-1 bootstrap ran', !bootErr && afterBoot.pages > 0, bootErr || `turnCount=${afterBoot.turnCount} pages=${afterBoot.pages}`);
log(`  [i] after bootstrap: ${JSON.stringify(afterBoot)}`);

// SETTLE: the bootstrap has a long async tail (Fate cards, cover, voice anchor) that runs AFTER the
// Scene-1 page mounts. Wait until page-adds have been quiet ≥12s AND no advance is in flight, so the
// continuation submit doesn't collide with the tail.
log('[settle] waiting for bootstrap async tail to quiesce …');
try {
  await page.waitForFunction(() => {
    const quietMs = Date.now() - (window.__lastPageAt || 0);
    return (window.__capturedPages || []).length >= 1 && quietMs > 12000 && !window.state._isAdvancingScene;
  }, { timeout: 90000, polling: 2000 });
  mark('bootstrap settled', true, '');
} catch (e) { mark('bootstrap settled', false, 'still active after 90s — proceeding anyway'); }

// ── FROZEN-TARGET A/B (isolates the SCENE-SPINE DIRECTIVE's value, one variable) ──
// BOTH arms keep SCENE-SPINE GENERATION on, so the same kind of hard, observable state_change is produced
// as the verification target. The ONLY difference: whether the author is TOLD it.
//   • scene_spine: directive intact → author receives the state_change contract.
//   • baseline: suppress ONLY the plot-contract DIRECTIVE (window._buildPlotContractDirective → '') so the
//     author writes WITHOUT being told the event; we then verify the prose against the SAME generated event.
// This is "freeze the target, vary the telling" — not "loose legacy beat vs hard event" (which would be a
// target-difficulty confound / success-bias trap).
await page.evaluate(({ ARM, retry, forceHeavy, plannerEngine, plannerModel, stageable }) => {
  delete window._stateChangeSpineV0; // generation ON for both arms
  // VALIDITY: taste/starter continuations author with gpt-4o (LITE); production momentum is the HEAVY/Grok
  // author. Force HEAVY so PRIMARY_AUTHOR = Grok (matches the ~23% baseline's tier). Toggle via FORCE_HEAVY=0.
  if (forceHeavy) window.__forceHeavyBuild = true; else delete window.__forceHeavyBuild;
  if (ARM === 'baseline') {
    if (!window.__realPlotDirective) window.__realPlotDirective = window._buildPlotContractDirective;
    window._buildPlotContractDirective = function () { return ''; }; // author NOT told the event
  } else if (window.__realPlotDirective) {
    window._buildPlotContractDirective = window.__realPlotDirective; // restore
  }
  // Arm B (downstream repair): enable the app's wired verify→retry seam (verifies the first draft against
  // the CURRENT-scene state_change — pre-prewarm — and regenerates ONCE with a correction if MISSED/PARTIAL).
  window.__transitionRetryExperiment = (retry === true);
  window.__txnRetryLog = [];
  // CROSS-MODEL PLANNER experiment knob (experimental variable, NOT measurement): swap the SCENE-SPINE planner
  // from GPT (default) to Grok. Measurement (verifier / target-capture / substitution classifier) unchanged.
  if (plannerEngine === 'grok') window._scenePlannerEngine = 'grok'; else delete window._scenePlannerEngine;
  if (plannerModel) window._scenePlannerModel = plannerModel; else delete window._scenePlannerModel;
  if (stageable) window._scenePlannerStageable = true; else delete window._scenePlannerStageable;
}, { ARM, retry: process.env.RETRY === '1', forceHeavy: process.env.FORCE_HEAVY !== '0', plannerEngine: process.env.PLANNER_ENGINE || 'gpt', plannerModel: process.env.PLANNER_MODEL || '', stageable: process.env.PLANNER_STAGEABLE === '1' });
mark('arm set', true, `${ARM} → directive ${ARM === 'baseline' ? 'SUPPRESSED' : 'INTACT'} · author ${process.env.FORCE_HEAVY !== '0' ? 'HEAVY/Grok' : 'default'}${process.env.RETRY === '1' ? ' + RETRY seam ON' : ''}`);

// ── drive N continuations, measure each ───────────────────────────────────────
const records = [];
for (let i = 0; i < N; i++) {
  const before = await page.evaluate(() => ({ pages: (window.__capturedPages || []).length, turn: window.state.turnCount || 0 }));
  const beforePages = before.pages;
  const beforeScSeq = _scSeq;   // events generated from here on belong to THIS continuation
  log(`\n[continuation ${i + 1}/${N}] submit say/do → #submitBtn … (from turn ${before.turn}, ${beforePages} pages)`);
  // Unblock the continuation guards: a starter/taste bootstrap is a PREVIEW, so after Scene-1 the submit
  // handler hits the preview-stop cliffhanger modal and returns. Authorize continue (exactly what the
  // "continue past cliffhanger" flow sets) + drop preview stop + clear any stale advancing lock.
  await page.evaluate(() => {
    const s = window.state;
    s._cliffhangerContinueAuthorized = true;
    s.previewActive = false; s.previewContinued = true;
    s._isAdvancingScene = false; s._advanceStartedAt = 0;
    // ONBOARDING SUBMIT GATES (story-1 turns 0/1/2: deck / petition / tempt). Disarm the deck gate's
    // ARMING universally + satisfy its commit flag. Petition/tempt (turns 1/2) are handled empirically
    // in the batch loop if they bite (faking fate.pendingPetition here can trigger petition rendering).
    window._forceDeckExamineMandatory = false;
    s._deckExamineFired = true;
    // FORTUNE-DISCLOSURE consent modal (fires once, non-issue-priced stories): shows a modal + returns
    // ("re-submit after consent"). Set the exact flag the consent handler sets so the submit proceeds.
    s.hasSeenFortuneTurnDisclosure = true;
  });
  // set inputs + fire real input events (in case the app tracks via listeners), then diagnose the trigger surface
  const diag = await page.evaluate(({ act, dia }) => {
    const setVal = (id, v) => { const el = document.getElementById(id); if (el) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); } return el; };
    const a = setVal('actionInput', act);
    const d = setVal('dialogueInput', dia);
    const btn = document.getElementById('submitBtn');
    const vis = el => { if (!el) return 'absent'; const r = el.getBoundingClientRect(); const st = getComputedStyle(el); return `${r.width}x${r.height} disp=${st.display} vis=${st.visibility} disabled=${el.disabled}`; };
    return { actionInput: vis(a), dialogueInput: vis(d), submitBtn: vis(btn), actVal: (a && a.value || '').slice(0, 40), turnCount: window.state.turnCount };
  }, { act: process.env.SAYDO_ACT || 'confront him about the contract and refuse to sign until he explains', dia: process.env.SAYDO_DIA || 'You knew what this deal would cost me. Say it to my face.' });
  log(`  [diag] submitBtn=[${diag.submitBtn}] actionInput=[${diag.actionInput}] actVal="${diag.actVal}" turn=${diag.turnCount}`);
  let contErr = null;
  try {
    await page.click('#submitBtn', { timeout: 5000 }).catch(async () => {
      log('  [diag] hit-click failed → dispatching programmatic click');
      await page.evaluate(() => document.getElementById('submitBtn') && document.getElementById('submitBtn').click());
    });
    // Phase 1 — did generation actually START? (real gen holds _isAdvancingScene=true; a gate resets it
    // to false and returns). Fast-fail on a bail instead of blocking the full CONT_TIMEOUT.
    const started = await page.waitForFunction(({ n, t }) =>
      window.state._isAdvancingScene === true || (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t,
      { n: beforePages, t: before.turn }, { timeout: 30000, polling: 1000 }).then(() => true).catch(() => false);
    if (!started) throw new Error('submit BAILED — generation never started (a gate returned without advancing; _isAdvancingScene stayed false)');
    log('  [diag] generation started (advancing) — awaiting scene …');
    // Phase 2 — await completion (new page or turn increment).
    await page.waitForFunction(({ n, t }) => (window.__capturedPages || []).length > n || (window.state.turnCount || 0) > t, { n: beforePages, t: before.turn }, { timeout: CONT_TIMEOUT, polling: 3000 });
  } catch (e) {
    contErr = e && e.message;
    log('  [diag] continuation failed: ' + contErr);
    log('  [diag] last console lines:');
    consoleRing.slice(-24).forEach(l => log('      ' + l));
  }
  if (contErr) { mark(`continuation ${i + 1} rendered`, false, contErr); records.push({ scene_id: i + 1, error: contErr }); continue; }

  // GROUND-TRUTH target = the state_change GENERATED for THIS scene (scene===before.turn, generated after
  // the submit). NOT the post-render state read (the next-scene prewarm overwrites it → false MISSes).
  const scForThis = stateChangeEvents.filter(e => e.seq >= beforeScSeq && e.scene === before.turn);
  const targetEvent = scForThis.length ? scForThis[0].event : '';
  log(`  [target] gen-time state_change (scene=${before.turn}): "${targetEvent.slice(0, 90)}"${scForThis.length > 1 ? ` (+${scForThis.length - 1} more this scene)` : ''}`);
  const postReadEvent = await page.evaluate(() => (window.state._scenePlotContract && window.state._scenePlotContract.stateChange && window.state._scenePlotContract.stateChange.event) || '');
  if (postReadEvent && postReadEvent !== targetEvent) log(`  [target] (post-render state read DIFFERS → prewarm overwrite confirmed: "${postReadEvent.slice(0, 70)}")`);
  const authThis = authorLines.slice(-8).map(a => a.replace(/^\[\w+\]\s*/, ''));
  if (authThis.length) authThis.forEach(a => log('  [author] ' + a));

  // read delivered prose + verify against the ground-truth target
  const rec = await page.evaluate(async ({ ARM, event, deep }) => {
    const pages = window.__capturedPages || [];
    const html = pages[pages.length - 1] || '';
    const prose = String(html).replace(/<[^>]*>/g, ' ').replace(/\[[A-Z][^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim();
    let v = { delivery: 'ERROR', transition_position: -1, dominant_replacement: 'none', ok: false };
    try { v = await window._verifyDelivery(prose, event); } catch (e) { v.err = String(e && e.message); }

    // ── SUBSTITUTION CLASSIFIER (Roman 2026-07-28): when the planned event is NOT literally delivered,
    // split the cause into architecturally-distinct buckets — did the author deliver a DIFFERENT
    // irreversible event (author sovereignty), the SAME event reworded (verifier/planner literalism),
    // or NO irreversible event (true atmosphere miss)? equivalent vs competing need DIFFERENT fixes.
    let sub = { substitution: 'n/a', substituted_event: '' };
    if (v.delivery !== 'DELIVERED' && prose.length > 40 && event) {
      try {
        const SUB_SYS =
          'You are a diagnostic classifier for an interactive-fiction planner. A PLANNED EVENT (an intended ' +
          'irreversible, externally-observable on-page event) was judged NOT literally delivered by the SCENE PROSE. ' +
          'Classify which case this is:\n' +
          '"equivalent_transition": the scene DID deliver an irreversible observable event that is SEMANTICALLY THE SAME ' +
          'change as the planned one, only worded/staged differently (planner & author agree on WHAT changed; only surface differs). ' +
          'e.g. planned "confesses love" vs scene "admits she has loved him for years".\n' +
          '"competing_transition": the scene committed to a DIFFERENT irreversible observable event instead — a real permanent ' +
          'change, but NOT the planned one (the author chose a different thing to make happen). e.g. planned "the sigil ignites on her skin" ' +
          'vs scene "a curse drains the warmth from her hands forever".\n' +
          '"none": the scene delivered NO irreversible observable event at all — it stayed in atmosphere, dialogue, or interiority.\n' +
          'Also return substituted_event = the actual irreversible event the scene delivered (empty string if none).\n' +
          'Output STRICT JSON: {"substitution":"equivalent_transition","substituted_event":"..."}';
        const res = await fetch('/api/chatgpt-proxy', {
          method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'system', content: SUB_SYS }, { role: 'user', content: 'PLANNED EVENT: ' + String(event).slice(0, 240) + '\n\nSCENE PROSE:\n' + prose.slice(0, 6000) + '\n\nReturn the JSON now.' }], role: 'PRIMARY_AUTHOR', model: 'gpt-4o-mini', temperature: 0.1, max_tokens: 220, jsonMode: true })
        });
        if (res.ok) { const d = await res.json(); const c = (d && d.content) || (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content); let p; try { p = JSON.parse(c); } catch (e) { const mm = String(c || '').match(/\{[\s\S]*\}/); if (mm) { try { p = JSON.parse(mm[0]); } catch (_) {} } } if (p) { sub.substitution = String(p.substitution || 'none'); sub.substituted_event = String(p.substituted_event || ''); } }
      } catch (_) {}
    }
    // refined residual-cause cluster key: prefer the substitution class over the verifier's coarse label.
    const residualCause = (sub.substitution === 'equivalent_transition' || sub.substitution === 'competing_transition') ? sub.substitution : v.dominant_replacement;

    return {
      scene_id: window.state.turnCount || null,
      architecture: (ARM === 'baseline') ? 'baseline' : 'scene_spine',
      first_verdict: v.delivery, final_verdict: v.delivery, retry_count: 0,
      transition_position: v.transition_position,
      dominant_replacement: residualCause,      // refined: equivalent_transition | competing_transition | atmosphere | ...
      _dr_verifier: v.dominant_replacement,      // the verifier's original coarse label (kept)
      substitution: sub.substitution, substituted_event: sub.substituted_event,
      reader_score: null, first_pass_cost: null, final_cost: null,
      _proseLen: prose.length, _event: event, _verifierOk: v.ok, _proseHead: prose.slice(0, 200),
      _proseFull: deep ? prose : undefined
    };
  }, { ARM, event: targetEvent, deep: process.env.DEEP === '1' });
  // tag the planner engine (node-side only; in-page measurement untouched) so the Grok-planner arm is
  // distinguishable in the corpus/_momentumEval grouping.
  rec.planner = process.env.PLANNER_ENGINE || 'gpt';
  if (process.env.PLANNER_ENGINE === 'grok') rec.architecture = rec.architecture + '_grokplan';

  // merge the app's retry-seam log (Arm B): first (pre-retry) vs second (post-retry) verdict + rescue.
  if (process.env.RETRY === '1') {
    const rlog = await page.evaluate(() => (window.__txnRetryLog && window.__txnRetryLog.length) ? window.__txnRetryLog[window.__txnRetryLog.length - 1] : null);
    if (rlog) {
      rec.first_verdict = rlog.first_verdict || rec.first_verdict;   // the FIRST draft's verdict
      rec.second_verdict = rlog.second_verdict; rec.retried = !!rlog.retried; rec.retry_count = rlog.retry_count || 0;
      rec.dominant_replacement_1 = rlog.dominant_replacement_1;
      // rec.final_verdict stays = the harness's own verify of the DISPLAYED (post-retry) prose = source of truth
      log(`  [retry] first=${rec.first_verdict} → retried=${rec.retried} → final(displayed)=${rec.final_verdict}`);
    } else { log('  [retry] no __txnRetryLog entry (seam did not fire — no state_change or no captured author msgs?)'); }
  }
  mark(`continuation ${i + 1} rendered`, rec._proseLen > 0, `proseLen=${rec._proseLen}`);
  mark(`transition present`, !!rec._event, rec._event ? `"${rec._event.slice(0, 60)}"` : 'MISSING — SCENE-SPINE had nothing to enforce');
  mark(`verifier fired`, rec._verifierOk, `verdict=${rec.first_verdict} pos=${rec.transition_position}% cause=${rec.dominant_replacement} (verifier:${rec._dr_verifier})`);
  if (rec.substitution && rec.substitution !== 'n/a') log(`  [substitution] ${rec.substitution}${rec.substituted_event ? ' → "' + rec.substituted_event.slice(0, 80) + '"' : ''}`);
  records.push(rec);
  log(`  [i] prose head: "${rec._proseHead}…"`);
}

// ── shared schema → _momentumEval (the last two boxes) ───────────────────────
const evalOut = await page.evaluate((recs) => {
  window.__momentumLog = (window.__momentumLog || []).concat(recs.filter(r => r.architecture));
  return (typeof window._momentumEval === 'function') ? window._momentumEval(window.__momentumLog) : { error: '_momentumEval missing' };
}, records);
mark('_momentumEval consumed schema', !evalOut.error, evalOut.error || `records=${evalOut.total_records}`);

// The app's content guardrails log console.error when a self-repair "accepts with warning" — these are
// NON-fatal (the scene still renders). Only truly-fatal harness/app errors should fail the box.
// The app's content/quality guardrails log console.error but then "accept" the scene and proceed — NON-fatal.
const NONFATAL = [/accepting/i, /Regeneration still failed/i, /FATE_OVERFLOW/i, /PREMATURE_ESCALATION/i, /IntimacyFailsafe/i, /FateVoice/i, /Failsafe/i, /TENSION GATE/i, /HARD_FAIL/i, /NO_EARLY_ANCHOR/i, /NO_FORCING_FUNCTION/i];
const fatalErrors = consoleErrors.filter(e => !NONFATAL.some(re => re.test(e)));
mark('no fatal console errors', fatalErrors.length === 0, fatalErrors.length ? `${fatalErrors.length} fatal (of ${consoleErrors.length} total; rest are app self-repair warnings)` : (consoleErrors.length ? `0 fatal (${consoleErrors.length} non-fatal app warnings ignored)` : ''));
if (fatalErrors.length) fatalErrors.slice(0, 8).forEach(e => log('    ! ' + e.slice(0, 200)));

// ── batch logging: append each measured record (JSONL) so a multi-run loop merges into one corpus ──
if (process.env.LOGFILE) {
  try {
    const line = records.filter(r => r.architecture).map(r => JSON.stringify(r)).join('\n');
    if (line) fs.appendFileSync(process.env.LOGFILE, line + '\n');
  } catch (e) { log('  [warn] LOGFILE append failed: ' + (e && e.message)); }
}

const result = { mode: MODE, arm: ARM, n: N, boxes: box, spineDirectiveFired, records, momentumEval: evalOut, consoleErrors: consoleErrors.slice(0, 20), consoleTail: consoleRing.slice(-50) };
fs.writeFileSync(`${OUT}/harness_${MODE}_${ARM}.json`, JSON.stringify(result, null, 2));
log(`\n=== PIPELINE BOXES ===`);
const allOk = Object.values(box).every(b => b.ok);
log(`RESULT: ${allOk ? 'ALL BOXES PASS' : 'SOME BOXES FAILED — see ✗ above'} · wrote ${OUT}/harness_${MODE}_${ARM}.json`);
await browser.close();
process.exit(allOk ? 0 : 1);
