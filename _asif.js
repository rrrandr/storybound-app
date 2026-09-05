// IS "AS IF" THE OPERATION OR JUST THE WORDING? (Roman 2026-08-04). 4/5 accusations reached for "as if/as
// though" — English's native operator for mind-reading-without-asserting-fact (behavior→inferred model). Test:
// FORCE it OFF. Fixed behavior (breathes first, unchanged): "He slipped his platinum card to the waiter before
// we even sat down." Then ONE follow-up sentence = the narrator's accusation, for each of 5 fears, with "as if/
// as though/like someone who/the way some people" BANNED + a DIFFERENT surface form each time. If quality holds
// with varied forms → "as if" was just the favorite surface (good — many realizations of one move). If it
// collapses → the accusation is fundamentally a COUNTERFACTUAL SIMULATION and as-if is load-bearing.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';

const BEHAVIOR = 'He slipped his platinum card to the waiter before we even sat down.';
const FEARS = { not_hurt: 'hurt / unwanted', not_ordinary: 'ordinary', not_lower_status: 'lower-status than the table', not_selfish: 'selfish', not_needy: 'needy' };

const SYS = 'A man does this — the sentence is FIXED, never change it:\n"' + BEHAVIOR + '"\nHe does it because he is trying desperately not to look %F.\n\nWrite ONE follow-up sentence: the narrator\'s interpretive leap — the ACCUSATION about what he is trying not to look like — that lands AFTER the behavior (behavior breathes first, then the narrator interprets). Let the reader infer; do NOT name the fear or the feeling.\n\nHARD BAN (the whole point): NO "as if", NO "as though", NO "like someone who", NO "the way some people", NO simile of any kind. Find a DIFFERENT surface form (a flat declarative that implies it / a "Nobody had…" / an "Only someone…" / an "X, in his case, always…" / a compressed noun-phrase verdict). The judgment must land WITHOUT a counterfactual "as if". One sentence.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const k of Object.keys(FEARS)) {
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: 'The follow-up sentence:' }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.95, max_tokens: 70 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 10 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys: SYS.replace('%F', FEARS[k]) });
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    out[k] = o;
    const leak = /\bas if\b|\bas though\b|like someone who|the way some/i.test(o || '');
    console.error('\n[' + k + ']' + (leak ? ' ⚠AS-IF-LEAK' : ' ✓no-as-if') + '\n  ' + BEHAVIOR + '\n  ' + (o || 'FAIL'));
    await new Promise(r => setTimeout(r, 1500));
  }
  fs.writeFileSync(DIR + '/asif.json', JSON.stringify(out, null, 2));
  console.error('\nDONE asif'); await browser.close(); process.exit(0);
})().catch(e => { console.error('ASIF-ERR', e.message); process.exit(1); });
