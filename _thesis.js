// PROVE-SUFFICIENCY-BEFORE-INVENTING (Roman 2026-08-04). The one genuinely-unowned decision = editorial_thesis
// ("here is what this person is about", said first — "leading with her décolletage"). Roman: it's a FUNCTION,
// not a field. DO NOT invent a salience field until proven the EXISTING inputs can't generate it. Test: feed
// each real PC's EXISTING fields (mask/wound/hope/crisis/weather/appearance) and ask for the editorial thesis.
// If the 5 come out DISTINCT + sharp + décolletage-quality → ontology SUFFICIENT (gap = a missing FUNCTION, not
// a field). If generic/homogeneous → the inputs can't produce it → earned new field. (Lean on the DIFFERENTIATING
// inputs — mask/wound/crisis DO differ across the 5, even though appearance converged.)
const { chromium } = require('playwright-core');
const fs = require('fs');
const DIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/decisions';
const files = fs.readdirSync(DIR).filter(f => /^scene_.*\.json$/.test(f));

const SYS = 'You are the narrator of a novel. I give you what is KNOWN about a character. Write the NARRATOR\'S FIRST-IMPRESSION EDITORIAL THESIS about her — the single "here is what this person is about" judgment a narrator makes on first sight. Examples of the FORM (not the content):\n- "Jess made her entrance, as always leading with her décolletage."\n- "The concierge was the kind of man who looked down on you as he mispronounced \'concierge.\'"\n- "She came in already looking for somewhere to run."\nRULES: NOT a description, NOT her appearance, NOT a summary of the facts I give you — the narrator\'s snap VERDICT on what she is FUNDAMENTALLY about. Effortless, plain words, ONE sentence, no metaphor. It may be unfair; it should be specific and reveal her essence. Do not restate the wound or crisis literally.';

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
    const known = 'KNOWN about her:\n' +
      '- Archetype/mask: ' + (d.seedCfg && d.seedCfg.archetype) + '\n' +
      '- Wound: ' + JSON.stringify((pc.wound || {}).core || '') + '\n' +
      '- Private hope: ' + JSON.stringify(pc.private_hope || '') + '\n' +
      '- Core contradiction: ' + JSON.stringify(pc.core_contradiction || '') + '\n' +
      '- Emotional weather: ' + JSON.stringify(pc.emotional_weather || '') + '\n' +
      '- Right now: ' + JSON.stringify(cr.event || '') + ' | her deepest fear: ' + JSON.stringify(cr.immediate_fear || '') + ' | what she refuses: ' + JSON.stringify(cr.refusal || '') + '\n' +
      '- Self-conscious about: ' + JSON.stringify(pc.self_conscious_feature || '') + '\n' +
      '- Appearance: ' + JSON.stringify((pc.face || '').slice(0, 80));
    let o = null;
    for (let a = 0; a < 2 && !o; a++) {
      o = await page.evaluate(async ({ sys, user }) => {
        try { const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], role: 'NARRATIVE_AUTHOR', preferredModel: 'grok-4.3', temperature: 0.9, max_tokens: 60 }) }); const j = await r.json(); const c = String((j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content) || j.content || '').trim(); return c.length > 8 ? c : null; } catch (e) { return 'ERR:' + e.message; } }, { sys: SYS, user: known });
      if (!o) await new Promise(r => setTimeout(r, 3000));
    }
    out[label] = o;
    console.error('\n[' + label + ']\n  ' + (o || 'FAIL'));
    await new Promise(r => setTimeout(r, 2000));
  }
  fs.writeFileSync(DIR + '/theses.json', JSON.stringify(out, null, 2));
  console.error('\nDONE thesis'); await browser.close(); process.exit(0);
})().catch(e => { console.error('THESIS-ERR', e.message); process.exit(1); });
