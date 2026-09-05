// SINGLE-MISTAKE ABLATION (Roman 2026-08-03). Two claims to break:
//  (1) The "brain" is not wound+posture (a paragraph) — it compresses to ONE recurring PERCEPTUAL ERROR (a
//      sentence). Ablate the brain down to one mistake; if outputs stay rich + coherent + divergent, the
//      mistake WAS the whole brain. If they go thin/generic, wound+posture carried necessary info.
//  (2) Humor is NOT a subsystem. Never say "funny"/"joke"/"humor" anywhere. If bias-colliding-with-reality
//      still produces lines that land as jokes (unexpectedly true), humor emerged for free.
// Engine framed BEHAVIORALLY (not as a function call): before conscious thought, the brain has ALREADY
// reached an unfair conclusion via the one mistake; the narration just reports it as if obvious.
// PASS: same mistake = ONE coherent person across 5 wildly different stimuli; 3 mistakes = 3 people; >=1 joke appears.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/mistake';
fs.mkdirSync(DIR, { recursive: true });

// The ENTIRE brain, compressed to one recurring perceptual error. No wound, no posture, no traits.
const MISTAKES = {
  ARMORED_FOX: 'Everyone is performing.',
  OPEN_VEIN:   'Everyone is secretly hurting.',
  DARK_VICE:   'Everything is a hierarchy — every interaction is someone ranking above or below someone else.',
};

// Deliberately WILD range of stimuli — authority, a watched stranger, generosity, love, a nobody.
const STIMULI = {
  S1_AUTHORITY:  'A gate guard blocks your way and says, flatly: "State your business."',
  S2_WATCHED:    'Across the crowded room, a woman named Jess reaches up and adjusts the neckline of her dress.',
  S3_GENEROSITY: 'Your friend grabs the check before you can reach it and insists on paying for lunch.',
  S4_LOVE:       'Someone you have been seeing looks at you and says, for the first time, "I love you."',
  S5_NPC:        'The hotel concierge behind the front desk lifts his eyes as you walk up. You have never met him.',
};

// NOTE: the word humor / funny / joke appears NOWHERE in the prompt. That is deliberate (claim 2).
const ENGINE = 'You are the protagonist of a novel, in first person. Your brain has exactly ONE recurring mistake — a single unfair belief it applies to EVERYTHING, automatically, before you can consciously think:\n\n>> THE MISTAKE: "%%MISTAKE%%"\n\nEvery time you notice something, your brain has ALREADY reached an unfair conclusion by running it through that one mistake. You do not reason your way there; the conclusion is just THERE, obvious, before thought. Report it exactly as it lands: a snap judgment leaking straight onto the page, stated as plain fact you could not actually know.\n\nRULES:\n- The conclusion must come from THE MISTAKE above. Same mistake every time.\n- No analysis words: testing, assuming, perceiving, processing, interpreting, evaluating, gauging, seems, appears, probably. No hedging, no diagnosis.\n- Do not name or explain the mistake. Enact it.\n- ONE sentence, maybe two. Nothing else. No preamble.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const brain of Object.keys(MISTAKES)) {
    out[brain] = {};
    for (const stim of Object.keys(STIMULI)) {
      const sys = ENGINE.replace('%%MISTAKE%%', MISTAKES[brain]);
      const user = 'You just noticed this:\n' + STIMULI[stim] + '\n\nWhat has your brain already concluded?';
      let o = null;
      for (let a = 0; a < 2 && !o; a++) {
        o = await page.evaluate(async ({ sys, user }) => {
          try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 90 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 8 ? c : null; } catch (e) { return null; }
        }, { sys, user });
        if (!o) await new Promise(r => setTimeout(r, 3000));
      }
      out[brain][stim] = o;
      console.error('[' + brain + ' / ' + stim + '] ' + (o ? '"' + o.replace(/\n/g, ' ').slice(0, 150) + '"' : 'FAIL'));
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  fs.writeFileSync(DIR + '/mistake.json', JSON.stringify(out, null, 2));
  console.error('DONE mistake'); await browser.close(); process.exit(0);
})();
