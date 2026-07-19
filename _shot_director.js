// $0 SHOT DIRECTOR — sequence of beats → sequence of SHOTS. Every panel gets an explicit camera
// (distance/angle/blocking/movement); deliberate rhythm, not diversity; DETERMINISTIC (same storyboard →
// same progression). Run-based sequence lint. Runs against localhost:3000, no paid calls.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._buildShotSequence === 'function' && typeof window._buildStoryDirector === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    const mk = phaseTypes => phaseTypes.map((t, i) => ({ _readerLearning: t, _panel: { hierarchy: { primary: t === 'Revelation' ? 'the rift' : t === 'Consequence' ? 'the coral' : 'Kresh' }, establishing: i === 0 && t !== 'Revelation', eventLed: /Revelation|Consequence/.test(t) } }));

    // the example arc: appears → rift opens → wish → coral grows → decision
    const phases = mk(['Orientation', 'Revelation', 'Transformation', 'Consequence', 'Decision']);
    const shots = window._buildShotSequence(phases);
    const everyPanelHasShot = shots.every(s => s.distance && s.angle && s.blocking && s.movement) && phases.every(p => p._panel.shot);

    // rhythm biases: Transformation closer, Consequence wider, Decision readable(closer), event-led → env/object
    const byType = t => shots[['Orientation', 'Revelation', 'Transformation', 'Consequence', 'Decision'].indexOf(t)];
    const transCloser = ['extreme_close', 'close', 'medium_close'].includes(byType('Transformation').distance);
    const consWider = ['wide', 'medium_wide', 'extreme_wide'].includes(byType('Consequence').distance);
    const decisionReadable = ['close', 'medium_close', 'medium'].includes(byType('Decision').distance);
    const eventLedBlocking = /environment_led|object_led/.test(byType('Revelation').blocking) && /environment_led|object_led/.test(byType('Consequence').blocking);
    // Revelation must differ from the previous panel's distance
    const revDiffers = byType('Revelation').distance !== byType('Orientation').distance;
    // subject change (Kresh → the rift) ⇒ camera moved
    const subjChangeMovedCamera = !(byType('Orientation').distance === byType('Revelation').distance && byType('Orientation').angle === byType('Revelation').angle);

    // DETERMINISM — same storyboard → identical shot progression (a visual language, not a roulette wheel)
    const shots2 = window._buildShotSequence(mk(['Orientation', 'Revelation', 'Transformation', 'Consequence', 'Decision']));
    const deterministic = JSON.stringify(shots) === JSON.stringify(shots2.map(s => s));

    // SEQUENCE LINT — compares RUNS, not just adjacent
    const mono = [
      { distance: 'medium', angle: 'eye_level', blocking: 'two_shot', subject: 'a' },
      { distance: 'medium', angle: 'eye_level', blocking: 'two_shot', subject: 'a' },
      { distance: 'medium', angle: 'eye_level', blocking: 'two_shot', subject: 'a' }
    ];
    const monoLint = window._shotSequenceLint(mono);
    const catchesDistRun = monoLint.warnings.some(w => /consecutive same-distance/i.test(w));
    const catchesBlkRun = monoLint.warnings.some(w => /consecutive same-blocking/i.test(w));
    const eyeRun = window._shotSequenceLint([0, 1, 2, 3].map(() => ({ distance: 'medium', angle: 'eye_level', blocking: 'single', subject: 'a' })));
    const catchesAngleRun = eyeRun.warnings.some(w => /consecutive same-angle/i.test(w));
    const charRun = window._shotSequenceLint([{ blocking: 'single' }, { blocking: 'two_shot' }, { blocking: 'single' }, { blocking: 'two_shot' }].map((x, i) => ({ distance: 'd' + i, angle: 'a' + i, blocking: x.blocking, subject: 's' + i })));
    const catchesCharLedRun = charRun.warnings.some(w => /consecutive character-led/i.test(w));
    // subject changed but camera identical → flagged
    const subjSame = window._shotSequenceLint([{ distance: 'medium', angle: 'eye_level', blocking: 'single', subject: 'Kresh' }, { distance: 'medium', angle: 'eye_level', blocking: 'object_led', subject: 'the rift' }]);
    const catchesSubjNoCamera = subjSame.warnings.some(w => /subject changed.*but the camera did not/i.test(w));

    // the real varied arc should lint CLEAN (the director created rhythm)
    const cleanLint = window._shotSequenceLint(shots);
    const realArcClean = cleanLint.warnings.length === 0;

    // DIVERSITY SCORE
    const score = window._shotDiversityScore(shots);
    const scoreOk = score && typeof score.overall === 'number' && score.distance > 0 && score.angle > 0;

    // INTEGRATION: the Story Director attaches a shot sequence + lint + score; the hero prompt emits CAMERA
    const s = window.state || (window.state = {});
    s.storyId = 'e2e-shot'; s._playerSpecies = 'human'; s._liSpecies = ''; s._openFateBargains = [];
    const plan = {
      visualState: { background: 'coral ruins', other_characters_present: [{ name: 'Kresh', species: 'kwisheen', position: 'a raider', role: 'antagonist' }] },
      phases: [{ phaseIdx: 0, startBeat: 0, label: 'x', characters_present: ['protagonist', 'Kresh'], props_present: [], li_visibility_phase: 'absent' }],
      beats: [
        { idx: 0, kind: 'narration', text: 'The raider corners me.' },
        { idx: 1, kind: 'narration', text: 'Behind her the coral seam splits into a passage.' },
        { idx: 2, kind: 'narration', text: '"Fate beneath the turning tide." She voices the wish.' },
        { idx: 3, kind: 'narration', text: 'The coral grows, narrowing the passage.' },
        { idx: 4, kind: 'narration', text: 'Choose.' }
      ]
    };
    window._buildStoryDirector(plan, 0);
    const seqAttached = Array.isArray(plan._shotSequence) && plan._shotSequence.length >= 3 && !!plan._shotSequenceLint && !!plan._shotDiversity;
    const scorecardHasRhythm = plan._qualityScorecard && ('shotRhythm' in plan._qualityScorecard.dimensions);
    const revPhase = (plan.phases || []).find(p => p._readerLearning === 'Revelation') || plan.phases[1];
    const rvs = window._resolvePhaseVisualState(plan.visualState, revPhase, plan.phases, plan.beats);
    s._stagedRegionContract = window._buildStagedRegionContract({ visualState: plan.visualState, phases: [] });
    const hero = window._buildStagedHeroPrompt(rvs, 0, plan) || '';
    const heroEmitsCamera = /CAMERA \(HARD — this panel's place in the shot rhythm/.test(hero);

    return { everyPanelHasShot, transCloser, consWider, decisionReadable, eventLedBlocking, revDiffers, subjChangeMovedCamera, deterministic,
      catchesDistRun, catchesBlkRun, catchesAngleRun, catchesCharLedRun, catchesSubjNoCamera, realArcClean, scoreOk, seqAttached, scorecardHasRhythm, heroEmitsCamera,
      progression: shots.map(s => s.distance + '/' + s.angle + '/' + s.blocking) };
  });

  await browser.close();

  const checks = [
    ['every panel gets an explicit shot (distance/angle/blocking/movement)', R.everyPanelHasShot],
    ['RHYTHM: Transformation biases CLOSER', R.transCloser],
    ['RHYTHM: Consequence biases WIDER (see what changed)', R.consWider],
    ['RHYTHM: Decision biases readable (closer)', R.decisionReadable],
    ['RHYTHM: event-led beats are environment/object-led blocking', R.eventLedBlocking],
    ['RULE: Revelation cannot reuse the previous panel\'s distance', R.revDiffers],
    ['RULE: a subject change moves the camera (distance or angle)', R.subjChangeMovedCamera],
    ['DETERMINISTIC: same storyboard → identical shot progression (not random)', R.deterministic],
    ['LINT: 3 consecutive same-distance shots → fail', R.catchesDistRun],
    ['LINT: 3 consecutive same-blocking shots → fail', R.catchesBlkRun],
    ['LINT: 4 consecutive same-angle shots → fail', R.catchesAngleRun],
    ['LINT: 4 consecutive character-led shots → fail', R.catchesCharLedRun],
    ['LINT: subject changed but camera identical → fail', R.catchesSubjNoCamera],
    ['the director\'s own varied arc lints CLEAN (rhythm, not monotony)', R.realArcClean],
    ['DIVERSITY SCORE per dimension + overall', R.scoreOk],
    ['INTEGRATION: Story Director attaches sequence + lint + score', R.seqAttached],
    ['INTEGRATION: the scorecard carries a shotRhythm dimension', R.scorecardHasRhythm],
    ['INTEGRATION: the hero prompt emits the CAMERA directive', R.heroEmitsCamera]
  ];

  let pass = 0, fail = 0;
  console.log('\n  SHOT DIRECTOR — sequence of beats → sequence of shots  ($0)\n  ' + '─'.repeat(60));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · progression: ' + R.progression.join('  →  '));
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(60) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
