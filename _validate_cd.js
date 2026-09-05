const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  p.on('pageerror', e => console.error('PAGEERR ' + String(e).slice(0,160)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof window._sceneMajorMoment === 'function' && typeof window._maybeFireLocationTransition === 'function', { timeout: 45000 });
  const out = await p.evaluate(() => {
    const s = window.state; s._firedMomentSplashes = {};
    // D: moment detection
    const M = (flags) => { Object.assign(s, flags.s||{}); s._sceneSignals = flags.sig||{}; s.milestones = flags.mile||{}; return window._sceneMajorMoment({}); };
    const cliff = M({ s:{_isCliffhangerScene:true} });
    const rev   = M({ s:{_isCliffhangerScene:false}, sig:{majorConsequence:true} });
    const kiss  = M({ s:{_isCliffhangerScene:false}, sig:{intimacy:true}, mile:{first_kiss:false} });
    const none  = M({ s:{_isCliffhangerScene:false}, sig:{}, mile:{} });
    // C: region-change detection (loupe fire no-ops in headless — no DOM element)
    s.world='Fantasy'; s.picks={world:'Fantasy'}; s._lastRenderedRegion=null;
    s.fantasyRegion='the_veilwood'; window._maybeFireLocationTransition({}); const rec = s._lastRenderedRegion;   // first: record only
    s.fantasyRegion='the_thornwild'; let fired=false; const orig=window.showFatelandsFrontispiece; window.showFatelandsFrontispiece=function(){fired=true;}; window._maybeFireLocationTransition({}); window.showFatelandsFrontispiece=orig;
    s.fantasyRegion='the_thornwild'; let fired2=false; window.showFatelandsFrontispiece=function(){fired2=true;}; window._maybeFireLocationTransition({}); window.showFatelandsFrontispiece=orig;
    return { cliff, rev, kiss, none, rec, firedOnChange:fired, firedOnSame:fired2 };
  });
  console.error('D moment: cliffhanger='+out.cliff+' reversal='+out.rev+' first_kiss='+out.kiss+' none='+out.none);
  console.error('C region: first-scene recorded='+out.rec+'  fired-on-CHANGE='+out.firedOnChange+'  fired-on-SAME='+out.firedOnSame);
  await b.close();
})().catch(e => { console.error('ERR ' + e.message); process.exit(2); });
