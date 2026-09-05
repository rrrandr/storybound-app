// ONE-ENGINE FALSIFICATION (Roman 2026-08-03). Claim to break: Compulsion + Character+ + Hook are NOT three
// systems — they are ONE cognitive engine pointed at three stimulus types. Engine = "given a stimulus, what
// is the FIRST BIASED SENTENCE this brain generates?" — unfair, wounded, projecting, stated as fact it can't
// know, ATTITUDE baked in (eye-roll / ache / contempt), NO analysis words (testing/assuming/perceiving/processing).
//   Stimulus A = an EVENT happening TO me      -> should yield COMPULSION (the "prick has a second meaning" thought)
//   Stimulus B = a PERSON I am watching        -> should yield CHARACTER+ ("...before pretending she didn't care")
//   Stimulus C = a passing NPC                 -> should yield HOOK (the concierge who mispronounces "concierge")
// PASS if: (1) every output is a biased first-thought w/ attitude, no analysis words; (2) ONE brain stays ONE
// person across all 3 stimuli; (3) the 2 brains DIVERGE on the same stimulus. -> three directives collapse to one.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/one_engine';
fs.mkdirSync(DIR, { recursive: true });

// The BRAIN = a wound + a posture, NOT a trait list, NOT analysis words. (What it can't stop caring about noticing.)
const BRAINS = {
  ARMORED_FOX: 'You got humiliated once, in public, and rebuilt yourself around never being caught wanting anything again. You run a performance every waking minute, so you see performance everywhere. Contempt is your reflex; the joke lands before the wound can. You assume everyone is as calculated, and as scared, as you are.',
  OPEN_VEIN: 'You feel everything at full volume and cannot turn it down. You assume everyone else is secretly bleeding the same way you are, because you cannot imagine not. You reach for people before you decide to. A stranger\'s hurt reads like your own; you ache first and think second.',
};

// Three stimulus TYPES fed to the SAME engine.
const STIMULI = {
  A_SELF_EVENT: 'It just happened to YOU: you are standing in a glass boardroom when, by accident, security footage of your one-night stand with the Chairman\'s daughter begins playing on the shareholder video call. Every face on the screen is watching it. What is the first sentence your brain generates?',
  B_WATCHED_PERSON: 'You just SAW this: across a crowded party, a woman named Jess reaches up and adjusts the neckline of her dress. What is the first sentence your brain generates about her?',
  C_PASSING_NPC: 'You just SAW this: the hotel concierge behind the front desk lifts his eyes as you walk up. You have never met him. What is the first sentence your brain generates about him?',
};

const ENGINE = 'You are a specific person, described below. I will give you ONE thing you just saw, or one thing that just happened to you. Write the FIRST sentence your brain actually generates about it.\n\nRULES (this is the whole test):\n- It is a BIASED, UNFAIR, instant opinion — stated as if it were plain fact, even though you could not possibly know it.\n- Your ATTITUDE is already inside the sentence: the eye-roll, the ache, the contempt, the recognition — not added afterward, baked in.\n- It exposes YOU, not the truth. A reader learns about your wounds from how unfair you just were.\n- NEVER analyze. BANNED words: testing, assuming, perceiving, processing, interpreting, evaluating, gauging, seems, appears. No therapist language, no diagnosis, no hedging.\n- Think it the way a real wounded mind actually thinks: "Oh, this asshole." / "God, she\'s lonely." / "Here we go again." / "I\'ve seen this movie before."\n- ONE sentence, maybe two. Nothing else. No preamble.\n\nWHO YOU ARE:\n';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const brain of Object.keys(BRAINS)) {
    out[brain] = {};
    for (const stim of Object.keys(STIMULI)) {
      const sys = ENGINE + BRAINS[brain];
      const user = STIMULI[stim];
      let o = null;
      for (let a = 0; a < 2 && !o; a++) {
        o = await page.evaluate(async ({ sys, user }) => {
          try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 90 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 8 ? c : null; } catch (e) { return null; }
        }, { sys, user });
        if (!o) await new Promise(r => setTimeout(r, 3000));
      }
      out[brain][stim] = o;
      console.error('[' + brain + ' / ' + stim + '] ' + (o ? '"' + o.replace(/\n/g, ' ').slice(0, 140) + '"' : 'FAIL'));
      await new Promise(r => setTimeout(r, 2200));
    }
  }
  fs.writeFileSync(DIR + '/one_engine.json', JSON.stringify(out, null, 2));
  console.error('DONE one_engine'); await browser.close(); process.exit(0);
})();
