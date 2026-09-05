// EDITORIAL-SELECTION test for a ONE-LINE NPC (Roman 2026-08-06). The original problem, finally isolated: décolletage/
// thermidor/wine-label were never Character+ — they were the EDITOR choosing the highest-information observation from
// everything true. Minimal concierge (role/status/objective + 1-2 invariant-safe cost-constraints, NO behaviors) →
// generate 20 candidate one-line observations → the EDITOR (frozen selection law) picks THE one that makes a reader
// feel "I know exactly who that guy is." Hold the editor's pick; the human judges the raw 20 blind first. If the
// editor's pick == the human's → editorial selection is solvable. If not → the bottleneck was selection all along.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify';

// Minimal NPC — costs/identity only, nothing that finishes "therefore he would" (invariant-safe).
const WHO = 'THE PERSON (a walk-on the reader meets for one sentence):\n'
  + '- Role: night concierge at a grand old hotel that has seen better decades.\n'
  + '- Standing: the gatekeeper to a world he serves but was never part of.\n'
  + '- Right now: get through a long overnight shift without one thing going visibly wrong.\n'
  + '- What it costs him: he cannot bear a guest seeing him caught off guard; he needs the hotel\'s faded grandeur to still mean something.';
const SCENE = 'Near 2 a.m., a guest crosses the empty lobby toward his desk.';

const GEN = 'You are imagining a specific real person. Do NOT analyze him, do NOT be literary, do NOT name a trait.\n\n' + WHO + '\n\nSCENE: ' + SCENE + '\n\nGive TWENTY DIFFERENT single-sentence things this concierge might actually do or say in this moment — each a distinct, concrete possibility, all TRUE of him. VARY what each one reveals (his competence, his standing, the hotel, the guest, his pride, his fatigue, his history) and vary the SCALE (some tiny, some a whole gesture or line). Do NOT make them variations of one move. Output ONLY a numbered list 1-20, one per line.';

const EDIT = 'Below are 20 true things a night concierge might do in this moment. You are the EDITOR: the story gets ONE sentence to describe this man. Pick the SINGLE observation a great novelist would choose — the one that makes a reader instantly feel they have known exactly this kind of man for years (the HIGHEST-INFORMATION one; where his attempt to keep the moment from becoming something is visible; NOT the funniest, weirdest, or most elaborate). Output EXACTLY:\nPICK: <number>\nRUNNERS_UP: <two other numbers>';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const call = (sys, user, tok, temp) => page.evaluate(async ({ sys, user, tok, temp }) => {
    try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: temp, max_tokens: tok }) }); const j = await r.json(); return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); } catch (e) { return 'ERR:' + e.message; }
  }, { sys, user, tok, temp });

  const raw = await call(GEN, 'The twenty:', 900, 1.05);
  const cands = raw.split('\n').map(l => l.replace(/^\s*\d+[.)]\s*/, '').trim()).filter(l => l.length > 6).slice(0, 20);
  const numbered = cands.map((c, i) => (i + 1) + '. ' + c).join('\n');
  const pick = await call(EDIT, numbered + '\n\nYour choice:', 60, 0.4);
  fs.writeFileSync(OUT + '/editor_selection_npc.json', JSON.stringify({ who: WHO, scene: SCENE, candidates: cands, editor: pick }, null, 2));
  console.error('════════ 20 CANDIDATES ════════\n' + numbered + '\n\n════════ EDITOR (held) ════════\n' + pick);
  await browser.close(); process.exit(0);
})().catch(e => { console.error('SEL-ERR', e.message); process.exit(1); });
