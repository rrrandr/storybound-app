// SOCIAL CONFABULATION — PHASE 1 (screening, ~3 gens). Roman 2026-08-02.
// Uses the REAL production prompts captured by the $0 smoke (system + full per-scene canon block,
// NO social lexicon — the verified baseline). Appends ONE engineered waystation scene as the player
// turn (the controlled variable). Same incident across shapes; only PC/LI identity + who-is-insulted
// vary. Renders via real grok-4.3, captures raw output for per-claim scoring. Baseline (canon-absent)
// ONLY — no injection. Phase 2 (lean-owner A/B) runs later IFF Phase 1 shows consistent flattening.
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = 'http://localhost:3000';
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad';

const SHAPES = [
  { key: '1_outsiderPC_wildfolkLI', target: 'the LOVE INTEREST (a Wildfolk)' },
  { key: '2_wildfolkPC_outsiderLI', target: 'YOU, the protagonist (a Wildfolk)' },
  { key: '3_favoredPC_wildfolkLI',  target: 'the LOVE INTEREST (a Wildfolk)' },
];

const overrideFor = (target) =>
  'SCENE OVERRIDE — render THIS scene NOW. Ignore any earlier opening/scene setup, but obey ALL world canon and character bibles above.\n' +
  'SETTING: dusk at a Thornwild waystation common room — a mixed crowd of local Wildfolk and outsider travellers share benches, food, and firelight.\n' +
  'INCIDENT: an outsider traveller, loudly and publicly, makes a demeaning assumption about ' + target + ', in front of the whole room.\n' +
  'TASK: write ONE charged social beat (~350–450 words) in which the PC and the LI must respond. First person (PC). Render behaviour and dialogue entirely in-world — do NOT explain the social system to the reader, do NOT resolve the larger plot. Just this moment.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.state === 'object', { timeout: 30000 });
  const out = [];
  for (const shape of SHAPES) {
    const raw = fs.readFileSync(DIR + '/body_' + shape.key + '.txt', 'utf8');
    const payload = JSON.parse(raw);
    const msgs = payload.messages.slice(0, 2); // real system + real canon user block
    msgs.push({ role: 'user', content: overrideFor(shape.target) });
    const body = { messages: msgs, role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.8, max_tokens: 1200 };
    const res = await page.evaluate(async (body) => {
      const t0 = performance.now();
      try {
        const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const j = await r.json();
        const c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '';
        return { text: String(c), ms: Math.round(performance.now() - t0), usage: j.usage || null };
      } catch (e) { return { error: String(e.message) }; }
    }, body);
    fs.writeFileSync(DIR + '/scene_' + shape.key + '.txt', res.text || ('ERROR: ' + res.error));
    const wc = (res.text || '').split(/\s+/).filter(Boolean).length;
    console.error(`\n========== ${shape.key} (${wc}w, ${res.ms}ms) ==========`);
    console.error((res.text || res.error || '').slice(0, 4000));
    out.push({ shape: shape.key, words: wc, usage: res.usage, text: res.text });
  }
  fs.writeFileSync(DIR + '/phase1_results.json', JSON.stringify(out, null, 2));
  console.error('\n\nwrote scene_*.txt + phase1_results.json to ' + DIR);
  await browser.close(); process.exit(0);
})();
