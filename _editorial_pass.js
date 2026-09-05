// STRUCTURAL editorial pass (Roman 2026-08-04). The directive A/B drowned — a broad style POLICY can't be
// prompted in. Fix = STRUCTURE: convert the abstract law into a CONCRETE per-beat decision BEFORE the writer
// sees it (concrete+specific lands where abstract drowns, per the ablation). Two stages on the OPENING beat:
// (1) EDITOR decides the ONE revealing detail + the conclusion to imply + what to cut; (2) WRITER renders ONLY
// that. Compare the opening to A_baseline ("crowd's eyes are on me... my heart racing... the fear I refuse to show").
const { chromium } = require('playwright-core');
const fs = require('fs');
const ODIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/prose';

const CTX = 'SERA is being seized by the Keepers in a crowded village square. Her deepest fear right now: that everyone has seen her weakness and will judge her. She refuses to ask anyone for help. When tense, she taps the stem of a glass until it hums. (The engine knows this; the reader must NOT be told any of it.)';

const EDITOR_SYS = 'You are the story\'s EDITOR, not the writer. Decide what deserves the opening — do not write prose.\n' + CTX + '\n\nFor the OPENING of the scene, decide exactly three things:\n1. OPEN ON: the single most REVEALING concrete thing — a specific behavior or object, faintly telling (EVIDENCE, never a feeling or a label).\n2. IMPLY (never stated in the prose): the one thing the reader should CONCLUDE about her from it.\n3. CUT: two generic things a lazy writer would open on instead (e.g. "her racing heart", "the crowd\'s eyes").\nAnswer in exactly three short lines: "OPEN ON: …" / "IMPLY: …" / "CUT: …". Nothing else.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const call = async (sys, user, tok) => page.evaluate(async ({ sys, user, tok }) => {
    try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.85, max_tokens: tok }) }); const j = await r.json(); return String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); } catch (e) { return 'ERR:' + e.message; } }, { sys, user, tok });

  const out = {};
  for (const rep of ['C_editorial', 'Cp_editorial2']) {
    // STAGE 1 — editor decides
    const plan = await call(EDITOR_SYS, 'Your three lines:', 150);
    // STAGE 2 — writer renders ONLY the plan
    const WRITER_SYS = 'You are the writer. Write ONLY the opening 2-3 sentences of the scene, following the editor\'s decision EXACTLY:\n' + plan + '\n\nRULES: Open on the OPEN-ON detail. The reader must INFER the IMPLY line WITHOUT you stating it. Do NOT mention the CUT items. Evidence, not conclusions — no "fear / weakness / panic / I realize / it was clear / seemed". No decorative simile. Specific and plain. Just the sentences.';
    const prose = await call(WRITER_SYS, 'The opening:', 200);
    out[rep] = { plan, prose };
    fs.writeFileSync(ODIR + '/' + rep + '.txt', 'PLAN:\n' + plan + '\n\nPROSE:\n' + prose);
    console.error('\n═══ ' + rep + ' ═══\nPLAN:\n' + plan + '\n\nPROSE:\n' + prose);
    await new Promise(r => setTimeout(r, 2000));
  }
  fs.writeFileSync(ODIR + '/editorial_pass.json', JSON.stringify(out, null, 2));
  console.error('\n--- compare to A_baseline opening: "The crowd\'s eyes are on me as the Keepers pull me closer... my heart racing... the small motion betraying the fear I refuse to show." ---');
  console.error('DONE editorial_pass'); await browser.close(); process.exit(0);
})().catch(e => { console.error('EP-ERR', e.message); process.exit(1); });
