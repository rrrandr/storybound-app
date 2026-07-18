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
    s.storyId = 'e2e-wish'; s._playerSpecies = 'human'; s._liSpecies = ''; s._wishTwisted = false;
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

    return {
      cleanWishOk, cleanFateOk, twistWishOk, twistFateOk, distinct, integrated,
      detectsKeyword, detectsWentWrong, detectsFlagAp, detectsFlagPlan, cleanByDefault, ordinaryWishStaysClean,
      cleanPanelGolden, twistedPanelRed,
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
    ['INTEGRATION: the wish grammar actually reached the panel spec', R.hasWishCue]
  ];

  let pass = 0, fail = 0;
  console.log('\n  FATELANDS WISH BURST — Fate\'s star-burst visual language  ($0)\n  ' + '─'.repeat(62));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(62) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
