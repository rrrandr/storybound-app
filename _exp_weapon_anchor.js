// EXPERIMENT: does a weapon reference anchor fix The Answer's class-substitution drift?
// Render the v2 sheet twice — once with the ORTHOGRAPHIC weapon anchor, once with the CINEMATIC one.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/f8f628bd-81c8-49d1-a1cd-f0b7bc1b48ee/scratchpad';
const ortho = fs.readFileSync(OUT + '/weapon_ortho.png').toString('base64');
const cine  = fs.readFileSync(OUT + '/weapon_cine.png').toString('base64');

const SETUP = `
  const s=window.state;
  s.picks=Object.assign(s.picks||{},{world:'Fantasy',worldSubtype:'the_inhuman',flavor:'the_inhuman',fantasyRegion:'the_veilwood',identity:{playerName:'Kael'},pov:'3rd'});
  s.world='Fantasy'; s.fantasyRegion='the_veilwood'; s.protagonistName='Kael'; s.playerName='Kael';
  s._playerSpecies='First Favored'; s.gender='male'; s.gnArtist='ryo_toro';
  s._stagedRegionContract={regionLabel:'the_veilwood',anchorImages:[]};
  window._oneShotSheet=true; window._oneShotSheetSize='2K'; window._promptAssemblyV2=true;
  window.__VS={characters_present:['protagonist'],other_characters_present:[{name:'Threxa',species:'Kwisheen',gender:'Female'},{name:'Orun',species:'Kwisheen',gender:'Male'}],li_visibility:'absent',pc_wardrobe:'the Veilweave — the glowing mesh veil refracting him into overlapping afterimages',pc_weapon:'The Answer',background:'the Veilwood at dusk — braided white mated-pair trees, white weeping veil-canopy, deep-crimson mated-braid spiralgrass'};
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
  p.on('console', m => { const t=m.text(); if(/\[EXP\]|\[ONESHOT\] rendering/.test(t)) console.error('  > '+t.slice(0,110)); });
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:90000 });
  await p.waitForFunction(() => window.state && typeof window._renderOneShotSheet==='function', { timeout:40000 });
  await p.evaluate(SETUP);

  async function sheet(tag, b64) {
    console.error('=== v2 sheet with '+tag+' weapon anchor ===');
    const url = await p.evaluate(async ({ b64 }) => {
      window._expWeaponAnchor = { b64: b64, label: 'THE ANSWER — WEAPON REFERENCE. Match the First Favored weapon to THIS exact shape: a double-ended polearm with a deep question-mark hook at BOTH ends. Small proportion variation is fine; never a trident, spear, or sword.' };
      try { await window._renderOneShotSheet(window.__VS, window.__PHASES, 0, { phases: window.__PHASES, beats: [] }); }
      catch (e) { return 'ERR:' + e.message; }
      return (window._lastOneShotSheet && window._lastOneShotSheet.url) || '';
    }, { b64 });
    if (url.indexOf('data:')===0) { fs.writeFileSync(OUT+'/wexp_'+tag+'.png', Buffer.from(url.split(',')[1],'base64')); console.error('  saved wexp_'+tag+'.png'); }
    else console.error('  '+tag+' FAILED: '+String(url).slice(0,80));
  }
  await sheet('ortho', ortho);
  await sheet('cine', cine);
  await b.close();
  console.error('DONE');
})().catch(e => { console.error('HARNESS ERROR: '+e.message); process.exit(2); });
