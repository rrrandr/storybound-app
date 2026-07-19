// $0 STORYBOARD v2 — visual SUBJECT selection: event dominance, establishing shots, convergence lint.
// The comic must SHOW events (the rift, the coral) not repeat face-offs; a recurring named antagonist
// gets a solo establishing shot (reader recognition + a clean casting frame). Runs against localhost:3000.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._buildStoryDirector === 'function' && typeof window._storyboardConvergenceLint === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    const s = window.state || (window.state = {});
    s.storyId = 'e2e-sbv2'; s._playerSpecies = 'human'; s._liSpecies = ''; s._openFateBargains = []; s._wishTwisted = true;
    const lines = [
      'The raider corners me in the flooded arch, spear raised.',
      '"Fate beneath the turning tide." Kresh voices the wish, tide-light gathering at her hand.',
      'Behind her the coral seam splits into a narrow passage.',
      'The coral grows, narrowing the passage by half.',
      'Her strength drains from the tentacles as the price is paid.',
      'Choose. The tide does not wait.'
    ];
    const plan = {
      visualState: { background: 'the drowned coral ruins', other_characters_present: [{ name: 'Kresh', species: 'kwisheen', position: 'a raider', role: 'antagonist' }] },
      phases: [{ phaseIdx: 0, startBeat: 0, label: 'x', characters_present: ['protagonist', 'Kresh'], props_present: [], li_visibility_phase: 'absent' }],
      beats: lines.map((t, i) => ({ idx: i, kind: 'narration', text: t }))
    };
    window._buildStoryDirector(plan, 0);
    const phases = plan.phases || [];
    const byType = t => phases.find(p => p._readerLearning === t);
    const panelOf = t => { const p = byType(t); return p && p._panel; };

    // ── EVENT DOMINANCE: on an event beat the panel's primary subject is the EVENT, not a character ──
    const rev = panelOf('Revelation'), cons = panelOf('Consequence');
    const revEventLed = !!(rev && rev.eventLed && rev.hierarchy && !/kresh|protagonist|mira/i.test(rev.hierarchy.primary) && /passage|seam|opening|rift/i.test(rev.hierarchy.primary));
    const consEventLed = !!(cons && cons.eventLed);
    const eventPrimaryNotCharacter = !!(rev && rev.hierarchy.primary !== 'Kresh' && rev.hierarchy.secondary);

    // ── ESTABLISHING SHOT: the antagonist gets an early solo panel, casting-eligible ──
    const est = phases.find(p => p._establishing);
    const hasEstablishing = !!est;
    const estIsAntagonistSolo = !!(est && est._panel && est._panel.establishing && /kresh/i.test(est._panel.hierarchy.primary) && !est._panel.hierarchy.secondary);
    const estCastingEligible = !!(est && est._panel && est._panel.castingEligible === true);
    const estNotEventBeat = !!(est && !/Revelation|Consequence|Transformation/.test(est._readerLearning));
    // the establishing panel is a CLEAN casting source (the gate accepts it)
    const estIsCleanSource = !!(est && window._castingCleanIdentitySource(est, 'Kresh') === true);

    // ── CONVERGENCE LINT ──
    const clRan = !!plan._storyboardConvergenceLint;
    // an event beat whose eye-magnet is people → flagged
    const badEvent = window._storyboardConvergenceLint([{ _readerLearning: 'Consequence', _storyboardDoc: { eyeMagnet: 'the two women talking' } }], false);
    const catchesEventNotShown = badEvent.warnings.some(w => /EVENT is not the visual subject/i.test(w));
    // 3 consecutive character-led panels → repetitive confrontation
    const repet = window._storyboardConvergenceLint([
      { _readerLearning: 'Threat', _storyboardDoc: { eyeMagnet: 'the two women' } },
      { _readerLearning: 'Threat', _storyboardDoc: { eyeMagnet: 'the two women' } },
      { _readerLearning: 'Decision', _storyboardDoc: { eyeMagnet: 'the two women' } }
    ], false);
    const catchesRepetition = repet.warnings.some(w => /REPETITIVE CONFRONTATION/i.test(w));
    // a named NPC with no establishing shot → flagged
    const noEst = window._storyboardConvergenceLint([{ _readerLearning: 'Threat', _storyboardDoc: { eyeMagnet: 'x' } }], true);
    const catchesNoEstablishing = noEst.warnings.some(w => /NO establishing shot/i.test(w));
    // no environment/event panel across a scene → flagged
    const noEnv = window._storyboardConvergenceLint([
      { _readerLearning: 'Orientation', _storyboardDoc: { eyeMagnet: 'the two women' } },
      { _readerLearning: 'Threat', _storyboardDoc: { eyeMagnet: 'the two women' } },
      { _readerLearning: 'Decision', _storyboardDoc: { eyeMagnet: 'the two women' } },
      { _readerLearning: 'Threat', _storyboardDoc: { eyeMagnet: 'the two women' } }
    ], false);
    const catchesNoEnv = noEnv.warnings.some(w => /no event\/environment-led panel/i.test(w));

    // ── HERO PROMPT: event-led emits PRIMARY VISUAL SUBJECT + skips the face-off blocking ──
    s._stagedRegionContract = window._buildStagedRegionContract({ visualState: plan.visualState, phases: [] });
    const revPhase = byType('Revelation');
    const revVS = window._resolvePhaseVisualState(plan.visualState, revPhase, plan.phases, plan.beats);
    const revHero = window._buildStagedHeroPrompt(revVS, 0, plan) || '';
    const heroEventSubject = /PRIMARY VISUAL SUBJECT \(HARD — the EVENT is the subject/.test(revHero);
    const heroSkipsFaceoffOnEvent = !/BLOCKING \(HARD — a CONFRONTATION/.test(revHero);
    // the establishing panel emits the ESTABLISHING SHOT directive
    const estVS = est ? window._resolvePhaseVisualState(plan.visualState, est, plan.phases, plan.beats) : null;
    const estHero = estVS ? (window._buildStagedHeroPrompt(estVS, 0, plan) || '') : '';
    const heroEstablishing = /CHARACTER INTRODUCTION \(HARD — this panel INTRODUCES/.test(estHero);

    return {
      revEventLed, consEventLed, eventPrimaryNotCharacter,
      hasEstablishing, estIsAntagonistSolo, estCastingEligible, estNotEventBeat, estIsCleanSource,
      clRan, catchesEventNotShown, catchesRepetition, catchesNoEstablishing, catchesNoEnv,
      heroEventSubject, heroSkipsFaceoffOnEvent, heroEstablishing,
      revPrimary: rev && rev.hierarchy && rev.hierarchy.primary, estPanel: est && est.phaseIdx
    };
  });

  await browser.close();

  const checks = [
    ['EVENT DOMINANCE: the Revelation panel\'s primary subject is the EVENT (the passage), not a character', R.revEventLed],
    ['EVENT DOMINANCE: the Consequence panel is event-led', R.consEventLed],
    ['EVENT DOMINANCE: the character is demoted to secondary on the event panel', R.eventPrimaryNotCharacter],
    ['ESTABLISHING: the antagonist gets an early establishing panel', R.hasEstablishing],
    ['ESTABLISHING: it is the antagonist ALONE (no competing second figure)', R.estIsAntagonistSolo],
    ['ESTABLISHING: the panel is casting-eligible', R.estCastingEligible],
    ['ESTABLISHING: it is a character-led beat, never an event beat', R.estNotEventBeat],
    ['ESTABLISHING: the casting gate ACCEPTS the establishing panel as a clean source', R.estIsCleanSource],
    ['CONVERGENCE LINT runs in the storyboard build', R.clRan],
    ['LINT: catches an event beat whose subject is people (event described, not shown)', R.catchesEventNotShown],
    ['LINT: catches 3+ consecutive character-led panels (repetitive confrontation)', R.catchesRepetition],
    ['LINT: catches a named character with no establishing shot', R.catchesNoEstablishing],
    ['LINT: catches an environment absent across the whole scene', R.catchesNoEnv],
    ['HERO PROMPT: an event panel emits PRIMARY VISUAL SUBJECT (the event dominates)', R.heroEventSubject],
    ['HERO PROMPT: an event panel SKIPS the face-off blocking directive', R.heroSkipsFaceoffOnEvent],
    ['HERO PROMPT: the establishing panel emits the CHARACTER INTRODUCTION directive', R.heroEstablishing]
  ];

  let pass = 0, fail = 0;
  console.log('\n  STORYBOARD v2 — visual subjects · event dominance · establishing shots  ($0)\n  ' + '─'.repeat(66));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · Revelation primary = "' + R.revPrimary + '"; establishing @ panel ' + R.estPanel);
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(66) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
