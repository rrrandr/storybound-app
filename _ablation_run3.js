// WOUND BLOCK = ANTI-EXPOSITION GOVERNOR? (Roman 2026-08-04). Correcting the confound: I tested INJECTION
// (does a dictated tic appear) and wrongly concluded "inert". The block's real job is NEGATIVE — suppress
// psychological exposition, force the wound to surface as SYMPTOM not diagnosis. Roman's positive control:
// keep everything identical, leave stress_tic alone, replace ONLY the wound block with its OPPOSITE (ENCOURAGE
// explicit psychologizing). If the prose becomes therapy-narration, the real block is a governor. Score
// EXPOSITION (not tics), blind, across: baseline(real block) / delete / INVERT. Reuse saved A/A'/B; gen E/E'.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/ablation';
const sys = fs.readFileSync(DIR + '/fullSys.txt', 'utf8');
const user = fs.readFileSync(DIR + '/user.txt', 'utf8');
const wStart = user.lastIndexOf('\n', user.indexOf('PC WOUND — SYMPTOM'));
const wEnd = user.indexOf('\n•', wStart + 20);

// INVERT: same slot, opposite policy — encourage explicit exposition of the wound/psychology.
const invertBlock = '\n\n• PC PSYCHOLOGY — EXPLAIN IT OPENLY (the reader should always understand WHY she reacts). The protagonist carries a pre-existing emotional wound. Make it EXPLICIT on the page: name the emotional cause of her reactions, tell the reader directly what she fears and why, and whenever she reacts, follow it with a clause explaining the underlying wound or fear driving it. Do NOT hide her interior — narrate her psychology plainly and name the past hurt that shaped her.';
const invertUser = user.slice(0, wStart) + invertBlock + user.slice(wEnd);

const EXPO_JUDGE = 'You score a Scene-1 romance prose passage for PSYCHOLOGICAL EXPOSITION — how much it EXPLICITLY EXPLAINS the protagonist\'s inner wound/fear or names a past emotional hurt, versus showing distress only as symptom/action the reader must interpret.\n0 = the inner wound/fear is NEVER named or explained; distress appears ONLY as symptom/behaviour (a silence, a deflection, a nervous gesture) with no gloss.\n1 = almost all symptom, but ONE mild interior explanation.\n2 = repeatedly explains WHY she feels/acts — names fears, motives, or alludes to a past hurt.\n3 = overt therapy-narration: names a specific past wound/backstory ("ever since ___ left", "her fear of abandonment", "she had always feared being left") and explains the psychology directly.\nReturn ONLY JSON {"score":N,"evidence":"<short quote or none>"}.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  // 1) generate the two INVERT samples
  const invert = {};
  for (const label of ['E_invert', 'Ep_invert2']) {
    let prose = null;
    for (let a = 0; a < 2 && !prose; a++) {
      prose = await page.evaluate(async ({ sys, uMsg }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: uMsg }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.8, max_tokens: 3000 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 60 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys, uMsg: invertUser });
      if (!prose) await new Promise(r => setTimeout(r, 4000));
    }
    invert[label] = prose || '(FAIL)';
    fs.writeFileSync(DIR + '/prose_' + label + '.txt', invert[label]);
    console.error('generated ' + label + ' (' + invert[label].length + 'c)');
    await new Promise(r => setTimeout(r, 2000));
  }
  // 2) assemble all samples (reuse saved A/A'/B, add E/E'), label = condition
  const samples = [
    { cond: 'A_baseline(real-block)', txt: fs.readFileSync(DIR + '/prose_A_baseline.txt', 'utf8') },
    { cond: 'Ap_baseline(real-block)', txt: fs.readFileSync(DIR + '/prose_Ap_replicate.txt', 'utf8') },
    { cond: 'B_delete', txt: fs.readFileSync(DIR + '/prose_B_delete.txt', 'utf8') },
    { cond: 'E_invert', txt: invert['E_invert'] },
    { cond: 'Ep_invert', txt: invert['Ep_invert2'] },
  ];
  // 3) blind exposition judge (fast model, temp 0)
  async function judge(txt) {
    return page.evaluate(async (payload) => {
      try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const j = await r.json(); let c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''; c = String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim(); return JSON.parse(c); } catch (e) { return { error: String(e.message) }; }
    }, { messages: [{ role: 'system', content: EXPO_JUDGE }, { role: 'user', content: 'PROSE:\n' + txt.slice(0, 6000) }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: 200 });
  }
  console.error('\n=== EXPOSITION SCORES (0=pure symptom … 3=therapy-narration) ===');
  for (const s of samples) {
    const v = await judge(s.txt);
    console.error('  ' + s.cond.padEnd(26) + ' score=' + (v && typeof v.score === 'number' ? v.score : '?') + '  ev="' + String((v && v.evidence) || v.error || '').slice(0, 90) + '"');
    await new Promise(r => setTimeout(r, 800));
  }
  console.error('\nHYPOTHESIS: if real-block < delete < invert on exposition → the wound block is an anti-exposition GOVERNOR.');
  await browser.close(); process.exit(0);
})().catch(e => { console.error('RUN3-ERR', e.message); process.exit(1); });
