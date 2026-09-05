// _ordering_trace.mjs — FREE. Establishes, per scene: what "scene N" means at every layer, and the
// call ORDER of plan selection vs skeleton generation vs author assembly. Author is STUBBED. No app edits.
import { chromium } from 'playwright-core';
import fs from 'fs';
const prior=JSON.parse(fs.readFileSync('/tmp/arm_gen.json','utf8')).scenes;
const browser=await chromium.launch({headless:true});
const page=await (await browser.newContext()).newPage();
for(const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(p,r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));
const T0=Date.now(); const ev=[];
const push=(label,detail,turn)=>ev.push({t:Date.now()-T0,label,detail,turn});
const isAuthor=(sys,m)=>/STORYBOUND ARCHITECTURE LAWS/.test(sys)||/grok-4\.3/.test(String(m||''));
await page.route('**/api/**', async route=>{
  const r=route.request(); if(r.method()!=='POST') return route.continue();
  let b=null; try{b=JSON.parse(r.postData()||'{}');}catch(_){return route.continue();}
  const sys=String(((b.messages||[]).find(m=>m.role==='system')||{}).content||'');
  if(!isAuthor(sys,b.model||b.preferredModel)) return route.continue();
  const tc=await page.evaluate(()=>window.state.turnCount).catch(()=>null);
  push('AUTHOR payload assembled →sent','', tc);
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:'[stubbed]'})});
});
page.on('console',m=>{const t=m.text();
  let mm;
  if((mm=t.match(/\[PLAN-SPINE\][^\n]*scene=(\d+)/))) push('PLAN-SPINE selected','planIndex='+mm[1],null);
  else if((mm=t.match(/\[SKELETON\] Generated for scene (\d+)/))) push('SKELETON end','loggedScene='+mm[1],null);
  else if(/\[SPINE-STAGING\]/.test(t)) push('SPINE-STAGING override fired','',null);
});
await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.state&&window.StoryPagination&&window.STARTER_PLANS,{timeout:40000});
await page.waitForTimeout(500);
await page.exposeFunction('__trace',(label,detail,turn)=>push(label,detail,turn));
await page.evaluate(()=>{
  // wrap the shared LLM entry point; identify callers by their system prompt signature
  const O=window.StoryboundOrchestration; const orig=O.callChatGPT.bind(O);
  O.callChatGPT=async function(msgs,role,opts){
    const sys=String(((msgs||[]).find(m=>m&&m.role==='system')||{}).content||'');
    const usr=String(((msgs||[]).find(m=>m&&m.role==='user')||{}).content||'');
    let kind=null;
    if(/You define narrative skeletons/i.test(sys)) kind='SKELETON start';
    else if(/scene_mission/.test(sys+usr)) kind='SCENE-PLANNER start (scene_mission)';
    const tc=window.state&&window.state.turnCount;
    if(kind) window.__trace(kind,'',tc);
    const r=await orig(msgs,role,opts);
    if(kind==='SKELETON start') window.__trace('SKELETON returned','',window.state&&window.state.turnCount);
    if(kind&&kind.indexOf('SCENE-PLANNER')===0){
      let mission=null; try{mission=(JSON.parse(String(r).replace(/```json?|```/g,'').trim())||{}).scene_mission;}catch(_){}
      window.__trace('SCENE-PLANNER returned',mission?('mission="'+String(mission).slice(0,60)+'"'):'(unparsed)',window.state&&window.state.turnCount);
    }
    return r;
  };
  const s=window.state, def=(window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
  window._devBypass=true; s.picks=s.picks||{}; window._usePlanSpine=true;
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>s.picks[k]=def[k]);
  s.world=def.world; s.worldSubtype=def.worldSubtype; s.flavor=def.flavor; s.dynamic=def.dynamic;
  s._starterId=def.id; s.is_starter_story=true; s.immutableTitle=def.title;
  s.archetype={primary:def.archetype,modifier:null}; s.name='Lirael'; s.playerName='Lirael';
  s.loveInterestName='Julian'; s.partnerName='Julian'; s.loveInterest='Male'; s.liGender='male';
  s.playerMask='OPEN_VEIN'; s.storyLength='fling'; s.tier='fling'; s.access='sub'; s.subscribed=true;
  s.fortunes=9999999; s.previewActive=false; s._skipCorridorValidation=true; s.intensity='Steamy';
  s.pov='first_person'; s.identity={playerName:'Lirael',partnerName:'Julian'}; s.picks.identity=s.identity;
  s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.currentEngine='literary';
});
const snap=async(tag)=>{const st=await page.evaluate(()=>({turnCount:window.state.turnCount,
  pages:(window.StoryPagination.getPages()||[]).filter(h=>String(h).replace(/<[^>]+>/g,'').trim().length>800).length,
  verbatim:!!window.state._spineEventVerbatim, staging:!!window.state._spineStaging,
  anchor:(window.state.sceneSkeleton||{}).environment_anchor||null}));
  push('── '+tag+' ──','turnCount='+st.turnCount+' committedPages='+st.pages+' verbatim='+st.verbatim
    +' staging='+st.staging+' anchor='+JSON.stringify(st.anchor),st.turnCount); return st;};
await snap('BEFORE Scene 1');
await page.evaluate(()=>window.handleBeginStory());
for(let w=0;w<420000;w+=3000){await page.waitForTimeout(3000);
  if(await page.evaluate(()=>((window.StoryPagination.getPages()||[]).join('').length>1200)))break;}
await page.waitForTimeout(4000);
await snap('AFTER Scene 1');
for (let turn=1; turn<=2; turn++) {
  await page.evaluate((seed)=>{const s=window.state,SP=window.StoryPagination;
    if(!s._sceneTextRing||!s._sceneTextRing.length){s._sceneTextRing=[{text:seed}];s._priorSceneText=seed;}
    s._cliffhangerContinueAuthorized=true; s._isAdvancingScene=false;
    s._petitionEmergenceFired=true; s._deckExamineFired=true;},prior[0].text);
  await snap('BEFORE continuation '+turn);
  const before=await page.evaluate(()=>(window.StoryPagination.getPages()||[]).length);
  await page.evaluate(()=>{document.getElementById('actionInput').value='I go to the market stall to pass the note.';
    document.getElementById('dialogueInput').value='';const b=document.getElementById('submitBtn');b.disabled=false;b.click();});
  for(let w=0;w<420000;w+=3000){await page.waitForTimeout(3000);
    if(await page.evaluate((n)=>(window.StoryPagination.getPages()||[]).length>n,before))break;}
  await page.waitForTimeout(3000);
  await snap('AFTER continuation '+turn);
}
await browser.close();
fs.writeFileSync('_validate_out/ordering_trace.json',JSON.stringify(ev,null,2));
console.log('\n════ ORDERING / INDEX TRACE ════');
ev.forEach(e=>console.log(('+'+e.t+'ms').padStart(9)+'  '+(e.turn!==null&&e.turn!==undefined?('tc='+e.turn).padEnd(6):'      ')
  +'  '+e.label+(e.detail?('  '+e.detail):'')));
