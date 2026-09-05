// INFERENTIAL DENSITY — the real target (Roman 2026-08-04). NOT "smallest observable behavior" but the behavior
// with maximum inferential density: the faintly-embarrassing, socially-recognizable, SPECIFIC-WITH-A-HISTORY
// detail from which a reader reconstructs an entire person ("OMG I know EXACTLY that person"). Test both bars
// side by side per character: (a) GENERIC concrete (my current editorial-pass level) vs (b) HIGH-DENSITY
// (Roman's décolletage bar with a specific cultural/social detail that carries a whole life). Does the model
// hit (b) when it's the explicit target?
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';

const PEOPLE = {
  NEW_MONEY:  'a man with new money, terrified of looking like he does not belong among old money',
  NEEDY:      'a woman terrified of looking needy at the start of a new relationship',
  NOT_SMART:  'a man quietly insecure that he is not as clever as the people he is with',
  IRRELEVANT: 'a woman in her forties terrified of looking irrelevant at a party full of younger people',
};

const GENERIC_SYS = 'Introduce this person with ONE concrete observable behavior (evidence, not a label). One sentence.';
const DENSE_SYS = 'Introduce this person with ONE behavior — but the MOST REVEALING one possible. Not just concrete: the faintly embarrassing, socially recognizable way they try a little too hard to be seen as the person they wish they were. It MUST be SPECIFIC, WITH A HISTORY behind it — carry a real cultural / social / material detail, not a generic one.\n\nStudy the bar (each lets you reconstruct a whole life):\n- NOT "she apologized before ordering something expensive" → "She apologized before ordering the lobster thermidor she\'d only ever heard of."\n- NOT "he corrects people" → "He texted the next morning to explain that Alanis Morissette\'s \'Ironic\' isn\'t actually ironic, because you\'d used the word wrong."\n- NOT "she deflects" → "No worries if not. I get no a lot."\n\nThe reader must think "OMG I know EXACTLY that person" and be able to reconstruct twenty years of their life from it. Do NOT name the feeling. One sentence.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const call = (sys, user) => page.evaluate(async ({ sys, user }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.95, max_tokens: 70 }) }); const j = await r.json(); return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); } catch (e) { return 'ERR:' + e.message; } }, { sys, user });
  const out = {};
  for (const p of Object.keys(PEOPLE)) {
    const u = 'The person: ' + PEOPLE[p] + '.';
    const generic = await call(GENERIC_SYS, u); await new Promise(r => setTimeout(r, 1200));
    const dense = await call(DENSE_SYS, u); await new Promise(r => setTimeout(r, 1200));
    out[p] = { generic, dense };
    console.error('\n===== ' + p + ' =====\n  GENERIC: ' + generic + '\n  DENSE:   ' + dense);
  }
  fs.writeFileSync(DIR + '/density.json', JSON.stringify(out, null, 2));
  console.error('\nDONE density'); await browser.close(); process.exit(0);
})().catch(e => { console.error('DENSITY-ERR', e.message); process.exit(1); });
