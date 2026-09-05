// LIVE validation render (Roman-approved) — drives the REAL _renderIntroCardsForScene for First Sacrifice
// Scene 1: PC (female First Favored, situated) + Julian (mystery LI → from-behind BLACK SILHOUETTE intro).
// 2 mains → count-adaptive 2x2 premium page (2 full-body + 2 detail insets). ONE 4K render (~$0.15).
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad';

(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  const logs = [];
  p.on('console', m => { const t = m.text(); if (/\[(CAST-PAGE|INTRO|ONESHOT|CASTING)/.test(t)) { logs.push(t.slice(0, 200)); console.error('  > ' + t.slice(0, 150)); } });
  p.on('pageerror', e => console.error('  PAGEERR ' + String(e).slice(0, 200)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof window._renderIntroCardsForScene === 'function' && typeof window._splitSheetQuadrants === 'function', { timeout: 45000 });

  const result = await p.evaluate(async () => {
    const s = window.state;
    // First Sacrifice Scene-1 state
    s._starterId = 'starter_first_sacrifice'; s.gnArtist = 'ryo_toro';
    s.protagonistName = 'Elara'; s.playerName = 'Elara'; s._playerSpecies = 'First Favored'; s.gender = 'female';
    s.storybeau = s.storybeau || {}; s.storybeau.name = 'Julian';
    s.liRevealStatus = {};                       // Julian NOT revealed → obscured
    s.turnCount = 0;
    // fresh per-issue CG state so Julian is his FIRST appearance (n=0 → from-behind silhouette)
    s._introducedCast = {}; s._castCards = {}; s._liConcealHistory = {};

    const visualState = {
      characters_present: ['protagonist'],
      other_characters_present: [{ name: 'Julian', species: 'First Favored', role: 'li' }],
      background: 'a dawn Veilwood clearing — pale braided white trees, veil-curtains, a kneeling youth mid-rite, crimson spiralgrass'
    };
    const phases = [
      { _readerLearning: 'Orientation', emotions: { elara: 'horror and dawning dread as her student’s First Sacrifice twists', julian: 'unreadable, watchful stillness' },
        beat: 'the supervisor realizes the youth’s wish is going wrong; Julian watches from the edge' }
    ];

    let err = '', pageUrl = '', quads = null, conceal = '';
    try {
      const res = await window._renderIntroCardsForScene(visualState, phases, 0);
      pageUrl = (res && res[0] && res[0].imageUrl) || (window._lastCastSplash && window._lastCastSplash.url) || '';
      if (pageUrl) quads = await window._splitSheetQuadrants(pageUrl);
      conceal = 'julian conceal appearances=' + ((s._liConcealHistory && s._liConcealHistory.julian) || 0);
    } catch (e) { err = e.message; }
    return { pageUrl, quads, err, conceal, castCards: Object.keys(s._castCards || {}) };
  });

  console.error('=== err=' + (result.err || 'none') + ' | ' + result.conceal + ' | castCards=[' + result.castCards.join(',') + '] ===');
  if (result.pageUrl && result.pageUrl.indexOf('data:') === 0) {
    fs.writeFileSync(OUT + '/intro_page.png', Buffer.from(result.pageUrl.split(',')[1], 'base64'));
    console.error('SAVED intro_page.png');
  } else { console.error('NO PAGE URL (' + String(result.pageUrl).slice(0, 80) + ')'); }
  if (result.quads) result.quads.forEach((q, i) => { if (q && q.indexOf('data:') === 0) fs.writeFileSync(OUT + '/intro_q' + (i + 1) + '.png', Buffer.from(q.split(',')[1], 'base64')); });
  await b.close();
})().catch(e => { console.error('HARNESS ERROR: ' + e.message); process.exit(2); });
