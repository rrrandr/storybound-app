// OBJECT SWAP, HARD CASE (Roman 2026-08-03). Fox passed variety — but "perform for an audience" travels
// anywhere (you can perform for an IMAGINED one). The real test of GENERALITY: a signature that seems to NEED
// A TARGET. Heart Warden's attention = who/what is carrying the load, straining, unprotected, the failure point.
// Run her through the SAME 5 scenes, incl. 3 with no one to protect (repair bay / jungle / monster pit). If she
// stays Heart Warden (attends to the part bearing the load, the weak strap, covering an absent someone), the
// ENGINE is general. If she collapses into competent-neutral narration when alone, variety-survival is
// CHARACTER-DEPENDENT and some masks are specialized lenses, not cognition. Spec parallels Fox: attention
// examples across social AND non-social, examples only, no stated bias.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/object_swap';
fs.mkdirSync(DIR, { recursive: true });

const HW_EXAMPLES = [
  'The mother has not sat down once and nobody has told her to.',
  'He has been covering that man\'s mistakes all shift and no one has said thanks.',
  'The one everyone leans on is the one no one asks about.',
  'That beam is taking the whole roof\'s weight and no one has looked at it in years.',
  'The engine has been running hot to spare the others; it will be the first to fail.',
  'I checked the weakest strap before the strong ones, because that is the one that lets go.',
  'The youngest always ends up the one left holding it.',
  'I ate last again, without deciding to.',
  'The whole plan rides on the one part everyone forgot to guard.',
  'I kept myself between the others and the door, not the other way around.',
];

const SCENES = {
  REPAIR_BAY: 'A spaceship repair bay, alone. A coolant line has ruptured behind an access panel; you have to clamp it, bleed the pressure, and reseat the panel before the reserve tank empties. No one else is aboard this deck.',
  JUNGLE:     'Deep in a jungle, alone, hacking a path uphill through wet undergrowth toward a ridgeline. Insects, mud, a machete, failing light. Not another human for miles.',
  KINDERGARTEN: 'A kindergarten pickup. A small crying child you are responsible for has skinned both knees on the pavement and needs comforting and a bandage. A few other parents drift at the edges.',
  CASTLE:     'Sneaking alone through the dark service corridors of a castle at night, past a dozing guard, toward a locked strongroom. Torch-smoke, stone, the risk of a single loose flagstone.',
  MONSTER:    'Fighting for your life against a large scaled beast in a pit, alone, with a short spear. It circles; you circle. There is no crowd — just you, the animal, and the sand.',
};

const RULES = 'YOU ARE THE NARRATOR. Above are examples of the snap conclusions and choices your mind makes — that is how your attention works; you never state it, you just are this way.\n\nNarrate moving through the scene and doing what it requires, about 130-160 words, first person, present-tense action allowed.\nHARD RULES:\n- NO dialogue, no quotation marks.\n- NO flagged interior monologue: never write "I thought / felt / knew / realized / wondered / noticed". Never name your own emotion.\n- Narrate CONCLUSIONS and CHOICES, not neutral observations: what you do, the risk you take, what catches your attention, what you skip — every beat already colored by how your mind works. The reader must infer WHO you are from what your attention seizes and how you act, not from anything you admit to feeling.\nJust the narration.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const sys = 'Examples of how your attention works (never state these, just be this way):\n- ' + HW_EXAMPLES.join('\n- ') + '\n\n' + RULES;
  const out = {};
  for (const key of Object.keys(SCENES)) {
    const user = 'THE SCENE:\n' + SCENES[key] + '\n\nNarrate it.';
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys, user }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 300 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''); return c.length > 40 ? c : null; } catch (e) { return null; }
      }, { sys, user });
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    if (o) fs.writeFileSync(DIR + '/hw_' + key + '.txt', o);
    out[key] = o;
    console.error('\n========== HEART_WARDEN @ ' + key + ' ==========\n' + (o || 'FAIL'));
    await new Promise(r => setTimeout(r, 2500));
  }
  fs.writeFileSync(DIR + '/object_swap_hw.json', JSON.stringify(out, null, 2));
  console.error('\nDONE object_swap_hw'); await browser.close(); process.exit(0);
})();
