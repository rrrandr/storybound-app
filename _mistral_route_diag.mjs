import fs from 'fs';
import { chromium } from 'playwright-core';
const OUT='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/author_ab';
const sample=String(JSON.parse(fs.readFileSync(OUT+'/consistency_test.json','utf8')).find(r=>r.i===8).prose||'');
const b=await chromium.launch({headless:true,channel:'chrome'});
const p=await(await b.newContext()).newPage();
const logs=[];p.on('console',m=>{const t=m.text();if(/CONTRACT|REPAIR/.test(t))logs.push(t);});
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window._repairViaMistral&&window._deriveReaderContract,{timeout:30000});
const res=await p.evaluate(async(sample)=>{
  const out={};
  // 1) RAW route test: exactly what _repairViaMistral sends
  try{
    const r=await fetch('/api/proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'LINE_EDITOR',model:'mistral-small-latest',temperature:0.2,max_tokens:120,messages:[{role:'system',content:'Reply with the single word OK.'},{role:'user',content:'OK'}]})});
    out.rawStatus=r.status;out.rawOk=r.ok;
    let j=null;try{j=await r.json();}catch(e){out.rawParseErr=String(e);}
    out.rawContent=j?((j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||j.content||JSON.stringify(j).slice(0,300)):null;
    out.rawServed=j&&(j.model||(j._orchestration&&j._orchestration.model));
    out.rawKeys=j?Object.keys(j):null;
  }catch(e){out.rawThrew=String(e);}
  // 2) try alt endpoint /api/mistral-proxy
  try{
    const r2=await fetch('/api/mistral-proxy',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'mistral-small-latest',temperature:0.2,max_tokens:120,messages:[{role:'system',content:'Reply with the single word OK.'},{role:'user',content:'OK'}]})});
    out.mpStatus=r2.status;out.mpOk=r2.ok;let j2=null;try{j2=await r2.json();}catch(_){}
    out.mpContent=j2?((j2.choices&&j2.choices[0]&&j2.choices[0].message&&j2.choices[0].message.content)||j2.content||JSON.stringify(j2).slice(0,200)):null;
  }catch(e){out.mpThrew=String(e);}
  // 3) actual _repairViaMistral on the sample
  const c=window._deriveReaderContract(window.STARTER_SEEDS.starter_first_sacrifice,{},{sceneIndex:0});
  const v=window._verifySceneContract(sample,c);
  const unmet=v.filter(x=>!x.pass&&x.priority!=='OPTIONAL');
  out.unmetCount=unmet.length;
  try{const rep=await window._repairViaMistral(sample,unmet,window.STARTER_SEEDS.starter_first_sacrifice);out.repairReturned=rep?('OBJECT keys='+Object.keys(rep)):'null';}catch(e){out.repairThrew=String(e);}
  return out;
},sample);
console.log(JSON.stringify(res,null,2));
console.log('\n=== CONTRACT/REPAIR console logs ===');
logs.forEach(l=>console.log('  '+l));
await b.close();process.exit(0);
