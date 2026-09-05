// "WHAT ARE THEY TRYING NOT TO LOOK LIKE?" — the primitive under overcompensation (Roman 2026-08-04).
// Overcompensation is EVIDENCE, not identity (same "pays the check" = 5 minds). The primitive is one social
// FEAR that GENERATES many overcompensations + explains the décolletage judgment as an ACCUSATION.
// TEST A (portability): one fear -> FOUR portable, faintly-embarrassing, common overcompensations (differentiated).
// TEST B (evidence-not-identity, the decisive one): FIX the behavior ("always pays the whole check"), vary the
// FEAR across 5 masks -> 5 narrator JUDGMENTS. If the 5 differ, the FEAR is the identity, not the behavior.
// Filter throughout: "I've met someone who does that" (keep) vs "that's a TV character" (discard).
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';

const FEARS = {
  ARMORED_FOX:  'hurt',
  HEART_WARDEN: 'selfish',
  SPELLBINDER:  'forgettable',
  DARK_VICE:    'lower-status than the people around them',
  OPEN_VEIN:    'needy',
};

async function ask(page, sys, user, tok) {
  let o = null;
  for (let a = 0; a < 2 && !o; a++) {
    o = await page.evaluate(async ({ sys, user, tok }) => {
      try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.95, max_tokens: tok }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 10 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys, user, tok });
    if (!o) await new Promise(r => setTimeout(r, 3000));
  }
  return o;
}

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });

  console.error('════════ TEST A — one FEAR → four portable overcompensations ════════');
  const PORT_SYS = 'A person is trying DESPERATELY not to look %F. List FOUR different, faintly embarrassing, TOTALLY COMMON things they do — across different everyday situations — that quietly give this away. Each must be a specific BEHAVIOR (no diagnosis, no feelings named), the kind where a reader thinks "I have met someone who does that" — NOT a TV-character flaw. One short line each, numbered.';
  const portOut = {};
  for (const m of Object.keys(FEARS)) {
    const o = await ask(page, PORT_SYS.replace('%F', FEARS[m]), 'Four behaviors:', 200);
    portOut[m] = o; console.error('\n[' + m + ' — not "' + FEARS[m] + '"]\n' + (o || 'FAIL'));
    await new Promise(r => setTimeout(r, 1500));
  }

  console.error('\n\n════════ TEST B — SAME behavior ("always pays the whole check"), 5 FEARS → 5 judgments ════════');
  const JUDG_SYS = 'A person ALWAYS insists on paying the entire check when dining with others. They do it because they are trying desperately not to look %F. Write the NARRATOR\'S ONE-SENTENCE judgment that compresses this into an OPINION — an accusation about what they are trying not to look like, letting the reader infer it (models: "She collected thank-yous the way other people collected money." / "leading with her décolletage"). Do NOT name the fear or the feeling. One sentence only.';
  const judgOut = {};
  for (const m of Object.keys(FEARS)) {
    const o = await ask(page, JUDG_SYS.replace('%F', FEARS[m]), 'The judgment:', 60);
    judgOut[m] = o; console.error('\n[not "' + FEARS[m] + '"]  ' + (o || 'FAIL'));
    await new Promise(r => setTimeout(r, 1500));
  }
  fs.writeFileSync(DIR + '/fear.json', JSON.stringify({ portability: portOut, sameBehavior5Fears: judgOut }, null, 2));
  console.error('\nDONE fear'); await browser.close(); process.exit(0);
})().catch(e => { console.error('FEAR-ERR', e.message); process.exit(1); });
