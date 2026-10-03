// WHAT CARD DATA REACHES THE AUTHOR? Provider-free, $0. Captures a real author REQUEST and asks
// whether UNSELECTED fate cards arrive as actions or facts.
import fs from 'fs';
import { chromium } from 'playwright-core';
import { stageOf, isProviderEndpoint, fsPlannerCaptured, AUTHOR as REPLAY_AUTHOR, MEMORY,
  verifierVerdict, refsFromVerifierRequest } from './_replay_fixtures.mjs';
import { findFSDef, launchFS, unlockFS, finalizePreview, advanceExpectingGate, chooseBranch }
  from './_fs_story_setup.mjs';
const b = await chromium.launch(); const page = await b.newPage();
const authorReqs = [];
await page.route('**/api/**', async (route) => {
  const req = route.request();
  if (!isProviderEndpoint(req.url())) { try { await route.abort(); } catch (_) {} return; }
  let raw=null; try { raw = req.postData(); } catch(_){}
  let sys='', usr='';
  try { const j=JSON.parse(raw||'{}'); sys=String((j.messages||[])[0]?.content||''); usr=String((j.messages||[])[1]?.content||''); } catch(_){}
  const st = stageOf(sys);
  const give=(c)=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({content:c})});
  if (st==='planner') { try { return give(fsPlannerCaptured()); } catch(_){} }
  if (st==='author') { authorReqs.push({sys,usr}); return give(REPLAY_AUTHOR); }
  if (st==='memory') return give(MEMORY);
  if (st==='verifier') return give(verifierVerdict(refsFromVerifierRequest(usr)));
  try { await route.abort(); } catch(_){}
});
await page.goto('http://localhost:3000/', {waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>typeof window._advanceStagedScene==='function',{timeout:30000});
const def=await findFSDef(page); await launchFS(page,def); await unlockFS(page,'author-probe'); await finalizePreview(page);
await advanceExpectingGate(page,'',''); await chooseBranch(page,'A');
const readToGate=()=>page.evaluate(async()=>{const sl=(m)=>new Promise(r=>setTimeout(r,m));
  const st=()=>{const a=window.state._stagedActive||null;return a?{b:a.currentBeatIdx,g:!!a.gateShown,m:!!a.microShown}:null;};
  for(let i=0;i<240;i++){const c=st();if(!c||c.g)break;const p=c.b;try{window._advanceStagedBeat();}catch(_){}
    await sl(50);const n=st();if(n&&n.b===p&&!n.g){if(!n.m&&window._resolveMicroDecision){try{window._resolveMicroDecision(0);}catch(_){}await sl(70);}else await sl(100);}}});
let dl=Date.now()+180000;
while(Date.now()<dl){const m=await page.evaluate(()=>{const a=window.state._stagedActive;return !!(a&&a.plan&&a.plan.beats&&a.plan.beats.length);});if(m)break;await new Promise(r=>setTimeout(r,1000));}
await readToGate();
const cards=await page.evaluate(()=>{const o=Array.isArray(window.state.fateOptions)?window.state.fateOptions:[];
  return o.map((c,i)=>({i,title:c.title||c.label||null,action:(c.action||'').slice(0,120),
    desc:(c.desc||c.description||'').slice(0,120),variant:c._wishVariant||null,ordinary:!!c._ordinaryWish,id:c.id||null}));});
const before=authorReqs.length;
await page.evaluate(()=>{const el=document.querySelector('[data-card-index="0"]'); if(el) el.click(); try{window._advanceStagedScene('','');}catch(_){}});
dl=Date.now()+180000;
while(Date.now()<dl&&authorReqs.length<=before) await new Promise(r=>setTimeout(r,1000));
await b.close();
fs.mkdirSync('_audit_out/author_ctx',{recursive:true});
console.log('THE FIVE CARDS DEALT THIS SCENE (identity, action, fate mode):');
cards.forEach(c=>console.log('  ['+c.i+'] '+c.title+'  id='+c.id+'  variant='+(c.variant||'-')+'  ordinaryWish='+c.ordinary+'\n        action: '+c.action));
if(authorReqs.length<=before){ console.log('\nno author request captured'); process.exit(1); }
const r=authorReqs[authorReqs.length-1];
fs.writeFileSync('_audit_out/author_ctx/author_system.txt',r.sys);
fs.writeFileSync('_audit_out/author_ctx/author_user.txt',r.usr);
const all=r.sys+'\n'+r.usr;
console.log('\nAUTHOR REQUEST: system '+r.sys.length+' chars, user '+r.usr.length+' chars');
console.log('\nDID UNSELECTED CARDS REACH THE AUTHOR?');
cards.forEach(c=>{
  const sel = c.i===0;
  const byTitle = c.title && all.includes(c.title);
  const byAction = c.action && c.action.length>30 && all.includes(c.action.slice(0,60));
  console.log('  ['+c.i+'] '+(sel?'SELECTED  ':'unselected')+' "'+c.title+'"  titleInPayload='+byTitle+'  actionInPayload='+byAction);
});
['Petition','Tempt Fate','sacrifice','memory'].forEach(k=>console.log('  payload mentions "'+k+'": '+all.includes(k)));
console.log('\nartefacts: _audit_out/author_ctx/');
