// TWO FINAL MOVES (Roman 2026-08-04). (1) GENERATOR: search NOT for "behaviors" but for MOMENTS OF UNNECESSARY
// SOCIAL EFFORT — social geometry (another person, status, timing, imitation), a negotiation of status/belonging/
// competence/forgiveness. (2) RENDERING (the actual "décolletage" move): observe the concrete moment, then a
// second clause that REINTERPRETS THE SITUATION — a witty, absurd-but-exact reframe of the world ("the waiter had
// done nothing that required forgiveness"), NEVER an explanation of the person ("because he was insecure"). The
// observation already contains the diagnosis; the clause editorializes, it doesn't diagnose.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';

const PEOPLE = {
  NEW_MONEY:  'a man with new money at an old-money club, terrified of not belonging',
  NEEDY:      'a woman at dinner with a man she is just starting to date, terrified of looking needy',
  NOT_SMART:  'a man at a dinner party, quietly insecure he is not as clever as the others',
  IRRELEVANT: 'a woman in her forties at a party full of younger people, terrified of looking irrelevant',
};

const SYS = 'Write ONE introduction of this person, in two moves.\n\nMOVE 1 — observe a MOMENT OF UNNECESSARY SOCIAL EFFORT: a small thing they DO to manage how another person sees them — spending social effort reality did not require (waiting for someone else\'s fork, apologizing before ordering, laughing a beat late then repeating the punchline). There must be OTHER PEOPLE and a quiet negotiation of status / belonging / competence / forgiveness. Not a private tic; a social move. Ordinary, faintly embarrassing, instantly pictureable.\n\nMOVE 2 — a second clause/sentence that REINTERPRETS THE SITUATION: a witty, absurd-but-exact reframe of what is happening in the world — "the ridiculous little rule the universe seems to be operating under today." It must NOT explain the person (BANNED: "because he was insecure / anxious / intimidated / needed reassurance / felt he didn\'t deserve it"). The observation already contains the diagnosis; do not state it.\n\nStudy the move:\n- "She apologized before ordering the lobster thermidor she\'d only ever heard of. The waiter had done nothing that required forgiveness."\n- "He looked at the host\'s wine label instead of the host\'s face. Labels were easier to read."\n- "She waited for him to lift his fork first. Apparently dinner had an order of operations."\n- "He laughed a beat late, then repeated the punchline. The joke apparently wasn\'t official until it had passed through him."\n\nWrite ONE such introduction (1-2 sentences). No psychology words.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const p of Object.keys(PEOPLE)) {
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys, user }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 1.0, max_tokens: 90 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 12 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys: SYS, user: 'The person: ' + PEOPLE[p] + '.' });
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    out[p] = o;
    console.error('\n[' + p + ']\n  ' + (o || 'FAIL'));
    await new Promise(r => setTimeout(r, 1500));
  }
  fs.writeFileSync(DIR + '/reframe.json', JSON.stringify(out, null, 2));
  console.error('\nDONE reframe'); await browser.close(); process.exit(0);
})().catch(e => { console.error('REFRAME-ERR', e.message); process.exit(1); });
