// Decisive unit test: does an instruction-prefixed FULL-SCENE edit now survive transport validation?
import { chromium } from 'playwright-core';
import fs from 'fs';
const RAW=JSON.parse(fs.readFileSync('_validate_out/assign_sessionA.json','utf8'))
  .results.find(r=>r.id==='V2').authorRaw;
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window._mistralRepairPass&&window._validateRepairOutput,{timeout:40000});
const r=await p.evaluate(async(scene)=>{
  const msgs=[{role:'system',content:'You are a precise line-editor, NOT a writer. Fix ONLY what the instruction names. Return the COMPLETE edited scene and nothing else.'},
    {role:'user',content:'Remove the phrase "burned against my ribs" and replace it with a plainer physical beat.\n\n=== THE FINISHED SCENE (apply ONLY the minimal fix above; return the whole scene) ===\n\n'+scene}];
  const composedUser=msgs[1].content;
  // (a) OLD behaviour: validate candidate against the COMPOSED user message, full predicates
  const oldV=window._validateRepairOutput(scene, composedUser, 'test-old', {});
  // (b) NEW behaviour: validate against the real prose, transport-level only
  const newV=window._validateRepairOutput(scene, scene, 'test-new', {metaOnly:true});
  // (c) live call through the patched transport
  const t0=Date.now();
  const out=await window._mistralRepairPass(msgs,
    {temperature:0,max_tokens:3500,originalProse:scene,validateOpts:{metaOnly:true}},'calcified-line-edit');
  return {oldV,newV,secs:Math.round((Date.now()-t0)/1000),
    got:out==null?null:{len:out.length,head:String(out).slice(0,110)}};
},RAW);
await b.close();
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+'  '+m);
console.log('\n════ VALIDATOR CONTRACT FIX ════');
console.log('  RAW scene length: '+RAW.length);
ok(r.oldV.ok===false,'OLD path REJECTS an identical-scene candidate → reason: '+r.oldV.reason);
ok(r.newV.ok===true,'NEW path ACCEPTS it → reason: '+r.newV.reason);
if(r.got){ ok(true,'live Mistral call returned text ('+r.got.len+' chars, '+r.secs+'s)');
  console.log('     head: '+r.got.head); }
else ok(false,'live Mistral call still returned NULL after '+r.secs+'s');
