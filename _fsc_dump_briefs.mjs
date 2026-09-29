import { chromium } from 'playwright-core';
const b = await chromium.launch(); const p = await b.newPage();
await p.route('**/api/**', r => r.abort());
await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForFunction(() => Array.isArray(window._FSC_OUTCOMES), { timeout: 20000 });
const rows = await p.evaluate(() => window._FSC_OUTCOMES.map(o => ({
  id: o.id, ask: o.ask, cls: o.cls, cost: o.cost || 'none',
  text: window._fscAuthorBrief({ authorBrief: o.authorBrief }) })));
await b.close();
rows.forEach(r => {
  console.log('\n' + '─'.repeat(78));
  console.log(r.id + '   [ask: ' + r.ask + ' · ' + r.cls + ' · cost: ' + r.cost + ']');
  console.log('─'.repeat(78));
  console.log(r.text.trim());
});
console.log('\n' + '─'.repeat(78) + '\n' + rows.length + ' briefs.');
