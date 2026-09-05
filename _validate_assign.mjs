// _validate_assign.mjs — PAID continuation validation on POST_SCENE_ASSIGNMENT.
//   SESSION=A (Fatelands): init → V2 (explicit staging) → V3 (hard prior state) → V5 (no-skeleton)
//   SESSION=B (Modern):    init → V4 (Corridor scene_mission source)
import { chromium } from 'playwright-core';
import fs from 'fs';
import { execSync } from 'child_process';
const SESSION=process.env.SESSION||'A', OUT='_validate_out';
const HASH=execSync('shasum -a 256 public/app.js').toString().split(' ')[0];
if(!HASH.startsWith('cffacf48')){console.error('BUILD DRIFT '+HASH);process.exit(3);}
const prior=JSON.parse(fs.readFileSync('/tmp/arm_gen.json','utf8')).scenes;
const GONE='Julian took the relic from the shrine table and walked out through the north gate. He did not look back. He is gone, and the relic is gone with him.';
const log=(...a)=>console.error(...a);
const browser=await chromium.launch({headless:true});
const page=await (await browser.newContext()).newPage();
for(const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(p,r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));
let phase='init', authorPayloads=[], authorRaw=[], skelIn=[], skelOut=[], conso=[];
const isAuthor=(sys,m)=>/STORYBOUND ARCHITECTURE LAWS/.test(sys)||/grok-4\.3/.test(String(m||''));
await page.route('**/api/**', async route=>{
  const r=route.request(); if(r.method()!=='POST') return route.continue();
  let b=null; try{b=JSON.parse(r.postData()||'{}');}catch(_){return route.continue();}
  const sys=String(((b.messages||[]).find(m=>m.role==='system')||{}).content||'');
  const usr=String(((b.messages||[]).find(m=>m.role==='user')||{}).content||'');
  if(!isAuthor(sys,b.model||b.preferredModel)) return route.continue();
  authorPayloads.push({phase,sys,usr,model:b.model});
  const resp=await route.fetch({timeout:0}); let body=''; try{body=await resp.text();}catch(_){}
  let t=''; try{const j=JSON.parse(body); const c=j.choices?.[0]?.message?.content??j.content;
    t=Array.isArray(c)?c.filter(x=>x&&x.type==='text').map(x=>x.text).join(''):String(c||'');}catch(_){}
  authorRaw.push({phase,model:b.model,text:t});
  return route.fulfill({response:resp,body});
});
page.on('console',m=>{const t=m.text();
  if(/SCENE-ASSIGNMENT|SPINE-STAGING|\[SKELETON\]|REPAIR|RE-?AUTHOR|TENSION|VERIFIER|SCENE-COST\] Finalized/i.test(t))
    conso.push(phase+' | '+t.replace(/\s+/g,' ').slice(0,175));});
await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.state&&window._selectSceneAssignment&&window.STARTER_PLANS,{timeout:40000});
await page.exposeFunction('__si',t=>skelIn.push({phase,t}));
await page.exposeFunction('__so',t=>skelOut.push({phase,t}));
const MODERN=SESSION==='B';
await page.evaluate((cfg)=>{
  const O=window.StoryboundOrchestration, orig=O.callChatGPT.bind(O);
  O.callChatGPT=async function(msgs,role,opts){
    const sys=String(((msgs||[]).find(m=>m&&m.role==='system')||{}).content||'');
    const isSk=/You define narrative skeletons/i.test(sys);
    if(isSk) window.__si(String(((msgs||[]).find(m=>m&&m.role==='user')||{}).content||''));
    const r=await orig(msgs,role,opts); if(isSk) window.__so(String(r).slice(0,900)); return r;
  };
  const s=window.state; window._devBypass=true; s.picks=s.picks||{};
  if(cfg.modern){
    s.picks.world='billionaire'; s.picks.worldSubtype='billionaire_modern'; s.picks.flavor='billionaire_modern';
    s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern';
    s.picks.dynamic='enemies_to_lovers'; s.dynamic='enemies_to_lovers';
    s.archetype={primary:'DARK_VICE',modifier:null}; s.name='Mara'; s.playerName='Mara';
    s.loveInterestName='Dorian'; s.partnerName='Dorian';
  } else {
    const def=(window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>s.picks[k]=def[k]);
    s.world=def.world; s.worldSubtype=def.worldSubtype; s.flavor=def.flavor; s.dynamic=def.dynamic;
    s._starterId=def.id; s.is_starter_story=true; s.immutableTitle=def.title;
    s.archetype={primary:def.archetype,modifier:null}; s.name='Lirael'; s.playerName='Lirael';
    s.loveInterestName='Julian'; s.partnerName='Julian';
  }
  s.loveInterest='Male'; s.liGender='male'; s.playerMask='OPEN_VEIN'; s.storyLength='fling'; s.tier='fling';
  s.access='sub'; s.subscribed=true; s.fortunes=9999999; s.previewActive=false; s._skipCorridorValidation=true;
  s.intensity='Steamy'; s.pov='first_person'; s.identity={playerName:s.playerName,partnerName:s.partnerName};
  s.picks.identity=s.identity; s._pcLookSkipped=true; s.pcLookLocked=true;
  s.renderMode='literary'; s.currentEngine='literary';
},{modern:MODERN});
const lastPage=async()=>page.evaluate(()=>{const p=window.StoryPagination.getPages()||[];
  const d=document.createElement('div'); d.innerHTML=p[p.length-1]||''; return (d.textContent||'').trim();});
log('[gen] '+SESSION+' init…');
await page.evaluate(()=>window.handleBeginStory());
for(let w=0;w<700000;w+=3000){await page.waitForTimeout(3000);
  if(await page.evaluate(()=>((window.StoryPagination.getPages()||[]).join('').length>1200)))break;}
await page.waitForTimeout(4000);
const results=[];
async function runCase(id,setup,action){
  phase=id; authorPayloads=[]; authorRaw=[]; skelIn=[]; skelOut=[];
  await page.evaluate(setup.fn,setup.arg);
  const asgBefore=await page.evaluate(()=>window.state._sceneAssignment||null);
  const before=await lastPage();
  log('[gen] '+id+'…');
  await page.evaluate(a=>{document.getElementById('actionInput').value=a;
    document.getElementById('dialogueInput').value='';const b=document.getElementById('submitBtn');b.disabled=false;b.click();},action);
  for(let w=0;w<700000;w+=3000){await page.waitForTimeout(3000);
    const t=await lastPage(); if(t&&t!==before&&t.length>1000)break;}
  await page.waitForTimeout(4000);
  const st=await page.evaluate(()=>({asg:window.state._sceneAssignment||null,
    sceneNum:window._currentSceneNumber(window.state),
    anchor:(window.state.sceneSkeleton||{}).environment_anchor||null,
    staged:(window.state.sceneSkeleton||{}).staged_characters||null}));
  const pl=authorPayloads[authorPayloads.length-1]||null;
  const hay=pl?pl.sys+pl.usr:'';
  const em=hay.match(/SPINE EVENT — MUST STAGE[\s\S]{0,900}?(?=\n\s*(?:SCENE SPINE|ROLLING CONTEXT))/);
  results.push({id, assignmentBefore:asgBefore, assignment:st.asg, sceneNumber:st.sceneNum,
    anchor:st.anchor, staged:st.staged, skeletonGenerated:skelIn.length>0,
    skeletonInput:(skelIn[0]||{}).t||null, skeletonOutput:(skelOut[0]||{}).t||null,
    authorEventBlock:em?em[0]:null, authorModels:authorRaw.map(a=>a.model),
    authorRaw:(authorRaw[0]||{}).text||null, finalProse:await lastPage(),
    console:conso.filter(c=>c.startsWith(id))});
  log('   → skeleton='+(skelIn.length>0)+' anchor='+JSON.stringify(st.anchor));
}
if(SESSION==='A'){
  await runCase('V2',{fn:(c)=>{const s=window.state,SP=window.StoryPagination;
    try{SP.clear();}catch(_){} SP.addPage('<p>'+c.a+'</p>',true);
    s._sceneTextRing=[{text:c.a}]; s._priorSceneText=c.a; s.turnCount=0;
    s._cliffhangerContinueAuthorized=true;s._isAdvancingScene=false;s._petitionEmergenceFired=true;s._deckExamineFired=true;
    window.STARTER_PLANS['starter_first_sacrifice'].scenes=[{n:2,
      goal:'Lirael passes the folded note to her contact at the market stall.',
      setting:'market stall',participants:['Lirael','Carys'],props:['folded note']}];},
    arg:{a:prior[1].text}},'I go to the market stall to pass the note.');
  await runCase('V3',{fn:(c)=>{const s=window.state,SP=window.StoryPagination;
    try{SP.clear();}catch(_){} SP.addPage('<p>'+c.g+'</p>',true);
    s._sceneTextRing=[{text:c.g}]; s._priorSceneText=c.g; s._departedCharacters=['Julian'];
    s._cliffhangerContinueAuthorized=true;s._isAdvancingScene=false;
    window.STARTER_PLANS['starter_first_sacrifice'].scenes=[{n:(s.turnCount||0)+2,
      goal:'Lirael forces the gatekeeper to name the road Julian took with the relic.',
      participants:['Lirael','the gatekeeper']}];},arg:{g:GONE}},
    'I corner the gatekeeper and demand to know which road he took.');
  await runCase('V5',{fn:(c)=>{const s=window.state;
    s._priorSceneText=c.g; s._departedCharacters=['Julian'];
    s._cliffhangerContinueAuthorized=true;s._isAdvancingScene=false;
    s._skeletonMeta=s._skeletonMeta||{}; // keep any cache valid so a fresh skeleton is skipped
    window.STARTER_PLANS['starter_first_sacrifice'].scenes=[{n:(s.turnCount||0)+2,
      goal:'Lirael burns the intercepted letters in the shrine brazier.',
      participants:['Lirael'],props:['the intercepted letters']}];},arg:{g:GONE}},
    'I burn the letters.');
} else {
  await runCase('V4',{fn:()=>{const s=window.state;
    s._starterId=null; s.is_starter_story=false;
    s._sceneMissionCurrent='Mara hands Dorian the signed resignation letter in the elevator.';
    s._cliffhangerContinueAuthorized=true;s._isAdvancingScene=false;},arg:null},
    'I hand him the letter.');
}
await browser.close();
fs.writeFileSync(OUT+'/assign_session'+SESSION+'.json',JSON.stringify({build:HASH,results,console:conso},null,2));
results.forEach(r=>{console.log('\n════ '+r.id+' ════');
  console.log('  scene#='+r.sceneNumber+'  source='+(r.assignment&&r.assignment.source)+'  skeleton='+r.skeletonGenerated);
  console.log('  assignment: '+JSON.stringify(r.assignment));
  console.log('  anchor: '+JSON.stringify(r.anchor)+'  staged: '+JSON.stringify(r.staged));
  console.log('  event block delivered: '+!!r.authorEventBlock+'  models: '+r.authorModels.join(','));
  console.log('  raw '+(r.authorRaw||'').length+' chars → final '+(r.finalProse||'').length+' chars');});
console.log('\n→ '+OUT+'/assign_session'+SESSION+'.json');
