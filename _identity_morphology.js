// $0 CANON IDENTITY MORPHOLOGY — the immutable identity layer (gender / face / body-topology)
// that regen8 proved is the ROOT of recurring-character drift (Kesh flipped female-maned ↔
// male-octopus because gender/topology were unpinned). Casting inherits Canon's certainty; this
// pins it. Runs against localhost:3000, no paid calls.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._sdBuildMorphology === 'function' && typeof window._buildStoryDirector === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    const s = window.state || (window.state = {});
    window._storyboardArtist = false; // isolate the Canon path; morphology is built regardless

    // ── gender is PINNED and STABLE (the Kesh drift fix) ──
    const m1 = window._sdBuildMorphology('kwisheen', 'Kesh', null, 'antagonist', null);
    const m2 = window._sdBuildMorphology('kwisheen', 'Kesh', null, 'antagonist', null);
    const genderStable = m1.genderPresentation === m2.genderPresentation && (m1.genderPresentation === 'male' || m1.genderPresentation === 'female');
    const faceStable = m1.facialTopology === m2.facialTopology && m1.build === m2.build;
    // a different character seeds a potentially different identity
    const other = window._sdBuildMorphology('kwisheen', 'Vornak', null, 'antagonist', null);
    const distinctChars = (other.facialTopology !== m1.facialTopology) || (other.build !== m1.build) || (other.genderPresentation !== m1.genderPresentation);

    // ── author gender hint WINS over the seed ──
    const heMale = window._sdBuildMorphology('kwisheen', 'Kesh', null, 'antagonist', 'his tentacles sign').genderPresentation === 'male';
    const sheFemale = window._sdBuildMorphology('kwisheen', 'Kesh', null, 'antagonist', 'she reads my stillness').genderPresentation === 'female';

    // ── kwisheen topology pinned (six tentacles, mane, NO elf-ears) ──
    const kwTopology = /six[\s-]?tentacle/i.test(m1.speciesTopology || '');
    const kwHasMane = !!m1.mane;
    const kwNoElfEars = /never[\s-]?point|no external ears|smooth/i.test(m1.ears || '') && /pointed/i.test(m1.ears || ''); // explicitly forbids pointed ears
    // ── human is fully human, no tentacles ──
    const human = window._sdBuildMorphology('human', 'Mira', null, 'protagonist', 'female');
    const humanNoTentacles = /fully human|NO tentacles/i.test(human.speciesTopology || '') && human.genderPresentation === 'female';

    // ── morphology line carries the immutable identity ──
    const line = window._sdMorphologyLine(m1);
    const lineHasGender = /presenting/.test(line);
    const lineHasTopology = /six[\s-]?tentacle/i.test(line);

    // ── INTEGRATION: Canon carries morphology for a kwisheen raider + the human PC ──
    s.storyId = 'e2e-morph'; s._playerSpecies = 'human'; s._liSpecies = ''; s.gender = 'Female';
    const plan = {
      visualState: {
        background: 'coral ruins', pc_wardrobe: 'linen tunic',
        other_characters_present: [{ name: 'Kesh', species: 'kwisheen', position: 'a raider, attacking', gender: 'male' }]
      },
      phases: [{ phaseIdx: 0, startBeat: 0, label: 'x', characters_present: ['protagonist', 'Kesh'], props_present: [], li_visibility_phase: 'absent' }],
      beats: [{ idx: 0, kind: 'narration', text: 'The raider lunges.' }, { idx: 1, kind: 'narration', text: 'She twists aside.' }]
    };
    window._buildStoryDirector(plan, 0);
    const canon = plan._canon || {};
    const keshCanon = canon['kesh'];
    const pcCanon = canon['protagonist'];
    const canonHasMorph = !!(keshCanon && keshCanon.morphology && keshCanon.morphology.genderPresentation);
    const keshGenderPinnedMale = !!(keshCanon && keshCanon.morphology.genderPresentation === 'male'); // c.gender hint honored
    const pcHasMorph = !!(pcCanon && pcCanon.morphology && /human/i.test(pcCanon.morphology.speciesTopology));

    // ── the hero prompt emits the immutable morphology block ──
    s._stagedRegionContract = window._buildStagedRegionContract({ visualState: plan.visualState, phases: [] });
    const pvs = window._resolvePhaseVisualState(plan.visualState, plan.phases[0], plan.phases, plan.beats);
    const hero = window._buildStagedHeroPrompt(pvs, 0, plan) || '';
    const heroEmitsMorph = /IDENTITY \(immutable[^)]*NEVER change gender/i.test(hero);

    return {
      genderStable, faceStable, distinctChars, heMale, sheFemale,
      kwTopology, kwHasMane, kwNoElfEars, humanNoTentacles,
      lineHasGender, lineHasTopology,
      canonHasMorph, keshGenderPinnedMale, pcHasMorph, heroEmitsMorph,
      sampleGender: m1.genderPresentation, sampleLine: line
    };
  });

  await browser.close();

  const checks = [
    ['gender is PINNED and STABLE across calls (the Kesh drift fix)', R.genderStable],
    ['face + build are stable across calls', R.faceStable],
    ['a different character seeds a distinct identity', R.distinctChars],
    ['author gender hint "his" → male', R.heMale],
    ['author gender hint "she" → female', R.sheFemale],
    ['kwisheen topology pins the six-tentacle body', R.kwTopology],
    ['kwisheen has a pinned mane', R.kwHasMane],
    ['kwisheen ears EXPLICITLY forbid pointed elf-ears (regen8 drift)', R.kwNoElfEars],
    ['human morphology is fully human, no tentacles, gender pinned', R.humanNoTentacles],
    ['morphology line carries gender presentation', R.lineHasGender],
    ['morphology line carries the species topology', R.lineHasTopology],
    ['INTEGRATION: Canon carries morphology for the kwisheen raider', R.canonHasMorph],
    ['INTEGRATION: the raider\'s gender is pinned male (author c.gender honored)', R.keshGenderPinnedMale],
    ['INTEGRATION: Canon carries human morphology for the PC', R.pcHasMorph],
    ['INTEGRATION: the hero prompt emits the immutable IDENTITY morphology block', R.heroEmitsMorph]
  ];

  let pass = 0, fail = 0;
  console.log('\n  CANON IDENTITY MORPHOLOGY — the immutable identity layer  ($0)\n  ' + '─'.repeat(62));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  console.log('  · sample Kesh: ' + R.sampleGender + ' — ' + String(R.sampleLine).slice(0, 90));
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(62) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
