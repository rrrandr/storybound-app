// Lane-2 fresh capture: 2 stories x 2 continuation turns = 4 unread scenes.
// PRE-REGISTERED: exploratory n=4, CLUSTERED 2x2 (not 4 independent), RAW-vs-FINAL primary,
// intermediates + mutation counts SEALED, null result non-conclusive. Hard cap $1.00.
import { chromium } from 'playwright-core';
import fs from 'fs'; import crypto from 'crypto';
import { checkConservation } from './_conservation.mjs';
// IMMUTABLE EVIDENCE (2026-08-17): one file per scene attempt, never overwritten. A fixed filename
// destroyed B/t2's failing chain when the next run aborted. Manifest indexes; artifacts are append-only.
const RUN_ID = crypto.randomBytes(4).toString('hex') + '-' + Date.now();
const EVID = '_validate_out/evidence';
fs.mkdirSync(EVID, {recursive:true});
function persistScene(rec){
  const name = `${EVID}/${RUN_ID}__${rec.story}_t${rec.turn}__${crypto.randomBytes(3).toString('hex')}.json`;
  if (fs.existsSync(name)) throw new Error('evidence collision: ' + name);
  fs.writeFileSync(name, JSON.stringify(rec, null, 2));
  const man = `${EVID}/manifest.jsonl`;
  fs.appendFileSync(man, JSON.stringify({runId:RUN_ID, story:rec.story, turn:rec.turn,
    conserves:rec.conserves, reason:(rec.conservation&&rec.conservation.reason)||null,
    events:(rec.allEvents||[]).length, spend:rec.spend, file:name}) + '\n');
  return name;
}
const CAP=Number(process.env.CAP||1.00);          // BUDGET GATE, not a hard cap: cannot interrupt an
const PER_SCENE_EST=0.35;                          // in-flight request. Conservative per-scene estimate. const h=t=>crypto.createHash('sha256').update(String(t||'')).digest('hex').slice(0,10);
const prior=JSON.parse(fs.readFileSync('/tmp/arm_gen.json','utf8')).scenes;
const ONE = process.env.ONE_SCENE === '1';
const FOUR = process.env.SCENE4 === '1';
const THREE = process.env.THREE_SCENES === '1';
const TWO = process.env.TWO_SCENES === '1';
const STORIES = TWO
  ? [{id:'E', modern:false, pc:'Lirael', li:'Julian', turns:['I break the seal and read it aloud.','I put the letter in the fire.']}]
  : FOUR
  ? [{id:'D', modern:true, pc:'Mara', li:'Dorian', turns:['I tell him the truth about the letter.']}]
  : THREE
  ? [{id:'B', modern:true,  pc:'Mara',   li:'Dorian', turns:['I hand him the letter.','I walk out before he can answer.']},
     {id:'C', modern:false, pc:'Lirael', li:'Julian', turns:['I corner the gatekeeper and demand the road he took.']}]
  : ONE
  ? [{id:'A', modern:false, pc:'Lirael', li:'Julian', turns:['I go to the market stall to pass the note.']}]
  : [{id:'A', modern:false, pc:'Lirael', li:'Julian',
      turns:['I go to the market stall to pass the note.','I follow the road he took.']},
     {id:'B', modern:true,  pc:'Mara',   li:'Dorian',
      turns:['I hand him the letter.','I walk out before he can answer.']}];
let spend=0, abort=false; const results=[]; const log=(...a)=>console.error(...a);
const browser=await chromium.launch({headless:true});
for (const st of STORIES) {
  if (abort) { log('ABORT flag set — no further stories'); break; }
  if (spend+PER_SCENE_EST>CAP) { log('BUDGET GATE — aborting before next story'); abort=true; break; }
  const page=await (await browser.newContext()).newPage();
  for(const p of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(p,r=>r.fulfill({status:500,contentType:'application/json',body:'{}'}));
  let authorRaw=null;
  await page.route('**/api/**', async route=>{
    const r=route.request(); if(r.method()!=='POST') return route.continue();
    let b=null; try{b=JSON.parse(r.postData()||'{}');}catch(_){return route.continue();}
    const sys=String(((b.messages||[]).find(m=>m.role==='system')||{}).content||'');
    const usr=String(((b.messages||[]).find(m=>m.role==='user')||{}).content||'');
    if(!(/STORYBOUND ARCHITECTURE LAWS/.test(sys)||sys.length+usr.length>120000)) return route.continue();
    const resp=await route.fetch({timeout:0}); const body=await resp.text();
    try{const j=JSON.parse(body); const c=j.choices?.[0]?.message?.content??j.content;
      authorRaw=Array.isArray(c)?c.filter(x=>x&&x.type==='text').map(x=>x.text).join(''):String(c||'');}catch(_){}
    return route.fulfill({response:resp,body});
  });
  page.on('console',m=>{const t=m.text();
    const mm=t.match(/\[SCENE-COST\] Finalized: \$([0-9.]+)/); if(mm) spend+=parseFloat(mm[1]);});
  await page.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
  await page.waitForFunction(()=>window.state&&window.StoryPagination,{timeout:40000});
  await page.evaluate((c)=>{
    const s=window.state; window._devBypass=true; s.picks=s.picks||{};
    if(c.modern){ s.picks.world='billionaire'; s.picks.worldSubtype='billionaire_modern';
      s.picks.flavor='billionaire_modern'; s.world='billionaire'; s.worldSubtype='billionaire_modern';
      s.flavor='billionaire_modern'; s.picks.dynamic='enemies_to_lovers'; s.dynamic='enemies_to_lovers';
      s.archetype={primary:'DARK_VICE',modifier:null};
    } else { const d=(window.STARTER_STORIES||[]).find(x=>x&&x.id==='starter_first_sacrifice');
      ['world','worldSubtype','pressure','flavor','tone','pov','length','dynamic','pcSpecies','liSpecies'].forEach(k=>s.picks[k]=d[k]);
      s.world=d.world; s.worldSubtype=d.worldSubtype; s.flavor=d.flavor; s.dynamic=d.dynamic;
      s._starterId=d.id; s.is_starter_story=true; s.immutableTitle=d.title;
      s.archetype={primary:d.archetype,modifier:null}; }
    s.name=c.pc; s.playerName=c.pc; s.loveInterestName=c.li; s.partnerName=c.li;
    s.loveInterest='Male'; s.liGender='male'; s.playerMask='OPEN_VEIN'; s.storyLength='fling';
    s.tier='fling'; s.access='sub'; s.subscribed=true; s.fortunes=9999999; s.previewActive=false;
    s._skipCorridorValidation=true; s.intensity='Steamy'; s.pov='first_person';
    s.identity={playerName:c.pc,partnerName:c.li}; s.picks.identity=s.identity;
    s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.currentEngine='literary';
  },st);
  log('[fresh] story '+st.id+' init…');
  await page.evaluate(()=>window.handleBeginStory());
  for(let w=0;w<700000;w+=3000){await page.waitForTimeout(3000);
    if(await page.evaluate(()=>((window.StoryPagination.getPages()||[]).join('').length>1200)))break;}
  await page.waitForTimeout(4000);
  for (let t=0;t<st.turns.length;t++) {
    if (abort) break;
    if (spend+PER_SCENE_EST>CAP) { log('BUDGET GATE — next scene would exceed authorization ($'+spend.toFixed(3)+'+'+PER_SCENE_EST+' > $'+CAP+'); aborting'); abort=true; break; }
    authorRaw=null;
    await page.evaluate(()=>{ window.__proseSnap=[]; window.__rawSnap=[]; const s=window.state;
      s.speculativeNextScene=null;
      if(typeof window.scheduleSpeculativePreload==='function') window.scheduleSpeculativePreload=function(){};
      s._cliffhangerContinueAuthorized=true; s._isAdvancingScene=false;
      s._petitionEmergenceFired=true; s._deckExamineFired=true; });
    const pages0=await page.evaluate(()=>(window.StoryPagination.getPages()||[]).length);
    await page.evaluate(a=>{document.getElementById('actionInput').value=a;
      document.getElementById('dialogueInput').value='';const b=document.getElementById('submitBtn');
      b.disabled=false;b.click();},st.turns[t]);
    let ok=false;
    for(let w=0;w<700000;w+=3000){await page.waitForTimeout(3000);
      if(await page.evaluate(n=>(window.StoryPagination.getPages()||[]).length>n,pages0)){ok=true;break;}}
    await page.waitForTimeout(5000);
    const snaps=await page.evaluate(()=>window.__rawSnap||[]);
    const usedSpeculative=await page.evaluate(()=>!!(window.state&&window.state.__usedSpeculative));
    if(usedSpeculative){ log('  ⚠ SPECULATIVE HIT — ABORTING ENTIRE RUN'); abort=true; break; }
    const FIN=await page.evaluate(()=>String((window.state&&window.state._lastCommittedProse)||
      (window.state&&window.state._priorSceneText)||''));
    const authorReturn=snaps.filter(x=>x.sid==='AUTHOR_RETURN').pop();
    const finalProse=snaps.filter(x=>x.site==='FINAL_PROSE').pop();
    const retained=snaps.filter(s=>s.changed&&s.after&&s.sid!=='AUTHOR_RETURN');
    const RAW=authorRaw;   // TRUE author output, captured at the network layer
    const firstHookIn=(snaps[0]&&snaps[0].inText)||null;
    const preHookGap = (RAW&&firstHookIn)? (RAW!==firstHookIn) : null;
    if(!ok||!FIN){ log('  ⚠ story '+st.id+' turn '+(t+1)+' ANOMALY — halting'); break; }
    // conservation per scene: any gap invalidates THIS scene
    const _cons = checkConservation(snaps, RAW);
    const conserves = _cons.ok;
    log('    conservation: '+JSON.stringify(_cons));
    if(!conserves){ log('  ⚠ CONSERVATION FAILED for '+st.id+'/t'+(t+1)+' — ABORTING ENTIRE RUN');
      // persist the FAILING chain so the gap is diagnosable for free
      const _recF={story:st.id,turn:t+1,conserves:false,conservation:_cons,grokRaw:RAW,
        authorReturn:authorReturn&&authorReturn.after, final:finalProse&&finalProse.after,
        rawSource:'live-author', spend, allEvents:snaps,
        checkpoints:retained.map(x=>({sid:x.sid,label:x.label,mutationClass:x.mutationClass,
          before:x.before, after:x.after}))};
      results.push(_recF); log('    evidence: '+persistScene(_recF));

      abort=true; break; }
    const _recOK={story:st.id, turn:t+1, conserves, conservation:_cons, rawSource:'live-author', spend,
      allEvents:snaps, grokRaw:RAW, authorReturn:authorReturn&&authorReturn.after,
      final:(finalProse&&finalProse.after)||FIN, conserves,
      checkpoints:retained.map(s=>({sid:s.sid,label:s.label,mutationClass:s.mutationClass,text:s.after}))};
    results.push(_recOK); log('    evidence: '+persistScene(_recOK));
    Object.assign(_recOK, { firstHookIn, preHookGap, mutationCount:retained.length,
      rejected:snaps.filter(s=>s.rejected).length,
      noChange:snaps.filter(s=>!s.changed&&!s.rejected).length });

    log('  story '+st.id+' turn '+(t+1)+': retained='+retained.length+'  authorRaw='+(RAW?RAW.length:'MISSED')+' firstHookIn='+(firstHookIn?firstHookIn.length:'-')+' preHookGap='+preHookGap+' final='+FIN.length+'  spend=$'+spend.toFixed(3));
  }
  await page.close();
  if (abort) break;
}
await browser.close();
// SEALED metadata (identity, mutation counts, checkpoints) — separate from the blind pack
fs.writeFileSync('_validate_out/lane2_scene4_SEALED.json',JSON.stringify({results,spend},null,2));
// BLIND PACK: RAW vs FINAL only, opaque labels, order shuffled per scene
const pack=results.map((r,i)=>{const flip=crypto.randomBytes(1)[0]%2===0;
  return {scene:'S'+(i+1), X: flip?r.grokRaw:r.final, Y: flip?r.final:r.grokRaw, _key: flip?'X=GROK_RAW':'X=FINAL_PROSE'};});
fs.writeFileSync('_validate_out/lane2_blind_KEY.json',JSON.stringify(pack.map(p=>({scene:p.scene,key:p._key})),null,2));
fs.writeFileSync('_validate_out/lane2_blind_pack.json',JSON.stringify(pack.map(({_key,...p})=>p),null,2));
console.log('\n════ LANE-2 FRESH CAPTURE ════');
results.forEach(r=>console.log('  '+r.story+'/t'+r.turn+'  retained='+r.mutationCount
  +' rejected='+r.rejected+' noChange='+r.noChange+'  raw='+(r.raw?r.raw.length:'?')+' final='+r.final.length));
console.log('  scenes captured: '+results.length+'/4   total spend: $'+spend.toFixed(3)+' (cap $'+CAP.toFixed(2)+')');
console.log('  blind pack → _validate_out/lane2_blind_pack.json   key sealed separately');
