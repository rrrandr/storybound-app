// Guard: ordinary-wish rail wired into the CG (screenplay) turn path. Loads the live app and calls
// window._buildCGScreenplayUserPrompt in a CG-mode Fatelands state, asserting the wish resolves ONCE
// (durable + ledger grow), is idempotent on a repeat call in the same turn, and is gated (non-Fatelands
// / petition / tempt do not fire). Asserts on STATE EFFECTS (mutated early in the wish block) so a later
// CG-context throw in the big prompt builder can't produce a false negative.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._buildCGScreenplayUserPrompt === 'function' && typeof window._resolveOrdinaryWish === 'function', { timeout: 45000 });

  const R = await page.evaluate(() => {
    const out = { fails: [] };
    const A = (c, m) => { if (!c) out.fails.push(m); };
    const s = window.state;
    const reset = (world) => {
      Object.assign(s, { world: world, turnCount: 0, fantasyRegion: 'the_shackle_isles', renderMode: 'cg', storyModality: 'cg' });
      s.picks = Object.assign(s.picks || {}, { world: world });
      s._openFateBargains = []; s._durableFateConsequences = []; s._fateTollLedger = []; s._obligationLedger = [];
      s.tempt_fate_invoked_this_turn = false; s.fate = { pendingPetition: null };
      s._cgOrdinaryWishTurn = null; s._cgOrdinaryWishDirective = null;
    };
    const callCG = (act, dia) => { try { return window._buildCGScreenplayUserPrompt(0, act, dia) || ''; } catch (e) { return '__THREW__:' + e.message; } };
    const durN = () => (s._durableFateConsequences || []).length;
    const ledN = () => (s._fateTollLedger || []).length;

    // (1) CG Fatelands wish → resolves ONCE (durable + ledger grow, directive stashed)
    reset('Fantasy');
    const p1 = callCG('Fate, close her wound. Take what it costs.', '');
    A(durN() >= 1, 'CG wish: no durable consequence recorded (rail not firing in CG)');
    A(ledN() >= 1 && (s._fateTollLedger.slice(-1)[0] || {}).kind === 'bargain_receipt', 'CG wish: no ledger receipt');
    A(s._cgOrdinaryWishTurn != null, 'CG wish: idempotency key not set');
    A(/ORDINARY FATE-WISH|SCENE-OPENING CONTRACT|GOVERNING DESIRE/.test(s._cgOrdinaryWishDirective || p1), 'CG wish: ordinary-wish directive not produced/stashed');

    // (2) idempotent — a SECOND call in the same turn must NOT re-mutate
    const durAfter1 = durN(), ledAfter1 = ledN();
    callCG('Fate, close her wound. Take what it costs.', '');
    A(durN() === durAfter1 && ledN() === ledAfter1, 'CG wish: repeat call in same turn re-mutated state (not idempotent)');

    // (3) gate — non-Fatelands world does NOT fire
    reset('Contemporary');
    callCG('Fate, close her wound. Take what it costs.', '');
    A(durN() === 0 && ledN() === 0, 'CG wish: fired in a non-Fatelands world (should be gated)');

    // (4) gate — a tempt turn does NOT fire the ordinary rail
    reset('Fantasy'); s.tempt_fate_invoked_this_turn = true;
    callCG('Fate, close her wound. Take what it costs.', '');
    A(durN() === 0, 'CG wish: fired on a Tempt turn (should stand down)');

    // (5) gate — a pending petition turn does NOT fire
    reset('Fantasy'); s.fate = { pendingPetition: { text: 'x', accepted: null } };
    callCG('Fate, close her wound. Take what it costs.', '');
    A(durN() === 0, 'CG wish: fired on a pending-petition turn (should stand down)');

    // (6) field-aware in CG too — a bare wish in the ACTION field does NOT fire (needs externalization)
    reset('Fantasy');
    callCG('I wish he would love me', '');   // bare Do wish, unexpressed
    A(durN() === 0, 'CG wish: bare unexpressed Do wish fired (field-awareness lost in CG path)');
    // …but the same wish SPOKEN (dia) fires
    reset('Fantasy');
    callCG('I turn to him', 'I wish he would love me');
    A(durN() >= 1, 'CG wish: spoken Say wish did NOT fire in CG');

    return out;
  });

  if (R.fails.length) { console.error('FAIL:\n - ' + R.fails.join('\n - ')); await browser.close(); process.exit(1); }
  console.log('PASS: ordinary-wish rail fires in the CG screenplay path (resolves once, durable + ledger + directive), idempotent on repeat calls, gated to Fatelands + ordinary turns, and field-aware (bare Do wish inert, spoken Say wish fires).');
  await browser.close();
})().catch(e => { console.error('GUARD FATAL', e && e.message); process.exit(1); });
