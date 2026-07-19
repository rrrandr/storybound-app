// $0 WORLD-STATE AUTHORITY — the AUTHORITATIVE wish outcome (mechanic/flag, NOT the beat-text heuristic) is
// exposed to the prose author so the aftermath prose can't diverge from the visual burst. Runs vs localhost:3000.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._worldStateWishOutcome === 'function' && typeof window._sdWishOutcome === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    const s = window.state || (window.state = {});
    const reset = () => { s._openFateBargains = []; delete s._wishTwisted; delete s._wishRejected; delete s._wishOutcome; };

    // no predetermined outcome → null (author is free; visual follows prose)
    reset();
    const noneNull = window._worldStateWishOutcome() === null;

    // a forced flag → authoritative twisted
    reset(); s._wishTwisted = true;
    const flagTwisted = (window._worldStateWishOutcome() || {}).outcome === 'twisted';
    // and _sdWishOutcome (the VISUAL) reads the SAME source → they agree (single source of truth)
    const visualAgrees = window._sdWishOutcome('the wish is granted cleanly, all is well', {}, {}) === 'twisted';

    // an explicit outcome flag
    reset(); s._wishOutcome = 'rejected';
    const flagRejected = (window._worldStateWishOutcome() || {}).outcome === 'rejected';

    // a resolved Fate bargain (mechanic) → authoritative, source=mechanic
    reset(); s._openFateBargains = [{ id: 'b1', lastOutcome: 'warped', lastInvokedScene: 1 }];
    const mech = window._worldStateWishOutcome();
    const mechTwisted = mech && mech.outcome === 'twisted' && mech.source === 'mechanic';

    // an OPEN bargain (unresolved) is NOT authoritative → null (author still free)
    reset(); s._openFateBargains = [{ id: 'b2', status: 'open', lastInvokedScene: 1 }];
    const openNull = window._worldStateWishOutcome() === null;

    // the beat-text heuristic must NOT leak into World-State Authority (only mechanic/flag are authoritative)
    reset();
    const heuristicExcluded = window._worldStateWishOutcome() === null && window._sdWishOutcome('the wish curdled and turned cruel', {}, {}) === 'twisted';

    reset();
    return { noneNull, flagTwisted, visualAgrees, flagRejected, mechTwisted, openNull, heuristicExcluded };
  });

  await browser.close();

  const checks = [
    ['no predetermined outcome → null (author free; visual follows prose)', R.noneNull],
    ['a forced flag → authoritative TWISTED for the author', R.flagTwisted],
    ['SINGLE SOURCE OF TRUTH: the visual resolver reads the same flag → agrees (twisted)', R.visualAgrees],
    ['an explicit outcome flag → authoritative (rejected)', R.flagRejected],
    ['a RESOLVED Fate bargain → authoritative, source=mechanic', R.mechTwisted],
    ['an OPEN (unresolved) bargain → null (not yet authoritative)', R.openNull],
    ['the beat-text HEURISTIC does NOT leak into World-State Authority (mechanic/flag only)', R.heuristicExcluded]
  ];

  let pass = 0, fail = 0;
  console.log('\n  WORLD-STATE AUTHORITY — authoritative wish outcome → author  ($0)\n  ' + '─'.repeat(60));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(60) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
