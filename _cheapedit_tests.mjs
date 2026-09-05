// _cheapLineEdit acceptance. Every assertion is gated on a PROVEN precondition.
// A failed precondition is HARNESS INVALID — never PASS, never FAIL.
import { chromium } from 'playwright-core';
import fs from 'fs';
const SCENE=JSON.parse(fs.readFileSync('_validate_out/assign_sessionA.json','utf8'))
  .results.find(r=>r.id==='V2').authorRaw;
const TARGET='hovered above the folded note I still held between my fingers';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
let calls=[];
await p.route('**/api/**', async r=>{
  const rq=r.request(); if(rq.method()==='POST'){ let bd={}; try{bd=JSON.parse(rq.postData()||'{}');}catch(_){}
    calls.push({url:rq.url().split('/').pop(), model:bd.model||bd.preferredModel||null}); }
  return r.continue();
});
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window._cheapLineEdit,{timeout:40000});
const r=await p.evaluate(async(cfg)=>{
  const o={pre:{}};
  o.pre.phrasePresentBefore = cfg.scene.indexOf(cfg.target)!==-1;   // PRECONDITION
  window.__regenAsLineEdit=false;
  o.kill = (await window._cheapLineEdit(cfg.scene,'Rephrase the target line.','t-kill'))===cfg.scene;
  window.__regenAsLineEdit=undefined;
  if(!o.pre.phrasePresentBefore) return o;                          // do not run the edit assertions
  const t0=Date.now();
  const ed=await window._cheapLineEdit(cfg.scene,
    'Rewrite ONLY this sentence fragment: "'+cfg.target+'". Replace it with a different plain physical description of the same moment. Change nothing else.','t-edit');
  o.secs=Math.round((Date.now()-t0)/1000);
  o.pre.modelCallReached=true;
  o.changed = !!ed && ed!==cfg.scene;
  o.len=ed?ed.length:0; o.origLen=cfg.scene.length;
  o.editAchieved = !!ed && ed.indexOf(cfg.target)===-1;
  o.withinDrift = !!ed && ed.length>cfg.scene.length*0.7 && ed.length<cfg.scene.length*1.3;
  return o;
},{scene:SCENE,target:TARGET});
await b.close();
const P=(c,m)=>console.log('  '+(c?'✅':'❌')+'  '+m);
const INV=m=>console.log('  ⚠️  HARNESS INVALID — '+m);
console.log('\n════ _cheapLineEdit ACCEPTANCE ════');
console.log('  precondition: target phrase present in fixture = '+r.pre.phrasePresentBefore);
P(r.kill,'kill switch → original returned');
if(!r.pre.phrasePresentBefore){ INV('target phrase absent from fixture; edit assertions not run'); process.exit(2); }
if(!r.pre.modelCallReached){ INV('model call never reached'); process.exit(2); }
P(r.changed,'candidate differs from input ('+r.origLen+'→'+r.len+' chars, '+r.secs+'s)');
P(r.editAchieved,'requested edit actually achieved (target fragment gone)');
P(r.withinDrift,'output inside _drift bounds (0.70–1.30)');
const mc=calls.filter(c=>c.url!=='csp-report'&&c.url!=='__mock_delay');
console.log('  endpoints: '+JSON.stringify([...new Set(mc.map(c=>c.url))]));
P(!mc.some(c=>/grok/i.test(String(c.model))),'no Grok model requested');
P(!mc.some(c=>c.url==='anthropic-proxy'),'no Anthropic call');
P(mc.some(c=>/mistral/i.test(String(c.model))),'Mistral Small executed the edit');
