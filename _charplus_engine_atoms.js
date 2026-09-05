// ENGINE-GENERATED ATOMS probe (Roman 2026-08-06). THE production question: can Storybound MANUFACTURE the better
// representation itself? Take the REAL Mara psychology bible (charplus_bible.json), generate 20 behavioral atoms FROM
// it, throw the psychology away, feed ONLY the generated atoms into the same 20-situation behavior generator. Compare
// 3-way: A=today's psychology/tic run (floor, charplus_behaviors.json) · B=hand-authored atoms (ceiling,
// charplus_behavioral.json) · C=THIS engine-generated atoms. Does C beat A and approach B? Calcification warning baked
// into atom-gen: no tics, no single dominant signature, triangulate a disposition from many angles. NO paid gen.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';
const bible = JSON.parse(fs.readFileSync(OUT + '/charplus_bible.json', 'utf8'));

const PSYCH = 'Everything the engine knows about her (her psychology):\n'
  + '- Wound: ' + ((bible.wound && bible.wound.core) || bible.wound || '?') + '\n'
  + '- Deep fear: ' + ((bible.current_crisis && bible.current_crisis.immediate_fear) || '?') + '\n'
  + '- Core contradiction: ' + (bible.core_contradiction || '?') + '\n'
  + '- Private hope: ' + (bible.private_hope || '?') + '\n'
  + '- Emotional weather: ' + (bible.emotional_weather || '?');

const ATOM_GEN_SYS = 'You are given everything an engine knows about a fictional character — her PSYCHOLOGY. Your job: produce TWENTY REMEMBERED BEHAVIORS — the kind of things a friend who has known her for years would actually say about her.\n\n'
  + PSYCH + '\n\n'
  + 'RULES (strict):\n'
  + '1. Each is a CONCRETE thing she repeatedly CHOOSES to do or say — an action or a line. NOT a feeling, NOT a psychological label ("she is insecure"), NOT a physiological tic or nervous gesture (NO touching hair, twisting rings, tapping feet, trembling — those are BANNED).\n'
  + '2. They must be SOCIAL and SITUATION-TRANSPOSABLE — a thing you could witness across many different scenes.\n'
  + '3. TRIANGULATE her from MANY DIFFERENT ANGLES. Do NOT let one signature behavior dominate; no two should be the same move reworded. The reader should be able to infer her psychology from the set WITHOUT any of it being named.\n'
  + '4. Specific beats generic: "orders the same thing as the most confident person at the table" not "tries to fit in."\n\n'
  + 'Output ONLY a numbered list, 1-20, one behavior per line. Nothing else.';

const SITUATIONS = [
  'A dinner party with her partner\'s polished old friends, who all go back years.',
  'A production outage at work during morning standup, her boss and his boss watching.',
  'In a hospital waiting room while someone she loves is in surgery.',
  'At the reception after a distant relative\'s funeral.',
  'A first date with someone she is genuinely nervous about impressing.',
  'She rounds a corner at a mutual friend\'s party and is face to face with her ex.',
  'A meter reader is writing her a parking ticket she thinks is unfair.',
  'A close friend suddenly starts crying about a breakup.',
  'She has just been handed an award on stage in front of a crowd.',
  'A colleague criticizes her work, sharply, in a full meeting.',
  'A stranger on the street stops her to ask for help.',
  'Stuck in a long, barely-moving line at the DMV.',
  'A seven-year-old asks her a blunt, personal question at a family gathering.',
  'Someone gives her an unexpected, genuine compliment.',
  'Her flight is delayed three hours and the gate agent has no information.',
  'A job interview for something she badly wants, first question just asked.',
  'Her partner sits her down and says "we need to talk."',
  'Helping a newish friend move apartments on a hot Saturday.',
  'A doctor has just delivered unexpected bad news about her health.',
  'A party where she knows literally no one.',
];

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const call = (sys, user, tok, temp) => page.evaluate(async ({ sys, user, tok, temp }) => {
    try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: temp, max_tokens: tok }) }); const j = await r.json(); return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); } catch (e) { return 'ERR:' + e.message; }
  }, { sys, user, tok, temp });

  // STEP 1 — engine generates atoms from Mara's real psychology
  const atomsRaw = await call(ATOM_GEN_SYS, 'The twenty behaviors:', 700, 1.0);
  const atoms = atomsRaw.split('\n').map(l => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(l => l.length > 8);
  console.error('════════ ENGINE-GENERATED ATOMS (from Mara psychology) ════════\n' + atoms.map((a, i) => (i + 1) + '. ' + a).join('\n'));

  const BLOCK = 'WHO SHE IS — everything people who have known her for years would say about her. It is all behavior; there is no psychology written down and you do not need any:\n' + atoms.map(a => '- ' + a).join('\n');

  // STEP 2 — feed ONLY the generated atoms into the same behavior generator
  const results = [];
  for (let i = 0; i < SITUATIONS.length; i++) {
    const sys = 'You are imagining a specific real person and simply picturing what she would do. Do NOT analyze her, do NOT be literary, do NOT name any trait.\n\n' + BLOCK + '\n\nGiven exactly who she is, write ONLY the very FIRST thing she would naturally do or say in the situation below — the actual action or line, one concrete sentence. It does NOT have to be one of the behaviors listed; those just show you who she is. No inner state, no "because", just what she does.';
    const beh = await call(sys, 'SITUATION: ' + SITUATIONS[i] + '\n\nThe first thing she does:', 80, 0.9);
    results.push({ situation: SITUATIONS[i], behavior: beh.replace(/\n+/g, ' ') });
    console.error('\n' + String(i + 1).padStart(2) + '. ' + SITUATIONS[i] + '\n    → ' + beh.replace(/\n+/g, ' '));
    await new Promise(r => setTimeout(r, 450));
  }
  fs.writeFileSync(OUT + '/charplus_engine_atoms.json', JSON.stringify({ psych: PSYCH, atoms, results }, null, 2));
  console.error('\nDONE engine-atoms. JUDGE: are the ENGINE-generated atoms coherent+specific (vs generic)? Does C beat A(psychology) and approach B(hand-authored)?');
  await browser.close(); process.exit(0);
})().catch(e => { console.error('ENGINE-ATOMS-ERR', e.message); process.exit(1); });
