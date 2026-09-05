// Combat render validating: gossamer Veilweave (not fishnet), The Answer v2 (opposed hooks), and the
// species ICHOR (FF quicksilver + Kwisheen black ink) — via the REAL v2 combat-sheet path. Also a gore-
// ceiling probe: a FF severing a Kwisheen's tentacles AS the Kwisheen beheads the FF, cross-sections +
// ichor everywhere. One 4K sheet.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad';

(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  const logs = [];
  p.on('console', m => { const t = m.text(); if (/\[(ONESHOT|CASTING|STAGED)/.test(t)) logs.push(t.slice(0, 180)); });
  p.on('pageerror', e => console.error('  PAGEERR ' + String(e).slice(0, 160)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.state && typeof window._renderOneShotSheet === 'function' && typeof window._buildSheetPromptV2 === 'function', { timeout: 45000 });

  const result = await p.evaluate(async () => {
    const s = window.state;
    s.picks = Object.assign(s.picks || {}, { world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman', fantasyRegion: 'the_veilwood', identity: { playerName: 'Kael' }, pov: '3rd' });
    s.world = 'Fantasy'; s.fantasyRegion = 'the_veilwood'; s.protagonistName = 'Kael'; s.playerName = 'Kael';
    s._playerSpecies = 'First Favored'; s.gender = 'male'; s.gnArtist = 'ryo_toro';
    s._stagedRegionContract = { regionLabel: 'the_veilwood', anchorImages: [] };
    window._oneShotSheet = true; window._oneShotSheetSize = '4K'; window._promptAssemblyV2 = true;

    const visualState = {
      characters_present: ['protagonist'],
      other_characters_present: [{ name: 'Threxa', species: 'Kwisheen', gender: 'Female' }],
      li_visibility: 'absent',
      pc_wardrobe: 'the Veilweave — the flowing many-layered gossamer cloak (gold filament) refracting him into overlapping afterimages',
      pc_weapon: 'The Answer',
      background: 'the Veilwood at dusk — braided white mated-pair trees, white weeping veil-canopy, deep-crimson mated-braid spiralgrass; a brutal fight'
    };
    const sh = (d, a) => ({ distance: d, angle: a });
    const ph = (i, l, beat, emo) => ({ phaseIdx: i, label: l, _readerLearning: l, characters_present: ['protagonist', 'threxa'], props_present: [], li_visibility_phase: 'absent', _shot: sh('medium', 'eye_level'), beat: beat, emotions: emo });
    const phases = [
      ph(0, 'Threat', 'Kael — a male First Favored in the flowing gossamer VEILWEAVE (a long many-layered translucent cloak threaded with thin gold filament, refracting him into ~6 overlapping afterimages) — drives in wielding THE ANSWER, a double-ended polearm whose two deep question-mark HOOKS point in OPPOSITE directions (one up, one down). Threxa the Kwisheen rears, her six waist-tentacles lashing, her tide-trident rising to meet him.', { protagonist: 'cold ferocity', threxa: 'snarling fury' }),
      ph(1, 'Transformation', 'Kael sweeps THE ANSWER low and its hooked blade SHEARS CLEAN THROUGH three of Threxa\'s waist-tentacles, severing them — a spray of BLACK INK erupts (Kwisheen bleed inky black, never red), the cut tentacle stumps showing the pale cross-section of cephalopod muscle and vessels. Threxa shrieks, ink misting the air.', { protagonist: 'grim focus', threxa: 'agony and rage' }),
      ph(2, 'Decision', 'In the SAME instant Threxa\'s tide-trident takes Kael\'s HEAD from his shoulders — a fountain of QUICKSILVER erupts from the neck (First Favored bleed mirror-silver liquid metal, never red), beading in the air; the severed neck\'s cross-section is visible, his scattering gossamer afterimages collapsing as the true body drops.', { protagonist: 'the last flash of a fierce face', threxa: 'savage triumph through pain' }),
      ph(3, 'Consequence', 'The aftermath — Kael\'s headless First Favored body and Threxa\'s severed tentacle-stumps among the crimson mated-braid grass; the air is a storm of flying QUICKSILVER droplets (mirror-silver) and BLACK INK, severed tentacles and the fallen head scattered — the two destroyed one another together.', { threxa: 'ragged, ruined, still standing' })
    ];
    const planMeta = { phases: phases, beats: [] };

    let err = '', sheetUrl = '', promptLen = 0;
    try { promptLen = (window._buildSheetPromptV2(visualState, phases, 0, planMeta) || '').length; } catch (e) { err += 'promptErr:' + e.message + '; '; }
    try { await window._renderOneShotSheet(visualState, phases, 0, planMeta); sheetUrl = (window._lastOneShotSheet && window._lastOneShotSheet.url) || ''; }
    catch (e) { err += 'renderErr:' + e.message; }
    return { sheetUrl, err, promptLen };
  });

  console.error('=== promptLen=' + result.promptLen + ' err=' + (result.err || 'none') + ' ===');
  if (result.sheetUrl && result.sheetUrl.indexOf('data:') === 0) { fs.writeFileSync(OUT + '/gore_sheet.png', Buffer.from(result.sheetUrl.split(',')[1], 'base64')); console.error('SAVED gore_sheet.png'); }
  else console.error('NO SHEET (' + String(result.sheetUrl).slice(0, 90) + ')');
  await b.close();
})().catch(e => { console.error('HARNESS ERROR: ' + e.message); process.exit(2); });
