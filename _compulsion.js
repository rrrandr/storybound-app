// COMPULSION ASSAY (Roman 2026-08-03). Voice is the symptom; COMPULSION is the target — a mind that
// cannot stop running every input through the same wound + defense. Same guard, same opener, ONLY the
// mask's compulsion changes. Multi-turn exchange. Blind test: by exchange 3 I should know who; strip
// names → 9/10. If a model FED a compulsion produces recognizable minds, the pipeline fix is to DERIVE
// + feed compulsion from playerMask (it currently feeds wound+tells, i.e. theme, not the defense).
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/compulsion';
fs.mkdirSync(DIR, { recursive: true });

// The compulsion = the archetype's unconscious DEFENSE run on every stimulus (Roman's examples).
const COMPULSIONS = {
  OPEN_VEIN: 'Pain leaks out of her. She overshares — gives too much truth, too fast, too personal — because she cannot contain what she feels. She answers questions nobody asked, reveals more than the moment requires, and hands strangers the raw thing before they earn it. Containment is impossible for her.',
  ARMORED_FOX: 'She deflects with humor before anyone can see her bleed. She self-owns the joke first so no one else can land it. She never gives the real answer first — she gives the funny one. She changes the emotional temperature to keep people chasing her wit instead of seeing her hurt. Vulnerability is the one door she keeps locked.',
  HEART_WARDEN: 'Every situation instantly reorganizes around protecting other people. Others come first, always, reflexively — she is triaging their safety before she registers her own. She rarely asks anything for herself; she gives orders that shelter people and absorbs the cost silently.',
  DARK_VICE: 'She frames every interaction as leverage and possession. She offers no apology and no explanation. She states what she intends to take and lets the other person feel the imbalance. Warmth, when it appears, is a move. Control is the water she swims in.',
};

const GUARD_OPEN = 'State your business.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  for (const mask of Object.keys(COMPULSIONS)) {
    const sys = 'You ARE Rowan. Below is her CORE COMPULSION — the unconscious operating system her mind runs on. She does NOT know she does this; it is automatic. EVERY question, threat, and stimulus gets fed through it. NEVER name or explain the compulsion — only ENACT it in what she notices, says, and does. Do NOT narrate her psychology (forbidden: "I deflect", "my wound", "I overshare"). Reveal the MIND only through behavior and dialogue.\n\nCOMPULSION:\n' + COMPULSIONS[mask];
    const user = 'A gate guard blocks your way into a walled town, suspicious of you. Write the full exchange as dialogue — the guard pushes, you respond, for about 6 back-and-forths. The guard opens with: "' + GUARD_OPEN + '"\nFormat:\nGUARD: "..."\nROWAN: "..."\n(Keep Rowan first-person; terse; her every line runs through the compulsion.)';
    let out = null;
    for (let attempt = 0; attempt < 2 && !out; attempt++) {
      out = await page.evaluate(async ({ sys, user }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 600 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''); return c.length > 40 ? c : null; } catch (e) { return null; }
      }, { sys, user });
      if (!out) await new Promise(r => setTimeout(r, 3000));
    }
    if (out) fs.writeFileSync(DIR + '/comp_' + mask + '.txt', out);
    console.error('[' + mask + '] ' + (out ? '✓ (' + out.length + 'c)' : 'FAIL'));
    await new Promise(r => setTimeout(r, 3000));
  }
  console.error('DONE compulsion'); await browser.close(); process.exit(0);
})();
