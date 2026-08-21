import { chromium } from 'playwright-core';
import fs from 'fs';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window._finalProseAudit,{timeout:90000});
for (const d of process.argv.slice(2)) {
  const raw=fs.readFileSync(`_validate_out/${d}/raw_author_1.txt`,'utf8');
  const dlv=fs.readFileSync(`_validate_out/${d}/final.txt`,'utf8');
  const r=await p.evaluate(([a,x])=>window._finalProseAudit(a,x),[raw,dlv]);
  let prov=[]; try{prov=JSON.parse(fs.readFileSync(`_validate_out/${d}/prosesnap_full.json`,'utf8'));}catch(_){}
  console.log(`  ${d.padEnd(10)} raw ${String(raw.length).padStart(5)} → ${String(dlv.length).padStart(5)}   ${r.status.padEnd(7)} ${r.findings.join(' | ')||'clean'}`);
  console.log(`             provenance: ${prov.length?prov.map(x=>x.label+'/'+(x.sub||'-')).join(', '):'no prose-writer fired'}`);
}
await b.close();
