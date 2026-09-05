// LITERARY PREWRITE validation. Generates one literary billionaire-affair Scene 1 and confirms the
// scene author emitted the <<EXPANSION_A/B>> payoffs, extraction fired (state._scene1PrewrittenExpansions),
// the markers were STRIPPED from the displayed prose (widget preserved), payoffs pass the sanitizer, and
// the prewritten reveal renders the correct aside. ~1 literary scene gen.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/tmp/lit_prewrite_val.json';
function log(...a){ console.error(...a); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked"}' }));
  const logs = [];
  page.on('console', m=>{ const t=m.text(); if (/AXIS-EXPANSION|DEMAND-HINT|SCENE1:SCAFFOLD.*micro/i.test(t)) { logs.push(t.slice(0,200)); log('  >', t.slice(0,150)); } });

  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(()=> window.state && typeof window.handleBeginStory==='function' && typeof window._extractScene1PrewrittenExpansions==='function' && typeof window._sanitizeHiddenExpansion==='function', { timeout:40000 });
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
    s.series_id=null; s.issueIndexInRun=1; s._prefMemory={};
  });

  log('[LIT-PW] generating literary Scene 1 …');
  await page.evaluate(async ()=>{ try{ window.handleBeginStory(); }catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); } });
  { const t0=Date.now(); let ll=-1,st=0; while(Date.now()-t0<300000){ await page.waitForTimeout(3000); const s=await page.evaluate(()=>{const a=window.__scenes||[],l=a[a.length-1]||{},x=window.state;return{n:a.length,busy:!!(x._isAdvancingScene||x._stagedSubmitting),len:(l.text||'').length};}); if(s.n>=1&&!s.busy&&s.len>150){ if(s.len===ll){st+=3000;if(st>=6000)break;}else{ll=s.len;st=0;} } } }

  // capture state + displayed prose + reveal test
  const cap = await page.evaluate(()=>{
    const s=window.state; const a=window.__scenes||[];
    const captured=(a[a.length-1]||{}).text||'';
    let dom=''; try{ const el=document.getElementById('storyPagesContainer')||document.getElementById('storyText')||document.getElementById('storyContent'); dom=el?(el.innerText||el.textContent||''):''; }catch(_){}
    const pw=s._scene1PrewrittenExpansions||null;
    // reveal test: render the DIRECT payoff next to a fresh node
    let revealed='';
    try {
      if (pw && pw.direct) {
        const cont=document.getElementById('storyPagesContainer')||document.getElementById('storyText'); const node=document.createElement('div'); node.className='sme-resolved'; if(cont) cont.appendChild(node);
        window._revealPrewrittenAxisExpansion(pw.direct, node);
        const box=document.querySelector('.axis-expansion'); revealed=box?(box.innerText||box.textContent||''):'';
      }
    } catch(_){}
    return { captured, dom, pw, revealed, widgetQ: s._microDecisionLibraryQuestion||'' };
  });

  const result = { checks:{}, prewritten: cap.pw, revealed: cap.revealed, widgetQ: cap.widgetQ, logs };
  const scan = cap.dom.length>150 ? cap.dom : cap.captured;
  result.checks.scene_generated = scan.length>150;
  result.checks.author_emitted_and_extracted = !!(cap.pw && cap.pw.direct && cap.pw.subtle && cap.pw.direct.length>4 && cap.pw.subtle.length>4);
  result.checks.payoffs_sanitizer_valid = await page.evaluate((pw)=>{ try{ return !!(pw && window._sanitizeHiddenExpansion(pw.direct)!==null && window._sanitizeHiddenExpansion(pw.subtle)!==null); }catch(_){ return false; } }, cap.pw);
  result.checks.markers_stripped_from_prose = !/<<\s*EXPANSION_|<<\s*END_EXPANSION/i.test(scan);
  result.checks.widget_preserved = /<<MICRO_EXPRESSION>>|Say it plainly|Is this|—\s*or\b/i.test(cap.captured) || !!cap.widgetQ;
  result.checks.extraction_log_fired = logs.some(l=>/\[AXIS-EXPANSION-PREWRITTEN\] mode=literary authored/i.test(l));
  result.checks.reveal_renders_direct = !!(cap.revealed && cap.pw && cap.revealed.indexOf(cap.pw.direct.slice(0,20))>=0);
  // grounding: neither payoff invents an unknown name (sanitizer already checks; double-confirm no "Elias"-style)
  result.checks.no_wrong_names = !!(cap.pw && !/\bElias\b|\bLiora\b/i.test((cap.pw.direct||'')+' '+(cap.pw.subtle||'')));

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  const c=result.checks; const line=(n,v)=>log(`  ${v?'✓':'✗'}  ${n}`);
  log('\n=== LITERARY PREWRITE VALIDATION ===');
  line('scene generated', c.scene_generated);
  line('author EMITTED payoffs + extraction populated state', c.author_emitted_and_extracted);
  line('[AXIS-EXPANSION-PREWRITTEN] mode=literary authored log fired', c.extraction_log_fired);
  line('payoffs pass sanitizer', c.payoffs_sanitizer_valid);
  line('EXPANSION markers STRIPPED from displayed prose', c.markers_stripped_from_prose);
  line('widget / micro question preserved', c.widget_preserved);
  line('reveal renders the DIRECT payoff aside', c.reveal_renders_direct);
  line('no wrong-name hallucination (Elias/Liora)', c.no_wrong_names);
  log('\n  direct payoff: '+JSON.stringify((cap.pw&&cap.pw.direct||'').slice(0,140)));
  log('  subtle payoff: '+JSON.stringify((cap.pw&&cap.pw.subtle||'').slice(0,140)));
  const core = c.author_emitted_and_extracted && c.payoffs_sanitizer_valid && c.markers_stripped_from_prose && c.reveal_renders_direct;
  log(`\nWROTE ${OUT}`);
  log(`RESULT: ${core ? '✓ LITERARY PREWRITE VALIDATED end-to-end' : (c.scene_generated ? '✗ inspect JSON (author may not have emitted markers)' : '✗ scene did not generate')}`);
})().catch(e=>{ console.error('DRIVER-ERR', e.message); process.exit(1); });
