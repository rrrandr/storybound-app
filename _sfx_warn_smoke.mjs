import { chromium } from 'playwright-core';
const b = await chromium.launch({ headless: true, channel: 'chrome' });
const p = await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 30000 });
await p.waitForFunction(() => typeof window._letterSfxCategory === 'function' && Array.isArray(window._LETTER_SFX_VOCAB.rustle), { timeout: 40000 });
const r = await p.evaluate(() => {
  const beats = {
    topiary: "she freezes — the topiary along the path stirs and rustles though there is no wind",
    doorway: "behind the dark doorway an old hinge creaks, slow and deliberate",
    ceiling: "a wet spot spreads on the ceiling and a single drop drips onto the table",
    rope:    "the rope bridge timber groans and strains under their weight, about to give",
    dark:    "something small skitters across the floor in the shadow behind the shelves",
    // action must still win over ambient warning:
    action_wins: "he slashes a gash across the guard as the hedge rustles behind them"
  };
  const o={};
  for (const [k,bt] of Object.entries(beats)){ const c=window._letterSfxCategory(bt); o[k]={cat:c, word:c?window._LETTER_SFX_VOCAB[c][0]:null}; }
  return o;
});
console.log(JSON.stringify(r,null,2));
await b.close();
