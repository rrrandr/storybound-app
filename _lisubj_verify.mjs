import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.state&&window.buildArchetypeDirectives,{timeout:90000});
const r=await p.evaluate(()=>{
  const out={};
  for (const g of ['Male','Female']) {
    Object.assign(window.state,{loveInterest:g, liGender:g.toLowerCase(),
      loveInterestName:'Julian', playerName:'Lirael', gender:'Female'});
    let t=''; try { t=window.buildArchetypeDirectives()||''; } catch(e){ t='THREW '+e.message; }
    out[g]={ tokens:(t.match(/\{(LI|MC)_[A-Z]+\}/g)||[]).length,
             he:(t.match(/\bhe\b/g)||[]).length, she:(t.match(/\bshe\b/g)||[]).length, len:t.length };
  }
  return out;
});
console.log('  Male   LI:', JSON.stringify(r.Male));
console.log('  Female LI:', JSON.stringify(r.Female));
await b.close();
