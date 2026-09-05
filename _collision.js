// THE LAST TWO CONSTRAINTS (Roman 2026-08-04). (1) COLLISION / mutual dependence: the detail must be born from
// THIS person hitting THIS specific object — swap the object and it COLLAPSES. Reject transplantable motion
// ("heel worrying a carpet seam" works on any floor = the object is just nearby, not participating). (2) COUPLING:
// the editorial remark must REINTERPRET the exact observation — MEANINGLESS without it ("because it was easier to
// read" is nonsense without the wine label). Reject standalone aphorisms ("some people rehearse their exits in
// private" works alone = pivots to a neighbor). FALSIFY each output: swap-the-object (collapses?) + remove-obs (remark dead?).
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';

const SIT = {
  WINE_BAR:   'a man out of his depth at a natural-wine bar with people who talk about wine for a living',
  GALLERY:    'a woman at a gallery opening who wants very badly to be taken for an artist',
  RESTAURANT: 'a woman at a tasting-menu restaurant far above what she can afford, on a date',
  BOOK_CLUB:  'a man at a book club where everyone has clearly finished the book and he has not',
};

const OBS_SYS = 'Watch this person in the situation below. Find ONE detail that is a COLLISION between who they are and a SPECIFIC thing in the scene — an object, a word, a name, a dish. THE TEST: the observation must COLLAPSE if you swap that thing for a different one. If the same behavior would be equally true with ANY other object (a heel worrying a carpet seam works on any floor; a hand on a necklace works on any necklace), REJECT it — the object is just nearby, not participating. The thing must be so tied to THIS person that changing it changes the person (the lobster thermidor she\'d only ever heard of → a cheeseburger collapses it; Alanis Morissette → Taylor Swift changes who she is). Write ONE concrete observation where the person and the thing are mutually dependent — neither makes sense without the other. No psychology. One sentence.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const call = (sys, user, tok) => page.evaluate(async ({ sys, user, tok }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 1.0, max_tokens: 90 }) }); const j = await r.json(); return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); } catch (e) { return 'ERR:' + e.message; } }, { sys, user, tok });

  const out = {};
  for (const s of Object.keys(SIT)) {
    const obs = await call(OBS_SYS, 'The person: ' + SIT[s] + '.\n\nThe observation:', 70);
    await new Promise(r => setTimeout(r, 1200));
    const COUPLE_SYS = 'Here is an observation:\n"' + obs + '"\n\nAdd ONE editorial remark that REINTERPRETS this EXACT observation. THE TEST: the remark must be MEANINGLESS without the observation ("because it was easier to read" is nonsense without the wine label — right). REJECT any remark that works as a standalone aphorism ("some people rehearse their exits in private" stands alone — wrong, it pivots to a neighbor). Pull on the SAME rope: deepen THIS exact thing, do not change the subject, never explain the person. Output the FULL final line (observation + remark), one to two sentences.';
    const line = await call(COUPLE_SYS, 'The final line:', 100);
    out[s] = { obs, line };
    console.error('\n═══════ ' + s + ' ═══════\n  OBS:  ' + obs + '\n  LINE: ' + line);
    await new Promise(r => setTimeout(r, 1500));
  }
  fs.writeFileSync(DIR + '/collision.json', JSON.stringify(out, null, 2));
  console.error('\nFALSIFY: (1) swap the object — does it collapse? (2) remove the observation — is the remark dead?');
  console.error('DONE collision'); await browser.close(); process.exit(0);
})().catch(e => { console.error('COLLISION-ERR', e.message); process.exit(1); });
