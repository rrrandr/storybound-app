// FREE headless validation of the event-driven axis scheduler — NO story-gen, NO API calls.
// Loads the app, sets window.state fields directly, and calls the REAL window-exposed scheduler
// functions, asserting the resolved schedule + firing predicates + invariant guards.
const { chromium } = require('playwright-core');

const CASES = [
  // name, setup {hotFast, cg, desire(0-based turnCount|null), convo(0-based|null)}, expected {demand,grFirst,reverie,intensity, recur:[...]}
  { name: 'NORMAL desire@S2',        s: { hotFast: false, cg: false, desire: 1, convo: 1 }, e: { demand: 1, grFirst: 2, reverie: 3, intensity: 4, recur: [9, 16, 23] } },
  { name: 'HOT&FAST desire@S2 (slid)', s: { hotFast: true,  cg: false, desire: 1, convo: 1 }, e: { demand: 2, grFirst: 3, reverie: 4, intensity: 5, recur: [10, 17, 24] } },
  { name: 'LATE desire@S4',          s: { hotFast: false, cg: false, desire: 3, convo: 3 }, e: { demand: 1, grFirst: 4, reverie: 5, intensity: 6, recur: [11, 18, 25] } },
  { name: 'DEFERRED LI (no desire)', s: { hotFast: false, cg: false, desire: null, convo: null }, e: { demand: 1, grFirst: null, reverie: null, intensity: null, recur: [] } },
  { name: 'INTENSITY convo@S1 slides', s: { hotFast: false, cg: false, desire: 1, convo: 0 }, e: { demand: 1, grFirst: 2, reverie: 3, intensity: 4, recur: [9, 16, 23] } },
  // CG branch: set ONLY the CG desire field (_cgFirstLIDesireScene); lit field null. If the resolver reads
  // the CG field, GR resolves to S3 (desire@S2 slid? no — demand@1 so GR@2). Uses cgOnly flag below.
  { name: 'CG desire@S2 (CG field only)', s: { hotFast: false, cg: true, desire: 1, convo: 1, cgOnly: true }, e: { demand: 1, grFirst: 2, reverie: 3, intensity: 4, recur: [9, 16, 23] } },
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  const errs = [];
  page.on('console', m => { const t = m.text(); if (/\[AXIS:SCHEDULE:ERROR\]/.test(t)) errs.push(t.slice(0, 160)); });
  for (const p of ['**/api/**']) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._axisSchedule === 'function' && typeof window._isAxisProbeScene === 'function', { timeout: 40000 });

  let pass = 0, fail = 0;
  for (const c of CASES) {
    errs.length = 0;
    const got = await page.evaluate((cs) => {
      var s = window.state;
      // reset schedule-relevant state
      window.__hotFast = cs.hotFast;
      try { s._hotFastMode = cs.hotFast; } catch (_) {}
      s.renderMode = cs.cg ? 'graphic' : 'literary';
      s.currentEngine = cs.cg ? 'graphic' : 'literary';
      s.storyModality = cs.cg ? 'graphic' : 'literary';
      s.contentMode = 'steamy';
      s._liDesireIntroScene = cs.cgOnly ? null : cs.desire;   // cgOnly → prove the resolver reads the CG field
      s._cgFirstLIDesireScene = cs.desire;
      s._liFirstConvoScene = cs.convo;
      s._axisSchedSig = null;
      var sch = window._axisSchedule();
      // build recurrence list from the FIRING predicate (the real regression check)
      var recur = [];
      if (sch.grFirst != null) { for (var n = sch.grFirst + 1; n <= sch.grFirst + 30; n++) { if (window._isAxisProbeScene(n - 1)) recur.push(n); } }
      // predicate agreement at the key scenes
      var agree = {
        grFires: sch.grFirst == null ? null : window._isAxisProbeScene(sch.grFirst - 1),
        reverieFires: sch.reverie == null ? null : window._isReverieProbeScene(sch.reverie - 1),
        intensityFires: sch.intensity == null ? null : window._isIntensityProbeScene(sch.intensity - 1),
        demandNotGrAt1: window._isReverieProbeScene(0) === false, // reverie never at scene 1
      };
      // force the diagnostic to run (its own invariant checks emit [AXIS:SCHEDULE:ERROR] if broken)
      s._axisSchedSig = null;
      window._axisScheduleReport('harness');
      return { sch: sch, recur: recur, agree: agree };
    }, c.s);

    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    const schOk = got.sch.demand === c.e.demand && got.sch.grFirst === c.e.grFirst && got.sch.reverie === c.e.reverie && got.sch.intensity === c.e.intensity;
    const recurOk = eq(got.recur.slice(0, c.e.recur.length), c.e.recur);
    const agreeOk = (got.agree.grFires !== false) && (got.agree.reverieFires !== false) && (got.agree.intensityFires !== false) && got.agree.demandNotGrAt1 === true;
    const noErr = errs.length === 0;
    const ok = schOk && recurOk && agreeOk && noErr;
    if (ok) pass++; else fail++;
    console.log((ok ? '✓ ' : '✗ ') + c.name);
    console.log('    got: demand=S' + got.sch.demand + ' gr=' + (got.sch.grFirst ? 'S' + got.sch.grFirst : 'null') + ' reverie=' + (got.sch.reverie ? 'S' + got.sch.reverie : 'null') + ' intensity=' + (got.sch.intensity ? 'S' + got.sch.intensity : 'null') + ' recur=[' + got.recur.join(',') + ']');
    if (!schOk) console.log('    ✗ schedule mismatch — expected demand=S' + c.e.demand + ' gr=' + c.e.grFirst + ' reverie=' + c.e.reverie + ' intensity=' + c.e.intensity);
    if (!recurOk) console.log('    ✗ recurrence (firing-predicate) mismatch — expected [' + c.e.recur.join(',') + ']');
    if (!agreeOk) console.log('    ✗ firing-predicate disagreement: ' + JSON.stringify(got.agree));
    if (!noErr) console.log('    ✗ [AXIS:SCHEDULE:ERROR] emitted: ' + JSON.stringify(errs));
  }
  await browser.close();
  console.log('\n═══ AXIS SCHEDULER HEADLESS: ' + pass + '/' + (pass + fail) + ' passed ═══');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('DRIVER-ERR', e.message); process.exit(2); });
