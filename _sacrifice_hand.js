// $0 SACRIFICE HAND — the shadowy HAND OF FATE takes the price: over the body part for a tangible
// cost (eye / limb / voice / memory), over the HEART for an inner cost (years / courage / love).
// Plus: the player's paid rails (Petition / Tempt) inherit Fate's burst + shadow-hand. localhost:3000.
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof window._sacrificeHandTarget === 'function' && typeof window._buildStoryDirector === 'function', { timeout: 15000 });

  const R = await page.evaluate(() => {
    const tgt = (t) => window._sacrificeHandTarget(t);

    // ── tangible costs → the hand over that body part ──
    const eye = tgt('Fate takes her right eye as the price.');
    const eyeOk = /over[^.]*EYE/i.test(eye.where) && eye.inner === false;
    const voice = tgt('the price is her voice, her song silenced');
    const voiceOk = /MOUTH and throat/i.test(voice.where) && voice.inner === false;
    const arm = tgt('the shadow closes over his arm, the limb the cost');
    const armOk = /ARM/i.test(arm.where) && arm.inner === false;
    const mem = tgt('a memory of her mother is drawn out');
    const memOk = /TEMPLE/i.test(mem.where) && mem.inner === false;
    const name = tgt('Fate takes her name, who she is');
    const nameOk = /brow|name\/identity/i.test(name.where) && name.inner === false;

    // ── inner / intangible costs → the hand over the HEART ──
    const years = tgt('a year of my strength, offered to the tide');
    const yearsOk = /HEART/i.test(years.where) && years.inner === true;
    const courage = tgt('the price is his courage, drained from him');
    const courageOk = /HEART/i.test(courage.where) && courage.inner === true;
    const love = tgt('she gives up the love she carries');
    const loveOk = /HEART/i.test(love.where) && love.inner === true;
    // an unspecified/abstract cost defaults to the heart (inner)
    const vague = tgt('Fate exacts its due');
    const vagueInner = /HEART/i.test(vague.where) && vague.inner === true;

    // ── the grammar string: shadowy hand of Fate, fingers-and-palm (not ambient darkness) ──
    const g = window._sacrificeHandGrammar('Fate takes her eye');
    const grammarOk = /SHADOWY HAND OF FATE/i.test(g) && /fingers and palm/i.test(g) && /over the wisher's EYE/i.test(g) && /NOT ambient darkness/i.test(g);
    const gInner = window._sacrificeHandGrammar('a year of life offered');
    const grammarInnerOk = /OVER THE HEART/i.test(gInner) && /INNER sacrifice/i.test(gInner);

    // ── INTEGRATION: a sacrifice beat → the panel carries the located shadow-hand ──
    const s = window.state || (window.state = {});
    s.storyId = 'e2e-sac'; s._playerSpecies = 'human'; s._liSpecies = '';
    const mkPlan = () => ({
      visualState: { background: 'coral ruins', other_characters_present: [{ name: 'Kesh', species: 'kwisheen', position: 'a raider' }] },
      phases: [{ phaseIdx: 0, startBeat: 0, label: 'x', characters_present: ['protagonist', 'Kesh'], props_present: [], li_visibility_phase: 'absent' }],
      beats: [
        { idx: 0, kind: 'narration', text: 'The raider corners me.' },
        { idx: 1, kind: 'narration', text: '"Fate beneath the turning tide." He voices the wish, tide-light gathering.' },
        { idx: 2, kind: 'narration', text: 'The water warms and the passage opens. The price: Fate takes his right eye.' }
      ]
    });
    delete s.temptFateWish; delete s._activePetition;
    const plan = mkPlan();
    window._buildStoryDirector(plan, 0);
    // the sacrifice grammar attaches to WHICHEVER panel carries the price text (here, the eye cost)
    const allCues = (plan.phases || []).map(p => (p._panel && p._panel.grammarCues || []).join(' ')).join(' || ');
    const sacrificePanelHasHand = /SHADOWY HAND OF FATE/i.test(allCues) && /over the wisher's EYE/i.test(allCues);

    // ── PETITION / TEMPT inherit the burst: with a Tempt active, the wish panel gets Fate's burst ──
    s.temptFateWish = { text: 'I wish to reach the surface' };
    const planTempt = mkPlan();
    window._buildStoryDirector(planTempt, 0);
    const tPhase = (planTempt.phases || []).find(p => p._readerLearning === 'Transformation');
    const temptBurst = /golden|sparkle stars/i.test((tPhase && tPhase._panel && tPhase._panel.grammarCues || []).join(' '));
    const railDetectedTempt = window._sdWishRailActive() === 'tempt';
    delete s.temptFateWish;
    s._activePetition = { id: 'p1' };
    const railDetectedPetition = window._sdWishRailActive() === 'petition';
    delete s._activePetition;
    const railNullWhenNone = window._sdWishRailActive() === null;

    return {
      eyeOk, voiceOk, armOk, memOk, nameOk, yearsOk, courageOk, loveOk, vagueInner,
      grammarOk, grammarInnerOk, sacrificePanelHasHand, temptBurst,
      railDetectedTempt, railDetectedPetition, railNullWhenNone
    };
  });

  await browser.close();

  const checks = [
    ['tangible: an EYE cost → shadow-hand over the eye', R.eyeOk],
    ['tangible: a VOICE cost → shadow-hand over the mouth/throat', R.voiceOk],
    ['tangible: a LIMB cost → shadow-hand over the arm', R.armOk],
    ['tangible: a MEMORY cost → shadow-hand at the temple/brow', R.memOk],
    ['tangible: a NAME/identity cost → shadow-hand over the brow', R.nameOk],
    ['inner: YEARS of life → shadow-hand over the HEART', R.yearsOk],
    ['inner: COURAGE → shadow-hand over the HEART', R.courageOk],
    ['inner: LOVE → shadow-hand over the HEART', R.loveOk],
    ['inner: an unspecified cost defaults to the HEART', R.vagueInner],
    ['grammar: shadowy HAND OF FATE, fingers-and-palm, not ambient darkness, located', R.grammarOk],
    ['grammar: an inner cost explicitly rests OVER THE HEART', R.grammarInnerOk],
    ['INTEGRATION: a sacrifice beat gives the panel the located shadow-hand', R.sacrificePanelHasHand],
    ['PETITION/TEMPT: a Tempt-active wish panel inherits Fate\'s golden burst', R.temptBurst],
    ['rail detection: Tempt active → "tempt"', R.railDetectedTempt],
    ['rail detection: Petition active → "petition"', R.railDetectedPetition],
    ['rail detection: null when no paid rail is active', R.railNullWhenNone]
  ];

  let pass = 0, fail = 0;
  console.log('\n  SACRIFICE HAND — the shadowy hand of Fate + Petition/Tempt burst  ($0)\n  ' + '─'.repeat(64));
  for (const [name, ok] of checks) { ok ? pass++ : fail++; console.log('  ' + (ok ? '✓' : '✗') + ' ' + name); }
  if (errors.length) console.log('  · pageerrors: ' + errors.join(' | '));
  console.log('  ' + '─'.repeat(64) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
