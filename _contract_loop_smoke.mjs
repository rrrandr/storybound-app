import fs from 'fs';
import { chromium } from 'playwright-core';
const OUT='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/author_ab';
const runs = JSON.parse(fs.readFileSync(OUT+'/consistency_test.json','utf8'));
const sample = String(runs.find(r=>r.i===8).prose||'');
const b = await chromium.launch({headless:true, channel:'chrome'});
const p = await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window._runSceneContractLoop && window._deriveReaderContract && window._contractCompletionDirective,{timeout:30000});
const res = await p.evaluate(async (sample)=>{
  const seed = window.STARTER_SEEDS.starter_first_sacrifice;
  const c = window._deriveReaderContract(seed, {}, {sceneIndex:0});
  // completion-condition directive builds?
  const cond = window._contractCompletionDirective(c);
  // mock continuation: each call returns a beat that satisfies the currently-named unmet concepts
  const beats = {
    'the narrator is the guide responsible for this rite':'I was the one assigned to read them; my training let me catch what the family could not.',
    'what First Favored do':'"You were not hired to cast wishes," the elder had told me once. "First Favored exist to keep foolish children from twisting their first one."',
    'why the ceremony is public':'The rite was public because anyone present who wished the youth ill could twist the outcome, so all must witness to keep hidden malice from taking root.',
    'why Julian matters':'Julian had trained me; he was the one who first taught me to read a fraying thread, and I had never stopped watching for his judgment.',
    'the narrator to reveal one predictive behavioral trait':'I refused to look away, the way I always refuse when something is about to break.'
  };
  let calls=0;
  const mockContinue = async (soFar, instr)=>{
    calls++;
    // add every beat whose key phrase appears in the instruction (targets only unmet)
    let add=[]; for (const k in beats){ if (instr.indexOf(k)>=0) add.push(beats[k]); }
    return add.join(' ');
  };
  const r = await window._runSceneContractLoop(sample, c, mockContinue, {maxLoops:3});
  return { cond: cond.slice(0,180), calls, criticalTotal:r.criticalTotal, criticalRemaining:r.criticalRemaining,
    economics:r.economics, finalPass:r.verdicts.filter(v=>v.pass).map(v=>v.id), grew:r.text.length-sample.length };
}, sample);
console.log('completion-condition directive builds:', JSON.stringify(res.cond)+'…\n');
console.log('mock loop: continueFn called '+res.calls+'× · CRITICAL '+(res.criticalTotal-res.criticalRemaining)+'/'+res.criticalTotal+' satisfied · grew +'+res.grew+'c');
console.log('economics:', JSON.stringify(res.economics,null,1));
console.log('final passing obligations:', res.finalPass.join(', '));
await b.close(); process.exit(0);
