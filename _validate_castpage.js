const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  p.on('pageerror', e => console.error('PAGEERR ' + String(e).slice(0,160)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof window._buildSituatedCastPagePrompt === 'function' && typeof window._cgLayoutForCast === 'function', { timeout: 40000 });
  const out = await p.evaluate(() => {
    const s = window.state; s._starterId='starter_first_sacrifice'; s.gnArtist='ryo_toro';
    s.storybeau={name:'Julian'}; s.liRevealStatus={}; s.antagonistName='Threxa';
    const mk = (name, role, species, obscure) => ({ o:{name,role,species}, role, species, obscure:!!obscure,
      seedDesc: window._cgSeedVisualCanon(name), beat:{beat:'in the moment', emotion:'fierce'} });
    // 2-char case
    const m2 = [ mk('Kael','pc','First Favored'), mk('Threxa','antagonist','Kwisheen') ];
    const lay2 = window._cgLayoutForCast(m2).map(q=>q.type);
    const p2 = window._buildSituatedCastPagePrompt(window._cgLayoutForCast(m2), {background:'the Veilwood'});
    // 3-char case (Julian = obscured LI)
    const m3 = [ mk('Kael','pc','First Favored'), mk('Julian','li','First Favored', true), mk('Threxa','antagonist','Kwisheen') ];
    const lay3 = window._cgLayoutForCast(m3).map(q=>q.type);
    const p3 = window._buildSituatedCastPagePrompt(window._cgLayoutForCast(m3), {background:'a dawn Veilwood clearing'});
    return { lay2, lay3, p2, p3 };
  });
  console.error('=== 2-CHAR layout: [' + out.lay2.join(', ') + '] ===\n' + out.p2);
  console.error('\n\n=== 3-CHAR layout: [' + out.lay3.join(', ') + '] (Julian = obscured LI) ===\n' + out.p3);
  await b.close();
})().catch(e => { console.error('ERR ' + e.message); process.exit(2); });
