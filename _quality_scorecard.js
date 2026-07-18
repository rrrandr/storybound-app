// $0 QUALITY SCORECARD — aggregate the deterministic per-stage lints into a per-regen quality number
// so regressions become visible. PRE-RENDER (directive-quality) only; post-render dims stay null
// (they require the blind/vision eval and are never faked). Runs against localhost:3000, no paid calls.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._buildQualityScorecard === 'function' && typeof window._buildStoryDirector === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    const s = window.state || (window.state = {});
    s.storyId = 'e2e-score'; s._playerSpecies = 'human'; s._liSpecies = ''; s.gender = 'Female';
    const lines = [
      "The raider's spear cuts through the current toward my throat.",
      'I twist aside and spot the narrow coral fissure behind the collapsed arch.',
      '"Fate beneath the turning tide." He voices the wish, tide-light gathering.',
      'The water warms and his strength drains as the basin seals.',
      'Behind him the coral seam splits into a passage.',
      'His eyes meet mine and I must choose.'
    ];
    const plan = {
      visualState: { background: 'the drowned coral ruins', other_characters_present: [{ name: 'Kesh', species: 'kwisheen', position: 'a raider', gender: 'male' }] },
      phases: [{ phaseIdx: 0, startBeat: 0, label: 'x', characters_present: ['protagonist', 'Kesh'], props_present: [], li_visibility_phase: 'absent' }],
      beats: lines.map((t, i) => ({ idx: i, kind: 'narration', text: t }))
    };
    window._buildStoryDirector(plan, 0);
    const sc = plan._qualityScorecard;

    const scorecardExists = !!sc;
    const hasAllDims = sc && ['storyboard', 'emotion', 'graphicLanguage', 'visualPolish', 'continuity', 'coverage', 'identityDirective'].every(k => k in sc.dimensions);
    const overallIsNumber = sc && typeof sc.overall === 'number' && sc.overall >= 0 && sc.overall <= 100;
    const wellDirectedScoresHigh = sc && sc.overall >= 80; // a clean, well-directed plan
    // POST-RENDER dims are null — NOT faked from a lint
    const postRenderNull = sc && sc.postRender && sc.postRender.identity === null && sc.postRender.emotionLanding === null && sc.postRender.typographyQuality === null;
    // the storytelling rubric (regen13 blind-review gap) exists as post-render dims, all null
    const storytellingRubric = sc && sc.postRender && ('characterFidelity' in sc.postRender) && ('narrativeProgression' in sc.postRender) && ('visualProseAlignment' in sc.postRender)
      && sc.postRender.characterFidelity === null && sc.postRender.narrativeProgression === null && sc.postRender.visualProseAlignment === null;
    // narrative-progression PROXY is a deterministic plan-level dimension
    const progressionProxy = sc && typeof sc.dimensions.narrativeProgression === 'number';
    // identity directive = 100 because morphology is pinned (Kesh gender pinned male)
    const identityDirective100 = sc && sc.dimensions.identityDirective === 100;
    // emotion reflects a real arc (intensity spread across the storyboard)
    const emotionScored = sc && typeof sc.dimensions.emotion === 'number' && sc.dimensions.emotion >= 60;
    // coverage reflects the understanding types present
    const coverageScored = sc && typeof sc.dimensions.coverage === 'number' && sc.dimensions.coverage >= 60;

    // ── a continuity ERROR drops the continuity dimension (and the overall) ──
    const cleanContinuity = window._buildQualityScorecard({ _canon: {}, _continuityLint: { errors: [], warnings: [] } }).dimensions.continuity;
    const brokenContinuity = window._buildQualityScorecard({ _canon: {}, _continuityLint: { errors: ['wound vanished'], warnings: [] } }).dimensions.continuity;
    const continuityPenalized = cleanContinuity === 100 && brokenContinuity < 80;

    // ── warnings weigh less than errors ──
    const warnOnly = window._buildQualityScorecard({ _canon: {}, _visualPolishLint: { warnings: ['no visual question'] } }).dimensions.visualPolish;
    const warnLighter = warnOnly < 100 && warnOnly > brokenContinuity;

    // ── an empty plan yields null dims rather than fake numbers ──
    const empty = window._buildQualityScorecard({});
    const emptyEmotionNull = empty.dimensions.emotion === null && empty.dimensions.coverage === null;

    return {
      scorecardExists, hasAllDims, overallIsNumber, wellDirectedScoresHigh, postRenderNull,
      identityDirective100, emotionScored, coverageScored, continuityPenalized, warnLighter, emptyEmotionNull,
      storytellingRubric, progressionProxy,
      overall: sc && sc.overall, dims: sc && sc.dimensions
    };
  });

  await browser.close();

  const checks = [
    ['a scorecard is attached to every plan', R.scorecardExists],
    ['it has all pre-render dimensions', R.hasAllDims],
    ['overall is a 0–100 number', R.overallIsNumber],
    ['a clean, well-directed plan scores high (≥80)', R.wellDirectedScoresHigh],
    ['POST-RENDER dims (identity/emotion-landing/typography) are null, not faked', R.postRenderNull],
    ['identity-directive = 100 when morphology is pinned', R.identityDirective100],
    ['emotion dimension reflects the directed arc', R.emotionScored],
    ['coverage dimension reflects the understanding types', R.coverageScored],
    ['a continuity ERROR penalizes the continuity dimension', R.continuityPenalized],
    ['warnings weigh less than errors', R.warnLighter],
    ['an empty plan yields null dims, never fake numbers', R.emptyEmotionNull],
    ['STORYTELLING RUBRIC: character-fidelity / narrative-progression / visual-prose-alignment exist (post-render, null)', R.storytellingRubric],
    ['narrative-progression PROXY is a deterministic plan-level dimension', R.progressionProxy]
  ];

  let pass = 0, fail = 0;
  console.log('\n  QUALITY SCORECARD — measuring the pipeline, not adding to it  ($0)\n  ' + '─'.repeat(62));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · overall=' + R.overall + '  dims=' + JSON.stringify(R.dims));
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(62) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
