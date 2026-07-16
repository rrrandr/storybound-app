// $0 verification that EVERY GN artist's signature style survives into the
// protected STYLE suffix that _buildLabeledPrompt appends AFTER the 4o funnel.
// Ender delivers line_control via its own anchor-rules/GM path; Ryo/Lora/Olen
// must now carry it in the suffix (else it rode only the trimmable zone).
// No paid endpoints — pure prompt-builder inspection.
const { chromium } = require('playwright-core');
const BLOCK = ['**/api/image**', '**/api/bfl-kontext**', '**/api/gemini-proxy**', '**/api/chatgpt-proxy**', '**/api/anthropic-proxy**', '**/api/mistral-proxy**', '**/api/grok-image**', '**/api/visualize-flux**'];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const p of BLOCK) await page.route(p, r => r.fulfill({ status: 500, body: '{}' }));
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForFunction(() => typeof window._buildStyleSuffix === 'function' && window.RENDER_STYLE_SYSTEM, { timeout: 40000 });

  const R = await page.evaluate(() => {
    const out = [];
    const t = (name, pass, detail) => out.push({ name, pass: !!pass, detail: detail || '' });
    const RSS = window.RENDER_STYLE_SYSTEM;
    const suffix = (k) => window._buildStyleSuffix(RSS[k], k) || '';

    // Every artist: style_anchor must survive in the protected suffix.
    ['ender_bond', 'ryo_toro', 'lora_venn', 'olen_droll'].forEach(k => {
      const sx = suffix(k);
      const anchorFrag = String((RSS[k].style_anchor || '')).slice(0, 24);
      t(k + ': style_anchor present in protected suffix', anchorFrag && sx.indexOf(anchorFrag) !== -1, sx.length + ' chars');
    });

    // The three non-Ender artists: their signature LINEWORK must now be in the suffix.
    const ryo = suffix('ryo_toro');
    t('ryo_toro: angular linework signature survives', /angular lines with tapered ends/.test(ryo) && /no generic anime smoothing/.test(ryo), '');
    const lora = suffix('lora_venn');
    t('lora_venn: "no hard ink outlines" (anti-Ender-ink) survives', /no hard ink outlines/.test(lora) && /form defined through brushwork/.test(lora), '');
    const olen = suffix('olen_droll');
    t('olen_droll: "clean but imperfect lines" survives', /clean but imperfect lines/.test(olen), '');

    // Ender: line_control NOT duplicated into the suffix (it has its own delivery), but
    // its inky style_anchor IS present.
    const ender = suffix('ender_bond');
    t('ender_bond: inky style_anchor present', /INK STRUCTURE|ink-BLOTTY|CROSSHATCH|INKED/i.test(ender), '');
    t('ender_bond: line_control NOT duplicated into suffix (delivered via anchor rules)', !/PROMINENT crosshatching in EVERY shadow plane/.test(ender), '');

    return out;
  });

  await browser.close();
  let pass = 0, fail = 0;
  console.log('\n  ARTIST STYLE SURVIVAL  ($0)\n  ' + '─'.repeat(58));
  for (const r of R) { r.pass ? pass++ : fail++; console.log('  ' + (r.pass ? '✓' : '✗') + ' ' + r.name + (r.detail ? '  · ' + r.detail : '')); }
  console.log('  ' + '─'.repeat(58) + '\n  ' + pass + ' passed, ' + fail + ' failed\n');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error('HARNESS ERROR:', e); process.exit(2); });
