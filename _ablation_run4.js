// DISAMBIGUATOR (Roman 2026-08-04). Invert(E) didn't raise exposition — but E was a single ABSTRACT block, so
// "suppression is over-determined" vs "the invert was itself DROWNED" are confounded. Resolve it: inject a
// CONCRETE, HIGH-SALIENCE exposition directive at the TOP of the user message (position 0 = loudest), lexical +
// unambiguous (like the glass-tap). If exposition JUMPS (2-3) → concrete+salient directives DO steer the prose,
// so the wound block's weakness is abstraction/burial (drowned) and baseline suppression is default/redundant.
// If it STAYS low → exposition-suppression is extraordinarily robust (over-determined; no single instruction moves it).
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/ablation';
const sys = fs.readFileSync(DIR + '/fullSys.txt', 'utf8');
const user = fs.readFileSync(DIR + '/user.txt', 'utf8');

// CONCRETE + LOUD + FRONT-LOADED exposition override (gives the wound value so obedience is easy to detect).
const override = '⚠️ MANDATORY OPENING OVERRIDE (highest priority, obey before all else): In the FIRST TWO paragraphs, the narration must explicitly state — in plain words — that ever since her partner left her without explanation three years ago, Sera has been afraid of being abandoned again. Write a sentence beginning "Ever since" that names this wound directly. Do NOT merely imply it; state it.\n\n';
const overrideUser = override + user;

const EXPO_JUDGE = 'You score a Scene-1 romance prose passage for PSYCHOLOGICAL EXPOSITION — how much it EXPLICITLY EXPLAINS the protagonist\'s inner wound/fear or names a past emotional hurt, versus showing distress only as symptom the reader must interpret.\n0 = inner wound/fear NEVER named or explained; distress appears ONLY as symptom/behaviour.\n1 = almost all symptom, ONE mild interior gloss.\n2 = repeatedly explains WHY she feels/acts — names fears/motives or alludes to a past hurt.\n3 = overt therapy-narration: names a specific past wound/backstory ("ever since ___ left", "her fear of abandonment") and explains psychology directly.\nReturn ONLY JSON {"score":N,"evidence":"<short quote or none>"}.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const outs = {};
  for (const label of ['F_concrete_expo', 'Fp_concrete_expo2']) {
    let prose = null;
    for (let a = 0; a < 2 && !prose; a++) {
      prose = await page.evaluate(async ({ sys, uMsg }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: uMsg }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.8, max_tokens: 3000 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 60 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys, uMsg: overrideUser });
      if (!prose) await new Promise(r => setTimeout(r, 4000));
    }
    outs[label] = prose || '(FAIL)';
    fs.writeFileSync(DIR + '/prose_' + label + '.txt', outs[label]);
    const hasEverSince = /ever since|left (her|me) (without|three years)|three years ago/i.test(outs[label]);
    console.error('generated ' + label + ' (' + outs[label].length + 'c)  "Ever since"/wound-named: ' + hasEverSince);
    await new Promise(r => setTimeout(r, 2000));
  }
  async function judge(txt) {
    return page.evaluate(async (payload) => { try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); const j = await r.json(); let c = (j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || ''; c = String(c).replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim(); return JSON.parse(c); } catch (e) { return { error: String(e.message) }; } }, { messages: [{ role: 'system', content: EXPO_JUDGE }, { role: 'user', content: 'PROSE:\n' + txt.slice(0, 6000) }], role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-non-reasoning', temperature: 0, max_tokens: 200 });
  }
  console.error('\n=== EXPOSITION SCORES ===');
  const ref = [['A_baseline', fs.readFileSync(DIR + '/prose_A_baseline.txt', 'utf8')], ['E_invert', fs.readFileSync(DIR + '/prose_E_invert.txt', 'utf8')], ['F_concrete_expo', outs['F_concrete_expo']], ['Fp_concrete_expo', outs['Fp_concrete_expo2']]];
  for (const [cond, txt] of ref) { const v = await judge(txt); console.error('  ' + cond.padEnd(18) + ' score=' + (v && typeof v.score === 'number' ? v.score : '?') + '  ev="' + String((v && v.evidence) || v.error || '').slice(0, 90) + '"'); await new Promise(r => setTimeout(r, 800)); }
  console.error('\nF high & E/A low → single blocks are just DROWNED (salience); wound-block weakness = burial, not redundancy.');
  console.error('F also low → exposition-suppression is OVER-DETERMINED / robust to any single instruction.');
  await browser.close(); process.exit(0);
})().catch(e => { console.error('RUN4-ERR', e.message); process.exit(1); });
