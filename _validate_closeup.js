const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  p.on('pageerror', e => console.error('PAGEERR ' + String(e).slice(0,160)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof window._cgLayoutForCast === 'function' && typeof window._buildSituatedCastPagePrompt === 'function', { timeout: 45000 });
  const out = await p.evaluate(() => {
    const s = window.state; s._starterId='starter_first_sacrifice'; s.gnArtist='ryo_toro'; s._playerSpecies='First Favored'; s.storybeau={name:'Julian'}; s.liRevealStatus={};
    const mk=(name,role,species,obscure)=>({o:{name,role,species},role,species,obscure:!!obscure,seedDesc:window._cgSeedVisualCanon(name),beat:{beat:'in the moment',emotion:'fear'}});
    const mains=[mk('Elara','pc','First Favored'), mk('Julian','li','First Favored',true)];
    // planner-specified story closeups (the kid + the PC weave-script)
    const closeups=['the youth kneeling mid-rite, face buckling in distress as his wish twists', 'EXTREME close-up of Elara’s silver Weave-Script flushing with dread'];
    const layout=window._cgLayoutForCast(mains, closeups).map(q=>q.type);
    const prompt=window._buildSituatedCastPagePrompt(window._cgLayoutForCast(mains, closeups), {background:'a dawn Veilwood clearing, a kneeling youth mid-rite'}, false);
    return { layout, closeupLines: (prompt.match(/STORY CLOSE-UP[^\n]*/g)||[]) };
  });
  console.error('layout: [' + out.layout.join(', ') + ']');
  out.closeupLines.forEach((l,i)=>console.error('  Q'+(i+3)+': '+l.slice(0,120)));
  await b.close();
})().catch(e => { console.error('ERR ' + e.message); process.exit(2); });
