// Deterministic (no-LLM) validation of the FF act→issue wiring — independent of the flaky canon-beat
// classifier. Stubs a split canon ledger + cursor and exercises the state machine directly.
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await p.waitForFunction(() => window.state && typeof window._ffAtActBoundary === 'function'
    && typeof window._ffAdvanceToNextAct === 'function' && typeof window._ffIsFinalAct === 'function', { timeout: 40000 });

  const r = await p.evaluate(() => {
    const s = window.state;
    const out = { steps: [] };
    const rec = (name, got, want) => out.steps.push({ name, got, want, pass: JSON.stringify(got) === JSON.stringify(want) });

    // Stub a split canon (13 beats, acts end at 3/9/13) at the Act-1 end, act 1 just completed.
    s.fateMode = 'famous_fate';
    s.famousFate = { period: 'canon' };
    s.ffContract = { canonActSplit: true, canonAct: 1, canonNumActs: 3,
      canonActBounds: { 1: 3, 2: 9, 3: 13 },
      canonBeatLedger: Array.from({ length: 13 }, (_, i) => ({ beatIndex: i + 1, act: i < 3 ? 1 : i < 9 ? 2 : 3, momentum: 'world_parallel' })) };
    s._ffCanonBeatIndex = 3;
    s._ffCanonActComplete = true;      // act 1's last beat resolved
    s._ffCanonFollowingCanon = true;
    s.issueIndexInRun = 1;

    rec('at Act-1 boundary', window._ffAtActBoundary(), true);
    rec('act 1 is NOT final act', window._ffIsFinalAct(), false);

    // Advance to Act 2 (what the continue path calls).
    const adv1 = window._ffAdvanceToNextAct();
    rec('advance→act2 returns true', adv1, true);
    rec('canonAct is 2', s.ffContract.canonAct, 2);
    rec('beat cursor → act-2 start (4)', s._ffCanonBeatIndex, 4);
    rec('actComplete cleared', s._ffCanonActComplete, false);
    rec('boundary cleared after advance', window._ffAtActBoundary(), false);
    rec('act 2 is NOT final act', window._ffIsFinalAct(), false);

    // Simulate Act 2 completing (cursor past beat 9).
    s._ffCanonActComplete = true;
    rec('at Act-2 boundary', window._ffAtActBoundary(), true);
    const adv2 = window._ffAdvanceToNextAct();
    rec('advance→act3 returns true', adv2, true);
    rec('canonAct is 3', s.ffContract.canonAct, 3);
    rec('beat cursor → act-3 start (10)', s._ffCanonBeatIndex, 10);
    rec('act 3 IS final act', window._ffIsFinalAct(), true);

    // Final act: boundary must NOT fire (it's the story finale, not a cliffhanger), and no further advance.
    s._ffCanonActComplete = true;
    rec('final act does NOT trip cliffhanger boundary', (window._ffAtActBoundary() && !window._ffIsFinalAct()), false);
    rec('advance past final act returns false', window._ffAdvanceToNextAct(), false);

    // Small (non-split) canon → mapping is a total no-op.
    s.ffContract.canonActSplit = false;
    rec('non-split canon: no boundary', window._ffAtActBoundary(), false);

    return out;
  });

  const pass = r.steps.filter(s => s.pass).length, total = r.steps.length;
  r.steps.forEach(s => console.log(`  ${s.pass ? '✓' : '✗ FAIL'}  ${s.name}` + (s.pass ? '' : `  got=${JSON.stringify(s.got)} want=${JSON.stringify(s.want)}`)));
  console.log(`\nRESULT: ${pass}/${total} ${pass === total ? '✓ ALL PASS' : '✗ FAILURES'}`);
  await b.close();
  process.exit(pass === total ? 0 : 1);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
