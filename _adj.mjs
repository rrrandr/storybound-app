import { chromium } from 'playwright-core';
import fs from 'fs';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window._finalProseAudit,{timeout:90000});
for (const d of process.argv.slice(2)) {
  // TRUE BASELINE: the first snap is what the pipeline actually received. The network
  // capture differs (2929 vs 2848 chars on at05_g) and using it reported AUTHOR prose
  // as created — every earlier verdict compared the wrong pair.
  let raw='';
  try {
    const ts=JSON.parse(fs.readFileSync(`_validate_out/${d}/textsnap.json`,'utf8'));
    const first=ts.find(r=>r.after && r.after.length>200);
    if (first) raw=first.after;
  } catch(_) {}
  if (!raw) raw=fs.readFileSync(`_validate_out/${d}/raw_author_1.txt`,'utf8');
  const dlv=fs.readFileSync(`_validate_out/${d}/final.txt`,'utf8');
  const r=await p.evaluate(([a,x])=>window._finalProseAudit(a,x),[raw,dlv]);
  let prov=[]; try{prov=JSON.parse(fs.readFileSync(`_validate_out/${d}/prosesnap_full.json`,'utf8'));}catch(_){}
  console.log(`  ${d.padEnd(10)} raw ${String(raw.length).padStart(5)} → ${String(dlv.length).padStart(5)}   ${r.status.padEnd(7)} ${r.findings.join(' | ')||'clean'}`);
  console.log(`             provenance: ${prov.length?prov.map(x=>x.label+'/'+(x.sub||'-')).join(', '):'no prose-writer fired'}`);
}
await b.close();
