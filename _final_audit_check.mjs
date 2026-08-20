// Replays every captured run through the reader-boundary gate: Author raw vs delivered.
import { chromium } from 'playwright-core';
import fs from 'fs';
const runs = ['capture1','capture2','capture3','adjudication','charplus','hotproof'];
const b = await chromium.launch({headless:true});
const p = await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window._finalProseAudit,{timeout:90000});
for (const r of runs) {
  const dir = `_validate_out/${r}`;
  let raw='', dlv='';
  try { raw = fs.readFileSync(`${dir}/raw_author_1.txt`,'utf8'); } catch(_) {}
  try { dlv = fs.readFileSync(`${dir}/final.txt`,'utf8'); } catch(_) {
        try { dlv = fs.readFileSync(`${dir}/scene1_final.txt`,'utf8'); } catch(_) {} }
  if (!raw || !dlv) { console.log(`  ${r.padEnd(14)} (missing artifacts)`); continue; }
  const res = await p.evaluate(([a,d]) => window._finalProseAudit(a,d), [raw,dlv]);
  console.log(`  ${r.padEnd(14)} ${res.status.padEnd(7)} ${res.findings.slice(0,3).join(' | ') || 'clean'}`);
}
await b.close();
