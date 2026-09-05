// FREE (no paid render): dump the actual 43K one-shot prompt the pipeline builds, for attention-budget analysis.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad';
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.state && typeof window._buildOneShotSheetPrompt === 'function', { timeout: 40000 });
  const prompt = await p.evaluate(() => {
    const s = window.state;
    s.picks = Object.assign(s.picks || {}, { world: 'Fantasy', worldSubtype: 'the_inhuman', flavor: 'the_inhuman', fantasyRegion: 'the_veilwood', identity: { playerName: 'Kael' }, pov: '3rd' });
    s.world = 'Fantasy'; s.fantasyRegion = 'the_veilwood'; s.protagonistName = 'Kael'; s.playerName = 'Kael';
    s._playerSpecies = 'First Favored'; s.gnArtist = 'ryo_toro';
    s._stagedRegionContract = { regionLabel: 'the_veilwood', anchorImages: [] };
    const visualState = {
      characters_present: ['protagonist'],
      other_characters_present: [ { name: 'Threxa', species: 'Kwisheen', gender: 'Female' }, { name: 'Orun', species: 'Kwisheen', gender: 'Male' } ],
      li_visibility: 'absent',
      pc_wardrobe: 'the Veilweave — the glowing mesh veil refracting him into overlapping afterimages',
      pc_weapon: 'The Answer',
      background: 'the Veilwood at dusk — braided white mated-pair trees, white weeping veil-canopy, deep-crimson mated-braid spiralgrass'
    };
    const sh = (d, a) => ({ distance: d, angle: a });
    const ph = (i, l, beat) => ({ phaseIdx: i, label: l, _readerLearning: l, characters_present: ['protagonist', 'threxa', 'orun'], props_present: [], li_visibility_phase: 'absent', _shot: sh('medium', 'eye_level'), beat: beat, emotions: { protagonist: 'fierce focus', threxa: 'snarling fury', orun: 'aggressive snarl' } });
    const phases = [
      ph(0, 'Orientation', 'WIDE: Kael, a First Favored in the glowing mesh Veilweave, turns at bay as Threxa and Orun close in; he raises THE ANSWER.'),
      ph(1, 'Threat', 'MEDIUM: Kael parries Threxa\'s trident as Orun lunges, tentacles grappling the shaft.'),
      ph(2, 'Decision', 'CLOSE: The Answer\'s hook locked against Threxa\'s trident; afterimages smear his position.'),
      ph(3, 'Consequence', 'WIDE: Kael pins both Kwisheen against a braided trunk with The Answer.')
    ];
    try { return window._buildOneShotSheetPrompt(visualState, phases, 0, { phases: phases, beats: [] }) || ''; } catch (e) { return 'ERR:' + e.message; }
  });
  fs.writeFileSync(OUT + '/full_prompt.txt', prompt);
  console.error('prompt dumped: ' + prompt.length + ' chars → full_prompt.txt');
  await b.close();
})().catch(e => { console.error('ERR ' + e.message); process.exit(2); });
