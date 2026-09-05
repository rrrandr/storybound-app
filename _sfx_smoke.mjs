import { chromium } from 'playwright-core';
const b = await chromium.launch({ headless: true, channel: 'chrome' });
const p = await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForFunction(() => typeof window._buildStoryboardDoc === 'function' && typeof window._buildGraphicTypography === 'function' && typeof window._letterSfxCategory === 'function', { timeout: 40000 });
const r = await p.evaluate(() => {
  const beats = {
    Q1_ambush: 'the ambush is sprung; Orun drops from a high branch, Threxa swings in — both closing in, nobody hurt yet',
    Q2_slice:  'Threxa\'s curved cutlass slashes a gash across Kael\'s shoulder, cutting through the Veilweave, first blood',
    Q3_clash:  'Kael\'s polearm and Threxa\'s cutlass CLASH as his hook locks her blade and whips her off her feet',
    Q4_thud:   'Kael slams Orun down into the base of the white tree, a heavy impact at the point of contact'
  };
  const out = {};
  for (const [k, bt] of Object.entries(beats)) {
    const type = window._readerLearningType(bt, k === 'Q1_ambush') || 'Threat';
    const doc = window._buildStoryboardDoc(type, bt, null);
    const gt = window._buildGraphicTypography(bt, doc.graphicLanguage, {});
    out[k] = {
      type,
      sfxCategory: window._letterSfxCategory(bt),
      sfx: gt.sfx ? (gt.sfx.text || ('(suppressed by ' + gt.sfx.suppressedBy + ')')) : null,
      graphicLanguage: Object.keys(doc.graphicLanguage || {}).map(c => c + ':' + doc.graphicLanguage[c].level)
    };
  }
  return out;
});
console.log(JSON.stringify(r, null, 2));
await b.close();
