import { chromium } from 'playwright';
const b = await chromium.launch({ headless:true });
const p = await b.newContext().then(c=>c.newPage());
const R=[]; const ck=(n,v,d)=>R.push({n,v:!!v,d:d||''});
try {
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await p.waitForFunction(()=> typeof window._pickScene1MdQuestion==='function', {timeout:15000});
  const out = await p.evaluate(()=>{
    const s=window.state; const results={};
    // LI ABSENT — pick 30 times, none should reference him/his/he
    s.turnCount=0; s.pairDynamic={scene1Presence:'ABSENT'}; s.romanceEnginePlan={scene1Presence:'ABSENT'}; s._scene1LIOnStage=false;
    const absent=[]; for(let i=0;i<30;i++){ try{ absent.push(window._pickScene1MdQuestion()); }catch(_){} }
    results.absent_hasHim = absent.some(q=>/\b(him|his|he)\b/i.test(q||''));
    results.absent_sample = [...new Set(absent)].slice(0,6);
    results.absent_count = new Set(absent).size;
    // LI ONSTAGE — the full bank (incl. him) is allowed
    s.pairDynamic={scene1Presence:'ONSTAGE'}; s.romanceEnginePlan={scene1Presence:'ONSTAGE'}; s._scene1LIOnStage=true;
    const onstage=[]; for(let i=0;i<40;i++){ try{ onstage.push(window._pickScene1MdQuestion()); }catch(_){} }
    results.onstage_canHaveHim = onstage.some(q=>/\b(him|his|he)\b/i.test(q||''));
    return results;
  });
  ck('LI ABSENT → NO "him/his/he" question ever picked', !out.absent_hasHim, JSON.stringify(out.absent_sample));
  ck('LI ABSENT → still rotates (≥3 distinct)', out.absent_count>=3, 'distinct='+out.absent_count);
  ck('LI ONSTAGE → full bank allowed (him-questions can appear)', out.onstage_canHaveHim);
} catch(e){ ck('HARNESS',false,e.message); } finally { await b.close(); }
const pass=R.filter(r=>r.v).length;
console.log('\n=== AXIS LI-ABSENT GATE ===');
R.forEach(r=>console.log(`  ${r.v?'✓':'✗ FAIL'}  ${r.n}${r.v?'':'  → '+String(r.d).slice(0,80)}`));
console.log(`\nRESULT: ${pass}/${R.length} ${pass===R.length?'✓ ALL PASS':'✗'}`);
process.exit(pass===R.length?0:1);
