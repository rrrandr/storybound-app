// Lane-2 minimum snapshot harness. Author stubbed with saved V2 RAW → downstream runs for real.
// Captures RAW + every retained mutation checkpoint + FINAL. No scoring. V2 only (contaminated fixture).
import { chromium } from 'playwright-core';
import fs from 'fs'; import crypto from 'crypto';
const RAW=JSON.parse(fs.readFileSync('_validate_out/assign_sessionA.json','utf8'))
  .results.find(r=>r.id==='V2').authorRaw;
const prior=JSON.parse(fs.readFileSync('/tmp/arm_gen.json','utf8')).scenes;
const h=t=>crypto.createHash('sha256').update(String(t||'')).digest('hex').slice(0,10);
const browser=await chromium.launch({headless:true});
const page=await (await browser.newContext()).newPage();
for(const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(p,r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));
let phase='init';
await page.route('**/api/**', async route=>{
  const r=route.request(); if(r.method()!=='POST') return route.continue();
  let b=null; try{b=JSON.parse(r.postData()||'{}');}catch(_){return route.continue();}
  const sys=String(((b.messages||[]).find(m=>m.role==='system')||{}).content||'');
  const usr=String(((b.messages||[]).find(m=>m.role==='user')||{}).content||'');
  if((/STORYBOUND ARCHITECTURE LAWS/.test(sys)||sys.length+usr.length>120000) && phase==='turn')
    return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({choices:[{message:{content:RAW}}],model:'stubbed'})});
  return route.continue();
});
await page.addInitScript(()=>{ if(String(location.search).indexOf('control')>-1) window.__CONTROL__=true; });
await page.goto('http://localhost:3000/?control',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.state&&window.StoryPagination,{timeout:40000});
await page.evaluate(()=>{
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
});
await page.evaluate(()=>window.handleBeginStory());
for(let w=0;w<700000;w+=3000){await page.waitForTimeout(3000);
  if(await page.evaluate(()=>((window.StoryPagination.getPages()||[]).join('').length>1200)))break;}
await page.waitForTimeout(4000);
phase='turn';
await page.evaluate((c)=>{const s=window.state,SP=window.StoryPagination;
  if(!window.__CONTROL__){ window.__proseSnap=[]; window.__cheapEditTrace=[]; }  // arm unless control run
  try{SP.clear();}catch(_){} SP.addPage('<p>'+c.a+'</p>',true);
  s._sceneTextRing=[{text:c.a}]; s._priorSceneText=c.a; s.turnCount=0;
  s._cliffhangerContinueAuthorized=true;s._isAdvancingScene=false;
  s._petitionEmergenceFired=true;s._deckExamineFired=true;
  window.STARTER_PLANS['starter_first_sacrifice'].scenes=[{n:2,
    goal:'Lirael passes the folded note to her contact at the market stall.',
    setting:'market stall',participants:['Lirael','Carys'],props:['folded note']}];},{a:prior[1].text});
const lastPage=async()=>page.evaluate(()=>{const p=window.StoryPagination.getPages()||[];
  const d=document.createElement('div'); d.innerHTML=p[p.length-1]||''; return (d.textContent||'').trim();});
const before=await lastPage();
await page.evaluate(()=>{document.getElementById('actionInput').value='I go to the market stall to pass the note.';
  document.getElementById('dialogueInput').value='';const b=document.getElementById('submitBtn');b.disabled=false;b.click();});
for(let w=0;w<700000;w+=3000){await page.waitForTimeout(3000);
  const t=await lastPage(); if(t&&t!==before&&t.length>800)break;}
await page.waitForTimeout(5000);
const snaps=await page.evaluate(()=>window.__proseSnap||[]);
// AUTHORITATIVE FINAL = the pipeline's own last committed prose string, not DOM textContent
// (textContent drops block boundaries: "hear. \u201cIf" -> "hear.\u201cIf", same length, different hash).
const FINAL=await page.evaluate(()=>{
  const s=window.state;
  return String((s&&s._lastCommittedProse)||(s&&s._priorSceneText)||'')||null;});
const FINAL_DOM=await lastPage();
await browser.close();
// build the chain: RAW → retained checkpoints → FINAL
const chain=[{id:'RAW',hash:h(RAW),len:RAW.length,text:RAW}];
snaps.filter(s=>s.changed && s.outText).forEach((s,i)=>
  chain.push({id:'C'+(i+1),owner:s.owner,label:s.label,hash:h(s.outText),len:s.outText.length,text:s.outText}));
const _final = FINAL || FINAL_DOM;
chain.push({id:'FINAL',hash:h(_final),len:_final.length,text:_final,source:FINAL?'pipeline-string':'dom-fallback'});
fs.writeFileSync(process.env.OUT||'_validate_out/lane2_chain.json',JSON.stringify({chain,rawSnaps:snaps,finalSource:FINAL?'pipeline-string':'dom-fallback'},null,2));
console.log('\n════ LANE-2 SNAPSHOT CHAIN (V2, author stubbed) ════');
chain.forEach(c=>console.log('  '+c.id.padEnd(6)+' '+c.hash+'  '+String(c.len).padStart(5)+' chars'
  +(c.owner?('   ← '+c.owner+(c.label?(' ['+c.label+']'):'')):'')));
console.log('\n  total snapshot events: '+snaps.length
  +'  (retained/changed: '+snaps.filter(s=>s.changed&&s.outText).length
  +', rejected: '+snaps.filter(s=>s.rejected).length
  +', no-change: '+snaps.filter(s=>!s.changed&&!s.rejected).length+')');
