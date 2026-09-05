// $0 LOGIC PROBE — routing layer: _routeRepairStrategy + _buildRegenFeedback + _structuralRegenLoop.
// Injected generate/verify thunks — NO API, NO image gen.
const { chromium } = require('playwright-core');
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._routeRepairStrategy === 'function' && typeof window._structuralRegenLoop === 'function', { timeout: 40000 });

  const out = await page.evaluate(async () => {
    const R = {}, route = window._routeRepairStrategy, fb = window._buildRegenFeedback, loop = window._structuralRegenLoop;
    // ── router ──
    R.body_plan   = route('body_plan', {});
    R.species     = route('species_anatomy', {});
    R.gender      = route('gender', {});
    R.extraPerson = route('extra_person', {});
    R.weapon      = route('weapon', {});
    R.wardrobe    = route('wardrobe', {});
    R.face        = route('kwisheen_face', {});
    R.extraHand   = route('extra_hand', {});
    R.eye         = route('eye_color', {});
    R.p3          = route('body_plan', { priority: 3 });        // P3 overrides → report
    R.unknown     = route('mystery_defect', {});
    // colorization-contract branch (final structural defect not in sketch, sketch approved → recolorize)
    R.recolorize  = route('body_plan', { stage: 'final', wasInSketch: false, hasApprovedSketch: true });
    R.survivedSketch = route('body_plan', { stage: 'final', wasInSketch: true, hasApprovedSketch: true }); // real → regenerate

    // ── feedback builder ──
    R.fb_reason = fb([{ reason: 'Human legs were drawn; canon requires a tentacle mantle.' }]).includes('tentacle mantle');
    R.fb_dedupe = (function () {
      const s = fb([{ reason: 'X' }, { reason: 'X' }, { reason: 'Y' }]);
      return (s.match(/• /g) || []).length === 2; // deduped to 2 bullets
    })();
    R.fb_empty = fb([]) === '';

    // ── bounded loop: resolves on attempt 2 ──
    let g1 = 0;
    const r1 = await loop({ maxAttempts: 3,
      generate: async () => { g1++; return 'url' + g1; },
      verify: async (u) => g1 >= 2 ? { pass: true } : { pass: false, reason: 'legs', violations: ['legs'] } });
    R.loop_resolved = r1.resolved === true && r1.attempts === 2;

    // ── bounded loop: never resolves → ceiling, accumulates ──
    let feedbacks = [];
    const r2 = await loop({ maxAttempts: 3,
      generate: async (f) => { feedbacks.push(f); return 'u'; },
      verify: async () => ({ pass: false, reason: 'legs', defect_type: 'body_plan', violations: ['legs'] }) });
    R.loop_ceiling = r2.resolved === false && r2.attempts === 3;
    R.loop_accumulates = feedbacks.length === 3 && feedbacks[0] === '' && feedbacks[2].includes('legs'); // attempt1 no feedback; later carry it
    return R;
  });

  const P = (n, c) => console.log((c ? '  PASS ' : '  FAIL ') + n + (c ? '' : '  (got: ' + JSON.stringify(out[n]) + ')'));
  console.log('── router (strategy decoupled from defect_type) ──');
  P('body_plan', out.body_plan === 'regenerate'); P('species', out.species === 'regenerate');
  P('gender', out.gender === 'regenerate'); P('extraPerson', out.extraPerson === 'regenerate');
  P('weapon', out.weapon === 'klein'); P('wardrobe', out.wardrobe === 'klein');
  P('face', out.face === 'klein'); P('extraHand', out.extraHand === 'klein'); P('eye', out.eye === 'klein');
  P('p3', out.p3 === 'report'); P('unknown', out.unknown === 'report');
  P('recolorize (final structural not-in-sketch)', out.recolorize === 'recolorize');
  P('survivedSketch → regenerate', out.survivedSketch === 'regenerate');
  console.log('── feedback builder (verifier-as-teacher) ──');
  P('fb uses reason', out.fb_reason); P('fb dedupes', out.fb_dedupe); P('fb empty on none', out.fb_empty);
  console.log('── bounded regen loop (ceiling + accumulate) ──');
  P('resolves early (attempt 2)', out.loop_resolved);
  P('hits ceiling at 3', out.loop_ceiling); P('accumulates feedback across retries', out.loop_accumulates);
  await browser.close();
})().catch(e => { console.error('ERR', e); process.exit(2); });
