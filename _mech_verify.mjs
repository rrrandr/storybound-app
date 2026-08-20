import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
const logs=[]; p.on('console',m=>{const t=m.text(); if(/LINE-EDIT|PEN-OFF|SCENE-BUDGET|REPAIR-BUDGET|regenAsLineEdit/i.test(t)) logs.push(t.slice(0,140));});
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.state&&window._cheapLineEdit,{timeout:90000});
const r=await p.evaluate(async () => {
  const txt='She walked to the door. She walked to the door again, and the room held its breath.';
  const res = await window._cheapLineEdit(txt,
    'Replace the banned phrase "held its breath" with a neutral alternative. Change nothing else.', 'vocab-ban');
  return { changed: res !== txt, out: String(res||'').slice(0,160) };
});
console.log('  MECHANICAL vocab-ban → changed:', r.changed);
console.log('  out:', r.out);
console.log('  logs:'); logs.slice(0,6).forEach(l=>console.log('    ',l));
await b.close();
