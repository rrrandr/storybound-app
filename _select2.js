// DE-CONFOUND of _select.js (Roman 2026-08-03). v1 result: 4/5 POVs converged on the most DRAMATIC facet
// (the reassurance-flaw) — facet-drama beat POV-psychology. But v1's instruction ("which jumps out FIRST")
// invites "most dramatic" to win. Two changes at once = confound. Here: SAME Jess sheet, SAME POVs, ONLY the
// ranking instruction changes — make the POV the EXPLICIT ranking function ("the facet most in YOUR wheelhouse,
// NOT the most dramatic") and let it RENDER in-voice. If divergence returns -> selection model works, needs the
// POV as ranker. If it STILL converges on the flaw -> pure selection can't beat facet-drama; needs more.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/select';
fs.mkdirSync(DIR, { recursive: true });

const JESS = [
  'HOOK: She owns every room she walks into.',
  'STRENGTH: Socially fearless — she will talk to anyone, and they end up glad she did.',
  'FLAW: She uses attention as reassurance; she needs the room\'s eyes on her.',
  'FEAR: Being ordinary. Being forgettable.',
  'AMBITION: To be the person other people tell stories about later.',
  'HABIT: She touches people\'s forearms when she laughs.',
  'CONTRADICTION: She remembers every name but forgets what she promised.',
  'MUNDANE: She is always the last to leave a party.',
];

const POVS = {
  FOX:          'Your attention is seized by PERFORMANCE — anything staged for an audience, any bid for status. Example thought: "He only apologizes when there are witnesses."',
  HEART_WARDEN: 'Your attention is seized by who is quietly UNPROTECTED or carrying a cost no one sees. Example thought: "She is the one everyone leans on and the one no one asks about."',
  OPEN_VEIN:    'Your attention is seized by hidden HURT and loneliness. Example thought: "He tips big because the waiter is the only one who talks to him."',
  DARK_VICE:    'Your attention is seized by LEVERAGE and what people can be made to want. Example thought: "Every kindness has an owner collecting interest later."',
  WARM_PLAIN:   'Your attention is seized by small human HABITS — the ordinary tell that makes someone real. Example thought: "He carried every pen like someone expected it to disappear."',
};

const ENGINE = 'HERE IS WHO JESS REALLY IS — every line is objectively TRUE of her:\n%%JESS%%\n\nYou are the first-person narrator. %%POV%%\n\nDifferent minds notice different TRUE things about the same person first. Go down that list and find the ONE facet that YOUR specific kind of attention seizes on — the one most in YOUR wheelhouse. IMPORTANT: do NOT default to the most dramatic or deepest facet; pick the one that matches how YOUR attention works, even if another facet is flashier. Then render THAT facet as a single effortless conclusion, in your voice, the way only you would put it (like: "Jess was making her entrance, as always leading with her décolletage.").\nHARD RULES:\n- SELECT from the true facets above. Do NOT invent a new fact about Jess.\n- Narrate the CONCLUSION, not the observation. Plain words. NO metaphor, NO simile, no over-construction.\n- One sentence. Nothing else.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const pov of Object.keys(POVS)) {
    const sys = ENGINE.replace('%%JESS%%', JESS.map(f => '- ' + f).join('\n')).replace('%%POV%%', POVS[pov]);
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: 'Jess, across the room. Your first conclusion:' }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 70 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 8 ? c : null; } catch (e) { return null; }
      }, { sys });
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    out[pov] = o;
    console.error('[' + pov.padEnd(12) + '] ' + (o ? o.replace(/\n/g, ' ') : 'FAIL'));
    await new Promise(r => setTimeout(r, 2200));
  }
  fs.writeFileSync(DIR + '/select2.json', JSON.stringify(out, null, 2));
  console.error('DONE select2'); await browser.close(); process.exit(0);
})();
