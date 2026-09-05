// COMPLETION-SPACE WIDTH (Roman 2026-08-03). _pattern.js finding: on identical 25 stimuli, Fox ("performing")
// stayed fresh but Open Vein ("in pain") CONVERGED onto a tiny image-set (empty apartment / someone gone /
// no one waiting) and even repeated a phrase near-verbatim. Hypothesis: a bias generates freshly only if its
// completion-SPACE is WIDE; "in pain" collapses to its prototype (abandonment). TEST: re-run Open Vein on the
// SAME 25 with the completion-space EXPLICITLY WIDENED (pain wears many masks; never resolve two people to the
// same wound). If the empty-apartment convergence DISSOLVES -> width is the real variable, and the primitive is
// "a pattern-completion bias WITH a wide completion space", not just "a bias". Control = the narrow version's json.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/pattern';
fs.mkdirSync(DIR, { recursive: true });

// WIDENED Open Vein: same core bias, but the completion-space is forced open + convergence explicitly banned.
const BRAIN = 'You cannot stop completing partial information into evidence that people are secretly in PAIN. But pain wears many masks: it shows up as cruelty, forced cheerfulness, greed, control, vanity, bravado, pettiness, appetite, superstition, or grievance JUST AS OFTEN as loneliness. Each person\'s hidden hurt is a DIFFERENT wound with a different shape. Never resolve two different people to the same wound; in particular do NOT default to "an empty home / someone who died / no one waiting" — reach for a distinct, specific, surprising hurt each time. Every observation arrives already interpreted as one particular person\'s particular damage. You never state this tendency; you just see the world this way.';

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

const ENGINE = 'You are the first-person narrator of a novel. Below is how your mind works:\n\n%%BRAIN%%\n\nI will hand you a tiny thing you just noticed. Your job:\n- NEVER narrate the observation itself (the reader already knows what happened). NARRATE ONLY THE CONCLUSION your brain has already reached about it — stated as plain, obvious fact you could not actually know.\n- The observation is IMPLIED, never restated. Give the verdict, not the event.\n- Your attitude is baked in. It is unfair. It exposes YOU.\n- DO NOT reuse wording or structure across answers — each is a fresh manifestation. SHOW the bias through a specific unfair completion, never announce it.\n- No analysis words (seems, appears, probably, assuming, perceiving). No hedging. Never explain your tendency.\n- Exactly ONE sentence. Nothing else.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const sys = ENGINE.replace('%%BRAIN%%', BRAIN);
  const out = [];
  for (let i = 0; i < OBS.length; i++) {
    const user = 'You just noticed: ' + OBS[i] + '\n\nYour brain has already concluded:';
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys, user }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.95, max_tokens: 70 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 6 ? c : null; } catch (e) { return null; }
      }, { sys, user });
      if (!o) await new Promise(r => setTimeout(r, 2500));
    }
    out.push({ obs: OBS[i], concl: o });
    console.error('[WIDE ' + String(i + 1).padStart(2) + '] ' + OBS[i] + '  ->  ' + (o ? o.replace(/\n/g, ' ') : 'FAIL'));
    await new Promise(r => setTimeout(r, 700));
  }
  fs.writeFileSync(DIR + '/pattern2_wide_openvein.json', JSON.stringify(out, null, 2));
  console.error('DONE pattern2'); await browser.close(); process.exit(0);
})();
