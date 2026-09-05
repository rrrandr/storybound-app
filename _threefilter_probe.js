// THREE-FILTER regeneration probe (Roman 2026-08-05). Hypothesis: a great observation satisfies THREE independent
// filters at once — (1) protects an identity, (2) tries to make reality more like the one they need (momentum),
// (3) UNINTENTIONALLY reveals the very thing it protects (self-defeating = identity dramatic irony). "social" removed
// (third mirror / wine label are private acts with social implications). Generator proposes; I judge each against all
// three and reject any that satisfy only 1-2. NO paid gen.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';

const SPEC = 'You are testing what makes a character observation feel ALIVE and REMEMBERED. A great one is a BEHAVIOR that satisfies ALL THREE independent filters at once:\n'
  + '1. PROTECTS AN IDENTITY — it defends a specific self-image the person needs to project ("I am cultured / competent / kind / desirable / not weak"). Explains WHY they chose THAT exact act.\n'
  + '2. TRIES TO MAKE REALITY A LITTLE MORE LIKE THE ONE THEY NEED — it has momentum; they are trying to make something TRUE, not merely reacting. It need NOT be a social act: a private act (checking a mirror) counts if it is trying to make "I am okay" true.\n'
  + '3. UNINTENTIONALLY REVEALS THE VERY THING IT PROTECTS — the behavior DEFEATS ITS OWN PURPOSE; the reader sees the vulnerability behind the mask while the character does not. Trying to look sophisticated reveals insecurity; trying to look comfortable reveals discomfort; trying to look competent reveals terror of incompetence.\n\n'
  + 'CALIBRATION (all satisfy all three): looking at the wine label instead of the host\'s face because it is easier to read; apologizing before ordering the lobster thermidor she had only ever heard of; checking the third mirror in twenty feet; leading with her décolletage; asking the Keeper if there will be fresh bread today while being dragged off; "I already ran the tests twice."\n'
  + 'THESE FAIL (do not produce): a camera-tic (clenched jaw, rubbed thumb) — protects no identity, no momentum; a plainly competent action — reveals nothing hidden; raw emotion (he cried) — protects no identity.\n\n'
  + 'Each example must be a CONCRETE observable behavior (a real thing done or said), not a summary of a feeling. Output EACH as exactly four lines:\n'
  + 'BEHAVIOR: <one concrete sentence>\nPROTECTS: <the identity>\nREALITY: <what they are trying to make true>\nREVEALS: <the very thing they were protecting, now betrayed>\n---';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const call = (extra) => page.evaluate(async ({ sys, extra }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: extra }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 1.05, max_tokens: 900 }) }); const j = await r.json(); return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); } catch (e) { return 'ERR:' + e.message; } }, { sys: SPEC, extra });
  const out = {};
  out.social = await call('Generate SIX new examples, contemporary everyday settings, all different domains. Follow the four-line format exactly.');
  await new Promise(r => setTimeout(r, 800));
  out.private = await call('Generate SIX new examples. AT LEAST THREE must be PRIVATE / solo acts with NO audience present (like checking the third mirror) — to prove the filters work WITHOUT a social act. Follow the four-line format exactly.');
  fs.writeFileSync(DIR + '/threefilter.json', JSON.stringify(out, null, 2));
  console.error('\n════════ SOCIAL SET ════════\n' + out.social);
  console.error('\n════════ PRIVATE/SOLO SET ════════\n' + out.private);
  console.error('\nDONE threefilter'); await browser.close(); process.exit(0);
})().catch(e => { console.error('3F-ERR', e.message); process.exit(1); });
