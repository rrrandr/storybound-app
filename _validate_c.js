const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  const logs=[]; p.on('console', m => { const t=m.text(); if(/LOCATION-TRANSITION|FRONTISPIECE/.test(t)) logs.push(t.slice(0,100)); });
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof window._maybeFireLocationTransition === 'function', { timeout: 45000 });
  await p.evaluate(() => {
    const s=window.state; s.world='Fantasy'; s.picks={world:'Fantasy'}; s._lastRenderedRegion=null;
    s.fantasyRegion='the_veilwood'; window._maybeFireLocationTransition({});   // first → record, no fire
    s.fantasyRegion='the_veilwood'; window._maybeFireLocationTransition({});   // same → no fire
    s.fantasyRegion='the_thornwild'; window._maybeFireLocationTransition({});  // CHANGE → fire (log)
  });
  await p.waitForTimeout(400);
  console.error('logs seen: ' + JSON.stringify(logs));
  await b.close();
})().catch(e => { console.error('ERR ' + e.message); process.exit(2); });
