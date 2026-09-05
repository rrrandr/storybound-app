// _spine_preflight.mjs — FREE. Proves the corpus topology end-to-end and asserts harness validity.
// Author is STUBBED (no Grok/Mistral prose). Enters exactly as _render_arm.js does: _usePlanSpine + STARTER_PLANS.
// SPINE=on|off  → on = corpus topology, off = production topology (flag never set in the product)
import { chromium } from 'playwright-core';
import fs from 'fs';
const SPINE=(process.env.SPINE||'on')==='on';
const browser=await chromium.launch({headless:true});
const page=await (await browser.newContext()).newPage();
for(const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(p,r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));
let payload=null;
const isAuthor=(sys,m)=>/STORYBOUND ARCHITECTURE LAWS/.test(sys)||/grok-4\.3/.test(String(m||''));
await page.route('**/api/**', async route=>{
  const r=route.request(); if(r.method()!=='POST') return route.continue();
  let b=null; try{b=JSON.parse(r.postData()||'{}');}catch(_){return route.continue();}
  const sys=String(((b.messages||[]).find(m=>m.role==='system')||{}).content||'');
  if(!isAuthor(sys,b.model||b.preferredModel)) return route.continue();
  payload={sys,usr:String(((b.messages||[]).find(m=>m.role==='user')||{}).content||'')};
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:'[stubbed]'})});
});
const spineLogs=[];
const t0=Date.now();
page.on('console',m=>{const t=m.text();
  if(/PLAN-SPINE|SPINE-STAGING|\[SKELETON\]|SCENE MISSION/i.test(t))
    spineLogs.push('+'+String(Date.now()-t0).padStart(6)+'ms  '+t.replace(/\s+/g,' ').slice(0,150));});
await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.state&&window.StoryPagination&&window.STARTER_PLANS,{timeout:40000});
await page.waitForTimeout(600);
await page.evaluate((useSpine)=>{
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
  if(useSpine) window._usePlanSpine=true;              // exactly what _render_arm.js:172 does
},SPINE);
const plan=await page.evaluate(()=>{const p=window.STARTER_PLANS&&window.STARTER_PLANS['starter_first_sacrifice'];
  return p&&p.scenes?{n:p.scenes.length,scene2:(p.scenes.find(x=>x.n===2)||{}).goal||null}:null;});
await page.evaluate(()=>window.handleBeginStory());
for(let w=0;w<420000;w+=3000){await page.waitForTimeout(3000);
  if(await page.evaluate(()=>((window.StoryPagination.getPages()||[]).join('').length>1200)))break;}
await page.waitForTimeout(3000);
payload=null;
await page.evaluate(()=>{const s=window.state;s.turnCount=0;s._cliffhangerContinueAuthorized=true;s._isAdvancingScene=false;
  s._petitionEmergenceFired=true;s._deckExamineFired=true;});
await page.evaluate(()=>{document.getElementById('actionInput').value='I go to the market stall to pass the note.';
  document.getElementById('dialogueInput').value='';const b=document.getElementById('submitBtn');b.disabled=false;b.click();});
for(let w=0;w<420000;w+=3000){await page.waitForTimeout(3000); if(payload)break;}
const st=await page.evaluate(()=>{const s=window.state;return{
  verbatim:s._spineEventVerbatim||null, staging:s._spineStaging||null,
  anchor:(s.sceneSkeleton||{}).environment_anchor||null, flag:window._usePlanSpine===true};});
await browser.close();
const hay=payload?payload.sys+payload.usr:'';
console.log('\n════ SPINE PREFLIGHT — topology: '+(SPINE?'CORPUS (_usePlanSpine=true)':'PRODUCTION (flag unset)')+' ════');
console.log('  STARTER_PLANS scenes      : '+(plan?plan.n:'(none)'));
console.log('  plan scene 2 goal         : '+(plan?String(plan.scene2).slice(0,90):'—'));
console.log('  window._usePlanSpine      : '+st.flag);
console.log('  _spineEventVerbatim       : '+(st.verbatim?JSON.stringify(String(st.verbatim).slice(0,80)):'(empty)'));
console.log('  _spineStaging             : '+(st.staging?JSON.stringify(st.staging).slice(0,110):'null'));
console.log('  environment_anchor        : '+JSON.stringify(st.anchor));
console.log('  SPINE EVENT in payload    : '+/SPINE EVENT — MUST STAGE/.test(hay));
console.log('\n  spine/skeleton console lines:');
spineLogs.forEach(l=>console.log('    · '+l));
const incoherent = !!st.verbatim && !st.staging;
console.log('\n  PREFLIGHT: '+(incoherent?'❌ INCOHERENT (verbatim without staging)':'✅ coherent pair'));
