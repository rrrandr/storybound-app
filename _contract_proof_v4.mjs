// _contract_proof.mjs — FALSIFICATION TEST (Roman 2026-08-01). H1 placement-first↑comprehension,
// H2 guard prevents late-pass regression, H3 efficiency 20-40% (not 2×). Captures guard interventions +
// Julian on-page. Incremental jsonl. Merge-quality decision, not a victory lap.
import fs from 'fs';
import { chromium } from 'playwright-core';
const OUT='/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/author_ab';
const N=parseInt(process.argv[2]||'8',10),URL='http://localhost:3000/';
const log=(...a)=>console.log(...a);
const strip=h=>String(h||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&[a-z]+;/g,' ').replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
const wc=s=>String(s||'').split(/\s+/).filter(Boolean).length;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const JUDGE=`You audit ONE Scene-1 opening for first-time-reader COMPREHENSION. Return ONLY JSON:
{"comprehension":{"whatIsFirstFavored":{"answerable":true/false},"whyYouthKneeling":{"answerable":true/false},"whyEveryoneWatching":{"answerable":true/false},"whyJulianMatters":{"answerable":true/false},"narratorJob":{"answerable":true/false},"whatIfWrongCall":{"answerable":true/false},"whyPublic":{"answerable":true/false}}}
Judge as a reader who has NEVER seen this world — 'answerable' TRUE only if THIS scene conveys it. Be strict. No fences.`;
const JSONL=OUT+'/contract_proof_v4_tensionoff.jsonl'; try{fs.unlinkSync(JSONL);}catch(_){}
async function serverUp(){try{const r=await fetch(URL,{signal:AbortSignal.timeout(4000)});return r.ok||r.status<500;}catch(_){return false;}}
async function waitServer(t){for(let k=0;k<t;k++){if(await serverUp())return true;log('  [server down '+(k+1)+'/'+t+']');await sleep(10000);}return false;}
const browser=await chromium.launch({headless:true,channel:'chrome'});
const page=await(await browser.newContext({viewport:{width:1100,height:800}})).newPage();
const clog=[];page.on('console',m=>{const t=m.text();if(/\[CONTRACT|OBLIGATION-GUARD/.test(t))clog.push(t);});
async function gen(){
  clog.length=0;
  await page.goto(URL,{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.state&&typeof window._launchStarterStory==='function'&&typeof window._verifySceneContract==='function',{timeout:30000});
  await page.evaluate(()=>{const s=window.state;s.subscribed=true;s.fortunes=9999999;s.access='sub';window._devBypass=true;
    window.__forceHeavyBuild=true;window.__disableSpeculativePreload=true;window._forceDeckMandate=false;window.__disableSeedGrounding=false;window.__disableSceneContract=false;window.__obligationGuardLog=[];window._tensionRegenAttempts=0;
    try{window.generateImageWithFallback=async()=>'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';}catch(_){}
    window.__capturedPages=[];window.__lastPageAt=0;
    const SP=window.StoryPagination;if(SP&&SP.addPage&&!SP.__wrapped){const r=SP.addPage.bind(SP);SP.addPage=function(h,n){try{window.__capturedPages.push(String(h||''));window.__lastPageAt=Date.now();}catch(_){}return r(h,n);};SP.__wrapped=true;}
  });
  try{await page.evaluate(async()=>{const def=(window.STARTER_STORIES||[]).find(d=>d.id==='starter_first_sacrifice');await Promise.race([window._launchStarterStory(def),new Promise((_,r)=>setTimeout(()=>r(new Error('to')),480000))]);});}catch(_){}
  try{await page.waitForFunction(()=>(window.__capturedPages||[]).length>=1&&(Date.now()-(window.__lastPageAt||0))>9000&&!window.state._isAdvancingScene,{timeout:300000,polling:2000});}catch(_){}
  const d=await page.evaluate(()=>{
    const published=(window.__capturedPages||[]).join('\n\n');const c=window._deriveReaderContract();
    const vP=window._verifySceneContract(String(published).replace(/<[^>]+>/g,' '),c)||[];
    const vf=t=>{const v=window._verifySceneContract(String(t||'').replace(/<[^>]+>/g,' '),c)||[];return{crit:v.filter(x=>x.pass&&x.priority==='CRITICAL').length};};
    const draft=window.state._contractDraftText||'',repaired=window.state._contractRepairedText||'';
    return {published,draft,repaired,vDraft:draft?vf(draft):null,vRepaired:repaired?vf(repaired):null,
      pubCrit:vP.filter(x=>x.pass&&x.priority==='CRITICAL').length, pubCritIds:vP.filter(x=>x.pass&&x.priority==='CRITICAL').map(x=>x.id),
      pubFailIds:vP.filter(x=>!x.pass&&x.priority==='CRITICAL').map(x=>x.id),
      liOnPage:!!(vP.find(x=>x.id==='li_onpage')||{}).pass,
      econ:window.state._lastSceneContractEcon||[],result:window.state._lastSceneContractResult||null,guardLog:window.__obligationGuardLog||[]};
  });
  d.published=strip(d.published);d.logs=clog.slice();return d;
}
async function judge(prose){return await page.evaluate(async({prose,JUDGE})=>{try{const r=await fetch('/api/chatgpt-proxy',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'same-origin',body:JSON.stringify({messages:[{role:'system',content:JUDGE},{role:'user',content:'OPENING:\n\n'+prose}],role:'PRIMARY_AUTHOR',model:'gpt-4o',temperature:0,max_tokens:600,jsonMode:true})});if(!r.ok)return null;const j=await r.json();return(j&&j.content)||(j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content)||null;}catch(_){return null;}},{prose,JUDGE});}
const rows=[];
if(!await waitServer(6)){log('SERVER DOWN — aborting before spend.');await browser.close();process.exit(1);}
for(let i=0;i<N;i++){
  if(!await waitServer(12)){log('['+(i+1)+'/'+N+'] server unrecoverable — stopping, '+rows.length+' saved.');break;}
  try{
    const d=await gen();
    if(!d.published||wc(d.published)<40){log('['+(i+1)+'/'+N+'] empty — skip.');continue;}
    let comp=null;const raw=await judge(d.published);try{comp=JSON.parse(String(raw).replace(/```json?/gi,'').replace(/```/g,'').trim());}catch(_){}
    const compN=comp?Object.values(comp.comprehension||{}).filter(x=>x&&x.answerable).length:null;
    const dW=wc(d.draft),rW=wc(d.repaired),pW=wc(d.published);
    const plans=(d.econ||[]).flatMap(e=>e.repairPlan||[]);
    const addedWords=(d.econ||[]).reduce((a,e)=>a+(e.addedWords>0?e.addedWords:0),0);
    const newlySat=(d.econ||[]).reduce((a,e)=>a+((e.newlySatisfied||[]).length),0);
    const row={i,firstDraftCrit:d.vDraft?d.vDraft.crit:null,postLoopCrit:d.vRepaired?d.vRepaired.crit:(d.result?d.result.criticalTotal-d.result.criticalRemaining:null),
      pubCrit:d.pubCrit,pubFailIds:d.pubFailIds,draftWords:dW,repairedWords:rW,publishedWords:pW,
      growthPct:(dW&&pW)?Math.round(100*(pW-dW)/dW):null,loops:(d.econ||[]).length,addedWords,newlySat,
      wPerObl:newlySat?+(addedWords/newlySat).toFixed(1):null,compN,liOnPage:d.liOnPage,
      guardCount:(d.guardLog||[]).length,guardPasses:(d.guardLog||[]).map(g=>g.pass),
      repairPlans:plans,econ:d.econ,prose:{draft:d.draft,repaired:d.repaired,published:d.published},logs:d.logs};
    rows.push(row);fs.appendFileSync(JSONL,JSON.stringify(row)+'\n');
    log(`[${i+1}/${N}] CRIT draft ${row.firstDraftCrit}→loop ${row.postLoopCrit}→PUB ${row.pubCrit}/4 · ${dW}→${pW}w(${row.growthPct>=0?'+':''}${row.growthPct}%) · ${row.loops}loop ${row.wPerObl}w/obl · comp ${compN}/7 · guard ${row.guardCount}[${row.guardPasses.join(',')}] · Jↀ${row.liOnPage?'Y':'n'}`);
  }catch(e){log('['+(i+1)+'/'+N+'] error: '+(e&&e.message)+' — skip.');}
}
const M=(k,f)=>{const v=rows.map(r=>r[k]).filter(x=>x!=null&&(f?f(x):true));return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;};
const guardTotal=rows.reduce((a,r)=>a+(r.guardCount||0),0);
const guardPassCounts={};rows.forEach(r=>(r.guardPasses||[]).forEach(p=>guardPassCounts[p]=(guardPassCounts[p]||0)+1));
log('\n════ A/B: TENSION REGEN OFF (completed '+rows.length+'/'+N+') ════');
log('Published CRITICAL /4 : '+(M('pubCrit')||0).toFixed(2));
log('GPT comprehension /7  : '+(M('compN')||0).toFixed(2));
log('Published words       : '+(M('publishedWords')||0).toFixed(0));
log('Growth %              : '+(M('growthPct')||0).toFixed(0));
log('Repair words/obligation: '+(M('wPerObl')||0).toFixed(1));
log('Repair loops          : '+(M('loops')||0).toFixed(2));
log('Guard interventions   : '+guardTotal+' total across '+rows.length+' runs · passes '+JSON.stringify(guardPassCounts));
log('Julian on-page        : '+rows.filter(r=>r.liOnPage).length+'/'+rows.length+' ('+Math.round(100*rows.filter(r=>r.liOnPage).length/(rows.length||1))+'%)');
log('post-loop→published CRIT delta (regression): '+((M('postLoopCrit')||0)-(M('pubCrit')||0)).toFixed(2));
log('published 0/4 runs (failure mode): '+rows.filter(r=>r.pubCrit===0).length+'/'+rows.length);
const failIds={};rows.forEach(r=>(r.pubFailIds||[]).forEach(id=>failIds[id]=(failIds[id]||0)+1));
log('hardest obligations (published FAIL counts): '+JSON.stringify(failIds));
fs.writeFileSync(OUT+'/contract_proof_v4_tensionoff.json',JSON.stringify(rows,null,2));
log('\nsaved → contract_proof_v4_tensionoff.json ('+rows.length+' runs)');
await browser.close();process.exit(0);
