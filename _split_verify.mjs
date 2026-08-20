import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.state&&window._cheapLineEdit,{timeout:90000});
const r=await p.evaluate(async () => {
  const txt='The presiding Dohkar’s hands rise. Julian stands among them, his slate-blue skin still, long black hair curtaining his face.';
  const out={};
  for (const [lbl,kind] of [['scene1-edit','SEMANTIC'],['body-dump-decluster','SEMANTIC'],
                            ['flavor-physics','SEMANTIC'],['made-up-new-label','UNKNOWN→SEMANTIC'],
                            ['vocab-ban','MECHANICAL']]) {
    let res=txt;
    try { res = await window._cheapLineEdit(txt, 'Improve this line.', lbl); } catch(e){ res='THREW'; }
    out[lbl] = { kind, inert: res === txt };
  }
  return out;
});
for (const [k,v] of Object.entries(r))
  console.log(`  ${k.padEnd(22)} ${v.kind.padEnd(18)} ${v.inert ? 'INERT ✓' : 'WROTE'}`);
await b.close();
