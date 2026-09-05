import { chromium } from 'playwright-core';
import fs from 'fs';
const D='_validate_out/issue4';
const rs=JSON.parse(fs.readFileSync(`${D}/scene3_rawsnap_full.json`,'utf8'));
const authorIdx=rs.map((r,i)=>[r,i]).filter(([r])=>/authorChatCapture/.test(r.label)).map(([,i])=>i);
const s2base=rs[authorIdx[0]].after, s3base=rs[authorIdx[1]].after;
const ts=JSON.parse(fs.readFileSync(`${D}/textsnap.json`,'utf8'));
const s1base=(ts.find(r=>r.after&&r.after.length>200)||{}).after||'';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window._finalProseAudit,{timeout:90000});
for (const [n,base,f] of [['scene1',s1base,'scene1_final.txt'],['scene2',s2base,'scene2_final.txt'],['scene3',s3base,'scene3_final.txt']]) {
  const dlv=fs.readFileSync(`${D}/${f}`,'utf8');
  const r=await p.evaluate(([a,d])=>window._finalProseAudit(a,d),[base,dlv]);
  console.log(`  ${n}  in ${String(base.length).padStart(5)} → out ${String(dlv.length).padStart(5)}   ${r.status.padEnd(7)} ${r.findings.slice(0,2).join(' | ')||'clean'}`);
}
await b.close();
