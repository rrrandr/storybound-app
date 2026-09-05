// THE OBJECT SWAP TEST (Roman 2026-08-03). The nastier test: prove the engine survives VARIETY, not length.
// Same Fox, specified ONLY by examples. Change only the ENVIRONMENT — and deny him his comfort zone (people to
// read in a social room). If Fox is still Fox alone in a repair bay / a jungle / a monster fight, the signature
// is COGNITION (a character). If he only works when reading people, it's a SPECIALIZED SOCIAL LENS (genre behavior).
// Upgrade per Roman: the primitive is ATTENTION, not perception — what his brain involuntarily spends bandwidth
// on (problems noticed, risks taken, what becomes memory, what he won't admit) — NOT a slogan ("everything is
// staged"). So the examples show performance-ATTENTION across social AND solo/task/risk/memory contexts.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/object_swap';
fs.mkdirSync(DIR, { recursive: true });

// Fox by EXAMPLES ONLY — attention captured by performance/audience even with NO ONE around. No stated bias.
const FOX_EXAMPLES = [
  'Another man rehearsing confidence.',
  'He only apologizes when there are witnesses.',
  'She checked who was watching before pretending she did not care.',
  'I tightened the last bolt a second time, in case the footage ever got reviewed.',
  'The clean way to do it would look better, so I did it the clean way.',
  'I took the harder route; the easy one would not be worth mentioning later.',
  'The scar was already worth more as a story than the fight had been.',
  'Even alone, I caught myself standing like someone was filming it.',
  'I kept my breathing even, the way a man does when he assumes he is being watched.',
  'The quiet got to me; with no audience I did not quite know how to hold my own hands.',
];

// Five scenes chosen to DENY the social-reading comfort zone: solo task, wilderness, care, stealth, combat.
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
  const sys = 'Examples of how your attention works (never state these, just be this way):\n- ' + FOX_EXAMPLES.join('\n- ') + '\n\n' + RULES;
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
    if (o) fs.writeFileSync(DIR + '/fox_' + key + '.txt', o);
    out[key] = o;
    console.error('\n========== FOX @ ' + key + ' ==========\n' + (o || 'FAIL'));
    await new Promise(r => setTimeout(r, 2500));
  }
  fs.writeFileSync(DIR + '/object_swap.json', JSON.stringify(out, null, 2));
  console.error('\nDONE object_swap'); await browser.close(); process.exit(0);
})();
