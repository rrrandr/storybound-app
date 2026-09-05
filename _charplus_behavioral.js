// BEHAVIORAL-REPRESENTATION probe (Roman 2026-08-06). Replace Character+ ENTIRELY with ~20 remembered BEHAVIORS —
// no wound/fear/contradiction/hope/tells, no psychology labels — just things someone who knew her would say. Same 20
// situations as the tic run (_charplus_probe.js). Question: does a purely BEHAVIORAL representation produce a coherent
// person who EXTRAPOLATES new in-character behavior per situation (vs the tic rep's REPLAY of the same gesture)? If yes:
// Character+ may be a behavioral, not psychological, representation. Law-blind, "do OR say". NO paid gen.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';

// ONE coherent person, taught ONLY by behaviors (disposition: cannot bear being caught not-competent / not-knowing).
// No label ("competent", "insecure") appears anywhere — the atoms EMBODY it. Varied surfaces, all CHOSEN acts, reusable.
const ATOMS = [
  'Corrects people\'s pronunciation of French wines she has never tasted.',
  'Says "right, right" before you have finished explaining.',
  'Googles things under the table so she can raise them later as if she always knew.',
  'Volunteers to lead the project nobody wants, then will not delegate a single piece of it.',
  'Answers "how are you?" with what she has been working on.',
  'Arrives ten minutes early and pretends she was just passing by.',
  'Never asks what a word means in the room; looks it up at home.',
  'Turns every compliment into something she is still improving.',
  'Refuses help carrying anything, then struggles visibly rather than set it down.',
  'Sends the "just to be fully transparent" email before anyone has asked.',
  'Laughs a beat late at a joke, then repeats the punchline as if she would have said it.',
  'Orders the same thing as the most confident person at the table.',
  'Names her sources unprompted so no one thinks she is guessing.',
  'Stays after every meeting to "clarify" the one thing she is afraid she got wrong.',
  'Pre-apologizes for work she is actually proud of.',
  'Remembers everyone\'s exact job title and forgets their kids\' names.',
  'Turns "I don\'t know" into "let me get back to you on that," every time.',
  'Volunteers the one book on the list she actually finished.',
  'Keeps her calendar visible on the desk, always full.',
  'Answers a question she does not know by questioning the premise of the question.',
];

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

const BLOCK = 'WHO SHE IS — this is everything people who have known her for years would say about her. It is all behavior; there is no psychology written down, and you do not need any:\n' + ATOMS.map(function (a) { return '- ' + a; }).join('\n');

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const results = [];
  for (let i = 0; i < SITUATIONS.length; i++) {
    const sys = 'You are imagining a specific real person and simply picturing what she would do. Do NOT analyze her, do NOT be literary, do NOT name any trait.\n\n' + BLOCK + '\n\nGiven exactly who she is, write ONLY the very FIRST thing she would naturally do or say in the situation below — the actual action or line, one concrete sentence. It does NOT have to be one of the behaviors listed above; those just show you who she is. No inner state, no "because", just what she does.';
    const beh = await page.evaluate(async ({ sys, sit }) => {
      try {
        const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: 'SITUATION: ' + sit + '\n\nThe first thing she does:' }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0.9, max_tokens: 80 }) });
        const j = await r.json();
        return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim().replace(/\n+/g, ' ');
      } catch (e) { return 'ERR:' + e.message; }
    }, { sys, sit: SITUATIONS[i] });
    results.push({ situation: SITUATIONS[i], behavior: beh });
    console.error('\n' + String(i + 1).padStart(2) + '. ' + SITUATIONS[i] + '\n    → ' + beh);
    await new Promise(r => setTimeout(r, 500));
  }
  fs.writeFileSync(OUT + '/charplus_behavioral.json', JSON.stringify({ atoms: ATOMS, results }, null, 2));
  console.error('\nDONE behavioral. JUDGE: coherent SAME person? RICH not flat? does it EXTRAPOLATE new in-character behavior per situation (vs replaying the 20)?');
  await browser.close(); process.exit(0);
})().catch(e => { console.error('BEHAV-ERR', e.message); process.exit(1); });
