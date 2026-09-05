// P1 SAVE→REOPEN E2E. Drives a REAL literary Scene-1 gen, resolves the demand/hint widget (real
// click → payoff aside + _scene1MicroPersist capture), saves the snapshot, then simulates reopen
// (JSON round-trip of state + StoryPagination.setPages — what continueStory/loadStoryData does) and
// asserts the resolved committed line + payoff aside come back. Confirms the CAPTURE half + round-trip.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/tmp/resume_e2e.json';
function log(...a){ console.error(...a); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked"}' }));
  page.on('console', m=>{ const t=m.text(); if (/AXIS-EXPANSION|DEMAND-HINT|SCENE1:SCAFFOLD.*micro|MICRO/i.test(t)) log('  >', t.slice(0,140)); });

  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(()=> window.state && typeof window.handleBeginStory==='function' && typeof window._reinjectScene1Micro==='function' && window.StoryPagination, { timeout:40000 });
  await page.waitForTimeout(500);

  await page.evaluate(()=>{
    window.__scenes=[];
    ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture','_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(fn=>{try{window[fn]=()=>Promise.resolve(null)}catch(_){}});
    window._auditSceneEmotionalGravity=function(pr){ try{ if(typeof pr==='string'&&pr.length>150) window.__scenes.push({text:pr}); }catch(_){} return Promise.resolve(null); };
    const s=window.state; window._devBypass=true; window._forceAudits=true;
    s.subscribed=true; s.fortunes=9999999; s.access='sub'; s._skipCorridorValidation=true;
    s.picks=s.picks||{}; s.picks.world='billionaire'; s.picks.flavor='affair'; s.picks.dynamic='enemies_to_lovers'; s.picks.worldSubtype='billionaire_modern'; s.picks.playermask='OPEN_VEIN';
    s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern'; s.dynamic='enemies_to_lovers';
    s.loveInterest='Male'; s.loveInterestName='Dorian'; s.liGender='male';
    s.archetype={primary:'DARK_VICE',modifier:null,bound:false,canonicalLIId:null,boundAtScene:null};
    s.playerMask='OPEN_VEIN'; s.playermask='OPEN_VEIN'; s.storyLength='affair'; s.tier='affair'; s.intensity='Steamy';
    s.name='Mara'; s.pov='first_person'; s.turnCount=0; s.playerName='Mara'; s.partnerName='Dorian';
    s.identity={playerName:'Mara',partnerName:'Dorian',displayPlayerName:'Mara',displayPartnerName:'Dorian'}; s.picks.identity=s.identity;
    try { const p=document.getElementById('playerNameInput'); if(p)p.value='Mara'; const l=document.getElementById('partnerNameInput'); if(l)l.value='Dorian'; } catch(_){}
    s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary';
    s.series_id=null; s.issueIndexInRun=1; s._prefMemory={}; s.storyId='resume-e2e-1';
  });

  log('[E2E] generating literary Scene 1 …');
  await page.evaluate(async ()=>{ try{ window.handleBeginStory(); }catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); } });
  { const t0=Date.now(); let ll=-1,st=0; while(Date.now()-t0<300000){ await page.waitForTimeout(3000); const s=await page.evaluate(()=>{const a=window.__scenes||[],l=a[a.length-1]||{},x=window.state;return{n:a.length,busy:!!(x._isAdvancingScene||x._stagedSubmitting),len:(l.text||'').length};}); if(s.n>=1&&!s.busy&&s.len>150){ if(s.len===ll){st+=3000;if(st>=6000)break;}else{ll=s.len;st=0;} } } }

  // wait for the micro widget to hydrate into a clickable pill, then click pole A (direct)
  const clicked = await page.evaluate(async ()=>{
    // give the hydrator a beat
    for (let i=0;i<20;i++){ const btn=document.querySelector('.scene1-micro-expr [data-sme-choice], .scene1-micro-expr button, .sme-choice'); if(btn) break; await new Promise(r=>setTimeout(r,300)); }
    const btn = document.querySelector('.scene1-micro-expr [data-sme-choice="A"]') || document.querySelector('.scene1-micro-expr [data-sme-choice]') || document.querySelector('.scene1-micro-expr button');
    if (!btn) return { ok:false, reason:'no pill button found', microHtml:(document.querySelector('.scene1-micro-expr')||{}).outerHTML||'(no micro node)' };
    btn.click();
    return { ok:true, choice: btn.getAttribute('data-sme-choice')||'?' };
  });
  await page.waitForTimeout(9000); // committed line (100ms) + async fallback aside + 1900ms re-capture + fetch

  // CAPTURE assertions + build the snapshot, then simulate reopen
  const result = await page.evaluate(()=>{
    const s = window.state; const r = { checks:{} };
    const pers = s._scene1MicroPersist;
    r.persist = pers ? { page:pers.page, widgetHtml:(pers.widgetHtml||'').slice(0,400), asideHtml:(pers.asideHtml||'').slice(0,400) } : null;
    r.checks.capture_present = !!(pers && pers.widgetHtml);
    r.checks.capture_resolved = !!(pers && /sme-resolved/.test(pers.widgetHtml||''));
    r.checks.capture_has_aside = !!(pers && /axis-expansion|demand-hint-expansion/.test(pers.asideHtml||''));
    r.sig = s.scene1DirectnessSignal;

    // Build the snapshot the way saveStorySnapshot does (shallow clean-state + pages), JSON round-trip it.
    const pages = window.StoryPagination.getPages();
    const snapshot = JSON.parse(JSON.stringify({ _scene1MicroPersist: s._scene1MicroPersist, storyPages: pages, scene1DirectnessSignal: s.scene1DirectnessSignal }));
    r.checks.snapshot_has_persist = !!(snapshot._scene1MicroPersist && snapshot._scene1MicroPersist.widgetHtml);

    // SIMULATE REOPEN: wipe the resolved DOM + persist, then restore from the snapshot (what
    // continueStory/loadStoryData does: assign snapshot fields to state + StoryPagination.setPages).
    window.StoryPagination.clear();
    s._scene1MicroPersist = null; s.scene1DirectnessSignal = null;
    // restore
    s._scene1MicroPersist = snapshot._scene1MicroPersist;
    s.scene1DirectnessSignal = snapshot.scene1DirectnessSignal;
    window.StoryPagination.setPages(snapshot.storyPages);   // → renderCurrentPage → _reinjectScene1Micro fires
    return r;
  });
  await page.waitForTimeout(600);

  // POST-REOPEN assertions on the rendered DOM
  const post = await page.evaluate(()=>{
    const host = document.querySelector('#storyPagesContainer .story-page.active') || document.getElementById('storyPagesContainer');
    const micro = host ? host.querySelector('.scene1-micro-expr') : null;
    const aside = host ? host.querySelector('.axis-expansion, .demand-hint-expansion') : null;
    return {
      microResolved: !!(micro && micro.classList.contains('sme-resolved')),
      microText: micro ? (micro.textContent||'').trim().slice(0,120) : '(no micro node)',
      asidePresent: !!aside,
      asideText: aside ? (aside.textContent||'').trim().slice(0,120) : '',
      genericFlatGone: !!(host && !/You could .* Or .* without words/i.test(host.textContent||''))
    };
  });
  result.checks.reopen_micro_resolved = post.microResolved;
  result.checks.reopen_aside_restored = post.asidePresent;
  result.post = post;

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify({ clicked, ...result }, null, 1));
  const c = result.checks; const line=(n,v)=>log(`  ${v?'✓':'✗'}  ${n}`);
  log('\n=== P1 SAVE→REOPEN E2E ===');
  log('  clicked pill: '+JSON.stringify(clicked));
  line('CAPTURE: _scene1MicroPersist populated on resolve', c.capture_present);
  line('CAPTURE: widget captured in RESOLVED state (sme-resolved)', c.capture_resolved);
  line('CAPTURE: payoff aside captured', c.capture_has_aside);
  line('ROUND-TRIP: persist survives JSON snapshot serialize', c.snapshot_has_persist);
  line('REOPEN: micro restored to RESOLVED (not generic flat)', c.reopen_micro_resolved);
  line('REOPEN: payoff aside restored', c.reopen_aside_restored);
  log('\n  post-reopen micro: '+JSON.stringify(post.microText));
  log('  post-reopen aside: '+JSON.stringify(post.asideText));
  const core = c.capture_present && c.snapshot_has_persist && c.reopen_micro_resolved && c.reopen_aside_restored;
  log(`\nWROTE ${OUT}`);
  log(`RESULT: ${core ? '✓ P1 CONFIRMED end-to-end (capture + round-trip + reopen restore)' : '✗ inspect JSON'}`);
})().catch(e=>{ console.error('DRIVER-ERR', e.message); process.exit(1); });
