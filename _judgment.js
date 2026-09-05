// EDITORIAL JUDGMENT (not thesis) — the NOVELIST bar (Roman 2026-08-04). My _thesis.js outputs were still
// DIAGNOSTIC (explain psychology). The bar is an opinionated NOVELIST's UNFAIR one-liner that JUDGES via a
// concrete behavioral observation and states nothing about interior ("leading with her décolletage"). Same 5
// existing-input PCs; hard-ban explanation/diagnosis/emotion-words. Test: can the EXISTING inputs hit the
// Leonard/Austen/Pratchett bar? If yes → sufficient for JUDGMENT too. If it stays diagnostic → the diagnostic
// INPUTS (wound.core etc. ARE diagnoses) bias the register (connects to show-don't-tell in the model).
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';
const files = fs.readdirSync(DIR).filter(f => /^scene_.*\.json$/.test(f));

const SYS = 'You are an opinionated NOVELIST — Jane Austen, Elmore Leonard, Terry Pratchett, Gillian Flynn. I give you what is known about a character. Write the ONE sentence you would use to introduce her: a JUDGMENT, not an explanation.\n\nSTUDY THE BAR (these JUDGE — mischievous, unfair, and they state NOTHING about the interior):\n- "Jess made her entrance, as always leading with her décolletage."\n- "The concierge was the kind of man who looked down on you as he mispronounced \'concierge.\'"\n- "He had the sort of confidence that had never once been tested by a locked door."\n- "She apologised the way other people collected debts."\n\nHARD BANS (these turn it into a DIAGNOSIS — FORBIDDEN):\n- "would rather X than Y"\n- "the kind of woman who [needs/fears/hides/wants]…"\n- ANY word naming a feeling or psychological state: needs, fears, wants, lonely, vulnerable, connection, kindness, pity, guarded, longing, ache.\n- explaining WHY she is the way she is.\n\nINSTEAD: land ONE concrete, slightly unfair, almost mischievous observation of what she DOES or how she carries herself that IMPLIES everything without stating it. Plain words, one sentence. A reader should smile in recognition ("oh, I know that person"), not nod at an analysis.';

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await (await browser.newContext()).newPage();
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => window.state, { timeout: 30000 });
  const out = {};
  for (const f of files) {
    const d = JSON.parse(fs.readFileSync(DIR + '/' + f, 'utf8'));
    const pc = d.pcBodyBible || {}, cr = pc.current_crisis || {};
    const label = d.seed + ' [' + (d.seedCfg && d.seedCfg.archetype) + ']';
    const known = 'KNOWN about her:\n- Archetype/mask: ' + (d.seedCfg && d.seedCfg.archetype) +
      '\n- Wound: ' + JSON.stringify((pc.wound || {}).core || '') +
      '\n- Private hope: ' + JSON.stringify(pc.private_hope || '') +
      '\n- Core contradiction: ' + JSON.stringify(pc.core_contradiction || '') +
      '\n- Right now: ' + JSON.stringify(cr.event || '') + ' | what she refuses: ' + JSON.stringify(cr.refusal || '') +
      '\n- Self-conscious about: ' + JSON.stringify(pc.self_conscious_feature || '') +
      '\n- A habit: ' + JSON.stringify((pc.signature_habits || [])[0] || '');
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys, user }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.95, max_tokens: 60 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 8 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys: SYS, user: known });
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    out[label] = o;
    // quick diagnostic-leak check
    const leak = /would rather|kind of woman who|needs|fears|wants|lonely|vulnerable|connection|kindness|pity|longing|ache|guarded/i.test(o || '');
    console.error('\n[' + label + ']' + (leak ? '  ⚠DIAGNOSTIC-LEAK' : '  ✓judgment') + '\n  ' + (o || 'FAIL'));
    await new Promise(r => setTimeout(r, 2000));
  }
  fs.writeFileSync(DIR + '/judgments.json', JSON.stringify(out, null, 2));
  console.error('\nDONE judgment'); await browser.close(); process.exit(0);
})().catch(e => { console.error('JUDG-ERR', e.message); process.exit(1); });
