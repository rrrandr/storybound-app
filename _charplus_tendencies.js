// NON-PERFORMABLE TENDENCIES probe (Roman 2026-08-06). THE operational rule: no atom may be DIRECTLY PERFORMABLE —
// if you could copy it into a scene verbatim, it's already a scene, not a tendency. A tendency FORCES the author to
// invent a fresh, context-appropriate manifestation. Regenerate Mara's Character+ as 20 non-performable TENDENCIES,
// run the same 20 situations. Question: does calcification VANISH (structurally impossible to replay a tendency)?
// 4-way vs A=tics · B=hand-authored atoms · C=engine SCRIPTS (calcified). NO paid gen.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';
const bible = JSON.parse(fs.readFileSync(OUT + '/charplus_bible.json', 'utf8'));

const PSYCH = 'The character\'s PSYCHOLOGY (private engine layer):\n'
  + '- Wound: ' + ((bible.wound && bible.wound.core) || bible.wound || '?') + '\n'
  + '- Deep fear: ' + ((bible.current_crisis && bible.current_crisis.immediate_fear) || '?') + '\n'
  + '- Core contradiction: ' + (bible.core_contradiction || '?') + '\n'
  + '- Private hope: ' + (bible.private_hope || '?') + '\n'
  + '- Emotional weather: ' + (bible.emotional_weather || '?');

const GEN_SYS = 'You translate a character\'s private PSYCHOLOGY into TWENTY BEHAVIORAL TENDENCIES — the author-facing middle layer between mind and scene.\n\n'
  + PSYCH + '\n\n'
  + 'THE ONE RULE (objective, non-negotiable): NO tendency may be DIRECTLY PERFORMABLE. TEST every line: if you could copy it into a scene verbatim as a spoken line or a single specific action, it FAILS — it is already a scene, not a tendency. A tendency must FORCE the author to invent a FRESH manifestation appropriate to each different context.\n'
  + 'FAIL → FIX examples:\n'
  + '  ❌ "Asks about your longest friendship"  →  ✓ "Turns strangers into old friends faster than the situation warrants"\n'
  + '  ❌ "Volunteers for the least comfortable seat"  →  ✓ "Quietly assumes inconvenience belongs to her"\n'
  + '  ❌ "Questions methodology"  →  ✓ "When frightened, trusts procedures more than reassurance"\n'
  + '  ❌ "Suggests watching a film instead of talking"  →  ✓ "Replaces emotional intimacy with shared activity"\n\n'
  + 'Each tendency: (1) BEHAVIORAL — about what she DOES (a pattern of action/speech), never a feeling or a label; (2) so GENERAL it would manifest DIFFERENTLY at a funeral, a DMV, a first date, and a work crisis; (3) specific enough that it is HER and not just anyone. Triangulate her from many angles; no two the same principle.\n'
  + 'Output ONLY a numbered list 1-20, one tendency per line, nothing else.';

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

  const raw = await call(GEN_SYS, 'The twenty tendencies:', 800, 1.0);
  const tendencies = raw.split('\n').map(l => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(l => l.length > 10);
  console.error('════════ NON-PERFORMABLE TENDENCIES (from Mara psychology) ════════\n' + tendencies.map((a, i) => (i + 1) + '. ' + a).join('\n'));

  const BLOCK = 'WHO SHE IS — her behavioral TENDENCIES (patterns, NOT scripts). You cannot copy these into the scene; you must invent the specific thing she does HERE:\n' + tendencies.map(a => '- ' + a).join('\n');
  const results = [];
  for (let i = 0; i < SITUATIONS.length; i++) {
    const sys = 'You are imagining a specific real person and picturing what she would do. Do NOT analyze her, do NOT be literary, do NOT name any trait.\n\n' + BLOCK + '\n\nGiven exactly who she is, INVENT the very FIRST thing she would naturally do or say in the situation below — the actual action or line, one concrete sentence, fresh to THIS context. No inner state, no "because", just what she does.';
    const beh = await call(sys, 'SITUATION: ' + SITUATIONS[i] + '\n\nThe first thing she does:', 80, 0.9);
    results.push({ situation: SITUATIONS[i], behavior: beh.replace(/\n+/g, ' ') });
    console.error('\n' + String(i + 1).padStart(2) + '. ' + SITUATIONS[i] + '\n    → ' + beh.replace(/\n+/g, ' '));
    await new Promise(r => setTimeout(r, 450));
  }
  fs.writeFileSync(OUT + '/charplus_tendencies.json', JSON.stringify({ psych: PSYCH, tendencies, results }, null, 2));
  console.error('\nDONE tendencies. JUDGE: are the tendencies NON-PERFORMABLE (copy-verbatim test)? Did calcification VANISH? coherent+rich+situation-responsive?');
  await browser.close(); process.exit(0);
})().catch(e => { console.error('TEND-ERR', e.message); process.exit(1); });
