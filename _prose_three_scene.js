// THREE-SCENE PROSE TEST — validates the LAYERED WISH CANON contracts against ACTUAL Grok prose.
// For each seed: gate the REAL directive fns (as the app does), assemble that stack, send to the live Grok author,
// return prose + which layers fired. Then a human reads the prose against the contracts. 3 text-only Grok calls.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const OUTDIR = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/564e636e-ec4e-4bd6-9260-4dce17cb1833/scratchpad/prose_out';
fs.mkdirSync(OUTDIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const page = await browser.newPage();
  page.on('console', m => { const t = m.text(); if (/\[HARNESS\]/.test(t)) console.log('  ' + t); });
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._buildFatelandsWishCoreDirective === 'function', { timeout: 30000 });

  const res = await page.evaluate(async () => {
    const s = window.state = window.state || {};
    s.picks = Object.assign({}, s.picks, { world: 'Fantasy' });
    s.world = 'Fantasy';
    window._devBypass = true;

    const SEEDS = [
      { key: 'M1_mention', label: 'MENTION ONLY (Adjudication must stay silent; no Fate verdict invented)',
        text: "A harbor tavern at dusk. An old sailor, Coll, warns young Wren never to speak carelessly near Fate — 'a bargain is easier struck than unstruck,' he mutters — and cautions her with weathered proverbs about those who spoke without thinking. No one bargains here; no price is named; it is only a warning over cups." },
      { key: 'R2_resolved', label: 'WISH RESOLVED (Core honesty + Adjudication: Agency is RESISTED, must WARP not clean-grant)',
        text: "In a candlelit chapel, Aldric — rejected by the woman he loves — kneels before Fate and wishes aloud: 'Make Seren love me. I offer whatever it takes.' This scene shows Fate's answer." },
      { key: 'E3_edge_veilweave', label: 'EDGE / SPECIALIST (composite: cannot wish FOR Veilweave; must warp to concealment-appearance, not real artifact)',
        text: "Cornered in a lord's gallery, the thief Kestrel presses into the shadows and wishes aloud that her plain travelling cloak were true Veilweave, so the guards' eyes will slide past her. This scene shows Fate's answer." },
    ];

    const FRAME = 'You are the prose author for STORYBOUND, writing ONE scene of an interactive Fatelands fantasy story — a world that runs on sacrifice-magic: wishes made to an ancient, consistent law called Fate. Write vivid literary prose. The rules below are the HARD laws of how wishing works in this world; obey them EXACTLY, but never quote, name, or explain them — let them show only through the action and consequence.';

    async function grok(system, user) {
      const r = await fetch('/api/proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          role: 'SPECIALIST_RENDERER', preferredModel: 'grok-4-1-fast-reasoning', temperature: 0.7, max_tokens: 1100 }) });
      if (!r.ok) return { err: 'HTTP ' + r.status, text: '' };
      const d = await r.json();
      const c = (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || (d && d.content) || '';
      return { err: null, text: String(c || '').replace(/^\s*```[a-z]*\s*/i, '').replace(/\s*```\s*$/i, '').trim() };
    }

    const out = [];
    for (const seed of SEEDS) {
      const t = seed.text;
      const layers = {
        core: window._buildFatelandsWishCoreDirective(t, false) || '',
        adj: window._buildFatelandsWishAdjudicationDirective(t, false) || '',
        composite: window._buildFatelandsCompositeDirective(t) || '',
        granters: window._buildFatelandsGrantersDirective(t) || '',
        factions: window._buildFatelandsWishFactionsDirective(t) || '',
        limits: window._buildFatelandsWishLimitsDirective(t) || '',
        parable: window._buildFatelandsCraftParableDirective(t) || '',
      };
      const fired = {}; Object.keys(layers).forEach(k => fired[k] = !!layers[k]);
      const stack = ['core','adj','composite','granters','factions','limits','parable'].map(k => layers[k]).filter(Boolean).join('\n');
      const system = FRAME + '\n' + stack;
      const user = 'Write this scene as literary prose, 220–340 words, third person past tense. Just write the scene — do not explain anything. SITUATION:\n' + t;
      console.log('[HARNESS] generating ' + seed.key + ' … (fired: ' + Object.keys(fired).filter(k => fired[k]).join(',') + ')');
      const g = await grok(system, user);
      out.push({ key: seed.key, label: seed.label, fired, promptChars: system.length, err: g.err, prose: g.text });
    }
    return out;
  });

  await browser.close();

  const M = b => b ? '✓' : '✗';
  const LK = ['core','adj','composite','granters','factions','limits','parable'];
  for (const r of res) {
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log(r.key + ' — ' + r.label);
    console.log('  layers fired: ' + LK.map(k => k[0].toUpperCase()+k.slice(1) + ' ' + M(r.fired[k])).join('  '));
    console.log('  system prompt: ' + r.promptChars + ' chars (~' + Math.round(r.promptChars/4) + ' tok) | err: ' + (r.err || 'none'));
    console.log('  ── PROSE ──');
    console.log((r.prose || '(empty)').split('\n').map(l => '  ' + l).join('\n'));
    fs.writeFileSync(path.join(OUTDIR, r.key + '.txt'), r.prose || '(empty)');
  }
  console.log('\n(prose saved to ' + OUTDIR + ')');
})();
