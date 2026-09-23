// TEMPT FATE IMPRINT-PHASE LIFECYCLE FIX — DRY CONTROL (Roman, 2026-09-22)
//
// Roman: "This is not just a quality nit; it's part of the Tempt Fate contract... Claude was right
// not to silently roll it into the previous fix, but now that it's surfaced, it should be the next
// dry fix before any live Tempt sample." No paid calls, no prose generation, no image work.
//
// BUG (found while proving the prior CG-activation fix, confirmed pre-existing in BOTH literary and
// CG, not introduced by that fix): the volatility-window-close step and the aftermath-decay step
// ran back-to-back in the SAME turn's cleanup. On the turn the window closed, it seeded
// state._temptAftermathScenes = 2 — and the very next check, still in the same call, immediately
// saw the (now-inactive) window and decremented the counter to 1 before any directive was ever
// built from it. buildWorldLawDirective()'s IMPRINT branch requires the counter to read exactly 2
// (isFirst = state._temptAftermathScenes === 2) — so IMPRINT never fired; players only ever saw
// FADING.
//
// FIX: unified both paths' taper+decay logic into one shared function,
// _temptFateWindowTaperAndAftermathDecay (app.js ~70253), which tracks whether THIS call is the one
// that just closed the window (aftermathJustSeededThisTurn) and skips the decay step on that same
// call — so the freshly-seeded counter (2) survives to be read by the NEXT directive build. Also
// folds in the Petition-activation-turn skip literary already had but CG's independent 2026-05-18
// copy was missing.
//
// This control calls ONLY the real, exposed functions — no reimplementation, no stubs. Fail-closed
// network gate confirms zero /api/** traffic: genuinely zero paid calls.
//
// usage: node _tempt_fate_imprint_lifecycle_control.mjs
import { chromium } from 'playwright-core';
import { installFailClosedNetworkGate } from './_e2e_network_gate.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const results = [];
const ok = (name, pass, detail) => { results.push({ name, pass: !!pass }); console.log((pass ? '  ✓ ' : '  ✗ ') + name + (!pass && detail ? '  — ' + String(detail).slice(0, 900) : '')); };
function section(t) { console.log('\n=== ' + t + ' ==='); }

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_tempt_fate_imprint_lifecycle_control_out.jsonl') });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state
    && typeof window._cgTemptFateAftermathCleanup === 'function'
    && typeof window._updateTemptFateSaturationAndVolatility === 'function'
    && typeof window._temptFateWindowTaperAndAftermathDecay === 'function'
    && typeof window._buildCGTemptDirective === 'function', { timeout: 25000 })
    .catch(async (e) => { console.error('HARNESS BLOCKER: app not ready or required functions not exposed — ' + (e && e.message)); await browser.close(); process.exit(2); });
  console.log('✓ real app reached, all required functions exposed on window\n');

  function resetBaseline() {
    return page.evaluate(() => {
      window.state = window.state || {};
      window.state.picks = window.state.picks || {};
      window.state.picks.world = 'Fantasy';
      window.state.loveInterestName = 'Julian';
      window.state.fate_saturation = 0;
      window.state.volatility_window = { active: false, severity: 0, remaining_scenes: 0 };
      window.state._temptAftermathScenes = 0;
      window.state._temptAftermathWish = '';
      window.state._temptSeverityTier = null;
      window.state._temptInstability = 0;
      window.state._temptUsageCount = 0;
      window.state.consecutive_tempt_fate_count = 0;
      window.state.tempt_fate_invoked_this_turn = false;
      window.state.temptFateWish = '';
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('1. CG PATH — full lifecycle walk (directive built BEFORE that turn\'s cleanup, matching _completeStagedSceneFromScreenplay\'s real call order: directive for scene N reflects state as of scene N-1\'s cleanup)');
  await resetBaseline();
  {
    const cgTimeline = await page.evaluate(() => {
      var log = [];
      // Turn 0: invocation
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = 'kill Julian';
      window._cgTemptFateAftermathCleanup();
      log.push({ turn: 0, label: 'invocation-cleanup', windowActive: window.state.volatility_window.active, remaining: window.state.volatility_window.remaining_scenes, aftermathScenes: window.state._temptAftermathScenes });

      var MAX_SCENES = 8;
      for (var i = 0; i < MAX_SCENES; i++) {
        window.state.tempt_fate_invoked_this_turn = false;
        var directive = window._buildCGTemptDirective();
        window._cgTemptFateAftermathCleanup();
        log.push({
          turn: i + 1,
          directiveHadWorldLaw: directive.indexOf('TEMPT FATE WORLD LAW') !== -1,
          directiveHadImprint: directive.indexOf('TEMPT FATE AFTERMATH — IMPRINT') !== -1,
          directiveHadFading: directive.indexOf('TEMPT FATE AFTERMATH — FADING') !== -1,
          directiveEmpty: directive === '',
          windowActive: window.state.volatility_window.active,
          aftermathScenes: window.state._temptAftermathScenes,
        });
        if (directive === '' && !window.state.volatility_window.active && (window.state._temptAftermathScenes || 0) === 0) break;
      }
      return log;
    });
    console.log('  CG timeline: ' + JSON.stringify(cgTimeline));

    const imprintIdx = cgTimeline.findIndex((t) => t.directiveHadImprint);
    const fadingIdx = cgTimeline.findIndex((t) => t.directiveHadFading);
    ok('IMPRINT appears in the CG timeline', imprintIdx !== -1, JSON.stringify(cgTimeline));
    ok('FADING appears in the CG timeline', fadingIdx !== -1, JSON.stringify(cgTimeline));
    ok('IMPRINT appears strictly BEFORE FADING', imprintIdx !== -1 && fadingIdx !== -1 && imprintIdx < fadingIdx, 'imprintIdx=' + imprintIdx + ' fadingIdx=' + fadingIdx);
    ok('expiration clears afterward — timeline ends with an empty directive, window closed, aftermath at 0', cgTimeline.length > 0 && cgTimeline[cgTimeline.length - 1].directiveEmpty, JSON.stringify(cgTimeline[cgTimeline.length - 1]));

    // No double-decrement on the seeding turn: the turn aftermathScenes first becomes > 0, it must
    // read EXACTLY 2, never 1 (which would mean it was seeded then immediately decremented once).
    const seedTurn = cgTimeline.find((t) => (t.aftermathScenes || 0) > 0 && t.turn !== undefined) || cgTimeline.find((t) => t.aftermathScenes > 0);
    const firstAftermathEntries = cgTimeline.filter((t) => t.aftermathScenes > 0);
    const seedValue = firstAftermathEntries.length ? firstAftermathEntries[0].aftermathScenes : null;
    ok('the seeding turn shows aftermathScenes === 2 exactly (not already decremented to 1 within the same call)', seedValue === 2, 'seedValue=' + seedValue + ' timeline=' + JSON.stringify(cgTimeline));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. LITERARY PATH — full lifecycle walk (activation -> taper/decay -> directive build ALL within the SAME turn, matching the literary submit handler\'s real call order)');
  await resetBaseline();
  {
    const litTimeline = await page.evaluate(() => {
      var log = [];
      var MAX_SCENES = 10;
      // Turn 0: invocation (activation runs; taper/decay skipped this same turn by the
      // invocation-turn guard — matches literary's real order: activate, then taper/decay,
      // both reading the still-true invoked flag, then directive build).
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = 'kill Julian';
      window._updateTemptFateSaturationAndVolatility();
      window._temptFateWindowTaperAndAftermathDecay(window.state.tempt_fate_invoked_this_turn, window.state.temptFateWish);
      var d0 = window._buildCGTemptDirective(); // shares buildWorldLawDirective's output; fine to reuse for the directive-content assertions
      log.push({ turn: 0, directiveHadWorldLaw: d0.indexOf('TEMPT FATE WORLD LAW') !== -1, windowActive: window.state.volatility_window.active, aftermathScenes: window.state._temptAftermathScenes });
      // Literary resets these much later in its own handler (after generation) — simulate that here.
      window.state.tempt_fate_invoked_this_turn = false;
      window.state.temptFateWish = '';

      for (var i = 0; i < MAX_SCENES; i++) {
        // Ordinary continuation turn: no re-invocation.
        window._updateTemptFateSaturationAndVolatility(); // else-branch: saturation/instability decay only
        window._temptFateWindowTaperAndAftermathDecay(window.state.tempt_fate_invoked_this_turn, window.state.temptFateWish);
        var d = window._buildCGTemptDirective();
        log.push({
          turn: i + 1,
          directiveHadWorldLaw: d.indexOf('TEMPT FATE WORLD LAW') !== -1,
          directiveHadImprint: d.indexOf('TEMPT FATE AFTERMATH — IMPRINT') !== -1,
          directiveHadFading: d.indexOf('TEMPT FATE AFTERMATH — FADING') !== -1,
          directiveEmpty: d === '',
          windowActive: window.state.volatility_window.active,
          aftermathScenes: window.state._temptAftermathScenes,
        });
        if (d === '' && !window.state.volatility_window.active && (window.state._temptAftermathScenes || 0) === 0) break;
      }
      return log;
    });
    console.log('  Literary timeline: ' + JSON.stringify(litTimeline));

    const imprintIdx = litTimeline.findIndex((t) => t.directiveHadImprint);
    const fadingIdx = litTimeline.findIndex((t) => t.directiveHadFading);
    ok('IMPRINT appears in the literary timeline', imprintIdx !== -1, JSON.stringify(litTimeline));
    ok('FADING appears in the literary timeline', fadingIdx !== -1, JSON.stringify(litTimeline));
    ok('IMPRINT appears strictly BEFORE FADING', imprintIdx !== -1 && fadingIdx !== -1 && imprintIdx < fadingIdx, 'imprintIdx=' + imprintIdx + ' fadingIdx=' + fadingIdx);
    ok('expiration clears afterward — timeline ends with an empty directive, window closed, aftermath at 0', litTimeline.length > 0 && litTimeline[litTimeline.length - 1].directiveEmpty, JSON.stringify(litTimeline[litTimeline.length - 1]));

    const firstAftermathEntries = litTimeline.filter((t) => t.aftermathScenes > 0);
    const seedValue = firstAftermathEntries.length ? firstAftermathEntries[0].aftermathScenes : null;
    ok('the seeding turn shows aftermathScenes === 2 exactly (not already decremented to 1 within the same call)', seedValue === 2, 'seedValue=' + seedValue + ' timeline=' + JSON.stringify(litTimeline));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. Ordinary Say/Do does not create imprint aftermath (both paths)');
  await resetBaseline();
  {
    const cg = await page.evaluate(() => {
      window.state.tempt_fate_invoked_this_turn = false;
      window._cgTemptFateAftermathCleanup();
      return { aftermathScenes: window.state._temptAftermathScenes, windowActive: window.state.volatility_window.active };
    });
    ok('CG: an ordinary Say/Do turn creates no aftermath and no active window', cg.aftermathScenes === 0 && cg.windowActive === false, JSON.stringify(cg));
  }
  await resetBaseline();
  {
    const lit = await page.evaluate(() => {
      window.state.tempt_fate_invoked_this_turn = false;
      window._updateTemptFateSaturationAndVolatility();
      window._temptFateWindowTaperAndAftermathDecay(window.state.tempt_fate_invoked_this_turn, window.state.temptFateWish);
      return { aftermathScenes: window.state._temptAftermathScenes, windowActive: window.state.volatility_window.active };
    });
    ok('Literary: an ordinary Say/Do turn creates no aftermath and no active window', lit.aftermathScenes === 0 && lit.windowActive === false, JSON.stringify(lit));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. A Petition/Fate-card choice does not create TEMPT imprint aftermath (both paths)');
  await resetBaseline();
  {
    const cg = await page.evaluate(() => {
      // A petition window closing on its own schedule must never seed Tempt's aftermath counter.
      window.state.volatility_window = { active: true, severity: 0.3, remaining_scenes: 1, source: 'petition', wishText: 'a change to my hair' };
      window.state.tempt_fate_invoked_this_turn = false;
      window._cgTemptFateAftermathCleanup();
      return { aftermathScenes: window.state._temptAftermathScenes, windowActive: window.state.volatility_window.active, source: window.state.volatility_window.source };
    });
    ok('CG: a closing PETITION window does not seed _temptAftermathScenes', cg.aftermathScenes === 0, JSON.stringify(cg));
    ok('CG: the petition window itself closes correctly via the shared function\'s petition branch', cg.windowActive === false && cg.source === 'petition', JSON.stringify(cg));
  }
  await resetBaseline();
  {
    const lit = await page.evaluate(() => {
      window.state.volatility_window = { active: true, severity: 0.3, remaining_scenes: 1, source: 'petition', wishText: 'a change to my hair' };
      window.state.tempt_fate_invoked_this_turn = false;
      window._updateTemptFateSaturationAndVolatility();
      window._temptFateWindowTaperAndAftermathDecay(window.state.tempt_fate_invoked_this_turn, window.state.temptFateWish);
      return { aftermathScenes: window.state._temptAftermathScenes, windowActive: window.state.volatility_window.active, source: window.state.volatility_window.source };
    });
    ok('Literary: a closing PETITION window does not seed _temptAftermathScenes', lit.aftermathScenes === 0, JSON.stringify(lit));
    ok('Literary: the petition window itself closes correctly', lit.windowActive === false && lit.source === 'petition', JSON.stringify(lit));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. Re-run of the prior CG-activation control\'s core proofs (requirement 5 — confirm the previous fix still holds)');
  await resetBaseline();
  {
    const after = await page.evaluate(() => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = 'kill Julian';
      window._cgTemptFateAftermathCleanup();
      return {
        active: window.state.volatility_window.active,
        source: window.state.volatility_window.source,
        sat: window.state.fate_saturation,
        invokedFlagReset: window.state.tempt_fate_invoked_this_turn,
      };
    });
    ok('CG Tempt invocation still activates volatility_window (active/source correct)', after.active === true && after.source === 'tempt', JSON.stringify(after));
    ok('saturation still increments', after.sat > 0, JSON.stringify(after));
    ok('invocation flag still correctly reset by the cleanup call', after.invokedFlagReset === false, JSON.stringify(after));
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('TEMPT FATE IMPRINT LIFECYCLE CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  try { fs.unlinkSync(path.join(__dirname, '_tempt_fate_imprint_lifecycle_control_out.jsonl')); } catch (_) {}
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
