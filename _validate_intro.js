// FREE Phase-B slice-1 validation — exercises the GATE (_cgIntroRole) and the PROMPT builder
// (_buildIntroPortraitPrompt) only. NO fetch, NO spend. Confirms which characters qualify and that
// the portrait prompt is well-formed for a PC (First Favored) and an antagonist (Kwisheen).
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  p.on('pageerror', e => console.error('  PAGEERR ' + String(e).slice(0, 160)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => window.state && typeof window._cgIntroRole === 'function' && typeof window._buildIntroPortraitPrompt === 'function', { timeout: 40000 });

  const out = await p.evaluate(() => {
    const s = window.state;
    s.protagonistName = 'Kael'; s.playerName = 'Kael'; s._playerSpecies = 'First Favored'; s.gnArtist = 'ryo_toro';
    s.antagonistName = 'Threxa';
    s.storybeau = s.storybeau || {}; s.storybeau.name = 'Sivé';
    // Gate matrix
    const cands = [
      { name: 'Kael', isPC: true, species: 'First Favored' },
      { name: 'Threxa', species: 'Kwisheen' },                    // antagonist (via antagonistName)
      { name: 'Sivé', species: 'First Favored' },                 // LI (via storybeau.name)
      { name: 'Orun', species: 'Kwisheen', storyRole: 'ally' },   // role-flagged ally
      { name: 'Marn', species: 'human', storyRole: 'quest_giver' },
      { name: 'a dock worker', species: 'human' },                // bystander → no portrait
      { name: 'Petra', species: 'human', storyRole: 'bartender' } // minor role → no portrait
    ];
    const gate = cands.map(c => ({ name: c.name, role: window._cgIntroRole(c) || '(skip)' }));
    const visualState = { background: 'the Veilwood at dusk — braided white mated-pair trees, crimson mated-braid spiralgrass' };
    const pcPrompt = window._buildIntroPortraitPrompt({ name: 'Kael', isPC: true, species: 'First Favored' }, 'pc', visualState);
    const agPrompt = window._buildIntroPortraitPrompt({ name: 'Threxa', species: 'Kwisheen', desc: 'teal-and-violet coral dreadlocks, shell harness, gold veining' }, 'antagonist', visualState);
    return { gate, pcPrompt, agPrompt };
  });
  console.error('=== GATE MATRIX (who earns a portrait) ===');
  out.gate.forEach(g => console.error('  ' + (g.name + '                 ').slice(0, 16) + ' → ' + g.role));
  console.error('\n=== PC PROMPT (Kael, First Favored) — ' + out.pcPrompt.length + ' chars ===\n' + out.pcPrompt);
  console.error('\n=== ANTAGONIST PROMPT (Threxa, Kwisheen) — ' + out.agPrompt.length + ' chars ===\n' + out.agPrompt);
  await b.close();
})().catch(e => { console.error('HARNESS ERROR: ' + e.message); process.exit(2); });
