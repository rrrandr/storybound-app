// $0 COMIC GRAPHIC LANGUAGE v1 — the visual vocabulary unique to comics (speed / force /
// focus / tension / energy / emotional amplification), as renderer-agnostic semantic intent.
// Proves: the storyboard emits a controlled vocabulary that VARIES by beat, event cues override
// the type baseline, emotional apex scales MAGNITUDE not selection, the translator produces
// render direction, and the lint catches missing/monotone/conflicting graphic language.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._buildGraphicLanguage === 'function' && typeof window._buildStoryDirector === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    const s = window.state || (window.state = {});
    const GL = (type, apex, text, eye) => window._buildGraphicLanguage(type, apex, text, eye);

    // ── vocabulary VARIES by reader-learning type (selection, not just magnitude) ──
    const threat = GL('Threat', 'HIGH', 'the raider closes in', 'the spear');
    const conseq = GL('Consequence', 'HIGH', 'the basin seals', 'the sealed basin');
    const trans = GL('Transformation', 'MAXIMUM', 'he voices the wish', 'the gathering tide-light');
    const rev = GL('Revelation', 'HIGH', 'a passage', 'the passage');
    const decis = GL('Decision', 'HIGH', 'choose', 'the two paths');
    const orient = GL('Orientation', 'MEDIUM', 'the drowned ruins', 'the ruins');

    const threatIsMotion = !!(threat.motion && threat.motion.level === 'heavy');
    const conseqIsImpact = !!(conseq.impact && conseq.impact.level === 'heavy');
    const transIsEnergy = !!(trans.energy && ['high', 'heavy'].includes(trans.energy.level) && trans.tension);
    const revIsFocus = !!(rev.focus && rev.focus.level === 'heavy');
    const decisIsEmphasis = !!(decis.emphasis && decis.emphasis.level === 'heavy');
    const orientIsQuiet = !!(orient.energy && orient.energy.level === 'low' && !orient.motion && !orient.impact);
    // categories differ across types → not one treatment for everything
    const dom = g => window._graphicLanguageToPrompt(g); // reuse for smoke below
    const domCat = g => { let k = null, i = -1; Object.keys(g).forEach(c => { const idx = ['none','low','medium','high','heavy'].indexOf(g[c].level); if (idx > i) { i = idx; k = c; } }); return k; };
    const dominants = [domCat(threat), domCat(conseq), domCat(trans), domCat(rev), domCat(decis)];
    const dominantsVary = new Set(dominants).size >= 4;

    // ── event cues OVERRIDE the type baseline (a spear thrust needs motion even off-type) ──
    const thrustInConvo = GL('Orientation', 'MEDIUM', 'the raider\'s spear cuts through the current toward my throat', 'the spear');
    const cueAddsMotion = !!(thrustInConvo.motion && thrustInConvo.motion.level === 'heavy');
    const gateOpen = GL('Orientation', 'MEDIUM', 'the ancient gate opens, glyphs blazing along its arch', 'the gate');
    const cueAddsEnergy = !!(gateOpen.energy && ['high', 'heavy'].includes(gateOpen.energy.level));
    const discover = GL('Consequence', 'MEDIUM', 'behind them she spots the hidden fissure', 'the fissure');
    const cueAddsFocus = !!(discover.focus && discover.focus.level === 'heavy');

    // ── emotional APEX scales MAGNITUDE, not selection ──
    const transMax = GL('Transformation', 'MAXIMUM', 'he voices the wish', 'the tide-light');
    const transLow = GL('Transformation', 'LOW', 'he voices the wish', 'the tide-light');
    const idx = l => ['none','low','medium','high','heavy'].indexOf(l);
    // TRUE invariant: apex leaves the SET of active categories unchanged (selection) but raises
    // overall loudness (magnitude). MAXIMUM and LOW fire the same effects; MAXIMUM is louder.
    const catsMax = Object.keys(transMax).sort().join(',');
    const catsLow = Object.keys(transLow).sort().join(',');
    const mag = g => Object.keys(g).reduce((a, k) => a + idx(g[k].level), 0);
    const sameCatsDifferentMagnitude = catsMax === catsLow && mag(transMax) > mag(transLow);

    // ── translator produces render direction, figures-first ──
    const prompt = window._graphicLanguageToPrompt(threat);
    const promptHasBlock = /GRAPHIC LANGUAGE \(comic visual vocabulary/.test(prompt) && /MOTION \(heavy\)/.test(prompt);
    const promptFiguresFirst = /NEVER let the effects overpower or obscure the figures/i.test(prompt);
    const emptyPromptOnEmpty = window._graphicLanguageToPrompt({}) === '';

    // ── LINT ──
    const lintThreatNoMotion = window._graphicLanguageLint([{ purpose: 'Threat', emotionalApex: 'HIGH', eyeMagnet: 'x', graphicLanguage: {} }]);
    const catchesNoMotion = lintThreatNoMotion.warnings.some(w => /no\/low MOTION/i.test(w));
    const lintConseqNoImpact = window._graphicLanguageLint([{ purpose: 'Consequence', emotionalApex: 'HIGH', eyeMagnet: 'x', graphicLanguage: { emphasis: { level: 'low', cue: 'shadow' } } }]);
    const catchesNoImpact = lintConseqNoImpact.warnings.some(w => /no IMPACT/i.test(w));
    const lintLoudFlat = window._graphicLanguageLint([{ purpose: 'Resolution', emotionalApex: 'MAXIMUM', eyeMagnet: 'x', graphicLanguage: {} }]);
    const catchesLoudFlat = lintLoudFlat.warnings.some(w => /ZERO graphic language/i.test(w));
    const lintMonotony = window._graphicLanguageLint([
      { purpose: 'Threat', emotionalApex: 'HIGH', eyeMagnet: 'a', graphicLanguage: { motion: { level: 'heavy', cue: 'speed lines' } } },
      { purpose: 'Threat', emotionalApex: 'HIGH', eyeMagnet: 'b', graphicLanguage: { motion: { level: 'heavy', cue: 'speed lines' } } }
    ]);
    const catchesMonotony = lintMonotony.warnings.some(w => /identical dominant graphic treatment/i.test(w));
    const lintFocusConflict = window._graphicLanguageLint([{ purpose: 'Revelation', emotionalApex: 'HIGH', eyeMagnet: 'the seam', graphicLanguage: { focus: { level: 'heavy', cue: 'zoom lines', target: 'the pillar' } } }]);
    const catchesFocusConflict = lintFocusConflict.warnings.some(w => /graphic FOCUS points at/i.test(w));

    // ── INTEGRATION: the storyboard doc carries graphicLanguage, and the real storyboard varies ──
    const lines = [
      "The raider's spear cuts through the current toward my throat.",
      'I twist aside and spot the narrow coral fissure behind the collapsed arch.',
      'Their cutlass rises while the spear stays low, a feint I have seen before.',
      'He lunges, blade driving for my ribs.',
      '"Fate beneath the turning tide, hear what I release." He voices the wish, tide-light gathering.',
      'The water warms, then his tentacles jerk as the strength leaves them.',
      'Behind him the coral seam splits, a narrow black passage breathing colder water.',
      'The passage waits three body-lengths behind him.',
      'Choose.'
    ];
    const plan = {
      visualState: { background: 'the drowned coral ruins', other_characters_present: [{ name: 'Kesh', species: 'kwisheen' }] },
      phases: [{ phaseIdx: 0, startBeat: 0, label: 'x', characters_present: ['protagonist', 'Kesh'], li_visibility_phase: 'absent' }],
      beats: lines.map((t, i) => ({ idx: i, kind: 'narration', text: t }))
    };
    window._buildStoryDirector(plan, 0);
    const sbDocs = (plan.phases || []).map(p => p._storyboardDoc).filter(Boolean);
    const docsHaveGL = sbDocs.every(d => d.graphicLanguage && Object.keys(d.graphicLanguage).length > 0);
    const sbDominantsVary = new Set(sbDocs.map(d => domCat(d.graphicLanguage))).size >= 4;
    const glLintRan = !!plan._graphicLanguageLint;

    // ── HERO PROMPT emits the graphic-language block ──
    s._stagedRegionContract = window._buildStagedRegionContract({ visualState: plan.visualState, phases: [] });
    const threatPhase = (plan.phases || []).find(p => p._readerLearning === 'Threat') || plan.phases[1];
    const pvs = window._resolvePhaseVisualState(plan.visualState, threatPhase, plan.phases, plan.beats);
    const hero = window._buildStagedHeroPrompt(pvs, 0, plan) || '';
    const heroEmitsGL = /GRAPHIC LANGUAGE \(comic visual vocabulary/.test(hero);

    return {
      threatIsMotion, conseqIsImpact, transIsEnergy, revIsFocus, decisIsEmphasis, orientIsQuiet, dominantsVary,
      cueAddsMotion, cueAddsEnergy, cueAddsFocus, sameCatsDifferentMagnitude,
      promptHasBlock, promptFiguresFirst, emptyPromptOnEmpty,
      catchesNoMotion, catchesNoImpact, catchesLoudFlat, catchesMonotony, catchesFocusConflict,
      docsHaveGL, sbDominantsVary, glLintRan, heroEmitsGL,
      dominants
    };
  });

  await browser.close();

  const checks = [
    ['type vocabulary VARIES: Threat=motion, Consequence=impact, Transformation=energy+tension', R.threatIsMotion && R.conseqIsImpact && R.transIsEnergy],
    ['type vocabulary VARIES: Revelation=focus, Decision=emphasis, Orientation=quiet ambient', R.revIsFocus && R.decisIsEmphasis && R.orientIsQuiet],
    ['dominant category differs across ≥4 of 5 story types (not one treatment for all)', R.dominantsVary],
    ['event cue OVERRIDES type: a spear thrust adds heavy MOTION even in an Orientation beat', R.cueAddsMotion],
    ['event cue: a gate opening with glyphs adds ENERGY', R.cueAddsEnergy],
    ['event cue: "spots the hidden fissure" adds heavy FOCUS', R.cueAddsFocus],
    ['emotional APEX scales MAGNITUDE not selection (MAXIMUM louder than LOW, same category)', R.sameCatsDifferentMagnitude],
    ['translator emits a GRAPHIC LANGUAGE block with the active category + level', R.promptHasBlock],
    ['translator keeps figures first (effects must not overpower the figures)', R.promptFiguresFirst],
    ['translator returns empty string when there is no active graphic language', R.emptyPromptOnEmpty],
    ['LINT: catches a Threat with no motion language', R.catchesNoMotion],
    ['LINT: catches a Consequence with no impact language', R.catchesNoImpact],
    ['LINT: catches a loud (MAXIMUM) beat rendered with zero graphic language', R.catchesLoudFlat],
    ['LINT: catches identical dominant treatment on adjacent panels (monotony)', R.catchesMonotony],
    ['LINT: catches graphic FOCUS pointing away from the Eye Magnet', R.catchesFocusConflict],
    ['INTEGRATION: every storyboard doc carries graphicLanguage', R.docsHaveGL],
    ['INTEGRATION: the real storyboard\'s graphic language varies (≥4 distinct dominants)', R.sbDominantsVary],
    ['INTEGRATION: graphic-language lint runs in the storyboard build', R.glLintRan],
    ['INTEGRATION: the hero prompt emits the GRAPHIC LANGUAGE block', R.heroEmitsGL]
  ];

  let pass = 0, fail = 0;
  console.log('\n  COMIC GRAPHIC LANGUAGE v1 — the visual vocabulary of comics  ($0)\n  ' + '─'.repeat(64));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · storyboard dominants: ' + R.dominants.join(' → '));
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(64) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
