import { chromium } from 'playwright-core';
const b = await chromium.launch({ headless: true, channel: 'chrome' });
const p = await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForFunction(() => typeof window._letterSfxCategory === 'function' && window._LETTER_SFX_VOCAB.blade_cut.length===5, { timeout: 40000 });
const r = await p.evaluate(() => {
  // replicate the sheet dedup loop over 4 beats: cut, clash, cut, slam
  const beats = [
    "Threxa slashes a gash across his shoulder",         // blade_cut
    "his polearm and her cutlass clash, steel locking",  // blade_clash
    "he cuts open the guard's arm with a slash",         // blade_cut (2nd)
    "he slams the enemy down, a heavy impact"            // impact
  ];
  const used = {}; const out = [];
  beats.forEach(bt => {
    const cat = window._letterSfxCategory(bt);
    if (!cat || !window._LETTER_SFX_VOCAB[cat]) { out.push({cat, word:null}); return; }
    const vocab = window._LETTER_SFX_VOCAB[cat]; let pick=null;
    for (const w of vocab){ if(!used[w]){ pick=w; break; } }
    if(!pick) pick=vocab[0]; used[pick]=1; out.push({cat, word:pick});
  });
  return out;
});
console.log(JSON.stringify(r));
await b.close();
