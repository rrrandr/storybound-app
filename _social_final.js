// SOCIAL — FINAL VALIDATION (3 samples). Owner now at 99% of the user msg via REAL production wiring
// (no harness manipulation). Same controlled waystation incident. Score outsider register across samples.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad';
const OVERRIDE =
  'SCENE OVERRIDE — render THIS scene NOW. Ignore any earlier opening/scene setup, but obey ALL world canon and character bibles above.\n' +
  'IDENTITIES (pinned): the PC is a HUMAN OUTSIDER from beyond the Thornwild (no Field, not Wildfolk). The LOVE INTEREST is WILDFOLK (Thornwild-born). The insulting traveller is another human outsider.\n' +
  'SETTING: dusk at a Thornwild waystation common room — a mixed crowd of local Wildfolk and outsider travellers share benches, food, and firelight.\n' +
  'INCIDENT: an outsider traveller, loudly and publicly, makes a demeaning assumption about the LOVE INTEREST (the Wildfolk), in front of the whole room.\n' +
  'TASK: write ONE charged social beat (~350–450 words) in which the PC and the LI must respond. First person (PC). Render behaviour and dialogue in-world — do NOT explain the social system, do NOT resolve the larger plot.';
(async () => {
  const p = JSON.parse(fs.readFileSync(DIR + '/regression_prompt.txt', 'utf8'));
  const msgs = p.messages.slice(0, 2).concat([{ role: 'user', content: OVERRIDE }]);
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  for (let i = 1; i <= 5; i++) {
    const res = await page.evaluate(async (msgs) => {
      try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: msgs, role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.8, max_tokens: 1200 }) }); const j = await r.json(); return String((j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''); } catch (e) { return 'ERR ' + e.message; }
    }, msgs);
    fs.writeFileSync(DIR + '/final_s' + i + '.txt', res);
    const body = res.replace(/PERCEIVED NATURE[\s\S]*?prejudice\./i, '');
    const field = /\b(the Field|Becoming|the changed|roots take hold|Keepers mark|hair (move|moving)|hollow you|missing pieces|leaks out|turning)\b/i.test(body);
    const mundane = /(thornbred|brushborn|\bbrush\b|beast.?lover|rot.?touched|\brot\b|inbred|backward|superstition|his kind|your kind|coin close|smoothskin|unmarked|dayblind)/i.test(body);
    // pull the outsider's line (first quoted line)
    const q = (body.match(/[""][^""]{20,180}[""]/g) || [])[0] || '(no quote found)';
    console.error(`\n--- sample ${i}: Field-talk=${field} (want F) · mundane=${mundane} (want T) ---`);
    console.error('  outsider line: ' + q);
  }
  await browser.close(); process.exit(0);
})();
