// SELECTION, NOT INVENTION (Roman 2026-08-03). Character+ reframed after the audit (22/23 fields already reach
// the author): it's a RANKING problem over TRUE facets, not a representation problem. Test the mechanism:
// fix ONE NPC (Jess) with N labeled TRUE facets (strengths/flaws/habits/contradiction/fear/ambition/mundane).
// Give each POV a psychology. Ask: which ONE true facet jumps out FIRST -> one effortless conclusion.
// VERIFY: (1) each POV SELECTS a real facet from the sheet (does NOT invent a new fact); (2) POVs DIVERGE on
// the same Jess; (3) at least one latches onto a NON-FLAW (strength/habit/mundane); (4) prose hits the
// effortless bar ("leading with her décolletage"), not over-constructed AI-writing.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/select';
fs.mkdirSync(DIR, { recursive: true });

// Jess's TRUE facets (Roman's sheet + breadth so non-flaws are available to latch onto). ALL true, objective.
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

// POVs by short salience-rule + one example (examples > slogans, per the arc). NOT a bias to distort reality —
// just what this mind's attention weights heaviest.
const POVS = {
  FOX:          'Your attention is seized by performance — anything staged for an audience. Example thought: "He only apologizes when there are witnesses."',
  HEART_WARDEN: 'Your attention is seized by who is quietly unprotected or carrying a cost no one sees. Example thought: "She is the one everyone leans on and the one no one asks about."',
  OPEN_VEIN:    'Your attention is seized by hidden hurt and loneliness. Example thought: "He tips big because the waiter is the only one who talks to him."',
  DARK_VICE:    'Your attention is seized by leverage and what people can be made to want. Example thought: "Every kindness has an owner collecting interest later."',
  WARM_PLAIN:   'Your attention is seized by small human habits — the ordinary tell that makes someone real. Example thought: "He carried every pen like someone expected it to disappear."',
};

const ENGINE = 'HERE IS WHO JESS REALLY IS — every line is objectively TRUE of her:\n%%JESS%%\n\nYou are the first-person narrator. %%POV%%\n\nYou see Jess across a crowded room. ONE of the true facets above jumps out at you FIRST — the one YOUR attention weights heaviest. Write a SINGLE effortless sentence that reports that facet as an obvious conclusion (like: "Jess was making her entrance, as always leading with her décolletage.").\nHARD RULES:\n- SELECT from what is true above. Do NOT invent a new fact about Jess that is not one of those facets.\n- Narrate the CONCLUSION, not the observation. Plain words. NO metaphor, NO simile, no over-construction.\n- One sentence. Nothing else.';

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
  fs.writeFileSync(DIR + '/select.json', JSON.stringify(out, null, 2));
  console.error('DONE select'); await browser.close(); process.exit(0);
})();
