// EVIDENCE-NOT-CONCLUSIONS directive — A/B on the REAL frozen prompt (Roman 2026-08-04). Distill the 10-point
// transformation into ONE concrete, FRONT-LOADED editorial law (front-loaded because my own ablation proved
// abstract buried directives drown; concrete front-loaded ones land). Baseline (unchanged) vs Treatment
// (directive prepended to the user message = position 0 = highest salience). Read both; does the prose shift
// from overwrought-say-nothing → specific evidence? Prove it here before wiring into app.js.
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/ablation';
const ODIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/prose';
fs.mkdirSync(ODIR, { recursive: true });
const sys = fs.readFileSync(DIR + '/fullSys.txt', 'utf8');
const user = fs.readFileSync(DIR + '/user.txt', 'utf8');

const DIRECTIVE = [
'⚠⚠ MANDATORY EDITORIAL LAW — READ FIRST, APPLY TO EVERY SENTENCE. This overrides the instinct to describe.',
'',
'You are not a camera. You are an EDITOR with opinions. Before each sentence, ask: of the fifty things happening, which ONE is most REVEALING — the faintly embarrassing, the ironic, the contradictory, the thing that tells us who this person is? Write THAT. Cut the other forty-nine.',
'',
'EMIT EVIDENCE, NOT CONCLUSIONS. Never state an abstraction the reader could infer from a concrete detail. Replace every label with the smallest observation that makes the reader reach it themselves:',
'  • NOT "she was nervous" → "she reread the message preview three times without opening it."',
'  • NOT "he was rich" → "he never looked at prices, only delivery dates."',
'  • NOT "the room was grand/luxurious" → "someone had polished the brass often enough that fingerprints looked like vandalism."',
'  • NOT "they were falling in love" → "they had stopped saying thank you."',
'  • NOT "she was insecure" → "she straightened the already-straight stack of menus before speaking."',
'The reader performs the last step. Stealing that inference is the failure.',
'',
'NOTICE SPECIFIC things, described PLAINLY. Great prose notices ONE specific revealing detail and states it plainly; it does NOT describe a generic thing (a face, a room, a mood) with ornate language. If a sentence dresses up something generic, DELETE it and find the one specific tell instead. "leading with her décolletage" beats a paragraph of adjectives.',
'',
'BAN DECORATIVE CLEVERNESS. Cut every "as if / as though / like / seemed / appeared / he realized / it was clear / she felt that" that DECORATES instead of REVEALING. A comparison earns its place ONLY as a VERDICT ("he treated every compliment like an invoice"), never a flourish ("as though iron had replaced her spine").',
'',
'SLOW DOWN. Each beat earns ONE revealing observation and ONE revealing behavior before the story moves on. Do not rush to the next event; the reader remembers the observation, not the plot transition.',
'',
'CONCLUSIONS ARE ALLOWED — but SPEND them. State an abstraction only when your verdict is SHARPER than any inference it could replace (Austen: "tolerable, but not handsome enough to tempt me"). Default to evidence; earn every conclusion.',
'',
'The engine already knows this character\'s wound, fear, and status. NEVER narrate those. Narrate only the concrete behavior they cause.',
'', '═══════════════════════════════════════════════════════', ''
].join('\n');

const VARIANTS = { A_baseline: user, B_evidence: DIRECTIVE + user, Bp_evidence2: DIRECTIVE + user };

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const label of Object.keys(VARIANTS)) {
    let prose = null;
    for (let a = 0; a < 2 && !prose; a++) {
      prose = await page.evaluate(async ({ sys, uMsg }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: uMsg }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.8, max_tokens: 3000 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 60 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys, uMsg: VARIANTS[label] });
      if (!prose) await new Promise(r => setTimeout(r, 4000));
    }
    out[label] = prose || '(FAIL)';
    fs.writeFileSync(ODIR + '/prose_' + label + '.txt', out[label]);
    console.error('generated ' + label + ' (' + out[label].length + 'c)');
    await new Promise(r => setTimeout(r, 2000));
  }
  fs.writeFileSync(ODIR + '/prose_ab.json', JSON.stringify(out, null, 2));
  console.error('DONE prose_ab — saved to ' + ODIR); await browser.close(); process.exit(0);
})().catch(e => { console.error('PROSE-ERR', e.message); process.exit(1); });
