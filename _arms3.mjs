// 3-arm subtraction discriminator: A control | B pathology-subtraction | C subtraction+exemplars.
// ONE matched assignment, identical seed/state/cast. Post-stack never runs: the page is closed as soon
// as the author response is captured, so this is RAW AUTHOR vs RAW AUTHOR and downstream costs nothing.
import { chromium } from 'playwright-core';
import fs from 'fs'; import crypto from 'crypto';
const ARMS=[{id:'A',sub:false,ex:false},{id:'B',sub:true,ex:false},{id:'C',sub:true,ex:true}];
const prior=JSON.parse(fs.readFileSync('/tmp/arm_gen.json','utf8')).scenes;
const ACTION='I go to the market stall to pass the note.';
const out=[]; let spend=0; const log=(...a)=>console.error(...a);
const browser=await chromium.launch({headless:true});
for(const arm of ARMS){
 try {
  const page=await (await browser.newContext()).newPage();
  for(const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(p,r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));
  let raw=null, phase='init';
  await page.route('**/api/**', async route=>{
    const r=route.request(); if(r.method()!=='POST') return route.continue();
    let b=null; try{b=JSON.parse(r.postData()||'{}');}catch(_){return route.continue();}
    const sys=String(((b.messages||[]).find(m=>m.role==='system')||{}).content||'');
    const usr=String(((b.messages||[]).find(m=>m.role==='user')||{}).content||'');
    const isAuthor=/STORYBOUND ARCHITECTURE LAWS/.test(sys)||sys.length+usr.length>120000;
    if(!(isAuthor && phase==='turn')) return route.continue();
    const resp=await route.fetch({timeout:0}); const body=await resp.text();
    try{const j=JSON.parse(body); const c=j.choices?.[0]?.message?.content??j.content;
      raw=Array.isArray(c)?c.filter(x=>x&&x.type==='text').map(x=>x.text).join(''):String(c||'');
      const rec={arm:arm.id, sub:arm.sub, ex:arm.ex, promptChars:sys.length+usr.length, text:raw};
      out.push(rec);
      try { fs.mkdirSync('_validate_out/arms3', {recursive:true});
        fs.writeFileSync('_validate_out/arms3/arm_'+arm.id+'_'+Date.now()+'.json', JSON.stringify(rec,null,2));
      } catch(_){} }catch(_){}
    return route.fulfill({response:resp,body});
  });
  page.on('console',m=>{const t=m.text(); const mm=t.match(/Finalized: \$([0-9.]+)/); if(mm) spend+=parseFloat(mm[1]);});
  let loaded=false;
  for(let attempt=1; attempt<=3 && !loaded; attempt++){
    try { await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
          await page.waitForFunction(()=>window.state&&window.StoryPagination,{timeout:90000});
          loaded=true; }
    catch(e){ log('   load attempt '+attempt+' failed: '+String(e.message).slice(0,50)); }
  }
  if(!loaded){ log('   arm '+arm.id+' SKIPPED — page never loaded'); await page.close(); continue; }
  await page.evaluate(c=>{
    const s=window.state, def=(window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
    window._devBypass=true; s.picks=s.picks||{};
    window._armSubtract=c.sub; window._armExemplars=c.ex; window._armA50=false; window._armStaging=false;              // THE ONLY VARIABLE
    ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>s.picks[k]=def[k]);
    s.world=def.world; s.worldSubtype=def.worldSubtype; s.flavor=def.flavor; s.dynamic=def.dynamic;
    s._starterId=def.id; s.is_starter_story=true; s.immutableTitle=def.title;
    s.archetype={primary:def.archetype,modifier:null}; s.name='Lirael'; s.playerName='Lirael';
    s.loveInterestName='Julian'; s.partnerName='Julian'; s.loveInterest='Male'; s.liGender='male';
    s.playerMask='OPEN_VEIN'; s.storyLength='fling'; s.tier='fling'; s.access='sub'; s.subscribed=true;
    s.fortunes=9999999; s.previewActive=false; s._skipCorridorValidation=true; s.intensity='Steamy';
    s.pov='first_person'; s.identity={playerName:'Lirael',partnerName:'Julian'}; s.picks.identity=s.identity;
    s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.currentEngine='literary';
    s.speculativeNextScene=null;
    if(typeof window.scheduleSpeculativePreload==='function') window.scheduleSpeculativePreload=function(){};
  },arm);
  log('[arm '+arm.id+'] sub='+arm.sub+' ex='+arm.ex+' — init…');
  await page.evaluate(()=>window.handleBeginStory());
  for(let w=0;w<700000;w+=3000){await page.waitForTimeout(3000);
    if(await page.evaluate(()=>((window.StoryPagination.getPages()||[]).join('').length>1200)))break;}
  await page.waitForTimeout(3000);
  phase='turn';
  await page.evaluate(c=>{const s=window.state,SP=window.StoryPagination;
    try{SP.clear();}catch(_){} SP.addPage('<p>'+c.a+'</p>',true);
    s._sceneTextRing=[{text:c.a}]; s._priorSceneText=c.a; s.turnCount=0;
    s._cliffhangerContinueAuthorized=true;s._isAdvancingScene=false;
    s._petitionEmergenceFired=true;s._deckExamineFired=true;
    window.STARTER_PLANS['starter_first_sacrifice'].scenes=[{n:2,
      goal:'Lirael passes the folded note to her contact at the market stall.',
      setting:'market stall',participants:['Lirael','Carys'],props:['folded note']}];},{a:prior[1].text});
  await page.evaluate(a=>{document.getElementById('actionInput').value=a;
    document.getElementById('dialogueInput').value='';const b=document.getElementById('submitBtn');
    b.disabled=false;b.click();},ACTION);
  for(let w=0;w<700000;w+=3000){await page.waitForTimeout(3000); if(raw)break;}
  await page.close();                       // close AS SOON AS raw is captured — post-stack never runs
  log('   captured '+(raw?raw.length:'MISSED')+' chars   spend=$'+spend.toFixed(3));
 } catch(e){ log('   arm '+arm.id+' ERRORED: '+String(e.message).slice(0,70)+' — continuing'); }
}
await browser.close();
fs.writeFileSync('_validate_out/ARMS3_SEALED.json',JSON.stringify({out,spend},null,2));
// blind pack: shuffle arm order, opaque labels
const shuffled=out.map(o=>({...o,r:crypto.randomBytes(4).readUInt32BE(0)})).sort((a,b)=>a.r-b.r);
const pack=shuffled.map((o,i)=>({variant:'V'+(i+1), text:o.text}));
const key=shuffled.map((o,i)=>({variant:'V'+(i+1), arm:o.arm, sub:o.sub, ex:o.ex}));
fs.writeFileSync('_validate_out/ARMS3_PACK.json',JSON.stringify(pack,null,2));
fs.writeFileSync('_validate_out/ARMS3_KEY_SEALED.json',JSON.stringify(key,null,2));
console.log('\n════ 3-ARM SUBTRACTION DISCRIMINATOR ════');
out.forEach(o=>console.log('  arm '+o.arm+'  sub='+o.sub+' ex='+o.ex+'  prompt='+o.promptChars+'  prose='+o.text.length));
console.log('  total spend: $'+spend.toFixed(3));
console.log('  blind pack → _validate_out/ARMS3_PACK.json  (key sealed)');
