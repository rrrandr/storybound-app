const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  p.on('pageerror', e => console.error('PAGEERR ' + String(e).slice(0,160)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof window._buildIntroPortraitPrompt === 'function' && typeof window._cgIsCombatScene === 'function', { timeout: 45000 });
  const out = await p.evaluate(() => {
    const s = window.state; s._starterId='starter_first_sacrifice'; s.gnArtist='ryo_toro'; s._playerSpecies='First Favored';
    const vsCeremony = { background: 'a dawn Veilwood clearing, a kneeling youth mid-rite, veil-curtains' };
    const vsBattle = { background: 'the Veilwood — a desperate fight, Kael strikes as two Kwisheen attack, blades clash' };
    const isCombatCeremony = window._cgIsCombatScene(vsCeremony, []);
    const isCombatBattle = window._cgIsCombatScene(vsBattle, []);
    const pcCeremony = window._buildIntroPortraitPrompt({name:'Elara', species:'First Favored'}, 'pc', vsCeremony, { combat: isCombatCeremony });
    const pcBattle = window._buildIntroPortraitPrompt({name:'Kael', species:'First Favored'}, 'pc', vsBattle, { combat: isCombatBattle });
    const grab = (t) => (t.match(/gossamer TUNIC[^\n]*|MESH VEILWEAVE[^\n]*|UNARMED[^\n]*|Carries THE ANSWER[^\n]*/g)||[]).map(x=>x.slice(0,70));
    return { isCombatCeremony, isCombatBattle, ceremonyWard: grab(pcCeremony), battleWard: grab(pcBattle) };
  });
  console.error('ceremony isCombat=' + out.isCombatCeremony + ' → ' + JSON.stringify(out.ceremonyWard, null, 0));
  console.error('battle   isCombat=' + out.isCombatBattle + ' → ' + JSON.stringify(out.battleWard, null, 0));
  await b.close();
})().catch(e => { console.error('ERR ' + e.message); process.exit(2); });
