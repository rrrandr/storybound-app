// THE 25-OBSERVATION TEST (Roman 2026-08-03). Correcting the leap: NOT "a character IS one mistake" but
// "one recurring bias is a GENERATOR that completes partial evidence into a fresh manifestation every time."
// So the bias is injected as a GENERATIVE RULE, never a slogan; the narration law is "narrate CONCLUSIONS,
// not observations"; and we ROTATE THE EVIDENCE (25 unrelated tiny observations), never the bias.
// PASS: after 25 completely unrelated observations I still think "yep, that's Armored Fox" with ZERO sense of
// repetition (no reused wording, no reused completion) — AND a second brain diverges on the identical 25.
// If repetition creeps in -> the primitive is still one layer above. Second brain = divergence control.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/pattern';
fs.mkdirSync(DIR, { recursive: true });

// The bias as a GENERATIVE RULE (Roman's phrasing) — a pattern-completion compulsion, not a stored sentence.
const BRAINS = {
  ARMORED_FOX: 'You cannot stop completing partial information into evidence that people are PERFORMING — for status, approval, manipulation, or self-protection. Every observation arrives already interpreted as a performance you have seen through. You never state this tendency; you just see the world this way.',
  OPEN_VEIN:   'You cannot stop completing partial information into evidence that people are secretly IN PAIN — lonely, grieving, unloved, or barely holding together. Every observation arrives already interpreted as a hidden hurt you recognize because you carry your own. You never state this tendency; you just see the world this way.',
};

// 25 unrelated, mostly-mundane observations. The EVIDENCE rotates; the bias does not.
const OBS = [
  'A man checks his watch.',
  'A waiter smiles at you.',
  'A child drops an ice cream cone on the sidewalk.',
  'A woman fixes her hair in a shop window.',
  'A man leaves an unusually large tip.',
  'A dog barks at nothing across the street.',
  'A phone buzzes face-up on the table.',
  'A bartender wipes the same glass again.',
  'A CEO laughs a little too loudly at a meeting.',
  'A taxi driver sighs as you get in.',
  'A barista draws a heart in the coffee foam.',
  'An old man scatters bread for the pigeons.',
  'A teenager takes a selfie by the fountain.',
  'A woman returns a dress at the counter.',
  'A man holds the elevator door for you.',
  'A nurse flips through a chart without looking up.',
  'A street musician tunes his guitar.',
  'A couple argues in low voices in the corner.',
  'A boy raises his hand in class.',
  'A woman laughs at her own joke.',
  'A man reads the same page twice.',
  'A cashier counts the drawer at closing.',
  'A jogger stops to stretch against a lamppost.',
  'A waiter recommends the most expensive special.',
  'A woman leaves a big tip and lingers at the table.',
];

// Engine = the narration law. NARRATE THE CONCLUSION, never the observation. Report it as obvious fact.
const ENGINE = 'You are the first-person narrator of a novel. Below is how your mind works:\n\n%%BRAIN%%\n\nI will hand you a tiny thing you just noticed. Your job:\n- NEVER narrate the observation itself (the reader already knows what happened). NARRATE ONLY THE CONCLUSION your brain has already reached about it — stated as plain, obvious fact you could not actually know.\n- The observation is IMPLIED, never restated. Give the verdict, not the event.\n- Your attitude is baked in. It is unfair. It exposes YOU.\n- DO NOT reuse wording or structure across answers — each is a fresh manifestation of the same way of seeing. Never repeat a keyword like "performance" or "pain"; SHOW the bias through a specific unfair completion, never announce it.\n- No analysis words (seems, appears, probably, assuming, perceiving). No hedging. Never explain your tendency.\n- Exactly ONE sentence. Nothing else.';

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
          try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.95, max_tokens: 70 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 6 ? c : null; } catch (e) { return null; }
        }, { sys, user });
        if (!o) await new Promise(r => setTimeout(r, 2500));
      }
      out[brain].push({ obs: OBS[i], concl: o });
      console.error('[' + brain.slice(0, 3) + ' ' + String(i + 1).padStart(2) + '] ' + OBS[i] + '  ->  ' + (o ? o.replace(/\n/g, ' ') : 'FAIL'));
      await new Promise(r => setTimeout(r, 700));
    }
    console.error('---');
  }
  fs.writeFileSync(DIR + '/pattern.json', JSON.stringify(out, null, 2));
  console.error('DONE pattern'); await browser.close(); process.exit(0);
})();
