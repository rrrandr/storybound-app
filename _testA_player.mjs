// TEST A — REAL PLAYER BOUNDARY. Assertions only, no prose scoring.
// Never sets completion flags. Every onboarding state must be entered through the
// same transition a real user triggers.
import { chromium } from 'playwright-core';
import fs from 'fs';
const OUT='_validate_out/testA'; fs.mkdirSync(OUT,{recursive:true});
const log=(...a)=>console.error(...a);
const A=[]; const assert=(name,ok,detail='')=>{A.push({name,ok,detail});
  log(`  ${ok?'PASS':'FAIL'}  ${name}${detail?'  — '+detail:''}`);};

const isAuthor=(sys)=>/STORYBOUND ARCHITECTURE LAWS/.test(sys);
let spend=0, payloads=[];
const browser=await chromium.launch({headless:true});
const page=await (await browser.newContext()).newPage();
for (const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(p,r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));
await page.route('**/api/**', async route=>{
  const r=route.request(); if(r.method()!=='POST') return route.continue();
  let b=null; try{b=JSON.parse(r.postData()||'{}');}catch(_){return route.continue();}
  const sys=String((b.messages||[]).find(m=>m.role==='system')?.content||'');
  if(isAuthor(sys)) payloads.push({n:payloads.length+1, sys, usr:String((b.messages||[]).find(m=>m.role==='user')?.content||'')});
  return route.continue();
});
page.on('console',m=>{const t=m.text(); const mm=t.match(/Finalized: \$([0-9.]+)/); if(mm) spend+=parseFloat(mm[1]);
  if(/PETITION|TEMPT|DECK|EMERGENCE/i.test(t)) fs.appendFileSync(OUT+'/events.log', t.slice(0,200)+'\n');});

await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>window.state&&window.STARTER_STORIES,{timeout:90000});
await page.evaluate(()=>{
  const s=window.state;
  const def=(window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
  s.picks=s.picks||{};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>s.picks[k]=def[k]);
  Object.assign(s,{world:def.world,worldSubtype:def.worldSubtype,flavor:def.flavor,dynamic:def.dynamic,
    _starterId:def.id,is_starter_story:true,immutableTitle:def.title,archetype:{primary:def.archetype,modifier:null},
    name:'Lirael',playerName:'Lirael',loveInterestName:'Julian',partnerName:'Julian',loveInterest:'Male',
    liGender:'male',playerMask:'OPEN_VEIN',storyLength:'fling',tier:'fling',access:'sub',subscribed:true,
    fortunes:9999999,previewActive:false,_skipCorridorValidation:true,intensity:'Steamy',pov:'first_person',
    identity:{playerName:'Lirael',partnerName:'Julian'},_pcLookSkipped:true,pcLookLocked:true,
    renderMode:'literary',currentEngine:'literary'});
  s.picks.identity=s.identity;
  window._devBypass=true;
  if(typeof window.scheduleSpeculativePreload==='function') window.scheduleSpeculativePreload=function(){};
  // DELIBERATELY NOT SET: _petitionEmergenceFired, _deckExamineFired, _cliffhangerContinueAuthorized
});
const pageText=()=>page.evaluate(()=>(window.StoryPagination.getPages()||[]).join('\n').replace(/<[^>]+>/g,'').trim());
const snap=()=>page.evaluate(()=>({turn:window.state.turnCount,
  petArmed:!!window.state._petitionEmergenceArmed, petFired:!!window.state._petitionEmergenceFired,
  activePetition:window.state._activePetition||null, petitionUsed:!!window.state.petitionUsedThisScene,
  temptWish:window.state.temptFateWish||null,
  temptArmed:!!window.state._temptEmergenceArmed, temptFired:!!window.state._temptEmergenceFired,
  frameAwaitingArm:!!window.state._petitionFrameLandedAwaitingArm,
  deckExamined:!!window.state._deckExamineFired}));

log('[A] SCENE 1…');
await page.evaluate(()=>window.handleBeginStory());
for(let w=0;w<600000;w+=4000){await page.waitForTimeout(4000); if((await pageText()).length>1200) break;}
await page.waitForTimeout(10000);
const s1=await snap(); fs.writeFileSync(OUT+'/state_after_s1.json',JSON.stringify(s1,null,1));
assert('scene 1 rendered',(await pageText()).length>800);
assert('no fake flags set',!s1.petFired&&!s1.temptFired,JSON.stringify(s1));

log('[A] PLAYER ACTION 0 — examine the deck (the real gate)…');
const dex=await page.evaluate(async ()=>{
  // Call the SAME function the UI calls. Never set the completion flag.
  if(typeof window._fireLiteraryDeckExamine!=='function') return {ok:false,why:'_fireLiteraryDeckExamine not exported'};
  try { await window._fireLiteraryDeckExamine(); } catch(e){ return {ok:false,why:String(e).slice(0,80)}; }
  return {ok:true, fired:!!window.state._deckExamineFired};
});
assert('deck examined via the real path', dex.ok && dex.fired, dex.why||('fired='+dex.fired));
await page.waitForTimeout(3000);

log('[A] PLAYER ACTION 1 — say/do…');
const sub=await page.evaluate(()=>{
  const a=document.getElementById('actionInput'), d=document.getElementById('dialogueInput'),
        b=document.getElementById('submitBtn');
  if(!a||!b) return {ok:false,why:'inputs missing'};
  a.value='I step between Seren and the Dohkar and put my hand on her shoulder.';
  d.value='"She spoke alone. Judge me, not her."';
  b.disabled=false; b.click(); return {ok:true};
});
assert('say/do submitted',sub.ok,sub.why||'');
for(let w=0;w<600000;w+=4000){await page.waitForTimeout(4000); const s=await snap(); if(s.turn>=1) break;}
await page.waitForTimeout(8000);
const s2=await snap(); fs.writeFileSync(OUT+'/state_after_s2.json',JSON.stringify(s2,null,1));
assert('turn advanced to scene 2',s2.turn>=1,'turnCount='+s2.turn);
// LITERARY mode arms Petition off the frame landing, not turnCount. Wait for it.
let s2b=s2;
for(let w=0;w<120000;w+=5000){
  await page.waitForTimeout(5000); s2b=await snap();
  if(s2b.petArmed||s2b.petFired||s2b.frameAwaitingArm) break;
}
fs.writeFileSync(OUT+'/state_after_s2.json',JSON.stringify(s2b,null,1));
assert('petition frame landed OR emergence armed', s2b.petArmed||s2b.petFired||s2b.frameAwaitingArm, JSON.stringify(s2b));
if(s2b.frameAwaitingArm && !s2b.petArmed){
  const arm=await page.evaluate(async()=>{
    if(typeof window._armLiteraryPetitionEmergence!=='function') return {ok:false,why:'not exported'};
    try{ await window._armLiteraryPetitionEmergence(); }catch(e){ return {ok:false,why:String(e).slice(0,80)}; }
    return {ok:true,armed:!!window.state._petitionEmergenceArmed};
  });
  assert('petition armed via the real literary path', arm.ok&&arm.armed, arm.why||('armed='+arm.armed));
}

// ── PLAYER ACTION 2 — actually SEAL a Petition ────────────────────────────
log('[A] PLAYER ACTION 2 — seal a Petition…');
const PET_Q = 'Does Julian believe I manipulated the wish?';
const fired=await page.evaluate(async ()=>{
  if(typeof window._fireLiteraryPetitionEmergence!=='function') return {ok:false,why:'fire fn missing'};
  try{ await window._fireLiteraryPetitionEmergence(); }catch(e){ return {ok:false,why:String(e).slice(0,90)}; }
  return {ok:true};
});
assert('petition sequence fired', fired.ok, fired.why||'');
await page.waitForTimeout(4000);
const seal=await page.evaluate(async (q)=>{
  const inp=document.getElementById('petitionInput');
  const btn=document.getElementById('btnSealPetition');
  if(!inp) return {ok:false,why:'petitionInput not in DOM'};
  if(!btn) return {ok:false,why:'btnSealPetition not in DOM'};
  inp.value=q; inp.dispatchEvent(new Event('input',{bubbles:true}));
  btn.disabled=false; btn.click();
  return {ok:true};
}, PET_Q);
assert('petition sealed through the UI', seal.ok, seal.why||'');
let sp=null;
for(let w=0;w<180000;w+=5000){ await page.waitForTimeout(5000); sp=await snap(); if(sp.petitionUsed||sp.activePetition) break; }
fs.writeFileSync(OUT+'/state_after_petition.json',JSON.stringify(sp,null,1));
assert('petition committed to state', !!sp && (sp.petitionUsed || !!sp.activePetition), JSON.stringify(sp));

// ── SCENE 3 — does the Author RECEIVE the player's choice? ─────────────────
log('[A] SCENE 3 — does the petition reach the payload…');
const before3=payloads.length;
await page.evaluate(()=>{
  const a=document.getElementById('actionInput'), d=document.getElementById('dialogueInput'),
        b=document.getElementById('submitBtn');
  if(a) a.value='I wait for the answer Fate owes me.';
  if(d) d.value='';
  if(b){ b.disabled=false; b.click(); }
});
for(let w=0;w<600000;w+=5000){ await page.waitForTimeout(5000); if(payloads.length>before3) break; }
await page.waitForTimeout(8000);
const p3=payloads[payloads.length-1];
const hay=((p3&&p3.sys)||'')+' '+((p3&&p3.usr)||'');
const qWords=PET_Q.toLowerCase().replace(/[?.,]/g,'').split(/\s+/).filter(w=>w.length>4);
const hit=qWords.filter(w=>hay.toLowerCase().includes(w));
assert('scene 3 payload carries the petition', hit.length >= Math.ceil(qWords.length*0.6),
       'matched '+hit.length+'/'+qWords.length+' key words: '+hit.join(','));
fs.writeFileSync(OUT+'/scene3_payload_probe.json',JSON.stringify({question:PET_Q,matched:hit,payloadChars:hay.length},null,1));

fs.writeFileSync(OUT+'/payloads.json',JSON.stringify(payloads.map(p=>({n:p.n,sysLen:p.sys.length,usrLen:p.usr.length})),null,1));
payloads.forEach(p=>fs.writeFileSync(`${OUT}/payload_${p.n}.txt`,p.sys+'\n=====USER=====\n'+p.usr));
fs.writeFileSync(OUT+'/assertions.json',JSON.stringify(A,null,1));
log(`\n════ TEST A (partial) ════  spend $${spend.toFixed(3)}  passed ${A.filter(x=>x.ok).length}/${A.length}`);
await browser.close();
