const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  p.on('pageerror', e => console.error('PAGEERR: ' + String(e).slice(0,400)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await p.waitForFunction(() => window.state && typeof window._renderSituatedIntro === 'function', { timeout: 45000 });
  const probe = await p.evaluate(() => ({
    renderSituatedIntro: typeof window._renderSituatedIntro,       // 2b (before my new block)
    cgDetailPanelFor: typeof window._cgDetailPanelFor,             // not exposed on window (no window.=)
    cgLayoutForCast: typeof window._cgLayoutForCast,               // not exposed (no window.=)
    buildSituatedCastPagePrompt: typeof window._buildSituatedCastPagePrompt, // exposed
    renderSituatedCastPage: typeof window._renderSituatedCastPage,           // exposed
    renderIntroCardsForScene: typeof window._renderIntroCardsForScene,       // after my block
  }));
  console.error('PROBE: ' + JSON.stringify(probe, null, 0));
  await b.close();
})().catch(e => console.error('ERR ' + e.message));
