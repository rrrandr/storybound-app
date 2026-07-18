// $0 verification of Storyboard Artist v1 — Understanding-Change → Panel. Fed the ACTUAL
// regen5 beats (the "four confrontation panels" failure): does the storyboard become a varied
// understanding sequence with the wish + the passage each getting a panel? Paid endpoints blocked.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/deepseek-proxy**', '**/api/proxy**', '**/api/grok-image**', '**/api/visualize-flux**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._buildStoryboard === 'function' && typeof window._buildStoryDirector === 'function', { timeout: 40000 });

  const R = await page.evaluate(() => {
    const s = window.state;
    s.gender = 'Female'; s.gnArtist = 'ender_bond'; s.renderMode = 'staged_story_mode';
    s.picks = { world: 'Fantasy', identity: { playerName: 'Mira' } };
    s._playerSpecies = 'human'; s._liSpecies = 'human'; s.worldInstanceId = 'sb-1';
    s.aPlot = { goal: 'escape', antagonistOrAntiForce: 'Kesh the raider' };
    window._stagedFunnelBypass = true; window._storyboardArtist = true;

    // The real regen5 prose, as beats. Four prose phases were all "confrontation".
    const lines = [
      "I press flat against the coral pillar as Kesh's spear cuts the water where my shoulder had been.",
      'The talisman at my throat pulses cold, the only reason the water does not crush my lungs.',
      'Stay where the current can see you.',
      'His tentacles sign faster than I can follow, but the meaning lands like a blade.',
      "Kesh's skin ripples, colors shifting to darker slate as he reads my stillness.",
      'You think you can slip the net.',
      'His cutlass lowers, but the spear remains pointed at the only open current behind me.',
      'I taste iron in the water and know he means to end the hunt now.',
      'Fate beneath the turning tide, hear what I release and what I ask to return. I wish that the last survivors are driven into the basin with no path out. I offer a full tide of my strength.',
      'The water warms around us for a single breath, then stills.',
      "Kesh's tentacles jerk once, the strength leaving them as the basin current seals itself.",
      'I feel the new pressure in my chest before I understand it.',
      'Behind Kesh the coral seam splits, a narrow black passage breathing colder water.',
      'The escape is real and already closing.',
      'The basin is sealed. No one leaves.',
      'His voice carries thin through the water, bubbles rising with each word.',
      'I see the spear tremble in his grip and know the price has already begun to claim him.',
      'The passage waits three body-lengths behind him.',
      'Kesh eyes meet mine across the silt and I feel the question settle between us.',
      'Choose.',
      'I taste the choice in the back of my throat before the words form.',
      'Confront Kesh with the spear between us or slip through the passage while his strength still fails him?'
    ];
    const plan = {
      visualState: { background: 'the drowned coral ruins', pc_wardrobe: 'linen tunic', other_characters_present: [{ name: 'Kesh', species: 'kwisheen', wardrobe: 'coral spear', position: 'attacking, a raider' }] },
      // FOUR prose phases, all confrontation — the failure shape
      phases: [
        { phaseIdx: 0, startBeat: 0, label: 'ambush', characters_present: ['protagonist', 'Kesh'], props_present: [], li_visibility_phase: 'absent' },
        { phaseIdx: 1, startBeat: 6, label: 'wish', characters_present: ['protagonist', 'Kesh'], props_present: [], li_visibility_phase: 'absent' },
        { phaseIdx: 2, startBeat: 12, label: 'omen', characters_present: ['protagonist', 'Kesh'], props_present: [], li_visibility_phase: 'absent' },
        { phaseIdx: 3, startBeat: 18, label: 'choice', characters_present: ['protagonist', 'Kesh'], props_present: [], li_visibility_phase: 'absent' }
      ],
      beats: lines.map((t, i) => ({ idx: i, kind: 'narration', text: t }))
    };

    window._buildStoryDirector(plan, 0);
    const sb = (plan._storyboard || []).map(p => ({ type: p.type, beat: p.beatIdx, pt: !!p.isPageTurn }));
    const types = sb.map(p => p.type);
    // panel spec check: the Transformation panel got the wish grammar; the Revelation is discovery
    const panels = plan._panels || [];
    const transformationPanel = panels.find(p => { const ph = plan.phases.find(x => x._panel === p); return ph && ph._readerLearning === 'Transformation'; });
    const revelationPanel = panels.find(p => { const ph = plan.phases.find(x => x._panel === p); return ph && ph._readerLearning === 'Revelation'; });

    // v2: STORYBOARD DOCUMENT (frozen moment / composition priority / forbidden focus) + dedup fix
    const sbPhases = plan.phases || [];
    const docsAllPresent = sbPhases.every(p => p._storyboardDoc && p._storyboardDoc.frozenMoment && p._storyboardDoc.compositionPriority);
    const frozenMoments = sbPhases.map(p => p._storyboardDoc && p._storyboardDoc.frozenMoment);
    const distinctFrozen = new Set(frozenMoments).size === frozenMoments.length; // distinct → fingerprints diverge → no dedup
    const revPhase = sbPhases.find(p => p._readerLearning === 'Revelation');
    const revDoc = revPhase && revPhase._storyboardDoc;
    s._stagedRegionContract = window._buildStagedRegionContract({ visualState: plan.visualState, phases: [] });
    const phaseVSrev = window._resolvePhaseVisualState(plan.visualState, revPhase, plan.phases, plan.beats);
    const revHeroPrompt = window._buildStagedHeroPrompt(phaseVSrev, 0, plan) || '';
    return {
      sb, types,
      hasTransformation: types.includes('Transformation'),
      hasRevelation: types.includes('Revelation'),
      hasThreat: types.includes('Threat'),
      hasOrientation: types[0] === 'Orientation',
      hasDecision: types.includes('Decision'),
      notAllThreat: new Set(types).size >= 4,
      noAdjacentDup: types.every((t, i) => i === 0 || t !== types[i - 1]),
      pageTurnIsRevelation: sb.some(p => p.pt && p.type === 'Revelation'),
      transformationHasWishGrammar: !!(transformationPanel && (transformationPanel.grammarCues || []).some(g => /WISH \(visual grammar/.test(g))),
      revelationIsDiscovery: !!(revelationPanel && revelationPanel.shotType === 'discovery'),
      phasesSwapped: Array.isArray(plan._prosePhases) && plan.phases !== plan._prosePhases,
      docsAllPresent, distinctFrozen,
      revForbidsTalking: !!(revDoc && /standing and talking|a conversation/i.test(revDoc.forbiddenFocus)),
      revCompositionIsReveal: !!(revDoc && /REVEALED/.test(revDoc.compositionPriority)),
      revFrozenIsBeat: !!(revDoc && revDoc.frozenMoment && revDoc.frozenMoment.length > 10),
      heroEmitsFrozenMoment: /FROZEN MOMENT \(illustrate THIS exact instant/.test(revHeroPrompt),
      heroEmitsForbiddenFocus: /FORBIDDEN FOCUS \(must NOT dominate/.test(revHeroPrompt) && /standing and talking|a conversation/i.test(revHeroPrompt),
      heroEmitsCompositionPriority: /COMPOSITION PRIORITY \(must DOMINATE/.test(revHeroPrompt)
    };
  });
  await browser.close();

  const checks = [
    ['storyboard is a VARIED understanding sequence (≥4 distinct types), not Threat×4', R.notAllThreat],
    ['no two ADJACENT panels teach the same understanding', R.noAdjacentDup],
    ['MANDATORY: the wish (Transformation) gets a panel', R.hasTransformation],
    ['MANDATORY: the passage (Revelation) gets a panel', R.hasRevelation],
    ['the opening Threat survives as its own panel (not swallowed by Orientation)', R.hasThreat],
    ['first panel is Orientation (establishes where/who/why)', R.hasOrientation],
    ['the Decision gets a panel', R.hasDecision],
    ['page-turn is the Revelation (recontextualizes)', R.pageTurnIsRevelation],
    ['Transformation panel carries the wish/prayer grammar', R.transformationHasWishGrammar],
    ['Revelation panel is a discovery shot', R.revelationIsDiscovery],
    ['render-driving phases swapped to the storyboard (prose phases kept)', R.phasesSwapped],
    ['v2: every panel has a storyboard DOCUMENT (frozen moment + composition priority)', R.docsAllPresent],
    ['v2: frozen moments are DISTINCT per panel (fingerprints diverge → no 6→4 dedup)', R.distinctFrozen],
    ['v2: Revelation panel FORBIDS "standing and talking" (anti-drift)', R.revForbidsTalking],
    ['v2: Revelation composition priority = the REVEALED thing', R.revCompositionIsReveal],
    ['v2: Revelation frozen moment carries the beat instant', R.revFrozenIsBeat],
    ['v2: hero prompt emits FROZEN MOMENT + COMPOSITION PRIORITY + FORBIDDEN FOCUS', R.heroEmitsFrozenMoment && R.heroEmitsCompositionPriority && R.heroEmitsForbiddenFocus]
  ];

  let pass = 0, fail = 0;
  console.log('\n  STORYBOARD ARTIST v1 — Understanding-Change → Panel  ($0)\n  ' + '─'.repeat(62));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · storyboard: ' + R.types.map((t, i) => t + (R.sb[i].pt ? '*' : '')).join(' → '));
  console.log('  ' + '─'.repeat(62) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
