// RECOGNITION density, not INFORMATION density (Roman 2026-08-04). My "specific-with-history" invited fact-
// stuffing (the Château Margaux résumé = information, not recognition — nobody has watched THAT person). The
// real target: "holy shit, I know someone EXACTLY like that." Two missing ingredients: (1) SLIGHTLY UNNECESSARY
// (trying a little harder than reality requires = overcompensation, where personality leaks); (2) specificity
// lives in the RELATIONSHIP (person↔thing), NOT the object ("the lobster thermidor she'd only ever HEARD of").
// Re-test the 4 people (incl. the New-Money one that fact-dumped): does the corrected criterion stop writing résumés?
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';

const PEOPLE = {
  NEW_MONEY:  'a man with new money, terrified of looking like he does not belong among old money',
  NEEDY:      'a woman terrified of looking needy at the start of a new relationship',
  NOT_SMART:  'a man quietly insecure that he is not as clever as the people he is with',
  IRRELEVANT: 'a woman in her forties terrified of looking irrelevant at a party full of younger people',
};

const SYS = 'Introduce this person with ONE behavior. The target is RECOGNITION, not information.\n\nThe reader must think "holy shit, I KNOW someone exactly like that" — NOT "I understand this person." It must be something you have actually WATCHED a real human do.\n\nTHE CRITERION: the socially recognizable, faintly embarrassing, SLIGHTLY UNNECESSARY thing this person reliably does when trying to become the version of themselves they would rather people meet. "Slightly unnecessary" = trying a little harder than reality requires — not irrational, not cinematic, not pathological. Just a little too hard.\n\nThe specificity must live in the RELATIONSHIP between the person and the thing, NOT in the thing itself:\n- NOT "lobster thermidor" → "the lobster thermidor she\'d only ever heard of"\n- NOT "Alanis Morissette" → "because he\'d used the word ironic"\n- NOT "checking the mirror" → "third mirror in twenty feet"\n- NOT "No worries if not" → "No worries if not. I get no a lot."\n\nAVOID fact-stuffing / a résumé of specifics — a memorized vintage from a named magazine issue is INFORMATION, not recognition; nobody has watched THAT person. Do NOT name the feeling. One sentence.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const p of Object.keys(PEOPLE)) {
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys, user }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.95, max_tokens: 70 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 10 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys: SYS, user: 'The person: ' + PEOPLE[p] + '.' });
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    out[p] = o;
    console.error('\n[' + p + ']\n  ' + (o || 'FAIL'));
    await new Promise(r => setTimeout(r, 1500));
  }
  fs.writeFileSync(DIR + '/recognition.json', JSON.stringify(out, null, 2));
  console.error('\nDONE recognition'); await browser.close(); process.exit(0);
})().catch(e => { console.error('REC-ERR', e.message); process.exit(1); });
