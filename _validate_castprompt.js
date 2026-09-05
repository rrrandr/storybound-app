const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  p.on('pageerror', e => console.error('PAGEERR ' + String(e).slice(0,140)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof window._buildCastSplashPrompt === 'function', { timeout: 40000 });
  const out = await p.evaluate(() => {
    const s = window.state; s.gnArtist = 'ryo_toro'; s.antagonistName = 'Threxa';
    const cast = [
      { name: 'Kael', role: 'protagonist', species: 'First Favored' },
      { name: 'Julian', role: 'antagonist', species: 'First Favored', desc: 'dark auburn hair, haunted, unarmed' },
      { name: 'Threxa', role: 'antagonist', species: 'Kwisheen' },
      { name: 'Orun', role: 'ally', species: 'Kwisheen' }
    ];
    return window._buildCastSplashPrompt(cast, { background: 'the Veilwood at dusk' });
  });
  console.error('=== CAST SPLASH PROMPT (' + out.length + ' chars) ===\n' + out);
  await b.close();
})().catch(e => { console.error('ERR ' + e.message); process.exit(2); });
