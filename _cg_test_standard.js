// Headless CG full-story test — NO images. Mirrors the PROVEN _cg_primary_val.js setup (audit stubs +
// _auditSceneEmotionalGravity capture), drives all 10 scenes of the real staged CG path, and extracts from the
// per-scene _stagedActive.plan (beats/panels) — NOT state.scenes. Captures cast, CG directive block, bibles.
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/cg_confirm.json';
const NSCENES = 10;

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image**','**/api/bfl-kontext**','**/api/get-parent-images**','**/api/grok-image**','**/api/visualize-flux**','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked"}' }));
  const errs = [];
  const marks = [];
  page.on('console', m => { const t=m.text();
    if (/GEN-FAIL|BEGIN-ERR|Story generation failed|STRUCTURE.*fail|author.*timeout|screenplay.*(fail|error)/i.test(t) && !/blocked/i.test(t)) errs.push(t.slice(0,220));
    if (/\[CG:SCREENPLAY:MANDATE\].*(removed|duplicate|closer)|\[CG:ARC-GUARD\]|\[CG:ISSUE-OPENER/i.test(t)) marks.push(t.slice(0,200));
  });

  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && Object.keys(window.state).length>100 && typeof window._completeStagedSceneFromScreenplay==='function' && typeof window._extractCGSceneText==='function', { timeout:40000 });
  await page.waitForTimeout(700);

  // ── seed: mirror _cg_primary_val.js exactly (audit stubs + capture hook + CG staged mode) ──
  await page.evaluate(() => {
    ['sb_physcanon_ledger','sb_behavcanon_ledger','sb_behavphrase_ledger','sb_deeptrio_ledger','sb_reader_pref_v1'].forEach(k=>{try{localStorage.removeItem(k)}catch(_){}});
    window.__scenes = []; window.__plans = [];
    ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture','_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(fn=>{try{window[fn]=()=>Promise.resolve(null)}catch(_){}});
    window._auditSceneEmotionalGravity = function(pr){ try{ if(typeof pr==='string'&&pr.length>80) window.__scenes.push(pr); }catch(_){} return Promise.resolve(null); };
    const s = window.state;
    window._devBypass=true; window._forceAudits=true; window.__cgAuthorTimeoutMs=200000;
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
    s._pcLookSkipped=true; s.pcLookLocked=true;
    s.renderMode='staged_story_mode'; s.storyModality='cinematic'; s.currentEngine='graphic'; s._cgScreenplayMode=true;
    s.series_id='cg-test-series'; s.issueIndexInRun=1;
    window._forceDeckMandate=true; if (typeof window._forceMandateOn==='function') { try{ window._forceMandateOn(); }catch(_){} }
  });

  for (let i=0;i<NSCENES;i++){
    // fire-and-forget (image phase is blocked → the promise may hang on image retries AFTER the
    // scene has already committed to state.scenes at app.js:206402; we key on that commit, not the promise).
    // VARIED, plot-advancing player actions (avoids the constant-action looping confound).
    const ACTIONS = [
      'I call Dorian and demand the truth about that night — no performance, no deflection.',
      'I start drafting a public statement defending him, and decide to put my own name on it.',
      'I go straight to Lila Voss and ask her, to her face, what she actually wants.',
      'I stop waiting and dig into the old records myself to find what really happened.',
      'I choose him over my own safety and go public, consequences be damned.',
      'I pull back — I tell him I cannot do this until he stops hiding from me.',
      'I set a trap to expose Lila\'s manipulation in front of the people who matter.',
      'I face the board and put my own reputation on the line to shield him.',
      'I decide what I actually want, for once, and I act on it without apology.'
    ];
    const action = i===0?null:(ACTIONS[i-1]||'I force the situation forward in a wholly new direction.');
    // per-scene retry with backoff — CG cycles providers (Mistral/Grok/DeepSeek/GPT-4o) and a transient
    // 429/502 across all of them makes a scene fall to the literary path (which does not commit the CG way).
    let done=false;
    for (let attempt=0; attempt<3 && !done; attempt++){
      if (attempt>0){ console.error('  scene '+i+' retry '+attempt+' (provider blip) — waiting 30s'); await page.waitForTimeout(30000); }
      await page.evaluate((args)=>{ const {i,action}=args; window.state.turnCount=i;
        try{ window._completeStagedSceneFromScreenplay(i, action, null).catch(()=>{}); }catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); }
      }, { i, action });
      const t0=Date.now();
      while(Date.now()-t0 < 240000){
        await page.waitForTimeout(4000);
        const n = await page.evaluate(()=> (window.state.scenes||[]).length);
        if (n >= i+1){ done=true; break; }
      }
    }
    // let the plan settle a beat, then snapshot it (beats/panels/microDecision for this committed scene)
    await page.waitForTimeout(1500);
    await page.evaluate(()=>{ try{ window.__plans.push(JSON.parse(JSON.stringify(window.state._stagedActive.plan))); }catch(_){ window.__plans.push(null); } });
    const post = await page.evaluate(()=>({ plans:window.__plans.length, scenesN:(window.state.scenes||[]).length }));
    console.error('scene '+i+(done?' committed':' TIMEOUT')+' — state.scenes='+post.scenesN+' plans='+post.plans);
    if(!done){ break; }
  }

  const out = await page.evaluate(()=>{
    const s = window.state;
    return {
      scenesCapturedProse: window.__scenes || [],
      scenesText: (s.scenes||[]).map(sc=>sc.text),
      perScenePlanText: (window.__plans||[]).map(p=> p ? (typeof window._extractCGSceneText==='function'?window._extractCGSceneText(p):'') : null),
      planBeats: (window.__plans||[]).map(p=> p ? (p.beats||[]).map(b=>({speaker:b.speaker,kind:b.kind,text:String(b.text||b.dialogue||b.captionText||b.caption||'').slice(0,500)})) : null),
      planPanels: (window.__plans||[]).map(p=> p ? (p.panels||p._panels||[]).map(pn=>String(pn&&(pn.action||pn.description||pn.caption||JSON.stringify(pn))).slice(0,300)) : null),
      speakers: [...new Set((window.__plans||[]).flatMap(p=> p ? (p.beats||[]).map(b=>b.speaker).filter(Boolean):[]))],
      cast: { pc:s.playerName, li:s.loveInterestName, antagonist:s.aPlot&&s.aPlot.antagonistOrAntiForce, antagonistTie:s.aPlot&&s.aPlot.antagonistPersonalTie, antagonistName:s.antagonistName, socialEcosystem:(s._socialEcosystem||[]).map(m=>({role:m.role,fnKey:m.fnKey})), castingLibrary:Object.keys(s._castingLibrary||{}) },
      cgDirectives: (typeof window._renderBiblesAsCGDirectives==='function') ? window._renderBiblesAsCGDirectives() : null,
      bibles: { pc:s.pcBodyBible, li:s.liBodyBible, antagonist:s.antagonistBodyBible },
      aplotGoal: s.aPlot && s.aPlot.goal,
      // ── arc-guard confirmation signals ──
      antagonistOnPanel: !!s._cgAntagonistOnPanel,
      antagonistOnPanelScene: (s._cgAntagonistOnPanelScene===undefined?null:s._cgAntagonistOnPanelScene),
      establishedReveals: s._cgEstablishedReveals || []
    };
  });
  out.marks = marks;
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error('DONE standard — plans='+out.planBeats.filter(Boolean).length+' capturedProse='+out.scenesCapturedProse.length+' speakers='+JSON.stringify(out.speakers)+' errs='+errs.length+' antagOnPanel='+out.antagonistOnPanel+'@'+out.antagonistOnPanelScene+' marks='+marks.length);
  if(errs.length) console.error('ERRS:\n'+errs.slice(0,8).join('\n'));
  await browser.close(); process.exit(0);
})().catch(e=>{ console.error('DRIVER-ERR', e.message); process.exit(1); });
