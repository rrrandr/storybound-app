import { chromium } from 'playwright-core';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForFunction(() => window._buildCharacterPlusShared && window._WORLD_SENSORY, { timeout: 90000 });
const r = await p.evaluate(() => {
  window.state.playerMask = 'OPEN_VEIN';
  const t = window._buildCharacterPlusShared({});
  return { chars: t.length,
    entries: Object.keys(window._WORLD_SENSORY).length,
    chain:   /ANCHOR → PERCEPTION → ARCHETYPE MEANING → EMOTIONAL REVEAL/.test(t),
    canon:   /WORLD SENSORY CANON — these are FACTS, not omens/.test(t),
    honey:   /spiced honey warmed by stone/.test(t),
    veil:    /rain on silk bark/.test(t),
    fold:    /cold metal after lightning/.test(t),
    twoRead: /Same field, same scent, two different truths/.test(t),
    rarity:  /THE SMELL IS ALWAYS THERE; THE OBSERVATION IS RARE/.test(t),
    perfume: /fantasy perfume/.test(t),
    agency:  /CHARACTER\+ REQUIRES AGENCY/.test(t),
  };
});
await b.close();
console.log(`  builder ${r.chars}c · registry entries ${r.entries}`);
for (const k of ['chain','canon','honey','veil','fold','twoRead','rarity','perfume','agency'])
  console.log(`   ${k.padEnd(9)} ${r[k]}`);
