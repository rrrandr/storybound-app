// $0 PRODUCTION POLISH v1 — Visual Continuity Director + Eye Path + Visual Question + Color Direction.
// Refinement, not new pipelines: make every render read as "the next page of the same comic".
// Runs against localhost:3000, no paid calls.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._continuityLint === 'function' && typeof window._buildColorDirection === 'function' && typeof window._buildStoryDirector === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    // ── VISUAL CONTINUITY DIRECTOR: diff adjacent panel states ──
    const base = { kesh: { injuries: ['bleeding wound on the arm'], holding: 'spear', status: 'active', position: 'left of frame' } };
    const woundGone = window._continuityDiff(base, { kesh: { injuries: [], holding: 'spear', status: 'active', position: 'left of frame' } });
    const catchesWoundGone = woundGone.errors.some(e => e.kind === 'wound-disappeared');
    const weaponSwap = window._continuityDiff(base, { kesh: { injuries: ['bleeding wound on the arm'], holding: 'dagger', status: 'active', position: 'left of frame' } });
    const catchesWeaponSwap = weaponSwap.changes.some(c => c.kind === 'weapon-changed');
    const flip = window._continuityDiff(base, { kesh: { injuries: ['bleeding wound on the arm'], holding: 'spear', status: 'active', position: 'right of frame' } });
    const catchesFlip = flip.changes.some(c => c.kind === 'screen-direction-flip');
    const statusChange = window._continuityDiff(base, { kesh: { injuries: ['bleeding wound on the arm'], holding: 'spear', status: 'pinned', position: 'left of frame' } });
    const catchesStatus = statusChange.changes.some(c => c.kind === 'status-changed');
    // no false positive when nothing changed
    const clean = window._continuityDiff(base, JSON.parse(JSON.stringify(base)));
    const noFalsePositive = clean.errors.length === 0 && clean.changes.length === 0;
    // a character present in only one panel is not diffed
    const onlyOne = window._continuityDiff(base, { mira: { injuries: [], holding: '', status: 'active', position: '' } });
    const skipsAbsent = onlyOne.errors.length === 0 && onlyOne.changes.length === 0;

    // ── VISUAL QUESTION per type ──
    const vqThreat = window._buildStoryboardDoc('Threat', 'the raider lunges', null).visualQuestion;
    const vqDecision = window._buildStoryboardDoc('Decision', 'choose', null).visualQuestion;
    const vqPresent = /will the attack land/i.test(vqThreat) && /which will she choose/i.test(vqDecision);

    // ── EYE PATH: event-led vs character-led ──
    const epThreat = window._buildEyePath('Threat', 'the spear', 'the raider');
    const epDecision = window._buildEyePath('Decision', 'the two paths', null);
    const eventLed = epThreat[0] === 'the spear' && epThreat.length >= 2;         // event first
    const charLed = /protagonist/.test(epDecision[0]);                             // face first
    const epNoDupes = new Set(epThreat.map(s => s.toLowerCase())).size === epThreat.length;

    // ── COLOR DIRECTION: beat- and apex-driven ──
    const cdMagic = window._buildColorDirection('Transformation', 'MAXIMUM', 'tide-light gathers as the wish takes');
    const magicAccent = /gold|glyph/i.test(cdMagic.accent) && cdMagic.contrast === 'high';
    const cdBlood = window._buildColorDirection('Consequence', 'HIGH', 'blood clouds the water from the wound');
    const bloodAccent = /crimson/i.test(cdBlood.accent);
    const cdPassage = window._buildColorDirection('Revelation', 'HIGH', 'the coral seam splits into a passage');
    const passageAccent = /cyan/i.test(cdPassage.accent) && /backlight/i.test(cdPassage.lighting);
    const cdFire = window._buildColorDirection('Threat', 'HIGH', 'flames erupt along the torch-line');
    const fireWarm = /warm|amber|ember/i.test(cdFire.palette);
    const cdCold = window._buildColorDirection('Orientation', 'MEDIUM', 'she drifts through the drowned ruins');
    const coldDefault = /cold blue/i.test(cdCold.palette) && cdCold.contrast === 'moderate';

    // ── VISUAL POLISH LINT ──
    const vpMissingQ = window._visualPolishLint([{ purpose: 'Threat', eyePath: ['a', 'b'], colorDirection: { palette: 'cold', accent: '', mood: '' } }]);
    const catchesNoQ = vpMissingQ.warnings.some(w => /no visual question/i.test(w));
    const vpBadPath = window._visualPolishLint([{ purpose: 'Threat', visualQuestion: 'q', eyePath: ['only one'], colorDirection: { palette: 'cold', accent: '' } }]);
    const catchesBadPath = vpBadPath.warnings.some(w => /eye path unclear/i.test(w));
    const vpWarmDread = window._visualPolishLint([{ purpose: 'Consequence', visualQuestion: 'q', eyePath: ['a', 'b'], emotionalPurpose: 'cold dread at the cost', colorDirection: { palette: 'warm amber and ember', accent: 'firelight orange', mood: 'cold dread' } }]);
    const catchesWarmDread = vpWarmDread.warnings.some(w => /warm palette contradicts/i.test(w));
    const vpPersonFocus = window._visualPolishLint([{ purpose: 'Revelation', visualQuestion: 'q', eyeMagnet: 'the passage', eyePath: ['the protagonist', 'the passage'], colorDirection: { palette: 'cold', accent: '' } }]);
    const catchesPersonFocus = vpPersonFocus.warnings.some(w => /eye path starts on a person/i.test(w));

    // ── INTEGRATION: docs carry the fields; continuity + polish lints run; hero prompt emits them ──
    const s = window.state || (window.state = {});
    s.storyId = 'e2e-polish'; s._playerSpecies = 'human'; s._liSpecies = '';
    const plan = {
      visualState: { background: 'coral ruins', other_characters_present: [{ name: 'Kesh', species: 'kwisheen', position: 'a raider' }] },
      phases: [{ phaseIdx: 0, startBeat: 0, label: 'x', characters_present: ['protagonist', 'Kesh'], props_present: [], li_visibility_phase: 'absent' }],
      beats: [
        { idx: 0, kind: 'narration', text: 'The raider corners me in the flooded arch, his spear raised.' },
        { idx: 1, kind: 'narration', text: '"Fate beneath the turning tide." Tide-light gathers as he voices the wish.' },
        { idx: 2, kind: 'narration', text: 'Behind him the coral seam splits into a passage.' },
        { idx: 3, kind: 'narration', text: 'His strength drains and I must choose.' }
      ]
    };
    window._buildStoryDirector(plan, 0);
    const sbDocs = (plan.phases || []).map(p => p._storyboardDoc).filter(Boolean);
    const docsHaveFields = sbDocs.every(d => d.visualQuestion && Array.isArray(d.eyePath) && d.eyePath.length && d.colorDirection && d.colorDirection.palette);
    const continuityLintRan = !!plan._continuityLint;
    const polishLintRan = !!plan._visualPolishLint;

    s._stagedRegionContract = window._buildStagedRegionContract({ visualState: plan.visualState, phases: [] });
    const pvs = window._resolvePhaseVisualState(plan.visualState, plan.phases[0], plan.phases, plan.beats);
    const hero = window._buildStagedHeroPrompt(pvs, 0, plan) || '';
    const heroEmitsQ = /VISUAL QUESTION \(the image must make/.test(hero);
    const heroEmitsEyePath = /EYE PATH \(compose so the reader/.test(hero);
    const heroEmitsColor = /COLOR DIRECTION: dominant palette/.test(hero);

    return {
      catchesWoundGone, catchesWeaponSwap, catchesFlip, catchesStatus, noFalsePositive, skipsAbsent,
      vqPresent, eventLed, charLed, epNoDupes,
      magicAccent, bloodAccent, passageAccent, fireWarm, coldDefault,
      catchesNoQ, catchesBadPath, catchesWarmDread, catchesPersonFocus,
      docsHaveFields, continuityLintRan, polishLintRan, heroEmitsQ, heroEmitsEyePath, heroEmitsColor
    };
  });

  await browser.close();

  const checks = [
    ['CONTINUITY: catches a wound that disappeared (error)', R.catchesWoundGone],
    ['CONTINUITY: catches a weapon changing hands', R.catchesWeaponSwap],
    ['CONTINUITY: catches a left↔right screen-direction flip', R.catchesFlip],
    ['CONTINUITY: catches a pinned/free status change', R.catchesStatus],
    ['CONTINUITY: no false positive when nothing changed', R.noFalsePositive],
    ['CONTINUITY: a character in only one panel is not diffed', R.skipsAbsent],
    ['VISUAL QUESTION: present and type-appropriate (Threat / Decision)', R.vqPresent],
    ['EYE PATH: event-led beat leads with the event', R.eventLed],
    ['EYE PATH: a Decision beat leads with the protagonist', R.charLed],
    ['EYE PATH: no duplicate stops', R.epNoDupes],
    ['COLOR: a magic beat → gold/glyph accent + high contrast (MAXIMUM)', R.magicAccent],
    ['COLOR: a blood beat → crimson accent', R.bloodAccent],
    ['COLOR: a passage beat → cyan accent + backlight from the opening', R.passageAccent],
    ['COLOR: a fire beat overrides the cold default to a warm palette', R.fireWarm],
    ['COLOR: default is cold blue with moderate contrast', R.coldDefault],
    ['POLISH LINT: catches a missing visual question', R.catchesNoQ],
    ['POLISH LINT: catches an unclear eye path', R.catchesBadPath],
    ['POLISH LINT: catches a warm palette contradicting a dread beat', R.catchesWarmDread],
    ['POLISH LINT: catches an event-led eye path that starts on a person', R.catchesPersonFocus],
    ['INTEGRATION: every storyboard doc carries visualQuestion + eyePath + colorDirection', R.docsHaveFields],
    ['INTEGRATION: continuity lint runs in the Story Director build', R.continuityLintRan],
    ['INTEGRATION: visual polish lint runs in the storyboard build', R.polishLintRan],
    ['INTEGRATION: hero prompt emits VISUAL QUESTION + EYE PATH + COLOR DIRECTION', R.heroEmitsQ && R.heroEmitsEyePath && R.heroEmitsColor]
  ];

  let pass = 0, fail = 0;
  console.log('\n  PRODUCTION POLISH v1 — continuity + eye path + visual question + color  ($0)\n  ' + '─'.repeat(66));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(66) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
