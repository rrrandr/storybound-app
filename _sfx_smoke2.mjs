import { chromium } from 'playwright-core';
const b = await chromium.launch({ headless: true, channel: 'chrome' });
const p = await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForFunction(() => typeof window._letterSfxCategory === 'function' && Array.isArray(window._LETTER_SFX_VOCAB.blade_cut), { timeout: 40000 });
const r = await p.evaluate(() => {
  const beats = {
    Q2: "Threxa SLASHES her curved cutlass and cuts a gash across Kael's shoulder, slicing through the Veilweave, first blood",
    Q3: "His polearm and Threxa's cutlass CLASH, steel locking as his crescent hook catches her blade and whips her off her feet",
    Q4: "Kael SLAMS Orun back-first into the base of the white twin-trunk tree, a heavy bone-jarring impact at the point of contact"
  };
  const o={};
  for (const [k,bt] of Object.entries(beats)){ const c=window._letterSfxCategory(bt); o[k]={cat:c, word:c?window._LETTER_SFX_VOCAB[c][0]:null}; }
  return o;
});
console.log(JSON.stringify(r));
await b.close();
