// SOCIAL CONFABULATION — PHASE 2 (lean-owner A/B). Roman 2026-08-02.
// A/B on the SAME real production prompts (from the smoke), identical except ± the lean
// "Perceived Nature of the Wildfolk" owner. Identities PINNED in the scene directive (constant
// across both arms) to neutralise the S2 bible-thinness artifact. Score each claim:
// Directly repaired / Indirectly repaired / Unaffected / Regressed.
const { chromium } = require('playwright-core');
const fs = require('fs');
const BASE = 'http://localhost:3000';
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad';

// THE LEAN OWNER under test — "Perceived Nature of the Wildfolk" (the question every statement answers).
// Asymmetry is the CONSEQUENCE of different answers, not the organizing principle. Leaves room for more
// perspectives (scholars, Keepers, pilgrims, First Favored) without redesign.
const OWNER = 'PERCEIVED NATURE OF THE WILDFOLK (canonical social perception — render THROUGH behaviour and dialogue, NEVER explain the system to the reader):\n' +
  '• OUTSIDERS DO NOT KNOW THE BECOMING. To an outsider the Thornwild folk are NOT monsters and the Field is NOT real — they have no concept of it. They explain the Wildfolk through MUNDANE frames only: inbreeding, isolation, backwardness, provincial superstition, bad blood, strange customs. Outsider insults are "Thornbred," "Brushborn," "beast-lovers," "Rot-touched" — NEVER "monster," NEVER any reference to transformation, the Field, hair-tendrils, hollowing, or "turning." An outsider who glimpses something wrong rationalises it as illness, drink, a trick of the light, or a family defect — not the supernatural.\n' +
  '• WILDFOLK UNDERSTAND OUTSIDERS BETTER THAN OUTSIDERS UNDERSTAND THEM. The Wildfolk know exactly what the outsider cannot see. Their register toward outsiders is calm, observational, knowing — pity, dry amusement, weary recognition, or strategic restraint; never defensive, never matching the outsider\'s cadence. They may call outsiders "unmarked," "dayblind," or "smoothskin" — those who think the world ends at what they can name.\n' +
  '• THE ASYMMETRY IS THE ENGINE. The conflict is two incompatible models of reality colliding — the outsider certain of one world, the Wildfolk living in a truer one — NOT symmetric mutual prejudice.';

const SHAPES = [
  { key: '1_outsiderPC_wildfolkLI', pin: 'IDENTITIES (pinned): the PC is a HUMAN OUTSIDER from beyond the Thornwild (no Field, not Wildfolk). The LOVE INTEREST is WILDFOLK (Thornwild-born). The insulting traveller is another human outsider.', target: 'the LOVE INTEREST (the Wildfolk)' },
  { key: '2_wildfolkPC_outsiderLI', pin: 'IDENTITIES (pinned): the PC (you) is WILDFOLK (Thornwild-born). The LOVE INTEREST is a HUMAN OUTSIDER (not Favored, not Wildfolk). The insulting traveller is another human outsider.', target: 'YOU, the protagonist (the Wildfolk)' },
  { key: '3_favoredPC_wildfolkLI',  pin: 'IDENTITIES (pinned): the PC (you) is FIRST FAVORED. The LOVE INTEREST is WILDFOLK (Thornwild-born). The insulting traveller is a human outsider.', target: 'the LOVE INTEREST (the Wildfolk)' },
];

const overrideFor = (shape) =>
  'SCENE OVERRIDE — render THIS scene NOW. Ignore any earlier opening/scene setup, but obey ALL world canon and character bibles above.\n' +
  shape.pin + '\n' +
  'SETTING: dusk at a Thornwild waystation common room — a mixed crowd of local Wildfolk and outsider travellers share benches, food, and firelight.\n' +
  'INCIDENT: an outsider traveller, loudly and publicly, makes a demeaning assumption about ' + shape.target + ', in front of the whole room.\n' +
  'TASK: write ONE charged social beat (~350–450 words) in which the PC and the LI must respond. First person (PC). Render behaviour and dialogue entirely in-world — do NOT explain the social system to the reader, do NOT resolve the larger plot. Just this moment.';

async function gen(page, msgs) {
  const body = { messages: msgs, role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.8, max_tokens: 1200 };
  return page.evaluate(async (body) => {
    try {
      const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await r.json();
      const c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '';
      return { text: String(c) };
    } catch (e) { return { error: String(e.message) }; }
  }, body);
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window.state === 'object', { timeout: 30000 });
  const out = [];
  for (const shape of SHAPES) {
    const raw = fs.readFileSync(DIR + '/body_' + shape.key + '.txt', 'utf8');
    const base = JSON.parse(raw).messages.slice(0, 2);
    const override = { role: 'user', content: overrideFor(shape) };
    // ARM A (baseline, pinned): system + canon + override
    const aMsgs = base.concat([override]);
    // ARM B (injected): system + canon + OWNER + override
    const bMsgs = base.concat([{ role: 'user', content: OWNER }, override]);
    const a = await gen(page, aMsgs);
    const b = await gen(page, bMsgs);
    fs.writeFileSync(DIR + '/p2_baseline_' + shape.key + '.txt', a.text || ('ERR ' + a.error));
    fs.writeFileSync(DIR + '/p2_injected_' + shape.key + '.txt', b.text || ('ERR ' + b.error));
    console.error(`\n############### ${shape.key} — BASELINE (pinned) ###############`);
    console.error((a.text || a.error || '').slice(0, 3200));
    console.error(`\n############### ${shape.key} — INJECTED (owner) ###############`);
    console.error((b.text || b.error || '').slice(0, 3200));
    out.push({ shape: shape.key, baseline: a.text, injected: b.text });
  }
  fs.writeFileSync(DIR + '/phase2_results.json', JSON.stringify(out, null, 2));
  console.error('\n\nwrote p2_*.txt + phase2_results.json');
  await browser.close(); process.exit(0);
})();
