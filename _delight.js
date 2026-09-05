// EDITORIAL DELIGHT via SEARCH-AND-SELECT (Roman 2026-08-04). Anecdote-worthiness is a JUDGE, not a GENERATOR
// (optimize it directly → manufactured sitcom moments). Real target: the behavior an observant novelist COULDN'T
// HELP NOTICING — OBSERVED, not invented. Missing layer is GENERATED not stored: fear → pressure → behavior →
// narrator NOTICES (varied scale: sometimes a dinner-story, sometimes microscopic "third mirror in twenty feet").
// Process = notice a SLATE, then SELECT for editorial delight ("would a really good novelist be pleased they
// thought of this?"). Test: does search+delight-select produce caught-not-constructed range vs the anecdote one-shot?
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';

const PEOPLE = {
  NEEDY:     'a woman terrified of looking needy at the start of a new relationship, out to dinner with him',
  NOT_SMART: 'a man quietly insecure that he is not as clever as the people he is with, at a dinner party',
};

const NOTICE_SYS = 'You are an observant novelist watching this person under quiet social pressure. NOTICE six different things they actually DO — vary the scale widely: some ordinary and MICROSCOPIC (a glance, a half-second hesitation, a word choice, where their hands go), some larger. Behavior only — no psychology, no naming feelings. Do NOT invent a sitcom moment; notice what is really there. Number them 1-6, one short line each.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const call = (sys, user, tok) => page.evaluate(async ({ sys, user, tok }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 1.0, max_tokens: tok }) }); const j = await r.json(); return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); } catch (e) { return 'ERR:' + e.message; } }, { sys, user, tok });

  const out = {};
  for (const p of Object.keys(PEOPLE)) {
    const slate = await call(NOTICE_SYS, 'The person: ' + PEOPLE[p] + '.\n\nSix things you notice:', 260);
    await new Promise(r => setTimeout(r, 1200));
    const SELECT_SYS = 'Here are six things a novelist noticed about a person:\n' + slate + '\n\nPick the ONE a really good novelist would be most PLEASED they thought of — the one that feels OBSERVED (caught), not INVENTED (a manufactured sitcom moment); the one that makes the narrator internally grin because it names this person exactly right. It may be the smallest one. Return ONLY that one, lightly polished into a single sentence a narrator would actually write. No explanation.';
    const pick = await call(SELECT_SYS, 'The pick:', 60);
    out[p] = { slate, pick };
    console.error('\n═══════ ' + p + ' ═══════\nSLATE:\n' + slate + '\n\nDELIGHT-PICK:\n  ' + pick);
    await new Promise(r => setTimeout(r, 1500));
  }
  fs.writeFileSync(DIR + '/delight.json', JSON.stringify(out, null, 2));
  console.error('\n(compare picks to the anecdote one-shots: NEEDY "brought her own coffee to his apartment"; NOT_SMART "said the joke was from a 1997 interview")');
  console.error('DONE delight'); await browser.close(); process.exit(0);
})().catch(e => { console.error('DELIGHT-ERR', e.message); process.exit(1); });
