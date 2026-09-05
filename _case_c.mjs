// CASE C — skeleton must obey assignment + current-state absence. Direct unit call (one gpt-4o-mini call).
import { chromium } from 'playwright-core';
const GONE='Julian took the relic from the shrine table and walked out through the north gate. He is gone, and the relic is gone with him.';
const b=await chromium.launch({headless:true});
const page=await (await b.newContext()).newPage();
let skel=null;
await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.state&&window._selectSceneAssignment,{timeout:40000});
const reachable=await page.evaluate(()=>typeof window.__generateSceneSkeleton==='function');
if(!reachable){ console.log('  ⚠️  __generateSceneSkeleton not in scope — case C not unit-testable'); await b.close(); process.exit(0); }
await page.exposeFunction('__skel',t=>{skel=t;});
const res=await page.evaluate(async(gone)=>{
  const O=window.StoryboundOrchestration, orig=O.callChatGPT.bind(O);
  O.callChatGPT=function(msgs,role,opts){
    const sys=String(((msgs||[]).find(m=>m&&m.role==='system')||{}).content||'');
    if(/You define narrative skeletons/i.test(sys)) window.__skel(String(((msgs||[]).find(m=>m&&m.role==='user')||{}).content||''));
    return orig(msgs,role,opts);
  };
  const s=window.state;
  s.playerName='Lirael'; s.partnerName='Julian'; s.loveInterestName='Julian';
  s._starterId='starter_first_sacrifice'; s.turnCount=0; s.picks=s.picks||{}; s.picks.world='Fantasy';
  s._priorSceneText=gone; s._departedCharacters=['Julian'];
  window.STARTER_PLANS['starter_first_sacrifice'].scenes=[
    {n:2,goal:'Lirael passes the folded note to her contact at the market stall.',
     setting:'market stall',participants:['Lirael','Carys'],props:['folded note']}];
  s._sceneAssignment=window._selectSceneAssignment(s,2);
  await window.__generateSceneSkeleton('I go to the market stall to pass the note.','');
  return {anchor:(s.sceneSkeleton||{}).environment_anchor||null, staged:(s.sceneSkeleton||{}).staged_characters||null};
},GONE);
await b.close();
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+'  '+m);
console.log('\n════ CASE C — skeleton obeys assignment + prior state ════');
console.log('  resulting environment_anchor: '+JSON.stringify(res.anchor));
console.log('  staged_characters: '+JSON.stringify(res.staged));
if(!skel){console.log('  ❌ skeleton prompt not captured');process.exit(2);}
ok(/ASSIGNED EVENT/.test(skel),'prompt contains ASSIGNED EVENT');
ok(/REQUIRED SETTING[\s\S]*market stall/.test(skel),'prompt states required setting');
ok(/MUST BE PRESENT[\s\S]*Carys/.test(skel),'prompt states required participants');
ok(/MUST BE PHYSICALLY PRESENT \(props\)[\s\S]*folded note/.test(skel),'prompt states required props');
ok(/ALREADY ABSENT[\s\S]*Julian/.test(skel),'prompt states Julian is ALREADY ABSENT');
ok(res.anchor&&/market stall/i.test(res.anchor),'environment_anchor == assigned setting');
const jl=JSON.stringify(res.staged||[]);
ok(!/Julian/.test(jl)||/OFFSTAGE/i.test(jl),'Julian not staged IN_PERSON  ('+jl.slice(0,90)+')');
