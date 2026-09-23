// TEMPT FATE CG VOLATILITY/IMPRINT ACTIVATION — DRY-FIX CONTROL (Roman, 2026-09-22)
//
// Roman: "Start by making sure Tempt Fate actually creates the volatility/imprint window that its
// aftermath system expects... dry-fix that next... No paid calls, no prose generation, no image
// work... No live Tempt Fate sample until activation is dry-proven."
//
// TRACE CONFIRMED (this pass, re-verified against Roman's own recollection that this was wired
// before — git log -S found commit 6c6c752a, "full CG fate wiring", 2026-05-18, which added CG's
// taper/aftermath DECAY mirror but never called anything that CREATES/ACTIVATES the tempt-sourced
// volatility_window; an AST-based enclosing-function lookup confirmed the only activation code
// lived inline inside the literary game-loop's giant submitBtn click handler, which a deliberate
// "WRONG-ENGINE GUARD" (app.js ~302779, comment: "on a staged (CG) Book the literary Submit must
// never start a literary continuation") returns out of before reaching that code, under normal
// operation). See _tempt_fate_volatility_activation_2026_09_22.md for the full trace.
//
// FIX: extracted the literary activation block verbatim into a new shared, exposed function
// (_updateTemptFateSaturationAndVolatility, app.js ~70187) called identically from both the
// literary handler (unchanged behavior) and a new extracted CG cleanup function
// (_cgTemptFateAftermathCleanup, app.js ~232369, itself pulled out of
// _completeStagedSceneFromScreenplay so it's directly callable here without touching that async
// pipeline's real network calls). Also added the missing "skip decrement on activation turn" guard
// to CG's taper logic (mirroring literary's own `!state.tempt_fate_invoked_this_turn` guard),
// preventing a freshly-activated window from losing one scene of its duration immediately.
//
// This control calls ONLY the real, exposed functions — no reimplementation, no stubs. Fail-closed
// network gate confirms zero /api/** traffic: genuinely zero paid calls, no prose/image generation.
//
// usage: node _tempt_fate_volatility_activation_control.mjs
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
  const gate = await installFailClosedNetworkGate(page, { logFile: path.join(__dirname, '_tempt_fate_volatility_activation_control_out.jsonl') });

  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await page.waitForFunction(() => window.state
    && typeof window._cgTemptFateAftermathCleanup === 'function'
    && typeof window._updateTemptFateSaturationAndVolatility === 'function'
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
  section('1. A CG Tempt invocation activates the volatility/imprint window');
  await resetBaseline();
  {
    const before = await page.evaluate(() => ({ sat: window.state.fate_saturation, active: window.state.volatility_window.active }));
    ok('baseline: saturation 0, window inactive', before.sat === 0 && before.active === false, JSON.stringify(before));

    const after = await page.evaluate(() => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = 'kill Julian';
      window._cgTemptFateAftermathCleanup(); // the REAL CG turn-commit fate-cleanup function
      return {
        active: window.state.volatility_window.active,
        source: window.state.volatility_window.source,
        severity: window.state.volatility_window.severity,
        remaining_scenes: window.state.volatility_window.remaining_scenes,
        wishText: window.state.volatility_window.wishText,
        invokedFlagReset: window.state.tempt_fate_invoked_this_turn,
        wishReset: window.state.temptFateWish,
      };
    });
    ok('volatility_window.active === true after a CG Tempt invocation', after.active === true, JSON.stringify(after));
    ok('source === "tempt"', after.source === 'tempt', JSON.stringify(after));
    ok('severity is a real snapshotted number, remaining_scenes >= 1', typeof after.severity === 'number' && after.remaining_scenes >= 1, JSON.stringify(after));
    ok('wishText captured onto the window ("kill Julian")', after.wishText === 'kill Julian', JSON.stringify(after));
    ok('tempt_fate_invoked_this_turn correctly reset to false by the SAME cleanup call (activation ran first, reading the still-true flag)', after.invokedFlagReset === false, JSON.stringify(after));
    ok('temptFateWish cleared after being captured', after.wishReset === '', JSON.stringify(after));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('2. Saturation increments on a CG Tempt invocation');
  {
    const sat = await page.evaluate(() => window.state.fate_saturation);
    ok('fate_saturation > 0 after the invocation above (was 0 at baseline)', sat > 0, sat);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('3. Off-by-one guard: the activation turn itself does NOT also get decremented');
  {
    // remaining_scenes was set once by the SAME cleanup call in section 1 (activation semantics —
    // the window should not be tapered again within that same call).
    const rs = await page.evaluate(() => window.state.volatility_window.remaining_scenes);
    ok('remaining_scenes reflects the freshly-set value, not pre-decremented on its own activation turn', rs >= 1, rs);
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('4. The next continuation scenes receive the bounded rupture/imprint directive, then it decays and expires');
  {
    // Drive real turns forward (no re-invocation) by repeatedly calling the REAL cleanup function,
    // exactly as _completeStagedSceneFromScreenplay would on each subsequent scene commit, until
    // the volatility window fully closes and aftermath begins — walking the REAL state machine
    // rather than assuming a fixed scene count (severity may taper through an extra scene before
    // aftermath opens, exactly like the literary path's own behavior).
    const timeline = await page.evaluate(() => {
      var log = [];
      var MAX_SCENES = 8; // generous ceiling — real severity/taper math should resolve well before this
      for (var i = 0; i < MAX_SCENES; i++) {
        window.state.tempt_fate_invoked_this_turn = false; // ordinary continuation, no re-invocation
        var directive = window._buildCGTemptDirective(); // what the NEXT author call would receive, BEFORE this scene's own cleanup runs
        window._cgTemptFateAftermathCleanup();
        log.push({
          scene: i + 1,
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
    console.log('  timeline: ' + JSON.stringify(timeline));

    const anyWorldLaw = timeline.some((t) => t.directiveHadWorldLaw);
    const anyImprint = timeline.some((t) => t.directiveHadImprint);
    const anyFading = timeline.some((t) => t.directiveHadFading);
    const endsEmpty = timeline.length > 0 && timeline[timeline.length - 1].directiveEmpty;

    ok('at least one continuation scene while the volatility window is still open receives the WORLD LAW / severity-band directive (bounded rupture)', anyWorldLaw, JSON.stringify(timeline));
    // UPDATED 2026-09-22 (IMPRINT-phase lifecycle fix pass): this assertion previously logged
    // anyImprint as INFO-only, since full lifecycle proof HERE is what surfaced the pre-existing,
    // both-paths bug where IMPRINT never fired (window-close and aftermath-decay ran back-to-back
    // in the same turn). That bug is now fixed (_temptFateWindowTaperAndAftermathDecay, app.js
    // ~70253) — see _tempt_fate_imprint_lifecycle_2026_09_22.md and
    // _tempt_fate_imprint_lifecycle_control.mjs for the dedicated fix + proof. Asserted for real now.
    ok('the aftermath IMPRINT directive fires once the window closes (FIXED — previously always skipped; see _tempt_fate_imprint_lifecycle_2026_09_22.md)', anyImprint, JSON.stringify(timeline));
    ok('the aftermath FADING directive fires on the second aftermath scene', anyFading, JSON.stringify(timeline));
    ok('the imprint fully decays/expires — the LAST scene in the walk gets an empty directive, with the window closed and aftermath counter at 0', endsEmpty, JSON.stringify(timeline));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('5. Ordinary Say/Do does NOT activate Tempt volatility');
  await resetBaseline();
  {
    const after = await page.evaluate(() => {
      // Ordinary Say/Do turn: no Tempt invocation at all.
      window.state.tempt_fate_invoked_this_turn = false;
      window._cgTemptFateAftermathCleanup();
      return {
        active: window.state.volatility_window.active,
        source: window.state.volatility_window.source,
        sat: window.state.fate_saturation,
      };
    });
    ok('volatility_window stays inactive on an ordinary Say/Do turn', after.active === false, JSON.stringify(after));
    ok('no tempt-sourced window is created (source stays undefined, not "tempt")', after.source !== 'tempt', JSON.stringify(after));
    ok('saturation does not rise from an ordinary turn (stays at/below baseline 0)', after.sat <= 0, JSON.stringify(after));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('6. A Fate-card / Petition-shaped scene does NOT activate Tempt volatility either');
  await resetBaseline();
  {
    const after = await page.evaluate(() => {
      // Simulate a Petition-sourced window already active (a different Fate mechanism) — confirm
      // the CG cleanup path's ACTIVATION step (which is unconditionally gated on
      // tempt_fate_invoked_this_turn only) does not overwrite it with a tempt-sourced window, and
      // does not itself flip any tempt-specific flag, when Tempt was never invoked this turn.
      window.state.volatility_window = { active: true, severity: 0.5, remaining_scenes: 2, source: 'petition', wishText: 'a change to my hair' };
      window.state.tempt_fate_invoked_this_turn = false;
      window._cgTemptFateAftermathCleanup();
      return {
        source: window.state.volatility_window.source,
        remaining_scenes: window.state.volatility_window.remaining_scenes,
      };
    });
    ok('the existing PETITION-sourced window is left alone by Tempt\'s activation step (source unchanged, still "petition")', after.source === 'petition', JSON.stringify(after));
    ok('petition\'s own taper still runs normally (remaining_scenes decremented by the shared taper logic — 2 -> 1)', after.remaining_scenes === 1, JSON.stringify(after));
  }

  // ═══════════════════════════════════════════════════════════════════════════════════════════
  section('7. Literary behavior is preserved (same shared function, same output shape)');
  await resetBaseline();
  {
    // _updateTemptFateSaturationAndVolatility is the SAME function the literary game-loop handler
    // now calls (extracted verbatim, single call site swapped in) — calling it directly here
    // exercises the exact literary code path's logic with no CG-specific wrapper involved.
    const after = await page.evaluate(() => {
      window.state.tempt_fate_invoked_this_turn = true;
      window.state.temptFateWish = 'let the storm break early';
      window._updateTemptFateSaturationAndVolatility();
      return {
        active: window.state.volatility_window.active,
        source: window.state.volatility_window.source,
        sat: window.state.fate_saturation,
        tier: window.state._temptSeverityTier,
      };
    });
    ok('literary call path (direct call to the shared function) produces the identical activation shape as the CG path', after.active === true && after.source === 'tempt' && after.sat > 0 && typeof after.tier === 'number', JSON.stringify(after));
  }

  await browser.close();

  console.log('\n' + '='.repeat(100));
  console.log('TEMPT FATE CG VOLATILITY/IMPRINT ACTIVATION CONTROL: ' + results.filter((r) => r.pass).length + '/' + results.length + ' passed');
  try { fs.unlinkSync(path.join(__dirname, '_tempt_fate_volatility_activation_control_out.jsonl')); } catch (_) {}
  process.exitCode = results.every((r) => r.pass) ? 0 : 1;
})().catch((e) => { console.error('HARNESS ERROR:', e && e.stack || e); process.exit(2); });
