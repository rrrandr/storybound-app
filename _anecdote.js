// ANECDOTE-WORTHINESS, not a behavioral rule (Roman 2026-08-04). Three layers: (0) diagnosis "she fears seeming
// demanding" · (2) behavioral RULE "she makes people comfortable before asking" (STILL abstract — calcifies if
// stored; the model paraphrases it) · (3) ANECDOTE "she apologized before ordering the lobster thermidor she'd
// only ever heard of" (DISCOVERED, not stored). Target = the thing their friends would tell at dinner that makes
// everyone say "yep, that's EXACTLY them" — worth REPEATING. Test: does the anecdote framing produce quotable
// dinner-stories (layer 3) instead of rules (layer 2)? Does it rescue the New-Money hard case?
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';

const PEOPLE = {
  NEW_MONEY:  'a man with new money, terrified of looking like he does not belong among old money',
  NEEDY:      'a woman terrified of looking needy at the start of a new relationship',
  NOT_SMART:  'a man quietly insecure that he is not as clever as the people he is with',
  IRRELEVANT: 'a woman in her forties terrified of looking irrelevant at a party full of younger people',
};

const SYS = 'Generate ONE behavior that becomes a STORY someone tells about this person — not a trait, not a tic, not a diagnosis.\n\nIt must be the thing their friends would tell at dinner that makes everyone immediately say "Yep, that\'s EXACTLY them." The sentence has to be worth REPEATING — a portable, quotable anecdote, the way humans actually describe each other years later.\n\nStudy these (each is a dinner-story, not a rule):\n- "She apologized before ordering the lobster thermidor she\'d only ever heard of."\n- "No worries if not. I get no a lot."\n- "He corrected the word after nobody needed correcting."\n\nDo NOT write a behavioral RULE ("she makes people comfortable before asking for things") — nobody repeats a rule. Do NOT name the feeling. Do NOT stuff in facts/résumé specifics. Write the specific, quotable INSTANCE — one sentence.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const p of Object.keys(PEOPLE)) {
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys, user }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 1.0, max_tokens: 70 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 10 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys: SYS, user: 'The person: ' + PEOPLE[p] + '.' });
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    out[p] = o;
    console.error('\n[' + p + ']\n  ' + (o || 'FAIL'));
    await new Promise(r => setTimeout(r, 1500));
  }
  fs.writeFileSync(DIR + '/anecdote.json', JSON.stringify(out, null, 2));
  console.error('\nDONE anecdote'); await browser.close(); process.exit(0);
})().catch(e => { console.error('ANEC-ERR', e.message); process.exit(1); });
