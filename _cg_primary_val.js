// PRIMARY CG validation: does the REAL CG screenplay path emit + record the Scene-1 Demand/Hint probe?
// Generates CG (staged_story_mode) Scene 1, inspects the generated microDecision (signals/options),
// the [CG-PREF-CHAIN] logs, then simulates the Scene-1 click and checks demand_hint recording.
// Does NOT do scene-10 / Book 2 (covered by the 10/10 logic test). Images blocked.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/tmp/cg_primary_val.json';
function log(...a){ console.error(...a); }

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image','**/api/bfl-kontext','**/api/get-parent-images','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked"}' }));
  const logs = [];
  const LOG_RE = /\[CG-PREF-CHAIN\]|\[GR-FIRST-PROBE\]|\[STAGED:MICRO\]|\[PREF-APPLY\]|\[PREF-RESOLVE\]|\[AXIS-EXPANSION-PREWRITTEN\]|\[AXIS-EXPANSION-FALLBACK\]|MICRODECISION FOR THIS SCENE|first desire-coded LI/i;
  page.on('console', m => { const t=m.text(); if (LOG_RE.test(t)) { logs.push(t.slice(0,240)); log('  cg>', t.slice(0,170)); }
    else if (/GEN-FAIL|BEGIN-ERR|screenplay|Story generation failed|CG:SCREENPLAY|CG:PREWARM/i.test(t)) log('  ..', t.slice(0,120)); });

  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && Object.keys(window.state).length>100 && typeof window._completeStagedSceneFromScreenplay==='function' && typeof window._resolveMicroDecision==='function' && typeof window._cgProbeKindForScene==='function', { timeout:40000 });
  await page.waitForTimeout(800);

  await page.evaluate(() => {
    ['sb_physcanon_ledger','sb_behavcanon_ledger','sb_behavphrase_ledger','sb_deeptrio_ledger','sb_reader_pref_v1'].forEach(k=>{try{localStorage.removeItem(k)}catch(_){}});
    window.__scenes = [];
    ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture','_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(fn=>{try{window[fn]=()=>Promise.resolve(null)}catch(_){}});
    window._auditSceneEmotionalGravity = function(pr){ try{ if(typeof pr==='string'&&pr.length>80) window.__scenes.push({text:pr}); }catch(_){} return Promise.resolve(null); };
    const s = window.state;
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
    s._pcLookSkipped=true; s.pcLookLocked=true;
    // CG staged mode
    s.renderMode='staged_story_mode'; s.storyModality='cinematic'; s.currentEngine='graphic'; s._cgScreenplayMode=true;
    s.series_id='cg-val-series'; s.issueIndexInRun=1;
  });

  log('[CG-VAL] generating CG Scene 1 …');
  await page.evaluate(async () => { try { window._completeStagedSceneFromScreenplay(0, null, null).catch(()=>{}); } catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); } });

  // wait for the mount (_renderStagedScene sets state._stagedActive.plan) + its microDecision.
  const PER = 300000; const t0 = Date.now(); let md = null, planSeen = false, planKeys = null, planLandedAt = 0;
  while (Date.now()-t0 < PER) {
    await page.waitForTimeout(4000);
    const probe = await page.evaluate(() => { try { const a=window.state._stagedActive; const pl = a && a.plan; if(!pl) return {plan:false, active:!!a};
      return { plan:true, planKeys:Object.keys(pl||{}).slice(0,24), md: pl.microDecision ? { prompt: pl.microDecision.prompt, options: pl.microDecision.options, fallback: !!pl.microDecision._fallback } : null }; } catch(_){ return {plan:false}; } });
    if (probe.plan) { if (!planSeen) planLandedAt = Date.now(); planSeen = true; planKeys = probe.planKeys; if (probe.md) { md = probe.md; break; } }
    if (planSeen && (Date.now()-planLandedAt > 12000)) break; // plan mounted, gave it time; microDecision may legitimately be null
  }

  const result = { microDecision: md, planKeys: planKeys, checks: {}, logs: [] };
  const sigs = (md && md.options || []).map(o => o.signal || '');
  result.checks.md_present = !!(md && md.options && md.options.length === 2);
  result.checks.is_demand_hint = sigs.includes('direct+') && sigs.includes('subtle+');
  result.checks.not_goal_relationship = !(sigs.includes('objective+') || sigs.includes('relationship+'));
  result.checks.scene1_chain_log = logs.some(l => /\[CG-PREF-CHAIN\].*scene1=demand_hint/i.test(l));
  // ── PREWRITE-EXPANSION checks ──
  const opts = (md && md.options) || [];
  result.hiddenExpansions = opts.map(o => o.hiddenExpansion || null);
  result.checks.hiddenExpansion_both_present = opts.length === 2 && opts.every(o => typeof o.hiddenExpansion === 'string' && o.hiddenExpansion.trim().length > 4);
  result.checks.hiddenExpansion_sanitizer_valid = await page.evaluate((exps) => {
    try { return exps.every(e => typeof window._sanitizeHiddenExpansion === 'function' && window._sanitizeHiddenExpansion(e) !== null); } catch(_){ return false; }
  }, result.hiddenExpansions);

  // simulate the Scene-1 click (choose option 0) → should record demand_hint.
  // _resolveMicroDecision reads state._stagedActive.microDecision; the harness blocked before mount,
  // so seed it from the captured plan first (this exercises the REAL recording branch on the REAL options).
  let rec = null;
  if (result.checks.md_present) {
    rec = await page.evaluate(() => {
      try {
        const s = window.state;
        s._stagedActive = s._stagedActive || {};
        // _resolveMicroDecision reads active.microDecision; seed it from the mounted plan (real options).
        if (!s._stagedActive.microDecision && s._stagedActive.plan) s._stagedActive.microDecision = s._stagedActive.plan.microDecision;
        const before = !!(s._prefMemory && s._prefMemory.demand_hint);
        const chosenHX = (s._stagedActive.plan && s._stagedActive.plan.microDecision && s._stagedActive.plan.microDecision.options[0]) ? s._stagedActive.plan.microDecision.options[0].hiddenExpansion : null;
        window._resolveMicroDecision(0);
        const aside = document.querySelector('.axis-expansion, .demand-hint-expansion');
        return { before, sig: s.scene1DirectnessSignal, memVal: (s._prefMemory && s._prefMemory.demand_hint) ? s._prefMemory.demand_hint.value : null,
                 chosenHX, revealedAside: aside ? (aside.innerText || aside.textContent || '') : '',
                 chosenSignal: 'opt0', directiveScene2: (typeof window._buildCGDirectnessDirective==='function') ? !!window._buildCGDirectnessDirective(Object.assign({}, s, {turnCount:1})) : null };
      } catch(e){ return { err: e.message }; }
    });
  }
  result.click = rec;
  result.checks.records_demand_hint = !!(rec && rec.memVal && (rec.memVal === 'direct' || rec.memVal === 'subtle') && rec.sig);
  result.checks.cg_directness_directive_active = !!(rec && rec.directiveScene2);
  // prewrite reveal: the chosen option's hiddenExpansion was revealed on click (no AI call)
  result.checks.prewritten_reveal_fired = logs.some(l => /\[AXIS-EXPANSION-PREWRITTEN\]/i.test(l));
  result.checks.prewritten_aside_shown = !!(rec && rec.revealedAside && rec.revealedAside.length > 4 && rec.chosenHX && rec.revealedAside.indexOf(rec.chosenHX.slice(0,20)) >= 0);
  result.chosenHiddenExpansion = rec && rec.chosenHX;
  result.revealedAside = rec && rec.revealedAside;

  // desire-latch + no-regression signals
  const post = await page.evaluate(() => ({ cgFirstLIDesire: (window.state._cgFirstLIDesireScene==null?null:window.state._cgFirstLIDesireScene), stagedPrefAxis: window.state._stagedPreferenceAxis || null }));
  result.checks.desire_latch = post.cgFirstLIDesire; // may be null if LI absent/neutral in Scene 1 (expected per CG contract)
  // no regression: Scene 1 microDecision signals are NOT obj/rel (already checked); also the recorded axis is demand_hint not goal_relationship
  result.checks.no_obj_rel_regression = result.checks.not_goal_relationship;
  result.logs = logs;

  await browser.close();
  fs.writeFileSync(OUT, JSON.stringify(result, null, 1));
  const c = result.checks;
  log('\n=== CG PRIMARY VALIDATION ===');
  const line=(n,v)=>log(`  ${v?'✓':'✗'}  ${n}`);
  line('1. Scene 1 microDecision present (2 options)', c.md_present);
  line('2a. Signals are Demand/Hint (direct+/subtle+)', c.is_demand_hint);
  line('2b. NOT Goal/Relationship (no objective+/relationship+)', c.not_goal_relationship);
  line('3. [CG-PREF-CHAIN] scene1=demand_hint log fired', c.scene1_chain_log);
  line('4. Scene-1 click records demand_hint', c.records_demand_hint);
  line('5. CG directness directive active (Scene 2+)', c.cg_directness_directive_active);
  line('6. desire-latch value (null=LI absent Scene1, ok): ' + JSON.stringify(c.desire_latch), true);
  line('7. No regression to obj/rel lock at Scene 1', c.no_obj_rel_regression);
  line('8. PREWRITE: both options carry a hiddenExpansion', c.hiddenExpansion_both_present);
  line('9. PREWRITE: hiddenExpansions pass the sanitizer', c.hiddenExpansion_sanitizer_valid);
  line('10. PREWRITE: reveal fired on click ([AXIS-EXPANSION-PREWRITTEN])', c.prewritten_reveal_fired);
  line('11. PREWRITE: revealed aside matches the prewritten payoff', c.prewritten_aside_shown);
  log('\n  hiddenExpansions: ' + JSON.stringify(result.hiddenExpansions));
  log('  chosen (opt0) revealed aside: ' + JSON.stringify((result.revealedAside||'').slice(0,140)));
  log('\n  microDecision.options: ' + JSON.stringify(result.microDecision && result.microDecision.options));
  log('  click result: ' + JSON.stringify(result.click));
  const core = c.md_present && c.is_demand_hint && c.not_goal_relationship && c.records_demand_hint;
  log(`\nWROTE ${OUT}`);
  log(`RESULT: ${core ? '✓ PRIMARY PASS — CG Scene 1 emits + records Demand/Hint (not Goal/Relationship)' : '✗ FAIL — inspect JSON'}`);
})().catch(e=>{ console.error('DRIVER-ERR', e.message); process.exit(1); });
