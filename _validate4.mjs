// _validate4.mjs — 4 paid validation scenes on POST_ARCH_SPLIT. REAL generation.
//   SESSION A (fatelands): init→V1 (Scene 1 cold-read) · turn→V2 (note-pass) · reseed+turn→V3 (irreversible state)
//   SESSION B (modern):    init      · turn→V4
// Captures: assigned event · payload markers · ORIGINAL author response (pre-repair) · final prose · gate/re-author · cost
import { chromium } from 'playwright-core';
import fs from 'fs';
const SESSION=(process.env.SESSION||'A');
const OUT='_validate_out'; fs.mkdirSync(OUT,{recursive:true});
const log=(...a)=>console.error(...a);
const prior=JSON.parse(fs.readFileSync('/tmp/arm_gen.json','utf8')).scenes;

const HASH=(await import('child_process')).execSync('shasum -a 256 public/app.js').toString().split(' ')[0];
if(!HASH.startsWith('40f6cc3a')){ console.error('BUILD DRIFT: '+HASH); process.exit(3); }

const browser=await chromium.launch({headless:true});
const page=await (await browser.newContext()).newPage();
for (const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(p, r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));

let phase='init', payloads=[], authorRaw=[], consoleLines=[];
const isAuthor=(sys,model)=>/STORYBOUND ARCHITECTURE LAWS/.test(sys)||/grok-4\.3/.test(String(model||''));
await page.route('**/api/**', async route=>{
  const r=route.request(); if(r.method()!=='POST') return route.continue();
  let b=null; try{b=JSON.parse(r.postData()||'{}');}catch(_){return route.continue();}
  const msgs=b.messages||[]; const sys=String((msgs.find(m=>m.role==='system')||{}).content||'');
  const usr=String((msgs.find(m=>m.role==='user')||{}).content||'');
  const model=b.model||b.preferredModel;
  if(!isAuthor(sys,model)) return route.continue();
  payloads.push({phase,sys,usr,model});
  const resp=await route.fetch(); let body=''; try{body=await resp.text();}catch(_){}
  let txt=''; try{const j=JSON.parse(body); txt=j.content||j.choices?.[0]?.message?.content||'';}catch(_){txt=body.slice(0,200);}
  authorRaw.push({phase,model,text:txt});          // ORIGINAL author output, before any downstream repair
  return route.fulfill({response:resp,body});
});
page.on('console',m=>{const t=m.text(); consoleLines.push(t);
  if(/SCENE-COST\] by category|TENSION|RE-?AUTHOR|REPAIR|VERIFIER|GATE/i.test(t)) log('   · '+t.slice(0,150));});

await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.state&&window.StoryPagination&&window.STARTER_STORIES,{timeout:40000});
await page.waitForTimeout(600);

const MODERN=(SESSION==='B');
await page.evaluate((cfg)=>{
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
  s.loveInterest='Male'; s.liGender='male'; s.playerMask='OPEN_VEIN';
  s.storyLength='fling'; s.tier='fling'; s.access='sub'; s.subscribed=true; s.fortunes=9999999;
  s.previewActive=false; s._skipCorridorValidation=true; s.intensity='Steamy'; s.pov='first_person';
  s.identity={playerName:s.playerName,partnerName:s.partnerName}; s.picks.identity=s.identity;
  s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.currentEngine='literary';
},{modern:MODERN});

const lastPage=async()=>page.evaluate(()=>{const p=window.StoryPagination.getPages()||[];
  const h=p[p.length-1]||''; const d=document.createElement('div'); d.innerHTML=h;
  return (d.textContent||'').trim();});
const results=[];
const snap=(id,assigned)=>{
  const pl=payloads.filter(p=>p.phase===id).pop()||null;
  const marks=pl?Object.fromEntries([['floor','AUTHOR FLOOR'],['romantasy','MODE: ROMANTASY'],
    ['contemporary','MODE: CONTEMPORARY ROMANCE'],['scene1Contract','LOAD-BEARING contract for Scene 1'],
    ['onlyPressure','exists ONLY as PRESSURE'],['inversionTest','INVERSION TEST'],
    ['law3','LAW 3 — MEMORY-CONTENT PRIORITY'],['sixtyForty','Default: roughly 60% of the reader']]
    .map(([k,v])=>[k,(pl.sys+pl.usr).includes(v)])):null;
  return {id,assigned,marks,payloadChars:pl?pl.sys.length+pl.usr.length:null,
    authorModels:authorRaw.filter(a=>a.phase===id).map(a=>a.model),
    authorRawFirst:(authorRaw.filter(a=>a.phase===id)[0]||{}).text||null};
};

async function initStory(id){ phase=id;
  log('[gen] '+id+' — initializing (REAL generation)…');
  await page.evaluate(()=>window.handleBeginStory());
  for(let w=0;w<600000;w+=3000){ await page.waitForTimeout(3000);
    if(await page.evaluate(()=>((window.StoryPagination.getPages()||[]).join('').length>1200))) break; }
  await page.waitForTimeout(4000);
}
async function runTurn(id,assigned,seed,action){ phase=id;
  await page.evaluate((cfg)=>{
    const s=window.state, SP=window.StoryPagination;
    try{SP.clear();}catch(_){}
    cfg.seed.forEach(t=>SP.addPage('<p>'+t.replace(/\n+/g,'</p><p>')+'</p>',true));
    s._sceneTextRing=cfg.seed.map(t=>({text:t})); s._priorSceneText=cfg.seed[cfg.seed.length-1];
    s.turnCount=cfg.turn; s._cliffhangerContinueAuthorized=true; s._isAdvancingScene=false;
    s._petitionEmergenceFired=true; s._deckExamineFired=true;
    // PIN the assigned spine event so the planner cannot overwrite the channel the author reads
    try{ Object.defineProperty(s,'_spineEventVerbatim',
      {get:()=>cfg.assigned,set:()=>{},configurable:true}); }catch(_){ s._spineEventVerbatim=cfg.assigned; }
    window._lockedSceneMission=cfg.assigned;
  },{seed,turn:seed.length,assigned});
  log('[gen] '+id+' — assigned: '+assigned);
  const before=await lastPage();
  await page.evaluate((a)=>{ document.getElementById('actionInput').value=a;
    document.getElementById('dialogueInput').value=''; const b=document.getElementById('submitBtn');
    b.disabled=false; b.click(); },action);
  for(let w=0;w<600000;w+=3000){ await page.waitForTimeout(3000);
    const t=await lastPage(); if(t&&t!==before&&t.length>1200) break; }
  await page.waitForTimeout(4000);
}

if(SESSION==='A'){
  await initStory('V1');
  results.push({...snap('V1',null), prose:await lastPage()});
  await runTurn('V2','Lirael passes the folded note to her contact at the market stall.',
    [prior[0].text, prior[1].text], 'I go to the market stall to pass the note.');
  results.push({...snap('V2','Lirael passes the folded note to her contact at the market stall.'), prose:await lastPage()});
  const gone='Julian took the relic from the shrine table and walked out through the north gate. He did not look back. By the time I reached the threshold the courtyard was empty and the gate stood open on the road out of the valley. He is gone, and the relic is gone with him.';
  await runTurn('V3','Lirael forces the gatekeeper to name the road Julian took with the relic.',
    [prior[0].text, gone], 'I corner the gatekeeper and demand to know which road he took.');
  results.push({...snap('V3','Lirael forces the gatekeeper to name the road Julian took with the relic.'), prose:await lastPage()});
} else {
  await initStory('INIT-B');
  await runTurn('V4','Mara hands Dorian the signed resignation letter in the elevator.',
    [await lastPage()], 'I hand him the letter.');
  results.push({...snap('V4','Mara hands Dorian the signed resignation letter in the elevator.'), prose:await lastPage()});
}
await browser.close();
const cost=consoleLines.filter(l=>/SCENE-COST/.test(l));
fs.writeFileSync(OUT+'/session'+SESSION+'.json',JSON.stringify({build:HASH,results,cost,
  gates:consoleLines.filter(l=>/TENSION|RE-?AUTHOR|REPAIR|VERIFIER/i.test(l))},null,2));
results.forEach(r=>{ console.log('\n════ '+r.id+' ════');
  console.log('  assigned : '+(r.assigned||'(scene 1 — none)'));
  console.log('  payload  : '+r.payloadChars+'  models: '+r.authorModels.join(','));
  console.log('  markers  : '+JSON.stringify(r.marks));
  console.log('  prose    : '+(r.prose||'').length+' chars'); });
console.log('\n→ '+OUT+'/session'+SESSION+'.json');
