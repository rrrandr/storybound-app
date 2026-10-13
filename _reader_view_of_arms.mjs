// What would the READER actually see? Runs production's own
// _extractScene1PrewrittenExpansions over each saved arm, then separates:
//   · main prose (what reaches the page)
//   · the micro-choice widget line
//   · EXPANSION_A / EXPANSION_B (alternative payoffs, shown only on the matching choice)
//   · anything the extractor DISCARDS (it strips from <<EXPANSION_A>> to end of text, so content
//     placed after the appendix is lost)
// Provider-free, $0. No dispatch of any kind.
import fs from 'fs';
import { chromium } from 'playwright-core';

const ORIGIN = process.env.SB_ORIGIN || 'http://localhost:3000';
const ARMS = (process.env.SB_ARMS || '').split(',').filter(Boolean);
if (!ARMS.length) { console.error('set SB_ARMS=label:dir,label:dir'); process.exit(2); }

const words = (s) => (String(s || '').trim() ? String(s).trim().split(/\s+/).length : 0);

const browser = await chromium.launch();
const page = await browser.newPage();
await page.route('**/api/**', async (r) => {
  try { await r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }); } catch (_) {}
});
await page.goto(ORIGIN + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForFunction(() => typeof window._extractScene1PrewrittenExpansions === 'function',
  { timeout: 30000 });
console.log('=== READER VIEW OF EACH ARM (provider-free, $0) ===');
console.log('using production _extractScene1PrewrittenExpansions\n');

for (const spec of ARMS) {
  const [label, dir] = spec.split(':');
  const raw = fs.readFileSync(dir + '/content_raw.txt', 'utf8');
  const out = await page.evaluate((t) => {
    const kept = window._extractScene1PrewrittenExpansions(t);
    return { kept, exp: (window.state && window.state._scene1PrewrittenExpansions) || null };
  }, raw);

  // The appendix, as the author wrote it.
  const mA = raw.match(/<<\s*EXPANSION_A\s*>>([\s\S]*?)(?=<<\s*EXPANSION_B\s*>>|<<\s*END_EXPANSION\s*>>|$)/i);
  const mB = raw.match(/<<\s*EXPANSION_B\s*>>([\s\S]*?)(?=<<\s*END_EXPANSION\s*>>|$)/i);
  const afterEnd = raw.match(/<<\s*END_EXPANSION\s*>>([\s\S]*)$/i);
  // Bracketed directives are never prose.
  const stripTags = (s) => String(s || '').replace(/\[[A-Z_]+:[\s\S]*?\]\n?/g, '')
    .replace(/\[\/[A-Z_]+\]\n?/g, '').replace(/^\s*-{3,}\s*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  const keptProse = stripTags(out.kept);
  const widget = (keptProse.match(/^.*\?\s*$/m) || [''])[0].trim();

  console.log('── ' + label + ' ──  (' + dir.replace('_ab_writing_out/', '') + ')');
  console.log('  raw content                     : ' + words(raw) + ' words / ' + raw.length + ' chars');
  console.log('  MAIN PROSE the reader sees      : ' + words(keptProse) + ' words / ' + keptProse.length + ' chars');
  console.log('  micro-choice widget line        : ' + (widget ? JSON.stringify(widget) : '(none found)'));
  console.log('  EXPANSION_A (alt payoff)        : ' + words(mA && mA[1]) + ' words');
  console.log('  EXPANSION_B (alt payoff)        : ' + words(mB && mB[1]) + ' words');
  const lost = stripTags(afterEnd && afterEnd[1]);
  console.log('  AFTER <<END_EXPANSION>>         : ' + words(lost) + ' words'
    + (words(lost) ? '  *** DISCARDED by the extractor — the reader never sees it ***' : ''));
  if (words(lost)) console.log('    lost text: ' + JSON.stringify(lost.slice(0, 220)));
  console.log('  prewritten payoffs parsed       : '
    + (out.exp ? ('direct ' + (out.exp.direct || '').length + 'c, subtle ' + (out.exp.subtle || '').length + 'c') : 'none'));
  fs.writeFileSync(dir + '/reader_main_prose.txt', keptProse);
  fs.writeFileSync(dir + '/reader_lost_after_appendix.txt', lost || '');
  console.log('  written: reader_main_prose.txt, reader_lost_after_appendix.txt\n');
}
await browser.close();
