const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ headless: true, channel: 'chrome' });
  const p = await (await b.newContext()).newPage();
  p.on('pageerror', e => console.error('PAGEERR ' + String(e).slice(0,160)));
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await p.waitForFunction(() => typeof window._cgIssueEmblem === 'function', { timeout: 45000 });
  const out = await p.evaluate(() => ({
    ff: window._cgIssueEmblem('First Favored'),
    human: window._cgIssueEmblem('human'),
    kwisheen: window._cgIssueEmblem('Kwisheen'),
    wilder: window._cgIssueEmblem('Wilder'),
    unknown: window._cgIssueEmblem('')
  }));
  Object.keys(out).forEach(k => console.error('  ' + (k+'        ').slice(0,10) + '→ ' + out[k]));
  await b.close();
})().catch(e => { console.error('ERR ' + e.message); process.exit(2); });
