import { chromium } from 'playwright-core';
import fs from 'fs';
const SCENE=JSON.parse(fs.readFileSync('_validate_out/assign_sessionA.json','utf8'))
  .results.find(r=>r.id==='V2').authorRaw;
const TARGET='hovered above the folded note I still held between my fingers';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
let calls=[];
await p.route('**/api/**', async r=>{ const rq=r.request();
  if(rq.method()==='POST'){ let bd={}; try{bd=JSON.parse(rq.postData()||'{}');}catch(_){}
    calls.push({url:rq.url().split('/').pop(),model:bd.model||bd.preferredModel||null}); }
  return r.continue(); });
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window._cascadeLineEdit&&window._cheapLineEdit,{timeout:40000});
const r=await p.evaluate(async(cfg)=>{
  const o={pre:{}};
  window.__cheapEditTrace=[];
  o.pre.detectorReachable = typeof window._detectLISocialProofGap==='function';
  o.pre.phrasePresent = cfg.scene.indexOf(cfg.target)!==-1;
  o.pre.cascadeExported = typeof window._cascadeLineEdit==='function';
  if(!o.pre.phrasePresent||!o.pre.cascadeExported) return o;
  const out=await window._cascadeLineEdit(cfg.scene,
    'Rewrite ONLY this fragment: "'+cfg.target+'". Replace with a different plain physical description. Change nothing else.');
  o.trace=window.__cheapEditTrace.slice();
  o.traversedCheapLineEdit=o.trace.length>0;
  o.changed=!!out&&out!==cfg.scene;
  o.editAchieved=!!out&&out.indexOf(cfg.target)===-1;
  o.len=out?out.length:0;
  return o;
},{scene:SCENE,target:TARGET});
await b.close();
const P=(c,m)=>console.log('  '+(c?'✅':'❌')+'  '+m);
const INV=m=>console.log('  ⚠️  HARNESS INVALID — '+m);
console.log('\n════ LI-PROOF PATH (_cascadeLineEdit → _cheapLineEdit) ════');
console.log('  preconditions: '+JSON.stringify(r.pre));
if(!r.pre.phrasePresent||!r.pre.cascadeExported){ INV('preconditions unmet'); process.exit(2); }
P(r.traversedCheapLineEdit,'PROVEN traversal of _cheapLineEdit (source hook, not logs) — '+JSON.stringify(r.trace));
P(r.changed,'candidate differs from original ('+SCENE.length+'→'+r.len+')');
P(r.editAchieved,'requested edit achieved');
const mc=calls.filter(c=>!['csp-report','beta-events','__mock_delay'].includes(c.url));
console.log('  endpoints: '+JSON.stringify([...new Set(mc.map(c=>c.url))]));
P(!mc.some(c=>/grok/i.test(String(c.model))),'no Grok requested');
P(!mc.some(c=>c.url==='anthropic-proxy'),'no Anthropic call');
if(!r.pre.detectorReachable) INV('_detectLISocialProofGap not exported — full LI-PROOF success/fail/exception cases need a source hook');
