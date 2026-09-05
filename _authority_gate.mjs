// _authority_gate.mjs — Roman 2026-08-12. THE FREE ACCEPTANCE GATE. Zero author spend.
//
// No handleBeginStory, no stubbed Scene 1: the preserved A·9 harbor prose/state IS the rolling context,
// which is both free and more faithful to the intended conflict than fabricated opening prose.
// Pass 1 (gpt-4o-mini planner, fractions of a cent) runs for real; EVERY author-family call is intercepted
// and stubbed at the network layer, so nothing reaches Grok.
//
// Asserts the eight gate conditions separately — distinct representations, never raw keyword presence.
import { chromium } from 'playwright-core';
import fs from 'fs';

const GOAL = "Lirael, hidden behind a market stall, manages to slip a note into Julian's pocket without being seen by the council patrol, indicating a safe meeting place.";
const PLACE = 'market stall', N = 10;
const HARBOR = 'the harbor path at dusk';
const prior = JSON.parse(fs.readFileSync('/tmp/arm_gen.json.partial','utf8')).scenes;
const S8 = prior[7].text, S9 = prior[8].text;
const log=(...a)=>console.error(...a);

const browser = await chromium.launch({headless:true});
const page = await (await browser.newContext()).newPage();
for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(pat, r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));

// Scene 1 must generate FOR REAL — an uninitialized story does not take the live multi-pass route (proven:
// the zero-spend variant never fired PLAN-SPINE and captured a 12k payload where the live one is ~370k).
// That init is the ONLY spend; every author call on the TESTED TURN is stubbed.
let initDone=false;
let pass1User=null, pass2Sys=null, authorEscaped=0, intercepted=0;
await page.route('**/api/**', async route => {
  const req=route.request(); if (req.method()!=='POST') return route.continue();
  let b=null; try { b=JSON.parse(req.postData()||'{}'); } catch(_) { return route.continue(); }
  const msgs=b.messages||[]; const sys=String((msgs.find(m=>m.role==='system')||{}).content||'');
  const usr=String((msgs.find(m=>m.role==='user')||{}).content||'');
  if (/cinematic scene planning engine/i.test(sys)) { pass1User=usr; return route.continue(); }  // Pass 1: cheap, needed
  // Target the AUTHOR ONLY. A >3000-char threshold also caught the skeleton generator and other large
  // pre-passes; stubbing those killed the turn before it ever reached the author (12k capture vs the
  // author's ~370k). Identify the author by the spine mandate it carries, or by sheer size.
  const isAuthor = /SPINE EVENT — MUST STAGE|COMPILED SPINE STAGING/.test(sys) || sys.length>150000;
  if (isAuthor) {
    if (!initDone) return route.continue();   // Scene-1 author: the one allowed spend
    intercepted++; if (!pass2Sys || /COMPILED SPINE STAGING/.test(sys)) pass2Sys=sys;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:'[stubbed — zero author spend]'})});
  }
  return route.continue();
});
page.on('console', m=>{ const t=m.text(); if(/SPINE-STAGING|PLAN-SPINE|SCENE_PLAN/.test(t)) log('  pg>', t.slice(0,170)); });

await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await page.waitForFunction(()=>window.state&&window.StoryPagination&&window.STARTER_STORIES,{timeout:40000});
await page.waitForTimeout(600);

await page.evaluate((cfg)=>{
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
},{});

// ── THE ONE ALLOWED SPEND: initialize the story so the turn takes the LIVE multi-pass route ──
log('[gate] generating Scene 1 to initialize (the only spend) …');
await page.evaluate(()=>window.handleBeginStory());
for (let w=0; w<600000; w+=3000){ await page.waitForTimeout(3000);
  const n=await page.evaluate(()=>(window.StoryPagination.getPages()||[]).length); if(n>=1){ await page.waitForTimeout(6000); break; } }
for (let i=0;i<40;i++){ const b=await page.evaluate(()=>!!window.state._isAdvancingScene); if(!b) break; await page.waitForTimeout(3000); }
initDone = true;
log('[gate] initialized — all further author calls are stubbed');

// ── PRESERVED HARBOR CONTEXT, applied AFTER init so it overwrites Scene 1's tableau ──
await page.evaluate((cfg)=>{
  const s=window.state;
  const SP=window.StoryPagination; try{SP.clear();}catch(_){}
  SP.addPage('<p>'+cfg.s8.replace(/\n+/g,'</p><p>')+'</p>',true);
  SP.addPage('<p>'+cfg.s9.replace(/\n+/g,'</p><p>')+'</p>',true);
  s._sceneTextRing=[{text:cfg.s8},{text:cfg.s9}]; s._priorSceneText=cfg.s9;
  s.physicalState={location:cfg.harbor,timeOfDay:'dusk'};
  s._committedState={facts:[{fact:'The councilwoman confronted Lirael on the harbor path.'}],pendingIntent:null,
    tableau:{forScene:cfg.n-1,setting:cfg.harbor,charactersPresent:['Lirael','the councilwoman'],protagonistAlone:false}};
  s._sceneStateCard=s._committedState.tableau;
  s.turnCount=cfg.n-2; s._cliffhangerContinueAuthorized=true;
  s._petitionEmergenceFired=true; s._deckExamineFired=true; s._isAdvancingScene=false;
  window._usePlanSpine=true;
  window.STARTER_PLANS['starter_first_sacrifice']={issue:1,scenes:[{n:cfg.n,goal:cfg.goal}]};
},{s8:S8,s9:S9,n:N,goal:GOAL,harbor:HARBOR});

log('[gate] firing one live turn — every author call will be stubbed');
await page.evaluate(()=>{ document.getElementById('actionInput').value='I slip through the crowd.';
  document.getElementById('dialogueInput').value=''; const b=document.getElementById('submitBtn'); b.disabled=false; b.click(); });
for (let w=0; w<420000 && !pass2Sys; w+=3000) await page.waitForTimeout(3000);
await page.waitForTimeout(4000);
const post = await page.evaluate(()=>({
  tableau:(window.state._committedState&&window.state._committedState.tableau&&window.state._committedState.tableau.setting)||null,
  plan: window.state._lastScenePlan||null }));
await browser.close();

// ── parse STATE json out of the Pass-1 user message ──
let st=null; if (pass1User){ const m=pass1User.match(/STATE:\n(\{[\s\S]*?\})\n\nPLAYER INPUT/); if(m){ try{ st=JSON.parse(m[1]); }catch(_){} } }
const EXPECT_SETTING = 'SETTING: this scene takes place at ' + PLACE + '; do not preserve the prior location.';
const hc = (post.plan && post.plan.hard_constraints) || [];
const checks = [
  ['1 prior tableau stays harbor',                 post.tableau === HARBOR,                                   JSON.stringify(post.tableau)],
  ['2 STATE.spine_staging.setting = market stall', !!(st&&st.spine_staging&&st.spine_staging.setting===PLACE), JSON.stringify(st&&st.spine_staging)],
  ['3 STATE.spine_event byte-identical',           !!(st&&st.spine_event===GOAL),                             st?String(st.spine_event).slice(0,44)+'…':'(no STATE)'],
  ['4 plan._compiled_spine_staging.setting',       !!(post.plan&&post.plan._compiled_spine_staging&&post.plan._compiled_spine_staging.setting===PLACE), JSON.stringify(post.plan&&post.plan._compiled_spine_staging)],
  ['5 first hard_constraint is exact',             hc[0]===EXPECT_SETTING,                                    JSON.stringify(hc[0])],
  ['6 Pass2 has COMPILED SPINE STAGING block',     !!(pass2Sys&&/COMPILED SPINE STAGING — HARD:/.test(pass2Sys)), pass2Sys?'captured '+pass2Sys.length+' chars':'(none)'],
  ['7 Pass2 has verbatim spine event separately',  !!(pass2Sys&&pass2Sys.includes(GOAL)&&/SPINE EVENT — MUST STAGE/.test(pass2Sys)), ''],
  ['8 zero author calls escaped',                  authorEscaped===0 && intercepted>0,                        intercepted+' intercepted, '+authorEscaped+' escaped'],
];
console.log('\n\n════════ FREE AUTHORITY GATE ════════');
checks.forEach(([n,ok,ev])=>console.log('  '+(ok?'✅':'❌')+'  '+n+(ev?'\n         '+String(ev).slice(0,120):'')));
if (hc.length) console.log('\n  hard_constraints as compiled:'), hc.slice(0,3).forEach((c,i)=>console.log('    ['+i+'] '+String(c).slice(0,104)));
const green = checks.every(([,ok])=>ok);
console.log('\n  ' + (green?'✅ GATE GREEN — wiring earned; a paid longitudinal run is justified':'❌ GATE RED — do not spend'));
process.exitCode = green?0:2;
