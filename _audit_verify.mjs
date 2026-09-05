import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.state&&window._auditMutation,{timeout:90000});
const r=await p.evaluate(()=>{
  const before='I watched him. He did not move. I remembered the clay.';
  const cases=[
    ['clr','pen-removed validator, any change',        before, before+' “I warned you,” he said.'],
    ['_repairLIPicturability','created dialogue',      before, before+' “You have no right,” he said.'],
    ['_repairLIPicturability','clarified detail (ok)', before, before.replace('He did not move','He did not move, jaw tight')],
    ['_repairHotOpening','POV collapse',               'I saw. I felt. I knew. I ran.', 'She saw. She felt. She knew. She ran.'],
    ['_unregisteredPassV2','undeclared → default rules', before, before+' “New line,” she said.'],
  ];
  return cases.map(([o,label,a,c])=>({o,label,...window._auditMutation(o,a,c)}));
});
r.forEach(x=>console.log(`  ${x.o.padEnd(26)} ${x.label.padEnd(30)} ${x.ok?'ALLOWED':'VIOLATION: '+x.violations.join(', ')}`));
await b.close();
