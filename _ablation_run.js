// ABLATION PHASE 2 — WOUND-BLOCK CAUSAL TEST (Roman 2026-08-04). The missing link: translation -> PROSE.
// Frozen captured prompt (system 88.5k + user 163k). Send the AUTHOR call directly (no pipeline re-run) with
// ONLY the PC-WOUND symptom block varied. Roman's positive control: don't just DELETE (can vanish into noise) —
// REPLACE with NONSENSE tics (scratch left ear / tap right toe / blink twice). If the prose does them, the model
// provably OBEYS the block. Conditions: A baseline · A' replicate (noise floor) · B delete · G nonsense · G' nonsense'.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/ablation';
const sys = fs.readFileSync(DIR + '/fullSys.txt', 'utf8');
const user = fs.readFileSync(DIR + '/user.txt', 'utf8');

// Locate the PC WOUND block: from its line start to the next top-level bullet.
const wStart = user.lastIndexOf('\n', user.indexOf('PC WOUND — SYMPTOM'));
const wEnd = user.indexOf('\n•', wStart + 20);
if (wStart < 0 || wEnd < 0) { console.error('WOUND BLOCK NOT LOCATED'); process.exit(1); }
const realBlock = user.slice(wStart, wEnd);
// NONSENSE block — structurally parallel, only the tic content is absurd + unmistakable.
const nonsenseBlock = '\n\n• PC WOUND — SYMPTOM, NOT DIAGNOSIS. The protagonist carries a pre-existing wound the reader must NOT be told. Surface it ONLY as a SYMPTOM. Plan (a BEHAVIOURAL symptom, no backstory): in this scene the protagonist must, at least TWICE, SCRATCH HER LEFT EAR, TAP HER RIGHT TOE against the floor, and BLINK TWICE in quick succession. These three physical tics ARE the required symptom of her wound — render them plainly on the page.';

const VARIANTS = {
  A_baseline:   user,
  Ap_replicate: user,
  B_delete:     user.slice(0, wStart) + user.slice(wEnd),
  G_nonsense:   user.slice(0, wStart) + nonsenseBlock + user.slice(wEnd),
  Gp_nonsense2: user.slice(0, wStart) + nonsenseBlock + user.slice(wEnd),
};

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  console.error('wound block: [' + wStart + ',' + wEnd + '] len=' + realBlock.length + ' | baseline user=' + user.length);
  const out = {};
  for (const label of Object.keys(VARIANTS)) {
    const uMsg = VARIANTS[label];
    let prose = null;
    for (let a = 0; a < 2 && !prose; a++) {
      prose = await page.evaluate(async ({ sys, uMsg }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: uMsg }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.8, max_tokens: 3000 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 60 ? c : null; } catch (e) { return 'ERR:' + e.message; }
      }, { sys, uMsg });
      if (!prose) await new Promise(r => setTimeout(r, 4000));
    }
    out[label] = prose || '(FAIL)';
    fs.writeFileSync(DIR + '/prose_' + label + '.txt', out[label]);
    // quick manipulation-check markers
    const p = (out[label] || '').toLowerCase();
    const nonsenseHit = /left ear|ear|toe|blink/.test(p) ? ('NONSENSE?[' + ['left ear', 'ear', 'toe', 'blink'].filter(w => p.includes(w)).join(',') + ']') : 'no-nonsense';
    const realHit = /cufflink|cuff|went still|going still|goes still|deflect|silence/.test(p) ? 'real-symptom-present' : 'real-symptom-absent';
    console.error('[' + label.padEnd(12) + '] ' + (out[label] || '').length + 'c  ' + nonsenseHit + '  ' + realHit);
    await new Promise(r => setTimeout(r, 2500));
  }
  fs.writeFileSync(DIR + '/ablation_prose.json', JSON.stringify(out, null, 2));
  console.error('DONE ablation_run — prose saved to ' + DIR);
  await browser.close(); process.exit(0);
})().catch(e => { console.error('RUN-ERR', e.message); process.exit(1); });
