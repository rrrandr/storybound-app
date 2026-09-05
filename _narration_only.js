// THE TEST THAT MATTERS (Roman 2026-08-03). Strip dialogue + interior monologue; leave ONLY narration of the
// world. If it's still unmistakably Fox -> a CHARACTER (bias lives in PERCEPTION). If not -> a talking style.
// Also tests Roman's implementation claim: expose EXAMPLES, not a stored slogan (LLMs imitate, don't execute a
// psychological algorithm). Each mind is specified ONLY by ~8 example snap-thoughts — NO stated bias/worldview.
// Same objective scene narrated by 3 minds. Hard rules: no quoted speech, no "I thought/felt/knew/realized",
// no named emotions. Narrate CONCLUSIONS not observations. Blind test: are these 3 unmistakably 3 people from
// the WORLD-DESCRIPTION alone? (single rich scene = honest proxy for "a whole issue then erase the dialogue")
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/narration_only';
fs.mkdirSync(DIR, { recursive: true });

// SPEC = examples only. What the mind DOES, never what it believes. No slogan anywhere.
const EXAMPLES = {
  FOX: [
    'Another man rehearsing confidence.',
    'He is smiling because the cameras are on.',
    'She checked who was watching before pretending she did not care.',
    'Cute. He practiced that laugh in the mirror.',
    'He only apologizes when there are witnesses.',
    'Everyone in here is auditioning for someone.',
    'That handshake was blocked out in advance.',
    'She wore that for the story she will tell about it later.',
  ],
  OPEN_VEIN: [
    'He checked the door twice, hoping.',
    'She laughed half a second too fast; she needed me to buy it.',
    'He would rather hold the door than admit he wanted the company.',
    'That coat has been zipped to the throat since someone stopped warming her.',
    'He tips big because the waiter is the only one who talks to him.',
    'She fixed her hair for a person who is not coming.',
    'He keeps his phone face-up like the next buzz decides the night.',
    'The old man feeds the birds so the bench will not be empty.',
  ],
  HEART_WARDEN: [
    'The mother has not sat down once and nobody has told her to.',
    'He has been covering that man\'s mistakes all shift and no one has said thanks.',
    'She is the one everyone leans on and the one no one asks about.',
    'The kid is minding the younger ones while the adults talk.',
    'He gave up his seat and nobody noticed he was tired too.',
    'She refilled everyone\'s glass before her own, again.',
    'The new hire is drowning and smiling so no one will see it.',
    'Someone has been carrying this room all night and it is not the loud one.',
  ],
};

const SCENE = 'THE SCENE (identical objective facts; narrate walking through it toward the front desk):\nA busy hotel lobby at check-in hour. A family with three suitcases waits by the elevators, the youngest child pulling at the luggage cart. A businessman paces near the window with a phone to his ear. A young woman in a blazer works the front desk, tapping at a keyboard. A bellhop stacks bags onto a brass cart. A couple shares a small sofa under a large mirror. The chandelier is on; a piano plays somewhere out of sight.';

const RULES = 'YOU ARE THE NARRATOR. Above are examples of the snap conclusions your mind reaches — that is HOW YOU SEE. Do NOT restate or explain them; just see the world the same way.\n\nNarrate walking through the scene toward the desk, about 140-170 words, first person.\nHARD RULES (the entire test):\n- NO dialogue. No quotation marks. Nobody speaks.\n- NO flagged interior monologue: never write "I thought / felt / knew / realized / decided / noticed / wondered". Never name your own emotion.\n- Narrate CONCLUSIONS, not observations: every person and object arrives already judged by you. The reader must infer WHO you are purely from HOW you describe the room and the people — not from anything you say or admit to feeling.\n- No metaphor-for-its-own-sake; the judgment does the work, plainly.\nJust the narration.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const mind of Object.keys(EXAMPLES)) {
    const sys = 'Examples of how your mind snaps to a conclusion (never state these, just see this way):\n- ' + EXAMPLES[mind].join('\n- ') + '\n\n' + RULES;
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys, scene }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: scene }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 320 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''); return c.length > 40 ? c : null; } catch (e) { return null; }
      }, { sys, scene: SCENE });
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    if (o) fs.writeFileSync(DIR + '/narr_' + mind + '.txt', o);
    out[mind] = o;
    console.error('\n========== ' + mind + ' ==========\n' + (o || 'FAIL'));
    await new Promise(r => setTimeout(r, 2500));
  }
  fs.writeFileSync(DIR + '/narration_only.json', JSON.stringify(out, null, 2));
  console.error('\nDONE narration_only'); await browser.close(); process.exit(0);
})();
