// CONTROLLED BEFORE/AFTER for _apprRestrictionLines — the changed builder, fixed input.
// One frozen row with four UNBOUNDED restrictions (the shape measured in the real continuation
// capture) plus one BOUNDED restriction, so the scoped path is exercised too.
// usage: node _nf_restriction_lines_controlled.mjs <label>
import fs from 'node:fs';
import { chromium } from 'playwright-core';
import { configBody, isAuthOrigin, installSession, makeSession, installEntitledProfileStub }
  from './_test_session_env.mjs';
const OUT = '/Users/romantsukerman/storybound-app/_nf_restriction_lines_out';
fs.mkdirSync(OUT, { recursive: true });
const LABEL = process.argv[2] || 'live';
const ROW = { name: 'Julian', restrictions: [
  { forbid: 'any reference to his mother', why: 'not disclosed to the reader until he says it himself' },
  { forbid: 'the scar on his forearm', why: 'the reader has not been shown it' },
  { forbid: 'his father’s name', why: 'withheld; he avoids it on purpose' },
  { forbid: 'the reason he left the valley', why: 'he has not told her, and she has not guessed' },
  { forbid: 'the inheritance hearing', fromScene: 4, untilScene: 9, why: 'only inside that window' },
] };
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext()).newPage();
await installSession(page, makeSession()); await installEntitledProfileStub(page, {});
await page.route('**/api/**', async (route) => {
  const req = route.request(); const url = req.url().replace(/^https?:\/\/[^/]+/, '');
  if (/\/api\/config\b/.test(url)) return route.fulfill({ status: 200, contentType: 'application/json', body: configBody() });
  if (isAuthOrigin(req.url())) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  return route.abort();
});
await page.route('**/sb-test.localhost/**', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
await page.goto('http://localhost:3000/', { waitUntil: 'commit', timeout: 60000 });
await page.waitForFunction(() => window._apprRestrictionLines, null, { timeout: 180000 });
const out = await page.evaluate((row) => (window._apprRestrictionLines(row, '    ') || []).join('\n'), ROW);
await browser.close();
const f = OUT + '/lines__' + LABEL + '.txt';
fs.writeFileSync(f, out);
console.log(`[${LABEL}] _apprRestrictionLines: ${out.length.toLocaleString()} chars, ${out.split('\n').length} lines → ${f}`);
console.log(`    restrictions delivered : ${(out.match(/MUST NOT be written:/g) || []).length}`);
console.log(`    reasons delivered      : ${(out.match(/why \(read it for conditions\):/g) || []).length}`);
console.log(`    bounded scope preserved: ${/from scene 4 · until scene 9/.test(out)}`);
console.log(`    caveat occurrences     : ${(out.match(/do not treat (this|it) as unconditional/g) || []).length}`);
