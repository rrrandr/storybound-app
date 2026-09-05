// _delivery_audit.mjs — proves the B/C/D architecture reaches the REAL assembled author payload.
// EVERY author-class call is intercepted and stubbed → no Grok prose generated. Cheap pre-passes still run.
import { chromium } from 'playwright-core';
import fs from 'fs';
const log=(...a)=>console.error(...a);
const CASE=(process.env.CASE||'fatelands-cont');
const prior=JSON.parse(fs.readFileSync('/tmp/arm_gen.json','utf8')).scenes;

const browser=await chromium.launch({headless:true});
const page=await (await browser.newContext()).newPage();
for (const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(p, r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));
let payloads=[], census=[], phase='init';
// AUTHOR SIGNATURE: only the prose author carries these. Everything else is a pre-pass and runs for real
// (gpt-4o-mini, cents). The author is captured and STUBBED so no Grok prose is ever generated.
// The PROSE AUTHOR is the only call routed to grok-4.3 and the only one carrying the ARCHITECTURE LAWS
// preamble. Planners (grok-4-1-fast / gpt-4o-mini) must NOT match or the chain breaks upstream of the author.
const isAuthor=(sys,usr,model)=>/STORYBOUND ARCHITECTURE LAWS/.test(sys)||/grok-4\.3/.test(String(model||''));
await page.route('**/api/**', async route=>{
  const r=route.request(); if(r.method()!=='POST') return route.continue();
  let b=null; try{b=JSON.parse(r.postData()||'{}');}catch(_){return route.continue();}
  const msgs=b.messages||[];
  const sys=String((msgs.find(m=>m.role==='system')||{}).content||'');
  const usr=String((msgs.find(m=>m.role==='user')||{}).content||'');
  const tot=sys.length+usr.length;
  if (tot>15000) census.push({phase,tot,sys:sys.length,usr:usr.length,author:isAuthor(sys,usr,b.model||b.preferredModel),
    model:b.model||b.preferredModel||null, head:sys.slice(0,90).replace(/\s+/g,' ')});
  if (isAuthor(sys,usr,b.model||b.preferredModel)) {   // capture + STUB — never sent upstream, zero Grok spend
    payloads.push({sys,usr,effort:b.reasoningEffort??b.reasoning?.effort??null,model:b.model||b.preferredModel||null,raw:b});
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:'[stubbed]'})});
  }
  return route.continue();
});
page.on('console',m=>{const t=m.text(); if(/SCENE-COST\] by category/.test(t)) log('  '+t.slice(0,120));});

await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.state&&window.StoryPagination&&window.STARTER_STORIES,{timeout:40000});
await page.waitForTimeout(600);

const MODERN = CASE.startsWith('modern');
await page.evaluate((cfg)=>{
  const s=window.state;
  window._auditSceneEmotionalGravity=()=>Promise.resolve(null);
  ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture',
   '_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(f=>{try{window[f]=()=>Promise.resolve(null);}catch(_){}});
  window._devBypass=true; s.picks=s.picks||{};
  window._armA50=(location.search.indexOf('a50')>-1); window._armStaging=(location.search.indexOf('stg')>-1);
  if (cfg.modern){
    s.picks.world='billionaire'; s.picks.worldSubtype='billionaire_modern'; s.picks.flavor='billionaire_modern';
    s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern';
    s.picks.dynamic='enemies_to_lovers'; s.dynamic='enemies_to_lovers';
    s.archetype={primary:'DARK_VICE',modifier:null}; s.loveInterestName='Dorian'; s.name='Mara';
    s.playerName='Mara'; s.partnerName='Dorian';
  } else {
    const def=(window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>s.picks[k]=def[k]);
    s.world=def.world; s.worldSubtype=def.worldSubtype; s.flavor=def.flavor; s.dynamic=def.dynamic;
    s._starterId=def.id; s.is_starter_story=true; s.immutableTitle=def.title;
    s.archetype={primary:def.archetype,modifier:null}; s.loveInterestName='Julian'; s.name='Lirael';
    s.playerName='Lirael'; s.partnerName='Julian';
  }
  s.loveInterest='Male'; s.liGender='male'; s.playerMask='OPEN_VEIN';
  s.storyLength='fling'; s.tier='fling'; s.access='sub'; s.subscribed=true; s.fortunes=9999999;
  s.previewActive=false; s._skipCorridorValidation=true; s.intensity='Steamy'; s.pov='first_person';
  s.identity={playerName:s.playerName,partnerName:s.partnerName}; s.picks.identity=s.identity;
  s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.currentEngine='literary';
},{modern:MODERN});

log('[audit] '+CASE+' — initializing (author stubbed; only cheap pre-passes run)…');
await page.evaluate(()=>window.handleBeginStory());
for(let w=0;w<420000;w+=3000){ await page.waitForTimeout(3000); if(payloads.length) break; }
const scene1 = payloads[0] || null;

let cont=null;
if (!CASE.endsWith('scene1')) {
  payloads=[]; phase='cont';
  await page.evaluate((cfg)=>{
    const s=window.state; const SP=window.StoryPagination; try{SP.clear();}catch(_){}
    SP.addPage('<p>'+cfg.a.replace(/\n+/g,'</p><p>')+'</p>',true);
    SP.addPage('<p>'+cfg.b.replace(/\n+/g,'</p><p>')+'</p>',true);
    s._sceneTextRing=[{text:cfg.a},{text:cfg.b}]; s._priorSceneText=cfg.b;
    s.turnCount=7; s._cliffhangerContinueAuthorized=true;
    s._petitionEmergenceFired=true; s._deckExamineFired=true; s._isAdvancingScene=false;
  },{a:prior[5].text,b:prior[6].text});
  await page.evaluate(()=>{ document.getElementById('actionInput').value='I push past him.';
    document.getElementById('dialogueInput').value=''; const b=document.getElementById('submitBtn'); b.disabled=false; b.click(); });
  for(let w=0;w<420000;w+=3000){ await page.waitForTimeout(3000); if(payloads.length) break; }
  cont = payloads[0]||null;
}
await browser.close();
if(scene1) fs.writeFileSync('/tmp/plctl_'+CASE+'_scene1.txt',scene1.sys+'\n\n=====USER=====\n\n'+scene1.usr);
if(cont)   fs.writeFileSync('/tmp/plctl_'+CASE+'_cont.txt',  cont.sys+'\n\n=====USER=====\n\n'+cont.usr);
fs.writeFileSync('/tmp/census_'+CASE+'.json',JSON.stringify(census,null,2));
console.error('[census] '+census.length+' large calls; author-class: '+census.filter(c=>c.author).length);
census.filter(c=>c.tot>40000).forEach(c=>console.error('   '+c.phase+' tot='+c.tot+' author='+c.author+' m='+c.model+' | '+c.head.slice(0,70)));

const CHECKS={
 'fatelands-cont':[['AUTHOR FLOOR',1],['MODE: ROMANTASY',1],['MODE: CONTEMPORARY',0],
   ['LOAD-BEARING contract for Scene 1',0],['the architecture law wins',0],['exists ONLY as PRESSURE',0],
   ['INVERSION TEST',0],['SUBORDINATION TEST',0],['(A + B) ≥ 75%',0],
   ['LAW 3 — MEMORY-CONTENT PRIORITY',1],['Default: roughly 60% of the reader',1],
   ['A/50 COMMERCIAL MODE',1],['COLD-READER SCENE FLOOR',1],
   ['THE READER SHOULD NEVER HAVE TO EXCAVATE',1],['MYSTERY MAY HIDE THE ANSWER',1],
   ['ASSIGNED EVENT IS ACTION',1],['INTERIORITY DECODES',1],['THE SCENE ENDS SOMEWHERE ELSE',1],['DOMAIN REGISTER (HARD',0]],
 'fatelands-scene1':[['AUTHOR FLOOR',1],['MODE: ROMANTASY',1],['MODE: CONTEMPORARY',0],
   ['by the END OF THE FIRST PARAGRAPH',1],['AND IN WHAT IT DOES TO HER NOW',1],
   ['LOAD-BEARING contract for Scene 1',1],['exists ONLY as PRESSURE',1],['(A + B) ≥ 75%',1],['LAW 3 — MEMORY-CONTENT PRIORITY',1]],
 'modern-cont':[['AUTHOR FLOOR',1],['MODE: CONTEMPORARY ROMANCE',1],['MODE: ROMANTASY',0],
   ['GROUND STRANGE THINGS BY CONSEQUENCE',0],['HOT OPENING',0],['DOMAIN REGISTER (HARD',1],
   ['LOAD-BEARING contract for Scene 1',0],['exists ONLY as PRESSURE',0],['LAW 3 — MEMORY-CONTENT PRIORITY',1]],
};
const base=CASE.replace(/-(cont|scene1)$/,'');
let pass=true;
for (const [nm,tg] of [[base+'-scene1',scene1],[base+'-cont',cont]]) {
  if(!CHECKS[nm]) continue;
  console.log('\n════ DELIVERY AUDIT — '+nm+' ════');
  if(!tg){ console.log('  ❌ no author payload captured'); pass=false; continue; }
  const hay=tg.sys+'\n'+tg.usr;
  console.log('  payload: sys='+tg.sys.length+'  usr='+tg.usr.length+'  model='+tg.model);
  console.log('  reasoning fields in body: '+JSON.stringify(Object.fromEntries(
    Object.entries(tg.raw||{}).filter(([k])=>/reason|effort|think/i.test(k)))) +
    '  | body keys: '+Object.keys(tg.raw||{}).join(','));
  CHECKS[nm].forEach(([k,want])=>{ const got=hay.includes(k)?1:0; if(got!==want)pass=false;
    console.log('   '+(got===want?'✅':'❌')+'  '+(want?'present':'absent ')+'  '+k); });
}
console.log('\n  '+(pass?'✅ DELIVERY VERIFIED':'❌ DELIVERY FAILED'));
process.exitCode=pass?0:2;
