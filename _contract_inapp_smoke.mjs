import fs from 'fs';
import { chromium } from 'playwright-core';
const OUT='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/author_ab';
const runs = JSON.parse(fs.readFileSync(OUT+'/consistency_test.json','utf8'));
const proses = runs.map(r=>String(r.prose||''));
const b = await chromium.launch({headless:true, channel:'chrome'});
const p = await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window.STARTER_SEEDS && typeof window._deriveReaderContract==='function' && typeof window._verifySceneContract==='function',{timeout:30000});
const res = await p.evaluate((proses)=>{
  const seed = window.STARTER_SEEDS.starter_first_sacrifice;
  const c = window._deriveReaderContract(seed, {}, {sceneIndex:0});
  const rows = proses.map(pr=>{ const v = window._verifySceneContract(pr, c); return {critFail: v.filter(x=>!x.pass && x.priority==='CRITICAL').length}; });
  // also demo advancement → scene 2
  const belief = window._advanceReaderModel(c.obligations.filter(o=>o.type==='knowledge').map(o=>({type:'knowledge',concept:o.concept,pass:true})), {});
  const c2 = window._deriveReaderContract(seed, belief, {sceneIndex:1});
  return { nOblig:c.obligations.length, guide:c.guideSpecies, li:c.liName,
    obligations:c.obligations.map(o=>o.priority+'/'+o.type+' '+o.id),
    meanCritFail:(rows.reduce((a,r)=>a+r.critFail,0)/rows.length), needRegen: rows.filter(r=>r.critFail>0).length,
    s2dropped:c2.droppedKnowledge, s2n:c2.obligations.length,
    instr: window._contractToAuthorInstruction(window._verifySceneContract(proses[8], c)) };
}, proses);
console.log('in-app derive: '+res.nOblig+' obligations · guide='+res.guide+' · li='+res.li);
res.obligations.forEach(o=>console.log('   '+o));
console.log('in-app mean CRITICAL failed: '+res.meanCritFail.toFixed(1)+'/4 · needRegen '+res.needRegen+'/'+proses.length);
console.log('advancement → scene 2 dropped: ['+res.s2dropped.join(', ')+'] · scene-2 obligations: '+res.s2n);
console.log('\nauthor instruction (scene 8):\n  '+res.instr);
await b.close(); process.exit(0);
