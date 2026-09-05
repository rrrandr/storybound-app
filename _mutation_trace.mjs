// _mutation_trace.mjs — Lane 2 attribution. Author is STUBBED with V2's SAVED RAW output, so every
// downstream prose mutation runs for real on a known input. Repair calls are cheap (mistral-small/4o-mini).
import { chromium } from 'playwright-core';
import fs from 'fs';
import { execSync } from 'child_process';
import crypto from 'crypto';
const HASH=execSync('shasum -a 256 public/app.js').toString().split(' ')[0];
if(!HASH.startsWith('7f0c55c8')){console.error('BUILD DRIFT '+HASH);process.exit(3);}
const saved=JSON.parse(fs.readFileSync('_validate_out/assign_sessionA.json','utf8'));
const V2=saved.results.find(r=>r.id==='V2');
const RAW=V2.authorRaw;
const prior=JSON.parse(fs.readFileSync('/tmp/arm_gen.json','utf8')).scenes;
const h=t=>crypto.createHash('sha256').update(String(t||'')).digest('hex').slice(0,10);
const log=(...a)=>console.error(...a);
const browser=await chromium.launch({headless:true});
const page=await (await browser.newContext()).newPage();
for(const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(p,r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));
let phase='init', events=[], authorStubbed=0;
const looksLikeProse=s=>s.length>600 && /[.!?]/.test(s);
await page.route('**/api/**', async route=>{
  const r=route.request(); if(r.method()!=='POST') return route.continue();
  let b=null; try{b=JSON.parse(r.postData()||'{}');}catch(_){return route.continue();}
  const msgs=b.messages||[];
  const sys=String((msgs.find(m=>m.role==='system')||{}).content||'');
  const usr=String((msgs.find(m=>m.role==='user')||{}).content||'');
  const tot=sys.length+usr.length;
  const isAuthor=/STORYBOUND ARCHITECTURE LAWS/.test(sys)||tot>120000;
  if(isAuthor && phase==='turn'){
    authorStubbed++;
    events.push({kind:'AUTHOR(stub)',model:'stubbed',inHash:null,inLen:null,outHash:h(RAW),outLen:RAW.length});
    return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify({choices:[{message:{content:RAW}}],model:'stubbed'})});
  }
  if(isAuthor) return route.continue();
  // repair-class: a POST whose user message embeds prose
  const inProse = looksLikeProse(usr) ? usr : (looksLikeProse(sys)?sys:null);
  if(!inProse) return route.continue();
  const resp=await route.fetch({timeout:0}); let body='',out='',resolved=null;
  let usage=null;
  try{body=await resp.text(); const j=JSON.parse(body); resolved=j.model||j._orchestration?.model||null;
    usage=j.usage||null;
    const c=j.choices?.[0]?.message?.content??j.content;
    out=Array.isArray(c)?c.filter(x=>x&&x.type==='text').map(x=>x.text).join(''):String(c||'');}catch(_){}
  events.push({kind:'REPAIR-CALL',phase,url:r.url().split('/').pop(),
    profileLabel:b.profileLabel||null, requested:b.model||null, resolved,
    sysHead:sys.slice(0,90).replace(/\s+/g,' '),
    inHash:h(inProse),inLen:inProse.length,outHash:h(out),outLen:out.length,usage,
    changed:h(inProse)!==h(out), candidate:out.slice(0,4000)});
  return route.fulfill({response:resp,body});
});
page.on('console',m=>{const t=m.text();
  if(/REPAIR|LENS|GATE|EDITORIAL|CALCIFIED|BODY-DUMP|LI-PROOF|HOT-RENDER|INTERLOCUTOR/i.test(t))
    events.push({kind:'LOG',phase,text:t.replace(/\s+/g,' ').slice(0,190)});});
await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.state&&window._cheapLineEdit,{timeout:40000});
await page.exposeFunction('__mut',e=>events.push(e));
await page.evaluate(()=>{
  const orig=window._cheapLineEdit;
  window._cheapLineEdit=async function(text,instr,label){
    const before=String(text||'');
    const out=await orig.apply(this,arguments);
    window.__mut({kind:'DIRECT',owner:'_cheapLineEdit',label:label||null,
      inLen:before.length,outLen:String(out||'').length,changed:String(out||'')!==before,
      instr:String(instr||'').slice(0,120)});
    return out;
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
});
log('[trace] init…');
await page.evaluate(()=>window.handleBeginStory());
for(let w=0;w<700000;w+=3000){await page.waitForTimeout(3000);
  if(await page.evaluate(()=>((window.StoryPagination.getPages()||[]).join('').length>1200)))break;}
await page.waitForTimeout(4000);
events.length=0; phase='turn';
const lastPage=async()=>page.evaluate(()=>{const p=window.StoryPagination.getPages()||[];
  const d=document.createElement('div'); d.innerHTML=p[p.length-1]||''; return (d.textContent||'').trim();});
await page.evaluate((c)=>{const s=window.state,SP=window.StoryPagination;
  try{SP.clear();}catch(_){} SP.addPage('<p>'+c.a+'</p>',true);
  s._sceneTextRing=[{text:c.a}]; s._priorSceneText=c.a; s.turnCount=0;
  s._cliffhangerContinueAuthorized=true;s._isAdvancingScene=false;
  s._petitionEmergenceFired=true;s._deckExamineFired=true;
  window.STARTER_PLANS['starter_first_sacrifice'].scenes=[{n:2,
    goal:'Lirael passes the folded note to her contact at the market stall.',
    setting:'market stall',participants:['Lirael','Carys'],props:['folded note']}];},{a:prior[1].text});
const before=await lastPage();
log('[trace] firing turn (author stubbed with saved V2 raw)…');
await page.evaluate(()=>{document.getElementById('actionInput').value='I go to the market stall to pass the note.';
  document.getElementById('dialogueInput').value='';const b=document.getElementById('submitBtn');b.disabled=false;b.click();});
for(let w=0;w<700000;w+=3000){await page.waitForTimeout(3000);
  const t=await lastPage(); if(t&&t!==before&&t.length>800)break;}
await page.waitForTimeout(5000);
const FINAL=await lastPage();
await browser.close();
fs.writeFileSync('_validate_out/mutation_trace.json',JSON.stringify({build:HASH,rawHash:h(RAW),rawLen:RAW.length,
  finalHash:h(FINAL),finalLen:FINAL.length,authorStubbed,events,FINAL},null,2));
console.log('\n════ MUTATION TIMELINE (V2 replay, author stubbed) ════');
console.log('  RAW  '+h(RAW)+'  '+RAW.length+' chars   (author stubs served: '+authorStubbed+')');
let i=0;
events.forEach(e=>{
  if(e.kind==='REPAIR-CALL'){i++;
    console.log('  ['+i+'] REPAIR-CALL  '+(e.profileLabel||'(no label)')+'  → '+(e.resolved||e.requested));
    console.log('        in '+e.inHash+' ('+e.inLen+')  → cand '+e.outHash+' ('+e.outLen+')  changed='+e.changed);
    console.log('        sys: '+e.sysHead);}
  else if(e.kind==='DIRECT') console.log('  [·] DIRECT _cheapLineEdit label='+e.label+'  '+e.inLen+'→'+e.outLen+'  changed='+e.changed+'  instr="'+e.instr+'"');
  else if(e.kind==='LOG') console.log('      log: '+e.text.slice(0,140));});
// COST — priced by RESOLVED model. grok-4.3 has ONE price regardless of reasoning_effort.
const PRICE={'grok-4.3':{i:1.25e-6,o:2.5e-6,c:0.2e-6},'mistral-small-latest':{i:0.15e-6,o:0.6e-6},
  'mistral-small-2603':{i:0.15e-6,o:0.6e-6},'gpt-4o-mini':{i:0.15e-6,o:0.6e-6},'gpt-4o':{i:2.5e-6,o:10e-6}};
const pick=m=>PRICE[String(m||'').toLowerCase()]||PRICE['gpt-4o-mini'];
let tot=0,byModel={},noUsage=0;
console.log('\n──── PER-CALL COST (resolved model authoritative) ────');
events.filter(e=>e.kind==='REPAIR-CALL').forEach((e,i)=>{
  if(!e.usage){noUsage++; console.log('  ['+(i+1)+'] '+(e.resolved||'?')+'  NO USAGE METADATA'); return;}
  const p=pick(e.resolved), it=e.usage.prompt_tokens||0, ot=e.usage.completion_tokens||0;
  const cached=(e.usage.prompt_tokens_details&&e.usage.prompt_tokens_details.cached_tokens)||0;
  const c=(it-cached)*p.i + cached*(p.c||p.i) + ot*p.o;
  tot+=c; byModel[e.resolved]=(byModel[e.resolved]||0)+c;
  const alt=(it-cached)*0.15e-6 + cached*0.15e-6 + ot*0.6e-6;   // Mistral Small 4 non-reasoning
  console.log('  ['+(i+1)+'] '+String(e.resolved).padEnd(22)+' in='+it+' cached='+cached+' out='+ot
    +'  $'+c.toFixed(6)+'   (as mistral-small: $'+alt.toFixed(6)+')');
});
console.log('  ─────');
Object.entries(byModel).forEach(([m,v])=>console.log('  '+m.padEnd(22)+' $'+v.toFixed(5)));
console.log('  TOTAL DOWNSTREAM (author stubbed): $'+tot.toFixed(5)+(noUsage?('   ['+noUsage+' calls lacked usage]'):''));
console.log('  FINAL '+h(FINAL)+'  '+FINAL.length+' chars');
console.log('  RAW→FINAL changed: '+(h(RAW)!==h(FINAL)));
