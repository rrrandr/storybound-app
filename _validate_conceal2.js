const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof window._cgConcealForLI === 'function', { timeout: 45000 });
  const out = await p.evaluate(() => {
    window.state._liConcealHistory = {};
    const seq = [];
    for (let i = 0; i < 24; i++) seq.push(window._cgConcealForLI({ name: 'Julian' }, 'black hair'));
    return seq;
  });
  const ots = out.slice(1).filter(s => /OVER-THE-SHOULDER|PROFILE|BEHIND/.test(s)).length;
  console.error('  intro #0: ' + out[0].slice(0,55));
  console.error('  variety turns: ' + out.map((s,i)=>({s,i})).filter(x=>!/OVER-THE-SHOULDER|PROFILE|BEHIND/.test(x.s)).map(x=>'#'+x.i+' '+x.s.slice(0,40)).join(' | '));
  console.error('  → OTS after intro: ' + ots + '/' + (out.length-1) + ' (' + Math.round(ots/(out.length-1)*100) + '%)');
  await b.close();
})().catch(e => { console.error('ERR ' + e.message); process.exit(2); });
