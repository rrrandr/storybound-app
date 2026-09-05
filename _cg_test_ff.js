// Headless FAMOUS FATE CG full-story test — NO images. Elizabeth Bennet (canon romance → tests PC + LI + my
// FF canon-interior steer). Mirrors the proven staged-CG harness; FF overlay (fateMode + rich ffContract).
const { chromium } = require('playwright-core');
const fs = require('fs');
const OUT = '/private/tmp/claude-501/-Users-romantsukerman-storybound-app/a08d0758-843c-4e0e-a5e2-c3f532b66c76/scratchpad/verify/cg_test_ff.json';
const NSCENES = 10;
const ACTIONS = [
  'I refuse to be charmed or slighted — I watch him, and I decide what I actually think of him.',
  'I speak my mind plainly to him, whatever it costs my family\'s prospects.',
  'I refuse the offer that would secure us, because it is not love.',
  'I let myself be drawn to the man everyone warns me against, and I test whether my judgment is sound.',
  'I confront him with what I believe he has done, to his face.',
  'I read the letter again and let it overturn everything I was so sure of.',
  'I go where I should not, to learn the truth of him for myself.',
  'I choose to see him clearly, without pride and without prejudice.',
  'I decide what I want, for once, and I will not be talked out of it.'
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await (await browser.newContext()).newPage();
  for (const pat of ['**/api/image**','**/api/bfl-kontext**','**/api/get-parent-images**','**/api/grok-image**','**/api/visualize-flux**','**/api/replicate**','**/api/fal**'])
    await page.route(pat, r => r.fulfill({ status:500, contentType:'application/json', body:'{"error":"blocked"}' }));
  const errs = [];
  page.on('console', m => { const t=m.text(); if (/GEN-FAIL|BEGIN-ERR|Story generation failed|STRUCTURE.*fail|screenplay.*(fail|error)/i.test(t) && !/blocked/i.test(t)) errs.push(t.slice(0,220)); });
  await page.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await page.waitForFunction(() => window.state && Object.keys(window.state).length>100 && typeof window._completeStagedSceneFromScreenplay==='function' && typeof window._extractCGSceneText==='function', { timeout:40000 });
  await page.waitForTimeout(700);

  await page.evaluate(() => {
    ['sb_physcanon_ledger','sb_behavcanon_ledger','sb_behavphrase_ledger','sb_deeptrio_ledger','sb_reader_pref_v1'].forEach(k=>{try{localStorage.removeItem(k)}catch(_){}});
    window.__scenes=[]; window.__plans=[];
    ['_auditBannedPhraseLeakage','_classifyArchetypeManifestation','_auditArchetypeManifestation','_classifyLITexture','_auditLITextureSources','_auditSceneAgainstRPlot','_auditUnavailabilityManifestation'].forEach(fn=>{try{window[fn]=()=>Promise.resolve(null)}catch(_){}});
    window._auditSceneEmotionalGravity=function(pr){ try{ if(typeof pr==='string'&&pr.length>80) window.__scenes.push(pr); }catch(_){} return Promise.resolve(null); };
    const s=window.state;
    window._devBypass=true; window._forceAudits=true; window.__cgAuthorTimeoutMs=200000;
    s.subscribed=true; s.fortunes=9999999; s.access='sub'; s._skipCorridorValidation=true;
    // base picks (pipeline needs world/flavor/dynamic/archetype; FF overlays the content)
    s.picks=s.picks||{}; s.picks.world='historical'; s.picks.flavor='soulmates'; s.picks.dynamic='enemies_to_lovers'; s.picks.worldSubtype='regency'; s.picks.playermask='SHARP_TONGUE';
    s.world='historical'; s.worldSubtype='regency'; s.flavor='regency'; s.dynamic='enemies_to_lovers';
    s.loveInterest='Male'; s.loveInterestName='Darcy'; s.liGender='male';
    s.archetype={primary:'DARK_VICE',modifier:null,bound:false,canonicalLIId:null,boundAtScene:null};
    s.playerMask='SHARP_TONGUE'; s.playermask='SHARP_TONGUE'; s.storyLength='soulmates'; s.tier='soulmates'; s.intensity='Suggestive';
    s.name='Elizabeth'; s.pov='first_person'; s.turnCount=0;
    s.playerName='Elizabeth'; s.partnerName='Darcy';
    s.identity={playerName:'Elizabeth',partnerName:'Darcy',displayPlayerName:'Elizabeth',displayPartnerName:'Darcy'};
    s.picks.identity=s.identity;
    s._pcLookSkipped=true; s.pcLookLocked=true;
    s.renderMode='staged_story_mode'; s.storyModality='cinematic'; s.currentEngine='graphic'; s._cgScreenplayMode=true;
    s.series_id='cg-ff-series'; s.issueIndexInRun=1;
    // ── FAMOUS FATE overlay ──
    s.fateMode='famous_fate';
    s.famousFate={ period:'canon', source:'Pride and Prejudice (Jane Austen)', embodied:'Elizabeth Bennet' };
    s.protagonistName='Elizabeth';
    s.ffContract={
      character:{
        canonicalName:'Elizabeth Bennet', embodiedAs:'Elizabeth Bennet', name:'Elizabeth',
        canonVow:{ power:'her own judgment of people', reason:'she will not marry without love, even to save the family', heldFor:'her whole life' },
        canonWounds:['a family of five daughters and no son, whose whole future hangs on marrying well','a mother who would trade her for security and a father who retreats into irony','her own pride in her quick judgment, which blinds her to Wickham and to Darcy both','being poor and clever in a world that prices women only by the match they make'],
        history:['second of five Bennet sisters at Longbourn','refused Mr Collins though the estate is entailed away from the women','was charmed by Wickham and prejudiced against Darcy','overheard Darcy call her "tolerable, but not handsome enough to tempt me"'],
        familyMortality:[],
        voiceMarkers:['quick, ironic wit','teases to hold people at arm\'s length','archly polite when she means the reverse','says the truest thing as if it were a joke'],
        coreTruths:['will not marry without love, even to save the family','trusts her own judgment — often too far']
      },
      loveInterest:{ visualCanon:{ immutableIdentity:'Fitzwilliam Darcy — tall, dark, proud bearing, a severe handsome face', usualPresentation:'formally and severely dressed, a cold reserve that the room reads as arrogance' } },
      world:{ name:'Regency England', worldArcs:[{arc:'a season of balls, entailments, and marriages that decide women\'s entire futures', who:'the Bennets, Bingley, Darcy, Wickham', kind:'courtship'}] },
      castList:[{name:'Mr Darcy', role:'love interest', importance:'major'},{name:'Jane Bennet', role:'beloved elder sister', importance:'major'},{name:'Mr Wickham', role:'charming false friend', importance:'major'},{name:'Mrs Bennet', role:'the anxious mother', importance:'supporting'},{name:'Lady Catherine de Bourgh', role:'antagonist', importance:'major'}],
      forbiddenPresence:[], relationships:[],
      canonBeatLedger:[{beatIndex:1,canonBeat:'the Meryton assembly where Darcy slights her',momentum:'player_gated'},{beatIndex:2,canonBeat:'Darcy\'s first, disastrous proposal',momentum:'world_parallel'},{beatIndex:3,canonBeat:'the letter that overturns her judgment',momentum:'player_gated'}]
    };
    s.aPlot={ goal:'to marry only for love without ruining a family that cannot afford her pride' };
    s.ffLocationState={ currentRegion:'Hertfordshire', currentPlace:'Longbourn', travelState:'local' };
  });

  for (let i=0;i<NSCENES;i++){
    const action = i===0?null:(ACTIONS[i-1]||'I press the moment toward the truth, whatever it costs me.');
    let done=false;
    for (let attempt=0; attempt<3 && !done; attempt++){
      if (attempt>0){ console.error('  scene '+i+' retry '+attempt+' — waiting 30s'); await page.waitForTimeout(30000); }
      await page.evaluate((args)=>{ const {i,action}=args; window.state.turnCount=i;
        try{ window._completeStagedSceneFromScreenplay(i, action, null).catch(()=>{}); }catch(e){ console.log('BEGIN-ERR '+(e&&e.message)); }
      }, { i, action });
      const t0=Date.now();
      while(Date.now()-t0 < 240000){ await page.waitForTimeout(4000); const n=await page.evaluate(()=> (window.state.scenes||[]).length); if(n>=i+1){ done=true; break; } }
    }
    await page.waitForTimeout(1500);
    await page.evaluate(()=>{ try{ window.__plans.push(JSON.parse(JSON.stringify(window.state._stagedActive.plan))); }catch(_){ window.__plans.push(null); } });
    const post=await page.evaluate(()=>({ plans:window.__plans.length, scenesN:(window.state.scenes||[]).length }));
    console.error('scene '+i+(done?' committed':' TIMEOUT')+' — state.scenes='+post.scenesN+' plans='+post.plans);
    if(!done) break;
  }

  const out=await page.evaluate(()=>{
    const s=window.state;
    return {
      scenesText:(s.scenes||[]).map(sc=>sc.text),
      planBeats:(window.__plans||[]).map(p=> p ? (p.beats||[]).map(b=>({speaker:b.speaker,kind:b.kind,text:String(b.text||b.dialogue||b.captionText||b.caption||'').slice(0,500)})):null),
      speakers:[...new Set((window.__plans||[]).flatMap(p=> p ? (p.beats||[]).map(b=>b.speaker).filter(Boolean):[]))],
      cast:{ pc:s.playerName, li:s.loveInterestName, antagonist:s.aPlot&&s.aPlot.antagonistOrAntiForce },
      cgDirectives:(typeof window._renderBiblesAsCGDirectives==='function')?window._renderBiblesAsCGDirectives():null,
      bibles:{ pc:s.pcBodyBible, li:s.liBodyBible },
      ffInterior: s.pcBodyBible ? { contradiction:s.pcBodyBible.core_contradiction, hope:s.pcBodyBible.private_hope, weather:s.pcBodyBible.emotional_weather, wound:s.pcBodyBible.wound } : null
    };
  });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  console.error('DONE FF — scenes='+out.scenesText.length+' speakers='+JSON.stringify(out.speakers)+' errs='+errs.length);
  await browser.close(); process.exit(0);
})().catch(e=>{ console.error('FF-DRIVER-ERR', e.message); process.exit(1); });
