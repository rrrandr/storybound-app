import { chromium } from 'playwright-core';
const b = await chromium.launch({ headless: true });
const p = await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForFunction(() => window._buildFatelandsFFRiteDirective && window._buildFatelandsCompositeDirective, { timeout: 90000 });
const r = await p.evaluate(() => {
  const rite = window._buildFatelandsFFRiteDirective('the First Sacrifice rite began, the Sacrificiant presiding');
  const comp = window._buildFatelandsCompositeDirective('she carried an enchanted artifact of Veilweave');
  const off  = window._buildFatelandsFFRiteDirective('they walked to the market and bought bread');
  const k = t => ({
    trueName: /THE QUIETING BAND \(true name/.test(t),
    notVoice: /it does not silence the voice/.test(t),
    impulse: /SILENCES THE IMPULSE THAT TURNS DESIRE INTO A WISH/.test(t),
    mute: /a mute wisher signs, writes or traces/.test(t),
    dozen: /Roughly a dozen exist/.test(t),
    otherUses: /interrogation, imprisonment/.test(t),
    ordinary: /He becomes ORDINARY/.test(t),
    ffSplit: /FIRST FAVORED MORAL SPLIT/.test(t),
    karkus: /KARKUS RUMOUR/.test(t),
    invisible: /ITS MAGIC IS INVISIBLE/.test(t),
  });
  const same = rite.includes('THE QUIETING BAND (true name') && comp.includes('THE QUIETING BAND (true name');
  return { riteC: rite.length, compC: comp.length, offC: off.length, bothCarry: same,
           rite: k(rite), riteOnly: { family: /FAMILY of the one making the sacrifice/.test(rite), tearable: /IT CAN BE TORN OFF/.test(rite) } };
});
await b.close();
console.log(`  rite ${r.riteC}c · composite ${r.compC}c · gated-off ${r.offC}c ${r.offC===0?'(holds)':'(LEAKS)'}`);
console.log(`  both consumers carry the same definition: ${r.bothCarry}`);
for (const [k,v] of Object.entries(r.rite)) console.log(`   ${k.padEnd(11)} ${v}`);
console.log(`   rite-only: family=${r.riteOnly.family} tearable=${r.riteOnly.tearable}`);
