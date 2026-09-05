// Scene-1 HOT-render measurement (R4 #1). Mirrors the PROVEN _issue_gen.js Scene-1
// setup (which reliably generates) + forces HOT_CRISIS, and captures the rendered-
// temperature telemetry + the new HOT-render repair outcome. Scene-1-ONLY.
//   N=6 node _hot_render_measure.js
const { chromium } = require('playwright-core');
const N = parseInt(process.env.N, 10) || 6;
const ARCHES = ['SPELLBINDER','DARK_VICE','ARMORED_FOX','HEART_WARDEN','OPEN_VEIN','BEAUTIFUL_RUIN'];
function log(...a){ console.error(...a); }
(async () => {
  const browser = await chromium.launch({ headless: true });
  const out = [];
  for (let i = 0; i < N; i++) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
      await page.route(pat, r => r.fulfill({status:500,contentType:'application/json',body:'{"error":"blocked"}'}));
    const lines = [];
    page.on('console', m => { const t = m.text(); if (/\[OPENING:TEMP\]|\[HOT-RENDER|\[DESIRE:OPENING\]|\[HOOK:TEMP\]|\[CALCIFIED-MOVE:REPAIR\]|\[STORY:READY\]|\[SCENE-COST\]|\[SCENE-AUDIT\]|BEGIN-ERR/.test(t)) { lines.push(t); if (/\[HOT-RENDER|BEGIN-ERR|\[CALCIFIED-MOVE:REPAIR\]/.test(t)) log('   C> ' + t.slice(0,150)); } });
    try {
      await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
      await page.waitForFunction(()=>window.state && typeof window.handleBeginStory==='function', {timeout:40000});
      await page.evaluate((arch)=>{
        ['sb_physcanon_ledger','sb_behavcanon_ledger','sb_behavphrase_ledger','sb_deeptrio_ledger'].forEach(k=>localStorage.removeItem(k));
        // DO NOT stub the gravity hook — it fires DURING prose gen (before the
        // orchestrator's finalization repairs where the HOT-render repair lives),
        // so it's a premature done-signal. Let the full pipeline run; completion is
        // detected via the [STORY:READY] console marker (true end of Scene 1).
        const s = window.state;
        window._devBypass = true; window._forceHotOpener = true; window._forceAudits = true;
        s.subscribed = true; s.fortunes = 9999999; s.access = 'sub'; s._skipCorridorValidation = true;
        s.picks = s.picks || {};
        s.picks.world='billionaire'; s.picks.flavor='billionaire_modern'; s.picks.dynamic='enemies_to_lovers';
        s.picks.worldSubtype='billionaire_modern'; s.picks.playermask=arch;
        s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern'; s.dynamic='enemies_to_lovers';
        s.loveInterest='Male'; s.loveInterestName='Roman Tusk'; s.liGender='male';
        s.archetype={primary:arch,modifier:null,bound:false,canonicalLIId:null,boundAtScene:null};
        s.playerMask=arch; s.playermask=arch;
        s.storyLength='fling'; s.tier='fling'; s.intensity='Steamy';
        s.name='Mara'; s.pov='first_person'; s.turnCount=0;
        s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary';
      }, ARCHES[i % ARCHES.length]);
      await page.evaluate(()=>{ try{ window.handleBeginStory(); }catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); } });
      const t0=Date.now(); let done=false;
      // Completion = the true end-of-Scene-1 markers (AFTER all finalization repairs).
      while (Date.now()-t0 < 340000){ await page.waitForTimeout(4000); done = lines.some(l=>/\[STORY:READY\]|\[SCENE-COST\][^\n]*Finalized|\[SCENE-AUDIT\]/.test(l)); if (done){ await page.waitForTimeout(4000); break; } }
      // Capture the FINAL mounted prose (post-repair), slice from the anchor line so
      // UI chrome is excluded, run the FUNCTIONAL audit on it, and save the opening to read.
      let prose='', funcFails=[];
      try {
        const cap = await page.evaluate(async (arch)=>{
          const el=document.getElementById('storyContent'); let tx = el ? (el.textContent||'') : '';
          const anchor = tx.indexOf('My hand tightened'); if (anchor>=0) tx = tx.slice(anchor);
          tx = tx.replace(/\s+/g,' ').trim();
          const fails = (typeof window._openingFunctionFails==='function') ? window._openingFunctionFails(tx, window.state) : ['NO-FN'];
          const axisM = tx.match(/Is this[^?]*\?/gi); const axis = axisM ? axisM[axisM.length-1] : '';
          // #6: LI archetype manifestation classification + calcified-tic scan
          let manifest=null; try { if (typeof window._classifyArchetypeManifestation==='function') manifest = await window._classifyArchetypeManifestation(tx, arch); } catch(_){}
          const ticRx = /(quarter-inch|already (knew|knowing|knows)|eyes already (there|ahead)|listened like he already|preternatural stillness|a beat ahead of)/gi;
          const ticHits = (tx.match(ticRx)||[]);
          return { prose: tx.slice(0, 1900), fails, axis, manifest, ticHits };
        }, ARCHES[i % ARCHES.length]);
        prose = cap.prose; funcFails = cap.fails || []; var axis = cap.axis || ''; var manifest = cap.manifest; var ticHits = cap.ticHits||[];
      } catch(_){ var axis=''; var manifest=null; var ticHits=[]; }
      if (prose) require('fs').writeFileSync('/tmp/hot_open_'+(i+1)+'.txt', (axis?('AXIS: '+axis+'\n'):'')+(manifest?('MANIFEST: '+JSON.stringify(manifest)+'\nTIC: '+ticHits.join(',')+'\n'):'')+'\n'+prose);
      const repairLine = lines.filter(l=>/\[HOT-RENDER:REPAIR\]/.test(l)).pop() || '';
      out.push({ arch:ARCHES[i % ARCHES.length], done, funcFails, funcFailCount:funcFails.length,
        dominant: manifest?manifest.dominant:'?', gesture: manifest?(manifest.gesture||''):'', stimulus: manifest?(manifest.stimulus||''):'', inMenu: manifest?manifest.inMenu:null,
        ticCount: ticHits.length, ticHits,
        repair: repairLine.replace(/.*\[HOT-RENDER:REPAIR\]\s*/,'').slice(0,100) });
      log(`run ${i+1}/${N} [${ARCHES[i%ARCHES.length]}] dominant=${out[out.length-1].dominant} gesture="${(out[out.length-1].gesture||'').slice(0,46)}" tics=${ticHits.length}[${ticHits.join(',')}]`);
    } catch(e){ out.push({arch:ARCHES[i%ARCHES.length], error:e.message.slice(0,90)}); log(`run ${i+1} ERR ${e.message.slice(0,90)}`); }
    await ctx.close();
  }
  await browser.close();
  const done = out.filter(o=>o.done);
  const clean = done.filter(o=>o.funcFailCount===0).length;
  const oneFail = done.filter(o=>o.funcFailCount===1).length;
  const repaired = out.filter(o=>/applied/.test(o.repair||'')).length;
  // aggregate which functional checks fail across runs
  const tally={}; done.forEach(o=>(o.funcFails||[]).forEach(f=>tally[f]=(tally[f]||0)+1));
  log('\n===== SCENE-1 FUNCTIONAL AUDIT (measured '+done.length+'/'+out.length+') =====');
  log('FINAL openings with 0 functional fails: '+clean+'/'+done.length+'  ·  with exactly 1: '+oneFail+'/'+done.length);
  log('repair fired (>=2 fails): '+repaired+'/'+out.length);
  log('per-check fail tally: '+JSON.stringify(tally));
  // #6: LI archetype-manifestation distinctness + calcified-tic rate
  const judged = done.filter(o=>o.dominant && o.dominant!=='?');
  const domByArch = {}; judged.forEach(o=>{ (domByArch[o.arch]=domByArch[o.arch]||[]).push(o.dominant); });
  const uniqDom = new Set(judged.map(o=>o.dominant));
  const stillness = judged.filter(o=>/still|presence|watch|gravity/.test(o.dominant)).length;
  const ticRuns = judged.filter(o=>o.ticCount>0).length;
  log('\n===== LI ARCHETYPE MANIFESTATION (#6) (judged '+judged.length+'/'+out.length+') =====');
  log('distinct dominant categories: '+uniqDom.size+' of '+judged.length+' runs ('+[...uniqDom].join(', ')+')');
  log('stillness/presence/watchful dominant: '+stillness+'/'+judged.length+'  [the collapse signal]');
  log('runs with calcified tic (quarter-inch / already-knew / eyes-already-there): '+ticRuns+'/'+judged.length);
  judged.forEach(o=>log('  ['+o.arch+'] dom='+o.dominant+' stim="'+(o.stimulus||'').slice(0,40)+'" gesture="'+(o.gesture||'').slice(0,60)+'" tics='+o.ticCount));
  log('per-scene manifest+tic+axis saved to /tmp/hot_open_1..'+out.length+'.txt');
  require('fs').writeFileSync('/tmp/hot_render_measure.json', JSON.stringify(out,null,1));
})().catch(e=>{console.error('DRIVER-ERR',e.message);process.exit(1);});
