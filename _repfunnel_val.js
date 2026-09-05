// REPUTATION-COLLAPSE FUNNEL — post-fix validation batch. Generates N natural billionaire-modern
// openings, captures the funnel logs + the A-plot goal/antagonist, and measures whether visibility
// pressure still manifests as an institution. Pass = institutional manifestation no longer dominates,
// HOT mostly in-motion, PC agency present, subtypes spread, institutional_judgment ~0.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/tmp/repfunnel_val.json';
const N = parseInt(process.env.N || '10', 10);
function log(...a){ console.error(...a); }
// institutional-manifestation nouns (the funnel signature)
const INST_RE = /\b(board|council|order|enclave|committee|tribunal|hearing|will[- ]?contest|contest the will|estate contest|legal notice|ruling|verdict|the firm|the company|commission from|authority|governance|charter|foundation|the trust)\b/i;

async function genOne(page, i) {
  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(()=> window.state && typeof window.handleBeginStory==='function', { timeout:40000 });
  await page.waitForTimeout(400);
  const cap = { shape:null, subtype:null, instCap:null, axis:null, tempSel:null, tempRend:null, agency:null, procVocab:null, repInvertLog:null };
  const onLog = m => { const t=m.text();
    if (/\[A-PLOT:SHAPE\] (INVERTED pick|selected|persisted)/.test(t)) cap.repInvertLog = (cap.repInvertLog||'') + ' | ' + t.slice(0,120);
    if (/\[A-PLOT:REP-COLLAPSE-SUBTYPE\]/.test(t)) cap.subtype = (t.match(/subtype=([a-z_]+)/)||[])[1];
    if (/\[A-PLOT:INSTITUTION-CAP\]/.test(t)) cap.instCap = t.slice(0,120);
    if (/\[OPENING:TEMP:v2\]/.test(t)) { cap.tempSel=(t.match(/selected=([A-Z_]+)/)||[])[1]; cap.tempRend=(t.match(/rendered=([A-Z_]+)/)||[])[1]; }
    if (/\[CRISIS:AGENCY\]/.test(t)) cap.agency = (t.match(/stance=([A-Z]+)/)||[])[1] + '/verbs' + ((t.match(/agency-verbs=(\d+)/)||[])[1]||'?');
    if (/\[SCENE1:PROCEDURAL-VOCAB\]/.test(t)) cap.procVocab = (t.match(/(\d+) governance/)||[])[1];
  };
  page.on('console', onLog);
  await page.evaluate(()=>{
    window.__done=false;
    ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture','_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(fn=>{try{window[fn]=()=>Promise.resolve(null)}catch(_){}});
    window._auditSceneEmotionalGravity=function(pr){ try{ if(typeof pr==='string'&&pr.length>150) window.__lastProse=pr; }catch(_){} return Promise.resolve(null); };
    const s=window.state; window._devBypass=true; window._forceAudits=true;
    s.subscribed=true; s.fortunes=9999999; s.access='sub'; s._skipCorridorValidation=true;
    s.picks=s.picks||{}; s.picks.world='billionaire'; s.picks.flavor='affair'; s.picks.dynamic='enemies_to_lovers'; s.picks.worldSubtype='billionaire_modern'; s.picks.playermask='OPEN_VEIN';
    s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern'; s.dynamic='enemies_to_lovers';
    s.loveInterest='Male'; s.liGender='male';
    s.playerMask='OPEN_VEIN'; s.playermask='OPEN_VEIN'; s.storyLength='affair'; s.tier='affair'; s.intensity='Steamy';
    s.pov='first_person'; s.turnCount=0;
    s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary';
    s.series_id=null; s.issueIndexInRun=1; s._prefMemory={};
    // let the engine pick archetypes/names/axis naturally (Destiny) — that's what drives visibility→rep-collapse
  });
  await page.evaluate(async ()=>{ try{ window.handleBeginStory(); }catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); } });
  const t0=Date.now();
  while(Date.now()-t0<300000){ await page.waitForTimeout(3000);
    const st=await page.evaluate(()=>{ const s=window.state; return { hasAplot:!!(s.aPlot&&s.aPlot.goal), shape:(s.aPlot&&s.aPlot.storyShape)||null, sub:(s.aPlot&&s.aPlot.storyShapeSubtype)||null, axis:(s.rPlot&&s.rPlot.escalationAxis)||null, ready:!!window.__lastProse&&(window.__lastProse.length>200) }; });
    if (st.hasAplot && st.ready) { cap.shape=st.shape; cap.subtype=cap.subtype||st.sub; cap.axis=st.axis; break; }
  }
  const post = await page.evaluate(()=>{ const s=window.state; return { goal:(s.aPlot&&s.aPlot.goal)||'', antag:(s.aPlot&&(s.aPlot.antagonistOrAntiForce||s.aPlot.antagonistShape))||'', prose:(window.__lastProse||'').slice(0,1400) }; });
  page.off('console', onLog);
  cap.goal = post.goal; cap.antag = post.antag;
  cap.instInGoal = INST_RE.test((post.goal||'')+' '+(post.antag||''));
  cap.instInProse = INST_RE.test(post.prose||'');
  return cap;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked"}' }));
  const rows = [];
  for (let i=0;i<N;i++){ log(`\n[REP-VAL] opening ${i+1}/${N} …`); let r; try{ r=await genOne(page,i); }catch(e){ r={err:e.message}; } rows.push(r);
    log(`  shape=${r.shape} sub=${r.subtype||'-'} axis=${r.axis||'-'} temp=${r.tempSel}->${r.tempRend} agency=${r.agency||'-'} instGoal=${r.instInGoal} instProse=${r.instInProse}`);
    log(`  goal: ${String(r.goal||'').slice(0,140)}`);
  }
  await browser.close();

  const rc = rows.filter(r=>r.shape==='REPUTATION_COLLAPSE');
  const sum = {
    N, shapes: rows.reduce((a,r)=>{a[r.shape||'?']=(a[r.shape||'?']||0)+1;return a;},{}),
    repCollapseCount: rc.length,
    subtypeDist: rc.reduce((a,r)=>{a[r.subtype||'?']=(a[r.subtype||'?']||0)+1;return a;},{}),
    institutional_judgment_count: rc.filter(r=>r.subtype==='institutional_judgment').length,
    instInGoal_all: rows.filter(r=>r.instInGoal).length,
    instInGoal_rc: rc.filter(r=>r.instInGoal).length,
    instInProse_rc: rc.filter(r=>r.instInProse).length,
    hotSelected: rows.filter(r=>r.tempSel==='HOT_CRISIS').length,
    hotToCold: rows.filter(r=>r.tempSel==='HOT_CRISIS'&&r.tempRend==='COLD_DISRUPTION').length,
    agencyPassive: rows.filter(r=>/PASSIVE/.test(r.agency||'')).length,
    agencyActiveOrMixed: rows.filter(r=>/ACTIVE|MIXED/.test(r.agency||'')).length,
  };
  fs.writeFileSync(OUT, JSON.stringify({ summary:sum, rows }, null, 1));
  log('\n═══════════ REPUTATION-COLLAPSE FUNNEL — POST-FIX ═══════════');
  log('shapes: '+JSON.stringify(sum.shapes));
  log('Reputation Collapse openings: '+sum.repCollapseCount+'/'+N);
  log('  subtype distribution: '+JSON.stringify(sum.subtypeDist));
  log('  institutional_judgment picked: '+sum.institutional_judgment_count+' (target ~0 — capped)');
  log('  institutional noun in RC goal/antag: '+sum.instInGoal_rc+'/'+sum.repCollapseCount);
  log('  institutional noun in RC prose: '+sum.instInProse_rc+'/'+sum.repCollapseCount);
  log('HOT_CRISIS selected: '+sum.hotSelected+' · HOT→COLD drift: '+sum.hotToCold+'/'+sum.hotSelected);
  log('PC agency — active/mixed: '+sum.agencyActiveOrMixed+' · passive(victim-drift): '+sum.agencyPassive+' /'+N);
  const rcInstRate = rc.length ? (sum.instInGoal_rc/rc.length) : 0;
  const pass = (rc.length===0 || rcInstRate <= 0.34) && sum.institutional_judgment_count===0;
  log(`\nWROTE ${OUT}`);
  log(`VERDICT: ${rc.length===0 ? '⚠ no Reputation-Collapse openings surfaced (raise N or force shape) — inspect' : (pass ? '✓ institution no longer dominates Reputation-Collapse manifestation' : '✗ institution still dominant — inspect JSON')}`);
})().catch(e=>{ console.error('DRIVER-ERR', e.message); process.exit(1); });
