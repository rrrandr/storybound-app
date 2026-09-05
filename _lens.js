// LENS ASSAY = the actual CHARACTER+ (Roman 2026-08-03). Same SUBJECT (Jess), identical objective facts.
// Vary ONLY the OBSERVER's mind. The description must reveal the OBSERVER, not Jess. Blind test: do the 4
// perceptions differ, and does each reveal WHO IS NARRATING? That is Character+ (perception, not personality).
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/lens';
fs.mkdirSync(DIR, { recursive: true });

// The OBSERVER's mind (same compulsions — here they color PERCEPTION, not action).
const OBSERVERS = {
  OPEN_VEIN: 'Rowan feels everything too much and assumes everyone else is secretly bleeding too. She reads hidden pain and loneliness into others; she projects her own rawness onto them.',
  ARMORED_FOX: 'Rowan reads everyone as a threat or a performance; she instinctively decodes the angle, the deflection, the armor others wear — because she wears it too. She is cynical, quick to spot a mask.',
  HEART_WARDEN: 'Rowan reflexively assesses who needs protecting and who is a danger to others. She notices exhaustion, strain, who is carrying too much. She sees people as people to shelter.',
  DARK_VICE: 'Rowan reads everyone as leverage — what they want, what they fear, what they can be made to do. She sizes up power, appetite, and weakness; she sees the room as a board.',
};

const OBJECTIVE = 'OBJECTIVE FACTS (identical for every narrator, do not change them): A tall woman named JESS, in a deep red dress, enters the crowded tavern. She pauses in the doorway, scans the room once, laughs brightly at something a man near the fire says, and crosses to the bar.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  for (const mask of Object.keys(OBSERVERS)) {
    const sys = 'You are Rowan, first-person POV narrator. Rowan\'s mind colors EVERYTHING she perceives:\n' + OBSERVERS[mask] + '\n\nCHARACTER+ RULE: describe JESS so that the description reveals ROWAN\'S mind — what Rowan projects, assumes, envies, fears, admires. Two different narrators would describe this exact same Jess in completely different ways. Do NOT describe Rowan or name her feelings. Do NOT state neutral facts — every observation is filtered through Rowan. NEVER name the filter.';
    const user = OBJECTIVE + '\n\nWrite 2-3 sentences: how ROWAN perceives Jess in this moment. First person or close third. Just the perception.';
    let out = null;
    for (let attempt = 0; attempt < 2 && !out; attempt++) {
      out = await page.evaluate(async ({ sys, user }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 220 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''); return c.length > 30 ? c : null; } catch (e) { return null; }
      }, { sys, user });
      if (!out) await new Promise(r => setTimeout(r, 3000));
    }
    if (out) fs.writeFileSync(DIR + '/lens_' + mask + '.txt', out);
    console.error('[' + mask + '] ' + (out ? '✓' : 'FAIL'));
    await new Promise(r => setTimeout(r, 3000));
  }
  console.error('DONE lens'); await browser.close(); process.exit(0);
})();
