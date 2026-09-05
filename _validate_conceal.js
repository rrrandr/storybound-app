const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  p.on('pageerror', e => console.error('PAGEERR ' + String(e).slice(0,160)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof window._cgConcealForLI === 'function', { timeout: 45000 });
  const out = await p.evaluate(() => {
    window.state._liConcealHistory = {};
    const seq = [];
    for (let i = 0; i < 12; i++) seq.push(window._cgConcealForLI({ name: 'Julian' }, 'black hair; silver Weave-Script; a scar over the left wrist'));
    return seq;
  });
  out.forEach((s, i) => console.error('  #' + i + '  ' + s.slice(0, 90)));
  const ots = out.slice(1).filter(s => /OVER-THE-SHOULDER|PROFILE/.test(s)).length;
  console.error('  → OTS after intro: ' + ots + '/' + (out.length-1) + ' (' + Math.round(ots/(out.length-1)*100) + '%)');
  await b.close();
})().catch(e => { console.error('ERR ' + e.message); process.exit(2); });
