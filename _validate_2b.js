const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  p.on('pageerror', e => console.error('PAGEERR ' + String(e).slice(0,160)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof window._renderSituatedIntro === 'function' && typeof window._cgSeedVisualCanon === 'function', { timeout: 40000 });
  const out = await p.evaluate(() => {
    const s = window.state;
    s._starterId = 'starter_first_sacrifice'; s.gnArtist = 'ryo_toro';
    s.storybeau = s.storybeau || {}; s.storybeau.name = 'Julian';
    s.liRevealStatus = {}; // nothing revealed yet → LI face should obscure
    const seedJulian = window._cgSeedVisualCanon('Julian');
    const beat = window._cgIntroBeatFor({name:'Julian'}, 'li', {}, [{emotions:{julian:'quiet, unreadable stillness'}}]);
    const faceRevealed = window._cgLIFaceRevealed({name:'Julian'}, 'li');
    const liPrompt = window._buildIntroPortraitPrompt(
      {name:'Julian', species:'First Favored'}, 'li',
      {background:'a dawn Veilwood clearing, veil-curtains, a kneeling youth'},
      { seedDesc: seedJulian, beat: beat, obscureFace: !faceRevealed }
    );
    // now flip a reveal on → face should show
    s.liRevealStatus = { julian_0: 'revealed' };
    const faceRevealed2 = window._cgLIFaceRevealed({name:'Julian'}, 'li');
    return {
      flagOff: window._cgSituatedIntros === undefined || window._cgSituatedIntros === false,
      seedJulian, faceRevealed_beforeReveal: faceRevealed, faceRevealed_afterReveal: faceRevealed2,
      liPrompt
    };
  });
  console.error('=== flag default OFF: ' + out.flagOff + ' ===');
  console.error('=== seed visualCanon for Julian ===\n  ' + (out.seedJulian || '(EMPTY — seed lacks Julian visualCanon)'));
  console.error('=== LI face-reveal gate: before-reveal=' + out.faceRevealed_beforeReveal + '  after-reveal=' + out.faceRevealed_afterReveal + ' ===');
  console.error('=== SITUATED + OBSCURED LI PROMPT (Julian) ===\n' + out.liPrompt);
  await b.close();
})().catch(e => { console.error('ERR ' + e.message); process.exit(2); });
