import { chromium } from 'playwright-core';
import fs from 'fs';
const D='_validate_out/issue1';
const pairs=[['scene1','raw_author_1.txt','scene1_final.txt'],
             ['scene2','raw_author_2.txt','scene2_final.txt'],
             ['scene3','raw_author_3.txt','scene3_final.txt']];
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window._finalProseAudit,{timeout:90000});
for(const [n,rf,df] of pairs){
  let raw='',dlv='';
  try{raw=fs.readFileSync(`${D}/${rf}`,'utf8');}catch(_){}
  try{dlv=fs.readFileSync(`${D}/${df}`,'utf8');}catch(_){}
  if(!raw||!dlv){console.log(`  ${n}  (missing)`);continue;}
  const r=await p.evaluate(([a,d])=>window._finalProseAudit(a,d),[raw,dlv]);
  console.log(`  ${n}  raw ${String(raw.length).padStart(5)} → delivered ${String(dlv.length).padStart(5)}   ${r.status.padEnd(7)} ${r.findings.slice(0,3).join(' | ')||'clean'}`);
}
await b.close();
