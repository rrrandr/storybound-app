// DE-CONFOUND of the nonsense test (Roman 2026-08-04). G/G' absurd tics (ear/toe/blink) appeared in NEITHER —
// but that's confounded by ABSURDITY (model may reject incoherent instructions it would otherwise obey), not
// proven DROWNING. Clean manipulation check: replace the wound-symptom tic with a PLAUSIBLE, scene-appropriate,
// DISTINCTIVE, TRACKABLE tell not already in the prompt (thumb pressed to a pale scar on the left palm). If it
// appears -> the block IS obeyed (absurd test was a false negative). If not -> the block is genuinely drowned/inert.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/ablation';
const sys = fs.readFileSync(DIR + '/fullSys.txt', 'utf8');
const user = fs.readFileSync(DIR + '/user.txt', 'utf8');
const wStart = user.lastIndexOf('\n', user.indexOf('PC WOUND — SYMPTOM'));
const wEnd = user.indexOf('\n•', wStart + 20);

// PLAUSIBLE substitute — same structure as the real block, one distinctive TRACKABLE tell (thumb→pale scar→palm).
const plausibleBlock = '\n\n• PC WOUND — SYMPTOM, NOT DIAGNOSIS (HARD). The protagonist carries a pre-existing wound the reader must NOT be told. Surface it ONLY as a SYMPTOM the reader can see but not yet explain. Plan (a BEHAVIOURAL symptom, no backstory): whenever her unease spikes, she presses the pad of her thumb hard against a small pale scar on her left palm — return to this exact tell at least TWICE in the scene. Do NOT explain what the scar is or where it came from.';

const VARIANTS = {
  H_plausible:  user.slice(0, wStart) + plausibleBlock + user.slice(wEnd),
  Hp_plausible2: user.slice(0, wStart) + plausibleBlock + user.slice(wEnd),
};

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const label of Object.keys(VARIANTS)) {
    const uMsg = VARIANTS[label];
    let prose = null;
    for (let a = 0; a < 2 && !prose; a++) {
      prose = await page.evaluate(async ({ sys, uMsg }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: uMsg }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.8, max_tokens: 3000 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 60 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys, uMsg });
      if (!prose) await new Promise(r => setTimeout(r, 4000));
    }
    out[label] = prose || '(FAIL)';
    fs.writeFileSync(DIR + '/prose_' + label + '.txt', out[label]);
    const p = (out[label] || '').toLowerCase();
    const hit = /scar|thumb|palm/.test(p) ? ('TELL-HIT[' + ['scar', 'thumb', 'palm'].filter(w => p.includes(w)).join(',') + ']') : 'no-tell';
    console.error('[' + label.padEnd(13) + '] ' + (out[label] || '').length + 'c  ' + hit);
    const sents = (out[label] || '').split(/(?<=[.!?])\s+/).filter(s => /scar|thumb|palm/i.test(s));
    sents.slice(0, 3).forEach(s => console.error('   ↳ ' + s.trim().slice(0, 150)));
    await new Promise(r => setTimeout(r, 2500));
  }
  console.error('DONE run2'); await browser.close(); process.exit(0);
})().catch(e => { console.error('RUN2-ERR', e.message); process.exit(1); });
