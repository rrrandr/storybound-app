import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
let calls=[];
await p.route('**/api/**', async r=>{const rq=r.request();
  if(rq.method()==='POST'){let bd={};try{bd=JSON.parse(rq.postData()||'{}');}catch(_){}
   calls.push({url:rq.url().split('/').pop(),model:bd.model||bd.preferredModel||null});}
  return r.continue();});
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window.state,{timeout:40000});
const r=await p.evaluate(()=>({
  hotRenderExported: typeof window._hotRenderRepair==='function',
  liEarlyFns: Object.keys(window).filter(k=>/liEarly|hotRender|tensionGate/i.test(k)),
  hookInstalled: true
}));
await b.close();
console.log('\n════ LI-EARLY / TENSION-GATE REACHABILITY ════');
console.log('  window fns matching liEarly|hotRender|tensionGate: '+JSON.stringify(r.liEarlyFns));
console.log('  ⚠️  HARNESS INVALID — neither owner is exported; both fire only from inside the scene');
console.log('       pipeline, so their branches cannot be entered without a full turn.');
