// RICHER PRIMITIVE, not wider space (Roman 2026-08-03). Correcting my wrong lesson ("completion-space width").
// Claim: the previously-collapsing biases failed because they were ABSTRACT WORLDVIEWS ("everyone is in pain" /
// "everything is hierarchy") with ~3-4 natural manifestations, NOT because their space needed widening. Replace
// them with RICH RECURRING MISTAKES that name a repeatable human MOVE (dozens of concrete completions, no tragic
// backstories). Same 25 obs, same narrate-conclusions engine. 3-way compare vs _pattern.js (narrow worldview =>
// prototype collapse) and _pattern2.js (forced-wide => melodrama + schema convergence).
// PASS: fresh, specific micro-theories, coherent ONE mind, NO backstory melodrama, NO prototype collapse.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/pattern';
fs.mkdirSync(DIR, { recursive: true });

// Rich MOVE-based primitives (Roman's) — a recurring cognitive mistake, not a categorical worldview.
const BRAINS = {
  OPEN_VEIN_rich: 'Your brain cannot stop completing partial evidence into this one recurring read: people are always trying to HIDE the exact moment they most need someone. You catch the flinch, the too-fast recovery, the thing they almost did and stopped. Every observation arrives already read as a need being covered up. You never state this tendency; you just see the world this way.',
  DARK_VICE_rich: 'Your brain cannot stop completing partial evidence into this one recurring read: every kindness has an owner who will collect interest later. You see the debt being created, the leverage being banked, the favor that is really a lien. Every observation arrives already read as a transaction with a hidden due date. You never state this tendency; you just see the world this way.',
};

const OBS = [
  'A man checks his watch.', 'A waiter smiles at you.', 'A child drops an ice cream cone on the sidewalk.',
  'A woman fixes her hair in a shop window.', 'A man leaves an unusually large tip.', 'A dog barks at nothing across the street.',
  'A phone buzzes face-up on the table.', 'A bartender wipes the same glass again.', 'A CEO laughs a little too loudly at a meeting.',
  'A taxi driver sighs as you get in.', 'A barista draws a heart in the coffee foam.', 'An old man scatters bread for the pigeons.',
  'A teenager takes a selfie by the fountain.', 'A woman returns a dress at the counter.', 'A man holds the elevator door for you.',
  'A nurse flips through a chart without looking up.', 'A street musician tunes his guitar.', 'A couple argues in low voices in the corner.',
  'A boy raises his hand in class.', 'A woman laughs at her own joke.', 'A man reads the same page twice.',
  'A cashier counts the drawer at closing.', 'A jogger stops to stretch against a lamppost.', 'A waiter recommends the most expensive special.',
  'A woman leaves a big tip and lingers at the table.',
];

const ENGINE = 'You are the first-person narrator of a novel. Below is how your mind works:\n\n%%BRAIN%%\n\nI hand you a tiny thing you just noticed. NARRATE ONLY THE CONCLUSION your brain has already reached — the observation is IMPLIED, never restated; give the verdict, not the event, as plain obvious fact you could not actually know. Attitude baked in, unfair, exposes YOU. Do NOT reuse wording or structure across answers; do NOT invent long tragic backstories (this is a SNAP read, one glance, not a dossier). No analysis words (seems/appears/probably/assuming). Exactly ONE sentence.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const brain of Object.keys(BRAINS)) {
    out[brain] = [];
    const sys = ENGINE.replace('%%BRAIN%%', BRAINS[brain]);
    for (let i = 0; i < OBS.length; i++) {
      const user = 'You just noticed: ' + OBS[i] + '\n\nYour brain has already concluded:';
      let o = null;
      for (let a = 0; a < 2 && !o; a++) {
        o = await page.evaluate(async ({ sys, user }) => {
          try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.95, max_tokens: 60 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 6 ? c : null; } catch (e) { return null; }
        }, { sys, user });
        if (!o) await new Promise(r => setTimeout(r, 2500));
      }
      out[brain].push({ obs: OBS[i], concl: o });
      console.error('[' + brain.slice(0, 8) + ' ' + String(i + 1).padStart(2) + '] ' + OBS[i] + '  ->  ' + (o ? o.replace(/\n/g, ' ') : 'FAIL'));
      await new Promise(r => setTimeout(r, 650));
    }
    console.error('---');
  }
  fs.writeFileSync(DIR + '/rich.json', JSON.stringify(out, null, 2));
  console.error('DONE rich'); await browser.close(); process.exit(0);
})();
