import { chromium } from 'playwright-core';
const b=await chromium.launch({headless:true,channel:'chrome'});
const p=await(await b.newContext()).newPage();
await p.goto('http://localhost:3000/',{waitUntil:'domcontentloaded',timeout:30000});
await p.waitForFunction(()=>window.state&&typeof window._resolveCanonicalPCSpecies==='function',{timeout:30000});
const r=await p.evaluate(()=>{
  const S=window.state; const reset=()=>{S._playerSpecies=undefined;S._identityLock=false;S._speciesSource=undefined;S.picks=S.picks||{};};
  const out={};
  // 1) declared_seed wins (First Sacrifice case)
  reset(); S.picks.pcSpecies='First Favored'; window._resolveCanonicalPCSpecies();
  out.declared={species:S._playerSpecies,source:S._speciesSource};
  // 2) ancestry_explicit beats declared
  reset(); S.picks.pcSpecies='First Favored'; window._resolveCanonicalPCSpecies({ancestrySpecies:'Kwisheen'});
  out.ancestry={species:S._playerSpecies,source:S._speciesSource};
  // 3) idempotent: already locked → no change
  reset(); S._playerSpecies='Human'; S._identityLock=true; S.picks.pcSpecies='First Favored'; window._resolveCanonicalPCSpecies();
  out.idempotent={species:S._playerSpecies,source:S._speciesSource};
  // 4) no declared, no ancestry → region path attempted (no fantasyRegion set → stays unset, no crash)
  reset(); S.picks.pcSpecies=undefined; S.fantasyRegion=''; window._resolveCanonicalPCSpecies();
  out.region_nofallback={species:S._playerSpecies||'(unset)',source:S._speciesSource||'(none)'};
  return out;
});
console.log('declared_seed   :',JSON.stringify(r.declared),  r.declared.species==='First Favored'&&r.declared.source==='declared_seed'?'✓':'✗ FAIL');
console.log('ancestry>declared:',JSON.stringify(r.ancestry),  r.ancestry.species==='Kwisheen'&&r.ancestry.source==='ancestry_explicit'?'✓':'✗ FAIL');
console.log('idempotent      :',JSON.stringify(r.idempotent), r.idempotent.species==='Human'?'✓ (unchanged)':'✗ FAIL');
console.log('region path     :',JSON.stringify(r.region_nofallback),'(no crash) ✓');
await b.close();process.exit(0);
