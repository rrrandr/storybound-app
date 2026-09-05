// _v4_corridor.mjs — Corridor/Modern V4 with HARD harness assertions.
// RULE: a turn is proven ONLY by a captured author-class request after submit. Pagination is never evidence.
import { chromium } from 'playwright-core';
import fs from 'fs';
import { execSync } from 'child_process';
const HASH=execSync('shasum -a 256 public/app.js').toString().split(' ')[0];
if(!HASH.startsWith('cffacf48')){console.error('BUILD DRIFT '+HASH);process.exit(3);}
const MISSION='Mara hands Dorian the signed resignation letter in the elevator.';
const log=(...a)=>console.error(...a);
const browser=await chromium.launch({headless:true});
const page=await (await browser.newContext()).newPage();
for(const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(p,r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));
let phase='init', posts=[], authors=[], conso=[];
// author-class = any LARGE prose request; do NOT rely on model label (all grok names route to grok-4.3)
const isAuthor=(sys,usr)=>(sys.length+usr.length)>120000 || /STORYBOUND ARCHITECTURE LAWS/.test(sys);
await page.route('**/api/**', async route=>{
  const r=route.request(); if(r.method()!=='POST') return route.continue();
  let b=null; try{b=JSON.parse(r.postData()||'{}');}catch(_){return route.continue();}
  const msgs=b.messages||[];
  const sys=String((msgs.find(m=>m.role==='system')||{}).content||'');
  const usr=String((msgs.find(m=>m.role==='user')||{}).content||'');
  posts.push({phase,url:r.url().split('/').pop(),bytes:sys.length+usr.length,requested:b.model||null});
  if(isAuthor(sys,usr)){
    const resp=await route.fetch({timeout:0}); let body=''; let resolved=null;
    try{body=await resp.text(); const j=JSON.parse(body); resolved=j.model||j._orchestration?.model||null;}catch(_){}
    let text=''; try{const j=JSON.parse(body); const c=j.choices?.[0]?.message?.content??j.content;
      text=Array.isArray(c)?c.filter(x=>x&&x.type==='text').map(x=>x.text).join(''):String(c||'');}catch(_){}
    authors.push({phase,bytes:sys.length+usr.length,requested:b.model||null,resolved,
      hasAssignment:/SPINE EVENT — MUST STAGE/.test(sys+usr),
      hasFloor:/AUTHOR FLOOR/.test(sys+usr), hasMode:/MODE: CONTEMPORARY ROMANCE/.test(sys+usr),
      mission:/resignation letter/.test(sys+usr), text});
    return route.fulfill({response:resp,body});
  }
  return route.continue();
});
page.on('console',m=>{const t=m.text();
  if(/SCENE-ASSIGNMENT|PLAN-SPINE|\[SKELETON\]|TIER-ROUTE|MODEL:SERVED|advanc/i.test(t)) conso.push(phase+' | '+t.replace(/\s+/g,' ').slice(0,150));});
await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.state&&window._selectSceneAssignment,{timeout:40000});
await page.evaluate(()=>{
  const s=window.state; window._devBypass=true; s.picks=s.picks||{};
  s.picks.world='billionaire'; s.picks.worldSubtype='billionaire_modern'; s.picks.flavor='billionaire_modern';
  s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern';
  s.picks.dynamic='enemies_to_lovers'; s.dynamic='enemies_to_lovers';
  s.archetype={primary:'DARK_VICE',modifier:null}; s.name='Mara'; s.playerName='Mara';
  s.loveInterestName='Dorian'; s.partnerName='Dorian'; s.loveInterest='Male'; s.liGender='male';
  s.playerMask='OPEN_VEIN'; s.storyLength='fling'; s.tier='fling'; s.access='sub'; s.subscribed=true;
  s.fortunes=9999999; s.previewActive=false; s._skipCorridorValidation=true; s.intensity='Steamy';
  s.pov='first_person'; s.identity={playerName:'Mara',partnerName:'Dorian'}; s.picks.identity=s.identity;
  s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.currentEngine='literary';
});
log('[v4] init…');
await page.evaluate(()=>window.handleBeginStory());
for(let w=0;w<700000;w+=3000){await page.waitForTimeout(3000); if(authors.length)break;}
await page.waitForTimeout(6000);
const initAuthors=authors.length;
if(!initAuthors){ console.log('\n❌ HARNESS FAILURE — Scene 1 never authored'); await browser.close(); process.exit(2); }
log('[v4] init proven ('+initAuthors+' author calls). firing continuation…');
phase='turn';
const pre=await page.evaluate(()=>({tc:window.state.turnCount,pages:(window.StoryPagination.getPages()||[]).length}));
const clicked=await page.evaluate((m)=>{
  const s=window.state; s._sceneMissionCurrent=m;
  s._cliffhangerContinueAuthorized=true; s._isAdvancingScene=false;
  s._petitionEmergenceFired=true; s._deckExamineFired=true;
  const ai=document.getElementById('actionInput'), btn=document.getElementById('submitBtn');
  if(!ai||!btn) return {ok:false,why:'inputs missing'};
  ai.value='I hand him the letter.';
  const di=document.getElementById('dialogueInput'); if(di) di.value='';
  const wasDisabled=btn.disabled; btn.disabled=false; btn.click();
  return {ok:true,wasDisabled,visible:!!btn.offsetParent};
},MISSION);
log('[v4] click: '+JSON.stringify(clicked));
for(let w=0;w<700000;w+=3000){await page.waitForTimeout(3000); if(authors.length>initAuthors)break;}
await page.waitForTimeout(4000);
const post=await page.evaluate(()=>({tc:window.state.turnCount,pages:(window.StoryPagination.getPages()||[]).length,
  asg:window.state._sceneAssignment||null, mission:window.state._sceneMissionCurrent||null}));
await browser.close();
const turnAuthors=authors.filter(a=>a.phase==='turn');
console.log('\n════ V4 CORRIDOR ════');
console.log('  click: '+JSON.stringify(clicked));
console.log('  turnCount '+pre.tc+' → '+post.tc+'   pages '+pre.pages+' → '+post.pages);
console.log('  POSTs during turn phase: '+posts.filter(p=>p.phase==='turn').length);
posts.filter(p=>p.phase==='turn').slice(0,6).forEach(p=>console.log('    · '+p.url+'  '+p.bytes+'B  requested='+p.requested));
if(!turnAuthors.length){
  console.log('\n  ❌ HARNESS FAILURE — TURN DID NOT RUN (no author-class request after submit).');
  console.log('     Pagination NOT inspected as prose evidence.');
  console.log('  console:'); conso.filter(c=>c.startsWith('turn')).slice(0,8).forEach(c=>console.log('    '+c));
  fs.writeFileSync('_validate_out/v4_corridor.json',JSON.stringify({harnessFailure:true,posts,conso,pre,post},null,2));
  process.exit(2);
}
const a=turnAuthors[0];
console.log('\n  ✅ TURN PROVEN — author-class request captured');
console.log('  payload '+a.bytes+'B   requested='+a.requested+'  resolved='+a.resolved);
console.log('  assignment (state): '+JSON.stringify(post.asg));
console.log('  SPINE EVENT block in payload : '+a.hasAssignment);
console.log('  mission text in payload      : '+a.mission);
console.log('  AUTHOR FLOOR                 : '+a.hasFloor);
console.log('  MODE: CONTEMPORARY ROMANCE   : '+a.hasMode);
console.log('\n  raw prose ('+a.text.length+' chars):\n'+a.text.slice(0,1400));
fs.writeFileSync('_validate_out/v4_corridor.json',JSON.stringify({harnessFailure:false,authors:turnAuthors,post,conso},null,2));
