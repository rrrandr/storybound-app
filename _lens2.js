// LENS v2 — OBSERVATION > METAPHOR (Roman 2026-08-03). Same Jess, same 4 observers as lens v1, but the
// style rule is inverted: NO metaphor/simile/symbol. Character comes from OPINIONATED OBSERVATION —
// notice a CONCRETE behavior/detail and JUDGE it the way only this narrator would. Ordinary words.
// Test: does forbidding metaphor make the 4 perceptions SHARPER + more revealing than the purple v1?
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/lens2';
fs.mkdirSync(DIR, { recursive: true });

const OBSERVERS = {
  OPEN_VEIN: 'Rowan assumes everyone is secretly hurting; she reads loneliness and hidden pain into people, because that is what she carries.',
  ARMORED_FOX: 'Rowan assumes everyone is running an angle or performing; she is cynical and instantly clocks the fake, the practiced, the rehearsed.',
  HEART_WARDEN: 'Rowan automatically sorts people into who needs protecting and who is a danger to others; she notices strain, exhaustion, who is carrying too much.',
  DARK_VICE: 'Rowan reads everyone as leverage: what they want, what they fear, what they can be made to do. She notices weakness and appetite.',
};

const OBJECTIVE = 'FACTS (identical for every narrator): A tall woman named JESS, in a deep red dress, enters the crowded tavern. She pauses in the doorway, scans the room once, laughs brightly at something a man near the fire says, and crosses to the bar.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  for (const mask of Object.keys(OBSERVERS)) {
    const sys = 'You are Rowan, first-person POV narrator. Rowan\'s mind: ' + OBSERVERS[mask] +
      '\n\nHARD STYLE RULES (this is the entire point — obey exactly):\n' +
      '1. NO metaphor, NO simile, NO "like a ___", NO symbolic imagery. If you write "like a signal flare", "clung like a dare", "bracing against a wind", or anything the reader must DECODE, you have FAILED.\n' +
      '2. Character comes from OPINIONATED OBSERVATION: notice ONE or TWO SPECIFIC, concrete, physical things Jess actually DOES (a practiced gesture, who she looks at first, a fake smile, a too-long pause, how she times the laugh) and JUDGE them the way ONLY Rowan would.\n' +
      '3. Plain, ordinary words. The personality is entirely in WHAT Rowan notices and HER JUDGMENT of it — never in imagery. Judgment, not poetry.\n' +
      '4. Reveal Rowan\'s mind, not Jess\'s. Two different narrators would notice DIFFERENT concrete details and judge them differently. Never name the bias.';
    const user = OBJECTIVE + '\n\nWrite 2-3 sentences: the specific thing(s) Rowan notices Jess DO, and what Rowan thinks of it. Concrete behavior + judgment. Zero metaphor.';
    let out = null;
    for (let attempt = 0; attempt < 2 && !out; attempt++) {
      out = await page.evaluate(async ({ sys, user }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 200 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''); return c.length > 30 ? c : null; } catch (e) { return null; }
      }, { sys, user });
      if (!out) await new Promise(r => setTimeout(r, 3000));
    }
    if (out) fs.writeFileSync(DIR + '/lens2_' + mask + '.txt', out);
    console.error('[' + mask + '] ' + (out ? '✓' : 'FAIL'));
    await new Promise(r => setTimeout(r, 3000));
  }
  console.error('DONE lens2'); await browser.close(); process.exit(0);
})();
