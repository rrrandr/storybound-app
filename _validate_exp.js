// REAL-PIPELINE validation: drive window._renderOneShotSheet (the production sheet path) with a
// Veilwood combat scene (Kael FF/PC + Threxa/Orun Kwisheen NPCs), so the wired directives AND the
// casting-anchor reinject actually fire. Saves the pre-split sheet + the ref/attach logs.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad';

(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  const logs = [];
  p.on('console', m => { const t = m.text(); if (/\[(ONESHOT|CASTING|STAGED)/.test(t)) { logs.push(t.slice(0, 200)); console.error('  > ' + t.slice(0, 160)); } });
  p.on('pageerror', e => console.error('  PAGEERR ' + String(e).slice(0, 160)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.state && typeof window._renderOneShotSheet === 'function' && typeof window._buildOneShotSheetPrompt === 'function', { timeout: 40000 });

  const result = await p.evaluate(async () => {
    const s = window.state;
    // Story/region/artist state for a Fatelands Veilwood scene.
    s.picks = Object.assign(s.picks || {}, { world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman', fantasyRegion: 'the_veilwood', identity: { playerName: 'Kael' }, pov: '3rd' });
    s.world = 'Fantasy'; s.fantasyRegion = 'the_veilwood'; s.protagonistName = 'Kael'; s.playerName = 'Kael';
    s._playerSpecies = 'First Favored'; s.gnArtist = 'ryo_toro';
    s._stagedRegionContract = { regionLabel: 'the_veilwood', anchorImages: [] };
    window._oneShotSheet = true; window._oneShotSheetSize = '4K'; window._expSuppressSpecies = ['kwisheen'];

    const visualState = {
      characters_present: ['protagonist'],
      other_characters_present: [
        { name: 'Threxa', species: 'Kwisheen', gender: 'Female' },
        { name: 'Orun', species: 'Kwisheen', gender: 'Male' }
      ],
      li_visibility: 'absent',
      pc_wardrobe: 'the Veilweave — the glowing mesh veil refracting him into overlapping afterimages',
      pc_weapon: 'The Answer',
      background: 'the Veilwood at dusk — braided white mated-pair trees, white weeping veil-canopy, deep-crimson mated-braid spiralgrass'
    };
    const sh = (d, a) => ({ distance: d, angle: a });
    const ph = (i, l, beat) => ({ phaseIdx: i, label: l, _readerLearning: l, characters_present: ['protagonist', 'threxa', 'orun'], props_present: [], li_visibility_phase: 'absent', _shot: sh('medium', 'eye_level'), beat: beat, emotions: { protagonist: 'fierce focus', threxa: 'snarling fury', orun: 'aggressive snarl' } });
    const phases = [
      ph(0, 'Orientation', 'WIDE: Kael, a First Favored in the glowing mesh Veilweave (refracted into overlapping afterimages), turns at bay in the Veilwood as two Kwisheen — Threxa and Orun — close in through the white veil-curtains; he raises THE ANSWER, his double question-mark-hook polearm. Threxa glares, snarling.'),
      ph(1, 'Threat', 'MEDIUM: Kael sweeps The Answer to parry Threxa\'s tide-trident as Orun lunges from the other side, tentacles lashing tactically to grapple the shaft — Kwisheen combat, tentacles longer than legs and gripping. Faces fierce.'),
      ph(2, 'Decision', 'CLOSE: The Answer\'s serrated hook locked against Threxa\'s trident, sparks flying; Kael\'s Veilweave afterimages smear his position while both Kwisheen strike at the wrong copies. Threxa yells.'),
      ph(3, 'Consequence', 'WIDE: pull back — braided white mated-pair trunks, white weeping canopy, crimson mated-braid grass; Kael pins both Kwisheen against a braided trunk with The Answer as they strain.')
    ];
    const planMeta = { phases: phases, beats: [] };

    let err = '';
    let sheetUrl = '';
    let promptLen = 0;
    try { promptLen = (window._buildOneShotSheetPrompt(visualState, phases, 0, planMeta) || '').length; } catch (e) { err += 'promptErr:' + e.message + '; '; }
    try {
      const res = await window._renderOneShotSheet(visualState, phases, 0, planMeta);
      void res;
      sheetUrl = (window._lastOneShotSheet && window._lastOneShotSheet.url) || '';
    } catch (e) { err += 'renderErr:' + e.message; }
    return { sheetUrl: sheetUrl, promptLen: promptLen, err: err };
  });

  console.error('=== promptLen=' + result.promptLen + ' err=' + (result.err || 'none') + ' ===');
  fs.writeFileSync(OUT + '/exp_logs.txt', logs.join('\n'));
  if (result.sheetUrl && result.sheetUrl.indexOf('data:') === 0) {
    fs.writeFileSync(OUT + '/exp_sheet.png', Buffer.from(result.sheetUrl.split(',')[1], 'base64'));
    console.error('SHEET SAVED → validate_sheet.png');
  } else {
    console.error('NO SHEET URL (' + String(result.sheetUrl).slice(0, 80) + ')');
  }
  await b.close();
  console.error('DONE');
})().catch(e => { console.error('HARNESS ERROR: ' + e.message); process.exit(2); });
