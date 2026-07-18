// $0 FATELANDS WISH BURST — Fate's star-burst visual language. A CLEAN wish radiates a golden,
// straight-lined SPARKLE-STAR burst (made → manifests → fulfilled); a TWISTED wish curdles the same
// burst to red, jagged, X-scribbled/broken stars. Runs against localhost:3000, no paid calls.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window._VISUAL_GRAMMAR_V1 && typeof window._sdWishTwisted === 'function' && typeof window._buildStoryDirector === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    const G = window._VISUAL_GRAMMAR_V1;

    // ── CLEAN burst grammar: golden, straight lines, sparkle stars ──
    const cleanWishOk = /golden/i.test(G.wish) && /sparkle stars/i.test(G.wish) && /straight/i.test(G.wish);
    const cleanFateOk = /golden/i.test(G.fateAnswer) && /sparkle stars/i.test(G.fateAnswer);
    // ── TWISTED burst grammar: red, jagged, X's, broken stars ──
    const twistWishOk = /red/i.test(G.wishTwisted) && /jagged/i.test(G.wishTwisted) && /X’S|X'S|scribbled/i.test(G.wishTwisted) && /broken|splinter/i.test(G.wishTwisted);
    const twistFateOk = /red/i.test(G.fateAnswerTwisted) && /jagged|malformed|cruel/i.test(G.fateAnswerTwisted);
    // clean and twisted are DISTINCT (not the same string)
    const distinct = G.wish !== G.wishTwisted && G.fateAnswer !== G.fateAnswerTwisted;
    // the burst is described as PART OF FATE / integrated, not a floating label
    const integrated = /Fate’s own signature|integrated INTO the art/i.test(G.wish);

    // ── TWIST DETECTION ──
    const detectsKeyword = window._sdWishTwisted('the wish twists in her hands, curdling', {}, null) === true;
    const detectsWentWrong = window._sdWishTwisted('the wish goes wrong, cruel and malformed', {}, null) === true;
    const detectsFlagAp = window._sdWishTwisted('he voices the wish', {}, { wishTwisted: true }) === true;
    const detectsFlagPlan = window._sdWishTwisted('he voices the wish', { _wishTwisted: true }, null) === true;
    const cleanByDefault = window._sdWishTwisted('he voices the wish, tide-light gathering', {}, null) === false;
    const ordinaryWishStaysClean = window._sdWishTwisted('Fate beneath the turning tide, hear what I release.', {}, null) === false;

    // ── INTEGRATION: a Transformation panel carries the GOLDEN burst by default ──
    const s = window.state || (window.state = {});
    s.storyId = 'e2e-wish'; s._playerSpecies = 'human'; s._liSpecies = ''; s._wishTwisted = false; s._openFateBargains = [];
    const mk = (twist) => {
      const plan = {
        _wishTwisted: !!twist,
        visualState: { background: 'coral ruins', other_characters_present: [{ name: 'Kesh', species: 'kwisheen', position: 'a raider' }] },
        phases: [{ phaseIdx: 0, startBeat: 0, label: 'x', characters_present: ['protagonist', 'Kesh'], props_present: [], li_visibility_phase: 'absent' }],
        beats: [
          { idx: 0, kind: 'narration', text: 'The raider corners me.' },
          { idx: 1, kind: 'narration', text: '"Fate beneath the turning tide." He voices the wish, tide-light gathering at his hands.' },
          { idx: 2, kind: 'narration', text: 'The water warms and the passage opens as Fate answers.' }
        ]
      };
      window._buildStoryDirector(plan, 0);
      const tPhase = (plan.phases || []).find(p => p._readerLearning === 'Transformation');
      const cPhase = (plan.phases || []).find(p => p._readerLearning === 'Consequence');
      return {
        wishCues: (tPhase && tPhase._panel && tPhase._panel.grammarCues || []).join(' '),
        fateCues: (cPhase && cPhase._panel && cPhase._panel.grammarCues || []).join(' ')
      };
    };
    const clean = mk(false);
    const twisted = mk(true);
    const cleanPanelGolden = /golden/i.test(clean.wishCues) && /sparkle stars/i.test(clean.wishCues) && !/red and jagged/i.test(clean.wishCues);
    const twistedPanelRed = /red/i.test(twisted.wishCues) && /jagged/i.test(twisted.wishCues) && /X’S|X'S/i.test(twisted.wishCues);

    // ── WISH ANCHOR (D): the burst attaches to the concrete thing Fate judges — NO enforced prayer pose ──
    const anchorPassage = /passage\/opening/i.test(window._sdWishAnchor('I wish that the passage opens'));
    const anchorWeapon = /weapon|gripping HAND/i.test(window._sdWishAnchor('I wish this blade would never break'));
    const anchorWound = /wound/i.test(window._sdWishAnchor('I wish these wounds were enough to reach the surface'));
    const anchorInvocation = /open mouth and nearest\/outstretched HAND/i.test(window._sdWishAnchor('Fate, hear me'));
    // regen13 anchor-selection fixes: "rift" → passage anchor; "Many-Tide" (proper noun) must NOT be the tide anchor
    const anchorRift = /passage\/opening/i.test(window._sdWishAnchor('I wish that the rift seals until the Many-Tide claims its due'));
    const manyTideNotWater = !/water\/tide/i.test(window._sdWishAnchor('I wish the Many-Tide spares us')) ;
    const noPrayerInGrammar = /SPEECH \+ INTENT|NOT a posture/i.test(G.wish) && !/clasped together or open and rising in supplication/i.test(G.wish);
    const burstWrapsAnchor = /WRAPPING THE WISH ANCHOR|AROUND THE ANCHOR/i.test(G.wish);
    // #16 aesthetic: the burst is FLAT SYMBOLIC LINEWORK (engraved/inked/2D overlay), not energy/glow
    const burstIsSymbolic = /SYMBOLIC LINEWORK|INKED, ENGRAVED|2D graphic|woodcut|printed-comic sound-effect/i.test(G.wish) && /NOT a soft volumetric glow|not a soft volumetric glow|anime energy explosion/i.test(G.wish);
    const twistedIsSymbolic = /SYMBOLIC LINEWORK|INKED, ENGRAVED/i.test(G.wishTwisted);
    // integration: the wish panel carries a wishAnchor and the hero prompt emits the WISH ANCHOR line
    const anchorPanel = (() => {
      s._openFateBargains = [];
      const p = { visualState: { background: 'coral ruins', other_characters_present: [{ name: 'Kesh', species: 'kwisheen', position: 'a raider' }] },
        phases: [{ phaseIdx: 0, startBeat: 0, label: 'x', characters_present: ['protagonist', 'Kesh'], props_present: [], li_visibility_phase: 'absent' }],
        beats: [{ idx: 0, kind: 'narration', text: 'The raider corners me.' }, { idx: 1, kind: 'narration', text: '"Fate beneath the turning tide." I wish the passage opens, blade still raised.' }, { idx: 2, kind: 'narration', text: 'The water warms.' }] };
      window._buildStoryDirector(p, 0);
      const tp = (p.phases || []).find(x => x._readerLearning === 'Transformation');
      return tp && tp._panel && tp._panel.wishAnchor;
    })();
    const panelHasAnchor = !!(anchorPanel && /passage/i.test(anchorPanel));

    // ── MECHANIC-FIRST (TRUTHFULNESS): the burst reads the ACTUAL Fate-bargain outcome, not keywords ──
    const mo = (lo) => { s._openFateBargains = [{ id: 'b', lastOutcome: lo, lastInvokedScene: 0 }]; return window._sdWishMechanicOutcome(); };
    const mechMaps = mo('landed') === 'clean' && mo('warped') === 'twisted' && mo('distorted') === 'twisted' && mo('refused') === 'rejected';
    s._openFateBargains = [{ id: 'a', lastOutcome: 'landed', lastInvokedScene: 0 }, { id: 'b', lastOutcome: 'refused', lastInvokedScene: 3 }];
    const mostRecentWins = window._sdWishMechanicOutcome() === 'rejected';
    // mechanic OVERRIDES a contradicting beat-text heuristic — the burst can never contradict the game state
    s._openFateBargains = [{ id: 'b', lastOutcome: 'warped', lastInvokedScene: 0 }];
    const mechOverridesCleanText = window._sdWishOutcome('he voices the wish, tide-light gathering, a welcomed clean answer', {}, null) === 'twisted';
    s._openFateBargains = [{ id: 'b', lastOutcome: 'refused', lastInvokedScene: 0 }];
    const mechRefusedOverridesHopeText = window._sdWishOutcome('the wish is granted and the passage opens', {}, null) === 'rejected';
    // no mechanic state → falls through to the heuristic (NPC / demo wishes with no bargain yet)
    s._openFateBargains = [];
    const fallsThroughNoMechanic = window._sdWishOutcome('the wish twists and curdles', {}, null) === 'twisted';
    // REJECTED (the third state): grammar = aborted burst, no stars
    const rejectGrammarOk = /ABORTED/i.test(G.wishRejected) && /NO rays|NO stars/i.test(G.wishRejected) && /REFUSED/i.test(G.wishRejected);
    const detectsRefusedHeuristic = window._sdWishOutcome('Fate did not answer; the wish fails', {}, null) === 'rejected';
    // INTEGRATION: a refused mechanic → the panel carries the aborted (no-burst) grammar, NOT golden
    s._openFateBargains = [{ id: 'b', lastOutcome: 'refused', lastInvokedScene: 0 }];
    const rej = mk(false);
    const rejectedPanelNoBurst = /ABORTED|NO rays, NO stars|gutters and dies/i.test(rej.wishCues) && !/golden/i.test(rej.wishCues);
    s._openFateBargains = [];

    return {
      cleanWishOk, cleanFateOk, twistWishOk, twistFateOk, distinct, integrated,
      detectsKeyword, detectsWentWrong, detectsFlagAp, detectsFlagPlan, cleanByDefault, ordinaryWishStaysClean,
      cleanPanelGolden, twistedPanelRed,
      mechMaps, mostRecentWins, mechOverridesCleanText, mechRefusedOverridesHopeText, fallsThroughNoMechanic,
      rejectGrammarOk, detectsRefusedHeuristic, rejectedPanelNoBurst,
      anchorPassage, anchorWeapon, anchorWound, anchorInvocation, anchorRift, manyTideNotWater, noPrayerInGrammar, burstWrapsAnchor, panelHasAnchor,
      burstIsSymbolic, twistedIsSymbolic,
      hasWishCue: !!clean.wishCues
    };
  });

  await browser.close();

  const checks = [
    ['CLEAN wish grammar: golden + straight lines + sparkle stars', R.cleanWishOk],
    ['CLEAN fate-answer grammar carries the golden burst', R.cleanFateOk],
    ['TWISTED wish grammar: red + jagged + X\'s + broken/splintered stars', R.twistWishOk],
    ['TWISTED fate-answer grammar: red + malformed/cruel', R.twistFateOk],
    ['clean and twisted grammars are DISTINCT', R.distinct],
    ['the burst is described as part of Fate / integrated into the art', R.integrated],
    ['TWIST DETECTION: fires on a "twists/curdling" beat', R.detectsKeyword],
    ['TWIST DETECTION: fires on "the wish goes wrong, cruel/malformed"', R.detectsWentWrong],
    ['TWIST DETECTION: honors an authored ap.wishTwisted flag', R.detectsFlagAp],
    ['TWIST DETECTION: honors a plan._wishTwisted flag', R.detectsFlagPlan],
    ['TWIST DETECTION: an ordinary wish beat defaults to CLEAN', R.cleanByDefault],
    ['TWIST DETECTION: the formal invocation stays CLEAN', R.ordinaryWishStaysClean],
    ['INTEGRATION: a Transformation panel carries the golden burst by default', R.cleanPanelGolden],
    ['INTEGRATION: with a twist signal the panel carries the red X-burst', R.twistedPanelRed],
    ['INTEGRATION: the wish grammar actually reached the panel spec', R.hasWishCue],
    ['MECHANIC: bargain outcome maps landed→clean, warped/distorted→twisted, refused→rejected', R.mechMaps],
    ['MECHANIC: the most recently resolved bargain wins', R.mostRecentWins],
    ['TRUTHFULNESS: a warped mechanic OVERRIDES clean-sounding beat text → twisted', R.mechOverridesCleanText],
    ['TRUTHFULNESS: a refused mechanic OVERRIDES hopeful beat text → rejected', R.mechRefusedOverridesHopeText],
    ['no mechanic state → falls through to the beat-text heuristic', R.fallsThroughNoMechanic],
    ['REJECTED: third-state grammar is an aborted burst (no rays, no stars)', R.rejectGrammarOk],
    ['REJECTED: heuristic fires on "Fate did not answer / the wish fails"', R.detectsRefusedHeuristic],
    ['INTEGRATION: a refused outcome gives the panel the aborted no-burst grammar (not golden)', R.rejectedPanelNoBurst],
    ['ANCHOR: a "passage opens" wish anchors the burst to the passage', R.anchorPassage],
    ['ANCHOR: a "blade never breaks" wish anchors to the weapon/hand', R.anchorWeapon],
    ['ANCHOR: a "wounds" wish anchors to the wound', R.anchorWound],
    ['ANCHOR: a bare invocation anchors to the mouth + outstretched hand (no pose)', R.anchorInvocation],
    ['ANCHOR (regen13 fix): "the rift seals" → the passage anchor (not the tide)', R.anchorRift],
    ['ANCHOR (regen13 fix): "Many-Tide" (proper noun) does NOT trigger the water anchor', R.manyTideNotWater],
    ['ANCHOR: the wish grammar is SPEECH+INTENT — the enforced prayer pose is GONE', R.noPrayerInGrammar],
    ['ANCHOR: the burst wraps THE WISH ANCHOR (not a "point of power")', R.burstWrapsAnchor],
    ['ANCHOR: the wish panel carries a wishAnchor (the passage)', R.panelHasAnchor],
    ['#16 AESTHETIC: the burst is FLAT SYMBOLIC LINEWORK, not an energy blast', R.burstIsSymbolic],
    ['#16 AESTHETIC: the twisted burst carries the symbolic-linework style too', R.twistedIsSymbolic]
  ];

  let pass = 0, fail = 0;
  console.log('\n  FATELANDS WISH BURST — Fate\'s star-burst visual language  ($0)\n  ' + '─'.repeat(62));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(62) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
