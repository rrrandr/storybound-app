// AGENCY RE-VALIDATION (commit 6113166) — agency lifted cross-shape into _repairHotOpening.
// Generates N natural billionaire-modern openings; captures the repair logs + measures agency on the
// FINAL (post-repair) prose (the app's own [CRISIS:AGENCY] fires PRE-repair, so it can't validate the
// fix). Pass = passive well below the 6/10 baseline, HOT mostly active/in-motion, immediate PC verb in
// most, crisis not primarily "she discovered/read/learned", no institution regression.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/tmp/agency_val.json';
const N = parseInt(process.env.N || '10', 10);
function log(...a){ console.error(...a); }
const INST_RE   = /\b(board|council|order|enclave|committee|tribunal|hearing|will[- ]?contest|estate contest|legal notice|ruling|verdict|charter|the trust)\b/i;
// PC active-agency verb in the opening head (first-person or by name)
const AGVERB_RE = /\b(?:I|she|he)\s+(?:confront|deny|denied|denies|interrupt|cross(?:ed)?|refus\w+|claim\w*|nam\w+|expos\w+|demand\w*|grab\w*|step\w*|walk\w*|push\w*|slam\w*|seiz\w+|snatch\w*|reach\w*|strike|struck|stand|stood|hold|held|throw|threw|shov\w+|fac\w+|strid\w+|storm\w+|march\w*|sw\w+ung|yank\w*|block\w*|plant\w+|lung\w+|round\w* on|cut\w* (?:in|him|her|through))\b/i;
// crisis-as-reported / discovery pattern (the cold-opening signature)
const DISCOV_RE = /\b(?:I|she|he)\s+(?:discover\w+|read|reread|re-read|learn\w+|found out|realiz\w+|star\w+ at|notic\w+|saw that|understood|remember\w+|open\w+ the (?:letter|email|message|file))\b|\bthe (?:message|email|e-mail|letter|essay|file|screen|paper|document|notification|text) (?:said|read|showed|glowed|sat|waited)\b/i;
const PASSIVE_RE = /\b(?:was|were|had been|been|got)\s+[a-z]+(?:ed|en)\b/gi;
const CONTAINER_N = '(?:letter|will|notice|order|document|file|report|message|email|e-mail|envelope|dossier|memo|filing|decree|commission|contract|voicemail|notification|the phone|the screen|the text|the essay|the paper)';
// container-first: the OPENING (~first 40 words) receives/reads a container as the load-bearing beat
const CONTAINER_FIRST_RE = new RegExp('^(?:\\S+\\s+){0,40}?(?:(?:I|she|he)\\s+(?:read|reread|open\\w+|receiv\\w+|found|discover\\w+|star\\w+ at|scroll\\w+|check\\w+|refresh\\w+|held|clutch\\w+)\\s+(?:the |a |an |my |her )?'+CONTAINER_N+'|(?:the |a |an |my |her )?'+CONTAINER_N+'\\s+(?:sat|lay|waited|glowed|arrived|said|read))','i');
// weaponized: a container in a PERSON'S hands / being USED against her (lifted/read aloud/thrust/waved)
const WEAPONIZED_RE = new RegExp('(?:lift\\w+|rais\\w+|held up|thrust|wav\\w+|show\\w+|read\\s+(?:the\\s+\\w+\\s+)?aloud|slid|slam\\w+|brandish\\w+|flash\\w+)\\s+(?:the |a |an |her )?'+CONTAINER_N+'|'+CONTAINER_N+'\\s+(?:in (?:his|her|their) (?:hand|hands|grip)|above (?:the|her)|before the (?:room|crowd)|on the (?:screen|monitor|wall))','i');
// another person acting ON/AGAINST the PC in-scene
const PERSON_ACTING_RE = /\b(?:[A-Z][a-z]+|he|she|they|the \w+)\s+(?:confront\w+|accus\w+|expos\w+|interrupt\w+|corner\w+|demand\w+|announc\w+|declar\w+|turn\w+ (?:to|toward|on)|lift\w+|rais\w+|read\s+\w+\s+aloud|burst\w*|stepp?\w* (?:in|between|toward)|blocked|grabb\w+|seiz\w+|snatch\w+|shov\w+|threw|thrust)\b/;

async function genOne(page, i) {
  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(()=> window.state && typeof window.handleBeginStory==='function', { timeout:40000 });
  await page.waitForTimeout(400);
  const cap = { shape:null, tempSel:null, tempRend:null, agencyPre:null, gateFires:false, repairApplied:false, repairDelta:null, liEarly:false };
  const onLog = m => { const t=m.text();
    if (/\[OPENING:TEMP:v2\]/.test(t)) { cap.tempSel=(t.match(/selected=([A-Z_]+)/)||[])[1]; cap.tempRend=(t.match(/rendered=([A-Z_]+)/)||[])[1]; }
    if (/\[CRISIS:AGENCY\]/.test(t)) cap.agencyPre = (t.match(/stance=([A-Z]+)/)||[])[1];
    if (/\[HOT-RENDER:GATE\].*REPAIR FIRES/.test(t)) cap.gateFires = true;
    if (/\[HOT-RENDER:REPAIR\] applied/.test(t)) { cap.repairApplied = true; cap.repairDelta = (t.match(/(\d+→\d+ chars)/)||[])[1]||''; }
    if (/\[LI-EARLY:REPAIR\]/.test(t)) cap.liEarly = true;
  };
  page.on('console', onLog);
  await page.evaluate(()=>{
    window.__lastProse=''; window.__proseHist=[];
    ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture','_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(fn=>{try{window[fn]=()=>Promise.resolve(null)}catch(_){}});
    window._auditSceneEmotionalGravity=function(pr){ try{ if(typeof pr==='string'&&pr.length>150){ window.__lastProse=pr; window.__proseHist.push(pr); } }catch(_){} return Promise.resolve(null); };
    const s=window.state; window._devBypass=true; window._forceAudits=true;
    s.subscribed=true; s.fortunes=9999999; s.access='sub'; s._skipCorridorValidation=true;
    s.picks=s.picks||{}; s.picks.world='billionaire'; s.picks.flavor='affair'; s.picks.dynamic='enemies_to_lovers'; s.picks.worldSubtype='billionaire_modern'; s.picks.playermask='OPEN_VEIN';
    s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern'; s.dynamic='enemies_to_lovers';
    s.loveInterest='Male'; s.liGender='male';
    s.playerMask='OPEN_VEIN'; s.playermask='OPEN_VEIN'; s.storyLength='affair'; s.tier='affair'; s.intensity='Steamy';
    s.pov='first_person'; s.turnCount=0;
    s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary';
    s.series_id=null; s.issueIndexInRun=1; s._prefMemory={};
  });
  await page.evaluate(async ()=>{ try{ window.handleBeginStory(); }catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); } });
  // Wait for the scene to appear, THEN keep waiting through _repairHotOpening (fires late, ~20-30s after
  // first prose). Settle on a stable FINAL prose (post-repair) captured from pagination/DOM if present.
  const t0=Date.now(); let stableCount=0, lastFinalLen=-1;
  while(Date.now()-t0<320000){ await page.waitForTimeout(4000);
    const st=await page.evaluate(()=>{ const s=window.state;
      let dom=''; try{ const el=document.getElementById('storyPagesContainer')||document.getElementById('storyText'); dom=el?(el.innerText||el.textContent||''):''; }catch(_){}
      let pg=''; try{ if(window.StoryPagination&&window.StoryPagination.getPages){ const a=window.StoryPagination.getPages(); pg=(a&&a[0])||''; } }catch(_){}
      return { hasAplot:!!(s.aPlot&&s.aPlot.goal), shape:(s.aPlot&&s.aPlot.storyShape)||null, ready:!!(window.__lastProse&&window.__lastProse.length>200), domLen:dom.length, pgLen:(pg||'').length }; });
    if (st.hasAplot && st.ready) { const fl=Math.max(st.domLen, st.pgLen, 0); if (fl===lastFinalLen){ stableCount++; if(stableCount>=3) { cap.shape=st.shape; break; } } else { lastFinalLen=fl; stableCount=0; } }
  }
  // grab the FINAL prose — prefer DOM/pagination (post-repair, post-mount), else the LAST audit capture
  const fin = await page.evaluate(()=>{ const s=window.state;
    let dom=''; try{ const el=document.getElementById('storyPagesContainer')||document.getElementById('storyText'); dom=(el?(el.innerText||el.textContent||''):'').replace(/\s+/g,' ').trim(); }catch(_){}
    let pg=''; try{ if(window.StoryPagination&&window.StoryPagination.getPages){ const a=window.StoryPagination.getPages(); pg=String((a&&a[0])||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim(); } }catch(_){}
    const au=(window.__lastProse||'').replace(/\s+/g,' ').trim();
    // strip [TITLE:]/[SYNOPSIS:]/[CHARACTERS:] tags from the audit form
    const clean=s=>String(s||'').replace(/\[[A-Z][^\]]*\]/g,' ').replace(/\s+/g,' ').trim();
    const cands=[clean(pg),clean(dom),clean(au)].filter(x=>x.length>200);
    const final = cands.sort((a,b)=>b.length-a.length)[0] || clean(au);
    return { final, source: (clean(pg).length>200?'pagination':(clean(dom).length>200?'dom':'audit')), goal:(s.aPlot&&s.aPlot.goal)||'' };
  });
  page.off('console', onLog);
  const head = String(fin.final||'').split(' ').slice(0, 160).join(' ');
  cap.finalSource = fin.source;
  cap.agencyVerb = AGVERB_RE.test(head);
  cap.discovery  = DISCOV_RE.test(head);
  cap.containerFirst = CONTAINER_FIRST_RE.test(head);
  cap.weaponized = WEAPONIZED_RE.test(head);
  cap.personActing = PERSON_ACTING_RE.test(head);
  cap.passiveCount = (head.match(PASSIVE_RE)||[]).length;
  cap.instInGoal = INST_RE.test(fin.goal||'');
  cap.instInProse = INST_RE.test(fin.final||'');
  cap.head = head.slice(0, 220);
  cap.goal = fin.goal;
  return cap;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked"}' }));
  const rows = [];
  for (let i=0;i<N;i++){ log(`\n[AGENCY] opening ${i+1}/${N} …`); let r; try{ r=await genOne(page,i); }catch(e){ r={err:e.message}; } rows.push(r);
    log(`  shape=${r.shape} temp=${r.tempSel}->${r.tempRend} | agencyVerb=${r.agencyVerb} personActing=${r.personActing} container1st=${r.containerFirst} weaponized=${r.weaponized} discovery=${r.discovery} passive=${r.passiveCount} inst=${r.instInGoal}`);
    log(`  head: ${String(r.head||'').slice(0,150)}`);
  }
  await browser.close();
  const ok = rows.filter(r=>!r.err && r.finalSource);
  const sum = {
    N, measured: ok.length,
    finalSources: ok.reduce((a,r)=>{a[r.finalSource]=(a[r.finalSource]||0)+1;return a;},{}),
    hotSelected: ok.filter(r=>r.tempSel==='HOT_CRISIS').length,
    hotToCold_rendered: ok.filter(r=>r.tempSel==='HOT_CRISIS'&&r.tempRend==='COLD_DISRUPTION').length,
    agencyVerb_present: ok.filter(r=>r.agencyVerb).length,
    personActing_present: ok.filter(r=>r.personActing).length,
    containerFirst: ok.filter(r=>r.containerFirst).length,
    weaponized: ok.filter(r=>r.weaponized).length,
    discovery_pattern: ok.filter(r=>r.discovery).length,
    avgPassive: ok.length? (ok.reduce((a,r)=>a+(r.passiveCount||0),0)/ok.length).toFixed(1):'-',
    repairFired: ok.filter(r=>r.gateFires).length,
    repairApplied: ok.filter(r=>r.repairApplied).length,
    agencyPrePassive: ok.filter(r=>r.agencyPre==='PASSIVE').length,   // app's pre-repair measure (baseline-comparable)
    instInGoal: ok.filter(r=>r.instInGoal).length,
  };
  fs.writeFileSync(OUT, JSON.stringify({ summary:sum, rows }, null, 1));
  log('\n═══════════ AGENCY RE-VALIDATION (post-6113166) ═══════════');
  log('measured: '+sum.measured+'/'+N+' · final-prose sources: '+JSON.stringify(sum.finalSources));
  log('FINAL prose — PC agency verb present: '+sum.agencyVerb_present+'/'+sum.measured+' (baseline 4/10 — target: materially above)');
  log('FINAL prose — another PERSON acting on/against PC: '+sum.personActing_present+'/'+sum.measured+' (target: most)');
  log('FINAL prose — CONTAINER-FIRST opening (reads/receives a container): '+sum.containerFirst+'/'+sum.measured+' (target: low)');
  log('FINAL prose — container WEAPONIZED by a person (when present): '+sum.weaponized+'/'+sum.measured);
  log('FINAL prose — discovery/reported pattern ("she discovered/read/learned"): '+sum.discovery_pattern+'/'+sum.measured+' (target: low)');
  log('FINAL prose — avg passive constructions/opening: '+sum.avgPassive);
  log('repair fired: '+sum.repairFired+'/'+sum.measured+' · applied(changed text): '+sum.repairApplied);
  log('app [CRISIS:AGENCY] PASSIVE (PRE-repair — the 6/10 baseline metric): '+sum.agencyPrePassive+'/'+sum.measured);
  log('HOT_CRISIS selected: '+sum.hotSelected+' · rendered COLD: '+sum.hotToCold_rendered+'/'+sum.hotSelected);
  log('institution noun in goal (funnel regression check): '+sum.instInGoal+'/'+sum.measured);
  log('\n--- excerpts (first ~160 words) ---');
  ok.slice(0,4).forEach((r,i)=>log(`  [${i+1} ${r.shape} agencyVerb=${r.agencyVerb}] ${String(r.head||'').slice(0,200)}`));
  const baseline = 4;   // prior agency-verb-present /10
  const agPct = sum.agencyVerb_present/(sum.measured||1);
  const improved = sum.agencyVerb_present > baseline;   // materially above 4/10
  const noRegress = sum.instInGoal <= Math.ceil(sum.measured*0.2);
  log(`\nWROTE ${OUT}`);
  log(`VERDICT: agencyVerb ${sum.agencyVerb_present}/${sum.measured} (baseline ${baseline}/10) · personActing ${sum.personActing_present}/${sum.measured} · container-first ${sum.containerFirst}/${sum.measured} · discovery ${sum.discovery_pattern}/${sum.measured} · inst-goal ${sum.instInGoal}/${sum.measured}`);
  log(`  → ${improved?'✓ agency MATERIALLY ABOVE baseline':'✗ agency did NOT improve vs 4/10'} · ${noRegress?'✓ no funnel regression':'✗ funnel regressed'}`);
  log(`  DECISION: ${improved && noRegress ? 'push, then live-QA for taste' : (!improved ? 'do NOT push yet — go to the crisis-event lever' : 'improved but check regression')}`);
})().catch(e=>{ console.error('DRIVER-ERR', e.message); process.exit(1); });
