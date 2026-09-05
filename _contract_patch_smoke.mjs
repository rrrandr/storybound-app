import fs from 'fs';
import { chromium } from 'playwright-core';
const OUT='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/author_ab';
const runs=JSON.parse(fs.readFileSync(OUT+'/consistency_test.json','utf8'));
const sample=String(runs.find(r=>r.i===8).prose||'');
const b=await chromium.launch({headless:true,channel:'chrome'});
const p=await(await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window._applyEditPlan&&window._runSceneContractLoop&&window._deriveReaderContract,{timeout:30000});
const res=await p.evaluate(async(sample)=>{
  // 1) patch mechanics: insert mid-scene after a real anchor
  const plan=[{after:'Two dozen First Favored ringed the clearing',insert:'First Favored are hired to supervise these rites because a careless first wish can twist before anyone else notices.'}];
  const patched=window._applyEditPlan(sample,plan);
  const insertedMidScene = patched.text.indexOf('hired to supervise') < sample.length; // inserted before the end
  // 2) loop with a MOCK mistral repair that returns full patched text targeting unmet obligations
  const seed=window.STARTER_SEEDS.starter_first_sacrifice;
  const c=window._deriveReaderContract(seed,{},{sceneIndex:0});
  const beats={
    ff_function:{after:'ringed the clearing',insert:'First Favored exist to keep a youth’s first wish from twisting.'},
    why_public:{after:'kneeling youth whose hands trembled',insert:'The rite stays public because anyone present who wishes the youth ill could twist the outcome.'},
    narrator_role:{after:'Read them now',insert:'I was the one assigned to read the alignment and halt the wish if it slipped.'},
    li_matters:{after:'come only to observe',insert:'Julian had trained me; his judgment was the one I could never stop watching for.'}
  };
  const mockRepair=async(now,unmet)=>{
    const ids=unmet.map(u=>u.id);
    const edits=Object.keys(beats).filter(k=>ids.includes(k)).map(k=>beats[k]);
    return window._applyEditPlan(now,edits).text;
  };
  const r=await window._runSceneContractLoop(sample,c,mockRepair,{maxLoops:3});
  return {insertedMidScene, appliedFallback:patched.applied,
    criticalTotal:r.criticalTotal,criticalRemaining:r.criticalRemaining,totalAddedWords:r.totalAddedWords,
    econ:r.economics};
},sample);
console.log('patch mid-scene insert works:',res.insertedMidScene,'(applied '+res.appliedFallback+')');
console.log('mock repair loop: CRITICAL '+(res.criticalTotal-res.criticalRemaining)+'/'+res.criticalTotal+' satisfied · +'+res.totalAddedWords+'w total');
console.log('economics (note efficiency = obligations/word):',JSON.stringify(res.econ,null,1));
await b.close();process.exit(0);
