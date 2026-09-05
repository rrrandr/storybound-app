// ARCHITECTURAL EXPERIMENT: is cross-panel continuity fundamentally better with per-panel generation
// than one-shot? Same v2 prompt/characters/beats. Render (a) one 2x2 sheet, (b) four INDEPENDENT panels.
// Score only continuity drift across the four panels of each.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad';

const SETUP = `
  const s = window.state;
  s.picks = Object.assign(s.picks||{}, { world:'Fantasy', worldSubtype:'the_inhuman', flavor:'the_inhuman', fantasyRegion:'the_veilwood', identity:{playerName:'Kael'}, pov:'3rd' });
  s.world='Fantasy'; s.fantasyRegion='the_veilwood'; s.protagonistName='Kael'; s.playerName='Kael';
  s._playerSpecies='First Favored'; s.gender='male'; s.gnArtist='ryo_toro';
  s._stagedRegionContract={ regionLabel:'the_veilwood', anchorImages:[] };
  window._oneShotSheet=true; window._oneShotSheetSize='2K'; window._promptAssemblyV2=true;
  window.__VS = {
    characters_present:['protagonist'],
    other_characters_present:[ {name:'Threxa',species:'Kwisheen',gender:'Female'}, {name:'Orun',species:'Kwisheen',gender:'Male'} ],
    li_visibility:'absent',
    pc_wardrobe:'the Veilweave — the glowing mesh veil refracting him into overlapping afterimages',
    pc_weapon:'The Answer',
    background:'the Veilwood at dusk — braided white mated-pair trees, white weeping veil-canopy, deep-crimson mated-braid spiralgrass'
  };
  const ph=(i,l,beat)=>({phaseIdx:i,label:l,_readerLearning:l,characters_present:['protagonist','threxa','orun'],props_present:[],li_visibility_phase:'absent',_shot:{distance:'medium',angle:'eye_level'},beat:beat,emotions:{protagonist:'fierce focus',threxa:'snarling fury',orun:'aggressive snarl'}});
  window.__PHASES=[
    ph(0,'Orientation','WIDE: Kael, a First Favored in the glowing mesh Veilweave, turns at bay as Threxa and Orun close in; he raises THE ANSWER.'),
    ph(1,'Threat','MEDIUM: Kael parries Threxa\\'s trident as Orun lunges, tentacles grappling the shaft.'),
    ph(2,'Decision','CLOSE: The Answer\\'s hook locked against Threxa\\'s trident; afterimages smear his position.'),
    ph(3,'Consequence','WIDE: Kael pins both Kwisheen against a braided trunk with The Answer.')
  ];
`;

(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  p.on('console', m => { const t=m.text(); if(/\[ONESHOT\] (v2|rendering|casting|species)/.test(t)) console.error('  > '+t.slice(0,120)); });
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:90000 });
  await p.waitForFunction(() => window.state && typeof window._renderOneShotSheet==='function', { timeout:40000 });
  await p.evaluate(SETUP);

  async function render(single, phaseIdxs) {
    return await p.evaluate(async ({ single, phaseIdxs }) => {
      window._v2SinglePanel = single;
      const phases = phaseIdxs.map(i => window.__PHASES[i]);
      try { await window._renderOneShotSheet(window.__VS, phases, 0, { phases: phases, beats: [] }); }
      catch (e) { return 'ERR:' + e.message; }
      return (window._lastOneShotSheet && window._lastOneShotSheet.url) || '';
    }, { single, phaseIdxs });
  }

  // (a) one-shot sheet — all four beats
  console.error('=== rendering ONE-SHOT sheet (4 beats) ===');
  const sheet = await render(false, [0,1,2,3]);
  if (sheet.indexOf('data:')===0) { fs.writeFileSync(OUT+'/exp_oneshot.png', Buffer.from(sheet.split(',')[1],'base64')); console.error('  saved exp_oneshot.png'); }
  else console.error('  sheet FAILED: '+String(sheet).slice(0,80));

  // (b) four INDEPENDENT panels — one beat each
  for (let i=0;i<4;i++){
    console.error('=== rendering INDEPENDENT panel '+(i+1)+' ===');
    const panel = await render(true, [i]);
    if (panel.indexOf('data:')===0) { fs.writeFileSync(OUT+'/exp_panel'+(i+1)+'.png', Buffer.from(panel.split(',')[1],'base64')); console.error('  saved exp_panel'+(i+1)+'.png'); }
    else console.error('  panel '+(i+1)+' FAILED: '+String(panel).slice(0,80));
  }
  await b.close();
  console.error('DONE');
})().catch(e => { console.error('HARNESS ERROR: '+e.message); process.exit(2); });
