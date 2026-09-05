// C + E + telemetry. Author STUBBED (free). Intercepts the skeleton prompt to prove the assignment
// and current-state constraints arrive BEFORE generation, and that the author gets it with no skeleton.
import { chromium } from 'playwright-core';
import fs from 'fs';
const prior=JSON.parse(fs.readFileSync('/tmp/arm_gen.json','utf8')).scenes;
const GONE='Julian took the relic from the shrine table and walked out through the north gate. He is gone, and the relic is gone with him.';
const browser=await chromium.launch({headless:true});
const page=await (await browser.newContext()).newPage();
for(const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(p,r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));
let authorPayloads=[], skelPrompts=[], logs=[];
const isAuthor=(sys,m)=>/STORYBOUND ARCHITECTURE LAWS/.test(sys)||/grok-4\.3/.test(String(m||''));
await page.route('**/api/**', async route=>{
  const r=route.request(); if(r.method()!=='POST') return route.continue();
  let b=null; try{b=JSON.parse(r.postData()||'{}');}catch(_){return route.continue();}
  const sys=String(((b.messages||[]).find(m=>m.role==='system')||{}).content||'');
  if(!isAuthor(sys,b.model||b.preferredModel)) return route.continue();
  authorPayloads.push(sys+'\n'+String(((b.messages||[]).find(m=>m.role==='user')||{}).content||''));
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:'[stubbed]'})});
});
page.on('console',m=>{const t=m.text(); if(/SCENE-ASSIGNMENT|SPINE-STAGING|\[SKELETON\]|PLAN-SPINE/.test(t)) logs.push(t.replace(/\s+/g,' ').slice(0,165));});
await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.state&&window.STARTER_PLANS&&window._selectSceneAssignment,{timeout:40000});
await page.exposeFunction('__skel',t=>skelPrompts.push(t));
await page.evaluate(({gone})=>{
  const O=window.StoryboundOrchestration, orig=O.callChatGPT.bind(O);
  O.callChatGPT=function(msgs,role,opts){
    const sys=String(((msgs||[]).find(m=>m&&m.role==='system')||{}).content||'');
    if(/You define narrative skeletons/i.test(sys))
      window.__skel(String(((msgs||[]).find(m=>m&&m.role==='user')||{}).content||''));
    return orig(msgs,role,opts);
  };
  const s=window.state, def=(window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
  window._devBypass=true; s.picks=s.picks||{};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>s.picks[k]=def[k]);
  s.world=def.world; s.worldSubtype=def.worldSubtype; s.flavor=def.flavor; s.dynamic=def.dynamic;
  s._starterId=def.id; s.is_starter_story=true; s.immutableTitle=def.title;
  s.archetype={primary:def.archetype,modifier:null}; s.name='Lirael'; s.playerName='Lirael';
  s.loveInterestName='Julian'; s.partnerName='Julian'; s.loveInterest='Male'; s.liGender='male';
  s.playerMask='OPEN_VEIN'; s.storyLength='fling'; s.tier='fling'; s.access='sub'; s.subscribed=true;
  s.fortunes=9999999; s.previewActive=false; s._skipCorridorValidation=true; s.intensity='Steamy';
  s.pov='first_person'; s.identity={playerName:'Lirael',partnerName:'Julian'}; s.picks.identity=s.identity;
  s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.currentEngine='literary';
  // CASE C: hard prior state — Julian已 left with the relic; and a scene-2 assignment naming a place
  window.STARTER_PLANS['starter_first_sacrifice'].scenes=[
    {n:2,goal:'Lirael passes the folded note to her contact at the market stall.',
     setting:'market stall',participants:['Lirael','Carys'],props:['folded note']}];
  s._departedCharacters=['Julian']; s._priorSceneText=gone;
},{gone:GONE});
await page.evaluate(()=>window.handleBeginStory());
for(let w=0;w<420000;w+=3000){await page.waitForTimeout(3000); if(authorPayloads.length)break;}
await page.waitForTimeout(3000);
authorPayloads=[];
await page.evaluate((gone)=>{const s=window.state,SP=window.StoryPagination;
  try{SP.clear();}catch(_){} SP.addPage('<p>'+gone+'</p>',true);
  s._sceneTextRing=[{text:gone}]; s._priorSceneText=gone; s.turnCount=0;
  s._departedCharacters=['Julian']; s._cliffhangerContinueAuthorized=true; s._isAdvancingScene=false;
  s._petitionEmergenceFired=true; s._deckExamineFired=true;},GONE);
await page.evaluate(()=>{document.getElementById('actionInput').value='I go to the market stall to pass the note.';
  document.getElementById('dialogueInput').value='';const b=document.getElementById('submitBtn');b.disabled=false;b.click();});
for(let w=0;w<420000;w+=3000){await page.waitForTimeout(3000); if(authorPayloads.length)break;}
await page.waitForTimeout(3000);
// SECOND continuation — the ordering trace showed the skeleton generates here, not on the first
if(!skelPrompts.length){
  authorPayloads=[];
  await page.evaluate((gone)=>{const s=window.state;
    s._priorSceneText=gone; s._departedCharacters=['Julian'];
    s._cliffhangerContinueAuthorized=true; s._isAdvancingScene=false;
    window.STARTER_PLANS['starter_first_sacrifice'].scenes=[
      {n:(s.turnCount||0)+2,goal:'Lirael passes the folded note to her contact at the market stall.',
       setting:'market stall',participants:['Lirael','Carys'],props:['folded note']}];},GONE);
  await page.evaluate(()=>{document.getElementById('actionInput').value='I go to the market stall to pass the note.';
    document.getElementById('dialogueInput').value='';const b=document.getElementById('submitBtn');b.disabled=false;b.click();});
  for(let w=0;w<420000;w+=3000){await page.waitForTimeout(3000); if(authorPayloads.length&&skelPrompts.length)break;}
  await page.waitForTimeout(3000);
}
const st=await page.evaluate(()=>({asg:window.state._sceneAssignment||null,
  anchor:(window.state.sceneSkeleton||{}).environment_anchor||null}));
await browser.close();
const A=authorPayloads.join('\n'), K=skelPrompts.join('\n');
const ok=(c,m)=>console.log('  '+(c?'✅':'❌')+'  '+m);
console.log('\n════ LIVE ACCEPTANCE — C (prior state) + E (author delivery) ════');
console.log('  assignment: '+JSON.stringify(st.asg));
console.log('  environment_anchor: '+JSON.stringify(st.anchor));
console.log('  skeleton prompts captured: '+skelPrompts.length+'   author payloads: '+authorPayloads.length);
console.log('— E: author always gets the assignment —');
ok(/SPINE EVENT — MUST STAGE/.test(A),'author payload carries the event block');
ok(/market stall/.test(A),'author payload names the assigned setting');
ok(/STAGING \(supplied by the scene assignment/.test(A),'structured staging line delivered');
if(skelPrompts.length){
  console.log('— C: skeleton received assignment + current state —');
  ok(/ASSIGNED EVENT/.test(K),'skeleton prompt contains ASSIGNED EVENT');
  ok(/REQUIRED SETTING.*market stall/s.test(K),'skeleton told the required setting');
  ok(/MUST BE PRESENT.*Carys/s.test(K),'skeleton told required participants');
  ok(/ALREADY ABSENT.*Julian/s.test(K),'skeleton told Julian is ALREADY ABSENT');
  ok(st.anchor&&/market stall/.test(st.anchor),'environment_anchor == assigned setting  (got '+JSON.stringify(st.anchor)+')');
} else console.log('  (no skeleton generated this turn — case E path; C needs a turn that generates one)');
console.log('\n  telemetry:'); logs.slice(-8).forEach(l=>console.log('    · '+l));
