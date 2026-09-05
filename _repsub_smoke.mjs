import { chromium } from 'playwright';
const b = await chromium.launch({ headless:true });
const p = await b.newContext().then(c=>c.newPage());
const R=[]; const ck=(n,v,d)=>R.push({n,v:!!v,d:d||''});
try {
  await p.goto('http://localhost:3000/', { waitUntil:'domcontentloaded', timeout:30000 });
  await p.waitForFunction(()=> typeof window._pickReputationCollapseSubtype==='function', {timeout:15000});
  const out = await p.evaluate(()=>{
    try{ localStorage.removeItem('sb_rep_subtype_cursor'); }catch(_){}
    const picks=[];
    for(let i=0;i<16;i++){ const s={}; picks.push(window._pickReputationCollapseSubtype(s)); }  // fresh state each = new story
    const first8 = picks.slice(0,8);
    return {
      picks,
      distinct8: new Set(first8).size,
      hasInstitutional: picks.includes('institutional_judgment'),
      allValid: picks.every(x=>['public_exposure','rival_trap','intimate_betrayal','social_humiliation','erotic_misread','family_shame','class_boundary','professional_embarrassment'].includes(x)),
      caches: (()=>{ const s={}; const a=window._pickReputationCollapseSubtype(s); const bb=window._pickReputationCollapseSubtype(s); return a===bb; })()
    };
  });
  ck('never auto-selects institutional_judgment (the cap)', !out.hasInstitutional, JSON.stringify(out.picks.slice(0,8)));
  ck('rotates all 8 social subtypes before repeating', out.distinct8===8, 'distinct='+out.distinct8+' '+JSON.stringify([...new Set(out.picks.slice(0,8))]));
  ck('all picks are valid social subtypes', out.allValid);
  ck('caches per-story (same state → same subtype)', out.caches);
} catch(e){ ck('HARNESS',false,e.message); } finally { await b.close(); }
const pass=R.filter(r=>r.v).length;
console.log('\n=== REPUTATION-COLLAPSE SUBTYPE CURSOR ===');
R.forEach(r=>console.log(`  ${r.v?'✓':'✗ FAIL'}  ${r.n}${r.v?'':'  → '+String(r.d).slice(0,90)}`));
console.log(`\nRESULT: ${pass}/${R.length} ${pass===R.length?'✓ ALL PASS':'✗'}`);
process.exit(pass===R.length?0:1);
