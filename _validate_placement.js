// PLACEMENT validation — re-runs the EXACT _validate_v2.js scene/inputs (single variable = the
// committed placement fix). Captures the v2 prompt's per-panel FRAMING lines (the "requested"
// spec, for the requested-vs-observed audit) and — only when RENDER=1 — fires ONE paid 4K sheet.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad';
const RENDER = process.env.RENDER === '1';

(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
  const logs = [];
  p.on('console', m => { const t = m.text(); if (/\[(ONESHOT|CASTING|STAGED)/.test(t)) { logs.push(t.slice(0, 200)); } });
  p.on('pageerror', e => console.error('  PAGEERR ' + String(e).slice(0, 160)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.state && typeof window._renderOneShotSheet === 'function' && typeof window._buildSheetPromptV2 === 'function', { timeout: 40000 });

  const result = await p.evaluate(async (doRender) => {
    const s = window.state;
    s.picks = Object.assign(s.picks || {}, { world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman', fantasyRegion: 'the_veilwood', identity: { playerName: 'Kael' }, pov: '3rd' });
    s.world = 'Fantasy'; s.fantasyRegion = 'the_veilwood'; s.protagonistName = 'Kael'; s.playerName = 'Kael';
    s._playerSpecies = 'First Favored'; s.gender = 'male'; s.gnArtist = 'ryo_toro';
    s._stagedRegionContract = { regionLabel: 'the_veilwood', anchorImages: [] };
    window._oneShotSheet = true; window._oneShotSheetSize = '4K'; window._promptAssemblyV2 = true;

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

    let err = '', sheetUrl = '', prompt = '';
    try { prompt = window._buildSheetPromptV2(visualState, phases, 0, planMeta) || ''; } catch (e) { err += 'promptErr:' + e.message + '; '; }
    if (doRender) {
      try {
        await window._renderOneShotSheet(visualState, phases, 0, planMeta);
        sheetUrl = (window._lastOneShotSheet && window._lastOneShotSheet.url) || '';
      } catch (e) { err += 'renderErr:' + e.message; }
    }
    return { sheetUrl, prompt, err };
  }, RENDER);

  // Extract the framing-relevant lines from the assembled prompt.
  const lines = (result.prompt || '').split('\n');
  const camGlobal = lines.filter(l => /^CAMERA IS A CONSEQUENCE/.test(l));
  const decouple = lines.filter(l => /Reference-matching governs/.test(l));
  const blocking = lines.filter(l => /^BLOCKING \(/.test(l));
  const camera = lines.filter(l => /^CAMERA \(photograph/.test(l));
  const panelHdrs = lines.filter(l => /^\s*\d\)\s/.test(l));
  fs.writeFileSync(OUT + '/placement_prompt.txt', result.prompt || '(none)');
  console.error('=== promptLen=' + (result.prompt || '').length + ' err=' + (result.err || 'none') + ' RENDER=' + RENDER + ' ===');
  console.error('--- global blocking-first line present: ' + (camGlobal.length ? 'YES' : 'NO') + ' ---');
  camGlobal.forEach(l => console.error('  ' + l.slice(0, 160) + '…'));
  console.error('--- clarity/centering decouple line present: ' + (decouple.length ? 'YES' : 'NO') + ' ---');
  console.error('--- per-panel BLOCKING (classified situation + arrangement) ---');
  blocking.forEach((l, i) => console.error('  P' + (i + 1) + ': ' + l.trim()));
  console.error('--- per-panel CAMERA (derived from blocking) ---');
  camera.forEach((l, i) => console.error('  P' + (i + 1) + ': ' + l.trim()));
  console.error('--- panel headers count=' + panelHdrs.length + ' ---');

  if (RENDER && result.sheetUrl && result.sheetUrl.indexOf('data:') === 0) {
    fs.writeFileSync(OUT + '/placement_sheet.png', Buffer.from(result.sheetUrl.split(',')[1], 'base64'));
    console.error('SHEET SAVED → placement_sheet.png');
  } else if (RENDER) {
    console.error('NO SHEET URL (' + String(result.sheetUrl).slice(0, 80) + ')');
  }
  await b.close();
  console.error('DONE');
})().catch(e => { console.error('HARNESS ERROR: ' + e.message); process.exit(2); });
