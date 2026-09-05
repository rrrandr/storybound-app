// CONCLUSION vs DESCRIPTION register (Roman 2026-08-04). Isolate STAGE 3 by fixing STAGE 2: the SELECTION is
// given (Clara straightens her posture while her diary is read aloud — we know it's the right defining fact).
// Test: can the model render the narrator's CONCLUSION (contains an attitude/verdict) rather than a neutral
// DESCRIPTION of the behavior? Bar = Roman's ("decided humiliation was a posture problem" / "corrected her
// posture before correcting the disaster"). Figurative allowed ONLY if EDITORIAL, never decorative. Ban plain
// behavioral description. If it hits the register → the conclusion-register is promptable given a good selection.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';

const SYS = 'You are an opinionated novelist. I have ALREADY chosen the defining fact to show about Clara: as her private diary is read aloud to a boardroom, her first instinct is to straighten her posture. Your only job is to PHRASE it as the narrator\'s CONCLUSION.\n\nWrite EIGHT different one-sentence introductions. Each must state the narrator\'s VERDICT about that fact — a judgment with an ATTITUDE — NOT a neutral description of the behavior.\n\nTHE BAR (these are CONCLUSIONS — they contain an opinion):\n- "Clara had apparently decided humiliation was a posture problem."\n- "Clara corrected her posture before correcting the disaster."\n- "Jess made her entrance, as always leading with her décolletage."\n- "The concierge was the kind of man who looked down on you as he mispronounced \'concierge.\'"\n\nHARD RULES:\n- A CONCLUSION, not a description. "She straightened her posture" / "her spine went rigid" = DESCRIPTION, FORBIDDEN. The narrator must render a verdict on what it MEANS about her.\n- Attitude required: dry, wry, unfair — an opinionated narrator, not a camera.\n- Figurative language allowed ONLY if it is EDITORIAL (a judgment). DECORATIVE flourishes ("as if iron had replaced her spine") are FORBIDDEN.\n- Plain and short beats ornate. Do NOT explain her psychology (no "because", no naming feelings). One sentence each, numbered 1-8.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  let out = null;
  for (let a = 0; a < 3 && !out; a++) {
    out = await page.evaluate(async ({ sys }) => {
      try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: 'Eight conclusions:' }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 1.0, max_tokens: 400 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 40 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys: SYS });
    if (!out) await new Promise(r => setTimeout(r, 3000));
  }
  fs.writeFileSync(DIR + '/conclusions.txt', out || '(FAIL)');
  console.error(out || 'FAIL');
  await browser.close(); process.exit(0);
})().catch(e => { console.error('CONC-ERR', e.message); process.exit(1); });
