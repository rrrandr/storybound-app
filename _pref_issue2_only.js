// LEAN Issue-2 generation: proves the Demand/Hint probe is SUPPRESSED in a real Scene-1 render when
// the couple's expression style is already remembered. Sets up post-Issue-1 state directly (memory
// present, issueIndexInRun=2, same series), HOLDS that state across the async Scene-1 build (both
// startBook2 and handleBeginStory reset it headless), then checks the rendered prose has no micro.
// Also runs a CONTROL: same setup with NO memory → the probe SHOULD fire (guards against false pass).
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/tmp/pref_issue2.json';
const PER_SCENE_TIMEOUT = 300000;
const MICRO = /<<\s*MICRO_EXPRESSION\s*>>|Say it plainly|let it show without words|Is this (?:about )?[^?]{4,90}\?|[^.\n]{4,90}—\s*or\b[^?]{2,90}\?/i;
function log(...a){ console.error(...a); }

async function genScene1(page, { withMemory }) {
  await page.evaluate((withMemory) => {
    const s = window.state;
    window.__scenes = [];
    window._auditSceneEmotionalGravity = (pr) => { try { if (typeof pr==='string' && pr.length>120) window.__scenes.push({ text:pr, tc:s.turnCount||0, issue:s.issueIndexInRun||1 }); } catch(_){} return Promise.resolve(null); };
    ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture','_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(fn=>{try{window[fn]=()=>Promise.resolve(null)}catch(_){}});
    try { if (typeof window._resetStoryState==='function') window._resetStoryState(); } catch(_){}
    window._devBypass=true; window._forceAudits=true;
    s.subscribed=true; s.fortunes=9999999; s.access='sub'; s._skipCorridorValidation=true;
    s.picks=s.picks||{}; s.picks.world='billionaire'; s.picks.flavor='affair'; s.picks.dynamic='enemies_to_lovers'; s.picks.worldSubtype='billionaire_modern'; s.picks.playermask='OPEN_VEIN';
    s.world='billionaire'; s.worldSubtype='billionaire_modern'; s.flavor='billionaire_modern'; s.dynamic='enemies_to_lovers';
    s.loveInterest='Male'; s.loveInterestName='Dorian'; s.liGender='male';
    s.archetype={primary:'DARK_VICE',modifier:null,bound:false,canonicalLIId:null,boundAtScene:null};
    s.playerMask='OPEN_VEIN'; s.playermask='OPEN_VEIN'; s.storyLength='affair'; s.tier='affair'; s.intensity='Steamy';
    s.name='Mara'; s.pov='first_person'; s.turnCount=0;
    s.playerName='Mara'; s.partnerName='Dorian';
    s.identity={playerName:'Mara',partnerName:'Dorian',displayPlayerName:'Mara',displayPartnerName:'Dorian'};
    s.picks.identity={playerName:'Mara',partnerName:'Dorian',displayPlayerName:'Mara',displayPartnerName:'Dorian'};
    try { const p=document.getElementById('playerNameInput'); if(p)p.value='Mara'; const l=document.getElementById('partnerNameInput'); if(l)l.value='Dorian'; } catch(_){}
    s._pcLookSkipped=true; s.pcLookLocked=true; s.renderMode='literary'; s.storyModality='literary'; s.currentEngine='literary';
    s._petitionEmergenceFired=true; s._petitionEmergenceArmed=false;
    // Continuing-issue state: same series, issue 2, couple's memory present (or absent for the control).
    const SER='pref-e2e-series', MEM = { demand_hint: { value:'direct', confidence:0.7, source:'probe', storyId:'issue1', seriesId:SER, lastAskedIssue:1, lastUsedIssue:1, ctx:{} } };
    window.__hold = { ser: SER, issue: 2, mem: withMemory ? MEM : {} };
    s.series_id = SER; s.issueIndexInRun = 2; s._prefMemory = withMemory ? JSON.parse(JSON.stringify(MEM)) : {};
    s.relationship_phase='together'; s.intimacyPhase=false;
    // HOLD the continuing-issue state across the async Scene-1 build (begin paths reset it headless).
    if (window.__holdTimer) clearInterval(window.__holdTimer);
    window.__holdTimer = setInterval(() => { const st=window.state; st.series_id=window.__hold.ser; st.issueIndexInRun=window.__hold.issue; if (Object.keys(window.__hold.mem).length && !(st._prefMemory && st._prefMemory.demand_hint)) st._prefMemory = JSON.parse(JSON.stringify(window.__hold.mem)); }, 60);
  }, withMemory);
  // apply remembered prefs at issue open (what startBook2 does)
  await page.evaluate(() => { try { if (typeof window._applyRememberedPreferences==='function') window._applyRememberedPreferences(); } catch(_){} });
  await page.evaluate(async () => { try { window.handleBeginStory(); } catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); } });
  // wait for the scene
  const t0=Date.now(); let lastLen=-1, stable=0, got=null;
  while (Date.now()-t0 < PER_SCENE_TIMEOUT) {
    await page.waitForTimeout(3000);
    const st = await page.evaluate(()=>{ const s=window.state, a=window.__scenes||[], last=a[a.length-1]||{}; return { n:a.length, busy:!!(s._isAdvancingScene||s._stagedSubmitting), len:(last.text||'').length, text:last.text||'', issue:s.issueIndexInRun, sig:s.scene1DirectnessSignal, suppressed:!!s._scene1MicroSuppressed }; });
    if (st.n>=1 && !st.busy && st.len>150) { if (st.len===lastLen){ stable+=3000; if (stable>=6000){ got=st; break; } } else { lastLen=st.len; stable=0; } }
  }
  await page.evaluate(()=>{ if (window.__holdTimer) clearInterval(window.__holdTimer); });
  return got;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked"}' }));
  const logs = [];
  page.on('console', m => { const t=m.text(); if (/\[PREF-|SKIPPED \(silent_apply|\[SCENE1:SCAFFOLD\].*(SUPPRESSED|micro_decision)|\[DEMAND-HINT\]|INLINE micro-decision SUPPRESSED/i.test(t)) { logs.push(t.slice(0,200)); log('  >', t.slice(0,150)); } });
  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(()=> window.state && typeof window.handleBeginStory==='function' && typeof window._scene1DemandHintSilentApply==='function', { timeout:40000 });
  await page.waitForTimeout(600);

  const out = { remembered:null, control:null, logs:[] };

  log('\n=== RUN A: continuing issue WITH remembered demand_hint (expect SUPPRESSED) ===');
  const a = await genScene1(page, { withMemory: true });
  out.remembered = a ? { len:a.text.length, issue:a.issue, sig:a.sig, suppressed:a.suppressed, hasMicro: MICRO.test(a.text), text:a.text } : null;

  const skipLogA = logs.some(l=>/Scene-1 probe SKIPPED|INLINE micro-decision SUPPRESSED|micro_decision SUPPRESSED/i.test(l));

  log('\n=== RUN B: CONTROL — same setup, NO memory (expect probe FIRES) ===');
  logs.length = 0;
  const b = await genScene1(page, { withMemory: false });
  out.control = b ? { len:b.text.length, issue:b.issue, sig:b.sig, suppressed:b.suppressed, hasMicro: MICRO.test(b.text), text:b.text } : null;

  out.logs = logs.slice();
  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));

  log('\n=== DEMAND/HINT ISSUE-2 SKIP VALIDATION ===');
  const R = out.remembered, C = out.control;
  const line=(n,v)=>log(`  ${v?'✓':'✗'}  ${n}`);
  line('RUN A (remembered) scene landed', !!R);
  line('RUN A: suppression flag set', R && R.suppressed);
  line('RUN A: NO micro-decision in prose (SKIP worked)', R && !R.hasMicro);
  line('RUN A: SKIPPED/SUPPRESSED log fired', skipLogA);
  line('RUN B (control) scene landed', !!C);
  line('RUN B: probe FIRES (micro present) — proves detector works + skip is causal', C && C.hasMicro);
  const pass = R && !R.hasMicro && R.suppressed && C && C.hasMicro;
  log(`\nWROTE ${OUT}`);
  log(`RESULT: ${pass ? '✓ SKIP VALIDATED — remembered issue suppresses the probe; control (no memory) fires it' : '✗ inspect JSON'}`);
})().catch(e=>{ console.error('DRIVER-ERR', e.message); process.exit(1); });
