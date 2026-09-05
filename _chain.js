// THE FINAL CHAIN (Roman 2026-08-04). Don't fuse generator+selector. CHAIN them:
// 1. GENERATE: "faintly embarrassing yet COMMON way this person overcompensates for X" (steers to recognizable
//    behavior — the LEAK: what they do that reality didn't require, can't quite help).
// 2. SELECT: strongest recognition density ("I've met EXACTLY this person").
// 3. EXPRESS: with one oddly specific, world-appropriate detail that IMPLIES A HISTORY (not "ordered something
//    expensive" but "the lobster thermidor she'd only ever heard of") — the missing 10%.
// 4. REMARK: ONE unfair compressed thing the narrator genuinely thinks — ANY form (deadpan / wry / absurd reframe
//    / three extra words), NOT a formula, NOT psychology.
// Test: history + VARIED narrator forms (not all "apparently a rule")?
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';

const PEOPLE = {
  NEEDY:      ['a woman a few weeks into dating a man she really likes', 'looking needy'],
  UNCULTURED: ['a man at a gallery opening with people who read more than he does', 'looking uncultured'],
  AGING:      ['a woman in a youth-obsessed creative industry, at a work party', 'looking past-it'],
  NEW_MONEY:  ['a man who grew up poor and now has money, at his first proper members\' club', 'looking like he does not belong'],
};

const GEN_SYS = 'List FIVE faintly embarrassing yet COMMON ways this person overcompensates for %F — little things they do that reality does not require, because they cannot quite help it. People should RECOGNIZE these ("I have met someone like that"), NOT TV-character quirks. Behavior only, no psychology. One line each, numbered.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const call = (sys, user, tok) => page.evaluate(async ({ sys, user, tok }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 1.0, max_tokens: tok }) }); const j = await r.json(); return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); } catch (e) { return 'ERR:' + e.message; } }, { sys, user, tok });

  const SELECT_SYS = 'Here are five things a person does:\n%SLATE%\n\nDo THREE things, then output ONLY the result:\n1. SELECT the one with the strongest "I have met EXACTLY this person" recognition.\n2. EXPRESS it with ONE oddly specific, WORLD-APPROPRIATE detail that IMPLIES A HISTORY behind it — not "ordered something expensive" but "the lobster thermidor she\'d only ever heard of"; not "referenced something he said" but "Alanis Morissette, because he\'d misused \'ironic.\'" The detail implies a whole life; it does not illustrate a trait.\n3. Add ONE unfair, compressed editorial remark — the single most interesting thing a sharp, funny novelist would GENUINELY think after seeing it. ANY form: a flat deadpan, a wry aside, an absurd reframe of the situation, or just a few extra words. NOT a formula (do NOT always say "apparently…"), NOT psychology ("because she was insecure").\nOutput ONLY the final 1-2 sentence introduction.';

  const out = {};
  for (const p of Object.keys(PEOPLE)) {
    const [who, fear] = PEOPLE[p];
    const slate = await call(GEN_SYS.replace('%F', fear), 'The person: ' + who + '.\n\nFive:', 240);
    await new Promise(r => setTimeout(r, 1200));
    const final = await call(SELECT_SYS.replace('%SLATE%', slate), 'The introduction:', 90);
    out[p] = { slate, final };
    console.error('\n═══════ ' + p + ' (not ' + fear + ') ═══════\n  → ' + final);
    await new Promise(r => setTimeout(r, 1500));
  }
  fs.writeFileSync(DIR + '/chain.json', JSON.stringify(out, null, 2));
  console.error('\nDONE chain'); await browser.close(); process.exit(0);
})().catch(e => { console.error('CHAIN-ERR', e.message); process.exit(1); });
