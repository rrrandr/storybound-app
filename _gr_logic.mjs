import { chromium } from 'playwright';
const b = await chromium.launch({ headless: true });
const p = await b.newContext().then(c => c.newPage());
const R=[]; const ck=(n,v,d)=>R.push({n,v:!!v,d:d||''});
try {
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await p.waitForFunction(()=> typeof window._grFirstProbeSuppress==='function' && typeof window._getProbeCadenceForCurrentStory==='function' && typeof window._recordReaderPreference==='function', {timeout:15000});
  const out = await p.evaluate(()=>{
    const s = window.state = window.state||{};
    s.storyLength='affair'; s.tier='affair'; s.picks=s.picks||{}; s.picks.flavor='affair';
    const cad = window._getProbeCadenceForCurrentStory();
    const axis = (cad&&cad.axis)||[];
    // first cadence axis scene number > 1
    const firstGt1 = axis.filter(n=>n>1)[0];
    const laterGt1 = axis.filter(n=>n>1)[1];
    // set up remembered goal_relationship (series memory), continuing issue, desire-coded before firstGt1
    try{localStorage.removeItem('sb_reader_pref_v1')}catch(_){}
    s._prefMemory={}; s.series_id='GR-S'; s.storyId='gr1'; s.issueIndexInRun=1;
    window._recordReaderPreference('goal_relationship','relationship',{});
    s.storyId='gr2'; s.issueIndexInRun=2;                       // issue boundary, same series
    s._liDesireIntroScene = Math.max(0, (firstGt1||6)-2);       // desire-coded a scene or two before the first axis>1
    const res = window._getReaderPreference ? window._getReaderPreference('goal_relationship',{}) : null;
    const at = (num)=> window._grFirstProbeSuppress((num||1)-1); // pass 0-based idx for scene NUMBER `num`
    const r = {
      axis, firstGt1, laterGt1, resolve: res && {mode:res.askMode, reason:res.reason},
      scene1: window._grFirstProbeSuppress(0),
      firstGR: firstGt1!=null ? at(firstGt1) : null,
      laterGR: laterGt1!=null ? at(laterGt1) : null,
    };
    // Issue 1 → false
    s.issueIndexInRun=1; r.issue1 = firstGt1!=null ? at(firstGt1) : null; s.issueIndexInRun=2;
    // No memory → false
    s._prefMemory={}; try{localStorage.removeItem('sb_reader_pref_v1')}catch(_){}
    r.noMem = firstGt1!=null ? at(firstGt1) : null;
    // Desire not yet coded → false
    window._recordReaderPreference('goal_relationship','relationship',{}); s.storyId='gr3'; s.issueIndexInRun=2;
    s._liDesireIntroScene = null; r.noDesire = firstGt1!=null ? at(firstGt1) : null;
    return r;
  });
  console.log('cadence axis:', JSON.stringify(out.axis), ' firstGt1:', out.firstGt1, ' laterGt1:', out.laterGt1);
  console.log('resolve:', JSON.stringify(out.resolve));
  ck('Scene 1 (demand/hint slot) → NOT a GR suppress', out.scene1===false);
  ck('First GR probe (first cadence axis >1, remembered, issue2) → SUPPRESS', out.firstGR===true, 'got '+out.firstGR);
  ck('Later cadence GR probe → NOT suppressed (recalibration kept)', out.laterGR===false, 'got '+out.laterGR);
  ck('Issue 1 → NOT suppressed (establish first)', out.issue1===false, 'got '+out.issue1);
  ck('No memory → NOT suppressed (control still asks)', out.noMem===false, 'got '+out.noMem);
  ck('LI not desire-coded yet → NOT suppressed (chain order)', out.noDesire===false, 'got '+out.noDesire);
} catch(e){ ck('HARNESS',false,e.message); } finally { await b.close(); }
const pass=R.filter(r=>r.v).length;
console.log('\n=== GR FIRST-PROBE LOGIC ===');
R.forEach(r=>console.log(`  ${r.v?'✓':'✗ FAIL'}  ${r.n}${r.v?'':'  → '+r.d}`));
console.log(`\nRESULT: ${pass}/${R.length} ${pass===R.length?'✓ ALL PASS':'✗'}`);
process.exit(pass===R.length?0:1);
