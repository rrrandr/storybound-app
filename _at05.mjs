// NEAR-FREE. Mocks the AUTHOR response with Arm R's captured Scene-1 prose, then lets the
// real post-author stack run. Spend = only the _cheapLineEdit calls we are trying to count.
import { chromium } from 'playwright-core';
import fs from 'fs';
const log=(...a)=>console.error(...a);
const OUT='_validate_out/at05_r1'; fs.mkdirSync(OUT,{recursive:true});
const RAW = fs.readFileSync('_validate_out/authority_audit_R/raw_author_1.txt','utf8');
const isAuthor=(sys,usr,model)=>/STORYBOUND ARCHITECTURE LAWS/.test(sys)||/grok-4\.3/.test(String(model||''));
let spend=0, authorMocked=0, apiCalls=[];

const browser=await chromium.launch({headless:true});
const page=await (await browser.newContext()).newPage();
for (const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
  await page.route(p,r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));

await page.route('**/api/**', async route => {
  const r=route.request(); if(r.method()!=='POST') return route.continue();
  let b=null; try{b=JSON.parse(r.postData()||'{}');}catch(_){return route.continue();}
  const msgs=b.messages||[];
  const sys=String((msgs.find(m=>m.role==='system')||{}).content||'');
  const usr=String((msgs.find(m=>m.role==='user')||{}).content||'');
  const model=String(b.model||b.preferredModel||'');
  if(isAuthor(sys,usr,model)){
    authorMocked++;
    try { fs.writeFileSync(`${OUT}/payload_${authorMocked}.txt`, sys+'\n=====USER=====\n'+usr); } catch(_){}
    const resp = await route.fetch({timeout:0});
    const bodyTxt = await resp.text();
    try { const j=JSON.parse(bodyTxt); const c=j.choices?.[0]?.message?.content ?? j.content;
      const txt=Array.isArray(c)?c.filter(x=>x&&x.type==='text').map(x=>x.text).join(''):String(c||'');
      if(txt&&txt.length>200){ fs.writeFileSync(`${OUT}/raw_author_${authorMocked}.txt`,txt);
        log(`  [author ${authorMocked}] REAL — ${txt.length} chars captured`); }
    } catch(_){}
    return route.fulfill({response:resp, body:bodyTxt});
  }
  apiCalls.push({model, sysLen:sys.length, usrLen:usr.length});
  return route.continue();   // REAL — line edits etc.
});
page.on('console',m=>{const t=m.text();const mm=t.match(/Finalized: \$([0-9.]+)/); if(mm) spend+=parseFloat(mm[1]);
  if(/SCENE-BUDGET|cheap-edit|LINE-EDIT|targeted|HOT-RENDER|LI-PROOF|PC-PICT|CONTRACT|TENSION GATE|DECISION|AUTHORITY|PAYLOAD-PREFLIGHT|MD-LEAK/i.test(t)){try{fs.appendFileSync(OUT+'/budget.log',t.slice(0,220)+'\n');}catch(_){}}});

await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:60000});
await page.waitForFunction(()=>window.state&&window.STARTER_STORIES,{timeout:90000});
await page.waitForTimeout(600);
await page.evaluate(()=>{
  const s=window.state;
  window.__cheapEditTrace=[]; window.__textSnap=[]; window.__rawSnap=[]; window.__proseSnap=[];
  window._devBypass=true; s.picks=s.picks||{};
  const def=(window.STARTER_STORIES||[]).find(d=>d&&d.id==='starter_first_sacrifice');
  ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>s.picks[k]=def[k]);
  Object.assign(s,{world:def.world,worldSubtype:def.worldSubtype,flavor:def.flavor,dynamic:def.dynamic,
    _starterId:def.id,is_starter_story:true,immutableTitle:def.title,
    archetype:{primary:def.archetype,modifier:null},name:'Lirael',playerName:'Lirael',
    loveInterestName:'Julian',partnerName:'Julian',loveInterest:'Male',liGender:'male',
    playerMask:'OPEN_VEIN',storyLength:'fling',tier:'fling',access:'sub',subscribed:true,
    fortunes:9999999,previewActive:false,_skipCorridorValidation:true,intensity:'Steamy',
    pov:'first_person',identity:{playerName:'Lirael',partnerName:'Julian'},
    _pcLookSkipped:true,pcLookLocked:true,renderMode:'literary',currentEngine:'literary'});
  s.picks.identity=s.identity;
  if(typeof window.scheduleSpeculativePreload==='function') window.scheduleSpeculativePreload=function(){};
});
const pageText=()=>page.evaluate(()=>(window.StoryPagination.getPages()||[]).join('\n').replace(/<[^>]+>/g,'').trim());
const _instr = await page.evaluate(() => ({
  rawSnap: Array.isArray(window.__rawSnap), textSnap: Array.isArray(window.__textSnap),
  proseSnap: Array.isArray(window.__proseSnap), cheapTrace: Array.isArray(window.__cheapEditTrace),
  audit: typeof window._auditMutation === 'function', finalAudit: typeof window._finalProseAudit === 'function',
  contracts: !!window.MUTATION_CONTRACTS }));
const _missing = Object.entries(_instr).filter(([,v]) => !v).map(([k]) => k);
log('[preflight] instrumentation ' + JSON.stringify(_instr));
if (_missing.length) { await browser.close();
  throw new Error('ABORT BEFORE SPEND — instrumentation missing: ' + _missing.join(', ')); }
log('[run] Scene 1 with MOCKED author…');
await page.evaluate(()=>window.handleBeginStory());
for(let w=0;w<600000;w+=4000){await page.waitForTimeout(4000); if((await pageText()).length>1200) break;}
await page.waitForTimeout(14000);
const res=await page.evaluate(()=>({
  trace:(window.__cheapEditTrace||[]),
  text:(window.__textSnap||[]).map(r=>({site:r.site,label:r.label,cls:r.mutationClass,
    before:String(r.before||''),after:String(r.after||'')})),
}));
fs.writeFileSync(OUT+'/trace.json',JSON.stringify(res.trace,null,1));
fs.writeFileSync(OUT+'/textsnap.json',JSON.stringify(res.text,null,1));
try {
  const ps = await page.evaluate(() => (window.__proseSnap||[]).filter(r=>r.changed)
    .map(r=>({ label:r.owner, sub:r.label, before:String(r.inText||''), after:String(r.outText||'') })));
  fs.writeFileSync(OUT+'/prosesnap_full.json', JSON.stringify(ps,null,1));
  console.log('  __proseSnap changed: ' + ps.length + (ps.length ? '  ['+ps.map(x=>x.label+(x.sub?'/'+x.sub:'')).join(', ')+']' : ''));
} catch(e){ console.log('  proseSnap dump FAILED: '+e.message); }
try {
  const rt = await page.evaluate(() => ({
    violations:(window.state&&window.state._authorityViolations)||[],
    preflight:(window.state&&window.state._payloadPreflight)||[],
    reports:(window.state&&window.state._validatorReports)||[] }));
  fs.writeFileSync(OUT+'/runtime.json', JSON.stringify(rt,null,1));
  console.log('  runtime — violations:'+rt.violations.length+' preflight:'+rt.preflight.length+' reports:'+rt.reports.length);
} catch(e){ console.log('  runtime dump failed: '+e.message); }
try {
  const full = await page.evaluate(() => (window.__rawSnap||[]).filter(r=>r.changed)
    .map(r=>({label:r.label,before:String(r.before||''),after:String(r.after||'')})));
  fs.writeFileSync(OUT+'/rawsnap_full.json', JSON.stringify(full,null,1));
} catch(_){}
fs.writeFileSync(OUT+'/final.txt',await pageText());
console.log('\n════ CHEAP-EDIT TRACE ════');
console.log('  author calls mocked :',authorMocked,'(spend avoided)');
console.log('  _cheapLineEdit calls:',res.trace.length);
res.trace.forEach((t,i)=>console.log(`    ${i+1}. ${String(t.label||'(no label)').padEnd(30)} in=${t.inLen}`));
console.log('  __textSnap records  :',res.text.length,' changed:',res.text.filter(r=>r.before&&r.before!==r.after).length);
console.log('  app-reported spend  : $'+spend.toFixed(4));
await browser.close();
