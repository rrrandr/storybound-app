// _livepath_probe.mjs — Roman 2026-08-12. PROVE the live-turn path for the location carriers. NO PROSE.
//
// Rule being honored: do NOT patch a nearby `sceneSkeleton` assignment and assume it is live. Instrument
// state.sceneSkeleton with a property SETTER + stack trace, run a REAL turn on a place-bearing spine goal,
// and let the engine tell us which branch actually executes.
//
// COST CONTROL: the Grok author call is INTERCEPTED AND STUBBED at the network layer — captured, never sent.
// We pay only for scene-1 init and the cheap pre-passes. Logs the full chain:
//   goal → compiled setting → tableau.setting → environment_anchor → author payload
import { chromium } from 'playwright-core';
import fs from 'fs';

const GOAL = "Lirael, hidden behind a market stall, manages to slip a note into Julian's pocket without being seen by the council patrol, indicating a safe meeting place.";
const N = 10;
const prior = JSON.parse(fs.readFileSync('/tmp/arm_gen.json.partial','utf8')).scenes;
const S8 = prior[7].text, S9 = prior[8].text;
const log=(...a)=>console.error(...a);

const browser = await chromium.launch({headless:true});
const page = await (await browser.newContext()).newPage();
for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(pat, r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));

let authorPayload=null, storyInitDone=false;
await page.route('**/api/**', async route => {
  const req=route.request();
  if (req.method()!=='POST') return route.continue();
  let body=null; try { body=JSON.parse(req.postData()||'{}'); } catch(_) { return route.continue(); }
  const sys=(body.messages||[]).find(m=>m.role==='system');
  const txt=sys?String(sys.content):'';
  // Only intercept the AUTHOR call of the TEST TURN (it carries the spine block). Everything else runs for real.
  if (storyInitDone && txt.length>3000 && /SPINE EVENT — MUST STAGE/.test(txt)) {
    authorPayload=txt;
    log('  [intercept] AUTHOR CALL CAPTURED AND STUBBED — not sent, not billed');
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:'[stubbed]'})});
  }
  return route.continue();
});
page.on('console', m=>{ const t=m.text(); if(/PROBE|SPINE-STAGING|PLAN-SPINE/.test(t)) log('  pg>', t.slice(0,200)); });

await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.state&&typeof window.handleBeginStory==='function'&&window.StoryPagination,{timeout:40000});
await page.waitForTimeout(800);

await page.evaluate(()=>{
  const s=window.state;
  window._auditSceneEmotionalGravity=()=>Promise.resolve(null);
  ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture',
   '_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(f=>{try{window[f]=()=>Promise.resolve(null);}catch(_){}});
  window._devBypass=true;
  const def=(window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
  s.picks=s.picks||{};
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>s.picks[k]=def[k]);
  s.world=def.world; s.worldSubtype=def.worldSubtype; s.flavor=def.flavor; s.dynamic=def.dynamic;
  s._starterId=def.id; s.is_starter_story=true; s.immutableTitle=def.title;
  s.archetype={primary:def.archetype,modifier:null}; s.loveInterestName='Julian'; s.loveInterest='Male'; s.liGender='male';
  s.playerMask='OPEN_VEIN'; s.storyLength='fling'; s.tier='fling'; s.access='sub'; s.subscribed=true; s.fortunes=9999999;
  s.previewActive=false; s._skipCorridorValidation=true; s.intensity='Steamy';
  s.name='Lirael'; s.pov='first_person'; s.playerName='Lirael'; s.partnerName='Julian';
  s.identity={playerName:'Lirael',partnerName:'Julian'}; s.picks.identity=s.identity;
  s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.currentEngine='literary';
});
log('[probe] initializing story (scene 1) …');
await page.evaluate(()=>window.handleBeginStory());
for (let w=0; w<600000; w+=3000){ await page.waitForTimeout(3000);
  const n=await page.evaluate(()=>(window.StoryPagination.getPages()||[]).length); if(n>=1){await page.waitForTimeout(5000);break;} }
log('[probe] story initialized');
await page.evaluate(()=>{ let busy=true; }); storyInitDone=true;

// ── INSTALL THE SETTER PROBE (no app.js edit; the engine reports its own path) ──
await page.evaluate((cfg)=>{
  const s=window.state;
  let _sk = s.sceneSkeleton;
  window.__skWrites=[];
  Object.defineProperty(s,'sceneSkeleton',{configurable:true,
    get(){return _sk;},
    set(v){ _sk=v;
      const st=(new Error()).stack.split('\n').slice(2,5).map(x=>x.trim()).join(' | ');
      window.__skWrites.push({env:(v&&v.environment_anchor)||null, stack:st});
      console.log('[PROBE] sceneSkeleton SET env='+JSON.stringify((v&&v.environment_anchor)||null)+'  ← '+st.slice(0,150));
    }});
  // seed the conflicting prior tableau
  const SP=window.StoryPagination; try{SP.clear();}catch(_){}
  SP.addPage('<p>'+cfg.s8.replace(/\n+/g,'</p><p>')+'</p>',true);
  SP.addPage('<p>'+cfg.s9.replace(/\n+/g,'</p><p>')+'</p>',true);
  s._sceneTextRing=[{text:cfg.s8},{text:cfg.s9}]; s._priorSceneText=cfg.s9;
  s._committedState={facts:[{fact:'The councilwoman confronted Lirael on the harbor path.'}],pendingIntent:null,
    tableau:{forScene:cfg.n-1,setting:'the harbor path at dusk',charactersPresent:['Lirael','the councilwoman'],protagonistAlone:false}};
  s._sceneStateCard=s._committedState.tableau;
  s.turnCount=cfg.n-2; s._cliffhangerContinueAuthorized=true;
  s._petitionEmergenceFired=true; s._deckExamineFired=true;
  window._usePlanSpine=true;
  window.STARTER_PLANS['starter_first_sacrifice']={issue:1,scenes:[{n:cfg.n,goal:cfg.goal}]};
},{s8:S8,s9:S9,n:N,goal:GOAL});

for (let i=0;i<40;i++){ const b=await page.evaluate(()=>!!window.state._isAdvancingScene); if(!b) break; await page.waitForTimeout(3000); }
await page.evaluate(()=>{window.state._isAdvancingScene=false;});
log('[probe] firing one real turn on a place-bearing goal (author call will be stubbed)…');
await page.evaluate(()=>{ document.getElementById('actionInput').value='I slip through the crowd.';
  document.getElementById('dialogueInput').value=''; const b=document.getElementById('submitBtn'); b.disabled=false; b.click(); });

for (let w=0; w<420000 && !authorPayload; w+=3000) await page.waitForTimeout(3000);
const post = await page.evaluate(()=>({
  compiled: window.state._spineStaging||null,
  tableauSetting: (window.state._committedState&&window.state._committedState.tableau&&window.state._committedState.tableau.setting)||null,
  envAnchor: (window.state.sceneSkeleton&&window.state.sceneSkeleton.environment_anchor)||null,
  writes: window.__skWrites||[] }));
await browser.close();

console.log('\n\n════════ LIVE-PATH CHAIN ════════');
console.log('1. spine goal              : '+GOAL.slice(0,80)+'…');
console.log('2. compiled setting        : '+JSON.stringify(post.compiled&&post.compiled.setting));
console.log('3. tableau.setting         : '+JSON.stringify(post.tableauSetting));
console.log('4. environment_anchor      : '+JSON.stringify(post.envAnchor));
console.log('5. author payload captured : '+(authorPayload?'yes ('+authorPayload.length+' chars)':'NO'));
if (authorPayload){
  const place=(post.compiled&&post.compiled.setting)||'market stall';
  console.log('   payload contains compiled place ("'+place+'"): '+(authorPayload.toLowerCase().includes(place.toLowerCase())?'✅ YES':'❌ NO'));
  console.log('   payload contains the stale harbor anchor        : '+(/harbor/i.test(authorPayload)?'⚠ yes':'no'));
}
console.log('\n════════ WHO WRITES sceneSkeleton ON A REAL TURN ════════');
if (!post.writes.length) console.log('  (no writes observed during this turn — the skeleton was NOT reassigned)');
post.writes.forEach((w,i)=>console.log('  write #'+(i+1)+'  env='+JSON.stringify(w.env)+'\n      at '+w.stack.slice(0,190)));
const green = post.compiled&&post.compiled.setting && post.tableauSetting===post.compiled.setting && post.envAnchor && /market/i.test(post.envAnchor);
console.log('\nCHAIN '+(green?'✅ GREEN — both carriers hold the spine setting':'❌ NOT GREEN — see which link broke above'));
process.exitCode = green?0:2;
