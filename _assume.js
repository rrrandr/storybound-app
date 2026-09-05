// ASSUMPTION ASSAY (Roman 2026-08-03) — the real primitive: distinctive INFERENCE, not distinctive trait.
// ONE concrete thing Jess does. Four observer brains, each with a DEFAULT INTERPRETATION ("everything is
// secretly about X"). Output = the ONE-LINE conclusion each brain instantly JUMPS to. Not description,
// not analysis — the snap assumption. Target quality = Roman's examples (Open Vein "hoping somebody chooses
// her" / Armored Fox "checked whether everyone was looking before pretending she didn't care" / etc).
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/assume';
fs.mkdirSync(DIR, { recursive: true });

// Each observer's DEFAULT INTERPRETATION — the recurring cognitive lens ("everything is secretly about ___").
const LENSES = {
  OPEN_VEIN:     'To Rowan, everything is secretly about intimacy and belonging — whether someone is lonely, whether they are hoping to be seen and chosen.',
  ARMORED_FOX:   'To Rowan, everything is secretly about status and exposure — who is performing, who is checking whether they are watched, who is pretending not to care.',
  HEART_WARDEN:  'To Rowan, everything is secretly about danger — who is about to get hurt, who needs protecting, who will be taken advantage of.',
  DARK_VICE:     'To Rowan, everything is secretly about power and ownership — who is working an angle, who owns whom, who is going to pay.',
  SPELLBINDER:   'To Rowan, everything is secretly about hidden rules — the real game underneath, who is really in control, what is actually being negotiated.',
  BEAUTIFUL_RUIN:'To Rowan, everything is secretly about pretending — who is faking it, who is one bad night from ruin, whose confidence is a performance about to crack.',
};

const THING = 'Jess reaches up and adjusts the neckline of her dress.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const mask of Object.keys(LENSES)) {
    const sys = 'You are Rowan. ' + LENSES[mask] + '\n\nRULE: You will be shown ONE concrete thing a woman named Jess does. Write the SINGLE conclusion Rowan INSTANTLY jumps to about Jess — the snap assumption her brain reaches before she can stop it. It is a JUMPED-TO conclusion, possibly unfair, revealing more about Rowan than about Jess. NOT a description of the action. NOT analysis. NO metaphor. ONE plain sentence. It should reveal how Rowan sees the world.';
    const user = 'Jess does this: "' + THING + '"\n\nRowan instantly thinks:';
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys, user }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 80 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 8 ? c : null; } catch (e) { return null; }
      }, { sys, user });
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    out[mask] = o; console.error('[' + mask + '] ' + (o ? '"' + o.replace(/\n/g, ' ').slice(0, 120) + '"' : 'FAIL'));
    await new Promise(r => setTimeout(r, 2500));
  }
  fs.writeFileSync(DIR + '/assumptions.json', JSON.stringify(out, null, 2));
  console.error('DONE assume'); await browser.close(); process.exit(0);
})();
