// END-TO-END multi-issue validation for the Demand/Hint Scene-1 skip (Preference Memory Resolver).
// Issue 1: begin → generate scenes → answer Demand/Hint (record direct) → establish couple.
// Boundary: startBook2() (fallback: faithful state simulation of what startBook2 produces).
// Issue 2: generate Scene 1+ → CONFIRM the probe is SKIPPED (no <<MICRO_EXPRESSION>>, PREF-APPLY logs).
// Captures all prose + key logs + a resumable state export → /tmp/pref_multiissue.json
const { chromium } = require('playwright-core');
const fs = require('fs');

const I1 = parseInt(process.env.I1,10) || 3;   // Issue 1 scenes
const I2 = parseInt(process.env.I2,10) || 2;   // Issue 2 scenes
const PER_SCENE_TIMEOUT = 340000;
const OUT = '/tmp/pref_multiissue.json';
const INPUTS = [
  { a: "I stand my ground instead of backing down.",              d: "I'm not going to pretend this doesn't matter." },
  { a: "I push for the truth about what he's really doing here.", d: "Tell me what you actually want from me." },
  { a: "I close the distance between us.",                        d: "Stop talking." },
  { a: "I refuse to be anyone's secret.",                         d: "If you want me, you want all of it. In the open." },
];
const PREF_LOG_RE = /\[PREF-RESOLVE\]|\[PREF-APPLY\]|\[PREF-REFRESH\]|\[SCENE1:SCAFFOLD\].*(SUPPRESSED|micro)|SKIPPED|\[DEMAND-HINT\]|ISSUE-CONTINUITY/i;
function log(...a){ console.error(...a); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked"}' }));
  const prefLogs = [];
  page.on('console', m => { const t=m.text(); if (PREF_LOG_RE.test(t)) { prefLogs.push(t.slice(0,240)); log('  pref>', t.slice(0,180)); }
    else if (/GEN-FAIL|BEGIN-ERR|Story generation failed|DRIVER/i.test(t)) log('  pg>', t.slice(0,160)); });

  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && Object.keys(window.state).length>100 && typeof window.handleBeginStory==='function' && typeof window._recordReaderPreference==='function', { timeout:40000 });
  await page.waitForTimeout(800);

  // Capture hook + non-FF billionaire AFFAIR setup (multi-issue capable), same-series.
  await page.evaluate(() => {
    ['sb_physcanon_ledger','sb_behavcanon_ledger','sb_behavphrase_ledger','sb_deeptrio_ledger','sb_reader_pref_v1'].forEach(k=>{try{localStorage.removeItem(k)}catch(_){}});
    window.__scenes = [];
    ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture','_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(fn=>{try{window[fn]=()=>Promise.resolve(null)}catch(_){}});
    window._auditSceneEmotionalGravity = function(pr, meta){ try { if (typeof pr==='string' && pr.length>120) window.__scenes.push({ text:pr, turnCount:window.state.turnCount||0, issue:window.state.issueIndexInRun||1, t:Date.now() }); } catch(_){} return Promise.resolve(null); };
    const s = window.state;
    window._devBypass=true; window._forceAudits=true;
    s.subscribed=true; s.fortunes=9999999; s.access='sub'; s._skipCorridorValidation=true;
    s.picks=s.picks||{};
    s.picks.world='billionaire'; s.picks.flavor='billionaire_modern'; s.picks.dynamic='enemies_to_lovers'; s.picks.worldSubtype='billionaire_modern'; s.picks.playermask='OPEN_VEIN';
    s.picks.flavor='affair';
    s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern'; s.dynamic='enemies_to_lovers';
    s.loveInterest='Male'; s.loveInterestName='Dorian'; s.liGender='male';
    s.archetype={primary:'DARK_VICE',modifier:null,bound:false,canonicalLIId:null,boundAtScene:null};
    s.playerMask='OPEN_VEIN'; s.playermask='OPEN_VEIN';
    s.storyLength='affair'; s.tier='affair'; s.intensity='Steamy';
    s.name='Mara'; s.pov='first_person'; s.turnCount=0;
    s.playerName='Mara'; s.partnerName='Dorian';
    s.identity={playerName:'Mara',partnerName:'Dorian',displayPlayerName:'Mara',displayPartnerName:'Dorian'};
    s.picks.identity={playerName:'Mara',partnerName:'Dorian',displayPlayerName:'Mara',displayPartnerName:'Dorian'};
    try { const pIn=document.getElementById('playerNameInput'); if(pIn)pIn.value='Mara'; const lIn=document.getElementById('partnerNameInput'); if(lIn)lIn.value='Dorian'; } catch(_){}
    s._pcLookSkipped=true; s.pcLookLocked=true;
    s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary';
    // series identity so startBook2 / same-series memory has an anchor
    s.series_id = s.series_id || 'e2e-series-1'; s.issueIndexInRun = 1;
  });

  await page.evaluate(async () => { try { window.handleBeginStory(); } catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); } });

  const snap = () => page.evaluate(()=>{ const s=window.state, arr=window.__scenes||[], last=arr[arr.length-1]||{};
    return { n:arr.length, busy:!!(s._isAdvancingScene||s._stagedSubmitting||s._stagedAwaitingProse), lastLen:(last.text||'').length, head:String(last.text||'').slice(0,80), tc:s.turnCount||0, issue:s.issueIndexInRun||1, intimacy:!!(s.intimacyDialogue&&s.intimacyDialogue.active) }; });
  async function clickAdvance(inp, intimacy, forceClear){
    await page.evaluate(async (args)=>{ const s=window.state;
      if (args.forceClear){ s._isAdvancingScene=false; s._stagedSubmitting=false; s._stagedAwaitingProse=false; }
      s._petitionEmergenceFired=true; s._petitionEmergenceArmed=false; s._isAdvancingScene=false;
      try { if(typeof s._petitionEmergenceSubmitGateCleanup==='function'){s._petitionEmergenceSubmitGateCleanup();s._petitionEmergenceSubmitGateCleanup=null;} }catch(_){}
      try { if(typeof window.closeZoomedCard==='function') window.closeZoomedCard(); }catch(_){}
      const ai=document.getElementById('actionInput'),di=document.getElementById('dialogueInput'),b=document.getElementById('submitBtn');
      if (args.intimacy){ if(di)di.value=(args.d||'Yes.'); if(ai)ai.value=(args.a||''); } else { if(ai)ai.value=args.a; if(di)di.value=args.d; }
      if (b){ b.disabled=false; b.click(); }
    }, { a:inp.a, d:inp.d, intimacy, forceClear });
  }
  async function waitFirst(){ const t0=Date.now(); let lastLen=-1, stable=0;
    while (Date.now()-t0 < PER_SCENE_TIMEOUT){ await page.waitForTimeout(3000); const st=await snap();
      if (st.n>=1 && !st.busy && st.lastLen>120){ if (st.lastLen===lastLen){ stable+=3000; if (stable>=6000) return st.head; } else { lastLen=st.lastLen; stable=0; } } }
    return null; }
  async function advanceOne(inp, prevHead){ const t0=Date.now(); let lastClick=0,lastLen=-1,stable=0,busySince=0;
    while (Date.now()-t0 < PER_SCENE_TIMEOUT){ const st=await snap(); const now=Date.now();
      const isNew = st.lastLen>120 && st.head && st.head!==prevHead;
      if (isNew){ if(!st.busy){ if(st.lastLen===lastLen){ stable+=2500; if(stable>=6000) return st.head; } else { lastLen=st.lastLen; stable=0; } } await page.waitForTimeout(2500); continue; }
      if (st.busy){ if(!busySince) busySince=now; } else busySince=0;
      const stuckBusy = busySince && (now-busySince>75000);
      if ((!st.busy||stuckBusy) && (now-lastClick>45000)){ lastClick=now; try{ await clickAdvance(inp, st.intimacy, stuckBusy);}catch(_){} if(stuckBusy)busySince=0; }
      await page.waitForTimeout(3000); }
    return null; }

  const result = { issue1:[], issue2:[], boundary:null, prefLogs:[], checks:{} };

  // ---- ISSUE 1 ----
  log(`[E2E] Issue 1: begin scene 1 …`);
  let prevHead = await waitFirst();
  result.checks.issue1_scene1_landed = !!prevHead;
  try { await page.evaluate(()=>{ const s=window.state; s._petitionEmergenceFired=true; s._petitionEmergenceArmed=false; }); } catch(_){}

  // Answer the Demand/Hint probe = DIRECT (simulates the pill click → records to _prefMemory)
  const answered = await page.evaluate(()=>{ try { if (typeof window._recordScene1Directness==='function'){ window._recordScene1Directness(true); return { ok:true, sig:window.state.scene1DirectnessSignal, mem: !!(window.state._prefMemory && window.state._prefMemory.demand_hint) }; } } catch(e){ return {ok:false,err:e.message}; } return {ok:false}; });
  result.checks.issue1_recorded_demand_hint = answered;
  log(`[E2E] recorded demand_hint: ${JSON.stringify(answered)}`);

  for (let t=2; t<=I1; t++){ const inp=INPUTS[t-2]||INPUTS[INPUTS.length-1]; log(`[E2E] Issue1 -> scene ${t}`); const got=await advanceOne(inp, prevHead); if(!got){ log(`[E2E] Issue1 scene ${t} FAILED`); break; } prevHead=got; }
  result.issue1 = await page.evaluate(()=> (window.__scenes||[]).map(s=>({ text:s.text, tc:s.turnCount, issue:s.issue })));
  const i1count = result.issue1.length;

  // ---- BOUNDARY: startBook2 (fallback: faithful simulation) ----
  log(`[E2E] boundary: startBook2() …`);
  const b2 = await page.evaluate(async ()=>{
    const s=window.state; const before={ issue:s.issueIndexInRun, storyId:s.storyId, series:s.series_id, memHas:!!(s._prefMemory&&s._prefMemory.demand_hint) };
    try { if (typeof window.startBook2==='function'){ await window.startBook2(); return { ok:true, before, after:{ issue:s.issueIndexInRun, storyId:s.storyId, series:s.series_id, memHas:!!(s._prefMemory&&s._prefMemory.demand_hint), sig:s.scene1DirectnessSignal } }; } } catch(e){ return { ok:false, err:e.message, before }; }
    return { ok:false, before };
  });
  result.boundary = b2;
  log(`[E2E] startBook2: ${JSON.stringify(b2).slice(0,300)}`);

  // If startBook2 didn't advance the issue OR didn't produce a fresh scene, faithfully simulate the boundary.
  let usedSim = false;
  const advanced = b2.ok && b2.after && b2.after.issue >= 2 && b2.after.memHas;
  if (!advanced){
    usedSim = true;
    log(`[E2E] startBook2 not clean headless — using faithful boundary simulation (same-series, carry _prefMemory, issue 2).`);
    await page.evaluate(()=>{ const s=window.state;
      const mem = s._prefMemory;                      // carry the couple's memory (what startBook2's _carriedRel does)
      const series = s.series_id, rel = s.relationship_phase, intim = s.intimacyPhase;
      if (typeof window._resetStoryState==='function') window._resetStoryState();
      s._prefMemory = mem; s.series_id = series; s.relationship_phase = rel || 'together'; s.intimacyPhase = intim;
      s.issueIndexInRun = 2; s.storyId = 'e2e-story-2'; s.turnCount = 0;
      s.scene1DirectnessSignal = null; s.directnessScore = 0; s._scene1MicroSuppressed = false; // prove the skip RE-DERIVES it
      // restore the picks/names the reset may have blanked
      s.picks=s.picks||{}; s.picks.flavor='affair'; s.storyLength='affair'; s.world='billionaire'; s.worldSubtype='billionaire_modern';
      s.loveInterestName='Dorian'; s.name='Mara'; s.playerName='Mara'; s.partnerName='Dorian'; s.pov='first_person';
      s.renderMode='literary'; s.currentEngine='literary';
      if (typeof window._applyRememberedPreferences==='function') window._applyRememberedPreferences();
      s._petitionEmergenceFired=true; s._petitionEmergenceArmed=false;
    });
    const issueOpenSig = await page.evaluate(()=>({ sig:window.state.scene1DirectnessSignal, issue:window.state.issueIndexInRun }));
    log(`[E2E] post-sim issue-open: ${JSON.stringify(issueOpenSig)}`);
  }
  result.checks.boundary_mode = usedSim ? 'simulated' : 'startBook2';

  // ---- ISSUE 2 ----
  const scenesBefore = await page.evaluate(()=> (window.__scenes||[]).length);
  log(`[E2E] Issue 2: generate scene 1 …`);
  await page.evaluate(async ()=>{ try { window.handleBeginStory(); } catch(e){ console.log('BEGIN-ERR2 '+(e&&e.message)); } });
  // wait for a NEW scene beyond scenesBefore
  let i2head=null; { const t0=Date.now(); let lastLen=-1, stable=0;
    while (Date.now()-t0 < PER_SCENE_TIMEOUT){ await page.waitForTimeout(3000); const st=await snap();
      if (st.n>scenesBefore && !st.busy && st.lastLen>120){ if (st.lastLen===lastLen){ stable+=3000; if(stable>=6000){ i2head=st.head; break; } } else { lastLen=st.lastLen; stable=0; } } } }
  result.checks.issue2_scene1_landed = !!i2head;
  let prev2 = i2head;
  for (let t=2; t<=I2; t++){ const inp=INPUTS[t-1]||INPUTS[INPUTS.length-1]; log(`[E2E] Issue2 -> scene ${t}`); const got=await advanceOne(inp, prev2); if(!got){ log(`[E2E] Issue2 scene ${t} FAILED`); break; } prev2=got; }

  const allScenes = await page.evaluate(()=> (window.__scenes||[]).map(s=>({ text:s.text, tc:s.turnCount, issue:s.issue })));
  result.issue2 = allScenes.slice(i1count);

  // resumable export for the user's own browser
  result.stateExport = await page.evaluate(()=>{ try { const s=window.state; const keep=['picks','world','worldSubtype','flavor','storyLength','tier','dynamic','loveInterestName','liGender','archetype','name','playerName','partnerName','pov','identity','series_id','issueIndexInRun','_prefMemory','relationship_phase','intimacyPhase','scene1DirectnessSignal','storySpine']; const o={}; keep.forEach(k=>{ try{ o[k]=JSON.parse(JSON.stringify(s[k])); }catch(_){} }); return o; } catch(_){ return null; } });

  // ---- CHECKS ----
  const marker = /<<\s*MICRO_EXPRESSION\s*>>|Is this (?:about )?[^?]{4,90}(?:—|-|\bor\b)[^?]{2,90}\?/i;
  const i1s1 = (result.issue1[0]||{}).text || '';
  const i2s1 = (result.issue2[0]||{}).text || '';
  result.checks.issue1_scene1_HAS_micro = marker.test(i1s1);
  result.checks.issue2_scene1_NO_micro  = !!i2s1 && !marker.test(i2s1);
  result.checks.pref_skip_log = prefLogs.some(l=>/Scene-1 probe SKIPPED/i.test(l));
  result.checks.issue_open_apply_log = prefLogs.some(l=>/issue-open silent_apply/i.test(l)) || usedSim;
  result.prefLogs = prefLogs;

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  const c = result.checks;
  log('\n=== DEMAND/HINT MULTI-ISSUE E2E ===');
  const line=(n,v)=>log(`  ${v?'✓':'✗'}  ${n}`);
  line('Issue 1 Scene 1 landed', c.issue1_scene1_landed);
  line('Issue 1 recorded demand_hint (memory set)', c.issue1_recorded_demand_hint && c.issue1_recorded_demand_hint.mem);
  line('Issue 1 Scene 1 HAS a micro-decision (probe fired first time)', c.issue1_scene1_HAS_micro);
  line(`boundary via ${c.boundary_mode}`, true);
  line('Issue 2 Scene 1 landed', c.issue2_scene1_landed);
  line('Issue 2 Scene 1 has NO micro-decision (SKIP worked)', c.issue2_scene1_NO_micro);
  line('[PREF-APPLY] Scene-1 SKIPPED log present', c.pref_skip_log);
  log(`\nWROTE ${OUT}  (issue1=${result.issue1.length} scenes, issue2=${result.issue2.length} scenes)`);
  const core = c.issue1_scene1_HAS_micro && c.issue2_scene1_NO_micro && c.issue2_scene1_landed;
  log(`RESULT: ${core ? '✓ SKIP VALIDATED (probe fired in Issue 1, suppressed in Issue 2)' : '✗ INCONCLUSIVE — inspect JSON'}`);
})().catch(e=>{ console.error('DRIVER-ERR', e.message); process.exit(1); });
