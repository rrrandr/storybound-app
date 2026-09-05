// REPRESENTATION-LEVEL BENCHMARK (Roman 2026-08-06). The falsifiable question: at what abstraction level does the
// model STOP replaying and START inventing? Four representations of the SAME Mara (same psychology root, same 20
// situations, same consumer prompt — ONLY the representation level varies):
//   L1 Psychology · L2 Behaviors (performable) · L3 Tendencies (non-performable class-of-action) · L4 Decision Policies
//   (the automatic algorithm — "defaults to", one level earlier than a tendency).
// Then measure: max verbatim-replay cluster (calcification), manifestation diversity, thermidor count, coherence.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';
const bible = JSON.parse(fs.readFileSync(OUT + '/charplus_bible.json', 'utf8'));

const PSYCH = 'Wound: ' + ((bible.wound && bible.wound.core) || bible.wound || '?') + '\n'
  + 'Deep fear: ' + ((bible.current_crisis && bible.current_crisis.immediate_fear) || '?') + '\n'
  + 'Core contradiction: ' + (bible.core_contradiction || '?') + '\n'
  + 'Private hope: ' + (bible.private_hope || '?') + '\n'
  + 'Emotional weather: ' + (bible.emotional_weather || '?');

const GEN = {
  L2: 'Translate this psychology into 20 concrete BEHAVIORS she repeatedly does — specific witnessable actions or lines (e.g. "orders the same thing as the most confident person at the table", "sends a follow-up email before anyone asks"). Specific and performable. No tics/gestures. Numbered list only.\n\nPSYCHOLOGY:\n' + PSYCH,
  L3: 'Translate this psychology into 20 behavioral TENDENCIES — a CLASS of action, not a single action; NOT copyable into a scene verbatim (e.g. "redirects compliments toward others", "replaces emotional intimacy with shared activity"). Behavioral, not a label. Numbered list only.\n\nPSYCHOLOGY:\n' + PSYCH,
  L4: 'Translate this psychology into 20 DECISION POLICIES — the automatic ALGORITHM that produces her behavior, one level EARLIER than a tendency. A policy is NOT an action and NOT a psychology label — it is the rule her behavior obeys without her noticing. Frame each as an AUTOMATIC default ("can\'t help", "automatically", "defaults to", "instinctively"), never a conscious choice. It must be so UPSTREAM that it produces DIFFERENT actions at a funeral, a DMV, a first date, and a work crisis — the scene invents the action, the policy only sets the direction. Examples: "never allows praise to settle on herself", "automatically redistributes burdens away from other people", "keeps closeness one step safer than direct vulnerability", "defaults to objective process whenever she is frightened". Numbered list only.\n\nPSYCHOLOGY:\n' + PSYCH,
};

const WHO = {
  L1: 'WHO SHE IS (her psychology):\n' + PSYCH,
  L2: 'WHO SHE IS — behaviors people have seen her do again and again:\n',
  L3: 'WHO SHE IS — her behavioral tendencies (patterns, not scripts):\n',
  L4: 'WHO SHE IS — the automatic decision policies her behavior obeys without her noticing:\n',
};

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

  const out = {};
  for (const level of ['L1', 'L2', 'L3', 'L4']) {
    let who = WHO[level];
    if (level !== 'L1') {
      const raw = await call(GEN[level], 'The twenty items:', 800, 1.0);
      const items = raw.split('\n').map(l => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(l => l.length > 8).slice(0, 20);
      who += items.map(a => '- ' + a).join('\n');
      out[level + '_rep'] = items;
    }
    const results = [];
    for (let i = 0; i < SITUATIONS.length; i++) {
      const sys = 'You are imagining a specific real person and picturing what she would do. Do NOT analyze her, do NOT be literary, do NOT name any trait.\n\n' + who + '\n\nGiven exactly who she is, write the very FIRST thing she would naturally do or say in the situation below — one concrete action or line, fresh to THIS context. No inner state, no "because".';
      const beh = await call(sys, 'SITUATION: ' + SITUATIONS[i] + '\n\nThe first thing she does:', 80, 0.9);
      results.push(beh.replace(/\n+/g, ' '));
      await new Promise(r => setTimeout(r, 350));
    }
    out[level] = results;
    console.error('\n════════ ' + level + ' ════════');
    results.forEach((r, i) => console.error(String(i + 1).padStart(2) + '. ' + r));
  }
  fs.writeFileSync(OUT + '/charplus_benchmark.json', JSON.stringify({ psych: PSYCH, out }, null, 2));
  console.error('\nDONE benchmark. MEASURE per level: max verbatim-replay cluster · manifestation diversity · thermidor count · coherence.');
  await browser.close(); process.exit(0);
})().catch(e => { console.error('BENCH-ERR', e.message); process.exit(1); });
