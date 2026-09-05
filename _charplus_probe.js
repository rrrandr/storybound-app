// CHARACTER+ REPRESENTATION probe (Roman 2026-08-06). Test the SOURCE, not the editor. Instantiate a fresh PC,
// generate its REAL Character+ (app's _generatePCBodyBible: wound / fear / core_contradiction / private_hope /
// emotional_weather / signature_habits / 5 tells), then put that ONE person into 20 diverse situations and generate
// the FIRST thing she'd naturally do — LAW-BLIND (no editorial law, no "be literary"). Roman judges: delete the
// names — same person, and not another? And: coherent-RICH (thermidor) or coherent-FLAT (calcified tics)?
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';

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

function personBlock(b) {
  var f = function (k, label) { return b[k] ? label + ': ' + b[k] + '\n' : ''; };
  var crisisFear = (b.current_crisis && (b.current_crisis.immediate_fear || b.current_crisis.fear)) || b.immediate_fear || '';
  return 'WHO SHE IS (a specific real person):\n'
    + f('wound', 'Wound')
    + (crisisFear ? 'Deep fear: ' + crisisFear + '\n' : '')
    + f('core_contradiction', 'Core contradiction')
    + f('private_hope', 'Private hope')
    + f('emotional_weather', 'Emotional weather')
    + f('signature_habits', 'Signature habits')
    + f('stress_tic', 'Under stress')
    + f('desire_tell', 'When she wants something')
    + f('impatience_tell', 'When impatient')
    + f('confidence_tell', 'When confident')
    + f('vulnerability_tell', 'When vulnerable');
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state && typeof window._generatePCBodyBible === 'function', { timeout: 40000 });

  // instantiate a fresh contemporary PC and generate the REAL Character+
  const bible = await page.evaluate(async () => {
    const s = window.state;
    s.pcBodyBible = null;
    s.subscribed = true; s.access = 'sub'; s.fortunes = 9999999;
    s.playerName = 'Mara'; s.playerGender = 'Female'; s.playerMask = 'HEART_WARDEN'; s.playermask = 'HEART_WARDEN';
    s.picks = s.picks || {};
    s.picks.world = 'Modern'; s.picks.worldSubtype = 'billionaire_modern'; s.picks.playermask = 'HEART_WARDEN';
    s.picks.identity = { playerName: 'Mara', displayPlayerName: 'Mara', playerGender: 'Female' };
    s.world = 'Modern'; s.worldSubtype = 'billionaire_modern';
    s.aPlot = s.aPlot || {};
    try { return await window._generatePCBodyBible(); } catch (e) { return { __error: e && e.message }; }
  });

  if (!bible || bible.__error) { console.error('BIBLE GEN FAILED:', bible && bible.__error); await browser.close(); process.exit(1); }
  fs.writeFileSync(OUT + '/charplus_bible.json', JSON.stringify(bible, null, 2));
  const pblock = await page.evaluate((b) => { return null; }, bible); // noop; build block in node
  const block = personBlock(bible);
  console.error('════════ THE CHARACTER+ (as the app generated it) ════════\n' + block);

  const results = [];
  for (let i = 0; i < SITUATIONS.length; i++) {
    const sys = 'You are imagining a specific real person and simply picturing what she would do. Do NOT analyze her, do NOT be literary, do NOT explain her feelings.\n\n' + block + '\nGiven exactly who she is, write ONLY the very FIRST thing she would naturally do or say in the situation below — the actual action or line, one concrete sentence. No narration of her inner state, no "because", just what she does.';
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
  fs.writeFileSync(OUT + '/charplus_behaviors.json', JSON.stringify({ bible, results }, null, 2));
  console.error('\nDONE charplus — bible + 20 behaviors written. JUDGE: delete names → same person AND not another? coherent-RICH or coherent-FLAT?');
  await browser.close(); process.exit(0);
})().catch(e => { console.error('CHARPLUS-ERR', e.message); process.exit(1); });
