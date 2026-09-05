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
await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
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
  window.__proseSnap=[]; window.__cheapEditTrace=[]; window.__textSnap=[]; window.__rawSnap=[];  // arm buffers
  try { window.state.speculativeNextScene=null;
        if(typeof window.scheduleSpeculativePreload==='function') window.scheduleSpeculativePreload=function(){};
  } catch(_){}
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
const tsnap=await page.evaluate(()=>window.__textSnap||[]);
const rsnap=await page.evaluate(()=>window.__rawSnap||[]);
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
fs.writeFileSync(process.env.OUT||'_validate_out/lane2_chain.json',JSON.stringify({chain,rawSnaps:snaps,textSnap:tsnap},null,2));
// ── CONSERVATION INVARIANT (byte-exact; no normalization) ──
const src = rsnap.length ? rsnap : tsnap;   // continuation path uses __rawSnap
// CHAIN MODEL (corrected): the pipeline is not linear. _authorChatCapture events are ALTERNATIVE
// attempts (retry/fallback) — only the winner enters the chain. `|| raw` fallbacks produce
// before===after no-ops. So: resolve the author boundary first, then reconcile only real links.
const authorEvents=src.filter(t=>/_authorChatCapture|generateOrchestatedTurn/.test(String(t.label||'')));
const winner = authorEvents.length ? authorEvents[authorEvents.length-1] : null;
// AUTHOR_RETURN supersedes the network response as the chain's first link: the delta between them
// is in-author post-processing (quote fixes + Mistral repair + purple-lens), a declared mutation.
const arEvents = src.filter(t=>t.sid==='AUTHOR_RETURN');
const authorReturn = arEvents[arEvents.length-1];
if(arEvents.length===0) console.log('  ❌ HARNESS FAILURE: AUTHOR_RETURN never fired (boundary not exercised)');
else if(arEvents.length>1) console.log('  ❌ HARNESS FAILURE: AUTHOR_RETURN fired '+arEvents.length+'x (control-flow bug)');
else console.log('  AUTHOR_RETURN: exactly 1 event  ('+String(authorReturn.after||'').length+' chars) ✅');
const RAW_AUTHOR = authorReturn ? authorReturn.after : (winner ? winner.after : RAW);
if(authorReturn) console.log('  GROK_RAW '+String(RAW||'').length+' -> AUTHOR_RETURN '+authorReturn.after.length+' chars (in-author cleanup)');
const afterAuthor = authorReturn ? src.slice(src.lastIndexOf(authorReturn)+1) : (winner ? src.slice(src.lastIndexOf(winner)+1) : src);
const muts = afterAuthor.filter(t=>(typeof t.site==='number'||typeof t.sid==='string') && t.changed
  && !/_authorChatCapture|generateOrchestatedTurn/.test(String(t.label||'')));
console.log('  author attempts: '+authorEvents.length+' (winner = last)   post-author links: '+muts.length);
const fp=src.filter(t=>t.site==='FINAL_PROSE').pop();
const dl=src.filter(t=>t.site==='DELIVERED').pop();
const netRaw=RAW;                                   // author output from the stub == known fixture
const first=muts[0]||null;
let firstMismatch=null;
for(let i=0;i<muts.length-1;i++){
  if(muts[i].after!==muts[i+1].before){ firstMismatch={between:[muts[i].sid||muts[i].site,muts[i+1].sid||muts[i+1].site],owner:muts[i+1].label}; break; }
}
const rawOk   = first ? (RAW_AUTHOR===first.before) : (fp? RAW_AUTHOR===fp.after : null);
const lastOk  = (muts.length&&fp) ? (muts[muts.length-1].after===fp.after) : (fp? RAW_AUTHOR===fp.after : null);
const delivOk = (fp&&dl) ? (dl.after.length>0) : null;
console.log('\n════ CONSERVATION INVARIANT (byte-exact) ════');
console.log('  RAW cross-check (author == first.before) : '+(rawOk===true?'PASS':rawOk===false?'FAIL':'n/a'));
console.log('  changed authoritative mutations          : '+muts.length);
console.log('  every transition reconciles              : '+(firstMismatch?'FAIL':'PASS'));
console.log('  last.after == FINAL_PROSE                : '+(lastOk===true?'PASS':lastOk===false?'FAIL':'n/a'));
console.log('  delivery FINAL_PROSE->formatStory->DELIVERED : '+(delivOk===true?'PASS':delivOk===false?'FAIL':'n/a'));
if(firstMismatch) console.log('  FIRST MISMATCH between sites '+firstMismatch.between.join(' -> ')+'  owner='+firstMismatch.owner);
const observed = src.length>0, hasFP = !!fp;
const allPass = observed && hasFP && arEvents.length===1 && rawOk===true && !firstMismatch && lastOk===true;
if(!observed) console.log('\n  ❌ HARNESS FAILURE: NO AUTHORITATIVE PATH EXERCISED (0 events)');
else if(!hasFP) console.log('\n  ❌ HARNESS FAILURE: FINAL_PROSE endpoint never reached');
console.log('  events observed: '+src.length+'  (rawSnap '+rsnap.length+' / textSnap '+tsnap.length+')');
console.log('\n  '+(allPass?'✅ HARNESS CONSERVES':'❌ HARNESS FAILURE'));
console.log('  mutation labels: '+muts.map(m=>m.label+'('+m.mutationClass+')').join(' → '));
console.log('\n════ LANE-2 SNAPSHOT CHAIN (V2, author stubbed) ════');
chain.forEach(c=>console.log('  '+c.id.padEnd(6)+' '+c.hash+'  '+String(c.len).padStart(5)+' chars'
  +(c.owner?('   ← '+c.owner+(c.label?(' ['+c.label+']'):'')):'')));
console.log('\n  total snapshot events: '+snaps.length
  +'  (retained/changed: '+snaps.filter(s=>s.changed&&s.outText).length
  +', rejected: '+snaps.filter(s=>s.rejected).length
  +', no-change: '+snaps.filter(s=>!s.changed&&!s.rejected).length+')');
