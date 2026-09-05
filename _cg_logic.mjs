import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await b.newContext().then(c => c.newPage());
const R=[]; const ck=(n,v,d)=>R.push({n,v:!!v,d:d||''});
try {
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await p.waitForFunction(()=> typeof window._cgProbeKindForScene==='function' && typeof window._cgSceneHasDesireCodedLI==='function' && typeof window._getProbeCadenceForCurrentStory==='function', {timeout:15000});
  const out = await p.evaluate(()=>{
    const s = window.state = window.state||{};
    s.storyLength='affair'; s.tier='affair'; s.picks=s.picks||{}; s.picks.flavor='affair';
    s.renderMode='staged_story_mode'; s.currentEngine='graphic';
    const cad = window._getProbeCadenceForCurrentStory();
    const axis = (cad&&cad.axis)||[];               // expect cg affair [1,10,20,30]
    const firstAxisGt1 = axis.filter(n=>n>1)[0], laterAxisGt1 = axis.filter(n=>n>1)[1];
    const kind = (num)=> window._cgProbeKindForScene((num||1)-1); // scene NUMBER → kind

    // desire detection
    const dHungry = window._cgSceneHasDesireCodedLI({ visualState:{ li_position:'standing_close', li_expression:'hungry' } });
    const dNeutral= window._cgSceneHasDesireCodedLI({ visualState:{ li_position:'standing_close', li_expression:'neutral' } });
    const dOff    = window._cgSceneHasDesireCodedLI({ visualState:{ li_position:'offstage', li_expression:'hungry' } });
    const dPhase  = window._cgSceneHasDesireCodedLI({ visualState:{ li_position:'standing_close', li_expression:'neutral' }, phases:[{ li_expression_override:'tender' }] });

    // set up: desire-coded at scene 5 (idx 4), no memory, issue 1
    try{localStorage.removeItem('sb_reader_pref_v1')}catch(_){}
    s._prefMemory={}; s.series_id='CG-S'; s.storyId='cg1'; s.issueIndexInRun=1; s._cgFirstLIDesireScene=4;
    const r = {
      axis, firstAxisGt1, laterAxisGt1, dHungry, dNeutral, dOff, dPhase,
      scene1: kind(1),                    // expect 'demand_hint'
      firstGR: kind(firstAxisGt1),        // expect 'axis'
      laterGR: kind(laterAxisGt1),        // expect 'axis' (recalibration)
    };
    // an axis-cadence scene BEFORE desire (set desire late = scene 25) → the first axis>1 (scene 10) should defer to 'none'
    s._cgFirstLIDesireScene = 24;
    r.deferBeforeDesire = kind(firstAxisGt1); // expect 'none' (10 < firstGR which is now 30)
    // issue 2 + remembered → first GR suppressed
    s._cgFirstLIDesireScene = 4;
    window._recordReaderPreference('goal_relationship','relationship',{}); s.storyId='cg2'; s.issueIndexInRun=2;
    r.i2remember = kind(firstAxisGt1);    // expect 'none' (silent_apply)
    // control: issue 2 but NO memory → renders
    s._prefMemory={}; try{localStorage.removeItem('sb_reader_pref_v1')}catch(_){}
    r.i2control = kind(firstAxisGt1);      // expect 'axis'
    return r;
  });
  console.log('cadence axis:', JSON.stringify(out.axis), 'firstAxisGt1:', out.firstAxisGt1, 'later:', out.laterAxisGt1);
  ck('CG Scene 1 → demand_hint (not GR)', out.scene1==='demand_hint', out.scene1);
  ck('desire-detect: on-stage + hungry → true', out.dHungry===true);
  ck('desire-detect: on-stage + neutral → false', out.dNeutral===false);
  ck('desire-detect: offstage + hungry → false', out.dOff===false);
  ck('desire-detect: phase override tender → true', out.dPhase===true);
  ck('First GR probe (first axis>1 after desire) → axis', out.firstGR==='axis', out.firstGR);
  ck('Later cadence axis → axis (recalibration kept)', out.laterGR==='axis', out.laterGR);
  ck('Axis scene BEFORE desire → none (defer GR, chain order)', out.deferBeforeDesire==='none', out.deferBeforeDesire);
  ck('Issue 2 + remembered → first GR suppressed (none)', out.i2remember==='none', out.i2remember);
  ck('Issue 2 control (no memory) → GR renders (axis)', out.i2control==='axis', out.i2control);
} catch(e){ ck('HARNESS',false,e.message); } finally { await b.close(); }
const pass=R.filter(r=>r.v).length;
console.log('\n=== CG PREFERENCE-CHAIN LOGIC ===');
R.forEach(r=>console.log(`  ${r.v?'✓':'✗ FAIL'}  ${r.n}${r.v?'':'  → got '+r.d}`));
console.log(`\nRESULT: ${pass}/${R.length} ${pass===R.length?'✓ ALL PASS':'✗'}`);
process.exit(pass===R.length?0:1);
