const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/ablation';
const ODIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/prose';
const sys = fs.readFileSync(DIR + '/fullSys.txt', 'utf8');
const user = fs.readFileSync(DIR + '/user.txt', 'utf8');
// The concrete per-beat editorial decision, front-loaded onto the FULL prompt (keeps the scene + stakes).
const PLAN = '⚠ THIS SCENE\'S OPENING — the editor has decided it; obey EXACTLY, it overrides your instinct to open on emotion:\n' +
'  OPEN ON: her fingers tapping the stem of the glass she still holds, until it hums.\n' +
'  The reader must INFER (never stated): she will not let herself ask anyone for help.\n' +
'  Do NOT open on: her racing heart, or the crowd\'s eyes on her.\n' +
'  Evidence only in that opening — no "fear / panic / weakness / I realize / it was clear". Let the behavior carry it. The scene\'s danger and stakes remain fully in play; you are only choosing WHAT the first sentences notice.\n\n═══\n\n';
(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  let prose = null;
  for (let a = 0; a < 2 && !prose; a++) {
    prose = await page.evaluate(async ({ sys, u }) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: u }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.8, max_tokens: 3000 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 60 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys, u: PLAN + user });
    if (!prose) await new Promise(r => setTimeout(r, 4000));
  }
  fs.writeFileSync(ODIR + '/prose_D_integration.txt', prose || 'FAIL');
  console.error(prose || 'FAIL');
  await browser.close(); process.exit(0);
})().catch(e => { console.error('INT-ERR', e.message); process.exit(1); });
