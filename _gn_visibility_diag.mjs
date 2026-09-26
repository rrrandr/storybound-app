// One-shot diagnostic: what actually hides the gn Say/Do controls. Zero dispatches, $0.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ headless: true, channel: 'chrome' });
const p = await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 25000 });
await p.waitForFunction(() => window.state, { timeout: 20000 });
const chain = await p.evaluate(() => {
  document.body.classList.add('oas-active');
  let el = document.getElementById('gnActionInput'); const out = [];
  while (el && el !== document.documentElement) {
    const cs = getComputedStyle(el);
    out.push({ tag: el.tagName, id: el.id || null, cls: String(el.className || '').slice(0, 60),
               display: cs.display, visibility: cs.visibility, hidden: el.hasAttribute('hidden') });
    el = el.parentElement;
  }
  return out;
});
console.log('HIDDEN ANCESTORS:');
console.log(JSON.stringify(chain.filter((n) => n.display === 'none' || n.visibility === 'hidden' || n.hidden), null, 1));
await b.close();
process.exit(0);
