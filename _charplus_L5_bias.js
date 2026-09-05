// L5 BIAS arm (Roman 2026-08-06) for the human-distinguishability GATING test (run BEFORE any paid prose benchmark).
// A BIAS is one rung above a decision policy: not a rule of action but a taken-for-granted lens on REALITY that
// generates different behavior in every situation ("reaches for the explanation requiring the fewest assumptions about
// people"). Generate 20 biases from Mara's SAME psychology, run the SAME 20 situations. Then all four sets (L1 psych /
// L3 tendencies / L4 policies / L5 biases) get blind-judged by the human: which feels like a person / repetitive /
// "I know this person"? If L3≈L4≈L5 blind, upstream has stopped paying off and the bottleneck is SELECTION.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';
const bible = JSON.parse(fs.readFileSync(OUT + '/charplus_bible.json', 'utf8'));

const PSYCH = 'Wound: ' + ((bible.wound && bible.wound.core) || bible.wound || '?') + '\n'
  + 'Deep fear: ' + ((bible.current_crisis && bible.current_crisis.immediate_fear) || '?') + '\n'
  + 'Core contradiction: ' + (bible.core_contradiction || '?') + '\n'
  + 'Private hope: ' + (bible.private_hope || '?') + '\n'
  + 'Emotional weather: ' + (bible.emotional_weather || '?');

const GEN = 'Translate this psychology into 20 BIASES — things she takes to be TRUE about reality, people, or how the world works, WITHOUT noticing she is assuming them. A bias is one rung ABOVE a rule of action: NOT "retreats into pattern analysis" (a policy) but "if two explanations are available, she reaches for the one that requires the fewest assumptions about people" (a bias about reality). It is a LENS that would produce a DIFFERENT behavior in every situation. NOT a psychology label, NOT a feeling, NOT executable, NOT a tendency. More examples of the register: "assumes any silence is about her"; "treats being useful as the same thing as being wanted"; "believes people remember failures longer than kindnesses"; "reads warmth as something that has to be earned back". Triangulate her from many angles; no two the same. Output ONLY a numbered list 1-20.\n\nPSYCHOLOGY:\n' + PSYCH;

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

  const raw = await call(GEN, 'The twenty biases:', 800, 1.0);
  const biases = raw.split('\n').map(l => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(l => l.length > 8).slice(0, 20);
  console.error('════════ L5 BIASES ════════\n' + biases.map((a, i) => (i + 1) + '. ' + a).join('\n'));
  const WHO = 'WHO SHE IS — the biases about reality her behavior obeys without her noticing:\n' + biases.map(a => '- ' + a).join('\n');
  const results = [];
  for (let i = 0; i < SITUATIONS.length; i++) {
    const sys = 'You are imagining a specific real person and picturing what she would do. Do NOT analyze her, do NOT be literary, do NOT name any trait.\n\n' + WHO + '\n\nGiven exactly who she is, write the very FIRST thing she would naturally do or say in the situation below — one concrete action or line, fresh to THIS context. No inner state, no "because".';
    const beh = await call(sys, 'SITUATION: ' + SITUATIONS[i] + '\n\nThe first thing she does:', 80, 0.9);
    results.push(beh.replace(/\n+/g, ' '));
    console.error('\n' + String(i + 1).padStart(2) + '. ' + results[i]);
    await new Promise(r => setTimeout(r, 400));
  }
  fs.writeFileSync(OUT + '/charplus_L5.json', JSON.stringify({ biases, results }, null, 2));
  console.error('\nDONE L5.');
  await browser.close(); process.exit(0);
})().catch(e => { console.error('L5-ERR', e.message); process.exit(1); });
