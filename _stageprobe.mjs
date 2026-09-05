import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true});
const p=await (await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window.STARTER_PLANS,{timeout:40000});
const out=await p.evaluate(()=>{
  const f=window._spineStagingFromEvent||(typeof _spineStagingFromEvent!=='undefined'?_spineStagingFromEvent:null);
  if(!f) return {err:'_spineStagingFromEvent not reachable on window'};
  const cast=['Lirael','Julian'];
  const goals=[
    'Lirael passes the folded note to her contact at the market stall.',
    'The ceremony collapses into accusations; the PC tries to explain something she does not understand herself.',
    'Lirael forces the gatekeeper to name the road Julian took with the relic.'];
  const plan=window.STARTER_PLANS['starter_first_sacrifice'];
  const withPlace=(plan.scenes||[]).map(s=>{let r=null;try{r=f(s.goal,cast);}catch(e){}
    return {n:s.n,staged:!!(r&&r.setting),setting:(r&&r.setting)||null};});
  return {probes:goals.map(g=>{let r=null;try{r=f(g,cast);}catch(e){r={err:String(e).slice(0,60)};}
    return {g:g.slice(0,60),r};}), withPlace};
});
await b.close();
if(out.err){console.log(out.err);process.exit(0);}
console.log('── _spineStagingFromEvent on individual goals ──');
out.probes.forEach(x=>console.log('  "'+x.g+'…"\n     → '+JSON.stringify(x.r)));
const ok=out.withPlace.filter(s=>s.staged);
console.log('\n── across all 20 STARTER_PLANS scenes ──');
console.log('  scenes yielding a staging setting: '+ok.length+'/'+out.withPlace.length);
ok.slice(0,6).forEach(s=>console.log('    scene '+s.n+' → "'+s.setting+'"'));
