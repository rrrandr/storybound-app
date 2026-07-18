// $0 GRAPHIC TYPOGRAPHY v1 — the ONLY text inside a Storybound panel: SFX + emotional outbursts that
// BECOME part of the visual action. NOT balloons/captions/narration/dialogue (those live in the prose
// below the panel — hybrid medium). RESTRAINT is the point: an SFX fires only when it adds info the
// artwork alone can't, and is SUPPRESSED when the graphic language already says it. LIVE in the hero
// prompt. Runs against localhost:3000, no paid calls.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._buildGraphicTypography === 'function' && typeof window._buildStoryDirector === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    const GT = (beat, gl, opts) => window._buildGraphicTypography(beat, gl, opts || {});

    // ── YES: a hard material event gets an SFX from the controlled vocabulary ──
    const crack = GT('His weight drives her spine against the pillar and the stone cracks.', {});
    const crackOk = !!(crack.sfx && crack.sfx.category === 'stone_crack' && window._LETTER_SFX_VOCAB.stone_crack.includes(crack.sfx.text) && crack.sfx.strength === 'strong');
    const bladeDraw = GT('She draws her cutlass in one motion.', {});
    const bladeOk = !!(bladeDraw.sfx && bladeDraw.sfx.category === 'blade_draw' && bladeDraw.sfx.strength === 'light');

    // ── RESTRAINT: an SFX is SUPPRESSED when the graphic language already communicates it ──
    // a magic/portal event WITH active ENERGY graphic language → no FWOOM (glyphs already say it)
    const portalWithEnergy = GT('The ancient gate opens, glyphs blazing.', { energy: { level: 'heavy', cue: 'glyphs' } });
    const portalSuppressed = !!(portalWithEnergy.sfx && portalWithEnergy.sfx.suppressed && portalWithEnergy.sfx.suppressedBy === 'energy' && !portalWithEnergy.sfx.text);
    // the SAME event WITHOUT energy graphic language → the SFX is allowed
    const portalNoEnergy = GT('The ancient gate opens, glyphs blazing.', {});
    const portalAllowedWhenNotCovered = !!(portalNoEnergy.sfx && portalNoEnergy.sfx.text && !portalNoEnergy.sfx.suppressed);
    // a magic surge with energy → suppressed (no SHIMMER when tide-light is already drawn)
    const magicWithEnergy = GT('Tide-light gathers as the spell takes hold.', { energy: { level: 'high', cue: 'tide-light' } });
    const magicSuppressed = !!(magicWithEnergy.sfx && magicWithEnergy.sfx.suppressed);

    // ── a pure MOTION beat (spear thrust) gets NO SFX — motion lines already carry the speed ──
    const thrust = GT('The raider\'s spear cuts through the current toward my throat.', { motion: { level: 'heavy', cue: 'speed lines' } });
    const thrustNoSfx = !(thrust.sfx && thrust.sfx.text);

    // ── quiet conversation → NOTHING (no typography at all) ──
    const quiet = GT('We have to go, she says.', {}, { dialogue: ['We have to go.'] });
    const quietEmpty = !quiet.sfx && !quiet.burst;

    // ── EMOTIONAL OUTBURST: a shout that is a visual event → into the artwork ──
    const shout = GT('beat', {}, { dialogue: ['NO!'] });
    const shoutOk = !!(shout.burst && /NO/.test(shout.burst.text));
    const scream = GT('beat', {}, { dialogue: ['AAAAH!!'] });
    const screamOk = !!(scream.burst && /AAAAH/.test(scream.burst.text));
    // ordinary dialogue, even a full sentence, is NOT an outburst
    const normalLine = GT('beat', {}, { dialogue: ['You carry no mark of the tide.'] });
    const normalNoBurst = !normalLine.burst;
    // storyboard can force burst off
    const burstOff = GT('beat', {}, { dialogue: ['RUN!'], burstIntent: 'none' });
    const burstOffOk = !burstOff.burst;
    // storyboard can force SFX off
    const sfxOff = GT('the stone cracks', {}, { sfxIntent: 'none' });
    const sfxOffOk = !!(sfxOff.sfx && sfxOff.sfx.suppressed && sfxOff.sfx.suppressedBy === 'storyboard:none');

    // ── LINT ──
    const lintCovered = window._graphicTypographyLint({ sfx: { category: 'magic', suppressed: true, suppressedBy: 'energy' } }, {});
    const lintCatchesRedundant = lintCovered.warnings.some(w => /already communicates it/i.test(w));
    const lintObscure = window._graphicTypographyLint({ sfx: { text: 'BOOM', anchor: { x: 0.5, y: 0.5 } } }, { eyeMagnet: 'the passage' });
    const lintCatchesObscure = lintObscure.warnings.some(w => /obscure the eye-magnet/i.test(w));

    // ── CONTRACT: forbids balloons, renders only the SFX/outburst, or NOTHING ──
    const contractWithSfx = window._graphicTypographyContract(crack);
    const contractForbidsBalloons = /Do NOT draw any speech balloons/i.test(contractWithSfx) && /prose BELOW the panel/i.test(contractWithSfx);
    const contractEmitsSfx = new RegExp('SOUND EFFECT[^\\n]*' + crack.sfx.text).test(contractWithSfx);
    const contractEmpty = window._graphicTypographyContract({ sfx: null, burst: null });
    const contractNoTextWhenEmpty = /carries NO text at all/i.test(contractEmpty) && /Do NOT draw any speech balloons/i.test(contractEmpty);

    // ── LIVE: the hero prompt emits the graphic typography contract (no balloons) ──
    const s = window.state || (window.state = {});
    s.storyId = 'e2e-typo'; s._playerSpecies = 'human'; s._liSpecies = '';
    const plan = {
      visualState: { background: 'coral ruins', other_characters_present: [{ name: 'Kesh', species: 'kwisheen', position: 'a raider' }] },
      phases: [{ phaseIdx: 0, startBeat: 0, label: 'x', characters_present: ['protagonist', 'Kesh'], props_present: [], li_visibility_phase: 'absent' }],
      beats: [
        { idx: 0, kind: 'narration', text: 'The raider corners me in the flooded arch.' },
        { idx: 1, kind: 'narration', text: 'His blade drives into the pillar and the stone cracks.' },
        { idx: 2, kind: 'narration', text: 'Behind him the coral seam splits into a passage.' }
      ]
    };
    window._buildStoryDirector(plan, 0);
    s._stagedRegionContract = window._buildStagedRegionContract({ visualState: plan.visualState, phases: [] });
    const pvs = window._resolvePhaseVisualState(plan.visualState, plan.phases[0], plan.phases, plan.beats);
    const hero = window._buildStagedHeroPrompt(pvs, 0, plan) || '';
    const heroEmitsContract = /GRAPHIC TYPOGRAPHY \(HARD\)[\s\S]*Do NOT draw any speech balloons/i.test(hero);

    return {
      crackOk, bladeOk, portalSuppressed, portalAllowedWhenNotCovered, magicSuppressed,
      thrustNoSfx, quietEmpty, shoutOk, screamOk, normalNoBurst, burstOffOk, sfxOffOk,
      lintCatchesRedundant, lintCatchesObscure, contractForbidsBalloons, contractEmitsSfx,
      contractNoTextWhenEmpty, heroEmitsContract,
      sampleSfx: crack.sfx && crack.sfx.text
    };
  });

  await browser.close();

  const checks = [
    ['YES: a hard material event (stone crack) gets a STRONG SFX', R.crackOk],
    ['YES: drawing a blade gets a LIGHT SFX', R.bladeOk],
    ['RESTRAINT: a portal WITH active energy graphic language → SFX suppressed (glyphs say it)', R.portalSuppressed],
    ['RESTRAINT: the same portal WITHOUT energy graphic language → SFX allowed', R.portalAllowedWhenNotCovered],
    ['RESTRAINT: a magic surge with energy graphic language → SFX suppressed', R.magicSuppressed],
    ['RESTRAINT: a spear thrust (motion lines carry it) → NO SFX', R.thrustNoSfx],
    ['NO: quiet conversation → no typography at all', R.quietEmpty],
    ['YES: "NO!" → emotional outburst into the artwork', R.shoutOk],
    ['YES: "AAAAH!!" → emotional outburst', R.screamOk],
    ['NO: an ordinary full-sentence line is NOT an outburst', R.normalNoBurst],
    ['storyboard control: burstIntent="none" forces no outburst', R.burstOffOk],
    ['storyboard control: sfxIntent="none" forces no SFX', R.sfxOffOk],
    ['LINT: flags an SFX the graphic language already covers (restraint)', R.lintCatchesRedundant],
    ['LINT: flags an SFX/outburst obscuring the eye-magnet', R.lintCatchesObscure],
    ['CONTRACT: forbids balloons/captions (prose is below the panel)', R.contractForbidsBalloons],
    ['CONTRACT: emits the resolved SFX text', R.contractEmitsSfx],
    ['CONTRACT: says the panel carries NO text when there is no SFX/outburst', R.contractNoTextWhenEmpty],
    ['LIVE: the hero prompt emits the graphic typography contract (no balloons)', R.heroEmitsContract]
  ];

  let pass = 0, fail = 0;
  console.log('\n  GRAPHIC TYPOGRAPHY v1 — SFX + outbursts only, with restraint  ($0)\n  ' + '─'.repeat(64));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · sample SFX (stone crack): ' + R.sampleSfx);
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(64) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
