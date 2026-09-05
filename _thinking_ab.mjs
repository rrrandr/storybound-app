// _thinking_ab.mjs — exact paired replay of the failed V2 note-pass.
//   ARM=A : mistral-small-2603 as shipped (no reasoning)
//   ARM=B : SAME pin + reasoning_effort:"high", called direct so the frozen build is untouched
// Arms run SEQUENTIALLY. Only the reasoning flag differs.
import { chromium } from 'playwright-core';
import fs from 'fs';
import { execSync } from 'child_process';
const ARM=(process.env.ARM||'A'), OUT='_validate_out';
const KEY=(fs.readFileSync('.env.local','utf8').match(/^MISTRAL_API_KEY=(.*)$/m)||[])[1].trim().replace(/^["']|["']$/g,'');
const HASH=execSync('shasum -a 256 public/app.js').toString().split(' ')[0];
if(!HASH.startsWith('40f6cc3a')){ console.error('BUILD DRIFT '+HASH); process.exit(3); }
const prior=JSON.parse(fs.readFileSync('/tmp/arm_gen.json','utf8')).scenes;
const ASSIGNED='Lirael passes the folded note to her contact at the market stall.';
const log=(...a)=>console.error(...a);

const browser=await chromium.launch({headless:true});
const page=await (await browser.newContext()).newPage();
for(const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(p,r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));

let phase='init', usage=[], authorRaw=[], sawThinking=null, maxTok=null;
const isAuthor=(sys,model)=>/STORYBOUND ARCHITECTURE LAWS/.test(sys)||/grok-4\.3/.test(String(model||''));
const flatten=(c)=>Array.isArray(c)
  ? c.filter(b=>b&&b.type==='text').map(b=>typeof b.text==='string'?b.text:
      (Array.isArray(b.text)?b.text.map(t=>t.text||'').join(''):'')).join('')
  : String(c||'');
await page.route('**/api/**', async route=>{
  const r=route.request(); if(r.method()!=='POST') return route.continue();
  let b=null; try{b=JSON.parse(r.postData()||'{}');}catch(_){return route.continue();}
  const sys=String(((b.messages||[]).find(m=>m.role==='system')||{}).content||'');
  if(!isAuthor(sys,b.model||b.preferredModel)) return route.continue();
  if(phase!=='turn') { const rp=await route.fetch(); return route.fulfill({response:rp,body:await rp.text()}); }
  maxTok=b.max_tokens;
  if(ARM==='A'){
    const rp=await route.fetch(); const body=await rp.text();
    try{const j=JSON.parse(body); usage.push(j.usage||null);
      authorRaw.push(flatten(j.choices?.[0]?.message?.content));}catch(_){}
    return route.fulfill({response:rp,body});
  }
  // ARM B — same model + same max_tokens, reasoning ON
  const res=await fetch('https://api.mistral.ai/v1/chat/completions',{method:'POST',
    headers:{'Authorization':'Bearer '+KEY,'Content-Type':'application/json'},
    body:JSON.stringify({model:b.model,messages:b.messages,temperature:b.temperature,
      max_tokens:b.max_tokens,reasoning_effort:'high'})});
  const j=await res.json();
  if(j.error||!j.choices){ log('  ARM B API error: '+JSON.stringify(j).slice(0,300));
    return route.fulfill({status:500,contentType:'application/json',body:'{}'}); }
  const raw=j.choices[0].message.content;
  sawThinking=Array.isArray(raw)&&raw.some(x=>x&&x.type==='thinking');
  const text=flatten(raw);
  usage.push(j.usage||null); authorRaw.push(text);
  j.choices[0].message.content=text;                    // normalize for the app
  return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(j)});
});
page.on('console',m=>{const t=m.text(); if(/SCENE-COST\] Finalized/.test(t)) log('   · '+t.slice(0,110));});

await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.state&&window.StoryPagination&&window.STARTER_STORIES,{timeout:40000});
await page.waitForTimeout(600);
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
  s.pov='first_person'; s.identity={playerName:s.playerName,partnerName:s.partnerName};
  s.picks.identity=s.identity; s._pcLookSkipped=true; s.pcLookLocked=true;
  s.renderMode='literary'; s.currentEngine='literary';
});
const lastPage=async()=>page.evaluate(()=>{const p=window.StoryPagination.getPages()||[];
  const d=document.createElement('div'); d.innerHTML=p[p.length-1]||''; return (d.textContent||'').trim();});
log('[arm '+ARM+'] init…');
await page.evaluate(()=>window.handleBeginStory());
for(let w=0;w<600000;w+=3000){ await page.waitForTimeout(3000);
  if(await page.evaluate(()=>((window.StoryPagination.getPages()||[]).join('').length>1200))) break; }
await page.waitForTimeout(4000);
phase='turn';
await page.evaluate((cfg)=>{
  const s=window.state, SP=window.StoryPagination; try{SP.clear();}catch(_){}
  cfg.seed.forEach(t=>SP.addPage('<p>'+t.replace(/\n+/g,'</p><p>')+'</p>',true));
  s._sceneTextRing=cfg.seed.map(t=>({text:t})); s._priorSceneText=cfg.seed[1];
  s.turnCount=2; s._cliffhangerContinueAuthorized=true; s._isAdvancingScene=false;
  s._petitionEmergenceFired=true; s._deckExamineFired=true;
  try{Object.defineProperty(s,'_spineEventVerbatim',{get:()=>cfg.a,set:()=>{},configurable:true});}catch(_){}
  window._lockedSceneMission=cfg.a;
},{seed:[prior[0].text,prior[1].text],a:ASSIGNED});
const before=await lastPage();
log('[arm '+ARM+'] firing turn…');
await page.evaluate(()=>{ document.getElementById('actionInput').value='I go to the market stall to pass the note.';
  document.getElementById('dialogueInput').value=''; const b=document.getElementById('submitBtn'); b.disabled=false; b.click(); });
for(let w=0;w<900000;w+=3000){ await page.waitForTimeout(3000);
  const t=await lastPage(); if(t&&t!==before&&t.length>1200) break; }
await page.waitForTimeout(4000);
const prose=await lastPage();
await browser.close();
const u=usage[0]||{};
const inTok=u.prompt_tokens||0, outTok=u.completion_tokens||0;
const cost=inTok*0.15e-6 + outTok*0.60e-6;
const rec={arm:ARM,build:HASH,assigned:ASSIGNED,maxTokens:maxTok,thinkingBlocks:sawThinking,
  usage:u,authorLegCostUSD:+cost.toFixed(6),authorRaw:authorRaw[0]||null,prose};
fs.writeFileSync(OUT+'/thinking_'+ARM+'.json',JSON.stringify(rec,null,2));
console.log('\n════ ARM '+ARM+' ════');
console.log('  max_tokens sent   : '+maxTok+'   thinking blocks returned: '+sawThinking);
console.log('  usage             : '+JSON.stringify(u));
console.log('  author leg cost   : $'+cost.toFixed(6));
console.log('  author raw chars  : '+(authorRaw[0]||'').length+'   final prose: '+prose.length);
['market stall','stall','note','folded'].forEach(k=>
  console.log('  raw contains "'+k+'" : '+new RegExp(k,'i').test(authorRaw[0]||'')));
