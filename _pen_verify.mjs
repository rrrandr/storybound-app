import { chromium } from 'playwright-core';
import fs from 'fs';
const raw = fs.readFileSync('_validate_out/hotproof/raw_author_1.txt','utf8');
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await p.waitForFunction(()=>window.state&&window.STARTER_STORIES,{timeout:90000});
const out=await p.evaluate(async (raw)=>{
  Object.assign(window.state,{playerName:'Lirael',loveInterestName:'Julian',pov:'first_person',turnCount:0});
  const NAMES=['_repairLIPicturability','_repairBodyBibleDump','_reflowSceneDialogueLLM',
               '_repairLIRelationalValue','_repairInterlocutorPicturability','_repairCalcifiedMoves'];
  const res=[];
  for(const n of NAMES){
    const fn=window[n]; if(typeof fn!=='function'){res.push({n,status:'not exported'});continue;}
    window._penOff={}; window._penOff[n]=true;
    let after=raw; try{ after=await fn(raw);}catch(e){res.push({n,status:'threw '+String(e).slice(0,60)});continue;}
    res.push({n,status:(after===raw)?'INERT ✓':'STILL WROTE ✗',len:(after||'').length});
  }
  window._penOff={};
  return res;
},raw);
out.forEach(r=>console.log(`  ${r.n.padEnd(34)} ${r.status}`));
await b.close();
