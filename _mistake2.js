// DE-CONFOUND (Roman 2026-08-03). _mistake.js changed TWO things at once (compressed brain AND stripped the
// attitude-scaffolding from the prompt) -> outputs went mad-lib-flat (Open Vein: "hurting" in every line).
// Can't blame compression yet. Here: hold the RICH attitude prompt CONSTANT, feed ONLY the single mistake as
// the brain, and explicitly forbid restating the mistake's keyword. If richness/variety/attitude RETURN with
// the mistake alone -> the mistake IS sufficient and the earlier flatness was my poorer prompt (compression
// vindicated). If it STAYS flat -> the mistake alone is too little; texture (wound/posture) is load-bearing.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/mistake2';
fs.mkdirSync(DIR, { recursive: true });

const MISTAKES = {
  ARMORED_FOX: 'Everyone is performing.',
  OPEN_VEIN:   'Everyone is secretly hurting.',
  DARK_VICE:   'Everything is a hierarchy — every interaction is someone ranking above or below someone else.',
};
const STIMULI = {
  S1_AUTHORITY:  'A gate guard blocks your way and says, flatly: "State your business."',
  S2_WATCHED:    'Across the crowded room, a woman named Jess reaches up and adjusts the neckline of her dress.',
  S3_GENEROSITY: 'Your friend grabs the check before you can reach it and insists on paying for lunch.',
  S4_LOVE:       'Someone you have been seeing looks at you and says, for the first time, "I love you."',
  S5_NPC:        'The hotel concierge behind the front desk lifts his eyes as you walk up. You have never met him.',
};

// RICH attitude prompt held CONSTANT (same scaffolding as _one_engine) — the ONLY variable vs _mistake.js is
// that scaffolding is back. Brain is STILL just the one mistake. Plus an explicit anti-mad-lib rule.
const ENGINE = 'You are the protagonist of a novel, first person. Your brain has ONE recurring mistake it applies to EVERYTHING before you can consciously think:\n\n>> THE MISTAKE: "%%MISTAKE%%"\n\nEvery time you notice something, your brain has ALREADY reached an unfair conclusion by running it through that mistake. Report the conclusion exactly as it lands — a snap judgment leaking straight onto the page.\n\nRULES:\n- BIASED and UNFAIR, stated as plain fact you could not possibly know.\n- Your ATTITUDE is already INSIDE the sentence — the eye-roll, the ache, the contempt, the recognition — baked in, not added afterward.\n- SPECIFIC and CONCRETE: seize on an exact detail of what you saw and give it an unfair read. Do NOT restate the mistake — never use its keyword ("performing"/"hurting"/"ranking"/"above"/"below") as your verb. SHOW the mistake through a precise, surprising, unfair leap; never announce it.\n- It exposes YOU, not the truth. A reader learns your wound from how unfair you just were.\n- NO analysis words: testing, assuming, perceiving, processing, interpreting, evaluating, seems, appears, probably. No hedging.\n- Think it like a real wounded mind: "Oh, this asshole." / "God, she\'s lonely." / "Here we go again." / "I\'ve seen this movie."\n- ONE sentence, maybe two. Nothing else.';

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
          try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.95, max_tokens: 90 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 8 ? c : null; } catch (e) { return null; }
        }, { sys, user });
        if (!o) await new Promise(r => setTimeout(r, 3000));
      }
      out[brain][stim] = o;
      console.error('[' + brain + ' / ' + stim + '] ' + (o ? '"' + o.replace(/\n/g, ' ').slice(0, 150) + '"' : 'FAIL'));
      await new Promise(r => setTimeout(r, 2000));
    }
  }
  fs.writeFileSync(DIR + '/mistake2.json', JSON.stringify(out, null, 2));
  console.error('DONE mistake2'); await browser.close(); process.exit(0);
})();
