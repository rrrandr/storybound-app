import { chromium } from 'playwright-core';
import fs from 'fs';
const D='_validate_out/issue2';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window._finalProseAudit,{timeout:90000});
const pick=(f)=>{ try{ const ts=JSON.parse(fs.readFileSync(`${D}/${f}`,'utf8'));
  const first=ts.find(r=>r.after&&r.after.length>200); return first?first.after:''; }catch(_){return '';} };
const rows=[['scene1', pick('textsnap.json'), 'scene1_final.txt'],
            ['scene3', pick('scene3_textsnap.json'), 'scene3_final.txt']];
for (const [n,raw,df] of rows){
  let dlv=''; try{dlv=fs.readFileSync(`${D}/${df}`,'utf8');}catch(_){}
  if(!raw||!dlv){console.log(`  ${n}  (no baseline/delivered)`);continue;}
  const r=await p.evaluate(([a,d])=>window._finalProseAudit(a,d),[raw,dlv]);
  console.log(`  ${n}  pipeline-in ${String(raw.length).padStart(5)} → delivered ${String(dlv.length).padStart(5)}   ${r.status.padEnd(7)} ${r.findings.slice(0,2).join(' | ')||'clean'}`);
}
await b.close();
