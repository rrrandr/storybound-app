// _cascade_audit.mjs — Roman's cascade audit (2026-08-01): ONE generation with the semantic checksum ON.
// Logs which CRITICAL reader-facts survive after each cascade pass → pinpoints any stage that DELETES meaning.
import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true,channel:'chrome'});
const p=await(await b.newContext({viewport:{width:1100,height:800}})).newPage();
const stage=[],contract=[];
p.on('console',m=>{const t=m.text();if(/STAGE-CHECKSUM/.test(t))stage.push(t);if(/\[CONTRACT/.test(t))contract.push(t);});
p.on('pageerror',e=>console.log('PAGEERR',e&&e.message));
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window.state&&typeof window._launchStarterStory==='function'&&typeof window._contractStageCheck==='function',{timeout:30000});
await p.evaluate(()=>{const s=window.state;s.subscribed=true;s.fortunes=9999999;s.access='sub';window._devBypass=true;
  window.__forceHeavyBuild=true;window.__disableSpeculativePreload=true;window._forceDeckMandate=false;window.__disableSeedGrounding=false;window.__disableSceneContract=false;
  window.__contractStageAudit=true; // ← the audit switch
  try{window.generateImageWithFallback=async()=>'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';}catch(_){}
  window.__capturedPages=[];window.__lastPageAt=0;
  const SP=window.StoryPagination;if(SP&&SP.addPage&&!SP.__wrapped){const r=SP.addPage.bind(SP);SP.addPage=function(h,n){try{window.__capturedPages.push(String(h||''));window.__lastPageAt=Date.now();}catch(_){}return r(h,n);};SP.__wrapped=true;}
});
try{await p.evaluate(async()=>{const def=(window.STARTER_STORIES||[]).find(d=>d.id==='starter_first_sacrifice');await Promise.race([window._launchStarterStory(def),new Promise((_,r)=>setTimeout(()=>r(new Error('to')),480000))]);});}catch(_){}
try{await p.waitForFunction(()=>(window.__capturedPages||[]).length>=1&&(Date.now()-(window.__lastPageAt||0))>9000&&!window.state._isAdvancingScene,{timeout:300000,polling:2000});}catch(_){}
const fin=await p.evaluate(()=>{const pub=(window.__capturedPages||[]).join('\n\n');const c=window._deriveReaderContract();const v=window._verifySceneContract(String(pub).replace(/<[^>]+>/g,' '),c)||[];const crit=v.filter(x=>x.priority==='CRITICAL');return{present:crit.filter(x=>x.pass).map(x=>x.id),n:crit.filter(x=>x.pass).length,total:crit.length,words:String(pub).replace(/<[^>]+>/g,' ').split(/\s+/).filter(Boolean).length,checksums:window.__stageChecksums||[]};});
console.log('\n════ CASCADE AUDIT — semantic checksum per stage ════\n');
contract.filter(l=>/START|DONE|REPAIR/.test(l)).forEach(l=>console.log('  '+l));
console.log('');
stage.forEach(l=>console.log('  '+l));
console.log('  [PUBLISHED] CRITICAL '+fin.n+'/'+fin.total+' ['+fin.present.join(',')+'] · '+fin.words+'w');
console.log('\n→ any stage where CRITICAL count DROPS is a hidden second author (semantic violation).');
await b.close();process.exit(0);
